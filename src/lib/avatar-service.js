import { supabase, isConfigured } from "@/lib/supabase";

/**
 * Avatar & Profile Picture Service
 * Supports:
 * 1. Uploading custom photos to Supabase Storage ('avatars' and 'child-avatars' buckets)
 * 2. Automatic cleanup of old images from storage when a new image is uploaded or deleted
 * 3. Curated, lightweight SVG avatar presets for both parents and children
 */

function makeSvgUri(svgString) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svgString.trim())}`;
}

// --- PARENT AVATAR PRESETS ---
export const PARENT_AVATARS = [
  {
    id: "parent-1",
    label: "Warm Teal",
    url: makeSvgUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="50" fill="#3C6E71"/>
        <circle cx="50" cy="38" r="18" fill="#F4ECE1"/>
        <path d="M32 32 C32 20, 68 20, 68 32 C68 35, 65 37, 65 37 C65 37, 50 32, 35 37 Z" fill="#284B63"/>
        <circle cx="44" cy="38" r="2" fill="#284B63"/>
        <circle cx="56" cy="38" r="2" fill="#284B63"/>
        <path d="M46 45 Q50 49 54 45" stroke="#284B63" stroke-width="2" fill="none" stroke-linecap="round"/>
        <path d="M22 88 C22 66, 36 60, 50 60 C64 60, 78 66, 78 88 Z" fill="#D9DCD6"/>
        <path d="M44 60 L50 70 L56 60 Z" fill="#F4ECE1"/>
      </svg>
    `),
  },
  {
    id: "parent-2",
    label: "Coral Waves",
    url: makeSvgUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="50" fill="#E07A5F"/>
        <circle cx="50" cy="40" r="17" fill="#F8EDEB"/>
        <path d="M30 40 C30 20, 70 20, 70 40 C70 50, 67 52, 65 52 C63 44, 63 36, 50 36 C37 36, 37 44, 35 52 C33 52, 30 50, 30 40 Z" fill="#3D405B"/>
        <circle cx="45" cy="41" r="2" fill="#3D405B"/>
        <circle cx="55" cy="41" r="2" fill="#3D405B"/>
        <path d="M46 48 Q50 52 54 48" stroke="#3D405B" stroke-width="2" fill="none" stroke-linecap="round"/>
        <path d="M24 88 C24 68, 37 62, 50 62 C63 62, 76 68, 76 88 Z" fill="#81B29A"/>
      </svg>
    `),
  },
  {
    id: "parent-3",
    label: "Indigo Glasses",
    url: makeSvgUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="50" fill="#2B3A67"/>
        <circle cx="50" cy="38" r="18" fill="#FDE2E4"/>
        <path d="M32 30 C32 18, 68 18, 68 30 C64 26, 36 26, 32 30 Z" fill="#495057"/>
        <!-- Glasses -->
        <circle cx="43" cy="38" r="6" stroke="#2B3A67" stroke-width="2" fill="none"/>
        <circle cx="57" cy="38" r="6" stroke="#2B3A67" stroke-width="2" fill="none"/>
        <line x1="49" y1="38" x2="51" y2="38" stroke="#2B3A67" stroke-width="2"/>
        <circle cx="43" cy="38" r="1.5" fill="#2B3A67"/>
        <circle cx="57" cy="38" r="1.5" fill="#2B3A67"/>
        <path d="M47 46 Q50 49 53 46" stroke="#2B3A67" stroke-width="2" fill="none" stroke-linecap="round"/>
        <path d="M22 88 C22 66, 36 60, 50 60 C64 60, 78 66, 78 88 Z" fill="#F4A261"/>
      </svg>
    `),
  },
  {
    id: "parent-4",
    label: "Amber Curls",
    url: makeSvgUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="50" fill="#E9C46A"/>
        <!-- Curly hair volume -->
        <circle cx="34" cy="32" r="10" fill="#264653"/>
        <circle cx="66" cy="32" r="10" fill="#264653"/>
        <circle cx="50" cy="24" r="12" fill="#264653"/>
        <circle cx="50" cy="40" r="17" fill="#E8C39E"/>
        <circle cx="44" cy="40" r="2" fill="#264653"/>
        <circle cx="56" cy="40" r="2" fill="#264653"/>
        <path d="M45 47 Q50 51 55 47" stroke="#264653" stroke-width="2" fill="none" stroke-linecap="round"/>
        <path d="M24 88 C24 68, 37 62, 50 62 C63 62, 76 68, 76 88 Z" fill="#2A9D8F"/>
      </svg>
    `),
  },
  {
    id: "parent-5",
    label: "Sage Green",
    url: makeSvgUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="50" fill="#588157"/>
        <circle cx="50" cy="38" r="18" fill="#F8EDEB"/>
        <path d="M31 34 C31 20, 69 20, 69 34 C64 28, 36 28, 31 34 Z" fill="#343A40"/>
        <path d="M38 46 C42 54, 58 54, 62 46 Z" fill="#343A40"/>
        <circle cx="44" cy="36" r="2" fill="#343A40"/>
        <circle cx="56" cy="36" r="2" fill="#343A40"/>
        <path d="M46 42 Q50 45 54 42" stroke="#F8EDEB" stroke-width="1.5" fill="none" stroke-linecap="round"/>
        <path d="M22 88 C22 66, 36 60, 50 60 C64 60, 78 66, 78 88 Z" fill="#344E41"/>
      </svg>
    `),
  },
  {
    id: "parent-6",
    label: "Rose Bun",
    url: makeSvgUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="50" fill="#D4A373"/>
        <circle cx="50" cy="18" r="8" fill="#6B4226"/>
        <circle cx="50" cy="42" r="17" fill="#FCEADE"/>
        <path d="M33 38 C33 24, 67 24, 67 38 C67 38, 55 30, 33 38 Z" fill="#6B4226"/>
        <circle cx="44" cy="42" r="2" fill="#6B4226"/>
        <circle cx="56" cy="42" r="2" fill="#6B4226"/>
        <path d="M46 49 Q50 53 54 49" stroke="#6B4226" stroke-width="2" fill="none" stroke-linecap="round"/>
        <path d="M24 88 C24 68, 37 62, 50 62 C63 62, 76 68, 76 88 Z" fill="#CCD5AE"/>
      </svg>
    `),
  },
  {
    id: "parent-7",
    label: "Sunny Sky",
    url: makeSvgUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="50" fill="#4EA8DE"/>
        <circle cx="50" cy="38" r="18" fill="#FCEADE"/>
        <path d="M31 34 C31 16, 69 16, 69 34 C63 24, 37 24, 31 34 Z" fill="#5E503F"/>
        <circle cx="43" cy="38" r="2" fill="#5E503F"/>
        <circle cx="57" cy="38" r="2" fill="#5E503F"/>
        <path d="M45 46 Q50 50 55 46" stroke="#5E503F" stroke-width="2" fill="none" stroke-linecap="round"/>
        <path d="M22 88 C22 66, 36 60, 50 60 C64 60, 78 66, 78 88 Z" fill="#5E503F"/>
      </svg>
    `),
  },
  {
    id: "parent-8",
    label: "Soft Plum",
    url: makeSvgUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="50" fill="#9B5DE5"/>
        <circle cx="50" cy="40" r="18" fill="#FCEADE"/>
        <path d="M30 40 C30 22, 70 22, 70 40 C65 30, 35 30, 30 40 Z" fill="#1D3557"/>
        <circle cx="44" cy="40" r="2" fill="#1D3557"/>
        <circle cx="56" cy="40" r="2" fill="#1D3557"/>
        <path d="M46 47 Q50 51 54 47" stroke="#1D3557" stroke-width="2" fill="none" stroke-linecap="round"/>
        <path d="M22 88 C22 68, 36 62, 50 62 C64 62, 78 68, 78 88 Z" fill="#F15BB5"/>
      </svg>
    `),
  },
];

// --- CHILD AVATAR PRESETS ---
export const CHILD_AVATARS = [
  {
    id: "child-lion",
    label: "Leeuwtje",
    url: makeSvgUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="50" fill="#F4A261"/>
        <!-- Mane -->
        <circle cx="50" cy="50" r="34" fill="#E76F51"/>
        <!-- Face -->
        <circle cx="50" cy="50" r="24" fill="#E9C46A"/>
        <!-- Ears -->
        <circle cx="34" cy="30" r="6" fill="#E76F51"/>
        <circle cx="66" cy="30" r="6" fill="#E76F51"/>
        <!-- Eyes -->
        <circle cx="43" cy="46" r="3" fill="#264653"/>
        <circle cx="57" cy="46" r="3" fill="#264653"/>
        <circle cx="44" cy="45" r="1" fill="#FFFFFF"/>
        <circle cx="58" cy="45" r="1" fill="#FFFFFF"/>
        <!-- Nose & Mouth -->
        <polygon points="50,53 47,49 53,49" fill="#E76F51"/>
        <path d="M46 56 Q50 60 54 56" stroke="#264653" stroke-width="2" fill="none" stroke-linecap="round"/>
        <!-- Cheeks -->
        <circle cx="38" cy="52" r="3" fill="#E76F51" opacity="0.5"/>
        <circle cx="62" cy="52" r="3" fill="#E76F51" opacity="0.5"/>
      </svg>
    `),
  },
  {
    id: "child-bear",
    label: "Beertje",
    url: makeSvgUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="50" fill="#D4A373"/>
        <!-- Ears -->
        <circle cx="32" cy="32" r="10" fill="#8D5B4C"/>
        <circle cx="32" cy="32" r="5" fill="#FAEDCD"/>
        <circle cx="68" cy="32" r="10" fill="#8D5B4C"/>
        <circle cx="68" cy="32" r="5" fill="#FAEDCD"/>
        <!-- Head -->
        <circle cx="50" cy="52" r="28" fill="#8D5B4C"/>
        <!-- Snout -->
        <ellipse cx="50" cy="58" rx="13" ry="10" fill="#FAEDCD"/>
        <!-- Nose & Mouth -->
        <ellipse cx="50" cy="54" rx="4" ry="3" fill="#3D261D"/>
        <path d="M47 60 Q50 63 53 60" stroke="#3D261D" stroke-width="2" fill="none" stroke-linecap="round"/>
        <!-- Eyes -->
        <circle cx="41" cy="46" r="2.5" fill="#FAEDCD"/>
        <circle cx="59" cy="46" r="2.5" fill="#FAEDCD"/>
      </svg>
    `),
  },
  {
    id: "child-rocket",
    label: "Raket",
    url: makeSvgUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="50" fill="#1D3557"/>
        <!-- Stars -->
        <circle cx="25" cy="25" r="1.5" fill="#E9C46A"/>
        <circle cx="75" cy="30" r="1.5" fill="#E9C46A"/>
        <circle cx="30" cy="70" r="1.5" fill="#E9C46A"/>
        <circle cx="72" cy="68" r="2" fill="#E9C46A"/>
        <!-- Wings -->
        <path d="M36 55 L28 68 L42 66 Z" fill="#E63946"/>
        <path d="M64 55 L72 68 L58 66 Z" fill="#E63946"/>
        <!-- Body -->
        <path d="M50 20 C42 35 40 55 42 68 L58 68 C60 55 58 35 50 20 Z" fill="#F1FAEE"/>
        <!-- Nose cone -->
        <path d="M50 20 C46 27 44 34 44 36 L56 36 C56 34 54 27 50 20 Z" fill="#E63946"/>
        <!-- Window -->
        <circle cx="50" cy="45" r="6" fill="#A8DADC" stroke="#457B9D" stroke-width="2"/>
        <!-- Flame -->
        <polygon points="46,68 50,82 54,68" fill="#F4A261"/>
        <polygon points="48,68 50,76 52,68" fill="#E76F51"/>
      </svg>
    `),
  },
  {
    id: "child-fox",
    label: "Vosje",
    url: makeSvgUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="50" fill="#81B29A"/>
        <!-- Ears -->
        <polygon points="30,48 24,20 44,34" fill="#E07A5F"/>
        <polygon points="28,42 26,24 38,34" fill="#3D405B"/>
        <polygon points="70,48 76,20 56,34" fill="#E07A5F"/>
        <polygon points="72,42 74,24 62,34" fill="#3D405B"/>
        <!-- Head -->
        <polygon points="26,45 74,45 50,78" fill="#E07A5F"/>
        <!-- White cheeks -->
        <polygon points="26,45 42,45 50,72 34,60" fill="#F4F1DE"/>
        <polygon points="74,45 58,45 50,72 66,60" fill="#F4F1DE"/>
        <!-- Eyes -->
        <circle cx="38" cy="46" r="2.5" fill="#3D405B"/>
        <circle cx="62" cy="46" r="2.5" fill="#3D405B"/>
        <!-- Nose -->
        <circle cx="50" cy="74" r="3.5" fill="#3D405B"/>
      </svg>
    `),
  },
  {
    id: "child-dino",
    label: "Dino",
    url: makeSvgUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="50" fill="#588157"/>
        <!-- Spikes -->
        <polygon points="36,25 40,16 46,26" fill="#A3B18A"/>
        <polygon points="48,24 53,15 58,25" fill="#A3B18A"/>
        <polygon points="60,25 65,18 69,28" fill="#A3B18A"/>
        <!-- Head -->
        <ellipse cx="50" cy="48" rx="26" ry="24" fill="#3A5A40"/>
        <!-- Snout -->
        <ellipse cx="50" cy="58" rx="18" ry="12" fill="#344E41"/>
        <!-- Nostrils -->
        <circle cx="45" cy="56" r="1.5" fill="#A3B18A"/>
        <circle cx="55" cy="56" r="1.5" fill="#A3B18A"/>
        <!-- Big Eyes -->
        <circle cx="40" cy="42" r="6" fill="#DAD7CD"/>
        <circle cx="40" cy="42" r="3" fill="#344E41"/>
        <circle cx="60" cy="42" r="6" fill="#DAD7CD"/>
        <circle cx="60" cy="42" r="3" fill="#344E41"/>
        <!-- Smile -->
        <path d="M44 63 Q50 67 56 63" stroke="#DAD7CD" stroke-width="2" fill="none" stroke-linecap="round"/>
      </svg>
    `),
  },
  {
    id: "child-star",
    label: "Sterretje",
    url: makeSvgUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="50" fill="#3A0CA3"/>
        <!-- Cute Smiling Star -->
        <polygon points="50,18 58,36 78,38 63,52 68,72 50,61 32,72 37,52 22,38 42,36" fill="#F72585"/>
        <polygon points="50,22 57,37 73,39 61,51 65,67 50,58 35,67 39,51 27,39 43,37" fill="#4CC9F0"/>
        <!-- Eyes -->
        <circle cx="45" cy="47" r="2.5" fill="#1B1B1E"/>
        <circle cx="55" cy="47" r="2.5" fill="#1B1B1E"/>
        <circle cx="46" cy="46" r="1" fill="#FFFFFF"/>
        <circle cx="56" cy="46" r="1" fill="#FFFFFF"/>
        <!-- Smile -->
        <path d="M47 52 Q50 56 53 52" stroke="#1B1B1E" stroke-width="2" fill="none" stroke-linecap="round"/>
        <!-- Cheeks -->
        <circle cx="41" cy="51" r="2" fill="#F72585"/>
        <circle cx="59" cy="51" r="2" fill="#F72585"/>
      </svg>
    `),
  },
  {
    id: "child-panda",
    label: "Panda",
    url: makeSvgUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="50" fill="#2A9D8F"/>
        <!-- Ears -->
        <circle cx="32" cy="30" r="9" fill="#264653"/>
        <circle cx="68" cy="30" r="9" fill="#264653"/>
        <!-- Face -->
        <circle cx="50" cy="52" r="26" fill="#FFFFFF"/>
        <!-- Eye Patches -->
        <ellipse cx="40" cy="48" rx="6" ry="8" fill="#264653" transform="rotate(-15 40 48)"/>
        <ellipse cx="60" cy="48" rx="6" ry="8" fill="#264653" transform="rotate(15 60 48)"/>
        <!-- Eyes -->
        <circle cx="41" cy="47" r="2" fill="#FFFFFF"/>
        <circle cx="59" cy="47" r="2" fill="#FFFFFF"/>
        <!-- Nose & Mouth -->
        <ellipse cx="50" cy="56" rx="4" ry="2.5" fill="#264653"/>
        <path d="M46 61 Q50 64 54 61" stroke="#264653" stroke-width="2" fill="none" stroke-linecap="round"/>
      </svg>
    `),
  },
  {
    id: "child-cat",
    label: "Katje",
    url: makeSvgUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="50" fill="#F72585"/>
        <!-- Ears -->
        <polygon points="32,46 26,22 46,36" fill="#7209B7"/>
        <polygon points="30,42 28,26 42,36" fill="#FDE2E4"/>
        <polygon points="68,46 74,22 54,36" fill="#7209B7"/>
        <polygon points="70,42 72,26 58,36" fill="#FDE2E4"/>
        <!-- Head -->
        <circle cx="50" cy="52" r="26" fill="#7209B7"/>
        <!-- Eyes -->
        <circle cx="41" cy="48" r="3" fill="#4CC9F0"/>
        <circle cx="59" cy="48" r="3" fill="#4CC9F0"/>
        <circle cx="42" cy="47" r="1" fill="#FFFFFF"/>
        <circle cx="60" cy="47" r="1" fill="#FFFFFF"/>
        <!-- Nose -->
        <polygon points="50,56 47,53 53,53" fill="#F72585"/>
        <!-- Whiskers -->
        <line x1="28" y1="52" x2="38" y2="54" stroke="#FDE2E4" stroke-width="1.5" stroke-linecap="round"/>
        <line x1="28" y1="58" x2="38" y2="57" stroke="#FDE2E4" stroke-width="1.5" stroke-linecap="round"/>
        <line x1="72" y1="52" x2="62" y2="54" stroke="#FDE2E4" stroke-width="1.5" stroke-linecap="round"/>
        <line x1="72" y1="58" x2="62" y2="57" stroke="#FDE2E4" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    `),
  },
];

/**
 * Upload a profile picture (parent or child) to Supabase Storage
 * @param {File} file
 * @param {string} entityId (e.g. userId or childId)
 * @param {"avatars"|"child-avatars"} preferredBucket
 * @returns {Promise<string>} publicUrl
 */
export async function uploadAvatarToStorage(file, entityId = "user", preferredBucket = "avatars") {
  if (!file) throw new Error("No file selected.");
  if (!file.type || !file.type.startsWith("image/")) {
    throw new Error("Only image files (PNG, JPG, WebP, GIF) are allowed.");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Image must be smaller than 5MB.");
  }

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const safeExt = ["jpg", "jpeg", "png", "webp", "gif"].includes(ext) ? ext : "jpg";
  const path = `${entityId}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${safeExt}`;

  let targetBucket = preferredBucket;

  if (isConfigured) {
    let { error } = await supabase.storage
      .from(targetBucket)
      .upload(path, file, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type,
      });

    // Fallback between avatars and child-avatars if one bucket is missing
    if (error && (error.message?.includes("not found") || error.statusCode === "404")) {
      targetBucket = targetBucket === "avatars" ? "child-avatars" : "avatars";
      const retry = await supabase.storage
        .from(targetBucket)
        .upload(path, file, {
          cacheControl: "3600",
          upsert: true,
          contentType: file.type,
        });
      error = retry.error;
    }

    if (error) {
      console.error("[avatar-service] upload error:", error);
      throw new Error(error.message || "Failed to upload avatar image.");
    }

    const { data } = supabase.storage.from(targetBucket).getPublicUrl(path);
    return data.publicUrl;
  }

  // Fallback demo local object URL
  return URL.createObjectURL(file);
}

/**
 * Delete an image from Supabase Storage by its public URL
 * Avoids storing unreferenced/orphaned images when a user updates or removes their avatar
 * @param {string} avatarUrl
 */
export async function deleteAvatarFromStorage(avatarUrl) {
  if (!avatarUrl || typeof avatarUrl !== "string") return;

  // Never attempt to delete SVG presets, data URIs, or external links
  if (avatarUrl.startsWith("data:") || avatarUrl.startsWith("blob:") || !avatarUrl.includes("supabase")) {
    return;
  }

  try {
    const match = avatarUrl.match(/(?:child-avatars|avatars)\/(.+)$/);
    if (match && match[1]) {
      const rawPath = decodeURIComponent(match[1].split("?")[0]);
      await Promise.allSettled([
        supabase.storage.from("avatars").remove([rawPath]),
        supabase.storage.from("child-avatars").remove([rawPath]),
      ]);
    }
  } catch (err) {
    console.warn("[avatar-service] delete error:", err);
  }
}
