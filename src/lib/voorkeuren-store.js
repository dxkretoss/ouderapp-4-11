import { useSyncExternalStore } from "react";
const SLEUTEL = "onzeapp-voorkeuren";
const standaard = { thema: "automatisch", bijzonderTonen: true, bijzonderHerinneren: false, vergrendelId: null, slimSuggesties: true, weekVooruit: true, overdrachtHulp: true, conflictControle: true, rustmodus: false, bundelen: true, nuAfstemmenAltijd: true, livingHome: true, weerEffecten: true, seizoenEffecten: true, bijzondereMomenten: true, beweging: "automatisch", weerPlaats: "Haarlem", rustVan: "21:00", rustTot: "07:00", vastgezet: [], gedempt: {}, aiSchrijfhulp: true, rustigerCommuniceren: true, communicatieSuggesties: true, verborgenCommunicatieSuggesties: [], gestructureerdAfstemmen: false, herinneringenGepauzeerd: false, extraHouvast: false, extraHouvastTipGezien: false, activiteitGelezen: [] };
let staat = standaard;
let geladen = false;
const luisteraars = new Set();
function laad() {
    if (geladen || typeof window === "undefined")
        return;
    geladen = true;
    try {
        const opgeslagen = JSON.parse(localStorage.getItem(SLEUTEL) ?? "{}");
        delete opgeslagen.slaapjes; // de slaapjes-teller bestaat niet meer
        staat = { ...standaard, ...opgeslagen };
    }
    catch { /* standaard */ }
}
export function zetVoorkeur(k, v) {
    laad();
    staat = { ...staat, [k]: v };
    try {
        localStorage.setItem(SLEUTEL, JSON.stringify(staat));
    }
    catch { /* privémodus */ }
    if (k === "thema")
        pasThemaToe();
    luisteraars.forEach((l) => l());
}
export function useVoorkeuren() {
    return useSyncExternalStore((l) => { laad(); luisteraars.add(l); l(); return () => luisteraars.delete(l); }, () => { laad(); return staat; }, () => standaard);
}
export function pasThemaToe() {
    if (typeof window === "undefined")
        return;
    laad();
    const donker = staat.thema === "donker" || (staat.thema === "automatisch" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", donker);
}
/** Inline script in <head> zodat er geen lichte flits is bij donker thema. */
export const themaScript = `(function(){try{var v=JSON.parse(localStorage.getItem("${SLEUTEL}")||"{}");var t=v.thema||"automatisch";if(t==="donker"||(t==="automatisch"&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}})()`;
export const MAX_VASTGEZET = 3;
/** Zet vast of maak los; geeft false als er al drie vastgezet zijn. */
export function wisselVastgezet(id) {
    laad();
    const nu = staat.vastgezet;
    if (nu.includes(id)) {
        zetVoorkeur("vastgezet", nu.filter((x) => x !== id));
        return true;
    }
    if (nu.length >= MAX_VASTGEZET)
        return false;
    zetVoorkeur("vastgezet", [...nu, id]);
    return true;
}
/** Dempt gewone meldingen voor één gesprek; spoed (Nu afstemmen) en overdrachten blijven altijd doorkomen. */
export function dempGesprek(id, uren) {
    laad();
    const g = { ...staat.gedempt };
    if (uren === null)
        delete g[id];
    else
        g[id] = Date.now() + uren * 3600_000;
    zetVoorkeur("gedempt", g);
}
export const isGedempt = (v, id) => (v.gedempt[id] ?? 0) > Date.now();
