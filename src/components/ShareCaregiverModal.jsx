import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import {
  Copy,
  Mail,
  Share2,
  X,
  ShieldCheck,
  Check,
  Loader2,
  Send,
  Calendar,
  Heart,
  CheckSquare,
  ShieldPlus,
  UserCheck,
} from "lucide-react";
import { updateCaregiver } from "@/lib/caregiver-service";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export function ShareCaregiverModal({
  open,
  onClose,
  caregiver,
  childrenList = [],
  onStatusUpdated,
}) {
  const { t, i18n } = useTranslation();
  const { profile, user } = useAuth();
  const parentName = profile?.name || user?.name || "";
  const [copied, setCopied] = useState(false);
  const [targetEmail, setTargetEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [sendError, setSendError] = useState("");

  const [editingEmail, setEditingEmail] = useState(false);

  // Permission states
  const [canHandovers, setCanHandovers] = useState(true);
  const [canMoments, setCanMoments] = useState(true);
  const [canTasks, setCanTasks] = useState(true);
  const [canEmergency, setCanEmergency] = useState(false);
  const [selectedChildIds, setSelectedChildIds] = useState([]);
  const [permsSaving, setPermsSaving] = useState(false);
  const [permsSavedNotice, setPermsSavedNotice] = useState(false);

  useEffect(() => {
    if (caregiver) {
      setTargetEmail(caregiver.email || "");
      setSendSuccess(false);
      setSendError("");
      setEditingEmail(false);
      setPermsSavedNotice(false);

      const perms = caregiver.permissions || {};
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
        setCanEmergency(Boolean(caregiver.isEmergencyContact || caregiver.noodcontact));
      }

      if (caregiver.permissions && Object.keys(caregiver.permissions).length > 0) {
        setSelectedChildIds(Object.keys(caregiver.permissions));
      } else if (childrenList && childrenList.length > 0) {
        setSelectedChildIds(childrenList.map((c) => c.id));
      } else {
        setSelectedChildIds([]);
      }
    }
  }, [caregiver, childrenList]);

  if (!open || !caregiver) return null;

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const token = caregiver.invite_token || caregiver.inviteToken || caregiver.sleutel || caregiver.id || "";
  const link = `${origin}/uitnodiging?t=${encodeURIComponent(token)}`;
  const nameStr = caregiver.name || caregiver.naam || "";
  const isAlreadyInvited = (caregiver.status === "invited" || sendSuccess) && Boolean(targetEmail || caregiver.email);

  const buildPermsObject = (childIds, handovers, moments, tasks, emergency) => {
    const res = {};
    const kids = childIds.length > 0 ? childIds : (childrenList || []).map((c) => c.id);
    kids.forEach((cId) => {
      res[cId] = {
        handovers: handovers ? "view" : "none",
        wissel: handovers ? "view" : "none",
        calendar: handovers ? "view" : "none",
        agenda: handovers ? "view" : "none",
        moments: moments ? "view" : "none",
        momentjes: moments ? "view" : "none",
        tasks: tasks ? "view" : "none",
        taken: tasks ? "view" : "none",
        packing_items: tasks ? "view" : "none",
        spullen: tasks ? "view" : "none",
        emergency_info: emergency ? "view" : "none",
        nood: emergency ? "view" : "none",
      };
    });
    return res;
  };

  const persistPermissions = async (nextChildIds, nextHandovers, nextMoments, nextTasks, nextEmergency) => {
    const updatedPerms = buildPermsObject(nextChildIds, nextHandovers, nextMoments, nextTasks, nextEmergency);
    setPermsSaving(true);
    try {
      await updateCaregiver(caregiver.id, { permissions: updatedPerms });
      setPermsSavedNotice(true);
      setTimeout(() => setPermsSavedNotice(false), 2000);
      if (onStatusUpdated) {
        onStatusUpdated({ ...caregiver, permissions: updatedPerms });
      }
    } catch (err) {
      console.warn("Failed to update caregiver permissions:", err);
    } finally {
      setPermsSaving(false);
    }
  };

  const handleTogglePermission = (type) => {
    const nextHandovers = type === "handovers" ? !canHandovers : canHandovers;
    const nextMoments = type === "moments" ? !canMoments : canMoments;
    const nextTasks = type === "tasks" ? !canTasks : canTasks;
    const nextEmergency = type === "emergency" ? !canEmergency : canEmergency;

    if (type === "handovers") setCanHandovers(nextHandovers);
    if (type === "moments") setCanMoments(nextMoments);
    if (type === "tasks") setCanTasks(nextTasks);
    if (type === "emergency") setCanEmergency(nextEmergency);

    persistPermissions(selectedChildIds, nextHandovers, nextMoments, nextTasks, nextEmergency);
  };

  const handleToggleChild = (childId) => {
    let nextChildIds;
    if (selectedChildIds.includes(childId)) {
      if (selectedChildIds.length === 1) return; // Keep at least one child selected
      nextChildIds = selectedChildIds.filter((id) => id !== childId);
    } else {
      nextChildIds = [...selectedChildIds, childId];
    }
    setSelectedChildIds(nextChildIds);
    persistPermissions(nextChildIds, canHandovers, canMoments, canTasks, canEmergency);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);

      const updatedPerms = buildPermsObject(selectedChildIds, canHandovers, canMoments, canTasks, canEmergency);

      // If status was contact_only, promote to invited and save latest perms
      const nextStatus = caregiver.status === "contact_only" ? "invited" : caregiver.status;
      await updateCaregiver(caregiver.id, {
        status: nextStatus,
        permissions: updatedPerms,
      });

      if (onStatusUpdated) {
        onStatusUpdated({ ...caregiver, status: nextStatus, permissions: updatedPerms });
      }
    } catch (err) {
      console.warn("Failed to copy link:", err);
    }
  };

  const handleSendInvite = async (e) => {
    if (e) e.preventDefault();
    const cleanEmail = (targetEmail || "").trim();

    if (!cleanEmail || !/.+@.+\..+/.test(cleanEmail)) {
      setSendError(t("circle.enterValidEmail", "Voer een geldig e-mailadres in."));
      return;
    }

    setSending(true);
    setSendError("");

    try {
      const updatedPerms = buildPermsObject(selectedChildIds, canHandovers, canMoments, canTasks, canEmergency);

      // 1. Update caregiver with email, permissions, and set status to "invited"
      await updateCaregiver(caregiver.id, {
        email: cleanEmail,
        status: "invited",
        permissions: updatedPerms,
      });

      // 2. Trigger Edge Function to dispatch invitation email
      try {
        await supabase.functions.invoke("manage-caregivers", {
          body: {
            action: "send-invite-email",
            caregiver_id: caregiver.id,
            email: cleanEmail,
            invite_token: token,
            origin,
            lang: i18n.language || "nl",
            parent_name: parentName,
          },
        });
      } catch (invokeErr) {
        console.warn("[ShareCaregiverModal] send-invite-email Edge Function notice:", invokeErr);
      }

      setSendSuccess(true);
      setEditingEmail(false);
      if (onStatusUpdated) {
        onStatusUpdated({
          ...caregiver,
          email: cleanEmail,
          status: "invited",
          permissions: updatedPerms,
        });
      }
    } catch (err) {
      console.error("Failed to send invitation:", err);
      setSendError(t("common.fout", "Er ging iets mis. Probeer het opnieuw."));
    } finally {
      setSending(false);
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
        <div className="flex items-center justify-between border-b border-border px-5 py-4 shrink-0 bg-card">
          <div className="flex items-center gap-2.5">
            <div className="grid size-9 place-items-center rounded-xl bg-brand/12 text-brand">
              <Share2 className="size-5" />
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-ink">
                {isAlreadyInvited
                  ? t("circle.resendInvitationLink", "Uitnodiging opnieuw versturen")
                  : t("circle.shareInviteTitle", {
                      defaultValue: "Deel uitnodigingslink",
                      name: nameStr,
                    })}
              </h3>
              <p className="text-xs text-ink-soft">
                {isAlreadyInvited
                  ? t("circle.invitedSendOnEmail", { email: targetEmail || caregiver.email })
                  : t("circle.shareInviteSubtitle", {
                      defaultValue: "Stuur een veilige link naar {{name}}",
                      name: nameStr,
                    })}
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

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Direct Send Invitation via Email Section */}
          {isAlreadyInvited && !editingEmail ? (
            <div className="rounded-2xl border border-brand/20 bg-brand-soft/30 p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="grid size-9 place-items-center rounded-xl bg-brand/12 text-brand shrink-0">
                    <Mail className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-ink truncate">
                      {t("circle.invitedSendOnEmail", { email: targetEmail || caregiver.email })}
                    </p>
                    <p className="text-[11px] text-ink-soft mt-0.5">
                      {t("circle.caregiverPendingNote", "Wacht op acceptatie door de verzorger")}
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 px-2.5 py-0.5 text-[10px] font-bold shrink-0">
                  {t("circle.statusInvited", "Uitgenodigd")}
                </span>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-brand/15">
                <button
                  type="button"
                  onClick={handleSendInvite}
                  disabled={sending}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-3.5 py-2 text-xs font-bold text-primary-foreground hover:bg-brand/90 transition disabled:opacity-50 cursor-pointer shadow-2xs"
                >
                  {sending ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      <span>{t("circle.sendingInvite", "Versturen...")}</span>
                    </>
                  ) : (
                    <>
                      <Send className="size-3.5" />
                      <span>{t("circle.resendInvite", "Opnieuw versturen")}</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setEditingEmail(true)}
                  className="text-xs font-semibold text-brand hover:underline px-2 py-1 cursor-pointer"
                >
                  {t("circle.changeEmail", "Ander e-mailadres")}
                </button>
              </div>

              {sendSuccess && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs text-emerald-700 dark:text-emerald-300 font-semibold animate-in fade-in">
                  <Check className="size-4 shrink-0 text-emerald-600" />
                  <span>
                    {t("circle.inviteSentSuccess", {
                      defaultValue: "Uitnodiging succesvol verstuurd naar {{email}}!",
                      email: targetEmail,
                    })}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSendInvite} className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-ink-soft">
                  {t("circle.recipientEmail", "E-mailadres")}
                </label>
                {editingEmail && (
                  <button
                    type="button"
                    onClick={() => setEditingEmail(false)}
                    className="text-[11px] font-semibold text-ink-soft hover:text-ink cursor-pointer"
                  >
                    {t("common.cancel", "Annuleren")}
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="email"
                    value={targetEmail}
                    onChange={(e) => {
                      setTargetEmail(e.target.value);
                      if (sendError) setSendError("");
                      if (sendSuccess) setSendSuccess(false);
                    }}
                    placeholder={t("circle.emailPlaceholder", "bijv. naam@voorbeeld.nl")}
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs text-ink placeholder:text-ink-soft/40 focus:outline-hidden focus:ring-2 focus:ring-brand/30"
                  />
                </div>
                <button
                  type="submit"
                  disabled={sending || !targetEmail.trim()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-xs font-bold text-primary-foreground shadow-2xs hover:bg-brand/90 disabled:opacity-50 transition cursor-pointer shrink-0"
                >
                  {sending ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      <span>{t("circle.sendingInvite", "Versturen...")}</span>
                    </>
                  ) : (
                    <>
                      <Send className="size-3.5" />
                      <span>
                        {caregiver.status === "invited"
                          ? t("circle.resendInvite", "Opnieuw versturen")
                          : t("circle.sendInviteEmail", "Verstuur uitnodiging")}
                      </span>
                    </>
                  )}
                </button>
              </div>

              {sendError && (
                <p className="text-xs text-destructive font-medium">{sendError}</p>
              )}

              {sendSuccess && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs text-emerald-700 dark:text-emerald-300 font-semibold">
                  <Check className="size-4 shrink-0 text-emerald-600" />
                  <span>
                    {t("circle.inviteSentSuccess", {
                      defaultValue: "Uitnodiging succesvol verstuurd naar {{email}}!",
                      email: targetEmail,
                    })}
                  </span>
                </div>
              )}
            </form>
          )}

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="w-full border-t border-border/80" />
            <span className="absolute bg-card px-3 text-[11px] font-semibold text-ink-soft uppercase tracking-wider">
              {t("circle.orCopyLink", "Of kopieer de persoonlijke link")}
            </span>
          </div>

          {/* Personal Link Box */}
          <div>
            <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 p-2">
              <input
                type="text"
                readOnly
                value={link}
                className="flex-1 bg-transparent px-2 text-xs text-ink font-mono select-all focus:outline-hidden truncate"
              />
              <button
                type="button"
                onClick={handleCopy}
                className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer shrink-0 ${
                  copied
                    ? "bg-emerald-600 text-white"
                    : "bg-brand text-primary-foreground hover:bg-brand/90"
                }`}
              >
                {copied ? (
                  <>
                    <Check className="size-3.5" />
                    <span>{t("common.copied", "Gekopieerd!")}</span>
                  </>
                ) : (
                  <>
                    <Copy className="size-3.5" />
                    <span>{t("common.copy", "Kopiëren")}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Permissions & Child Access Section */}
          <div className="rounded-2xl border border-border/80 bg-card p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-bold text-ink">
                  {t("circle.permissionsTitle", "Toegangsrechten voor dit familielid")}
                </h4>
                <p className="text-[11px] text-ink-soft mt-0.5">
                  {t("circle.permissionsSubtitle", "Kies precies welke onderdelen zichtbaar zijn in de verzorger-app.")}
                </p>
              </div>
              {permsSavedNotice && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 px-2 py-0.5 rounded-full animate-in fade-in shrink-0">
                  <Check className="size-3 text-emerald-600" />
                  <span>{t("common.saved", "Opgeslagen")}</span>
                </span>
              )}
            </div>

            {/* Linked Children Selection (if more than 1 child) */}
            {childrenList && childrenList.length > 1 && (
              <div className="pt-1">
                <span className="block text-[11px] font-semibold text-ink-soft mb-1.5">
                  {t("circle.involvedChildren", "Betrokken kinderen")}:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {childrenList.map((c) => {
                    const isSelected = selectedChildIds.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleToggleChild(c.id)}
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold border transition cursor-pointer ${
                          isSelected
                            ? "bg-brand text-primary-foreground border-brand shadow-2xs font-bold"
                            : "bg-background text-ink-soft border-border hover:bg-muted/50"
                        }`}
                      >
                        <UserCheck className={`size-3 ${isSelected ? "text-primary-foreground" : "text-brand"}`} />
                        <span>{c.naam || c.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 4 Permission Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {/* 1. Handovers */}
              <label
                className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition cursor-pointer ${
                  canHandovers ? "border-brand/40 bg-brand-soft/30 shadow-2xs" : "border-border bg-background"
                }`}
              >
                <input
                  type="checkbox"
                  checked={canHandovers}
                  onChange={() => handleTogglePermission("handovers")}
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
              <label
                className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition cursor-pointer ${
                  canMoments ? "border-brand/40 bg-brand-soft/30 shadow-2xs" : "border-border bg-background"
                }`}
              >
                <input
                  type="checkbox"
                  checked={canMoments}
                  onChange={() => handleTogglePermission("moments")}
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
              <label
                className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition cursor-pointer ${
                  canTasks ? "border-brand/40 bg-brand-soft/30 shadow-2xs" : "border-border bg-background"
                }`}
              >
                <input
                  type="checkbox"
                  checked={canTasks}
                  onChange={() => handleTogglePermission("tasks")}
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

              {/* 4. Emergency & Medical */}
              <label
                className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition cursor-pointer ${
                  canEmergency ? "border-brand/40 bg-brand-soft/30 shadow-2xs" : "border-border bg-background"
                }`}
              >
                <input
                  type="checkbox"
                  checked={canEmergency}
                  onChange={() => handleTogglePermission("emergency")}
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

          {/* Privacy Notice */}
          <div className="flex items-start gap-2.5 rounded-xl bg-brand/8 border border-brand/15 p-3 text-[11px] text-ink-soft leading-relaxed">
            <ShieldCheck className="size-4 shrink-0 text-brand mt-0.5" />
            <span>
              {t(
                "circle.caregiverPrivacyNotice",
                "Verzorgers zien uitsluitend de voor hen ingestelde planning en noodinformatie. Privégesprekken, financiën en juridische documenten blijven altijd verborgen."
              )}
            </span>
          </div>
        </div>

        {/* Footer - Fixed at bottom */}
        <div className="border-t border-border px-5 py-3.5 bg-muted/20 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-brand px-5 py-2 text-xs font-bold text-primary-foreground hover:bg-brand/90 transition shadow-2xs cursor-pointer"
          >
            {t("common.sluiten", "Klaar")}
          </button>
        </div>
      </div>
    </div>
  );

  return phoneEl ? createPortal(modalNode, phoneEl) : modalNode;
}
