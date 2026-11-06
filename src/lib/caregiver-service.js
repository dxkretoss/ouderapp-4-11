import { supabase, isConfigured } from "@/lib/supabase";
import { kringState, voegPersoonToe, wijzigPersoon, trekIn, verwijderPersoon } from "@/lib/kring-store";

export function isUUID(str) {
  return typeof str === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
}

/**
 * Universal Caregiver & Family Circle Service (Edge-Function First with Offline Support)
 * Manages family members, grandparents, stepparents, and babysitters.
 */

export async function fetchCaregivers(parentId) {
  if (isConfigured && parentId) {
    // 1. Try Edge Function: manage-caregivers
    try {
      const { data, error } = await supabase.functions.invoke("manage-caregivers", {
        body: { action: "list", parent_id: parentId },
      });

      if (!error && data?.success && Array.isArray(data.caregivers)) {
        return data.caregivers.map(mapCaregiverFromDb);
      }
    } catch (edgeErr) {
      console.warn("[caregiver-service] manage-caregivers Edge Function list notice:", edgeErr);
    }

      return [];
  }

  // Fallback to local store ONLY for guest/demo mode without logged in parent
  if (!parentId) {
    const state = kringState();
    return state.personen.map((p) => ({
      id: p.id,
      name: p.naam,
      role: p.rol,
      contact: p.contact,
      phone: p.telefoon,
      email: p.email,
      isEmergencyContact: Boolean(p.noodcontact),
      inviteToken: p.sleutel,
      status: p.ingetrokken ? "revoked" : p.uitgenodigd ? "invited" : "contact_only",
      validUntil: p.periode?.eind || null,
      permissions: p.rechten || {},
    }));
  }

  return [];
}

export async function createCaregiver({
  parentId,
  name,
  role,
  phone,
  email,
  isEmergencyContact = false,
  status = "contact_only", // "contact_only" | "invited"
  validUntil = null,
  permissions = {}, // { [childId]: { calendar: 'view', moments: 'view', ... } }
}) {
  let createdCaregiver = null;

  if (isConfigured && parentId) {
    // 1. Try Edge Function: manage-caregivers
    try {
      const { data, error } = await supabase.functions.invoke("manage-caregivers", {
        body: {
          action: "create",
          parent_id: parentId,
          name: name.trim(),
          role: role || "Caregiver",
          phone: phone?.trim() || null,
          email: email?.trim() || null,
          is_emergency_contact: Boolean(isEmergencyContact),
          status,
          valid_until: validUntil,
          permissions,
        },
      });

      if (!error && data?.success && data.caregiver) {
        createdCaregiver = mapCaregiverFromDb(data.caregiver);
      }
    } catch (edgeErr) {
      console.warn("[caregiver-service] manage-caregivers Edge Function create notice:", edgeErr);
    }
  }

  // Local store sync
  const localCaregiver = voegPersoonToe({
    naam: name.trim(),
    rol: role,
    contact: phone?.trim() || email?.trim() || "",
    telefoon: phone?.trim(),
    email: email?.trim(),
    noodcontact: Boolean(isEmergencyContact),
    uitgenodigd: status === "invited",
    periode: validUntil ? { type: "tot", eind: validUntil } : { type: "doorlopend" },
    rechten: permissions,
  });

  return createdCaregiver || localCaregiver;
}

export async function updateCaregiver(caregiverId, {
  name,
  role,
  phone,
  email,
  isEmergencyContact,
  status,
  validUntil,
  permissions,
}) {
  if (isConfigured && caregiverId && isUUID(caregiverId)) {
    // 1. Try Edge Function: manage-caregivers
    try {
      const { data, error } = await supabase.functions.invoke("manage-caregivers", {
        body: {
          action: "update",
          caregiver_id: caregiverId,
          name,
          role,
          phone,
          email,
          is_emergency_contact: isEmergencyContact,
          status,
          valid_until: validUntil,
          permissions,
        },
      });

      if (!error && data?.success) {
        // Success via Edge Function
      }
    } catch (edgeErr) {
      console.warn("[caregiver-service] manage-caregivers Edge Function update notice:", edgeErr);
    }
  }

  // Update local store
  wijzigPersoon(caregiverId, {
    ...(name !== undefined ? { naam: name.trim() } : {}),
    ...(role !== undefined ? { rol: role } : {}),
    ...(phone !== undefined ? { telefoon: phone?.trim() } : {}),
    ...(email !== undefined ? { email: email?.trim() } : {}),
    ...(isEmergencyContact !== undefined ? { noodcontact: Boolean(isEmergencyContact) } : {}),
    ...(status !== undefined ? { uitgenodigd: status === "invited" } : {}),
    ...(validUntil !== undefined ? { periode: validUntil ? { type: "tot", eind: validUntil } : { type: "doorlopend" } } : {}),
    ...(permissions !== undefined ? { rechten: permissions } : {}),
  });

  return true;
}

