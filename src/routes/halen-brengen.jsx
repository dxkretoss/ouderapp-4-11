import { useTranslation } from "react-i18next";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, Card, PageHeader } from "@/components/AppShell";
import { AppIcon } from "@/components/AppIcon";
import { IkBenLater } from "@/components/IkBenLater";
import { useKring } from "@/lib/kring-store";
import { useGesprekken, voegCheckInToe, zetModule, zetOnderweg } from "@/lib/gesprekken-store";
import { markeerGebruikt } from "@/lib/gezag-store";
export const Route = createFileRoute("/halen-brengen")({
    head: () => ({
        meta: [
            { title: "Halen en brengen regelen — Ouderschap & Co" },
            { name: "description", content: "Maak overdrachten duidelijk en voorspelbaar." },
            { property: "og:title", content: "Halen en brengen regelen — Ouderschap & Co" },
            { property: "og:description", content: "Afspraken over halen en brengen en de volgende overdracht." },
            { property: "og:type", content: "website" },
            { name: "twitter:card", content: "summary" },
        ],
    }),
    component: HalenBrengen,
});
const nu = () => new Date().toTimeString().slice(0, 5);
const UUR = 3600_000;
/** Fase t.o.v. het echte overdrachtsmoment; acties tonen we alleen als je er nu iets mee kunt. */
function faseVan(datum, tijd, nuMs) {
    const t = new Date(`${datum}T${tijd}:00`).getTime();
    if (!Number.isFinite(t))
        return "later";
    const verschil = t - nuMs;
    if (verschil < -2 * UUR)
        return "voorbij";
    const zelfdeDag = new Date(t).toDateString() === new Date(nuMs).toDateString();
    if (zelfdeDag)
        return "vandaag";
    return verschil <= 24 * UUR ? "binnen24" : "later";
}
function HalenBrengen() {
    const { t } = useTranslation();
    const kring = useKring();
    const s = useGesprekken();
    // Dezelfde overdracht als op Home en Overdracht: het eerstvolgende wisselmoment.
    const m = kring.momenten.find((x) => x.soort === "wissel");
    const bevestigd = m ? s.checkins.find((c) => c.momentId === m.id && c.wie === "Sanne") : undefined;
    // Voorbeeld: bekijk hoe het er op de overdrachtsdag uitziet, zonder iets aan de planning te veranderen.
    const [demoMinuten, setDemoMinuten] = useState(null);
    const overdrachtMs = m ? new Date(`${m.datum}T${m.tijd}:00`).getTime() : 0;
    const nuMs = demoMinuten === null ? Date.now() : overdrachtMs - demoMinuten * 60_000;
    const fase = m && m.datum ? faseVan(m.datum, m.tijd, nuMs) : "later";
    const aankomstMogelijk = fase === "vandaag" && Math.abs(overdrachtMs - nuMs) <= 45 * 60_000;
    const onderweg = m ? s.onderweg[m.id] : undefined;
    const bevestig = () => {
        if (!m)
            return;
        markeerGebruikt("/halen-brengen");
        voegCheckInToe({ id: Date.now(), wie: "Sanne", moment: `Overdracht ${m.dag.toLowerCase()} ${m.tijd}`, momentId: m.id, datum: m.dag, tijd: nu() });
        zetOnderweg(m.id, null);
    };
    return (<AppShell>
      <PageHeader titel="Halen en brengen regelen" subtitel="Maak overdrachten duidelijk en voorspelbaar." terug="/extra-ondersteuning"/>

      <div className="mt-5 divide-y divide-border rounded-md border border-border bg-card">
        <Link to="/afspraken" onClick={() => markeerGebruikt("/halen-brengen")} className="flex min-h-14 items-center gap-3 px-3 py-3">
          <AppIcon functie="veiligheid" maat="md"/>
          <span className="flex-1"><span className="block text-sm font-semibold">Afspraken over halen en brengen</span><span className="block text-xs text-ink-soft">Bekijk wat jullie hebben afgesproken.</span></span>
          <span className="text-ink-soft" aria-hidden>›</span>
        </Link>
      </div>

      {m && fase !== "voorbij" ? (<section className="mt-6">
          <h2 className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">Volgende overdracht</h2>
          <Card className="mt-2 space-y-3">
            <div>
              <p className="font-semibold">{fase === "vandaag" ? "Vandaag" : m.dag} · {m.tijd} uur · naar Joris</p>
              <p className="text-sm text-ink-soft">{m.plek}</p>
              {fase !== "later" ? <Link to="/overdracht" className="mt-1 inline-flex min-h-11 items-center text-sm font-semibold text-brand">Overdracht voorbereiden ›</Link> : null}
            </div>

            {fase === "vandaag" && onderweg ? <p role="status" className="rounded-md bg-brand-soft px-3 py-2 text-sm font-semibold">{onderweg} is onderweg</p> : null}

            {bevestigd ? (<p role="status" className="rounded-md bg-brand-soft px-3 py-2 text-sm font-semibold">✓ Aankomst bevestigd · {bevestigd.tijd} uur</p>) : aankomstMogelijk ? (!s.aan.gps ? (<div className="space-y-2 rounded-md border border-border p-3 text-sm">
                  <p className="font-semibold">Aankomst bevestigen</p>
                  <p className="text-xs font-semibold">Wat gebeurt er?</p>
                  <ul className="space-y-1 text-xs text-ink-soft">
                    <li>✓ Je bevestigt zelf dat je op de afgesproken plek bent.</li>
                    <li>✓ We leggen alleen vast: wie, bij welke overdracht en hoe laat.</li>
                    <li>✓ Je locatie wordt niet gebruikt. De app volgt je niet.</li>
                    <li>✓ Wie ziet dit? Jij en Joris.</li>
                  </ul>
                  <button onClick={() => zetModule("gps", true)} className="min-h-11 w-full rounded-full border border-border text-sm font-semibold">Duidelijk</button>
                </div>) : (<div className="space-y-1">
                  <button onClick={bevestig} className="min-h-12 w-full rounded-full bg-brand font-semibold text-primary-foreground">Aankomst bevestigen</button>
                  <p className="text-[11px] text-ink-soft">Je bevestigt zelf dat je op de afgesproken plek bent. Jij en Joris zien de tijd.</p>
                </div>)) : null}

            {!bevestigd && (fase === "vandaag" || fase === "binnen24") ? (<div className="flex flex-wrap items-center gap-x-4 border-t border-border pt-2">
                <IkBenLater momentId={m.id}/>
                {fase === "vandaag" && !onderweg ? (<button onClick={() => { zetOnderweg(m.id, "Sanne", m.tijd); markeerGebruikt("/halen-brengen"); }} className="min-h-11 text-sm font-semibold text-brand">Ik ben onderweg</button>) : null}
              </div>) : null}
            {fase === "vandaag" && onderweg && !bevestigd ? <p className="text-[11px] text-ink-soft">Joris kreeg één rustige melding: "{onderweg} is onderweg voor de overdracht van {m.tijd} uur." Geen locatie, route of aankomsttijd.</p> : null}
          </Card>
          {import.meta.env.DEV ? (<details className="mt-3 text-xs text-ink-soft">
            <summary className="min-h-11 cursor-pointer">Voorbeeld: bekijk de overdrachtsdag</summary>
            <div className="flex flex-wrap gap-2">
              {[[null, "Nu"], [20 * 60, "Dag ervoor"], [3 * 60, "Vandaag, ochtend"], [10, "Vlak voor de overdracht"], [-180, "Na de overdracht"]].map(([v, l]) => (<button key={l} onClick={() => setDemoMinuten(v)} className={`min-h-11 rounded-full border px-3 ${demoMinuten === v ? "border-brand text-ink" : "border-border"}`}>{l}</button>))}
            </div>
          </details>) : null}
        </section>) : (<p className="mt-6 text-sm text-ink-soft">Er staat nu geen overdracht gepland.</p>)}
    </AppShell>);
}
