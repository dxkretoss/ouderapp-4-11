/**
 * Snelle, lokale controle op duidelijke beledigingen vóór verzending.
 * Doel: een duidelijk beledigend bericht mag niet ongemerkt verstuurd worden
 * terwijl de AI-analyse nog bezig is. Bewust een korte, expliciete lijst met
 * woordgrenzen, zodat gewone woorden nooit als scheldwoord worden aangemerkt.
 * Dreiging en intimidatie vallen hier buiten: die volgen de aparte
 * veiligheidscontrole (mogelijkeOnveiligheid).
 */
// Alleen woorden die op zichzelf duidelijk beledigend zijn wanneer ze op een
// persoon gericht worden. Veelvoorkomende spelfouten (eikl) zijn opgenomen.
const BELEDIGINGEN = [
    "eikel",
    "eikl",
    "idioot",
    "sukkel",
    "debiel",
    "hork",
    "trut",
    "klootzak",
    "klojo",
    "oelewapper",
    "egoïst",
    "egoist",
];
const patroon = new RegExp(`\\b(?:${BELEDIGINGEN.join("|")})\\b`, "iu");
/** Bevat de tekst een duidelijke belediging? Gewone woorden geven nooit een treffer. */
export const bevatBelediging = (tekst) => patroon.test(tekst.normalize("NFC"));
