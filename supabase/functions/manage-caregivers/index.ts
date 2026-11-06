import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6.9.10";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const isUUID = (str: any) =>
  typeof str === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);

// Helper: Send email via SMTP (Nodemailer) or fallback to Resend API
async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const smtpHost = Deno.env.get("SMTP_HOST") || Deno.env.get("EMAIL_HOST");
  const smtpPort = Deno.env.get("SMTP_PORT") || Deno.env.get("EMAIL_PORT");
  const smtpUser = Deno.env.get("SMTP_USER") || Deno.env.get("EMAIL_USER");
  const rawPass = Deno.env.get("SMTP_PASS") || Deno.env.get("EMAIL_PASS");
  const smtpPass = rawPass ? rawPass.replace(/^["']|["']$/g, "").trim() : "";
  const isResendSmtp = Boolean(smtpHost && smtpHost.toLowerCase().includes("resend"));
  const authUser = isResendSmtp ? "resend" : smtpUser;
  const smtpFrom =
    Deno.env.get("SMTP_FROM") ||
    Deno.env.get("EMAIL_FROM") ||
    (isResendSmtp
      ? "Ouderschap & Co <onboarding@resend.dev>"
      : smtpUser && smtpUser.includes("@")
      ? `Ouderschap & Co <${smtpUser}>`
      : "Ouderschap & Co <onboarding@resend.dev>");

  // 1. Try Nodemailer SMTP if credentials are provided
  if (smtpHost && smtpPass) {
    try {
      const transporter = smtpHost.includes("gmail")
        ? nodemailer.createTransport({
            service: "gmail",
            auth: {
              user: smtpUser,
              pass: smtpPass,
            },
          })
        : nodemailer.createTransport({
            host: smtpHost,
            port: Number(smtpPort) || (isResendSmtp ? 465 : 587),
            secure: Number(smtpPort) === 465 || isResendSmtp,
            auth: {
              user: authUser,
              pass: smtpPass,
            },
          });

      const info = await transporter.sendMail({
        from: smtpFrom,
        to,
        subject,
        html,
      });
      console.log(`[manage-caregivers] Email successfully sent to ${to} via SMTP:`, info.messageId);
      return { success: true, messageId: info.messageId, provider: "smtp" };
    } catch (err: any) {
      console.error("[manage-caregivers] Nodemailer SMTP failed:", err);
    }
  }

  // 2. Fallback to Resend API
  const resendApiKey = Deno.env.get("RESEND_API_KEY") || (smtpPass?.startsWith("re_") ? smtpPass : null);
  if (resendApiKey) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: smtpFrom.includes("@resend.dev") ? smtpFrom : "Ouderschap & Co <onboarding@resend.dev>",
          to: [to],
          subject,
          html,
        }),
      });

      if (res.ok) {
        const rJson = await res.json();
        console.log(`[manage-caregivers] Email successfully sent to ${to} via Resend API:`, rJson);
        return { success: true, messageId: rJson.id, provider: "resend" };
      } else {
        const errText = await res.text();
        console.error("[manage-caregivers] Resend API send failed response:", errText);
      }
    } catch (resendErr: any) {
      console.error("[manage-caregivers] Resend API send failed:", resendErr);
    }
  }

  console.warn(`[manage-caregivers] No email provider succeeded for ${to}.`);
  return { success: false, error: "Email provider unconfigured or failed to deliver." };
}

