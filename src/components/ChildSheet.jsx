import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthPrompt } from "@/components/AuthRequiredModal";
import { createChild, updateChild, uploadChildAvatar, deleteChildAvatarFromStorage } from "@/lib/child-service";
import { CHILD_AVATARS } from "@/lib/avatar-service";
import { User, Calendar, GraduationCap, HeartPulse, Sparkles, Loader2, Camera, Trash2 } from "lucide-react";

const COLOR_PALETTE = [
  "#3C6E71", // Brand slate green
  "#D97706", // Warm amber
  "#2563EB", // Royal blue
  "#7C3AED", // Gentle violet
  "#DB2777", // Warm rose
  "#059669", // Emerald green
];

export function ChildSheet({ open, onClose, onChildAdded, childToEdit = null, onChildUpdated = null }) {
  const { t, i18n } = useTranslation();
  const isEn = Boolean(i18n.language && i18n.language.startsWith("en"));
  const { user } = useAuth();
  const { requireAuth } = useAuthPrompt();

  const fileInputRef = useRef(null);
  const [naam, setNaam] = useState("");
  const [achternaam, setAchternaam] = useState("");
  const [geboortedatum, setGeboortedatum] = useState("");
  const [avatar, setAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [school, setSchool] = useState("");
  const [opvang, setOpvang] = useState("");
  const [medisch, setMedisch] = useState("");
  const [allergieen, setAllergieen] = useState("");
  const [kledingmaat, setKledingmaat] = useState("");
  const [schoenmaat, setSchoenmaat] = useState("");
  const [kleur, setKleur] = useState("#3C6E71");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Prepopulate form when childToEdit is provided
  useEffect(() => {
    if (childToEdit) {
      setNaam(childToEdit.naam || childToEdit.name || "");
      setAchternaam(childToEdit.achternaam || childToEdit.last_name || "");
      setGeboortedatum(childToEdit.geboortedatum || childToEdit.date_of_birth || "");
      const existingAvatar = childToEdit.avatar || childToEdit.avatar_url || null;
      setAvatar(existingAvatar);
      setAvatarPreview(existingAvatar);
      setAvatarFile(null);
      setSchool(childToEdit.school || "");
      setOpvang(childToEdit.opvang || childToEdit.daycare || "");
      setMedisch(childToEdit.medisch || childToEdit.medical_notes || "");
      setAllergieen(childToEdit.allergieen || childToEdit.allergies || "");
      setKledingmaat(childToEdit.kledingmaat || childToEdit.clothes_size || "");
      setSchoenmaat(childToEdit.schoenmaat || childToEdit.shoe_size || "");
      setKleur(childToEdit.kleur || childToEdit.color_code || "#3C6E71");
      if (
        childToEdit.school ||
        childToEdit.opvang ||
        childToEdit.medisch ||
        childToEdit.allergieen ||
        childToEdit.kledingmaat ||
        childToEdit.schoenmaat
      ) {
        setShowAdvanced(true);
      }
    } else if (open) {
      resetForm();
    }
  }, [childToEdit, open]);

  // Safety guard: if child sheet is opened while not logged in, close and trigger auth prompt
  useEffect(() => {
    if (open && !user) {
      onClose();
      requireAuth();
    }
  }, [open, user]);

  const maxDate = new Date().toISOString().split("T")[0];

  const resetForm = () => {
    setNaam("");
    setAchternaam("");
    setGeboortedatum("");
    setAvatar(null);
    setAvatarPreview(null);
    setAvatarFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setSchool("");
    setOpvang("");
    setMedisch("");
    setAllergieen("");
    setKledingmaat("");
    setSchoenmaat("");
    setKleur("#3C6E71");
    setShowAdvanced(false);
    setError(null);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError(t("childSheet.errorOnlyImages", "Alleen afbeeldingsbestanden zijn toegestaan."));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError(t("childSheet.errorImageTooBig", "Afbeelding mag maximaal 5MB groot zijn."));
      return;
    }

    setAvatarFile(file);
    const localUrl = URL.createObjectURL(file);
    setAvatarPreview(localUrl);
    setError(null);
  };

  const handleRemoveAvatar = () => {
    setAvatar(null);
    setAvatarFile(null);
    setAvatarPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!user?.id) {
      onClose();
      requireAuth();
      return;
    }
    if (!naam.trim()) {
      setError(t("childSheet.errorFirstNameRequired", "Voornaam is verplicht."));
      return;
    }

    if (!geboortedatum) {
      setError(t("childSheet.errorBirthDateRequired", "Geboortedatum is verplicht."));
      return;
    }

    if (geboortedatum > maxDate) {
      setError(t("childSheet.errorFutureBirthDate", "Geboortedatum kan niet in de toekomst liggen."));
      return;
    }

    setSaving(true);
    setError(null);

    let finalAvatarUrl = avatar;

    if (avatarFile) {
      setUploadingAvatar(true);
      try {
        finalAvatarUrl = await uploadChildAvatar(avatarFile, user?.id);
        // If child previously had an older avatar and replaced it, clean up old one
        if (childToEdit?.avatar && childToEdit.avatar !== finalAvatarUrl) {
          deleteChildAvatarFromStorage(childToEdit.avatar);
        }
      } catch (uploadErr) {
        setUploadingAvatar(false);
        setSaving(false);
        setError(uploadErr?.message || t("childSheet.errorAvatarUpload", "Uploaden van foto mislukt."));
        return;
      }
      setUploadingAvatar(false);
    } else if (childToEdit?.avatar && childToEdit.avatar !== avatar) {
      // User explicitly changed to preset or removed the avatar: purge old file from storage
      deleteChildAvatarFromStorage(childToEdit.avatar);
      finalAvatarUrl = avatar;
    }

    const childPayload = {
      naam: naam.trim(),
      achternaam: achternaam.trim(),
      geboortedatum,
      avatar: finalAvatarUrl,
      school: school.trim(),
      opvang: opvang.trim(),
      medisch: medisch.trim(),
      allergieen: allergieen.trim(),
      kledingmaat: kledingmaat.trim(),
      schoenmaat: schoenmaat.trim(),
      kleur,
    };

    try {
      if (childToEdit) {
        await updateChild(childToEdit.id, user?.id, childPayload);
        if (onChildUpdated) {
          onChildUpdated({ ...childToEdit, ...childPayload });
        }
        onClose();
      } else {
        const newChild = await createChild(user?.id, childPayload);
        resetForm();
        if (onChildAdded) onChildAdded(newChild);
        onClose();
      }
    } catch (err) {
      setError(err?.message || t("childSheet.errorSaveFailed", "Kon kind niet opslaan."));
    } finally {
      setSaving(false);
      setUploadingAvatar(false);
    }
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          resetForm();
          onClose();
        }
      }}
    >
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-3xl bg-background p-0 sm:max-w-lg sm:mx-auto">
        <SheetHeader className="border-b border-border/80 px-6 py-4 text-left">
          <SheetTitle className="font-display text-xl font-bold text-ink">
            {childToEdit
              ? t("childSheet.editTitle", {
                  name: childToEdit.naam || t("childSheet.defaultChildName", "kind"),
                  defaultValue: `Profiel van ${childToEdit.naam || "kind"} bewerken`,
                })
              : t("childSheet.addTitle", "Kind toevoegen")}
          </SheetTitle>
          <p className="text-xs text-ink-soft">
            {t("childSheet.subtitle", "Maak het profiel van je kind zelfstandig aan. De andere ouder hoeft niet mee te doen.")}
          </p>
        </SheetHeader>

        <form onSubmit={handleSave} className="space-y-4 px-6 py-5">
          {error && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs font-semibold text-destructive">
              {error}
            </div>
          )}

          {/* Child Avatar Photo */}
          <div className="flex flex-col items-center justify-center pt-1 pb-1">
            <div className="relative group">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={saving || uploadingAvatar}
                className="relative grid size-20 place-items-center rounded-full overflow-hidden border-2 shadow-xs transition-all active:scale-95 hover:opacity-95 cursor-pointer"
                style={{
                  borderColor: kleur || "#3C6E71",
                  backgroundColor: `${kleur}18`,
                }}
                aria-label={t("childSheet.uploadPhoto", "Foto van kind toevoegen")}
              >
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt={naam || "Child"}
                    className="size-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center">
                    <span
                      className="font-display text-2xl font-bold"
                      style={{ color: kleur }}
                    >
                      {naam.trim() ? naam.trim().charAt(0).toUpperCase() : <User className="size-7 opacity-50" />}
                    </span>
                  </div>
                )}

                {/* Subtle dark hover overlay with camera icon */}
                <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                  <Camera className="size-5" />
                </div>
              </button>

              {/* Camera Badge button in bottom right */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={saving || uploadingAvatar}
                className="absolute -bottom-0.5 -right-0.5 grid size-6 place-items-center rounded-full bg-brand text-primary-foreground shadow-sm ring-2 ring-background hover:bg-brand/90 transition-transform active:scale-90 cursor-pointer"
                title={avatarPreview ? t("childSheet.changePhoto", "Foto wijzigen") : t("childSheet.uploadPhoto", "Foto toevoegen")}
              >
                {uploadingAvatar ? <Loader2 className="size-3 animate-spin" /> : <Camera className="size-3" />}
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={handleFileChange}
              className="hidden"
            />

            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={saving || uploadingAvatar}
                className="text-xs font-semibold text-brand hover:underline cursor-pointer"
              >
                {avatarPreview ? t("childSheet.changePhoto", "Foto wijzigen") : t("childSheet.uploadPhoto", "Foto toevoegen")}
              </button>
              {avatarPreview && (
                <>
                  <span className="text-ink-soft/40">·</span>
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    disabled={saving || uploadingAvatar}
                    className="text-xs font-semibold text-destructive/80 hover:text-destructive hover:underline cursor-pointer"
                  >
                    {t("childSheet.removePhoto", "Foto verwijderen")}
                  </button>
                </>
              )}
            </div>

            {/* Child Avatar Presets Toggle */}
            <div className="mt-2 text-center">
              <button
                type="button"
                onClick={() => setShowPresets(!showPresets)}
                disabled={saving || uploadingAvatar}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-ink-soft hover:text-brand hover:border-brand/40 transition cursor-pointer"
              >
                <Sparkles className="size-3 text-brand" />
                <span>
                  {showPresets
                    ? t("children.hideAvatarPresets", "Verberg avatars")
                    : t("children.chooseAnAvatar", "Of kies een avatar")}
                </span>
              </button>
            </div>

            {/* Avatar Presets Grid */}
            {showPresets && (
              <div className="mt-3 w-full rounded-2xl border border-border/80 bg-muted/40 p-3 animate-in fade-in zoom-in-95 duration-150">
                <p className="text-[10px] font-bold uppercase tracking-wider text-ink-soft mb-2">
                  {t("children.funChildAvatars", "Kies een kinder-avatar")}
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {CHILD_AVATARS.map((preset) => {
                    const isSelected = avatarPreview === preset.url;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setAvatar(preset.url);
                          setAvatarPreview(preset.url);
                          setAvatarFile(null);
                        }}
                        className={`relative aspect-square rounded-xl p-1 border-2 transition hover:scale-105 active:scale-95 cursor-pointer ${
                          isSelected
                            ? "border-brand ring-2 ring-brand/30 bg-card shadow-xs"
                            : "border-transparent bg-card/70 hover:border-border"
                        }`}
                        title={preset.label}
                      >
                        <img
                          src={preset.url}
                          alt={preset.label}
                          className="size-full rounded-lg object-contain"
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Color Tag Selector */}
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-soft">
              {t("childSheet.themeColor", "Kleur voor dit kind")}
            </label>
            <div className="flex items-center gap-2.5">
              {COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setKleur(c)}
                  className={`size-7 rounded-full transition-transform ${
                    kleur === c ? "scale-115 ring-2 ring-brand ring-offset-2 ring-offset-background" : "hover:scale-105"
                  }`}
                  style={{ backgroundColor: c }}
                  aria-label={`Color ${c}`}
                />
              ))}
            </div>
          </div>

          {/* First Name (Required) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-ink-soft">
              {t("childSheet.firstName", "Voornaam")} <span className="text-destructive">*</span>
            </label>
            <div className="relative mt-1">
              <User className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-soft" />
              <input
                type="text"
                required
                autoFocus
                value={naam}
                onChange={(e) => setNaam(e.target.value)}
                placeholder={t("childSheet.firstNamePlaceholder", "Bijv. Emma")}
                className="w-full rounded-xl border border-border bg-card py-2.5 pl-10 pr-3.5 text-sm text-ink outline-none transition focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>
          </div>

          {/* Last Name (Optional) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-ink-soft">
              {t("childSheet.lastName", "Achternaam")}{" "}
              <span className="text-ink-soft/60 font-normal">
                {t("childSheet.optional", "(optioneel)")}
              </span>
            </label>
            <input
              type="text"
              value={achternaam}
              onChange={(e) => setAchternaam(e.target.value)}
              placeholder={t("childSheet.lastNamePlaceholder", "Bijv. de Vries")}
              className="mt-1 w-full rounded-xl border border-border bg-card py-2.5 px-3.5 text-sm text-ink outline-none transition focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </div>


          {/* Date of Birth with Future Dates Disabled (Mandatory) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-ink-soft">
              {t("childSheet.dateOfBirth", "Geboortedatum")} <span className="text-destructive">*</span>
            </label>
            <div className="relative mt-1">
              <Calendar className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-soft" />
              <input
                type="date"
                required
                max={maxDate}
                value={geboortedatum}
                onChange={(e) => {
                  if (e.target.value > maxDate) {
                    setError(t("childSheet.errorFutureBirthDate", "Geboortedatum kan niet in de toekomst liggen."));
                    return;
                  }
                  setError(null);
                  setGeboortedatum(e.target.value);
                }}
                className="w-full rounded-xl border border-border bg-card py-2.5 pl-10 pr-3.5 text-sm text-ink outline-none transition focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>
          </div>

          {/* Toggle More Details (School, Daycare, Medical) */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1.5 text-xs font-bold text-brand hover:underline"
          >
            <Sparkles className="size-3.5" />
            <span>
              {showAdvanced
                ? t("childSheet.hideExtra", "Minder praktische gegevens")
                : t("childSheet.showExtra", "+ School, medische info, kledingmaten toevoegen")}
            </span>
          </button>

          {showAdvanced && (
            <div className="space-y-3.5 rounded-2xl border border-border/70 bg-muted/30 p-3.5 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                    {t("childSheet.school", "Basisschool / School")}
                  </label>
                  <div className="relative mt-1">
                    <GraduationCap className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-ink-soft" />
                    <input
                      type="text"
                      value={school}
                      onChange={(e) => setSchool(e.target.value)}
                      placeholder={t("childSheet.schoolPlaceholder", "Naam van de school")}
                      className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-3 text-xs text-ink outline-none focus:border-brand"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                    {t("childSheet.daycare", "Opvang / BSO")}
                  </label>
                  <input
                    type="text"
                    value={opvang}
                    onChange={(e) => setOpvang(e.target.value)}
                    placeholder={t("childSheet.daycarePlaceholder", "Naam van de BSO")}
                    className="mt-1 w-full rounded-lg border border-border bg-card py-2 px-3 text-xs text-ink outline-none focus:border-brand"
                  />
                </div>
              </div>

              {/* Medical notes & Allergies */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                  {t("childSheet.medical", "Allergieën of medische bijzonderheden")}
                </label>
                <div className="relative mt-1">
                  <HeartPulse className="absolute left-3 top-3 size-3.5 text-ink-soft" />
                  <textarea
                    rows={2}
                    value={medisch}
                    onChange={(e) => setMedisch(e.target.value)}
                    placeholder={t("childSheet.medicalPlaceholder", "Bijv. Ventolin in rugzak, pinda-allergie...")}
                    className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-3 text-xs text-ink outline-none focus:border-brand"
                  />
                </div>
              </div>

              {/* Sizes */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                    {t("childSheet.clothingSize", "Kledingmaat")}
                  </label>
                  <input
                    type="text"
                    value={kledingmaat}
                    onChange={(e) => setKledingmaat(e.target.value)}
                    placeholder="128"
                    className="mt-1 w-full rounded-lg border border-border bg-card py-2 px-3 text-xs text-ink outline-none focus:border-brand"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                    {t("childSheet.shoeSize", "Schoenmaat")}
                  </label>
                  <input
                    type="text"
                    value={schoenmaat}
                    onChange={(e) => setSchoenmaat(e.target.value)}
                    placeholder="32"
                    className="mt-1 w-full rounded-lg border border-border bg-card py-2 px-3 text-xs text-ink outline-none focus:border-brand"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Submit Action */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={saving || !naam.trim() || !geboortedatum}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-bold text-primary-foreground shadow-sm transition hover:bg-brand/90 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>
                    {childToEdit
                      ? t("childSheet.savingChanges", "Wijzigingen opslaan...")
                      : t("childSheet.savingChild", "Kind opslaan...")}
                  </span>
                </>
              ) : (
                <span>
                  {childToEdit
                    ? t("childSheet.saveChanges", "Wijzigingen opslaan")
                    : t("childSheet.addChild", "Kind toevoegen")}
                </span>
              )}
            </button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

export default ChildSheet;
