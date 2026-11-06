import { useSyncExternalStore } from "react";
/** Zachte kleuren per kind (uit het iconenpalet). Zelf aan te passen in het kindprofiel. */
export const kindKleuren = [
    { id: "salie", hex: "#6F7F68" },
    { id: "klei", hex: "#C07B5C" },
    { id: "blauw", hex: "#6B7F99" },
    { id: "lavendel", hex: "#8A7CA8" },
    { id: "honing", hex: "#B8923E" },
    { id: "taupe", hex: "#8A7E72" },
];
/** Standaardkleur voor een kind op plek i (wisselt af over het palet). */
export const standaardKindKleur = (i) => kindKleuren[i % kindKleuren.length].hex;
/** Leeftijd uit de geboortedatum: maanden onder 1 jaar, jaren daarna. Geen datum → null (niets verzinnen). */
export function leeftijdTekst(geboortedatum, nu = new Date()) {
    if (!geboortedatum)
        return null;
    const geb = new Date(geboortedatum);
    if (Number.isNaN(geb.getTime()) || geb > nu)
        return null;
    let jaren = nu.getFullYear() - geb.getFullYear();
    let maanden = nu.getMonth() - geb.getMonth();
    if (nu.getDate() < geb.getDate())
        maanden -= 1;
    if (maanden < 0) {
        jaren -= 1;
        maanden += 12;
    }
    if (jaren < 1) {
        const totaal = Math.max(1, jaren * 12 + maanden);
        return totaal === 1 ? "1 maand" : `${totaal} maanden`;
    }
    return `${jaren} jaar`;
}
export const gezagKeuzes = [
    { id: "gezamenlijk", naam: "Gezamenlijk gezag" },
    { id: "een-ouder", naam: "Eén ouder heeft gezag" },
    { id: "anders", naam: "Anders geregeld" },
    { id: "onbekend", naam: "Nog onbekend" },
];
/** Basis klaar = naam, kind, verdeling en gezag. Uitnodigen is optioneel en telt niet mee. */
export function basisStappen(s) {
    return [
        { klaar: !!s.naam, key: "home.stepName", label: "Naam ingevuld" },
        { klaar: s.kinderen.length > 0, key: "home.stepChild", label: "Kind toegevoegd" },
        { klaar: !!s.regeling, key: "home.stepSchedule", label: "Verdeling van de week ingesteld" },
        { klaar: !!s.gezag, key: "home.stepCustody", label: "Gezag vastgelegd" },
    ];
}
export const kostenWijzen = [
    { id: "alleen", naam: "Alleen kosten bijhouden", uitleg: "Overzicht van wat je uitgeeft, zonder verrekening." },
    { id: "50", naam: "Standaard 50/50 verdelen", uitleg: "Iedere uitgave wordt gelijk verdeeld." },
    { id: "eigen", naam: "Een eigen percentage", uitleg: "Bijvoorbeeld 60/40, voor iedere uitgave." },
    { id: "per-uitgave", naam: "Per uitgave bepalen", uitleg: "Bij iedere uitgave kies je de verdeling." },
];
export const kostenMomenten = [
    { id: "direct", naam: "Na iedere uitgave" },
    { id: "week", naam: "Wekelijks" },
    { id: "maand", naam: "Maandelijks" },
    { id: "kwartaal", naam: "Per kwartaal" },
    { id: "zelf", naam: "Zelf bepalen" },
];
/** Percentage voor jou bij een nieuwe uitgave; null = alleen bijgehouden. */
export function standaardPct(a) {
    return a.wijze === "alleen" ? null : a.wijze === "50" ? 50 : a.wijze === "eigen" ? a.pctIk : 50;
}
const SLEUTEL = "onzeapp-eigen-start";
const leeg = { gezag: null, eigen: true, naam: "", gebruik: "samen", kinderen: [], regeling: null, uitgenodigd: false, afspraakToegevoegd: false, voortgangVerborgen: false, agenda: [], onderwerpen: [], kosten: [], kostenAfspraak: { wijze: "alleen", pctIk: 50, moment: "maand" } };
let state = leeg;
let geladen = false;
const luisteraars = new Set();
function laad() {
    if (geladen || typeof window === "undefined")
        return;
    geladen = true;
    try {
        const r = localStorage.getItem(SLEUTEL);
        if (r) {
            const parsed = JSON.parse(r);
            state = { ...leeg, ...parsed, eigen: true };
        }
    }
    catch { /* geen opslag */ }
}
function zet(p) {
    state = { ...state, ...p };
    try {
        localStorage.setItem(SLEUTEL, JSON.stringify(state));
    }
    catch { /* geen opslag */ }
    luisteraars.forEach((l) => l());
}
/** Huidige start-state zonder hook (voor andere stores). */
export function startState() {
    laad();
    return state;
}
export function useStart() {
    return useSyncExternalStore((l) => { laad(); luisteraars.add(l); queueMicrotask(l); return () => luisteraars.delete(l); }, () => { laad(); return state; }, () => leeg);
}
export const start = {
    begin: (naam, gebruik) => zet({ ...leeg, eigen: true, naam: naam.trim(), gebruik }),
    zetNaam: (naam) => zet({ naam: (naam || "").trim() }),
    zetKinderen: (kinderen) => {
        const kids = Array.isArray(kinderen) ? kinderen : [];
        const update = { kinderen: kids };
        if (!state.regeling) {
            const kidWithSchedule = kids.find((k) => k.care_schedule);
            if (kidWithSchedule?.care_schedule) {
                try {
                    const parsed = typeof kidWithSchedule.care_schedule === "string" 
                        ? JSON.parse(kidWithSchedule.care_schedule) 
                        : kidWithSchedule.care_schedule;
                    if (geldigeRegeling(parsed)) {
                        update.regeling = parsed;
                    }
                } catch {}
            }
        }
        if (!state.gezag) {
            const kidWithCustody = kids.find((k) => k.custody);
            if (kidWithCustody?.custody) {
                update.gezag = { situatie: kidWithCustody.custody, ingevuldDoor: state.naam || "jij", bevestigdDoorAnder: true };
            }
        }
        zet(update);
    },
    kindToevoegen: (naam, geboortedatum, beeld) => zet({ kinderen: [...state.kinderen, { id: `k-${Date.now()}`, naam: naam.trim(), geboortedatum: geboortedatum || undefined, kleur: standaardKindKleur(state.kinderen.length), beeld, avatar: beeld }] }),
    kindBijwerken: (id, childData) => zet({
        kinderen: state.kinderen.map((k) => (k.id === id || k.naam === id ? { ...k, ...childData, beeld: childData.avatar || childData.beeld || k.beeld, avatar: childData.avatar || childData.beeld || k.avatar } : k))
    }),
    kindVerwijderen: (idOrName) => zet({
        kinderen: state.kinderen.filter((k) => k.id !== idOrName && k.naam !== idOrName)
    }),
    /** Alleen de eigen ouder van dit gezin beheert de kindafbeelding; andere personen hebben hier geen invoer. */
    zetKindBeeld: (id, beeld) => zet({ kinderen: state.kinderen.map((k) => (k.id === id ? { ...k, beeld, avatar: beeld } : k)) }),
    zetOuderBeeld: (beeld) => zet({ beeld }),
    zetKindKleur: (id, kleur) => zet({ kinderen: state.kinderen.map((k) => (k.id === id ? { ...k, kleur } : k)) }),
    zetKindRegio: (id, schoolRegio) => zet({ kinderen: state.kinderen.map((k) => k.id === id ? { ...k, schoolRegio } : k) }),
    zetKindRegeling: (id, regeling) => zet({ regeling }),
    zetGezag: (situatie) => zet({ gezag: { situatie, ingevuldDoor: state.naam || "jij", bevestigdDoorAnder: false } }),
    regeling: (r) => zet({ regeling: r }),
    markeer: (p) => zet(p),
    zetAgenda: (f) => zet({ agenda: typeof f === "function" ? f(state.agenda) : Array.isArray(f) ? f : state.agenda }),
    onderwerpToevoegen: (naam) => { const id = `eigen-${Date.now()}`; zet({ onderwerpen: [{ id, naam: naam.trim() }, ...state.onderwerpen] }); return id; },
    kostToevoegen: (k) => zet({ kosten: [k, ...state.kosten] }),
    zetKostenAfspraak: (p) => zet({ kostenAfspraak: { ...state.kostenAfspraak, ...p } }),
    naarVoorbeeld: () => {
        try { localStorage.setItem("onzeapp_demo_mode", "true"); } catch {}
        zet({ eigen: false });
    },
    terugNaarEigen: () => {
        try { localStorage.removeItem("onzeapp_demo_mode"); } catch {}
        zet({ eigen: true });
    },
    reset: () => zet(leeg),
};
const I = "ik", A = "ander";
/** 14 dagen, maandag t/m zondag, twee weken. Neutrale startpunten — iedere regeling is gelijkwaardig. */
export const patronen = [
    { id: "om-de-week", naam: "Om de week", uitleg: "De ene week bij de ene ouder, de volgende week bij de andere.", dagen: [I, I, I, I, I, I, I, A, A, A, A, A, A, A] },
    { id: "weekenden", naam: "Weekenden afwisselen", uitleg: "Doordeweeks op één plek. Om het weekend van vrijdag tot en met zondag bij de andere ouder (wissel op vrijdag).", dagen: [I, I, I, I, A, A, A, I, I, I, I, I, I, I] },
    { id: "2-2-3", naam: "2-2-3", uitleg: "Een terugkerend schema met korte blokken gedurende de week.", dagen: [I, I, A, A, I, I, I, A, A, I, I, A, A, A] },
    { id: "2-2-5-5", naam: "2-2-5-5", uitleg: "Vaste weekdagen met afwisselende langere periodes.", dagen: [I, I, A, A, I, I, I, I, I, A, A, A, A, A] },
    { id: "vaste-dagen", naam: "Vaste dagen per week", uitleg: "Dezelfde dagen zijn iedere week verdeeld.", dagen: [I, I, I, A, A, A, A, I, I, I, A, A, A, A] },
    { id: "een-weekend", naam: "Eén weekend per twee weken", uitleg: "Vooral op één plek. Eens per twee weken alleen zaterdag en zondag bij de andere ouder (wissel op zaterdag).", dagen: [I, I, I, I, I, I, I, I, I, I, I, I, A, A] },
    { id: "wisselend", naam: "Wisselende regeling", uitleg: "De planning verschilt regelmatig en volgt geen vast weekschema.", dagen: null },
    { id: "zelf", naam: "Zelf instellen", uitleg: "Maak een eigen verdeling.", dagen: [I, I, I, I, I, I, I, A, A, A, A, A, A, A] },
];
export function maandagVan(d) {
    const m = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    m.setDate(m.getDate() - ((m.getDay() + 6) % 7));
    return `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}-${String(m.getDate()).padStart(2, "0")}`;
}
/** Is een opgeslagen regeling bruikbaar? Oudere of onvolledige opslag mag de app nooit laten crashen. */
export function geldigeRegeling(r) {
    const g = r;
    return !!g && Array.isArray(g.dagen) && g.dagen.length === 14 && typeof g.startMaandag === "string" && /^\d{4}-\d{2}-\d{2}$/.test(g.startMaandag);
}
/** Op welke plek is het kind op datum d volgens de eigen regeling? */
export function plekOp(r, d) {
    return r.dagen[dagIndex(r, d)] ?? "ik";
}
const dagIndex = (r, d) => {
    const [j, mm, dd] = (geldigeRegeling(r) ? r.startMaandag : maandagVan(d)).split("-").map(Number);
    const s = new Date(j, mm - 1, dd);
    const n = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - s.getTime()) / 86400000);
    return ((n % 14) + 14) % 14;
};
/** Waar is het kind vandaag, en wanneer is het volgende wisselmoment (eerste dag met een andere plek)? */
export function vandaagVolgens(r, nu) {
    const i = dagIndex(r, nu);
    const plek = r.dagen[i];
    for (let s = 1; s <= 14; s++) {
        const p = r.dagen[(i + s) % 14];
        if (p !== plek) {
            const d = new Date(nu);
            d.setDate(d.getDate() + s);
            return { plek, volgende: d, naar: p };
        }
    }
    const d = new Date(nu);
    d.setDate(d.getDate() + 14);
    return { plek, volgende: d, naar: plek };
}
/** De twee weken vanaf de maandag van deze week (week 0 = deze week), afgeleid van dezelfde regeling — alleen voor weergave. */
export function tweeWekenVanaf(r, nu) {
    const m = new Date(nu.getFullYear(), nu.getMonth(), nu.getDate());
    m.setDate(m.getDate() - ((m.getDay() + 6) % 7));
    return Array.from({ length: 14 }, (_, i) => { const d = new Date(m); d.setDate(m.getDate() + i); return plekOp(r, d); });
}
