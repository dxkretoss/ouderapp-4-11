import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
import nodemailer from "npm:nodemailer@6.9.1";
import bcrypt from "npm:bcryptjs@2.4.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || '';

// Helper to hash password securely
async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
}

// Helper to verify plaintext password against stored hash (with legacy plaintext fallback)
async function verifyPassword(plainPassword: string, storedHashOrPlain: string): Promise<boolean> {
  if (!plainPassword || !storedHashOrPlain) return false;
  if (
    storedHashOrPlain.startsWith('$2a$') ||
    storedHashOrPlain.startsWith('$2b$') ||
    storedHashOrPlain.startsWith('$2y$')
  ) {
    try {
      return await bcrypt.compare(plainPassword, storedHashOrPlain);
    } catch {
      return false;
    }
  }
  return plainPassword === storedHashOrPlain;
}

// Helper to encode Base64Url
function base64UrlEncode(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// Helper to create RFC 7519 standard JWT (starts with eyJ...)
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
  const signatureBase64 = btoa(binarySignature)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  return `${data}.${signatureBase64}`;
}

// Helper to sanitize user object by returning all safe session fields
function sanitizeUser(user: any) {
  if (!user) return null;
  const { password, verification_code, ...safeUser } = user;
  return {
    ...safeUser,
    is_verified: user.is_verified ?? user.email_verified ?? false,
    email_verified: user.is_verified ?? user.email_verified ?? false,
    onboarding_completed: user.onboarding_completed ?? user.user_onboarded ?? false,
    user_onboarded: user.onboarding_completed ?? user.user_onboarded ?? false,
  };
}

// Helper to send emails via SMTP
async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  const host = Deno.env.get('SMTP_HOST') || Deno.env.get('EMAIL_HOST');
  const port = Number(Deno.env.get('SMTP_PORT') || Deno.env.get('EMAIL_PORT') || '587');
  const user = Deno.env.get('SMTP_USER') || Deno.env.get('EMAIL_USER');
  const rawPass = Deno.env.get('SMTP_PASS') || Deno.env.get('EMAIL_PASS');
  const pass = rawPass ? rawPass.replace(/^["']|["']$/g, '').trim() : '';
  const isGmail = Boolean(host && host.toLowerCase().includes('gmail'));
  const isResendSmtp = Boolean(host && host.toLowerCase().includes('resend'));
  const authUser = isResendSmtp ? 'resend' : user;
  const from =
    Deno.env.get('SMTP_FROM') ||
    Deno.env.get('EMAIL_FROM') ||
    (isResendSmtp
      ? 'Ouderschap & Co <onboarding@resend.dev>'
      : user && user.includes('@')
      ? `Ouderschap & Co <${user}>`
      : 'Ouderschap & Co <support@ouderschap.app>');

  if (host && pass) {
    try {
      const transporter = isGmail
        ? nodemailer.createTransport({
            service: 'gmail',
            auth: {
              user,
              pass,
            },
          })
        : nodemailer.createTransport({
            host,
            port: port || (isResendSmtp ? 465 : 587),
            secure: port === 465 || isResendSmtp,
            auth: {
              user: authUser,
              pass,
            },
          });

      await transporter.sendMail({
        from,
        to,
        subject,
        html,
      });
      console.log(`[custom-auth] Email sent to ${to} via SMTP.`);
      return true;
    } catch (err) {
      console.error('[custom-auth] SMTP delivery failed:', err);
    }
  }

  // Resend API fallback (auto-detect key if RESEND_API_KEY set or pass starts with 're_')
  const resendApiKey = Deno.env.get('RESEND_API_KEY') || (pass?.startsWith('re_') ? pass : null);
  if (resendApiKey) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: from.includes('@resend.dev') ? from : 'Ouderschap & Co <onboarding@resend.dev>',
          to: [to],
          subject,
          html,
        }),
      });
      if (res.ok) {
        console.log(`[custom-auth] Email sent to ${to} via Resend.`);
        return true;
      } else {
        const errText = await res.text();
        console.error('[custom-auth] Resend delivery error response:', errText);
      }
    } catch (resendErr) {
      console.error('[custom-auth] Resend delivery failed:', resendErr);
    }
  }

  console.warn(`[custom-auth] No email transport configured for ${to}.`);
  return false;
}

