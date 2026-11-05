import { useSyncExternalStore } from "react";
import { afspraken, categorieMeta, zorgweek } from "@/lib/demo-data";
import { kringState } from "@/lib/kring-store";
import { meeLijst, takenState } from "@/lib/taken-store";
import { leg, alleRegels } from "@/lib/audit-store";
import { nuLijst } from "@/lib/nu-afstemmen-store";
/**
 * Slimme laag ("Even vooruitkijken", Deze week, Morgen, Wat moet mee?, conflictcontrole, Sinds je laatste bezoek).
 * Leest en combineert bestaande stores — één bron per gegeven, nooit kopieën. Signalen zijn losse regels;
 * Home toont er hooguit 3. Niets wijzigt zichzelf: elke actie opent de bestaande flow of vraagt bevestiging.
 * Persoonlijke hulp: een suggestie aan de ene ouder wordt niet met de andere ouder gedeeld.
 */
export const DEMO_VANDAAG = "2025-03-12"; // woensdag, gelijk aan de rest van de demo
const dagNamen = ["zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag"];
const isoVanDag = (dag) => `2025-03-${String(dag).padStart(2, "0")}`;
const weekdag = (iso) => dagNamen[new Date(`${iso}T00:00`).getDay()];
/** Neem de dagnaam uit de agenda zelf over, zodat Home en Agenda altijd dezelfde dag noemen. */
const dagVan = (a) => { const w = a.datumLabel.split(" ")[0].toLowerCase(); return dagNamen.includes(w) ? w : a.datumLabel === "Vandaag" ? "vandaag" : weekdag(isoVanDag(a.dag)); };
const minuten = (t) => { const m = /^(\d{1,2}):(\d{2})/.exec(t); return m ? Number(m[1]) * 60 + Number(m[2]) : null; };
const kindPast = (a, b) => {
    if (!a.trim() || !b.trim())
        return false;
    if ([a, b].some((x) => /^(allebei|alle kinderen|de kinderen)$/i.test(x.trim())))
        return true;
    const namen = (x) => x.toLowerCase().split(/\s*(?:&|,|\ben\b)\s*/).map((n) => n.trim()).filter(Boolean);
    return namen(a).some((n) => namen(b).includes(n));
};
let state = {
    routines: [
        { id: "r1", dag: "maandag", kind: "emma", item: "Gymtas Emma", reden: "Elke maandag gym" },
        { id: "r2", dag: "zaterdag", kind: "emma", item: "Zwemtas Emma", reden: "Elke zaterdag zwemles" },
        { id: "r3", dag: "vrijdag", kind: "noah", item: "Bibliotheekboek Noah", reden: "Elke vrijdag bibliotheek" },
    ],
    wieGaat: {},
    afstem: {},
    later: {},
    nietMeer: [],
    routineNietNodig: [],
};
const SLEUTEL = "onzeapp-slimme-hulp";
let geladen = false;
function laad() {
    if (geladen || typeof window === "undefined")
        return;
    geladen = true;
    try {
        const v = JSON.parse(localStorage.getItem(SLEUTEL) ?? "{}");
        if (Array.isArray(v.nietMeer))
            state = { ...state, nietMeer: v.nietMeer };
        if (Array.isArray(v.routines))
            state = { ...state, routines: v.routines };
        if (Array.isArray(v.routineNietNodig))
            state = { ...state, routineNietNodig: v.routineNietNodig };
        if (v.later && typeof v.later === "object" && !Array.isArray(v.later)) {
            state = { ...state, later: Object.fromEntries(Object.entries(v.later).filter(([, tijd]) => typeof tijd === "number" && Number.isFinite(tijd))) };
        }
    }
    catch { /* standaard */ }
}
const listeners = new Set();
const zet = (p) => {
    state = { ...state, ...p };
    try {
        localStorage.setItem(SLEUTEL, JSON.stringify({ later: state.later, nietMeer: state.nietMeer, routines: state.routines, routineNietNodig: state.routineNietNodig }));
    }
    catch { /* privémodus */ }
    listeners.forEach((l) => l());
};
export function useSlimmeHulp() {
    return useSyncExternalStore((l) => { laad(); listeners.add(l); return () => listeners.delete(l); }, () => { laad(); return state; }, () => state);
}
export const voegRoutineToe = (r) => zet({ routines: [...state.routines, { ...r, id: `r${Date.now()}` }] });
export const verwijderRoutine = (id) => zet({ routines: state.routines.filter((r) => r.id !== id) });
/** Patroonvoorstel bewust afgewezen: wordt onthouden, zodat de app het niet opnieuw vraagt. */
export const routineNietNodig = (sleutel) => zet({ routineNietNodig: [...new Set([...state.routineNietNodig, sleutel])] });
export const laterHerinneren = (id, tot) => {
    if (!Number.isFinite(tot) || tot <= Date.now())
        return;
    zet({ later: { ...state.later, [id]: tot } });
};
export const nietMeerTonen = (t) => zet({ nietMeer: [...new Set([...state.nietMeer, t])] });
export const zetWeerAan = () => zet({ nietMeer: [], later: {}, routineNietNodig: [] });
export function ikGa(afspraakId, titel) {
    leg("afspraak", afspraakId, titel, "UPDATED", { veld: "wie gaat mee", oud: "Nog niet bepaald", nieuw: "Sanne" });
    zet({ wieGaat: { ...state.wieGaat, [afspraakId]: "sanne" } });
}
const plekNaam = (p) => (p === "sanne" ? "bij jou" : p === "joris" ? "bij de andere ouder" : "op een andere plek");
/** Wie heeft het kind die dag volgens de huidige zorgweek (alleen demo-week 10–16 maart bekend). */
const verblijfOp = (iso) => zorgweek.find((d) => isoVanDag(d.datum) === iso)?.ouder;
const regelOverdracht = () => {
    const w = kringState().momenten.find((m) => m.soort === "wissel");
    if (!w)
        return [];
    const klaar = kringState().meeKlaar[w.id] ?? [];
    const open = meeLijst(w).filter((x) => !klaar.includes(x));
    const extra = mogelijkMee(w).length;
    if (!open.length && !extra)
        return [];
    return [{
            id: `transfer-${w.id}`, type: "upcoming_transfer", prioriteit: 1,
            titel: `Voor de wissel ${w.dag.toLowerCase()}`,
            tekst: `${w.dag} ${w.tijd} is het volgende wisselmoment. ${open.length ? `${open.length} ${open.length === 1 ? "ding staat" : "dingen staan"} nog niet klaar` : "Je lijst is klaar"}${extra ? `, en ${extra} ${extra === 1 ? "ding is" : "dingen zijn"} wellicht nodig.` : "."}`,
            waarom: `Het wisselmoment staat in de planning en de meeneemlijst komt uit Overdracht${extra ? ", aangevuld met jullie routines en activiteiten in de dagen erna" : ""}.`,
            acties: [{ label: "Wat moet mee?", to: "/overdracht" }],
        }];
};
const regelSpullen = ({ vandaag }) => {
    const uit = [];
    for (const s of takenState().spullen.filter((x) => x.type === "vast" && x.plek)) {
        // Zoek een komende sportactiviteit van hetzelfde kind binnen 3 dagen
        const a = afspraken.find((x) => x.categorie === "sport" && x.kind.toLowerCase() === s.kind && isoVanDag(x.dag) >= vandaag && x.dag - Number(vandaag.slice(8)) <= 3);
        if (!a)
            continue;
        const bij = verblijfOp(isoVanDag(a.dag));
        if (!bij || bij === s.plek)
            continue;
        uit.push({
            id: `mismatch-${s.id}-${a.id}`, type: "item_location_mismatch", prioriteit: 1,
            titel: `Handig voor ${dagVan(a)}`,
            tekst: `${dagVan(a).replace(/^./, (c) => c.toUpperCase())} heeft ${a.kind} ${a.titel.toLowerCase()} en de ${s.naam.toLowerCase()} staan ${plekNaam(s.plek)}.`,
            waarom: `${a.titel} staat ${dagVan(a)} in de Agenda en de ${s.naam.toLowerCase()} staan in Spullen geregistreerd ${plekNaam(s.plek)}.`,
            acties: [{ label: "Bekijk spullen", to: "/spullen" }],
        });
    }
    return uit;
};
const regelWieGaat = ({ vandaag }) => afspraken
    .filter((a) => (a.categorie === "medisch" || a.categorie === "school") && isoVanDag(a.dag) > vandaag && a.dag - Number(vandaag.slice(8)) <= 7 && !state.wieGaat[a.id])
    .slice(0, 1)
    .map((a) => ({
    id: `wie-${a.id}`, type: "unassigned_task", prioriteit: 2,
    titel: "Nog even verdelen",
    tekst: `${a.titel} staat ${dagVan(a)} ${a.tijd} in de agenda, maar nog niet is aangegeven wie meegaat.`,
    waarom: `${a.titel} staat in de Agenda zonder 'Wie gaat mee?'.`,
    acties: [{ label: "Ik ga", doe: () => ikGa(a.id, a.titel) }, { label: "Samen regelen", to: "/samen-regelen" }],
}));
const regelDeadline = ({ vandaag }) => takenState().taken
    .filter((t) => !t.klaar && t.deadline && t.deadline >= vandaag && (new Date(t.deadline).getTime() - new Date(vandaag).getTime()) / 864e5 <= 7)
    .slice(0, 1)
    .map((t) => ({
    id: `deadline-${t.id}`, type: "upcoming_deadline", prioriteit: 1,
    titel: "Bijna rond", tekst: `${t.tekst} — uiterlijk ${new Date(t.deadline).toLocaleDateString("nl-NL", { day: "numeric", month: "long" })}.`,
    waarom: "Deze taak heeft een deadline binnen een week in Taken.", acties: [{ label: "Bekijk taak", to: "/taken" }],
}));
// Home 9.0: de overdracht staat alleen in de kaart Vandaag (binnen 24 uur) — niet nog eens als tip.
void regelOverdracht;
const regels = [regelSpullen, regelDeadline, regelWieGaat];
/** Hooguit 3, gesorteerd op prioriteit; weggedrukte en uitgezette soorten komen niet terug. Geen zichtbare score. */
export function suggesties(vandaag = DEMO_VANDAAG) {
    laad();
    return regels.flatMap((r) => r({ vandaag }))
        .filter((s) => (state.later[s.id] ?? 0) <= Date.now() && !state.nietMeer.includes(s.type))
        .sort((a, b) => a.prioriteit - b.prioriteit)
        .slice(0, 3);
}
/* ---------- Wat moet mee? (alleen uit routines en bevestigde activiteiten — nooit verzonnen) ---------- */
export function mogelijkMee(m) {
    const al = meeLijst(m);
    const k = kringState();
    const volgende = k.momenten.filter((x) => x.id !== m.id && x.datum > m.datum && x.kindIds.some((id) => m.kindIds.includes(id)));
    const totWissel = volgende.find((x) => x.soort === "wissel")?.datum ?? "9999";
    const uitActiviteit = volgende.filter((x) => x.soort === "afspraak" && x.datum < totWissel).flatMap((x) => x.mee.map((item) => ({ item, reden: `${x.titel} ${x.dag.toLowerCase()} ${x.tijd}` })));
    const dagen = new Set();
    const lok = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    for (let d = new Date(`${m.datum}T00:00`); lok(d) <= (totWissel === "9999" ? m.datum : totWissel); d.setDate(d.getDate() + 1))
        dagen.add(dagNamen[d.getDay()]);
    const uitRoutine = state.routines.filter((r) => m.kindIds.includes(r.kind) && dagen.has(r.dag)).map((r) => ({ item: r.item, reden: r.reden }));
    const gezien = new Set(al.map((x) => x.toLowerCase()));
    return [...uitActiviteit, ...uitRoutine].filter((x) => { const k2 = x.item.toLowerCase(); if (gezien.has(k2))
        return false; gezien.add(k2); return true; });
}
export function weekOverzicht(vandaag = DEMO_VANDAAG) {
    laad();
    const start = new Date(`${vandaag}T00:00`);
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    const wissel = kringState().momenten.find((m) => m.soort === "wissel");
    const meeOpen = wissel ? meeLijst(wissel).filter((x) => !(kringState().meeKlaar[wissel.id] ?? []).includes(x)).length : 0;
    return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        const dagNaam = dagNamen[d.getDay()];
        const weekDagen = (a) => a.dag >= start.getDate() && a.dag <= start.getDate() + 6;
        const regels = afspraken.filter((a) => weekDagen(a) && (dagVan(a) === "vandaag" ? "donderdag" : dagVan(a)) === dagNaam).map((a) => ({
            tijd: a.tijd, tekst: a.categorie === "wissel" ? "Wisselmoment" : `${a.titel} · ${a.kind}`,
            sub: a.categorie === "wissel" && meeOpen ? `${meeOpen} ${meeOpen === 1 ? "ding moet" : "dingen moeten"} mee` : categorieMeta[a.categorie].label,
            naar: a.categorie === "wissel" ? "/overdracht" : "/agenda",
            dag: a.categorie === "wissel" ? undefined : iso,
        }));
        regels.sort((x, y) => (x.tijd ?? "").localeCompare(y.tijd ?? ""));
        for (const r of state.routines.filter((x) => x.dag === dagNaam))
            regels.push({ tekst: r.reden, sub: `${r.item} mee`, naar: "/overdracht" });
        return { iso, label: dagNaam.replace(/^./, (c) => c.toUpperCase()), regels };
    });
}
export const morgenOverzicht = (vandaag = DEMO_VANDAAG) => {
    const d = new Date(`${vandaag}T00:00`);
    d.setDate(d.getDate() + 1);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return weekOverzicht(vandaag).find((x) => x.iso === iso) ?? { iso, label: dagNamen[d.getDay()], regels: [] };
};
export const nogTeRegelenDezeWeek = () => regels.flatMap((r) => r({ vandaag: DEMO_VANDAAG })).filter((s) => s.prioriteit <= 2).length;
export function overlappendeAfspraken(p, bestaand, ignore) {
    const start = minuten(p.tijd), eind = minuten(p.eindtijd ?? "");
    if (start === null)
        return [];
    return bestaand.filter((a) => {
        if ((ignore && a.id === ignore) || a.datum !== p.datum || !kindPast(a.kind, p.kind))
            return false;
        const s = minuten(a.tijd), e = minuten(a.eindtijd ?? "");
        if (s === null)
            return false;
        // With no known duration, compare the actual point in time; never invent a one-hour appointment.
        if (eind === null && e === null)
            return start === s;
        if (eind === null)
            return e !== null && start >= s && start < e;
        if (e === null)
            return s >= start && s < eind;
        return start < e && s < eind;
    });
}
export function controleerAfspraak(p, extra = [], ignore, metDemo = true) {
    const uit = [];
    const start = minuten(p.tijd);
    if (start !== null) {
        const bestaand = [...(metDemo ? afspraken.filter((a) => a.categorie !== "vakantie").map((a) => ({ id: a.id, titel: a.titel, datum: isoVanDag(a.dag), tijd: a.tijd, kind: a.kind })) : []), ...extra];
        for (const botst of overlappendeAfspraken(p, bestaand, ignore))
            uit.push({ soort: "overlap", tekst: `Er staat op dit moment al een afspraak gepland: ${botst.titel} (${botst.tijd} uur).`, afspraakId: botst.id });
        // Alleen melden als het wisselmoment werkelijk in de buurt ligt; niet elk verband is een melding.
        const wissel = metDemo ? kringState().momenten.find((m) => m.soort === "wissel" && m.datum === p.datum && m.kindIds.some((k) => kindPast(k, p.kind))) : undefined;
        const wisselTijd = wissel ? minuten(wissel.tijd) : null;
        if (wissel && wisselTijd !== null && Math.abs(wisselTijd - start) <= 60)
            uit.push({ soort: "wissel", tekst: `${p.kind} wisselt die dag om ${wissel.tijd} en ${p.titel.toLowerCase()} is om ${p.tijd}.` });
    }
    // Een vaststaand feit (bijv. schoolactiviteit) plant de ouder niet zelf: geen afstemvraag over de verblijfdag.
    const bij = !metDemo || p.categorie === "school" ? undefined : verblijfOp(p.datum);
    if (bij && bij !== "sanne") {
        const wie = /allebei|&/i.test(p.kind) ? "De kinderen zijn" : `${p.kind} is`;
        uit.push({ soort: "verblijf", tekst: `${wie} die dag volgens de planning bij Joris. Wil je even afstemmen of dit uitkomt?` });
    }
    return uit;
}
export function controleerPrive(p, extra = []) {
    const start = minuten(p.tijd);
    if (start === null)
        return [];
    const eind = minuten(p.eindtijd ?? "") ?? start + 60;
    const binnen = (t) => { const m = minuten(t); return m !== null && m >= start - 15 && m <= eind; };
    const uit = [];
    const wissel = kringState().momenten.find((m) => m.soort === "wissel" && (m.datum === p.datum || weekdag(m.datum) === weekdag(p.datum)) && binnen(m.tijd));
    if (wissel)
        uit.push({ kind: "de kinderen", titel: "het wisselmoment", tekst: `Je staat om ${wissel.tijd} ingepland voor het wisselmoment.`, bericht: `Het wisselmoment om ${wissel.tijd} lukt mij die dag niet. Kunnen we een ander moment kiezen?` });
    const bijMij = verblijfOp(p.datum) === "sanne";
    const kindAfspraken = [...afspraken.filter((a) => a.categorie !== "vakantie").map((a) => ({ id: a.id, titel: a.titel, datum: isoVanDag(a.dag), tijd: a.tijd, kind: a.kind })), ...extra];
    for (const a of kindAfspraken) {
        if (a.datum !== p.datum || !binnen(a.tijd))
            continue;
        const ingepland = a.id ? state.wieGaat[a.id] === "sanne" : false;
        if (!ingepland && !bijMij)
            continue; // kind bij de ander en geen taak: geen melding
        const t = a.titel.split(" · ")[0].toLowerCase();
        uit.push({ kind: a.kind, titel: t, tekst: `Je staat ingepland om ${a.kind} naar ${t} te brengen (${a.tijd}).`, bericht: `Ik kan ${a.kind} die dag niet naar ${t} brengen. Kun jij dit overnemen?` });
    }
    return uit;
}
/** Eén afspraak, één verzoek: het verzoek wordt gekoppeld, niet erbij gezet. */
export const koppelAfstem = (afspraakId, verzoekId) => {
    state = { ...state, afstem: { ...state.afstem, [afspraakId]: verzoekId } };
    listeners.forEach((l) => l());
};
/** "Afgestemd ✓" alleen als de andere ouder positief antwoordde; geen reactie = geen akkoord. */
export function afstemStatus(afspraakId) {
    const id = state.afstem[afspraakId];
    if (!id)
        return "geen";
    const n = nuLijst().find((x) => x.id === id);
    if (!n)
        return "open";
    if (n.status !== "opgelost")
        return "open";
    return /(is goed|akkoord|^ja|haal op|pak op)/i.test(n.antwoord ?? "") ? "akkoord" : "geen";
}
/* ---------- Sinds je laatste bezoek: gebundeld, alleen praktisch relevante wijzigingen ---------- */
const BEZOEK = "onzeapp-laatste-bezoek";
export function sindsLaatsteBezoek() {
    if (typeof window === "undefined")
        return null;
    let vorige = null;
    try {
        vorige = localStorage.getItem(BEZOEK);
        localStorage.setItem(BEZOEK, new Date().toISOString());
    }
    catch {
        return null;
    }
    if (!vorige)
        return null;
    // Alleen als je de app een tijdje (≥ 1 uur) niet hebt geopend
    if (Date.now() - new Date(vorige).getTime() < 36e5)
        return null;
    const nieuw = alleRegels().filter((e) => e.moment > vorige && e.actie !== "EXPORTED" && e.actorId !== "sanne");
    if (!nieuw.length)
        return null;
    const routes = { afspraak: "/agenda", kosten: "/kosten", schema: "/zorgregeling", besluit: "/beslissingen", dossier: "/exporteren", taak: "/taken", spul: "/spullen" };
    const recent = [...nieuw].reverse().filter((e, i, l) => l.findIndex((x) => x.soort === e.soort && x.itemId === e.itemId) === i);
    return { sinds: vorige, regels: recent.slice(0, 3).map((e) => ({ id: e.eventId, tekst: `${e.itemNaam} · ${e.actie === "ACCEPTED" ? "akkoord" : e.actie === "CREATED" ? "toegevoegd" : e.actie === "DELETED" ? "verwijderd" : "bijgewerkt"}`, to: routes[e.soort], hash: `item-${e.itemId}` })) };
}
