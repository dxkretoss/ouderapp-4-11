import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import nodemailer from 'npm:nodemailer@6.9.10';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function base64UrlEncode(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function createJWT(payload: Record<string, any>, secret: string): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const data = `${encodedHeader}.${encodedPayload}`;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  const signatureBytes = new Uint8Array(signature);
  let binarySignature = "";
  for (let i = 0; i < signatureBytes.byteLength; i++) {
    binarySignature += String.fromCharCode(signatureBytes[i]);
  }
  const signatureBase64 = btoa(binarySignature).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  return `${data}.${signatureBase64}`;
}

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
  const isResendSmtp = Boolean(smtpHost && smtpHost.toLowerCase().includes('resend'));
  const authUser = isResendSmtp ? 'resend' : smtpUser;
  const smtpFrom =
    Deno.env.get('SMTP_FROM') ||
    Deno.env.get('EMAIL_FROM') ||
    (isResendSmtp
      ? 'Ouderschap & Co <onboarding@resend.dev>'
      : smtpUser && smtpUser.includes('@')
      ? `Ouderschap & Co <${smtpUser}>`
      : 'Ouderschap & Co <onboarding@resend.dev>');

  // 1. SMTP transport via Nodemailer
  if (smtpHost && smtpPass) {
    try {
      const transporter = smtpHost.includes('gmail')
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

      await transporter.sendMail({
        from: smtpFrom,
        to,
        subject,
        html,
      });
      console.log(`[auth-signup] Verification email sent to ${to} via SMTP.`);
      return true;
    } catch (err) {
      console.error('[auth-signup] Nodemailer SMTP failed:', err);
    }
  }

  // 2. Resend API fallback
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
        console.log(`[auth-signup] Verification email sent to ${to} via Resend.`);
        return true;
      } else {
        const errText = await res.text();
        console.error('[auth-signup] Resend error response:', errText);
      }
    } catch (sendErr) {
      console.error('[auth-signup] Resend send failed:', sendErr);
    }
  }

  return false;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { email, password, name, usage_mode, lang, locale } = body;
    const isEn = Boolean((lang || locale || '').toLowerCase().startsWith('en'));

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'Email and password are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Password requirements: min 8 chars, 1 uppercase, 1 special character
    const isMinLength = password.length >= 8;
    const hasUpper = /[A-Z]/.test(password);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password);

    if (!isMinLength || !hasUpper || !hasSpecial) {
      return new Response(
        JSON.stringify({
          error: isEn
            ? 'Password must be at least 8 characters and include at least 1 uppercase letter and 1 special character.'
            : 'Wachtwoord moet minimaal 8 tekens bevatten, met minimaal 1 hoofdletter en 1 speciaal teken.'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cleanEmail = email.toLowerCase().trim();
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY')!;

    const client = createClient(supabaseUrl, supabaseServiceKey);

    // Call custom signup RPC
    const { data, error } = await client.rpc('custom_signup', {
      p_email: cleanEmail,
      p_password: password,
      p_name: name || 'Parent',
      p_usage_mode: usage_mode || 'together'
    });

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!data?.success) {
      return new Response(
        JSON.stringify({ error: data?.error || 'Registration failed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send verification email with 6-digit OTP code (English or Dutch)
    if (data.verification_code) {
      const texts = isEn
        ? {
            pageTitle: 'Verification Code',
            headerSubtitle: 'Account Verification',
            welcomeTitle: 'Welcome to Ouderschap & Co.',
            bodyText: 'Thank you for registering! Use the 6-digit verification code below to activate your account:',
            codeLabel: 'Your Verification Code',
            validityText: '⏰ This code is valid for <strong>24 hours</strong>.',
            securityNote: 'Never share this code with anyone.',
            footerRights: 'All rights reserved.',
            subject: 'Your verification code for Ouderschap & Co',
          }
        : {
            pageTitle: 'Verificatiecode',
            headerSubtitle: 'Account Verificatie',
            welcomeTitle: 'Welkom bij Ouderschap & Co.',
            bodyText: 'Bedankt voor je registratie! Gebruik onderstaande 6-cijferige verificatiecode om je account te activeren:',
            codeLabel: 'Jouw Verificatiecode',
            validityText: '⏰ Deze code is <strong>24 uur geldig</strong>.',
            securityNote: 'Deel deze code nooit met anderen.',
            footerRights: 'Alle rechten voorbehouden.',
            subject: 'Je verificatiecode voor Ouderschap & Co',
          };

      const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${texts.pageTitle}</title>
          <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
        </head>
        <body style="margin: 0; padding: 32px 16px; background-color: #f7f5f2; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1f2937;">
          <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 18px; overflow: hidden; border: 1px solid #e7e2d9; box-shadow: 0 4px 20px -2px rgba(44, 74, 62, 0.06);">
            <div style="background: linear-gradient(135deg, #2c4a3e 0%, #1e332b 100%); padding: 36px 32px; text-align: center;">
              <h1 style="margin: 0; font-family: 'Cormorant Garamond', Georgia, serif; font-size: 32px; font-weight: 600; color: #ffffff;">
                Ouderschap & Co.
              </h1>
              <p style="margin: 8px 0 0; color: #d4e4dc; font-size: 13px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">
                ${texts.headerSubtitle}
              </p>
            </div>
            <div style="padding: 36px 32px;">
              <h2 style="margin: 0 0 14px; font-size: 20px; font-weight: 700; color: #2c4a3e;">
                ${texts.welcomeTitle}
              </h2>
              <p style="margin: 0 0 24px; color: #4b5563; font-size: 15px; line-height: 1.6;">
                ${texts.bodyText}
              </p>
              <div style="text-align: center; margin: 30px 0; padding: 22px 16px; background: #f4f8f6; border-radius: 14px; border: 1px dashed #2c4a3e;">
                <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #2c4a3e; font-weight: 700; margin-bottom: 8px;">
                  ${texts.codeLabel}
                </div>
                <div style="font-family: monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #2c4a3e; padding-left: 8px;">
                  ${data.verification_code}
                </div>
              </div>
              <p style="margin: 0 0 10px; color: #6b7280; font-size: 13px;">
                ${texts.validityText}
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                ${texts.securityNote}
              </p>
            </div>
            <div style="background-color: #faf8f5; border-top: 1px solid #e7e2d9; padding: 20px 32px; text-align: center; font-size: 12px; color: #9ca3af;">
              © ${new Date().getFullYear()} Ouderschap & Co. ${texts.footerRights}
            </div>
          </div>
        </body>
      </html>
      `;

      await sendEmail({
        to: cleanEmail,
        subject: texts.subject,
        html: emailHtml,
      });
    }

    // Generate standard JWT session token
    let jwtToken = data?.session_token || data?.token || data?.session?.token;
    const targetUserId = data?.user?.id || data?.profile?.id;
    if (targetUserId) {
      try {
        const secret = Deno.env.get('JWT_SECRET') || supabaseServiceKey;
        jwtToken = await createJWT({
          aud: 'authenticated',
          role: 'authenticated',
          sub: targetUserId,
          email: cleanEmail,
          name: data?.user?.name || name || 'Parent',
          exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 30),
        }, secret);

        await client
          .from('profiles')
          .update({
            session_token: jwtToken,
            last_login_at: new Date().toISOString(),
          })
          .eq('id', targetUserId);
      } catch (jwtErr) {
        console.warn('[auth-signup] createJWT notice:', jwtErr);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          ...data.user,
          session_token: jwtToken,
        },
        session: data.session,
        token: jwtToken,
        session_token: jwtToken,
        verification_code: data.verification_code,
        needsVerification: true,
        message: data.message
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
