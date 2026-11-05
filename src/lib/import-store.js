import { useSyncExternalStore } from "react";
import { vandaag, zetAfspraken } from "./afspraken-store";
/** Bevestigde import gaat rechtstreeks in de ene afsprakenbron, met het document als herkomst. */
export const voegGeimporteerdToe = (a) => {
    const d = vandaag();
    zetAfspraken((l) => [{ id: a.id, titel: a.titel, tekst: a.tekst, onderwerp: "Overig", kind: "Emma & Noah", status: "Actief", geldtVanaf: d,
            bron: { soort: "document", label: `${a.document}: ${a.bron}`, document: true }, versies: [], geschiedenis: [{ datum: d, tekst: `Overgenomen uit ${a.document}.` }] }, ...l]);
};
/** Aantal herkende onderdelen dat nog op een keuze wacht — afgeleid uit de importflow, gedeeld met Home. */
let teControleren = 0;
const ls = new Set();
export const zetTeControleren = (n) => { if (n !== teControleren) {
    teControleren = n;
    ls.forEach((l) => l());
} };
export const useTeControleren = () => useSyncExternalStore((l) => { ls.add(l); return () => ls.delete(l); }, () => teControleren, () => teControleren);
