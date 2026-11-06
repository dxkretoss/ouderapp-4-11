import React from "react";
import { Link } from "@/lib/router-compat";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Check, ShieldCheck, Sparkles } from "lucide-react";

export function AuthLayout({
  children,
  titel,
  subtitel,
  badgeText,
}) {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen w-full bg-background text-ink antialiased lg:h-screen lg:overflow-hidden">
      <div className="grid min-h-screen w-full lg:h-screen lg:grid-cols-12">
        {/* LEFT COLUMN: HERO IMAGE & EDITORIAL BRANDING (Sticky / Fixed 100vh on desktop) */}
        <div className="relative hidden overflow-hidden lg:col-span-6 lg:flex lg:h-screen lg:sticky lg:top-0 xl:col-span-7">
          {/* Full bleed lifestyle photography */}
          <img
            src="/assets/auth_hero.jpg"
            alt="Ouderschap & Co."
            className="absolute inset-0 size-full object-cover object-center"
          />

          {/* Calming gradient overlay for readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/40 to-transparent" />
          <div className="absolute inset-0 bg-brand/15 mix-blend-multiply" />

          {/* Floating Brand Header */}
          <div className="relative z-10 flex w-full flex-col justify-between p-10 xl:p-14">
            <div className="flex items-center gap-3">
              <Link
                to="/"
                className="inline-flex items-center transition"
                aria-label="Ouderschap & Co."
              >
                <img
                  // src="/assets/logo.png"
                  src="/assets/ouderschap-co-logo.png"

                  alt="Ouderschap & Co."
                  className="h-12 w-auto object-contain"
                />
              </Link>
            </div>

            {/* Bottom Inspiring Quotation & Key Tenets */}
            <div className="max-w-xl space-y-5 text-white">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1 text-xs font-semibold backdrop-blur-md">
                <Sparkles className="size-3.5 text-accent-warm" />
                <span>
                  {badgeText || t("authLayout.badge", "Rust en overzicht voor jullie gezin")}
                </span>
              </div>

              <h2 className="font-display text-3xl font-extrabold leading-tight drop-shadow-sm xl:text-4xl">
                {t("authLayout.heroTitel", "Uit elkaar. Samen ouders voor de kinderen.")}
              </h2>

              <p className="text-sm font-normal leading-relaxed text-white/90 drop-shadow-xs xl:text-base">
                {t(
                  "authLayout.heroSubtitel",
                  "Eén rustige en veilige plek voor jullie afspraken, agenda, kosten en de overdracht. Duidelijk, eerlijk en kindgericht."
                )}
              </p>

              {/* Trust Badges */}
              <div className="grid grid-cols-2 gap-3 pt-2 text-xs font-medium text-white/95">
                <div className="flex items-center gap-2">
                  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-white/20 text-white">
                    <Check className="size-3" />
                  </span>
                  <span>{t("authLayout.trustPrivacy", "Strikte privacy & encryptie")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-white/20 text-white">
                    <Check className="size-3" />
                  </span>
                  <span>{t("authLayout.trustKosten", "Eerlijke kostenverdeling")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-white/20 text-white">
                    <Check className="size-3" />
                  </span>
                  <span>{t("authLayout.trustSync", "Web & mobiel gesynchroniseerd")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-white/20 text-white">
                    <Check className="size-3" />
                  </span>
                  <span>{t("authLayout.trustCoach", "Rustige communicatiehulp")}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: AUTHENTICATION FORM BOX (Independently scrollable on desktop) */}
        <div className="flex min-h-screen flex-col justify-between p-4 sm:p-8 lg:col-span-6 lg:h-screen lg:overflow-y-auto lg:p-10 xl:col-span-5 xl:p-14">
          {/* Top Mobile Brand Banner (Visible on screens < 1024px) */}
          <div className="mb-4 lg:hidden">
            <div className="relative mb-6 h-44 overflow-hidden rounded-3xl shadow-sm sm:h-52">
              <img
                src="/assets/auth_hero.jpg"
                alt="Ouderschap & Co."
                className="size-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
              <div className="absolute inset-0 flex flex-col justify-end p-5 text-white">
                <Link
                  to="/"
                  className="inline-flex items-center rounded-xl bg-white/95 px-3 py-1.5 shadow-sm backdrop-blur-md transition hover:bg-white"
                  aria-label="Ouderschap & Co."
                >
                  <img
                    // src="/assets/logo.png"
                    src="/assets/ouderschap-co-logo.png"

                    alt="Ouderschap & Co."
                    className="h-12 w-auto object-contain"
                  />
                </Link>
                <p className="mt-1 text-xs text-white/90">
                  {t("authLayout.tagline", "Uit elkaar. Samen ouders.")}
                </p>
              </div>
            </div>
          </div>

          {/* Form Container */}
          <div className="mx-auto w-full max-w-md my-auto py-4 sm:py-6 flex flex-col justify-center">
            {/* Logo on desktop */}
            <div className="hidden lg:block mb-6">
              <Link to="/" className="inline-block transition hover:opacity-90">
                <img
                  // src="/assets/logo.png"
                  src="/assets/ouderschap-co-logo.png"

                  alt="Ouderschap & Co."
                  className="h-12 w-auto object-contain dark:bg-white/90 dark:px-3 dark:py-1 dark:rounded-xl"
                />
              </Link>
            </div>

            {/* Header Titles */}
            <div className="mb-6">
              <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                {titel}
              </h1>
              {subtitel && (
                <p className="mt-1.5 text-xs text-ink-soft sm:text-sm">
                  {subtitel}
                </p>
              )}
            </div>

            {/* Form Box Card */}
            <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm sm:p-8">
              {children}
            </div>
          </div>

          {/* Footer with language switch and copyright */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-4 text-xs text-ink-soft">
            <span>© {new Date().getFullYear()} Ouderschap &amp; Co.</span>
            <div className="flex items-center gap-4">
              <Link to="/privacy" className="hover:text-ink hover:underline">
                {t("authLayout.privacy", "Privacy")}
              </Link>
              <Link to="/juridisch" className="hover:text-ink hover:underline">
                {t("authLayout.voorwaarden", "Voorwaarden")}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Language Switcher for all Auth Pages */}
      <LanguageSwitcher className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50" />
    </div>
  );
}
