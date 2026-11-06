import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import nodemailer from 'npm:nodemailer@6.9.10';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const isUUID = (str: any) =>
  typeof str === 'string' &&
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
  const smtpHost = Deno.env.get('SMTP_HOST') || Deno.env.get('EMAIL_HOST');
  const smtpPort = Deno.env.get('SMTP_PORT') || Deno.env.get('EMAIL_PORT');
  const smtpUser = Deno.env.get('SMTP_USER') || Deno.env.get('EMAIL_USER');
  const rawPass = Deno.env.get('SMTP_PASS') || Deno.env.get('EMAIL_PASS');
  const smtpPass = rawPass ? rawPass.replace(/^["']|["']$/g, '').trim() : '';
  const isGmail = Boolean(smtpHost && smtpHost.toLowerCase().includes('gmail'));
  const isResendSmtp = Boolean(smtpHost && smtpHost.toLowerCase().includes('resend'));
  const authUser = isResendSmtp ? 'resend' : smtpUser;
  const smtpFrom =
    Deno.env.get('SMTP_FROM') ||
    Deno.env.get('EMAIL_FROM') ||
    (isResendSmtp
      ? 'Ouderschap & Co <onboarding@resend.dev>'
      : smtpUser && smtpUser.includes('@')
      ? `Ouderschap & Co <${smtpUser}>`
      : 'Ouderschap & Co <onboarding@ouderschap.app>');

  // 1. Try Nodemailer SMTP if credentials are provided
  if (smtpHost && smtpPass) {
    try {
      const transporter = isGmail
        ? nodemailer.createTransport({
            service: 'gmail',
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
      console.log(`[send-invitation] Email sent to ${to} via SMTP:`, info.messageId);
      return { success: true, messageId: info.messageId, provider: 'smtp' };
    } catch (err: any) {
      console.error('[send-invitation] Nodemailer SMTP failed:', err);
      // Fall through to Resend API
    }
  }

  // 2. Fallback to Resend API (auto-detect if RESEND_API_KEY is set OR if SMTP_PASS starts with 're_')
  const resendApiKey = Deno.env.get('RESEND_API_KEY') || (smtpPass?.startsWith('re_') ? smtpPass : null);
  if (resendApiKey) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: smtpFrom.includes('@resend.dev') ? smtpFrom : 'Ouderschap & Co <onboarding@resend.dev>',
          to: [to],
          subject,
          html,
        }),
      });
      if (res.ok) {
        const rJson = await res.json();
        console.log(`[send-invitation] Email sent to ${to} via Resend API:`, rJson);
        return { success: true, messageId: rJson.id, provider: 'resend' };
      } else {
        const errText = await res.text();
        console.error('[send-invitation] Resend API error response:', errText);
      }
    } catch (resendErr: any) {
      console.error('[send-invitation] Resend API send failed:', resendErr);
    }
  }

  console.warn(`[send-invitation] No email provider succeeded for ${to}.`);
  return { success: false, error: 'Email service unconfigured or failed to deliver.' };
}

