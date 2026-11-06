import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const isUUID = (str: any) =>
  typeof str === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const body = await req.json().catch(() => ({}));
    const { token, invitation_id, action = 'accept', user_id, parent_id } = body;

    // Handle list sent invitations
    if (action === "list" || action === "list-sent") {
      const parentId = body.parent_id || body.user_id;
      if (!parentId) {
        return new Response(JSON.stringify({ success: false, error: "parent_id is required." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: invs, error: listErr } = await adminClient
        .from("invitations")
        .select("*")
        .eq("from_parent_id", parentId)
        .order("created_at", { ascending: false });

      if (listErr) throw listErr;

      const toParentIds = (invs || [])
        .filter((i: any) => i.status === "accepted" && i.to_parent_id)
        .map((i: any) => i.to_parent_id);

      let profileMap: Record<string, any> = {};
      if (toParentIds.length > 0) {
        const { data: profiles } = await adminClient
          .from("profiles")
          .select("id, name, email, avatar_url")
          .in("id", toParentIds);
        (profiles || []).forEach((p: any) => { profileMap[p.id] = p; });
      }

      const populated = (invs || []).map((inv: any) => {
        if (inv.status === "accepted" && inv.to_parent_id && profileMap[inv.to_parent_id]) {
          return { ...inv, to_profile: profileMap[inv.to_parent_id] };
        }
        return inv;
      });

      return new Response(JSON.stringify({ success: true, invitations: populated }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle list connected co-parents
    if (action === "list-connected") {
      const userId = body.user_id || body.parent_id;
      if (!userId) {
        return new Response(JSON.stringify({ success: false, error: "user_id is required." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: acceptedInvs, error: connErr } = await adminClient
        .from("invitations")
        .select("*")
        .or(`from_parent_id.eq.${userId},to_parent_id.eq.${userId}`)
        .eq("status", "accepted")
        .order("accepted_at", { ascending: false });

      if (connErr) throw connErr;

      const otherUserIds = (acceptedInvs || []).map((inv: any) => 
        inv.from_parent_id === userId ? inv.to_parent_id : inv.from_parent_id
      ).filter(Boolean);

      let profileMap: Record<string, any> = {};
      if (otherUserIds.length > 0) {
        const { data: profs } = await adminClient
          .from("profiles")
          .select("id, name, email, avatar_url")
          .in("id", otherUserIds);
        (profs || []).forEach((p: any) => { profileMap[p.id] = p; });
      }

      // Also query child_parents to find all children linked to each co-parent
      let childParentsMap: Record<string, string[]> = {};
      if (otherUserIds.length > 0) {
        const { data: cpRows } = await adminClient
          .from("child_parents")
          .select("parent_id, child_id")
          .in("parent_id", otherUserIds);
        (cpRows || []).forEach((row: any) => {
          if (!childParentsMap[row.parent_id]) childParentsMap[row.parent_id] = [];
          if (!childParentsMap[row.parent_id].includes(row.child_id)) {
            childParentsMap[row.parent_id].push(row.child_id);
          }
        });
      }

      const resultsMap: Record<string, any> = {};
      for (const inv of (acceptedInvs || [])) {
        const otherId = inv.from_parent_id === userId ? inv.to_parent_id : inv.from_parent_id;
        if (!otherId) continue;
        const prof = profileMap[otherId];
        if (!prof) continue;

        if (!resultsMap[otherId]) {
          resultsMap[otherId] = {
            id: prof.id,
            name: prof.name || "Co-ouder",
            email: prof.email,
            avatar_url: prof.avatar_url,
            invitation_id: inv.id,
            child_ids: Array.isArray(inv.child_ids) ? [...inv.child_ids] : [],
            connected_at: inv.accepted_at,
          };
        } else {
          if (Array.isArray(inv.child_ids)) {
            inv.child_ids.forEach((cid: string) => {
              if (!resultsMap[otherId].child_ids.includes(cid)) {
                resultsMap[otherId].child_ids.push(cid);
              }
            });
          }
        }
      }

      // Merge child_parents into child_ids
      Object.keys(resultsMap).forEach((otherId) => {
        const cpKids = childParentsMap[otherId] || [];
        cpKids.forEach((cid) => {
          if (!resultsMap[otherId].child_ids.includes(cid)) {
            resultsMap[otherId].child_ids.push(cid);
          }
        });
      });

      const results = Object.values(resultsMap);

      return new Response(JSON.stringify({ success: true, co_parents: results }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle cancel / revoke early (supports either invitation_id or token)
    if (action === "cancel" || action === "revoke") {
      let query = adminClient.from("invitations").update({ status: "cancelled" });
      if (invitation_id) {
        query = query.eq("id", invitation_id);
      } else if (token) {
        query = query.eq("token", token);
      } else {
        return new Response(JSON.stringify({ success: false, error: "Token or invitation_id required to cancel." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error: cancelErr } = await query;
      if (cancelErr) throw cancelErr;
      return new Response(JSON.stringify({ success: true, message: "Invitation cancelled successfully." }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!token) {
      return new Response(JSON.stringify({ success: false, error: 'Invitation token is required.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch invitation
    const { data: invitation, error: invErr } = await adminClient
      .from('invitations')
      .select('*')
      .eq('token', token)
      .maybeSingle();

    if (invErr || !invitation) {
      return new Response(JSON.stringify({ success: false, error: 'Invitation not found or invalid link.' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 1. ACTION: INSPECT (Preview invitation details without requiring auth)
    if (action === 'inspect') {
      const { data: fromProfile } = await adminClient
        .from('profiles')
        .select('id, name, email')
        .eq('id', invitation.from_parent_id)
        .maybeSingle();

      let sharedChildren: any[] = [];
      if (Array.isArray(invitation.child_ids) && invitation.child_ids.length > 0) {
        const validChildIds = invitation.child_ids.filter(isUUID);
        if (validChildIds.length > 0) {
          const { data: kids } = await adminClient
            .from('children')
            .select('id, name, last_name, avatar_url, color_code, date_of_birth')
            .in('id', validChildIds);
          sharedChildren = kids || [];
        }
      }

      const isExpired = new Date(invitation.expires_at) < new Date();
      return new Response(
        JSON.stringify({
          success: true,
          invitation: {
            id: invitation.id,
            token: invitation.token,
            status: invitation.status,
            to_email: invitation.to_email,
            expires_at: invitation.expires_at,
            is_expired: isExpired,
            is_already_accepted: invitation.status === 'accepted',
            is_declined: invitation.status === 'declined',
            is_cancelled: invitation.status === 'cancelled' || invitation.status === 'revoked',
            from_parent: fromProfile?.name && fromProfile.name !== 'Co-parent' && fromProfile.name !== 'Co-ouder'
              ? fromProfile
              : { id: invitation.from_parent_id, name: fromProfile?.name || 'Mona', email: fromProfile?.email || '' },
            children: sharedChildren,
          },
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 2. ACTION: DECLINE
    if (action === 'decline' || action === 'reject') {
      await adminClient
        .from('invitations')
        .update({ status: 'declined' })
        .eq('id', invitation.id);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Invitation declined.',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 3. ACTION: ACCEPT (Requires authenticated user)
    let acceptingUserId: string | null = null;
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const userClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: { user } } = await userClient.auth.getUser();
      if (user?.id) acceptingUserId = user.id;
    }

    if (!acceptingUserId) {
      const explicitId = user_id || parent_id;
      if (explicitId && isUUID(explicitId)) {
        acceptingUserId = explicitId;
      }
    }

    if (!acceptingUserId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Unauthorized: You must be logged in to accept this invitation.',
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (invitation.status === 'accepted') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'This invitation has already been accepted.',
          status: 'accepted',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (invitation.status === 'cancelled' || invitation.status === 'revoked') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'This invitation was cancelled by the sending parent. Please request a new invitation.',
          status: 'cancelled',
        }),
        {
          status: 410,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (invitation.status === 'declined' || invitation.status === 'rejected') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'This invitation was declined. Please request a new invitation.',
          status: 'declined',
        }),
        {
          status: 410,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (new Date(invitation.expires_at) < new Date()) {
      await adminClient.from('invitations').update({ status: 'expired' }).eq('id', invitation.id);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'This invitation link has expired. Please ask the parent for a new one.',
          status: 'expired',
        }),
        {
          status: 410,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (invitation.from_parent_id === acceptingUserId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'You cannot accept your own invitation.',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 0. Ensure accepting user is a registered user with a valid account
    const { data: profCheck } = await adminClient
      .from('profiles')
      .select('id, email, name, password')
      .eq('id', acceptingUserId)
      .maybeSingle();

    if (!profCheck) {
      // Look up auth.users to see if registered via Supabase Auth
      let authEmail: string | null = null;
      let authName: string | null = null;
      try {
        const { data: authUser } = await adminClient.auth.admin.getUserById(acceptingUserId);
        if (authUser?.user?.email) authEmail = authUser.user.email;
        if (authUser?.user?.user_metadata?.name) authName = authUser.user.user_metadata.name;
      } catch {}

      if (!authEmail) {
        return new Response(
          JSON.stringify({
            success: false,
            error: isEn
              ? 'You must create an account with a password and verify your email before accepting this invitation.'
              : 'Je moet eerst een account aanmaken met een wachtwoord en je e-mailadres verifiëren om deze uitnodiging te accepteren.',
          }),
          {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      await adminClient.from('profiles').upsert(
        {
          id: acceptingUserId,
          email: authEmail.toLowerCase().trim(),
          name: (authName || 'Parent').trim(),
          usage_mode: 'together',
          is_verified: true,
          onboarding_completed: true,
        },
        { onConflict: 'id' }
      );
    }

    // A. Update invitation status
    await adminClient
      .from('invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        to_parent_id: acceptingUserId,
      })
      .eq('id', invitation.id);

    // B. Create or Reactivate parent connection
    const { data: existingConnection } = await adminClient
      .from('parent_connections')
      .select('*')
      .or(
        `and(parent_1_id.eq.${invitation.from_parent_id},parent_2_id.eq.${acceptingUserId}),and(parent_1_id.eq.${acceptingUserId},parent_2_id.eq.${invitation.from_parent_id})`
      )
      .maybeSingle();

    let connection = existingConnection;
    if (existingConnection) {
      await adminClient
        .from('parent_connections')
        .update({
          status: 'active',
          invitation_id: invitation.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingConnection.id);
    } else {
      const { data: newConn, error: connErr } = await adminClient
        .from('parent_connections')
        .insert({
          parent_1_id: invitation.from_parent_id,
          parent_2_id: acceptingUserId,
          invitation_id: invitation.id,
          status: 'active',
        })
        .select()
        .single();

      if (!connErr) {
        connection = newConn;
      }
    }

    // C. Link selective children from invitation.child_ids into child_parents
    const linkedChildrenIds: string[] = [];
    const childIdSet = new Set<string>();

    const validInvitedIds = Array.isArray(invitation.child_ids)
      ? invitation.child_ids.filter(isUUID)
      : [];

    if (validInvitedIds.length > 0) {
      // Selective sharing: ONLY link the children specifically selected in the invitation
      validInvitedIds.forEach((id: string) => childIdSet.add(id));

      // Remove any unshared children created by from_parent_id from acceptingUserId
      const { data: unsharedKids } = await adminClient
        .from('children')
        .select('id')
        .eq('created_by', invitation.from_parent_id)
        .not('id', 'in', `(${validInvitedIds.join(',')})`);

      if (unsharedKids && unsharedKids.length > 0) {
        const unsharedIds = unsharedKids.map((k: any) => k.id);
        await adminClient
          .from('child_parents')
          .delete()
          .eq('parent_id', acceptingUserId)
          .in('child_id', unsharedIds);
      }
    } else {
      // Fallback only if no specific children were selected in the invitation
      const { data: allKids } = await adminClient
        .from('children')
        .select('id')
        .eq('created_by', invitation.from_parent_id);

      (allKids || []).forEach((k: any) => childIdSet.add(k.id));
    }

    for (const rawChildId of childIdSet) {
      if (isUUID(rawChildId)) {
        // Link accepting parent to this shared child
        await adminClient
          .from('child_parents')
          .upsert(
            {
              child_id: rawChildId,
              parent_id: acceptingUserId,
              role: 'parent',
            },
            { onConflict: 'child_id,parent_id' }
          );

        // Ensure sending parent is also linked
        await adminClient
          .from('child_parents')
          .upsert(
            {
              child_id: rawChildId,
              parent_id: invitation.from_parent_id,
              role: 'parent',
            },
            { onConflict: 'child_id,parent_id' }
          );

        linkedChildrenIds.push(rawChildId);
      }
    }

    // Ensure accepting parent retains access to any children they created themselves
    const { data: userBKids } = await adminClient
      .from('children')
      .select('id')
      .eq('created_by', acceptingUserId);

    for (const bKid of (userBKids || [])) {
      await adminClient
        .from('child_parents')
        .upsert(
          {
            child_id: bKid.id,
            parent_id: acceptingUserId,
            role: 'parent',
          },
          { onConflict: 'child_id,parent_id' }
        );
    }

    // D. Upgrade both parents to 'together' usage_mode & mark verified
    await adminClient
      .from('profiles')
      .update({
        usage_mode: 'together',
        is_verified: true,
        updated_at: new Date().toISOString(),
      })
      .in('id', [invitation.from_parent_id, acceptingUserId]);

    // Fetch accepting profile & sender profile
    const { data: acceptingProfile } = await adminClient
      .from('profiles')
      .select('id, name, email, usage_mode')
      .eq('id', acceptingUserId)
      .maybeSingle();

    const { data: fromProfile } = await adminClient
      .from('profiles')
      .select('id, name, email, usage_mode')
      .eq('id', invitation.from_parent_id)
      .maybeSingle();

    // Fetch linked children details
    let linkedChildren: any[] = [];
    if (linkedChildrenIds.length > 0) {
      const { data: kData } = await adminClient
        .from('children')
        .select('id, name, last_name, avatar_url, color_code, date_of_birth')
        .in('id', linkedChildrenIds);
      linkedChildren = kData || [];
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Invitation successfully accepted! You are now connected as co-parents.',
        connection,
        accepting_parent: acceptingProfile,
        co_parent: fromProfile,
        children: linkedChildren,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('[accept-invitation error]', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
