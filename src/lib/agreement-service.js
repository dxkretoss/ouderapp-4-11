import { supabase } from "@/lib/supabase";

const listeners = new Set();
let cachedAgreements = [];
let isLoaded = false;

function notify() {
  listeners.forEach((fn) => {
    try {
      fn(cachedAgreements);
    } catch (e) {
      console.warn("Error in agreement subscriber:", e);
    }
  });
}

export function subscribeAgreements(fn) {
  listeners.add(fn);
  if (isLoaded) {
    fn(cachedAgreements);
  }
  return () => listeners.delete(fn);
}

export function getCachedAgreements() {
  return cachedAgreements;
}

export async function fetchAgreements(userId, agreementType) {
  if (!userId) return cachedAgreements;

  try {
    const { data, error } = await supabase.functions.invoke("manage-agreements", {
      body: { action: "list", user_id: userId, agreement_type: agreementType },
    });

    if (!error && data?.success && Array.isArray(data.agreements)) {
      cachedAgreements = data.agreements;
      isLoaded = true;
      notify();
      return cachedAgreements;
    }
  } catch (err) {
    console.warn("fetchAgreements edge invoke notice:", err);
  }

  // Direct table query fallback
  try {
    let query = supabase
      .from("parent_agreements")
      .select("*, child:children(id, name)")
      .order("created_at", { ascending: false });

    if (agreementType) {
      query = query.eq("agreement_type", agreementType);
    }

    const { data: directData, error: directErr } = await query;
    if (!directErr && Array.isArray(directData)) {
      cachedAgreements = directData;
      isLoaded = true;
      notify();
      return cachedAgreements;
    }
  } catch (tableErr) {
    console.warn("fetchAgreements direct table query notice:", tableErr);
  }

  return cachedAgreements;
}

export async function proposeAgreement(meta) {
  try {
    const isEdit = Boolean(meta.id);
    let result = null;

    // 1. Try Edge Function
    try {
      const { data, error } = await supabase.functions.invoke("manage-agreements", {
        body: {
          action: isEdit ? "propose_change" : "propose",
          ...meta,
        },
      });

      if (!error && data?.success && data.agreement) {
        result = data.agreement;
      }
    } catch (edgeErr) {
      console.warn("proposeAgreement edge invoke notice:", edgeErr);
    }

    // 2. Direct database query fallback
    if (!result) {
      if (isEdit) {
        const updatePayload = {
          proposal_text: meta.proposal_text,
          proposal_type: "change",
          proposed_by: meta.user_id,
          status: "pending",
          updated_at: new Date().toISOString(),
        };
        const { data: updated, error: updErr } = await supabase
          .from("parent_agreements")
          .update(updatePayload)
          .eq("id", meta.id)
          .select("*, child:children(id, name)")
          .maybeSingle();

        if (!updErr && updated) result = updated;
      } else {
        const insertPayload = {
          user_id: meta.user_id,
          child_id: meta.child_id || null,
          title: meta.title,
          description: meta.description,
          category: meta.category || "Overig",
          agreement_type: meta.agreement_type || "agreement",
          status: "pending",
          proposed_by: meta.user_id,
          proposal_type: meta.proposal_type || "new",
          proposal_text: meta.proposal_text || meta.description,
          history: [
            {
              date: new Date().toISOString(),
              actor: "Ouder",
              action: "Nieuwe afspraak voorgesteld",
            },
          ],
        };
        const { data: inserted, error: insErr } = await supabase
          .from("parent_agreements")
          .insert([insertPayload])
          .select("*, child:children(id, name)")
          .maybeSingle();

        if (!insErr && inserted) result = inserted;
      }
    }

    if (result) {
      if (isEdit) {
        cachedAgreements = cachedAgreements.map((a) =>
          a.id === meta.id ? result : a
        );
      } else {
        cachedAgreements = [result, ...cachedAgreements];
      }
      notify();
      return result;
    }

    throw new Error("Failed to propose agreement");
  } catch (err) {
    console.error("proposeAgreement error:", err);
    throw err;
  }
}

