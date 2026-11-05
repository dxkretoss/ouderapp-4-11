import { useSyncExternalStore } from "react";
/** Gedeelde status van de "Actie vereist"-lijst op de homepagina. */
let verwerkt = new Set();
const listeners = new Set();
export function verwerkActie(id) {
    if (verwerkt.has(id))
        return;
    verwerkt = new Set(verwerkt).add(id);
    listeners.forEach((l) => l());
}
export function useActiesVerwerkt() {
    return useSyncExternalStore((l) => {
        listeners.add(l);
        return () => listeners.delete(l);
    }, () => verwerkt, () => verwerkt);
}
