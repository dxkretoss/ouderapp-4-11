import { useSyncExternalStore } from "react";
export const gezagLabels = {
    gezamenlijk: "Beide ouders hebben gezamenlijk gezag",
    ouder1: "Sanne heeft eenhoofdig gezag",
    ouder2: "Joris heeft eenhoofdig gezag",
    voogd: "Er is een voogd",
    anders: "Anders / bijzondere situatie",
    onbekend: "Nog niet ingesteld",
};
let state = {
    gezag: { emma: "gezamenlijk", noah: "gezamenlijk" },
    bevestigd: { emma: true, noah: false },
    afwijkend: false,
    extraSteun: false,
    gebruikt: [],
};
const listeners = new Set();
export function setGezagState(patch) {
    state = { ...state, ...patch };
    listeners.forEach((l) => l());
}
export function useGezagState() {
    return useSyncExternalStore((l) => {
        listeners.add(l);
        return () => listeners.delete(l);
    }, () => state, () => state);
}
/** Zorgregeling bij gezamenlijk gezag, anders omgangsregeling. */
export function regelingNaam(g) {
    return g === "gezamenlijk" ? "zorgregeling" : "omgangsregeling";
}
/** Onthoud dat een extra hulpmiddel is gebruikt, zodat het later makkelijk bereikbaar is. */
export function markeerGebruikt(pad) {
    if (!state.gebruikt.includes(pad))
        setGezagState({ gebruikt: [...state.gebruikt, pad] });
}
