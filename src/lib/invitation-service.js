import { supabase, isConfigured } from "@/lib/supabase";

/**
 * Universal Co-Parent Invitation & Linking Service
 * Integrates with `send-invitation` and `accept-invitation` Edge Functions.
 */

/**
 * Send or generate a co-parent invitation link.
 * @param {Object} params
 * @param {string} params.toEmail - Recipient email
 * @param {string[]} params.childIds - Array of child UUIDs to share
 * @param {string} [params.fromParentId] - Sender parent UUID
 */
export async function sendCoParentInvitation({ toEmail, childIds = [], fromParentId, lang }) {
  if (!toEmail || !/.+@.+\..+/.test(toEmail)) {
    throw new Error("A valid email address is required.");
  }

  // Validate that selected children don't already have a co-parent connected or active pending invite
  if (fromParentId && Array.isArray(childIds) && childIds.length > 0) {
    try {
      const existing = await fetchConnectedCoParents(fromParentId);
      if (existing && existing.length > 0) {
        for (const cid of childIds) {
          const alreadyConnected = existing.find((cp) =>
            Array.isArray(cp.child_ids) && cp.child_ids.includes(cid)
          );
          if (alreadyConnected) {
            throw new Error(
              `Dit kind is al verbonden met ${alreadyConnected.name || "een co-ouder"}. Een kind kan maximaal twee verbonden ouders hebben.`
            );
          }
        }
      }

      // Also ensure child does not already have an active pending invitation
      const sent = await fetchSentInvitations(fromParentId);
      const activePending = (sent || []).filter(
        (inv) =>
          (inv.status === "sent" || inv.status === "pending") &&
          (!inv.expires_at || new Date(inv.expires_at) > new Date())
      );
      for (const cid of childIds) {
        const pendingForChild = activePending.find(
          (inv) => Array.isArray(inv.child_ids) && inv.child_ids.includes(cid)
        );
        if (pendingForChild) {
          throw new Error(
            `Er staat al een openstaande uitnodiging voor dit kind naar ${pendingForChild.to_email}. Wacht tot deze geaccepteerd of afgewezen is, of trek de uitnodiging in.`
          );
        }
      }
    } catch (checkErr) {
      if (checkErr.message?.includes("al verbonden") || checkErr.message?.includes("openstaande uitnodiging")) {
        throw checkErr;
      }
    }
  }

  const activeLang =
    lang ||
    (typeof localStorage !== "undefined"
      ? localStorage.getItem("i18nextLng") || localStorage.getItem("app_taal")
      : null) ||
    "nl";

  if (isConfigured) {
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const { data, error } = await supabase.functions.invoke("send-invitation", {
        body: {
          toEmail: toEmail.trim().toLowerCase(),
          childIds,
          from_parent_id: fromParentId,
          origin,
          redirectUrl: origin ? `${origin}/uitnodiging` : undefined,
          lang: activeLang,
        },
      });

      if (error) {
        throw new Error(error.message || "Failed to generate invitation.");
      }

      if (data && data.success) {
        return data;
      } else if (data?.error) {
        throw new Error(data.error);
      }
    } catch (err) {
      console.error("[invitation-service] send-invitation error:", err);
      throw err;
    }
  }

  // Local fallback (offline / demo preview)
  const dummyToken = `demo-${Date.now()}`;
  const origin = window.location.origin;
  return {
    success: true,
    token: dummyToken,
    inviteLink: `${origin}/uitnodiging?token=${dummyToken}`,
    deepLink: `ouderapp://invite?token=${dummyToken}`,
    message: "Invitation link created locally (demo mode).",
  };
}

/**
 * Inspect an invitation without needing authentication.
 * @param {string} token
 */
export async function inspectInvitation(token) {
  if (!token) throw new Error("Invitation token is required.");

  if (isConfigured) {
    // 1. Check co-parent invitation via Edge Function
    try {
      const { data, error } = await supabase.functions.invoke("accept-invitation", {
        body: { action: "inspect", token },
      });

      if (!error && data?.success && data.invitation) {
        return data.invitation;
      }
    } catch (err) {
      console.warn("[invitation-service] accept-invitation inspect notice:", err);
    }

    // 2. Check caregiver / family circle invitation via Edge Function
    try {
      const { data: cgData, error: cgErr } = await supabase.functions.invoke("manage-caregivers", {
        body: { action: "get-by-token", token },
      });

      if (!cgErr && cgData?.success && cgData.caregiver) {
        const cg = cgData.caregiver;
        const creatorName = cg.creator?.name?.trim() || "Mona";
        return {
          id: cg.id,
          token: cg.invite_token || token,
          type: "caregiver",
          status: cg.status,
          to_email: cg.email,
          caregiver_name: cg.name,
          role: cg.role,
          from_parent: {
            id: cg.created_by,
            name: creatorName,
            email: cg.creator?.email || "monauser@yopmail.com",
          },
          children: [],
          is_expired: false,
          is_already_accepted: cg.status === "active",
          is_declined: false,
          is_cancelled: cg.status === "revoked",
        };
      }
    } catch (cgErr) {
      console.warn("[invitation-service] manage-caregivers inspect notice:", cgErr);
    }
  }

  // Fallback demo object with sender Mona
  return {
    token,
    status: "pending",
    from_parent: { name: "Mona" },
    children: [],
    expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
    is_expired: false,
    is_already_accepted: false,
  };
}

