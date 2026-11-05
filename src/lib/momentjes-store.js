import { useSyncExternalStore } from "react";
export const mijlpalen = [
    "Eerste stapjes", "Eerste woordje", "Eerste schooldag", "Eerste tand", "Zwemdiploma",
    "Verjaardag", "Sportprestatie", "Rapport", "Iets bijzonders",
];
export const reacties = [
    { e: "❤️", l: "Leuk" }, { e: "🥰", l: "Lief" }, { e: "🎉", l: "Trots" }, { e: "👏", l: "Wat goed!" },
];
export const momentLabel = {
    vooraf: "Vooraf", tijdens: "Tijdens", na: "Na afloop", geen: "",
};
let state = {
    herinnering: true,
    professionals: false,
    lijst: [],
};
const listeners = new Set();
function zet(p) {
    state = { ...state, ...p };
    listeners.forEach((l) => l());
}
export const voegMomentjeToe = (m) => zet({ lijst: [m, ...state.lijst] });
export const reageer = (id, p) => zet({ lijst: state.lijst.map((m) => (m.id === id ? { ...m, ...p } : m)) });
export const setHerinnering = (v) => zet({ herinnering: v });
export const setProfessionals = (v) => zet({ professionals: v });
export function useMomentjes() {
    return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => state, () => state);
}
