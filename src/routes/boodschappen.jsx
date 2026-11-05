import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { AppShell, Card, PageHeader } from "@/components/AppShell";
import { useLijst } from "@/components/KleineLijst";
import { useBudgetten } from "@/lib/budget-store";
import { bevestigdBudget, gekoppeldBudget } from "@/lib/budget-weergave";
import { useKosten } from "@/lib/kosten-store";
import { useStart } from "@/lib/start-store";
import { Button } from "@/components/ui/button";
import { AppIcon } from "@/components/AppIcon";
import { useNavigate } from "@tanstack/react-router";
// Eigen gezin: eigen lijstje (geen voorbeelddata), met plusje en toevoegformulier.
function BoodschappenWrap() {
    const st = useStart();
    if (st.eigen)
        return <EigenBoodschappen />;
    return <Boodschappen />;
}
function EigenBoodschappen() {
    const st = useStart();
    const nav = useNavigate();
    const data = useLijst([], "nog-nodig-eigen");
    const zoek = Route.useSearch();
    const [nieuw, setNieuw] = useState(!!zoek.item);
    const [tekst, setTekst] = useState(zoek.item ?? "");
    const [alGekocht, setAlGekocht] = useState(false);
    const [kind, setKind] = useState(zoek.kind && st.kinderen.some((k) => k.naam === zoek.kind) ? zoek.kind : st.kinderen[0]?.naam ?? "");
    const open = data.lijst.filter((i) => !i.klaar);
    const klaar = data.lijst.filter((i) => i.klaar);
    const [vraag, setVraag] = useState(null);
    const vraagItem = data.lijst.find((i) => i.id === vraag && i.klaar);
    const inKosten = (t) => st.kosten.some((k) => k.omschrijving.trim().toLowerCase() === t.trim().toLowerCase());
    const rij = (i) => (<li key={i.id} className="flex items-center gap-3 px-3 py-3">
      <button onClick={() => { data.toggle(i.id); setVraag(i.klaar ? null : i.id); }} aria-pressed={i.klaar} aria-label={i.klaar ? "Markeer als nog nodig" : "Markeer als gekocht"} className={`grid size-6 shrink-0 place-items-center rounded-full border ${i.klaar ? "border-brand bg-brand text-primary-foreground" : "border-ink-soft/40"}`}>{i.klaar ? "✓" : ""}</button>
      <span className="min-w-0 flex-1">
        <span className={`block text-sm ${i.klaar ? "text-ink-soft line-through" : "font-semibold"}`}>{i.tekst}</span>
        <span className="block text-xs text-ink-soft">{i.kind}</span>
        {i.deadline ? <span className="block text-xs text-ink-soft">Vóór {i.deadline}</span> : null}
      </span>
      {!i.klaar ? <Link to="/kosten" search={{ budget: "nieuw", benodigdheid: i.tekst, kind: i.kind }} className="text-xs font-semibold text-brand">Budget voorstellen</Link> : null}
    </li>);
    return (<AppShell>
      <PageHeader titel="Nog nodig" subtitel="Wat hebben de kinderen nog nodig?" actie={<Button variant="ghost" size="icon" aria-label="Iets toevoegen" onClick={() => setNieuw(!nieuw)}><AppIcon functie="toevoegen" vorm="kaal"/></Button>}/>
      {nieuw ? (<Card className="mt-4 space-y-2">
          <input value={tekst} onChange={(e) => setTekst(e.target.value)} placeholder="Bijv. winterjas, luiers" aria-label="Wat is er nodig?" className={`w-full ${veld}`}/>
          {st.kinderen.length ? (<select value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Voor wie" className={`w-full ${veld}`}>
              {st.kinderen.map((k) => <option key={k.id} value={k.naam}>{k.naam}</option>)}
            </select>) : null}
          <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={alGekocht} onChange={(e) => setAlGekocht(e.target.checked)}/>Al gekocht</label>
          <button onClick={() => { if (tekst.trim()) {
            const id = data.voegToe(tekst.trim(), "Nodig", kind, alGekocht);
            if (alGekocht)
                setVraag(id);
            setAlGekocht(false);
            setTekst("");
            setNieuw(false);
        } }} disabled={!tekst.trim()} className="min-h-11 w-full rounded-full bg-brand text-sm font-semibold text-primary-foreground disabled:opacity-40">Toevoegen</button>
        </Card>) : null}
      {vraagItem ? <div className="mt-4 border-y border-border py-3"><p className="text-sm font-semibold">{inKosten(vraagItem.tekst) ? `${vraagItem.tekst} staat al bij Kosten.` : "Ook toevoegen aan Kosten?"}</p><div className="mt-2 flex flex-wrap items-center gap-3">{!inKosten(vraagItem.tekst) ? <Link to="/kosten" search={{ uitgave: vraagItem.tekst, kind: vraagItem.kind }} className="text-sm font-semibold text-brand">Toevoegen aan Kosten</Link> : null}<Button variant="ghost" size="sm" onClick={() => setVraag(null)}>Alleen als gekocht markeren</Button></div></div> : null}
      {!data.lijst.length && !nieuw ? (<div className="mt-10 flex flex-col items-center text-center">
          <p className="font-display text-lg font-bold">Hier is het nog rustig</p>
          <p className="mt-1 max-w-xs text-sm text-ink-soft">Hier zie je wat de kinderen nog nodig hebben. Je lijstje is nog leeg.</p>
          <button onClick={() => setNieuw(true)} className="mt-5 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-primary-foreground">Eerste item toevoegen</button>
          <button onClick={() => nav({ to: "/meer" })} className="mt-3 min-h-11 text-sm font-semibold text-ink-soft">Terug naar Menu</button>
        </div>) : null}
      {open.length ? <ul className="mt-4 divide-y divide-border rounded-md border border-border bg-card">{open.map(rij)}</ul> : null}
      {klaar.length ? (<>
          <h2 className="mt-5 text-[11px] font-bold uppercase tracking-wide text-ink-soft">Gekocht</h2>
          <ul className="mt-2 divide-y divide-border rounded-md border border-border bg-card">{klaar.map(rij)}</ul>
        </>) : null}
    </AppShell>);
}
export const Route = createFileRoute("/boodschappen")({
    head: () => ({
        meta: [
            { title: "Nog nodig — Ouderschap & Co" },
            { name: "description", content: "Wat hebben de kinderen nog nodig?" },
            { property: "og:title", content: "Nog nodig — Ouderschap & Co" },
            { property: "og:description", content: "Wat hebben de kinderen nog nodig?" },
            { property: "og:type", content: "website" },
            { name: "twitter:card", content: "summary" },
        ],
    }),
    validateSearch: z.object({ item: z.string().max(120).optional(), kind: z.string().max(40).optional() }),
    component: BoodschappenWrap,
});
const veld = "rounded-md border border-border bg-background px-3 py-2 text-sm";
function Boodschappen() {
    // Dezelfde lijst en statussen als voorheen onder Taken (verplaatst, niet gekopieerd).
    const data = useLijst([
        { tekst: "Regenlaarzen maat 30", wie: "Nodig", kind: "Noah", klaar: false },
        { tekst: "Fietshelm", wie: "Nodig", kind: "Emma", klaar: false },
        { tekst: "Neusspray (apotheek)", wie: "Boodschap", kind: "Emma", klaar: false },
        { tekst: "Gymtas", wie: "Nodig", kind: "Emma", klaar: true },
    ], "nog-nodig-demo");
    const kosten = useKosten();
    const budgetten = useBudgetten();
    const [koppelItem, setKoppelItem] = useState(null);
    const zoek = Route.useSearch();
    const [nieuw, setNieuw] = useState(!!zoek.item);
    const [tekst, setTekst] = useState(zoek.item ?? "");
    const [alGekocht, setAlGekocht] = useState(false);
    const [wie, setWie] = useState("Nodig");
    const [kind, setKind] = useState(zoek.kind ?? "Emma");
    const [gekochtOpen, setGekochtOpen] = useState(false);
    const [vraag, setVraag] = useState(null);
    const open = data.lijst.filter((i) => !i.klaar);
    const gekocht = data.lijst.filter((i) => i.klaar);
    const inKosten = (t) => kosten.some((k) => k.omschrijving.trim().toLowerCase() === t.trim().toLowerCase());
    const vink = (id, klaar) => {
        data.toggle(id);
        setVraag(klaar ? null : id);
    };
    const vraagItem = data.lijst.find((i) => i.id === vraag && i.klaar);
    const rij = (i) => (<li key={i.id} className="flex items-center gap-3 px-3 py-3">
      <button onClick={() => vink(i.id, i.klaar)} aria-pressed={i.klaar} aria-label={i.klaar ? "Markeer als nog nodig" : "Markeer als gekocht"} className={`grid size-6 shrink-0 place-items-center rounded-full border ${i.klaar ? "border-brand bg-brand text-primary-foreground" : "border-ink-soft/40"}`}>{i.klaar ? "✓" : ""}</button>
      <span className="min-w-0 flex-1">
        <span className={`block text-sm ${i.klaar ? "text-ink-soft line-through" : "font-semibold"}`}>{i.tekst}</span>
        <span className="block text-xs text-ink-soft">{i.wie} · {i.kind}{i.klaar && inKosten(i.tekst) ? " · staat bij Kosten" : ""}</span>
        {i.deadline ? <span className="block text-xs text-ink-soft">Vóór {i.deadline}</span> : null}
        {gekoppeldBudget(i.budgetId, budgetten) ? <span className="mt-1 block text-xs text-brand"><span className="flex items-center gap-1"><AppIcon functie="kosten" maat="sm" vorm="kaal"/>Afgesproken budget: {gekoppeldBudget(i.budgetId, budgetten)?.max.toLocaleString("nl-NL", { style: "currency", currency: "EUR" })}</span><Link to="/kosten" search={{ budget: i.budgetId }} className="mt-1 inline-block font-semibold">Bekijk budget bij Kosten</Link></span> : null}
        {koppelItem === i.id ? <label className="mt-2 block text-xs text-ink-soft">Kies een afgesproken budget<select aria-label={`Budget koppelen aan ${i.tekst}`} defaultValue="" onChange={(e) => { if (e.target.value) {
        data.koppelBudget(i.id, e.target.value);
        setKoppelItem(null);
    } }} className={`mt-1 w-full ${veld}`}><option value="">Kies budget</option>{budgetten.filter((b) => bevestigdBudget(b) && (b.kind === i.kind || b.kind === "Emma & Noah" || b.kind === "Beide")).map((b) => <option key={b.id} value={b.id}>{b.wat} · {b.max.toLocaleString("nl-NL", { style: "currency", currency: "EUR" })}</option>)}</select></label> : null}
      </span>
      {!i.klaar ? <div className="flex w-24 shrink-0 flex-col items-end gap-1">
        {!i.budgetId ? <Link to="/kosten" search={{ budget: "nieuw", benodigdheid: i.tekst, kind: i.kind, bronItem: String(i.id) }} className="text-right text-xs font-semibold text-brand">Budget voorstellen</Link> : null}
        {!gekoppeldBudget(i.budgetId, budgetten) ? <Button variant="link" size="sm" onClick={() => setKoppelItem(koppelItem === i.id ? null : i.id)} className="h-auto min-h-11 whitespace-normal px-0 text-right text-xs">Budget koppelen</Button> : null}
      </div> : null}
    </li>);
    return (<AppShell>
      <PageHeader titel="Nog nodig" subtitel="Wat hebben de kinderen nog nodig?" actie={<Button variant="ghost" size="icon" aria-label="Iets toevoegen" onClick={() => setNieuw(!nieuw)}><AppIcon functie="toevoegen" vorm="kaal"/></Button>}/>

      {nieuw ? (<Card className="mt-4 space-y-2">
          <input value={tekst} onChange={(e) => setTekst(e.target.value)} placeholder="Bijv. winterjas, luiers" aria-label="Wat is er nodig?" className={`w-full ${veld}`}/>
          <div className="flex gap-2">
            <select value={wie} onChange={(e) => setWie(e.target.value)} aria-label="Soort" className={`flex-1 ${veld}`}><option>Nodig</option><option>Boodschap</option></select>
            <select value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Voor wie" className={`flex-1 ${veld}`}><option>Emma</option><option>Noah</option><option>Allebei</option></select>
          </div>
          <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={alGekocht} onChange={(e) => setAlGekocht(e.target.checked)}/>Al gekocht</label>
          <button onClick={() => { if (tekst.trim()) {
            const id = data.voegToe(tekst.trim(), wie, kind, alGekocht);
            if (alGekocht)
                setVraag(id);
            setAlGekocht(false);
            setTekst("");
            setNieuw(false);
        } }} disabled={!tekst.trim()} className="min-h-11 w-full rounded-full bg-brand text-sm font-semibold text-primary-foreground disabled:opacity-40">Toevoegen</button>
        </Card>) : null}

      {vraagItem ? (<Card className="mt-4">
          <div className="flex items-start gap-2">
            <p className="flex-1 text-sm font-semibold">{inKosten(vraagItem.tekst) ? `${vraagItem.tekst} staat al bij Kosten.` : "Ook toevoegen aan Kosten?"}</p>
            <button onClick={() => setVraag(null)} aria-label="Sluiten" className="knop-kruis -mr-2 -mt-2 size-11">✕</button>
          </div>
          {inKosten(vraagItem.tekst) ? null : (<>
              <p className="mt-1 text-sm text-ink-soft">Wil je het bedrag of een bonnetje toevoegen?</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link to="/kosten" search={{ uitgave: vraagItem.tekst, kind: vraagItem.kind }} className="inline-flex min-h-11 items-center rounded-full bg-brand px-4 text-sm font-semibold text-primary-foreground">Toevoegen aan Kosten</Link>
                <button onClick={() => setVraag(null)} className="min-h-11 px-2 text-sm font-semibold text-ink-soft">Nee, alleen als gekocht markeren</button>
              </div>
            </>)}
        </Card>) : null}

      <section className="mt-5">
        <h2 className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">Op het lijstje</h2>
        {open.length ? <ul className="mt-2 divide-y divide-border rounded-md border border-border bg-card">{open.map(rij)}</ul> : <p className="mt-2 text-sm text-ink-soft">Er is nu niets nodig.</p>}
      </section>

      {gekocht.length ? (<div className="mt-4">
          <button onClick={() => setGekochtOpen(!gekochtOpen)} aria-expanded={gekochtOpen} className="min-h-11 text-sm font-semibold text-brand">{gekochtOpen ? "Verberg gekocht" : `Gekocht (${gekocht.length}) ›`}</button>
          {gekochtOpen ? <ul className="mt-2 divide-y divide-border rounded-md border border-border bg-card">{gekocht.map(rij)}</ul> : null}
        </div>) : null}
    </AppShell>);
}
