import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { action } = body;

    // 1. Upload receipt to storage (Service-Role execution completely prevents RLS errors)
    if (action === "upload-receipt") {
      const { fileBase64, fileName, fileType, userId } = body;
      if (!fileBase64) {
        return new Response(JSON.stringify({ success: false, error: "fileBase64 is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Ensure 'receipts' bucket exists and is public
      try {
        const { data: buckets } = await adminClient.storage.listBuckets();
        const hasReceipts = (buckets || []).some((b: any) => b.name === "receipts" || b.id === "receipts");
        if (!hasReceipts) {
          await adminClient.storage.createBucket("receipts", {
            public: true,
            fileSizeLimit: 10485760, // 10MB
          });
        }
      } catch (bucketErr) {
        console.warn("[manage-expenses] bucket check/create warning:", bucketErr);
      }

      // Decode base64 to binary
      const binaryString = atob(fileBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const ext = (fileName?.split(".").pop() || "jpg").toLowerCase();
      const safeName = (fileName || "receipt.jpg").replace(/[^a-zA-Z0-9.-]/g, "_");
      const filePath = `${userId || "shared"}/${Date.now()}-${safeName.slice(0, 30)}.${ext}`;

      const { data: uploadData, error: uploadErr } = await adminClient.storage
        .from("receipts")
        .upload(filePath, bytes, {
          contentType: fileType || (ext === "pdf" ? "application/pdf" : "image/jpeg"),
          upsert: true,
        });

      if (uploadErr) {
        console.error("[manage-expenses] storage upload error:", uploadErr);
        return new Response(JSON.stringify({ success: false, error: uploadErr.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: urlData } = adminClient.storage.from("receipts").getPublicUrl(filePath);

      return new Response(
        JSON.stringify({
          success: true,
          url: urlData.publicUrl,
          filePath,
          fileName,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 2. Save Draft Expense
    if (action === "save-draft") {
      const { draft, userId } = body;
      if (!userId || !draft) {
        return new Response(JSON.stringify({ success: false, error: "userId and draft required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const amount = Number(String(draft.bedragTekst || draft.amount || "0").replace(",", ".")) || 0;
      const cleanAmount = amount > 0 ? amount : 0.01; // Positive amount check

      const payload: any = {
        payer_id: draft.payer_id || userId,
        description: draft.omschrijving || draft.description || "Concept uitgave",
        amount: cleanAmount,
        category: draft.categorie || draft.category || "Overig",
        date: draft.date || new Date().toISOString().slice(0, 10),
        child_id: draft.child_id || null,
        receipt_url: draft.bon || draft.bijlage || draft.receipt_url || null,
        is_draft: true,
        status: "draft",
        split_type: draft.split_type || "50_50",
        notes: JSON.stringify({
          rawDraft: {
            omschrijving: draft.omschrijving,
            bedragTekst: draft.bedragTekst,
            betaaldDoor: draft.betaaldDoor,
            kind: draft.kind,
            categorie: draft.categorie,
            bon: draft.bon,
            bijlage: draft.bijlage,
          },
        }),
        updated_at: new Date().toISOString(),
      };

      let query = adminClient.from("expenses");
      if (draft.id && !draft.id.startsWith("draft-")) {
        const { data, error } = await query.update(payload).eq("id", draft.id).select().single();
        if (error) throw error;
        return new Response(JSON.stringify({ success: true, draft: data }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } else {
        const { data, error } = await query.insert([payload]).select().single();
        if (error) throw error;
        return new Response(JSON.stringify({ success: true, draft: data }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // 3. List Drafts
    if (action === "list-drafts") {
      const { userId } = body;
      if (!userId) {
        return new Response(JSON.stringify({ success: false, error: "userId required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data, error } = await adminClient
        .from("expenses")
        .select(`
          *,
          payer:profiles!payer_id(id, name, email, avatar_url),
          child:children(id, name, color_code)
        `)
        .eq("payer_id", userId)
        .or("is_draft.eq.true,status.eq.draft")
        .order("created_at", { ascending: false });

      if (error) throw error;

      return new Response(JSON.stringify({ success: true, drafts: data || [] }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Delete Draft
    if (action === "delete-draft") {
      const { id, userId } = body;
      if (!id) {
        return new Response(JSON.stringify({ success: false, error: "id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let q = adminClient.from("expenses").delete().eq("id", id);
      if (userId) q = q.eq("payer_id", userId);
      const { error } = await q;
      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5. Approve Expense (Akkoord)
    if (action === "approve-expense") {
      const { expenseId, userId } = body;
      if (!expenseId) {
        return new Response(JSON.stringify({ success: false, error: "expenseId required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data, error } = await adminClient
        .from("expenses")
        .update({
          approval_status: "approved",
          status: "openstaand",
          updated_at: new Date().toISOString(),
        })
        .eq("id", expenseId)
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({ success: true, expense: data }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 6. Reject / Counterproposal Expense
    if (action === "reject-expense") {
      const { expenseId, userId, reason } = body;
      if (!expenseId) {
        return new Response(JSON.stringify({ success: false, error: "expenseId required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data, error } = await adminClient
        .from("expenses")
        .update({
          approval_status: "counterproposal",
          updated_at: new Date().toISOString(),
        })
        .eq("id", expenseId)
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({ success: true, expense: data }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 7. List Expenses
    if (action === "list-expenses") {
      const { userId } = body;
      const { data, error } = await adminClient
        .from("expenses")
        .select(`
          *,
          payer:profiles!payer_id(id, name, email, avatar_url),
          child:children(id, name, color_code)
        `)
        .order("date", { ascending: false });

      if (error) throw error;

      return new Response(JSON.stringify({ success: true, expenses: data || [] }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 8. Create Expense
    if (action === "create-expense") {
      const { expense } = body;
      if (!expense) {
        return new Response(JSON.stringify({ success: false, error: "expense object required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data, error } = await adminClient
        .from("expenses")
        .insert([expense])
        .select(`
          *,
          payer:profiles!payer_id(id, name, email, avatar_url),
          child:children(id, name, color_code)
        `)
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({ success: true, expense: data }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 9. Update Expense
    if (action === "update-expense") {
      const { expenseId, updates } = body;
      if (!expenseId || !updates) {
        return new Response(JSON.stringify({ success: false, error: "expenseId and updates required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data, error } = await adminClient
        .from("expenses")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", expenseId)
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({ success: true, expense: data }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 10. Delete Expense
    if (action === "delete-expense") {
      const { expenseId } = body;
      if (!expenseId) {
        return new Response(JSON.stringify({ success: false, error: "expenseId required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await adminClient.from("expenses").delete().eq("id", expenseId);
      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 11. Settlements: Start / Update Settlement
    if (action === "start-settlement") {
      const { settlement } = body;
      if (!settlement) {
        return new Response(JSON.stringify({ success: false, error: "settlement required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let res;
      if (settlement.id && !settlement.id.startsWith("demo-")) {
        res = await adminClient
          .from("settlements")
          .update({
            ...settlement,
            updated_at: new Date().toISOString(),
          })
          .eq("id", settlement.id)
          .select()
          .single();
      } else {
        const { id, ...newSettlement } = settlement;
        res = await adminClient
          .from("settlements")
          .insert([newSettlement])
          .select()
          .single();
      }

      if (res.error) throw res.error;

      return new Response(JSON.stringify({ success: true, settlement: res.data }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 12. Settlements: Indicate Payment ("Ik heb betaald")
    if (action === "indicate-payment") {
      const { settlementId, actorId } = body;
      if (!settlementId) {
        return new Response(JSON.stringify({ success: false, error: "settlementId required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const now = new Date().toISOString();
      const { data, error } = await adminClient
        .from("settlements")
        .update({
          status: "wacht-op-ontvanger",
          paid_at: now,
          updated_at: now,
        })
        .eq("id", settlementId)
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({ success: true, settlement: data }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 13. Settlements: Confirm Receipt ("Ik heb het bedrag ontvangen" -> afgerond!)
    if (action === "confirm-receipt") {
      const { settlementId, actorId } = body;
      if (!settlementId) {
        return new Response(JSON.stringify({ success: false, error: "settlementId required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const now = new Date().toISOString();
      const { data: settlement, error: sErr } = await adminClient
        .from("settlements")
        .update({
          status: "afgerond",
          confirmed_at: now,
          updated_at: now,
        })
        .eq("id", settlementId)
        .select()
        .single();

      if (sErr) throw sErr;

      // Mark associated expenses as settled
      if (settlement?.expense_ids && settlement.expense_ids.length > 0) {
        await adminClient
          .from("expenses")
          .update({
            settled: true,
            settled_at: now,
            updated_at: now,
          })
          .in("id", settlement.expense_ids);
      }

      return new Response(JSON.stringify({ success: true, settlement }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 13b. Settlements: Delete / Cancel Settlement
    if (action === "delete-settlement") {
      const { settlementId } = body;
      if (!settlementId) {
        return new Response(JSON.stringify({ success: false, error: "settlementId required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch settlement first to release any locked/settled expenses
      const { data: existingSettlement } = await adminClient
        .from("settlements")
        .select("expense_ids")
        .eq("id", settlementId)
        .single();

      if (existingSettlement?.expense_ids && existingSettlement.expense_ids.length > 0) {
        await adminClient
          .from("expenses")
          .update({
            settled: false,
            settled_at: null,
            updated_at: new Date().toISOString(),
          })
          .in("id", existingSettlement.expense_ids);
      }

      const { data, error } = await adminClient
        .from("settlements")
        .delete()
        .eq("id", settlementId)
        .select();

      if (error) throw error;

      return new Response(JSON.stringify({ success: true, deleted: data }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 14. List Settlements
    if (action === "list-settlements") {
      const { data, error } = await adminClient
        .from("settlements")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      return new Response(JSON.stringify({ success: true, settlements: data || [] }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 15. List Budget Proposals
    if (action === "list-budget-proposals") {
      const { data, error } = await adminClient
        .from("budget_proposals")
        .select(`
          *,
          creator:profiles!created_by(id, name, avatar_url),
          child:children(id, name, color_code),
          steps:budget_steps(*)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return new Response(JSON.stringify({ success: true, proposals: data || [] }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 16. Create Budget Proposal
    if (action === "create-budget-proposal") {
      const { proposal } = body;
      if (!proposal) {
        return new Response(JSON.stringify({ success: false, error: "proposal required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data, error } = await adminClient
        .from("budget_proposals")
        .insert([proposal])
        .select()
        .single();

      if (error) throw error;

      // Initial proposal step
      await adminClient.from("budget_steps").insert([{
        budget_id: data.id,
        actor_id: proposal.created_by,
        action_type: "Proposal",
        amount: proposal.max_amount,
      }]);

      return new Response(JSON.stringify({ success: true, proposal: data }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 17. Respond to Budget Proposal (akkoord / tegenvoorstel / niet akkoord / meer tijd)
    if (action === "respond-budget-proposal") {
      const { budgetId, actorId, response, otherParentId } = body;
      if (!budgetId || !actorId) {
        return new Response(JSON.stringify({ success: false, error: "budgetId and actorId required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const now = new Date().toISOString();

      if (response === "agreed" || response === "akkoord") {
        await adminClient
          .from("budget_proposals")
          .update({ status: "agreed", updated_at: now })
          .eq("id", budgetId);

        await adminClient.from("budget_steps").insert([{
          budget_id: budgetId,
          actor_id: actorId,
          action_type: "Agreed",
        }]);
      } else if (response === "rejected" || response === "niet_akkoord") {
        await adminClient
          .from("budget_proposals")
          .update({ status: "rejected", updated_at: now })
          .eq("id", budgetId);

        await adminClient.from("budget_steps").insert([{
          budget_id: budgetId,
          actor_id: actorId,
          action_type: "Rejected",
        }]);
      } else if (response === "more_time" || response === "meer_tijd") {
        await adminClient.from("budget_steps").insert([{
          budget_id: budgetId,
          actor_id: actorId,
          action_type: "More time requested",
        }]);
      } else if (typeof response === "object" && response.counterAmount) {
        await adminClient
          .from("budget_proposals")
          .update({
            status: "counterproposal",
            turn_to_respond: otherParentId,
            max_amount: response.counterAmount,
            updated_at: now,
          })
          .eq("id", budgetId);

        await adminClient.from("budget_steps").insert([{
          budget_id: budgetId,
          actor_id: actorId,
          action_type: "Counterproposal",
          amount: response.counterAmount,
        }]);
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 18. Recurring Expenses & Savings Pots
    if (action === "list-recurring-expenses") {
      const { data, error } = await adminClient
        .from("recurring_expenses")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return new Response(JSON.stringify({ success: true, recurring: data || [] }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "create-recurring-expense") {
      const { expense } = body;
      const { data, error } = await adminClient
        .from("recurring_expenses")
        .insert([expense])
        .select()
        .single();

      if (error) throw error;
      return new Response(JSON.stringify({ success: true, recurring: data }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete-recurring-expense") {
      const { id } = body;
      const { error } = await adminClient
        .from("recurring_expenses")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "list-savings-pots") {
      const { data, error } = await adminClient
        .from("savings_pots")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return new Response(JSON.stringify({ success: true, pots: data || [] }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "create-savings-pot") {
      const { pot } = body;
      const { data, error } = await adminClient
        .from("savings_pots")
        .insert([pot])
        .select()
        .single();

      if (error) throw error;
      return new Response(JSON.stringify({ success: true, pot: data }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "contribute-savings-pot") {
      const { potId, amount } = body;
      const { data: pot, error: fetchErr } = await adminClient
        .from("savings_pots")
        .select("current_amount")
        .eq("id", potId)
        .single();

      if (fetchErr || !pot) throw fetchErr || new Error("Pot not found");
      const newAmount = Number(pot.current_amount || 0) + Number(amount);

      const { data, error } = await adminClient
        .from("savings_pots")
        .update({
          current_amount: newAmount,
          updated_at: new Date().toISOString(),
        })
        .eq("id", potId)
        .select()
        .single();

      if (error) throw error;
      return new Response(JSON.stringify({ success: true, pot: data }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update-savings-pot-account") {
      const { potId, account_name, iban } = body;
      const { data, error } = await adminClient
        .from("savings_pots")
        .update({
          account_name: account_name || null,
          iban: iban || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", potId)
        .select()
        .single();

      if (error) throw error;
      return new Response(JSON.stringify({ success: true, pot: data }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: false, error: `Unknown action: ${action}` }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[manage-expenses error]", err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
