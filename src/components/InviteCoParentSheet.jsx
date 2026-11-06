import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { fetchChildren } from "@/lib/child-service";
import {
  sendCoParentInvitation,
  fetchSentInvitations,
  fetchConnectedCoParents,
  disconnectCoParent,
  cancelInvitation,
} from "@/lib/invitation-service";
import {
  Mail,
  UserPlus,
  Copy,
  Check,
  ExternalLink,
  Loader2,
  Trash2,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  Users,
  UserX,
  ShieldAlert,
  Clock,
} from "lucide-react";
import { ConfirmModal } from "@/components/ConfirmModal";

function getStatusBadge(status, t) {
  const s = (status || "").toLowerCase();
  switch (s) {
    case "sent":
      return {
        label: t("inviteCoParent.statusSent", "Sent"),
        className: "bg-blue-50 text-blue-700 border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
      };
    case "pending":
      return {
        label: t("inviteCoParent.statusPending", "Pending"),
        className: "bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
      };
    case "accepted":
      return {
        label: t("inviteCoParent.statusAccepted", "Accepted"),
        className: "bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
      };
    case "cancelled":
    case "revoked":
      return {
        label: t("inviteCoParent.statusCancelled", "Cancelled"),
        className: "bg-stone-100 text-stone-600 border-stone-200 dark:bg-muted dark:text-ink-soft dark:border-border",
      };
    case "expired":
      return {
        label: t("inviteCoParent.statusExpired", "Expired"),
        className: "bg-rose-50 text-rose-600 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
      };
    case "declined":
    case "rejected":
      return {
        label: t("inviteCoParent.statusDeclined", "Declined"),
        className: "bg-rose-50 text-rose-600 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
      };
    default:
      return {
        label: s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : "Unknown",
        className: "bg-muted text-ink-soft border-border",
      };
  }
}

