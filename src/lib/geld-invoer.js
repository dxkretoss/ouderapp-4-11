/** Dutch currency input: preserve typed text until blur, parse decimal/group separators explicitly. */
export function leesGeld(tekst) {
    const t = tekst.trim();
    if (!t || !/^[0-9.,]+$/.test(t))
        return null;
    let n = t;
    if (t.includes(",")) {
        if (!/^\d+(?:\.\d{3})*,\d+$/.test(t))
            return null;
        n = t.replaceAll(".", "").replace(",", ".");
    }
    else if ((t.match(/\./g)?.length ?? 0) > 1) {
        if (!/^\d{1,3}(?:\.\d{3})+$/.test(t))
            return null;
        n = t.replaceAll(".", "");
    }
    else if (!/^\d+(?:\.\d+)?$/.test(t))
        return null;
    const bedrag = Number(n);
    return Number.isFinite(bedrag) && bedrag <= Number.MAX_SAFE_INTEGER / 100 ? Math.round((bedrag + Number.EPSILON) * 100) / 100 : null;
}
export const schrijfGeld = (bedrag) => bedrag.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
