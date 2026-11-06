import React from "react";
import { Link } from "@/lib/router-compat";
import { useTranslation } from "react-i18next";
import { LanguageSelector } from "@/components/LanguageSelector";
import { AppLogo } from "@/components/AppLogo";
import { ChevronLeft, Sparkles } from "lucide-react";

export function AuthLayout({
  children,
  titel,
  subtitel,
  badgeText,
  backTo = "/welkom",
}) {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen w-full bg-[#f8f6f2] dark:bg-[#1a1c1a] font-body text-ink antialiased p-3 sm:py-6 sm:px-4 flex justify-center items-center">
      <div
        id="app-shell-phone"
        className="relative w-full max-w-md bg-background h-[calc(100dvh-1.5rem)] sm:h-[calc(100dvh-3rem)] max-h-[860px] rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.08)] border border-border/70 overflow-hidden flex flex-col [transform:translateZ(0)]"
      >
        {/* Top Header inside mobile frame */}
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border/60 bg-background/95 px-4 py-3 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-1.5 sm:gap-2">
            {backTo ? (
              <Link
                to={backTo}
                className="knop-kruis size-9 shrink-0 flex items-center justify-center rounded-full text-ink hover:bg-muted transition"
                aria-label={t("common.back", "Terug")}
              >
                <ChevronLeft className="size-5" />
              </Link>
            ) : null}
            <Link to="/" className="inline-flex items-center">
              <AppLogo className="h-8 max-w-[160px]" />
            </Link>
          </div>
          <LanguageSelector variant="compact" />
        </header>

        {/* Scrollable page content */}
        <main className="relative flex-1 overflow-y-auto app-scroll px-5 pt-5 pb-6 flex flex-col justify-between">
          <div>
            {badgeText ? (
              <div className="mb-2.5 inline-flex items-center gap-1.5 rounded-full border border-brand/20 bg-brand-soft/30 px-3 py-0.5 text-xs font-semibold text-brand">
                <Sparkles className="size-3" />
                <span>{badgeText}</span>
              </div>
            ) : null}

            {/* Header Titles */}
            <div className="mb-4">
              <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                {titel}
              </h1>
              {subtitel && (
                <p className="mt-1 text-xs text-ink-soft sm:text-sm">
                  {subtitel}
                </p>
              )}
            </div>

            {/* Form Box Card */}
            <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs">
              {children}
            </div>
          </div>

          {/* Footer with links / copyright */}
          <footer className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-4 text-xs text-ink-soft shrink-0">
            <span>© {new Date().getFullYear()} Ouderschap &amp; Co.</span>
            <div className="flex items-center gap-3">
              <Link to="/privacy" className="hover:text-ink hover:underline">
                {t("authLayout.privacy", "Privacy")}
              </Link>
              <Link to="/juridisch" className="hover:text-ink hover:underline">
                {t("authLayout.voorwaarden", "Voorwaarden")}
              </Link>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
