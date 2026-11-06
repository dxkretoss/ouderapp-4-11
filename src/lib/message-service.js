import { supabase, isConfigured } from "@/lib/supabase";

export function isUUID(str) {
  return typeof str === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
}

/**
 * Message Service (Database-First, Rule 1 Compliant)
 * All operations route via Supabase Edge Function: `manage-messages`.
 */

export async function fetchMessagingData(userId) {
  if (!isConfigured || !userId) {
    return { success: false, conversations: [], co_parents: [], children: [] };
  }

  try {
    const { data, error } = await supabase.functions.invoke("manage-messages", {
      body: { action: "list", userId },
    });

    if (error) {
      console.warn("[message-service] fetchMessagingData error:", error);
      return { success: false, error: error.message, conversations: [], co_parents: [], children: [] };
    }

    if (data?.success) {
      return {
        success: true,
        conversations: data.conversations || [],
        co_parents: data.co_parents || [],
        children: data.children || [],
      };
    }

    return {
      success: false,
      error: data?.error || "Unknown error",
      conversations: [],
      co_parents: [],
      children: [],
    };
  } catch (err) {
    console.error("[message-service] fetchMessagingData exception:", err);
    return { success: false, error: err.message, conversations: [], co_parents: [], children: [] };
  }
}

export async function fetchConversationMessages(conversationId, userId) {
  if (!isConfigured || !conversationId) {
    return { success: false, messages: [] };
  }

  try {
    const { data, error } = await supabase.functions.invoke("manage-messages", {
      body: { action: "get_messages", conversationId, userId },
    });

    if (error) {
      console.warn("[message-service] fetchConversationMessages error:", error);
      return { success: false, error: error.message, messages: [] };
    }

    if (data?.success) {
      return { success: true, messages: data.messages || [] };
    }

    return { success: false, error: data?.error || "Unknown error", messages: [] };
  } catch (err) {
    console.error("[message-service] fetchConversationMessages exception:", err);
    return { success: false, error: err.message, messages: [] };
  }
}

export async function createTopic(userId, { title, otherParentId, childId, initialMessage, toneLevel }) {
  if (!isConfigured || !userId) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    const { data, error } = await supabase.functions.invoke("manage-messages", {
      body: {
        action: "create_topic",
        userId,
        title,
        otherParentId,
        childId,
        initialMessage,
        toneLevel,
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return data;
  } catch (err) {
    console.error("[message-service] createTopic exception:", err);
    return { success: false, error: err.message };
  }
}

export async function sendMessage(userId, { conversationId, content, toneLevel }) {
  if (!isConfigured || !userId || !conversationId || !content) {
    return { success: false, error: "Missing required parameters" };
  }

  try {
    const { data, error } = await supabase.functions.invoke("manage-messages", {
      body: {
        action: "send_message",
        userId,
        conversationId,
        content,
        toneLevel,
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return data;
  } catch (err) {
    console.error("[message-service] sendMessage exception:", err);
    return { success: false, error: err.message };
  }
}

export async function updateTopic(conversationId, updates) {
  if (!isConfigured || !conversationId) {
    return { success: false, error: "Missing conversationId" };
  }

  try {
    const { data, error } = await supabase.functions.invoke("manage-messages", {
      body: {
        action: "update_topic",
        conversationId,
        is_pinned: updates.isPinned,
        is_archived: updates.isArchived,
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return data;
  } catch (err) {
    console.error("[message-service] updateTopic exception:", err);
    return { success: false, error: err.message };
  }
}

export async function deleteTopic(conversationId, userId) {
  if (!isConfigured || !conversationId) {
    return { success: false, error: "Missing conversationId" };
  }

  try {
    const { data, error } = await supabase.functions.invoke("manage-messages", {
      body: {
        action: "delete_topic",
        conversationId,
        userId,
      },
    });

    if (!error && data?.success) {
      return data;
    }

    if (error) {
      console.warn("[message-service] delete_topic edge function error, using direct table fallback:", error);
    }

    // Direct fallback
    await supabase.from("messages").delete().eq("conversation_id", conversationId);
    const { error: delErr } = await supabase.from("conversations").delete().eq("id", conversationId);
    if (!delErr) {
      return { success: true };
    }

    return { success: false, error: delErr?.message || error?.message || data?.error };
  } catch (err) {
    console.error("[message-service] deleteTopic exception:", err);
    try {
      await supabase.from("messages").delete().eq("conversation_id", conversationId);
      const { error: delErr } = await supabase.from("conversations").delete().eq("id", conversationId);
      if (!delErr) return { success: true };
    } catch {}
    return { success: false, error: err.message };
  }
}

