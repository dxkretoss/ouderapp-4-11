import { supabase, isConfigured } from "@/lib/supabase";

/**
 * Custom Authentication Service for Web & Native Mobile (Flutter/iOS/Android)
 * 100% Custom Auth Engine: Uses custom PostgreSQL RPC functions & tables (app_users, app_sessions).
 * Completely bypasses Supabase GoTrue Auth (supabase.auth.*).
 */

const SESSION_STORAGE_KEY = "ouderapp_custom_session";

/**
 * Helper to store custom auth session in localStorage
 */
export function saveCustomSession(sessionData) {
  try {
    if (sessionData) {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));
      const token =
        sessionData.session?.token ||
        sessionData.token ||
        sessionData.user?.session_token ||
        sessionData.session_token;
      if (token) {
        localStorage.setItem("ouderapp_auth_token", token);
      }
      if (sessionData.profile || sessionData.user) {
        localStorage.setItem("ouderapp_auth_profile", JSON.stringify(sessionData.profile || sessionData.user));
      }
    } else {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      localStorage.removeItem("ouderapp_auth_token");
      localStorage.removeItem("ouderapp_auth_profile");
    }
  } catch (e) {
    console.warn("Could not save auth session to localStorage:", e);
  }
}

/**
 * Helper to get stored session from localStorage
 */
export function getSavedCustomSession() {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.warn("Could not parse saved custom session:", e);
    return null;
  }
}

/**
 * Custom User Login
 */
export async function signInUser(email, password) {
  if (!isConfigured) {
    throw new Error("Supabase is not configured. Please check your environment variables.");
  }

  const cleanEmail = email.toLowerCase().trim();

  // Call custom RPC procedure directly (No supabase.auth)
  const { data, error } = await supabase.rpc("custom_login", {
    p_email: cleanEmail,
    p_password: password,
  });

  if (error) {
    // If migration has not yet been executed in Supabase SQL editor
    if (error.message?.includes("function public.custom_login") || error.code === "PGRST202") {
      throw new Error(
        "De custom login database functie is nog niet geactiveerd. Voer 'supabase/schema.sql' uit in de Supabase SQL Editor."
      );
    }
    return { error };
  }

  if (!data?.success) {
    const err = new Error(data?.error || "Ongeldige inloggegevens.");
    if (data?.needs_verification) {
      err.needsVerification = true;
      err.email = cleanEmail;
    }
    return { error: err, needsVerification: Boolean(data?.needs_verification), email: cleanEmail };
  }

  const sessionPayload = {
    user: data.user,
    profile: data.profile,
    session: data.session,
  };

  saveCustomSession(sessionPayload);

  return {
    data: { user: data.user, session: data.session },
    profile: data.profile,
    error: null,
  };
}

/**
 * Custom User Registration (Dispatches OTP via Edge Function / SMTP)
 */
export async function signUpUser(email, password, name, usage_mode = "together") {
  if (!isConfigured) {
    throw new Error("Supabase is not configured. Please check your environment variables.");
  }

  const cleanEmail = email.toLowerCase().trim();

  // Also register in Supabase native auth.users
  try {
    await supabase.auth.signUp({
      email: cleanEmail,
      password: password,
      options: {
        data: {
          name: name?.trim() || "Parent",
          usage_mode: usage_mode || "together",
        },
      },
    });
  } catch (nativeErr) {
    console.warn("[signUpUser] supabase.auth.signUp notice:", nativeErr);
  }

  // 1. Try registering via auth-signup Edge Function (creates user AND sends email via Nodemailer)
  try {
    const { data: edgeData, error: edgeError } = await supabase.functions.invoke("auth-signup", {
      body: {
        email: cleanEmail,
        password,
        name: name?.trim() || "Parent",
        usage_mode,
      },
    });

    if (!edgeError && edgeData?.success) {
      const sessionPayload = {
        user: edgeData.user,
        session: edgeData.session,
        profile: {
          id: edgeData.user.id,
          name: edgeData.user.name,
          full_name: edgeData.user.name,
          usage_mode: edgeData.user.usage_mode,
          onboarding_completed: false,
        },
      };

      saveCustomSession(sessionPayload);

      return {
        data: { user: edgeData.user, session: edgeData.session },
        verificationCode: edgeData.verification_code,
        needsVerification: true,
        message: edgeData.message,
        error: null,
      };
    }
  } catch (e) {
    console.warn("auth-signup edge function fallback to direct RPC:", e);
  }

  // 2. Direct database RPC fallback
  const { data, error } = await supabase.rpc("custom_signup", {
    p_email: cleanEmail,
    p_password: password,
    p_name: name?.trim() || "Parent",
    p_usage_mode: usage_mode,
  });

  if (error) {
    if (error.message?.includes("function public.custom_signup") || error.code === "PGRST202") {
      throw new Error(
        "De custom signup database functie is nog niet geactiveerd. Voer 'supabase/schema.sql' uit in de Supabase SQL Editor."
      );
    }
    return { error };
  }

  if (!data?.success) {
    return { error: new Error(data?.error || "Account aanmaken mislukt.") };
  }

  // Session payload
  const sessionPayload = {
    user: data.user,
    session: data.session,
    profile: {
      id: data.user.id,
      name: data.user.name,
      full_name: data.user.name,
      usage_mode: data.user.usage_mode,
      onboarding_completed: false,
    },
  };

  saveCustomSession(sessionPayload);

  // Trigger verification email dispatch via Edge Function
  sendVerificationEmail(cleanEmail).catch((err) =>
    console.warn("Could not dispatch verification email:", err)
  );

  return {
    data: { user: data.user, session: data.session },
    verificationCode: data.verification_code,
    needsVerification: true,
    message: data.message,
    error: null,
  };
}

