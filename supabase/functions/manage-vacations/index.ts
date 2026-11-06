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

    // Helper: find connected co-parents
    const getConnectedParentIds = async (userId: string) => {
      const ids = [userId];
      if (!isUUID(userId)) return ids;

      try {
        const { data: conns } = await adminClient
          .from("parent_connections")
          .select("parent_1_id, parent_2_id")
          .or(`parent_1_id.eq.${userId},parent_2_id.eq.${userId}`)
          .in("status", ["active", "connected"]);

        if (conns) {
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

        if (acceptedInvs) {
          acceptedInvs.forEach((inv: any) => {
            if (inv.from_parent_id && !ids.includes(inv.from_parent_id)) ids.push(inv.from_parent_id);
            if (inv.to_parent_id && !ids.includes(inv.to_parent_id)) ids.push(inv.to_parent_id);
          });
        }
      } catch (err) {
        console.warn("Error finding connected parents:", err);
      }
      return ids;
    };

    // 1. LIST VACATIONS
    if (action === "list") {
      const { user_id } = body;

      if (!user_id || !isUUID(user_id)) {
        return new Response(JSON.stringify({ success: true, vacations: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const parentIds = await getConnectedParentIds(user_id);

      // Check if vacations were initialized
      const { data: profile } = await adminClient
        .from("profiles")
        .select("vacations_initialized")
        .eq("id", user_id)
        .maybeSingle();

      const isInitialized = profile?.vacations_initialized === true;

      // Clean up previously auto-seeded demo mock vacations if present
      await adminClient
        .from("vacations")
        .delete()
        .in("created_by", parentIds)
        .or("details.eq.Skiën Oostenrijk · paspoorten mee,details.eq.Paasbrunch bij oma,details.eq.Texel · vertrek 10:00 uur");

      let { data: vacations, error } = await adminClient
        .from("vacations")
        .select("*")
        .in("created_by", parentIds)
        .order("created_at", { ascending: true });

      if (error) throw new Error(error.message);

      return new Response(JSON.stringify({ success: true, vacations: vacations || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. CREATE VACATION PROPOSAL
    if (action === "create") {
      const {
        user_id,
        title,
        period,
        start_date,
        end_date,
        assigned_to = "open",
        assigned_parent_id,
        details = "",
        travel_details = {},
      } = body;

      if (!user_id || !title || !period) {
        return new Response(
          JSON.stringify({ success: false, error: "user_id, title, and period are required." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const insertPayload: any = {
        created_by: user_id,
        title: title.trim(),
        period: period.trim(),
        start_date: start_date || null,
        end_date: end_date || null,
        status: "voorstel",
        assigned_to: assigned_to || "open",
        assigned_parent_id: assigned_parent_id || null,
        proposed_by: user_id,
        details: details ? details.trim() : "",
        travel_details: travel_details || {},
      };

      const { data, error } = await adminClient
        .from("vacations")
        .insert([insertPayload])
        .select()
        .single();

      if (error) throw new Error(error.message);

      return new Response(JSON.stringify({ success: true, vacation: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. PROPOSE SPLIT (Assign parent to vacation)
    if (action === "propose_split") {
      const { id, user_id, assigned_to, assigned_parent_id } = body;

      if (!id || !user_id) {
        return new Response(
          JSON.stringify({ success: false, error: "id and user_id are required." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data, error } = await adminClient
        .from("vacations")
        .update({
          assigned_to: assigned_to || "open",
          assigned_parent_id: assigned_parent_id || null,
          status: "voorstel",
          proposed_by: user_id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw new Error(error.message);

      return new Response(JSON.stringify({ success: true, vacation: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. ACCEPT SPLIT
    if (action === "accept_split") {
      const { id, user_id } = body;

      if (!id) {
        return new Response(
          JSON.stringify({ success: false, error: "id is required." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data, error } = await adminClient
        .from("vacations")
        .update({
          status: "afgesproken",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw new Error(error.message);

      return new Response(JSON.stringify({ success: true, vacation: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5. RETRACT PROPOSAL
    if (action === "retract_proposal") {
      const { id, user_id } = body;

      if (!id) {
        return new Response(
          JSON.stringify({ success: false, error: "id is required." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data, error } = await adminClient
        .from("vacations")
        .update({
          status: "open",
          assigned_to: "open",
          assigned_parent_id: null,
          proposed_by: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw new Error(error.message);

      return new Response(JSON.stringify({ success: true, vacation: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 6. DELETE VACATION
    if (action === "delete") {
      const { id } = body;

      if (!id) {
        return new Response(
          JSON.stringify({ success: false, error: "id is required." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error } = await adminClient
        .from("vacations")
        .delete()
        .eq("id", id);

      if (error) throw new Error(error.message);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ success: false, error: `Unknown action: ${action}` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Error in manage-vacations function:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