export async function deleteCaregiver(caregiverId, parentId) {
  if (isConfigured && caregiverId && isUUID(caregiverId)) {
    // 1. Try Edge Function: manage-caregivers
    try {
      await supabase.functions.invoke("manage-caregivers", {
        body: { action: "delete", caregiver_id: caregiverId, parent_id: parentId },
      });
    } catch (edgeErr) {
      console.warn("[caregiver-service] manage-caregivers Edge Function delete notice:", edgeErr);
    }
  }

  verwijderPersoon(caregiverId);
  trekIn(caregiverId);
  return true;
}

export async function revokeCaregiverAccess(caregiverId) {
  if (isConfigured && caregiverId && isUUID(caregiverId)) {
    try {
      await updateCaregiver(caregiverId, {
        status: "revoked",
      });
    } catch (err) {
      console.warn("[caregiver-service] Error revoking caregiver:", err);
    }
  }

  trekIn(caregiverId);
  return true;
}

export async function fetchCaregiverByToken(token) {
  if (!token) return null;

  if (isConfigured) {
    // 1. Try Edge Function: manage-caregivers
    try {
      const { data, error } = await supabase.functions.invoke("manage-caregivers", {
        body: { action: "get-by-token", token },
      });

      if (!error && data?.success && data.caregiver) {
        const mapped = mapCaregiverFromDb(data.caregiver);
        if (Array.isArray(data.children)) {
          mapped.children = data.children;
        }
        if (Array.isArray(data.co_parents) && data.co_parents.length > 0) {
          mapped.coParents = data.co_parents;
        }
        return mapped;
      }
    } catch (edgeErr) {
      console.warn("[caregiver-service] manage-caregivers Edge Function get-by-token notice:", edgeErr);
    }

    // 2. Direct table query fallback
    try {
      const { data: caregiver, error } = await supabase
        .from("family_caregivers")
        .select(`
          id,
          created_by,
          name,
          role,
          phone,
          email,
          is_emergency_contact,
          invite_token,
          status,
          connected_user_id,
          valid_until,
          caregiver_permissions (
            id,
            child_id,
            section,
            permission_level
          )
        `)
        .eq("invite_token", token)
        .maybeSingle();

      if (!error && caregiver) {
        const mapped = mapCaregiverFromDb(caregiver);
        if (Array.isArray(caregiver.caregiver_permissions) && caregiver.caregiver_permissions.length > 0) {
          const childIds = [...new Set(caregiver.caregiver_permissions.map((cp) => cp.child_id))];
          const { data: kids } = await supabase
            .from("children")
            .select("id, name, last_name, date_of_birth, avatar_url, school, daycare, doctor, medical_notes, allergies, dietary_notes, color_code, care_schedule")
            .in("id", childIds);
          mapped.children = kids || [];
        }
        return mapped;
      }
    } catch (err) {
      console.warn("[caregiver-service] Error fetching caregiver by token from Supabase:", err);
    }
  }

  // Fallback to local store
  const state = kringState();
  const localMatch = state.personen.find((p) => p.sleutel === token || p.id === token);
  if (localMatch) {
    return {
      id: localMatch.id,
      name: localMatch.naam,
      role: localMatch.rol,
      contact: localMatch.contact,
      phone: localMatch.telefoon,
      email: localMatch.email,
      isEmergencyContact: Boolean(localMatch.noodcontact),
      inviteToken: localMatch.sleutel,
      status: localMatch.ingetrokken ? "revoked" : localMatch.uitgenodigd ? "invited" : "contact_only",
      validUntil: localMatch.periode?.eind || null,
      permissions: localMatch.rechten || {},
    };
  }

  return null;
}

