import { supabase, isConfigured } from "@/lib/supabase";
import { start } from "@/lib/start-store";

export function isUUID(str) {
  return typeof str === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
}

/**
 * Universal Child Management Service (Database-First)
 * Directly interacts with Supabase backend (Edge Function -> RPC -> direct PostgreSQL table queries).
 * Does NOT cache children in localStorage.
 */

export async function fetchChildren(parentId) {
  let dbChildren = [];

  if (isConfigured && parentId) {
    // 1. Try Edge Function: manage-children
    try {
      const { data, error } = await supabase.functions.invoke("manage-children", {
        body: { action: "list", parent_id: parentId },
      });

      if (!error && data?.success && Array.isArray(data.children)) {
        dbChildren = data.children.map(mapChildFromDb);
        return dbChildren;
      }
    } catch (edgeErr) {
      console.warn("[child-service] manage-children Edge Function notice:", edgeErr);
    }

    // 2. Fallback: PostgreSQL RPC
    try {
      const { data, error } = await supabase.rpc("custom_get_my_children", {
        p_parent_id: parentId,
      });

      if (!error && data?.success && Array.isArray(data.children)) {
        dbChildren = data.children.map(mapChildFromDb);
        return dbChildren;
      }
    } catch {
      // RPC not found or offline
    }
  }
  return dbChildren;

  return [];
}

export async function createChild(parentId, childData) {
  const {
    naam,
    achternaam = "",
    geboortedatum = "",
    avatar = null,
    school = "",
    opvang = "",
    arts = "",
    medisch = "",
    kledingmaat = "",
    schoenmaat = "",
    allergieen = "",
    dieet = "",
    kleur = "#3C6E71",
  } = childData;

  let createdChild = null;

  if (isConfigured && parentId) {
    // 1. Try Edge Function: manage-children
    try {
      const { data, error } = await supabase.functions.invoke("manage-children", {
        body: {
          action: "create",
          parent_id: parentId,
          name: naam.trim(),
          last_name: achternaam.trim() || null,
          date_of_birth: geboortedatum || null,
          avatar_url: avatar || null,
          school: school.trim() || null,
          daycare: opvang.trim() || null,
          doctor: arts.trim() || null,
          medical_notes: medisch.trim() || null,
          clothes_size: kledingmaat.trim() || null,
          shoe_size: schoenmaat.trim() || null,
          allergies: allergieen.trim() || null,
          dietary_notes: dieet.trim() || null,
          color_code: kleur || "#3C6E71",
        },
      });

      if (!error && data?.success && data.child) {
        createdChild = mapChildFromDb(data.child);
      }
    } catch (edgeErr) {
      console.warn("[child-service] manage-children Edge Function create notice:", edgeErr);
    }

    // 2. Fallback: PostgreSQL RPC
    if (!createdChild) {
      try {
        const { data, error } = await supabase.rpc("custom_create_child", {
          p_parent_id: parentId,
          p_name: naam.trim(),
          p_last_name: achternaam.trim() || null,
          p_date_of_birth: geboortedatum || null,
          p_avatar_url: avatar || null,
          p_school: school.trim() || null,
          p_daycare: opvang.trim() || null,
          p_doctor: arts.trim() || null,
          p_medical_notes: medisch.trim() || null,
          p_clothes_size: kledingmaat.trim() || null,
          p_shoe_size: schoenmaat.trim() || null,
          p_allergies: allergieen.trim() || null,
          p_dietary_notes: dieet.trim() || null,
          p_color_code: kleur || "#3C6E71",
        });

        if (!error && data?.success && data.child) {
          createdChild = mapChildFromDb(data.child);
        }
      } catch (rpcErr) {
        console.warn("[child-service] custom_create_child RPC notice:", rpcErr);
      }
    }
  }

  // Fallback if DB is offline or parentId not provided
  if (!createdChild) {
    createdChild = {
      id: `child-${Date.now()}`,
      naam: naam.trim(),
      achternaam: achternaam.trim(),
      geboortedatum: geboortedatum || undefined,
      avatar: avatar || null,
      school: school.trim(),
      opvang: opvang.trim(),
      arts: arts.trim(),
      medisch: medisch.trim(),
      kledingmaat: kledingmaat.trim(),
      schoenmaat: schoenmaat.trim(),
      allergieen: allergieen.trim(),
      dieet: dieet.trim(),
      kleur,
      kanBewerken: true,
      rol: "parent",
    };
  }

  // Update in-memory reactive store
  start.kindToevoegen(
    createdChild.naam,
    createdChild.geboortedatum,
    createdChild.id,
    createdChild.achternaam,
    createdChild
  );

  return createdChild;
}

