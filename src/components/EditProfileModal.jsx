import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import {
  Camera,
  Upload,
  Sparkles,
  Trash2,
  X,
  Check,
  User,
  Loader2,
  AlertCircle,
  ImageIcon,
} from "lucide-react";
import {
  PARENT_AVATARS,
  uploadAvatarToStorage,
  deleteAvatarFromStorage,
} from "@/lib/avatar-service";
import { useAuth } from "@/contexts/AuthContext";

export function EditProfileModal({ open, onClose }) {
  const { t, i18n } = useTranslation();
  const isEn = Boolean(i18n.language && i18n.language.startsWith("en"));
  const { user, profile, updateProfile } = useAuth();

  const fileInputRef = useRef(null);

  // Active form state
  const [name, setName] = useState("");
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [selectedPresetId, setSelectedPresetId] = useState(null);
  const [activeTab, setActiveTab] = useState("presets"); // "presets" | "upload"
  const [isDragging, setIsDragging] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Sync initial profile values on modal open
  useEffect(() => {
    if (open) {
      const currentName = profile?.name || user?.name || "";
      const currentAvatar = profile?.avatar_url || user?.avatar_url || null;
      setName(currentName);
      setAvatarPreview(currentAvatar);
      setAvatarFile(null);
      setError(null);

      // Check if current avatar matches any preset
      const matchPreset = PARENT_AVATARS.find((p) => p.url === currentAvatar);
      setSelectedPresetId(matchPreset ? matchPreset.id : null);
      if (currentAvatar && !matchPreset && !currentAvatar.startsWith("data:")) {
        setActiveTab("upload");
      } else {
        setActiveTab("presets");
      }
    }
  }, [open, profile, user]);

  if (!open) return null;

  const trimmedName = (name.trim() || user?.name || user?.email || "").replace(/^[^a-zA-Z0-9]+/, "");
  const currentInitial = trimmedName ? trimmedName.slice(0, 1).toUpperCase() : null;

  // Process chosen file
  const processFile = (file) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError(t("editProfile.invalidImage"));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError(t("editProfile.maxSize"));
      return;
    }

    setError(null);
    setAvatarFile(file);
    setSelectedPresetId(null);

    const localUrl = URL.createObjectURL(file);
    setAvatarPreview(localUrl);
    setActiveTab("upload");
  };

  // Handle local file selection
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    processFile(file);
  };

  // Handle Drag and Drop
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer?.files?.[0];
    processFile(file);
  };

  // Select a preset avatar
  const handleSelectPreset = (preset) => {
    setError(null);
    setSelectedPresetId(preset.id);
    setAvatarFile(null);
    setAvatarPreview(preset.url);
  };

  // Remove avatar (reset to initials)
  const handleRemoveAvatar = () => {
    setError(null);
    setAvatarFile(null);
    setSelectedPresetId(null);
    setAvatarPreview(null);
  };

  // Submit and save profile
  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(t("editProfile.nameRequired"));
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const oldAvatarUrl = profile?.avatar_url || user?.avatar_url || null;
      let finalAvatarUrl = avatarPreview;

      // 1. If a new file was chosen, upload to 'avatars' storage bucket
      if (avatarFile) {
        finalAvatarUrl = await uploadAvatarToStorage(avatarFile, user?.id || "parent", "avatars");

        // Clean up previously uploaded image from storage
        if (oldAvatarUrl && oldAvatarUrl !== finalAvatarUrl) {
          await deleteAvatarFromStorage(oldAvatarUrl);
        }
      } else if (finalAvatarUrl !== oldAvatarUrl) {
        // User switched to a preset or removed photo: delete previous storage file
        if (oldAvatarUrl) {
          await deleteAvatarFromStorage(oldAvatarUrl);
        }
      }

      // 2. Update user profile in Supabase & local AuthContext
      const { error: updErr } = await updateProfile({
        name: name.trim(),
        avatar_url: finalAvatarUrl,
      });

      if (updErr) {
        throw updErr;
      }

      onClose();
    } catch (err) {
      console.error("[EditProfileModal] save error:", err);
      setError(err?.message || t("editProfile.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const [phoneEl, setPhoneEl] = useState(() =>
    typeof document !== "undefined" ? document.getElementById("app-shell-phone") : null
  );

  useEffect(() => {
    if (!phoneEl && typeof document !== "undefined") {
      setPhoneEl(document.getElementById("app-shell-phone"));
    }
  }, [phoneEl]);

  const modalNode = (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 overflow-hidden rounded-3xl animate-in fade-in duration-150">
      <div className="relative w-full max-h-[92%] flex flex-col rounded-3xl border border-border/80 bg-card shadow-2xl overflow-hidden my-auto">
        {/* Header - Fixed at top */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-border/60 shrink-0 bg-card">
          <div>
            <h3 className="font-display text-base font-bold text-ink">
              {t("editProfile.title", "Profiel & Foto bewerken")}
            </h3>
            <p className="text-[11px] text-ink-soft">
              {t("editProfile.subtitle", "Pas je naam en profielfoto aan")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-full p-1 text-ink-soft hover:bg-muted hover:text-ink transition cursor-pointer"
          >
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Scrollable Form Body */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {error && (
              <div className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}

            {/* Main Avatar Preview Display */}
            <div className="flex flex-col items-center justify-center">
              <div className="relative group">
                <button
                  type="button"
                  onClick={() => {
                    if (activeTab === "upload") {
                      fileInputRef.current?.click();
                    } else {
                      setActiveTab("upload");
                    }
                  }}
                  disabled={saving}
                  className="relative grid size-20 place-items-center rounded-full overflow-hidden border-3 border-brand/30 bg-brand-soft/60 shadow-sm transition-all hover:border-brand cursor-pointer"
                aria-label={t("editProfile.changePhoto", "Foto wijzigen")}
              >
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt={name || "Avatar"}
                    className="size-full object-cover"
                  />
                ) : currentInitial ? (
                  <span className="font-display text-3xl font-bold text-brand">
                    {currentInitial}
                  </span>
                ) : (
                  <User className="size-8 text-brand" />
                )}

                {/* Hover overlay with camera icon */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                  <Camera className="size-6" />
                </div>
              </button>

              {/* Camera Badge button in bottom right */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab("upload");
                  fileInputRef.current?.click();
                }}
                disabled={saving}
                className="absolute -bottom-1 -right-1 grid size-7 place-items-center rounded-full bg-brand text-primary-foreground shadow-sm ring-2 ring-background hover:bg-brand/90 transition cursor-pointer"
                title={t("editProfile.uploadPhoto", "Foto uploaden")}
              >
                <Camera className="size-3.5" />
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Remove photo option if avatar is currently active */}
            {avatarPreview && (
              <button
                type="button"
                onClick={handleRemoveAvatar}
                disabled={saving}
                className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline transition cursor-pointer"
              >
                <Trash2 className="size-3.5" />
                <span>{t("editProfile.removePicture", "Foto verwijderen (gebruik initialen)")}</span>
              </button>
            )}
          </div>

          {/* Name Field */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-ink-soft mb-1.5">
              {t("editProfile.displayName", "Weergavenaam")} <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-soft pointer-events-none" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("editProfile.namePlaceholder", "Je naam (bijv. Mona)")}
                required
                className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-3.5 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 shadow-2xs"
              />
            </div>
            <p className="mt-1 text-[11px] text-ink-soft">
              {t("editProfile.visibleToCoParent", "Deze naam en foto zijn zichtbaar voor je gekoppelde co-ouder.")}
            </p>
          </div>

          {/* Clean Segmented Tab Control */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-ink-soft mb-2">
              {t("editProfile.profilePictureAndAvatar", "Profielfoto & Avatar")}
            </label>

            <div className="grid grid-cols-2 rounded-2xl bg-muted/70 p-1 mb-3.5" role="tablist">
              <button
                type="button"
                onClick={() => setActiveTab("presets")}
                className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "presets"
                    ? "bg-card text-brand shadow-xs"
                    : "text-ink-soft hover:text-ink"
                }`}
                role="tab"
                aria-selected={activeTab === "presets"}
              >
                <Sparkles className="size-3.5" />
                <span>{t("editProfile.chooseAvatar", "Kies een avatar")}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("upload")}
                className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "upload"
                    ? "bg-card text-brand shadow-xs"
                    : "text-ink-soft hover:text-ink"
                }`}
                role="tab"
                aria-selected={activeTab === "upload"}
              >
                <Upload className="size-3.5" />
                <span>{t("editProfile.uploadPhotoTab", "Foto uploaden")}</span>
              </button>
            </div>

            {/* TAB 1: Presets Grid */}
            {activeTab === "presets" && (
              <div className="rounded-2xl border border-border/80 bg-muted/20 p-3">
                <div className="grid grid-cols-4 gap-2.5 max-h-48 overflow-y-auto pr-1">
                  {PARENT_AVATARS.map((preset) => {
                    const isSelected = selectedPresetId === preset.id || avatarPreview === preset.url;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleSelectPreset(preset)}
                        className={`relative aspect-square rounded-2xl overflow-hidden border-2 transition-all p-1 cursor-pointer hover:scale-105 active:scale-95 ${
                          isSelected
                            ? "border-brand ring-2 ring-brand/30 bg-card shadow-sm"
                            : "border-transparent bg-card/60 hover:border-border"
                        }`}
                        title={preset.label}
                      >
                        <img
                          src={preset.url}
                          alt={preset.label}
                          className="size-full rounded-xl object-contain"
                        />
                        {isSelected && (
                          <span className="absolute top-1 right-1 grid size-4 place-items-center rounded-full bg-brand text-white shadow-xs">
                            <Check className="size-2.5 stroke-[3]" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 2: Upload Dropzone */}
            {activeTab === "upload" && (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-all cursor-pointer ${
                  isDragging
                    ? "border-brand bg-brand-soft/30 scale-[1.01]"
                    : "border-border hover:border-brand/50 hover:bg-muted/30 bg-muted/15"
                }`}
              >
                <div className="grid size-12 place-items-center rounded-2xl bg-brand/12 text-brand mb-2.5">
                  {avatarFile ? <ImageIcon className="size-6" /> : <Upload className="size-6" />}
                </div>

                {avatarFile ? (
                  <div>
                    <p className="text-xs font-bold text-ink max-w-[240px] truncate mx-auto">
                      {avatarFile.name}
                    </p>
                    <p className="text-[11px] text-ink-soft mt-0.5">
                      {(avatarFile.size / 1024 / 1024).toFixed(2)} MB · {t("editProfile.readyToSave", "Klaar om op te slaan")}
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs font-bold text-ink">
                      {t("editProfile.dragDropOrClick", "Sleep hierheen of klik om te bladeren")}
                    </p>
                    <p className="mt-1 text-[11px] text-ink-soft">
                      {t("editProfile.supportedFormats", "PNG, JPG of WebP tot 5MB")}
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-brand/30 bg-brand-soft/60 px-3 py-1.5 text-xs font-bold text-brand hover:bg-brand-soft transition"
                >
                  <Camera className="size-3.5" />
                  <span>
                    {avatarFile
                      ? t("editProfile.changeFile", "Ander bestand kiezen")
                      : t("editProfile.chooseFileFromDevice", "Kies bestand van apparaat")}
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons - Pinned at bottom */}
        <div className="flex items-center justify-end gap-2.5 px-6 py-3 border-t border-border/60 shrink-0 bg-card">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl border border-border bg-card px-4 py-2 text-xs font-semibold text-ink hover:bg-muted transition cursor-pointer"
          >
            {t("editProfile.cancel", "Annuleren")}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-xl bg-brand px-5 py-2 text-xs font-bold text-primary-foreground shadow-2xs hover:bg-brand/90 transition cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                <span>{t("editProfile.saving", "Opslaan...")}</span>
              </>
            ) : (
              <span>{t("editProfile.saveChanges", "Wijzigingen opslaan")}</span>
            )}
          </button>
        </div>
      </form>
      </div>
    </div>
  );

  return phoneEl ? createPortal(modalNode, phoneEl) : modalNode;
}
