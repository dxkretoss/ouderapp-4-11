import { Link } from "@tanstack/react-router";
import { gezagLabels, useGezagState } from "@/lib/gezag-store";
const groepen = [
    { max: 11, t: "Jonger dan 12 jaar", u: "Toestemming van de wettelijke vertegenwoordiger(s), met wettelijke uitzonderingen." },
    { max: 15, t: "12 tot en met 15 jaar", u: "In beginsel toestemming van het kind én de wettelijke vertegenwoordiger(s), met wettelijke uitzonderingen." },
    { max: 200, t: "Vanaf 16 jaar", u: "Het kind beslist in beginsel zelf over medische behandelingen." },
];
/** "Medische beslissingen & gezag" binnen Gezondheid. Toont alleen; bepaalt nooit wie juridisch toestemming mag geven. */
export function MedischGezag({ kindId, naam, leeftijd }) {
    const { gezag, bevestigd } = useGezagState();
    const g = gezag[kindId] ?? "onbekend";
    return (<div className="space-y-3 border-t border-border pt-3">
      <p className="font-display text-sm font-bold">Medische beslissingen & gezag</p>
      <div className="rounded-md bg-white/60 px-3 py-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">Vastgelegde gezagssituatie</p>
        <p className="text-sm">{gezagLabels[g]}</p>
        <p className="mt-1 text-[11px] text-ink-soft">Door ouders ingevuld{bevestigd[kindId] ? " en door beide ouders bevestigd" : ", nog niet door de andere ouder bevestigd"}. Niet juridisch gecontroleerd. Wijzigen kan via Gezag.</p>
      </div>
      <div>
        <p className="text-xs font-semibold">Wie beslist over medische zaken?</p>
        <ul className="mt-1 space-y-1.5">
          {groepen.map((gr, i) => {
            const huidig = leeftijd <= gr.max && (i === 0 || leeftijd > groepen[i - 1].max);
            return <li key={gr.t} className={`rounded-md px-3 py-2 text-xs ${huidig ? "border border-brand/40 bg-card" : "text-ink-soft"}`}><span className="font-semibold">{gr.t}{huidig ? ` · geldt nu voor ${naam}` : ""}</span><span className="block">{gr.u}</span></li>;
        })}
        </ul>
        <p className="mt-2 text-xs text-ink-soft">Wie betrokken moet worden bij deze medische beslissing, hangt af van het gezag, de leeftijd van het kind en de behandeling.</p>
      </div>
      <Link to="/beslissingen" search={{ soort: "Medisch", kind: kindId }} className="flex min-h-11 items-center justify-center rounded-full border border-brand/40 text-sm font-semibold text-brand">Medische beslissing toevoegen</Link>
      <p className="text-[11px] text-ink-soft">Een akkoord in de app is geen juridisch geldige medische toestemming voor een zorgverlener. In een spoedsituatie neem je altijd direct contact op met een zorgverlener of bel je 112 — wacht nooit op de app.</p>
    </div>);
}
