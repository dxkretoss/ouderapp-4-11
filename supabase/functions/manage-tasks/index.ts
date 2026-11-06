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

    // 1. LIST TASKS
    if (action === "list") {
      const { user_id } = body;
      if (!user_id || !isUUID(user_id)) {
        return new Response(JSON.stringify({ success: true, tasks: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch accessible children for user_id
      const { data: parentLinks } = await adminClient
        .from("child_parents")
        .select("child_id")
        .eq("parent_id", user_id);

      const { data: createdKids } = await adminClient
        .from("children")
        .select("id")
        .eq("created_by", user_id);

      const accessibleChildIds = new Set<string>();
      (parentLinks || []).forEach((l: any) => l.child_id && accessibleChildIds.add(l.child_id));
      (createdKids || []).forEach((k: any) => k.id && accessibleChildIds.add(k.id));

      const { data: userInvs } = await adminClient
        .from("invitations")
        .select("child_ids")
        .or(`from_parent_id.eq.${user_id},to_parent_id.eq.${user_id}`)
        .eq("status", "accepted");

      (userInvs || []).forEach((inv: any) => {
        if (Array.isArray(inv.child_ids)) {
          inv.child_ids.forEach((cid: string) => isUUID(cid) && accessibleChildIds.add(cid));
        }
      });

      const parentIds = await getConnectedParentIds(user_id);

      const { data: allTasks, error } = await adminClient
        .from("tasks")
        .select("*")
        .in("user_id", parentIds)
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);

      // Filter tasks: user sees own tasks, or co-parent tasks relevant to user's children/assignments
      const filteredTasks = (allTasks || []).filter((task: any) => {
        if (task.user_id === user_id) return true;
        if (task.assigned_to === user_id || task.transfer_to === user_id) return true;
        if (task.child_id) {
          return accessibleChildIds.has(task.child_id);
        }
        return true;
      });

      return new Response(JSON.stringify({ success: true, tasks: filteredTasks }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. CREATE TASK
    if (action === "create") {
      const { user_id, child_id, title, assigned_to, deadline, recurrence = "eenmalig", reminder_days = 0, caregiver_ids } = body;
      if (!user_id || !title?.trim()) {
        return new Response(JSON.stringify({ success: false, error: "user_id and title are required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const insertData: any = {
        user_id,
        title: title.trim(),
        assigned_to: assigned_to || "self",
        recurrence,
        reminder_days: Number(reminder_days) || 0,
        is_completed: false,
      };

      if (isUUID(child_id)) insertData.child_id = child_id;
      if (deadline) insertData.deadline = deadline;
      if (Array.isArray(caregiver_ids) && caregiver_ids.length > 0) {
        insertData.caregiver_ids = caregiver_ids;
      }

      let data: any, error: any;
      const res = await adminClient
        .from("tasks")
        .insert([insertData])
        .select()
        .single();

      if (res.error && res.error.message?.includes("caregiver_ids")) {
        delete insertData.caregiver_ids;
        const retryRes = await adminClient
          .from("tasks")
          .insert([insertData])
          .select()
          .single();
        data = retryRes.data;
        error = retryRes.error;
      } else {
        data = res.data;
        error = res.error;
      }

      if (error) throw new Error(error.message);

      return new Response(JSON.stringify({ success: true, task: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. TOGGLE TASK
    if (action === "toggle") {
      const { id, is_completed } = body;
      if (!id) {
        return new Response(JSON.stringify({ success: false, error: "id is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data, error } = await adminClient
        .from("tasks")
        .update({ is_completed: Boolean(is_completed), updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw new Error(error.message);

      return new Response(JSON.stringify({ success: true, task: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. REASSIGN TASK
    if (action === "reassign") {
      const { id, assigned_to, transfer_to } = body;
      if (!id) {
        return new Response(JSON.stringify({ success: false, error: "id is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const updateData: any = { updated_at: new Date().toISOString() };
      if (assigned_to !== undefined) updateData.assigned_to = assigned_to;
      if (transfer_to !== undefined) updateData.transfer_to = transfer_to;

      const { data, error } = await adminClient
        .from("tasks")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw new Error(error.message);

      return new Response(JSON.stringify({ success: true, task: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5. DELETE TASK
    if (action === "delete") {
      const { id } = body;
      if (!id) {
        return new Response(JSON.stringify({ success: false, error: "id is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await adminClient.from("tasks").delete().eq("id", id);
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
