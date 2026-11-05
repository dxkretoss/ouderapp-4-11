import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AppIcon } from "@/components/AppIcon";
import { useStart, start } from "@/lib/start-store";
import { kinderen as demoKinderen } from "@/lib/demo-data";
import { useVakanties, voegVakantieVoorstelToe, wijzigVakantieVoorstel } from "@/lib/vakantie-store";
import { dagenVoorJaar } from "@/lib/bijzondere-dagen";
import { useRegio, zetRegio, vakantiesVoor, regioLabel } from "@/lib/schoolvakanties";
import { bevestig } from "@/lib/feedback";
import { VerdeelHulp } from "@/components/VerdeelHulp";
import { plusDagen } from "@/lib/agenda-datum";
export const REIS_BRON = "https://www.rijksoverheid.nl/documenten/2014/02/06/formulier-toestemming-reizen-met-minderjarige-naar-het-buitenland";
export function Reistoestemming({ vakantie }) {
    const [open, setOpen] = useState(false);
    return <section className="border-y border-border py-3"><Button variant="ghost" className="h-auto min-h-11 w-full justify-start whitespace-normal px-0" onClick={() => setOpen(!open)}><AppIcon functie="reis" vorm="kaal"/>Toestemming buitenland regelen</Button>{open ? <div className="space-y-3 text-sm"><p>Vakantie afgesproken is iets anders dan reistoestemming geregeld. Akkoord in de app is geen ondertekende reistoestemming.</p><dl className="divide-y divide-border"><div className="py-2"><dt className="text-ink-soft">Controleer de reisgegevens</dt><dd>{vakantie.vanDatum ?? vakantie.periode}{vakantie.totDatum ? ` t/m ${vakantie.totDatum}` : ""} · {vakantie.bestemming || "Bestemming nog controleren"}</dd></div></dl><ul className="list-disc space-y-1 pl-5 text-ink-soft"><li>Geldig paspoort of ID van ieder kind en de reizende ouder.</li><li>Controleer wie gezag heeft en welke toestemming of bewijsstukken nodig zijn.</li><li>Officieel formulier controleren, printen en laten ondertekenen als dat nodig is.</li><li>Controleer ook de regels van het bestemmingsland.</li></ul><Button asChild variant="outline" className="h-auto min-h-11 whitespace-normal"><a href={REIS_BRON} target="_blank" rel="noreferrer"><AppIcon functie="documenten" vorm="kaal"/>Officieel formulier en uitleg</a></Button><p className="text-xs text-ink-soft">Het officiële PDF-formulier download je bij Rijksoverheid. De app controleert geen gezag of handtekeningen en bewaart geen paspoortgegevens.</p></div> : null}</section>;
}
const label = (o) => o === "Sanne" ? "Bij jou" : o === "Joris" ? "Bij de andere ouder" : o === "Samen" ? "Samen" : "Nog niet geregeld";
const invoer = "mt-1 min-h-11 w-full min-w-0 rounded-md border border-border bg-card px-3 py-2 text-sm";
export function AgendaVakanties({ toevoegen, onVerwerkt }) {
    const st = useStart(), regio = useRegio(), vak = useVakanties();
    const [tab, setTab] = useState("vakantie");
    const [jaar, setJaar] = useState(2026);
    const [formulier, setFormulier] = useState(null);
    useEffect(() => { if (toevoegen) {
        setTab(toevoegen);
        setFormulier({ soort: toevoegen });
        onVerwerkt?.();
    } }, [toevoegen]);
    const profielen = st.eigen ? st.kinderen : demoKinderen;
    const [kind, setKind] = useState("alle");
    const geselecteerd = profielen.filter((k) => kind === "alle" || kind === k.id);
    const schooljaar = `${jaar}-${jaar + 1}`;
    const school = geselecteerd.flatMap((k) => vakantiesVoor("schoolRegio" in k && k.schoolRegio ? k.schoolRegio : regio).filter((v) => v.schooljaar === schooljaar).map((v) => ({ ...v, kind: k.naam })));
    const schoolGroepen = [...new Set(school.map((v) => `${v.naam}|${v.van}|${v.tot}`))].flatMap((key) => { const groep = school.filter((v) => `${v.naam}|${v.van}|${v.tot}` === key); const eerste = groep[0]; return eerste ? [{ ...eerste, namen: groep.map((v) => v.kind).join(" & ") }] : []; });
    const maanden = { januari: "01", februari: "02", maart: "03", april: "04", mei: "05", juni: "06", juli: "07", augustus: "08", september: "09", oktober: "10", november: "11", december: "12" };
    const verjaardag = (datum) => { if (!datum)
        return undefined; if (/^\d{4}-\d{2}-\d{2}$/.test(datum))
        return `${jaar}${datum.slice(4)}`; const [d, m] = datum.split(" "); return d && m && maanden[m] ? `${jaar}-${maanden[m]}-${d.padStart(2, "0")}` : undefined; };
    const dagen = [...dagenVoorJaar(jaar), ...geselecteerd.flatMap((k) => { const datum = verjaardag(k.geboortedatum); return datum ? [{ datum, naam: `Verjaardag ${k.naam}`, soort: "bijzonder" }] : []; })].sort((a, b) => a.datum.localeCompare(b.datum));
    const lijst = st.eigen ? [] : vak.filter((v) => (v.soort ?? (/pasen|kerst$/i.test(v.naam) ? "bijzonder" : "vakantie")) === tab && (kind === "alle" || !v.kinderen || v.kinderen.includes(kind)));
    return <div className="mt-4">
    <div className="flex border-b border-border" role="tablist" aria-label="Vakanties en bijzondere dagen">{[['vakantie', 'Vakanties'], ['bijzonder', 'Bijzondere dagen']].map(([id, tekst]) => <Button key={id} role="tab" aria-selected={tab === id} variant="ghost" className={`min-h-11 flex-1 rounded-none ${tab === id ? "border-b-2 border-brand text-brand" : "text-ink-soft"}`} onClick={() => setTab(id)}>{tekst}</Button>)}</div>
    <div className="my-3 flex flex-wrap items-center justify-between gap-2"><h2 className="font-display text-lg">{tab === "vakantie" ? "Jullie vakanties" : "Jullie bijzondere dagen"}</h2><Button variant="outline" className="h-auto min-h-11 whitespace-normal" onClick={() => setFormulier({ soort: tab })}><AppIcon functie="toevoegen" vorm="kaal"/>{tab === "vakantie" ? "Vakantie voorstellen" : "Bijzondere dag verdelen"}</Button></div>
    <div className="flex flex-wrap gap-1" aria-label="Kinderen kiezen">{[{ id: "alle", naam: "Alle kinderen" }, ...profielen].map((k) => <Button key={k.id} size="sm" variant={kind === k.id ? "default" : "ghost"} className="min-h-11" onClick={() => setKind(k.id)}>{k.naam}</Button>)}</div>
    {lijst.length ? <div className="my-3 divide-y divide-border border-y border-border">{lijst.map((v) => <Link key={v.id} to="/vakantie/$id" params={{ id: v.id }} className="flex min-h-11 items-center justify-between gap-2 py-3"><span className="min-w-0"><span className="block font-semibold">{v.naam}</span><span className="block text-xs text-ink-soft">{v.periode} · {v.status === "afgesproken" ? "Afgesproken" : v.status === "ingetrokken" ? "Ingetrokken" : v.reactie === "niet-akkoord" ? "Niet akkoord" : v.status === "voorstel" ? v.van === "Sanne" ? "Wacht op reactie van de andere ouder" : "Jouw reactie nodig" : "Nog niet geregeld"}</span></span><span className="text-xs text-brand">{label(v.ouder)} ›</span></Link>)}</div> : <p className="my-3 text-sm text-ink-soft">Nog geen aparte afspraken. De gewone verdeling geldt.</p>}
    {!st.eigen && tab === "vakantie" ? <details className="my-3"><summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold text-brand">Samen een verdeling bekijken</summary><VerdeelHulp /></details> : null}
    <div className="mt-5 flex items-center justify-between gap-2"><h3 className="font-display">{tab === "vakantie" ? "Schoolvakanties" : "Op de kalender"}</h3><select aria-label={tab === "vakantie" ? "Schooljaar" : "Jaar"} value={jaar} onChange={(e) => setJaar(Number(e.target.value))} className="min-h-11 rounded-md border border-border bg-card px-2 text-sm">{[2025, 2026, 2027, 2028].map((j) => <option key={j} value={j}>{tab === "vakantie" ? `${j}–${j + 1}` : j}</option>)}</select></div>
    {tab === "vakantie" ? <><div className="my-3 space-y-2">{geselecteerd.map((k) => <label key={k.id} className="flex items-center justify-between gap-3 text-sm"><span>{k.naam} · schoolregio</span><select aria-label={`Schoolregio ${k.naam}`} value={"schoolRegio" in k && k.schoolRegio ? k.schoolRegio : regio} className="min-h-11 rounded-md border border-border bg-card px-2" onChange={(e) => st.eigen ? start.zetKindRegio(k.id, e.target.value) : zetRegio(e.target.value)}>{Object.entries(regioLabel).map(([r, l]) => <option key={r} value={r}>{l}</option>)}</select></label>)}</div><p className="text-xs text-ink-soft">Dit zijn kalenderdata, geen aparte zorgafspraken. Controleer de schoolkalender, vooral bij adviesdata.</p>{!schoolGroepen.length ? <p className="mt-3 text-sm text-ink-soft">Voor dit schooljaar zijn nog geen gecontroleerde data beschikbaar. <a className="text-brand underline" href="https://www.rijksoverheid.nl/onderwerpen/schoolvakanties" target="_blank" rel="noreferrer">Bekijk de officiële bron</a>.</p> : null}<div className="mt-2 divide-y divide-border">{schoolGroepen.map((v) => <div key={v.naam + v.van} className="py-3"><p className="text-sm font-semibold">{v.naam} · {v.namen}</p><p className="text-xs text-ink-soft">{v.van} t/m {v.tot} · {v.advies ? "Adviesdata" : "Vastgestelde data"}</p><div className="flex flex-wrap gap-3"><Button variant="link" className="min-h-11 px-0 text-xs" onClick={() => setFormulier({ soort: "vakantie", naam: v.naam, van: v.van, tot: v.tot })}>Verdeling voorstellen</Button><a className="inline-flex min-h-11 items-center text-xs text-brand underline" href={v.bron} target="_blank" rel="noreferrer">Rijksoverheid</a></div></div>)}</div><Button asChild variant="ghost" className="mt-2 h-auto min-h-11 whitespace-normal"><Link to="/agenda" search={{ nieuw: true, categorie: "school", titel: "Afwijkende schooldag" }}>Studiedag of afwijkende schooldag toevoegen</Link></Button></> : <><p className="mt-2 text-xs text-ink-soft">Geen aparte afspraak. De gewone verdeling geldt.</p><div className="mt-2 divide-y divide-border">{dagen.map((d) => <div key={d.datum + d.naam} className="flex items-center justify-between gap-2 py-2"><span className="min-w-0 text-sm">{d.naam}<span className="block text-xs text-ink-soft">{d.datum}</span></span><Button variant="link" className="h-auto min-h-11 max-w-32 whitespace-normal text-xs" onClick={() => setFormulier({ soort: "bijzonder", naam: d.naam, van: d.datum, tot: d.datum })}>Verdeling voorstellen</Button></div>)}</div></>}
    <Button asChild variant="link" className="mt-4 min-h-11 px-0 text-xs"><Link to="/planning" search={{ eerder: true }}>Eerdere planningsonderdelen bekijken</Link></Button>
    {formulier ? <VakantieFormulier init={formulier} onSluit={() => setFormulier(null)}/> : null}
  </div>;
}
export function VakantieFormulier({ init, bestaand, onSluit }) {
    const st = useStart();
    const profielen = st.eigen ? st.kinderen : demoKinderen;
    const [naam, setNaam] = useState(bestaand?.naam ?? init?.naam ?? "");
    const [van, setVan] = useState(bestaand?.vanDatum ?? init?.van ?? "");
    const [tot, setTot] = useState(bestaand?.totDatum ?? init?.tot ?? "");
    const [voor, setVoor] = useState(bestaand?.kinderen ?? profielen.map((k) => k.id));
    const [ouder, setOuder] = useState(bestaand?.ouder === "Joris" ? "Joris" : "Sanne");
    const [modus, setModus] = useState((bestaand?.verdeling?.length ?? 0) > 1 ? "zelf" : "hele");
    const [wisselDatum, setWisselDatum] = useState("");
    const [tijd, setTijd] = useState(bestaand?.verdeling?.[0]?.wisseltijd ?? "14:30");
    const [tijdVan, setTijdVan] = useState(bestaand?.verdeling?.[0]?.tijdVan ?? "00:00");
    const [tijdTot, setTijdTot] = useState(bestaand?.verdeling?.[0]?.tijdTot ?? "23:59");
    const [plek, setPlek] = useState(bestaand?.verdeling?.[0]?.plek ?? "");
    const [details, setDetails] = useState(bestaand?.details ?? "");
    const [herhaal, setHerhaal] = useState(bestaand?.herhaal ?? "eenmalig");
    const [buitenland, setBuitenland] = useState(bestaand?.buitenland ?? false);
    const [bestemming, setBestemming] = useState(bestaand?.bestemming ?? "");
    const [reactieDatum, setReactieDatum] = useState("");
    const [annuleren, setAnnuleren] = useState(false);
    const [delen, setDelen] = useState(bestaand?.verdeling ?? []);
    const [fout, setFout] = useState("");
    const soort = bestaand?.soort ?? init?.soort ?? "vakantie";
    const opslaan = () => {
        if (!van || !tot || tot < van || !voor.length || !naam.trim())
            return;
        const ander = ouder === "Sanne" ? "Joris" : "Sanne";
        let verdeling = [{ van, tot, ouder, plek, wisseltijd: tijd, tijdVan, tijdTot }];
        if (modus === "dag")
            verdeling = [{ van, tot: van, ouder, tijdVan, tijdTot: tijd, plek }, { van, tot: van, ouder: ander, tijdVan: tijd, tijdTot, plek }];
        if (modus === "feest")
            verdeling = [{ van, tot: van, ouder, plek }, { van: plusDagen(van, 1), tot: plusDagen(van, 1), ouder: ander, plek }];
        if (modus === "periode") {
            if (!wisselDatum || wisselDatum <= van || wisselDatum > tot) {
                setFout("Kies een wisseldatum binnen de periode, na de begindatum.");
                return;
            }
            verdeling = [{ van, tot: plusDagen(wisselDatum, -1), ouder, plek }, { van: wisselDatum, tot, ouder: ander, plek, wisseltijd: tijd }];
        }
        if (modus === "zelf") {
            if (!delen.length || delen.some((d) => d.van < van || d.tot > tot || d.tot < d.van)) {
                setFout("Controleer de datums van ieder deel.");
                return;
            }
            verdeling = delen;
        }
        const velden = { naam: naam.trim(), periode: `${van} t/m ${modus === "feest" ? plusDagen(van, 1) : tot}`, vanDatum: van, totDatum: modus === "feest" ? plusDagen(van, 1) : tot, kinderen: voor, ouder, details, soort, herhaal, verdeling, buitenland, bestemming, reactieDatum: reactieDatum || undefined, annuleren };
        if (bestaand ? !wijzigVakantieVoorstel(bestaand.id, velden) : !voegVakantieVoorstelToe(velden)) {
            setFout("Dit voorstel is al verwerkt. Open de afspraak opnieuw.");
            return;
        }
        bevestig("Voorstel verstuurd. De bestaande verdeling blijft gelden tot akkoord.");
        onSluit();
    };
    return <Sheet open onOpenChange={(o) => !o && onSluit()}><SheetContent side="bottom" className="left-1/2 max-h-[90vh] w-full max-w-md -translate-x-1/2 overflow-y-auto rounded-t-2xl bg-background px-5 pb-8"><SheetHeader><SheetTitle>{bestaand ? "Afspraak wijzigen" : soort === "vakantie" ? "Vakantie voorstellen" : "Bijzondere dag verdelen"}</SheetTitle><SheetDescription>De huidige verdeling blijft gelden totdat jullie akkoord zijn.</SheetDescription></SheetHeader><div className="mt-4 space-y-3">
    <label className="block text-sm">Naam<input value={naam} onChange={(e) => setNaam(e.target.value)} className={invoer}/></label>
    <fieldset><legend className="text-sm">Voor welke kinderen?</legend><div className="flex flex-wrap gap-1">{profielen.map((k) => <label key={k.id} className="flex min-h-11 items-center gap-2 pr-3 text-sm"><input type="checkbox" checked={voor.includes(k.id)} onChange={(e) => setVoor((l) => e.target.checked ? [...l, k.id] : l.filter((id) => id !== k.id))}/>{k.naam}</label>)}</div></fieldset>
    <div className="grid grid-cols-2 gap-2"><label className="min-w-0 text-sm">Begindatum<input type="date" value={van} onChange={(e) => { setVan(e.target.value); if (!tot || tot < e.target.value)
        setTot(e.target.value); }} className={invoer}/></label><label className="min-w-0 text-sm">Einddatum<input type="date" min={van} value={tot} onChange={(e) => setTot(e.target.value)} className={invoer}/></label></div>
    <label className="block text-sm">Hoe wil je verdelen?<select value={modus} onChange={(e) => setModus(e.target.value)} className={invoer}><option value="hele">Hele periode bij één ouder</option><option value="periode">Periode samen verdelen</option>{soort === "bijzonder" ? <><option value="dag">Dag samen verdelen</option><option value="feest">Eerste en tweede feestdag apart</option></> : null}<option value="zelf">Zelf verdeling maken</option></select></label>
    <label className="block text-sm">{modus === "hele" ? "Bij welke ouder?" : "Eerste deel bij"}<select value={ouder} onChange={(e) => setOuder(e.target.value)} className={invoer}><option value="Sanne">Bij jou</option><option value="Joris">Bij de andere ouder</option></select></label>
    {modus === "periode" ? <label className="block text-sm">Wisseldatum<input type="date" value={wisselDatum} min={van} max={tot} onChange={(e) => setWisselDatum(e.target.value)} className={invoer}/></label> : null}
    <div className="grid grid-cols-2 gap-2"><label className="min-w-0 text-sm">Begintijd<input type="time" value={tijdVan} onChange={(e) => setTijdVan(e.target.value)} className={invoer}/></label><label className="min-w-0 text-sm">Eindtijd<input type="time" value={tijdTot} onChange={(e) => setTijdTot(e.target.value)} className={invoer}/></label></div>
    <label className="block text-sm">Wisseltijd<input type="time" value={tijd} onChange={(e) => setTijd(e.target.value)} className={invoer}/></label><label className="block text-sm">Overdrachtslocatie<input value={plek} onChange={(e) => setPlek(e.target.value)} className={invoer}/></label>
    {modus === "zelf" ? <fieldset className="space-y-2"><legend className="text-sm">Jouw verdeling</legend>{delen.map((d, i) => <div key={i} className="grid grid-cols-2 gap-2 border-b border-border py-2"><input aria-label={`Begin deel ${i + 1}`} type="date" value={d.van} onChange={(e) => setDelen((l) => l.map((x, n) => n === i ? { ...x, van: e.target.value } : x))} className={invoer}/><input aria-label={`Einde deel ${i + 1}`} type="date" value={d.tot} onChange={(e) => setDelen((l) => l.map((x, n) => n === i ? { ...x, tot: e.target.value } : x))} className={invoer}/><select aria-label={`Ouder deel ${i + 1}`} value={d.ouder} onChange={(e) => setDelen((l) => l.map((x, n) => n === i ? { ...x, ouder: e.target.value } : x))} className={invoer}><option value="Sanne">Bij jou</option><option value="Joris">Bij de andere ouder</option></select><Button variant="ghost" aria-label={`Deel ${i + 1} verwijderen`} onClick={() => setDelen((l) => l.filter((_, n) => n !== i))}><AppIcon functie="niet" vorm="kaal"/></Button></div>)}<Button variant="outline" onClick={() => setDelen((l) => [...l, { van, tot, ouder, plek }])}><AppIcon functie="toevoegen" vorm="kaal"/>Deel toevoegen</Button></fieldset> : null}
    {soort === "bijzonder" ? <label className="block text-sm">Herhalen<select value={herhaal} onChange={(e) => setHerhaal(e.target.value)} className={invoer}><option value="eenmalig">Alleen dit jaar</option><option value="jaarlijks">Ieder jaar hetzelfde</option><option value="afwisselend">Ieder jaar afwisselen</option></select></label> : null}
    <label className="block text-sm">Wanneer wil je graag antwoord?<input type="date" value={reactieDatum} onChange={(e) => setReactieDatum(e.target.value)} className={invoer}/></label><p className="text-xs text-ink-soft">De andere ouder hoeft niet voor deze datum te reageren. De verdeling verandert pas als jullie akkoord zijn.</p>
    <label className="block text-sm">Toelichting<textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={2} className={invoer}/></label>
    <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={buitenland} onChange={(e) => setBuitenland(e.target.checked)}/>Reis naar het buitenland</label>{buitenland ? <><label className="block text-sm">Bestemming<input value={bestemming} onChange={(e) => setBestemming(e.target.value)} className={invoer}/></label><p className="text-xs text-ink-soft">Een vakantieafspraak is geen reistoestemming. Het officiële formulier regel je apart.</p></> : null}
    {bestaand ? <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={annuleren} onChange={(e) => setAnnuleren(e.target.checked)}/>Annulering voorstellen</label> : null}
    {st.eigen ? <p className="text-sm text-ink-soft">Een vakantievoorstel versturen kan zodra twee ouderaccounts veilig gekoppeld zijn. Er worden geen voorbeeldafspraken voor jouw gezin gebruikt.</p> : null}{fout ? <p role="alert" className="text-sm text-destructive">{fout}</p> : null}
    <Button onClick={opslaan} className="min-h-11 w-full" disabled={st.eigen || !naam.trim() || !van || !tot || tot < van || !voor.length}>Voorstel versturen</Button>
  </div></SheetContent></Sheet>;
}
