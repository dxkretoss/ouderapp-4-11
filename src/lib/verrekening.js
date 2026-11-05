// Interne verrekenmotor voor de kostenmodule.
// Principe: openstaande kosten worden tegen elkaar weggestreept;
// alleen het netto resterende saldo hoeft te worden betaald.
// De motor is volledig onafhankelijk van een externe betaalprovider.
import { budgetSnapshot } from "./budget-store";
import { beoordeelKosten } from "./kosten-akkoord";
export const statusLabel = {
    concept: "Concept",
    wacht: "Afstemmen",
    bevestigd: "Bevestigd",
    verrekend: "Afgerekend",
    betwist: "Nog niet geregeld · geen akkoord",
};
/** Aandeel van een ouder in een kostenpost, op basis van de verdelingstekst. */
export function aandeelVan(k, ouder) {
    const s = k.aandeelSanne;
    return ouder === "sanne" ? s : Math.round((k.bedrag - s) * 100) / 100;
}
const r2 = (n) => Math.round(n * 100) / 100;
/**
 * Rekent openstaande (bevestigde) kosten tegen elkaar weg.
 * Alleen posten met status "openstaand" (bestaande data) of "bevestigd"
 * tellen mee; concepten, betwiste en al verrekende posten niet.
 */
export function berekenSaldo(lijst, budgetten = budgetSnapshot()) {
    const uniekeLijst = lijst.filter((k, i) => lijst.findIndex((x) => x.id === k.id) === i);
    const beoordeling = beoordeelKosten(uniekeLijst, budgetten);
    const gezien = new Set();
    const meenemen = lijst.filter((k) => {
        if (gezien.has(k.id))
            return false;
        gezien.add(k.id);
        return k.status === "openstaand" || k.status === "bevestigd" || (k.status === "wacht" && beoordeling.get(k.id)?.soort === "gedekt");
    });
    const jorisAanSanne = { posten: [], totaal: 0 };
    const sanneAanJoris = { posten: [], totaal: 0 };
    for (const k of meenemen) {
        if (k.betaaldDoor === "sanne") {
            const aandeel = aandeelVan(k, "joris");
            jorisAanSanne.posten.push({ post: k, aandeel });
            jorisAanSanne.totaal = r2(jorisAanSanne.totaal + aandeel);
        }
        else {
            const aandeel = aandeelVan(k, "sanne");
            sanneAanJoris.posten.push({ post: k, aandeel });
            sanneAanJoris.totaal = r2(sanneAanJoris.totaal + aandeel);
        }
    }
    return {
        jorisAanSanne,
        sanneAanJoris,
        netto: r2(jorisAanSanne.totaal - sanneAanJoris.totaal),
        aantalPosten: meenemen.length,
    };
}
export const standaardSleutels = {
    Algemeen: { sanne: 60, joris: 40 },
    School: { sanne: 50, joris: 50 },
    Sport: { sanne: 50, joris: 50 },
    Medisch: { sanne: 60, joris: 40 },
    Opvang: { sanne: 70, joris: 30 },
    Kleding: { sanne: 60, joris: 40 },
    Activiteiten: { sanne: 50, joris: 50 },
    Overig: { sanne: 50, joris: 50 },
};
export function sleutelVoor(sleutels, categorie) {
    return sleutels[categorie] ?? sleutels["Algemeen"] ?? { sanne: 50, joris: 50 };
}
export const verrekeningStatus = (status) => ({
    "nog-te-betalen": "Nog te betalen",
    "betaalverzoek-gedeeld": "Betaalverzoek gedeeld",
    "wacht-op-ontvanger": "Betaling gemeld",
    "ontvangst-bevestigd": "Betaald · ontvangst bevestigd",
    afgerond: "Afgerond",
}[status] ?? "Nog te betalen");
/** Alleen expliciete deelnemers mogen een overgang uitvoeren; openen van een link is geen overgang. */
export function betaalOvergang(v, door, actie) {
    const mag = actie === "aangegeven" ? door === v.van && (v.status === "nog-te-betalen" || v.status === "betaalverzoek-gedeeld")
        : actie === "ontvangen" ? door === v.aan && (v.status === "nog-te-betalen" || v.status === "betaalverzoek-gedeeld" || v.status === "wacht-op-ontvanger")
            : door === v.aan && v.status === "ontvangst-bevestigd";
    if (!mag)
        return null;
    const status = actie === "aangegeven" ? "wacht-op-ontvanger" : actie === "ontvangen" ? "ontvangst-bevestigd" : "afgerond";
    return { ...v, status, gebeurtenissen: [...(v.gebeurtenissen ?? []), { status, door, moment: new Date().toISOString() }] };
}
/** Bekende betaalverzoekhosts, geen willekeurige of onveilige URL. Controleert geen bankbedrag of betaling. */
export function veiligeBetaallink(tekst) {
    try {
        const url = new URL(tekst.trim());
        if (url.protocol !== "https:" || url.username || url.password || url.port || !["tikkie.me", "betaalverzoek.rabobank.nl", "www.abnamro.nl", "abnamro.nl"].includes(url.hostname) || url.pathname === "/")
            return null;
        return url.href;
    }
    catch {
        return null;
    }
}
/** Geen provider gekoppeld: bewust leeg, de interne motor blijft werken. */
export const geenPaymentService = {
    async createPaymentRequest() {
        throw new Error("Er is nog geen betaalprovider gekoppeld.");
    },
    async getPaymentStatus() {
        return "niet-gestart";
    },
    async handlePaymentConfirmation() { },
};
export function afrekenWeergave(modus, vandaagIso) {
    if (modus === "zelf")
        return "zelf";
    if (modus === "maandelijks") {
        const d = new Date(vandaagIso + "T12:00:00");
        const laatste = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
        return d.getDate() >= laatste ? "moment" : "tussenstand";
    }
    return "direct";
}
