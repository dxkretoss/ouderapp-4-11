import { supabase } from "@/lib/supabase";

const listeners = new Set();
let cachedData = {
  items: [],
  routines: [],
  logs: [],
  isLoaded: false,
};

function notify() {
  listeners.forEach((fn) => {
    try {
      fn(cachedData);
    } catch (e) {
      console.warn("Error in handover subscriber:", e);
    }
  });
}

export function subscribeHandover(fn) {
  listeners.add(fn);
  if (cachedData.isLoaded) {
    fn(cachedData);
  }
  return () => listeners.delete(fn);
}

export function getCachedHandover() {
  return cachedData;
}

/**
 * Fetch all dynamic checklist items, routines, and logs via manage-handover Edge Function
 */
export async function fetchHandoverData(userId, momentId = "w1") {
  if (!userId) {
    return cachedData;
  }

  try {
    const { data, error } = await supabase.functions.invoke("manage-handover", {
      body: { action: "get_handover_data", user_id: userId, moment_id: momentId },
    });

    if (!error && data?.success) {
      cachedData = {
        items: data.items || [],
        routines: data.routines || [],
        logs: data.logs || [],
        isLoaded: true,
      };
      notify();
      return cachedData;
    }
  } catch (err) {
    console.warn("Error calling manage-handover:", err);
  }

  // Fallback to direct tables if Edge Function fails / is not yet deployed
  try {
    // 1. Fetch user's linked children for child segregation
    let userChildIds = new Set();
    if (userId) {
      try {
        const [{ data: links }, { data: createdKids }] = await Promise.all([
          supabase.from("child_parents").select("child_id").eq("parent_id", userId),
          supabase.from("children").select("id").eq("created_by", userId),
        ]);
        (links || []).forEach((l) => l.child_id && userChildIds.add(l.child_id));
        (createdKids || []).forEach((k) => k.id && userChildIds.add(k.id));
      } catch (_) {}
    }

    // 2. Fetch connected co-parent IDs
    let parentIds = [userId];
    if (userId) {
      try {
        const { data: conns } = await supabase
          .from("parent_connections")
          .select("parent_1_id, parent_2_id")
          .or(`parent_1_id.eq.${userId},parent_2_id.eq.${userId}`)
          .in("status", ["active", "connected"]);
        if (conns) {
          conns.forEach((c) => {
            if (c.parent_1_id && !parentIds.includes(c.parent_1_id)) parentIds.push(c.parent_1_id);
            if (c.parent_2_id && !parentIds.includes(c.parent_2_id)) parentIds.push(c.parent_2_id);
          });
        }
      } catch (_) {}
    }

    const [{ data: dbItems }, { data: dbRoutines }, { data: dbLogs }] = await Promise.all([
      supabase.from("handover_checklist_items").select("*").in("user_id", parentIds).order("created_at", { ascending: true }),
      supabase.from("fixed_routines").select("*").in("user_id", parentIds).order("created_at", { ascending: true }),
      supabase.from("handover_logs").select("*, children(id, name, avatar_url)").in("user_id", parentIds).order("created_at", { ascending: false }),
    ]);

    // Enforce strict child segregation
    const filteredItems = (dbItems || []).filter((i) => {
      if (i.user_id === userId) return true;
      if (i.child_id) return userChildIds.has(i.child_id);
      return true;
    });

    const filteredRoutines = (dbRoutines || []).filter((r) => {
      if (r.user_id === userId) return true;
      if (r.child_id) return userChildIds.has(r.child_id);
      return true;
    });

    const filteredLogs = (dbLogs || []).filter((l) => {
      if (l.child_id) return userChildIds.has(l.child_id);
      return l.user_id === userId;
    });

    cachedData = {
      items: filteredItems,
      routines: filteredRoutines,
      logs: filteredLogs,
      isLoaded: true,
    };
    notify();
    return cachedData;
  } catch (dbErr) {
    console.warn("Direct handover tables fallback notice:", dbErr);
  }

  return cachedData;
}

/**
 * Add a checklist item (saved to Supabase)
 */
