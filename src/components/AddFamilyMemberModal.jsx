import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { HeartHandshake, X, UserCheck, Shield, Calendar, Heart, CheckSquare, ShieldPlus, Loader2 } from "lucide-react";
import { createCaregiver, updateCaregiver } from "@/lib/caregiver-service";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export function AddFamilyMemberModal({
  open,
  onClose,
  onCreated,
  onUpdated,
  defaultChildId,
  childrenList = [],
  caregiverToEdit = null,
}) {
  const { t, i18n } = useTranslation();
  const isEn = Boolean(i18n.language && i18n.language.startsWith("en"));
  const { user } = useAuth();
  const isEditing = Boolean(caregiverToEdit);

  const [name, setName] = useState("");
  const [role, setRole] = useState("Grandparent");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [isEmergencyContact, setIsEmergencyContact] = useState(false);
  const [inviteNow, setInviteNow] = useState(false);
  const [selectedChildIds, setSelectedChildIds] = useState([]);
  const [canHandovers, setCanHandovers] = useState(true);
  const [canMoments, setCanMoments] = useState(true);
  const [canTasks, setCanTasks] = useState(true);
  const [canEmergency, setCanEmergency] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (caregiverToEdit) {
      setName(caregiverToEdit.name || caregiverToEdit.naam || "");
      setRole(caregiverToEdit.role || caregiverToEdit.rol || "Grandparent");
      setPhone(caregiverToEdit.phone || caregiverToEdit.telefoon || "");
      setEmail(caregiverToEdit.email || "");
      const isEmerg = Boolean(caregiverToEdit.isEmergencyContact || caregiverToEdit.noodcontact);
      setIsEmergencyContact(isEmerg);
      setInviteNow(caregiverToEdit.status === "invited" || caregiverToEdit.status === "active");

      const perms = caregiverToEdit.permissions || {};
      const childPermValues = Object.values(perms);
      const isPermitted = (val) => Boolean(val && val !== "none" && val !== "geen");

      if (childPermValues.length > 0) {
        setCanHandovers(
          childPermValues.some((p) =>
            isPermitted(p.handovers) || isPermitted(p.wissel) || isPermitted(p.calendar) || isPermitted(p.agenda)
          )
        );
        setCanMoments(
          childPermValues.some((p) =>
            isPermitted(p.moments) || isPermitted(p.momentjes)
          )
        );
        setCanTasks(
          childPermValues.some((p) =>
            isPermitted(p.tasks) || isPermitted(p.spullen) || isPermitted(p.taken) || isPermitted(p.packing_items)
          )
        );
        setCanEmergency(
          childPermValues.some((p) =>
            isPermitted(p.emergency_info) || isPermitted(p.nood)
          )
        );
      } else {
        setCanHandovers(true);
        setCanMoments(true);
        setCanTasks(true);
        setCanEmergency(isEmerg);
      }

      if (caregiverToEdit.permissions && Object.keys(caregiverToEdit.permissions).length > 0) {
        setSelectedChildIds(Object.keys(caregiverToEdit.permissions));
      } else {
        setSelectedChildIds([]);
      }
    } else {
      setName("");
      setRole("Grandparent");
      setPhone("");
      setEmail("");
      setIsEmergencyContact(false);
      setInviteNow(false);
      setCanHandovers(true);
      setCanMoments(true);
      setCanTasks(true);
      setCanEmergency(false);
      setSelectedChildIds(defaultChildId ? [defaultChildId] : []);
    }
    setError("");
  }, [caregiverToEdit, open, defaultChildId, childrenList]);

  if (!open) return null;

  const roleOptions = [
    { id: "Grandparent", label: t("circle.roles.Grandparent", "Grandparent") },
    { id: "Grandpa", label: t("circle.roles.Grandpa", "Grandpa") },
    { id: "Grandma", label: t("circle.roles.Grandma", "Grandma") },
    { id: "Stepparent", label: t("circle.roles.Stepparent", "Stepparent / bonus parent") },
    { id: "Relative", label: t("circle.roles.Relative", "Family member") },
    { id: "Babysitter", label: t("circle.roles.Babysitter", "Babysitter") },
    { id: "Caregiver", label: t("circle.roles.Caregiver", "Other caregiver") },
    { id: "Other", label: t("circle.roles.Other", "Otherwise") },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (!name.trim()) {
      setError(t("circle.nameRequired", "Vul een naam in."));
      return;
    }
    if (!role || !role.trim()) {
      setError(t("circle.roleRequired", "Selecteer een rol."));
      return;
    }
    const cleanPhone = phone ? String(phone).replace(/\D/g, "") : "";
    if (!cleanPhone || cleanPhone.length < 6) {
      setError(t("circle.phoneRequired", "Vul een geldig telefoonnummer in."));
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      setError(t("circle.emailRequired", "Vul een geldig e-mailadres in."));
      return;
    }
    if (childrenList.length > 0 && selectedChildIds.length === 0) {
      setError(t("circle.selectAtLeastOneChild", "Selecteer minimaal één kind."));
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const perms = {};
      const targetChildren = selectedChildIds;

      targetChildren.forEach((cId) => {
        perms[cId] = {
          handovers: canHandovers ? "view" : "none",
          wissel: canHandovers ? "view" : "none",
          calendar: canHandovers ? "view" : "none",
          agenda: canHandovers ? "view" : "none",
          moments: canMoments ? "view" : "none",
          momentjes: canMoments ? "view" : "none",
          tasks: canTasks ? "view" : "none",
          taken: canTasks ? "view" : "none",
          packing_items: canTasks ? "view" : "none",
          spullen: canTasks ? "view" : "none",
          emergency_info: canEmergency ? "view" : "none",
          nood: canEmergency ? "view" : "none",
        };
      });

      const formattedPhone = phone.trim() ? (phone.startsWith("+") ? phone.trim() : `+${phone.trim()}`) : null;
      const formattedEmail = email.trim().toLowerCase();

      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const parentName = user?.name || user?.user_metadata?.name || "";

      if (isEditing) {
        await updateCaregiver(caregiverToEdit.id, {
          name: name.trim(),
          role,
          phone: formattedPhone,
          email: formattedEmail,
          isEmergencyContact,
          status: inviteNow ? "invited" : (caregiverToEdit.status || "contact_only"),
          permissions: perms,
        });

        if (inviteNow && formattedEmail) {
          try {
            const token = caregiverToEdit.inviteToken || caregiverToEdit.invite_token || caregiverToEdit.id;
            await supabase.functions.invoke("manage-caregivers", {
              body: {
                action: "send-invite-email",
                caregiver_id: caregiverToEdit.id,
                email: formattedEmail,
                invite_token: token,
                origin,
                lang: i18n?.language || "nl",
                parent_name: parentName,
              },
            });
          } catch (mailErr) {
            console.warn("[AddFamilyMemberModal] send-invite-email edit notice:", mailErr);
          }
        }

        if (onUpdated) {
          onUpdated(
            {
              ...caregiverToEdit,
              name: name.trim(),
              role,
              phone: formattedPhone,
              email: formattedEmail,
              isEmergencyContact,
              permissions: perms,
            },
            inviteNow && caregiverToEdit.status !== "invited" && caregiverToEdit.status !== "active"
          );
        }
        onClose();
      } else {
        const created = await createCaregiver({
          parentId: user?.id,
          name: name.trim(),
          role,
          phone: formattedPhone,
          email: formattedEmail,
          isEmergencyContact,
          status: inviteNow ? "invited" : "contact_only",
          permissions: perms,
        });

        if (inviteNow && formattedEmail && created?.id) {
          try {
            const token = created.inviteToken || created.invite_token || created.sleutel || created.id;
            await supabase.functions.invoke("manage-caregivers", {
              body: {
                action: "send-invite-email",
                caregiver_id: created.id,
                email: formattedEmail,
                invite_token: token,
                origin,
                lang: i18n?.language || "nl",
                parent_name: parentName,
              },
            });
          } catch (mailErr) {
            console.warn("[AddFamilyMemberModal] send-invite-email create notice:", mailErr);
          }
        }

        if (onCreated) {
          onCreated(created, inviteNow);
        }
        onClose();
      }
    } catch (err) {
      console.error("Error saving family member:", err);
      setError(t("common.fout", "Something went wrong. Please try again."));
    } finally {
      setSubmitting(false);
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
    <div className="absolute inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs rounded-3xl overflow-hidden animate-in fade-in duration-150">
      <div className="relative w-full max-h-[92%] flex flex-col bg-card border border-border rounded-3xl shadow-xl overflow-hidden my-auto">
        {/* Header - Fixed at top */}
        <div className="flex items-center justify-between border-b border-border px-6 py-3.5 shrink-0 bg-card">
          <div className="flex items-center gap-2.5">
            <div className="grid size-9 place-items-center rounded-xl bg-brand/12 text-brand">
              <HeartHandshake className="size-5" />
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-ink">
                {isEditing
                  ? t("circle.editFamilyMember", "Familielid of betrokkene bewerken")
                  : t("circle.addFamilyMember", "Add family member or contact")}
              </h3>
              <p className="text-xs text-ink-soft">
                {isEditing
                  ? t("circle.editMemberDesc", "Pas de contactgegevens, rol en gekoppelde kinderen aan.")
                  : t("circle.saveAsContactDesc", "Stored in your address book without app access or legal custody.")}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-soft hover:text-ink hover:bg-muted/60 transition cursor-pointer"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Scrollable Form Body */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {error && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                {error}
              </div>
            )}

            {/* 2-Column Grid for Form Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* 1. Name * */}
              <div>
                <label className="block text-xs font-semibold text-ink-soft mb-1">
                  {t("circle.name", "Name")} *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Grandma Marja"
                  className="w-full h-[42px] rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-soft/40 focus:outline-hidden focus:ring-2 focus:ring-brand/30"
                />
              </div>

              {/* 2. Role * */}
              <div>
                <label className="block text-xs font-semibold text-ink-soft mb-1">
                  {t("circle.whoWouldYouLikeToAdd", "Who do you want to add?")} *
                </label>
                <select
                  required
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full h-[42px] rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-ink focus:outline-hidden focus:ring-2 focus:ring-brand/30 cursor-pointer"
                >
                  {roleOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Phone number * */}
              <div className="phone-input-wrapper">
                <label className="block text-xs font-semibold text-ink-soft mb-1">
                  {t("circle.phone", "Phone number")} *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="+31 6 12345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full h-[42px] rounded-xl border border-border bg-background px-3 text-sm text-ink outline-none focus:ring-2 focus:ring-brand/30 transition"
                />
              </div>

              {/* 4. Email address * */}
              <div>
                <label className="block text-xs font-semibold text-ink-soft mb-1">
                  {t("circle.email", "Email address")} *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@mail.com"
                  className="w-full h-[42px] rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-soft/40 focus:outline-hidden focus:ring-2 focus:ring-brand/30"
                />
              </div>

              {/* Children Selection - Spanning full width */}
              {childrenList.length > 0 && (
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-ink-soft mb-1.5">
                    {t("circle.involvedChildren", "Betrokken kinderen")} *
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {childrenList.map((c) => {
                      const isChecked = selectedChildIds.includes(c.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setSelectedChildIds((prev) =>
                              isChecked
                                ? prev.filter((id) => id !== c.id)
                                : [...prev, c.id]
                            );
                            if (error) setError("");
                          }}
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border transition cursor-pointer ${
                            isChecked
                              ? "border-brand bg-brand-soft text-brand font-bold shadow-2xs"
                              : "border-border text-ink-soft hover:border-brand/40"
                          }`}
                        >
                          {isChecked && <UserCheck className="size-3 text-brand" />}
                          <span>{c.name || c.naam}</span>
                        </button>
                      );
                    })}
                  </div>
                  {selectedChildIds.length === 0 && (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1.5 font-medium">
                      {t("circle.selectAtLeastOneChildHint", "Selecteer minimaal één kind dat gekoppeld wordt aan dit familielid.")}
                    </p>
                  )}
                </div>
              )}

              {/* Emergency Contact Checkbox - Spanning full width */}
              <div className="sm:col-span-2">
                <label className="flex items-center gap-2.5 cursor-pointer pt-0.5">
                  <input
                    type="checkbox"
                    checked={isEmergencyContact}
                    onChange={(e) => setIsEmergencyContact(e.target.checked)}
                    className="size-4 rounded border-border text-brand focus:ring-brand cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-ink">
                    {t("circle.emergencyContactLabel", "Designate as emergency contact")}
                  </span>
                </label>
              </div>

              {/* Direct Invite Toggle - Spanning full width */}
              <div className="sm:col-span-2 rounded-xl border border-border/80 bg-background/50 p-3">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={inviteNow}
                    onChange={(e) => setInviteNow(e.target.checked)}
                    className="size-4 rounded border-border text-brand focus:ring-brand mt-0.5 cursor-pointer"
                  />
                  <div>
                    <span className="block text-xs font-bold text-ink">
                      {t("circle.inviteDirectlyLabel", "Stuur direct een uitnodigingslink")}
                    </span>
                    <span className="block text-[11px] text-ink-soft mt-0.5">
                      {t(
                        "circle.inviteDirectlyDesc",
                        "Geeft toegang tot de rustige verzorger-app om planning te bekijken en ophaalmomenten te bevestigen."
                      )}
                    </span>
                  </div>
                </label>
              </div>

              {/* Granular Permission Toggles - Always configurable upfront */}
              <div className="sm:col-span-2 rounded-2xl border border-border/80 bg-card p-4 space-y-3">
                <div>
                  <h4 className="text-xs font-bold text-ink">
                    {t("circle.permissionsTitle", "Toegangsrechten voor dit familielid")}
                  </h4>
                  <p className="text-[11px] text-ink-soft mt-0.5">
                    {t("circle.permissionsSubtitle", "Kies precies welke onderdelen zichtbaar zijn in de verzorger-app.")}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  {/* 1. Handovers & Schedule */}
                  <label className={`flex items-start gap-2.5 p-3 rounded-xl border transition cursor-pointer ${canHandovers ? "border-brand/40 bg-brand-soft/30 shadow-2xs" : "border-border bg-background"}`}>
                    <input
                      type="checkbox"
                      checked={canHandovers}
                      onChange={(e) => setCanHandovers(e.target.checked)}
                      className="size-4 rounded border-border text-brand focus:ring-brand mt-0.5 cursor-pointer"
                    />
                    <div className="min-w-0">
                      <span className="block text-xs font-bold text-ink flex items-center gap-1.5">
                        <Calendar className="size-3.5 text-brand" />
                        <span>{t("circle.permHandovers", "Wissels & planning")}</span>
                      </span>
                      <span className="block text-[11px] text-ink-soft mt-0.5 leading-snug">
                        {t("circle.permHandoversDesc", "Inzicht in ophaal- en brengtijden en locaties.")}
                      </span>
                    </div>
                  </label>

                  {/* 2. Photo Moments */}
                  <label className={`flex items-start gap-2.5 p-3 rounded-xl border transition cursor-pointer ${canMoments ? "border-brand/40 bg-brand-soft/30 shadow-2xs" : "border-border bg-background"}`}>
                    <input
                      type="checkbox"
                      checked={canMoments}
                      onChange={(e) => setCanMoments(e.target.checked)}
                      className="size-4 rounded border-border text-brand focus:ring-brand mt-0.5 cursor-pointer"
                    />
                    <div className="min-w-0">
                      <span className="block text-xs font-bold text-ink flex items-center gap-1.5">
                        <Heart className="size-3.5 text-brand" />
                        <span>{t("circle.permMoments", "Momentjes & foto's")}</span>
                      </span>
                      <span className="block text-[11px] text-ink-soft mt-0.5 leading-snug">
                        {t("circle.permMomentsDesc", "Foto's en updates gedeeld door ouders.")}
                      </span>
                    </div>
                  </label>

                  {/* 3. Packing & Tasks */}
                  <label className={`flex items-start gap-2.5 p-3 rounded-xl border transition cursor-pointer ${canTasks ? "border-brand/40 bg-brand-soft/30 shadow-2xs" : "border-border bg-background"}`}>
                    <input
                      type="checkbox"
                      checked={canTasks}
                      onChange={(e) => setCanTasks(e.target.checked)}
                      className="size-4 rounded border-border text-brand focus:ring-brand mt-0.5 cursor-pointer"
                    />
                    <div className="min-w-0">
                      <span className="block text-xs font-bold text-ink flex items-center gap-1.5">
                        <CheckSquare className="size-3.5 text-brand" />
                        <span>{t("circle.permTasks", "Spullen & taken")}</span>
                      </span>
                      <span className="block text-[11px] text-ink-soft mt-0.5 leading-snug">
                        {t("circle.permTasksDesc", "Wat er mee moet in de tas en ophaaltaken.")}
                      </span>
                    </div>
                  </label>

                  {/* 4. Emergency & Health */}
                  <label className={`flex items-start gap-2.5 p-3 rounded-xl border transition cursor-pointer ${canEmergency ? "border-brand/40 bg-brand-soft/30 shadow-2xs" : "border-border bg-background"}`}>
                    <input
                      type="checkbox"
                      checked={canEmergency}
                      onChange={(e) => setCanEmergency(e.target.checked)}
                      className="size-4 rounded border-border text-brand focus:ring-brand mt-0.5 cursor-pointer"
                    />
                    <div className="min-w-0">
                      <span className="block text-xs font-bold text-ink flex items-center gap-1.5">
                        <ShieldPlus className="size-3.5 text-brand" />
                        <span>{t("circle.permEmergency", "Noodkaart & medisch")}</span>
                      </span>
                      <span className="block text-[11px] text-ink-soft mt-0.5 leading-snug">
                        {t("circle.permEmergencyDesc", "Allergieën, huisarts en noodinformatie.")}
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Safety Notice - Spanning full width */}
              <div className="sm:col-span-2 flex items-start gap-2 rounded-xl bg-muted/40 p-3 text-[11px] text-ink-soft leading-relaxed">
                <Shield className="size-4 shrink-0 text-brand mt-0.5" />
                <span>
                  {inviteNow
                    ? t(
                        "circle.caregiverPrivacyNotice",
                        "Verzorgers zien uitsluitend de voor hen ingestelde planning en noodinformatie. Privégesprekken, financiën en juridische documenten blijven altijd verborgen."
                      )
                    : t(
                        "circle.saveAsContactDesc",
                        "Stored in your address book without app access or legal custody. Section permissions can be configured in the Family Circle."
                      )}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons - Fixed at bottom */}
          <div className="flex items-center justify-end gap-2.5 px-6 py-3.5 border-t border-border shrink-0 bg-card">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-xl border border-border px-5 py-2.5 text-xs font-semibold text-ink hover:bg-muted/50 transition cursor-pointer"
            >
              {t("common.annuleren", "Cancel")}
            </button>
            <button
              type="submit"
              disabled={submitting || !name.trim() || !role || !phone || !email.trim()}
              className="min-w-[120px] inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand px-6 py-2.5 text-xs font-bold text-primary-foreground shadow-2xs hover:bg-brand/90 disabled:opacity-50 transition cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>{t("common.laden", "Saving...")}</span>
                </>
              ) : isEditing ? (
                <span>{t("circle.saveChanges", "Wijzigingen opslaan")}</span>
              ) : (
                <span>{t("common.opslaan", "Save")}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return phoneEl ? createPortal(modalNode, phoneEl) : modalNode;
}
