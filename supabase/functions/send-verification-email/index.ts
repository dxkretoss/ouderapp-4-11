import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import nodemailer from 'npm:nodemailer@6.9.10';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

  // 1. Try Nodemailer SMTP if credentials are provided
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

      const info = await transporter.sendMail({
        from: smtpFrom,
        to,
        subject,
        html,
      });
      console.log(`Email successfully sent to ${to} via SMTP:`, info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (err: any) {
      console.error('Nodemailer SMTP failed:', err);
    }
  }

  // 2. Fallback to Resend API
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
        console.log(`Email successfully sent to ${to} via Resend API.`);
        return { success: true };
      } else {
        const errText = await res.text();
        console.error('Resend API send failed response:', errText);
        return { success: false, error: errText };
      }
    } catch (resendErr: any) {
      console.error('Resend API send failed:', resendErr);
      return { success: false, error: resendErr.message };
    }
  }

  return { success: false, error: `Missing or failed email delivery configuration.` };
}

// Generate branded verification HTML template
function getVerificationEmailHtml(code: string, isEn = false): { html: string; subject: string } {
  const texts = isEn
    ? {
        pageTitle: 'Verification Code',
        headerSubtitle: 'Account Verification',
        welcomeTitle: 'Welcome to Ouderschap & Co.',
        bodyText: 'Thank you for signing up. To securely activate your account and access your co-parenting space, please enter the verification code below:',
        codeLabel: 'Your 6-digit verification code',
        validityText: '⏰ This verification code is valid for <strong>24 hours</strong>.',
        ignoreNote: 'Did you not create this account? You can safely ignore this email. Never share this code with anyone.',
        footerRights: 'All rights reserved.',
        subject: 'Your verification code for Ouderschap & Co',
      }
    : {
        pageTitle: 'Verificatiecode',
        headerSubtitle: 'Account Verificatie',
        welcomeTitle: 'Welkom bij Ouderschap & Co.',
        bodyText: 'Bedankt voor je aanmelding. Om je account veilig te activeren en toegang te krijgen tot je co-ouderschap omgeving, voer je onderstaande verificatiecode in:',
        codeLabel: 'Jouw 6-cijferige verificatiecode',
        validityText: '⏰ Deze verificatiecode is <strong>24 uur geldig</strong>.',
        ignoreNote: 'Heb je dit account niet aangemaakt? Dan kun je deze e-mail veilig negeren. Deel deze code nooit met anderen.',
        footerRights: 'Alle rechten voorbehouden.',
        subject: 'Je verificatiecode voor Ouderschap & Co',
      };

  const html = `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${texts.pageTitle}</title>
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
    </head>
    <body style="margin: 0; padding: 32px 16px; background-color: #f7f5f2; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1f2937;">
      <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 18px; overflow: hidden; border: 1px solid #e7e2d9; box-shadow: 0 4px 20px -2px rgba(44, 74, 62, 0.06);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #2c4a3e 0%, #1e332b 100%); padding: 36px 32px; text-align: center;">
          <h1 style="margin: 0; font-family: 'Cormorant Garamond', Georgia, serif; font-size: 32px; font-weight: 600; color: #ffffff; letter-spacing: -0.5px;">
            Ouderschap & Co.
          </h1>
          <p style="margin: 8px 0 0; color: #d4e4dc; font-size: 13px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">
            ${texts.headerSubtitle}
          </p>
        </div>

        <!-- Body -->
        <div style="padding: 36px 32px;">
          <h2 style="margin: 0 0 14px; font-size: 20px; font-weight: 700; color: #2c4a3e;">
            ${texts.welcomeTitle}
          </h2>
          <p style="margin: 0 0 24px; color: #4b5563; font-size: 15px; line-height: 1.6;">
            ${texts.bodyText}
          </p>

          <!-- OTP Box -->
          <div style="text-align: center; margin: 30px 0; padding: 22px 16px; background: #f4f8f6; border-radius: 14px; border: 1px dashed #2c4a3e;">
            <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #2c4a3e; font-weight: 700; margin-bottom: 8px;">
              ${texts.codeLabel}
            </div>
            <div style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #2c4a3e; padding-left: 8px;">
              ${code}
            </div>
          </div>

          <p style="margin: 0 0 10px; color: #6b7280; font-size: 13px; line-height: 1.5;">
            ${texts.validityText}
          </p>
          <p style="margin: 0; color: #9ca3af; font-size: 12px; line-height: 1.5;">
            ${texts.ignoreNote}
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

  return { html, subject: texts.subject };
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

    // Call custom resend verification RPC
    const { data, error } = await client.rpc('custom_resend_verification', {
      p_email: cleanEmail,
    });

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!data?.success) {
      return new Response(
        JSON.stringify({ error: data?.error || 'Could not resend verification code' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send email with 6-digit OTP code
    let emailStatus: any = null;
    if (data.verification_code) {
      const { html, subject } = getVerificationEmailHtml(data.verification_code, isEn);
      emailStatus = await sendEmail({
        to: cleanEmail,
        subject,
        html,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        verification_code: data.verification_code,
        message: data.message || 'Verification code resent successfully.',
        emailDelivery: emailStatus,
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
