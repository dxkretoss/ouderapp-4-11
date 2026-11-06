import { supabase } from "@/lib/supabase";

const listeners = new Set();
let cachedItems = [];
let isLoaded = false;
let currentLoadedUserId = null;

function notify() {
  listeners.forEach((fn) => {
    try {
      fn(cachedItems);
    } catch (e) {
      console.warn("Error in still-needed subscriber:", e);
    }
  });
}

export function subscribeStillNeeded(fn) {
  listeners.add(fn);
  if (isLoaded) {
    fn(cachedItems);
  }
  return () => listeners.delete(fn);
}

export function getCachedStillNeeded() {
  return cachedItems;
}

const STORAGE_KEY = (userId) => `ouderapp_still_needed_${userId || "demo"}`;

function saveToLocalStorage(userId, items) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY(userId), JSON.stringify(items));
  } catch (e) {}
}

function loadFromLocalStorage(userId) {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY(userId));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return [];
}

/**
 * Fetch Still Needed items from Supabase Edge Function (with fallback to direct query and local storage).
 */
export async function fetchStillNeeded(userId) {
  if (currentLoadedUserId !== userId) {
    cachedItems = [];
    isLoaded = false;
    currentLoadedUserId = userId;
  }

  if (!userId) {
    cachedItems = loadFromLocalStorage("demo");
    isLoaded = true;
    notify();
    return cachedItems;
  }

  // 1. Try Supabase Edge Function (Rule 1)
  try {
    const { data, error } = await supabase.functions.invoke("manage-still-needed", {
      body: { action: "list", user_id: userId },
    });

    if (!error && data?.success && Array.isArray(data.items)) {
      cachedItems = data.items;
      isLoaded = true;
      saveToLocalStorage(userId, cachedItems);
      notify();
      return cachedItems;
    }
  } catch (edgeErr) {
    console.warn("manage-still-needed Edge Function list exception, trying direct query:", edgeErr);
  }

  // 2. Direct Supabase PostgREST query fallback (if Edge Function not yet deployed)
  try {
    const { data: dbItems, error: dbErr } = await supabase
      .from("still_needed_items")
      .select("*")
      .order("created_at", { ascending: false });

    if (!dbErr && Array.isArray(dbItems)) {
      cachedItems = dbItems;
      isLoaded = true;
      saveToLocalStorage(userId, cachedItems);
      notify();
      return cachedItems;
    }
  } catch (dbErr) {
    console.warn("Direct still_needed_items query fallback exception:", dbErr);
  }

  // 3. Fallback to localStorage
  const local = loadFromLocalStorage(userId);
  if (local.length > 0) {
    cachedItems = local;
    isLoaded = true;
    notify();
  }
  return cachedItems;
}

/**
 * Create a new Still Needed item.
 */
export async function createStillNeededItem({
  userId,
  title,
  category = "Nodig",
  childName,
  childId,
  isPurchased = false,
  budgetId,
  deadline,
  notes,
}) {
  const tempId = `temp_${Date.now()}`;
  const newItem = {
    id: tempId,
    user_id: userId,
    title: title.trim(),
    category,
    child_name: childName,
    child_id: childId,
    is_purchased: Boolean(isPurchased),
    budget_id: budgetId || null,
    deadline: deadline || null,
    notes: notes || null,
    created_at: new Date().toISOString(),
  };

  // Optimistic update
  cachedItems = [newItem, ...cachedItems];
  saveToLocalStorage(userId, cachedItems);
  notify();

  if (!userId) return newItem;

  // 1. Try Supabase Edge Function (Rule 1)
  try {
    const { data, error } = await supabase.functions.invoke("manage-still-needed", {
      body: {
        action: "create",
        user_id: userId,
        title: title.trim(),
        category,
        child_name: childName,
        child_id: childId,
        is_purchased: isPurchased,
        budget_id: budgetId,
        deadline,
        notes,
      },
    });

    if (!error && data?.success && data.item) {
      cachedItems = cachedItems.map((i) => (i.id === tempId ? data.item : i));
      saveToLocalStorage(userId, cachedItems);
      notify();
      return data.item;
    }
  } catch (edgeErr) {
    console.warn("manage-still-needed create exception, trying direct query fallback:", edgeErr);
  }

  // 2. Direct Supabase PostgREST query fallback
  try {
    const insertPayload = {
      user_id: userId,
      title: title.trim(),
      category,
      child_name: childName || null,
      is_purchased: Boolean(isPurchased),
      deadline: deadline || null,
      notes: notes || null,
    };
    if (childId) insertPayload.child_id = childId;
    if (budgetId) insertPayload.budget_id = budgetId;
    if (isPurchased) {
      insertPayload.purchased_by = userId;
      insertPayload.purchased_at = new Date().toISOString();
    }

    const { data: dbItem, error: dbErr } = await supabase
      .from("still_needed_items")
      .insert([insertPayload])
      .select()
      .single();

    if (!dbErr && dbItem) {
      cachedItems = cachedItems.map((i) => (i.id === tempId ? dbItem : i));
      saveToLocalStorage(userId, cachedItems);
      notify();
      return dbItem;
    }
  } catch (dbErr) {
    console.warn("Direct still_needed_items insert fallback exception:", dbErr);
  }

  return newItem;
}

/**
 * Toggle purchased status of an item.
 */
