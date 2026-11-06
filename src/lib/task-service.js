import { supabase } from "@/lib/supabase";

const listeners = new Set();
let cachedTasks = [];
let isLoaded = false;

function notify() {
  listeners.forEach((fn) => {
    try {
      fn(cachedTasks);
    } catch (e) {
      console.warn("Error in task subscriber:", e);
    }
  });
}

export function subscribeTasks(fn) {
  listeners.add(fn);
  if (isLoaded) {
    fn(cachedTasks);
  }
  return () => listeners.delete(fn);
}

export function getCachedTasks() {
  return cachedTasks;
}

export async function fetchTasks(userId) {
  if (!userId) return cachedTasks;

  try {
    const { data, error } = await supabase.functions.invoke("manage-tasks", {
      body: { action: "list", user_id: userId },
    });

    if (error) {
      console.warn("fetchTasks error:", error);
      return cachedTasks;
    }

    if (data?.success && Array.isArray(data.tasks)) {
      cachedTasks = data.tasks;
      isLoaded = true;
      notify();
    }
    return cachedTasks;
  } catch (err) {
    console.warn("fetchTasks exception:", err);
    return cachedTasks;
  }
}

export async function createTask(taskData) {
  try {
    const { data, error } = await supabase.functions.invoke("manage-tasks", {
      body: { action: "create", ...taskData },
    });

    if (error) throw error;
    if (data?.success && data.task) {
      cachedTasks = [data.task, ...cachedTasks];
      notify();
      return data.task;
    }
    throw new Error(data?.error || "Failed to create task");
  } catch (err) {
    console.error("createTask error:", err);
    throw err;
  }
}

export async function toggleTask(id, isCompleted) {
  try {
    // Optimistic update
    cachedTasks = cachedTasks.map((t) =>
      t.id === id ? { ...t, is_completed: isCompleted } : t
    );
    notify();

    const { data, error } = await supabase.functions.invoke("manage-tasks", {
      body: { action: "toggle", id, is_completed: isCompleted },
    });

    if (error) throw error;
    if (data?.success && data.task) {
      cachedTasks = cachedTasks.map((t) => (t.id === id ? data.task : t));
      notify();
      return data.task;
    }
  } catch (err) {
    console.error("toggleTask error:", err);
    // revert
    cachedTasks = cachedTasks.map((t) =>
      t.id === id ? { ...t, is_completed: !isCompleted } : t
    );
    notify();
    throw err;
  }
}

export async function reassignTask(id, assignedTo, transferTo) {
  try {
    const { data, error } = await supabase.functions.invoke("manage-tasks", {
      body: { action: "reassign", id, assigned_to: assignedTo, transfer_to: transferTo },
    });

    if (error) throw error;
    if (data?.success && data.task) {
      cachedTasks = cachedTasks.map((t) => (t.id === id ? data.task : t));
      notify();
      return data.task;
    }
  } catch (err) {
    console.error("reassignTask error:", err);
    throw err;
  }
}

export async function deleteTask(id) {
  try {
    cachedTasks = cachedTasks.filter((t) => t.id !== id);
    notify();

    const { data, error } = await supabase.functions.invoke("manage-tasks", {
      body: { action: "delete", id },
    });

    if (error) throw error;
    return data?.success;
  } catch (err) {
    console.error("deleteTask error:", err);
    throw err;
  }
}
