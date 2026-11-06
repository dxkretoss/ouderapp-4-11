import { supabase } from './lib/supabase';

/**
 * Universal Authentication Service
 * Fully compatible with BOMA flow and deployed Supabase Edge Functions.
 * Gracefully handles email dispatch (SMTP/Nodemailer/Resend) and database operations.
 */

export function getAppLanguage(explicitLang) {
  if (explicitLang && typeof explicitLang === 'string') return explicitLang;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = localStorage.getItem('i18nextLng') || localStorage.getItem('app_taal');
      if (saved) return saved;
    }
    if (typeof navigator !== 'undefined' && navigator.language) {
      return navigator.language;
    }
  } catch {
    // fallback
  }
  return 'nl';
}

// 1. REGISTER USER & SEND VERIFICATION EMAIL
export async function customRegister(email, password, name, usage_mode = 'together', lang) {
  const cleanEmail = email.toLowerCase().trim();
  const activeLang = getAppLanguage(lang);

  // Try 1: Dedicated auth-signup function (already deployed with SMTP email dispatch)
  try {
    const { data, error } = await supabase.functions.invoke('auth-signup', {
      body: {
        email: cleanEmail,
        password,
        name: name?.trim() || 'Parent',
        usage_mode,
        lang: activeLang,
      },
    });

    if (!error && data?.success) {
      const token = data.session_token || data.token || data.user?.session_token || data.session?.token;
      const userObj = data.user || {
        id: data.user?.id,
        email: cleanEmail,
        name: name?.trim(),
        verification_code: data.verification_code,
        is_verified: false,
      };
      return {
        ...userObj,
        session_token: token,
        token: token,
        verification_code: data.verification_code || userObj.verification_code,
      };
    }
  } catch (err) {
    console.warn('[customRegister] auth-signup function notice:', err);
  }

  // Try 2: custom-auth edge function
  try {
    const { data, error } = await supabase.functions.invoke('custom-auth', {
      body: {
        action: 'register',
        email: cleanEmail,
        password,
        name: name?.trim() || 'Parent',
        usage_mode,
        lang: activeLang,
      },
    });

    if (!error && data?.success) {
      const token = data.session_token || data.token || data.user?.session_token;
      return {
        ...data.user,
        session_token: token,
        token: token,
        verification_code: data.verification_code || data.user?.verification_code,
      };
    }
  } catch (err) {
    console.warn('[customRegister] custom-auth function notice:', err);
  }

  // Try 3: Direct database RPC custom_signup
  const { data: rpcData, error: rpcError } = await supabase.rpc('custom_signup', {
    p_email: cleanEmail,
    p_password: password,
    p_name: name?.trim() || 'Parent',
    p_usage_mode: usage_mode || 'together',
  });

  if (rpcError) throw new Error(rpcError.message);
  if (!rpcData?.success) throw new Error(rpcData?.error || 'Registratie mislukt.');

  // Trigger verification email dispatch
  try {
    await supabase.functions.invoke('send-verification-email', {
      body: { email: cleanEmail, lang: activeLang },
    });
  } catch (mailErr) {
    console.warn('[customRegister] send-verification-email trigger notice:', mailErr);
  }

  const token = rpcData.session_token || rpcData.token || rpcData.user?.session_token;
  const userObj = rpcData.user || {
    id: rpcData.user?.id,
    email: cleanEmail,
    name: name?.trim(),
    verification_code: rpcData.verification_code,
    is_verified: false,
  };

  return {
    ...userObj,
    session_token: token,
    token: token,
    verification_code: rpcData.verification_code || userObj.verification_code,
  };
}