export function InviteCoParentSheet({ open, onClose, onInvitationSent, initialChildId }) {
  const { t, i18n } = useTranslation();
  const isEn = Boolean(i18n.language && i18n.language.startsWith("en"));
  const { user, profile, refreshProfile } = useAuth();

  const [email, setEmail] = useState("");
  const [childrenList, setChildrenList] = useState([]);
  const [selectedKids, setSelectedKids] = useState({});
  const [loadingKids, setLoadingKids] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [generatedInvite, setGeneratedInvite] = useState(null);
  const [copied, setCopied] = useState(false);
  const [sentInvitations, setSentInvitations] = useState([]);
  const [connectedCoParents, setConnectedCoParents] = useState([]);
  const [inviteToCancel, setInviteToCancel] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [disconnectTarget, setDisconnectTarget] = useState(null);
  const [disconnecting, setDisconnecting] = useState(false);

  const isInvitedUser = connectedCoParents.some((cp) => cp.is_invited);

  const childConnectedMap = {};
  connectedCoParents.forEach((cp) => {
    (cp.child_ids || []).forEach((cid) => {
      childConnectedMap[cid] = cp;
    });
  });

  // Map which children currently have an active pending invitation
  const childPendingMap = {};
  (sentInvitations || []).forEach((inv) => {
    const isPending =
      (inv.status === "sent" || inv.status === "pending") &&
      (!inv.expires_at || new Date(inv.expires_at) > new Date());
    if (isPending) {
      (inv.child_ids || []).forEach((cid) => {
        if (!childPendingMap[cid]) {
          childPendingMap[cid] = inv;
        }
      });
    }
  });

  const allChildrenConnected =
    childrenList.length > 0 &&
    childrenList.every((k) => Boolean(childConnectedMap[k.id]));

  const allChildrenUnavailable =
    childrenList.length > 0 &&
    childrenList.every((k) => Boolean(childConnectedMap[k.id]) || Boolean(childPendingMap[k.id]));

  async function loadData() {
    if (!user?.id) return;
    setLoadingKids(true);
    try {
      const [kids, sent, connected] = await Promise.all([
        fetchChildren(user.id),
        fetchSentInvitations(user.id),
        fetchConnectedCoParents(user.id),
      ]);

      const kList = kids || [];
      const cpList = connected || [];
      const sentList = sent || [];
      setChildrenList(kList);
      setConnectedCoParents(cpList);
      setSentInvitations(sentList);

      // Map which children are already connected to a co-parent
      const childMap = {};
      cpList.forEach((cp) => {
        (cp.child_ids || []).forEach((cid) => {
          childMap[cid] = cp;
        });
      });

      // Map which children have an active pending invitation
      const pendingMap = {};
      sentList.forEach((inv) => {
        const isPending =
          (inv.status === "sent" || inv.status === "pending") &&
          (!inv.expires_at || new Date(inv.expires_at) > new Date());
        if (isPending) {
          (inv.child_ids || []).forEach((cid) => {
            if (!pendingMap[cid]) {
              pendingMap[cid] = inv;
            }
          });
        }
      });

      // Pre-select only children who do NOT yet have 2 connected parents AND do NOT have a pending invite
      const initSelection = {};
      if (initialChildId && !childMap[initialChildId] && !pendingMap[initialChildId]) {
        initSelection[initialChildId] = true;
      } else {
        kList.forEach((k) => {
          if (!childMap[k.id] && !pendingMap[k.id]) {
            initSelection[k.id] = true;
          }
        });
      }
      setSelectedKids(initSelection);
    } catch (err) {
      console.error("Failed to load invitation context:", err);
    } finally {
      setLoadingKids(false);
    }
  }

  // Load parent's children and sent invitations on open
  useEffect(() => {
    if (!open) {
      setGeneratedInvite(null);
      setError(null);
      setCopied(false);
      return;
    }

    loadData();
  }, [open, user?.id]);

  const handleConfirmDisconnect = async () => {
    if (!disconnectTarget || !user?.id) return;
    setDisconnecting(true);
    try {
      await disconnectCoParent({
        currentUserId: user.id,
        coParentId: disconnectTarget.id,
        invitationId: disconnectTarget.invitation_id,
      });
      if (refreshProfile) {
        await refreshProfile();
      }
      setDisconnectTarget(null);
      await loadData();
    } catch (err) {
      console.error("Disconnect co-parent error:", err);
      setError(err?.message || (isEn ? "Failed to disconnect." : "Verbinding verbreken mislukt."));
    } finally {
      setDisconnecting(false);
    }
  };

  const toggleKid = (id) => {
    setSelectedKids((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleSend = async (e) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !/.+@.+\..+/.test(cleanEmail)) {
      setError(isEn ? "Please enter a valid email address." : "Voer een geldig e-mailadres in.");
      return;
    }

    const chosenChildIds = Object.keys(selectedKids).filter((kId) => selectedKids[kId]);
    if (childrenList.length > 0 && chosenChildIds.length === 0) {
      setError(
        isEn
          ? "Please select at least one child to share with your co-parent."
          : "Selecteer ten minste één kind om te delen met de co-ouder."
      );
      return;
    }

    setSending(true);
    try {
      const result = await sendCoParentInvitation({
        toEmail: cleanEmail,
        childIds: chosenChildIds,
        fromParentId: user?.id,
      });

      setGeneratedInvite(result);
      if (onInvitationSent) onInvitationSent(result);

      // Refresh sent list
      if (user?.id) {
        const updated = await fetchSentInvitations(user.id);
        setSentInvitations(updated || []);
        // Also remove invited children from selection
        setSelectedKids((prev) => {
          const next = { ...prev };
          chosenChildIds.forEach((cid) => {
            delete next[cid];
          });
          return next;
        });
      }
    } catch (err) {
      setError(err.message || (isEn ? "Failed to send invitation." : "Versturen van uitnodiging mislukt."));
    } finally {
      setSending(false);
    }
  };

  const copyToClipboard = async () => {
    if (!generatedInvite?.inviteLink) return;
    try {
      await navigator.clipboard.writeText(generatedInvite.inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // fallback
    }
  };

  const handleConfirmCancel = async () => {
    if (!inviteToCancel) return;
    setCancelling(true);
    try {
      await cancelInvitation(inviteToCancel.id);
      const remaining = sentInvitations.filter((i) => i.id !== inviteToCancel.id);
      setSentInvitations(remaining);
      // Re-enable cancelled children into selection if not connected
      (inviteToCancel.child_ids || []).forEach((cid) => {
        if (!childConnectedMap[cid]) {
          setSelectedKids((prev) => ({ ...prev, [cid]: true }));
        }
      });
      setInviteToCancel(null);
      if (onInvitationSent) onInvitationSent();
    } catch (err) {
      console.error("Failed to cancel invitation:", err);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-3xl p-0 sm:max-w-lg sm:mx-auto">
          <SheetHeader className="border-b border-border/80 px-6 py-4 text-left">
            <div className="flex items-center gap-2">
              <span className="grid size-9 place-items-center rounded-xl bg-brand/12 text-brand">
                <UserPlus className="size-5" />
              </span>
              <div>
                <SheetTitle className="font-display text-xl font-bold text-ink">
                  {t("inviteCoParent.inviteCoParent")}
                </SheetTitle>
                <p className="text-xs text-ink-soft">
                  {t("inviteCoParent.connectTogetherToShareCareSchedules")}
                </p>
              </div>
            </div>
          </SheetHeader>

          <div className="p-6 pt-5">
            {error && (
              <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50/80 p-3 text-xs text-rose-700">
                {error}
              </div>
            )}

            {connectedCoParents.length > 0 && (
              <div className="mb-4 rounded-2xl border border-emerald-500/30 bg-emerald-50/70 p-4 text-xs text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
                <div className="flex items-start gap-3">
                  <Users className="size-5 shrink-0 text-emerald-700 dark:text-emerald-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-bold text-sm text-ink mb-1">
                      {t("coParent.alreadyConnectedTitle", "Verbonden co-ouders")}
                    </p>
                    <p className="leading-relaxed text-ink-soft mb-2.5">
                      {allChildrenConnected
                        ? t(
                          "coParent.allChildrenConnectedNotice",
                          "Al je kinderen hebben momenteel al twee verbonden ouders (maximaal 2 ouders per kind). Voeg eerst een kind toe om een nieuwe verbinding te maken."
                        )
                        : t(
                          "coParent.partialChildrenConnectedNotice",
                          "Je kunt hieronder een co-ouder uitnodigen voor de kinderen die nog geen tweede ouder hebben."
                        )}
                    </p>
                    <div className="space-y-1.5 border-t border-emerald-200/60 dark:border-emerald-800/60 pt-2">
                      {connectedCoParents.map((cp) => {
                        const sharedKids = childrenList.filter((k) =>
                          (cp.child_ids || []).includes(k.id)
                        );
                        const kidNames =
                          sharedKids.length > 0
                            ? sharedKids.map((k) => k.naam).join(", ")
                            : isEn
                              ? "Connected child"
                              : "Verbonden kind";
                        return (
                          <div key={cp.id || cp.invitation_id} className="flex items-center justify-between text-[11px]">
                            <span className="font-semibold text-ink">
                              {cp.name} ({kidNames})
                            </span>
                            <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                              {t("common.active", "Actief")}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {isInvitedUser ? (
              <div className="mt-2 rounded-2xl border border-amber-500/30 bg-amber-50/70 p-4 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="size-5 shrink-0 text-amber-700 dark:text-amber-400 mt-0.5" />
                  <div>
                    <p className="font-bold text-sm text-ink mb-1">
                      {t("coParent.invitedNoticeTitle", "Uitgenodigde co-ouder")}
                    </p>
                    <p className="leading-relaxed">
                      {t(
                        "coParent.invitedNotice",
                        "Je bent verbonden als uitgenodigde co-ouder. Alleen de beheerder kan andere personen uitnodigen. Als je ontkoppelt, keer je terug naar solo-modus en kun je zelfstandig uitnodigingen sturen."
                      )}
                    </p>
                  </div>
                </div>
              </div>
            ) : allChildrenConnected ? null : !generatedInvite ? (
              <form onSubmit={handleSend} className="mt-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-ink">
                    {t("inviteCoParent.coParentSEmailAddress")}
                  </label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3.5 top-3 size-4 text-ink-soft" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="bijv. ouder@voorbeeld.nl"
                      className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-3 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                      required
                    />
                  </div>
                </div>

                {/* Children Selection */}
                {childrenList.length > 0 && (
                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1.5">
                      {t("inviteCoParent.selectChildrenToShare")}
                    </label>
                    <div className="space-y-2 rounded-2xl border border-border bg-surface p-3">
                      {childrenList.map((k) => {
                        const linkedCp = childConnectedMap[k.id];
                        const isLinked = Boolean(linkedCp);
                        const pendingInv = childPendingMap[k.id];
                        const isPending = Boolean(pendingInv);
                        const isDisabled = isLinked || isPending;

                        return (
                          <label
                            key={k.id}
                            className={`flex items-center justify-between rounded-xl p-2.5 transition ${isDisabled
                              ? "bg-muted/40 opacity-70 cursor-not-allowed"
                              : "cursor-pointer bg-card hover:bg-muted/60"
                              }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 pr-2">
                              <span
                                className="grid size-7 place-items-center rounded-lg text-xs font-bold text-white shadow-2xs shrink-0"
                                style={{ backgroundColor: k.kleur || "#3C6E71" }}
                              >
                                {(k.naam || "K").slice(0, 1).toUpperCase()}
                              </span>
                              <div className="min-w-0">
                                <span className="text-xs font-semibold text-ink block truncate">{k.naam}</span>
                                {isLinked && (
                                  <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium truncate">
                                    {isEn
                                      ? `Already connected with ${linkedCp.name || "co-parent"}`
                                      : `Al verbonden met ${linkedCp.name || "co-ouder"}`}
                                  </p>
                                )}
                                {isPending && !isLinked && (
                                  <p className="text-[10px] text-amber-700 dark:text-amber-400 font-medium flex items-center gap-1 mt-0.5 truncate">
                                    <Clock className="size-3 shrink-0" />
                                    <span className="truncate">
                                      {isEn
                                        ? `Invite pending (${pendingInv.to_email})`
                                        : `Uitnodiging verstuurd naar ${pendingInv.to_email} (in afwachting)`}
                                    </span>
                                  </p>
                                )}
                              </div>
                            </div>
                            <input
                              type="checkbox"
                              disabled={isDisabled}
                              checked={!isDisabled && Boolean(selectedKids[k.id])}
                              onChange={() => !isDisabled && toggleKid(k.id)}
                              className="size-4 rounded accent-brand disabled:cursor-not-allowed shrink-0"
                            />
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Notice when all children are unavailable */}
                {allChildrenUnavailable && !allChildrenConnected && (
                  <div className="rounded-xl border border-amber-300/80 bg-amber-50/80 p-3 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-200 flex items-start gap-2">
                    <Clock className="size-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                    <span>
                      {isEn
                        ? "All children currently have pending invitations awaiting response. You can manage or cancel them below."
                        : "Voor al je kinderen staat al een uitnodiging open. Wacht op acceptatie of beheer/annuleer deze hieronder."}
                    </span>
                  </div>
                )}

                {/* Privacy / Independence Callout */}
                <div className="rounded-2xl border border-brand/20 bg-brand-soft/30 p-3.5 text-xs text-ink-soft">
                  <div className="flex items-start gap-2">
                    <ShieldCheck className="size-4 shrink-0 text-brand mt-0.5" />
                    <div>
                      <span className="font-semibold text-brand">
                        {t("inviteCoParent.safeTransparent")}
                      </span>
                      <p className="mt-0.5 leading-relaxed">
                        {t("inviteCoParent.yourCoParentWillReceiveA")}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={sending || allChildrenUnavailable}
                    className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 text-sm font-semibold text-primary-foreground shadow-2xs transition hover:bg-brand/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sending ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        <span>{t("inviteCoParent.sendingInvitationEmail")}</span>
                      </>
                    ) : (
                      <>
                        <Mail className="size-4" />
                        <span>{t("inviteCoParent.sendInvitationEmail")}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-center">
                  <span className="mx-auto grid size-10 place-items-center rounded-full bg-emerald-100 text-emerald-600 mb-2">
                    <Check className="size-5" />
                  </span>
                  <p className="text-sm font-bold text-emerald-900">
                    {generatedInvite.emailSent
                      ? (isEn ? "Invitation Email Sent!" : "Uitnodigingsmail verzonden!")
                      : (isEn ? "Invitation Ready!" : "Uitnodiging staat klaar!")}
                  </p>
                  <p className="mt-1 text-xs text-emerald-700">
                    {generatedInvite.emailSent
                      ? (isEn
                        ? `An email with an invite button was sent to ${email}. You can also share the direct link below:`
                        : `Er is een e-mail met een directe acceptatieknop verstuurd naar ${email}. Je kunt de link ook direct delen:`)
                      : (isEn
                        ? `Share this secure link with ${email}:`
                        : `Deel deze beveiligde link direct met ${email}:`)}
                  </p>

                  {/* Link Box */}
                  <div className="mt-3 flex items-center gap-2 rounded-xl border border-border bg-card p-2 text-left">
                    <input
                      type="text"
                      readOnly
                      value={generatedInvite.inviteLink}
                      className="w-full bg-transparent px-2 text-xs font-mono text-ink outline-none"
                    />
                    <button
                      onClick={copyToClipboard}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-brand/90 transition"
                    >
                      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                      <span>{copied ? (isEn ? "Copied!" : "Gekopieerd!") : (isEn ? "Copy" : "Kopieer")}</span>
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setGeneratedInvite(null);
                    setEmail("");
                  }}
                  className="w-full rounded-xl border border-border py-2.5 text-xs font-semibold text-ink hover:bg-muted transition"
                >
                  {t("inviteCoParent.sendAnotherInvitation")}
                </button>
              </div>
            )}

            {/* 1. Accepted Invitations (Connected Co-Parents) */}
            {sentInvitations.some((inv) => inv.status === "accepted") && (
              <div className="mt-8 border-t border-border pt-5">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="size-4 text-emerald-600" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                    {t("inviteCoParent.connectedCoParentAccepted")}
                  </h4>
                </div>
                <div className="space-y-2.5">
                  {sentInvitations
                    .filter((inv) => inv.status === "accepted")
                    .map((inv) => {
                      const coParentName = inv.to_profile?.name || inv.to_email.split("@")[0];
                      return (
                        <div
                          key={inv.id}
                          className="rounded-2xl border border-emerald-500/30 bg-emerald-50/60 p-3.5 shadow-2xs"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <span className="grid size-9 place-items-center rounded-xl bg-emerald-600 font-display text-sm font-bold text-white shadow-2xs">
                                {coParentName.slice(0, 1).toUpperCase()}
                              </span>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-bold text-ink">{coParentName}</p>
                                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-300 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                                    <span>✓</span>
                                    <span>{t("inviteCoParent.accepted")}</span>
                                  </span>
                                </div>
                                <p className="text-xs text-ink-soft">{inv.to_email}</p>
                              </div>
                            </div>

                            {!isInvitedUser && (
                              <button
                                type="button"
                                onClick={() =>
                                  setDisconnectTarget({
                                    id: inv.to_parent_id,
                                    name: coParentName,
                                    invitation_id: inv.id,
                                  })
                                }
                                className="inline-flex items-center gap-1 rounded-lg border border-destructive/30 bg-destructive/10 px-2.5 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive hover:text-white transition"
                              >
                                <UserX className="size-3.5" />
                                <span>{t("coParent.disconnect", "Ontkoppelen")}</span>
                              </button>
                            )}
                          </div>
                          {Array.isArray(inv.child_ids) && inv.child_ids.length > 0 && (
                            <div className="mt-2.5 flex flex-wrap items-center gap-1.5 pt-2 border-t border-emerald-200/50">
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-800/80">
                                {t("circle.sharedPrefix", "Gedeeld:")}
                              </span>
                              {inv.child_ids.map((cId) => {
                                const match = childrenList.find((c) => c.id === cId);
                                const name = match ? match.naam : t("circle.defaultChildName", "Kind");
                                const color = match ? match.kleur : "#3C6E71";
                                return (
                                  <span
                                    key={cId}
                                    className="inline-flex items-center gap-1 rounded-full bg-white/90 border border-emerald-300/70 px-2 py-0.5 text-[11px] font-semibold text-emerald-900 shadow-2xs"
                                  >
                                    <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                                    <span>{name}</span>
                                  </span>
                                );
                              })}
                            </div>
                          )}
                          {inv.accepted_at && (
                            <p className="mt-2 text-[11px] text-emerald-700/80 border-t border-emerald-200/50 pt-2">
                              {t("inviteCoParent.connectedOn")}{" "}
                              <span className="font-semibold text-emerald-900">
                                {new Date(inv.accepted_at).toLocaleDateString(
                                  isEn ? "en-US" : "nl-NL",
                                  { day: "numeric", month: "long", year: "numeric" }
                                )}
                              </span>
                            </p>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* 2. Pending Invitations (Waiting for response) */}
            {sentInvitations.some((inv) => inv.status !== "accepted") && (
              <div className="mt-6 border-t border-border pt-5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-ink-soft mb-3">
                  {t("inviteCoParent.pendingInvitationsAwaitingResponse")}
                </h4>
                <div className="space-y-2">
                  {sentInvitations
                    .filter((inv) => inv.status !== "accepted")
                    .map((inv) => {
                      const badge = getStatusBadge(inv.status, t);
                      return (
                        <div
                          key={inv.id}
                          className="rounded-xl border border-border bg-card p-3 transition"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0 flex-1 pr-2">
                              <p className="text-xs font-bold text-ink truncate">{inv.to_email}</p>
                              <div className="mt-1 flex items-center gap-2 text-[11px] text-ink-soft">
                                <span
                                  className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold border ${badge.className}`}
                                >
                                  {badge.label}
                                </span>
                                <span>·</span>
                                <span>
                                  {new Date(inv.created_at).toLocaleDateString(
                                    isEn ? "en-US" : "nl-NL",
                                    { day: "numeric", month: "short" }
                                  )}
                                </span>
                              </div>
                            </div>
                            {(inv.status === "pending" || inv.status === "sent") && (
                              <button
                                onClick={() => setInviteToCancel(inv)}
                                className="rounded-lg p-1.5 text-ink-soft transition hover:bg-rose-50 hover:text-rose-600 shrink-0"
                                title={t("inviteCoParent.revokeInvitation")}
                              >
                                <Trash2 className="size-4" />
                              </button>
                            )}
                          </div>

                          {Array.isArray(inv.child_ids) && inv.child_ids.length > 0 && (
                            <div className="mt-2.5 flex flex-wrap items-center gap-1.5 pt-2 border-t border-border/50">
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
                                {t("circle.sharedPrefix", "Gedeeld:")}
                              </span>
                              {inv.child_ids.map((cId) => {
                                const match = childrenList.find((c) => c.id === cId);
                                const name = match ? match.naam : t("circle.defaultChildName", "Kind");
                                const color = match ? match.kleur : "#3C6E71";
                                return (
                                  <span
                                    key={cId}
                                    className="inline-flex items-center gap-1 rounded-full bg-surface border border-border/80 px-2 py-0.5 text-[11px] font-medium text-ink shadow-2xs"
                                  >
                                    <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                                    <span>{name}</span>
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Revoke confirmation modal */}
      <ConfirmModal
        open={Boolean(inviteToCancel)}
        onClose={() => setInviteToCancel(null)}
        onConfirm={handleConfirmCancel}
        loading={cancelling}
        title={t("inviteCoParent.revokeInvitation2")}
        description={
          isEn
            ? `Are you sure you want to cancel the invitation sent to ${inviteToCancel?.to_email}? The link will stop working.`
            : `Weet je zeker dat je de uitnodiging voor ${inviteToCancel?.to_email} wilt intrekken? De link werkt dan niet meer.`
        }
        confirmText={t("inviteCoParent.yesRevoke")}
        cancelText={t("inviteCoParent.cancel")}
        variant="destructive"
      />

      {/* Disconnect confirmation modal */}
      <ConfirmModal
        open={Boolean(disconnectTarget)}
        onClose={() => setDisconnectTarget(null)}
        onConfirm={handleConfirmDisconnect}
        loading={disconnecting}
        title={t("coParent.disconnectConfirmTitle", "Verbinding verbreken?")}
        description={t(
          "coParent.disconnectConfirmDesc",
          "Weet je zeker dat je de verbinding met {{name}} wilt verbreken? Jullie delen daarna geen kinderprofielen of gegevens meer met elkaar. Beide accounts keren terug naar de solo-modus.",
          { name: disconnectTarget?.name || "co-ouder" }
        )}
        confirmText={t("coParent.yesDisconnect", "Ja, verbinding verbreken")}
        cancelText={t("common.cancel", "Annuleren")}
        variant="destructive"
        icon={UserX}
      />
    </>
  );
}
