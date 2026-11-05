import { useState } from "react";
import { AppIcon } from "@/components/AppIcon";
import { Badge, FilterBalk } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
/**
 * Visual structure only. No parent content, AI metadata or derived pattern enters this
 * component until protected, consented sources exist. Every category shows "Nog niet beschikbaar".
 */
export const patroonCategorieen = [
    { titel: "Overdrachtsmomenten", vervolg: "Bespreek of een concretere overdrachtsafspraak helpend is." },
    { titel: "Zorgregeling en omgang", vervolg: "Overweeg de huidige zorgregeling gezamenlijk te evalueren." },
    { titel: "Kosten en financiële afspraken", vervolg: "Bekijk of de bestaande kostenafspraken voldoende duidelijk zijn." },
    { titel: "Communicatiedruk", vervolg: "Bespreek welke communicatieafspraken ouders kunnen helpen." },
    { titel: "Communicatie over het kind", vervolg: "Bespreek welke praktische afspraken rond het kind helpend zijn." },
];
const telsoorten = ["Berichten", "Vermeldingen", "Afzonderlijke onderwerpen", "Bevestigde gebeurtenissen"];
export function CommunicatiePatronen() {
    const [periode, setPeriode] = useState("30 dagen");
    const [open, setOpen] = useState(null);
    const [toestemming, setToestemming] = useState(false);
    return <section className="border-b border-border py-4" aria-label="Samenwerking & signalen">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="font-display text-lg">Samenwerking & signalen</h3>
      <Badge>Nog niet beschikbaar</Badge>
    </div>
    <FilterBalk doorlopen opties={["7 dagen", "30 dagen", "90 dagen"]} waarde={periode} onChange={setPeriode} className="mt-2"/>
    <p className="mt-3 text-sm text-ink-soft">Alleen een niet-functionele voorbeeldweergave. Er worden geen gezinsgegevens gelezen of cijfers berekend. Feitelijke signalen vragen altijd om context; veel berichten betekenen geen ruzie.</p>
    <dl className="mt-3 divide-y divide-border border-y border-border">
      {[
            ["Communicatievolume", "Aantal berichten en vergelijking met de vorige periode."],
            ["Wijzigingsvoorstellen", "Ingediend, goedgekeurd, afgewezen en openstaand."],
            ["Terugkerende knelpunten", "Herhaalde voorstellen binnen bestaande onderwerpen."],
            ["Openstaande afstemming", "Voorstellen die wachten op reactie en hun looptijd."],
            ["Gebruik van Co", "Niet gedeeld. Afzonderlijke geldige toestemming en waarborgen zijn vereist."],
        ].map(([titel, uitleg]) => <div key={titel} className="py-3"><dt className="text-sm font-semibold">{titel}</dt><dd className="mt-1 text-sm text-ink-soft">{uitleg} <span className="block">Nog niet beschikbaar · {periode}</span></dd></div>)}
    </dl>
    <h4 className="mt-4 font-display font-semibold">Mogelijke aandachtspunten</h4>
    <p className="mt-1 text-sm text-ink-soft">Nog niet beschikbaar. Geen diagnoses, risicoscores of automatische oordelen. Privégesprekken met Co worden niet gedeeld en gebruiksfrequentie is geen zelfstandig conflictsignaal.</p>
    <h4 className="mt-4 font-display font-semibold">Communicatiepatronen</h4>
    <p className="mt-3 flex items-start gap-2 text-sm text-ink-soft"><AppIcon functie="slot" vorm="kaal" maat="sm"/><span>Onvoldoende informatie om een betrouwbaar patroon vast te stellen. Er is geen toestemming voor AI-analyse en er wordt niets op de achtergrond geanalyseerd.</span></p>
    <div className="mt-3 divide-y divide-border">
      {patroonCategorieen.map((c) => <Button variant="ghost" key={c.titel} onClick={() => setOpen(c)} className="flex h-auto min-h-11 w-full items-center justify-between gap-2 whitespace-normal px-0 py-3 text-left">
        <span className="min-w-0"><span className="block text-sm font-semibold">{c.titel}</span><span className="mt-0.5 block text-sm text-ink-soft">Nog niet beschikbaar · {periode}</span></span>
        <span aria-hidden className="text-ink-soft">›</span>
      </Button>)}
    </div>
    <Button variant="outline" className="mt-3 h-auto min-h-11 whitespace-normal" onClick={() => setToestemming(true)}><AppIcon functie="slot" vorm="kaal" maat="sm"/>AI-analyse van communicatiepatronen</Button>

    <Sheet open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
      <SheetContent side="bottom" className="pro-cockpit left-1/2 max-h-[85dvh] w-full max-w-lg -translate-x-1/2 overflow-y-auto bg-background">
        <SheetHeader><SheetTitle>{open?.titel}</SheetTitle><SheetDescription>Periode: {periode} · Nog niet beschikbaar</SheetDescription></SheetHeader>
        <div className="mt-4 space-y-3 text-sm">
          <p>Onvoldoende informatie om een betrouwbaar patroon vast te stellen.</p>
          <dl className="divide-y divide-border border-y border-border">
            {telsoorten.map((t) => <div key={t} className="flex justify-between py-2"><dt>{t}</dt><dd className="text-ink-soft">Onbekend</dd></div>)}
          </dl>
          <p className="text-ink-soft">Zodra dit beschikbaar is, blijven vermeldingen, besproken onderwerpen en bevestigde gebeurtenissen altijd apart. Een uitspraak van één ouder wordt nooit als feit getoond, en een afgewezen voorstel nooit als afspraak.</p>
          <p><span className="font-semibold">Wellicht een vervolgstap:</span> {open?.vervolg} <span className="text-ink-soft">Dit is uitsluitend een suggestie; u bepaalt zelf wat passend is.</span></p>
          <p className="border-t border-border pt-3 text-ink-soft">Bronnen bekijken en beoordelen (herkend, besproken, onjuist) komt beschikbaar zodra veilige toegang is aangesloten.</p>
        </div>
      </SheetContent>
    </Sheet>

    <Sheet open={toestemming} onOpenChange={setToestemming}>
      <SheetContent side="bottom" className="pro-cockpit left-1/2 max-h-[85dvh] w-full max-w-lg -translate-x-1/2 overflow-y-auto bg-background">
        <SheetHeader><SheetTitle>AI-analyse van communicatiepatronen</SheetTitle><SheetDescription>Een afzonderlijke keuze, los van meelezen.</SheetDescription></SheetHeader>
        <div className="mt-4 space-y-3 text-sm">
          <p>Toestemming om mee te lezen is geen toestemming voor AI-analyse. Beide ouders kiezen hier ieder afzonderlijk voor.</p>
          <p>Ouders krijgen vooraf uitleg over: welke verzonden berichten worden geanalyseerd, welke onderwerpen de AI probeert te herkennen, wat de professional ontvangt, of bestaande gesprekken meetellen, hoe lang gegevens bewaard blijven en hoe ze kunnen intrekken.</p>
          <p>Niet-verzonden concepten worden nooit gebruikt. Na intrekken stopt de analyse en verdwijnen eerdere resultaten.</p>
          <p className="border-t border-border pt-3 text-ink-soft">Aanvragen is nog niet beschikbaar: afzonderlijke ouderaccounts, veilige toegangscontrole en juridische beoordeling ontbreken nog. Er wordt hier geen toestemming vastgelegd.</p>
        </div>
      </SheetContent>
    </Sheet>
  </section>;
}
