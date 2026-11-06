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

    // 1. LIST DOCUMENTS
    if (action === "list") {
      const { user_id } = body;
      if (!user_id || !isUUID(user_id)) {
        return new Response(JSON.stringify({ success: true, documents: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const parentIds = await getConnectedParentIds(user_id);

      // Get children accessible by this user (via child_parents or created_by)
      const { data: cpRows } = await adminClient
        .from("child_parents")
        .select("child_id")
        .eq("parent_id", user_id);

      const { data: createdKids } = await adminClient
        .from("children")
        .select("id")
        .eq("created_by", user_id);

      const accessibleChildIds = new Set([
        ...(cpRows || []).map((r: any) => r.child_id),
        ...(createdKids || []).map((r: any) => r.id),
      ]);

      const { data: docs, error } = await adminClient
        .from("documents")
        .select("*")
        .in("user_id", parentIds)
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);

      // Child-level segregation: A parent only sees documents:
      // 1. Uploaded by themselves (d.user_id === user_id)
      // 2. Or linked to a child they have access to (accessibleChildIds.has(d.child_id))
      // 3. Or general family documents (d.child_id is null)
      const allowedDocs = (docs || []).filter((d: any) => {
        if (d.user_id === user_id) return true;
        if (d.child_id) return accessibleChildIds.has(d.child_id);
        return true;
      });

      return new Response(JSON.stringify({ success: true, documents: allowedDocs }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. CREATE DOCUMENT RECORD
    if (action === "create") {
      const { user_id, child_id, title, category = "Algemeen", file_path, file_size = 0, mime_type, is_shared = true } = body;
      if (!user_id || !title?.trim() || !file_path) {
        return new Response(JSON.stringify({ success: false, error: "user_id, title, and file_path are required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const insertData: any = {
        user_id,
        title: title.trim(),
        category,
        file_path,
        file_size: Number(file_size) || 0,
        mime_type,
        is_shared: Boolean(is_shared),
      };

      if (isUUID(child_id)) insertData.child_id = child_id;

      const { data, error } = await adminClient
        .from("documents")
        .insert([insertData])
        .select()
        .single();

      if (error) throw new Error(error.message);

      return new Response(JSON.stringify({ success: true, document: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. DELETE DOCUMENT
    if (action === "delete") {
      const { id } = body;
      if (!id) {
        return new Response(JSON.stringify({ success: false, error: "id is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch file_path first
      const { data: doc } = await adminClient
        .from("documents")
        .select("file_path")
        .eq("id", id)
        .maybeSingle();

      if (doc?.file_path) {
        try {
          await adminClient.storage.from("documents").remove([doc.file_path]);
        } catch {
          // ignore storage delete errors
        }
      }

      const { error } = await adminClient.from("documents").delete().eq("id", id);
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
