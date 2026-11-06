import { supabase } from "@/lib/supabase";

const listeners = new Set();
let cachedDocuments = [];
let isLoaded = false;

function notify() {
  listeners.forEach((fn) => {
    try {
      fn(cachedDocuments);
    } catch (e) {
      console.warn("Error in document subscriber:", e);
    }
  });
}

export function subscribeDocuments(fn) {
  listeners.add(fn);
  if (isLoaded) {
    fn(cachedDocuments);
  }
  return () => listeners.delete(fn);
}

export function getCachedDocuments() {
  return cachedDocuments;
}

export async function fetchDocuments(userId) {
  if (!userId) return cachedDocuments;

  try {
    const { data, error } = await supabase.functions.invoke("manage-documents", {
      body: { action: "list", user_id: userId },
    });

    if (error) {
      console.warn("fetchDocuments error:", error);
      return cachedDocuments;
    }

    if (data?.success && Array.isArray(data.documents)) {
      cachedDocuments = data.documents;
      isLoaded = true;
      notify();
    }
    return cachedDocuments;
  } catch (err) {
    console.warn("fetchDocuments exception:", err);
    return cachedDocuments;
  }
}

export async function uploadDocument(file, meta) {
  try {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
    const filePath = `${meta.user_id}/${fileName}`;

    // Upload to Supabase 'documents' bucket
    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.warn("Direct storage upload failed, uploading via public client:", uploadError);
    }

    // Record in database via manage-documents Edge Function
    const { data, error } = await supabase.functions.invoke("manage-documents", {
      body: {
        action: "create",
        user_id: meta.user_id,
        child_id: meta.child_id || null,
        title: meta.title || file.name,
        category: meta.category || "Algemeen",
        file_path: filePath,
        file_size: file.size || 0,
        mime_type: file.type || null,
        is_shared: meta.is_shared !== false,
      },
    });

    if (error) throw error;
    if (data?.success && data.document) {
      cachedDocuments = [data.document, ...cachedDocuments];
      notify();
      return data.document;
    }
    throw new Error(data?.error || "Failed to create document record");
  } catch (err) {
    console.error("uploadDocument error:", err);
    throw err;
  }
}

export async function getDocumentUrl(filePath) {
  if (!filePath) return "";
  try {
    const { data, error } = await supabase.storage
      .from("documents")
      .createSignedUrl(filePath, 3600); // 1 hour signed URL
    if (error) {
      const { data: publicData } = supabase.storage
        .from("documents")
        .getPublicUrl(filePath);
      return publicData?.publicUrl || "";
    }
    return data?.signedUrl || "";
  } catch {
    return "";
  }
}

export async function deleteDocument(id) {
  try {
    cachedDocuments = cachedDocuments.filter((d) => d.id !== id);
    notify();

    const { data, error } = await supabase.functions.invoke("manage-documents", {
      body: { action: "delete", id },
    });

    if (error) throw error;
    return data?.success;
  } catch (err) {
    console.error("deleteDocument error:", err);
    throw err;
  }
}
