import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, Card, PageHeader } from "@/components/AppShell";
import { kinderen } from "@/lib/demo-data";
import { useStart, leeftijdTekst } from "@/lib/start-store";
import { KindSheet } from "@/components/EersteHome";
import { useState } from "react";
import { ProfielBeeld } from "@/components/ProfielBeeld";
import { useKring, persoonLabel } from "@/lib/kring-store";
export const Route = createFileRoute("/kinderen/")({
    head: () => ({
        meta: [
            { title: "Kinderen — Ouderschap & Co" },
            { name: "description", content: "Profielen van de kinderen met school, opvang, zorg en belangrijke contacten." },
            { property: "og:title", content: "Kinderen — Ouderschap & Co" },
            { property: "og:description", content: "Alle informatie over de kinderen, voor beide ouders gelijk." },
            { property: "og:type", content: "website" },
            { name: "twitter:card", content: "summary" },
        ],
    }),
    component: Kinderen,
});
function Kinderen() {
    const st = useStart();
    const kring = useKring();
    const betrokkenen = kring.personen.filter((p) => !p.ingetrokken && st.kinderen.some((k) => p.rechten[k.id]));
    const [kindOpen, setKindOpen] = useState(false);
    if (st.eigen)
        return (<AppShell>
        <PageHeader titel="Kinderen" subtitel="Dezelfde informatie, in beide huizen"/>
        <div className="mt-6 divide-y divide-border border-y border-border">
          {st.kinderen.map((k) => (<Link key={k.id} to="/kinderen/$kindId" params={{ kindId: k.id }} className="flex min-h-14 items-center gap-4 py-3">
              <ProfielBeeld beeld={k.beeld} naam={k.naam} kleur={k.kleur} maat={48}/>
              <div className="flex-1">
                <p className="font-display text-lg font-bold">{k.naam}</p>
                {leeftijdTekst(k.geboortedatum) ? <p className="text-xs text-ink-soft">{leeftijdTekst(k.geboortedatum)}</p> : null}
              </div>
              <span className="text-xl text-ink-soft">›</span>
            </Link>))}
        </div>
        {!st.kinderen.length ? <p className="mt-4 text-sm text-ink-soft">Je hebt nog geen kind toegevoegd.</p> : null}
        <details className="mt-6 [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex min-h-[44px] cursor-pointer list-none items-center text-sm font-semibold text-ink-soft">Beheren ›</summary>
          <div className="mt-2 flex flex-wrap gap-2">
            <button onClick={() => setKindOpen("kind")} className="min-h-[44px] rounded-xl border border-border px-4 text-sm font-semibold">Kind toevoegen</button>
            <button onClick={() => setKindOpen("familie")} className="min-h-[44px] rounded-xl border border-border px-4 text-sm font-semibold">Familielid of betrokkene toevoegen</button>
          </div>
          {betrokkenen.length ? <div className="mt-4 divide-y divide-border border-y border-border">
            {betrokkenen.map((p) => <div key={p.id} className="py-3"><p className="text-sm font-semibold">{persoonLabel(p)}</p>{p.contact ? <p className="text-xs text-ink-soft">{p.contact}</p> : null}</div>)}
          </div> : null}
        </details>
        <KindSheet open={!!kindOpen} start={kindOpen || "kind"} onClose={() => setKindOpen(false)}/>
      </AppShell>);
    return (<AppShell>
      <PageHeader titel="Kinderen" subtitel="Dezelfde informatie, in beide huizen"/>
      <div className="mt-6 space-y-3">
        {kinderen.map((k) => (<Link key={k.id} to="/kinderen/$kindId" params={{ kindId: k.id }} className="block">
            <Card className="flex items-center gap-4">
              <img src={k.avatar} alt={k.naam} className="size-16 rounded-md object-cover"/>
              <div className="flex-1">
                <p className="font-display text-lg font-bold">{k.naam}</p>
                <p className="text-xs text-ink-soft">{k.leeftijd} jaar · {k.school}</p>
              </div>
              <span className="text-xl text-ink-soft">›</span>
            </Card>
          </Link>))}
      </div>
    </AppShell>);
}
