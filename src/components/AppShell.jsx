import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Assistent } from "@/components/Assistent";
import { AppIcon } from "@/components/AppIcon";
import { LanguageSelector } from "@/components/LanguageSelector";
import { gesprekken } from "@/lib/demo-data";
import { useStart } from "@/lib/start-store";
import { isVanOverzicht, vraagHeropen, wisTerug } from "@/lib/terug-store";

// Houdt de bezochte pagina's binnen de app bij, zodat "terug" altijd
// naar een echte app-pagina gaat (ook bij een directe paginalading).
const appGeschiedenis = [];

export function BackButton({ terug = "/meer" }) {
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (appGeschiedenis[appGeschiedenis.length - 1] !== pathname) appGeschiedenis.push(pathname);
  return (
    <button
      onClick={() => {
        appGeschiedenis.pop(); // huidige pagina
        const vorige = appGeschiedenis.pop();
        if (vorige) window.history.back();
        else router.navigate({ to: terug });
      }}
      className="knop-kruis mt-1 size-11 shrink-0"
      aria-label="Terug"
    >
      <span className="text-lg leading-none">‹</span>
    </button>
  );
}

const navItems = [
  { to: "/", labelKey: "navbar.home", label: "Home", icoon: "home" },
  { to: "/agenda", labelKey: "navbar.calendar", label: "Agenda", icoon: "agenda" },
  { to: "/berichten", labelKey: "navbar.messages", label: "Berichten", icoon: "berichten" },
  { to: "/kosten", labelKey: "navbar.expenses", label: "Kosten", icoon: "kosten" },
  { to: "/meer", labelKey: "navbar.menu", label: "Menu", icoon: "meer" },
];

const meerPaden = [
  "/meer",
  "/documenten",
  "/kinderen",
  "/afspraken",
  "/professionals",
  "/instellingen",
  "/zorgregeling",
  "/solo",
  "/welkom",
  "/wissel",
  "/taken",
  "/spullen",
  "/planning",
  "/samen-regelen",
  "/ondersteuning",
  "/extra-ondersteuning",
  "/contact",
  "/halen-brengen",
  "/begeleider-gesprek",
  "/gezag",
  "/beslissingen",
  "/tijdlijn",
  "/exporteren",
  "/gesprekken",
  "/kring",
  "/abonnement",
  "/juridische-hulp",
];

export function AppShell({ children, breed = false }) {
  const { t } = useTranslation();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { eigen } = useStart();
  const ongelezen = eigen ? 0 : gesprekken.reduce((s, g) => s + g.ongelezen, 0);

  const isActive = (to) => {
    if (to === "/") return pathname === "/";
    if (to === "/meer") return meerPaden.some((p) => pathname.startsWith(p));
    return pathname.startsWith(to);
  };

  return (
    <div className="min-h-screen w-full bg-[#f8f6f2] dark:bg-[#1a1c1a] font-body text-ink antialiased sm:py-6 sm:px-4 flex justify-center">
      <div className={`relative w-full max-w-md bg-background px-5 pb-28 pt-6 min-h-screen sm:min-h-[850px] sm:rounded-3xl sm:shadow-[0_20px_50px_rgba(0,0,0,0.08)] sm:border sm:border-border/70 flex flex-col ${breed ? "sm:max-w-3xl lg:sm:max-w-5xl" : ""}`}>
        {pathname !== "/" && isVanOverzicht() ? (
          <div className="mb-4 flex items-center">
            <Link
              to="/"
              onClick={vraagHeropen}
              className="inline-flex items-center gap-1.5 rounded-full bg-card border border-border px-3.5 py-1 text-xs font-semibold text-ink-soft hover:text-ink shadow-xs"
            >
              ← {t("common.back", "Terug naar overzicht")}
            </Link>
          </div>
        ) : null}
        <div className="flex-1">
          {children}
        </div>
      </div>

      {/* Modern mobile bottom navigation bar */}
      <nav className="fixed bottom-0 inset-x-0 mx-auto z-40 w-full max-w-md bg-card/95 backdrop-blur-md border-t border-border/80 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] sm:rounded-b-3xl">
        <div className="grid grid-cols-5 items-center h-16 px-1">
          {navItems.map((item) => {
            const active = isActive(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={wisTerug}
                className={`group relative flex flex-col items-center justify-center h-full py-1 transition-all duration-150 select-none ${
                  active ? "text-brand font-bold" : "text-ink-soft hover:text-ink font-medium"
                }`}
              >
                <span className={`relative flex items-center justify-center transition-transform duration-150 ${active ? "scale-105 -translate-y-0.5" : "group-hover:scale-102"}`}>
                  <AppIcon functie={item.icoon} vorm="kaal" maat="lg" actief={active} />
                  {item.to === "/berichten" && ongelezen > 0 ? (
                    <span
                      aria-label={`${ongelezen} ongelezen`}
                      className="absolute -right-2 -top-1 grid min-w-4 h-4 px-1 place-items-center rounded-full bg-accent-warm text-[10px] font-bold text-white shadow-xs"
                    >
                      {ongelezen}
                    </span>
                  ) : null}
                </span>
                <span className={`text-[11px] leading-tight mt-0.5 transition-colors ${active ? "text-brand font-semibold" : "text-ink-soft font-medium"}`}>
                  {t(item.labelKey, item.label)}
                </span>
                {active && (
                  <span className="absolute bottom-1 w-5 h-0.5 bg-brand rounded-full" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export function PageHeader({ titel, subtitel, terug, actie }) {
  return (
    <div className="flex items-start gap-3">
      {terug ? <BackButton terug={terug} /> : null}
      <div className="min-w-0 flex-1">
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold leading-tight">{titel}</h1>
        {subtitel ? <p className="mt-1 text-sm text-ink-soft">{subtitel}</p> : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <LanguageSelector variant="compact" />
        <Assistent pagina={titel} />
        {actie}
      </div>
    </div>
  );
}

export function Card({ children, className = "", ...props }) {
  return (
    <div className={`rounded-lg border border-border bg-card p-4 ${className}`} {...props}>
      {children}
    </div>
  );
}
