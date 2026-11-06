import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const isUUID = (str: any) =>
  typeof str === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    const { action } = body;

    const getConnectedParentIds = async (userId: string) => {
      const ids = [userId];
      const childIds: string[] = [];
      if (!isUUID(userId)) return { ids, childIds, isSolo: true };

      let isSolo = true;
      try {
        const { data: conns } = await adminClient
          .from("parent_connections")
          .select("parent_1_id, parent_2_id")
          .or(`parent_1_id.eq.${userId},parent_2_id.eq.${userId}`)
          .in("status", ["active", "connected"]);

        if (conns && conns.length > 0) {
          isSolo = false;
          conns.forEach((c: any) => {
            if (c.parent_1_id && !ids.includes(c.parent_1_id)) ids.push(c.parent_1_id);
            if (c.parent_2_id && !ids.includes(c.parent_2_id)) ids.push(c.parent_2_id);
          });
        }

        const { data: acceptedInvs } = await adminClient
          .from("invitations")
          .select("from_parent_id, to_parent_id")
          .or(`from_parent_id.eq.${userId},to_parent_id.eq.${userId}`)
          .eq("status", "accepted");

        if (acceptedInvs && acceptedInvs.length > 0) {
          isSolo = false;
          acceptedInvs.forEach((inv: any) => {
            if (inv.from_parent_id && !ids.includes(inv.from_parent_id)) ids.push(inv.from_parent_id);
            if (inv.to_parent_id && !ids.includes(inv.to_parent_id)) ids.push(inv.to_parent_id);
          });
        }

        // Also check child_parents and children to find shared children and linked co-parents
        const { data: myChildLinks } = await adminClient
          .from("child_parents")
          .select("child_id")
          .eq("parent_id", userId);

        const { data: myCreatedChildren } = await adminClient
          .from("children")
          .select("id")
          .eq("created_by", userId);

        (myChildLinks || []).forEach((cl: any) => {
          if (cl.child_id && !childIds.includes(cl.child_id)) childIds.push(cl.child_id);
        });
        (myCreatedChildren || []).forEach((ch: any) => {
          if (ch.id && !childIds.includes(ch.id)) childIds.push(ch.id);
        });

        if (childIds.length > 0) {
          const { data: sharedParents } = await adminClient
            .from("child_parents")
            .select("parent_id")
            .in("child_id", childIds);

          (sharedParents || []).forEach((sp: any) => {
            if (sp.parent_id && !ids.includes(sp.parent_id)) {
              ids.push(sp.parent_id);
              isSolo = false;
            }
          });

          const { data: creators } = await adminClient
            .from("children")
            .select("created_by")
            .in("id", childIds);

          (creators || []).forEach((c: any) => {
            if (c.created_by && !ids.includes(c.created_by)) {
              ids.push(c.created_by);
              isSolo = false;
            }
          });
        }
      } catch (err) {
        console.warn("Error finding connected parents:", err);
      }
      return { ids, childIds, isSolo };
    };

    // 1. LIST AGREEMENTS & DECISIONS
    if (action === "list") {
      const { user_id, agreement_type } = body;
      if (!user_id || !isUUID(user_id)) {
        return new Response(JSON.stringify({ success: true, agreements: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { ids, childIds } = await getConnectedParentIds(user_id);

      let query = adminClient
        .from("parent_agreements")
        .select("*, child:children(id, name)")
        .order("created_at", { ascending: false });

      if (childIds.length > 0) {
        query = query.or(`user_id.in.(${ids.join(",")}),child_id.in.(${childIds.join(",")})`);
      } else {
        query = query.in("user_id", ids);
      }

      if (agreement_type) {
        query = query.eq("agreement_type", agreement_type);
      }

      const { data: agreements, error } = await query;
      if (error) throw new Error(error.message);

      return new Response(JSON.stringify({ success: true, agreements: agreements || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. PROPOSE CHANGE TO EXISTING AGREEMENT
    if (action === "propose_change" || (action === "propose" && body.id)) {
      const { id, user_id, proposal_text } = body;
      if (!id || !user_id || !proposal_text?.trim()) {
        return new Response(JSON.stringify({ success: false, error: "id, user_id, and proposal_text are required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { isSolo } = await getConnectedParentIds(user_id);
      const { data: profile } = await adminClient
        .from("profiles")
        .select("usage_mode, name")
        .eq("id", user_id)
        .maybeSingle();

      const userIsSolo = isSolo && profile?.usage_mode === "solo";
      const authorName = profile?.name || "Ouder";

      const { data: existing } = await adminClient
        .from("parent_agreements")
        .select("*")
        .eq("id", id)
        .single();

      if (!existing) throw new Error("Agreement not found");

      const history = Array.isArray(existing.history) ? [...existing.history] : [];
      history.unshift({
        date: new Date().toISOString(),
        actor: authorName,
        action: userIsSolo ? `Aangepast naar: ${proposal_text.trim()}` : `Wijziging voorgesteld: ${proposal_text.trim()}`,
      });

      const updateData: any = {
        status: userIsSolo ? "active" : "pending",
        description: userIsSolo ? proposal_text.trim() : existing.description,
        proposed_by: user_id,
        proposal_type: "change",
        proposal_text: proposal_text.trim(),
        co_parent_response: null,
        co_parent_responded_at: null,
        history,
        updated_at: new Date().toISOString(),
      };

      let res = await adminClient
        .from("parent_agreements")
        .update(updateData)
        .eq("id", id)
        .select("*, child:children(id, name)")
        .single();

      if (res.error && (res.error.message?.includes("co_parent_response") || res.error.message?.includes("co_parent_responded_at"))) {
        delete updateData.co_parent_response;
        delete updateData.co_parent_responded_at;
        res = await adminClient
          .from("parent_agreements")
          .update(updateData)
          .eq("id", id)
          .select("*, child:children(id, name)")
          .single();
      }

      if (res.error) {
        res = await adminClient
          .from("parent_agreements")
          .update(updateData)
          .eq("id", id)
          .select()
          .single();
      }

      if (res.error) throw new Error(res.error.message);

      return new Response(JSON.stringify({ success: true, agreement: res.data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2b. CREATE NEW AGREEMENT OR DECISION
    if (action === "propose" || action === "create") {
      const { user_id, child_id, title, description, category = "Overig", agreement_type = "agreement", proposal_type = "new", proposal_text } = body;
      if (!user_id || !title?.trim()) {
        return new Response(JSON.stringify({ success: false, error: "user_id and title are required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { isSolo } = await getConnectedParentIds(user_id);

      // Check if user has explicit solo profile usage mode
      const { data: profile } = await adminClient
        .from("profiles")
        .select("usage_mode, name")
        .eq("id", user_id)
        .maybeSingle();

      const userIsSolo = isSolo && profile?.usage_mode === "solo";
      const authorName = profile?.name || "Ouder";

      const insertData: any = {
        user_id,
        title: title.trim(),
        description: (description || proposal_text || title).trim(),
        category,
        agreement_type,
        // Solo parents don't need co-parent approval
        status: userIsSolo ? "active" : "pending",
        proposed_by: user_id,
        proposal_type,
        proposal_text: proposal_text || description || title,
        history: [
          {
            date: new Date().toISOString(),
            actor: authorName,
            action: userIsSolo ? "Afspraak direct vastgelegd" : "Nieuwe afspraak voorgesteld",
          },
        ],
      };

      if (isUUID(child_id)) insertData.child_id = child_id;

      const { data, error } = await adminClient
        .from("parent_agreements")
        .insert([insertData])
        .select("*, child:children(id, name)")
        .single();

      if (error) throw new Error(error.message);

      return new Response(JSON.stringify({ success: true, agreement: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. RESPOND TO PROPOSAL (Accept, Reject, Counter)
    if (action === "respond") {
      const { id, user_id, choice, counter_text } = body;
      if (!id || !user_id || !choice) {
        return new Response(JSON.stringify({ success: false, error: "id, user_id, and choice are required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: existing } = await adminClient
        .from("parent_agreements")
        .select("*")
        .eq("id", id)
        .single();

      if (!existing) throw new Error("Agreement not found");

      const { data: profile } = await adminClient
        .from("profiles")
        .select("name")
        .eq("id", user_id)
        .maybeSingle();
      const responderName = profile?.name || "Andere ouder";

      const history = Array.isArray(existing.history) ? [...existing.history] : [];
      let newStatus = existing.status;
      let newDescription = existing.description;

      if (choice === "accept") {
        newStatus = existing.proposal_type === "stop" ? "stopped" : "active";
        if (existing.proposal_text) newDescription = existing.proposal_text;
        history.unshift({
          date: new Date().toISOString(),
          actor: responderName,
          action: "Voorstel geaccepteerd",
        });
      } else if (choice === "reject") {
        newStatus = existing.proposal_type === "new" ? "rejected" : "active";
        history.unshift({
          date: new Date().toISOString(),
          actor: responderName,
          action: "Voorstel afgewezen",
        });
      } else if (choice === "counter") {
        newStatus = "pending";
        history.unshift({
          date: new Date().toISOString(),
          actor: responderName,
          action: `Tegenvoorstel: ${counter_text || ""}`,
        });
      }

      const updateData: any = {
        status: newStatus,
        description: newDescription,
        proposal_type: choice === "counter" ? "change" : null,
        proposal_text: choice === "counter" ? (counter_text || "").trim() : null,
        proposed_by: choice === "counter" ? user_id : null,
        co_parent_response: choice,
        co_parent_responded_at: new Date().toISOString(),
        history,
        updated_at: new Date().toISOString(),
      };

      let res = await adminClient
        .from("parent_agreements")
        .update(updateData)
        .eq("id", id)
        .select("*, child:children(id, name)")
        .single();

      if (res.error && (res.error.message?.includes("co_parent_response") || res.error.message?.includes("co_parent_responded_at"))) {
        delete updateData.co_parent_response;
        delete updateData.co_parent_responded_at;
        res = await adminClient
          .from("parent_agreements")
          .update(updateData)
          .eq("id", id)
          .select("*, child:children(id, name)")
          .single();
      }

      if (res.error) {
        res = await adminClient
          .from("parent_agreements")
          .update(updateData)
          .eq("id", id)
          .select()
          .single();
      }

      if (res.error) throw new Error(res.error.message);

      return new Response(JSON.stringify({ success: true, agreement: res.data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. STOP AGREEMENT
    if (action === "stop") {
      const { id, user_id } = body;
      const { isSolo } = await getConnectedParentIds(user_id);
      const { data: profile } = await adminClient
        .from("profiles")
        .select("name")
        .eq("id", user_id)
        .maybeSingle();
      const authorName = profile?.name || "Ouder";

      const { data: existing } = await adminClient
        .from("parent_agreements")
        .select("*")
        .eq("id", id)
        .single();

      if (!existing) throw new Error("Agreement not found");

      const history = Array.isArray(existing?.history) ? [...existing.history] : [];
      history.unshift({
        date: new Date().toISOString(),
        actor: authorName,
        action: isSolo ? "Afspraak beëindigd" : "Voorstel gedaan om afspraak te beëindigen",
      });

      const updateData: any = {
        status: isSolo ? "stopped" : "pending",
        proposal_type: "stop",
        proposed_by: user_id,
        proposal_text: null,
        history,
        updated_at: new Date().toISOString(),
      };

      let res = await adminClient
        .from("parent_agreements")
        .update(updateData)
        .eq("id", id)
        .select("*, child:children(id, name)")
        .single();

      if (res.error && (res.error.message?.includes("co_parent_response") || res.error.message?.includes("co_parent_responded_at"))) {
        delete updateData.co_parent_response;
        delete updateData.co_parent_responded_at;
        res = await adminClient
          .from("parent_agreements")
          .update(updateData)
          .eq("id", id)
          .select("*, child:children(id, name)")
          .single();
      }

      if (res.error) {
        res = await adminClient
          .from("parent_agreements")
          .update(updateData)
          .eq("id", id)
          .select()
          .single();
      }

      if (res.error) throw new Error(res.error.message);

      return new Response(JSON.stringify({ success: true, agreement: res.data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5. DELETE AGREEMENT
    if (action === "delete") {
      const { id } = body;
      if (!id) {
        return new Response(JSON.stringify({ success: false, error: "id is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await adminClient.from("parent_agreements").delete().eq("id", id);
      if (error) throw new Error(error.message);

      return new Response(JSON.stringify({ success: true, id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: false, error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
