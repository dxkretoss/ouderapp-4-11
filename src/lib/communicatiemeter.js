export const toonSchaal = [
    { toon: "rustig", label: "Rustig" },
    { toon: "vriendelijk", label: "Vriendelijk" },
    { toon: "neutraal", label: "Neutraal" },
    { toon: "gevoelig", label: "Gevoelig" },
    { toon: "verwijtend", label: "Verwijtend" },
    { toon: "escalerend", label: "Mogelijk escalerend" },
];
/** Betrouwbare toon uit een bestaand AI-resultaat; zonder of bij twijfel: null ("Nog niet beoordeeld"). */
export function betrouwbareToon(r) {
    if (!r?.toon || r.toon === "onzeker")
        return null;
    // Een dreigend niveau wint altijd van een mildere toon.
    if (r.niveau === "dreigend" || r.niveau === "escalerend")
        return "escalerend";
    return r.toon;
}
/** Positie van de indicator in procenten (0–100), of null zonder beoordeling. */
export function toonPositie(t) {
    if (!t)
        return null;
    const i = toonSchaal.findIndex((s) => s.toon === t);
    return (i / (toonSchaal.length - 1)) * 100;
}
/** "Even anders formuleren?" vanaf oranje. */
export const vraagtHerformulering = (t) => t === "gevoelig" || t === "verwijtend" || t === "escalerend";
/** Groene bevestiging na verzenden: alleen bij een betrouwbare rustige, vriendelijke of neutrale toon. */
export const verdientBevestiging = (r, succesvol = true) => {
    const t = betrouwbareToon(r);
    return succesvol && r?.niveau === "geen" && r.afstemming === "passend" && (t === "rustig" || t === "vriendelijk" || t === "neutraal");
};
export const signaalSchaal = [
    { signaal: "prettig", label: "Prettig", tekst: "Je bericht komt prettig over." },
    { signaal: "zakelijk", label: "Zakelijk", tekst: "Je bericht is duidelijk en zakelijk." },
    { signaal: "hard", label: "Hard", tekst: "Je bericht kan wat hard overkomen." },
    { signaal: "kwetsend", label: "Kwetsend", tekst: "Je bericht bevat wellicht kwetsende taal." },
];
/** Leid één signaal af uit een bestaande beoordeling; zonder of bij twijfel: null. */
export function signaalUitBeoordeling(r) {
    const t = betrouwbareToon(r);
    if (!t)
        return null;
    if (t === "escalerend")
        return "kwetsend";
    if (t === "verwijtend" || t === "gevoelig")
        return "hard";
    if (t === "neutraal")
        return "zakelijk";
    return "prettig";
}
/** Alleen bij Hard of Kwetsend is een andere formulering zinvol om aan te bieden. */
export const signaalVraagtHerformulering = (s) => s === "hard" || s === "kwetsend";
