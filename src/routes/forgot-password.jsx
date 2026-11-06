import { useState } from "react";
import { Link } from "@/lib/router-compat";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { AuthLayout } from "@/components/AuthLayout";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  KeyRound,
  RotateCcw,
} from "lucide-react";

export function ForgotPasswordPage() {
  const { t, i18n } = useTranslation();

  // Flow steps: "request" -> "verify-otp" -> "new-password" -> "completed"
  const [step, setStep] = useState("request");
  const [email, setEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState(null);
  const [infoMessage, setInfoMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const { resetPassword, verifyResetOtp, confirmResetPassword } = useAuth();

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  // Step 1: Request OTP code via email
  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError(t("auth.emailVerplicht", "E-mailadres is verplicht."));
      return;
    }
    if (!emailRegex.test(cleanEmail)) {
      setError(
        t(
          "auth.emailOngeldig",
          "Voer een geldig e-mailadres in (bijv. ouder@voorbeeld.nl)."
        )
      );
      return;
    }

    setError(null);
    setInfoMessage(null);
    setLoading(true);

    try {
      const res = await resetPassword(cleanEmail, i18n?.language || "nl");
      if (res?.error) {
        setError(res.error.message || t("auth.herstelcodeAanvragenMislukt", "Kon geen herstelcode aanvragen. Probeer het opnieuw."));
      } else {
        setStep("verify-otp");
        setInfoMessage(
          t("auth.codeVerstuurdNaar", {
            defaultValue: `Er is een 6-cijferige herstelcode verzonden naar ${cleanEmail}.`,
            email: cleanEmail,
          })
        );
      }
    } catch (err) {
      setError(err?.message || t("auth.foutOpgetreden", "Er is een onverwachte fout opgetreden."));
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify 6-digit OTP code
  const handleVerifyOtpSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    if (resetCode.trim().length < 6) {
      setError(t("auth.volledigeCodeInvoeren", "Voer de volledige 6-cijferige code in."));
      return;
    }

    setError(null);
    setInfoMessage(null);
    setLoading(true);

    try {
      const res = await verifyResetOtp(email, resetCode);
      if (res?.error) {
        setError(res.error.message || t("auth.ongeldigeHerstelcode", "Ongeldige of verlopen herstelcode."));
      } else {
        setStep("new-password");
      }
    } catch (err) {
      setError(err?.message || t("auth.verificatieCodeMislukt", "Verificatie van code mislukt."));
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP code
  const handleResendOtp = async () => {
    if (resending || loading) return;
    setError(null);
    setInfoMessage(null);
    setResending(true);

    try {
      const res = await resetPassword(email, i18n?.language || "nl");
      if (res?.error) {
        setError(res.error.message || t("auth.codeOpnieuwVersturenMislukt", "Kon code niet opnieuw versturen."));
      } else {
        setInfoMessage(
          t("auth.codeVerstuurdNaar", {
            defaultValue: `Er is een nieuwe 6-cijferige herstelcode verstuurd naar ${email}.`,
            email,
          })
        );
      }
    } catch (err) {
      setError(err?.message || t("auth.codeOpnieuwVersturenMislukt", "Kon code niet opnieuw versturen."));
    } finally {
      setResending(false);
    }
  };

  // Step 3: Set New Password
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    const isMinLength = newPassword.length >= 8;
    const hasUpper = /[A-Z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(newPassword);

    if (!isMinLength || !hasUpper || !hasNumber || !hasSpecial) {
      setError(
        t(
          "auth.wachtwoordEisen",
          "Wachtwoord moet minimaal 8 tekens bevatten, met minimaal 1 hoofdletter, 1 cijfer en 1 speciaal teken."
        )
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t("auth.wachtwoordenKomenNietOvereen", "Wachtwoorden komen niet overeen."));
      return;
    }

    setError(null);
    setInfoMessage(null);
    setLoading(true);

    try {
      const res = await confirmResetPassword(email, resetCode, newPassword);
      if (res?.error) {
        setError(res.error.message || t("auth.wachtwoordHerstellenMislukt", "Wachtwoord herstellen mislukt. Code is mogelijk verlopen."));
      } else {
        setStep("completed");
      }
    } catch (err) {
      setError(err?.message || t("auth.wachtwoordHerstellenMislukt", "Wachtwoord herstellen mislukt."));
    } finally {
      setLoading(false);
    }
  };

  // Titles & Subtitles based on current step
  const getTitles = () => {
    switch (step) {
      case "completed":
        return {
          titel: t("auth.wachtwoordGewijzigd", "Wachtwoord gewijzigd!"),
          subtitel: t(
            "auth.wachtwoordGewijzigdUitleg",
            "Je wachtwoord is succesvol gewijzigd. Je kunt nu inloggen met je nieuwe wachtwoord."
          ),
        };
      case "new-password":
        return {
          titel: t("auth.nieuwWachtwoordKiezen", "Nieuw wachtwoord kiezen"),
          subtitel: t(
            "auth.nieuwWachtwoordKiezenUitleg",
            "Kies een veilig wachtwoord van minimaal 8 tekens."
          ),
        };
      case "verify-otp":
        return {
          titel: t("auth.herstelcodeInvoeren", "Herstelcode invoeren"),
          subtitel: t("auth.voerCodeInVerzonden", {
            defaultValue: `Voer de 6-cijferige code in verzonden naar ${email}`,
            email,
          }),
        };
      case "request":
      default:
        return {
          titel: t("auth.wachtwoordHerstellen", "Wachtwoord herstellen"),
          subtitel: t(
            "auth.herstelOndertitel",
            "Vul je e-mailadres in. We sturen je direct een herstelcode per e-mail."
          ),
        };
    }
  };

  const { titel, subtitel } = getTitles();

  return (
    <AuthLayout titel={titel} subtitel={subtitel}>
      {/* Error alert */}
      {error && (
        <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-xs font-medium text-destructive">
          <AlertCircle className="size-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Info notification */}
      {infoMessage && (
        <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-brand/30 bg-brand-soft/20 p-3.5 text-xs font-semibold text-brand">
          <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
          <span>{infoMessage}</span>
        </div>
      )}

      {/* Step 4: Completed */}
      {step === "completed" && (
        <div className="text-center space-y-4">
          <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="size-8" />
          </span>

          <p className="text-xs sm:text-sm text-ink leading-relaxed">
            {t(
              "auth.wachtwoordGewijzigdUitleg",
              "Je wachtwoord is succesvol gewijzigd. Je kunt nu inloggen met je nieuwe wachtwoord."
            )}
          </p>

          <div className="pt-2">
            <Link
              to="/login"
              className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-brand px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-sm transition hover:bg-brand/90"
            >
              {t("auth.naarInloggen", "Naar inloggen")}
            </Link>
          </div>
        </div>
      )}

      {/* Step 3: New Password Form */}
      {step === "new-password" && (
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-ink-soft mb-1.5">
              {t("auth.nieuwWachtwoordLabel", "Nieuw Wachtwoord")}
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-soft" />
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-10 text-sm text-ink outline-none transition focus:border-brand focus:ring-1 focus:ring-brand"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft hover:text-ink"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            <p className="mt-1 text-[11px] text-ink-soft">
              {t("auth.wachtwoordMin", "Minimaal 8 tekens")}
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-ink-soft mb-1.5">
              {t("auth.wachtwoordBevestigenLabel", "Wachtwoord Bevestigen")}
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-soft" />
              <input
                type={showConfirmPassword ? "text" : "password"}
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-10 text-sm text-ink outline-none transition focus:border-brand focus:ring-1 focus:ring-brand"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft hover:text-ink"
              >
                {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || newPassword.length < 8 || newPassword !== confirmPassword}
            className="group mt-2 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-bold text-primary-foreground shadow-sm transition hover:bg-brand/90 hover:shadow-md disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>{t("auth.wachtwoordOpslaanBezig", "Wachtwoord opslaan...")}</span>
              </>
            ) : (
              <>
                <span>{t("auth.nieuwWachtwoordOpslaan", "Nieuw Wachtwoord Opslaan")}</span>
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </button>
        </form>
      )}

      {/* Step 2: Enter 6-digit OTP Code */}
      {step === "verify-otp" && (
        <form onSubmit={handleVerifyOtpSubmit} className="space-y-4">
          <div className="rounded-xl border border-border bg-muted/40 p-3.5 text-center text-xs text-ink-soft">
            <p className="font-semibold text-ink">
              {t("auth.voerCodeInVerzonden", {
                defaultValue: `Voer de 6-cijferige code in verzonden naar ${email}`,
                email,
              })}
            </p>
            <p className="text-[11px] mt-1">
              {t(
                "auth.controleerInboxGeldig15Min",
                "Controleer je inbox (en spambox). Code is 15 minuten geldig."
              )}
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-ink-soft mb-1.5 text-center">
              {t("auth.cijferigeHerstelcode", "6-Cijferige Herstelcode")}
            </label>
            <div className="relative">
              <input
                type="text"
                required
                maxLength={6}
                value={resetCode}
                onChange={(e) => setResetCode(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                className="min-h-12 w-full text-center font-mono text-xl tracking-[0.35em] font-extrabold rounded-xl border border-border bg-background py-2.5 px-4 text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 placeholder:tracking-normal placeholder:font-sans placeholder:text-sm placeholder:text-ink-soft/40"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || resetCode.length < 6}
            className="group mt-2 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-bold text-primary-foreground shadow-sm transition hover:bg-brand/90 hover:shadow-md disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>{t("auth.codeVerifiërenBezig", "Code Verifiëren...")}</span>
              </>
            ) : (
              <>
                <span>{t("auth.codeVerifiërenDoorgaan", "Code Verifiëren & Doorgaan")}</span>
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </button>

          <div className="flex items-center justify-between border-t border-border/70 pt-4 text-xs">
            <button
              type="button"
              disabled={resending}
              onClick={handleResendOtp}
              className="inline-flex items-center gap-1.5 text-brand hover:underline font-semibold disabled:opacity-50"
            >
              <RotateCcw className={`size-3.5 ${resending ? "animate-spin" : ""}`} />
              <span>{resending ? t("auth.verzendenBezig", "Verzenden...") : t("auth.codeOpnieuwVersturen", "Code opnieuw versturen")}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setStep("request");
              }}
              className="inline-flex items-center gap-1 text-ink-soft hover:text-ink font-medium"
            >
              <ArrowLeft className="size-3" />
              <span>{t("auth.anderEmailadres", "Ander e-mailadres")}</span>
            </button>
          </div>
        </form>
      )}

      {/* Step 1: Request OTP Code */}
      {step === "request" && (
        <form onSubmit={handleRequestSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-ink-soft">
              {t("auth.emailLabel", "E-mailadres")}
            </label>
            <div className="relative mt-1.5">
              <Mail className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-soft" />
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ouder@voorbeeld.nl"
                className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-3.5 text-sm text-ink outline-none transition focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !email.trim()}
            className="group mt-2 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-bold text-primary-foreground shadow-sm transition hover:bg-brand/90 hover:shadow-md disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>{t("auth.verzendenBezig", "Verzenden...")}</span>
              </>
            ) : (
              <>
                <span>{t("auth.herstellinkVersturen", "Herstelcode versturen")}</span>
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </button>

          <div className="mt-6 border-t border-border/70 pt-4 text-center text-xs">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 font-bold text-brand hover:underline"
            >
              <ArrowLeft className="size-3.5" />
              <span>{t("auth.terugNaarInloggen", "Terug naar inloggen")}</span>
            </Link>
          </div>
        </form>
      )}
    </AuthLayout>
  );
}
export default ForgotPasswordPage;
