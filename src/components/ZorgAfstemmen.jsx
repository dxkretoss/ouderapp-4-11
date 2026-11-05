import { GeschiedenisKnop } from "@/components/Geschiedenis";
import { useBevestigPopup } from "@/lib/feedback";
import { Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { FilterBalk } from "@/components/ui-kit";
import { accepteer, dienVoorstelIn, kindNamen, statusLabel, stelAlternatiefVoor, stuurHerinnering, trekIn, useZorg, vraagMeerTijd, wijsAf } from "@/lib/zorg-store";
import { magHerinnering } from "@/lib/herinneringen";
import { useGevolgen } from "@/lib/gevolgen";
import { AppIcon } from "@/components/AppIcon";
import { verwerkActie } from "@/lib/acties-store";
import { Button } from "@/components/ui/button";
import { VoorstelIntrekken } from "@/components/VoorstelIntrekken";
import { useVoorkeuren } from "@/lib/voorkeuren-store";
import { eerderZonderAkkoord, kiesReminder, nietAkkoordTekst, onderwerpen, reminders } from "@/lib/afstemming";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { dt, plusDagen } from "@/lib/agenda-datum";
import { zorgOp } from "@/lib/zorg-store";
import { ouderLabel } from "@/lib/agenda-zorg";
export function ZorgAfstemmen({ startActie, kind, sluit, doel, voorstelType, bronOmschrijving }) {
    const router = useRouter();
    const zorg = useZorg();
    const lijst = zorg.voorstellen.filter((v) => (kind === "alle" || v.kinderen.includes(kind)) && (!doel || v.id === doel));
    const [bevestigd, setBevestigd] = useState("");
    useBevestigPopup(bevestigd);
    const [eerderOpen, setEerderOpen] = useState(!!doel);
    const reageren = lijst.filter((v) => v.status === "open" && v.van !== "Sanne");
    const eigen = lijst.filter((v) => v.status === "open" && v.van === "Sanne");
    const eerder = lijst.filter((v) => v.status !== "open");
    const vk = useVoorkeuren();
    const ga = vk.gestructureerdAfstemmen;
    const vastgelopen = onderwerpen(lijst).filter((o) => o.geenOvereenstemming);
    const [gesloten, setGesloten] = useState([]);
    const reminder = kiesReminder(vastgelopen.length ? "vastgelopen" : reageren.length || startActie ? "voorstel" : null, { aan: ga, veiligheid: false, gesloten });
    const [altId, setAltId] = useState(null);
    const [nieuw, setNieuw] = useState(startActie === "regeling" ? "Voorstel voor een andere vaste verdeling: " : "");
    const [soort, setSoort] = useState(startActie === "regeling" ? "structureel" : "eenmalig");
    const [voor, setVoor] = useState(kind === "alle" ? ["emma", "noah"] : [kind]);
    const [dagVan, setDagVan] = useState(16);
    const [dagTot, setDagTot] = useState(16);
    const [naar, setNaar] = useState("sanne");
    const [vanDatum, setVanDatum] = useState("2025-03-16");
    const [totDatum, setTotDatum] = useState("2025-03-16");
    const [wisseltijd, setWisseltijd] = useState("14:30");
    const [plek, setPlek] = useState("");
    const [alleDagen, setAlleDagen] = useState(false);
    useEffect(() => setVoor((v) => kind === "alle" ? ["emma", "noah"] : v.includes(kind) ? v : [kind]), [kind]);
    useEffect(() => {
        if (!startActie || altId)
            return;
        setNieuw(bronOmschrijving ?? (startActie === "regeling" ? "Voorstel voor een andere vaste verdeling: " : ""));
        setSoort(startActie === "regeling" ? "structureel" : "eenmalig");
        window.requestAnimationFrame(() => document.querySelector("#nieuw-voorstel")?.scrollIntoView({ behavior: "smooth", block: "center" }));
    }, [startActie, altId, bronOmschrijving]);
    const reageer = (id, f) => { const ok = f(); if (ok && id === "v1")
        verwerkActie("wijzigingsverzoek"); return ok; };
    const [reactieDatum, setReactieDatum] = useState("");
    const verstuur = () => {
        const eind = soort === "eenmalig" ? totDatum : vanDatum;
        if (eind < vanDatum)
            return;
        const datums = [];
        for (let d = vanDatum; d <= eind && datums.length < 366; d = plusDagen(d, 1))
            datums.push(d);
        const tot = Math.max(dagVan, dagTot);
        if (altId && !reageer(altId, () => stelAlternatiefVoor(altId, nieuw.trim())))
            return;
        dienVoorstelIn({
            soort, kinderen: voor, tekst: nieuw.trim(), naarOuder: naar, datums, wisseltijd, plek,
            dagen: soort === "eenmalig" ? Array.from({ length: tot - dagVan + 1 }, (_, i) => dagVan + i) : [dagVan],
            datumLabel: soort === "eenmalig" ? `${vanDatum} t/m ${totDatum}` : `Vanaf ${vanDatum}`,
            aanleiding: soort === "structureel" ? "regeling" : voorstelType ?? "wijziging",
            ...(reactieDatum ? { reactieDatum } : {}),
        });
        setNieuw("");
        setAltId(null);
        setReactieDatum("");
        setBevestigd("Voorstel verstuurd. De verdeling verandert pas na akkoord van de andere ouder.");
        sluit();
    };
    const dagOpties = Array.from({ length: 31 }, (_, i) => i + 1);
    const voorstelOuder = (k, d) => soort === "eenmalig" ? naar : zorgOp({ ...zorg, basis: [...zorg.basis, { id: "preview", kind: k, vanafDag: dagVan, vanafDatum: vanDatum, eersteOuder: naar, omschrijving: nieuw }] }, k, d).ouder;
    const vergelijking = voor.flatMap((k) => Array.from({ length: soort === "structureel" ? 14 : Math.max(0, Math.round((dt(totDatum).getTime() - dt(vanDatum).getTime()) / 86400000) + 1) }, (_, i) => plusDagen(vanDatum, i)).slice(0, 366).map((d) => ({ k, d, nu: zorgOp(zorg, k, d).ouder, voorstel: voorstelOuder(k, d) })));
    const sel = "mt-1 w-full rounded-xl bg-surface px-3 py-2 text-sm text-ink outline-none";
    const rij = (l, w) => (<div className="flex items-start justify-between gap-3 py-2">
      <dt className="text-ink-soft">{l}</dt>
      <dd className="text-right font-semibold">{w}</dd>
    </div>);
    return (<section className="mt-3">
      <details open={!!doel || !!startActie} className="border-y border-border py-1"><summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold text-brand">Wijzigingsvoorstellen{reageren.length ? ` · ${reageren.length} om op te reageren` : ""}</summary>
      {bevestigd ? <p role="status" className="mb-3 text-sm font-semibold text-brand">✓ {bevestigd}</p> : null}
      {!bevestigd && reminder ? <div className="mb-3 flex items-center gap-2 text-xs text-ink-soft"><AppIcon functie="slim" maat="sm" vorm="kaal"/><span className="flex-1">{reminder.tekst}</span><Button variant="ghost" size="icon" aria-label="Tip sluiten" className="size-11" onClick={() => setGesloten([...gesloten, reminder.moment])}><AppIcon functie="niet" maat="sm" vorm="kaal"/></Button></div> : null}
      {doel ? <Link to="/agenda" className="mb-2 inline-block text-xs font-semibold text-brand">Alle voorstellen bekijken →</Link> : null}
      {reageren.length ? <h2 className="font-display font-bold">Verzoeken om te wijzigen</h2> : null}
      <div className="mt-3 space-y-3">
        {reageren.map((v) => (<div key={v.id} id={`item-${v.id}`} className="zoekdoel rounded-2xl border border-border bg-accent-soft p-4">
            <div className="flex items-start justify-between gap-2">
              <span className="flex items-start gap-2.5">
                <AppIcon functie="voorstel" maat="md"/>
                <span className="block">
                  <span className="block font-display text-base font-semibold text-ink">Voorstel van de andere ouder</span>
                  <span className="block text-xs text-ink-soft">{v.soort === "eenmalig" ? "Eenmalige wijziging" : "De vaste verdeling aanpassen"} · wacht op jouw reactie</span>
                </span>
              </span>
              <GeschiedenisKnop soort="schema" itemId={v.id} naam={v.tekst}/>
            </div>
            <p className="mt-3 rounded-xl border-l-2 border-accent-warm bg-surface px-3 py-2.5 text-sm text-ink">
              <span className="sr-only">Het verzoek is: </span>
              ‘{v.tekst}’
            </p>
            <dl className="mt-3 divide-y divide-border border-t border-border text-sm">
              {rij("Kinderen", v.kinderen.map((k) => kindNamen[k]).join(" & "))}
              {rij("Wanneer", v.datumLabel)}
              {rij("Geldt voor", v.soort === "eenmalig" ? "Alleen deze keer" : "Vanaf nu")}
              {v.naarOuder ? rij("Dan bij", v.naarOuder === "sanne" ? "jou" : "de andere ouder") : null}
              {v.reactieDatum ? rij("Graag reactie voor", `${v.reactieDatum} · een verzoek, geen harde grens`) : null}
              {rij("Status", "Nog niets veranderd")}
            </dl>
            {v.alternatief ? <p className="mt-2 text-xs text-ink-soft">↪ {v.alternatief}</p> : null}
            <Gevolgen v={v}/>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                <Button size="sm" onClick={() => { if (reageer(v.id, () => accepteer(v.id)))
            setBevestigd(ga ? `De verdeling is aangepast. ${reminders.bevestigd}` : "Je hebt ja gezegd. De verdeling is aangepast."); }}>Akkoord</Button>
                <Button variant="outline" size="sm" onClick={() => {
                setAltId(v.id);
                setNieuw(v.tekst);
                setSoort(v.soort);
                setVoor([...v.kinderen]);
                setDagVan(v.dagen[0] ?? 16);
                setDagTot(v.dagen.at(-1) ?? 16);
                setVanDatum(v.datums?.[0] ?? `2025-03-${String(v.dagen[0] ?? 16).padStart(2, "0")}`);
                setTotDatum(v.datums?.at(-1) ?? `2025-03-${String(v.dagen.at(-1) ?? 16).padStart(2, "0")}`);
                setNaar(v.naarOuder ?? "sanne");
                router.navigate({ to: "/agenda", search: { zorgActie: v.soort === "structureel" ? "regeling" : "wijziging", zorgVoorstel: v.id, kind } });
            }}>Ander voorstel</Button>
                <Button variant="ghost" size="sm" onClick={() => { if (reageer(v.id, () => wijsAf(v.id)))
            setBevestigd(ga ? nietAkkoordTekst(true) : "Voorstel afgewezen. Er verandert niets."); }}>Niet akkoord</Button>
                <Button variant="ghost" size="sm" onClick={() => { if (vraagMeerTijd(v.id))
            setBevestigd("Je hebt meer tijd gevraagd. Het voorstel blijft open; er verandert niets."); }}>Meer tijd nodig</Button>
              </div>
          </div>))}
      </div>
      {eigen.length ? (<div className="mt-3 divide-y divide-border rounded-xl border border-border bg-surface px-3">
          {eigen.map((v) => {
                const oordeel = magHerinnering({ verstuurd: v.herinneringen ?? [], reactieDatum: v.reactieDatum, gepauzeerd: vk.herinneringenGepauzeerd });
                return (<div key={v.id} id={`item-${v.id}`} className="zoekdoel flex items-center justify-between gap-2 py-2.5">
              <span><span className="block text-sm">Jouw vraag: {v.datumLabel}</span><span className="block text-xs text-ink-soft">{v.tekst}</span><span className="block text-xs text-ink-soft">Wacht op antwoord · nog niets veranderd{v.reactieDatum ? ` · graag reactie voor ${v.reactieDatum}` : ""}{v.meerTijd ? " · de ander heeft meer tijd gevraagd" : ""}</span></span>
              <span className="flex shrink-0 items-center gap-1">
                {oordeel.mag ? <Button variant="ghost" size="sm" className="text-xs" onClick={() => { if (stuurHerinnering(v.id))
                    setBevestigd("Herinnering verstuurd. De ander kan reageren wanneer daar gelegenheid voor is."); }}>Herinnering sturen</Button> : null}
                <VoorstelIntrekken onBevestig={() => { if (trekIn(v.id))
                    setBevestigd("Voorstel ingetrokken. De verdeling blijft gelden."); }}/>
              </span>
            </div>);
            })}
        </div>) : null}
      {ga ? vastgelopen.map((o) => (<div key={o.sleutel} className="mt-3 rounded-xl border border-border bg-surface p-3 text-sm">
          <p className="font-semibold">Nog niet geregeld · {o.laatste.datumLabel}</p>
          <ul className="mt-1 space-y-0.5 text-xs text-ink-soft">{o.voorstellen.map((v) => <li key={v.id}>{v.van === "Sanne" ? "Jouw voorstel" : `Voorstel ${v.van}`}: {v.tekst}{v.alternatief ? ` · alternatief: ${v.alternatief}` : ""} · {statusLabel[v.status]}</li>)}</ul>
          <p className="mt-2 text-xs">Er is nog geen gezamenlijke bevestiging. De bestaande verdeling blijft gelden. Dit onderwerp blijft openstaan.</p>
          <p className="mt-1 text-xs text-ink-soft">Bespreken met een betrokken professional kan pas zodra veilige gedeelde toegang en toestemming beschikbaar zijn.</p>
        </div>)) : null}
      {eerder.length ? (<div className="mt-3">
          <button onClick={() => setEerderOpen(!eerderOpen)} aria-expanded={eerderOpen} className="py-2 text-sm font-semibold text-ink-soft">Eerdere wijzigingen {eerderOpen ? "⌃" : "›"}</button>
          {eerderOpen ? (<ul className="divide-y divide-border border-t border-border">
              {eerder.map((v) => (<li key={v.id} id={`item-${v.id}`} className="zoekdoel flex items-center justify-between gap-2 py-2.5">
                  <span><span className="block text-sm">{v.tekst}</span><span className="block text-xs text-ink-soft">{v.van} · {v.datumLabel} · {v.soort === "eenmalig" ? "Alleen deze keer" : "Vanaf nu"} · {statusLabel[v.status]}</span></span>
                  <GeschiedenisKnop soort="schema" itemId={v.id} naam={v.tekst}/>
                </li>))}
            </ul>) : null}
        </div>) : null}
      </details>
      {startActie ? (<Sheet open onOpenChange={(o) => !o && sluit()}><SheetContent side="bottom" className="left-1/2 max-h-[90vh] w-full max-w-md -translate-x-1/2 overflow-y-auto rounded-t-2xl bg-background px-5 pb-8"><SheetHeader><SheetTitle>Wijziging zorgverdeling voorstellen</SheetTitle><SheetDescription>De bestaande verdeling blijft gelden tot akkoord.</SheetDescription></SheetHeader><div className="mt-4 space-y-3" id="nieuw-voorstel">
        {bronOmschrijving ? <div className="border-b border-border pb-3 text-sm"><p className="text-ink-soft">Je bericht en gekozen tijdstip staan hieronder. Deze voorbeeldkalender kan de genoemde dag niet betrouwbaar overnemen. Er wordt vanuit deze suggestie niets verstuurd of gewijzigd.</p><Button asChild variant="link" className="h-auto min-h-11 whitespace-normal px-0 text-xs"><Link to="/agenda" search={{ zorgActie: "wijziging" }}>Zelf de kinderen en dagen kiezen</Link></Button></div> : null}
        {altId ? <p className="text-xs text-ink-soft">Het oorspronkelijke voorstel is niet goedgekeurd. Controleer de kinderen, dagen en verdeling voor jouw alternatief.</p> : null}
        <div className="flex items-center justify-between"><p className="text-sm font-semibold text-ink">{startActie === "regeling" ? "Andere vaste verdeling voorstellen" : voorstelType === "nachtje" ? "Extra overnachting voorstellen" : voorstelType === "ruil" ? "Dag ruilen voorstellen" : "Eenmalige wijziging voorstellen"}</p><button onClick={sluit} aria-label="Sluiten" className="knop-kruis size-7 text-xs">✕</button></div>
        <FilterBalk opties={[{ id: "eenmalig", label: "Alleen deze keer" }, { id: "structureel", label: "Vanaf nu" }]} waarde={soort} onChange={setSoort}/>
        <p className="text-xs text-ink-soft">{soort === "eenmalig" ? "Geldt alleen voor deze dag(en). De vaste verdeling blijft hetzelfde." : "Past de vaste verdeling aan vanaf de gekozen dag, als de ander ja zegt."}</p>
        <div className="flex gap-2">
          {["emma", "noah"].map((k) => (<button key={k} onClick={() => setVoor((v) => (v.includes(k) ? (v.length > 1 ? v.filter((x) => x !== k) : v) : [...v, k]))} aria-pressed={voor.includes(k)} className={`rounded-full px-3 py-1 text-xs font-semibold ${voor.includes(k) ? "bg-brand text-primary-foreground" : "bg-surface text-ink-soft"}`}>
              {kindNamen[k]}
            </button>))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-ink-soft">{soort === "eenmalig" ? "Van" : "Vanaf"}
            <input type="date" value={vanDatum} onChange={(e) => { setVanDatum(e.target.value); setDagVan(dt(e.target.value).getDate()); if (e.target.value > totDatum)
            setTotDatum(e.target.value); }} className={sel}/>
          </label>
          {soort === "eenmalig" ? (<label className="text-xs text-ink-soft">Tot en met
              <input type="date" min={vanDatum} value={totDatum} onChange={(e) => { setTotDatum(e.target.value); setDagTot(dt(e.target.value).getDate()); }} className={sel}/>
            </label>) : null}
          <label className="col-span-2 text-xs text-ink-soft">{soort === "eenmalig" ? "Bij wie zijn de kinderen?" : "Eerste week bij"}
            <select value={naar} onChange={(e) => setNaar(e.target.value)} className={sel}>
              <option value="sanne">Bij jou</option><option value="joris">Bij de andere ouder</option>
            </select>
          </label>
        </div>
        <label className="block text-xs text-ink-soft">Wanneer wil je graag antwoord?
          <input type="date" value={reactieDatum} onChange={(e) => setReactieDatum(e.target.value)} className={sel}/>
        </label>
        <p className="-mt-1 text-xs text-ink-soft">De andere ouder hoeft niet voor deze datum te reageren. De verdeling verandert pas als jullie akkoord zijn.</p>
        <div className="grid grid-cols-2 gap-2"><label className="text-xs text-ink-soft">Wisseltijd<input type="time" value={wisseltijd} onChange={(e) => setWisseltijd(e.target.value)} className={sel}/></label><label className="text-xs text-ink-soft">Overdrachtslocatie<input value={plek} onChange={(e) => setPlek(e.target.value)} className={sel}/></label></div>
        <div className="overflow-x-auto"><table className="w-full text-left text-xs"><caption className="mb-2 text-left font-semibold">Deze dagen veranderen pas na akkoord</caption><thead><tr className="border-b border-border"><th className="py-2">Dag / kind</th><th>Nu</th><th>Voorstel</th></tr></thead><tbody>{vergelijking.filter((r) => alleDagen || r.nu !== r.voorstel).map((r) => <tr key={r.k + r.d} className="border-b border-border"><td className="py-1.5">{r.d} · {kindNamen[r.k]}</td><td>{ouderLabel(r.nu)}</td><td className="font-semibold text-brand">{ouderLabel(r.voorstel)}</td></tr>)}</tbody></table>{!vergelijking.some((r) => r.nu !== r.voorstel) ? <p className="text-xs text-ink-soft">De verblijfsdagen blijven hetzelfde.</p> : null}<Button variant="ghost" onClick={() => setAlleDagen(!alleDagen)}>{alleDagen ? "Alleen gewijzigde dagen" : "Alle dagen bekijken"}</Button></div>
        <textarea value={nieuw} onChange={(e) => setNieuw(e.target.value)} rows={2} placeholder="Licht je vraag kort toe…" className="w-full resize-none rounded-xl bg-surface p-3 text-sm outline-none"/>
        {ga && eerderZonderAkkoord(zorg.voorstellen, { soort, kinderen: voor, dagen: soort === "eenmalig" ? Array.from({ length: Math.max(dagVan, dagTot) - dagVan + 1 }, (_, i) => dagVan + i) : [dagVan], datumLabel: "", naarOuder: naar }) ? <p className="text-xs text-ink-soft">Een gelijk voorstel is eerder al zonder akkoord afgesloten. Je kunt het opnieuw sturen als er iets is veranderd; licht dat dan kort toe.</p> : null}
        <button disabled={!nieuw.trim() || !vanDatum || (soort === "eenmalig" && totDatum < vanDatum) || !!bronOmschrijving} onClick={verstuur} className="w-full rounded-xl bg-brand py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40">
          Voorstel versturen
        </button>
      </div></SheetContent></Sheet>) : null}
    </section>);
}
function Gevolgen({ v }) {
    const lijst = useGevolgen(v);
    if (!lijst.length)
        return null;
    return (<div className="mt-2 rounded-xl bg-surface p-2.5 text-xs">
      <p className="font-semibold">{v.soort === "structureel" ? "Wat verandert hierdoor?" : "Dit raakt ook"}</p>
      <ul className="mt-1 space-y-0.5 text-ink-soft">
        {lijst.map((g) => <li key={g.id}>{g.soort === "afspraak" ? "· " : "· Spullen: "}{g.tekst}</li>)}
      </ul>
    </div>);
}
