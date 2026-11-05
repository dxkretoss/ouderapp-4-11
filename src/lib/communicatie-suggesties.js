const tijdPatroon = /\b([01]?\d|2[0-3])[:.]([0-5]\d)(?:\s*uur)?\b|\b([01]?\d|2[0-3])\s*uur\b/g;
const dagen = /\b(maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag|zondag|\d{4}-\d{2}-\d{2})\b/g;
const wissel = /\b(wisselen|wissel|ophalen|op\b.{0,30}\bhaal|haal\b.{0,50}\bop|brengen|breng)\b/i;
const zorg = /\b(wisselen|wissel|overnachten|overnachting|zorgverdeling|zorgregeling|extra nacht|blijven slapen)\b/i;
const voorstel = /\b(stel voor|zullen we|zou .{0,35}(beter|uitkomen)|kan ik|kunnen we|voor mij zou)\b/i;
const afgerond = /\b(ingetrokken|intrekken|afgewezen|afgezegd|gaat niet door|laat maar|vastgelegd|bevestigd|afgerond)\b/i;
const akkoord = /^(prima|akkoord|ok[eé]|goed|is goed|ja)[.!\s]*$/i;
export const mogelijkeOnveiligheid = (tekst) => /\b(bedreig|dreig|dwing|intimideer|maak je kapot|ik sla je|ik vermoord|je zult spijt|je krijgt spijt|anders doe ik je)\b/i.test(tekst);
/** Alleen expliciete verwijten; een persoonlijke grens of gevoelsuiting geeft geen treffer. Geen persoonsbeoordeling. */
export const mogelijkVerwijt = (tekst) => /\b(als je echt om .{1,40} gaf|blijkbaar .{0,50}niet belangrijk genoeg|je doet ook nooit iets goed|je bent ook nooit bereikbaar|je denkt alleen maar aan jezelf)\b/i.test(tekst);
/** Letterlijke praktische vraag uit een langer bericht, zonder datum of toezegging af te leiden. */
export function herkenTaakVerzoek(tekst) {
    if (mogelijkeOnveiligheid(tekst))
        return null;
    const m = /\b(?:wil|kun|zou) je\s+([^.!?\n]{1,180}\b(?:meegeven|meenemen|invullen|bellen|aanvragen|regelen|inleveren|inschrijven))\b([^.!?\n]{0,60})/i.exec(tekst);
    if (!m)
        return null;
    const inhoud = `${m[1] ?? ""}${m[2] ?? ""}`.trim();
    const dag = /\b(maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag|zondag|morgen|volgende week|later)\b/i.exec(inhoud)?.[0];
    const datum = /\b\d{4}-\d{2}-\d{2}\b/.exec(inhoud)?.[0];
    return { tekst: inhoud, dag, datum };
}
export function herkenPraktisch(tekst, namen = []) {
    const t = tekst.toLowerCase();
    if (afgerond.test(t) || mogelijkeOnveiligheid(t))
        return null;
    const dag = [...t.matchAll(dagen)];
    const tijden = [...t.matchAll(tijdPatroon)];
    if (dag.length !== 1 || tijden.length !== 1)
        return null;
    const d = dag[0]?.[0], tm = tijden[0];
    if (!d || !tm)
        return null;
    const tijd = `${String(tm[1] ?? tm[3]).padStart(2, "0")}:${tm[2] ?? "00"}`;
    const persoonlijk = /\b(alleen voor mij|mijn eigen afspraak|persoonlijke afspraak)\b/i.test(t);
    const gebeurtenis = zorg.test(t) ? "wissel" : wissel.test(t) ? (/\b(breng|brengen)\b/.test(t) ? "brengen" : "ophalen") : /\b(tandarts|ouderavond|training|huisarts)\b/.exec(t)?.[0] ?? (persoonlijk ? "persoonlijke afspraak" : undefined);
    if (!gebeurtenis)
        return null;
    // Extra activities make matching ambiguous (e.g. school pickup versus sport pickup).
    const context = /\b(school|zwemles|voetbal|training)\b/.exec(t)?.[0];
    const kinderen = namen.filter((n) => new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(tekst));
    const locatie = /\b(bij school|op school|bij de opvang|bij het station)\b/i.exec(tekst)?.[0];
    return { dag: d, datum: /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : undefined, tijd, gebeurtenis: context ? `${gebeurtenis} · ${context}` : gebeurtenis, persoonlijk, zorg: zorg.test(t), kind: kinderen.length === 1 ? kinderen[0] : undefined, locatie };
}
export function vindCommunicatieSuggestie(concept, berichten, namen, opties) {
    if (!opties.aan || opties.veiligheid || opties.verwerkt || mogelijkeOnveiligheid(concept))
        return null;
    const recent = berichten.slice(-4);
    if (recent.some((b) => mogelijkeOnveiligheid(b.tekst)))
        return null;
    const sleutel = JSON.stringify([concept, recent.map((b) => b.id)]);
    if (sleutel === opties.weggeklikt)
        return null; // One dismissal ends the entire unchanged-context sequence.
    const t = concept.trim();
    if (t && !opties.verborgen.includes("verduidelijking")) {
        if (wissel.test(t) && /\b(ik haal (haar|hem|emma|noah)|volgende week)\b/i.test(t) && ![...t.matchAll(tijdPatroon)].length && !opties.bekendeTijd)
            return { soort: "verduidelijking", sleutel, tekst: "Willen jullie ook een tijd afspreken?", aanvulling: " Tijdstip: [zelf invullen]", bronnen: [] };
        if (wissel.test(t) && /\b(later|straks|ergens in de middag|ergens in de avond)\b/i.test(t) && ![...t.matchAll(tijdPatroon)].length && !opties.bekendeTijd)
            return { soort: "verduidelijking", sleutel, tekst: "Wil je een tijdstip toevoegen?", aanvulling: " Tijdstip: [zelf invullen]", bronnen: [] };
        if (wissel.test(t) && /\b(daar|ergens|waar precies)\b/i.test(t) && !/\b(bij|op|in)\s+(school|de opvang|het station)\b/i.test(t) && !opties.bekendeLocatie)
            return { soort: "verduidelijking", sleutel, tekst: "Wil je de ophaalplek erbij zetten?", aanvulling: " Ophaalplek: [zelf invullen]", bronnen: [] };
        if (/\b(ik betaal|ik maak .{0,30}over)\b/i.test(t) && /\b(volgende week|binnenkort|later)\b/i.test(t) && !/\b\d{1,2}\s+(januari|februari|maart|april|mei|juni|juli|augustus|september|oktober|november|december)\b|\d{4}-\d{2}-\d{2}|\b(maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag|zondag)\b/i.test(t))
            return { soort: "verduidelijking", sleutel, tekst: "Wil je aangeven wanneer je betaalt?", aanvulling: " Betaaldatum: [zelf invullen]", bronnen: [] };
    }
    if (t)
        return null; // Never interrupt an active draft with conversation-level suggestions.
    const laatste = recent.at(-1), vorige = recent.at(-2);
    if (!laatste || afgerond.test(laatste.tekst))
        return null;
    const taak = laatste.van !== "sanne" ? herkenTaakVerzoek(laatste.tekst) : null;
    if (taak && !opties.verborgen.includes("taak"))
        return { soort: "taak", sleutel, tekst: "Praktisch verzoek gevonden", bronnen: [laatste.id], taak };
    const a = vorige ? herkenPraktisch(vorige.tekst, namen) : null;
    const direct = herkenPraktisch(laatste.tekst, namen);
    // Narrow elliptical reply: only day/time/preference words, no other activity or participant.
    const rest = laatste.tekst.toLowerCase().replace(dagen, "").replace(tijdPatroon, "").replace(/\b(voor|mij|zou|om|uur|beter|uitkomen|het|dan|op)\b/g, "").replace(/[\s,.!?]/g, "");
    const b = direct ?? (a && voorstel.test(laatste.tekst) && !rest ? herkenPraktisch(`${laatste.tekst} ${a.gebeurtenis === "wissel" ? "wisselen" : a.gebeurtenis}`, namen) : null);
    const verschil = a && b && vorige && vorige.van !== laatste.van && voorstel.test(vorige.tekst) && voorstel.test(laatste.tekst) && a.dag === b.dag && a.gebeurtenis === b.gebeurtenis && a.kind === b.kind && a.persoonlijk === b.persoonlijk && a.tijd !== b.tijd;
    if (verschil) {
        if (opties.verborgen.includes("verschil"))
            return null;
        return { soort: "verschil", sleutel, tekst: `Er worden twee tijdstippen voorgesteld voor ${a.dag}: ${a.tijd} uur en ${b.tijd} uur.`, bronnen: [vorige.id, laatste.id], gegevens: a, tijden: [a.tijd, b.tijd] };
    }
    if (opties.verborgen.includes("agenda"))
        return null;
    // An acknowledgement is a navigation cue only, never recorded consent.
    const gegevens = b ?? (vorige && vorige.van !== laatste.van && akkoord.test(laatste.tekst) ? a : null);
    if (!gegevens || (!akkoord.test(laatste.tekst) && !/^(prima|akkoord|ok[eé]),?\s/i.test(laatste.tekst) && !voorstel.test(laatste.tekst) && !gegevens.persoonlijk))
        return null;
    return { soort: "agenda", sleutel, tekst: gegevens.zorg ? "Wil je dit als wijziging voorstellen?" : "Toevoegen aan Agenda?", bronnen: b ? [laatste.id] : vorige ? [vorige.id, laatste.id] : [], gegevens };
}
export function agendaVanBericht(tekst, namen = []) {
    const g = herkenPraktisch(tekst, namen);
    return { nieuw: true, voorstel: !g?.persoonlijk, persoonlijk: g?.persoonlijk ?? false, vanuitBericht: true, omschrijving: tekst, datum: g?.datum, tijd: g?.tijd, kind: g?.kind, locatie: g?.locatie };
}