export async function fetchCaregiverForUser(userId, userEmail) {
  if (!userId && !userEmail) return null;

  const validUserId = isUUID(userId) ? userId : null;
  const cleanEmail = typeof userEmail === "string" && userEmail.trim() ? userEmail.trim() : null;

  if (!validUserId && !cleanEmail) return null;

  if (isConfigured) {
    // 1. Try Edge Function: manage-caregivers
    try {
      const { data, error } = await supabase.functions.invoke("manage-caregivers", {
        body: {
          action: "get-for-user",
          user_id: validUserId || undefined,
          email: cleanEmail || undefined,
        },
      });

      if (!error && data?.success && data.caregiver) {
        const mapped = mapCaregiverFromDb(data.caregiver);
        if (Array.isArray(data.children)) {
          mapped.children = data.children;
        }
        if (Array.isArray(data.co_parents) && data.co_parents.length > 0) {
          mapped.coParents = data.co_parents;
        }
        return mapped;
      }
    } catch (edgeErr) {
      console.warn("[caregiver-service] manage-caregivers get-for-user notice:", edgeErr);
    }

    // 2. Direct database query fallback
    try {
      let query = supabase
        .from("family_caregivers")
        .select(`
          id,
          created_by,
          name,
          role,
          phone,
          email,
          is_emergency_contact,
          invite_token,
          status,
          connected_user_id,
          valid_until,
          caregiver_permissions (
            id,
            child_id,
            section,
            permission_level
          )
        `);

      if (validUserId && cleanEmail) {
        query = query.or(`connected_user_id.eq.${validUserId},email.ilike.${cleanEmail}`);
      } else if (validUserId) {
        query = query.eq("connected_user_id", validUserId);
      } else if (cleanEmail) {
        query = query.ilike("email", cleanEmail);
      }

      const { data: rows, error } = await query.limit(1);
      const caregiver = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;

      if (!error && caregiver) {
        const mapped = mapCaregiverFromDb(caregiver);
        if (Array.isArray(caregiver.caregiver_permissions) && caregiver.caregiver_permissions.length > 0) {
          const childIds = [...new Set(caregiver.caregiver_permissions.map((cp) => cp.child_id))];
          const { data: kids } = await supabase
            .from("children")
            .select("id, name, last_name, date_of_birth, avatar_url, school, daycare, doctor, medical_notes, allergies, dietary_notes, color_code, care_schedule")
            .in("id", childIds);
          mapped.children = kids || [];
        }
        return mapped;
      }
    } catch (err) {
      console.warn("[caregiver-service] direct query fallback get-for-user notice:", err);
    }
  }

  // Fallback to local store for demo
  if (userEmail) {
    const state = kringState();
    const match = state.personen.find((p) => p.email?.toLowerCase() === userEmail.toLowerCase() || p.contact?.toLowerCase() === userEmail.toLowerCase());
    if (match) {
      return {
        id: match.id,
        name: match.naam,
        role: match.rol,
        contact: match.contact,
        phone: match.telefoon,
        email: match.email,
        isEmergencyContact: Boolean(match.noodcontact),
        inviteToken: match.sleutel,
        status: match.ingetrokken ? "revoked" : match.uitgenodigd ? "invited" : "contact_only",
        validUntil: match.periode?.eind || null,
        permissions: match.rechten || {},
      };
    }
  }

  return null;
}

export async function acceptCaregiverInvite(inviteToken, authUserId) {
  if (!inviteToken) return null;

  if (isConfigured && inviteToken) {
    // 1. Try Edge Function: manage-caregivers
    try {
      const { data, error } = await supabase.functions.invoke("manage-caregivers", {
        body: { action: "accept", token: inviteToken, user_id: authUserId },
      });

      if (!error && data?.success) {
        return data.caregiver ? mapCaregiverFromDb(data.caregiver) : true;
      }
    } catch (edgeErr) {
      console.warn("[caregiver-service] manage-caregivers Edge Function accept notice:", edgeErr);
    }

    // 2. Direct table fallback
    try {
      const newToken = crypto.randomUUID();
      let updateQuery = supabase
        .from("family_caregivers")
        .update({
          status: "active",
          connected_user_id: authUserId || null,
          invite_token: newToken,
          updated_at: new Date().toISOString(),
        });

      if (isUUID(inviteToken)) {
        updateQuery = updateQuery.or(`invite_token.eq.${inviteToken},id.eq.${inviteToken}`);
      } else {
        updateQuery = updateQuery.eq("invite_token", inviteToken);
      }

      const { data, error } = await updateQuery.select().maybeSingle();

      if (!error && data) {
        return mapCaregiverFromDb(data);
      }
    } catch (err) {
      console.warn("[caregiver-service] Error accepting caregiver invite in Supabase:", err);
    }
  }

  // Local store sync
  const state = kringState();
  const localMatch = state.personen.find((p) => p.sleutel === inviteToken);
  if (localMatch) {
    wijzigPersoon(localMatch.id, { bevestigd: true, sleutel: crypto.randomUUID() });
    return localMatch;
  }

  return null;
}

function mapCaregiverFromDb(row) {
  if (!row) return null;
  const permissionsMap = {};
  if (Array.isArray(row.caregiver_permissions)) {
    row.caregiver_permissions.forEach((perm) => {
      if (!permissionsMap[perm.child_id]) {
        permissionsMap[perm.child_id] = {};
      }
      permissionsMap[perm.child_id][perm.section] = perm.permission_level;
    });
  }

  return {
    id: row.id,
    created_by: row.created_by,
    createdBy: row.created_by,
    name: row.name,
    role: row.role,
    phone: row.phone,
    email: row.email,
    contact: row.phone || row.email || "",
    isEmergencyContact: Boolean(row.is_emergency_contact),
    inviteToken: row.invite_token,
    status: row.status,
    connectedUserId: row.connected_user_id,
    validUntil: row.valid_until,
    permissions: permissionsMap,
    creator: row.creator || null,
    coParents: Array.isArray(row.co_parents)
      ? row.co_parents
      : Array.isArray(row.coParents)
      ? row.coParents
      : [],
  };
}

export async function saveCaregiverHandoverResponse({ caregiverId, childId, response }) {
  if (isConfigured) {
    try {
      const { data, error } = await supabase.functions.invoke("manage-caregivers", {
        body: {
          action: "set_handover_status",
          caregiver_id: caregiverId,
          child_id: childId,
          response,
        },
      });

      if (!error && data?.success) {
        return { success: true, response };
      }
    } catch (err) {
      console.warn("[caregiver-service] saveCaregiverHandoverResponse error:", err);
    }
  }

  return { success: false };
}

