import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/AppShell";
import { appDocumenten } from "@/lib/juridische-bronnen";
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
    return (<AppShell>
      <PageHeader titel="Juridisch & privacy" subtitel="Rustig na te lezen, wanneer je wilt" terug="/juridische-hulp"/>
      <div className="mt-6 divide-y divide-border border-y border-border">
        {appDocumenten.map((d) => (<details key={d.id} id={d.id} className="group py-3.5">
            <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold">
              {d.titel}<span aria-hidden className="text-ink-soft transition-transform group-open:rotate-90">›</span>
            </summary>
            <p className="mt-1 text-[11px] text-ink-soft">Bijgewerkt {d.bijgewerkt}</p>
            <div className="mt-2 space-y-2 text-sm leading-relaxed">{d.alineas.map((a) => <p key={a}>{a}</p>)}</div>
          </details>))}
      </div>
    </AppShell>);
}