function getCaregiverEmailHtml({
  recipientName,
  senderName,
  inviteLink,
  isEn = false,
}: {
  recipientName: string;
  senderName: string;
  inviteLink: string;
  isEn?: boolean;
}): string {
  const texts = isEn
    ? {
        title: "Caregiver Invitation — Ouderschap & Co.",
        sub: "Caregiver & Family Circle",
        greeting: `Hi ${recipientName}`,
        intro: `You have been invited by <strong>${senderName}</strong> as a caregiver/family member on <strong>Ouderschap & Co.</strong>`,
        desc: "You can view the calm pickup schedule, confirm handovers, and stay informed on important child moments.",
        privacy: "Note: You only see the schedule and emergency info shared with you. Private parent messages and financial agreements remain strictly confidential.",
        cta: "Open Caregiver View",
        fallback: "If the button above does not work, copy and open this link:",
        rights: "All rights reserved.",
      }
    : {
        title: "Uitnodiging Verzorger — Ouderschap & Co.",
        sub: "Verzorger & Familieomgeving",
        greeting: `Beste ${recipientName}`,
        intro: `Je bent door <strong>${senderName}</strong> uitgenodigd als betrokkene / verzorger op <strong>Ouderschap & Co.</strong>`,
        desc: "Hier kun je rustig de actuele planning bekijken, ophaalmomenten bevestigen en op de hoogte blijven van belangrijke momenten rondom de kinderen.",
        privacy: "Goed om te weten: Je ziet uitsluitend de voor jou ingestelde planning en noodinformatie. Privégesprekken en financiën tussen ouders blijven altijd verborgen.",
        cta: "Open Verzorger Omgeving",
        fallback: "Werkt de knop niet? Kopieer en open dan onderstaande link in je browser:",
        rights: "Alle rechten voorbehouden.",
      };

  return `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${texts.title}</title>
    </head>
    <body style="margin: 0; padding: 32px 16px; background-color: #f7f5f2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1f2937;">
      <div style="max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e7e2d9; box-shadow: 0 6px 24px -2px rgba(44, 74, 62, 0.08);">
        <div style="background: linear-gradient(135deg, #2c4a3e 0%, #1e332b 100%); padding: 36px 32px; text-align: center;">
          <h1 style="margin: 0; font-size: 30px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">
            Ouderschap & Co.
          </h1>
          <p style="margin: 8px 0 0; color: #d4e4dc; font-size: 13px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">
            ${texts.sub}
          </p>
        </div>
        <div style="padding: 32px 28px;">
          <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 700; color: #2c4a3e;">
            ${texts.greeting}
          </h2>
          <p style="font-size: 15px; line-height: 1.6; color: #374151; margin-bottom: 16px;">
            ${texts.intro}
          </p>
          <p style="font-size: 14px; line-height: 1.6; color: #4b5563; margin-bottom: 24px;">
            ${texts.desc}
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${inviteLink}" style="display: inline-block; background-color: #2c4a3e; color: #ffffff; font-size: 15px; font-weight: 700; padding: 14px 32px; border-radius: 12px; text-decoration: none; box-shadow: 0 4px 12px rgba(44, 74, 62, 0.2);">
              ${texts.cta}
            </a>
          </div>
          <div style="background-color: #f4f8f6; border: 1px solid #d4e4dc; border-radius: 12px; padding: 14px 16px; font-size: 12px; line-height: 1.5; color: #2c4a3e; margin: 24px 0;">
            ${texts.privacy}
          </div>
          <p style="font-size: 12px; color: #9ca3af; margin-top: 24px; word-break: break-all;">
            ${texts.fallback}<br>
            <a href="${inviteLink}" style="color: #2c4a3e; text-decoration: underline;">${inviteLink}</a>
          </p>
        </div>
        <div style="background-color: #faf8f5; border-top: 1px solid #e7e2d9; padding: 16px 28px; text-align: center; font-size: 12px; color: #9ca3af;">
          © ${new Date().getFullYear()} Ouderschap & Co. ${texts.rights}
        </div>
      </div>
    </body>
  </html>
  `;
}