/**
 * Custom 6-Digit Email Verification
 */
export async function verifyEmailCode(email, code) {
  if (!isConfigured) return { error: null };

  const cleanEmail = email.toLowerCase().trim();

  const { data, error } = await supabase.rpc("custom_verify_email", {
    p_email: cleanEmail,
    p_code: code.trim(),
  });

  if (error) {
    return { error };
  }

  if (!data?.success) {
    return { error: new Error(data?.error || "Ongeldige verificatiecode.") };
  }

  // Update stored session if present
  const current = getSavedCustomSession();
  if (current?.user && current.user.email === cleanEmail) {
    current.user.is_verified = true;
    saveCustomSession(current);
  }

  return { success: true, message: data.message, error: null };
}

/**
 * Resend Verification Code
 */
export async function sendVerificationEmail(email) {
  if (!isConfigured) return { error: null };

  const cleanEmail = email.toLowerCase().trim();

  // 1. Try invoking Edge Function (which dispatches actual email)
  try {
    const { data: edgeData, error: edgeError } = await supabase.functions.invoke("send-verification-email", {
      body: { email: cleanEmail },
    });
    if (!edgeError && edgeData?.success) {
      return {
        success: true,
        verificationCode: edgeData.verification_code,
        message: edgeData.message || "Verificatiecode is verstuurd naar je e-mailadres.",
        error: null,
      };
    }
  } catch (e) {
    console.warn("Edge function fallback to direct RPC:", e);
  }

  // 2. Direct database RPC fallback
  const { data, error } = await supabase.rpc("custom_resend_verification", {
    p_email: cleanEmail,
  });

  if (error) {
    return { error };
  }

  if (!data?.success) {
    return { error: new Error(data?.error || "Kon verificatiecode niet versturen.") };
  }

  return {
    success: true,
    verificationCode: data.verification_code,
    message: data.message,
    error: null,
  };
}

/**
 * Custom Password Reset Request (Dispatches OTP via SMTP / Edge Function)
 */
export async function resetPassword(email) {
  if (!isConfigured) return { error: null };

  const cleanEmail = email.toLowerCase().trim();

  // 1. Try invoking custom-auth / auth-reset-password Edge Function (dispatches email via SMTP)
  try {
    const { data: edgeData, error: edgeError } = await supabase.functions.invoke("auth-reset-password", {
      body: { email: cleanEmail },
    });
    if (!edgeError && edgeData?.success) {
      return {
        success: true,
        resetCode: edgeData.reset_code,
        message: edgeData.message || "Herstelcode is verzonden naar je e-mailadres.",
        error: null,
      };
    }
  } catch (e) {
    console.warn("Edge function fallback to direct RPC for reset password:", e);
  }

  // 2. Direct database RPC fallback
  const { data, error } = await supabase.rpc("custom_request_password_reset", {
    p_email: cleanEmail,
  });

  if (error) {
    return { error };
  }

  return {
    success: true,
    resetCode: data?.reset_code,
    message: data?.message || "Herstelcode is verzonden.",
    error: null,
  };
}

/**
 * Custom Submit New Password with Reset Code
 */
export async function confirmPasswordReset(email, code, newPassword) {
  if (!isConfigured) return { error: null };

  const cleanEmail = email.toLowerCase().trim();

  const { data, error } = await supabase.rpc("custom_reset_password", {
    p_email: cleanEmail,
    p_token: code.trim(),
    p_new_password: newPassword,
  });

  if (error) {
    return { error };
  }

  if (!data?.success) {
    return { error: new Error(data?.error || "Ongeldige of verlopen herstelcode.") };
  }

  return { success: true, message: data.message, error: null };
}

/**
 * Verify Password Reset OTP Code (Step 2 before entering new password)
 */
export async function customVerifyResetOtp(email, token) {
  if (!isConfigured) return { error: null };

  const cleanEmail = email.toLowerCase().trim();

  const { data, error } = await supabase.rpc("custom_verify_reset_otp", {
    p_email: cleanEmail,
    p_token: token.trim(),
  });

  if (error) {
    return { error };
  }

  if (!data?.success) {
    return { error: new Error(data?.error || "Ongeldige of verlopen herstelcode.") };
  }

  return { success: true, message: data.message, error: null };
}

// Named exports matching BOMA architecture
export const customResendVerification = sendVerificationEmail;
export const customVerifyEmail = verifyEmailCode;
export const customRequestPasswordReset = resetPassword;
export const customResetPassword = confirmPasswordReset;


/**
 * Check and validate existing session from server
 */
export async function validateCurrentSession() {
  const saved = getSavedCustomSession();
  if (!saved?.session?.token) {
    return null;
  }

  try {
    const { data, error } = await supabase.rpc("custom_get_current_user", {
      p_token: saved.session.token,
    });

    if (error || !data?.success) {
      // Session expired or invalid
      saveCustomSession(null);
      return null;
    }

    const updated = {
      user: data.user,
      profile: data.profile,
      session: data.session,
    };
    saveCustomSession(updated);
    return updated;
  } catch (e) {
    console.warn("Could not validate session with server:", e);
    // Return saved session offline
    return saved;
  }
}

/**
 * Custom Sign Out
 */
export async function signOutUser() {
  const saved = getSavedCustomSession();
  if (saved?.session?.token && isConfigured) {
    try {
      await supabase.rpc("custom_logout", {
        p_token: saved.session.token,
      });
    } catch (err) {
      console.warn("Custom logout warning:", err);
    }
  }

  saveCustomSession(null);
}
