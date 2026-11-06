import { supabase, isConfigured } from "@/lib/supabase";

/**
 * Universal Platform Notifications Service
 * Supports: Appointment reminders, proposals, messages, handovers, and system alerts.
 * Stores in Supabase 'notifications' table with automatic offline localStorage fallback.
 */

const LOCAL_STORAGE_KEY = "ouderapp_inbox_notifications";

export function deduplicateNotifications(list) {
  if (!Array.isArray(list)) return [];
  const seenReminderKeys = new Set();
  const seenGenericKeys = new Set();
  const result = [];

  for (const item of list) {
    if (!item) continue;
    if (item.type === "reminder" && item.metadata?.eventId) {
      const key = `${item.metadata.eventId}-${item.metadata.reminderType || "uur"}-${item.metadata.datum || ""}`;
      if (seenReminderKeys.has(key)) continue;
      seenReminderKeys.add(key);
      result.push(item);
    } else {
      const key = `${item.type || "gen"}-${item.title}-${item.message}`;
      if (seenGenericKeys.has(key)) continue;
      seenGenericKeys.add(key);
      result.push(item);
    }
  }
  return result;
}

function getLocalNotifications() {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const clean = deduplicateNotifications(parsed);
          if (clean.length !== parsed.length) {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(clean));
          }
          return clean;
        }
      }
    }
  } catch (err) {
    console.error("[notification-service] load local error:", err);
  }
  return [];
}

function saveLocalNotifications(list) {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const clean = deduplicateNotifications(list);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(clean));
    }
  } catch (err) {
    console.error("[notification-service] save local error:", err);
  }
}

export async function fetchNotifications(userId) {
  const localList = getLocalNotifications();
  if (!isConfigured || !userId) {
    return localList;
  }

  try {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("[notification-service] Supabase fetch error, using local:", error.message);
      return localList;
    }

    if (Array.isArray(data)) {
      // Merge with local notifications ensuring unique IDs and clean deduplication
      const map = new Map();
      [...data, ...localList].forEach((item) => {
        if (item?.id) map.set(item.id, item);
      });
      const merged = deduplicateNotifications(
        Array.from(map.values()).sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
      );
      saveLocalNotifications(merged);
      return merged;
    }
    return localList;
  } catch (err) {
    console.warn("[notification-service] fetch exception, using local:", err);
    return localList;
  }
}

export async function createNotification({
  userId,
  actorId = null,
  type = "reminder",
  title,
  message,
  link = null,
  metadata = {},
}) {
  if (!title) return null;

  const localList = getLocalNotifications();

  // Strict duplicate prevention: NEVER duplicate the same reminder or exact same message
  const isDuplicate = localList.some((n) => {
    if (type === "reminder" && metadata?.eventId && n.metadata?.eventId) {
      return (
        String(n.metadata.eventId) === String(metadata.eventId) &&
        String(n.metadata.reminderType || "uur") === String(metadata.reminderType || "uur") &&
        String(n.metadata.datum || "") === String(metadata.datum || "")
      );
    }
    return n.title === title && n.message === message;
  });
  if (isDuplicate) return null;

  const newRecord = {
    id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    user_id: userId || null,
    actor_id: actorId,
    type,
    title,
    message,
    link,
    is_read: false,
    metadata,
    created_at: new Date().toISOString(),
  };

  const updatedLocal = deduplicateNotifications([newRecord, ...localList]).slice(0, 100);
  saveLocalNotifications(updatedLocal);

  if (isConfigured && userId) {
    try {
      const { data, error } = await supabase
        .from("notifications")
        .insert([{
          user_id: userId,
          actor_id: actorId,
          type,
          title,
          message,
          link,
          is_read: false,
          metadata,
        }])
        .select()
        .single();

      if (!error && data) {
        return data;
      }
    } catch (err) {
      console.warn("[notification-service] Remote insert deferred/fallback:", err);
    }
  }

  return newRecord;
}

export async function markAsRead(notificationId) {
  if (!notificationId) return;

  const localList = getLocalNotifications();
  const updatedLocal = localList.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n));
  saveLocalNotifications(updatedLocal);

  if (isConfigured && !notificationId.startsWith("notif_")) {
    try {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId);
    } catch (err) {
      console.error("[notification-service] markAsRead error:", err);
    }
  }
}

export async function markAllAsRead(userId) {
  const localList = getLocalNotifications();
  const updatedLocal = localList.map((n) => ({ ...n, is_read: true }));
  saveLocalNotifications(updatedLocal);

  if (isConfigured && userId) {
    try {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", userId);
    } catch (err) {
      console.error("[notification-service] markAllAsRead error:", err);
    }
  }
}

export async function deleteNotification(notificationId) {
  if (!notificationId) return;

  const localList = getLocalNotifications();
  const updatedLocal = localList.filter((n) => n.id !== notificationId);
  saveLocalNotifications(updatedLocal);

  if (isConfigured && !notificationId.startsWith("notif_")) {
    try {
      await supabase
        .from("notifications")
        .delete()
        .eq("id", notificationId);
    } catch (err) {
      console.error("[notification-service] deleteNotification error:", err);
    }
  }
}