// 2. LOGIN USER
export async function customLogin(email, password) {
  const cleanEmail = email.toLowerCase().trim();

  // Try 1: custom-auth edge function
  try {
    const { data, error } = await supabase.functions.invoke('custom-auth', {
      body: {
        action: 'login',
        email: cleanEmail,
        password,
      },
    });

    if (!error && data?.success && data?.user) {
      return {
        ...data.user,
        session_token: data.session_token || data.token || data.user.session_token,
      };
    }
    if (data?.error && data?.needs_verification) {
      const err = new Error(data.error);
      err.needs_verification = true;
      err.email = cleanEmail;
      throw err;
    }
  } catch (err) {
    if (err?.needs_verification) throw err;
    console.warn('[customLogin] custom-auth edge function notice:', err?.message || err);
  }

  // Try 2: auth-login edge function
  try {
    const { data, error } = await supabase.functions.invoke('auth-login', {
      body: {
        email: cleanEmail,
        password,
      },
    });

    if (!error && data?.success && (data?.user || data?.profile)) {
      const token = data.session_token || data.token || data.session?.token || data.user?.session_token || data.profile?.session_token;
      const u = data.profile || data.user;
      return {
        ...u,
        session_token: token,
        token: token,
      };
    }
  } catch (err) {
    console.warn('[customLogin] auth-login edge function notice:', err?.message || err);
  }

  // Try 3: Direct database RPC custom_login (querying public.profiles)
  const { data: rpcData, error: rpcError } = await supabase.rpc('custom_login', {
    p_email: cleanEmail,
    p_password: password,
  });

  if (rpcError) throw new Error(rpcError.message);

  if (!rpcData?.success) {
    const err = new Error(rpcData?.error || 'Ongeldig e-mailadres of wachtwoord.');
    if (rpcData?.needs_verification) {
      err.needs_verification = true;
      err.email = cleanEmail;
    }
    throw err;
  }

  const token = rpcData.session?.token || rpcData.session_token || rpcData.token || rpcData.profile?.session_token || rpcData.user?.session_token;
  const userResult = rpcData.profile || rpcData.user || {};
  return {
    ...userResult,
    session_token: token,
    token: token,
  };
}

// 3. VERIFY EMAIL OTP
export async function customVerifyEmail(email, code) {
  const cleanEmail = email.toLowerCase().trim();
  const cleanCode = String(code).trim();

  // Try 1: custom-auth edge function
  try {
    const { data, error } = await supabase.functions.invoke('custom-auth', {
      body: {
        action: 'verify-email',
        email: cleanEmail,
        code: cleanCode,
      },
    });

    if (!error && data?.success) {
      const token = data.session_token || data.token || data.user?.session_token;
      return {
        ...(data.user || { email: cleanEmail }),
        session_token: token,
        token: token,
        is_verified: true,
      };
    }
  } catch (err) {
    console.warn('[customVerifyEmail] custom-auth notice:', err);
  }

  // Try 2: Direct database RPC custom_verify_email
  const { data: rpcData, error: rpcError } = await supabase.rpc('custom_verify_email', {
    p_email: cleanEmail,
    p_code: cleanCode,
  });

  if (rpcError) throw new Error(rpcError.message);
  if (!rpcData?.success) throw new Error(rpcData?.error || 'Verificatiecode ongeldig.');

  let token = rpcData.session_token || rpcData.token || rpcData.user?.session_token;
  let userObj = rpcData.user || { email: cleanEmail, is_verified: true };

  // If token is missing, fetch/generate valid JWT session token via manage-profile
  if (!token) {
    try {
      const { data: profData } = await supabase.functions.invoke('manage-profile', {
        body: { action: 'get', email: cleanEmail, user_id: userObj?.id },
      });
      if (profData?.token || profData?.session_token) {
        token = profData.token || profData.session_token;
        if (profData.profile) {
          userObj = { ...userObj, ...profData.profile };
        }
      }
    } catch (e) {
      console.warn('[customVerifyEmail] manage-profile token recovery notice:', e);
    }
  }

  return {
    ...userObj,
    session_token: token,
    token: token,
    is_verified: true,
  };
}

// 4. RESEND VERIFICATION CODE
export async function customResendVerification(email, lang) {
  const cleanEmail = email.toLowerCase().trim();
  const activeLang = getAppLanguage(lang);

  // Try 1: send-verification-email edge function
  try {
    const { data, error } = await supabase.functions.invoke('send-verification-email', {
      body: { email: cleanEmail, lang: activeLang },
    });

    if (!error && (data?.success || !data?.error)) {
      return true;
    }
  } catch (err) {
    console.warn('[customResendVerification] send-verification-email notice:', err);
  }

  // Try 2: custom-auth edge function
  try {
    const { data, error } = await supabase.functions.invoke('custom-auth', {
      body: {
        action: 'resend-verification',
        email: cleanEmail,
        lang: activeLang,
      },
    });

    if (!error && data?.success) {
      return true;
    }
  } catch (err) {
    console.warn('[customResendVerification] custom-auth notice:', err);
  }

  // Try 3: Direct database RPC custom_resend_verification
  const { data: rpcData, error: rpcError } = await supabase.rpc('custom_resend_verification', {
    p_email: cleanEmail,
  });

  if (rpcError) throw new Error(rpcError.message);
  if (!rpcData?.success) throw new Error(rpcData?.error || 'Kon geen verificatiecode verzenden.');

  return true;
}

