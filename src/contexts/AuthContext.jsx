import React, { createContext, useContext, useEffect, useState } from "react";
import { isConfigured, supabase } from "@/lib/supabase";
import {
  customLogin,
  customRegister,
  customVerifyEmail,
  customResendVerification,
  customRequestPasswordReset,
  customVerifyResetOtp,
  customResetPassword,
  customLogout,
} from "@/auth";
import { start } from "@/lib/start-store";
import { fetchChildren } from "@/lib/child-service";
import { fetchCalendarEvents } from "@/lib/calendar-service";

const AUTH_TOKEN_KEY = "ouderapp_auth_token";

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize session dynamically on startup using strictly the authorization token
  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        let token = localStorage.getItem(AUTH_TOKEN_KEY);
        let fallbackUserId = null;
        let cachedProfile = null;

        // Try reading cached profile
        try {
          const rawProfile = localStorage.getItem("ouderapp_auth_profile");
          if (rawProfile) {
            cachedProfile = JSON.parse(rawProfile);
            if (!token) token = cachedProfile.session_token || cachedProfile.token;
            if (cachedProfile.id) fallbackUserId = cachedProfile.id;
          }
        } catch {}

        // Fallback to custom session storage if token missing
        if (!token) {
          try {
            const rawCustom = localStorage.getItem("ouderapp_custom_session");
            if (rawCustom) {
              const parsed = JSON.parse(rawCustom);
              token = parsed?.session?.token || parsed?.user?.session_token || parsed?.token;
              if (parsed?.user?.id && !fallbackUserId) fallbackUserId = parsed.user.id;
            }
          } catch {}
        }

        // Decode fallbackUserId from JWT if present
        if (token && typeof token === "string" && token.includes(".")) {
          try {
            const parts = token.split(".");
            if (parts.length >= 2) {
              const rawPayload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
              const payload = JSON.parse(atob(rawPayload));
              if (payload.sub && !fallbackUserId) fallbackUserId = payload.sub;
            }
          } catch {}
        }

        if ((!token && !fallbackUserId) || !isConfigured) {
          if (mounted) setLoading(false);
          return;
        }

        // Fetch 100% dynamic, live profile directly from Supabase Edge Function: manage-profile
        let freshProfile = null;
        let activeToken = token;

        try {
          const { data, error } = await supabase.functions.invoke("manage-profile", {
            body: {
              action: "get",
              token: token || undefined,
              user_id: fallbackUserId || undefined,
            },
          });

          if (!error && data?.success && data.profile) {
            freshProfile = data.profile;
            activeToken = data.token || data.session_token || token;
          }
        } catch (edgeErr) {
          console.warn("[AuthContext] manage-profile initAuth notice:", edgeErr);
        }

        // Direct table fallback if manage-profile was unreachable
        if (!freshProfile) {
          try {
            let q = supabase.from("profiles").select("*");
            if (fallbackUserId) q = q.eq("id", fallbackUserId);
            else if (token) q = q.eq("session_token", token);
            const { data: dbProf, error: dbErr } = await q.maybeSingle();
            if (!dbErr && dbProf) {
              freshProfile = dbProf;
              activeToken = dbProf.session_token || token;
            }
          } catch (dbFallbackErr) {
            console.warn("[AuthContext] direct table fallback notice:", dbFallbackErr);
          }
        }

        // Local cache fallback so temporary network issues don't log user out
        if (!freshProfile && cachedProfile && (cachedProfile.id === fallbackUserId || Boolean(token))) {
          freshProfile = cachedProfile;
          activeToken = token;
        }

        if (freshProfile && mounted) {
          if (activeToken) {
            localStorage.setItem(AUTH_TOKEN_KEY, activeToken);
          }
          try {
            localStorage.setItem("ouderapp_auth_profile", JSON.stringify(freshProfile));
            localStorage.setItem("ouderapp_custom_session", JSON.stringify({
              user: freshProfile,
              session: { token: activeToken },
              token: activeToken,
            }));
          } catch {}

          setUser(freshProfile);
          setProfile(freshProfile);
          setSession({ user: freshProfile, token: activeToken });

          if (freshProfile.name) {
            start.zetNaam(freshProfile.name);
          }
          if (freshProfile.avatar_url) {
            start.zetOuderBeeld(freshProfile.avatar_url);
          }

          // Fetch fresh children & calendar events dynamically from Supabase
          if (freshProfile.id) {
            try {
              const [kids, events] = await Promise.all([
                fetchChildren(freshProfile.id).catch(() => []),
                fetchCalendarEvents(freshProfile.id).catch(() => []),
              ]);

              if (mounted && Array.isArray(kids)) {
                start.zetKinderen(kids);
              }

              if (mounted && Array.isArray(events) && events.length > 0) {
                const mappedEvents = events.map((e) => ({
                  id: e.id,
                  titel: e.title,
                  datum: e.start_date,
                  tijd: e.start_time || "",
                  eindtijd: e.end_time || "",
                  kind: e.child?.name || "Alle kinderen",
                  categorie: e.category || "overig",
                  locatie: e.location || "",
                  toelichting: e.description || "",
                  gedeeld: e.is_shared !== false,
                  herhaling: { freq: "geen" },
                }));
                start.zetAgenda(mappedEvents);
              }
            } catch (kErr) {
              console.warn("[AuthContext] Failed fetching initial children or events:", kErr);
            }
          }
        } else if (mounted) {
          // Token is definitively invalid, expired, or user not found; purge auth token
          localStorage.removeItem(AUTH_TOKEN_KEY);
          localStorage.removeItem("ouderapp_auth_profile");
          localStorage.removeItem("ouderapp_custom_session");
          setUser(null);
          setProfile(null);
          setSession(null);
        }
      } catch (e) {
        console.warn("Could not load dynamic auth session:", e);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    initAuth();

    return () => {
      mounted = false;
    };
  }, []);

  const signIn = async (email, password) => {
    setLoading(true);
    try {
      const loggedUser = await customLogin(email, password);
      if (!loggedUser) {
        return { error: new Error("Inloggen mislukt.") };
      }

      // Store authorization token and profile in localStorage
      const authToken = loggedUser.session_token || loggedUser.token;
      if (authToken) {
        localStorage.setItem(AUTH_TOKEN_KEY, authToken);
      }
      try {
        localStorage.setItem("ouderapp_auth_profile", JSON.stringify(loggedUser));
        localStorage.setItem("ouderapp_custom_session", JSON.stringify({
          user: loggedUser,
          session: { token: authToken },
          token: authToken,
        }));
      } catch {}

      setUser(loggedUser);
      setProfile(loggedUser);
      setSession({ user: loggedUser, token: authToken });

      if (loggedUser?.name) {
        start.zetNaam(loggedUser.name);
      }
      if (loggedUser?.avatar_url) {
        start.zetOuderBeeld(loggedUser.avatar_url);
      }

      // Dynamically populate child state and events in memory
      if (loggedUser?.id) {
        Promise.all([
          fetchChildren(loggedUser.id).catch(() => []),
          fetchCalendarEvents(loggedUser.id).catch(() => []),
        ]).then(([kids, events]) => {
          if (Array.isArray(kids)) {
            start.zetKinderen(kids);
          }
          if (Array.isArray(events) && events.length > 0) {
            const mappedEvents = events.map((e) => ({
              id: e.id,
              titel: e.title,
              datum: e.start_date,
              tijd: e.start_time || "",
              eindtijd: e.end_time || "",
              kind: e.child?.name || "Alle kinderen",
              categorie: e.category || "overig",
              locatie: e.location || "",
              toelichting: e.description || "",
              gedeeld: e.is_shared !== false,
              herhaling: { freq: "geen" },
            }));
            start.zetAgenda(mappedEvents);
          }
        });
      }

      return { error: null, data: { user: loggedUser }, profile: loggedUser };
    } catch (err) {
      const isUnverified =
        err?.needs_verification ||
        err?.email_verified === false ||
        err?.message?.includes("Email not verified") ||
        err?.message?.includes("niet geverifieerd");

      return {
        error: err,
        needsVerification: Boolean(isUnverified),
        email,
      };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email, password, name, usage_mode = "together", lang) => {
    setLoading(true);
    try {
      const registeredUser = await customRegister(email, password, name, usage_mode, lang);

      // ALWAYS store the authentication token immediately when registered so token persists on refresh
      if (registeredUser) {
        const authToken = registeredUser.session_token || registeredUser.token;
        if (authToken) {
          localStorage.setItem(AUTH_TOKEN_KEY, authToken);
        }
        try {
          localStorage.setItem("ouderapp_auth_profile", JSON.stringify(registeredUser));
          localStorage.setItem("ouderapp_custom_session", JSON.stringify({
            user: registeredUser,
            session: { token: authToken },
            token: authToken,
          }));
        } catch {}

        setUser(registeredUser);
        setProfile(registeredUser);
        setSession({ user: registeredUser, token: authToken });
        if (registeredUser.is_verified) {
          start.zetKinderen([]);
        }
      }

      return {
        error: null,
        data: { user: registeredUser },
        verificationCode: registeredUser?.verification_code,
        needsVerification: !registeredUser?.is_verified,
        message: "Account aangemaakt. Verificatiecode verzonden.",
      };
    } catch (err) {
      return { error: err };
    } finally {
      setLoading(false);
    }
  };

  const verifyEmail = async (email, code) => {
    setLoading(true);
    try {
      const verifiedUser = await customVerifyEmail(email, code);
      if (verifiedUser) {
        const authToken = verifiedUser.session_token || verifiedUser.token || localStorage.getItem(AUTH_TOKEN_KEY);
        if (authToken) {
          localStorage.setItem(AUTH_TOKEN_KEY, authToken);
        }
        const updated = {
          ...user,
          ...verifiedUser,
          is_verified: true,
          email_verified: true,
          session_token: authToken,
        };
        try {
          localStorage.setItem("ouderapp_auth_profile", JSON.stringify(updated));
          localStorage.setItem("ouderapp_custom_session", JSON.stringify({
            user: updated,
            session: { token: authToken },
            token: authToken,
          }));
        } catch {}

        setUser(updated);
        setProfile(updated);
        setSession({ user: updated, token: authToken });
        start.zetKinderen([]);
        return { error: null, success: true, user: updated, token: authToken, message: "E-mailadres succesvol geverifieerd." };
      }
      return { error: null, success: true, message: "E-mailadres succesvol geverifieerd." };
    } catch (err) {
      return { error: err };
    } finally {
      setLoading(false);
    }
  };

  const resendEmail = async (email, lang) => {
    try {
      await customResendVerification(email, lang);
      return { error: null, success: true };
    } catch (err) {
      return { error: err };
    }
  };

  const resetPassword = async (email, lang) => {
    try {
      await customRequestPasswordReset(email, lang);
      return { error: null, success: true };
    } catch (err) {
      return { error: err };
    }
  };

  const verifyResetOtp = async (email, token) => {
    try {
      const res = await customVerifyResetOtp(email, token);
      return { error: null, data: res, success: true };
    } catch (err) {
      return { error: err };
    }
  };

  const confirmResetPassword = async (email, code, newPassword) => {
    try {
      await customResetPassword(email, code, newPassword);
      return { error: null, success: true };
    } catch (err) {
      return { error: err };
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      if (user?.id) {
        await customLogout(user.id);
      }
    } finally {
      const oldId = user?.id;
      setUser(null);
      setProfile(null);
      setSession(null);
      try {
        // Remove only auth keys and purge any legacy cached entries
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem("ouderapp_auth_profile");
        localStorage.removeItem("ouderapp_current_user");
        localStorage.removeItem("ouderapp_custom_session");
        localStorage.removeItem("ouderapp_cached_children");
        localStorage.removeItem("ouderapp_pending_invite_token");
        localStorage.removeItem("onzeapp-eigen-start");
        if (oldId) {
          localStorage.removeItem(`ouderapp_cached_children_${oldId}`);
          localStorage.removeItem(`onzeapp-eigen-start_${oldId}`);
        }
      } catch {}
      start.reset();
      setLoading(false);
    }
  };

  const updateProfile = async (updates) => {
    if (!user?.id) return { error: new Error("No active user") };
    try {
      // Prioritize Edge Function: manage-profile
      const { data: edgeData, error: edgeErr } = await supabase.functions.invoke("manage-profile", {
        body: { action: "update", user_id: user.id, updates },
      });

      if (!edgeErr && edgeData?.success && edgeData.profile) {
        const merged = { ...user, ...edgeData.profile };
        // Memory state update only; zero data stored in localStorage
        setUser(merged);
        setProfile(merged);
        return { data: edgeData.profile, error: null };
      }

      // Direct table fallback
      const { data, error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user.id)
        .select()
        .single();

      if (!error && data) {
        const merged = { ...user, ...data };
        setUser(merged);
        setProfile(merged);
      }
      return { data, error };
    } catch (err) {
      return { error: err };
    }
  };

  const refreshProfile = async () => {
    if (!user?.id || !isConfigured) return;
    try {
      const { data, error } = await supabase.functions.invoke("manage-profile", {
        body: { action: "get", user_id: user.id },
      });

      if (!error && data?.success && data.profile) {
        const merged = { ...user, ...data.profile };
        // Memory state update only; zero data stored in localStorage
        setUser(merged);
        setProfile(merged);
      }

      const kids = await fetchChildren(user.id);
      if (Array.isArray(kids)) {
        start.zetKinderen(kids);
      }
    } catch (err) {
      console.warn("refreshProfile error:", err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        isConfigured,
        signIn,
        signUp,
        signOut,
        verifyEmail,
        resendEmail,
        resetPassword,
        verifyResetOtp,
        confirmResetPassword,
        updateProfile,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
