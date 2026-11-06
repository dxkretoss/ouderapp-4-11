import { useTranslation } from "react-i18next";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ExternalLink, ChevronRight } from "lucide-react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { juridischeBronnen } from "@/lib/juridische-bronnen";

export const Route = createFileRoute("/juridische-hulp")({
    head: () => ({
        meta: [
            { title: "Juridische informatie & hulp — Ouderschap & Co" },
            { name: "description", content: "Betrouwbare externe bronnen over gezag, omgang en scheiden, en waar je terechtkunt voor juridische hulp." },
            { property: "og:title", content: "Juridische informatie & hulp — Ouderschap & Co" },
            { property: "og:description", content: "Waar je terechtkunt voor juridische informatie en ondersteuning." },
            { property: "og:type", content: "website" },
            { name: "twitter:card", content: "summary" },
        ],
    }),
    component: JuridischeHulp,
});

function JuridischeHulp() {
    const { t } = useTranslation();
    const groepen = [...new Set(juridischeBronnen.map((b) => b.groep))];

    return (<AppShell>
      <PageHeader
        titel={t("legalHelp.title", "Juridisch")}
        subtitel={t("legalHelp.subtitle", "Externe hulp, en de voorwaarden van de app")}
      />
      <p className="mt-5 text-sm leading-relaxed text-ink-soft">
        {t("legalHelp.intro", "Ouderschap & Co geeft geen juridisch advies. Hieronder vind je betrouwbare organisaties waar je terechtkunt. Ze openen als externe website.")}
      </p>
      {groepen.map((g) => (<section key={g} className="mt-6">
          <h2 className="text-[11px] font-semibold tracking-wider text-ink-soft uppercase">{g}</h2>
          <div className="mt-2 divide-y divide-border border-y border-border">
            {juridischeBronnen.filter((b) => b.groep === g).map((b) => (<a key={b.id} href={b.url} target="_blank" rel="noopener noreferrer" className="flex items-start gap-3 py-3.5">
                <span className="flex-1">
                  <span className="block text-sm font-semibold">{b.titel}</span>
                  <span className="block text-xs text-ink-soft">{b.uitleg}</span>
                  <span className="mt-0.5 block text-[11px] text-ink-soft">
                    {t("legalHelp.externalSite", "Externe website · {{host}}", { host: new URL(b.url).hostname.replace("www.", "") })}
                  </span>
                </span>
                <ExternalLink className="mt-1 size-4 shrink-0 text-ink-soft" strokeWidth={1.6} aria-label="External link"/>
              </a>))}
          </div>
        </section>))}
      <section className="mt-8">
        <h2 className="text-[11px] font-semibold tracking-wider text-ink-soft uppercase">
          {t("legalHelp.aboutApp", "Over deze app")}
        </h2>
        <Link to="/juridisch" className="mt-2 flex items-center justify-between border-y border-border py-3.5">
          <span>
            <span className="block text-sm font-semibold">{t("legalHelp.termsAndPrivacy", "Voorwaarden & privacy")}</span>
            <span className="block text-xs text-ink-soft">{t("legalHelp.termsAndPrivacyDesc", "Gebruiksvoorwaarden, privacyverklaring en abonnement")}</span>
          </span>
          <ChevronRight className="size-5 shrink-0 text-ink-soft" />
        </Link>
      </section>
    </AppShell>);
}