/**
 * Accept a co-parent invitation.
 * @param {Object} params
 * @param {string} params.token
 * @param {string} params.userId
 */
export async function acceptCoParentInvitation({ token, userId }) {
  if (!token) throw new Error("Invitation token is required.");

  if (isConfigured) {
    try {
      const { data, error } = await supabase.functions.invoke("accept-invitation", {
        body: {
          action: "accept",
          token,
          user_id: userId,
          parent_id: userId,
        },
      });

      if (error) {
        throw new Error(error.message || "Failed to accept invitation.");
      }

      if (data && data.success) {
        // Also update local storage profile cache to together mode
        try {
          const raw = localStorage.getItem("ouderapp_auth_profile");
          if (raw) {
            const p = JSON.parse(raw);
            p.usage_mode = "together";
            localStorage.setItem("ouderapp_auth_profile", JSON.stringify(p));
          }
        } catch {}

        return data;
      } else if (data?.error) {
        throw new Error(data.error);
      }
    } catch (err) {
      console.error("[invitation-service] accept error:", err);
      throw err;
    }
  }

  return {
    success: true,
    message: "Invitation accepted in offline mode.",
  };
}

/**
 * Decline a co-parent invitation.
 * @param {string} token
 */
export async function declineInvitation(token) {
  if (!token) throw new Error("Invitation token is required.");

  if (isConfigured) {
    try {
      const { data, error } = await supabase.functions.invoke("accept-invitation", {
        body: {
          action: "decline",
          token,
        },
      });

      if (!error && data?.success) {
        return data;
      }
      if (error) {
        console.warn("[invitation-service] Edge function decline error, trying direct update:", error);
      }
    } catch (err) {
      console.warn("[invitation-service] edge function decline failed, attempting direct table update:", err);
    }

    try {
      const { error: dbErr } = await supabase
        .from("invitations")
        .update({ status: "declined" })
        .eq("token", token);
      if (dbErr) throw dbErr;
      return { success: true };
    } catch (err) {
      console.error("[invitation-service] decline error:", err);
      throw err;
    }
  }

  return { success: true, message: "Invitation declined in offline mode." };
}

/**
 * Fetch all invitations created by this parent via accept-invitation Edge Function
 * @param {string} parentId
 */
export async function fetchSentInvitations(parentId) {
  if (!isConfigured || !parentId) return [];

  try {
    const { data, error } = await supabase.functions.invoke("accept-invitation", {
      body: { action: "list", parent_id: parentId },
    });

    if (!error && data?.success && Array.isArray(data.invitations)) {
      return data.invitations;
    }
  } catch (err) {
    console.warn("[invitation-service] fetchSentInvitations error:", err);
  }
  return [];
}

/**
 * Fetch all connected co-parents for the current user via accept-invitation Edge Function
 * @param {string} userId
 * @returns {Promise<Array>}
 */
export async function fetchConnectedCoParents(userId) {
  if (!isConfigured || !userId) return [];

  try {
    const { data, error } = await supabase.functions.invoke("accept-invitation", {
      body: { action: "list-connected", user_id: userId },
    });

    if (!error && data?.success && Array.isArray(data.co_parents)) {
      return data.co_parents;
    }
  } catch (err) {
    console.warn("[invitation-service] fetchConnectedCoParents error:", err);
  }
  return [];
}

/**
 * Fetch primary connected co-parent for the current user (backward compatibility)
 * @param {string} userId
 */
export async function fetchConnectedCoParent(userId) {
  const all = await fetchConnectedCoParents(userId);
  return all[0] || null;
}

/**
 * Cancel or revoke a pending invitation
 * @param {string} invitationId
 */
