import { supabase } from "@/lib/supabase";

export async function updateProfile(userId, updates) {
  if (!userId) return null;
  try {
    const { data, error } = await supabase.functions.invoke("manage-profile", {
      body: {
        action: "update",
        user_id: userId,
        updates,
      },
    });

    if (!error && data?.success && data.profile) {
      try {
        const raw = localStorage.getItem("ouderapp_auth_profile");
        if (raw) {
          const parsed = JSON.parse(raw);
          localStorage.setItem(
            "ouderapp_auth_profile",
            JSON.stringify({ ...parsed, ...data.profile })
          );
        }
      } catch {}
      return data.profile;
    }
  } catch (err) {
    console.warn("updateProfile edge function notice:", err);
  }

  // Fallback direct table update if manage-profile is not deployed
  try {
    const { data: dbProf, error: dbErr } = await supabase
      .from("profiles")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", userId)
      .select()
      .maybeSingle();

    if (!dbErr && dbProf) {
      try {
        const raw = localStorage.getItem("ouderapp_auth_profile");
        if (raw) {
          const parsed = JSON.parse(raw);
          localStorage.setItem(
            "ouderapp_auth_profile",
            JSON.stringify({ ...parsed, ...dbProf })
          );
        }
      } catch {}
      return dbProf;
    }
  } catch (dbErr) {
    console.error("Direct updateProfile fallback error:", dbErr);
  }

  return null;
}

export async function getProfile(userId) {
  if (!userId) return null;
  try {
    const { data, error } = await supabase.functions.invoke("manage-profile", {
      body: {
        action: "get",
        user_id: userId,
      },
    });
    if (!error && data?.profile) return data.profile;
  } catch (err) {
    console.warn("getProfile edge function notice:", err);
  }

  // Fallback direct table query if manage-profile is not deployed
  try {
    const { data: dbProf, error: dbErr } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (!dbErr && dbProf) return dbProf;
  } catch (dbErr) {
    console.error("Direct getProfile fallback error:", dbErr);
  }

  return null;
}
