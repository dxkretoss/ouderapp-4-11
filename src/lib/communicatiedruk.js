/** Configureerbare drempels; later beheerbaar. */
export const drukDrempels = { veelBerichten: 8, hoogBerichten: 14, veelWissels: 4, hoogWissels: 6, onderwerp: 10 };
export function drukNiveau(s, d = drukDrempels) {
    let punten = 0;
    if (s.berichten >= d.hoogBerichten)
        punten += 2;
    else if (s.berichten >= d.veelBerichten)
        punten += 1;
    if (s.overEnWeer >= d.hoogWissels)
        punten += 2;
    else if (s.overEnWeer >= d.veelWissels)
        punten += 1;
    if (s.taalwaarschuwingen >= 2)
        punten += 1;
    if (s.zelfdeOnderwerp >= d.onderwerp)
        punten += 1;
    return punten >= 3 ? "hoog" : punten >= 1 ? "veel" : "rustig";
}
export const drukLabel = { rustig: "Rustig", veel: "Veel communicatie", hoog: "Hoge communicatiedruk" };
export const drukUitleg = {
    rustig: "Normale hoeveelheid communicatie.",
    veel: "Meer berichten over en weer dan gebruikelijk.",
    hoog: "Veel communicatie in korte tijd, op basis van meerdere gemeten signalen.",
};
/** Leesbare redenen, zodat de indicator altijd uitlegbaar is. */
export function drukRedenen(s) {
    return [
        `${s.berichten} berichten`,
        `${s.overEnWeer} reacties over en weer`,
        ...(s.taalwaarschuwingen ? [`${s.taalwaarschuwingen} ${s.taalwaarschuwingen === 1 ? "bericht" : "berichten"} waarbij de taalwaarschuwing werd geactiveerd`] : []),
        ...(s.zelfdeOnderwerp >= drukDrempels.onderwerp ? [`${s.zelfdeOnderwerp} berichten over hetzelfde onderwerp`] : []),
    ];
}
/** Configureerbare regel: kijk naar het werkelijke patroon, niet naar een vast aantal zinnen. */
export const pauzeRegel = { vensterMs: 5 * 60_000, wisselsVoorWaarschuwing: 4, wisselsVoorPauze: 6, pauzeMs: 10 * 60_000 };
export function wisselsInVenster(tikken, nu = Date.now(), r = pauzeRegel) {
    const recent = tikken.filter((t) => nu - t.ts <= r.vensterMs);
    let w = 0;
    for (let i = 1; i < recent.length; i++)
        if (recent[i].van !== recent[i - 1].van)
            w++;
    const beideKanten = new Set(recent.map((t) => t.van)).size > 1;
    return beideKanten ? w : 0;
}
export function pauzeAdvies(tikken, nu = Date.now(), r = pauzeRegel) {
    const w = wisselsInVenster(tikken, nu, r);
    if (w >= r.wisselsVoorPauze)
        return "pauze";
    if (w >= r.wisselsVoorWaarschuwing)
        return "waarschuwen";
    return "geen";
}
