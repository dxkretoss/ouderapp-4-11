import React, { useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import { Users, UserX, CheckCircle2, ShieldAlert, Calendar, Shield, Eye, ChevronDown, ChevronUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { disconnectCoParent } from "@/lib/invitation-service";
import { ConfirmModal } from "@/components/ConfirmModal";

export function ManageCoParentModal({ open, onClose, coParent, childrenList = [], onDisconnected }) {
  const { t, i18n } = useTranslation();
  const isEn = Boolean(i18n.language && i18n.language.startsWith("en"));
  const { user, refreshProfile } = useAuth();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState(null);
  const [permissionsOpen, setPermissionsOpen] = useState(false);

  if (!coParent) return null;

  const coParentName = coParent.name || coParent.email?.split("@")[0] || (isEn ? "Co-parent" : "Co-ouder");
  const isInvitedUser = Boolean(coParent.is_invited);

  const sharedKids = (coParent.child_ids || [])
    .map((cId) => childrenList.find((c) => c.id === cId))
    .filter(Boolean);

  const handleConfirmDisconnect = async () => {
    if (!user?.id || !coParent.id) return;
    setDisconnecting(true);
    setError(null);

    try {
      await disconnectCoParent({
        currentUserId: user.id,
        coParentId: coParent.id,
        invitationId: coParent.invitation_id,
      });

      if (refreshProfile) {
        await refreshProfile();
      }

      setConfirmOpen(false);
      onClose?.();
      onDisconnected?.();
    } catch (err) {
      console.error("Failed to disconnect co-parent:", err);
      setError(err?.message || (isEn ? "Failed to disconnect." : "Verbinding verbreken mislukt."));
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <>
      <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && onClose?.()}>
        <AlertDialogContent className="max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
          <AlertDialogHeader className="space-y-2 text-left border-b border-border/80 pb-4">
            <div className="flex items-center gap-3">
              <div className="grid size-11 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-600">
                <Users className="size-5" />
              </div>
              <div>
                <AlertDialogTitle className="font-display text-lg font-bold text-ink">
                  {t("coParent.manageTitle", "Co-ouder verbinding beheren")}
                </AlertDialogTitle>
                <AlertDialogDescription className="text-xs text-ink-soft">
                  {t("coParent.manageDesc", "Status en instellingen van jullie gezamenlijke account.")}
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>

          {/* Co-Parent Profile Preview */}
          <div className="mt-4 space-y-4">
            <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-50/50 p-3.5 dark:bg-emerald-950/20">
              <span className="grid size-11 place-items-center rounded-xl bg-emerald-600 font-display text-base font-bold text-white shadow-2xs">
                {coParentName.slice(0, 1).toUpperCase()}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-ink truncate">{coParentName}</span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                    <CheckCircle2 className="size-3 text-emerald-700" />
                    <span>{t("children.connectedCoParent", "Verbonden")}</span>
                  </span>
                </div>
                <p className="text-xs text-ink-soft truncate">{coParent.email}</p>
              </div>
            </div>

            {/* Connection Details */}
            {coParent.accepted_at && (
              <div className="flex items-center gap-2 text-xs text-ink-soft px-1">
                <Calendar className="size-3.5 text-ink-soft/70" />
                <span>
                  {t("coParent.connectedSince", "Verbonden sinds")}:{" "}
                  <strong className="text-ink">
                    {new Date(coParent.accepted_at).toLocaleDateString(
                      isEn ? "en-US" : "nl-NL",
                      { day: "numeric", month: "long", year: "numeric" }
                    )}
                  </strong>
                </span>
              </div>
            )}

            {/* Shared Children Badges */}
            {sharedKids.length > 0 && (
              <div className="rounded-2xl border border-border bg-surface p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-ink-soft mb-2">
                  {t("circle.sharedChildren", "Gedeelde Kinderen")}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {sharedKids.map((c) => (
                    <span
                      key={c.id}
                      className="inline-flex items-center gap-1.5 rounded-full bg-card border border-border px-2.5 py-1 text-xs font-semibold text-ink shadow-2xs"
                    >
                      <span
                        className="size-2 rounded-full shrink-0"
                        style={{ backgroundColor: c.kleur || "#3C6E71" }}
                      />
                      <span>{c.naam}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Parental Authority (Gezag) per Child */}
            {sharedKids.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-3.5 space-y-2 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="size-4 text-brand" />
                    <p className="text-xs font-bold text-ink">
                      {t("coParent.gezagPerKind", "Ouderlijk gezag per kind")}
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  {sharedKids.map((c) => {
                    const custody = c.custody || "gezamenlijk";
                    const isGezamenlijk = custody === "gezamenlijk";
                    return (
                      <div
                        key={c.id}
                        className="flex items-center justify-between rounded-xl border border-border/60 bg-background/50 px-3 py-2 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="size-2 rounded-full shrink-0"
                            style={{ backgroundColor: c.kleur || "#3C6E71" }}
                          />
                          <span className="font-semibold text-ink">{c.naam}</span>
                        </div>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          isGezamenlijk ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                        }`}>
                          {isGezamenlijk
                            ? t("firstHome.custodyJoint", "Gezamenlijk gezag")
                            : t("firstHome.custodySole", "Eén ouder")}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Information Access & Permissions */}
            <div className="rounded-2xl border border-border bg-card p-3.5 space-y-2 shadow-2xs">
              <button
                type="button"
                onClick={() => setPermissionsOpen(!permissionsOpen)}
                className="flex w-full items-center justify-between text-left cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Eye className="size-4 text-brand" />
                  <div>
                    <p className="text-xs font-bold text-ink">
                      {t("coParent.accessPermissionsTitle", "Informatie & toegangsrechten")}
                    </p>
                    <p className="text-[11px] text-ink-soft">
                      {t("coParent.accessPermissionsSub", "Wat deze gekoppelde ouder kan inzien en bewerken.")}
                    </p>
                  </div>
                </div>
                {permissionsOpen ? <ChevronUp className="size-4 text-ink-soft" /> : <ChevronDown className="size-4 text-ink-soft" />}
              </button>

              {permissionsOpen && (
                <div className="pt-2 border-t border-border/60 space-y-2 text-xs">
                  <div className="flex items-center justify-between py-1">
                    <span className="text-ink font-medium">{t("navigation.calendar", "Agenda & afspraken")}</span>
                    <span className="rounded-md bg-brand-soft px-2 py-0.5 text-[10px] font-bold text-brand">
                      {t("coParent.viewAndEdit", "Inzien & Voorstellen")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-ink font-medium">{t("navigation.costs", "Kosten & verrekenen")}</span>
                    <span className="rounded-md bg-brand-soft px-2 py-0.5 text-[10px] font-bold text-brand">
                      {t("coParent.viewAndSettle", "Inzien & Afrekenen")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-ink font-medium">{t("navigation.careSchedule", "Zorgregeling")}</span>
                    <span className="rounded-md bg-brand-soft px-2 py-0.5 text-[10px] font-bold text-brand">
                      {t("coParent.viewAndCoordinate", "Inzien & Afstemmen")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-ink font-medium">{t("navigation.documents", "Documenten & School")}</span>
                    <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-bold text-ink-soft">
                      {t("coParent.viewOnly", "Inzien")}
                    </span>
                  </div>
                  <p className="text-[10px] text-ink-soft pt-1 leading-relaxed">
                    {t("coParent.legalNotice", "Persoonlijke privégroepen, privé-afspraken en persoonlijke notities blijven altijd strikt privé en worden nooit gedeeld.")}
                  </p>
                </div>
              )}
            </div>

            {/* Role Notice */}
            {isInvitedUser ? (
              <div className="rounded-xl border border-amber-500/30 bg-amber-50/70 p-3 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                <div className="flex items-start gap-2">
                  <ShieldAlert className="size-4 shrink-0 text-amber-700 dark:text-amber-400 mt-0.5" />
                  <p>
                    {t(
                      "coParent.invitedNoticeReadOnly",
                      "Je bent uitgenodigd door deze co-ouder (hoofdbeheerder). Je kunt de kindergegevens en het profiel bekijken en beheren. Alleen de hoofdbeheerder kan de verbinding verbreken of anderen uitnodigen."
                    )}
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-brand/20 bg-brand-soft/40 p-3 text-xs text-brand">
                <div className="flex items-start gap-2">
                  <Users className="size-4 shrink-0 text-brand mt-0.5" />
                  <p>
                    {t(
                      "coParent.creatorNotice",
                      "Jij hebt deze co-ouder uitgenodigd. Jullie delen toegang tot de gekoppelde kinderprofielen en afspraken."
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* Disconnect Warning (Only shown to primary parent who has disconnect permission) */}
            {!isInvitedUser && (
              <div className="rounded-xl border border-border bg-muted/40 p-3 text-[11px] text-ink-soft leading-relaxed">
                <strong className="block text-ink font-semibold mb-1">
                  {t("coParent.disconnectEffectTitle", "Wat gebeurt er bij ontkoppelen?")}
                </strong>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>{t("coParent.disconnectEffect1", "Gedeelde kinderprofielen en data worden direct gescheiden.")}</li>
                  <li>{t("coParent.disconnectEffect2", "Beide accounts schakelen automatisch over naar solo-modus.")}</li>
                  <li>{t("coParent.disconnectEffect3", "De uitgenodigde ouder kan daarna zelfstandig een eigen gezin opstarten.")}</li>
                </ul>
              </div>
            )}

            {error && (
              <p className="rounded-lg bg-destructive/10 p-2.5 text-xs font-semibold text-destructive">
                {error}
              </p>
            )}
          </div>

          <AlertDialogFooter className="mt-4 flex flex-col-reverse sm:flex-row sm:justify-between items-center gap-2.5 border-t border-border/80 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={disconnecting}
              className={`w-full sm:w-auto rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-semibold text-ink hover:bg-muted/50 transition ${isInvitedUser ? "sm:ml-auto" : ""}`}
            >
              {t("common.sluiten", isEn ? "Close" : "Sluiten")}
            </button>

            {!isInvitedUser && (
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                disabled={disconnecting}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-2.5 text-xs font-bold text-destructive hover:bg-destructive hover:text-white transition"
              >
                <UserX className="size-3.5" />
                <span>{t("coParent.disconnectButton", "Verbinding verbreken")}</span>
              </button>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation Modal */}
      <ConfirmModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmDisconnect}
        loading={disconnecting}
        title={t("coParent.disconnectConfirmTitle", "Verbinding verbreken?")}
        description={t(
          "coParent.disconnectConfirmDesc",
          "Weet je zeker dat je de verbinding met {{name}} wilt verbreken? Jullie delen daarna geen kinderprofielen of gegevens meer met elkaar. Beide accounts keren terug naar de solo-modus.",
          { name: coParentName }
        )}
        confirmText={t("coParent.yesDisconnect", "Ja, verbinding verbreken")}
        cancelText={t("common.annuleren", isEn ? "Cancel" : "Annuleren")}
        variant="destructive"
        icon={UserX}
      />
    </>
  );
}
