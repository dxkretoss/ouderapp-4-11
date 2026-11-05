import { describe, expect, test } from "bun:test";
import { coPersoonlijkheid } from "./co-persoonlijkheid";
import { bouwCoachVerzoek } from "./coach.functions";
import { systeem as verhaalSysteem } from "./verhaal.functions";
describe("Co-persoonlijkheid", () => {
    test("bevat de kern van de vaste stijl", () => {
        for (const kern of ["Je bent Co", "BIFF", "EAR", "je\" en \"jij", "0800-2000", "112", "geen reactie niet automatisch akkoord", "verstuurt nooit zelfstandig berichten"]) {
            expect(coPersoonlijkheid).toContain(kern);
        }
    });
    test("verbiedt partij kiezen en moreel drukmiddel over het kind", () => {
        expect(coPersoonlijkheid).toContain("kies geen partij");
        expect(coPersoonlijkheid).toContain("moreel drukmiddel");
    });
    test("zit in de schrijfhulp-instructies (schrijven én antwoorden)", () => {
        const schrijven = bouwCoachVerzoek({ tekst: "hoi", stijl: "Rustiger" });
        const antwoorden = bouwCoachVerzoek({ tekst: "hoi", stijl: "antwoord" });
        expect(schrijven.instructions).toContain("Je bent Co");
        expect(antwoorden.instructions).toContain("Je bent Co");
    });
    test("zit in de verhaal-instructies van Co", () => {
        expect(verhaalSysteem).toContain("Je bent Co");
        expect(verhaalSysteem).toContain("BIFF");
    });
});
