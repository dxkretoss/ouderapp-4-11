/**
 * Universal Reminder & Notification Service for Ouderschap & Co.
 * Handles reminder calculation, active state detection, and web notifications.
 */

function loadSentTags() {
  try {
    if (typeof window !== "undefined" && window.sessionStorage) {
      const raw = sessionStorage.getItem("ouderapp_sent_reminder_tags");
      if (raw) return new Set(JSON.parse(raw));
    }
  } catch {}
  return new Set();
}

function persistSentTags(set) {
  try {
    if (typeof window !== "undefined" && window.sessionStorage) {
      sessionStorage.setItem("ouderapp_sent_reminder_tags", JSON.stringify([...set]));
    }
  } catch {}
}

const notifiedInSession = loadSentTags();

/**
 * Calculates the exact Date when the reminder should fire.
 * @param {string} datum - YYYY-MM-DD
 * @param {string} [tijd] - HH:MM
 * @param {string} reminderType - "uur" | "dag" | "twee" | "geen"
 * @returns {Date|null}
 */
export function getReminderTriggerTime(datum, tijd = "09:00", reminderType = "geen") {
  if (!datum || !reminderType || reminderType === "geen") return null;

  try {
    const cleanTime = (tijd && tijd.length >= 5) ? tijd.slice(0, 5) : "09:00";
    const [year, month, day] = datum.split("-").map(Number);
    const [hour, minute] = cleanTime.split(":").map(Number);

    const eventDate = new Date(year, month - 1, day, hour, minute, 0);
    if (isNaN(eventDate.getTime())) return null;

    let offsetMs = 0;
    if (reminderType === "uur") {
      offsetMs = 60 * 60 * 1000; // 1 hour
    } else if (reminderType === "dag") {
      offsetMs = 24 * 60 * 60 * 1000; // 24 hours
    } else if (reminderType === "twee") {
      offsetMs = 48 * 60 * 60 * 1000; // 48 hours
    } else {
      return null;
    }

    return new Date(eventDate.getTime() - offsetMs);
  } catch {
    return null;
  }
}

/**
 * Determines whether an appointment's reminder is currently due/active.
 * @param {Object} event - Appointment object { datum, tijd, eindtijd, herinnering|reminder }
 * @param {Date} [now]
 * @returns {boolean}
 */
export function isReminderActive(event, now = new Date()) {
  const reminderType = event?.herinnering || event?.reminder || event?.a?.herinnering || event?.a?.reminder;
  if (!reminderType || reminderType === "geen") return false;

  const datum = event?.datum || event?.a?.datum || event?.start_date;
  const tijd = event?.tijd || event?.a?.tijd || event?.start_time || "09:00";
  if (!datum) return false;

  const triggerTime = getReminderTriggerTime(datum, tijd, reminderType);
  if (!triggerTime) return false;

  const cleanTime = (tijd && tijd.length >= 5) ? tijd.slice(0, 5) : "09:00";
  const [year, month, day] = datum.split("-").map(Number);
  const [hour, minute] = cleanTime.split(":").map(Number);
  const eventStartTime = new Date(year, month - 1, day, hour, minute, 0);

  // Active from triggerTime until 2 hours after event start (or end of that day)
  const windowEndTime = new Date(eventStartTime.getTime() + 2 * 60 * 60 * 1000);

  return now.getTime() >= triggerTime.getTime() && now.getTime() <= windowEndTime.getTime();
}

/**
 * Filters a list of events to those that have an active reminder right now.
 * @param {Array} events
 * @param {Date} [now]
 * @returns {Array}
 */
export function getActiveReminders(events = [], now = new Date()) {
  if (!Array.isArray(events)) return [];
  return events.filter((ev) => isReminderActive(ev, now));
}

/**
 * Checks if the browser supports standard Web Notifications.
 * @returns {boolean}
 */
export function isBrowserNotificationSupported() {
  return typeof window !== "undefined" && "Notification" in window;
}

