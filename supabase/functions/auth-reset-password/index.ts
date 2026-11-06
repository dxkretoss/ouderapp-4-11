import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import nodemailer from 'npm:nodemailer@6.9.10';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
      console.log(`[auth-reset-password] Reset email sent to ${to} via SMTP.`);
      return true;
    } catch (err) {
      console.error('[auth-reset-password] Nodemailer SMTP failed:', err);
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
        console.log(`[auth-reset-password] Reset email sent to ${to} via Resend.`);
        return true;
      } else {
        const errText = await res.text();
        console.error('[auth-reset-password] Resend API error response:', errText);
      }
    } catch (sendErr) {
      console.error('[auth-reset-password] Resend send failed:', sendErr);
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
    const { email, lang, locale } = body;
    const isEn = Boolean((lang || locale || '').toLowerCase().startsWith('en'));

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cleanEmail = email.toLowerCase().trim();
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY')!;

    const client = createClient(supabaseUrl, supabaseServiceKey);

    // Call custom request password reset RPC
    const { data, error } = await client.rpc('custom_request_password_reset', {
      p_email: cleanEmail,
    });

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (data?.reset_code) {
      const texts = isEn
        ? {
            pageTitle: 'Reset Password',
            headerSubtitle: 'Password Reset',
            welcomeTitle: 'Password Reset Requested',
            bodyText: 'We received a request to change the password for your account. Enter the 6-digit code below to proceed:',
            codeLabel: 'Your 6-Digit Reset Code',
            validityText: '⚠️ This reset code is valid for <strong>15 minutes</strong>.',
            ignoreNote: 'Did you not make this request? You can safely ignore this email. Your current password remains unchanged.',
            footerRights: 'All rights reserved.',
            subject: 'Password reset code - Ouderschap & Co',
          }
        : {
            pageTitle: 'Wachtwoord Herstellen',
            headerSubtitle: 'Wachtwoord Herstellen',
            welcomeTitle: 'Herstelcode aangevraagd',
            bodyText: 'We hebben een verzoek ontvangen om het wachtwoord van je account te wijzigen. Voer onderstaande 6-cijferige code in om door te gaan:',
            codeLabel: 'Jouw 6-Cijferige Herstelcode',
            validityText: '⚠️ Deze herstelcode is <strong>15 minuten geldig</strong>.',
            ignoreNote: 'Heb je deze aanvraag niet gedaan? Negeer deze e-mail gerust. Je huidige wachtwoord blijft ongewijzigd.',
            footerRights: 'Alle rechten voorbehouden.',
            subject: 'Herstelcode voor je wachtwoord - Ouderschap & Co',
          };

      const resetEmailHtml = `
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
              <div style="text-align: center; margin: 30px 0; padding: 22px 16px; background: #fdf5f2; border-radius: 14px; border: 1px dashed #C46A4A;">
                <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #C46A4A; font-weight: 700; margin-bottom: 8px;">
                  ${texts.codeLabel}
                </div>
                <div style="font-family: monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #C46A4A; padding-left: 8px;">
                  ${data.reset_code}
                </div>
              </div>
              <p style="margin: 0 0 10px; color: #6b7280; font-size: 13px;">
                ${texts.validityText}
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px; line-height: 1.5;">
                ${texts.ignoreNote}
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
        html: resetEmailHtml,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: data?.message || 'Password reset code has been sent.'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
