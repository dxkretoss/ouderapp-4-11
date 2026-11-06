import { supabase, isConfigured } from "@/lib/supabase";

/**
 * Universal Calendar Service (Database-First, Rule 1 & Plan Compliant)
 */

export async function fetchCalendarEvents(userId, startDate, endDate, allowedChildIds = null) {
  if (!isConfigured || !userId) return [];

  try {
    let query = supabase
      .from("calendar_events")
      .select(`
        *,
        child:children(id, name, color_code)
      `)
      .neq("status", "cancelled")
      .or(`is_shared.eq.true,created_by.eq.${userId},is_shared.is.null`);

    if (startDate) query = query.gte("start_date", startDate);
    if (endDate) query = query.lte("start_date", endDate);

    const { data, error } = await query.order("start_date", { ascending: true });
    if (error) {
      console.error("[calendar-service] fetchCalendarEvents error:", error);
      return [];
    }
    const childIdSet = Array.isArray(allowedChildIds) && allowedChildIds.length > 0 ? new Set(allowedChildIds) : null;
    // Strict privacy & child segregation enforcement:
    // 1. A private appointment is ONLY visible to the parent who created it.
    // 2. If an appointment is for a specific child, it is ONLY visible if:
    //    - The user created it (row.created_by === userId)
    //    - OR the child is in the user's accessible children (childIdSet.has(row.child_id))
    return (data || []).filter((row) => {
      if (row.is_shared === false && row.created_by !== userId) {
        return false;
      }
      if (childIdSet && row.child_id && !childIdSet.has(row.child_id) && row.created_by !== userId) {
        return false;
      }
      return true;
    });
  } catch (err) {
    console.error("[calendar-service] fetchCalendarEvents exception:", err);
    return [];
  }
}

export function sanitizeCalendarEventPayload(raw) {
  if (!raw || typeof raw !== "object") return raw;
  const payload = { ...raw };

  // PostgreSQL TIME WITHOUT TIME ZONE throws 22007 if given empty string ""
  if (typeof payload.start_time === "string") {
    payload.start_time = payload.start_time.trim() || null;
  } else if (!payload.start_time) {
    payload.start_time = null;
  }

  if (typeof payload.end_time === "string") {
    payload.end_time = payload.end_time.trim() || null;
  } else if (!payload.end_time) {
    payload.end_time = null;
  }

  if (typeof payload.child_id === "string" && !payload.child_id.trim()) {
    payload.child_id = null;
  }

  if (payload.recurrence && typeof payload.recurrence === "object" && payload.recurrence.freq === "geen") {
    payload.recurrence = "eenmalig";
  }

  return payload;
}

let hasReminderColumn = true;

export async function createCalendarEvent(eventData) {
  if (!isConfigured) throw new Error("Supabase is not configured");

  const cleanData = sanitizeCalendarEventPayload(eventData);
  const payload = hasReminderColumn ? cleanData : (({ reminder, ...rest }) => rest)(cleanData);

  const { data, error } = await supabase
    .from("calendar_events")
    .insert([payload])
    .select()
    .single();

  if (error) {
    const isReminderError = error.code === "PGRST204" || 
      String(error.message || "").toLowerCase().includes("reminder");

    if (isReminderError) {
      hasReminderColumn = false;
      console.warn("[calendar-service] 'reminder' column not in database yet, retrying insert without it...");
      const { reminder, ...fallbackData } = payload;
      const { data: retryData, error: retryError } = await supabase
        .from("calendar_events")
        .insert([fallbackData])
        .select()
        .single();
      if (!retryError && retryData) {
        return { ...retryData, reminder: eventData.reminder || "geen" };
      }
      console.error("[calendar-service] Retry without reminder also failed:", retryError);
      throw retryError || error;
    }
    console.error("[calendar-service] createCalendarEvent error:", error);
    throw error;
  }
  return data;
}

