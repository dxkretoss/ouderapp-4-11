import { describe, expect, it } from "bun:test";
import { bouwVerhaalContext, kiesActies, zorgSignaal } from "./verhaal";
const bronnen = {
    vakanties: [
        { naam: "Meivakantie", periode: "25 apr–3 mei", ouder: "Sanne", status: "afgesproken" },
        { naam: "Zomervakantie deel 2", periode: "3–30 aug", ouder: "Joris", status: "voorstel", van: "Joris" },
    ],
    voorstellen: [{ titel: "Wijzigingsverzoek", status: "wacht op jouw reactie" }],
    taken: [{ tekst: "Tandarts bellen", wie: "Joris", klaar: false }, { tekst: "Klaar", wie: "Sanne", klaar: true }],
    afspraken: [{ titel: "Bedtijden", tekst: "Noah 19:30 uur" }],
};
describe("Even je verhaal kwijt", () => {
    it("praatvoorkeur blokkeert geen passende vervolgstappen", () => {
        expect(kiesActies(["bericht", "taken"], "praten")).toEqual(["bericht", "taken"]);
    });
    it("maximaal drie geldige acties", () => {
        expect(kiesActies(["bericht", "taken", "agenda", "niets", "hack"], "doen")).toEqual(["bericht", "taken", "agenda"]);
    });
    it("voorstel wordt nooit als afspraak in de context gezet", () => {
        const c = bouwVerhaalContext(bronnen, ["vakanties"]);
        expect(c).toContain("Zomervakantie deel 2 (3–30 aug): Joris — voorstel van Joris, nog GEEN akkoord");
        expect(c).toContain("Meivakantie (25 apr–3 mei): Sanne — bevestigd");
    });
    it("neemt alleen gekozen categorieën mee", () => {
        const c = bouwVerhaalContext(bronnen, ["taken"]);
        expect(c).not.toContain("VAKANTIES");
        expect(c).toContain("Tandarts bellen");
        expect(c).not.toContain("Klaar");
    });
    it("zonder toestemming geen context", () => {
        expect(bouwVerhaalContext(bronnen, [])).toBe("");
    });
    it("herkent ernstige zorgen", () => {
        expect(zorgSignaal("Ik ben bang voor hem, hij dreigt steeds")).toBe(true);
        expect(zorgSignaal("Ik wil soms niet meer leven")).toBe(true);
        expect(zorgSignaal("Ik baal van de vakantieplanning")).toBe(false);
    });
});