export async function addChecklistItem(userId, itemName, momentId = "w1", childId = null, category = "custom", itemType = "mee", location = null) {
  if (!itemName || !itemName.trim()) return null;

  // Optimistic update
  const tempId = `temp-${Date.now()}`;
  const optimisticItem = {
    id: tempId,
    user_id: userId,
    item_name: itemName.trim(),
    moment_id: momentId,
    child_id: childId,
    is_packed: false,
    category,
    item_type: itemType,
    location,
    created_at: new Date().toISOString(),
  };

  cachedData = {
    ...cachedData,
    items: [...cachedData.items, optimisticItem],
  };
  notify();

  if (!userId) return optimisticItem;

  try {
    const { data, error } = await supabase.functions.invoke("manage-handover", {
      body: {
        action: "add_item",
        user_id: userId,
        item_name: itemName.trim(),
        moment_id: momentId,
        child_id: childId,
        category,
        item_type: itemType,
        location,
      },
    });

    if (!error && data?.success && data.item) {
      cachedData = {
        ...cachedData,
        items: cachedData.items.map((i) => (i.id === tempId ? data.item : i)),
      };
      notify();
      return data.item;
    }
  } catch (err) {
    console.warn("Error adding checklist item:", err);
  }

  // Fallback to direct table insertion
  try {
    const { data: dbItem, error: dbErr } = await supabase
      .from("handover_checklist_items")
      .insert({
        user_id: userId,
        item_name: itemName.trim(),
        moment_id: momentId,
        child_id: childId,
        is_packed: false,
        category,
        item_type: itemType,
        location,
      })
      .select()
      .maybeSingle();

    if (!dbErr && dbItem) {
      cachedData = {
        ...cachedData,
        items: cachedData.items.map((i) => (i.id === tempId ? dbItem : i)),
      };
      notify();
      return dbItem;
    }
  } catch (dbErr) {
    console.warn("Direct insert fallback notice:", dbErr);
  }

  return optimisticItem;
}

/**
 * Update a checklist item (item_name, child_id, item_type, location, etc.)
 */
export async function updateChecklistItem(itemId, updates = {}) {
  // Optimistic update
  cachedData = {
    ...cachedData,
    items: cachedData.items.map((i) => (i.id === itemId ? { ...i, ...updates } : i)),
  };
  notify();

  if (String(itemId).startsWith("temp-")) return;

  try {
    const { data, error } = await supabase.functions.invoke("manage-handover", {
      body: { action: "update_item", id: itemId, ...updates },
    });

    if (!error && data?.success && data.item) {
      cachedData = {
        ...cachedData,
        items: cachedData.items.map((i) => (i.id === itemId ? data.item : i)),
      };
      notify();
      return data.item;
    }
  } catch (err) {
    console.warn("Error updating checklist item:", err);
  }

  // Fallback to direct table update
  try {
    await supabase
      .from("handover_checklist_items")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", itemId);
  } catch {}
}

/**
 * Toggle packed state on an item (saved to Supabase)
 */
export async function toggleChecklistItem(itemId, isPacked) {
  // Optimistic update
  cachedData = {
    ...cachedData,
    items: cachedData.items.map((i) => (i.id === itemId ? { ...i, is_packed: isPacked } : i)),
  };
  notify();

  if (String(itemId).startsWith("temp-")) return;

  try {
    const { error } = await supabase.functions.invoke("manage-handover", {
      body: { action: "toggle_item", id: itemId, is_packed: isPacked },
    });
    if (error) throw error;
  } catch (err) {
    console.warn("Error toggling checklist item:", err);
    // Fallback to direct table update
    try {
      await supabase
        .from("handover_checklist_items")
        .update({ is_packed: isPacked, updated_at: new Date().toISOString() })
        .eq("id", itemId);
    } catch {}
  }
}

/**
 * Delete a checklist item (saved to Supabase)
 */
