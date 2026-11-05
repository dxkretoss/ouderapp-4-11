import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { duurBetrokkenheid, mijnRechten, trekToegangIn, useProWerk, voorOudersVan } from "./pro-journaal-store";
function lees() {
    let gevonden;
    function Lezer() { gevonden = useProWerk(); return null; }
    renderToString(createElement(Lezer));
    if (!gevonden)
        throw new Error("Geen bestaande professionele bron");
    return gevonden;
}
describe("Afsluiten bestaande betrokkenheid", () => {
    test("duur gebruikt echte kalenderdagen en schat ontbrekende datums niet", () => {
        expect(duurBetrokkenheid("2026-09-12", "2026-10-08")).toBe(26);
        expect(duurBetrokkenheid("2026-09-12", "2026-09-12")).toBe(0);
        expect(duurBetrokkenheid("", "2026-10-08")).toBeUndefined();
        expect(duurBetrokkenheid("2026-02-30", "2026-10-08")).toBeUndefined();
        expect(duurBetrokkenheid("2026-10-09", "2026-10-08")).toBeUndefined();
    });
    test("ongeldige afsluiting verandert geen betrokkenheid", () => {
        const voor = lees();
        expect(() => trekToegangIn("p-jansen-1", { eind: "2026-09-01", samenvatting: "Intern" })).toThrow();
        expect(lees()).toBe(voor);
    });
    test("één interne samenvatting, geschiedenis behouden, geen ouderdeling, toegang stopt", () => {
        const voor = lees();
        const ouderVoor = voorOudersVan(voor, "jansen");
        trekToegangIn("p-jansen-1", { eind: "2026-10-08", samenvatting: "Gecontroleerde interne afsluiting" });
        const na = lees();
        const p = na.pros.find((x) => x.id === "p-jansen-1");
        expect(p?.actief).toBe(false);
        expect(p?.afsluiting).toEqual({ eind: "2026-10-08", samenvatting: "Gecontroleerde interne afsluiting" });
        expect(mijnRechten("jansen", na)).toEqual([]);
        expect(na.log.slice(0, -1)).toEqual([...voor.log]);
        expect(na.log.length).toBe(voor.log.length + 1);
        expect(na.notities).toBe(voor.notities);
        expect(voorOudersVan(na, "jansen")).toEqual(ouderVoor);
        expect(JSON.stringify(voorOudersVan(na, "jansen"))).not.toContain("Gecontroleerde interne afsluiting");
        trekToegangIn("p-jansen-1", { eind: "2026-10-08", samenvatting: "Tweede" });
        expect(lees()).toBe(na);
    });
});
