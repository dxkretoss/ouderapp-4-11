import { useSyncExternalStore } from "react";
import { onderlingeAfspraken } from "./demo-data";
/* ---------- model: één afspraak = één bronobject met versies en gebeurtenissen ---------- */
export const ONDERWERPEN = [
    ["Halen & brengen", "Halen & brengen"], ["Planning & wijzigingen", "Planning & wijzigingen"], ["Contact tussen ouders", "Contact"],
    ["Kinderen", "Kinderen"], ["School & opvang", "School & opvang"], ["Gezondheid", "Gezondheid"], ["Kosten", "Kosten"],
    ["Vakanties & bijzondere dagen", "Vakanties"], ["Anders", "Overig"],
];
export const IK = "Sanne";
export const ANDER = "Joris";
export const PRO = "Lotte Jansen";
export const PRO_LABEL = "Lotte Jansen · gezinscoach";
export const vandaag = () => new Date().toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
export const metPro = { soort: "professional", label: PRO_LABEL };
const start = [];
// Onderlinge afspraken
const onderling = [];
/** Wie moet nog instemmen? Een professional telt nooit als akkoord van ouders. */
export const nodig = (v) => [IK, ANDER].filter((o) => !v.akkoord[o]);
export const wachtOpMij = (a) => !!a.voorstel && nodig(a.voorstel).includes(IK);
export const naam = (wie) => (wie === IK ? "Jij" : wie === PRO ? "Lotte" : wie);
export const zin = (v) => v.soort === "nieuw" ? "stelt een nieuwe afspraak voor" : v.soort === "stoppen" ? "wil deze afspraak stoppen" : "wil deze afspraak aanpassen";
export function voerUit(a) {
    const v = a.voorstel;
    if (!v || nodig(v).length)
        return a;
    const d = vandaag();
    if (v.soort === "nieuw")
        return { ...a, tekst: v.tekst ?? a.tekst, status: "Actief", voorstel: undefined, afgesprokenOp: d, geldtVanaf: d, afgesprokenDoor: v.door === PRO ? undefined : "Sanne & Joris", geschiedenis: [{ datum: d, tekst: "Afspraak gaat in." }, ...a.geschiedenis] };
    if (v.soort === "stoppen")
        return { ...a, status: "Gestopt", gestoptOp: d, voorstel: undefined, geschiedenis: [{ datum: d, tekst: "Afspraak gestopt." }, ...a.geschiedenis] };
    if (!v.tekst)
        return a;
    return { ...a, tekst: v.tekst, voorstel: undefined, geldtVanaf: d, versies: [{ tekst: a.tekst, tot: d }, ...a.versies], geschiedenis: [{ datum: d, tekst: `Nieuwe versie ingegaan. Tekst gewijzigd van ‘${a.tekst}’ naar ‘${v.tekst}’.` }, ...a.geschiedenis] };
}
/** Eén bron voor alle afspraken; elk object heeft een versienummer om gelijktijdige wijzigingen te herkennen. */
let lijst = [...start, ...onderling].map((a) => ({ ...a, versie: 1 }));
const ls = new Set();
export const afsprakenState = () => lijst;
/** Only the author can withdraw a pending proposal; the existing agreement is retained. */
export function trekAfspraakIn(id, door = IK) {
    const a = lijst.find((x) => x.id === id);
    const v = a?.voorstel;
    if (!a || !v || v.door !== door || !nodig(v).length)
        return false;
    zetAfspraken((l) => l.map((x) => x.id === id ? { ...x, voorstel: undefined, status: v.soort === "nieuw" ? "Ingetrokken" : x.status,
        geschiedenis: [{ datum: vandaag(), tekst: `${door} trok het voorstel in. Ingetrokken · ${v.tekst ?? x.tekst}. De huidige afspraken blijven gelden.` }, ...x.geschiedenis] } : x));
    return true;
}
export function zetAfspraken(f) {
    const oud = new Map(lijst.map((a) => [a.id, a]));
    lijst = f(lijst).map((a) => { const o = oud.get(a.id); return o === a ? o : { ...a, versie: (o?.versie ?? 0) + 1 }; });
    ls.forEach((l) => l());
}
export function useAfspraken() {
    return useSyncExternalStore((l) => { ls.add(l); return () => ls.delete(l); }, () => lijst, () => lijst);
}
/** Eigen voorstellen die nog op de ander wachten (Home: "Afstemming loopt"). */
export const eigenOpenVoorstellen = (l) => l.filter((a) => a.voorstel && a.voorstel.door === IK && nodig(a.voorstel).length > 0);
const maandNamen = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];
/** "5 oktober 2026" → Date; zonder jaartal of onbekend → null (lezers verzinnen dan geen datum). */
export function geschiedenisDatum(t) {
    const m = /^(\d{1,2}) ([a-z]+) (\d{4})$/.exec(t.trim());
    const i = m ? maandNamen.indexOf(m[2]) : -1;
    return m && i >= 0 ? new Date(Number(m[3]), i, Number(m[1]), 12) : null;
}
/** Unchanged demo seeds are not presented as agreements the user entered. Deep links and request sources retain them. */
export function isIngevuldeAfspraak(a) {
    return (a.versie ?? 0) > 1 || ![...start, ...onderling].some((seed) => seed.id === a.id);
}
