const ALGEMEEN = new Set(["groep", "extra", "nieuw", "nieuwe", "kosten", "voor", "van"]);
const woorden = (s) => s.toLowerCase().split(/[^a-zà-ÿ0-9]+/).filter((w) => w.length > 3 && !ALGEMEEN.has(w));
/** Herkenbaar onderwerp: hetzelfde woord of een vervoeging ervan (zwemles/zwemlessen), geen losse letterovereenkomst. */
const lijkt = (a, b) => woorden(a).some((w) => woorden(b).some((x) => x === w || x.startsWith(w) || w.startsWith(x)));
const MAANDEN = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];
/** "10 maart" / "10 maart 2025" / ISO → Date; onbekend formaat → null (dan geen automatische dekking). */
export function leesDatum(s, jaar) {
    if (!s)
        return null;
    if (/^\d{4}-\d{2}-\d{2}/.test(s))
        return new Date(`${s.slice(0, 10)}T12:00:00Z`);
    const m = s.trim().toLowerCase().match(/^(\d{1,2})\s+([a-z]+)(?:\s+(\d{4}))?$/);
    const mi = m?.[2] ? MAANDEN.indexOf(m[2]) : -1;
    if (!m || mi < 0)
        return null;
    return new Date(Date.UTC(m[3] ? Number(m[3]) : jaar, mi, Number(m[1]), 12));
}
/** Telt al als goedgekeurde uitgave (gebruikt budgetruimte). Concept, wacht en betwist niet. */
const goedgekeurd = (s) => s === "openstaand" || s === "bevestigd" || s === "verrekend" || s === "betaald";
const zelfdeAangifte = (a, b) => a.omschrijving.trim().toLowerCase() === b.omschrijving.trim().toLowerCase() && a.bedrag === b.bedrag && a.kind === b.kind && (a.datum ?? "") === (b.datum ?? "");
function periodeSleutel(b, d) {
    return b.periode === "maand" ? `${d.getUTCFullYear()}-${d.getUTCMonth()}` : b.periode === "jaar" ? `${d.getUTCFullYear()}` : "eenmalig";
}
function past(b, k) {
    if (b.status !== "akkoord" && b.status !== "uitgegeven")
        return false;
    if (k.budgetId && k.budgetId !== b.id)
        return false;
    if (b.kind && b.kind !== "Beide" && b.kind !== k.kind)
        return false;
    // Categorie moet kloppen; bij een eenmalig budget moet ook het onderwerp herkenbaar zijn.
    if (b.categorie ? b.categorie !== k.categorie : !k.budgetId && !lijkt(b.wat, k.omschrijving))
        return false;
    if (!k.budgetId && (b.periode ?? "eenmalig") === "eenmalig" && !lijkt(b.wat, k.omschrijving))
        return false;
    return true;
}
/**
 * Beoordeel alle uitgaven tegelijk, oudste eerst, zodat elke uitgave maar één keer budgetruimte gebruikt.
 * Alleen uitgaven met status "wacht" krijgen een beoordeling.
 */
