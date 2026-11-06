import { supabase } from "@/lib/supabase";

const listeners = new Set();
let cachedAuditEvents = [];
let isLoaded = false;

function notify() {
  listeners.forEach((fn) => {
    try {
      fn(cachedAuditEvents);
    } catch (e) {
      console.warn("Error in audit subscriber:", e);
    }
  });
}

export function subscribeAudit(fn) {
  listeners.add(fn);
  if (isLoaded) {
    fn(cachedAuditEvents);
  }
  return () => listeners.delete(fn);
}

export function getCachedAuditEvents() {
  return cachedAuditEvents;
}

export async function fetchAuditEvents(userId) {
  try {
    const { data, error } = await supabase.functions.invoke("log-audit", {
      body: { action: "list", user_id: userId },
    });

    if (!error && data?.success && Array.isArray(data.events)) {
      cachedAuditEvents = data.events;
      isLoaded = true;
      notify();
      return cachedAuditEvents;
    }
  } catch (err) {
    console.warn("[audit-service] fetchAuditEvents error:", err);
  }
  return cachedAuditEvents;
}

export async function logAuditEvent({ section, itemId, action, itemLabel, details, userId }) {
  try {
    const { data, error } = await supabase.functions.invoke("log-audit", {
      body: {
        section,
        itemId,
        action,
        itemLabel,
        details,
        user_id: userId,
      },
    });

    if (!error && data?.success && data.data) {
      cachedAuditEvents = [data.data, ...cachedAuditEvents];
      notify();
      return data.data;
    }
  } catch (err) {
    console.warn("[audit-service] logAuditEvent error:", err);
  }
  return null;
}

