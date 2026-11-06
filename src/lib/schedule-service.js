import { supabase, isConfigured } from "@/lib/supabase";

/**
 * Care Schedule Proposals Service (Verzoeken om te wijzigen)
 * Registered in SUPABASE_REGISTRY.md (Table 16)
 */

export async function fetchCareScheduleProposals(userId) {
  if (!isConfigured || !userId) return [];

  try {
    // 1. Fetch user's linked children to enforce child privacy
    let userChildIds = new Set();
    try {
      const [{ data: links }, { data: createdKids }] = await Promise.all([
        supabase.from("child_parents").select("child_id").eq("parent_id", userId),
        supabase.from("children").select("id").eq("created_by", userId),
      ]);
      (links || []).forEach((l) => l.child_id && userChildIds.add(l.child_id));
      (createdKids || []).forEach((k) => k.id && userChildIds.add(k.id));
    } catch (_) {}

    const { data, error } = await supabase
      .from("care_schedule_proposals")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("[schedule-service] fetchCareScheduleProposals error:", error);
      return [];
    }

    // Strict privacy segregation: only proposals created by user or targeting their linked children
    const filtered = (data || []).filter((p) => {
      if (p.created_by === userId) return true;
      if (Array.isArray(p.child_ids) && p.child_ids.length > 0) {
        return p.child_ids.some((cid) => userChildIds.has(cid));
      }
      return false;
    });

    return filtered;
  } catch (err) {
    console.warn("[schedule-service] fetchCareScheduleProposals exception:", err);
    return [];
  }
}

export async function createCareScheduleProposal(payload) {
  if (!isConfigured) throw new Error("Supabase is not configured");

  const cleanPayload = {
    created_by: payload.created_by || payload.userId,
    child_ids: payload.child_ids || payload.childIds || [],
    type: payload.type || "onetime",
    proposal_date: payload.proposal_date || payload.proposalDate,
    swap_with_date: payload.swap_with_date || payload.swapWithDate || null,
    proposing_parent_name: payload.proposing_parent_name || payload.proposingParentName || "Ouder",
    note: payload.note || "",
    impact_note: payload.impact_note || payload.impactNote || null,
    status: "pending",
  };

  if (payload.target_parent_name || payload.targetParentName) {
    cleanPayload.target_parent_name = payload.target_parent_name || payload.targetParentName;
  }

  let { data, error } = await supabase
    .from("care_schedule_proposals")
    .insert([cleanPayload])
    .select()
    .single();

  // Graceful fallback if target_parent_name column is not yet present in Supabase table
  if (error && (error.code === "42703" || error.message?.includes("target_parent_name"))) {
    delete cleanPayload.target_parent_name;
    const retry = await supabase
      .from("care_schedule_proposals")
      .insert([cleanPayload])
      .select()
      .single();
    data = retry.data;
    error = retry.error;
  }

  if (error) {
    console.error("[schedule-service] createCareScheduleProposal error:", error);
    throw error;
  }
  return data;
}

/**
 * Normalizes a care schedule proposal from Supabase into the application representation.
 */
export function mapCareScheduleProposal(p, currentUserId, currentUserName = "You", isEn = false) {
  const isOneTime = p.type === "onetime" || p.type === "eenmalig";

  // Parse days range from impact_note if present (e.g. "6 to 16 November" or "6 t/m 16 november")
  let extractedDays = [];
  if (p.impact_note) {
    const rangeMatch = p.impact_note.match(/(\d+)\s*(?:to|t\/m|-)\s*(\d+)/i);
    if (rangeMatch) {
      const sDay = parseInt(rangeMatch[1], 10);
      const eDay = parseInt(rangeMatch[2], 10);
      if (!isNaN(sDay) && !isNaN(eDay) && sDay <= eDay) {
        extractedDays = Array.from({ length: eDay - sDay + 1 }, (_, i) => sDay + i);
      }
    } else {
      const singleMatch = p.impact_note.match(/\b(\d{1,2})\b/);
      if (singleMatch) {
        const sDay = parseInt(singleMatch[1], 10);
        if (!isNaN(sDay)) extractedDays = [sDay];
      }
    }
  }

  if (extractedDays.length === 0) {
    const fallbackDay = p.proposal_date ? new Date(p.proposal_date).getDate() : 1;
    extractedDays = [fallbackDay || 1];
  }

  const van = p.proposing_parent_name || (p.created_by === currentUserId ? currentUserName : (isEn ? "Co-parent" : "Mede-ouder"));
  const targetParentName = p.target_parent_name || p.proposing_parent_name || (p.created_by === currentUserId ? currentUserName : (isEn ? "Co-parent" : "Mede-ouder"));

  return {
    id: p.id,
    soort: isOneTime ? "eenmalig" : "structureel",
    van,
    kinderen: Array.isArray(p.child_ids) && p.child_ids.length > 0 ? p.child_ids : [],
    dagen: extractedDays,
    datumLabel: p.impact_note || p.proposal_date,
    naarOuder: targetParentName,
    targetParentName,
    tekst: p.note || "",
    status: p.status === "pending" ? "open" : (p.status === "accepted" ? "geaccepteerd" : (p.status === "declined" ? "afgewezen" : "alternatief")),
    created_by: p.created_by,
  };
}

export async function respondToCareScheduleProposal(proposalId, status, counterNote = null, responderId = null) {
  if (!isConfigured || !proposalId) return null;

  const updates = {
    status, // 'accepted' | 'declined' | 'counterproposal'
    responded_by: responderId || null,
    responded_at: new Date().toISOString(),
  };

  if (counterNote) {
    updates.counter_note = counterNote;
  }

  const { data, error } = await supabase
    .from("care_schedule_proposals")
    .update(updates)
    .eq("id", proposalId)
    .select()
    .single();

  if (error) {
    console.error("[schedule-service] respondToCareScheduleProposal error:", error);
    throw error;
  }
  return data;
}

