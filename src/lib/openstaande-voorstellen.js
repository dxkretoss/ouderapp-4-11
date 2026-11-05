import { nodig } from "./afspraken-store";
import { aanZetBij } from "./kosten-akkoord";
import { leesDatum } from "./kosten-akkoord";
export const statusTekst = {
    "wacht-op-jouw-reactie": "Wacht op jouw reactie",
    "wacht-op-reactie": "Wacht op reactie",
    "meer-tijd-gevraagd": "Meer tijd gevraagd",
    "tegenvoorstel-ontvangen": "Tegenvoorstel ontvangen",
    "reactiedatum-verstreken": "Reactiedatum verstreken",
    akkoord: "Akkoord",
    "niet-akkoord": "Niet akkoord",
    ingetrokken: "Ingetrokken",
    afgerond: "Afgerond",
};
/** Is de gewenste reactiedatum voorbij zonder reactie? Het voorstel blijft gewoon openstaan. */
export const datumVerstreken = (reactieDatum, vandaag) => {
    if (!reactieDatum)
        return false;
    const d = leesDatum(reactieDatum, Number(vandaag.slice(0, 4)));
    const v = leesDatum(vandaag, Number(vandaag.slice(0, 4)));
    return !!d && !!v && d.getTime() < v.getTime();
};
/** Status voor een open voorstel met mogelijke reactiedatum of meer-tijd-vraag. */
function openStatus(aanJou, reactieDatum, vandaag, meerTijd) {
    if (meerTijd)
        return "meer-tijd-gevraagd";
    if (datumVerstreken(reactieDatum, vandaag))
        return "reactiedatum-verstreken";
    return aanJou ? "wacht-op-jouw-reactie" : "wacht-op-reactie";
}
export function zorgVoorstelItem(v, vandaag) {
    const aanJou = v.van === "Joris";
    const status = v.status === "geaccepteerd" ? "akkoord"
        : v.status === "afgewezen" ? "niet-akkoord"
            : v.status === "ingetrokken" ? "ingetrokken"
                : v.status === "alternatief" ? "tegenvoorstel-ontvangen"
                    : openStatus(aanJou, v.reactieDatum, vandaag, !!v.meerTijd);
    return {
        sleutel: `zorg-${v.id}`, bron: "zorg", bronId: v.id,
        titel: "Wijzigingsvoorstel verdeling", omschrijving: `${v.datumLabel} · ${v.tekst}`,
        kind: v.kinderen.join(" & "), reactieDatum: v.reactieDatum,
        status, aanJou,
        naar: `/zorgregeling?voorstel=${v.id}`,
    };
}
export function afspraakItem(a) {
    if (!a.voorstel)
        return null;
    const open = nodig(a.voorstel).length > 0;
    const aanJou = open && nodig(a.voorstel).includes("Sanne");
    return {
        sleutel: `afspraak-${a.id}`, bron: "afspraak", bronId: a.id,
        titel: a.titel, omschrijving: a.voorstel.tekst ?? a.tekst,
        kind: a.kind, verzonden: a.voorstel.datum,
        status: open ? (aanJou ? "wacht-op-jouw-reactie" : "wacht-op-reactie") : "afgerond",
        aanJou, naar: `/afspraken?afspraak=${a.id}`,
    };
}
export function budgetItem(b, vandaag) {
    const open = b.status === "wacht" || b.status === "tegenvoorstel";
    const aanJou = open && b.aanZet === "Sanne";
    const meerTijd = open && b.stappen.at(-1)?.wat.startsWith("Meer tijd gevraagd") === true;
    const status = b.status === "akkoord" ? "akkoord"
        : b.status === "uitgegeven" ? "afgerond"
            : b.status === "geweigerd" ? "niet-akkoord"
                : b.status === "ingetrokken" ? "ingetrokken"
                    : b.status === "tegenvoorstel" && !aanJou ? "tegenvoorstel-ontvangen"
                        : openStatus(aanJou, b.reactieDatum, vandaag, meerTijd);
    const laatste = [...b.stappen].reverse().find((s) => s.bedrag !== undefined)?.bedrag ?? b.max;
    return {
        sleutel: `budget-${b.id}`, bron: "budget", bronId: b.id,
        titel: `Budget: ${b.wat}`, omschrijving: `€ ${laatste} · verdeling ${b.pctSanne} / ${100 - b.pctSanne}`,
        kind: b.kind, verzonden: b.stappen[0]?.moment, reactieDatum: b.reactieDatum,
        status, aanJou, naar: `/kosten?budget=${b.id}`,
    };
}
export function vakantieItem(v) {
    if (v.status !== "voorstel" && v.status !== "ingetrokken")
        return null;
    const aanJou = v.status === "voorstel" && v.van === "Joris";
    return {
        sleutel: `vakantie-${v.id}`, bron: "vakantie", bronId: v.id,
        titel: `Vakantie: ${v.naam}`, omschrijving: `${v.periode}${v.details ? ` · ${v.details}` : ""}`,
        status: v.status === "ingetrokken" ? "ingetrokken" : aanJou ? "wacht-op-jouw-reactie" : "wacht-op-reactie",
        aanJou, naar: `/vakantie/${v.id}`,
    };
}
export function kostItem(k) {
    if (k.status !== "wacht" && k.status !== "betwist")
        return null;
    const aanJou = k.status === "wacht" && aanZetBij(k) === "sanne";
    return {
        sleutel: `kost-${k.id}`, bron: "kost", bronId: k.id,
        titel: `Uitgave: ${k.omschrijving}`, omschrijving: `€ ${k.bedrag} · ${k.kind}`,
        kind: k.kind, verzonden: k.datum,
        status: k.status === "betwist" ? "niet-akkoord" : aanJou ? "wacht-op-jouw-reactie" : "wacht-op-reactie",
        aanJou, naar: "/kosten",
    };
}
export function aanwezigheidItem(a) {
    if (a.fase !== "voorstel")
        return null;
    const aanJou = a.door === "joris";
    return {
        sleutel: `aanwezig-${a.afspraakId}`, bron: "aanwezigheid", bronId: a.afspraakId,
        titel: "Aanwezigheid afstemmen", omschrijving: a.geschiedenis[0]?.tekst ?? "",
        status: aanJou ? "wacht-op-jouw-reactie" : "wacht-op-reactie",
        aanJou, naar: "/agenda",
    };
}
/** Het complete overzicht, afgeleid uit de bestaande bronnen. */
export function verzamelVoorstellen(b, vandaag) {
    return [
        ...b.zorg.map((v) => zorgVoorstelItem(v, vandaag)),
        ...b.afspraken.map(afspraakItem),
        ...b.budgetten.map((x) => budgetItem(x, vandaag)),
        ...b.vakanties.map(vakantieItem),
        ...(b.kosten ?? []).map(kostItem),
        ...(b.aanwezigheid ?? []).map(aanwezigheidItem),
    ].filter((x) => x !== null);
}
const OPEN = ["wacht-op-jouw-reactie", "wacht-op-reactie", "meer-tijd-gevraagd", "tegenvoorstel-ontvangen", "reactiedatum-verstreken"];
export const isOpen = (v) => OPEN.includes(v.status);
export const wachtOpJou = (l) => l.filter((v) => v.aanJou && isOpen(v));
export const wachtOpAnder = (l) => l.filter((v) => !v.aanJou && isOpen(v));
export const afgerond = (l) => l.filter((v) => !isOpen(v));
/** Feitelijke telling voor het professionele afstemmingsoverzicht — geen oordeel, alleen aantallen. */
export function telling(l) {
    return {
        ingediend: l.length,
        beantwoord: l.filter((v) => v.status === "akkoord" || v.status === "niet-akkoord" || v.status === "afgerond").length,
        zonderReactie: l.filter((v) => v.status === "wacht-op-reactie" || v.status === "wacht-op-jouw-reactie" || v.status === "meer-tijd-gevraagd").length,
        verstreken: l.filter((v) => v.status === "reactiedatum-verstreken").length,
        tegenvoorstellen: l.filter((v) => v.status === "tegenvoorstel-ontvangen").length,
    };
}
