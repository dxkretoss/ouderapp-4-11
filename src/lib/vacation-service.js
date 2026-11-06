import { supabase } from "@/lib/supabase";

const listeners = new Set();
let cachedVacations = [];
let isLoaded = false;

function notify() {
  listeners.forEach((fn) => {
    try {
      fn(cachedVacations);
    } catch (e) {
      console.warn("Error in vacation subscriber:", e);
    }
  });
}

export function subscribeVacations(fn) {
  listeners.add(fn);
  if (isLoaded) {
    fn(cachedVacations);
  }
  return () => listeners.delete(fn);
}

export function getCachedVacations() {
  return cachedVacations;
}

/**
 * Fetch all vacations dynamically from the manage-vacations Edge Function
 */
export async function fetchVacationsData(userId) {
  if (!userId) {
    return cachedVacations;
  }

  try {
    const { data, error } = await supabase.functions.invoke("manage-vacations", {
      body: { action: "list", user_id: userId },
    });

    if (error) {
      console.warn("fetchVacationsData edge function error:", error);
      return cachedVacations;
    }

    if (data?.success && Array.isArray(data.vacations)) {
      // Exclude legacy auto-seeded demo mock vacations
      const cleanVacations = data.vacations.filter((row) => {
        const details = (row.details || "").toLowerCase();
        const title = (row.title || row.naam || "").toLowerCase();
        const isLegacySeed =
          details.includes("skiën oostenrijk") ||
          details.includes("skiing austria") ||
          details.includes("paasbrunch bij oma") ||
          details.includes("vertrek 10:00 uur") ||
          (row.assigned_to === "open" && (title.includes("zomervakantie deel") || title.includes("summer vacation part") || title === "kerst" || title === "christmas"));
        return !isLegacySeed;
      });
      cachedVacations = cleanVacations.map(normalizeVacation);
      isLoaded = true;
      notify();
      return cachedVacations;
    }
  } catch (err) {
    console.warn("Error fetching vacations:", err);
  }
  return cachedVacations;
}

/**
 * Normalize database row to the UI vacation format
 */
export function normalizeVacation(row) {
  return {
    id: row.id,
    naam: row.title || row.naam,
    periode: row.period || row.periode,
    ouder: row.assigned_to || row.ouder || "open",
    assigned_parent_id: row.assigned_parent_id,
    details: row.details || "",
    status: row.status || "open",
    proposed_by: row.proposed_by,
    created_by: row.created_by,
    travel_details: row.travel_details || {},
  };
}

/**
 * Create a new vacation proposal via manage-vacations Edge Function
 */
export async function createVacationProposal(userId, payload) {
  try {
    const { data, error } = await supabase.functions.invoke("manage-vacations", {
      body: {
        action: "create",
        user_id: userId,
        title: payload.naam || payload.title,
        period: payload.periode || payload.period,
        start_date: payload.start_date,
        end_date: payload.end_date,
        assigned_to: payload.ouder || payload.assigned_to || "open",
        assigned_parent_id: payload.assigned_parent_id,
        details: payload.details || "",
        travel_details: payload.travel_details || {},
      },
    });

    if (error) throw new Error(error.message);

    if (data?.success && data.vacation) {
      const normalized = normalizeVacation(data.vacation);
      cachedVacations = [...cachedVacations, normalized];
      notify();
      return normalized;
    }
  } catch (err) {
    console.error("createVacationProposal error:", err);
    throw err;
  }
}

/**
 * Propose split for an open vacation via manage-vacations Edge Function
 */
export async function proposeVacationSplit(userId, id, assignedTo, assignedParentId) {
  try {
    const { data, error } = await supabase.functions.invoke("manage-vacations", {
      body: {
        action: "propose_split",
        id,
        user_id: userId,
        assigned_to: assignedTo,
        assigned_parent_id: assignedParentId,
      },
    });

    if (error) throw new Error(error.message);

    if (data?.success && data.vacation) {
      const normalized = normalizeVacation(data.vacation);
      cachedVacations = cachedVacations.map((v) => (v.id === id ? normalized : v));
      notify();
      return normalized;
    }
  } catch (err) {
    console.error("proposeVacationSplit error:", err);
    throw err;
  }
}

/**
 * Accept a vacation proposal via manage-vacations Edge Function
 */
export async function acceptVacationProposal(userId, id) {
  try {
    const { data, error } = await supabase.functions.invoke("manage-vacations", {
      body: {
        action: "accept_split",
        id,
        user_id: userId,
      },
    });

    if (error) throw new Error(error.message);

    if (data?.success && data.vacation) {
      const normalized = normalizeVacation(data.vacation);
      cachedVacations = cachedVacations.map((v) => (v.id === id ? normalized : v));
      notify();
      return normalized;
    }
  } catch (err) {
    console.error("acceptVacationProposal error:", err);
    throw err;
  }
}

/**
 * Retract a vacation proposal via manage-vacations Edge Function
 */
export async function retractVacationProposal(userId, id) {
  try {
    const { data, error } = await supabase.functions.invoke("manage-vacations", {
      body: {
        action: "retract_proposal",
        id,
        user_id: userId,
      },
    });

    if (error) throw new Error(error.message);

    if (data?.success && data.vacation) {
      const normalized = normalizeVacation(data.vacation);
      cachedVacations = cachedVacations.map((v) => (v.id === id ? normalized : v));
      notify();
      return normalized;
    }
  } catch (err) {
    console.error("retractVacationProposal error:", err);
    throw err;
  }
}

/**
 * Delete a vacation via manage-vacations Edge Function
 */
export async function deleteVacation(userId, id) {
  try {
    const { data, error } = await supabase.functions.invoke("manage-vacations", {
      body: {
        action: "delete",
        id,
        user_id: userId,
      },
    });

    if (error) throw new Error(error.message);

    if (data?.success) {
      cachedVacations = cachedVacations.filter((v) => v.id !== id);
      notify();
      return true;
    }
  } catch (err) {
    console.error("deleteVacation error:", err);
    throw err;
  }
}
