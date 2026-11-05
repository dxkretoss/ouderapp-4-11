import { useSyncExternalStore } from "react";
/** Gedeelde meeneemlijst en overdrachtstatus — gelezen door Wisselassistent, Overdracht en KindKompas. */
export const meeneemLijst = [];
let state = { klaar: new Set(), overdrachtIngevuld: false, laatsteOverdracht: {} };
const listeners = new Set();
const zet = (s) => {
    state = s;
    listeners.forEach((l) => l());
};
export function toggleMeeneem(id) {
    const klaar = new Set(state.klaar);
    if (klaar.has(id))
        klaar.delete(id);
    else
        klaar.add(id);
    zet({ ...state, klaar });
}
export function beginOverdracht(kindId) {
    if (!state.laatsteOverdracht[kindId])
        zet({ ...state, laatsteOverdracht: { ...state.laatsteOverdracht, [kindId]: new Date().toISOString() } });
}
export function markeerOverdrachtIngevuld(kindId) {
    zet({ ...state, overdrachtIngevuld: true, laatsteOverdracht: kindId ? { ...state.laatsteOverdracht, [kindId]: new Date().toISOString() } : state.laatsteOverdracht });
}
export function useWissel() {
    return useSyncExternalStore((l) => {
        listeners.add(l);
        return () => listeners.delete(l);
    }, () => state, () => state);
}
