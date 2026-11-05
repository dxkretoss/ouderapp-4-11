import { afspraken } from "@/lib/demo-data";
import { useSlimmeHulp } from "@/lib/slimme-hulp";
import { kindNamen } from "@/lib/zorg-store";
/**
 * Gevolgencheck: pure regels die alleen lezen. Toont wat een zorgvoorstel raakt
 * (afspraken en vaste spullen op die dagen); voert nooit zelf iets uit.
 */
const weekdagen = ["zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag"];
export function gevolgenVan(v, routines) {
    if (!v.dagen.length)
        return [];
    const namen = v.kinderen.map((k) => kindNamen[k]);
    if (v.soort === "structureel") {
        // Structureel: alles vanaf de eerste dag van de nieuwe regeling, en vaste wekelijkse spullen.
        const vanaf = v.dagen[0] ?? 1;
        const uitS = afspraken
            .filter((a) => a.dag >= vanaf && namen.some((n) => a.kind.includes(n)))
            .slice(0, 5)
            .map((a) => ({ id: `a-${a.id}`, soort: "afspraak", tekst: `${a.titel} · ${a.dag} maart ${a.tijd} (${a.kind})` }));
        for (const r of routines) {
            if (v.kinderen.includes(r.kind))
                uitS.push({ id: `r-${r.id}`, soort: "spullen", tekst: `${r.item} op ${r.dag} — kijk wie dit voortaan meegeeft` });
        }
        return uitS;
    }
    const uit = [];
    for (const dag of v.dagen) {
        for (const a of afspraken) {
            if (a.dag === dag && namen.some((n) => a.kind.includes(n)))
                uit.push({ id: `a-${a.id}`, soort: "afspraak", tekst: `${a.titel} · ${a.tijd} (${a.kind})` });
        }
        const wd = weekdagen[new Date(2026, 2, dag).getDay()];
        for (const r of routines) {
            if (r.dag === wd && v.kinderen.includes(r.kind))
                uit.push({ id: `r-${r.id}-${dag}`, soort: "spullen", tekst: `${r.item} moet mee` });
        }
    }
    return uit.filter((g, i) => uit.findIndex((x) => x.id === g.id) === i);
}
export function useGevolgen(v) {
    const { routines } = useSlimmeHulp();
    return gevolgenVan(v, routines);
}
