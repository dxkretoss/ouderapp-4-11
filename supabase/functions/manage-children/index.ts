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

    // 0. LIST CHILDREN FOR PARENT
    if (action === "list") {
      const parent_id = body.parent_id || body.user_id;
      if (!parent_id) {
        return new Response(JSON.stringify({ success: false, error: "parent_id is required." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch linked children from child_parents junction table
      const { data: parentLinks } = await adminClient
        .from("child_parents")
        .select("child_id, role")
        .eq("parent_id", parent_id);

      const linkedChildIds = (parentLinks || []).map((l: any) => l.child_id).filter(isUUID);

      let query = adminClient.from("children").select("*");
      if (linkedChildIds.length > 0) {
        query = query.or(`created_by.eq.${parent_id},id.in.(${linkedChildIds.join(",")})`);
      } else {
        query = query.eq("created_by", parent_id);
      }

      const { data: kids, error: listErr } = await query.order("created_at", { ascending: true });

      if (listErr) throw new Error(listErr.message);

      const childrenWithRoles = (kids || []).map((k: any) => {
        const link = (parentLinks || []).find((l: any) => l.child_id === k.id);
        return {
          ...k,
          role: link?.role || "parent",
          can_edit: true,
        };
      });

      return new Response(JSON.stringify({ success: true, children: childrenWithRoles }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. CREATE CHILD PROFILE (Independent of other parent)
    if (action === "create") {
      const {
        parent_id,
        name,
        last_name,
        date_of_birth,
        avatar_url,
        school,
        daycare,
        doctor,
        medical_notes,
        care_schedule,
        clothes_size,
        shoe_size,
        bsn,
        allergies,
        dietary_notes,
        color_code,
      } = body;

      if (!name || !name.trim()) {
        return new Response(JSON.stringify({ success: false, error: "Child name is required." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!parent_id) {
        return new Response(JSON.stringify({ success: false, error: "parent_id is required." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Insert child record
      let insertData: any = {
        name: name.trim(),
        last_name: last_name?.trim() || null,
        date_of_birth: date_of_birth || null,
        avatar_url: avatar_url || null,
        school: school?.trim() || null,
        daycare: daycare?.trim() || null,
        doctor: doctor?.trim() || null,
        medical_notes: medical_notes?.trim() || null,
        care_schedule: care_schedule?.trim() || null,
        clothes_size: clothes_size?.trim() || null,
        shoe_size: shoe_size?.trim() || null,
        bsn: bsn?.trim() || null,
        allergies: allergies?.trim() || null,
        dietary_notes: dietary_notes?.trim() || null,
        color_code: color_code || "#3C6E71",
        created_by: parent_id,
      };

      let { data: child, error: childErr } = await adminClient
        .from("children")
        .insert(insertData)
        .select()
        .single();

      // If database is missing optional columns (like allergies), retry with base columns:
      if (childErr && (childErr.message?.includes("schema cache") || childErr.message?.includes("column"))) {
        console.warn("Retrying child insert with core columns due to schema cache notice:", childErr.message);
        const coreData = {
          name: name.trim(),
          date_of_birth: date_of_birth || null,
          created_by: parent_id,
        };
        const retry = await adminClient
          .from("children")
          .insert(coreData)
          .select()
          .single();

        if (!retry.error && retry.data) {
          child = retry.data;
          childErr = null;
        }
      }

      if (childErr || !child) {
        throw new Error(childErr?.message || "Could not insert child record.");
      }

      // Link parent in child_parents junction table
      await adminClient.from("child_parents").upsert(
        {
          child_id: child.id,
          parent_id: parent_id,
          role: "parent",
        },
        { onConflict: "child_id,parent_id" }
      );

      // Note: Child belongs exclusively to the creator parent until shared via an explicit co-parent invitation.

      return new Response(JSON.stringify({ success: true, child }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. LIST ALL CHILDREN FOR PARENT
    if (action === "list" || action === "get_children") {
      const { parent_id } = body;
      if (!parent_id) {
        return new Response(JSON.stringify({ success: false, error: "parent_id is required." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get children created by parent or linked in child_parents
      const { data: linked } = await adminClient
        .from("child_parents")
        .select("child_id, role")
        .eq("parent_id", parent_id);

      const linkedChildIds = (linked || []).map((l) => l.child_id);

      let query = adminClient.from("children").select("*");
      if (linkedChildIds.length > 0) {
        query = query.or(`created_by.eq.${parent_id},id.in.(${linkedChildIds.join(",")})`);
      } else {
        query = query.eq("created_by", parent_id);
      }

      const { data: children, error: fetchErr } = await query.order("name", { ascending: true });

      if (fetchErr) {
        throw new Error(fetchErr.message);
      }

      return new Response(JSON.stringify({ success: true, children: children || [] }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. GET SINGLE CHILD PROFILE
    if (action === "get" || action === "get_child") {
      const { child_id, parent_id } = body;
      if (!child_id || !isUUID(child_id)) {
        return new Response(JSON.stringify({ success: false, error: "Child not found." }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: child, error: getErr } = await adminClient
        .from("children")
        .select("*")
        .eq("id", child_id)
        .single();

      if (getErr || !child) {
        return new Response(JSON.stringify({ success: false, error: getErr?.message || "Child not found." }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Authorization check: requester must be creator or linked co-parent
      if (parent_id && isUUID(parent_id) && child.created_by !== parent_id) {
        const { data: link } = await adminClient
          .from("child_parents")
          .select("child_id")
          .eq("child_id", child.id)
          .eq("parent_id", parent_id)
          .maybeSingle();

        if (!link) {
          return new Response(JSON.stringify({ success: false, error: "Unauthorized access to child profile." }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      return new Response(JSON.stringify({ success: true, child }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. UPDATE CHILD PROFILE
    if (action === "update") {
      const { child_id, parent_id, updates } = body;
      if (!child_id || !isUUID(child_id) || !parent_id) {
        return new Response(JSON.stringify({ success: false, error: "Valid child_id and parent_id are required." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Authorization check
      const { data: existingChild } = await adminClient
        .from("children")
        .select("created_by")
        .eq("id", child_id)
        .maybeSingle();

      if (existingChild && existingChild.created_by !== parent_id) {
        const { data: link } = await adminClient
          .from("child_parents")
          .select("child_id")
          .eq("child_id", child_id)
          .eq("parent_id", parent_id)
          .maybeSingle();

        if (!link) {
          return new Response(JSON.stringify({ success: false, error: "Unauthorized to update this child profile." }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      const { data: updatedChild, error: updateErr } = await adminClient
        .from("children")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", child_id)
        .select()
        .single();

      if (updateErr) {
        throw new Error(updateErr.message);
      }

      return new Response(JSON.stringify({ success: true, child: updatedChild }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5. DELETE CHILD
    if (action === "delete") {
      const { child_id, parent_id, child_name } = body;

      // Check if caller is creator or invited co-parent
      if (child_id && isUUID(child_id) && parent_id && isUUID(parent_id)) {
        const { data: childRow } = await adminClient
          .from("children")
          .select("created_by")
          .eq("id", child_id)
          .maybeSingle();

        if (childRow && childRow.created_by !== parent_id) {
          // Parent is a linked co-parent: only unlink them, do not delete child profile
          await adminClient.from("child_parents").delete().match({ child_id, parent_id });
          return new Response(JSON.stringify({ success: true, message: "Child access removed for co-parent." }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      // 0. Clean up child avatar from storage bucket
      try {
        let childRecord: any = null;
        if (child_id && isUUID(child_id)) {
          const { data } = await adminClient.from("children").select("avatar_url").eq("id", child_id).maybeSingle();
          childRecord = data;
        } else if (child_name) {
          const query = adminClient.from("children").select("avatar_url").eq("name", child_name);
          if (parent_id && isUUID(parent_id)) {
            query.eq("created_by", parent_id);
          }
          const { data } = await query.maybeSingle();
          childRecord = data;
        }

        if (childRecord?.avatar_url) {
          const match = childRecord.avatar_url.match(/(?:child-avatars|avatars)\/(.+)$/);
          if (match && match[1]) {
            const rawPath = decodeURIComponent(match[1].split("?")[0]);
            await adminClient.storage.from("child-avatars").remove([rawPath]);
            await adminClient.storage.from("avatars").remove([rawPath]);
          }
        }
      } catch (storageCleanupErr) {
        console.warn("Child avatar storage cleanup notice:", storageCleanupErr);
      }

      let deleted = false;
      if (child_id && isUUID(child_id)) {
        const { error: delErr } = await adminClient
          .from("children")
          .delete()
          .eq("id", child_id);
        if (!delErr) deleted = true;
      }

      if (!deleted && child_name) {
        if (parent_id && isUUID(parent_id)) {
          await adminClient.from("children").delete().eq("name", child_name).eq("created_by", parent_id);
        } else {
          await adminClient.from("children").delete().eq("name", child_name);
        }
      }

      return new Response(JSON.stringify({ success: true, message: "Child deleted successfully." }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5. UPDATE USAGE MODE (Solo vs Together)
    if (action === "update_usage_mode") {
      const { user_id, usage_mode } = body;
      if (!["together", "solo", "caregiver"].includes(usage_mode)) {
        return new Response(JSON.stringify({ success: false, error: "usage_mode must be together, solo, or caregiver." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: modeErr } = await adminClient
        .from("profiles")
        .update({ usage_mode, updated_at: new Date().toISOString() })
        .eq("id", user_id);

      if (modeErr) throw new Error(modeErr.message);

      return new Response(JSON.stringify({ success: true, usage_mode }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 6. SAVE SCHEDULE (All or single child)
    if (action === "save_schedule") {
      const { parent_id, child_id, schedule } = body;
      if (!parent_id) {
        return new Response(JSON.stringify({ success: false, error: "parent_id is required." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let childIds: string[] = [];
      if (child_id && isUUID(child_id) && child_id !== "all") {
        childIds = [child_id];
      } else {
        const { data: links } = await adminClient
          .from("child_parents")
          .select("child_id")
          .eq("parent_id", parent_id);
        const { data: ownKids } = await adminClient
          .from("children")
          .select("id")
          .eq("created_by", parent_id);
        childIds = [...new Set([
          ...(links || []).map((l: any) => l.child_id),
          ...(ownKids || []).map((k: any) => k.id),
        ])].filter(isUUID);
      }

      if (childIds.length > 0) {
        await adminClient
          .from("children")
          .update({
            care_schedule: schedule,
            updated_at: new Date().toISOString(),
          })
          .in("id", childIds);
      } else {
        await adminClient
          .from("children")
          .update({
            care_schedule: schedule,
            updated_at: new Date().toISOString(),
          })
          .eq("created_by", parent_id);
      }

      return new Response(JSON.stringify({ success: true, message: "Care schedule saved." }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 7. SAVE CUSTODY (All or single child)
    if (action === "save_custody") {
      const { parent_id, child_id, custody } = body;
      if (!parent_id) {
        return new Response(JSON.stringify({ success: false, error: "parent_id is required." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let childIds: string[] = [];
      if (child_id && isUUID(child_id) && child_id !== "all") {
        childIds = [child_id];
      } else {
        const { data: links } = await adminClient
          .from("child_parents")
          .select("child_id")
          .eq("parent_id", parent_id);
        const { data: ownKids } = await adminClient
          .from("children")
          .select("id")
          .eq("created_by", parent_id);
        childIds = [...new Set([
          ...(links || []).map((l: any) => l.child_id),
          ...(ownKids || []).map((k: any) => k.id),
        ])].filter(isUUID);
      }

      if (childIds.length > 0) {
        for (const cid of childIds) {
          const { data: row } = await adminClient
            .from("children")
            .select("practical_notes")
            .eq("id", cid)
            .maybeSingle();

          let existingData: any = {};
          if (row?.practical_notes) {
            try {
              existingData = typeof row.practical_notes === "string" ? JSON.parse(row.practical_notes) : row.practical_notes;
            } catch {}
          }

          const practical_notes = JSON.stringify({
            ...existingData,
            custody,
            updated_at: new Date().toISOString(),
          });

          await adminClient
            .from("children")
            .update({ practical_notes, updated_at: new Date().toISOString() })
            .eq("id", cid);
        }
      }

      return new Response(JSON.stringify({ success: true, message: "Custody arrangement saved." }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 8. SAVE PRIVATE NOTE
    if (action === "save_private_note") {
      const { parent_id, child_id, note } = body;
      if (!parent_id || !child_id || !isUUID(child_id)) {
        return new Response(JSON.stringify({ success: false, error: "parent_id and child_id are required." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: row } = await adminClient
        .from("children")
        .select("practical_notes")
        .eq("id", child_id)
        .maybeSingle();

      let existingData: any = {};
      if (row?.practical_notes) {
        try {
          existingData = typeof row.practical_notes === "string" ? JSON.parse(row.practical_notes) : row.practical_notes;
        } catch {}
      }

      if (!existingData.private_notes || typeof existingData.private_notes !== "object") {
        existingData.private_notes = {};
      }
      existingData.private_notes[parent_id] = (note || "").trim();
      existingData.updated_at = new Date().toISOString();

      await adminClient
        .from("children")
        .update({ practical_notes: JSON.stringify(existingData), updated_at: new Date().toISOString() })
        .eq("id", child_id);

      return new Response(JSON.stringify({ success: true, message: "Private note saved." }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: false, error: `Unknown action: ${action}` }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err?.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
