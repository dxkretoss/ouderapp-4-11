export function dagdeel(d) {
    const u = d.getHours();
    if (u >= 6 && u < 12)
        return "ochtend";
    if (u >= 12 && u < 18)
        return "middag";
    if (u >= 18 && u < 22)
        return "avond";
    return "nacht";
}
export function begroeting(d, naam) {
    const deel = dagdeel(d);
    if (deel === "ochtend")
        return `Goedemorgen, ${naam}`;
    if (deel === "middag")
        return `Fijne middag, ${naam}`;
    if (deel === "avond")
        return `Fijne avond, ${naam}`;
    return `Een rustige avond, ${naam}`;
}
export function seizoen(d) {
    const m = d.getMonth();
    if (m >= 2 && m <= 4)
        return "lente";
    if (m >= 5 && m <= 7)
        return "zomer";
    if (m >= 8 && m <= 10)
        return "herfst";
    return "winter";
}
const maanden = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];
/** Is vandaag de verjaardag bij een geboortedatum als "14 april 2016"? */
export function isJarig(geboortedatum, d) {
    const [dag, maand] = geboortedatum.toLowerCase().split(" ");
    return Number(dag) === d.getDate() && maanden.indexOf(maand ?? "") === d.getMonth();
}
/** Hoogstens één bijzondere boodschap; verjaardag gaat voor wisseldag. Neutraal, zonder emotie. */
export function bijzonderMoment(o) {
    const jarig = o.kinderen.find((k) => isJarig(k.geboortedatum, o.nu));
    if (jarig)
        return { soort: "verjaardag", tekst: `Vandaag is ${jarig.naam} jarig` };
    if (o.wisselTijd)
        return { soort: "wisseldag", tekst: `Vandaag · wisselmoment om ${o.wisselTijd}` };
    return null;
}
/** WMO-weercode van Open-Meteo → rustige sfeercategorie. */
export function weerVanCode(c) {
    if (c >= 95)
        return "onweer";
    if ((c >= 71 && c <= 77) || c === 85 || c === 86)
        return "sneeuw";
    if ((c >= 51 && c <= 67) || (c >= 80 && c <= 82))
        return "regen";
    if (c <= 1)
        return "zon";
    return "bewolkt";
}
const cache = new Map();
export async function haalWeer(plaats) {
    const sleutel = plaats.trim().toLowerCase();
    if (!sleutel)
        return null;
    const c = cache.get(sleutel);
    if (c && Date.now() - c.tijd < 30 * 60_000)
        return c;
    try {
        const g = await fetch(`https://geocoding-api.open-meteo.com/v1/search?count=1&language=nl&name=${encodeURIComponent(plaats)}`).then((r) => r.json());
        const p = g?.results?.[0];
        if (!p)
            return null;
        const w = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${p.latitude}&longitude=${p.longitude}&current=temperature_2m,weather_code`).then((r) => r.json());
        const res = { weer: weerVanCode(w.current.weather_code), graden: Math.round(w.current.temperature_2m), tijd: Date.now() };
        cache.set(sleutel, res);
        return res;
    }
    catch {
        return null;
    }
}