// 5. REQUEST PASSWORD RESET OTP
export async function customRequestPasswordReset(email, lang) {
  const cleanEmail = email.toLowerCase().trim();
  const activeLang = getAppLanguage(lang);

  // Try 1: auth-reset-password edge function
  try {
    const { data, error } = await supabase.functions.invoke('auth-reset-password', {
      body: { email: cleanEmail, lang: activeLang },
    });

    if (!error && (data?.success || !data?.error)) {
      return true;
    }
  } catch (err) {
    console.warn('[customRequestPasswordReset] auth-reset-password notice:', err);
  }

  // Try 2: custom-auth edge function
  try {
    const { data, error } = await supabase.functions.invoke('custom-auth', {
      body: {
        action: 'request-password-reset',
        email: cleanEmail,
        lang: activeLang,
      },
    });

    if (!error && data?.success) {
      return true;
    }
  } catch (err) {
    console.warn('[customRequestPasswordReset] custom-auth notice:', err);
  }

  // Try 3: Direct database RPC custom_request_password_reset
  const { data: rpcData, error: rpcError } = await supabase.rpc('custom_request_password_reset', {
    p_email: cleanEmail,
  });

  if (rpcError) throw new Error(rpcError.message);
  return true;
}

// 6. VERIFY PASSWORD RESET OTP
export async function customVerifyResetOtp(email, token) {
  const cleanEmail = email.toLowerCase().trim();
  const cleanToken = String(token).trim();

  // Try 1: custom-auth edge function
  try {
    const { data, error } = await supabase.functions.invoke('custom-auth', {
      body: {
        action: 'verify-reset-otp',
        email: cleanEmail,
        token: cleanToken,
      },
    });

    if (!error && data?.success) {
      return true;
    }
  } catch (err) {
    console.warn('[customVerifyResetOtp] custom-auth notice:', err);
  }

  // Try 2: Direct database RPC custom_verify_reset_otp
  const { data: rpcData, error: rpcError } = await supabase.rpc('custom_verify_reset_otp', {
    p_email: cleanEmail,
    p_token: cleanToken,
  });

  if (rpcError) throw new Error(rpcError.message);
  if (!rpcData?.success) throw new Error(rpcData?.error || 'Ongeldige herstelcode.');

  return true;
}

// 7. COMPLETE PASSWORD RESET
export async function customResetPassword(email, token, newPassword) {
  const cleanEmail = email.toLowerCase().trim();
  const cleanToken = String(token).trim();

  // Try 1: custom-auth edge function
  try {
    const { data, error } = await supabase.functions.invoke('custom-auth', {
      body: {
        action: 'reset-password',
        email: cleanEmail,
        token: cleanToken,
        newPassword,
      },
    });

    if (!error && data?.success) {
      return true;
    }
  } catch (err) {
    console.warn('[customResetPassword] custom-auth notice:', err);
  }

  // Try 2: Direct database RPC custom_reset_password
  const { data: rpcData, error: rpcError } = await supabase.rpc('custom_reset_password', {
    p_email: cleanEmail,
    p_token: cleanToken,
    p_new_password: newPassword,
  });

  if (rpcError) throw new Error(rpcError.message);
  if (!rpcData?.success) throw new Error(rpcData?.error || 'Wachtwoord wijzigen mislukt.');

  return true;
}

// 8. LOGOUT
export async function customLogout(userId) {
  try {
    await supabase.functions.invoke('custom-auth', {
      body: { action: 'logout', user_id: userId },
    });
  } catch (err) {
    console.warn('[customLogout] custom-auth logout notice:', err);
  }
  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.warn('Supabase auth signOut notice:', err);
  }
  return true;
}

// 9. DELETE ACCOUNT (Apple Guideline compliance)
export async function customDeleteAccount(userId, confirmationText = 'DELETE') {
  if (!userId) {
    throw new Error('User ID is required for account deletion');
  }
  const { data, error } = await supabase.functions.invoke('manage-profile', {
    body: { action: 'delete', user_id: userId },
  });
  if (error || !data?.success) throw (error || new Error(data?.error || 'Account deletion failed'));
  return true;
}

// 10. UPDATE ONBOARDING
export async function updateOnboarding(userId, onboardingData) {
  const { data, error } = await supabase.functions.invoke('manage-profile', {
    body: {
      action: 'update',
      user_id: userId,
      updates: {
        onboarding_completed: true,
        ...onboardingData,
      },
    },
  });

  if (error || !data?.success) throw (error || new Error(data?.error || 'Onboarding update failed'));
  return data.profile;
}

// Backward compatibility exports
export const sendVerificationEmail = customResendVerification;
export const signInUser = customLogin;
export const signUpUser = customRegister;
export const signOutUser = customLogout;
export const verifyEmailCode = customVerifyEmail;
export const resetPassword = customRequestPasswordReset;
export const confirmPasswordReset = customResetPassword;
