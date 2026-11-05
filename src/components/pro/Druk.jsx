import { drukLabel } from "@/lib/communicatiedruk";
/** Rustig: vlakke lijn. Veel: twee golfjes. Hoog: drie dichte golfjes. Geen emoji, geen rood alarm. */
const kleur = { rustig: "text-brand", veel: "text-ink-soft", hoog: "text-accent-warm" };
export function DrukIcoon({ niveau }) {
    const pad = niveau === "rustig" ? "M2 8h12" : niveau === "veel" ? "M2 8c2-3 4-3 6 0s4 3 6 0" : "M1 8c1.2-3 2.3-3 3.5 0s2.3 3 3.5 0 2.3-3 3.5 0 2.3 3 3.5 0";
    return <svg viewBox="0 0 16 16" className={`size-4 ${kleur[niveau]}`} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d={pad}/></svg>;
}
export function DrukLabel({ niveau }) {
    return <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${kleur[niveau]}`}><DrukIcoon niveau={niveau}/>{drukLabel[niveau]}</span>;
}