export async function deleteChecklistItem(itemId) {
  // Optimistic update
  cachedData = {
    ...cachedData,
    items: cachedData.items.filter((i) => i.id !== itemId),
  };
  notify();

  if (String(itemId).startsWith("temp-")) return;

  try {
    const { error } = await supabase.functions.invoke("manage-handover", {
      body: { action: "delete_item", id: itemId },
    });
    if (error) throw error;
  } catch (err) {
    console.warn("Error deleting checklist item:", err);
    // Fallback to direct table delete
    try {
      await supabase
        .from("handover_checklist_items")
        .delete()
        .eq("id", itemId);
    } catch {}
  }
}

/**
 * Save a new handover log/note (saved to Supabase)
 */
export async function saveHandoverLog(logPayload) {
  const tempId = `log-${Date.now()}`;
  const optimisticLog = {
    id: tempId,
    ...logPayload,
    created_at: new Date().toISOString(),
  };

  cachedData = {
    ...cachedData,
    logs: [optimisticLog, ...cachedData.logs],
  };
  notify();

  if (!logPayload.user_id) return optimisticLog;

  try {
    const { data, error } = await supabase.functions.invoke("manage-handover", {
      body: { action: "save_log", ...logPayload },
    });

    if (!error && data?.success && data.log) {
      cachedData = {
        ...cachedData,
        logs: cachedData.logs.map((l) => (l.id === tempId ? data.log : l)),
      };
      notify();
      return data.log;
    }
  } catch (err) {
    console.warn("Error saving handover log:", err);
  }

  // Fallback to direct table insert
  try {
    const { data: dbLog, error: dbErr } = await supabase
      .from("handover_logs")
      .insert({ ...logPayload })
      .select()
      .maybeSingle();

    if (!dbErr && dbLog) {
      cachedData = {
        ...cachedData,
        logs: cachedData.logs.map((l) => (l.id === tempId ? dbLog : l)),
      };
      notify();
      return dbLog;
    }
  } catch (dbErr) {
    console.warn("Direct handover log insert fallback notice:", dbErr);
  }

  return optimisticLog;
}

/**
 * Add a fixed routine (saved to Supabase)
 */
export async function addFixedRoutine(routinePayload) {
  const tempId = `routine-${Date.now()}`;
  const optimisticRoutine = {
    id: tempId,
    ...routinePayload,
    created_at: new Date().toISOString(),
  };

  cachedData = {
    ...cachedData,
    routines: [...cachedData.routines, optimisticRoutine],
  };
  notify();

  if (!routinePayload.user_id) return optimisticRoutine;

  try {
    const { data, error } = await supabase.functions.invoke("manage-handover", {
      body: { action: "add_routine", ...routinePayload },
    });

    if (!error && data?.success && data.routine) {
      cachedData = {
        ...cachedData,
        routines: cachedData.routines.map((r) => (r.id === tempId ? data.routine : r)),
      };
      notify();
      return data.routine;
    }
  } catch (err) {
    console.warn("Error adding fixed routine:", err);
  }

  // Fallback to direct table insert
  try {
    const { data: dbRoutine, error: dbErr } = await supabase
      .from("fixed_routines")
      .insert({ ...routinePayload })
      .select()
      .maybeSingle();

    if (!dbErr && dbRoutine) {
      cachedData = {
        ...cachedData,
        routines: cachedData.routines.map((r) => (r.id === tempId ? dbRoutine : r)),
      };
      notify();
      return dbRoutine;
    }
  } catch (dbErr) {
    console.warn("Direct fixed routine insert fallback notice:", dbErr);
  }

  return optimisticRoutine;
}

/**
 * Delete a fixed routine (saved to Supabase)
 */
export async function deleteFixedRoutine(routineId) {
  cachedData = {
    ...cachedData,
    routines: cachedData.routines.filter((r) => r.id !== routineId),
  };
  notify();

  if (String(routineId).startsWith("routine-")) return;

  try {
    const { error } = await supabase.functions.invoke("manage-handover", {
      body: { action: "delete_routine", id: routineId },
    });
    if (error) throw error;
  } catch (err) {
    console.warn("Error deleting fixed routine:", err);
    // Fallback to direct table delete
    try {
      await supabase
        .from("fixed_routines")
        .delete()
        .eq("id", routineId);
    } catch {}
  }
}