export function beoordeelKosten(alle, budgetten, vandaag = "2025-03-12") {
    const jaar = Number(vandaag.slice(0, 4));
    const uit = new Map();
    const gebruikt = new Map(); // budgetId|periode → bedrag
    const sleutel = (k, i) => k.id ?? `#${i}`;
    const geordend = alle.map((k, i) => ({ k, i, d: leesDatum(k.datum, jaar) })).sort((a, b) => (a.d?.getTime() ?? 0) - (b.d?.getTime() ?? 0) || b.i - a.i);
    for (const { k, i, d } of geordend) {
        // Dubbele aangifte: een eerdere identieke uitgave (niet afgewezen) bestaat al.
        const eerder = geordend.find((x) => x.i !== i && x.k.status !== "betwist" && zelfdeAangifte(x.k, k) && (goedgekeurd(x.k.status) || alle.indexOf(x.k) > i));
        if (k.status === "wacht" && eerder) {
            uit.set(sleutel(k, i), { soort: "dubbel", van: eerder.k.omschrijving });
            continue;
        }
        if (k.status !== "wacht" && !goedgekeurd(k.status))
            continue;
        if (k.status === "wacht" && k.aanZet) {
            uit.set(sleutel(k, i), null);
            continue;
        }
        const b = budgetten.find((x) => past(x, k));
        if (!b) {
            if (k.status === "wacht")
                uit.set(sleutel(k, i), null);
            continue;
        }
        if (!d) {
            if (k.status === "wacht")
                uit.set(sleutel(k, i), { soort: "onzeker", budget: b });
            continue;
        }
        const van = b.geldigVan ? leesDatum(b.geldigVan, jaar) : null;
        const tot = b.geldigTot ? leesDatum(b.geldigTot, jaar) : null;
        if ((van && d < van) || (tot && d > tot)) {
            if (k.status === "wacht")
                uit.set(sleutel(k, i), null);
            continue;
        }
        const periodiek = b.periode === "maand" || b.periode === "jaar";
        // Eenmalig budget dat al aan een andere uitgave gekoppeld is, is op.
        const p = `${b.id}|${periodeSleutel(b, d)}`;
        const al = gebruikt.get(p) ?? (b.status === "uitgegeven" && b.kostId && b.kostId !== k.id ? b.max : 0);
        const rest = Math.max(0, b.max - al);
        if (goedgekeurd(k.status)) {
            gebruikt.set(p, al + k.bedrag);
            continue;
        }
        if (b.voorwaarden) {
            uit.set(sleutel(k, i), { soort: "onzeker", budget: b });
            continue;
        }
        if (k.aandeelSanne !== undefined && Math.abs(k.aandeelSanne - Math.round(k.bedrag * b.pctSanne) / 100) > 0.01) {
            uit.set(sleutel(k, i), { soort: "onzeker", budget: b });
            continue;
        }
        if (k.bedrag <= rest + 0.001) {
            gebruikt.set(p, al + k.bedrag);
            uit.set(sleutel(k, i), { soort: "gedekt", budget: b, rest: periodiek ? Math.round((rest - k.bedrag) * 100) / 100 : null });
        }
        else
            uit.set(sleutel(k, i), { soort: "boven", budget: b, rest });
    }
    return uit;
}
/** Wie is aan zet bij een uitgave met status "wacht": na een tegenvoorstel de ontvanger, anders wie niet betaalde. */
export const aanZetBij = (k) => k.aanZet ?? (k.betaaldDoor === "sanne" ? "joris" : "sanne");
/** Wacht deze uitgave echt op jouw akkoord? Status "wacht", jij aan zet, en niet volledig gedekt door een afspraak. */
export const wachtOpJouwAkkoord = (k, b, ik = "sanne") => k.status === "wacht" && aanZetBij(k) === ik && b?.soort !== "gedekt";
export const isGedekt = (k, b, ik = "sanne") => k.status === "wacht" && aanZetBij(k) === ik && b?.soort === "gedekt";
/** Neutrale uitleg bij een beoordeling, of null. */
export function budgetMelding(b) {
    if (!b)
        return null;
    if (b.soort === "boven")
        return `Deze uitgave is hoger dan het resterende budget (nog € ${b.rest.toFixed(2).replace(".", ",")}). Vraag akkoord voor het extra bedrag.`;
    if (b.soort === "onzeker")
        return "We kunnen niet zeker bepalen of deze uitgave binnen jullie afspraak valt.";
    if (b.soort === "dubbel")
        return `Deze uitgave lijkt al eerder ingevoerd (“${b.van}”). Controleer dit voordat je akkoord geeft.`;
    return null;
}
/** Niet akkoord: bestaande status "betwist" — telt niet mee in de afrekening, is geen betaling en wordt niet verwijderd. */
export const NIET_AKKOORD_STATUS = "betwist";
export const nietAkkoordKostTekst = "Je gaat niet akkoord met deze uitgave. Er is nog geen akkoord over deze uitgave of kostenverdeling; er is niets betaald of verrekend.";
export const tegenvoorstelVerstuurdTekst = "Je voorstel is verstuurd. Je wacht op antwoord.";
