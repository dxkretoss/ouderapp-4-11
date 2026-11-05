import { signaalSchaal } from "@/lib/communicatiemeter";
/** Kleine getekende gezichtjes (geen emoji): één rustige tekening per signaal. */
const gezicht = {
    prettig: { mond: "M7.5 13.5q4.5 4.5 9 0", ogen: "open" },
    zakelijk: { mond: "M9 15h6", ogen: "open" },
    hard: { mond: "M9 16q3-1.2 6 0", ogen: "open", wenkbrouwen: "M7.5 8l2.5.6M16.5 8l-2.5.6" },
    kwetsend: { mond: "M8 17q4-3.5 8 0", ogen: "open", wenkbrouwen: "M7 7.5l3 1.2M17 7.5l-3 1.2" },
};
const kleur = {
    prettig: "text-meter-2",
    zakelijk: "text-ink-soft",
    hard: "text-meter-4",
    kwetsend: "text-accent-warm",
};
export function SignaalGezichtje({ signaal, className = "size-5" }) {
    const g = gezicht[signaal];
    return (<svg viewBox="0 0 24 24" aria-hidden className={`${className} ${kleur[signaal]}`} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <circle cx="12" cy="12" r="9.5"/>
      {g.ogen === "rustig"
            ? <path d="M7.8 10.2q1.2 1 2.4 0M13.8 10.2q1.2 1 2.4 0"/>
            : <><circle cx="9" cy="10" r="0.9" fill="currentColor" stroke="none"/><circle cx="15" cy="10" r="0.9" fill="currentColor" stroke="none"/></>}
      {g.wenkbrouwen ? <path d={g.wenkbrouwen}/> : null}
      <path d={g.mond}/>
    </svg>);
}
/**
 * Eén communicatiesignaal met korte tekst, pas zichtbaar ná een betrouwbare beoordeling.
 * Hulpmiddel over de formulering, geen emotie- of veiligheidsscore en geen permanente meter.
 */
export function Communicatiemeter({ signaal, bezig }) {
    if (!signaal && !bezig)
        return null;
    const info = signaal ? signaalSchaal.find((s) => s.signaal === signaal) : null;
    return (<div className="mt-2 flex items-center gap-2 px-1" role="status" aria-live="polite" aria-label="Communicatiesignaal">
      {bezig && !info ? <span className="text-[11px] text-ink-soft">Even kijken…</span> : info ? (<>
          <SignaalGezichtje signaal={info.signaal} className="size-5 shrink-0"/>
          <p className="text-[11px] text-ink-soft"><span className={`font-semibold ${kleur[info.signaal]}`}>{info.label}</span> · {info.tekst}</p>
        </>) : null}
    </div>);
}
/** Persoonlijke bevestiging, alleen voor de afzender; verdwijnt na ongeveer 2 seconden. */
export function FijnGecommuniceerd() {
    return (<span role="status" aria-label="Bericht verstuurd" className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-3 -translate-x-1/2">
      <span className="communicatie-smiley grid size-11 place-items-center rounded-full bg-brand-soft"><SignaalGezichtje signaal="prettig" className="size-8"/></span>
    </span>);
}
