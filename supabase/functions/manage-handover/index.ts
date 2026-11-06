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

    // Helper: find co-parent id if connected
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

    // 1. GET ALL HANDOVER DATA (Items, Routines, Logs)
    if (action === "get_handover_data") {
      const user_id = body.user_id;
      const moment_id = body.moment_id || "w1";

      if (!user_id || !isUUID(user_id)) {
        return new Response(JSON.stringify({ success: true, items: [], routines: [], logs: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const parentIds = await getConnectedParentIds(user_id);

      // Get user's linked children to strictly isolate records per child
      const { data: userChildLinks } = await adminClient
        .from("child_parents")
        .select("child_id")
        .eq("parent_id", user_id);

      const linkedChildIds: string[] = (userChildLinks || [])
        .map((l: any) => l.child_id)
        .filter(isUUID);

      const { data: createdKids } = await adminClient
        .from("children")
        .select("id")
        .eq("created_by", user_id);

      (createdKids || []).forEach((k: any) => {
        if (k.id && !linkedChildIds.includes(k.id)) linkedChildIds.push(k.id);
      });

      const linkedChildSet = new Set(linkedChildIds);

      // Check if user's handover data has already been initialized
      const { data: profile } = await adminClient
        .from("profiles")
        .select("handover_initialized")
        .eq("id", user_id)
        .maybeSingle();

      const isInitialized = profile?.handover_initialized === true;
      if (!isInitialized) {
        await adminClient
          .from("profiles")
          .update({ handover_initialized: true })
          .eq("id", user_id);
      }

      // Fetch checklist items
      let { data: items } = await adminClient
        .from("handover_checklist_items")
        .select("*")
        .in("user_id", parentIds)
        .order("created_at", { ascending: true });

      // Enforce child segregation: item must belong to linked children or be created by user
      if (items) {
        items = items.filter((i: any) => {
          if (i.user_id === user_id) return true;
          if (i.child_id) return linkedChildSet.has(i.child_id);
          return true;
        });
      }

      // Fetch fixed routines
      let { data: routines } = await adminClient
        .from("fixed_routines")
        .select("*")
        .in("user_id", parentIds)
        .order("created_at", { ascending: true });

      // Enforce child segregation: routine must belong to linked children or be created by user
      if (routines) {
        routines = routines.filter((r: any) => {
          if (r.user_id === user_id) return true;
          if (r.child_id) return linkedChildSet.has(r.child_id);
          return true;
        });
      }

      // Fetch handover logs
      const { data: rawLogs } = await adminClient
        .from("handover_logs")
        .select("*, children(id, name, avatar_url)")
        .in("user_id", parentIds)
        .order("created_at", { ascending: false })
        .limit(50);

      // Enforce strict child segregation: only include logs for this user's linked children
      let logs = rawLogs || [];
      if (logs) {
        logs = logs.filter((l: any) => {
          if (l.child_id) return linkedChildSet.has(l.child_id);
          return l.user_id === user_id;
        });
      }

      return new Response(
        JSON.stringify({
          success: true,
          items: items || [],
          routines: routines || [],
          logs: logs || [],
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. ADD CHECKLIST ITEM
    if (action === "add_item") {
      const { user_id, item_name, moment_id = "w1", child_id, category = "custom", item_type = "mee", location = null } = body;
      if (!user_id || !item_name) {
        return new Response(JSON.stringify({ success: false, error: "user_id and item_name are required." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const insertData: any = {
        user_id,
        item_name: item_name.trim(),
        moment_id,
        is_packed: false,
        category,
        item_type,
        location,
      };
      if (isUUID(child_id)) insertData.child_id = child_id;

      const { data, error } = await adminClient
        .from("handover_checklist_items")
        .insert([insertData])
        .select()
        .single();

      if (error) throw new Error(error.message);

      return new Response(JSON.stringify({ success: true, item: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2b. UPDATE CHECKLIST ITEM
    if (action === "update_item") {
      const { id, item_name, child_id, item_type, location, is_packed } = body;
      if (!id) {
        return new Response(JSON.stringify({ success: false, error: "id is required." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const updatePayload: any = { updated_at: new Date().toISOString() };
      if (item_name !== undefined) updatePayload.item_name = item_name.trim();
      if (child_id !== undefined) updatePayload.child_id = isUUID(child_id) ? child_id : null;
      if (item_type !== undefined) updatePayload.item_type = item_type;
      if (location !== undefined) updatePayload.location = location;
      if (is_packed !== undefined) updatePayload.is_packed = Boolean(is_packed);

      const { data, error } = await adminClient
        .from("handover_checklist_items")
        .update(updatePayload)
        .eq("id", id)
        .select()
        .single();

      if (error) throw new Error(error.message);

      return new Response(JSON.stringify({ success: true, item: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. TOGGLE CHECKLIST ITEM
    if (action === "toggle_item") {
      const { id, is_packed } = body;
      if (!id) {
        return new Response(JSON.stringify({ success: false, error: "id is required." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data, error } = await adminClient
        .from("handover_checklist_items")
        .update({ is_packed: Boolean(is_packed), updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw new Error(error.message);

      return new Response(JSON.stringify({ success: true, item: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. DELETE CHECKLIST ITEM
    if (action === "delete_item") {
      const { id } = body;
      if (!id) {
        return new Response(JSON.stringify({ success: false, error: "id is required." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // HARD DELETE FROM TABLE
      const { error } = await adminClient.from("handover_checklist_items").delete().eq("id", id);
      if (error) throw new Error(error.message);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5. SAVE HANDOVER LOG
    if (action === "save_log") {
      const {
        user_id,
        child_id,
        datum,
        richting_key = "handover.directionToOther",
        mood,
        sleep,
        transition,
        topics = [],
        note,
        positive_note,
      } = body;

      if (!user_id) {
        return new Response(JSON.stringify({ success: false, error: "user_id is required." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const insertPayload: any = {
        user_id,
        datum: datum || new Date().toLocaleDateString("nl-NL", { day: "numeric", month: "short" }),
        richting_key,
        mood: mood || null,
        sleep: sleep || null,
        transition: transition || null,
        topics: Array.isArray(topics) ? topics : [],
        note: note || null,
        positive_note: positive_note || null,
      };
      if (isUUID(child_id)) insertPayload.child_id = child_id;

      const { data, error } = await adminClient
        .from("handover_logs")
        .insert([insertPayload])
        .select()
        .single();

      if (error) throw new Error(error.message);

      // Create notification for other connected parent
      try {
        const parentIds = await getConnectedParentIds(user_id);
        const otherParentId = parentIds.find((pid) => pid !== user_id);
        if (otherParentId) {
          await adminClient.from("notifications").insert([
            {
              user_id: otherParentId,
              actor_id: user_id,
              type: "handover",
              title: "Nieuwe overdracht ingevuld",
              message: "De andere ouder heeft overdrachtsinformatie klaargezet voor het wisselmoment.",
              link: "/overdracht",
              metadata: {
                titleKey: "notifications.newHandoverTitle",
                messageKey: "notifications.newHandoverDesc",
                log_id: data.id,
                child_id,
              },
            },
          ]);
        }
      } catch (notifErr) {
        console.warn("Could not dispatch handover notification:", notifErr);
      }

      return new Response(JSON.stringify({ success: true, log: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 6. ADD FIXED ROUTINE
    if (action === "add_routine") {
      const { user_id, child_id, day_of_week, item_name, reason } = body;
      if (!user_id || !day_of_week || !item_name) {
        return new Response(JSON.stringify({ success: false, error: "user_id, day_of_week, and item_name are required." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const insertPayload: any = {
        user_id,
        day_of_week: day_of_week.toLowerCase(),
        item_name: item_name.trim(),
        reason: reason || null,
      };
      if (isUUID(child_id)) insertPayload.child_id = child_id;

      const { data, error } = await adminClient
        .from("fixed_routines")
        .insert([insertPayload])
        .select()
        .single();

      if (error) throw new Error(error.message);

      return new Response(JSON.stringify({ success: true, routine: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 7. DELETE FIXED ROUTINE
    if (action === "delete_routine") {
      const { id } = body;
      if (!id) {
        return new Response(JSON.stringify({ success: false, error: "id is required." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // HARD DELETE FROM TABLE
      const { error } = await adminClient.from("fixed_routines").delete().eq("id", id);
      if (error) throw new Error(error.message);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: false, error: `Unknown action: ${action}` }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
