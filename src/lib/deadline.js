const maanden = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];
/** Herkent "uiterlijk 18 oktober" / "vóór 3 nov" in tekst. Alleen een voorstel; slaat zelf niets op. */
export function vindDeadline(tekst, vandaag = new Date()) {
    const m = tekst.toLowerCase().match(/(?:uiterlijk|v[oó]{2}r|deadline|graag voor)\s+(?:\w+dag\s+)?(\d{1,2})\s+([a-z]{3,})/);
    if (!m)
        return null;
    const mi = maanden.findIndex((x) => x.startsWith(m[2].slice(0, 3)));
    if (mi < 0)
        return null;
    let jaar = vandaag.getFullYear();
    const d = new Date(Date.UTC(jaar, mi, Number(m[1])));
    if (d.getTime() < vandaag.getTime() - 864e5)
        jaar += 1;
    return `${jaar}-${String(mi + 1).padStart(2, "0")}-${String(Number(m[1])).padStart(2, "0")}`;
}
