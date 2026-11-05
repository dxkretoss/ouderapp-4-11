import { useEffect, useState } from "react";
import { GeldInvoer } from "@/components/GeldInvoer";
import { leesGeld } from "@/lib/geld-invoer";
import { geldigUitstelMoment, toonUitstelMoment, uitstelMoment } from "@/lib/budget-uitstel";
import { bevestigdBudget } from "@/lib/budget-weergave";
import { AppIcon } from "@/components/AppIcon";
import { koppelLijstBudget } from "@/components/KleineLijst";
import { bevestig } from "@/lib/feedback";
import { Link } from "@tanstack/react-router";
import { VoorstelIntrekken } from "@/components/VoorstelIntrekken";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { nieuwBudget, reageer, wijzigBudgetVoorstel, stuurBudgetHerinnering, trekBudgetIn, useBudgetten, vraagMeerTijdBudget } from "@/lib/budget-store";
import { magHerinnering } from "@/lib/herinneringen";
import { useVoorkeuren } from "@/lib/voorkeuren-store";
const euro = (n) => n.toLocaleString("nl-NL", { style: "currency", currency: "EUR" });
const statusLabel = {
    wacht: "Reactie open", tegenvoorstel: "Tegenvoorstel", akkoord: "Afgesproken", geweigerd: "Afgewezen", uitgegeven: "Uitgave geregistreerd", ingetrokken: "Ingetrokken",
};
/** "Meer tijd gevraagd" leest de laatste stap; het voorstel blijft gewoon open. */
const meerTijd = (v) => v.stappen.at(-1)?.wat.startsWith("Meer tijd gevraagd") === true;
const veld = "w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-brand";
const chip = (a) => `rounded-full border px-3 py-1.5 text-xs font-semibold ${a ? "border-brand bg-brand-soft text-brand" : "border-border text-ink-soft"}`;
/** filter "actie": alleen voorstellen die op jou wachten (voor "Nog te regelen"); "rest": de overige, met kop. Zelfde brondata. */
export function BudgetVoorstel({ startOpen = false, voorinvul, voorKind, doelId, bronItem, onUitgave, filter = "alles", zonderKop = false, onKlaar }) {
    const opJou = (v) => v.aanZet === "Sanne" && (v.status === "wacht" || v.status === "tegenvoorstel");
    const ikOpen = opJou;
    const lijst = useBudgetten().filter((v) => doelId ? v.id === doelId : filter === "lopend" ? v.status === "wacht" || v.status === "tegenvoorstel" : filter === "eerder" ? v.status === "geweigerd" || v.status === "ingetrokken" : filter === "afgesproken" ? !!bevestigdBudget(v) : filter === "alles" || (filter === "actie") === opJou(v));
    const [open, setOpen] = useState(false);
    useEffect(() => { if (startOpen)
        setOpen(true); }, [startOpen]);
    useEffect(() => { if (doelId)
        requestAnimationFrame(() => document.getElementById(`budget-${doelId}`)?.scrollIntoView({ block: "center" })); }, [doelId]);
    const [details, setDetails] = useState([]);
    const [tegenId, setTegenId] = useState(null);
    const [tegen, setTegen] = useState("");
    const [wijzigId, setWijzigId] = useState(null);
    const [uitstelId, setUitstelId] = useState(null);
    const [uitstelKeuze, setUitstelKeuze] = useState(null);
    const [uitstelDatum, setUitstelDatum] = useState("");
    const [uitstelTijd, setUitstelTijd] = useState("20:00");
    const [uitstelFout, setUitstelFout] = useState("");
    const gekozenMoment = uitstelKeuze === "zelf" ? (uitstelDatum && uitstelTijd ? new Date(`${uitstelDatum}T${uitstelTijd}`) : undefined) : undefined;
    const uitstelTot = uitstelKeuze === "zelf" ? (gekozenMoment && Number.isFinite(gekozenMoment.getTime()) ? gekozenMoment.toISOString() : undefined) : uitstelKeuze ? uitstelMoment(uitstelKeuze) : undefined;
    const leeg = { wat: "", kind: "Emma", max: "", aangepast: false, pct: 50, toelichting: "", reactieDatum: "" };
    const vk = useVoorkeuren();
    const [form, setForm] = useState({ ...leeg, wat: voorinvul ?? "", kind: voorKind ?? "Emma" });
    const max = leesGeld(form.max) ?? 0;
    return (<section>
      {zonderKop || filter === "actie" || doelId ? null : <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold">{filter === "afgesproken" ? "Afgesproken budgetten" : "Budgetvoorstellen"}</h2>
          <p className="mt-0.5 text-xs text-ink-soft">Spreek vóór de aankoop samen een bedrag af. Dit is nog geen kostenpost.</p>
        </div>
      </div>}

      <div className={filter === "actie" ? "divide-y divide-border" : "mt-2 divide-y divide-border border-y border-border"}>
        {lijst.map((v) => {
            const laatste = [...v.stappen].reverse().find((s) => s.bedrag)?.bedrag ?? v.max;
            const bevestigd = bevestigdBudget(v);
            const uitgeklapt = (ikOpen(v) && !meerTijd(v)) || details.includes(v.id) || doelId === v.id;
            const ikAanZet = v.aanZet === "Sanne" && (v.status === "wacht" || v.status === "tegenvoorstel");
            return (<div key={v.id} id={`budget-${v.id}`} className="py-3">
              <Button variant="ghost" aria-expanded={uitgeklapt} aria-label={`Budgetdetails ${v.wat}`} onClick={() => setDetails((l) => l.includes(v.id) ? l.filter((id) => id !== v.id) : [...l, v.id])} className="h-auto min-h-14 w-full justify-between gap-3 whitespace-normal px-0 text-left">
                <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{v.wat}{v.bijlage ? <AppIcon functie="documenten" maat="sm" vorm="kaal"/> : null}</span><span className="block text-xs font-normal text-ink-soft">{bevestigd ? `Afgesproken ${euro(v.max)}` : `Voorstel ${euro(laatste)}`}</span></span>
                <span className={`max-w-28 text-xs ${ikAanZet ? "text-accent-warm" : bevestigd ? "text-brand" : "text-ink-soft"}`}>{ikAanZet ? "Jouw reactie nodig" : meerTijd(v) && (v.status === "wacht" || v.status === "tegenvoorstel") ? "Meer tijd gevraagd" : v.status === "wacht" || v.status === "tegenvoorstel" ? "Wacht op reactie van de andere ouder" : bevestigd ? "Afgesproken" : statusLabel[v.status]}</span><span aria-hidden className="text-brand">{uitgeklapt ? "–" : "›"}</span>
              </Button>
              {meerTijd(v) && ikAanZet ? <p className="mb-2 text-xs text-ink-soft">Meer tijd gevraagd{v.stappen.at(-1)?.terugkijkMoment ? ` · Opnieuw bekijken: ${toonUitstelMoment(v.stappen.at(-1)?.terugkijkMoment ?? "")}` : ""}</p> : null}
              {uitgeklapt ? <div>
              <p className="text-xs text-ink-soft">{v.kind} · verdeling {v.pctSanne} / {100 - v.pctSanne}{v.status === "tegenvoorstel" && bevestigd ? ` · wijziging voorgesteld: ${euro(laatste)}` : ""}</p>
              {v.voorwaarden ? <p className="mt-1 text-xs text-ink-soft">Voorwaarden: {v.voorwaarden}</p> : null}
              {v.geldigVan || v.geldigTot ? <p className="mt-1 text-xs text-ink-soft">Geldig {v.geldigVan ? `vanaf ${v.geldigVan}` : ""}{v.geldigTot ? ` tot ${v.geldigTot}` : ""}</p> : null}
              {v.periode ? <p className="mt-1 text-xs text-ink-soft">{v.periode === "maand" ? "Per maand" : v.periode === "jaar" ? "Per jaar" : "Eenmalig"}</p> : null}
              {v.toelichting ? <p className="mt-1 text-xs text-ink-soft">“{v.toelichting}”</p> : null}
              {v.stappen.length > 1 ? <p className="mt-1 text-[11px] text-ink-soft">{v.stappen.map((s) => `${s.wie}: ${s.wat}${s.bedrag ? ` ${euro(s.bedrag)}` : ""}`).join(" → ")}</p> : null}
              {v.reactieDatum && !bevestigd ? <p className="mt-1 text-xs text-ink-soft">Graag reactie voor {v.reactieDatum} · een verzoek, geen harde grens. Zonder reactie verandert er nooit automatisch iets.</p> : null}

              {ikAanZet ? (tegenId === v.id ? (<div className="mt-2 flex gap-2">
                  <GeldInvoer value={tegen} onChange={setTegen} label="Ander bedrag"/>
                  <Button disabled={!(leesGeld(tegen) ?? 0)} onClick={() => { const n = leesGeld(tegen) ?? 0; if (n > 0) {
                        reageer(v.id, "Sanne", { tegen: n });
                        bevestig("Voorstel verstuurd. Wacht op antwoord.");
                        setTegenId(null);
                        setTegen("");
                        onKlaar?.();
                    } }} className="min-h-11 px-4 text-sm font-semibold">Stuur</Button>
                </div>) : (<div className="mt-2 flex flex-wrap gap-2">
                  <Button onClick={() => { reageer(v.id, "Sanne", "akkoord"); bevestig("Geregeld! Het budget is afgesproken."); onKlaar?.(); }} className="flex-1 min-h-11 px-2 py-2 text-xs font-semibold">Akkoord</Button>
                  <Button variant="outline" onClick={() => { setTegenId(v.id); setTegen(String(laatste)); }} className="flex-1 min-h-11 px-2 py-2 text-xs font-semibold">Ander voorstel</Button>
                  <Button variant="outline" onClick={() => { reageer(v.id, "Sanne", "geweigerd"); bevestig("Afgewezen. Joris krijgt dit te zien. Je vindt het onder Eerdere voorstellen."); onKlaar?.(); }} className="flex-1 min-h-11 px-2 py-2 text-xs font-semibold text-ink-soft">Niet akkoord</Button>
                  <Button variant="ghost" onClick={() => { setUitstelId(v.id); setUitstelKeuze(null); setUitstelDatum(""); setUitstelTijd("20:00"); setUitstelFout(""); }} className="flex-1 min-h-11 px-2 py-2 text-xs font-semibold text-ink-soft">Meer tijd nodig</Button>
                </div>)) : null}
              {v.aanZet === "Joris" && (v.status === "wacht" || v.status === "tegenvoorstel") ? (<span className="mt-2 flex flex-wrap items-center gap-2">
                  {magHerinnering({ verstuurd: v.stappen.filter((s) => s.wat === "Herinnering verstuurd").map((s) => s.moment), reactieDatum: v.reactieDatum, gepauzeerd: vk.herinneringenGepauzeerd }).mag ? (<Button variant="ghost" size="sm" className="text-xs" onClick={() => { if (stuurBudgetHerinnering(v.id, "Sanne"))
                            bevestig("Herinnering verstuurd. De ander kan reageren wanneer daar gelegenheid voor is."); }}>Herinnering sturen</Button>) : null}
                  <VoorstelIntrekken onBevestig={() => trekBudgetIn(v.id)}/>
                </span>) : null}
              {v.status === "uitgegeven" && (v.stappen.at(-1)?.bedrag ?? 0) > v.max + 0.009 ? (<div className="mt-2 rounded-md border border-accent-warm/40 bg-muted p-2.5 text-xs">
                  <p className="font-semibold">Afgesproken budget overschreden met {euro((v.stappen.at(-1)?.bedrag ?? 0) - v.max)}</p>
                  <p className="mt-0.5 text-ink-soft">De extra kosten tellen pas mee na instemming van de andere ouder.</p>
                  <Link to="/gesprekken" className="mt-1.5 inline-block font-semibold text-brand">Extra kosten afstemmen ›</Link>
                </div>) : null}
              {v.status === "akkoord" ? (<Button variant="link" onClick={() => onUitgave(v)} className="mt-2 min-h-11 px-0 text-xs font-semibold">Uitgave vastleggen ›</Button>) : null}
              {v.status === "akkoord" || v.status === "uitgegeven" ? <Button variant="link" className="min-h-11 px-0 text-xs" onClick={() => { setWijzigId(v.id); setForm({ ...leeg, wat: v.wat, kind: v.kind, max: String(v.max), pct: v.pctSanne, aangepast: v.pctSanne !== 50 }); setOpen(true); }}>Wijziging voorstellen</Button> : null}
              </div> : null}
            </div>);
        })}
      </div>

      <Sheet open={uitstelId !== null} onOpenChange={(o) => { if (!o)
        setUitstelId(null); }}>
        <SheetContent side="bottom" className="left-1/2 max-h-[90vh] w-full max-w-md -translate-x-1/2 overflow-y-auto rounded-t-2xl bg-background px-5 pb-8 pt-4">
          <SheetHeader className="pr-8 text-left">
            <SheetTitle>Meer tijd nodig?</SheetTitle>
            <SheetDescription>Geen probleem. Wanneer wil je hier opnieuw naar kijken?</SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-2" role="group" aria-label="Opnieuw bekijken">
              {[{ id: "vanavond", label: "Vanavond" }, { id: "morgen", label: "Morgen" }, { id: "drie-dagen", label: "Over 3 dagen" }, { id: "zelf", label: "Zelf een datum kiezen" }].map((keuze) => <Button key={keuze.id} variant={uitstelKeuze === keuze.id ? "default" : "outline"} aria-pressed={uitstelKeuze === keuze.id} disabled={keuze.id === "vanavond" && !uitstelMoment("vanavond")} className="min-h-11 h-auto whitespace-normal text-xs" onClick={() => { setUitstelKeuze(keuze.id); setUitstelFout(""); }}>{keuze.label}</Button>)}
            </div>
            {uitstelKeuze === "zelf" ? <div className="grid grid-cols-2 gap-3"><label className="text-xs font-semibold">Datum<input type="date" value={uitstelDatum} onChange={(e) => setUitstelDatum(e.target.value)} className={`${veld} mt-1`}/></label><label className="text-xs font-semibold">Tijd<input type="time" value={uitstelTijd} onChange={(e) => setUitstelTijd(e.target.value)} className={`${veld} mt-1`}/></label></div> : null}
            {uitstelTot ? <p className="text-sm">Opnieuw bekijken: {toonUitstelMoment(uitstelTot)}</p> : null}
            <p className="text-xs text-ink-soft">Dit is geen deadline. Je voorstel blijft open en je kunt ook eerder reageren. Zonder reactie verandert er niets.</p>
            <p className="text-xs text-ink-soft">In dit voorbeeld bewaren we het moment alleen zolang de app open is. Een melding aan de andere ouder en een herinnering op dit moment zijn pas beschikbaar na veilige ouderkoppeling.</p>
            {uitstelFout ? <p role="alert" className="text-sm text-accent-warm">{uitstelFout}</p> : null}
            <Button className="min-h-11 w-full" disabled={!uitstelTot || !geldigUitstelMoment(uitstelTot)} onClick={() => {
            if (!uitstelId || !uitstelTot)
                return;
            if (!vraagMeerTijdBudget(uitstelId, "Sanne", uitstelTot)) {
                setUitstelFout("Kies een moment dat nog moet komen en probeer opnieuw.");
                return;
            }
            setDetails((l) => l.filter((id) => id !== uitstelId));
            setUitstelId(null);
            bevestig("Terugkijkmoment vastgelegd. Je kunt later nog reageren.");
            onKlaar?.();
        }}>Moment bevestigen</Button>
            <Button variant="ghost" className="w-full" onClick={() => setUitstelId(null)}>Terug</Button>
          </div>
        </SheetContent>
      </Sheet>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="left-1/2 max-h-[90vh] w-full max-w-md -translate-x-1/2 overflow-y-auto rounded-t-2xl bg-background px-5 pb-8 pt-4">
          <SheetHeader className="pr-8 text-left">
            <SheetTitle className="font-display text-xl font-medium">Budgetvoorstel</SheetTitle>
            <SheetDescription className="text-xs">Een afspraak over een toekomstige uitgave. De andere ouder kan akkoord gaan of een ander bedrag voorstellen.</SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            <label className="block text-xs font-semibold">Waar gaat het over?<input value={form.wat} onChange={(e) => setForm({ ...form, wat: e.target.value })} placeholder="Bijv. voetbalschoenen" className={`${veld} mt-1`}/></label>
            <div className="text-xs font-semibold">Geschat bedrag<GeldInvoer value={form.max} onChange={(max) => setForm({ ...form, max })} label="Geschat bedrag" className="mt-1"/></div>
            <div><p className="text-xs font-semibold">Voorgestelde verdeling</p>
              <div className="mt-1 flex gap-2"><button onClick={() => setForm({ ...form, aangepast: false, pct: 50 })} className={chip(!form.aangepast)}>50 / 50</button><button onClick={() => setForm({ ...form, aangepast: true, pct: 60 })} className={chip(form.aangepast)}>Aangepaste verdeling</button></div>
              {form.aangepast ? <label className="mt-2 flex items-center gap-3 text-xs">Jij {form.pct}%<input type="range" min={0} max={100} step={5} value={form.pct} onChange={(e) => setForm({ ...form, pct: Number(e.target.value) })} className="flex-1 accent-[var(--brand)]"/>Andere ouder {100 - form.pct}%</label> : null}
            </div>
            <div><p className="text-xs font-semibold">Voor welk kind?</p>
              <div className="mt-1 flex gap-2">{["Emma", "Noah", "Emma & Noah"].map((k) => <button key={k} onClick={() => setForm({ ...form, kind: k })} className={chip(form.kind === k)}>{k}</button>)}</div>
            </div>
            <label className="block text-xs font-semibold">Eventuele toelichting<input value={form.toelichting} onChange={(e) => setForm({ ...form, toelichting: e.target.value })} className={`${veld} mt-1`}/></label>
            <label className="block text-xs font-semibold">Graag reactie voor (vrijwillig)<input type="date" value={form.reactieDatum} onChange={(e) => setForm({ ...form, reactieDatum: e.target.value })} className={`${veld} mt-1`}/></label>
            <p className="-mt-2 text-xs text-ink-soft">Dit is een verzoek, geen harde grens. Zonder reactie verandert er nooit automatisch iets.</p>
            <Button disabled={!form.wat.trim() || !(max > 0)} onClick={() => {
            if (wijzigId) {
                if (wijzigBudgetVoorstel(wijzigId, "Sanne", max, form.pct)) {
                    setWijzigId(null);
                    setForm(leeg);
                    setOpen(false);
                    bevestig("Wijzigingsvoorstel verstuurd. Het afgesproken budget blijft gelden.");
                }
                return;
            }
            const id = nieuwBudget({ wat: form.wat.trim(), kind: form.kind, max, pctSanne: form.pct, toelichting: form.toelichting || undefined, ...(form.reactieDatum ? { reactieDatum: form.reactieDatum } : {}) });
            if (bronItem)
                koppelLijstBudget("nog-nodig-demo", Number(bronItem), id);
            setForm(leeg);
            setOpen(false);
            bevestig("Budgetvoorstel toegevoegd. Wacht op antwoord.", { uitleg: form.wat.trim() });
        }} className="min-h-11 w-full bg-brand text-sm font-semibold text-primary-foreground">Voorstel versturen</Button>
          </div>
        </SheetContent>
      </Sheet>
    </section>);
}
