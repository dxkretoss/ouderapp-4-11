import { useState } from "react";
import { Check, X } from "lucide-react";
import { toggleMee, useKring } from "@/lib/kring-store";
import { haalMeeWeg, meeLijst, useTaken, voegMeeToe } from "@/lib/taken-store";
import { mogelijkMee, useSlimmeHulp } from "@/lib/slimme-hulp";
import { useVoorkeuren } from "@/lib/voorkeuren-store";
import { uur } from "@/lib/tijd-tekst";
/** Overdrachtslijst die zichzelf samenstelt uit het moment en spullen die standaard meewisselen; altijd aanpasbaar. */
export function SlimmeMeeLijst({ momentId }) {
    const kring = useKring();
    useTaken();
    useSlimmeHulp();
    const vk = useVoorkeuren();
    const [nieuw, setNieuw] = useState("");
    const m = kring.momenten.find((x) => x.id === momentId);
    if (!m)
        return null;
    const lijst = meeLijst(m);
    const klaar = kring.meeKlaar[m.id] ?? [];
    const open = lijst.filter((x) => !klaar.includes(x)).length;
    return (<section className="mt-6 border-y border-border py-4">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-lg font-bold">Mee · {m.dag.toLowerCase()} {uur(m.tijd)}</h2>
        <span className={`text-xs font-semibold ${open ? "text-ink-soft" : "text-brand"}`}>{open ? `${open} ${open === 1 ? "ding" : "dingen"} nog niet klaar` : "Alles klaar ✓"}</span>
      </div>
      <ul className="mt-2 space-y-1.5">
        {lijst.map((item) => (<li key={item} className="flex items-center gap-3 text-sm">
            <button onClick={() => toggleMee(m.id, item)} aria-pressed={klaar.includes(item)} className="flex flex-1 items-center gap-3 text-left">
              <span className={`grid size-5 place-items-center rounded-full border ${klaar.includes(item) ? "border-brand bg-brand text-primary-foreground" : "border-ink-soft/40"}`}>{klaar.includes(item) ? <Check className="size-3"/> : null}</span>
              <span className={klaar.includes(item) ? "text-ink-soft line-through" : ""}>{item}</span>
            </button>
            <button onClick={() => haalMeeWeg(m.id, item)} aria-label={`${item} van de lijst halen`} className="text-brand"><X className="size-3.5"/></button>
          </li>))}
      </ul>
      {vk.overdrachtHulp && mogelijkMee(m).length ? (<div className="mt-3 rounded-md bg-muted px-3 py-2">
          <p className="text-xs font-semibold">Wellicht nodig</p>
          <ul className="mt-1 space-y-1">
            {mogelijkMee(m).map((x) => (<li key={x.item} className="flex items-center gap-2 text-sm">
                <span className="min-w-0 flex-1">{x.item}<span className="block text-[11px] text-ink-soft">{x.reden}</span></span>
                <button onClick={() => voegMeeToe(m.id, x.item)} className="rounded-full border border-brand/40 px-2.5 py-0.5 text-xs font-semibold text-brand">Toevoegen</button>
              </li>))}
          </ul>
          <p className="mt-1 text-[11px] text-ink-soft">Op basis van jullie routines en de activiteiten tot het volgende wisselmoment. Niets komt er vanzelf op.</p>
        </div>) : null}
      <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (nieuw.trim()) {
        voegMeeToe(m.id, nieuw.trim());
        setNieuw("");
    } }}>
        <input value={nieuw} onChange={(e) => setNieuw(e.target.value)} placeholder="Iets toevoegen" className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm"/>
        <button className="rounded-md border border-border px-3 text-sm font-semibold text-brand">Toevoegen</button>
      </form>
      <p className="mt-2 text-[11px] text-ink-soft">Spullen die standaard meewisselen komen er vanzelf op. Vaste-plek- en dubbele spullen niet.</p>
    </section>);
}
