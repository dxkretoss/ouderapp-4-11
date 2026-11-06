import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const sanitizeProfile = (row: any) => {
  if (!row) return null;
  const { password, verification_code, ...safeProfile } = row;
  return safeProfile;
};

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || "";
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    const { action } = body;

    // 1. GET PROFILE BY USER ID OR TOKEN
    if (action === "get" || action === "get-profile") {
      let user_id = body.user_id || body.id;
      const headerToken = req.headers.get("x-session-token") ||
        (req.headers.get("authorization")?.startsWith("Bearer ") ? req.headers.get("authorization")?.slice(7) : null);
      const incomingToken = body.session_token || body.token || headerToken;

      let jwtSub: string | null = null;
      let jwtEmail: string | null = null;
      if (incomingToken && typeof incomingToken === "string" && incomingToken.includes(".")) {
        try {
          const parts = incomingToken.split(".");
          if (parts.length >= 2) {
            const rawPayload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
            const payload = JSON.parse(atob(rawPayload));
            if (payload.sub) jwtSub = payload.sub;
            if (payload.email) jwtEmail = payload.email.toLowerCase().trim();
          }
        } catch {}
      }

      let profile = null;

      // 1. Try finding by user_id or decoded JWT sub
      const targetId = user_id || jwtSub;
      if (targetId) {
        const { data } = await adminClient.from("profiles").select("*").eq("id", targetId).maybeSingle();
        if (data) profile = data;
      }

      // 2. Try finding by session_token match
      if (!profile && incomingToken && !incomingToken.includes("placeholder")) {
        const { data } = await adminClient.from("profiles").select("*").eq("session_token", incomingToken).maybeSingle();
        if (data) profile = data;
      }

      // 3. Try finding by email
      const targetEmail = body.email ? body.email.toLowerCase().trim() : jwtEmail;
      if (!profile && targetEmail) {
        const { data } = await adminClient.from("profiles").select("*").eq("email", targetEmail).maybeSingle();
        if (data) profile = data;
      }
      if (!profile) {
        return new Response(JSON.stringify({ success: false, profile: null, error: "Profile not found." }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // If session_token is null or not a JWT (doesn't start with eyJ), assign an authentic JWT token
      if (!profile.session_token || !profile.session_token.startsWith("eyJ")) {
        const secret = Deno.env.get("JWT_SECRET") || serviceRoleKey;
        const jwtToken = await createJWT({
          aud: "authenticated",
          role: "authenticated",
          sub: profile.id,
          email: profile.email,
          name: profile.name,
          exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 30),
        }, secret);

        await adminClient
          .from("profiles")
          .update({ session_token: jwtToken })
          .eq("id", profile.id);
        profile.session_token = jwtToken;
      }

      return new Response(JSON.stringify({
        success: true,
        token: profile.session_token,
        session_token: profile.session_token,
        profile: sanitizeProfile(profile)
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. UPDATE PROFILE
    if (action === "update" || action === "update-profile") {
      const user_id = body.user_id || body.id;
      const updates = body.updates || {};

      if (!user_id) {
        return new Response(JSON.stringify({ success: false, error: "user_id is required." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Filter safe fields to update
      const allowedKeys = ["name", "avatar_url", "usage_mode", "onboarding_completed", "last_login_at"];
      const filteredUpdates: any = { updated_at: new Date().toISOString() };
      for (const key of allowedKeys) {
        if (updates[key] !== undefined) {
          filteredUpdates[key] = updates[key];
        }
      }

      const { data: updated, error } = await adminClient
        .from("profiles")
        .update(filteredUpdates)
        .eq("id", user_id)
        .select()
        .single();

      if (error) throw new Error(error.message);

      return new Response(JSON.stringify({ success: true, profile: sanitizeProfile(updated) }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. GET MULTIPLE PROFILES (For Co-Parents / Circle)
    if (action === "get-batch") {
      const user_ids = body.user_ids || [];
      if (!Array.isArray(user_ids) || user_ids.length === 0) {
        return new Response(JSON.stringify({ success: true, profiles: [] }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: profiles, error } = await adminClient
        .from("profiles")
        .select("id, name, email, avatar_url")
        .in("id", user_ids);

      if (error) throw new Error(error.message);

      return new Response(JSON.stringify({ success: true, profiles: profiles || [] }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. DELETE ACCOUNT (Apple Guideline Compliance)
    if (action === "delete") {
      const user_id = body.user_id || body.id;
      if (!user_id) {
        return new Response(JSON.stringify({ success: false, error: "user_id is required." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await adminClient.from("profiles").delete().eq("id", user_id);

      return new Response(JSON.stringify({ success: true, message: "Profile deleted." }), {
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
