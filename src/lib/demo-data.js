import avatarSanne from "@/assets/avatar-sanne.jpg";
import avatarJoris from "@/assets/avatar-joris.jpg";
import avatarEmma from "@/assets/avatar-emma.jpg";
import avatarNoah from "@/assets/avatar-noah.jpg";
import { useSyncExternalStore } from "react";
import { leg } from "@/lib/audit-store";
export const parents = {
    sanne: {
        id: "sanne",
        naam: "Sanne",
        volledigeNaam: "Sanne de Vries",
        rol: "Ouder 1",
        avatar: avatarSanne,
        kleur: "brand",
    },
    joris: {
        id: "joris",
        naam: "Joris",
        volledigeNaam: "Joris Bakker",
        rol: "Ouder 2",
        avatar: avatarJoris,
        kleur: "accent",
    },
};
export const kinderen = [];
export const categorieMeta = {
    school: { label: "School", icoon: "🏫" },
    opvang: { label: "Opvang", icoon: "🧸" },
    sport: { label: "Sport", icoon: "⚽" },
    medisch: { label: "Medisch", icoon: "🩺" },
    verjaardag: { label: "Verjaardag", icoon: "🎂" },
    vakantie: { label: "Vakantie", icoon: "🌴" },
    wissel: { label: "Wisselmoment", icoon: "🔁" },
    overig: { label: "Overig", icoon: "📌" },
};
export const afspraken = [];
export const zorgweek = [];
export const zorgmaand = [];
export const gesprekken = [];
export const kosten = [];
export const documenten = [];
export const onderlingeAfspraken = [];
export const professionals = [];
export const kindbank = {};
let gezondheid = Object.fromEntries(kinderen.map((k) => {
    const b = kindbank[k.id];
    return [k.id, { huisarts: k.huisarts, tandarts: b?.tandarts ?? "", apotheek: b?.apotheek ?? "", allergieen: b?.allergieen ?? "", medicatie: b?.medicatie ?? "", verzekering: b?.verzekering ?? "", bijzonderheden: k.medisch }];
}));
const gezondheidLuisteraars = new Set();
export function useGezondheid(kindId) {
    return useSyncExternalStore((l) => { gezondheidLuisteraars.add(l); return () => gezondheidLuisteraars.delete(l); }, () => gezondheid[kindId], () => gezondheid[kindId]);
}
export function bewaarGezondheid(kindId, nieuw) {
    const oud = gezondheid[kindId];
    const kind = kinderen.find((k) => k.id === kindId);
    if (!oud || !kind)
        return;
    const labels = { huisarts: "Huisarts", tandarts: "Tandarts", apotheek: "Apotheek", allergieen: "Allergieën", medicatie: "Medicatie", verzekering: "Zorgverzekering", bijzonderheden: "Bijzonderheden" };
    const velden = Object.keys(labels);
    if (!velden.some((v) => oud[v] !== nieuw[v]))
        return;
    gezondheid = { ...gezondheid, [kindId]: { ...nieuw } };
    for (const veld of velden) {
        if (oud[veld] === nieuw[veld])
            continue;
        leg("dossier", `gezondheid-${kindId}-${veld}`, `${labels[veld]} · ${kind.naam}`, "UPDATED", { veld: labels[veld], oud: oud[veld], nieuw: nieuw[veld] }, "Sanne", { kinderen: [kind.naam], meta: { type: "Gezondheid" } });
    }
    gezondheidLuisteraars.forEach((l) => l());
}
