import { useSyncExternalStore } from "react";
import { leg } from "@/lib/audit-store";
let lijst = [];
const ls = new Set();
const zet = (n) => { lijst = n; ls.forEach((l) => l()); };
export function useVakanties() {
    return useSyncExternalStore((l) => { ls.add(l); return () => ls.delete(l); }, () => lijst, () => lijst);
}
const veldenVan = (v) => { const { id, status, van, afgesproken, geschiedenis, reactie, ...velden } = v; return velden; };
const historiseer = (v, door, actie) => [...(v.geschiedenis ?? []), { datum: new Date().toISOString(), door, actie, velden: veldenVan(v) }];
export function voegVakantieVoorstelToe(v) {
    const id = `v-${crypto.randomUUID()}`;
    zet([...lijst, { ...v, id, status: "voorstel", van: "Sanne", geschiedenis: [] }]);
    leg("schema", id, v.naam, "CREATED", undefined, "Sanne", { ...(v.kinderen ? { kinderen: v.kinderen } : {}), meta: { betreft: v.periode, type: v.soort ?? "vakantie" } });
    return id;
}
/** A pending revision remains on the original record; its confirmed fields stay effective. */
export function wijzigVakantieVoorstel(id, velden, door = "Sanne") {
    const v = lijst.find((x) => x.id === id);
    if (!v || v.status === "ingetrokken" || (v.status === "voorstel" && v.van === door))
        return false;
    const afgesproken = v.afgesproken ?? (v.status === "afgesproken" ? veldenVan(v) : undefined);
    zet(lijst.map((x) => x.id === id ? { ...x, ...velden, afgesproken, status: "voorstel", van: door, reactie: undefined, geschiedenis: historiseer(v, door, "Ander voorstel") } : x));
    leg("schema", id, v.naam, "CREATED", undefined, door, { ...(velden.kinderen ? { kinderen: velden.kinderen } : {}), meta: { betreft: velden.periode, type: "Vakantiewijziging" } });
    return true;
}
export const actieveVakantie = (v) => v.status === "afgesproken" && !v.annuleren ? v : v.afgesproken;
export const stelVerdelingVoor = (id, ouder) => zet(lijst.map((v) => (v.id === id && v.status === "open" ? { ...v, ouder, status: "voorstel", van: "Sanne" } : v)));
/** Akkoord: pas nu wordt het "Afgesproken". */
export function accepteerVakantie(id, door = "Joris") {
    const v = lijst.find((x) => x.id === id);
    if (!v || v.status !== "voorstel" || !v.van || v.van === door)
        return false;
    zet(lijst.map((x) => x.id === id ? { ...x, status: "afgesproken", afgesproken: undefined, geschiedenis: historiseer(v, door, v.annuleren ? "Annulering afgesproken" : "Afgesproken") } : x));
    leg("schema", id, v.naam, "ACCEPTED", undefined, door, { ...(v.kinderen ? { kinderen: v.kinderen } : {}), meta: { betreft: v.periode, type: v.soort ?? "vakantie" } });
    return true;
}
/** Niet akkoord: het voorstel vervalt en de vakantie is weer "nog niet geregeld"; bestaande verdeling blijft gelden. */
export function wijsVakantieAf(id, door = "Sanne") {
    const v = lijst.find((x) => x.id === id);
    if (!v || v.status !== "voorstel" || !v.van || v.van === door)
        return false;
    zet(lijst.map((x) => x.id === id ? { ...(v.afgesproken ?? x), id: x.id, status: v.afgesproken ? "afgesproken" : "open", van: undefined, afgesproken: undefined, reactie: "niet-akkoord", geschiedenis: historiseer(v, door, "Niet akkoord") } : x));
    leg("schema", id, v.naam, "DECLINED", undefined, door, { ...(v.kinderen ? { kinderen: v.kinderen } : {}), meta: { betreft: v.periode } });
    return true;
}
/** Withdrawal retains the same source object and is final. */
export function trekVakantieIn(id, door = "Sanne") {
    const v = lijst.find((x) => x.id === id);
    if (!v || v.status !== "voorstel" || v.van !== door)
        return false;
    zet(lijst.map((x) => x.id === id ? { ...x, status: "ingetrokken", geschiedenis: historiseer(v, door, "Ingetrokken") } : x));
    return true;
}
/** Verdeelhulp: telt afgesproken vakanties per ouder en stelt voor open vakanties om-en-om voor, beginnend bij wie het minst heeft. De telling weegt de lengte van een vakantie niet mee, dus ze zegt niets over wat eerlijk of passend is. Alleen een suggestie; niets verandert vanzelf. */
export function verdeelSuggestie(l) {
    const telling = { Sanne: 0, Joris: 0 };
    l.forEach((v) => { if (v.status === "afgesproken" && (v.ouder === "Sanne" || v.ouder === "Joris"))
        telling[v.ouder]++; });
    let volgende = telling.Sanne <= telling.Joris ? "Sanne" : "Joris";
    const voorstel = l.filter((v) => v.status === "open").map((v) => { const o = volgende; volgende = o === "Sanne" ? "Joris" : "Sanne"; return { id: v.id, naam: v.naam, periode: v.periode, ouder: o }; });
    return { telling, voorstel };
}
export const vakantieLijst = () => lijst;
