import { useTranslation } from "react-i18next";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { AppShell, PageHeader } from "@/components/AppShell";

export const Route = createFileRoute("/juridisch")({
    head: () => ({
        meta: [
            { title: "Juridisch & privacy — Ouderschap & Co" },
            { name: "description", content: "Algemene voorwaarden, privacyverklaring, cookie-informatie en abonnementsvoorwaarden van Ouderschap & Co." },
            { property: "og:title", content: "Juridisch & privacy — Ouderschap & Co" },
            { property: "og:description", content: "Lees de voorwaarden en privacyverklaring rustig na in de app." },
            { property: "og:type", content: "website" },
            { name: "twitter:card", content: "summary" },
        ],
    }),
    component: JuridischPagina,
});

function JuridischPagina() {
    const { t } = useTranslation();

    const translatedDocs = [
      {
        id: "voorwaarden",
        titel: t("legalAndPrivacy.termsTitle", "Algemene voorwaarden"),
        bijgewerkt: t("legalAndPrivacy.termsUpdated", "1 oktober 2026"),
        alineas: [
          t("legalAndPrivacy.termsP1", "Ouderschap & Co helpt ouders het dagelijks ouderschap samen te organiseren. De app geeft geen juridisch, medisch of financieel advies."),
          t("legalAndPrivacy.termsP2", "Je bent zelf verantwoordelijk voor wat je in de app zet en met wie je het deelt."),
          t("legalAndPrivacy.termsP3", "Voorbeeldtekst — de definitieve voorwaarden volgen."),
        ],
      },
      {
        id: "privacy",
        titel: t("legalAndPrivacy.privacyTitle", "Privacyverklaring"),
        bijgewerkt: t("legalAndPrivacy.privacyUpdated", "1 oktober 2026"),
        alineas: [
          t("legalAndPrivacy.privacyP1", "We verwerken alleen gegevens die nodig zijn om de app te laten werken. We verkopen nooit gegevens."),
          t("legalAndPrivacy.privacyP2", "Je kunt je gegevens altijd exporteren en verwijdering aanvragen."),
          t("legalAndPrivacy.privacyP3", "Voorbeeldtekst — de definitieve privacyverklaring volgt."),
        ],
      },
      {
        id: "cookies",
        titel: t("legalAndPrivacy.cookiesTitle", "Cookie-informatie"),
        bijgewerkt: t("legalAndPrivacy.cookiesUpdated", "1 oktober 2026"),
        alineas: [
          t("legalAndPrivacy.cookiesP1", "We gebruiken alleen functionele opslag op je apparaat, zoals je weergave-instellingen. Geen advertentiecookies."),
          t("legalAndPrivacy.cookiesP2", "Voorbeeldtekst."),
        ],
      },
      {
        id: "abonnement",
        titel: t("legalAndPrivacy.subscriptionTitle", "Abonnementsvoorwaarden"),
        bijgewerkt: t("legalAndPrivacy.subscriptionUpdated", "1 oktober 2026"),
        alineas: [
          t("legalAndPrivacy.subscriptionP1", "Een abonnement verlengt automatisch per maand of jaar. Je kunt altijd opzeggen in de app; je houdt toegang tot het einde van de betaalde periode."),
          t("legalAndPrivacy.subscriptionP2", "Opzeggen is iets anders dan je account verwijderen. Na opzeggen blijft je account bestaan."),
          t("legalAndPrivacy.subscriptionP3", "Voorbeeldtekst — de definitieve voorwaarden volgen."),
        ],
      },
    ];

    return (<AppShell>
      <PageHeader
        titel={t("legalAndPrivacy.title", "Juridisch & privacy")}
        subtitel={t("legalAndPrivacy.subtitle", "Rustig na te lezen, wanneer je wilt")}
        terug="/juridische-hulp"
      />
      <div className="mt-6 divide-y divide-border border-y border-border">
        {translatedDocs.map((d) => (
          <details key={d.id} id={d.id} className="group py-3.5">
            <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold">
              {d.titel}
              <ChevronRight className="size-4 shrink-0 text-ink-soft transition-transform group-open:rotate-90" />
            </summary>
            <p className="mt-1 text-[11px] text-ink-soft">
              {t("legalAndPrivacy.updated", "Bijgewerkt {{date}}", { date: d.bijgewerkt })}
            </p>
            <div className="mt-2 space-y-2 text-sm leading-relaxed">
              {d.alineas.map((a, i) => (
                <p key={i}>{a}</p>
              ))}
            </div>
          </details>
        ))}
      </div>
    </AppShell>);
}