export async function updateChild(childId, parentId, childData) {
  if (isConfigured && parentId && childId) {
    // 1. Try Edge Function
    if (isUUID(childId)) {
      try {
        await supabase.functions.invoke("manage-children", {
          body: {
            action: "update",
            child_id: childId,
            parent_id: parentId,
            updates: {
              name: childData.naam ? childData.naam.trim() : undefined,
              last_name: childData.achternaam !== undefined ? (childData.achternaam.trim() || null) : undefined,
              date_of_birth: childData.geboortedatum || undefined,
              avatar_url: childData.avatar || undefined,
              school: childData.school !== undefined ? childData.school.trim() : undefined,
              daycare: childData.opvang !== undefined ? childData.opvang.trim() : undefined,
              doctor: childData.arts !== undefined ? childData.arts.trim() : undefined,
              medical_notes: childData.medisch !== undefined ? childData.medisch.trim() : undefined,
              clothes_size: childData.kledingmaat !== undefined ? childData.kledingmaat.trim() : undefined,
              shoe_size: childData.schoenmaat !== undefined ? childData.schoenmaat.trim() : undefined,
              allergies: childData.allergieen !== undefined ? childData.allergieen.trim() : undefined,
              dietary_notes: childData.dieet !== undefined ? childData.dieet.trim() : undefined,
              color_code: childData.kleur || undefined,
              care_schedule: childData.care_schedule !== undefined ? childData.care_schedule : undefined,
            },
          },
        });
      } catch {
        // Fallback: RPC
        try {
          await supabase.rpc("custom_update_child", {
            p_child_id: childId,
            p_parent_id: parentId,
            p_name: childData.naam ? childData.naam.trim() : null,
            p_last_name: childData.achternaam !== undefined ? (childData.achternaam.trim() || null) : null,
            p_date_of_birth: childData.geboortedatum || null,
            p_avatar_url: childData.avatar || null,
            p_school: childData.school ? childData.school.trim() : null,
            p_daycare: childData.opvang ? childData.opvang.trim() : null,
            p_doctor: childData.arts ? childData.arts.trim() : null,
            p_medical_notes: childData.medisch ? childData.medisch.trim() : null,
            p_care_schedule: childData.care_schedule !== undefined ? childData.care_schedule : null,
            p_clothes_size: childData.kledingmaat ? childData.kledingmaat.trim() : null,
            p_shoe_size: childData.schoenmaat ? childData.schoenmaat.trim() : null,
            p_allergies: childData.allergieen ? childData.allergieen.trim() : null,
            p_dietary_notes: childData.dieet ? childData.dieet.trim() : null,
            p_color_code: childData.kleur || null,
          });
        } catch (err) {
          console.warn("[child-service] updateChild RPC error:", err);
        }
      }
    }
  }

  // Update in-memory reactive store
  start.kindBijwerken(childId, childData);
}

/**
 * Upload child avatar to Supabase storage bucket ('child-avatars')
 */
export async function uploadChildAvatar(file, parentId) {
  if (!file) throw new Error("No file provided");
  if (!file.type.startsWith("image/")) {
    throw new Error("Only image files are allowed.");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Image size must be less than 5MB.");
  }

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const safeExt = ["jpg", "jpeg", "png", "webp", "gif"].includes(ext) ? ext : "jpg";
  const fileName = `${parentId || "shared"}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${safeExt}`;

  let targetBucket = "child-avatars";
  let { error: uploadErr } = await supabase.storage
    .from(targetBucket)
    .upload(fileName, file, {
      cacheControl: "3600",
      upsert: true,
      contentType: file.type,
    });

  if (uploadErr && uploadErr.message?.toLowerCase().includes("not found")) {
    targetBucket = "avatars";
    const res = await supabase.storage.from(targetBucket).upload(fileName, file, {
      cacheControl: "3600",
      upsert: true,
      contentType: file.type,
    });
    uploadErr = res.error;
  }

  if (uploadErr) {
    throw new Error(uploadErr.message || "Failed to upload avatar image.");
  }

  const { data } = supabase.storage.from(targetBucket).getPublicUrl(fileName);
  return data.publicUrl;
}

/**
 * Remove child avatar from Supabase storage bucket
 */
export async function deleteChildAvatarFromStorage(avatarUrl) {
  if (!avatarUrl || typeof avatarUrl !== "string") return;
  if (avatarUrl.startsWith("data:") || avatarUrl.startsWith("blob:") || !avatarUrl.includes("supabase")) {
    return;
  }

  try {
    const match = avatarUrl.match(/(?:child-avatars|avatars)\/(.+)$/);
    if (match && match[1]) {
      const rawPath = decodeURIComponent(match[1].split("?")[0]);
      await Promise.allSettled([
        supabase.storage.from("child-avatars").remove([rawPath]),
        supabase.storage.from("avatars").remove([rawPath]),
      ]);
    }
  } catch (err) {
    console.warn("[child-service] Failed to delete child avatar from storage:", err);
  }
}

