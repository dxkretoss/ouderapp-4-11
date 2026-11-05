import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { z } from "zod";
import { AppShell, Card, PageHeader } from "@/components/AppShell";
import { meeneemLijst, toggleMeeneem, useWissel } from "@/lib/wissel-store";
import { AppIcon, Pictogram, TekenLabel } from "@/components/AppIcon";
import { accepteer, dienVoorstelIn, statusLabel, trekIn, useZorg, wijsAf } from "@/lib/zorg-store";
export const Route = createFileRoute("/wissel")({
    validateSearch: z.object({ actie: z.enum(["ruil", "nachtje"]).optional(), bron: z.string().optional() }),
    head: () => ({
        meta: [
            { title: "Wissel voorbereiden — Ouderschap & Co" },
            { name: "description", content: "Alles klaar voor de wissel: spullen, afspraken, ruilen en een extra nachtje." },
            { property: "og:title", content: "Wissel voorbereiden — Ouderschap & Co" },
            { property: "og:description", content: "Rustig voorbereid op het volgende wisselmoment." },
            { property: "og:type", content: "website" },
            { name: "twitter:card", content: "summary" },
        ],
    }),
    component: Wissel,
});
const startLijst = meeneemLijst;
const dagen = ["ma 16", "di 17", "wo 18", "do 19", "vr 20", "za 21", "zo 22", "ma 23", "di 24", "wo 25"];
function Wissel() {
    const { t } = useTranslation();
    const { actie } = Route.useSearch();
    const { klaar } = useWissel();
    const [soort, setSoort] = useState(actie ?? null);
    // Vanuit een andere pagina: het formulier meteen in beeld, zodat je niet hoeft te zoeken.
    useEffect(() => {
        if (!actie)
            return;
        const t = window.setTimeout(() => document.getElementById("ruil-formulier")?.scrollIntoView({ block: "start" }), 200);
        return () => window.clearTimeout(t);
    }, [actie]);
    const [van, setVan] = useState(dagen[4]);
    const [naar, setNaar] = useState(dagen[6]);
    const [kind, setKind] = useState("Emma & Noah");
    const zorg = useZorg();
    const verzoeken = zorg.voorstellen.filter((v) => v.aanleiding === "ruil" || v.aanleiding === "nachtje");
    const [beschikbaar, setBeschikbaar] = useState(new Set(["di 24"]));
    const alles = klaar.size === startLijst.length;
    const toggle = toggleMeeneem;
    const verstuur = () => {
        const dag = (d) => Number(d.split(" ")[1]);
        const kids = kind === "Emma" ? ["emma"] : kind === "Noah" ? ["noah"] : ["emma", "noah"];
        dienVoorstelIn(soort === "ruil"
            ? { soort: "eenmalig", aanleiding: "ruil", kinderen: ["emma", "noah"], tekst: `${van} ruilen met ${naar}`, datumLabel: `${van} ↔ ${naar}`, dagen: [dag(naar)], naarOuder: "sanne" }
            : { soort: "eenmalig", aanleiding: "nachtje", kinderen: kids, tekst: `Kan ${kind} ${van} bij Joris slapen?`, datumLabel: van, dagen: [dag(van)], naarOuder: "joris" });
        setSoort(null);
    };
    return (<AppShell>
      <PageHeader titel="Wissel voorbereiden" subtitel="Alles klaar voor de wissel, zonder gedoe" terug="/"/>

      <Card className="mt-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Volgende wissel</p>
        <p className="mt-1 font-display text-xl font-extrabold">Vrijdag 17:00 uur → naar Joris</p>
        <p className="text-sm text-ink-soft">Emma & Noah · ophalen bij school</p>
        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <Link to="/overdracht" className="rounded-md bg-brand-soft px-3 py-2"><TekenLabel waarde="📋 1 bijzonderheid"/></Link>
          <Link to="/momentjes" className="rounded-md bg-brand-soft px-3 py-2"><TekenLabel waarde="📸 Nieuw momentje"/></Link>
        </div>
      </Card>

      <Card className="mt-4">
        <p className="font-display font-bold">Mee te nemen</p>
        <p className="text-xs text-ink-soft">Samengesteld uit agenda, overdracht en "niet vergeten"</p>
        <ul className="mt-3 space-y-2">
          {startLijst.map((i) => (<li key={i.id}>
              <button onClick={() => toggle(i.id)} className="flex w-full items-center gap-3 rounded-md bg-surface/60 px-3 py-2 text-left text-sm">
                <span className={`grid size-6 place-items-center rounded-full border ${klaar.has(i.id) ? "border-brand bg-brand text-surface" : "border-ink-soft/40"}`}>
                  {klaar.has(i.id) ? "✓" : ""}
                </span>
                <Pictogram waarde={i.icoon} maat="sm"/>
                <span className={klaar.has(i.id) ? "text-ink-soft line-through" : ""}>{i.tekst}</span>
              </button>
            </li>))}
        </ul>
        {alles ? <p className="mt-3 rounded-md bg-brand-soft px-3 py-2 text-sm font-semibold text-brand">✓ Alles klaar voor de wissel</p> : null}
      </Card>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <button onClick={() => setSoort("ruil")} className="rounded-lg border border-border p-4 text-left">
          <AppIcon functie="wissel" maat="md"/>
          <p className="mt-1 font-display font-bold">Dag ruilen</p>
          <p className="text-xs text-ink-soft">Stel een andere dag voor</p>
        </button>
        <button onClick={() => setSoort("nachtje")} className="rounded-lg border border-border p-4 text-left">
          <AppIcon functie="slapen" maat="md"/>
          <p className="mt-1 font-display font-bold">Extra nachtje</p>
          <p className="text-xs text-ink-soft">"Kan ze bij jou slapen?"</p>
        </button>
      </div>

      {soort ? (<div id="ruil-formulier" className="scroll-mt-4">
        <Card className="mt-4 space-y-3">
          <p className="font-display font-bold">{soort === "ruil" ? "Dag ruilen" : "Extra nachtje vragen"}</p>
          {soort === "nachtje" ? (<select value={kind} onChange={(e) => setKind(e.target.value)} className="w-full rounded-md bg-surface px-3 py-2 text-sm">
              <option>Emma & Noah</option><option>Emma</option><option>Noah</option>
            </select>) : null}
          <label className="block text-xs text-ink-soft">{soort === "ruil" ? "Huidige dag" : "Welke nacht"}
            <select value={van} onChange={(e) => setVan(e.target.value)} className="mt-1 w-full rounded-md bg-surface px-3 py-2 text-sm text-ink">
              {dagen.map((d) => <option key={d}>{d}</option>)}
            </select>
          </label>
          {soort === "ruil" ? (<label className="block text-xs text-ink-soft">Gewenste dag
              <select value={naar} onChange={(e) => setNaar(e.target.value)} className="mt-1 w-full rounded-md bg-surface px-3 py-2 text-sm text-ink">
                {dagen.map((d) => <option key={d}>{d}</option>)}
              </select>
            </label>) : null}
          <p className="text-xs text-ink-soft">Bij akkoord wordt de agenda automatisch aangepast.</p>
          <div className="flex gap-2">
            <button onClick={verstuur} className="flex-1 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-surface">Voorstel sturen</button>
            <button onClick={() => setSoort(null)} className="rounded-md px-4 py-2 text-sm text-ink-soft">Annuleren</button>
          </div>
        </Card>
        </div>) : null}

      <Card className="mt-4">
        <p className="font-display font-bold">Verzoeken</p>
        <ul className="mt-3 space-y-2">
          {verzoeken.map((v) => (<li key={v.id} className="rounded-md bg-surface/60 px-3 py-2 text-sm">
              <p className="flex items-center gap-1.5"><AppIcon functie={v.aanleiding === "ruil" ? "wissel" : "slapen"} maat="sm" vorm="kaal"/> {v.van === "Sanne" ? "Jij vraagt" : `${v.van} vraagt`}: {v.tekst}</p>
              {v.status === "open" && v.van !== "Sanne" ? (<div className="mt-2 flex gap-2">
                  <button onClick={() => accepteer(v.id)} className="rounded-xl bg-brand px-3 py-1 text-xs font-semibold text-surface">Akkoord</button>
                  <button onClick={() => wijsAf(v.id)} className="rounded-xl px-3 py-1 text-xs text-ink-soft">Liever niet</button>
                </div>) : v.status === "open" ? (<div className="mt-1 flex items-center justify-between">
                  <p className="text-xs text-ink-soft">{statusLabel.open}</p>
                  <button onClick={() => trekIn(v.id)} className="text-xs font-semibold text-brand">Intrekken</button>
                </div>) : (<p className="mt-1 text-xs font-semibold text-brand">{statusLabel[v.status]}</p>)}
            </li>))}
        </ul>
      </Card>

      <Card className="mt-4">
        <p className="font-display font-bold">Wanneer kan ik eventueel bijspringen?</p>
        <p className="text-xs text-ink-soft">Geen afspraak, alleen een signaal voor Joris</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {dagen.map((d) => (<button key={d} onClick={() => setBeschikbaar((s) => { const n = new Set(s); n.has(d) ? n.delete(d) : n.add(d); return n; })} className={`rounded-full px-3 py-1 text-xs ${beschikbaar.has(d) ? "bg-brand text-surface" : "bg-surface/70 text-ink-soft"}`}>
              {d}
            </button>))}
        </div>
      </Card>
    </AppShell>);
}