export async function respondToProposal(id, userId, choice, counterText) {
  const existing = cachedAgreements.find((a) => a.id === id);
  let newStatus = choice === "accept" 
    ? (existing?.proposal_type === "stop" ? "stopped" : "active") 
    : choice === "reject" 
    ? (existing?.proposal_type === "new" ? "rejected" : "active") 
    : "pending";
  let newDescription = (choice === "accept" && existing?.proposal_text) ? existing.proposal_text : (existing?.description || undefined);

  const updateData = {
    status: newStatus,
    proposal_type: choice === "counter" ? "change" : null,
    proposal_text: choice === "counter" ? (counterText || "").trim() : null,
    proposed_by: choice === "counter" ? userId : null,
    co_parent_response: choice,
    co_parent_responded_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  if (newDescription) {
    updateData.description = newDescription;
  }

  // 1. Try Edge Function
  try {
    const { data } = await supabase.functions.invoke("manage-agreements", {
      body: {
        action: "respond",
        id,
        user_id: userId,
        choice,
        counter_text: counterText,
      },
    });

    if (data?.agreement) {
      cachedAgreements = cachedAgreements.map((a) =>
        a.id === id ? { ...a, ...data.agreement, ...updateData } : a
      );
      notify();
    }
  } catch (err) {
    console.warn("manage-agreements edge function respond error, running direct update:", err);
  }

  // 2. Direct database update to guarantee persistence even if cloud Edge Function is not redeployed
  try {
    const { data: dbUpdated, error: dbErr } = await supabase
      .from("parent_agreements")
      .update(updateData)
      .eq("id", id)
      .select("*, child:children(id, name)")
      .maybeSingle();

    if (!dbErr && dbUpdated) {
      cachedAgreements = cachedAgreements.map((a) => (a.id === id ? dbUpdated : a));
      notify();
      return dbUpdated;
    }
  } catch (dbEx) {
    console.warn("Direct DB fallback update notice:", dbEx);
  }

  // 3. Fallback optimistic local update
  cachedAgreements = cachedAgreements.map((a) => (a.id === id ? { ...a, ...updateData } : a));
  notify();
  return cachedAgreements.find((a) => a.id === id);
}

export async function stopAgreement(id, userId) {
  const updateData = {
    status: "stopped",
    proposal_type: "stop",
    proposed_by: userId,
    updated_at: new Date().toISOString(),
  };

  try {
    const { data } = await supabase.functions.invoke("manage-agreements", {
      body: { action: "stop", id, user_id: userId },
    });

    if (data?.agreement) {
      cachedAgreements = cachedAgreements.map((a) =>
        a.id === id ? data.agreement : a
      );
      notify();
      return data.agreement;
    }
  } catch (err) {
    console.warn("stopAgreement edge function notice, running direct update:", err);
  }

  try {
    const { data: dbUpdated } = await supabase
      .from("parent_agreements")
      .update(updateData)
      .eq("id", id)
      .select("*, child:children(id, name)")
      .maybeSingle();

    if (dbUpdated) {
      cachedAgreements = cachedAgreements.map((a) => (a.id === id ? dbUpdated : a));
      notify();
      return dbUpdated;
    }
  } catch (dbEx) {
    console.warn("stopAgreement direct DB fallback notice:", dbEx);
  }

  cachedAgreements = cachedAgreements.map((a) => (a.id === id ? { ...a, ...updateData } : a));
  notify();
  return cachedAgreements.find((a) => a.id === id);
}

export async function deleteAgreement(id) {
  try {
    cachedAgreements = cachedAgreements.filter((a) => a.id !== id);
    notify();

    try {
      await supabase.functions.invoke("manage-agreements", {
        body: { action: "delete", id },
      });
    } catch {}

    await supabase.from("parent_agreements").delete().eq("id", id);
    return true;
  } catch (err) {
    console.error("deleteAgreement error:", err);
    throw err;
  }
}