export async function toggleStillNeededItem({ id, userId, isPurchased }) {
  // Optimistic update
  cachedItems = cachedItems.map((i) =>
    i.id === id
      ? {
          ...i,
          is_purchased: isPurchased,
          purchased_by: isPurchased ? userId : null,
          purchased_at: isPurchased ? new Date().toISOString() : null,
        }
      : i
  );
  saveToLocalStorage(userId, cachedItems);
  notify();

  if (!userId) return;

  // 1. Try Supabase Edge Function (Rule 1)
  try {
    const { data, error } = await supabase.functions.invoke("manage-still-needed", {
      body: { action: "toggle", id, user_id: userId, is_purchased: isPurchased },
    });

    if (!error && data?.success && data.item) {
      cachedItems = cachedItems.map((i) => (i.id === id ? data.item : i));
      saveToLocalStorage(userId, cachedItems);
      notify();
      return data.item;
    }
  } catch (edgeErr) {
    console.warn("manage-still-needed toggle exception, trying direct query fallback:", edgeErr);
  }

  // 2. Direct Supabase PostgREST query fallback
  try {
    const updatePayload = {
      is_purchased: Boolean(isPurchased),
      purchased_by: isPurchased ? userId : null,
      purchased_at: isPurchased ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    };
    const { data: dbItem, error: dbErr } = await supabase
      .from("still_needed_items")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (!dbErr && dbItem) {
      cachedItems = cachedItems.map((i) => (i.id === id ? dbItem : i));
      saveToLocalStorage(userId, cachedItems);
      notify();
      return dbItem;
    }
  } catch (dbErr) {
    console.warn("Direct still_needed_items toggle fallback exception:", dbErr);
  }
}

/**
 * Link a confirmed budget proposal to an item.
 */
export async function linkStillNeededBudget({ id, userId, budgetId }) {
  // Optimistic update
  cachedItems = cachedItems.map((i) => (i.id === id ? { ...i, budget_id: budgetId } : i));
  saveToLocalStorage(userId, cachedItems);
  notify();

  if (!userId) return;

  // 1. Try Supabase Edge Function (Rule 1)
  try {
    const { data, error } = await supabase.functions.invoke("manage-still-needed", {
      body: { action: "link_budget", id, budget_id: budgetId },
    });

    if (!error && data?.success && data.item) {
      cachedItems = cachedItems.map((i) => (i.id === id ? data.item : i));
      saveToLocalStorage(userId, cachedItems);
      notify();
      return data.item;
    }
  } catch (edgeErr) {
    console.warn("manage-still-needed link_budget exception, trying direct query fallback:", edgeErr);
  }

  // 2. Direct Supabase PostgREST query fallback
  try {
    const { data: dbItem, error: dbErr } = await supabase
      .from("still_needed_items")
      .update({ budget_id: budgetId, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (!dbErr && dbItem) {
      cachedItems = cachedItems.map((i) => (i.id === id ? dbItem : i));
      saveToLocalStorage(userId, cachedItems);
      notify();
      return dbItem;
    }
  } catch (dbErr) {
    console.warn("Direct still_needed_items link_budget fallback exception:", dbErr);
  }
}

/**
 * Update an existing Still Needed item.
 */
export async function updateStillNeededItem({ id, userId, title, category, childName, childId, deadline, notes }) {
  // Optimistic update
  cachedItems = cachedItems.map((i) =>
    i.id === id
      ? {
          ...i,
          title: title !== undefined ? title.trim() : i.title,
          category: category !== undefined ? category : i.category,
          child_name: childName !== undefined ? childName : i.child_name,
          child_id: childId !== undefined ? childId : i.child_id,
          deadline: deadline !== undefined ? deadline : i.deadline,
          notes: notes !== undefined ? notes : i.notes,
          updated_at: new Date().toISOString(),
        }
      : i
  );
  saveToLocalStorage(userId, cachedItems);
  notify();

  if (!userId) return;

  // 1. Try Supabase Edge Function (Rule 1)
  try {
    const { data, error } = await supabase.functions.invoke("manage-still-needed", {
      body: { action: "update", id, title, category, child_name: childName, child_id: childId, deadline, notes },
    });

    if (!error && data?.success && data.item) {
      cachedItems = cachedItems.map((i) => (i.id === id ? data.item : i));
      saveToLocalStorage(userId, cachedItems);
      notify();
      return data.item;
    }
  } catch (edgeErr) {
    console.warn("manage-still-needed update exception, trying direct query fallback:", edgeErr);
  }

  // 2. Direct Supabase PostgREST query fallback
  try {
    const updatePayload = {
      updated_at: new Date().toISOString(),
    };
    if (title !== undefined) updatePayload.title = title.trim();
    if (category !== undefined) updatePayload.category = category;
    if (childName !== undefined) updatePayload.child_name = childName;
    if (childId !== undefined) updatePayload.child_id = childId;
    if (deadline !== undefined) updatePayload.deadline = deadline;
    if (notes !== undefined) updatePayload.notes = notes;

    const { data: dbItem, error: dbErr } = await supabase
      .from("still_needed_items")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (!dbErr && dbItem) {
      cachedItems = cachedItems.map((i) => (i.id === id ? dbItem : i));
      saveToLocalStorage(userId, cachedItems);
      notify();
      return dbItem;
    }
  } catch (dbErr) {
    console.warn("Direct still_needed_items update fallback exception:", dbErr);
  }
}

/**
 * Delete a Still Needed item.
 */
export async function deleteStillNeededItem({ id, userId }) {
  cachedItems = cachedItems.filter((i) => i.id !== id);
  saveToLocalStorage(userId, cachedItems);
  notify();

  if (!userId) return;

  // 1. Try Supabase Edge Function (Rule 1)
  try {
    await supabase.functions.invoke("manage-still-needed", {
      body: { action: "delete", id },
    });
  } catch (edgeErr) {
    console.warn("manage-still-needed delete exception, trying direct query fallback:", edgeErr);
    try {
      await supabase.from("still_needed_items").delete().eq("id", id);
    } catch (dbErr) {
      console.warn("Direct still_needed_items delete fallback exception:", dbErr);
    }
  }
}

