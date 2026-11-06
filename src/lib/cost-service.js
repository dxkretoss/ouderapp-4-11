import { supabase, isConfigured } from "@/lib/supabase";

/**
 * Universal Costs & Budget Service (Database-First, Plan Compliant)
 */

export async function fetchExpenses(userId) {
  if (!isConfigured) return [];

  try {
    const { data: edgeData, error: edgeErr } = await supabase.functions.invoke("manage-expenses", {
      body: { action: "list-expenses", userId },
    });
    if (!edgeErr && edgeData?.success && Array.isArray(edgeData.expenses)) {
      return edgeData.expenses;
    }
  } catch (invokeErr) {
    console.warn("[cost-service] list-expenses edge invoke fallback:", invokeErr);
  }

  try {
    const { data, error } = await supabase
      .from("expenses")
      .select(`
        *,
        payer:profiles!payer_id(id, name, email, avatar_url),
        child:children(id, name, color_code)
      `)
      .order("date", { ascending: false });

    if (error) {
      console.error("[cost-service] fetchExpenses error:", error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error("[cost-service] fetchExpenses exception:", err);
    return [];
  }
}

export async function createExpense(expenseData) {
  if (!isConfigured) throw new Error("Supabase is not configured");

  let created = null;
  try {
    const { data: edgeData, error: edgeErr } = await supabase.functions.invoke("manage-expenses", {
      body: { action: "create-expense", expense: expenseData },
    });
    if (!edgeErr && edgeData?.success && edgeData.expense) {
      created = edgeData.expense;
    }
  } catch (invokeErr) {
    console.warn("[cost-service] create-expense edge invoke fallback:", invokeErr);
  }

  if (!created) {
    const { data, error } = await supabase
      .from("expenses")
      .insert([expenseData])
      .select()
      .single();

    if (error) {
      console.error("[cost-service] createExpense error:", error);
      throw error;
    }
    created = data;
  }

  // If connected to an agreed budget, update budget proposal status to 'spent'
  if (expenseData.budget_id) {
    try {
      await supabase
        .from("budget_proposals")
        .update({
          status: "spent",
          updated_at: new Date().toISOString(),
        })
        .eq("id", expenseData.budget_id);

      await supabase.from("budget_steps").insert([{
        budget_id: expenseData.budget_id,
        actor_id: expenseData.payer_id,
        action_type: "Expense recorded",
        amount: expenseData.amount,
      }]);
    } catch (err) {
      console.warn("[cost-service] Failed to link expense to budget:", err);
    }
  }

  return created;
}

export async function settleExpenses(expenseIds, actorId) {
  if (!isConfigured || !expenseIds?.length) return;

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("expenses")
    .update({
      settled: true,
      settled_at: now,
      updated_at: now,
    })
    .in("id", expenseIds)
    .select();

  if (error) {
    console.error("[cost-service] settleExpenses error:", error);
    throw error;
  }
  return data;
}

export async function fetchBudgetProposals(userId) {
  if (!isConfigured) return [];

  try {
    const { data, error } = await supabase
      .from("budget_proposals")
      .select(`
        *,
        creator:profiles!created_by(id, name, avatar_url),
        child:children(id, name, color_code),
        steps:budget_steps(*)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[cost-service] fetchBudgetProposals error:", error);
      return [];
    }

    return (data || []).map((b) => ({
      ...b,
      steps: (b.steps || []).sort(
        (x, y) => new Date(x.created_at).getTime() - new Date(y.created_at).getTime()
      ),
    }));
  } catch (err) {
    console.error("[cost-service] fetchBudgetProposals exception:", err);
    return [];
  }
}

export async function createBudgetProposal(proposal) {
  if (!isConfigured) throw new Error("Supabase is not configured");

  // If turn_to_respond is missing, auto-detect connected co-parent
  if (!proposal.turn_to_respond && proposal.created_by) {
    try {
      const { data: conn } = await supabase
        .from("parent_connections")
        .select("parent_1_id, parent_2_id")
        .or(`parent_1_id.eq.${proposal.created_by},parent_2_id.eq.${proposal.created_by}`)
        .in("status", ["accepted", "active", "connected"])
        .limit(1)
        .maybeSingle();

      if (conn) {
        proposal.turn_to_respond =
          conn.parent_1_id === proposal.created_by ? conn.parent_2_id : conn.parent_1_id;
      }
    } catch (err) {
      console.warn("[cost-service] Auto-detect turn_to_respond fallback:", err);
    }
  }

  const { data, error } = await supabase
    .from("budget_proposals")
    .insert([proposal])
    .select()
    .single();

  if (error) {
    console.error("[cost-service] createBudgetProposal error:", error);
    throw error;
  }

  // Record initial proposal step
  await supabase.from("budget_steps").insert([{
    budget_id: data.id,
    actor_id: proposal.created_by,
    action_type: "Proposal",
    amount: proposal.max_amount,
  }]);

  return data;
}

export async function respondToBudgetProposal(budgetId, actorId, response, otherParentId) {
  if (!isConfigured || !budgetId) return;

  const now = new Date().toISOString();

  if (response === "agreed") {
    await supabase
      .from("budget_proposals")
      .update({
        status: "agreed",
        turn_to_respond: null,
        updated_at: now,
      })
      .eq("id", budgetId);

    await supabase.from("budget_steps").insert([{
      budget_id: budgetId,
      actor_id: actorId,
      action_type: "Agreed",
    }]);
  } else if (response === "rejected") {
    await supabase
      .from("budget_proposals")
      .update({
        status: "rejected",
        turn_to_respond: null,
        updated_at: now,
      })
      .eq("id", budgetId);

    await supabase.from("budget_steps").insert([{
      budget_id: budgetId,
      actor_id: actorId,
      action_type: "Rejected",
    }]);
  } else if (response === "more_time" || response === "need_more_time") {
    await supabase.from("budget_steps").insert([{
      budget_id: budgetId,
      actor_id: actorId,
      action_type: "More time requested",
    }]);
  } else if (typeof response === "object" && response.counterAmount) {
    let nextTurn = otherParentId;
    if (!nextTurn) {
      const { data: prop } = await supabase
        .from("budget_proposals")
        .select("created_by, turn_to_respond")
        .eq("id", budgetId)
        .single();
      if (prop) {
        nextTurn = prop.created_by === actorId ? prop.turn_to_respond : prop.created_by;
      }
    }

    await supabase
      .from("budget_proposals")
      .update({
        status: "counterproposal",
        turn_to_respond: nextTurn,
        max_amount: response.counterAmount,
        updated_at: now,
      })
      .eq("id", budgetId);

    await supabase.from("budget_steps").insert([{
      budget_id: budgetId,
      actor_id: actorId,
      action_type: "Counterproposal",
      amount: response.counterAmount,
    }]);
  }
}

export async function sendFriendlyReminder(budgetId, actorId) {
  if (!isConfigured || !budgetId) return false;

  const now = new Date().toISOString();

  // 1. Fetch current proposal reminders
  const { data: proposal, error } = await supabase
    .from("budget_proposals")
    .select("reminders_sent, preferred_response_date")
    .eq("id", budgetId)
    .single();

  if (error || !proposal) return false;

  const sent = proposal.reminders_sent || [];
  const deadline = proposal.preferred_response_date ? new Date(proposal.preferred_response_date) : null;
  const isPastDeadline = deadline && deadline < new Date();

  // 2. Count reminders sent before vs after
  let countBefore = 0;
  let countAfter = 0;
  sent.forEach((timestamp) => {
    if (deadline && new Date(timestamp) > deadline) countAfter++;
    else countBefore++;
  });

  if (!deadline && sent.length >= 1) {
    throw new Error("A reminder has already been sent for this proposal.");
  }
  if (isPastDeadline && countAfter >= 1) {
    throw new Error("A reminder has already been sent after the preferred response date.");
  }
  if (!isPastDeadline && countBefore >= 1) {
    throw new Error("A reminder has already been sent. Please wait for the other parent to respond.");
  }

  // 3. Save new reminder timestamp
  const updatedReminders = [...sent, now];
  await supabase
    .from("budget_proposals")
    .update({
      reminders_sent: updatedReminders,
      updated_at: now,
    })
    .eq("id", budgetId);

  await supabase.from("budget_steps").insert([{
    budget_id: budgetId,
    actor_id: actorId,
    action_type: "Reminder sent",
  }]);

  return true;
}

/**
 * Aggregates all open proposals for the "Arrange Together" hub
 */
export async function fetchOpenProposals(userId) {
  if (!isConfigured || !userId) return [];

  try {
    // 1. Fetch pending calendar proposals
    const { data: calendarEvents } = await supabase
      .from("calendar_events")
      .select("*")
      .neq("is_shared", false)
      .not("pending_proposal", "is", null);

    // 2. Fetch pending budget proposals
    const { data: budgetProposals } = await supabase
      .from("budget_proposals")
      .select("*")
      .in("status", ["pending", "counterproposal"]);

    const items = [];

    // Map calendar proposals
    (calendarEvents || []).forEach((event) => {
      const isAwaitingMe = event.pending_proposal?.proposed_by !== userId;
      items.push({
        id: event.id,
        source: "calendar",
        title: event.title,
        description: `Voorstel: ${event.pending_proposal?.start_date || event.start_date}`,
        status: isAwaitingMe ? "awaiting-your-response" : "awaiting-response",
        isAwaitingMe,
        link: `/calendar?event=${event.id}`,
      });
    });

    // Map budget proposals
    (budgetProposals || []).forEach((budget) => {
      const isAwaitingMe = budget.turn_to_respond === userId;
      const isExpired = budget.preferred_response_date && new Date(budget.preferred_response_date) < new Date();

      items.push({
        id: budget.id,
        source: "budget",
        title: `Budget: ${budget.title}`,
        description: `€ ${budget.max_amount} · ${budget.payer_share_percent}% / ${budget.other_share_percent}%`,
        status: isExpired ? "response-deadline-passed" : isAwaitingMe ? "awaiting-your-response" : "awaiting-response",
        isAwaitingMe,
        link: `/costs?budget=${budget.id}`,
      });
    });

    return items;
  } catch (err) {
    console.error("[cost-service] fetchOpenProposals error:", err);
    return [];
  }
}

/**
 * Upload receipt, screenshot, or invoice to Supabase storage bucket ('receipts')
 * Supports image files (PNG, JPEG, WebP, GIF) and PDFs up to 10MB.
 */
export async function uploadReceiptToBucket(file, userId) {
  if (!file) throw new Error("No file provided");

  const ext = (file.name?.split(".").pop() || "png").toLowerCase();
  const isImage = file.type?.startsWith("image/") || ["jpg", "jpeg", "png", "webp", "gif"].includes(ext);
  const isPdf = file.type === "application/pdf" || ext === "pdf";

  if (!isImage && !isPdf) {
    throw new Error("Only images (PNG, JPG, WebP) and PDF documents are allowed.");
  }

  // Max 10MB limit
  const maxBytes = 10 * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error("File size must be less than 10MB.");
  }

  // 1. Primary: Use manage-expenses Edge Function (Service-Role execution, no RLS failure)
  if (isConfigured) {
    try {
      const base64Data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const res = String(reader.result || "");
          const base64 = res.includes(",") ? res.split(",")[1] : res;
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const { data, error } = await supabase.functions.invoke("manage-expenses", {
        body: {
          action: "upload-receipt",
          fileBase64: base64Data,
          fileName: file.name,
          fileType: file.type,
          userId: userId || undefined,
        },
      });

      if (!error && data?.success && data?.url) {
        return {
          url: data.url,
          fileName: data.fileName || file.name,
          fileSize: file.size,
          isImage,
          filePath: data.filePath,
        };
      }
      if (error) {
        console.warn("[cost-service] Edge function upload warning, fallback to direct upload:", error);
      }
    } catch (edgeErr) {
      console.warn("[cost-service] Edge function upload failed, fallback to direct upload:", edgeErr);
    }

    // 2. Fallback: Direct storage upload
    try {
      const safeExt = ext || (isPdf ? "pdf" : "png");
      const cleanName = (file.name || "receipt.png")
        .replace(/[^a-zA-Z0-9.-]/g, "_")
        .replace(/\.[^/.]+$/, "");
      const filePath = `${userId || "shared"}/${Date.now()}-${cleanName.slice(0, 30)}.${safeExt}`;

      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from("receipts")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
          contentType: file.type || (isPdf ? "application/pdf" : "image/png"),
        });

      if (!uploadErr) {
        const { data } = supabase.storage.from("receipts").getPublicUrl(filePath);
        return {
          url: data.publicUrl,
          fileName: file.name || `${cleanName}.${safeExt}`,
          fileSize: file.size,
          isImage,
          filePath,
        };
      }
    } catch (directErr) {
      console.error("[cost-service] Direct storage upload error:", directErr);
    }
  }

  // 3. Fallback: Local object URL (e.g. offline preview)
  return {
    url: URL.createObjectURL(file),
    fileName: file.name || "receipt.png",
    fileSize: file.size,
    isImage,
    filePath: "local-preview",
  };
}

/**
 * Save an expense draft locally (localStorage) and optionally to Supabase Cloud
 */
export async function saveDraftExpense(draft, userId) {
  const draftId = draft.id || `draft-${Date.now()}`;
  const draftItem = {
    ...draft,
    id: draftId,
    savedAt: new Date().toISOString(),
  };

  try {
    const raw = localStorage.getItem("ouderapp_expense_drafts");
    const drafts = raw ? JSON.parse(raw) : [];
    const filtered = drafts.filter((d) => d.id !== draftId);
    filtered.unshift(draftItem);
    localStorage.setItem("ouderapp_expense_drafts", JSON.stringify(filtered));
  } catch (e) {
    console.warn("[cost-service] localStorage saveDraft error:", e);
  }

  if (isConfigured && userId) {
    try {
      const { data, error } = await supabase.functions.invoke("manage-expenses", {
        body: { action: "save-draft", draft: draftItem, userId },
      });
      if (!error && data?.success && data?.draft) {
        return data.draft;
      }
    } catch (err) {
      console.warn("[cost-service] saveDraftExpense edge function warning:", err);
    }
  }
  return draftItem;
}

/**
 * Fetch all saved expense drafts (combines Cloud + localStorage)
 */
export async function fetchDraftExpenses(userId) {
  let localDrafts = [];
  try {
    const raw = localStorage.getItem("ouderapp_expense_drafts");
    if (raw) localDrafts = JSON.parse(raw);
  } catch {}

  if (isConfigured && userId) {
    try {
      const { data, error } = await supabase.functions.invoke("manage-expenses", {
        body: { action: "list-drafts", userId },
      });
      if (!error && data?.success && Array.isArray(data.drafts)) {
        const cloudDrafts = data.drafts.map((d) => {
          let rawData = {};
          try {
            if (d.notes) rawData = JSON.parse(d.notes)?.rawDraft || {};
          } catch {}
          return {
            id: d.id,
            omschrijving: d.description || rawData.omschrijving,
            bedragTekst: String(d.amount).replace(".", ","),
            amount: d.amount,
            child_id: d.child_id,
            payer_id: d.payer_id,
            kind: d.child?.name || rawData.kind,
            categorie: d.category || rawData.categorie,
            betaaldDoor: rawData.betaaldDoor || "sanne",
            bon: d.receipt_url || rawData.bon,
            savedAt: d.updated_at || d.created_at,
          };
        });
        const map = new Map();
        localDrafts.forEach((d) => map.set(d.id, d));
        cloudDrafts.forEach((d) => map.set(d.id, d));
        return Array.from(map.values());
      }
    } catch (err) {
      console.warn("[cost-service] fetchDraftExpenses warning:", err);
    }
  }
  return localDrafts;
}

/**
 * Delete an expense draft by ID
 */
export async function deleteDraftExpense(draftId, userId) {
  try {
    const raw = localStorage.getItem("ouderapp_expense_drafts");
    if (raw) {
      const drafts = JSON.parse(raw);
      const filtered = drafts.filter((d) => d.id !== draftId);
      localStorage.setItem("ouderapp_expense_drafts", JSON.stringify(filtered));
    }
  } catch {}

  if (isConfigured && userId && !draftId.startsWith("draft-")) {
    try {
      await supabase.functions.invoke("manage-expenses", {
        body: { action: "delete-draft", id: draftId, userId },
      });
    } catch (err) {
      console.warn("[cost-service] deleteDraftExpense warning:", err);
    }
  }
  return true;
}

/**
 * Approve an expense (Akkoord) via Edge Function
 */
export async function approveExpense(expenseId, userId) {
  if (!isConfigured || !expenseId) return null;

  try {
    const { data: edgeData, error: edgeErr } = await supabase.functions.invoke("manage-expenses", {
      body: { action: "approve-expense", expenseId, userId },
    });
    if (!edgeErr && edgeData?.success) {
      return edgeData.expense;
    }
    if (edgeErr) {
      console.warn("[cost-service] approveExpense edge function warning, falling back:", edgeErr);
    }
  } catch (invokeErr) {
    console.warn("[cost-service] approveExpense invoke error:", invokeErr);
  }

  // Fallback direct update
  const { data, error } = await supabase
    .from("expenses")
    .update({
      approval_status: "approved",
      status: "openstaand",
      updated_at: new Date().toISOString(),
    })
    .eq("id", expenseId)
    .select()
    .single();

  if (error) {
    console.error("[cost-service] approveExpense direct fallback error:", error);
  }
  return data;
}

/**
 * Counterproposal or reject an expense via Edge Function
 */
export async function rejectExpense(expenseId, userId, reason) {
  if (!isConfigured || !expenseId) return null;

  try {
    const { data: edgeData, error: edgeErr } = await supabase.functions.invoke("manage-expenses", {
      body: { action: "reject-expense", expenseId, userId, reason },
    });
    if (!edgeErr && edgeData?.success) {
      return edgeData.expense;
    }
  } catch (err) {
    console.warn("[cost-service] rejectExpense edge error:", err);
  }

  const { data, error } = await supabase
    .from("expenses")
    .update({
      approval_status: "counterproposal",
      updated_at: new Date().toISOString(),
    })
    .eq("id", expenseId)
    .select()
    .single();

  return data;
}

export async function updateExpense(expenseId, updates) {
  if (!isConfigured || !expenseId) return null;

  try {
    const { data: edgeData, error: edgeErr } = await supabase.functions.invoke("manage-expenses", {
      body: { action: "update-expense", expenseId, updates },
    });
    if (!edgeErr && edgeData?.expense) {
      return edgeData.expense;
    }
  } catch (err) {
    console.warn("[cost-service] updateExpense edge function error, falling back:", err);
  }

  const { data, error } = await supabase
    .from("expenses")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", expenseId)
    .select()
    .single();

  if (error) {
    console.error("[cost-service] updateExpense error:", error);
    throw error;
  }
  return data;
}

export async function deleteExpense(expenseId) {
  if (!isConfigured || !expenseId) return false;

  try {
    const { data: edgeData, error: edgeErr } = await supabase.functions.invoke("manage-expenses", {
      body: { action: "delete-expense", expenseId },
    });
    if (!edgeErr && edgeData?.success) {
      return true;
    }
  } catch (err) {
    console.warn("[cost-service] deleteExpense edge error, falling back:", err);
  }

  const { error } = await supabase
    .from("expenses")
    .delete()
    .eq("id", expenseId);

  if (error) {
    console.error("[cost-service] deleteExpense error:", error);
    throw error;
  }
  return true;
}

export async function fetchSettlements(userId) {
  if (!isConfigured) return [];
  try {
    const { data: edgeData, error: edgeErr } = await supabase.functions.invoke("manage-expenses", {
      body: { action: "list-settlements", userId },
    });
    if (!edgeErr && edgeData?.success && Array.isArray(edgeData.settlements)) {
      return edgeData.settlements;
    }
  } catch (err) {
    console.warn("[cost-service] list-settlements edge invoke fallback:", err);
  }

  const { data, error } = await supabase
    .from("settlements")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[cost-service] fetchSettlements error:", error);
    return [];
  }
  return data || [];
}

export async function startSettlement(settlementData) {
  if (!isConfigured) return null;
  try {
    const { data: edgeData, error: edgeErr } = await supabase.functions.invoke("manage-expenses", {
      body: { action: "start-settlement", settlement: settlementData },
    });
    if (!edgeErr && edgeData?.success && edgeData.settlement) {
      return edgeData.settlement;
    }
  } catch (err) {
    console.warn("[cost-service] start-settlement edge invoke fallback:", err);
  }

  let res;
  if (settlementData.id && !settlementData.id.startsWith("demo-")) {
    res = await supabase
      .from("settlements")
      .update({ ...settlementData, updated_at: new Date().toISOString() })
      .eq("id", settlementData.id)
      .select()
      .single();
  } else {
    const { id, ...newSettlement } = settlementData;
    res = await supabase.from("settlements").insert([newSettlement]).select().single();
  }
  return res.data;
}

export async function indicateSettlementPayment(settlementId, actorId) {
  if (!isConfigured || !settlementId) return null;
  try {
    const { data: edgeData, error: edgeErr } = await supabase.functions.invoke("manage-expenses", {
      body: { action: "indicate-payment", settlementId, actorId },
    });
    if (!edgeErr && edgeData?.success && edgeData.settlement) {
      return edgeData.settlement;
    }
  } catch (err) {
    console.warn("[cost-service] indicate-payment edge invoke fallback:", err);
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("settlements")
    .update({ status: "wacht-op-ontvanger", paid_at: now, updated_at: now })
    .eq("id", settlementId)
    .select()
    .single();

  if (error) console.error("[cost-service] indicateSettlementPayment error:", error);
  return data;
}

export async function confirmSettlementReceipt(settlementId, actorId) {
  if (!isConfigured || !settlementId) return null;
  try {
    const { data: edgeData, error: edgeErr } = await supabase.functions.invoke("manage-expenses", {
      body: { action: "confirm-receipt", settlementId, actorId },
    });
    if (!edgeErr && edgeData?.success && edgeData.settlement) {
      return edgeData.settlement;
    }
  } catch (err) {
    console.warn("[cost-service] confirm-receipt edge invoke fallback:", err);
  }

  const now = new Date().toISOString();
  const { data: settlement, error } = await supabase
    .from("settlements")
    .update({ status: "afgerond", confirmed_at: now, updated_at: now })
    .eq("id", settlementId)
    .select()
    .single();

  if (settlement?.expense_ids && settlement.expense_ids.length > 0) {
    await supabase
      .from("expenses")
      .update({ settled: true, settled_at: now, updated_at: now })
      .in("id", settlement.expense_ids);
  }
  return settlement;
}

export async function cancelSettlement(settlementId) {
  if (!isConfigured || !settlementId) return null;
  try {
    const { data: edgeData, error: edgeErr } = await supabase.functions.invoke("manage-expenses", {
      body: { action: "delete-settlement", settlementId },
    });
    if (!edgeErr && edgeData?.success) {
      return true;
    }
  } catch (err) {
    console.warn("[cost-service] delete-settlement fallback:", err);
  }

  try {
    const { data: sData } = await supabase
      .from("settlements")
      .select("expense_ids")
      .eq("id", settlementId)
      .single();

    if (sData?.expense_ids && sData.expense_ids.length > 0) {
      await supabase
        .from("expenses")
        .update({ settled: false, settled_at: null, updated_at: new Date().toISOString() })
        .in("id", sData.expense_ids);
    }
  } catch (err) {
    console.warn("[cost-service] cancelSettlement unmark fallback error:", err);
  }

  const { data, error } = await supabase
    .from("settlements")
    .delete()
    .eq("id", settlementId)
    .select();

  if (error) console.error("[cost-service] cancelSettlement error:", error);
  return data;
}

export async function fetchRecurringExpenses(userId) {
  if (!isConfigured) return [];
  try {
    const { data: edgeData, error: edgeErr } = await supabase.functions.invoke("manage-expenses", {
      body: { action: "list-recurring-expenses", userId },
    });
    if (!edgeErr && edgeData?.success && Array.isArray(edgeData.recurring)) {
      return edgeData.recurring;
    }
  } catch (err) {
    console.warn("[cost-service] list-recurring-expenses edge invoke fallback:", err);
  }

  const { data, error } = await supabase
    .from("recurring_expenses")
    .select(`
      *,
      child:children(id, name, color_code)
    `)
    .order("created_at", { ascending: false });

  if (error) return [];
  return data || [];
}

export async function createRecurringExpense(expense) {
  if (!isConfigured) throw new Error("Supabase is not configured");

  try {
    const { data: edgeData, error: edgeErr } = await supabase.functions.invoke("manage-expenses", {
      body: { action: "create-recurring-expense", expense },
    });
    if (!edgeErr && edgeData?.success && edgeData.recurring) {
      return edgeData.recurring;
    }
  } catch (err) {
    console.warn("[cost-service] create-recurring-expense edge invoke fallback:", err);
  }

  const { data, error } = await supabase
    .from("recurring_expenses")
    .insert([expense])
    .select(`
      *,
      child:children(id, name, color_code)
    `)
    .single();

  if (error) {
    console.error("[cost-service] createRecurringExpense error:", error);
    throw error;
  }
  return data;
}

export async function deleteRecurringExpense(id) {
  if (!isConfigured || !id) return;

  const { error } = await supabase
    .from("recurring_expenses")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[cost-service] deleteRecurringExpense error:", error);
    throw error;
  }
}

export async function fetchSavingsPots(userId) {
  if (!isConfigured) return [];
  try {
    const { data: edgeData, error: edgeErr } = await supabase.functions.invoke("manage-expenses", {
      body: { action: "list-savings-pots", userId },
    });
    if (!edgeErr && edgeData?.success && Array.isArray(edgeData.pots)) {
      return edgeData.pots;
    }
  } catch (err) {
    console.warn("[cost-service] list-savings-pots edge invoke fallback:", err);
  }

  const { data, error } = await supabase
    .from("savings_pots")
    .select(`
      *,
      child:children(id, name, color_code)
    `)
    .order("created_at", { ascending: false });

  if (error) return [];
  return data || [];
}

export async function createSavingsPot(pot) {
  if (!isConfigured) throw new Error("Supabase is not configured");

  try {
    const { data: edgeData, error: edgeErr } = await supabase.functions.invoke("manage-expenses", {
      body: { action: "create-savings-pot", pot },
    });
    if (!edgeErr && edgeData?.success && edgeData.pot) {
      return edgeData.pot;
    }
  } catch (err) {
    console.warn("[cost-service] create-savings-pot edge invoke fallback:", err);
  }

  const { data, error } = await supabase
    .from("savings_pots")
    .insert([pot])
    .select(`
      *,
      child:children(id, name, color_code)
    `)
    .single();

  if (error) {
    console.error("[cost-service] createSavingsPot error:", error);
    throw error;
  }
  return data;
}

export async function contributeSavingsPot(potId, amount, contributorId) {
  if (!isConfigured || !potId || !(amount > 0)) return;

  try {
    const { data: edgeData, error: edgeErr } = await supabase.functions.invoke("manage-expenses", {
      body: { action: "contribute-savings-pot", potId, amount },
    });
    if (!edgeErr && edgeData?.success && edgeData.pot) {
      return edgeData.pot;
    }
  } catch (err) {
    console.warn("[cost-service] contribute-savings-pot edge invoke fallback:", err);
  }

  const { data: pot, error: fetchErr } = await supabase
    .from("savings_pots")
    .select("current_amount")
    .eq("id", potId)
    .single();

  if (fetchErr || !pot) throw fetchErr || new Error("Pot not found");

  const newAmount = Number(pot.current_amount || 0) + Number(amount);

  const { data, error } = await supabase
    .from("savings_pots")
    .update({
      current_amount: newAmount,
      updated_at: new Date().toISOString(),
    })
    .eq("id", potId)
    .select()
    .single();

  if (error) {
    console.error("[cost-service] contributeSavingsPot error:", error);
    throw error;
  }
  return data;
}

export async function updateSavingsPotAccount(potId, { account_name, iban }) {
  if (!isConfigured || !potId) return null;

  try {
    const { data: edgeData, error: edgeErr } = await supabase.functions.invoke("manage-expenses", {
      body: { action: "update-savings-pot-account", potId, account_name, iban },
    });
    if (!edgeErr && edgeData?.success) {
      return edgeData.pot;
    }
  } catch (err) {
    console.warn("[cost-service] update-savings-pot-account edge invoke fallback:", err);
  }

  const { data, error } = await supabase
    .from("savings_pots")
    .update({
      account_name: account_name || null,
      iban: iban || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", potId)
    .select()
    .single();

  if (error) {
    console.error("[cost-service] updateSavingsPotAccount error:", error);
    throw error;
  }
  return data;
}



