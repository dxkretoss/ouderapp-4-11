import { supabase } from "@/lib/supabase";

const listeners = new Set();
let cachedMoments = [];
let isLoaded = false;

function notify() {
  listeners.forEach((fn) => {
    try {
      fn(cachedMoments);
    } catch (e) {
      console.warn("Error in moment subscriber:", e);
    }
  });
}

export function subscribeMoments(fn) {
  listeners.add(fn);
  if (isLoaded) {
    fn(cachedMoments);
  }
  return () => listeners.delete(fn);
}

export function getCachedMoments() {
  return cachedMoments;
}

export async function fetchMoments(userId) {
  if (!userId) return cachedMoments;

  try {
    const { data, error } = await supabase.functions.invoke("manage-moments", {
      body: { action: "list", user_id: userId },
    });

    if (error) {
      console.warn("fetchMoments error:", error);
      return cachedMoments;
    }

    if (data?.success && Array.isArray(data.moments)) {
      cachedMoments = data.moments;
      isLoaded = true;
      notify();
    }
    return cachedMoments;
  } catch (err) {
    console.warn("fetchMoments exception:", err);
    return cachedMoments;
  }
}

export async function createMoment(meta, photoFile) {
  try {
    let photoUrl = meta.photo_url || null;

    if (photoFile) {
      try {
        const base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(photoFile);
        });

        const { data: uploadRes, error: uploadErr } = await supabase.functions.invoke("manage-moments", {
          body: {
            action: "upload-photo",
            fileBase64: base64,
            fileName: photoFile.name,
            fileType: photoFile.type,
            userId: meta.user_id,
          },
        });

        if (!uploadErr && uploadRes?.success && uploadRes.url) {
          photoUrl = uploadRes.url;
        } else {
          console.warn("Photo upload warning:", uploadErr || uploadRes?.error);
        }
      } catch (uploadException) {
        console.error("Photo upload exception:", uploadException);
      }
    }

    const { data, error } = await supabase.functions.invoke("manage-moments", {
      body: {
        action: "create",
        user_id: meta.user_id,
        child_id: meta.child_id || null,
        title: meta.title || meta.tekst || "Moment",
        description: meta.description || meta.tekst || null,
        photo_url: photoUrl,
        is_milestone: Boolean(meta.is_milestone),
        is_private: Boolean(meta.is_private),
      },
    });

    if (error) throw error;
    if (data?.success && data.moment) {
      cachedMoments = [data.moment, ...cachedMoments];
      notify();
      return data.moment;
    }
    throw new Error(data?.error || "Failed to create moment record");
  } catch (err) {
    console.error("createMoment error:", err);
    throw err;
  }
}

export async function deleteMoment(id) {
  try {
    cachedMoments = cachedMoments.filter((m) => m.id !== id);
    notify();

    const { data, error } = await supabase.functions.invoke("manage-moments", {
      body: { action: "delete", id },
    });

    if (error) throw error;
    return data?.success;
  } catch (err) {
    console.error("deleteMoment error:", err);
    throw err;
  }
}
