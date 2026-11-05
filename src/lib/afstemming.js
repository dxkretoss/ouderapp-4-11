/** Eén onderwerp = dezelfde kinderen, dezelfde dagen en hetzelfde soort voorstel. */
export const onderwerpSleutel = (v) => [v.soort, [...v.kinderen].sort().join("+"), v.dagen.join(",") || v.datumLabel].join("|");
export function onderwerpen(lijst) {
    const groepen = new Map();
    for (const v of lijst)
        groepen.set(onderwerpSleutel(v), [...(groepen.get(onderwerpSleutel(v)) ?? []), v]);
    return [...groepen].map(([sleutel, voorstellen]) => {
        const laatste = voorstellen.at(-1);
        const zonderResultaat = voorstellen.filter((v) => v.status === "afgewezen" || v.status === "alternatief").length;
        const akkoord = voorstellen.some((v) => v.status === "geaccepteerd");
        // Geen overeenstemming: minstens twee rondes zonder akkoord en niets meer open. Geen reactie telt nooit als akkoord of afwijzing.
        const open = voorstellen.some((v) => v.status === "open");
        return { sleutel, voorstellen, open, laatste, geenOvereenstemming: !akkoord && !open && zonderResultaat >= 2 };
    });
}
/** Herkent een identiek voorstel dat eerder al zonder akkoord werd afgesloten. */
export const eerderZonderAkkoord = (lijst, nieuw) => lijst.some((v) => (v.status === "afgewezen" || v.status === "ingetrokken") && onderwerpSleutel(v) === onderwerpSleutel(nieuw) && v.naarOuder === nieuw.naarOuder);
/** Neutrale tekst na "Niet akkoord"; alleen een bevestigde afspraak noemen als die echt bestaat. */
export const nietAkkoordTekst = (bevestigdeAfspraak) => bevestigdeAfspraak
    ? "Je gaat niet akkoord met dit voorstel. De huidige bevestigde afspraak verandert hierdoor niet."
    : "Je gaat niet akkoord met dit voorstel. Deze kwestie is nog niet opgelost.";
export const reminders = {
    voorstel: "Een duidelijke afspraak geeft rust en voorspelbaarheid.",
    wissel: "Duidelijke haal- en brengtijden helpen je kind te weten waar het aan toe is.",
    vakantie: "Tijdige duidelijkheid over vakanties helpt bij een rustige voorbereiding.",
    vastgelopen: "Ook wanneer jullie het niet eens zijn, helpt het om duidelijk te houden welke afspraken nu gelden.",
    lang: "Probeer het gesprek bij één praktisch onderwerp te houden.",
    bevestigd: "Fijn dat er duidelijkheid is over deze afspraak.",
};
/** Maximaal één reminder; nooit bij veiligheid, nooit opnieuw na sluiten. */
export function kiesReminder(moment, o) {
    if (!o.aan || o.veiligheid || !moment || o.gesloten.includes(moment))
        return null;
    return { moment, tekst: reminders[moment] };
}
