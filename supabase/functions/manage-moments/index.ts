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

    // 0. UPLOAD PHOTO (Service-Role execution completely prevents RLS errors)
    if (action === "upload-photo") {
      const { fileBase64, fileName, fileType, userId } = body;
      if (!fileBase64) {
        return new Response(JSON.stringify({ success: false, error: "fileBase64 is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Ensure 'moments' bucket exists and is public
      try {
        const { data: buckets } = await adminClient.storage.listBuckets();
        const hasMoments = (buckets || []).some((b: any) => b.name === "moments" || b.id === "moments");
        if (!hasMoments) {
          await adminClient.storage.createBucket("moments", {
            public: true,
            fileSizeLimit: 10485760,
            allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
          });
        } else {
          await adminClient.storage.updateBucket("moments", { public: true });
        }
      } catch (bucketErr) {
        console.warn("[manage-moments] bucket ensure notice:", bucketErr);
      }

      const ext = (fileName?.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
      const cleanName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
      const filePath = userId ? `${userId}/${cleanName}` : `moments/${cleanName}`;

      const rawBase64 = fileBase64.includes(",") ? fileBase64.split(",")[1] : fileBase64;
      const binaryString = atob(rawBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const { data: uploadData, error: uploadErr } = await adminClient.storage
        .from("moments")
        .upload(filePath, bytes, {
          contentType: fileType || "image/jpeg",
          upsert: true,
        });

      if (uploadErr) {
        console.error("[manage-moments] storage upload error:", uploadErr);
        return new Response(JSON.stringify({ success: false, error: uploadErr.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: urlData } = adminClient.storage.from("moments").getPublicUrl(filePath);

      return new Response(
        JSON.stringify({
          success: true,
          url: urlData.publicUrl,
          filePath,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

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

    // 1. LIST MOMENTS
    if (action === "list") {
      const { user_id } = body;
      if (!user_id || !isUUID(user_id)) {
        return new Response(JSON.stringify({ success: true, moments: [] }), {
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

      const { data: allMoments, error } = await adminClient
        .from("shared_moments")
        .select("*")
        .in("user_id", parentIds)
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);

      // Filter: user sees own moments, or co-parent moments that are not private and belong to accessible children
      const filteredMoments = (allMoments || []).filter((m: any) => {
        if (m.user_id === user_id) return true;
        if (m.is_private) return false;
        if (m.child_id) {
          return accessibleChildIds.has(m.child_id);
        }
        return true;
      });

      return new Response(JSON.stringify({ success: true, moments: filteredMoments }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. CREATE MOMENT
    if (action === "create") {
      const { user_id, child_id, title, description, photo_url, is_milestone = false, is_private = false } = body;
      if (!user_id || (!title?.trim() && !description?.trim())) {
        return new Response(JSON.stringify({ success: false, error: "user_id and text/title are required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const insertData: any = {
        user_id,
        title: (title || description || "Moment").trim(),
        description: description?.trim() || null,
        photo_url: photo_url || null,
        is_milestone: Boolean(is_milestone),
        is_private: Boolean(is_private),
      };

      if (isUUID(child_id)) insertData.child_id = child_id;

      const { data, error } = await adminClient
        .from("shared_moments")
        .insert([insertData])
        .select()
        .single();

      if (error) throw new Error(error.message);

      return new Response(JSON.stringify({ success: true, moment: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. DELETE MOMENT
    if (action === "delete") {
      const { id } = body;
      if (!id) {
        return new Response(JSON.stringify({ success: false, error: "id is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: moment } = await adminClient
        .from("shared_moments")
        .select("photo_url")
        .eq("id", id)
        .maybeSingle();

      if (moment?.photo_url) {
        try {
          const path = moment.photo_url.split("/").pop();
          if (path) await adminClient.storage.from("moments").remove([path]);
        } catch {
          // ignore storage delete errors
        }
      }

      const { error } = await adminClient.from("shared_moments").delete().eq("id", id);
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
