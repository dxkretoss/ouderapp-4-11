import { useSyncExternalStore } from "react";
import { leg } from "@/lib/audit-store";
export const categorieLabel = {
    halen: "Ophalen / brengen", ziek: "Kind ziek", planning: "Planning gewijzigd", vergeten: "Iets vergeten / nodig", anders: "Anders",
};
export const reactieLabel = {
    zsm: "Zo snel mogelijk", "15": "Binnen 15 minuten", "30": "Binnen 30 minuten", "60": "Binnen 1 uur", eigen: "Eigen moment",
};
export const standaardOpties = {
    halen: ["Ik haal op", "Dat tijdstip is goed", "Ander voorstel"],
    ziek: ["Ik kan opvangen", "Houd me op de hoogte", "Ander voorstel"],
    planning: ["Is goed", "Lukt niet", "Ander voorstel"],
    vergeten: ["Ik breng het", "Is niet nodig", "Ander voorstel"],
    anders: ["Is goed", "Ik bel even", "Ander voorstel"],
};
let lijst = [];
const listeners = new Set();
const meld = () => listeners.forEach((l) => l());
export function startNuAfstemmen(d) {
    const n = { ...d, id: crypto.randomUUID(), van: "jij", status: "open", opties: standaardOpties[d.categorie], moment: new Date().toISOString() };
    lijst = [n, ...lijst];
    leg("besluit", n.id, `Nu afstemmen: ${n.titel}`, "CREATED", undefined, "Sanne", { kinderen: n.kindIds });
    meld();
    return n.id;
}
/** Reageren lost de situatie op; het antwoord wordt vastgelegd, de planning verandert niet vanzelf. */
export function reageerNuAfstemmen(id, antwoord) {
    const n = lijst.find((x) => x.id === id);
    if (!n || n.status === "opgelost")
        return;
    lijst = lijst.map((x) => (x.id === id ? { ...x, status: "opgelost", antwoord } : x));
    leg("besluit", id, `Nu afstemmen: ${n.titel}`, "UPDATED", { veld: "reactie", oud: "open", nieuw: antwoord }, "Sanne", { kinderen: n.kindIds });
    meld();
}
export function useNuAfstemmen() {
    return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => lijst, () => lijst);
}
/** Lezen zonder hook, voor koppelingen uit andere lagen (bijvoorbeeld "Afgestemd ✓" bij een afspraak). */
export const nuLijst = () => lijst;
export const openNuAfstemmen = (l) => l.filter((x) => x.status === "open");