// Generate branded invitation HTML email
function getInvitationEmailHtml({
  senderName,
  recipientEmail,
  inviteLink,
  childrenNames = [],
  isEn = false,
}: {
  senderName: string;
  recipientEmail: string;
  inviteLink: string;
  childrenNames: string[];
  isEn?: boolean;
}): string {
  const childrenHeader = isEn ? 'Shared Children:' : 'Gedeelde Kinderen:';
  const childrenText =
    childrenNames.length > 0
      ? `<div style="background: #f4f8f6; border-radius: 14px; padding: 18px 20px; margin: 24px 0; border: 1px solid #d4e4dc;">
          <p style="margin: 0 0 8px; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700; color: #2c4a3e;">
            ${childrenHeader}
          </p>
          <div style="font-size: 16px; font-weight: 700; color: #1e332b;">
            ${childrenNames.map((n) => `• ${n}`).join('<br>')}
          </div>
        </div>`
      : '';

  const texts = isEn
    ? {
      title: 'Co-parenting Invitation',
      headerSub: 'Co-parenting Invitation',
      greeting: `Hi! ${senderName} invited you`,
      intro: `<strong>${senderName}</strong> would like to connect with you on <strong>Ouderschap & Co</strong>. This allows you to smoothly coordinate parenting schedules, calendar events, and care arrangements together.`,
      cta: 'Accept Invitation',
      linkFallbackTitle: 'Button not working?',
      linkFallbackText: 'Copy and open the link below in your browser:',
      benefitsTitle: 'What does this mean for you?',
      benefit1: 'Always direct insight into the shared care calendar',
      benefit2: 'Fair and transparent expense splitting & settlements',
      benefit3: '<strong>Your personal logbook and private notes remain 100% private to you</strong>',
      expiryText: '⏰ This invitation link is <strong>valid for 30 days</strong>.',
      noAccountText: "Don't have an account? No problem, you can create one and connect in 1 minute via the link.",
      footerRights: 'All rights reserved.',
    }
    : {
      title: 'Uitnodiging Co-ouderschap',
      headerSub: 'Uitnodiging Co-ouderschap',
      greeting: `Hoi! ${senderName} heeft je uitgenodigd`,
      intro: `<strong>${senderName}</strong> wil graag samen met jou verbinden op <strong>Ouderschap & Co</strong>. Zo kunnen jullie overzichtelijk en rustig de zorgregeling, agenda en afspraken voor de kinderen afstemmen.`,
      cta: 'Uitnodiging Accepteren',
      linkFallbackTitle: 'Werkt de knop niet?',
      linkFallbackText: 'Kopieer en open de onderstaande link in je browser:',
      benefitsTitle: 'Wat betekent dit voor jou?',
      benefit1: 'Altijd direct inzicht in de gezamenlijke zorgkalender',
      benefit2: 'Eerlijke en transparante kostenverdeling & declaraties',
      benefit3: '<strong>Jouw persoonlijke logboek en privénotities blijven 100% uitsluitend voor jou</strong>',
      expiryText: '⏰ Deze uitnodigingslink is <strong>30 dagen geldig</strong>.',
      noAccountText: 'Heb je geen account? Geen probleem, via de link kun je in 1 minuut een account aanmaken en direct koppelen.',
      footerRights: 'Alle rechten voorbehouden.',
    };

  return `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${texts.title}</title>
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
    </head>
    <body style="margin: 0; padding: 32px 16px; background-color: #f7f5f2; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1f2937;">
      <div style="max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e7e2d9; box-shadow: 0 6px 24px -2px rgba(44, 74, 62, 0.08);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #2c4a3e 0%, #1e332b 100%); padding: 40px 32px; text-align: center;">
          <h1 style="margin: 0; font-family: 'Cormorant Garamond', Georgia, serif; font-size: 34px; font-weight: 600; color: #ffffff; letter-spacing: -0.5px;">
            Ouderschap & Co.
          </h1>
          <p style="margin: 8px 0 0; color: #d4e4dc; font-size: 13px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">
            ${texts.headerSub}
          </p>
        </div>

        <!-- Body -->
        <div style="padding: 36px 32px;">
          <h2 style="margin: 0 0 16px; font-size: 22px; font-weight: 700; color: #2c4a3e;">
            ${texts.greeting}
          </h2>
          <p style="margin: 0 0 18px; color: #4b5563; font-size: 15px; line-height: 1.6;">
            ${texts.intro}
          </p>

          ${childrenText}

          <!-- CTA Button -->
          <div style="text-align: center; margin: 34px 0 28px;">
            <a href="${inviteLink}" 
               style="display: inline-block; background-color: #2c4a3e; color: #ffffff; padding: 15px 36px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 15px; letter-spacing: 0.3px; box-shadow: 0 4px 14px rgba(44, 74, 62, 0.25);">
              ${texts.cta}
            </a>
          </div>

          <!-- Direct URL Fallback -->
          <div style="background: #faf8f5; border-radius: 12px; padding: 14px 16px; margin: 24px 0; border: 1px dashed #d5cfc5; font-size: 12px; color: #6b7280; line-height: 1.5;">
            <span style="font-weight: 600; color: #2c4a3e;">${texts.linkFallbackTitle}</span> ${texts.linkFallbackText}<br>
            <a href="${inviteLink}" style="color: #2c4a3e; font-weight: 600; word-break: break-all; text-decoration: underline;">
              ${inviteLink}
            </a>
          </div>

          <!-- Feature highlights -->
          <div style="margin: 28px 0; padding-top: 20px; border-top: 1px solid #f0eae1;">
            <p style="margin: 0 0 10px; font-size: 12px; font-weight: 700; color: #2c4a3e; text-transform: uppercase; letter-spacing: 1px;">
              ${texts.benefitsTitle}
            </p>
            <ul style="margin: 0; padding-left: 20px; color: #4b5563; font-size: 13px; line-height: 1.7;">
              <li>${texts.benefit1}</li>
              <li>${texts.benefit2}</li>
              <li>${texts.benefit3}</li>
            </ul>
          </div>

          <p style="margin: 24px 0 6px; color: #9ca3af; font-size: 12px; line-height: 1.5;">
            ${texts.expiryText}
          </p>
          <p style="margin: 0; color: #9ca3af; font-size: 12px; line-height: 1.5;">
            ${texts.noAccountText}
          </p>
        </div>

        <!-- Footer -->
        <div style="background-color: #faf8f5; border-top: 1px solid #e7e2d9; padding: 20px 32px; text-align: center; font-size: 12px; color: #9ca3af;">
          © ${new Date().getFullYear()} Ouderschap & Co. ${texts.footerRights}
        </div>
      </div>
    </body>
  </html>
  `;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const body = await req.json().catch(() => ({}));
    const { toEmail, to_email, childIds, child_ids, from_parent_id, redirectUrl, origin, lang, locale } = body;
    const isEn = Boolean((lang || locale || '').toLowerCase().startsWith('en'));
    const recipientEmail = (toEmail || to_email || '').toLowerCase().trim();

    if (!recipientEmail || !/.+@.+\..+/.test(recipientEmail)) {
      return new Response(JSON.stringify({ success: false, error: 'A valid email address is required.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Identify sender (either through Supabase JWT or explicit from_parent_id)
    let senderId: string | null = null;
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const supabaseUserClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: { user } } = await supabaseUserClient.auth.getUser();
      if (user?.id) senderId = user.id;
    }

    if (!senderId && from_parent_id && isUUID(from_parent_id)) {
      senderId = from_parent_id;
    }

    if (!senderId) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized: Valid sender parent ID required.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch sender profile details for personalized email
    const { data: senderProfile } = await adminClient
      .from('profiles')
      .select('id, name, email')
      .eq('id', senderId)
      .maybeSingle();

    const senderDisplayName =
      senderProfile?.name?.trim() || senderProfile?.email || (isEn ? 'Your co-parent' : 'Je co-ouder');

    // Filter valid UUID child IDs & fetch child names
    const rawKids = childIds || child_ids || [];
    const validChildIds = Array.isArray(rawKids) ? rawKids.filter(isUUID) : [];
    let childrenNames: string[] = [];

    if (validChildIds.length > 0) {
      const { data: kidsData } = await adminClient
        .from('children')
        .select('id, name, last_name')
        .in('id', validChildIds);

      if (kidsData && kidsData.length > 0) {
        childrenNames = kidsData.map((k) => `${k.name}${k.last_name ? ` ${k.last_name}` : ''}`);
      }
    }

    // Validate per-child parent limits: A single child can have at most 2 parents (Mom & Dad)
    if (validChildIds.length > 0) {
      for (const cid of validChildIds) {
        // Count how many parents are already linked to this child in child_parents
        const { count, error: countErr } = await adminClient
          .from('child_parents')
          .select('id', { count: 'exact', head: true })
          .eq('child_id', cid);

        if (!countErr && typeof count === 'number' && count >= 2) {
          const { data: childInfo } = await adminClient
            .from('children')
            .select('name')
            .eq('id', cid)
            .maybeSingle();
          const cName = childInfo?.name || (isEn ? 'A selected child' : 'Een geselecteerd kind');

          return new Response(
            JSON.stringify({
              success: false,
              error: isEn
                ? `${cName} already has 2 connected parents. Each child can have a maximum of two parents.`
                : `${cName} heeft al 2 verbonden ouders. Een kind kan maximaal twee verbonden ouders hebben.`,
            }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }
      }
    }

    // Check if an active invitation already exists for this email from this parent
    const { data: existing } = await adminClient
      .from('invitations')
      .select('*')
      .eq('from_parent_id', senderId)
      .eq('to_email', recipientEmail)
      .in('status', ['sent', 'pending'])
      .maybeSingle();

    const isExpired = Boolean(existing?.expires_at && new Date(existing.expires_at) <= new Date());

    if (!existing || isExpired) {
      token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '').slice(0, 8);
      const newExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      if (isExpired && existing) {
        const { data: updated, error: updErr } = await adminClient
          .from('invitations')
          .update({
            token,
            status: 'sent',
            child_ids: validChildIds,
            expires_at: newExpiry,
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (updErr) throw new Error(updErr.message);
        invitation = updated;
      } else {
        const { data: created, error: invErr } = await adminClient
          .from('invitations')
          .insert({
            from_parent_id: senderId,
            to_email: recipientEmail,
            child_ids: validChildIds,
            status: 'sent',
            token,
            expires_at: newExpiry,
          })
          .select()
          .single();

        if (invErr) {
          throw new Error(invErr.message);
        }
        invitation = created;
      }
    } else if (validChildIds.length > 0) {
      // Update child_ids on existing invitation if different
      await adminClient
        .from('invitations')
        .update({ child_ids: validChildIds })
        .eq('id', existing.id);
    }

    // Determine Universal Web & Deep Link URLs
    const appOrigin =
      redirectUrl ||
      origin ||
      req.headers.get('origin') ||
      Deno.env.get('PUBLIC_APP_URL') ||
      'http://localhost:5173';

    const baseUrl = appOrigin.replace(/\/+$/, '');
    const inviteLink = baseUrl.includes('/uitnodiging')
      ? `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}token=${token}`
      : `${baseUrl}/uitnodiging?token=${token}`;
    const deepLink = `ouderapp://invite?token=${token}`;

    // Send the email with the invite CTA button
    const emailSubject = isEn
      ? `${senderDisplayName} invited you to Ouderschap & Co`
      : `${senderDisplayName} heeft je uitgenodigd voor Ouderschap & Co`;
    const emailHtml = getInvitationEmailHtml({
      senderName: senderDisplayName,
      recipientEmail,
      inviteLink,
      childrenNames,
      isEn,
    });

    const emailResult = await sendEmail({
      to: recipientEmail,
      subject: emailSubject,
      html: emailHtml,
    });

    return new Response(
      JSON.stringify({
        success: true,
        invitation,
        token,
        inviteLink,
        deepLink,
        emailSent: Boolean(emailResult?.success),
        emailDelivery: emailResult,
        message: emailResult?.success
          ? `Uitnodiging succesvol verstuurd naar ${recipientEmail}.`
          : `Uitnodigingslink aangemaakt voor ${recipientEmail}.`,
      }),
      {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('[send-invitation error]', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