export async function updateCalendarEvent(eventId, updates) {
  if (!isConfigured || !eventId) throw new Error("Missing parameters");

  const cleanUpdates = sanitizeCalendarEventPayload(updates);
  const payload = hasReminderColumn ? cleanUpdates : (({ reminder, ...rest }) => rest)(cleanUpdates);

  const { data, error } = await supabase
    .from("calendar_events")
    .update({
      ...payload,
      updated_at: new Date().toISOString(),
    })
    .eq("id", eventId)
    .select()
    .single();

  if (error) {
    const isReminderError = error.code === "PGRST204" || 
      String(error.message || "").toLowerCase().includes("reminder");

    if (isReminderError) {
      hasReminderColumn = false;
      console.warn("[calendar-service] 'reminder' column not in database yet, retrying update without it...");
      const { reminder, ...fallbackUpdates } = payload;
      const { data: retryData, error: retryError } = await supabase
        .from("calendar_events")
        .update({
          ...fallbackUpdates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", eventId)
        .select()
        .single();
      if (!retryError && retryData) {
        return { ...retryData, reminder: updates.reminder || "geen" };
      }
      console.error("[calendar-service] Retry update without reminder failed:", retryError);
      throw retryError || error;
    }
    console.error("[calendar-service] updateCalendarEvent error:", error);
    throw error;
  }
  return data;
}

export async function proposeEventChange(eventId, proposedChanges, proposedByUserId) {
  if (!isConfigured || !eventId) throw new Error("Missing parameters");

  const proposalPayload = {
    ...proposedChanges,
    proposed_by: proposedByUserId,
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("calendar_events")
    .update({
      pending_proposal: proposalPayload,
      updated_at: new Date().toISOString(),
    })
    .eq("id", eventId)
    .select()
    .single();

  if (error) {
    console.error("[calendar-service] proposeEventChange error:", error);
    throw error;
  }
  return data;
}

export async function respondToEventProposal(eventId, action) {
  if (!isConfigured || !eventId) return;

  if (action === "accept") {
    const { data: event } = await supabase
      .from("calendar_events")
      .select("pending_proposal")
      .eq("id", eventId)
      .single();

    if (!event?.pending_proposal) return;

    const prop = event.pending_proposal;

    // Handle deletion proposals
    if (prop.action === "delete" || prop.type === "delete" || prop.soort === "verwijder") {
      if (prop.bereik === "alleen" && prop.datum) {
        const { data: cur } = await supabase
          .from("calendar_events")
          .select("skipped_dates")
          .eq("id", eventId)
          .single();
        const existingSkipped = Array.isArray(cur?.skipped_dates) ? cur.skipped_dates : [];
        const nextSkipped = [...new Set([...existingSkipped, prop.datum])];
        return updateCalendarEvent(eventId, { skipped_dates: nextSkipped, pending_proposal: null });
      }
      return deleteCalendarEvent(eventId);
    }

    const updates = {
      title: prop.title || prop.titel || undefined,
      start_date: prop.start_date || prop.datum || undefined,
      start_time: prop.start_time || prop.tijd || undefined,
      end_date: prop.end_date || undefined,
      end_time: prop.end_time || prop.eindtijd || undefined,
      category: prop.category || prop.categorie || undefined,
      location: prop.location || prop.locatie || undefined,
      description: prop.description || prop.toelichting || undefined,
      recurrence: prop.recurrence || prop.herhaling || undefined,
      pending_proposal: null,
      updated_at: new Date().toISOString(),
    };
    if (hasReminderColumn && (prop.reminder || prop.herinnering)) {
      updates.reminder = prop.reminder || prop.herinnering;
    }

    let { data, error } = await supabase
      .from("calendar_events")
      .update(updates)
      .eq("id", eventId)
      .select()
      .single();

    if (error && (error.code === "PGRST204" || String(error.message || "").toLowerCase().includes("reminder"))) {
      hasReminderColumn = false;
      delete updates.reminder;
      const res = await supabase
        .from("calendar_events")
        .update(updates)
        .eq("id", eventId)
        .select()
        .single();
      data = res.data;
      error = res.error;
    }

    if (error) throw error;
    return data;
  } else if (action === "reject") {
    const { data, error } = await supabase
      .from("calendar_events")
      .update({ pending_proposal: null, updated_at: new Date().toISOString() })
      .eq("id", eventId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

export async function deleteCalendarEvent(eventId) {
  if (!isConfigured || !eventId) return;

  const { error } = await supabase
    .from("calendar_events")
    .delete()
    .eq("id", eventId);

  if (error) {
    console.error("[calendar-service] deleteCalendarEvent error:", error);
    throw error;
  }
  return true;
}