export async function deleteChild(childId, parentId, childName = null) {
  const isIdUUID = isUUID(childId);


  // 1. Reactive in-memory deletion
  if (childId) start.kindVerwijderen(childId);
  if (childName) start.kindVerwijderen(childName);

  // 2. Remote database deletion
  if (isConfigured) {
    if (isIdUUID) {
      try {
        await supabase.functions.invoke("manage-children", {
          body: {
            action: "delete",
            child_id: childId,
            parent_id: parentId,
            child_name: childName,
          },
        });
      } catch (edgeErr) {
        console.warn("[child-service] deleteChild Edge Function notice:", edgeErr);
      }
    }

  }
}

export async function getChild(childId, parentId = null) {
  if (isConfigured && childId) {
    if (isUUID(childId)) {
      try {
        const { data, error } = await supabase.functions.invoke("manage-children", {
          body: { action: "get", child_id: childId, parent_id: parentId },
        });
        if (!error && data?.success && data.child) {
          return mapChildFromDb(data.child, parentId);
        }
      } catch (err) {
        console.warn("[child-service] getChild Edge Function error:", err);
      }
    }
  }

  return null;
}

export async function updateUsageMode(userId, usageMode) {
  if (isConfigured && userId) {
    try {
      const { data, error } = await supabase.functions.invoke("manage-children", {
        body: { action: "update_usage_mode", user_id: userId, usage_mode: usageMode },
      });
      if (!error && data?.success) {
        return true;
      }
    } catch (err) {
      console.warn("[child-service] updateUsageMode Edge Function error:", err);
    }
  }
  return false;
}

function mapChildFromDb(c, currentUserId = null) {
  if (!currentUserId && typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("ouderapp_current_user");
      if (raw) currentUserId = JSON.parse(raw)?.id;
    } catch {}
  }
  let parsedCustody = null;
  let privateNote = "";
  if (c.practical_notes) {
    try {
      const p = typeof c.practical_notes === "string" ? JSON.parse(c.practical_notes) : c.practical_notes;
      parsedCustody = p?.custody || null;
      if (currentUserId && p?.private_notes && typeof p.private_notes === "object") {
        privateNote = p.private_notes[currentUserId] || "";
      }
    } catch {}
  }

  return {
    id: c.id,
    naam: c.name || c.naam || c.first_name || "",
    name: c.name || c.naam || c.first_name || "",
    first_name: c.first_name || c.name || c.naam || "",
    achternaam: c.last_name || c.achternaam || "",
    geboortedatum: c.date_of_birth || "",
    avatar: c.avatar_url || null,
    school: c.school || "",
    opvang: c.daycare || "",
    arts: c.doctor || "",
    medisch: c.medical_notes || "",
    kledingmaat: c.clothes_size || "",
    schoenmaat: c.shoe_size || "",
    allergieen: c.allergies || "",
    dieet: c.dietary_notes || "",
    kleur: c.color_code || "#3C6E71",
    kanBewerken: c.can_edit ?? true,
    rol: c.role || "parent",
    care_schedule: c.care_schedule || null,
    custody: parsedCustody,
    privateNote,
  };
}

/**
 * Persist custody arrangement directly to Supabase children table (practical_notes column)
 */
export async function saveCustody(custodyValue, parentId, targetChildId = null) {
  if (isConfigured && parentId) {
    try {
      await supabase.functions.invoke("manage-children", {
        body: {
          action: "save_custody",
          parent_id: parentId,
          child_id: targetChildId,
          custody: custodyValue,
        },
      });
    } catch (err) {
      console.warn("[child-service] saveCustody error:", err);
    }
  }
}

/**
 * Persist personal note (strictly private to parentId) via manage-children Edge Function
 */
export async function savePrivateNote(childId, parentId, noteText) {
  if (isConfigured && childId && parentId) {
    try {
      const { data, error } = await supabase.functions.invoke("manage-children", {
        body: {
          action: "save_private_note",
          parent_id: parentId,
          child_id: childId,
          note: noteText,
        },
      });
      return !error && data?.success;
    } catch (err) {
      console.warn("[child-service] savePrivateNote error:", err);
      return false;
    }
  }
  return false;
}

/**
 * Persist weekly care schedule via manage-children Edge Function
 */
export async function saveCareSchedule(scheduleData, parentId, targetChildId = null) {
  const scheduleStr =
    scheduleData === null
      ? null
      : typeof scheduleData === "string"
      ? scheduleData
      : JSON.stringify(scheduleData);

  if (isConfigured && parentId) {
    try {
      await supabase.functions.invoke("manage-children", {
        body: {
          action: "save_schedule",
          parent_id: parentId,
          child_id: targetChildId,
          schedule: scheduleStr,
        },
      });
    } catch (err) {
      console.warn("[child-service] saveCareSchedule notice:", err);
    }
  }

  // Update reactive local state
  const cleanSchedule =
    scheduleData === null
      ? null
      : typeof scheduleData === "string"
      ? JSON.parse(scheduleData)
      : scheduleData;

  if (targetChildId && targetChildId !== "all") {
    start.zetKindRegeling(targetChildId, cleanSchedule);
  } else {
    start.zetKindRegeling("all", cleanSchedule);
  }
  return true;
}
