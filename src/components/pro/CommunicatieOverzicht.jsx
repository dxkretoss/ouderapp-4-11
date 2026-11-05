import { useState } from "react";
import { AppIcon } from "@/components/AppIcon";
import { Badge, FilterBalk } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
/** No parent content or derived signals enter this component before a protected source exists. */
export function CommunicatieOverzicht({ gezinnen, onOpen }) {
    const [periode, setPeriode] = useState("7 dagen");
    const [informatie, setInformatie] = useState(false);
    return <section className="border-b border-border py-4" aria-label="Communicatieoverzicht">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="font-display text-xl">Communicatie die aandacht vraagt</h2>
      <Badge>Geen toegang</Badge>
    </div>
    <FilterBalk doorlopen opties={["7 dagen", "30 dagen"]} waarde={periode} onChange={setPeriode} className="mt-2"/>
    <p className="mt-3 flex items-start gap-2 text-sm text-ink-soft"><AppIcon functie="slot" vorm="kaal" maat="sm"/><span>Communicatiesignalen en oudergesprekken zijn afgeschermd. Er zijn nog geen veilig beschikbare metingen voor deze periode.</span></p>
    <div className="mt-3 divide-y divide-border">
      {gezinnen.map((g) => <div key={g.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
        <div className="min-w-0"><p className="text-sm font-semibold">{g.gezin}</p><p className="mt-0.5 text-sm text-ink-soft">Berichten en AI-herschrijfvoorstellen: niet beschikbaar</p></div>
        {onOpen ? <Button variant="ghost" className="h-auto px-0 py-1 text-brand" onClick={() => onOpen(g.id)}>Bekijk signalen <span aria-hidden>›</span></Button> : null}
      </div>)}
    </div>
    <Button variant="outline" className="mt-3 h-auto min-h-11 whitespace-normal" onClick={() => setInformatie(true)}><AppIcon functie="slot" vorm="kaal" maat="sm"/>Toestemming voor meelezen</Button>
    <Sheet open={informatie} onOpenChange={setInformatie}>
      <SheetContent side="bottom" className="pro-cockpit left-1/2 max-h-[85dvh] w-full max-w-lg -translate-x-1/2 overflow-y-auto bg-background">
        <SheetHeader><SheetTitle>Toestemming voor meelezen</SheetTitle><SheetDescription>Ouders houden ieder afzonderlijk de keuze.</SheetDescription></SheetHeader>
        <div className="mt-4 space-y-3 text-sm">
          <p>Beide ouders moeten afzonderlijk instemmen. De professional moet daarnaast bevoegd zijn voor dit gezin.</p>
          <p>Een verzoek vermeldt de professional, organisatie, toegestane gesprekken, eventuele bestaande geschiedenis en de einddatum.</p>
          <p>Iedere ouder kan weigeren of later intrekken. Zodra één ouder intrekt, stopt het meelezen direct. De ouderapp blijft gewoon werken.</p>
          <p>Meekijken is alleen-lezen. Niet-verzonden concepten en eerdere privéversies worden nooit gedeeld. Communicatiestatistieken vragen een afzonderlijke geldige grondslag en autorisatie.</p>
          <p className="border-t border-border pt-3 text-ink-soft">Aanvragen is nog niet beschikbaar: afzonderlijke ouderaccounts en veilige toegangscontrole zijn nog niet aangesloten. Er wordt hier geen toestemming vastgelegd.</p>
        </div>
      </SheetContent>
    </Sheet>
  </section>;
}
