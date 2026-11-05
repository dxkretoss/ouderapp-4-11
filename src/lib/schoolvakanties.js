import { useSyncExternalStore } from "react";
export const regioLabel = { noord: "Regio Noord", midden: "Regio Midden", zuid: "Regio Zuid" };
export const regioUitleg = {
    noord: "o.a. Groningen, Friesland, Drenthe, Overijssel, Noord-Holland",
    midden: "o.a. Utrecht, Zuid-Holland, deel Gelderland en Noord-Brabant",
    zuid: "o.a. Limburg, Zeeland, grootste deel Noord-Brabant",
};
const alle = (van, tot) => ({ noord: [van, tot], midden: [van, tot], zuid: [van, tot] });
const tabel = [
    { naam: "Herfstvakantie", noord: ["2025-10-18", "2025-10-26"], midden: ["2025-10-18", "2025-10-26"], zuid: ["2025-10-11", "2025-10-19"] },
    { naam: "Kerstvakantie", ...alle("2025-12-20", "2026-01-04") },
    { naam: "Voorjaarsvakantie", noord: ["2026-02-21", "2026-03-01"], midden: ["2026-02-14", "2026-02-22"], zuid: ["2026-02-14", "2026-02-22"] },
    { naam: "Meivakantie", ...alle("2026-04-25", "2026-05-03") },
    { naam: "Zomervakantie", noord: ["2026-07-04", "2026-08-16"], midden: ["2026-07-18", "2026-08-30"], zuid: ["2026-07-11", "2026-08-23"] },
    { naam: "Herfstvakantie", noord: ["2026-10-10", "2026-10-18"], midden: ["2026-10-17", "2026-10-25"], zuid: ["2026-10-17", "2026-10-25"] },
    { naam: "Kerstvakantie", ...alle("2026-12-19", "2027-01-03") },
    { naam: "Voorjaarsvakantie", noord: ["2027-02-20", "2027-02-28"], midden: ["2027-02-20", "2027-02-28"], zuid: ["2027-02-13", "2027-02-21"] },
    { naam: "Meivakantie", ...alle("2027-04-24", "2027-05-02") },
    { naam: "Zomervakantie", noord: ["2027-07-10", "2027-08-22"], midden: ["2027-07-17", "2027-08-29"], zuid: ["2027-07-24", "2027-09-05"] },
    { naam: "Herfstvakantie", noord: ["2027-10-16", "2027-10-24"], midden: ["2027-10-16", "2027-10-24"], zuid: ["2027-10-23", "2027-10-31"] },
    { naam: "Kerstvakantie", ...alle("2027-12-25", "2028-01-09") },
    { naam: "Voorjaarsvakantie", noord: ["2028-02-19", "2028-02-27"], midden: ["2028-02-26", "2028-03-05"], zuid: ["2028-02-26", "2028-03-05"] },
    { naam: "Meivakantie", ...alle("2028-04-29", "2028-05-07") },
    { naam: "Zomervakantie", noord: ["2028-07-15", "2028-08-27"], midden: ["2028-07-08", "2028-08-20"], zuid: ["2028-07-22", "2028-09-03"] },
];
let regio = "midden";
const luisteraars = new Set();
export function zetRegio(r) { regio = r; luisteraars.forEach((l) => l()); }
export function useRegio() {
    return useSyncExternalStore((l) => { luisteraars.add(l); return () => luisteraars.delete(l); }, () => regio, () => regio);
}
export const vakantiesVoor = (r) => tabel.map((t) => {
    const jaar = Number(t[r][0].slice(0, 4)) - (Number(t[r][0].slice(5, 7)) < 8 ? 1 : 0);
    return { naam: t.naam, van: t[r][0], tot: t[r][1], advies: t.naam === "Herfstvakantie" || t.naam === "Voorjaarsvakantie", schooljaar: `${jaar}-${jaar + 1}`, bron: `https://www.rijksoverheid.nl/themas/onderwijs/schoolvakanties/overzicht-schoolvakanties-per-schooljaar/overzicht-schoolvakanties-${jaar}-${jaar + 1}` };
});
export const vakantieOp = (r, iso) => vakantiesVoor(r).find((v) => iso >= v.van && iso <= v.tot);
export const vakantiesTussen = (r, van, tot) => vakantiesVoor(r).filter((v) => v.tot >= van && v.van <= tot);
