import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { datumKort, duurBetrokkenheid, trekToegangIn, vandaagIso } from "@/lib/pro-journaal-store";
const veld = "mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm";
const datum = (iso) => new Date(iso).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
export function BetrokkenheidAfsluiten({ professional, gezin, doelen, onSluit, onBeeindig }) {
    const [eind, setEind] = useState(vandaagIso);
    const [reden, setReden] = useState("");
    const [bereikt, setBereikt] = useState("");
    const [waarom, setWaarom] = useState("");
    const [anders, setAnders] = useState("");
    const [vervolg, setVervolg] = useState("");
    const [samenvatting, setSamenvatting] = useState(null);
    const [gecontroleerd, setGecontroleerd] = useState(false);
    const [fout, setFout] = useState("");
    const duur = duurBetrokkenheid(professional.start, eind);
    const geldig = duurBetrokkenheid(eind, vandaagIso()) !== undefined && (!professional.start || duur !== undefined);
    const kan = geldig && reden.trim() && bereikt.trim() && waarom && (waarom !== "Anders" || anders.trim());
    const controleren = () => {
        setSamenvatting([
            `${gezin} · ${professional.naam}`,
            `Betrokkenheid: ${professional.start ? datum(professional.start) : "startdatum niet vastgelegd"} tot ${datum(eind)}${duur !== undefined ? ` (${duur} dagen)` : ""}.`,
            `Reden van betrokkenheid:\n${reden.trim()}`,
            `Bereikt of veranderd tijdens de begeleiding:\n${bereikt.trim()}`,
            `Reden van beëindiging:\n${waarom === "Anders" ? anders.trim() : waarom}`,
            ...(vervolg.trim() ? [`Aandachtspunten, openstaande afspraken of vervolgstappen:\n${vervolg.trim()}`] : []),
            ...(doelen.length ? [`Vastgelegde begeleidingsdoelen (status zoals geregistreerd):\n${doelen.map((d) => `- ${d.tekst} · ${d.status}`).join("\n")}`] : []),
        ].join("\n\n"));
        setGecontroleerd(false);
    };
    const opslaan = () => {
        if (!samenvatting?.trim() || !gecontroleerd || !geldig)
            return;
        try {
            trekToegangIn(professional.id, { eind, samenvatting });
            onBeeindig();
        }
        catch {
            setFout("Controleer de einddatum en samenvatting.");
        }
    };
    return <Sheet open onOpenChange={(open) => { if (!open)
        onSluit(); }}>
    <SheetContent side="bottom" className="inset-x-0 mx-auto w-full max-w-md pro-cockpit max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-t-2xl bg-background p-5">
      <SheetHeader className="pr-8 text-left"><SheetTitle className="font-display text-xl">Mijn betrokkenheid beëindigen</SheetTitle><SheetDescription>{gezin} · {professional.naam}</SheetDescription></SheetHeader>
      <p className="mt-3 text-xs text-ink-soft">Intern · niet gedeeld met ouders. Afzonderlijk delen vraagt een bewuste keuze via de bestaande mogelijkheden en rechten.</p>
      {samenvatting === null ? <form className="mt-4 space-y-3" onSubmit={(e) => { e.preventDefault(); if (kan)
            controleren(); }}>
        <dl className="grid grid-cols-2 gap-3 text-sm"><div><dt className="text-xs text-ink-soft">Startdatum betrokkenheid</dt><dd>{professional.start ? datum(professional.start) : "Niet vastgelegd"}</dd></div><div><dt className="text-xs text-ink-soft">Duur betrokkenheid</dt><dd aria-live="polite">{duur === undefined ? "Niet te berekenen" : `${duur} dagen`}</dd></div></dl>
        <label className="block text-sm font-semibold">Einddatum<input type="date" required min={professional.start || undefined} max={vandaagIso()} value={eind} onChange={(e) => setEind(e.target.value)} className={veld}/></label>
        {!geldig && <p role="alert" className="text-sm text-ink-soft">Kies een einddatum vanaf de startdatum tot en met vandaag.</p>}
        <label className="block text-sm font-semibold">Wat was de reden van betrokkenheid?<textarea required rows={2} value={reden} onChange={(e) => setReden(e.target.value)} className={veld}/></label>
        <label className="block text-sm font-semibold">Wat is er tijdens de begeleiding bereikt of veranderd?<textarea required rows={2} value={bereikt} onChange={(e) => setBereikt(e.target.value)} className={veld}/></label>
        <label className="block text-sm font-semibold">Waarom wordt de betrokkenheid beëindigd?<select required value={waarom} onChange={(e) => setWaarom(e.target.value)} className={veld}><option value="">Kies een reden</option>{["Begeleiding afgerond", "Ouders gaan zelfstandig verder", "Overdracht naar een andere professional", "Op verzoek van ouders", "Anders"].map((r) => <option key={r}>{r}</option>)}</select></label>
        {waarom === "Anders" && <label className="block text-sm font-semibold">Andere reden<input required value={anders} onChange={(e) => setAnders(e.target.value)} className={veld}/></label>}
        <label className="block text-sm font-semibold">Aandachtspunten, openstaande afspraken of vervolgstappen (optioneel)<textarea rows={2} value={vervolg} onChange={(e) => setVervolg(e.target.value)} className={veld}/></label>
        <div className="flex flex-wrap gap-2"><Button type="submit" disabled={!kan}>Samenvatting controleren</Button><Button type="button" variant="ghost" onClick={onSluit}>Annuleren</Button></div>
      </form> : <div className="mt-4 space-y-3">
        <label className="block text-sm font-semibold">Afsluitsamenvatting<textarea rows={12} value={samenvatting} onChange={(e) => { setSamenvatting(e.target.value); setGecontroleerd(false); }} className={veld}/></label>
        <p className="text-xs text-ink-soft">Je toegang tot gezinsgegevens stopt direct. De dossiergeschiedenis blijft behouden; jouw interne afsluitsamenvatting blijft bij Afgesloten terug te vinden.</p>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={gecontroleerd} onChange={(e) => setGecontroleerd(e.target.checked)} className="mt-1"/>Ik heb de samenvatting gecontroleerd en bevestig de afsluiting.</label>
        {fout && <p role="alert">{fout}</p>}
        <div className="flex flex-wrap gap-2"><Button disabled={!gecontroleerd || !samenvatting.trim()} onClick={opslaan}>Definitief beëindigen</Button><Button variant="outline" onClick={() => setSamenvatting(null)}>Antwoorden aanpassen</Button><Button variant="ghost" onClick={onSluit}>Annuleren</Button></div>
      </div>}
    </SheetContent>
  </Sheet>;
}
export function InterneAfsluiting({ professional }) {
    if (!professional.afsluiting)
        return null;
    return <details className="mt-3 border-t border-border pt-3"><summary className="cursor-pointer text-sm font-semibold">Afsluitsamenvatting · {datumKort(professional.afsluiting.eind)}</summary><p className="mt-2 text-xs text-ink-soft">{professional.naam} · Intern, niet gedeeld met ouders</p><p className="mt-2 whitespace-pre-wrap text-sm">{professional.afsluiting.samenvatting}</p></details>;
}
