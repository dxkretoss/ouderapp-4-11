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
    const action = body.action;

    // Normalize parameter aliases
    const userId = body.user_id || body.userId;
    const conversationId = body.conversation_id || body.conversationId;
    const otherParentId = body.other_parent_id || body.otherParentId;
    const childId = body.child_id || body.childId;
    const initialMessage = body.initial_message || body.initialMessage;
    const toneLevel = body.tone_level || body.toneLevel;

    // 1. LIST CONVERSATIONS, CO-PARENTS & CHILDREN
    if (action === "list") {
      if (!userId || !isUUID(userId)) {
        return new Response(JSON.stringify({ success: false, error: "Valid user_id is required." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // A. Fetch children accessible to this parent
      const { data: parentLinks } = await adminClient
        .from("child_parents")
        .select("child_id")
        .eq("parent_id", userId);
      const userChildIds = (parentLinks || []).map((l: any) => l.child_id).filter(isUUID);

      let kidsQuery = adminClient.from("children").select("id, name, last_name, avatar_url, color_code, created_by");
      if (userChildIds.length > 0) {
        kidsQuery = kidsQuery.or(`created_by.eq.${userId},id.in.(${userChildIds.join(",")})`);
      } else {
        kidsQuery = kidsQuery.eq("created_by", userId);
      }
      const { data: childrenList } = await kidsQuery;
      const allAccessibleChildIds = new Set((childrenList || []).map((k: any) => k.id));

      // B. Fetch connected co-parents from invitations & parent_connections
      const coParentMap = new Map<string, any>();

      // Check accepted invitations
      const { data: acceptedInvs } = await adminClient
        .from("invitations")
        .select("id, from_parent_id, to_parent_id, to_email, child_ids, status")
        .or(`from_parent_id.eq.${userId},to_parent_id.eq.${userId}`)
        .eq("status", "accepted");

      if (Array.isArray(acceptedInvs)) {
        for (const inv of acceptedInvs) {
          const otherId = inv.from_parent_id === userId ? inv.to_parent_id : inv.from_parent_id;
          if (otherId && isUUID(otherId)) {
            const childIds = Array.isArray(inv.child_ids) ? inv.child_ids.filter(isUUID) : [];
            const existing = coParentMap.get(otherId) || {
              id: otherId,
              child_ids: [],
              invitation_email: inv.to_email || null,
            };
            existing.child_ids = [...new Set([...existing.child_ids, ...childIds])];
            coParentMap.set(otherId, existing);
          }
        }
      }

      // Check parent_connections
      const { data: directConnections } = await adminClient
        .from("parent_connections")
        .select("id, parent_1_id, parent_2_id, invitation_id, status")
        .or(`parent_1_id.eq.${userId},parent_2_id.eq.${userId}`)
        .eq("status", "active");

      if (Array.isArray(directConnections)) {
        for (const conn of directConnections) {
          const otherId = conn.parent_1_id === userId ? conn.parent_2_id : conn.parent_1_id;
          if (otherId && isUUID(otherId)) {
            const existing = coParentMap.get(otherId) || {
              id: otherId,
              child_ids: [],
              invitation_email: null,
            };
            if (conn.invitation_id && isUUID(conn.invitation_id)) {
              const { data: invData } = await adminClient
                .from("invitations")
                .select("child_ids, to_email")
                .eq("id", conn.invitation_id)
                .maybeSingle();
              if (invData?.child_ids && Array.isArray(invData.child_ids)) {
                existing.child_ids = [...new Set([...existing.child_ids, ...invData.child_ids.filter(isUUID)])];
              }
              if (invData?.to_email && !existing.invitation_email) {
                existing.invitation_email = invData.to_email;
              }
            }
            coParentMap.set(otherId, existing);
          }
        }
      }

      // Also discover shared children through child_parents table
      for (const [coParentId, item] of coParentMap.entries()) {
        const { data: cpLinks } = await adminClient
          .from("child_parents")
          .select("child_id")
          .eq("parent_id", coParentId);

        if (Array.isArray(cpLinks)) {
          for (const l of cpLinks) {
            if (isUUID(l.child_id) && allAccessibleChildIds.has(l.child_id)) {
              item.child_ids.push(l.child_id);
            }
          }
          item.child_ids = [...new Set(item.child_ids)];
        }
      }

      // Fetch profile data for all co-parents
      const coParentsList: any[] = [];
      for (const [coParentId, item] of coParentMap.entries()) {
        const { data: prof } = await adminClient
          .from("profiles")
          .select("id, name, email, avatar_url, role")
          .eq("id", coParentId)
          .maybeSingle();

        coParentsList.push({
          id: coParentId,
          name: prof?.name || item.invitation_email?.split("@")[0] || "Co-ouder",
          email: prof?.email || item.invitation_email || "",
          avatar_url: prof?.avatar_url || null,
          role: prof?.role || "parent",
          child_ids: item.child_ids,
        });
      }

      // C. Fetch conversations involving user
      const { data: convs, error: convErr } = await adminClient
        .from("conversations")
        .select(`
          id,
          title,
          type,
          related_child_id,
          created_by,
          other_parent_id,
          is_pinned,
          is_archived,
          last_message_text,
          last_message_at,
          created_at,
          updated_at
        `)
        .or(`created_by.eq.${userId},other_parent_id.eq.${userId}`)
        .order("is_pinned", { ascending: false })
        .order("last_message_at", { ascending: false, nullsFirst: false });

      if (convErr) throw new Error(convErr.message);

      // Enhance conversations with child info & co-parent info
      const enhancedConvs = (convs || []).map((c: any) => {
        const otherId = c.created_by === userId ? c.other_parent_id : c.created_by;
        const cp = coParentsList.find((p) => p.id === otherId) || null;
        const child = (childrenList || []).find((k: any) => k.id === c.related_child_id) || null;
        return {
          ...c,
          other_parent: cp,
          child: child ? {
            id: child.id,
            name: child.name,
            last_name: child.last_name || "",
            avatar_url: child.avatar_url || null,
            color_code: child.color_code || "#3C6E71",
          } : null,
        };
      });

      return new Response(JSON.stringify({
        success: true,
        conversations: enhancedConvs,
        co_parents: coParentsList,
        children: childrenList || [],
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. CREATE TOPIC / CONVERSATION
    if (action === "create_topic") {
      const title = body.title;
      if (!userId || !title || !title.trim()) {
        return new Response(JSON.stringify({ success: false, error: "userId and title are required." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const validOtherId = isUUID(otherParentId) ? otherParentId : null;
      const validChildId = isUUID(childId) ? childId : null;

      const { data: newConv, error: createErr } = await adminClient
        .from("conversations")
        .insert({
          title: title.trim(),
          type: "topic",
          created_by: userId,
          other_parent_id: validOtherId,
          related_child_id: validChildId,
          last_message_text: initialMessage?.trim() || null,
          last_message_at: new Date().toISOString(),
          is_pinned: false,
          is_archived: false,
        })
        .select()
        .single();

      if (createErr) throw new Error(createErr.message);

      let createdMessage = null;
      if (initialMessage && initialMessage.trim()) {
        const { data: msg, error: msgErr } = await adminClient
          .from("messages")
          .insert({
            conversation_id: newConv.id,
            sender_id: userId,
            content: initialMessage.trim(),
            tone_level: toneLevel || "geen",
            is_system: false,
          })
          .select()
          .single();

        if (!msgErr) {
          createdMessage = msg;
        }
      }

      return new Response(JSON.stringify({
        success: true,
        conversation: newConv,
        message: createdMessage,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. GET MESSAGES FOR CONVERSATION
    if (action === "get_messages") {
      if (!conversationId || !isUUID(conversationId)) {
        return new Response(JSON.stringify({ success: false, error: "Valid conversation_id is required." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: msgs, error: msgErr } = await adminClient
        .from("messages")
        .select("id, conversation_id, sender_id, content, tone_level, is_system, created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (msgErr) throw new Error(msgErr.message);

      return new Response(JSON.stringify({
        success: true,
        messages: msgs || [],
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. SEND MESSAGE
    if (action === "send_message") {
      const content = body.content;
      if (!userId || !conversationId || !content || !content.trim()) {
        return new Response(JSON.stringify({ success: false, error: "userId, conversation_id, and content are required." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: newMsg, error: insertErr } = await adminClient
        .from("messages")
        .insert({
          conversation_id: conversationId,
          sender_id: userId,
          content: content.trim(),
          tone_level: toneLevel || "geen",
          is_system: false,
        })
        .select()
        .single();

      if (insertErr) throw new Error(insertErr.message);

      // Update conversation last message timestamp & text
      await adminClient
        .from("conversations")
        .update({
          last_message_text: content.trim(),
          last_message_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", conversationId);

      return new Response(JSON.stringify({
        success: true,
        message: newMsg,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5. UPDATE TOPIC (pin/archive)
    if (action === "update_topic") {
      if (!conversationId || !isUUID(conversationId)) {
        return new Response(JSON.stringify({ success: false, error: "Valid conversation_id is required." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const updates: any = {};
      if (typeof body.is_pinned === "boolean") updates.is_pinned = body.is_pinned;
      if (typeof body.is_archived === "boolean") updates.is_archived = body.is_archived;

      const { data: updatedConv, error: updateErr } = await adminClient
        .from("conversations")
        .update(updates)
        .eq("id", conversationId)
        .select()
        .single();

      if (updateErr) throw new Error(updateErr.message);

      return new Response(JSON.stringify({
        success: true,
        conversation: updatedConv,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 6. DELETE TOPIC
    if (action === "delete_topic") {
      if (!conversationId || !isUUID(conversationId)) {
        return new Response(JSON.stringify({ success: false, error: "Valid conversation_id is required." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Delete messages first if foreign key cascade is not enabled, then delete conversation
      await adminClient
        .from("messages")
        .delete()
        .eq("conversation_id", conversationId);

      const { error: delErr } = await adminClient
        .from("conversations")
        .delete()
        .eq("id", conversationId);

      if (delErr) throw new Error(delErr.message);

      return new Response(JSON.stringify({
        success: true,
      }), {
        status: 200,
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
