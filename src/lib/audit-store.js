import { useSyncExternalStore } from "react";
export const soortLabel = { afspraak: "Afspraak", schema: "Wijzigingsverzoek", besluit: "Besluit", kosten: "Kostenpost", taak: "Taak", spul: "Spul", dossier: "Dossier" };
const actoren = {
    sanne: { naam: "Sanne", rol: "Ouder" },
    joris: { naam: "Joris", rol: "Ouder" },
    mediator: { naam: "Mediator", rol: "Professional" },
};
let teller = 0;
function maak(e) {
    const a = actoren[e.actorId] ?? { naam: e.actorId, rol: "Onbekend" };
    return Object.freeze({
        ...e,
        eventId: `ev_${Date.parse(e.moment).toString(36)}_${(teller++).toString(36)}`,
        actorNaam: a.naam,
        actorRol: a.rol,
        wijzigingen: Object.freeze((e.wijzigingen ?? []).map((w) => Object.freeze({ ...w }))),
        kinderen: Object.freeze([...(e.kinderen ?? [])]),
        meta: Object.freeze({ ...(e.meta ?? {}) }),
    });
}
/** Echte geschiedenis: begint leeg. Er staan hier bewust geen voorbeeldgebeurtenissen in. */
let events = Object.freeze([]);
const listeners = new Set();
const oudeActie = { toegevoegd: "CREATED", gewijzigd: "UPDATED", verwijderd: "DELETED" };
/** Enige schrijfactie: een nieuw event toevoegen. De ingelogde ouder in de demo is Sanne. */
export function leg(soort, itemId, itemNaam, actie, wijziging, door = "Sanne", extra) {
    if (wijziging && wijziging.oud === wijziging.nieuw)
        return;
    let code = oudeActie[actie] ?? actie;
    if (code === "UPDATED" && wijziging?.veld === "status") {
        if (wijziging.nieuw === "geaccepteerd")
            code = "ACCEPTED";
        else if (wijziging.nieuw === "geweigerd")
            code = "DECLINED";
    }
    const ev = maak({
        soort, itemId, itemNaam, actorId: door.toLowerCase(), actie: code, moment: new Date().toISOString(),
        ...(wijziging ? { wijzigingen: [wijziging] } : {}), ...(extra?.kinderen ? { kinderen: extra.kinderen } : {}), ...(extra?.meta ? { meta: extra.meta } : {}),
    });
    events = Object.freeze([...events, ev]);
    listeners.forEach((l) => l());
}
/** Vergelijk twee versies van een item veld voor veld en leg de verschillen vast als één event. */
export function legVerschillen(soort, itemId, itemNaam, oud, nieuw, velden, door = "Sanne") {
    const wijzigingen = Object.keys(velden)
        .map((k) => ({ veld: velden[k], oud: String(oud[k] ?? "—"), nieuw: String(nieuw[k] ?? "—") }))
        .filter((x) => x.oud !== x.nieuw);
    if (!wijzigingen.length)
        return;
    const status = wijzigingen.find((x) => x.veld === "status")?.nieuw;
    const actie = status === "geaccepteerd" ? "ACCEPTED" : status === "geweigerd" ? "DECLINED" : "UPDATED";
    events = Object.freeze([...events, maak({ soort, itemId, itemNaam, actorId: door.toLowerCase(), actie, moment: new Date().toISOString(), wijzigingen })]);
    listeners.forEach((l) => l());
}
export function useAudit() {
    return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => events, () => events);
}
export const alleRegels = () => events;
export const momentTekst = (iso) => new Date(iso).toLocaleString("nl-NL", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }).replace(" om", " ·");
const actieTekst = {
    CREATED: "aangemaakt", UPDATED: "gewijzigd", DELETED: "verwijderd", ACCEPTED: "geaccepteerd",
    DECLINED: "afgewezen", CANCELLED: "geannuleerd", EXPORTED: "gegenereerd",
};
/** Korte, feitelijke kop voor een event (zonder interpretatie). */
export function eventKop(e) {
    if (e.actie === "UPDATED" && e.wijzigingen.length === 1)
        return `${e.actorNaam} wijzigde ${e.wijzigingen[0].veld}`;
    return `${soortLabel[e.soort]} ${actieTekst[e.actie]} door ${e.actorNaam}`;
}
/** Regels "oud → nieuw" voor weergave. */
export const eventWijzigingen = (e) => e.wijzigingen.map((x) => `${x.veld}: ${x.oud} → ${x.nieuw}`);
export function regelTekst(e) {
    const wz = eventWijzigingen(e);
    return wz.length ? `${eventKop(e)} · ${wz.join(" · ")}` : eventKop(e);
}
