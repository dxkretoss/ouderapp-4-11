import { useSyncExternalStore } from "react";
import { zorgweek } from "@/lib/demo-data";
/** Demo: "vandaag" is woensdag 12 maart. */
export const VANDAAG = 12;
export const isOverdrachtsdag = (datum = VANDAAG) => zorgweek.some((d) => d.datum === datum && d.wissel);
let state = { aan: true, getoond: false, voorbeeld: false };
const listeners = new Set();
function zet(p) {
    state = { ...state, ...p };
    listeners.forEach((l) => l());
}
export const setCheckinAan = (aan) => zet({ aan });
export const markeerCheckinGetoond = () => zet({ getoond: true, voorbeeld: false });
/** Laat de check-in zien zoals op een overdrachtsdag (voor de demo). */
export const toonVoorbeeld = () => zet({ voorbeeld: true, getoond: false });
export function useCheckin() {
    return useSyncExternalStore((l) => {
        listeners.add(l);
        return () => listeners.delete(l);
    }, () => state, () => state);
}
