import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { AppShell, PageHeader } from "@/components/AppShell";
import { kinderen, professionals } from "@/lib/demo-data";
import { niveau, onderdelen, periodeTekst, persoonLabel, rechtenSamenvatting, useKring } from "@/lib/kring-store";
export const Route = createFileRoute("/privacy")({
    head: () => ({
        meta: [
            { title: "Wie ziet wat — Ouderschap & Co" },
            { name: "description", content: "In één overzicht wie welke informatie over je kinderen mag zien." },
            { property: "og:title", content: "Wie ziet wat — Ouderschap & Co" },
            { property: "og:description", content: "In één overzicht wie welke informatie over je kinderen mag zien." },
            { property: "og:type", content: "website" },
            { name: "twitter:card", content: "summary" },
        ],
    }),
    component: PrivacyOverzicht,
});
function PrivacyOverzicht() {
    const { personen } = useKring();
    const zichtbaar = personen.filter((p) => !p.ingetrokken);
    return (<AppShell>
      <PageHeader titel="Wie ziet wat" subtitel="Je privacy in één overzicht" terug="/instellingen"/>
      <p className="mt-5 text-sm leading-relaxed text-ink-soft">
        Jullie twee als ouders zien de gedeelde gegevens van jullie kinderen. Alle anderen zien alleen wat je zelf bewust deelt. Persoonlijke notities en privé-momentjes deel je met niemand.
      </p>
      {kinderen.map((k) => {
            const met = zichtbaar.filter((p) => onderdelen.some((o) => niveau(p, k.id, o.id) !== "geen"));
            const contact = zichtbaar.filter((p) => p.rechten[k.id] && !met.includes(p));
            return (<section key={k.id} className="mt-7">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold">{k.naam}</h2>
              <Link to="/kring/$kindId" params={{ kindId: k.id }} className="text-xs font-semibold text-brand">Aanpassen</Link>
            </div>
            <div className="mt-2 divide-y divide-border border-y border-border">
              {met.map((p) => (<div key={p.id} className="py-3">
                  <p className="text-sm font-semibold">{persoonLabel(p)} <span className="font-normal text-ink-soft">· {p.rol}</span></p>
                  <p className="text-xs text-ink-soft">Ziet: {rechtenSamenvatting(p, k.id)}</p>
                  <p className="text-[11px] text-ink-soft">{periodeTekst(p.periode)}</p>
                </div>))}
              {contact.map((p) => (<div key={p.id} className="py-3">
                  <p className="text-sm font-semibold">{persoonLabel(p)} <span className="font-normal text-ink-soft">· {p.rol}</span></p>
                  <p className="text-xs text-ink-soft">Alleen bewaard als contact, ziet niets in de app</p>
                </div>))}
              {met.length + contact.length === 0 ? <p className="py-3 text-sm text-ink-soft">Alleen jullie als ouders zien informatie over {k.naam}.</p> : null}
            </div>
          </section>);
        })}
      <section className="mt-7">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Professionals</h2>
          <Link to="/professionals" className="text-xs font-semibold text-brand">Aanpassen</Link>
        </div>
        <p className="mt-1 text-xs text-ink-soft">Een professional ziet alleen de onderdelen die jullie samen hebben gekozen.</p>
        <div className="mt-2 divide-y divide-border border-y border-border">
          {professionals.map((p) => (<div key={p.id} className="py-3">
              <p className="text-sm font-semibold">{p.naam} <span className="font-normal text-ink-soft">· {p.rol}</span></p>
              <p className="text-[11px] text-ink-soft">{p.status}</p>
            </div>))}
        </div>
      </section>
      <Link to="/juridisch" className="mt-7 block text-center text-xs font-semibold text-brand">Lees de privacyverklaring</Link>
    </AppShell>);
}
