import { useSyncExternalStore } from "react";
export const moduleLabels = {
    gps: { t: "Aankomst bevestigen bij overdracht", u: "Alleen als jij bewust op de knop drukt" },
    audio: { t: "📞 Audiobellen", u: "Elkaar bellen vanuit de app" },
    video: { t: "🎥 Videobellen", u: "Beeldbellen vanuit de app" },
    opname: { t: "🔴 Opnameverzoeken", u: "Opnemen kan alleen als iedereen akkoord geeft" },
    transcriptie: { t: "📝 Gesprek uitschrijven", u: "Automatisch transcript van een opname" },
    samenvatting: { t: "✨ Samenvatting", u: "Neutrale, praktische samenvatting" },
    acties: { t: "✅ Van gesprek naar actie", u: "Voorstellen voor agenda, taken en afspraken" },
};
export const bewaarOnderdelen = ["Aankomstbevestigingen", "Belgegevens", "Opnames", "Transcripties", "Samenvattingen", "Toestemmingen"];
const transcriptDemo = [
    "Joris: Zal ik Noah vrijdag om 17:00 uur ophalen bij de BSO?",
    "Sanne: Prima. Ik bel maandag de tandarts voor Emma.",
    "Joris: En de zwemles, zullen we die voortaan 50/50 doen?",
    "Sanne: Goed. De voetbalschoenen liggen trouwens bij jou.",
    "Joris: Klopt. De zomervakantie bespreken we volgende week verder.",
];
let state = {
    aan: { gps: false, audio: true, video: true, opname: false, transcriptie: false, samenvatting: false, acties: false },
    bewaar: Object.fromEntries(bewaarOnderdelen.map((b) => [b, b === "Aankomstbevestigingen" ? "30 dagen" : "3 maanden"])),
    onderweg: {},
    onderwegMeldingen: [],
    checkins: [],
    gesprekken: [],
};
const listeners = new Set();
const zet = (p) => { state = { ...state, ...p }; listeners.forEach((l) => l()); };
export const zetOnderweg = (momentId, wie, tijd) => {
    const o = { ...state.onderweg };
    if (wie)
        o[momentId] = wie;
    else
        delete o[momentId];
    const alGemeld = state.onderwegMeldingen.some((m) => m.momentId === momentId);
    const meldingen = wie && !alGemeld ? [...state.onderwegMeldingen, { momentId, tekst: `${wie} is onderweg${tijd ? ` voor de overdracht van ${tijd} uur` : ""}.` }] : state.onderwegMeldingen;
    zet({ onderweg: o, onderwegMeldingen: meldingen });
};
export const zetModule = (m, v) => zet({ aan: { ...state.aan, [m]: v } });
export const zetBewaar = (k, v) => zet({ bewaar: { ...state.bewaar, [k]: v } });
export const voegCheckInToe = (c) => zet({ checkins: [c, ...state.checkins] });
export const verwijderCheckIn = (id) => zet({ checkins: state.checkins.filter((c) => c.id !== id) });
export const voegGesprekToe = (g) => zet({ gesprekken: [g, ...state.gesprekken] });
export const werkOpnameBij = (id, p) => zet({ gesprekken: state.gesprekken.map((g) => (g.id === id && g.opname ? { ...g, opname: { ...g.opname, ...p } } : g)) });
export const demoTranscript = transcriptDemo;
export function useGesprekken() {
    return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => state, () => state);
}
let meldingen = [];
const mListeners = new Set();
export const voegMeldingToe = (m) => { meldingen = [m, ...meldingen]; mListeners.forEach((l) => l()); };
export function useMeldingen() {
    return useSyncExternalStore((l) => { mListeners.add(l); return () => mListeners.delete(l); }, () => meldingen, () => meldingen);
}
