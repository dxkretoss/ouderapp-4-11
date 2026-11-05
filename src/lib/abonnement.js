export const abonnementen = [
    { id: "maand", naam: "Maandelijks", prijsCent: 499, periode: "maand", proefDagen: 14 },
    { id: "jaar", naam: "Jaarlijks", prijsCent: 4900, periode: "jaar", proefDagen: 14, toelichting: "Ongeveer 2 maanden voordeliger" },
];
export const inbegrepen = [
    "Gedeelde agenda en verdeling van de week per kind",
    "Berichten per onderwerp met formuleerhulp",
    "Kosten bijhouden en afrekenen",
    "Documenten, taken en spullen",
    "De kring rond je kind",
    "Overzicht bewaren of delen en wijzigingsgeschiedenis",
];
export const euro = (cent) => (cent / 100).toLocaleString("nl-NL", { style: "currency", currency: "EUR" });
/** Beperkt bewaarabonnement: prijs en voorwaarden zijn configuratie, geen vaste architectuur. */
export const bewaarPlan = {
    naam: "Gegevens bewaren",
    prijsCent: 200,
    periode: "maand",
    bewaartermijnMaanden: 24,
    blijftBewaard: ["Agenda en verdeling van de week", "Berichten", "Kosten en betalingen", "Documenten", "Momentjes", "Wijzigingsgeschiedenis"],
    blijftBeschikbaar: ["Alles bekijken (alleen lezen)", "Overzicht bewaren of delen", "Documenten downloaden"],
    gaatUit: ["Nieuwe afspraken, berichten of kosten toevoegen", "Voorstellen doen of beantwoorden", "Assistent en formuleerhulp", "Meldingen en herinneringen"],
};
import { useSyncExternalStore } from "react";
let ab = { status: "actief", planId: "jaar", verlengdatum: "2027-01-14", betaalmethode: "iDEAL · NL•• INGB •••• 4821" };
const abL = new Set();
export const zetAbonnement = (p) => { ab = { ...ab, ...p }; abL.forEach((l) => l()); };
export const useAbonnement = () => useSyncExternalStore((l) => { abL.add(l); return () => abL.delete(l); }, () => ab, () => ab);