export async function cancelInvitation(invitationId) {
  if (!isConfigured || !invitationId) return;

  try {
    const { data, error } = await supabase.functions.invoke("accept-invitation", {
      body: {
        action: "cancel",
        invitation_id: invitationId,
      },
    });

    if (!error && data?.success) {
      return data;
    }
    if (error) {
      console.warn("[invitation-service] Edge function cancel error, trying direct update:", error);
    }
  } catch (err) {
    console.warn("[invitation-service] Edge function cancel failed, fallback to table update:", err);
  }

  try {
    const { error: dbErr } = await supabase
      .from("invitations")
      .update({ status: "cancelled" })
      .eq("id", invitationId);
    if (dbErr) throw dbErr;
  } catch (err) {
    console.error("[invitation-service] cancelInvitation error:", err);
    throw err;
  }
}

/**
 * Disconnect a co-parent connection.
 * Removes shared child access, marks connection/invitation as disconnected,
 * and resets usage_mode to 'solo' for both parents.
 * @param {Object} params
 * @param {string} params.currentUserId
 * @param {string} params.coParentId
 * @param {string} [params.invitationId]
 */
export async function disconnectCoParent({ currentUserId, coParentId, invitationId }) {
  if (!isConfigured || !currentUserId || !coParentId) {
    throw new Error("Missing required parameters to disconnect co-parent.");
  }

  // 1. Try PostgreSQL stored procedure first
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc("custom_disconnect_coparent", {
      p_user_id: currentUserId,
      p_coparent_id: coParentId,
      p_invitation_id: invitationId || null,
    });

    if (!rpcError && rpcData?.success) {
      return rpcData;
    }
  } catch (rpcErr) {
    console.warn("[invitation-service] custom_disconnect_coparent RPC notice:", rpcErr);
  }

  // 2. Direct database query fallback
  try {
    // A. Update invitation status (fallback to 'cancelled' if 'disconnected' is not in constraint)
    const updateInvStatus = async (statusVal) => {
      if (invitationId) {
        return await supabase
          .from("invitations")
          .update({ status: statusVal })
          .eq("id", invitationId);
      } else {
        return await supabase
          .from("invitations")
          .update({ status: statusVal })
          .or(
            `and(from_parent_id.eq.${currentUserId},to_parent_id.eq.${coParentId}),and(from_parent_id.eq.${coParentId},to_parent_id.eq.${currentUserId})`
          );
      }
    };

    const { error: invErr } = await updateInvStatus("disconnected");
    if (invErr) {
      console.warn("[invitation-service] 'disconnected' status update error, falling back to 'cancelled':", invErr);
      await updateInvStatus("cancelled");
    }

    // B. Update parent_connections (do not send updated_at to avoid schema cache mismatch)
    await supabase
      .from("parent_connections")
      .update({ status: "disconnected" })
      .or(
        `and(parent_1_id.eq.${currentUserId},parent_2_id.eq.${coParentId}),and(parent_1_id.eq.${coParentId},parent_2_id.eq.${currentUserId})`
      );

    // C. Remove shared access to children in child_parents
    // Find children created by the other parent and remove current user from them
    const { data: otherKids } = await supabase
      .from("children")
      .select("id")
      .eq("created_by", coParentId);

    if (Array.isArray(otherKids) && otherKids.length > 0) {
      const otherKidIds = otherKids.map((k) => k.id);
      await supabase
        .from("child_parents")
        .delete()
        .eq("parent_id", currentUserId)
        .in("child_id", otherKidIds);
    }

    // Find children created by current user and remove other parent from them
    const { data: myKids } = await supabase
      .from("children")
      .select("id")
      .eq("created_by", currentUserId);

    if (Array.isArray(myKids) && myKids.length > 0) {
      const myKidIds = myKids.map((k) => k.id);
      await supabase
        .from("child_parents")
        .delete()
        .eq("parent_id", coParentId)
        .in("child_id", myKidIds);
    }

    // 3. Remove access to any children specifically shared in this invitation
    if (invitationId) {
      const { data: invRow } = await supabase
        .from("invitations")
        .select("child_ids, from_parent_id, to_parent_id")
        .eq("id", invitationId)
        .maybeSingle();

      if (invRow?.child_ids?.length > 0 && invRow.to_parent_id) {
        await supabase
          .from("child_parents")
          .delete()
          .eq("parent_id", invRow.to_parent_id)
          .in("child_id", invRow.child_ids);
      }
    }

    // D. Switch disconnected coParent to 'solo', and current user only if no other active connections remain
    await supabase
      .from("profiles")
      .update({ usage_mode: "solo" })
      .eq("id", coParentId);

    const remaining = await fetchConnectedCoParents(currentUserId);
    if (!remaining || remaining.length === 0) {
      await supabase
        .from("profiles")
        .update({ usage_mode: "solo" })
        .eq("id", currentUserId);
    }

    return {
      success: true,
      message: "Co-parent connection removed. Access to shared children revoked.",
    };
  } catch (err) {
    console.error("[invitation-service] disconnectCoParent fallback error:", err);
    throw err;
  }
}