/**
 * Returns the current notification permission: 'granted', 'denied', 'default', or 'unsupported'
 */
export function getBrowserNotificationPermission() {
  if (!isBrowserNotificationSupported()) return "unsupported";
  return Notification.permission;
}

/**
 * Requests browser permission for notifications.
 * @returns {Promise<string>} 'granted', 'denied', or 'unsupported'
 */
export async function requestBrowserNotificationPermission() {
  if (!isBrowserNotificationSupported()) return "unsupported";
  try {
    const res = await Notification.requestPermission();
    return res;
  } catch {
    return "denied";
  }
}

/**
 * Sends a native browser notification if granted and not previously shown in this session.
 * @param {string} title
 * @param {Object} options - { body, icon, tag }
 * @param {boolean} [force=false]
 * @returns {boolean} whether the notification was dispatched
 */
export function sendBrowserNotification(title, options = {}, force = false) {
  if (!isBrowserNotificationSupported()) return false;
  if (Notification.permission !== "granted") return false;

  const tag = options.tag || title;
  if (!force && notifiedInSession.has(tag)) {
    return false;
  }

  try {
    new Notification(title, {
      body: options.body || "",
      icon: options.icon || "/favicon.ico",
      tag,
      ...options,
    });
    notifiedInSession.add(tag);
    return true;
  } catch (err) {
    console.warn("[reminder-service] Notification dispatch failed:", err);
    return false;
  }
}

import { createNotification } from "@/lib/notification-service";

export function clearReminderTag(idOrTitle) {
  if (!idOrTitle) return;
  for (const tag of notifiedInSession) {
    if (tag.includes(String(idOrTitle))) {
      notifiedInSession.delete(tag);
    }
  }
  persistSentTags(notifiedInSession);
}

/**
 * Checks all active events and dispatches notifications for those not yet alerted.
 * @param {Array} events
 * @param {Function} t - i18next translation function
 * @param {string} [userId]
 */
export function notifyDueReminders(events = [], t, userId = null) {
  const now = new Date();
  const active = getActiveReminders(events, now);

  active.forEach((item) => {
    const a = item.a || item;
    const title = a.titel || a.title || "Afspraak";
    const datum = item.datum || a.datum || a.start_date;
    const tijd = a.tijd || a.start_time || "";
    const reminderType = a.herinnering || a.reminder;
    const tag = `reminder-${a.id || title}-${reminderType}-${datum}-${tijd || "wholeday"}`;

    if (!notifiedInSession.has(tag)) {
      notifiedInSession.add(tag);
      persistSentTags(notifiedInSession);

      const typeLabel = reminderType === "uur"
        ? (t ? t("agenda.reminderHourBefore", "1 uur van tevoren") : "1 uur van tevoren")
        : reminderType === "dag"
        ? (t ? t("agenda.reminderDayBefore", "1 dag van tevoren") : "1 dag van tevoren")
        : (t ? t("agenda.reminderTwoDaysBefore", "2 dagen van tevoren") : "2 dagen van tevoren");

      const atWord = t ? t("notifications.at", "om") : "om";
      const cleanTijd = tijd ? (tijd.length > 5 ? tijd.slice(0, 5) : tijd) : "";
      const bodyText = `${typeLabel} · ${datum} ${cleanTijd ? `${atWord} ${cleanTijd}` : ""}`.trim();
      const appTitle = t ? t("agenda.reminderAlert", "Herinnering voor afspraak") : "Herinnering voor afspraak";

      // 1. Dispatch Web Notification if granted
      if (isBrowserNotificationSupported() && Notification.permission === "granted") {
        sendBrowserNotification(`${appTitle}: ${title}`, {
          body: bodyText,
          tag,
        });
      }

      // 2. Also register in the platform Notifications list
      createNotification({
        userId: userId || a.created_by || null,
        type: "reminder",
        title: `${appTitle}: ${title}`,
        message: bodyText,
        link: "/agenda",
        metadata: { eventId: a.id, datum, tijd, reminderType },
      });
    }
  });
}