async function loadParentsAndCoParents(adminClient: any, creatorId: string, childIds: string[]) {
  if (!creatorId) return { creator: null, co_parents: [] };

  const { data: creator } = await adminClient
    .from("profiles")
    .select("id, name, email")
    .eq("id", creatorId)
    .maybeSingle();

  const creatorObj = {
    id: creator?.id || creatorId,
    name: (creator?.name && creator.name.trim() !== "Co-ouder" && creator.name.trim() !== "Co-parent")
      ? creator.name.trim()
      : "Mona",
    email: creator?.email || "",
    phone: "",
  };

  const coParentsList: any[] = [];
  try {
    const { data: acceptedInvs } = await adminClient
      .from("invitations")
      .select("id, from_parent_id, to_parent_id, child_ids")
      .or(`from_parent_id.eq.${creatorId},to_parent_id.eq.${creatorId}`)
      .eq("status", "accepted");

    const otherParentIds = new Set<string>();
    const childIdsByCoParent = new Map<string, Set<string>>();

    if (Array.isArray(acceptedInvs)) {
      for (const inv of acceptedInvs) {
        const otherId = inv.from_parent_id === creatorId ? inv.to_parent_id : inv.from_parent_id;
        if (otherId && isUUID(otherId)) {
          const invChildIds = Array.isArray(inv.child_ids) ? inv.child_ids.filter(isUUID) : [];

          // If caregiver has specific childIds, only include co-parent if their invitation covers at least one of these children
          if (childIds.length > 0 && invChildIds.length > 0) {
            const hasOverlap = invChildIds.some((cid: string) => childIds.includes(cid));
            if (!hasOverlap) {
              continue;
            }
          }

          otherParentIds.add(otherId);
          if (!childIdsByCoParent.has(otherId)) {
            childIdsByCoParent.set(otherId, new Set<string>());
          }
          if (invChildIds.length > 0) {
            invChildIds.forEach((cid: string) => {
              if (childIds.length === 0 || childIds.includes(cid)) {
                childIdsByCoParent.get(otherId)!.add(cid);
              }
            });
          }
        }
      }
    }

    if (childIds.length > 0) {
      const { data: cpRows } = await adminClient
        .from("child_parents")
        .select("child_id, parent_id")
        .in("child_id", childIds)
        .neq("parent_id", creatorId);

      if (Array.isArray(cpRows)) {
        for (const cp of cpRows) {
          if (cp.parent_id && isUUID(cp.parent_id)) {
            otherParentIds.add(cp.parent_id);
            if (!childIdsByCoParent.has(cp.parent_id)) {
              childIdsByCoParent.set(cp.parent_id, new Set<string>());
            }
            if (cp.child_id) {
              childIdsByCoParent.get(cp.parent_id)!.add(cp.child_id);
            }
          }
        }
      }
    }

    if (otherParentIds.size > 0) {
      const { data: profiles } = await adminClient
        .from("profiles")
        .select("id, name, email, avatar_url")
        .in("id", Array.from(otherParentIds));

      if (Array.isArray(profiles)) {
        for (const p of profiles) {
          const matchedChildIds = Array.from(childIdsByCoParent.get(p.id) || []);
          // If caregiver is restricted to specific childIds, only include co-parent if matchedChildIds overlap
          if (childIds.length > 0 && matchedChildIds.length > 0) {
            const hasOverlap = matchedChildIds.some((cid: string) => childIds.includes(cid));
            if (!hasOverlap) continue;
          }

          coParentsList.push({
            id: p.id,
            name: (p.name && p.name.trim() !== "Co-ouder" && p.name.trim() !== "Co-parent")
              ? p.name.trim()
              : "Co-parent",
            email: p.email || "",
            phone: "",
            avatar_url: p.avatar_url || null,
            child_ids: matchedChildIds,
            role: "co_parent",
          });
        }
      }
    }
  } catch (err) {
    console.warn("[manage-caregivers] loadParentsAndCoParents warning:", err);
  }

  return { creator: creatorObj, co_parents: coParentsList };
}

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

    // 1. LIST CAREGIVERS FOR PARENT (Includes caregivers created by parent, or connected to parent's children/co-parents)
    if (action === "list") {
      const parent_id = body.parent_id || body.user_id;
      if (!parent_id) {
        return new Response(JSON.stringify({ success: false, error: "parent_id is required." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Collect all child IDs and co-parent IDs for parent_id
      const childIdsSet = new Set<string>();
      const coParentIdsSet = new Set<string>();

      try {
        // Direct child_parents check
        const { data: cpRows } = await adminClient
          .from("child_parents")
          .select("child_id, parent_id")
          .eq("parent_id", parent_id);

        if (Array.isArray(cpRows)) {
          cpRows.forEach((r: any) => {
            if (r.child_id && isUUID(r.child_id)) childIdsSet.add(r.child_id);
          });
        }

        // Direct children created by parent
        const { data: myCreatedKids } = await adminClient
          .from("children")
          .select("id")
          .eq("created_by", parent_id);

        if (Array.isArray(myCreatedKids)) {
          myCreatedKids.forEach((k: any) => {
            if (k.id && isUUID(k.id)) childIdsSet.add(k.id);
          });
        }

        // Accepted invitations check
        const { data: acceptedInvs } = await adminClient
          .from("invitations")
          .select("from_parent_id, to_parent_id, child_ids")
          .or(`from_parent_id.eq.${parent_id},to_parent_id.eq.${parent_id}`)
          .eq("status", "accepted");

        if (Array.isArray(acceptedInvs)) {
          acceptedInvs.forEach((inv: any) => {
            const otherId = inv.from_parent_id === parent_id ? inv.to_parent_id : inv.from_parent_id;
            if (otherId && isUUID(otherId)) coParentIdsSet.add(otherId);
            if (Array.isArray(inv.child_ids)) {
              inv.child_ids.forEach((cid: string) => {
                if (isUUID(cid)) childIdsSet.add(cid);
              });
            }
          });
        }

        // Find co-parents linked to these children
        const childIdsArray = Array.from(childIdsSet);
        if (childIdsArray.length > 0) {
          const { data: otherParents } = await adminClient
            .from("child_parents")
            .select("parent_id")
            .in("child_id", childIdsArray)
            .neq("parent_id", parent_id);

          if (Array.isArray(otherParents)) {
            otherParents.forEach((p: any) => {
              if (p.parent_id && isUUID(p.parent_id)) coParentIdsSet.add(p.parent_id);
            });
          }

          const { data: createdKidsOtherParents } = await adminClient
            .from("children")
            .select("created_by")
            .in("id", childIdsArray)
            .neq("created_by", parent_id);

          if (Array.isArray(createdKidsOtherParents)) {
            createdKidsOtherParents.forEach((k: any) => {
              if (k.created_by && isUUID(k.created_by)) coParentIdsSet.add(k.created_by);
            });
          }
        }
      } catch (linkErr) {
        console.warn("[manage-caregivers] link resolve notice:", linkErr);
      }

      // Collect caregiver IDs that have permissions on parent's children
      const caregiverIdsSet = new Set<string>();
      const childIdsArray = Array.from(childIdsSet);
      if (childIdsArray.length > 0) {
        try {
          const { data: permRows } = await adminClient
            .from("caregiver_permissions")
            .select("caregiver_id")
            .in("child_id", childIdsArray);

          if (Array.isArray(permRows)) {
            permRows.forEach((pr: any) => {
              if (pr.caregiver_id && isUUID(pr.caregiver_id)) caregiverIdsSet.add(pr.caregiver_id);
            });
          }
        } catch (permErr) {
          console.warn("[manage-caregivers] permissions lookup notice:", permErr);
        }
      }

      // Build query to find all relevant family caregivers
      const allowedCreatorIds = [parent_id, ...Array.from(coParentIdsSet)];
      const explicitCaregiverIds = Array.from(caregiverIdsSet);

      let query = adminClient
        .from("family_caregivers")
        .select(`
          id,
          created_by,
          name,
          role,
          phone,
          email,
          is_emergency_contact,
          invite_token,
          status,
          connected_user_id,
          valid_until,
          created_at,
          caregiver_permissions (
            id,
            child_id,
            section,
            permission_level
          )
        `);

      if (explicitCaregiverIds.length > 0) {
        query = query.or(`created_by.in.(${allowedCreatorIds.join(",")}),id.in.(${explicitCaregiverIds.join(",")})`);
      } else {
        query = query.in("created_by", allowedCreatorIds);
      }

      const { data: caregivers, error } = await query.order("created_at", { ascending: false });

      if (error) throw new Error(error.message);

      // Attach creator profile info (name, email)
      const rawList = caregivers || [];
      const creatorIdsToFetch = Array.from(new Set(rawList.map((c: any) => c.created_by).filter(Boolean)));
      let creatorsMap = new Map<string, { id: string; name: string; email: string }>();

      if (creatorIdsToFetch.length > 0) {
        try {
          const { data: profs } = await adminClient
            .from("profiles")
            .select("id, name, email")
            .in("id", creatorIdsToFetch);

          if (Array.isArray(profs)) {
            profs.forEach((p: any) => {
              creatorsMap.set(p.id, {
                id: p.id,
                name: p.name?.trim() || "Ouder",
                email: p.email || "",
              });
            });
          }
        } catch (profErr) {
          console.warn("[manage-caregivers] fetch creator profiles notice:", profErr);
        }
      }

      const enrichedCaregivers = rawList.map((cg: any) => ({
        ...cg,
        creator: creatorsMap.get(cg.created_by) || null,
      }));

      return new Response(JSON.stringify({ success: true, caregivers: enrichedCaregivers }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. CREATE CAREGIVER
    if (action === "create") {
      const {
        parent_id,
        name,
        role = "Caregiver",
        phone,
        email,
        is_emergency_contact = false,
        status = "contact_only",
        valid_until = null,
        permissions = {},
      } = body;

      if (!name || !name.trim()) {
        return new Response(JSON.stringify({ success: false, error: "Name is required." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: caregiver, error: insertErr } = await adminClient
        .from("family_caregivers")
        .insert({
          created_by: parent_id || null,
          name: name.trim(),
          role,
          phone: phone ? phone.trim() : null,
          email: email ? email.trim() : null,
          is_emergency_contact: Boolean(is_emergency_contact),
          status,
          valid_until,
        })
        .select()
        .single();

      if (insertErr) throw new Error(insertErr.message);

      // Insert permissions if provided
      if (permissions && typeof permissions === "object" && caregiver?.id) {
        const permissionRows: any[] = [];
        Object.entries(permissions).forEach(([childId, sections]: [string, any]) => {
          if (sections && typeof sections === "object") {
            Object.entries(sections).forEach(([section, level]) => {
              if (level && level !== "none" && level !== "geen") {
                permissionRows.push({
                  caregiver_id: caregiver.id,
                  child_id: childId,
                  section,
                  permission_level: level,
                });
              }
            });
          }
        });

        if (permissionRows.length > 0) {
          await adminClient.from("caregiver_permissions").insert(permissionRows);
        }
      }

      // Re-fetch complete caregiver with permissions
      const { data: fullCaregiver } = await adminClient
        .from("family_caregivers")
        .select(`
          id,
          created_by,
          name,
          role,
          phone,
          email,
          is_emergency_contact,
          invite_token,
          status,
          connected_user_id,
          valid_until,
          created_at,
          caregiver_permissions (
            id,
            child_id,
            section,
            permission_level
          )
        `)
        .eq("id", caregiver.id)
        .single();

      // Auto-send email if status === 'invited' and email is provided
      if (status === "invited" && email) {
        try {
          const recipientEmail = email.trim().toLowerCase();
          const isEn = Boolean((body.lang || "").toLowerCase().startsWith("en"));
          const appOrigin = body.origin || "http://localhost:5173";
          const actualToken = fullCaregiver?.invite_token || caregiver.invite_token || caregiver.id;
          const link = `${appOrigin}/uitnodiging?t=${encodeURIComponent(actualToken || "")}`;

          const emailSubject = isEn
            ? `Caregiver Invitation — Ouderschap & Co.`
            : `Uitnodiging voor de verzorger-omgeving — Ouderschap & Co.`;

          const emailHtml = getCaregiverEmailHtml({
            recipientName: name.trim(),
            senderName: body.parent_name || (isEn ? "Your family" : "Je familie"),
            inviteLink: link,
            isEn,
          });

          await sendEmail({
            to: recipientEmail,
            subject: emailSubject,
            html: emailHtml,
          });
        } catch (mailErr) {
          console.warn("[manage-caregivers] auto send email on create notice:", mailErr);
        }
      }

      return new Response(JSON.stringify({ success: true, caregiver: fullCaregiver || caregiver }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. UPDATE CAREGIVER
    if (action === "update") {
      const {
        caregiver_id,
        name,
        role,
        phone,
        email,
        is_emergency_contact,
        status,
        valid_until,
        permissions,
      } = body;

      if (!caregiver_id) {
        return new Response(JSON.stringify({ success: false, error: "caregiver_id is required." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const updateData: any = { updated_at: new Date().toISOString() };
      if (name !== undefined) updateData.name = name.trim();
      if (role !== undefined) updateData.role = role;
      if (phone !== undefined) updateData.phone = phone ? phone.trim() : null;
      if (email !== undefined) updateData.email = email ? email.trim() : null;
      if (is_emergency_contact !== undefined) updateData.is_emergency_contact = Boolean(is_emergency_contact);
      if (status !== undefined) updateData.status = status;
      if (valid_until !== undefined) updateData.valid_until = valid_until;

      const { error: updateErr } = await adminClient
        .from("family_caregivers")
        .update(updateData)
        .eq("id", caregiver_id);

      if (updateErr) throw new Error(updateErr.message);

      // Replace permissions if passed
      if (permissions && typeof permissions === "object") {
        await adminClient.from("caregiver_permissions").delete().eq("caregiver_id", caregiver_id);

        const permissionRows: any[] = [];
        Object.entries(permissions).forEach(([childId, sections]: [string, any]) => {
          if (sections && typeof sections === "object") {
            Object.entries(sections).forEach(([section, level]) => {
              if (level && level !== "none" && level !== "geen") {
                permissionRows.push({
                  caregiver_id: caregiver_id,
                  child_id: childId,
                  section,
                  permission_level: level,
                });
              }
            });
          }
        });

        if (permissionRows.length > 0) {
          await adminClient.from("caregiver_permissions").insert(permissionRows);
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. DELETE CAREGIVER
    if (action === "delete") {
      const { caregiver_id } = body;
      if (!caregiver_id) {
        return new Response(JSON.stringify({ success: false, error: "caregiver_id is required." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: delErr } = await adminClient
        .from("family_caregivers")
        .delete()
        .eq("id", caregiver_id);

      if (delErr) throw new Error(delErr.message);

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5A. GET CAREGIVER FOR LOGGED IN USER
    if (action === "get-for-user" || action === "get-by-user") {
      const { user_id, email } = body;
      if (!user_id && !email) {
        return new Response(JSON.stringify({ success: false, error: "user_id or email is required." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let caregiverQuery = adminClient
        .from("family_caregivers")
        .select(`
          id,
          created_by,
          name,
          role,
          phone,
          email,
          is_emergency_contact,
          invite_token,
          status,
          connected_user_id,
          valid_until,
          caregiver_permissions (
            id,
            child_id,
            section,
            permission_level
          )
        `);

      const validUserId = isUUID(user_id) ? user_id : null;
      const cleanEmail = typeof email === "string" && email.trim() ? email.trim() : null;

      if (validUserId && cleanEmail) {
        caregiverQuery = caregiverQuery.or(`connected_user_id.eq.${validUserId},email.ilike.${cleanEmail}`);
      } else if (validUserId) {
        caregiverQuery = caregiverQuery.eq("connected_user_id", validUserId);
      } else if (cleanEmail) {
        caregiverQuery = caregiverQuery.ilike("email", cleanEmail);
      } else {
        return new Response(JSON.stringify({ success: true, caregiver: null }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: rows, error } = await caregiverQuery.limit(1);
      if (error) {
        console.warn("[manage-caregivers] get-for-user query error:", error);
        return new Response(JSON.stringify({ success: true, caregiver: null }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const caregiver = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;

      let childrenDetails: any[] = [];
      let childIds: string[] = [];
      if (caregiver && Array.isArray(caregiver.caregiver_permissions) && caregiver.caregiver_permissions.length > 0) {
        childIds = [...new Set(caregiver.caregiver_permissions.map((cp: any) => cp.child_id))].filter(isUUID);
        if (childIds.length > 0) {
          const { data: kids } = await adminClient
            .from("children")
            .select("id, name, last_name, date_of_birth, avatar_url, school, daycare, doctor, medical_notes, allergies, dietary_notes, color_code, care_schedule")
            .in("id", childIds);
          childrenDetails = kids || [];
        }
      }

      if (caregiver?.created_by) {
        const { creator, co_parents } = await loadParentsAndCoParents(adminClient, caregiver.created_by, childIds);
        caregiver.creator = creator;
        caregiver.co_parents = co_parents;
      }

      return new Response(JSON.stringify({
        success: true,
        caregiver: caregiver || null,
        children: childrenDetails,
        co_parents: caregiver?.co_parents || [],
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5B. GET BY TOKEN (For Caregiver View / Invitation Acceptance)
    if (action === "get-by-token") {
      const { token } = body;
      if (!token) {
        return new Response(JSON.stringify({ success: false, error: "token is required." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let caregiverQuery = adminClient
        .from("family_caregivers")
        .select(`
          id,
          created_by,
          name,
          role,
          phone,
          email,
          is_emergency_contact,
          invite_token,
          status,
          connected_user_id,
          valid_until,
          caregiver_permissions (
            id,
            child_id,
            section,
            permission_level
          )
        `);

      if (isUUID(token)) {
        caregiverQuery = caregiverQuery.or(`invite_token.eq.${token},id.eq.${token}`);
      } else {
        caregiverQuery = caregiverQuery.eq("invite_token", token);
      }

      const { data: caregiver, error } = await caregiverQuery.maybeSingle();

      if (error) throw new Error(error.message);

      let tokenChildrenDetails: any[] = [];
      let tokenChildIds: string[] = [];
      if (caregiver && Array.isArray(caregiver.caregiver_permissions) && caregiver.caregiver_permissions.length > 0) {
        tokenChildIds = [...new Set(caregiver.caregiver_permissions.map((cp: any) => cp.child_id))].filter(isUUID);
        if (tokenChildIds.length > 0) {
          const { data: kids } = await adminClient
            .from("children")
            .select("id, name, last_name, date_of_birth, avatar_url, school, daycare, doctor, medical_notes, allergies, dietary_notes, color_code, care_schedule")
            .in("id", tokenChildIds);
          tokenChildrenDetails = kids || [];
        }
      }

      if (caregiver?.created_by) {
        const { creator, co_parents } = await loadParentsAndCoParents(adminClient, caregiver.created_by, tokenChildIds);
        caregiver.creator = creator;
        caregiver.co_parents = co_parents;
      }

      return new Response(JSON.stringify({
        success: true,
        caregiver: caregiver || null,
        children: tokenChildrenDetails,
        co_parents: caregiver?.co_parents || [],
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 6. ACCEPT INVITATION
    if (action === "accept") {
      const { token, user_id } = body;
      if (!token) {
        return new Response(JSON.stringify({ success: false, error: "token is required." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const newToken = crypto.randomUUID();
      let updateQuery = adminClient
        .from("family_caregivers")
        .update({
          status: "active",
          connected_user_id: user_id || null,
          invite_token: newToken,
          updated_at: new Date().toISOString(),
        });

      if (isUUID(token)) {
        updateQuery = updateQuery.or(`invite_token.eq.${token},id.eq.${token}`);
      } else {
        updateQuery = updateQuery.eq("invite_token", token);
      }

      const { data: updated, error } = await updateQuery.select().maybeSingle();

      if (error) {
        console.warn("[manage-caregivers] accept update error:", error);
      }

      if (updated) {
        return new Response(JSON.stringify({ success: true, caregiver: updated }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // If no row updated, check if already active
      let checkQuery = adminClient.from("family_caregivers").select("*");
      if (isUUID(token)) {
        checkQuery = checkQuery.or(`invite_token.eq.${token},id.eq.${token}`);
      } else {
        checkQuery = checkQuery.eq("invite_token", token);
      }
      const { data: existing } = await checkQuery.maybeSingle();
      if (existing) {
        return new Response(JSON.stringify({ success: true, caregiver: existing, already_accepted: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: false, error: "Caregiver invitation not found." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 7. SEND INVITE EMAIL
    if (action === "send-invite-email") {
      const { caregiver_id, email, invite_token, origin, lang, parent_name } = body;
      const recipientEmail = (email || "").trim().toLowerCase();

      if (!recipientEmail || !/.+@.+\..+/.test(recipientEmail)) {
        return new Response(JSON.stringify({ success: false, error: "A valid email is required." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let caregiverName = "Familielid / Verzorger";
      let actualToken = invite_token;

      // Update caregiver email and promote status to 'invited'
      if (caregiver_id) {
        const { data: cg } = await adminClient
          .from("family_caregivers")
          .select("name, invite_token")
          .eq("id", caregiver_id)
          .maybeSingle();

        if (cg) {
          if (cg.name) caregiverName = cg.name;
          if (cg.invite_token) actualToken = cg.invite_token;
        }

        await adminClient
          .from("family_caregivers")
          .update({
            email: recipientEmail,
            status: "invited",
            updated_at: new Date().toISOString(),
          })
          .eq("id", caregiver_id);
      }

      const isEn = Boolean((lang || "").toLowerCase().startsWith("en"));
      const appOrigin = origin || "http://localhost:5173";
      const link = `${appOrigin}/uitnodiging?t=${encodeURIComponent(actualToken || "")}`;

      const emailSubject = isEn
        ? `Caregiver Invitation — Ouderschap & Co.`
        : `Uitnodiging voor de verzorger-omgeving — Ouderschap & Co.`;

      const emailHtml = getCaregiverEmailHtml({
        recipientName: caregiverName,
        senderName: parent_name || (isEn ? "Your family" : "Je familie"),
        inviteLink: link,
        isEn,
      });

      // Dispatch via SMTP (or Resend API fallback)
      const sendResult = await sendEmail({
        to: recipientEmail,
        subject: emailSubject,
        html: emailHtml,
      });

      console.log(`[manage-caregivers] Send email result for ${recipientEmail}:`, sendResult);

      return new Response(JSON.stringify({
        success: true,
        email: recipientEmail,
        link,
        delivered: sendResult?.success || false,
        provider: sendResult?.provider || null,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 8. UPDATE CAREGIVER HANDOVER RESPONSE (Accept / Decline)
    if (action === "set_handover_status" || action === "update_handover_response") {
      const { caregiver_id, child_id, response } = body;
      let childIds: string[] = [];

      if (child_id && isUUID(child_id)) {
        childIds = [child_id];
      } else if (caregiver_id && isUUID(caregiver_id)) {
        const { data: perms } = await adminClient
          .from("caregiver_permissions")
          .select("child_id")
          .eq("caregiver_id", caregiver_id);
        childIds = (perms || []).map((p: any) => p.child_id).filter(isUUID);
      }

      if (childIds.length > 0) {
        const { data: kids } = await adminClient
          .from("children")
          .select("id, care_schedule")
          .in("id", childIds);

        if (Array.isArray(kids)) {
          for (const k of kids) {
            try {
              const sched = typeof k.care_schedule === "string" ? JSON.parse(k.care_schedule) : (k.care_schedule || {});
              sched.handoverCaregiverResponse = response;
              sched.handoverCaregiverResponseAt = new Date().toISOString();
              await adminClient
                .from("children")
                .update({
                  care_schedule: JSON.stringify(sched),
                  updated_at: new Date().toISOString(),
                })
                .eq("id", k.id);
            } catch (parseErr) {
              console.error("Error updating child care_schedule:", parseErr);
            }
          }
        }
      }

      return new Response(JSON.stringify({
        success: true,
        response,
        childIds,
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
