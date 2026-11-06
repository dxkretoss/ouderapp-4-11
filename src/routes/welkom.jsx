import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { start } from "@/lib/start-store";
import { AppLogo } from "@/components/AppLogo";
import { BeeldKiezer } from "@/components/ProfielBeeld";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useAuth } from "@/contexts/AuthContext";
import { LogIn, UserPlus, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/welkom")({
  head: () => ({
    meta: [
      { title: "Welkom — Ouderschap & Co" },
      { name: "description", content: "Begin in een paar seconden: je naam, hoe je de app wilt gebruiken, en je ziet meteen je eigen Home." },
      { property: "og:title", content: "Welkom bij Ouderschap & Co" },
      { property: "og:description", content: "Begin licht en vul de rest rustig aan vanuit de app." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Welkom,
});

function Welkom() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [stap, setStap] = useState(0);
  const [beeld, setBeeld] = useState(undefined);
  const [naam, setNaam] = useState("");
  const [gebruik, setGebruik] = useState("samen");

  // If already authenticated with Supabase, navigate straight to Home
  useEffect(() => {
    if (!authLoading && user) {
      nav({ to: "/" });
    }
  }, [user, authLoading, nav]);

  const knop = "mt-5 w-full rounded-xl bg-brand py-3 text-sm font-semibold text-primary-foreground disabled:opacity-40 transition-colors cursor-pointer hover:bg-brand/90 flex items-center justify-center gap-2";
  const optie = (actief) =>
    `w-full rounded-xl border p-3.5 text-left text-sm transition-colors cursor-pointer ${
      actief ? "border-brand bg-brand-soft" : "border-border bg-surface"
    }`;

  const startDemo = () => {
    try {
      localStorage.setItem("onzeapp_demo_mode", "true");
    } catch {}
    start.naarVoorbeeld();
    nav({ to: "/" });
  };

  return (
    <div className="app-canvas flex min-h-screen flex-col items-center justify-center px-6 py-10 font-body text-ink">
      <div className="w-full max-w-md rounded-[2rem] border border-border bg-card p-8 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-medium text-ink-soft">{t("language.title", "Taal / Language")}</span>
          <LanguageSelector variant="compact" />
        </div>
        <AppLogo className="mx-auto mb-7 w-64 max-w-full" slogan />

        {stap === 0 ? (
          <div>
            <h1 className="font-display text-2xl font-bold">{t("onboarding.welcomeTitle", "Fijn dat je er bent.")}</h1>
            <p className="mt-1 text-sm text-ink-soft">
              {t("onboarding.welcomeIntro", "Alles rondom co-ouderschap op één rustige en overzichtelijke plek.")}
            </p>

            {/* Inloggen of registreren voor bestaande of uitgenodigde ouders */}
            <div className="mt-6 space-y-2.5">
              <Link
                to="/login"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 text-sm font-semibold text-primary-foreground hover:bg-brand/90 transition shadow-xs"
              >
                <LogIn className="size-4" />
                <span>{t("auth.inloggen", "Inloggen met bestaand account")}</span>
              </Link>
              <Link
                to="/register"
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface py-3 text-sm font-semibold text-ink hover:bg-muted transition"
              >
                <UserPlus className="size-4 text-brand" />
                <span>{t("auth.registreren", "Nieuw account aanmaken")}</span>
              </Link>
            </div>
          </div>
        ) : stap === 1 ? (
          <>
            <h1 className="font-display text-2xl font-bold">{t("onboarding.photoAvatarTitle", "Een foto of avatar?")}</h1>
            <p className="mt-1 text-sm text-ink-soft">
              {t("onboarding.photoAvatarSubtitle", "Helemaal optioneel. Zo herkent de andere ouder je straks wellicht sneller.")}
            </p>
            <div className="mt-4">
              <BeeldKiezer
                beeld={beeld}
                naam={naam}
                onKies={(b) => {
                  if (!b && !beeld) setStap(2);
                  else setBeeld(b);
                }}
              />
            </div>
            {beeld ? (
              <button className={knop} onClick={() => setStap(2)}>
                {t("common.continue", "Verder")}
              </button>
            ) : null}
            <button onClick={() => setStap(0)} className="mt-3 block w-full text-center text-xs font-semibold text-ink-soft hover:text-ink cursor-pointer">
              {t("onboarding.back", "Terug")}
            </button>
          </>
        ) : (
          <>
            <h1 className="font-display text-2xl font-bold">{t("onboarding.modeTitle", "Hoe wil je de app beginnen?")}</h1>
            <div className="mt-4 space-y-2">
              <button type="button" onClick={() => setGebruik("samen")} className={optie(gebruik === "samen")}>
                <p className="font-semibold">{t("onboarding.modeShared", "Samen gebruiken")}</p>
                <p className="text-xs text-ink-soft">
                  {t("onboarding.modeSharedDesc", "Je wilt de app uiteindelijk samen met de andere ouder gebruiken. Uitnodigen kan ook later.")}
                </p>
              </button>
              <button type="button" onClick={() => setGebruik("zelf")} className={optie(gebruik === "zelf")}>
                <p className="font-semibold">{t("onboarding.modeSolo", "Voor mezelf")}</p>
                <p className="text-xs text-ink-soft">
                  {t("onboarding.modeSoloDesc", "Je organiseert alles eerst voor jezelf. Je kunt later alsnog iemand uitnodigen.")}
                </p>
              </button>
            </div>
            <p className="mt-2 text-xs text-ink-soft">{t("onboarding.modifyLater", "Je kunt dit later aanpassen.")}</p>
            <button
              type="button"
              className={knop}
              onClick={() => {
                try {
                  localStorage.setItem("onzeapp_demo_mode", "true");
                } catch {}
                start.begin(naam, gebruik);
                start.zetOuderBeeld(beeld);
                nav({ to: "/" });
              }}
            >
              {t("onboarding.startAction", "Naar mijn Home")}
            </button>
            <button type="button" onClick={() => setStap(1)} className="mt-3 block w-full text-center text-xs font-semibold text-ink-soft hover:text-ink cursor-pointer">
              {t("onboarding.back", "Terug")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
