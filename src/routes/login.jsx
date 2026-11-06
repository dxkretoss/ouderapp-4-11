import { useState } from "react";
import { Link, useNavigate } from "@/lib/router-compat";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { AuthLayout } from "@/components/AuthLayout";
import { Mail, Lock, Eye, EyeOff, AlertCircle, ArrowRight, Loader2 } from "lucide-react";
import { fetchCaregiverForUser } from "@/lib/caregiver-service";

export function LoginPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState("");
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setNeedsVerification(false);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError(t("auth.emailVerplicht", "E-mailadres is verplicht."));
      return;
    }
    if (!emailRegex.test(trimmedEmail)) {
      setError(
        t(
          "auth.emailOngeldig",
          "Voer een geldig e-mailadres in (bijv. ouder@voorbeeld.nl)."
        )
      );
      return;
    }
    if (!password) {
      setError(t("auth.wachtwoordVerplicht", "Wachtwoord is verplicht."));
      return;
    }

    setLoading(true);

    try {
      const res = await signIn(trimmedEmail, password);
      const err = res?.error;
      if (err) {
        if (err.needsVerification || err.message?.includes("Email not verified") || res?.needsVerification) {
          setNeedsVerification(true);
          setUnverifiedEmail(email);
          setError(
            t(
              "auth.emailNietGeverifieerd",
              "Email not verified. Please verify your email with the OTP sent to your inbox before logging in."
            )
          );
        } else {
          setError(
            err.message ||
              t(
                "auth.loginMislukt",
                "Inloggen mislukt. Controleer je e-mailadres en wachtwoord."
              )
          );
        }
      } else {
        const loggedUser = res?.data?.user || res?.profile;
        if (loggedUser) {
          try {
            const caregiverMatch = await fetchCaregiverForUser(loggedUser.id, loggedUser.email);
            if (caregiverMatch && caregiverMatch.status !== "revoked") {
              navigate("/verzorger");
              return;
            }
          } catch (cgErr) {
            console.warn("[login] caregiver check:", cgErr);
          }
        }
        navigate("/");
      }
    } catch (err) {
      if (err?.needsVerification || err?.message?.includes("Email not verified")) {
        setNeedsVerification(true);
        setUnverifiedEmail(email);
        setError(
          t(
            "auth.emailNietGeverifieerd",
            "Email not verified. Please verify your email with the OTP sent to your inbox before logging in."
          )
        );
      } else {
        setError(
          err?.message ||
            t("auth.foutOpgetreden", "Er is een onverwachte fout opgetreden.")
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      titel={t("auth.welkomTerug", "Welkom terug")}
      subtitel={t(
        "auth.loginOndertitel",
        "Log in om toegang te krijgen tot je co-ouderschap dossier."
      )}
    >
      {error && (
        <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-xs font-medium text-destructive">
          <AlertCircle className="size-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p>{error}</p>
            {needsVerification && (
              <div className="mt-2.5">
                <Link
                  to="/register"
                  search={{ verify: true, email: unverifiedEmail || email }}
                  className="inline-flex items-center gap-1.5 font-bold text-brand underline underline-offset-2 hover:opacity-85 text-xs"
                >
                  <span>{t("auth.verifieerEmailOtp", "Verifieer je e-mail met OTP nu")}</span>
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      <form className="space-y-4" onSubmit={handleSubmit}>
        {/* Email Address */}
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

        {/* Password */}
        <div>
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold uppercase tracking-wider text-ink-soft">
              {t("auth.wachtwoordLabel", "Wachtwoord")}
            </label>
            <Link
              to="/forgot-password"
              className="text-xs font-semibold text-brand hover:underline"
            >
              {t("auth.wachtwoordVergeten", "Wachtwoord vergeten?")}
            </Link>
          </div>
          <div className="relative mt-1.5">
            <Lock className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-soft" />
            <input
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-10 text-sm text-ink outline-none transition focus:border-brand focus:ring-1 focus:ring-brand"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft hover:text-ink"
              aria-label={showPassword ? "Wachtwoord verbergen" : "Wachtwoord tonen"}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
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
              <span>{t("auth.inloggenBezig", "Inloggen...")}</span>
            </>
          ) : (
            <>
              <span>{t("auth.inloggen", "Inloggen")}</span>
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </>
          )}
        </button>
      </form>

      {/* Switch to Register */}
      <div className="mt-6 border-t border-border/70 pt-4 text-center text-xs text-ink-soft">
        <span>{t("auth.nogGeenAccount", "Nog geen account?")} </span>
        <Link
          to="/register"
          className="font-bold text-brand hover:underline"
        >
          {t("auth.accountAanmaken", "Account aanmaken")}
        </Link>
      </div>
    </AuthLayout>
  );
}
