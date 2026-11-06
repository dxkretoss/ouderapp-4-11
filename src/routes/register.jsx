import { useState, useEffect } from "react";
import { Link, useNavigate } from "@/lib/router-compat";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { AuthLayout } from "@/components/AuthLayout";
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  Loader2,
  CheckCircle2,
  Send,
  UsersRound,
  HeartHandshake,
} from "lucide-react";
import { inspectInvitation, acceptCoParentInvitation } from "@/lib/invitation-service";
import { acceptCaregiverInvite } from "@/lib/caregiver-service";
import { start } from "@/lib/start-store";

export function RegisterPage() {
  const { t, i18n } = useTranslation();

  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const initialVerify = searchParams?.get("verify") === "true";
  const initialEmail = searchParams?.get("email") || "";

  const inviteToken =
    searchParams?.get("token") ||
    searchParams?.get("t") ||
    searchParams?.get("invite") ||
    (typeof localStorage !== "undefined" ? localStorage.getItem("ouderapp_pending_invite_token") : null);

  const [inviteData, setInviteData] = useState(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [usageMode, setUsageMode] = useState("together");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(initialVerify);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState(null);

  const [verificationCode, setVerificationCode] = useState("");
  const [receivedCode, setReceivedCode] = useState(null);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState(null);
  const [isVerified, setIsVerified] = useState(false);

  const { signUp, resendEmail, verifyEmail, user } = useAuth();
  const navigate = useNavigate();

  // Load invitation info if token is present
  useEffect(() => {
    if (!inviteToken) return;
    try {
      localStorage.setItem("ouderapp_pending_invite_token", inviteToken);
    } catch {}

    let mounted = true;
    inspectInvitation(inviteToken)
      .then((data) => {
        if (!mounted || !data) return;
        setInviteData(data);
        if (data.to_email && !email) {
          setEmail(data.to_email);
        }
        if (data.type === "caregiver") {
          setUsageMode("caregiver");
        }
      })
      .catch((err) => {
        console.warn("[RegisterPage] inspectInvitation notice:", err);
      });

    return () => {
      mounted = false;
    };
  }, [inviteToken]);

  // Password requirements calculation
  const passwordCriteria = {
    minLength: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password),
  };
  const isPasswordValid =
    passwordCriteria.minLength &&
    passwordCriteria.hasUpper &&
    passwordCriteria.hasNumber &&
    passwordCriteria.hasSpecial;

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError(null);

    const errors = {};
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    // 1. Validate Name
    if (!trimmedName) {
      errors.name = t("auth.naamVerplicht", "Volledige naam is verplicht.");
    }

    // 2. Validate Email
    if (!trimmedEmail) {
      errors.email = t("auth.emailVerplicht", "E-mailadres is verplicht.");
    } else if (!emailRegex.test(trimmedEmail)) {
      errors.email = t(
        "auth.emailOngeldig",
        "Voer een geldig e-mailadres in (bijv. ouder@voorbeeld.nl)."
      );
    }

    // 3. Validate Password
    if (!password) {
      errors.password = t("auth.wachtwoordVerplicht", "Wachtwoord is verplicht.");
    } else if (!isPasswordValid) {
      errors.password = t(
        "auth.wachtwoordEisen",
        "Wachtwoord moet minimaal 8 tekens bevatten, met minimaal 1 hoofdletter, 1 cijfer en 1 speciaal teken."
      );
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError(errors.name || errors.email || errors.password);
      return;
    }

    setFieldErrors({});
    setLoading(true);

    try {
      const modeToUse = (usageMode === "caregiver" || inviteData?.type === "caregiver") ? "together" : (usageMode || "together");
      const res = await signUp(
        trimmedEmail,
        password,
        trimmedName,
        modeToUse,
        i18n?.language || "nl"
      );
      if (res.error) {
        setError(
          res.error.message ||
            t(
              "auth.registreerMislukt",
              "Registreren mislukt. Controleer je invoer en probeer het opnieuw."
            )
        );
      } else {
        if (res.verificationCode) {
          setReceivedCode(res.verificationCode);
        }
        // If session was granted immediately without email verification
        if (!res.needsVerification) {
          const registeredUserId = res?.data?.user?.id || res?.user?.id;
          if (inviteToken && registeredUserId) {
            try {
              if (inviteData?.type === "caregiver") {
                const accepted = await acceptCaregiverInvite(inviteToken, registeredUserId);
                const tokenToPass = (accepted && typeof accepted === "object" ? accepted.inviteToken : null) || inviteToken;
                localStorage.removeItem("ouderapp_pending_invite_token");
                navigate({ to: "/verzorger", search: { s: tokenToPass } });
                return;
              } else {
                const coParentRes = await acceptCoParentInvitation({
                  token: inviteToken,
                  userId: registeredUserId,
                });
                if (Array.isArray(coParentRes?.children) && coParentRes.children.length > 0) {
                  start.zetKinderen(coParentRes.children);
                }
                localStorage.removeItem("ouderapp_pending_invite_token");
              }
            } catch (invErr) {
              console.warn("[RegisterPage] Auto-accept instant signup notice:", invErr);
            }
          }
          navigate("/");
        } else {
          setSuccess(true);
        }
      }
    } catch (err) {
      setError(
        err?.message ||
          t("auth.foutOpgetreden", "Er is een onverwachte fout opgetreden.")
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCodeSubmit = async (e) => {
    e.preventDefault();
    if (!verificationCode.trim()) return;
    setVerifyError(null);
    setVerifyLoading(true);

    try {
      const res = await verifyEmail(email, verificationCode);
      if (res.error) {
        setVerifyError(
          res.error.message ||
            t("auth.ongeldigeCode", "Ongeldige of verlopen code.")
        );
      } else {
        setIsVerified(true);
        const verifiedUserId = res?.user?.id || res?.data?.user?.id || user?.id;

        if (inviteToken && verifiedUserId) {
          try {
            if (inviteData?.type === "caregiver") {
              const accepted = await acceptCaregiverInvite(inviteToken, verifiedUserId);
              const tokenToPass = (accepted && typeof accepted === "object" ? accepted.inviteToken : null) || inviteToken;
              localStorage.removeItem("ouderapp_pending_invite_token");
              setTimeout(() => {
                navigate({ to: "/verzorger", search: { s: tokenToPass } });
              }, 1200);
              return;
            } else {
              const coParentRes = await acceptCoParentInvitation({
                token: inviteToken,
                userId: verifiedUserId,
              });
              if (Array.isArray(coParentRes?.children) && coParentRes.children.length > 0) {
                start.zetKinderen(coParentRes.children);
              }
              localStorage.removeItem("ouderapp_pending_invite_token");
            }
          } catch (invErr) {
            console.warn("[RegisterPage] Auto-accept on verify notice:", invErr);
          }
        }

        setTimeout(() => {
          navigate("/");
        }, 1500);
      }
    } catch (err) {
      setVerifyError(err?.message || "Verificatie mislukt.");
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setResendMessage(null);
    setVerifyError(null);
    try {
      const res = await resendEmail(email, i18n?.language || "nl");
      if (res.error) {
        setResendMessage(res.error.message);
      } else {
        if (res.verificationCode) {
          setReceivedCode(res.verificationCode);
        }
        setResendMessage(
          t(
            "auth.codeOpnieuwAangemaakt",
            "Een nieuwe 6-cijferige verificatiecode is aangemaakt!"
          )
        );
      }
    } catch (err) {
      setResendMessage(err?.message || "Kon geen verificatiecode versturen.");
    } finally {
      setResending(false);
    }
  };

  // Verification Screen State
  if (success) {
    return (
      <AuthLayout
        titel={
          isVerified
            ? t("auth.accountGeverifieerd", "Account geverifieerd!")
            : t("auth.verifieerAccount", "Verifieer je account")
        }
        subtitel={
          isVerified
            ? t("auth.doorsturenNaarDashboard", "Je wordt doorgestuurd naar je dashboard...")
            : t("auth.voerCodeInVerzonden", {
                defaultValue: `Voer de 6-cijferige code in verzonden naar ${email}`,
                email,
              })
        }
      >
        <div className="space-y-4">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand/12 text-brand">
            <CheckCircle2 className="size-7" />
          </span>

          {isVerified ? (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              {t(
                "auth.succesvolGeverifieerd",
                "Je account is succesvol geverifieerd! Je dashboard wordt geladen..."
              )}
            </div>
          ) : (
            <form onSubmit={handleVerifyCodeSubmit} className="space-y-4">
              {verifyError && (
                <div className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs font-medium text-destructive">
                  <AlertCircle className="size-4 shrink-0 mt-0.5" />
                  <span>{verifyError}</span>
                </div>
              )}

              {resendMessage && (
                <div className="rounded-xl border border-brand/30 bg-brand-soft/30 p-3 text-xs font-semibold text-brand">
                  {resendMessage}
                </div>
              )}

              <div className="rounded-xl border border-border bg-muted/40 p-3.5 text-center text-xs text-ink-soft">
                <p className="font-semibold text-ink">
                  {t("auth.codeVerstuurdNaar", {
                    defaultValue: `Er is een 6-cijferige verificatiecode verstuurd naar ${email}.`,
                    email,
                  })}
                </p>
                <p className="text-[11px] mt-1">
                  {t(
                    "auth.controleerInboxCode",
                    "Controleer je inbox (en spambox) en vul de code hieronder in."
                  )}
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-ink">
                  {t("auth.cijferigeCode", "6-Cijferige Verificatiecode")}
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="123456"
                  className="min-h-12 w-full text-center font-mono text-lg tracking-[0.3em] font-bold rounded-xl border border-border bg-card px-3.5 py-2.5 text-ink shadow-sm transition placeholder:tracking-normal placeholder:font-sans placeholder:text-sm placeholder:text-ink-soft/50 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                />
              </div>

              <button
                type="submit"
                disabled={verifyLoading || verificationCode.length < 6}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-sm transition hover:bg-brand/90 disabled:opacity-50"
              >
                {verifyLoading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>{t("auth.verifiërenBezig", "Verifiëren...")}</span>
                  </>
                ) : (
                  <>
                    <span>{t("auth.verifiërenKnop", "Code Bevestigen & Doorgaan")}</span>
                    <ArrowRight className="size-4" />
                  </>
                )}
              </button>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  disabled={resending}
                  onClick={handleResend}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline disabled:opacity-50"
                >
                  <Send className="size-3" />
                  <span>
                    {resending
                      ? t("auth.opnieuwVerzendenBezig", "Verzenden...")
                      : t("auth.nieuweCodeSturen", "Nieuwe code sturen")}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="text-xs font-semibold text-ink-soft hover:text-ink"
                >
                  {t("auth.naarInloggen", "Naar inloggen")}
                </button>
              </div>
            </form>
          )}
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      titel={t("auth.registreerTitel", "Account aanmaken")}
      subtitel={t(
        "auth.registreerOndertitel",
        "Start zelfstandig of verbind later met de andere ouder."
      )}
    >
      {inviteData && (
        <div className="mb-5 flex items-center gap-3 rounded-2xl border border-brand/20 bg-brand/5 p-3.5 text-xs text-ink shadow-2xs">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand text-primary-foreground shadow-2xs">
            <HeartHandshake className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-ink">
              {inviteData.type === "caregiver"
                ? t("auth.caregiverInviteBanner", {
                    name: inviteData.from_parent?.name || (i18n.language?.startsWith("en") ? "a parent" : "een ouder"),
                    defaultValue: `Uitnodiging als verzorger door ${inviteData.from_parent?.name || "een ouder"}`,
                  })
                : t("auth.invitedByBanner", {
                    name: inviteData.from_parent?.name || (i18n.language?.startsWith("en") ? "your co-parent" : "je co-ouder"),
                    defaultValue: `Uitnodiging van ${inviteData.from_parent?.name || "je co-ouder"}`,
                  })}
            </p>
            <p className="text-[11px] text-ink-soft">
              {t(
                "auth.willConnectAutomatically",
                "Je account wordt na verificatie direct automatisch gekoppeld."
              )}
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-xs font-medium text-destructive">
          <AlertCircle className="size-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form className="space-y-4" onSubmit={handleSubmit}>
        {/* Full Name */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-ink-soft">
            {t("auth.naamLabel", "Je volledige naam")} <span className="text-destructive">*</span>
          </label>
          <div className="relative mt-1.5">
            <User className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-soft" />
            <input
              type="text"
              required
              autoComplete="name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: null }));
              }}
              placeholder={t("auth.naamPlaceholder", "Bijv. Sanne de Vries")}
              className={`w-full rounded-xl border py-2.5 pl-10 pr-3.5 text-sm text-ink outline-none transition ${
                fieldErrors.name
                  ? "border-destructive bg-destructive/5 focus:border-destructive focus:ring-1 focus:ring-destructive"
                  : "border-border bg-background focus:border-brand focus:ring-1 focus:ring-brand"
              }`}
            />
          </div>
          {fieldErrors.name && (
            <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-destructive">
              <AlertCircle className="size-3.5 shrink-0" />
              <span>{fieldErrors.name}</span>
            </p>
          )}
        </div>

        {/* Email Address */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-ink-soft">
            {t("auth.emailLabel", "E-mailadres")} <span className="text-destructive">*</span>
          </label>
          <div className="relative mt-1.5">
            <Mail className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-soft" />
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: null }));
              }}
              placeholder="ouder@voorbeeld.nl"
              className={`w-full rounded-xl border py-2.5 pl-10 pr-3.5 text-sm text-ink outline-none transition ${
                fieldErrors.email
                  ? "border-destructive bg-destructive/5 focus:border-destructive focus:ring-1 focus:ring-destructive"
                  : "border-border bg-background focus:border-brand focus:ring-1 focus:ring-brand"
              }`}
            />
          </div>
          {fieldErrors.email && (
            <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-destructive">
              <AlertCircle className="size-3.5 shrink-0" />
              <span>{fieldErrors.email}</span>
            </p>
          )}
        </div>

        {/* Password */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-ink-soft">
            {t("auth.wachtwoordLabel", "Wachtwoord")} <span className="text-destructive">*</span>
          </label>
          <div className="relative mt-1.5">
            <Lock className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-soft" />
            <input
              type={showPassword ? "text" : "password"}
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: null }));
              }}
              placeholder={t("auth.wachtwoordPlaceholder", "Min. 8 tekens, 1 hoofdletter, 1 cijfer, 1 speciaal")}
              className={`w-full rounded-xl border py-2.5 pl-10 pr-10 text-sm text-ink outline-none transition ${
                fieldErrors.password
                  ? "border-destructive bg-destructive/5 focus:border-destructive focus:ring-1 focus:ring-destructive"
                  : "border-border bg-background focus:border-brand focus:ring-1 focus:ring-brand"
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft hover:text-ink cursor-pointer"
              aria-label={showPassword ? "Wachtwoord verbergen" : "Wachtwoord tonen"}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>

          {fieldErrors.password && (
            <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-destructive">
              <AlertCircle className="size-3.5 shrink-0" />
              <span>{fieldErrors.password}</span>
            </p>
          )}

          {/* Password Short Helper Note */}
          <p className="mt-1.5 text-xs text-ink-soft">
            {t("auth.wachtwoordHint", "Minimaal 8 tekens (1 hoofdletter, 1 cijfer en 1 speciaal teken)")}
          </p>
        </div>

        {/* Usage Mode Selection */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-ink-soft">
            {t("auth.hoeBeginnen", "Hoe wil je beginnen?")}
          </label>
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setUsageMode("together")}
              className={`rounded-xl border p-2.5 text-left transition ${
                usageMode === "together"
                  ? "border-brand bg-brand-soft/40 shadow-2xs"
                  : "border-border bg-background hover:border-brand/40"
              }`}
            >
              <span className="block text-xs font-bold text-ink">
                {t("auth.samen", "Samen")}
              </span>
              <span className="block text-[11px] text-ink-soft">
                {t("auth.metAndereOuder", "Met andere ouder")}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setUsageMode("solo")}
              className={`rounded-xl border p-2.5 text-left transition ${
                usageMode === "solo"
                  ? "border-brand bg-brand-soft/40 shadow-2xs"
                  : "border-border bg-background hover:border-brand/40"
              }`}
            >
              <span className="block text-xs font-bold text-ink">
                {t("auth.voorJezelf", "Voor jezelf")}
              </span>
              <span className="block text-[11px] text-ink-soft">
                {t("auth.volledigPrive", "Volledig privé")}
              </span>
            </button>
          </div>
        </div>

        {/* Submit CTA */}
        <button
          type="submit"
          disabled={loading}
          className="group mt-2 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-bold text-primary-foreground shadow-sm transition hover:bg-brand/90 hover:shadow-md disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              <span>{t("auth.registrerenBezig", "Account aanmaken...")}</span>
            </>
          ) : (
            <>
              <span>{t("auth.registrerenKnop", "Account aanmaken")}</span>
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </>
          )}
        </button>
      </form>

      {/* Switch to Login */}
      <div className="mt-6 border-t border-border/70 pt-4 text-center text-xs text-ink-soft">
        <span>{t("auth.alEenAccount", "Al een account?")} </span>
        <Link to="/login" className="font-bold text-brand hover:underline">
          {t("auth.naarInloggen", "Inloggen")}
        </Link>
      </div>
    </AuthLayout>
  );
}
