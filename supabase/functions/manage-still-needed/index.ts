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

    // Helper: find connected co-parents so both parents see the shared list
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

    // 1. LIST STILL NEEDED ITEMS
    if (action === "list") {
      const { user_id } = body;
      if (!user_id || !isUUID(user_id)) {
        return new Response(JSON.stringify({ success: true, items: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const parentIds = await getConnectedParentIds(user_id);

      // Find children linked to this user
      const { data: parentLinks } = await adminClient
        .from("child_parents")
        .select("child_id")
        .eq("parent_id", user_id);
      const { data: createdKids } = await adminClient
        .from("children")
        .select("id, name")
        .eq("created_by", user_id);

      const myChildIds: string[] = [];
      const myChildNames: string[] = [];
      (parentLinks || []).forEach((l: any) => {
        if (l.child_id && !myChildIds.includes(l.child_id)) myChildIds.push(l.child_id);
      });
      (createdKids || []).forEach((k: any) => {
        if (k.id && !myChildIds.includes(k.id)) myChildIds.push(k.id);
        if (k.name && !myChildNames.includes(k.name.trim().toLowerCase())) myChildNames.push(k.name.trim().toLowerCase());
      });

      if (myChildIds.length > 0) {
        const { data: moreKids } = await adminClient
          .from("children")
          .select("id, name")
          .in("id", myChildIds);
        (moreKids || []).forEach((k: any) => {
          if (k.name && !myChildNames.includes(k.name.trim().toLowerCase())) myChildNames.push(k.name.trim().toLowerCase());
        });
      }

      const { data: items, error } = await adminClient
        .from("still_needed_items")
        .select("*")
        .in("user_id", parentIds)
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);

      // Filter items so co-parent only sees items for their shared children (or created by themselves)
      const filteredItems = (items || []).filter((item: any) => {
        if (item.user_id === user_id) return true;
        if (myChildIds.length > 0) {
          if (item.child_id && !myChildIds.includes(item.child_id)) return false;
          const cName = (item.child_name || item.kind || "").trim().toLowerCase();
          if (cName && cName !== "alle" && cName !== "all" && !myChildNames.includes(cName)) return false;
        }
        return true;
      });

      return new Response(JSON.stringify({ success: true, items: filteredItems }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. CREATE ITEM
    if (action === "create") {
      const {
        user_id,
        child_id,
        child_name,
        title,
        category = "Nodig",
        is_purchased = false,
        budget_id,
        deadline,
        notes,
      } = body;

      if (!user_id || !title?.trim()) {
        return new Response(
          JSON.stringify({ success: false, error: "user_id and title are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const insertData: any = {
        user_id,
        title: title.trim(),
        category: category || "Nodig",
        is_purchased: Boolean(is_purchased),
        child_name: child_name || null,
        deadline: deadline || null,
        notes: notes || null,
      };

      if (isUUID(child_id)) insertData.child_id = child_id;
      if (isUUID(budget_id)) insertData.budget_id = budget_id;

      if (is_purchased) {
        insertData.purchased_by = user_id;
        insertData.purchased_at = new Date().toISOString();
      }

      const { data, error } = await adminClient
        .from("still_needed_items")
        .insert([insertData])
        .select()
        .single();

      if (error) throw new Error(error.message);

      return new Response(JSON.stringify({ success: true, item: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. TOGGLE PURCHASED STATUS
    if (action === "toggle") {
      const { id, user_id, is_purchased } = body;
      if (!id || !isUUID(id)) {
        return new Response(
          JSON.stringify({ success: false, error: "Valid item id is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const updateData: any = {
        is_purchased: Boolean(is_purchased),
        updated_at: new Date().toISOString(),
      };

      if (is_purchased) {
        updateData.purchased_by = isUUID(user_id) ? user_id : null;
        updateData.purchased_at = new Date().toISOString();
      } else {
        updateData.purchased_by = null;
        updateData.purchased_at = null;
      }

      const { data, error } = await adminClient
        .from("still_needed_items")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw new Error(error.message);

      return new Response(JSON.stringify({ success: true, item: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. LINK BUDGET
    if (action === "link_budget") {
      const { id, budget_id } = body;
      if (!id || !isUUID(id)) {
        return new Response(
          JSON.stringify({ success: false, error: "Valid item id is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data, error } = await adminClient
        .from("still_needed_items")
        .update({
          budget_id: isUUID(budget_id) ? budget_id : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw new Error(error.message);

      return new Response(JSON.stringify({ success: true, item: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5. UPDATE ITEM
    if (action === "update") {
      const { id, title, category, child_name, child_id, deadline, notes } = body;
      if (!id || !isUUID(id)) {
        return new Response(
          JSON.stringify({ success: false, error: "Valid item id is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const updateData: any = {
        updated_at: new Date().toISOString(),
      };
      if (title !== undefined) updateData.title = String(title).trim();
      if (category !== undefined) updateData.category = category;
      if (child_name !== undefined) updateData.child_name = child_name;
      if (deadline !== undefined) updateData.deadline = deadline;
      if (notes !== undefined) updateData.notes = notes;
      if (isUUID(child_id)) updateData.child_id = child_id;

      const { data, error } = await adminClient
        .from("still_needed_items")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw new Error(error.message);

      return new Response(JSON.stringify({ success: true, item: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 6. DELETE ITEM
    if (action === "delete") {
      const { id } = body;
      if (!id || !isUUID(id)) {
        return new Response(
          JSON.stringify({ success: false, error: "Valid item id is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error } = await adminClient
        .from("still_needed_items")
        .delete()
        .eq("id", id);

      if (error) throw new Error(error.message);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: false, error: "Invalid action" }), {
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

