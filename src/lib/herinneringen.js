import { leesDatum } from "./kosten-akkoord";
const naarDatum = (iso) => leesDatum(iso, Number(iso.slice(0, 4)));
/** Tel verstuurde herinneringen vóór en na de gewenste reactiedatum. */
export function telHerinneringen(verstuurd, reactieDatum) {
    const grens = reactieDatum ? naarDatum(reactieDatum) : null;
    let voor = 0, na = 0;
    for (const d of verstuurd) {
        const datum = naarDatum(d);
        if (!datum)
            continue;
        if (grens && datum.getTime() > grens.getTime())
            na++;
        else
            voor++;
    }
    return { voor, na };
}
/**
 * Mag de verzender nu een herinnering sturen?
 * - Nooit bij gepauzeerde herinneringen (veiligheidsafspraken, contactbeperking, begeleiding).
 * - Maximaal één herinnering vóór de gewenste reactiedatum.
 * - Maximaal één herinnering nadat de reactiedatum is verstreken.
 * - Zonder reactiedatum: maximaal één herinnering per voorstel.
 */
export function magHerinnering(opts) {
    if (opts.gepauzeerd)
        return { mag: false, reden: "Herinneringen zijn gepauzeerd. Dat kan bijvoorbeeld vanwege veiligheids- of contactafspraken." };
    const { voor, na } = telHerinneringen(opts.verstuurd, opts.reactieDatum);
    if (!opts.reactieDatum)
        return voor + na === 0 ? { mag: true } : { mag: false, reden: "Er is al een herinnering verstuurd voor dit voorstel." };
    const verstreken = (() => { const g = naarDatum(opts.reactieDatum); return g && g.getTime() < Date.now(); })();
    if (verstreken)
        return na === 0 ? { mag: true } : { mag: false, reden: "Er is al een herinnering verstuurd na de gewenste reactiedatum." };
    return voor === 0 ? { mag: true } : { mag: false, reden: "Er is al een herinnering verstuurd. De andere ouder kan reageren wanneer daar gelegenheid voor is." };
}
/** Voorbeeldtekst van een vriendelijke herinnering — neutraal, zonder druk. */
export const herinneringTekst = (onderwerp) => `Er staat nog een voorstel voor je klaar over ${onderwerp}. Je kunt reageren wanneer je daar gelegenheid voor hebt.`;
