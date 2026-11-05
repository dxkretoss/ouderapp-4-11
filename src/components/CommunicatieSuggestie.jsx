import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AppIcon } from "@/components/AppIcon";
import { Button } from "@/components/ui/button";
import { agendaVanBericht, vindCommunicatieSuggestie } from "@/lib/communicatie-suggesties";
import { useVoorkeuren, zetVoorkeur } from "@/lib/voorkeuren-store";
import { useTaken } from "@/lib/taken-store";
export function CommunicatieSuggestie({ concept, berichten, namen, veiligheid, verwerkt, onAanvullen, gesprekId }) {
    const vk = useVoorkeuren();
    const { taken } = useTaken();
    const [pauzeTekst, setPauzeTekst] = useState(concept);
    const [weggeklikt, setWeggeklikt] = useState();
    useEffect(() => { if (!vk.communicatieSuggesties)
        return; const t = setTimeout(() => setPauzeTekst(concept), 250); return () => clearTimeout(t); }, [concept, vk.communicatieSuggesties]);
    const s = pauzeTekst === concept ? vindCommunicatieSuggestie(concept, berichten, namen, { aan: vk.communicatieSuggesties, verborgen: vk.verborgenCommunicatieSuggesties, veiligheid, verwerkt, weggeklikt }) : null;
    if (!s)
        return null;
    const bronnen = berichten.filter((b) => s.bronnen.includes(b.id));
    const bronTekst = bronnen.map((b) => b.tekst).join("\n");
    const g = s.gegevens;
    const openFlow = (tijd, ander = false) => {
        const label = ander ? "Ander tijdstip" : tijd ? `${tijd} uur voorstellen` : g?.zorg ? "Wijziging bekijken" : "Afspraak bekijken";
        if (g?.zorg)
            return <Button asChild variant="link" className="h-auto min-h-11 whitespace-normal px-0 text-left text-xs"><Link to="/zorgregeling" search={{ actie: "wijziging", bron: "berichten", omschrijving: `${bronTekst}${tijd ? `\nGekozen tijdstip om voor te stellen: ${tijd} uur` : ""}` }}>{label}</Link></Button>;
        const search = { ...agendaVanBericht(bronnen.at(-1)?.tekst ?? bronTekst, namen), omschrijving: bronTekst, tijd: ander ? undefined : tijd ?? g?.tijd, datum: g?.datum, kind: g?.kind };
        return <Button asChild variant="link" className="h-auto min-h-11 whitespace-normal px-0 text-left text-xs"><Link to="/agenda" search={search}>{label}</Link></Button>;
    };
    return <div className="mt-2 border-t border-border pt-2" aria-label="Slimme suggestie">
    <div className="flex items-start gap-2">
      <AppIcon functie="slim" maat="sm" vorm="kaal"/>
      <div className="min-w-0 flex-1 text-xs">
        {s.aanvulling ? <Button variant="link" onClick={() => { setWeggeklikt(s.sleutel); onAanvullen(concept + s.aanvulling); }} className="h-auto min-h-11 whitespace-normal p-0 text-left text-xs">{s.tekst}</Button> : <p className="py-1 text-ink">{s.tekst}</p>}
        {s.soort === "agenda" ? openFlow() : null}
        {s.soort === "taak" && s.taak ? <><p className="py-1 text-ink-soft">{s.taak.tekst}</p>{taken.some((t) => t.berichtId === s.bronnen[0] && t.gesprekId === gesprekId) ? <p className="py-1 text-ink-soft">Staat al bij Taken.</p> : <Button asChild variant="link" className="h-auto min-h-11 whitespace-normal px-0 text-xs"><Link to="/taken" search={{ taak: s.taak.tekst, deadline: s.taak.datum, dag: s.taak.dag, berichtId: s.bronnen[0], gesprekId }}>Maak hier een taak van</Link></Button>}</> : null}
        {s.soort === "verschil" ? <><p className="text-ink-soft">Welk tijdstip willen jullie voorstellen?</p><div className="flex flex-wrap gap-x-4">{s.tijden?.map((t) => <span key={t}>{openFlow(t)}</span>)}{openFlow(undefined, true)}</div></> : null}
        {bronnen.length ? <details className="text-ink-soft"><summary className="min-h-8 cursor-pointer">Samenvatting. Controleer de oorspronkelijke berichten.</summary>{bronnen.map((b) => <p key={b.id} className="mt-1 whitespace-pre-wrap border-l border-border pl-2">{b.tekst}</p>)}</details> : null}
        <div><Button variant="link" onClick={() => zetVoorkeur("verborgenCommunicatieSuggesties", [...vk.verborgenCommunicatieSuggesties, s.soort])} className="h-auto min-h-8 px-0 text-xs text-ink-soft">Niet meer tonen</Button></div>
      </div>
      <Button variant="ghost" size="icon" aria-label="Suggestie sluiten" onClick={() => setWeggeklikt(s.sleutel)} className="size-11 shrink-0"><AppIcon functie="niet" maat="sm" vorm="kaal"/></Button>
    </div>
  </div>;
}
