/**
 * Professionele werkruimte: contactjournaal, interne notities, acties voor ouders, berichten, gezamenlijke afspraken,
 * veiligheidsafspraken, doelen, dossiergegevens, betrokken professionals en een append-only activiteitenlog.
 * Soorten blijven technisch gescheiden:
 *  - "notitie"  : interne professionele notitie — nooit zichtbaar voor ouders, nooit in Berichten, standaard niet in exports.
 *  - "journaal" : contactjournaal — zichtbaarheid wordt vóór opslaan expliciet gekozen (geen standaard delen).
 *  - "bericht"  : bericht aan één of beide ouders; ouders zien exact dezelfde tekst. Gezien ≠ akkoord.
 *  - wat ouders zien loopt altijd via voorOudersVan(), zodat de "Bekijk als ouder"-weergave en de ouderapp gelijk blijven.
 * Organisaties: elke professional draagt optioneel een organisatieId, zodat later organisatie → medewerkers → dossiers kan.
 */
import { useSyncExternalStore } from "react";
export const contactTypes = ["Gesprek", "Telefonisch", "Videogesprek", "E-mail", "Overleg", "Huisbezoek", "Anders"];
export const zichtLabel = {
    professionals: "Alleen bevoegde professionals",
    ouders: "Gedeeld met beide ouders",
    aangepast: "Aangepaste zichtbaarheid",
};
/** De ingelogde professional in de demo. */
export const IK = "Marloes";
export const rechtLabel = {
    agenda: "Agenda bekijken", regeling: "Zorg-/omgangsregeling bekijken", communicatie: "Communicatie bekijken",
    berichten: "Berichten sturen", journaal: "Contactjournaal toevoegen", notities: "Interne notities bekijken",
    docBekijken: "Documenten bekijken", docToevoegen: "Documenten toevoegen", acties: "Acties toewijzen",
    veiligBekijken: "Veiligheidsafspraken bekijken", veiligBeheren: "Veiligheidsafspraken beheren", export: "Export maken",
};
export const alleRechten = Object.keys(rechtLabel);
export const proRollen = ["Mediator", "Gezinscoach", "Jeugdzorgwerker", "Scheidingscoach", "Advocaat / juridisch professional", "Andere professional"];
const d = (dagen) => { const x = new Date(); x.setDate(x.getDate() + dagen); return x.toISOString().slice(0, 10); };
export const vandaagIso = () => new Date().toISOString().slice(0, 10);
export const dagenTot = (iso) => Math.round((Date.parse(iso) - Date.parse(vandaagIso())) / 86_400_000);
export const datumKort = (iso) => new Date(iso).toLocaleDateString("nl-NL", { day: "numeric", month: "long" });
export const MAX_PINS = 4;
const allesBehalveBeheer = ["agenda", "regeling", "communicatie", "berichten", "journaal", "notities", "docBekijken", "docToevoegen", "acties", "veiligBekijken", "export"];
let state = {
    journaal: [
        { id: "j1", dossier: "jansen", moment: "2026-09-22T11:30", type: "Gesprek", betrokkenen: ["Sophie", "Mark"], onderwerp: "Vaste wisseltijd", notitie: "We werken aan een vaste wisseltijd op vrijdag.", zicht: "ouders", zichtVoor: [] },
        { id: "j2", dossier: "jansen", moment: "2026-09-29T09:10", type: "Telefonisch", betrokkenen: ["Sophie"], onderwerp: "Planning vakantie", notitie: "Vraag over herfstvakantie, terug te koppelen in gezamenlijk gesprek.", zicht: "professionals", zichtVoor: [] },
        { id: "j3", dossier: "bakker", moment: "2026-09-25T10:00", type: "Gesprek", betrokkenen: ["Sanne", "Joris"], onderwerp: "Zomervakantie volgend jaar", notitie: "Ouders verkennen een verdeling van drie weken per ouder in de zomervakantie.", zicht: "ouders", zichtVoor: [] },
    ],
    notities: [{ id: "n1", dossier: "jansen", moment: "2026-09-24T16:10", tekst: "Beide ouders willen vakantieplanning eerder rond hebben." }],
    acties: [
        { id: "a1", dossier: "jansen", tekst: "Voorstel wisseltijd invullen", voor: "Beide ouders", deadline: d(-1), prioriteit: "normaal", klaar: false },
        { id: "a2", dossier: "deboer", tekst: "Overdrachtsafspraak bevestigen", voor: "Beide ouders", deadline: d(3), prioriteit: "normaal", klaar: false },
        { id: "a3", dossier: "bakker", tekst: "Upload het schoolrooster", omschrijving: "Zodat we de wisselmomenten op schooldagen kunnen afstemmen.", voor: "Beide ouders", deadline: d(5), prioriteit: "normaal", klaar: false },
        { id: "a4", dossier: "smit", tekst: "Vul informatie over halen en brengen aan", voor: "Iris", deadline: d(-2), prioriteit: "hoog", klaar: false },
        { id: "a5", dossier: "jansen", tekst: "Ouders terugkoppelen over conceptafspraak", voor: IK, deadline: d(0), prioriteit: "normaal", klaar: false },
        { id: "a6", dossier: "deboer", tekst: "Schoolrooster bekijken", voor: IK, deadline: d(0), prioriteit: "normaal", klaar: false },
        { id: "a7", dossier: "smit", tekst: "Verslag kennismaking uploaden", voor: IK, deadline: d(1), prioriteit: "normaal", klaar: false },
        { id: "a8", dossier: "bakker", tekst: "Evaluatie voorbereiden", voor: IK, deadline: d(3), prioriteit: "normaal", klaar: false },
    ],
    log: Object.freeze([
        Object.freeze({ id: "l1", dossier: "bakker", moment: "2026-09-25T10:40", tekst: "Contactjournaal toegevoegd (gedeeld met beide ouders)", door: IK, soort: "contact" }),
        Object.freeze({ id: "l2", dossier: "bakker", moment: "2026-09-28T14:00", tekst: "Veiligheidsafspraak toegevoegd: Overdracht via school", door: IK, soort: "veiligheid" }),
        Object.freeze({ id: "l3", dossier: "jansen", moment: "2026-10-01T09:00", tekst: "Zorgregeling gewijzigd: wisselmoment naar vrijdag", door: "Sophie", soort: "wijzigingen" }),
    ]),
    meldingen: { actie: true, document: false, gezamenlijk: true, evaluatie: true, druk: true, wijziging: true },
    berichten: [
        { id: "b1", dossier: "bakker", aan: "Beide ouders", ontvangers: ["Sanne", "Joris"], onderwerp: "Evaluatie zorgregeling", tekst: "Fijn dat we elkaar spraken. Op 18 november evalueren we samen de zorgregeling. Kunnen jullie vooraf het schoolrooster delen?", moment: "2026-09-26T09:15", door: IK, gezien: { Joris: "2026-09-26T12:01" } },
    ],
    gezamenlijk: [
        { id: "g1", dossier: "bakker", tekst: "Vanaf 1 november vindt het wisselmoment op vrijdag om 17:00 uur plaats.", moment: "2026-09-25T10:45", verstuurd: true, gezien: { Joris: "2026-09-25T18:00" }, akkoord: { Joris: "2026-09-26T08:30" }, ingepland: "2026-10-16T14:00" },
    ],
    veilig: [
        { id: "v1", dossier: "bakker", titel: "Overdracht via school", context: "Rustige overdrachten zonder direct contact.", afspraak: "Wisselen gebeurt via school; ouders brengen en halen op verschillende momenten.", betrokkenen: ["Sanne", "Joris"], kind: "Emma & Noah", start: "2026-09-28", evaluatie: d(6), zicht: "ouders", status: "actief" },
        { id: "v2", dossier: "jansen", titel: "Berichttijden", context: "Afspraak over bereikbaarheid.", afspraak: "Berichten over praktische zaken tussen 8:00 uur en 20:00 uur.", betrokkenen: ["Sophie", "Mark"], kind: "Noor & Sem", start: "2026-09-15", evaluatie: d(3), zicht: "ouders", status: "actief" },
    ],
    doelen: [
        { id: "d1", dossier: "bakker", tekst: "Duidelijke overdrachtsafspraken vastleggen", status: "In uitvoering" },
        { id: "d2", dossier: "bakker", tekst: "Vakantieverdeling overeenkomen", status: "Te bespreken" },
        { id: "d3", dossier: "jansen", tekst: "Communicatie structureren", status: "In uitvoering" },
    ],
    pins: {
        bakker: ["Wisselmoment via school", "Evaluatie zorgregeling gepland op 18 november"],
        jansen: ["Communicatie uitsluitend via de app"],
    },
    gegevens: {
        bakker: { gezag: "Gezamenlijk", regeling: "Week op / week af", contactafspraken: "Praktische berichten via de app", start: "2026-03-01", status: "Actief", praktisch: "Wisselen via school op vrijdag", overig: "" },
        jansen: { gezag: "Gezamenlijk", regeling: "Co-ouderschap 50/50", contactafspraken: "Berichten tussen 8:00 uur en 20:00 uur", start: "2026-09-12", status: "Actief", praktisch: "", overig: "" },
    },
    aanmeldingen: {},
    pros: [
        { id: "p-bakker-1", dossier: "bakker", naam: IK, rol: "Mediator", rechten: [...allesBehalveBeheer, "veiligBeheren"], start: "2026-03-01", actief: true, organisatieId: "org-midden" },
        { id: "p-bakker-2", dossier: "bakker", naam: "Ruben", rol: "Gezinscoach", rechten: ["agenda", "acties"], start: "2026-10-01", actief: true },
        { id: "p-jansen-1", dossier: "jansen", naam: IK, rol: "Mediator", rechten: [...allesBehalveBeheer, "veiligBeheren"], start: "2026-09-12", actief: true, organisatieId: "org-midden" },
        { id: "p-deboer-1", dossier: "deboer", naam: IK, rol: "Mediator", rechten: ["agenda", "communicatie", "berichten", "journaal", "notities", "acties", "veiligBekijken"], start: "2026-07-03", actief: true, organisatieId: "org-midden" },
        { id: "p-smit-1", dossier: "smit", naam: IK, rol: "Mediator", rechten: ["journaal", "notities", "docBekijken", "docToevoegen", "acties", "export"], start: "2026-09-22", actief: true, organisatieId: "org-midden" },
    ],
};
const listeners = new Set();
const zet = (p) => { state = { ...state, ...p }; listeners.forEach((l) => l()); };
const logRegel = (dossier, tekst, soort, door = IK) => Object.freeze([...state.log, Object.freeze({ id: crypto.randomUUID(), dossier, moment: new Date().toISOString(), tekst, door, soort })]);
const nuIso = () => new Date().toISOString();
/* ---------- rechten ---------- */
export function mijnRechten(dossier, s = state) {
    return s.pros.find((p) => p.dossier === dossier && p.naam === IK && p.actief)?.rechten ?? [];
}
/* ---------- journaal & notities ---------- */
export function voegJournaalToe(j) {
    if (!j.zicht)
        throw new Error("Kies eerst wie dit mag zien.");
    zet({ journaal: [Object.freeze({ ...j, id: crypto.randomUUID() }), ...state.journaal], log: logRegel(j.dossier, `Contactjournaal toegevoegd (${zichtLabel[j.zicht].toLowerCase()})`, "contact") });
}
export function wijzigZicht(id, zicht) {
    const j = state.journaal.find((x) => x.id === id);
    if (!j || j.zicht === zicht)
        return;
    zet({ journaal: state.journaal.map((x) => (x.id === id ? Object.freeze({ ...x, zicht }) : x)), log: logRegel(j.dossier, `Zichtbaarheid gewijzigd: ${zichtLabel[j.zicht]} → ${zichtLabel[zicht]}`, "contact") });
}
export function voegNotitieToe(dossier, tekst) {
    zet({ notities: [Object.freeze({ id: crypto.randomUUID(), dossier, moment: nuIso(), tekst }), ...state.notities] });
}
/* ---------- acties ---------- */
export function voegActieToe(dossier, tekst, voor, extra = {}) {
    zet({ acties: [{ id: crypto.randomUUID(), dossier, tekst, voor, klaar: false, prioriteit: "normaal", ...extra }, ...state.acties], log: logRegel(dossier, `Actie toegewezen aan ${voor.toLowerCase()}: ${tekst}`, "afspraken") });
}
export function toggleActie(id, door = IK) {
    const a = state.acties.find((x) => x.id === id);
    if (!a)
        return;
    zet({ acties: state.acties.map((x) => (x.id === id ? { ...x, klaar: !x.klaar } : x)), log: logRegel(a.dossier, `Actie ${a.klaar ? "heropend" : "afgerond"}: ${a.tekst}`, "afspraken", door) });
}
export const actieStatus = (a) => (a.klaar ? "Afgerond" : a.deadline && dagenTot(a.deadline) < 0 ? "Verlopen" : "Open");
/** Valt deze actie bij deze ouder? */
export const actieVoor = (a, ouder) => a.voor === "Beide ouders" || a.voor.split(", ").includes(ouder);
/* ---------- berichten (één tekst voor alle ontvangers) ---------- */
export function stuurBericht(dossier, ouders, aan, onderwerp, tekst) {
    const ontvangers = aan === "Beide ouders" ? ouders : [aan];
    zet({ berichten: [{ id: crypto.randomUUID(), dossier, aan, ontvangers, onderwerp, tekst, moment: nuIso(), door: IK, gezien: {} }, ...state.berichten], log: logRegel(dossier, `Bericht verstuurd aan ${aan.toLowerCase()}: ${onderwerp}`, "communicatie") });
}
/* ---------- gesprek ouder ↔ professional: dezelfde berichtenbron ---------- */
/** Gezin van de ouderapp in de professionele omgeving. */
export const GEZIN_DOSSIER = "bakker";
/** Professionals die volgens hun eigen rechten berichten mogen ontvangen in dit dossier, en alleen bij een actief dossier. */
export function bereikbareBegeleiders(dossier, s = state) {
    if (s.gegevens[dossier]?.status !== "Actief")
        return [];
    return s.pros.filter((p) => p.dossier === dossier && p.actief && p.rechten.includes("berichten"));
}
/** Gesprek = dossier + precies deze ouders als lezers (naast de professional). Andere sets zijn een ander gesprek. */
export const zelfdeGesprek = (b, dossier, ouders) => b.dossier === dossier && b.ontvangers.length === ouders.length && ouders.every((o) => b.ontvangers.includes(o));
export function stuurOuderBericht(dossier, door, ouders, tekst) {
    const aan = ouders.length > 1 ? "Beide ouders" : ouders[0] ?? door;
    zet({ berichten: [{ id: crypto.randomUUID(), dossier, aan, ontvangers: ouders, onderwerp: "Gesprek met begeleider", tekst, moment: nuIso(), door, gezien: { [door]: nuIso() } }, ...state.berichten], log: logRegel(dossier, `Bericht van ${door} aan de professional`, "communicatie", door) });
}
export function markeerBerichtGezien(id, ouder) {
    const b = state.berichten.find((x) => x.id === id);
    if (!b || b.gezien[ouder])
        return;
    zet({ berichten: state.berichten.map((x) => (x.id === id ? { ...x, gezien: { ...x.gezien, [ouder]: nuIso() } } : x)), log: logRegel(b.dossier, `${ouder} heeft bericht gezien: ${b.onderwerp}`, "communicatie", ouder) });
}
/* ---------- gezamenlijke afspraken: gezien ≠ akkoord ---------- */
export function legGezamenlijkVast(dossier, tekst, versturen) {
    zet({ gezamenlijk: [{ id: crypto.randomUUID(), dossier, tekst, moment: nuIso(), verstuurd: versturen, gezien: {}, akkoord: {} }, ...state.gezamenlijk], log: logRegel(dossier, versturen ? `Gezamenlijke afspraak ter bevestiging naar ouders: ${tekst}` : `Gezamenlijke afspraak vastgelegd: ${tekst}`, "afspraken") });
}
export function verstuurGezamenlijk(id) {
    const g = state.gezamenlijk.find((x) => x.id === id);
    if (!g || g.verstuurd)
        return;
    zet({ gezamenlijk: state.gezamenlijk.map((x) => (x.id === id ? { ...x, verstuurd: true } : x)), log: logRegel(g.dossier, `Afspraak gedeeld met beide ouders ter bevestiging: ${g.tekst}`, "afspraken") });
}
export function markeerGezamenlijk(id, ouder, wat) {
    const g = state.gezamenlijk.find((x) => x.id === id);
    if (!g || !g.verstuurd || g.akkoord[ouder] || g.nietAkkoord?.[ouder])
        return;
    if (wat === "nietAkkoord") {
        const nieuw = { ...g, nietAkkoord: { ...g.nietAkkoord, [ouder]: nuIso() }, gezien: { ...g.gezien, [ouder]: g.gezien[ouder] ?? nuIso() } };
        zet({ gezamenlijk: state.gezamenlijk.map((x) => (x.id === id ? nieuw : x)), log: logRegel(g.dossier, `${ouder} gaf geen akkoord op: ${g.tekst}`, "afspraken", ouder) });
        return;
    }
    if (g[wat][ouder])
        return;
    const nieuw = { ...g, [wat]: { ...g[wat], [ouder]: nuIso() }, ...(wat === "akkoord" && !g.gezien[ouder] ? { gezien: { ...g.gezien, [ouder]: nuIso() } } : {}) };
    zet({ gezamenlijk: state.gezamenlijk.map((x) => (x.id === id ? nieuw : x)), log: logRegel(g.dossier, `${ouder} ${wat === "akkoord" ? "gaf akkoord op" : "heeft gezien"}: ${g.tekst}`, "afspraken", ouder) });
}
/* ---------- veiligheidsafspraken ---------- */
export function voegVeiligToe(v) {
    zet({ veilig: [{ ...v, id: crypto.randomUUID(), status: "actief" }, ...state.veilig], log: logRegel(v.dossier, `Veiligheidsafspraak toegevoegd: ${v.titel}`, "veiligheid") });
}
export function evalueerVeilig(id, keuze, waarde) {
    const v = state.veilig.find((x) => x.id === id);
    if (!v)
        return;
    let nieuw = v;
    let tekst = "";
    if (keuze === "beeindigen") {
        nieuw = { ...v, status: "beeindigd", eind: vandaagIso() };
        tekst = `Veiligheidsafspraak beëindigd: ${v.titel}`;
    }
    if (keuze === "verlengen" || keuze === "nieuweDatum") {
        const n = waarde ?? d(30);
        nieuw = { ...v, evaluatie: n, eind: keuze === "verlengen" && v.eind ? n : v.eind };
        tekst = `${keuze === "verlengen" ? "Veiligheidsafspraak verlengd" : "Nieuwe evaluatiedatum"}: ${v.titel} → ${datumKort(n)}`;
    }
    if (keuze === "aanpassen" && waarde) {
        nieuw = { ...v, afspraak: waarde };
        tekst = `Veiligheidsafspraak aangepast: ${v.titel} · ${v.afspraak} → ${waarde}`;
    }
    if (!tekst)
        return;
    zet({ veilig: state.veilig.map((x) => (x.id === id ? nieuw : x)), log: logRegel(v.dossier, tekst, "veiligheid") });
}
/* ---------- doelen, pins, gegevens ---------- */
export function voegDoelToe(dossier, tekst) { zet({ doelen: [...state.doelen, { id: crypto.randomUUID(), dossier, tekst, status: "Te bespreken" }] }); }
export function zetDoelStatus(id, status) {
    const dl = state.doelen.find((x) => x.id === id);
    if (!dl || dl.status === status)
        return;
    zet({ doelen: state.doelen.map((x) => (x.id === id ? { ...x, status } : x)), log: logRegel(dl.dossier, `Doel "${dl.tekst}": ${dl.status} → ${status}`, "wijzigingen") });
}
export function pin(dossier, tekst) {
    const l = state.pins[dossier] ?? [];
    if (l.length >= MAX_PINS || l.includes(tekst))
        return;
    zet({ pins: { ...state.pins, [dossier]: [...l, tekst] } });
}
export const ontpin = (dossier, tekst) => zet({ pins: { ...state.pins, [dossier]: (state.pins[dossier] ?? []).filter((x) => x !== tekst) } });
export const legeGegevens = { gezag: "", regeling: "", contactafspraken: "", start: "", status: "Actief", praktisch: "", overig: "" };
export const gegevensLabel = { gezag: "Gezagssituatie", regeling: "Zorg-/omgangsregeling", contactafspraken: "Contactafspraken", start: "Startdatum begeleiding", status: "Status dossier", praktisch: "Belangrijke praktische afspraken", overig: "Overige informatie" };
export function zetGegevens(dossier, g) {
    const oud = state.gegevens[dossier] ?? legeGegevens;
    const gewijzigd = Object.keys(g).filter((k) => oud[k] !== g[k]);
    if (!gewijzigd.length)
        return;
    zet({ gegevens: { ...state.gegevens, [dossier]: g }, log: logRegel(dossier, `Dossiergegevens gewijzigd: ${gewijzigd.map((k) => `${gegevensLabel[k].toLowerCase()} ${oud[k] || "—"} → ${g[k] || "—"}`).join(" · ")}`, "wijzigingen") });
}
/* ---------- professionals per dossier ---------- */
export function geefToegang(dossier, naam, rol, rechten, start) {
    zet({ pros: [...state.pros, Object.freeze({ id: crypto.randomUUID(), dossier, naam, rol, rechten: Object.freeze([...rechten]), start, actief: true })], log: logRegel(dossier, `${IK} gaf ${naam} (${rol}) toegang per ${datumKort(start)}: ${rechten.map((r) => rechtLabel[r].toLowerCase()).join(", ") || "geen rechten"}`, "wijzigingen") });
}
export function wijzigRechten(id, rechten) {
    const p = state.pros.find((x) => x.id === id);
    if (!p)
        return;
    zet({ pros: state.pros.map((x) => (x.id === id ? Object.freeze({ ...x, rechten: Object.freeze([...rechten]) }) : x)), log: logRegel(p.dossier, `Rechten van ${p.naam} gewijzigd: ${rechten.map((r) => rechtLabel[r].toLowerCase()).join(", ") || "geen"}`, "wijzigingen") });
}
/** Toegang stoppen verwijdert geen historische dossiergegevens. */
export function duurBetrokkenheid(start, eind) {
    const datum = (iso) => /^\d{4}-\d{2}-\d{2}$/.test(iso) && Number.isFinite(Date.parse(iso)) && new Date(iso).toISOString().slice(0, 10) === iso;
    if (!datum(start) || !datum(eind) || eind < start)
        return undefined;
    return Math.round((Date.parse(eind) - Date.parse(start)) / 86_400_000);
}
export function trekToegangIn(id, afsluiting) {
    const p = state.pros.find((x) => x.id === id);
    if (!p || !p.actief)
        return;
    if (afsluiting && (!afsluiting.samenvatting.trim() || duurBetrokkenheid(afsluiting.eind, vandaagIso()) === undefined || (p.start && duurBetrokkenheid(p.start, afsluiting.eind) === undefined)))
        throw new Error("Controleer de einddatum en samenvatting.");
    zet({ pros: state.pros.map((x) => (x.id === id ? Object.freeze({ ...x, actief: false, ...(afsluiting ? { afsluiting: Object.freeze({ eind: afsluiting.eind, samenvatting: afsluiting.samenvatting.trim() }) } : {}) }) : x)), log: logRegel(p.dossier, `Toegang van ${p.naam} beëindigd`, "wijzigingen") });
}
export function logDocument(dossier, naam) { zet({ log: logRegel(dossier, `Document toegevoegd: ${naam}`, "documenten") }); }
export function logAfspraak(dossier, tekst) { zet({ log: logRegel(dossier, `Afspraak gepland: ${tekst}`, "afspraken") }); }
export const zetMelding = (k, v) => zet({ meldingen: { ...state.meldingen, [k]: v } });
/** Wat ouders van de professional mogen zien. Interne notities nooit; alleen expliciet gedeelde items. */
export function voorOudersVan(s, dossier, ouder) {
    const voorMij = (lijst) => !ouder || lijst.includes(ouder);
    return {
        journaal: s.journaal.filter((j) => j.dossier === dossier && (j.zicht === "ouders" || (j.zicht === "aangepast" && ouder && j.zichtVoor.includes(ouder)))),
        berichten: s.berichten.filter((b) => b.dossier === dossier && voorMij(b.ontvangers)),
        acties: s.acties.filter((a) => a.dossier === dossier && (!ouder || actieVoor(a, ouder))),
        gezamenlijk: s.gezamenlijk.filter((g) => g.dossier === dossier && g.verstuurd),
        veilig: s.veilig.filter((v) => v.dossier === dossier && v.zicht === "ouders"),
    };
}
export const voorOuders = (dossier) => voorOudersVan(state, dossier).journaal;
export function useProWerk() {
    return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => state, () => state);
}
export const momentKort = (iso) => new Date(iso).toLocaleString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
/** Afgeronde intake vastleggen in bestaande bronnen: gegevens (alleen ingevulde velden), doelen (Te bespreken, zonder dubbelen), aanmelding (intern). Geeft geen gezinstoegang. */
export function legIntakeVast(dossier, a, g, doelen, eigen) {
    const oud = state.gegevens[dossier] ?? legeGegevens;
    const nieuw = { ...oud };
    Object.keys(g).forEach((k) => { const v = g[k]?.trim(); if (v)
        nieuw[k] = v; });
    const bekend = new Set(state.doelen.filter((x) => x.dossier === dossier).map((x) => x.tekst.trim().toLowerCase()));
    const extra = doelen.map((t) => t.trim()).filter((t) => t && !bekend.has(t.toLowerCase()) && (bekend.add(t.toLowerCase()), true));
    const heeftIk = state.pros.some((p) => p.dossier === dossier && p.naam === IK && p.actief);
    zet({
        gegevens: { ...state.gegevens, [dossier]: nieuw },
        doelen: [...state.doelen, ...extra.map((tekst) => ({ id: crypto.randomUUID(), dossier, tekst, status: "Te bespreken" }))],
        aanmeldingen: { ...state.aanmeldingen, [dossier]: Object.freeze({ ...a, hulpverleners: Object.freeze([...a.hulpverleners]) }) },
        pros: heeftIk || !eigen ? state.pros : [...state.pros, Object.freeze({ id: crypto.randomUUID(), dossier, naam: IK, rol: eigen.rol, rechten: Object.freeze(["notities", "journaal", "acties"]), start: eigen.start, actief: true })],
        log: logRegel(dossier, `Intake vastgelegd (intern)${extra.length ? ` · ${extra.length} doel(en) toegevoegd` : ""}`, "wijzigingen"),
    });
}
export const proState = () => state;
