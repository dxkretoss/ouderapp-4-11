import { isOpen } from "./openstaande-voorstellen";
export const categorieTitel = {
    regelen: "Nog te regelen", gewijzigd: "Gewijzigd", info: "Ter informatie",
};
const tijdTekst = (iso) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? "" : d.toLocaleString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).replace(" om", ",") + " uur";
};
/** Eenvoudige taal: "Afspraak in de agenda" vs. "Afspraak tussen jullie". */
const bronTerm = {
    zorg: "Zorgregeling", afspraak: "Afspraak tussen jullie", budget: "Budgetvoorstel",
    vakantie: "Vakantieafspraak", kost: "Uitgave", aanwezigheid: "Afspraak in de agenda",
};
function uitVoorstel(v, i) {
    const basis = { naar: v.naar, volgorde: v.verzonden ? Date.parse(v.verzonden) || 1e12 - i : 1e12 - i, tijd: v.verzonden && !Number.isNaN(Date.parse(v.verzonden)) ? tijdTekst(v.verzonden) : "" };
    if (v.aanJou && isOpen(v)) {
        return { ...basis, id: `act-${v.sleutel}`, categorie: "regelen", icoon: "samen", verzoek: true,
            titel: v.titel.replace(/^(Budget|Vakantie|Uitgave): /, ""), uitleg: `${bronTerm[v.bron]} · ${v.omschrijving}` };
    }
    if (v.status === "akkoord" || v.status === "afgerond") {
        return { ...basis, id: `act-${v.sleutel}-klaar`, categorie: "info", icoon: "akkoord", verzoek: false,
            titel: `${bronTerm[v.bron]} geregeld`, uitleg: v.titel };
    }
    return null;
}
const termAudit = {
    afspraak: "Afspraak in de agenda", schema: "Zorgregeling", besluit: "Afspraak tussen jullie",
    kosten: "Uitgave", taak: "Taak", spul: "Spul", dossier: "Dossier",
};
function uitAudit(e) {
    if (e.soort === "dossier" || e.actie === "EXPORTED")
        return null;
    const term = termAudit[e.soort];
    const naar = e.soort === "afspraak" ? "/agenda" : e.soort === "schema" ? "/zorgregeling" : e.soort === "besluit" ? "/afspraken" : e.soort === "kosten" ? "/kosten" : "/taken";
    const details = [
        { label: "Wat", waarde: e.itemNaam },
        ...(e.meta["datum"] ? [{ label: "Datum", waarde: e.meta["datum"] }] : []),
        ...(e.meta["tijd"] ? [{ label: "Tijd", waarde: e.meta["tijd"] }] : []),
        ...(e.kinderen.length ? [{ label: "Kinderen", waarde: e.kinderen.join(", ") }] : []),
        { label: "Door", waarde: e.actorNaam },
        { label: "Wanneer", waarde: tijdTekst(e.moment) },
        ...(e.meta["reden"] ? [{ label: "Reden", waarde: e.meta["reden"] }] : []),
    ];
    const basis = { id: `act-${e.eventId}`, volgorde: Date.parse(e.moment), tijd: tijdTekst(e.moment), naar, verzoek: false, details, wijzigingen: e.wijzigingen };
    if (e.actie === "DELETED")
        return { ...basis, categorie: "gewijzigd", icoon: "afwijzen", titel: `${term} verwijderd`, uitleg: `${e.actorNaam} heeft ${e.itemNaam} verwijderd.` };
    if (e.actie === "UPDATED") {
        const w = e.wijzigingen[0];
        return { ...basis, categorie: "gewijzigd", icoon: "wissel", titel: `${term} gewijzigd`,
            uitleg: w ? `${e.actorNaam} heeft ${w.veld} van ${e.itemNaam} veranderd van ${w.oud} naar ${w.nieuw}.` : `${e.actorNaam} heeft ${e.itemNaam} gewijzigd.` };
    }
    if (e.actie === "CREATED")
        return { ...basis, categorie: "info", icoon: "agenda", titel: `Nieuwe ${term.charAt(0).toLowerCase()}${term.slice(1)}`, uitleg: `${e.actorNaam}: ${e.itemNaam}` };
    if (e.actie === "ACCEPTED")
        return { ...basis, categorie: "info", icoon: "akkoord", titel: `${term} goedgekeurd`, uitleg: `${e.actorNaam} gaf akkoord op ${e.itemNaam}.` };
    if (e.actie === "DECLINED" || e.actie === "CANCELLED")
        return { ...basis, categorie: "gewijzigd", icoon: "info", titel: `${term}: ${e.actie === "DECLINED" ? "niet akkoord" : "ingetrokken"}`, uitleg: `${e.actorNaam} · ${e.itemNaam}` };
    return null;
}
function uitMomentje(m, i, ik) {
    if (m.prive || m.van === ik)
        return null;
    return { id: `act-moment-${m.id}`, categorie: "info", icoon: "momentjes", verzoek: false, volgorde: 1e9 - i, tijd: m.wanneer.split(" · ")[0] ?? "",
        titel: "Momentje gedeeld", uitleg: m.tekst.replace(/\p{Extended_Pictographic}/gu, "").trim(), naar: "/momentjes" };
}
/** Bundel informatieve gebeurtenissen van hetzelfde type (nooit verzoeken of wijzigingen). */
export function bundel(lijst) {
    const uit = [];
    const groepen = new Map();
    for (const a of lijst) {
        if (a.categorie !== "info") {
            uit.push(a);
            continue;
        }
        const k = a.titel;
        groepen.set(k, [...(groepen.get(k) ?? []), a]);
    }
    for (const [titel, g] of groepen) {
        if (g.length === 1) {
            uit.push(g[0]);
            continue;
        }
        const s = [...g].sort((a, b) => b.volgorde - a.volgorde);
        const kop = s[0];
        const meervoud = titel === "Momentje gedeeld" ? `${g.length} Momentjes gedeeld` : `${titel} (${g.length})`;
        uit.push({ ...kop, id: `bundel-${s.map((x) => x.id).join("+")}`, titel: meervoud, uitleg: kop.uitleg, onderdelen: s });
    }
    return uit;
}
export function verzamelActiviteiten(b) {
    const ruw = [
        ...b.voorstellen.map(uitVoorstel),
        ...b.audit.filter((e) => e.actorId !== b.ik).map(uitAudit),
        ...b.momentjes.map((m, i) => uitMomentje(m, i, b.ik)),
    ].filter((x) => x !== null);
    const uniek = [...new Map(ruw.map((a) => [a.id, a])).values()];
    return bundel(uniek);
}
const VOLGORDE = ["regelen", "gewijzigd", "info"];
/** Groepeer per categorie in vaste volgorde, nieuwste bovenaan; lege categorieën vallen weg. */
export function perCategorie(l) {
    return VOLGORDE.map((c) => ({ categorie: c, items: l.filter((a) => a.categorie === c).sort((a, b) => b.volgorde - a.volgorde) }))
        .filter((g) => g.items.length > 0);
}
const alleIds = (a) => a.onderdelen ? a.onderdelen.map((o) => o.id) : [a.id];
export const isGelezen = (a, gelezen) => alleIds(a).every((id) => gelezen.includes(id));
/** Nieuw = ongelezen, plus openstaande verzoeken (die blijven tot ze in de bron zijn afgehandeld). */
export const nieuw = (l, gelezen) => l.filter((a) => a.verzoek || !isGelezen(a, gelezen));
/** Bolletje op het belletje: alleen bij iets ongelezens. */
export const heeftNieuws = (l, gelezen) => l.some((a) => !isGelezen(a, gelezen));
export const markeerIds = alleIds;
