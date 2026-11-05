import { describe, expect, test } from "bun:test";
import { alGereageerd, bouwCoachVerzoek } from "./coach.functions";
describe("schrijfhulp leest het hele gesprek mee", () => {
    test("eigen antwoord ná het bericht telt als al gereageerd", () => {
        expect(alGereageerd([{ van: "ander" }, { van: "ik" }])).toBe(true);
    });
    test("alleen berichten van de ander daarna is niet gereageerd", () => {
        expect(alGereageerd([{ van: "ander" }])).toBe(false);
    });
    test("eigen eerdere antwoorden staan in volgorde in de vraag", () => {
        const { input, instructions } = bouwCoachVerzoek({
            tekst: "Kun je vrijdag om 17:00 ophalen?", stijl: "antwoord",
            context: [{ van: "ik", tekst: "A" }, { van: "ander", tekst: "B" }],
            daarna: [{ van: "ik", tekst: "Ja, dat lukt." }],
        });
        expect(input.indexOf("Ik: A")).toBeLessThan(input.indexOf("Andere ouder: B"));
        expect(input).toContain("Daarna in het gesprek:\nIk: Ja, dat lukt.");
        expect(instructions).toContain("Stel GEEN nieuw antwoord voor");
    });
    test("Meer kindgericht verbiedt wensen of gevoelens van het kind", () => {
        const { instructions } = bouwCoachVerzoek({ tekst: "Emma wil bij mij blijven", stijl: "Meer kindgericht" });
        expect(instructions).toContain("Schrijf NOOIT wat een kind wil");
    });
});
import { nieuweDetails } from "./coach.functions";
describe("geen verzonnen details", () => {
    test("'bij de BSO' zonder BSO in het gesprek wordt gevonden", () => {
        expect(nieuweDetails("Ik laat je weten of ik Noah bij de BSO kan ophalen.", "Kun jij vrijdag Noah ophalen?")).toContain("bij de BSO");
    });
    test("verzonnen tijd wordt gevonden", () => {
        expect(nieuweDetails("Ik kan om 17:30 uur.", "Kun jij vrijdag?")).toContain("17:30");
    });
    test("details uit het gesprek zijn toegestaan", () => {
        expect(nieuweDetails("Ik laat je weten of ik Noah vrijdag om 17:00 uur kan ophalen.", "Kun jij vrijdag Noah om 17:00 uur ophalen?")).toEqual([]);
    });
});
