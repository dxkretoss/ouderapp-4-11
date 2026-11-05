import { uur } from "@/lib/tijd-tekst";
import { BetrokkenheidAfsluiten } from "@/components/pro/BetrokkenheidAfsluiten";
import { CommunicatieOverzicht } from "@/components/pro/CommunicatieOverzicht";
import { CommunicatiePatronen } from "@/components/pro/CommunicatiePatronen";
import { Button } from "@/components/ui/button";
import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Download, Eye, Lock, MessageSquareText, Pin, Search, Users, X, } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { FilterBalk } from "@/components/ui-kit";
import { proKijkers } from "@/lib/export-rechten";
import { DrukLabel } from "@/components/pro/Druk";
import { VoorOuders, VoorbeeldBanner } from "@/components/pro/VoorOuders";
import { drukLabel, drukNiveau, drukRedenen } from "@/lib/communicatiedruk";
import { AfstemmingTab } from "@/components/pro/AfstemmingTab";
import { maakProPdf } from "@/lib/pro-pdf";
import { actieStatus, alleRechten, contactTypes, dagenTot, datumKort, evalueerVeilig, gegevensLabel, geefToegang, IK, legeGegevens, legGezamenlijkVast, logAfspraak, logDocument, MAX_PINS, mijnRechten, momentKort, ontpin, pin, proRollen, rechtLabel, stuurBericht, toggleActie, trekToegangIn, useProWerk, verstuurGezamenlijk, voegActieToe, voegDoelToe, voegJournaalToe, voegNotitieToe, voegVeiligToe, wijzigRechten, wijzigZicht, zetDoelStatus, zetGegevens, zichtLabel, } from "@/lib/pro-journaal-store";
const kop = "pro-section-title";
const veld = "w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-brand";
const chip = (aan) => `rounded-full border px-3 py-1 text-xs ${aan ? "border-brand bg-brand-soft text-brand" : "border-border text-ink-soft"}`;
const knop = "rounded-md border border-border px-3 py-1.5 text-xs font-semibold";
const toggle = (l, x) => (l.includes(x) ? l.filter((y) => y !== x) : [...l, x]);
/** Welk dossieronderdeel er hoort bij een keuze uit de + -lijst. */
export const tabVoorModus = {
    journaal: "Contactjournaal", notitie: "Contactjournaal", bericht: "Communicatie", afspraak: "Afspraken",
    gezamenlijk: "Afspraken", actie: "Acties", document: "Documenten", veilig: "Veiligheid", overig: "Contactjournaal",
};
export function DossierWerkruimte({ dossier, druk, afspraken, onTerug, onBeeindig, tabVerzoek, modusVerzoek, context }) {
    const werk = useProWerk();
    const rechten = mijnRechten(dossier.id, werk);
    const mag = (r) => rechten.includes(r);
    const actief = dossier.status === "actief";
    const ouders = dossier.ouders.split(" & ");
    const kinderenKop = dossier.kinderen.map((k) => k.replace(" – ", " (").replace(" jaar", ")")).join(" · ");
    const tabs = [
        "Overzicht", "Tijdlijn",
        ...((mag("journaal") || mag("notities")) ? ["Contactjournaal"] : []),
        ...((mag("communicatie") || mag("berichten")) ? ["Communicatie"] : []),
        ...(mag("agenda") || mag("regeling") ? ["Afspraken", "Afstemming"] : []),
        ...(mag("acties") ? ["Acties"] : []),
        ...(mag("docBekijken") ? ["Documenten"] : []),
        ...(mag("veiligBekijken") || mag("veiligBeheren") ? ["Veiligheid"] : []),
        "Dossiergegevens",
    ];
    const [tab, setTab] = useState("Overzicht");
    useEffect(() => { if (tabVerzoek && tabs.includes(tabVerzoek.tab))
        setTab(tabVerzoek.tab); }, [tabVerzoek?.n]); // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => { if (modusVerzoek) {
        setTab(tabVoorModus[modusVerzoek.modus]);
        setModus(modusVerzoek.modus);
    } }, [modusVerzoek?.n]); // eslint-disable-line react-hooks/exhaustive-deps
    const [modus, setModus] = useState(null);
    const [bevestig, setBevestig] = useState(false);
    const professional = werk.pros.find((p) => p.dossier === dossier.id && p.naam === IK && p.actief);
    const [alsOuder, setAlsOuder] = useState(false);
    const [zoek, setZoek] = useState("");
    const [exportOpen, setExportOpen] = useState(false);
    const journaal = werk.journaal.filter((j) => j.dossier === dossier.id);
    const notities = mag("notities") ? werk.notities.filter((n) => n.dossier === dossier.id) : [];
    const acties = werk.acties.filter((a) => a.dossier === dossier.id);
    const berichten = werk.berichten.filter((b) => b.dossier === dossier.id);
    const gezamenlijk = werk.gezamenlijk.filter((g) => g.dossier === dossier.id);
    const veilig = werk.veilig.filter((v) => v.dossier === dossier.id);
    const doelen = werk.doelen.filter((x) => x.dossier === dossier.id);
    const pins = werk.pins[dossier.id] ?? [];
    const gegevens = werk.gegevens[dossier.id] ?? legeGegevens;
    const vandaagDruk = mag("communicatie") ? druk[0] : undefined;
    /* Zoeken binnen dossier: alleen in onderdelen waartoe je rechten hebt. */
    const zoekResultaten = useMemo(() => {
        const q = zoek.trim().toLowerCase();
        if (q.length < 2)
            return [];
        const r = [];
        const past = (...t) => t.join(" ").toLowerCase().includes(q);
        pins.forEach((p) => past(p) && r.push({ bron: "Overzicht", tekst: `Vastgepind: ${p}` }));
        Object.keys(gegevens).forEach((k) => past(gegevens[k]) && r.push({ bron: "Dossiergegevens", tekst: `${gegevensLabel[k]}: ${gegevens[k]}` }));
        if (mag("journaal") || mag("notities"))
            journaal.forEach((j) => past(j.onderwerp, j.notitie) && r.push({ bron: "Contactjournaal", tekst: `${j.onderwerp} — ${j.notitie}` }));
        notities.forEach((n) => past(n.tekst) && r.push({ bron: "Contactjournaal", tekst: `Interne notitie: ${n.tekst}` }));
        if (mag("communicatie") || mag("berichten"))
            berichten.forEach((b) => past(b.onderwerp, b.tekst) && r.push({ bron: "Communicatie", tekst: `${b.onderwerp} — ${b.tekst}` }));
        if (mag("agenda") || mag("regeling")) {
            gezamenlijk.forEach((g) => past(g.tekst) && r.push({ bron: "Afspraken", tekst: g.tekst }));
            afspraken.forEach((a) => past(a.soort, a.dag) && r.push({ bron: "Afspraken", tekst: `${a.dag} ${uur(a.tijd)} · ${a.soort}` }));
        }
        if (mag("acties"))
            acties.forEach((a) => past(a.tekst, a.omschrijving) && r.push({ bron: "Acties", tekst: a.tekst }));
        if (mag("veiligBekijken") || mag("veiligBeheren"))
            veilig.forEach((v) => past(v.titel, v.afspraak, "veiligheidsafspraak") && r.push({ bron: "Veiligheid", tekst: `${v.titel} — ${v.afspraak}` }));
        return r.slice(0, 12);
    }, [zoek, werk, rechten]); // eslint-disable-line react-hooks/exhaustive-deps
    return (<div>
      <button onClick={onTerug} className="mt-4 text-xs font-semibold text-brand">‹ Alle dossiers</button>
      <div className="mt-1">
        <h2 className="font-display text-2xl">{dossier.gezin}</h2>
        <p className="text-xs text-ink-soft">{kinderenKop} · {dossier.rol} sinds {dossier.sinds}</p>
      </div>

      {pins.length ? (<ul className="mt-3 flex flex-wrap gap-1.5">
          {pins.map((p) => <li key={p} className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-1 text-[11px] font-semibold text-brand"><Pin className="size-3"/>{p}</li>)}
        </ul>) : null}

      {context}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label className="relative min-w-0 basis-full sm:flex-1 sm:basis-auto">
          <Search className="absolute left-2.5 top-2.5 size-4 text-ink-soft"/>
          <input value={zoek} onChange={(e) => setZoek(e.target.value)} placeholder="Zoek in dossier, bijv. zomervakantie" aria-label="Zoeken in dossier" className={`${veld} py-2 pl-8`}/>
        </label>
        <button onClick={() => setAlsOuder((x) => !x)} className={`${knop} inline-flex items-center gap-1.5`}><Eye className="size-3.5"/>Bekijk als ouder</button>
        {mag("export") ? <button onClick={() => setExportOpen(true)} className={`${knop} inline-flex items-center gap-1.5`}><Download className="size-3.5"/>Dossier exporteren</button> : null}
      </div>
      {zoek.trim().length >= 2 ? (<div className="mt-2 rounded-md border border-border p-2">
          {zoekResultaten.length ? zoekResultaten.map((r, i) => (<button key={i} onClick={() => { setTab(r.bron); setZoek(""); }} className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-muted/60">
              <span className="text-[11px] font-bold uppercase tracking-wider text-brand">{r.bron}</span><span className="block truncate">{r.tekst}</span>
            </button>)) : <p className="px-2 py-1.5 text-sm text-ink-soft">Niets gevonden binnen de onderdelen waartoe je toegang hebt.</p>}
        </div>) : null}

      {alsOuder ? (<div className="mt-5"><VoorbeeldBanner onSluit={() => setAlsOuder(false)}/><VoorOuders dossier={dossier.id} alleenLezen/></div>) : (<div className="lg:grid lg:grid-cols-[190px_minmax(0,1fr)] lg:gap-5">
          <nav aria-label="Dossieronderdelen" className="mt-4 flex min-w-0 flex-wrap gap-x-2 gap-y-2 border-b border-border lg:mt-5 lg:flex-col lg:self-start lg:border-b-0 lg:border-r lg:pr-3">
            {tabs.map((t) => (<button key={t} onClick={() => setTab(t)} aria-current={tab === t ? "page" : undefined} className={`shrink-0 border-b-2 px-3 py-2 text-left text-xs font-semibold lg:border-b-0 lg:border-l-2 ${tab === t ? "border-brand bg-brand-soft text-ink" : "border-transparent text-ink-soft hover:bg-muted"}`}>{t}</button>))}
          </nav>

          <div className="mt-4 min-w-0 lg:mt-5">
            {tab === "Overzicht" ? (<div className="space-y-7">
                {actief ? <CommunicatieOverzicht gezinnen={[dossier]}/> : null}
                <dl className="grid grid-cols-2 gap-x-6 gap-y-3 border-y border-border py-4 text-sm sm:grid-cols-3">
                  <Feit label="Kinderen">{dossier.kinderen.map((k) => <span key={k} className="block">{k.replace(" – ", " · ")}</span>)}</Feit>
                  <Feit label="Ouders">{ouders.join(" & ")}</Feit>
                  {gegevens.gezag ? <Feit label="Gezag">{gegevens.gezag}</Feit> : null}
                  {mag("regeling") && gegevens.regeling ? <Feit label="Regeling">{gegevens.regeling}</Feit> : null}
                  {mag("regeling") ? <Feit label="Volgende wisselmoment">Vrijdag 14:30</Feit> : null}
                  {vandaagDruk ? <Feit label="Communicatiedruk"><button onClick={() => setTab("Communicatie")} className="text-left">{drukLabel[drukNiveau(vandaagDruk.s)]}</button></Feit> : null}
                </dl>
                <section>
                  <h3 className={kop}>Recent gebeurd</h3>
                  <Lijst leeg="Nog geen activiteit.">{[...werk.log].filter((l) => l.dossier === dossier.id).reverse().slice(0, 4).map((l) => (<div key={l.id} className="py-2.5 text-sm"><p className="text-[11px] text-ink-soft">{momentKort(l.moment)} · {l.door}</p>{l.tekst}</div>))}</Lijst>
                </section>
                {veilig.some((v) => v.status === "actief" && dagenTot(v.evaluatie) <= 7) && (mag("veiligBekijken") || mag("veiligBeheren")) ? (<section>
                    <h3 className={kop}>Wat moet ik doen?</h3>
                    {veilig.filter((v) => v.status === "actief" && dagenTot(v.evaluatie) <= 7).map((v) => (<button key={v.id} onClick={() => setTab("Veiligheid")} className="mt-2 block text-left text-sm">Veiligheidsafspraak “{v.titel}” evalueren · {evaluatieTekst(v.evaluatie)} ›</button>))}
                  </section>) : null}
                {doelen.length ? (<section>
                    <h3 className={kop}>Doelen van de begeleiding</h3>
                    <Lijst leeg="">{doelen.map((x) => <div key={x.id} className="flex justify-between gap-3 py-2.5 text-sm"><span>{x.tekst}</span><span className="shrink-0 text-xs text-ink-soft">{x.status}</span></div>)}</Lijst>
                  </section>) : null}
                {actief && proKijkers[dossier.id] ? (<Link to="/exporteren" search={{ pro: dossier.id }} className="block text-xs font-semibold text-brand">Gezinsgegevens exporteren (regeling, besluiten, kosten) ›</Link>) : null}
              </div>) : null}

            {tab === "Tijdlijn" ? <Tijdlijn dossierId={dossier.id}/> : null}

            {tab === "Contactjournaal" ? (<div className="space-y-6">
                <section>
                  <div className="flex items-center justify-between"><h3 className={kop}>Contactjournaal</h3>
                    {actief && mag("journaal") ? <button onClick={() => setModus("journaal")} className="text-xs font-semibold text-brand">+ Toevoegen</button> : null}</div>
                  <Lijst leeg="Nog geen contactmomenten.">{journaal.map((j) => (<div key={j.id} className="py-3">
                      <p className="text-[11px] text-ink-soft">{momentKort(j.moment)} · {j.type} · {j.betrokkenen.join(", ")}</p>
                      <p className="text-sm font-semibold">{j.onderwerp}</p>
                      <p className="text-sm">{j.notitie}</p>
                      <label className="mt-2 flex items-center gap-2 text-[11px] text-ink-soft">
                        {j.zicht === "ouders" ? <Users className="size-3.5"/> : <Lock className="size-3.5"/>}
                        <select value={j.zicht} onChange={(e) => wijzigZicht(j.id, e.target.value)} className="bg-transparent font-semibold outline-none" aria-label="Zichtbaarheid">
                          {Object.keys(zichtLabel).map((z) => <option key={z} value={z}>{zichtLabel[z]}{z === "aangepast" && j.zichtVoor.length ? `: ${j.zichtVoor.join(", ")}` : ""}</option>)}
                        </select>
                      </label>
                    </div>))}</Lijst>
                </section>
                {mag("notities") ? (<section>
                    <h3 className={`${kop} flex items-center gap-1.5 text-ink-soft`}><Lock className="size-3.5"/>Interne professionele notities</h3>
                    <p className="mt-1 text-[11px] text-ink-soft">Alleen voor professionals met dit recht. Komen nooit in Berichten of bij ouders, en zitten standaard niet in een export.</p>
                    <Lijst leeg="Geen interne notities.">{notities.map((n) => (<div key={n.id} className="py-2.5 text-sm"><p className="text-[11px] text-ink-soft">{momentKort(n.moment)}</p>{n.tekst}</div>))}</Lijst>
                  </section>) : null}
              </div>) : null}

            {tab === "Communicatie" ? (<>
              <CommunicatiePatronen />
              <CommunicatieTab dossier={dossier} druk={mag("communicatie") ? druk : []} magSturen={actief && mag("berichten")} magExport={mag("export")} onNieuw={() => setModus("bericht")}/>
            </>) : null}

            {tab === "Afspraken" ? (<div className="space-y-6">
                <section>
                  <div className="flex items-center justify-between"><h3 className={kop}>Professionele afspraken</h3>
                    {actief && mag("agenda") ? <button onClick={() => setModus("afspraak")} className="text-xs font-semibold text-brand">+ Plannen</button> : null}</div>
                  <Lijst leeg="Nog niets gepland.">{afspraken.map((a, i) => (<div key={i} className="flex gap-3 py-2.5 text-sm"><span className="w-32 shrink-0 text-xs text-ink-soft">{a.dag} {a.tijd}</span>{a.soort}</div>))}</Lijst>
                </section>
                <section>
                  <div className="flex items-center justify-between"><h3 className={kop}>Gezamenlijke afspraken</h3>
                    {actief && mag("berichten") ? <button onClick={() => setModus("gezamenlijk")} className="text-xs font-semibold text-brand">+ Vastleggen</button> : null}</div>
                  <p className="mt-1 text-[11px] text-ink-soft">Gezien en akkoord worden apart bijgehouden. Gezien is geen instemming.</p>
                  <Lijst leeg="Nog geen gezamenlijke afspraken.">{gezamenlijk.map((g) => (<div key={g.id} className="py-3">
                      <p className="text-sm">{g.tekst}</p>
                      {g.verstuurd ? (<div className="mt-1 grid grid-cols-[auto_1fr_1fr] gap-x-4 text-[11px]">
                          <span />{["Gezien", "Akkoord"].map((h) => <span key={h} className="font-semibold text-ink-soft">{h}</span>)}
                          {ouders.map((o) => [
                            <span key={o} className="font-semibold">{o}</span>,
                            <span key={o + "g"} className="text-ink-soft">{g.gezien[o] ? momentKort(g.gezien[o]) : "—"}</span>,
                            <span key={o + "a"} className={g.akkoord[o] ? "text-brand" : "text-ink-soft"}>{g.akkoord[o] ? momentKort(g.akkoord[o]) : "Reactie open"}</span>,
                        ])}
                        </div>) : (<button onClick={() => verstuurGezamenlijk(g.id)} className="mt-2 text-xs font-semibold text-brand">Ter bevestiging naar ouders sturen ›</button>)}
                    </div>))}</Lijst>
                </section>
              </div>) : null}

            {tab === "Acties" ? (<section>
                <div className="flex items-center justify-between"><h3 className={kop}>Acties voor ouders</h3>
                  {actief ? <button onClick={() => setModus("actie")} className="text-xs font-semibold text-brand">+ Toewijzen</button> : null}</div>
                <p className="mt-1 text-[11px] text-ink-soft">Deze acties staan bij de ouder(s) onder “Nog even naar kijken”. De status hier is actueel.</p>
                <Lijst leeg="Geen acties.">{acties.map((a) => {
                    const st = actieStatus(a);
                    return (<div key={a.id} className="flex items-start gap-3 py-3">
                      <button onClick={() => toggleActie(a.id)} aria-label={a.klaar ? "Heropenen" : "Afronden"} className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded border text-[11px] ${a.klaar ? "border-brand bg-brand text-primary-foreground" : "border-border"}`}>{a.klaar ? "✓" : ""}</button>
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-semibold ${a.klaar ? "text-ink-soft line-through" : ""}`}>{a.tekst}</p>
                        {a.omschrijving ? <p className="text-xs text-ink-soft">{a.omschrijving}</p> : null}
                        <p className="text-[11px] text-ink-soft">Voor {a.voor.toLowerCase()}{a.deadline ? ` · deadline ${datumKort(a.deadline)}` : ""}{a.prioriteit === "hoog" ? " · prioriteit hoog" : ""}{a.bijlage ? ` · bijlage: ${a.bijlage}` : ""}</p>
                      </div>
                      <span className={`shrink-0 text-[11px] font-semibold ${st === "Verlopen" ? "text-accent-warm" : st === "Afgerond" ? "text-brand" : "text-ink-soft"}`}>{st}</span>
                    </div>);
                })}</Lijst>
              </section>) : null}

            {tab === "Documenten" ? (<section>
                <div className="flex items-center justify-between"><h3 className={kop}>Documenten</h3>
                  {actief && mag("docToevoegen") ? <button onClick={() => setModus("document")} className="text-xs font-semibold text-brand">+ Toevoegen</button> : null}</div>
                <Lijst leeg="">{["Concept ouderschapsplan", "Verslag kennismaking", ...werk.log.filter((l) => l.dossier === dossier.id && l.soort === "documenten").map((l) => l.tekst.replace("Document toegevoegd: ", ""))].map((x, i) => <p key={i} className="py-2.5 text-sm">{x}</p>)}</Lijst>
              </section>) : null}

            {tab === "Afstemming" ? <AfstemmingTab /> : null}

            {tab === "Veiligheid" ? <VeiligheidTab lijst={veilig} magBeheren={actief && mag("veiligBeheren")} onNieuw={() => setModus("veilig")}/> : null}

            {tab === "Dossiergegevens" ? <GegevensTab dossierId={dossier.id} gegevens={gegevens} pins={pins} doelen={doelen} actief={actief}/> : null}

            {actief ? (<div className="mt-6 border-t border-border pt-4">
                {professional ? <Button variant="ghost" onClick={() => setBevestig(true)} className="text-ink-soft">Mijn betrokkenheid beëindigen</Button> : <p className="text-xs text-ink-soft">Je professionele betrokkenheid is nog niet vastgelegd.</p>}
              </div>) : null}
          </div>
        </div>)}

      <ToevoegSheet modus={modus} dossier={dossier} onSluit={() => setModus(null)}/>
      {bevestig && professional ? <BetrokkenheidAfsluiten professional={professional} gezin={dossier.gezin} doelen={doelen} onSluit={() => setBevestig(false)} onBeeindig={onBeeindig}/> : null}
      <DossierExport open={exportOpen} onSluit={() => setExportOpen(false)} dossier={dossier} rechten={rechten} afspraken={afspraken}/>
    </div>);
}
function Feit({ label, children }) {
    return <div><dt className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">{label}</dt><dd className="mt-0.5">{children}</dd></div>;
}
function Lijst({ children, leeg }) {
    const items = Array.isArray(children) ? children : [children];
    if (items.filter(Boolean).length === 0)
        return leeg ? <p className="mt-2 text-sm text-ink-soft">{leeg}</p> : null;
    return <div className="mt-2 divide-y divide-border border-y border-border">{children}</div>;
}
export const evaluatieTekst = (iso) => { const n = dagenTot(iso); return n < 0 ? `${-n} dagen geleden` : n === 0 ? "vandaag" : n === 1 ? "morgen" : `over ${n} dagen`; };
/* ---------- Tijdlijn ---------- */
const tijdFilters = ["Alles", "Afspraken", "Contactmomenten", "Communicatie", "Wijzigingen", "Documenten", "Veiligheid"];
const filterSoort = { Alles: null, Afspraken: "afspraken", Contactmomenten: "contact", Communicatie: "communicatie", Wijzigingen: "wijzigingen", Documenten: "documenten", Veiligheid: "veiligheid" };
function Tijdlijn({ dossierId }) {
    const { log } = useProWerk();
    const [f, setF] = useState("Alles");
    const lijst = [...log].filter((l) => l.dossier === dossierId && (!filterSoort[f] || l.soort === filterSoort[f])).sort((a, b) => b.moment.localeCompare(a.moment));
    const perDag = lijst.reduce((acc, l) => { const k = datumKort(l.moment); (acc[k] ??= []).push(l); return acc; }, {});
    return (<section>
      <p className="text-xs text-ink-soft">Relevante gebeurtenissen uit alle onderdelen. Alleen-lezen; niets kan achteraf worden aangepast.</p>
      <FilterBalk doorlopen className="mt-3" opties={tijdFilters} waarde={f} onChange={setF}/>
      {lijst.length === 0 ? <p className="mt-3 text-sm text-ink-soft">Niets binnen dit filter.</p> : Object.entries(perDag).map(([dag, items]) => (<div key={dag} className="mt-4">
          <p className="text-xs font-bold">{dag}</p>
          <ul className="mt-1 space-y-1.5 border-l border-border pl-3">
            {items.map((l) => <li key={l.id} className="text-sm"><span className="text-[11px] text-ink-soft">{new Date(l.moment).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })} · {l.door} — </span>{l.tekst}</li>)}
          </ul>
        </div>))}
    </section>);
}
/* ---------- Communicatie ---------- */
function CommunicatieTab({ dossier, druk, magSturen, magExport, onNieuw }) {
    const werk = useProWerk();
    const berichten = werk.berichten.filter((b) => b.dossier === dossier.id);
    const [periode, setPeriode] = useState("Week");
    const [kind, setKind] = useState("Alle kinderen");
    const [niveau, setNiveau] = useState("Alle");
    const [open, setOpen] = useState(0);
    const [pdfOpen, setPdfOpen] = useState(false);
    const kinderen = ["Alle kinderen", ...Array.from(new Set(druk.map((d) => d.kind)))];
    const lijst = druk.filter((d, i) => (periode === "Vandaag" ? i === 0 : periode === "Week" ? i < 7 : true)
        && (kind === "Alle kinderen" || d.kind === kind) && (niveau === "Alle" || drukNiveau(d.s) === niveau));
    return (<div className="space-y-6">
      {dossier.status === "actief" ? <CommunicatieOverzicht gezinnen={[dossier]}/> : null}
      <section>
        <div className="flex flex-wrap items-center justify-between gap-3"><h3 className={kop}>Berichten aan ouders</h3>
          <div className="flex flex-wrap gap-3 text-xs font-semibold">
            {magExport ? <button onClick={() => setPdfOpen(true)} className="text-brand">Exporteren naar PDF</button> : null}
            {magSturen ? <button onClick={onNieuw} className="text-brand">+ Nieuw bericht</button> : null}
          </div>
        </div>
        <Lijst leeg="Nog geen berichten verstuurd.">{berichten.map((b) => (<div key={b.id} className="py-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">{b.door === IK ? `Verstuurd aan · ${b.aan}` : `Van ${b.door}`} · leesbaar voor {[...b.ontvangers, IK].join(", ")}</p>
            <p className="text-sm font-semibold">{b.onderwerp}</p>
            <p className="text-sm">{b.tekst}</p>
            <p className="mt-1 text-[11px] text-ink-soft">{momentKort(b.moment)} · {b.door} · {b.ontvangers.map((o) => `${o}: ${b.gezien[o] ? "gezien" : "nog niet gezien"}`).join(" · ")}</p>
          </div>))}</Lijst>
      </section>
      {druk.length ? (<section>
          <h3 className={kop}>Communicatiedruk</h3>
          <p className="mt-1 text-xs text-ink-soft">Een tijdgebonden signaal over het gemeten communicatiepatroon. Geen beoordeling van het gezin of van een ouder — jij interpreteert de context.</p>
          <FilterBalk doorlopen className="mt-3" opties={["Vandaag", "Week", "Alles"]} waarde={periode} onChange={setPeriode}/>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <select value={kind} onChange={(e) => setKind(e.target.value)} className={veld} aria-label="Kind">{kinderen.map((k) => <option key={k}>{k}</option>)}</select>
            <select value={niveau} onChange={(e) => setNiveau(e.target.value)} className={veld} aria-label="Communicatiedruk">
              <option value="Alle">Alle niveaus</option><option value="rustig">Rustig</option><option value="veel">Veel communicatie</option><option value="hoog">Hoge communicatiedruk</option>
            </select>
          </div>
          <Lijst leeg="Niets binnen deze filters.">{lijst.map((d, i) => (<div key={i} className="py-3">
              <button onClick={() => setOpen(open === i ? null : i)} className="flex w-full items-center justify-between text-left">
                <span><span className="block text-sm font-semibold">{d.dag}</span><span className="text-[11px] text-ink-soft">{d.onderwerp} · {d.kind} · {d.soort}</span></span>
                <DrukLabel niveau={drukNiveau(d.s)}/>
              </button>
              {open === i ? (<div className="mt-2 rounded-md bg-muted/50 p-3 text-xs">
                  <p className="font-semibold">{d.s.periode}:</p>
                  <ul className="mt-1 list-disc pl-4">{drukRedenen(d.s).map((r) => <li key={r}>{r}</li>)}</ul>
                </div>) : null}
            </div>))}</Lijst>
        </section>) : null}
      <CommunicatieExport open={pdfOpen} onSluit={() => setPdfOpen(false)} dossier={dossier}/>
    </div>);
}
function CommunicatieExport({ open, onSluit, dossier }) {
    const werk = useProWerk();
    const ouders = dossier.ouders.split(" & ");
    const [van, setVan] = useState("2026-01-01");
    const [tot, setTot] = useState(new Date().toISOString().slice(0, 10));
    const [personen, setPersonen] = useState(ouders);
    const [onderwerp, setOnderwerp] = useState("Alle onderwerpen");
    const [delen, setDelen] = useState({ berichten: true, gezamenlijk: true });
    const alle = werk.berichten.filter((b) => b.dossier === dossier.id);
    const onderwerpen = ["Alle onderwerpen", ...Array.from(new Set(alle.map((b) => b.onderwerp)))];
    const binnen = (m) => m.slice(0, 10) >= van && m.slice(0, 10) <= tot;
    const berichten = alle.filter((b) => binnen(b.moment) && b.ontvangers.some((o) => personen.includes(o)) && (onderwerp === "Alle onderwerpen" || b.onderwerp === onderwerp)).sort((a, b) => a.moment.localeCompare(b.moment));
    const gez = werk.gezamenlijk.filter((g) => g.dossier === dossier.id && g.verstuurd && binnen(g.moment));
    const maak = () => {
        const secties = [];
        if (delen.berichten)
            secties.push({ titel: "Berichten", regels: berichten.map((b) => ({ meta: `${momentKort(b.moment)} · van ${b.door} · aan ${b.aan}${b.aan === "Beide ouders" ? ` (${b.ontvangers.join(", ")})` : ""}`, kop: b.onderwerp, tekst: b.tekst })) });
        if (delen.gezamenlijk)
            secties.push({ titel: "Gezamenlijke afspraken ter bevestiging", regels: gez.map((g) => ({ meta: momentKort(g.moment), tekst: `${g.tekst}\nGezien: ${Object.keys(g.gezien).join(", ") || "—"} · Akkoord: ${Object.keys(g.akkoord).join(", ") || "—"}` })) });
        void maakProPdf({ titel: "Communicatie-overzicht", dossier: dossier.gezin, periode: `${datumKort(van)} – ${datumKort(tot)}`, secties, bestand: `communicatie-${dossier.id}.pdf` });
        onSluit();
    };
    return (<Sheet open={open} onOpenChange={(o) => { if (!o)
        onSluit(); }}>
      <SheetContent side="bottom" className="pro-cockpit left-1/2 max-h-[90vh] w-full max-w-md -translate-x-1/2 overflow-y-auto rounded-t-2xl bg-background px-5 pb-8 pt-4">
        <SheetHeader className="pr-8 text-left"><SheetTitle className="font-display text-xl font-medium">Exporteren naar PDF</SheetTitle><SheetDescription className="text-xs">{dossier.gezin} · alleen communicatie waartoe jij toegang hebt</SheetDescription></SheetHeader>
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs font-semibold">Van<input type="date" value={van} onChange={(e) => setVan(e.target.value)} className={`${veld} mt-1`}/></label>
            <label className="text-xs font-semibold">Tot<input type="date" value={tot} onChange={(e) => setTot(e.target.value)} className={`${veld} mt-1`}/></label>
          </div>
          <div><p className="text-xs font-semibold">Betrokken personen</p><div className="mt-1 flex gap-1.5">{ouders.map((o) => <button key={o} onClick={() => setPersonen((l) => toggle(l, o))} className={chip(personen.includes(o))}>{o}</button>)}</div></div>
          <label className="block text-xs font-semibold">Gesprek/onderwerp<select value={onderwerp} onChange={(e) => setOnderwerp(e.target.value)} className={`${veld} mt-1`}>{onderwerpen.map((o) => <option key={o}>{o}</option>)}</select></label>
          <div className="space-y-1.5 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={delen.berichten} onChange={(e) => setDelen({ ...delen, berichten: e.target.checked })} className="accent-[var(--brand)]"/>Berichten ({berichten.length})</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={delen.gezamenlijk} onChange={(e) => setDelen({ ...delen, gezamenlijk: e.target.checked })} className="accent-[var(--brand)]"/>Gezamenlijke afspraken ({gez.length})</label>
          </div>
          <p className="flex items-center gap-1.5 text-xs text-ink-soft"><Lock className="size-3.5"/>Interne notities zitten nooit in deze export.</p>
          <button onClick={maak} disabled={!delen.berichten && !delen.gezamenlijk} className="w-full rounded-md bg-brand py-3 text-sm font-semibold text-primary-foreground disabled:opacity-40">PDF maken</button>
        </div>
      </SheetContent>
    </Sheet>);
}
/* ---------- Dossier exporteren ---------- */
const exportDelen = ["Dossiergegevens", "Zorg-/omgangsregeling", "Afspraken", "Communicatie", "Contactjournaal", "Acties", "Besluiten", "Veiligheidsafspraken", "Documentoverzicht", "Wijzigingsgeschiedenis", "Interne professionele notities"];
const deelRecht = {
    "Zorg-/omgangsregeling": ["regeling"], Afspraken: ["agenda", "regeling"], Communicatie: ["communicatie", "berichten"], Contactjournaal: ["journaal", "notities"],
    Acties: ["acties"], Veiligheidsafspraken: ["veiligBekijken", "veiligBeheren"], Documentoverzicht: ["docBekijken"], "Interne professionele notities": ["notities"],
};
function DossierExport({ open, onSluit, dossier, rechten, afspraken }) {
    const werk = useProWerk();
    const beschikbaar = exportDelen.filter((d) => !deelRecht[d] || deelRecht[d].some((r) => rechten.includes(r)));
    const [gekozen, setGekozen] = useState(beschikbaar.filter((d) => d !== "Interne professionele notities"));
    const notitiesAan = gekozen.includes("Interne professionele notities");
    const id = dossier.id;
    const g = werk.gegevens[id] ?? legeGegevens;
    const maak = () => {
        const s = [];
        const add = (d, regels) => gekozen.includes(d) && beschikbaar.includes(d) && s.push({ titel: d, regels });
        add("Dossiergegevens", [{ tekst: `Kinderen: ${dossier.kinderen.join(", ")}\nOuders: ${dossier.ouders}\n${Object.keys(g).map((k) => `${gegevensLabel[k]}: ${g[k] || "—"}`).join("\n")}` }]);
        add("Zorg-/omgangsregeling", [{ tekst: g.regeling || "Niet vastgelegd." }]);
        add("Afspraken", [...afspraken.map((a) => ({ meta: `${a.dag} ${uur(a.tijd)}`, tekst: a.soort })), ...werk.gezamenlijk.filter((x) => x.dossier === id).map((x) => ({ meta: momentKort(x.moment), tekst: `${x.tekst} — gezien: ${Object.keys(x.gezien).join(", ") || "—"}; akkoord: ${Object.keys(x.akkoord).join(", ") || "—"}` }))]);
        add("Communicatie", werk.berichten.filter((b) => b.dossier === id).map((b) => ({ meta: `${momentKort(b.moment)} · aan ${b.aan}`, kop: b.onderwerp, tekst: b.tekst })));
        add("Contactjournaal", werk.journaal.filter((j) => j.dossier === id).map((j) => ({ meta: `${momentKort(j.moment)} · ${j.type} · ${zichtLabel[j.zicht]}`, kop: j.onderwerp, tekst: j.notitie })));
        add("Acties", werk.acties.filter((a) => a.dossier === id).map((a) => ({ meta: `Voor ${a.voor}${a.deadline ? ` · deadline ${datumKort(a.deadline)}` : ""} · ${actieStatus(a)}`, tekst: a.tekst })));
        add("Besluiten", [{ tekst: "Besluiten van ouders exporteer je via ‘Gezinsgegevens exporteren’, binnen de rechten die ouders gaven." }]);
        add("Veiligheidsafspraken", werk.veilig.filter((v) => v.dossier === id).map((v) => ({ meta: `${v.kind} · vanaf ${datumKort(v.start)} · evaluatie ${datumKort(v.evaluatie)} · ${v.status}`, kop: v.titel, tekst: v.afspraak })));
        add("Documentoverzicht", [{ tekst: "Concept ouderschapsplan\nVerslag kennismaking" }]);
        add("Wijzigingsgeschiedenis", [...werk.log].filter((l) => l.dossier === id).map((l) => ({ meta: `${momentKort(l.moment)} · ${l.door}`, tekst: l.tekst })));
        add("Interne professionele notities", werk.notities.filter((n) => n.dossier === id).map((n) => ({ meta: momentKort(n.moment), tekst: n.tekst })));
        void maakProPdf({ titel: "Dossieroverzicht", dossier: dossier.gezin, periode: `Begeleiding sinds ${dossier.sinds}`, secties: s, bestand: `dossier-${id}.pdf` });
        onSluit();
    };
    return (<Sheet open={open} onOpenChange={(o) => { if (!o)
        onSluit(); }}>
      <SheetContent side="bottom" className="pro-cockpit left-1/2 max-h-[90vh] w-full max-w-md -translate-x-1/2 overflow-y-auto rounded-t-2xl bg-background px-5 pb-8 pt-4">
        <SheetHeader className="pr-8 text-left"><SheetTitle className="font-display text-xl font-medium">Dossier exporteren</SheetTitle><SheetDescription className="text-xs">Kies zelf wat wordt meegenomen. Alleen onderdelen waartoe jij toegang hebt.</SheetDescription></SheetHeader>
        <div className="mt-4 divide-y divide-border border-y border-border">
          {beschikbaar.map((d) => (<label key={d} className="flex items-center gap-3 py-2.5 text-sm">
              <input type="checkbox" checked={gekozen.includes(d)} onChange={() => setGekozen((l) => toggle(l, d))} className="size-4 accent-[var(--brand)]"/>
              {d === "Interne professionele notities" ? <span className="flex items-center gap-1.5"><Lock className="size-3.5"/>{d}</span> : d}
            </label>))}
        </div>
        {notitiesAan ? <p className="mt-3 rounded-md bg-accent-soft p-3 text-xs text-accent-foreground">Let op: interne notities zijn privé-informatie. Deel deze export niet met ouders of anderen zonder dat dit is toegestaan.</p> : <p className="mt-3 text-xs text-ink-soft">Interne notities worden standaard niet meegenomen.</p>}
        <button onClick={maak} disabled={!gekozen.length} className="mt-4 w-full rounded-md bg-brand py-3 text-sm font-semibold text-primary-foreground disabled:opacity-40">PDF maken</button>
      </SheetContent>
    </Sheet>);
}
/* ---------- Veiligheid ---------- */
function VeiligheidTab({ lijst, magBeheren, onNieuw }) {
    const [bezig, setBezig] = useState(null);
    const [waarde, setWaarde] = useState("");
    return (<section>
      <div className="flex items-center justify-between"><h3 className={kop}>Veiligheidsafspraken</h3>
        {magBeheren ? <button onClick={onNieuw} className="text-xs font-semibold text-brand">+ Toevoegen</button> : null}</div>
      <Lijst leeg="Geen veiligheidsafspraken.">{lijst.map((v) => {
            const binnenkort = v.status === "actief" && dagenTot(v.evaluatie) <= 7;
            return (<div key={v.id} className={`py-3 ${v.status === "beeindigd" ? "opacity-60" : ""}`}>
            <p className="text-sm font-semibold">{v.titel}{v.status === "beeindigd" ? " · beëindigd" : ""}</p>
            <p className="text-xs text-ink-soft">{v.context}</p>
            <p className="mt-1 text-sm">{v.afspraak}</p>
            <p className="mt-1 text-[11px] text-ink-soft">{v.kind} · {v.betrokkenen.join(", ")} · vanaf {datumKort(v.start)}{v.eind ? ` t/m ${datumKort(v.eind)}` : ""} · {zichtLabel[v.zicht]}{v.bijlage ? ` · bijlage: ${v.bijlage}` : ""}</p>
            {v.status === "actief" ? <p className={`text-[11px] font-semibold ${binnenkort ? "text-accent-warm" : "text-ink-soft"}`}>Evalueren {evaluatieTekst(v.evaluatie)} ({datumKort(v.evaluatie)})</p> : null}
            {magBeheren && v.status === "actief" ? (bezig?.id === v.id ? (<div className="mt-2 flex gap-2">
                  {bezig.soort === "nieuweDatum" ? <input type="date" value={waarde} onChange={(e) => setWaarde(e.target.value)} className={veld}/> : <input value={waarde} onChange={(e) => setWaarde(e.target.value)} placeholder="Nieuwe afspraaktekst" className={veld}/>}
                  <button disabled={!waarde} onClick={() => { evalueerVeilig(v.id, bezig.soort, waarde); setBezig(null); setWaarde(""); }} className={`${knop} disabled:opacity-40`}>Opslaan</button>
                </div>) : (<div className="mt-2 flex flex-wrap gap-2">
                  <button onClick={() => evalueerVeilig(v.id, "verlengen")} className={knop}>Verlengen (30 dagen)</button>
                  <button onClick={() => { setBezig({ id: v.id, soort: "aanpassen" }); setWaarde(v.afspraak); }} className={knop}>Aanpassen</button>
                  <button onClick={() => { setBezig({ id: v.id, soort: "nieuweDatum" }); setWaarde(""); }} className={knop}>Nieuwe evaluatiedatum</button>
                  <button onClick={() => evalueerVeilig(v.id, "beeindigen")} className={knop}>Beëindigen</button>
                </div>)) : null}
          </div>);
        })}</Lijst>
    </section>);
}
/* ---------- Dossiergegevens, pins, doelen, professionals ---------- */
function IntakeBlok({ aanmelding: a }) {
    if (!a)
        return null;
    const regels = [["Aanmelddatum", a.datum && datumKort(a.datum)], ["Verwijzer", a.verwijzer], ["Reden van aanmelding", a.reden], ["Hulpvraag", a.hulpvraag], ["Aandachtspunten", a.aandacht]].filter(([, w]) => w);
    return (<section aria-label="Aanmelding">
      <h3 className={kop}>Aanmelding</h3>
      <p className="mt-1 text-xs text-ink-soft">Intern · niet zichtbaar voor ouders · tijdelijk bewaard tot herladen</p>
      <dl className="mt-2 divide-y divide-border border-y border-border">{regels.map(([l, w]) => <div key={l} className="py-2 text-sm"><dt className="font-semibold">{l}</dt><dd className="whitespace-pre-wrap text-ink-soft">{w}</dd></div>)}</dl>
      <h4 className="mt-4 text-sm font-semibold">Andere betrokken hulpverlening</h4>
      {a.hulpverleners.length ? <ul className="mt-1 divide-y divide-border border-y border-border">{a.hulpverleners.map((h, i) => <li key={i} className="py-2 text-sm"><p className="font-semibold">{h.naam || h.organisatie}</p><p className="text-ink-soft">{[h.organisatie, h.functie, h.contact].filter(Boolean).join(" · ")}</p>{h.rol || h.samenwerking ? <p className="text-ink-soft">{[h.rol, h.samenwerking].filter(Boolean).join(" · ")}</p> : null}<p className="mt-0.5 text-xs text-ink-soft">Geen toegang tot de app</p></li>)}</ul> : <p className="mt-1 text-sm text-ink-soft">Geen andere hulpverlening vastgelegd.</p>}
    </section>);
}
const doelStatussen = ["Te bespreken", "In uitvoering", "Afgerond"];
function GegevensTab({ dossierId, gegevens, pins, doelen, actief }) {
    const werk = useProWerk();
    const [form, setForm] = useState(gegevens);
    const [nieuwePin, setNieuwePin] = useState("");
    const [nieuwDoel, setNieuwDoel] = useState("");
    const [overdragen, setOverdragen] = useState(false);
    const [np, setNp] = useState({ naam: "", rol: proRollen[0], start: new Date().toISOString().slice(0, 10), rechten: [] });
    const pros = werk.pros.filter((p) => p.dossier === dossierId);
    const gewijzigd = JSON.stringify(form) !== JSON.stringify(gegevens);
    return (<div className="space-y-6">
      <IntakeBlok aanmelding={werk.aanmeldingen[dossierId]}/>
      <section>
        <h3 className={kop}>Dossiergegevens</h3>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          {Object.keys(gegevensLabel).map((k) => (<label key={k} className={`block text-xs font-semibold ${k === "praktisch" || k === "overig" ? "sm:col-span-2" : ""}`}>{gegevensLabel[k]}
              {k === "status" ? (<select disabled={!actief} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={`${veld} mt-1`}>{["Actief", "Gepauzeerd", "Afgerond"].map((s) => <option key={s}>{s}</option>)}</select>) : (<input disabled={!actief} type={k === "start" ? "date" : "text"} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} className={`${veld} mt-1`}/>)}
            </label>))}
        </div>
        {gewijzigd ? <button onClick={() => zetGegevens(dossierId, form)} className="mt-3 rounded-md bg-brand px-4 py-2 text-xs font-semibold text-primary-foreground">Opslaan</button> : null}
      </section>

      <section>
        <h3 className={kop}>Vastgepind ({pins.length}/{MAX_PINS})</h3>
        <Lijst leeg="Nog niets vastgepind.">{pins.map((p) => (<div key={p} className="flex items-center justify-between py-2 text-sm"><span className="flex items-center gap-2"><Pin className="size-3.5 text-brand"/>{p}</span>{actief ? <button onClick={() => ontpin(dossierId, p)} aria-label="Losmaken"><X className="size-4 text-brand"/></button> : null}</div>))}</Lijst>
        {actief && pins.length < MAX_PINS ? (<div className="mt-2 flex gap-2"><input value={nieuwePin} onChange={(e) => setNieuwePin(e.target.value)} placeholder="Bijv. Communicatie uitsluitend via de app" className={veld}/>
            <button disabled={!nieuwePin.trim()} onClick={() => { pin(dossierId, nieuwePin.trim()); setNieuwePin(""); }} className={`${knop} disabled:opacity-40`}>Vastpinnen</button></div>) : null}
      </section>

      <section>
        <h3 className={kop}>Doelen van de begeleiding</h3>
        <p className="mt-1 text-[11px] text-ink-soft">Optioneel. Geen score of cijfer voor ouderschap.</p>
        <Lijst leeg="Nog geen doelen.">{doelen.map((x) => (<div key={x.id} className="flex items-center justify-between gap-3 py-2.5 text-sm"><span>{x.tekst}</span>
            <select disabled={!actief} value={x.status} onChange={(e) => zetDoelStatus(x.id, e.target.value)} className="bg-transparent text-xs font-semibold text-ink-soft outline-none" aria-label="Status doel">{doelStatussen.map((s) => <option key={s}>{s}</option>)}</select></div>))}</Lijst>
        {actief ? (<div className="mt-2 flex gap-2"><input value={nieuwDoel} onChange={(e) => setNieuwDoel(e.target.value)} placeholder="Bijv. Zorgregeling evalueren" className={veld}/>
            <button disabled={!nieuwDoel.trim()} onClick={() => { voegDoelToe(dossierId, nieuwDoel.trim()); setNieuwDoel(""); }} className={`${knop} disabled:opacity-40`}>Toevoegen</button></div>) : null}
      </section>

      <section>
        <div className="flex items-center justify-between"><h3 className={kop}>Betrokken professionals</h3>
          {actief ? <button onClick={() => setOverdragen((x) => !x)} className="text-xs font-semibold text-brand">{overdragen ? "Annuleren" : "+ Toegang geven / overdragen"}</button> : null}</div>
        <p className="mt-1 text-[11px] text-ink-soft">Iedere professional heeft eigen rechten. Niemand krijgt automatisch volledige toegang. Elke wijziging wordt vastgelegd.</p>
        {overdragen ? (<div className="mt-3 space-y-3 rounded-md border border-border p-3">
            <label className="block text-xs font-semibold">Nieuwe professional<input value={np.naam} onChange={(e) => setNp({ ...np, naam: e.target.value })} className={`${veld} mt-1`}/></label>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs font-semibold">Rol<select value={np.rol} onChange={(e) => setNp({ ...np, rol: e.target.value })} className={`${veld} mt-1`}>{proRollen.map((r) => <option key={r}>{r}</option>)}</select></label>
              <label className="text-xs font-semibold">Startdatum<input type="date" value={np.start} onChange={(e) => setNp({ ...np, start: e.target.value })} className={`${veld} mt-1`}/></label>
            </div>
            <div><p className="text-xs font-semibold">Toegangsrechten</p><div className="mt-1 flex flex-wrap gap-1.5">{alleRechten.map((r) => <button key={r} onClick={() => setNp({ ...np, rechten: toggle(np.rechten, r) })} className={chip(np.rechten.includes(r))}>{rechtLabel[r]}</button>)}</div></div>
            <button disabled={!np.naam.trim()} onClick={() => { geefToegang(dossierId, np.naam.trim(), np.rol, np.rechten, np.start); setOverdragen(false); setNp({ ...np, naam: "", rechten: [] }); }} className="w-full rounded-md bg-brand py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-40">Toegang geven</button>
          </div>) : null}
        <Lijst leeg="">{pros.map((p) => (<details key={p.id} className={`py-2.5 ${p.actief ? "" : "opacity-60"}`}>
            <summary className="flex cursor-pointer items-center justify-between text-sm"><span><b>{p.naam}{p.naam === IK ? " (jij)" : ""}</b> · {p.rol}</span><span className="text-[11px] text-ink-soft">{p.actief ? `sinds ${datumKort(p.start)}` : "toegang beëindigd"}</span></summary>
            <div className="mt-2 flex flex-wrap gap-1.5">{alleRechten.map((r) => (<button key={r} disabled={!actief || !p.actief || p.naam === IK} onClick={() => wijzigRechten(p.id, toggle([...p.rechten], r))} className={`${chip(p.rechten.includes(r))} disabled:cursor-default`}>{rechtLabel[r]}</button>))}</div>
            {actief && p.actief && p.naam !== IK ? <button onClick={() => trekToegangIn(p.id)} className="mt-2 text-xs font-semibold text-ink-soft">Toegang beëindigen (historie blijft bewaard)</button> : null}
          </details>))}</Lijst>
      </section>
    </div>);
}
/* ---------- Toevoegen ---------- */
function ToevoegSheet({ modus, dossier, onSluit }) {
    const ouders = dossier.ouders.split(" & ");
    const kinderen = dossier.kinderen.map((k) => k.split(" – ")[0]);
    const nu = new Date();
    nu.setMinutes(nu.getMinutes() - nu.getTimezoneOffset());
    const [moment, setMoment] = useState(nu.toISOString().slice(0, 16));
    const [type, setType] = useState("Gesprek");
    const [betrokken, setBetrokken] = useState(ouders);
    const [onderwerp, setOnderwerp] = useState("");
    const [tekst, setTekst] = useState("");
    const [extra, setExtra] = useState("");
    const [zicht, setZicht] = useState(null);
    const [zichtVoor, setZichtVoor] = useState([]);
    const [aan, setAan] = useState(null);
    const [deadline, setDeadline] = useState("");
    const [prioriteit, setPrioriteit] = useState("normaal");
    const [bijlage, setBijlage] = useState("");
    const [versturen, setVersturen] = useState(true);
    const [kind, setKind] = useState(kinderen);
    const [start, setStart] = useState(nu.toISOString().slice(0, 10));
    const [eind, setEind] = useState("");
    const [evaluatie, setEvaluatie] = useState("");
    const reset = () => { setOnderwerp(""); setTekst(""); setExtra(""); setZicht(null); setZichtVoor([]); setBetrokken(ouders); setAan(null); setDeadline(""); setPrioriteit("normaal"); setBijlage(""); setEind(""); setEvaluatie(""); setKind(kinderen); };
    const sluit = () => { reset(); onSluit(); };
    const titel = { journaal: "Contactjournaal toevoegen", notitie: "Professionele notitie", afspraak: "Afspraak plannen", actie: "Actie voor ouder(s)", gezamenlijk: "Gezamenlijke afspraak vastleggen", veilig: "Veiligheidsafspraak", document: "Document toevoegen", bericht: "Nieuw bericht", overig: "Overig vastleggen" }[modus ?? "notitie"];
    const zichtOk = zicht && (zicht !== "aangepast" || zichtVoor.length > 0);
    const kan = modus === "journaal" ? onderwerp.trim() && tekst.trim() && zichtOk
        : modus === "bericht" ? aan && onderwerp.trim() && tekst.trim()
            : modus === "actie" ? onderwerp.trim() && betrokken.length
                : modus === "veilig" ? onderwerp.trim() && tekst.trim() && evaluatie && zichtOk && kind.length
                    : tekst.trim();
    const opslaan = () => {
        if (modus === "journaal" && zicht)
            voegJournaalToe({ dossier: dossier.id, moment, type, betrokkenen: betrokken, onderwerp: onderwerp.trim(), notitie: tekst.trim(), zicht, zichtVoor });
        if (modus === "notitie" || modus === "overig")
            voegNotitieToe(dossier.id, tekst.trim());
        if (modus === "actie")
            voegActieToe(dossier.id, onderwerp.trim(), betrokken.length === ouders.length ? "Beide ouders" : betrokken.join(", "), { omschrijving: tekst.trim() || undefined, deadline: deadline || undefined, prioriteit, bijlage: bijlage.trim() || undefined });
        if (modus === "bericht" && aan)
            stuurBericht(dossier.id, ouders, aan, onderwerp.trim(), tekst.trim());
        if (modus === "gezamenlijk")
            legGezamenlijkVast(dossier.id, tekst.trim(), versturen);
        if (modus === "veilig" && zicht)
            voegVeiligToe({ dossier: dossier.id, titel: onderwerp.trim(), context: extra.trim(), afspraak: tekst.trim(), betrokkenen: betrokken, kind: kind.join(" & "), start, eind: eind || undefined, evaluatie, zicht, bijlage: bijlage.trim() || undefined });
        if (modus === "document")
            logDocument(dossier.id, tekst.trim());
        if (modus === "afspraak")
            logAfspraak(dossier.id, `${tekst.trim()} · ${moment.replace("T", " ")}`);
        sluit();
    };
    const tekstLabel = { document: "Naam document", afspraak: "Omschrijving", actie: "Omschrijving (optioneel)", bericht: "Bericht", gezamenlijk: "Wat is afgesproken?", veilig: "Afspraak", journaal: "Verslag/notitie" }[modus] ?? "Notitie";
    return (<Sheet open={modus !== null} onOpenChange={(o) => { if (!o)
        sluit(); }}>
      <SheetContent side="bottom" className="pro-cockpit left-1/2 max-h-[90vh] w-full max-w-md -translate-x-1/2 overflow-y-auto rounded-t-2xl bg-background px-5 pb-8 pt-4">
        <SheetHeader className="pr-8 text-left">
          <SheetTitle className="font-display text-xl font-medium">{titel}</SheetTitle>
          <SheetDescription className="text-xs">{dossier.gezin}</SheetDescription>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          {modus === "bericht" ? (<fieldset>
              <legend className="text-xs font-semibold">Aan</legend>
              <div className="mt-1 flex flex-wrap gap-1.5">{["Beide ouders", ...ouders].map((o) => <button key={o} onClick={() => setAan(o)} className={chip(aan === o)}>{o}</button>)}</div>
              {aan === "Beide ouders" ? <p className="mt-2 text-xs font-semibold text-brand">Dit bericht wordt met beide ouders gedeeld. Zij ontvangen exact dezelfde tekst.</p> : aan ? <p className="mt-2 text-xs text-ink-soft">Alleen {aan} ontvangt dit bericht.</p> : null}
            </fieldset>) : null}
          {modus === "journaal" || modus === "afspraak" ? (<label className="block text-xs font-semibold">Datum en tijd<input type="datetime-local" value={moment} onChange={(e) => setMoment(e.target.value)} className={`${veld} mt-1`}/></label>) : null}
          {modus === "journaal" ? (<div><p className="text-xs font-semibold">Type contact</p>
              <div className="mt-1 flex flex-wrap gap-1.5">{contactTypes.map((t) => <button key={t} onClick={() => setType(t)} className={chip(type === t)}>{t}</button>)}</div>
            </div>) : null}
          {modus === "journaal" || modus === "actie" || modus === "veilig" ? (<div><p className="text-xs font-semibold">{modus === "actie" ? "Voor wie" : "Betrokken personen"}</p>
              <div className="mt-1 flex flex-wrap gap-1.5">{[...ouders, ...(modus === "journaal" ? ["Collega"] : [])].map((o) => <button key={o} onClick={() => setBetrokken((l) => toggle(l, o))} className={chip(betrokken.includes(o))}>{o}</button>)}</div>
            </div>) : null}
          {modus === "veilig" ? (<div><p className="text-xs font-semibold">Voor welk kind</p><div className="mt-1 flex flex-wrap gap-1.5">{kinderen.map((k) => <button key={k} onClick={() => setKind((l) => toggle(l, k))} className={chip(kind.includes(k))}>{k}</button>)}</div></div>) : null}
          {modus === "journaal" || modus === "bericht" || modus === "actie" || modus === "veilig" ? (<label className="block text-xs font-semibold">{modus === "actie" || modus === "veilig" ? "Titel" : "Onderwerp"}<input value={onderwerp} onChange={(e) => setOnderwerp(e.target.value)} className={`${veld} mt-1`}/></label>) : null}
          {modus === "veilig" ? <label className="block text-xs font-semibold">Situatie/context<input value={extra} onChange={(e) => setExtra(e.target.value)} className={`${veld} mt-1`}/></label> : null}
          <label className="block text-xs font-semibold">{tekstLabel}
            <textarea value={tekst} onChange={(e) => setTekst(e.target.value)} rows={modus === "document" || modus === "afspraak" ? 1 : 4} className={`${veld} mt-1 resize-none`} placeholder={modus === "gezamenlijk" ? "Bijv. Vanaf 1 november vindt het wisselmoment op vrijdag om 17:00 uur plaats." : undefined}/>
          </label>
          {modus === "actie" ? (<div className="grid grid-cols-2 gap-2">
              <label className="text-xs font-semibold">Deadline<input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={`${veld} mt-1`}/></label>
              <label className="text-xs font-semibold">Prioriteit<select value={prioriteit} onChange={(e) => setPrioriteit(e.target.value)} className={`${veld} mt-1`}><option value="normaal">Normaal</option><option value="hoog">Hoog</option></select></label>
            </div>) : null}
          {modus === "veilig" ? (<div className="grid grid-cols-3 gap-2">
              <label className="text-xs font-semibold">Start<input type="date" value={start} onChange={(e) => setStart(e.target.value)} className={`${veld} mt-1 px-2`}/></label>
              <label className="text-xs font-semibold">Einde<input type="date" value={eind} onChange={(e) => setEind(e.target.value)} className={`${veld} mt-1 px-2`}/></label>
              <label className="text-xs font-semibold">Evaluatie<input type="date" value={evaluatie} onChange={(e) => setEvaluatie(e.target.value)} className={`${veld} mt-1 px-2`}/></label>
            </div>) : null}
          {modus === "actie" || modus === "veilig" ? <label className="block text-xs font-semibold">Bijlage (optioneel)<input value={bijlage} onChange={(e) => setBijlage(e.target.value)} placeholder="Naam van het bestand" className={`${veld} mt-1`}/></label> : null}
          {modus === "gezamenlijk" ? (<label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={versturen} onChange={(e) => setVersturen(e.target.checked)} className="size-4 accent-[var(--brand)]"/>Ter bevestiging naar beide ouders sturen</label>) : null}

          {modus === "journaal" || modus === "veilig" ? (<fieldset>
              <legend className="text-xs font-semibold">Wie mag dit zien?</legend>
              <div className="mt-1 divide-y divide-border border-y border-border">
                {Object.keys(zichtLabel).map((z) => (<label key={z} className="flex items-center gap-3 py-2.5 text-sm">
                    <input type="radio" name="zicht" checked={zicht === z} onChange={() => setZicht(z)} className="accent-[var(--brand)]"/>
                    {z === "ouders" ? "Delen met beide ouders" : zichtLabel[z]}
                  </label>))}
              </div>
              {zicht === "aangepast" ? (<div className="mt-2 flex flex-wrap gap-1.5">{[...ouders, "Professionals met toegang"].map((o) => <button key={o} onClick={() => setZichtVoor((l) => toggle(l, o))} className={chip(zichtVoor.includes(o))}>{o}</button>)}</div>) : null}
              <p className="mt-2 text-xs" aria-live="polite">
                {!zicht ? "Kies eerst wie dit mag zien. Er is geen standaard." : zicht === "ouders" ? "Beide ouders kunnen dit lezen." : zicht === "professionals" ? "Ouders zien dit niet." : zichtVoor.length ? `Zichtbaar voor: ${zichtVoor.join(", ")}.` : "Kies wie dit mag zien."}
              </p>
            </fieldset>) : null}
          {modus === "notitie" || modus === "overig" ? <p className="flex items-center gap-1.5 text-xs text-ink-soft"><Lock className="size-3.5"/>Interne notitie. Ouders zien dit nooit; het kan niet via Berichten worden verstuurd.</p> : null}
          {modus === "actie" ? <p className="flex items-center gap-1.5 text-xs text-ink-soft"><MessageSquareText className="size-3.5"/>Verschijnt bij de gekozen ouder(s) onder “Nog even naar kijken”.</p> : null}

          <button disabled={!kan} onClick={opslaan} className="w-full rounded-md bg-brand py-3 text-sm font-semibold text-primary-foreground disabled:opacity-40">
            {modus === "bericht" ? (aan ? `Versturen aan ${aan.toLowerCase()}` : "Versturen") : modus === "journaal" && zicht ? `Opslaan · ${zicht === "ouders" ? "gedeeld met ouders" : zicht === "professionals" ? "alleen professionals" : "aangepast"}` : "Opslaan"}
          </button>
        </div>
      </SheetContent>
    </Sheet>);
}
