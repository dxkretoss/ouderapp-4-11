/** Lokale kalenderdatums, zonder UTC-verschuiving. Gedeeld door Home en Agenda. */
export const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const dt = (s) => new Date(`${s}T00:00`);
export const plusDagen = (s, n) => { const d = dt(s); d.setDate(d.getDate() + n); return iso(d); };
export const maandagVan = (s) => plusDagen(s, -((dt(s).getDay() + 6) % 7));
export function voorkomens(a, van, tot) {
    const h = a.herhaling;
    if (!h || h.freq === "geen")
        return a.datum >= van && a.datum <= tot ? [a.datum] : [];
    const uit = [];
    const start = dt(a.datum);
    for (let i = 0; i < 500; i++) {
        let d = new Date(start);
        const plusMaanden = (n) => new Date(start.getFullYear(), start.getMonth() + n, Math.min(start.getDate(), new Date(start.getFullYear(), start.getMonth() + n + 1, 0).getDate()));
        if (h.freq === "wekelijks")
            d.setDate(d.getDate() + 7 * i);
        else if (h.freq === "tweewekelijks")
            d.setDate(d.getDate() + 14 * i);
        else if (h.freq === "maandelijks")
            d = plusMaanden(i);
        else if (h.eenheid === "weken")
            d.setDate(d.getDate() + 7 * h.interval * i);
        else
            d = plusMaanden(h.interval * i);
        const s = iso(d);
        if (s > tot || (h.eind && s > h.eind))
            break;
        if (s >= van && !a.overslaan?.includes(s))
            uit.push(s);
    }
    return uit;
}
export function agendaItems(data) {
    return data.filter((a) => !!a && typeof a === "object" && "id" in a && "datum" in a && "titel" in a && typeof a.id === "string" && typeof a.datum === "string" && typeof a.titel === "string");
}