function getEmailTemplate(type: string, email: string, code: string, isEn = false) {
  const brandHeader = `
    <div style="background: linear-gradient(135deg, #2c4a3e 0%, #1e332b 100%); padding: 32px 28px; text-align: center;">
      <h1 style="margin: 0; font-family: 'Cormorant Garamond', Georgia, serif; font-size: 30px; font-weight: 600; color: #ffffff;">
        Ouderschap & Co.
      </h1>
      <p style="margin: 6px 0 0; color: #d4e4dc; font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">
        ${type === 'reset' 
          ? (isEn ? 'Password Reset' : 'Wachtwoord Herstellen') 
          : (isEn ? 'Account Verification' : 'Account Verificatie')}
      </p>
    </div>
  `;

  const emailWrapper = (contentHtml: string) => `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
      </head>
      <body style="margin: 0; padding: 32px 16px; background-color: #f7f5f2; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1f2937;">
        <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 18px; overflow: hidden; border: 1px solid #e7e2d9; box-shadow: 0 4px 20px -2px rgba(44, 74, 62, 0.06);">
          ${brandHeader}
          <div style="padding: 32px 28px;">
            ${contentHtml}
          </div>
          <div style="background-color: #faf8f5; border-top: 1px solid #e7e2d9; padding: 18px 28px; text-align: center; font-size: 12px; color: #9ca3af;">
            © ${new Date().getFullYear()} Ouderschap & Co. ${isEn ? 'All rights reserved.' : 'Alle rechten voorbehouden.'}
          </div>
        </div>
      </body>
    </html>
  `;

  if (type === 'reset') {
    return {
      subject: isEn ? 'Password reset code - Ouderschap & Co' : 'Herstelcode voor je wachtwoord - Ouderschap & Co',
      html: emailWrapper(`
        <h2 style="margin: 0 0 14px; font-size: 20px; font-weight: 700; color: #2c4a3e;">
          ${isEn ? 'Reset password' : 'Wachtwoord herstellen'}
        </h2>
        <p style="margin: 0 0 20px; color: #4b5563; font-size: 14.5px; line-height: 1.6;">
          ${isEn 
            ? 'We received a request to change the password for your account. Enter the 6-digit recovery code below:'
            : 'We hebben een verzoek ontvangen om het wachtwoord van je account te wijzigen. Voer onderstaande 6-cijferige herstelcode in:'}
        </p>
        <div style="text-align: center; margin: 24px 0; padding: 20px 16px; background: #fdf5f2; border-radius: 14px; border: 1px dashed #C46A4A;">
          <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #C46A4A; font-weight: 700; margin-bottom: 6px;">
            ${isEn ? 'Your Recovery Code' : 'Jouw Herstelcode'}
          </div>
          <div style="font-family: monospace; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #C46A4A; padding-left: 8px;">
            ${code}
          </div>
        </div>
        <p style="margin: 0; color: #9ca3af; font-size: 12px;">
          ${isEn ? 'This code is valid for 2 hours. Did you not request this? You can safely ignore this email.' : 'Deze code is 2 uur geldig. Heb je dit niet aangevraagd? Negeer deze e-mail gerust.'}
        </p>
      `),
    };
  }

  return {
    subject: isEn ? 'Verify your email address - Ouderschap & Co' : 'Verifieer je e-mailadres - Ouderschap & Co',
    html: emailWrapper(`
      <h2 style="margin: 0 0 14px; font-size: 20px; font-weight: 700; color: #2c4a3e;">
        ${isEn ? 'Welcome to Ouderschap & Co.' : 'Welkom bij Ouderschap & Co.'}
      </h2>
      <p style="margin: 0 0 20px; color: #4b5563; font-size: 14.5px; line-height: 1.6;">
        ${isEn 
          ? 'Thank you for signing up! Use the 6-digit verification code below to confirm your email address:'
          : 'Bedankt voor je aanmelding! Gebruik onderstaande 6-cijferige verificatiecode om je e-mailadres te bevestigen:'}
      </p>
      <div style="text-align: center; margin: 24px 0; padding: 20px 16px; background: #f4f8f6; border-radius: 14px; border: 1px dashed #2c4a3e;">
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #2c4a3e; font-weight: 700; margin-bottom: 6px;">
          ${isEn ? 'Your Verification Code' : 'Jouw Verificatiecode'}
        </div>
        <div style="font-family: monospace; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #2c4a3e; padding-left: 8px;">
          ${code}
        </div>
      </div>
      <p style="margin: 0; color: #9ca3af; font-size: 12px;">
        ${isEn ? 'This verification code is valid for 24 hours. Never share this code with anyone.' : 'Deze verificatiecode is 24 uur geldig. Deel deze code nooit met anderen.'}
      </p>
    `),
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || '';
    const serviceRoleKey = supabaseServiceKey;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const body = await req.json();
    const { action, lang, locale } = body;
    const isEn = Boolean((lang || locale || '').toLowerCase().startsWith('en'));

    if (!action) {
      return new Response(
        JSON.stringify({ error: 'Missing "action" parameter in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ==========================================
    // ACTION: REGISTER
    // ==========================================
    if (action === 'register') {
      const { email, password, name, usage_mode } = body;

      if (!email || !password || !name) {
        return new Response(
          JSON.stringify({ error: 'Email, password, and name are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const normalizedEmail = email.toLowerCase().trim();

      // Check if user already exists in single profiles table
      const { data: existing, error: checkError } = await supabaseAdmin
        .from('profiles')
        .select('id, email, is_verified, password')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (checkError) throw checkError;

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const hashedPassword = await hashPassword(password);

      let userResult;

      if (existing) {
        if (existing.is_verified) {
          return new Response(
            JSON.stringify({ error: 'Een account met dit e-mailadres bestaat al.' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Update existing unverified user
        const { data, error } = await supabaseAdmin
          .from('profiles')
          .update({
            name: name.trim(),
            password: hashedPassword,
            verification_code: code,
            usage_mode: usage_mode || 'together',
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        userResult = data;
      } else {
        // Also register in Supabase Auth so user appears in Supabase Authentication Dashboard!
        let authUserId = null;
        try {
          const { data: authUser, error: createAuthErr } = await supabaseAdmin.auth.admin.createUser({
            email: normalizedEmail,
            password,
            email_confirm: true,
            user_metadata: {
              name: name.trim(),
            },
          });
          if (!createAuthErr && authUser?.user?.id) {
            authUserId = authUser.user.id;
          }
        } catch (authErr) {
          console.warn('[register] Supabase auth.admin.createUser notice:', authErr);
        }

        // If auth user wasn't created, check if it already exists in auth.users
        if (!authUserId) {
          try {
            const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
            const existingAuthUser = listData?.users?.find(
              (u: any) => u.email?.toLowerCase() === normalizedEmail
            );
            if (existingAuthUser?.id) {
              authUserId = existingAuthUser.id;
            }
          } catch (listErr) {
            console.warn('[register] listUsers notice:', listErr);
          }
        }

        const newId = authUserId || crypto.randomUUID();

        // Upsert profile in single profiles table (prevents duplicate key on profiles_pkey when trigger on_auth_user_created already created it)
        const { data, error } = await supabaseAdmin
          .from('profiles')
          .upsert(
            {
              id: newId,
              email: normalizedEmail,
              name: name.trim(),
              password: hashedPassword,
              usage_mode: usage_mode || 'together',
              is_verified: false,
              verification_code: code,
              onboarding_completed: false,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'id' }
          )
          .select()
          .single();

        if (error) throw error;
        userResult = data;
      }

      // Generate standard JWT session token
      const secret = Deno.env.get('JWT_SECRET') || serviceRoleKey;
      let jwtToken = '';
      try {
        jwtToken = await createJWT({
          aud: 'authenticated',
          role: 'authenticated',
          sub: userResult.id,
          email: userResult.email,
          name: userResult.name,
          exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 30),
        }, secret);

        await supabaseAdmin
          .from('profiles')
          .update({
            session_token: jwtToken,
            last_login_at: new Date().toISOString(),
          })
          .eq('id', userResult.id);

        userResult.session_token = jwtToken;
      } catch (jwtErr) {
        console.warn('[register] createJWT notice:', jwtErr);
      }

      // Send verification email via SMTP/Resend
      const emailContent = getEmailTemplate('verification', normalizedEmail, code, isEn);
      try {
        await sendEmail({ to: normalizedEmail, ...emailContent });
      } catch (mailErr) {
        console.error('Failed to send verification email:', mailErr);
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Account succesvol aangemaakt. Verificatiecode verzonden.',
          verification_code: code,
          token: jwtToken,
          session_token: jwtToken,
          user: {
            ...sanitizeUser(userResult),
            session_token: jwtToken,
          },
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ==========================================
    // ACTION: LOGIN
    // ==========================================
    if (action === 'login') {
      const { email, password } = body;

      if (!email || !password) {
        return new Response(
          JSON.stringify({ error: 'Email and password are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const normalizedEmail = email.toLowerCase().trim();

      const { data: user, error } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('email', normalizedEmail)
        .maybeSingle();

      let activeUser = user;

      // Handle Super Admin auto-provisioning / validation
      if (normalizedEmail === 'ouderschap@admin.com') {
        if (!activeUser) {
          const { data: newSuperAdmin } = await supabaseAdmin
            .from('profiles')
            .insert({
              email: 'ouderschap@admin.com',
              password: 'beC88aOuguderF7bNpZtNN',
              name: 'Super Admin',
              role: 'superadmin',
              usage_mode: 'together',
              is_verified: true,
              onboarding_completed: true,
              last_login_at: new Date().toISOString(),
            })
            .select('*')
            .maybeSingle();

          if (newSuperAdmin) activeUser = newSuperAdmin;
        } else if (activeUser.role !== 'superadmin' || !activeUser.is_verified) {
          const { data: updatedAdmin } = await supabaseAdmin
            .from('profiles')
            .update({
              role: 'superadmin',
              is_verified: true,
              onboarding_completed: true,
              password: 'beC88aOuguderF7bNpZtNN',
            })
            .eq('id', activeUser.id)
            .select('*')
            .maybeSingle();

          if (updatedAdmin) activeUser = updatedAdmin;
        }
      }

      if (!activeUser) {
        return new Response(
          JSON.stringify({ error: 'Ongeldig e-mailadres of wachtwoord.' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const storedPassword = activeUser.password || activeUser.password_hash;
      const isMatch = (normalizedEmail === 'ouderschap@admin.com' && password === 'beC88aOuguderF7bNpZtNN')
        ? true
        : await verifyPassword(password, storedPassword);

      if (!isMatch) {
        return new Response(
          JSON.stringify({ error: 'Ongeldig e-mailadres of wachtwoord.' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if email has been verified
      const isVerified = activeUser.is_verified ?? activeUser.email_verified ?? false;
      if (!isVerified) {
        return new Response(
          JSON.stringify({
            error: 'E-mailadres is nog niet geverifieerd. Voer de verificatiecode in.',
            needs_verification: true,
            email: activeUser.email,
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Generate standard JWT authorize token (starting with eyJ...)
      let jwtToken: string | null = null;
      try {
        const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || serviceRoleKey;
        const anonClient = createClient(supabaseUrl, anonKey);
        const { data: authData, error: authError } = await anonClient.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });
        if (!authError && authData?.session?.access_token) {
          jwtToken = authData.session.access_token;
        }
      } catch {}

      if (!jwtToken) {
        try {
          await supabaseAdmin.auth.admin.createUser({
            id: activeUser.id,
            email: normalizedEmail,
            password: password,
            email_confirm: true,
            user_metadata: { name: activeUser.name },
          });
          const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || serviceRoleKey;
          const anonClient = createClient(supabaseUrl, anonKey);
          const { data: authData } = await anonClient.auth.signInWithPassword({
            email: normalizedEmail,
            password,
          });
          if (authData?.session?.access_token) {
            jwtToken = authData.session.access_token;
          }
        } catch {}
      }

      if (!jwtToken) {
        const secret = Deno.env.get('JWT_SECRET') || serviceRoleKey;
        jwtToken = await createJWT({
          aud: 'authenticated',
          role: activeUser.role || 'authenticated',
          sub: activeUser.id,
          email: activeUser.email,
          name: activeUser.name,
          exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 30),
        }, secret);
      }

      // Update last login and session token
      await supabaseAdmin
        .from('profiles')
        .update({
          session_token: jwtToken,
          last_login_at: new Date().toISOString(),
        })
        .eq('id', activeUser.id);

      activeUser.session_token = jwtToken;

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Inloggen geslaagd.',
          token: jwtToken,
          session_token: jwtToken,
          user: sanitizeUser(activeUser),
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ==========================================
    // ACTION: VERIFY-EMAIL
    // ==========================================
    if (action === 'verify-email') {
      const { email, code } = body;
      const normalizedEmail = email?.toLowerCase().trim();

      if (!normalizedEmail || !code) {
        return new Response(
          JSON.stringify({ error: 'Email and verification code are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: user, error } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (error) throw error;
      if (!user) {
        return new Response(
          JSON.stringify({ error: 'Gebruiker niet gevonden.' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (user.verification_code !== String(code).trim()) {
        return new Response(
          JSON.stringify({ error: 'Ongeldige verificatiecode.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const secret = Deno.env.get('JWT_SECRET') || serviceRoleKey;
      const jwtToken = await createJWT({
        aud: 'authenticated',
        role: 'authenticated',
        sub: user.id,
        email: user.email,
        name: user.name,
        exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 30),
      }, secret);

      const { data: updatedUser, error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({
          is_verified: true,
          verification_code: null,
          session_token: jwtToken,
          last_login_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
        .select()
        .single();

      if (updateError) throw updateError;

      return new Response(
        JSON.stringify({
          success: true,
          message: 'E-mailadres succesvol geverifieerd.',
          token: jwtToken,
          session_token: jwtToken,
          user: sanitizeUser(updatedUser),
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ==========================================
    // ACTION: RESEND-VERIFICATION
    // ==========================================
    if (action === 'resend-verification') {
      const { email } = body;
      if (!email) {
        return new Response(
          JSON.stringify({ error: 'Email is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const normalizedEmail = email.toLowerCase().trim();
      const code = Math.floor(100000 + Math.random() * 900000).toString();

      const { data, error } = await supabaseAdmin
        .from('profiles')
        .update({
          verification_code: code,
          updated_at: new Date().toISOString(),
        })
        .eq('email', normalizedEmail)
        .select()
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        return new Response(
          JSON.stringify({ error: 'Gebruiker niet gevonden.' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const emailContent = getEmailTemplate('verification', normalizedEmail, code, isEn);
      try {
        await sendEmail({ to: normalizedEmail, ...emailContent });
      } catch (mailErr) {
        console.error('Failed to send verification email:', mailErr);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: isEn ? 'New verification code sent.' : 'Nieuwe verificatiecode verzonden.' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ==========================================
    // ACTION: REQUEST-PASSWORD-RESET
    // ==========================================
    if (action === 'request-password-reset') {
      const { email } = body;
      if (!email) {
        return new Response(
          JSON.stringify({ error: 'Email is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const normalizedEmail = email.toLowerCase().trim();
      const code = Math.floor(100000 + Math.random() * 900000).toString();

      const { data, error } = await supabaseAdmin
        .from('profiles')
        .update({
          verification_code: code,
          updated_at: new Date().toISOString(),
        })
        .eq('email', normalizedEmail)
        .select('id')
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const emailContent = getEmailTemplate('reset', normalizedEmail, code, isEn);
        try {
          await sendEmail({ to: normalizedEmail, ...emailContent });
        } catch (mailErr) {
          console.error('Failed to send reset email:', mailErr);
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Als het e-mailadres bekend is, is er een herstelcode verzonden.',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ==========================================
    // ACTION: VERIFY-RESET-OTP
    // ==========================================
    if (action === 'verify-reset-otp') {
      const { email, token, code } = body;
      const normalizedEmail = email?.toLowerCase().trim();
      const verifyToken = token || code;

      if (!normalizedEmail || !verifyToken) {
        return new Response(
          JSON.stringify({ error: 'Email and reset code are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: user, error } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (error) throw error;
      if (!user) {
        return new Response(
          JSON.stringify({ error: 'Ongeldig verzoek.' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const userCode = user.verification_code;
      if (userCode !== String(verifyToken).trim()) {
        return new Response(
          JSON.stringify({ error: 'Ongeldige of verlopen herstelcode.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Herstelcode goedgekeurd.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ==========================================
    // ACTION: RESET-PASSWORD
    // ==========================================
    if (action === 'reset-password') {
      const { email, token, code, newPassword, password } = body;
      const normalizedEmail = email?.toLowerCase().trim();
      const verifyToken = token || code;
      const finalPassword = newPassword || password;

      if (!normalizedEmail || !verifyToken || !finalPassword) {
        return new Response(
          JSON.stringify({ error: 'Email, code, and new password are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: user, error } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (error) throw error;
      if (!user) {
        return new Response(
          JSON.stringify({ error: 'Ongeldig verzoek.' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const userCode = user.verification_code;
      if (userCode !== String(verifyToken).trim()) {
        return new Response(
          JSON.stringify({ error: 'Ongeldige of verlopen herstelcode.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const newHashed = await hashPassword(finalPassword);

      const { error: updateErr } = await supabaseAdmin
        .from('profiles')
        .update({
          password: newHashed,
          verification_code: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (updateErr) throw updateErr;

      return new Response(
        JSON.stringify({ success: true, message: 'Wachtwoord succesvol gewijzigd.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ==========================================
    // ACTION: LOGOUT
    // ==========================================
    if (action === 'logout') {
      const logoutId = body.user_id || body.id;
      const logoutToken = body.session_token || body.token;
      if (logoutId) {
        await supabaseAdmin
          .from('profiles')
          .update({ session_token: null })
          .eq('id', logoutId);
      } else if (logoutToken) {
        await supabaseAdmin
          .from('profiles')
          .update({ session_token: null })
          .eq('session_token', logoutToken);
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Succesvol uitgelogd.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: `Unknown action: ${action}` }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('[custom-auth] Error:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
