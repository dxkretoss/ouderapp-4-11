import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "./ui/sheet";
import { Button } from "./ui/button";
import { CoBadge } from "./CoBadge";
import { CoPrivacy } from "./CoPrivacy";
import { HulpKaart } from "./Onveilig";
import { praatVerhaal } from "@/lib/verhaal.functions";
import { coachBericht } from "@/lib/coach.functions";
import { gesprekken, afspraken } from "@/lib/demo-data";
import { useAfspraken } from "@/lib/afspraken-store";
import { useVakanties } from "@/lib/vakantie-store";
import { bouwVerhaalContext, zorgSignaal } from "@/lib/verhaal";
import { conceptBruikbaar, meedenkKeuzes, overnameKeuze, voorbeeldContext } from "@/lib/meedenken";
export function EvenMeedenken({ gesprekId, eigen, huidigConcept, onOvernemen }) {
    const praat = useServerFn(praatVerhaal);
    const coach = useServerFn(coachBericht);
    const afspraakBron = useAfspraken();
    const vakanties = useVakanties();
    const [open, setOpen] = useState(false);
    const [keuze, setKeuze] = useState(null);
    const [toestemming, setToestemming] = useState(null);
    const [gegevens, setGegevens] = useState(false);
    const [invoer, setInvoer] = useState("");
    const [sessie, setSessie] = useState([]);
    const [concept, setConcept] = useState("");
    const [origineel, setOrigineel] = useState("");
    const [vervangen, setVervangen] = useState(false);
    const [bezig, setBezig] = useState(false);
    const [fout, setFout] = useState("");
    const [zorg, setZorg] = useState(false);
    const [variant, setVariant] = useState(0);
    const verzoek = useRef(0);
    const slot = useRef(false);
    const voorbeeld = gesprekken.find((g) => g.id === gesprekId);
    const context = voorbeeldContext(voorbeeld?.berichten ?? [], toestemming === true, eigen);
    const sluit = () => {
        verzoek.current++;
        slot.current = false;
        setBezig(false);
        setOpen(false);
        setSessie([]);
        setConcept("");
        setInvoer("");
        setToestemming(null);
        setGegevens(false);
        setKeuze(null);
        setFout("");
        setZorg(false);
        setVervangen(false);
    };
    const stuur = async (tekst = invoer, andereVariant = false) => {
        const t = tekst.trim();
        if (!t || slot.current || eigen)
            return;
        slot.current = true;
        const nummer = ++verzoek.current;
        const nieuw = andereVariant ? sessie : [...sessie, { rol: "ouder", tekst: t }];
        if (!andereVariant) {
            setSessie(nieuw);
            setInvoer("");
        }
        setBezig(true);
        setFout("");
        setConcept("");
        setVervangen(false);
        if (zorgSignaal(t))
            setZorg(true);
        try {
            if (keuze === "Reactie opstellen") {
                const v = andereVariant ? variant + 1 : 0;
                setVariant(v);
                setOrigineel(t);
                const r = await coach({ data: { tekst: t, stijl: andereVariant ? "Neutraler" : "Rustiger", variant: v, context } });
                if (nummer !== verzoek.current)
                    return;
                if (r.niveau === "dreigend")
                    setZorg(true);
                const passend = conceptBruikbaar(r.voorstel) ? r.voorstel : r.niveau === "geen" && !r.nieuweDetails?.length && conceptBruikbaar(t) ? t : "";
                setConcept(passend);
                setSessie((s) => [...s, { rol: "ai", tekst: passend ? "Hier is een concept. Controleer of het zegt wat jij wilt overbrengen." : "Er is geen passend concept. Je eigen tekst blijft behouden." }]);
            }
            else {
                const feiten = gegevens ? bouwVerhaalContext({ vakanties, voorstellen: afspraakBron.filter((a) => a.voorstel).map((a) => ({ titel: a.titel, status: `voorstel, nog geen akkoord: ${a.voorstel?.tekst ?? a.tekst}` })), taken: [], afspraken: afspraakBron.filter((a) => a.status === "Actief" && !a.veiligheid && !a.bron).map((a) => ({ titel: a.titel, tekst: a.tekst })) }, ["vakanties", "voorstellen", "afspraken"]) + "\nVOORBEELDAGENDA (gepland is geen akkoord over aanwezigheid):\n" + afspraken.map((a) => `${a.titel}: ${a.datumLabel}, ${a.tijd} uur; aanwezigheid onbekend`).join("\n") : "";
                const r = await praat({ data: { modus: keuze === "Gesprek begrijpen" || keuze === "Wat is afgesproken?" ? "overzicht" : "praten", context: ["Alle gegevens zijn fictief. Bepaal geen verborgen intenties. Noem concrete vragen en onduidelijkheden; geef geen ongevraagde oplossingen bij ventileren.", context.length ? "Geselecteerd voorbeeldgesprek:\n" + context.map((b) => `${b.van === "ik" ? "Ik" : "Andere ouder"}: ${b.tekst}`).join("\n") : "Geen toestemming voor gespreksberichten.", feiten].join("\n\n").slice(0, 6000), berichten: nieuw.slice(-12).map(({ rol, tekst }) => ({ rol, tekst })) } });
                if (nummer !== verzoek.current)
                    return;
                setSessie((s) => [...s, { rol: "ai", tekst: r.antwoord }]);
            }
        }
        catch (e) {
            if (nummer === verzoek.current) {
                setFout(e instanceof Error ? e.message : "Co is even niet bereikbaar.");
                setInvoer(t);
            }
        }
        finally {
            if (nummer === verzoek.current) {
                slot.current = false;
                setBezig(false);
            }
        }
    };
    const overnemen = (bevestigd = false) => {
        const tekst = overnameKeuze(huidigConcept, concept, bevestigd);
        if (tekst === null) {
            setVervangen(true);
            return;
        }
        onOvernemen(tekst);
        sluit();
    };
    return <>
    <Button variant="link" className="mt-2 min-h-11 p-0 text-sm" onClick={() => setOpen(true)}><CoBadge maat="sm"/>Even sparren met Co?</Button>
    <Sheet open={open} onOpenChange={(v) => { if (!v)
        sluit(); }}>
      <SheetContent side="bottom" className="flex h-[92dvh] max-h-[900px] flex-col rounded-t-lg border-ai-reply bg-ai-space p-4 text-ai-ink sm:inset-x-auto sm:left-1/2 sm:w-full sm:max-w-xl sm:-translate-x-1/2">
        <SheetHeader className="shrink-0 pr-10 text-left">
          <SheetTitle className="flex items-center gap-2 text-ai-ink"><CoBadge maat="sm"/>Even sparren met Co?</SheetTitle>
          <SheetDescription className="text-ai-soft">Co is je digitale meedenker. Een moment voor jezelf, voordat je reageert.</SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain pr-1">
          <div className="rounded-md bg-background px-3 text-foreground"><CoPrivacy /></div>
          <p className="text-xs text-ai-soft">Privé-hulp van Co · voorbeeldfunctie. Niets wordt naar de andere ouder verstuurd. Privacycontrole voor echte gezinsgegevens is nog nodig.</p>
          {eigen ? <p className="text-sm">Co met echte gezinsgegevens is nog niet beschikbaar. Je eigen concept blijft behouden.</p> : <>
            {!keuze ? <div><p className="mb-2 text-sm text-ai-soft">Soms wil je even je verhaal kwijt, je gedachten ordenen of hulp bij het formuleren van een bericht. Co denkt met je mee, zodat jij zelf kunt bepalen wat je wilt doen.</p><p className="mb-2 font-semibold">Waar kan Co je mee helpen?</p><div className="grid grid-cols-2 gap-2">{meedenkKeuzes.map((k) => <Button key={k} variant="ghost" className="h-auto min-h-11 whitespace-normal border border-ai-soft/40 bg-ai-reply text-ai-ink hover:bg-ai-soft hover:text-ai-space" onClick={() => { setKeuze(k); setConcept(""); }}>{k}</Button>)}</div></div> : <div className="flex items-center justify-between gap-2"><span className="text-sm font-semibold">{keuze}</span><Button variant="ghost" size="sm" className="text-ai-soft hover:text-ai-space" onClick={() => { setKeuze(null); setConcept(""); }}>Andere keuze</Button></div>}
            {toestemming === null ? <div className="space-y-2 border-y border-ai-soft/30 py-3"><p className="font-semibold">Mag ik dit gesprek meenemen?</p><p className="text-sm text-ai-soft">Maximaal zes recente fictieve voorbeeldberichten. De geselecteerde berichten worden verwerkt door de AI-dienst.</p><details className="text-sm"><summary className="cursor-pointer">Bekijk geselecteerde berichten</summary>{voorbeeld?.berichten.slice(-6).map((b) => <p key={b.id} className="mt-2">{b.van === "sanne" ? "Jij" : "Andere ouder"}: {b.tekst}</p>)}</details><div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={() => setToestemming(true)}>Ja, gebruik dit gesprek</Button><Button variant="ghost" className="text-ai-ink hover:text-ai-space" onClick={() => setToestemming(false)}>Nee, zonder berichten</Button></div></div> : <div className="flex items-start justify-between gap-2 text-xs text-ai-soft"><span>{toestemming ? `${context.length} fictieve voorbeeldberichten geselecteerd.` : "Geen gespreksberichten meegenomen."}</span><Button variant="ghost" size="sm" className="h-auto p-0 text-ai-soft hover:bg-transparent hover:text-ai-ink" onClick={() => { verzoek.current++; slot.current = false; setBezig(false); setToestemming(null); setSessie([]); setConcept(""); }}>Wijzigen</Button></div>}
            {keuze === "Wat is afgesproken?" ? <label className="flex items-start gap-2 text-sm text-ai-soft"><input type="checkbox" checked={gegevens} onChange={(e) => { setGegevens(e.target.checked); setSessie([]); setConcept(""); }} className="mt-1"/>Gebruik fictieve afspraken, vakantieplanning en agenda</label> : null}
            <div role="log" aria-live="polite" className="space-y-3">{sessie.map((b, i) => <div key={i} className={b.rol === "ouder" ? "ml-8 rounded-md bg-ai-ink px-3 py-2 text-ai-space" : "mr-4 rounded-md bg-ai-reply px-3 py-2 text-ai-ink"}><p className="mb-1 text-xs font-semibold">{b.rol === "ouder" ? "Jij aan Co" : "Co"}</p><p className="whitespace-pre-wrap break-words text-sm">{b.tekst}</p></div>)}</div>
            {bezig ? <p role="status" className="text-sm text-ai-soft">Even nadenken…</p> : null}
            {fout ? <p role="alert" className="text-sm">{fout} Je tekst staat opnieuw in het invoerveld.</p> : null}
            {concept ? <div className="space-y-3 border-t border-ai-soft/30 pt-3"><p className="text-xs font-semibold">Concept voor de andere ouder · nog niet verstuurd</p><p className="whitespace-pre-wrap rounded-md bg-ai-ink p-3 text-sm text-ai-space">{concept}</p><div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={() => overnemen()}>Gebruik dit antwoord</Button><Button variant="ghost" disabled={bezig} className="text-ai-ink hover:text-ai-space" onClick={() => void stuur(origineel, true)}>Ander voorstel</Button><Button variant="ghost" className="text-ai-ink hover:text-ai-space" onClick={() => { setConcept(""); setInvoer(origineel); }}>Terug naar mijn tekst</Button></div>{vervangen ? <div role="alert" className="space-y-2"><p className="text-sm">Er staat al tekst in je berichtveld. Wil je die bewust vervangen?</p><p className="text-sm text-ai-soft">{huidigConcept}</p><Button variant="secondary" onClick={() => overnemen(true)}>Ja, vervang mijn concept</Button><Button variant="ghost" className="text-ai-ink hover:text-ai-space" onClick={() => setVervangen(false)}>Behouden</Button></div> : null}</div> : null}
            {gegevens && keuze === "Wat is afgesproken?" ? <div className="flex flex-wrap gap-3 text-xs text-ai-soft"><Link to="/afspraken" onClick={sluit} className="underline">Bekijk afspraken</Link><Link to="/agenda" onClick={sluit} className="underline">Bekijk agenda</Link><Link to="/planning" onClick={sluit} className="underline">Bekijk vakantieplanning</Link></div> : null}
          </>}
          {zorg || zorgSignaal(invoer) ? <div className="rounded-md bg-card p-3 text-ink"><p className="mb-2 text-sm">Deze app is geen crisisdienst. Bij direct gevaar: 112. Bij gedachten aan zelfdoding: <a href="tel:08000113" className="underline">113 · 0800-0113</a>.</p><HulpKaart /></div> : null}
        </div>
        {!eigen ? <form className="shrink-0 space-y-2 border-t border-ai-soft/30 pt-3" onSubmit={(e) => { e.preventDefault(); void stuur(); }}><label htmlFor="meedenken-invoer" className="text-sm font-semibold">Jouw bericht aan Co</label><textarea id="meedenken-invoer" rows={2} maxLength={3000} value={invoer} onChange={(e) => setInvoer(e.target.value)} placeholder={keuze === "Reactie opstellen" ? "Wat wil jij zeggen? Gebruik alleen fictieve gegevens…" : "Vertel of vraag iets met fictieve gegevens…"} className="w-full resize-none rounded-md bg-ai-ink p-3 text-base text-ai-space outline-none focus-visible:ring-2 focus-visible:ring-ai-soft"/><div className="flex items-center justify-between gap-2"><Button variant="ghost" className="min-h-11 text-ai-ink hover:text-ai-space" onClick={sluit}>Terug naar gesprek</Button><Button type="submit" variant="secondary" className="min-h-11" disabled={!invoer.trim() || bezig}>Vraag het Co</Button></div><p className="text-xs text-ai-soft">Alleen fictieve gegevens. AI-tekst wordt voor het antwoord verwerkt, niet in de app bewaard.</p></form> : <Button variant="secondary" className="min-h-11" onClick={sluit}>Terug naar gesprek</Button>}
      </SheetContent>
    </Sheet>
  </>;
}
