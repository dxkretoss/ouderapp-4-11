import { dt, plusDagen } from "./agenda-datum";
import { zorgOp } from "./zorg-store";
import { actieveVakantie } from "./vakantie-store";
import { geldigeRegeling, plekOp } from "./start-store";
export const ouderLabel = (ouder, kijker = "sanne") => ouder ? (ouder === kijker ? "Bij jou" : "Bij de andere ouder") : "Verdeling nog niet ingevuld";
/** Repeating periods are projected, never inserted as duplicate calendar appointments. */
export function vakantieDelenOp(v, datum, kind) {
    const a = actieveVakantie(v);
    if (!a || !a.vanDatum || !a.totDatum || (a.kinderen && !a.kinderen.includes(kind)))
        return [];
    const jaar = Number(datum.slice(0, 4)), bronJaar = Number(a.vanDatum.slice(0, 4));
    const jaren = a.herhaal && a.herhaal !== "eenmalig" ? [jaar - 1, jaar] : [bronJaar];
    return jaren.flatMap((j) => {
        if (j < bronJaar)
            return [];
        const verplaats = (s) => `${Number(s.slice(0, 4)) + j - bronJaar}${s.slice(4)}`;
        const van = verplaats(a.vanDatum ?? ""), tot = verplaats(a.totDatum ?? "");
        if (datum < van || datum > tot)
            return [];
        const delen = a.verdeling?.length ? a.verdeling : a.ouder === "Sanne" || a.ouder === "Joris" || a.ouder === "Samen" ? [{ van: a.vanDatum ?? "", tot: a.totDatum ?? "", ouder: a.ouder }] : [];
        return delen.filter((d) => datum >= verplaats(d.van) && datum <= verplaats(d.tot)).map((d) => ({ ...d, van: verplaats(d.van), tot: verplaats(d.tot), ouder: a.herhaal === "afwisselend" && (j - bronJaar) % 2 !== 0 ? d.ouder === "Sanne" ? "Joris" : d.ouder === "Joris" ? "Sanne" : "Samen" : d.ouder }));
    });
}
export function agendaZorgOp(zorg, vakanties, start, datum, gekozen = "alle", kijker = "sanne") {
    const profielen = start.eigen ? start.kinderen : [{ id: "emma", naam: "Emma" }, { id: "noah", naam: "Noah" }];
    const lees = (dag) => profielen.filter((k) => gekozen === "alle" || gekozen === k.id).map((k) => {
        const basis = start.eigen ? geldigeRegeling(start.regeling) ? { ouder: (plekOp(start.regeling, dt(dag)) === "ik" ? kijker : kijker === "sanne" ? "joris" : "sanne"), tijd: start.regeling.wisseltijd, plek: start.regeling.plek } : { ouder: undefined, tijd: "" } : zorgOp(zorg, k.id, dag);
        const bijzonder = start.eigen ? [] : vakanties.map((v) => ({ v, delen: vakantieDelenOp(v, dag, k.id) })).filter((x) => x.delen.length);
        const ouders = new Set(bijzonder.flatMap((x) => x.delen.map((d) => d.ouder)));
        const overlap = bijzonder.length > 1 && ouders.size > 1 ? bijzonder.map((x) => x.v.naam) : [];
        const delen = bijzonder.flatMap((x) => x.delen);
        const laatste = delen.at(-1);
        const ouder = overlap.length ? undefined : laatste ? laatste.ouder === "Samen" ? undefined : laatste.ouder === "Sanne" ? "sanne" : "joris" : basis.ouder;
        return { ...basis, id: k.id, naam: k.naam, ouder: ouder, ...(bijzonder.length ? { uitzondering: bijzonder.map((x) => x.v.naam).join(" · "), delen } : {}), overlap };
    });
    const kinderen = lees(datum), gisteren = lees(plusDagen(datum, -1));
    const wissels = kinderen.flatMap((k) => { const oud = gisteren.find((x) => x.id === k.id); return k.ouder && oud?.ouder && k.ouder !== oud.ouder ? [{ ...k, van: oud.ouder, naar: k.ouder }] : []; });
    const bekend = kinderen.every((k) => k.ouder);
    const kleur = !kinderen.length ? "onbekend" : kinderen.some((k) => k.delen && new Set(k.delen.map((d) => d.ouder)).size > 1) || kinderen.some((k) => k.overlap.length) ? "gemengd" : !bekend ? "onbekend" : kinderen.every((k) => k.ouder === kijker) ? "ik" : kinderen.every((k) => k.ouder !== kijker) ? "ander" : "gemengd";
    return { kinderen, wissels, kleur };
}
export function magOverdrachtVoorbereiden(datum, tijd, nu, aan) {
    if (!aan || !tijd)
        return false;
    const moment = dt(datum);
    const [h, m] = tijd.split(":").map(Number);
    if (h === undefined || m === undefined)
        return false;
    moment.setHours(h, m, 0, 0);
    const uren = (moment.getTime() - nu.getTime()) / 3600000;
    return uren >= 0 && uren <= 24;
}
