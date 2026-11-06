import { createClient } from "@supabase/supabase-js";
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder";
export const isConfigured = Boolean(import.meta.env.VITE_SUPABASE_URL &&
    import.meta.env.VITE_SUPABASE_ANON_KEY &&
    !import.meta.env.VITE_SUPABASE_URL.includes("placeholder"));
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
    },
});

/**
 * Retrieves the currently active authorized session token from local storage
 */
export function getAuthToken() {
    try {
        if (typeof window === "undefined" || !window.localStorage) return null;
        const directToken = localStorage.getItem("ouderapp_auth_token");
        if (directToken) return directToken;
        const raw = localStorage.getItem("ouderapp_current_user");
        if (raw) {
            const parsed = JSON.parse(raw);
            return parsed?.session_token || parsed?.token || null;
        }
    } catch {
        // Safe fallback
    }
    return null;
}

/**
 * Interceptor for supabase.functions.invoke
 * Automatically injects the authorization token into EVERY Edge Function call:
 * 1. Request Headers: 'x-session-token'
 * 2. Request Headers: 'Authorization': 'Bearer <token>'
 * 3. Request Body: { ...body, session_token: <token> }
 */
const originalInvoke = supabase.functions.invoke.bind(supabase.functions);
supabase.functions.invoke = async function (functionName, options = {}) {
    const token = getAuthToken();
    const headers = { ...(options.headers || {}) };

    if (token) {
        headers["x-session-token"] = token;
        if (!headers["Authorization"] || headers["Authorization"].includes("placeholder")) {
            headers["Authorization"] = `Bearer ${token}`;
        }
    }

    let body = options.body;
    if (token && body && typeof body === "object" && !(body instanceof FormData) && !(body instanceof Blob)) {
        if (!body.session_token && !body.token) {
            body = { ...body, session_token: token };
        }
    }

    return originalInvoke(functionName, { ...options, headers, body });
};
