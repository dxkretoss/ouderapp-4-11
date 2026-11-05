import { describe, expect, test } from "bun:test";
import { legIntakeVast, mijnRechten, proState as haal, voorOudersVan } from "./pro-journaal-store";
const aanmelding = { datum: "2026-10-08", verwijzer: "Wijkteam", reden: "Veel spanning bij wissels", hulpvraag: "Rust bij overdracht", aandacht: "", hulpverleners: [{ naam: "Anna", organisatie: "GGD", functie: "Jeugdverpleegkundige", contact: "anna@ggd.nl", rol: "", samenwerking: "" }] };
describe("intake vastleggen", () => {
    test("bestaand dossier: alleen ingevulde velden aangevuld, regeling niet overschreven", () => {
        legIntakeVast("bakker", aanmelding, { gezag: "", regeling: "", overig: "Situatie" }, ["Vakantieverdeling overeenkomen", "Nieuw doel"]);
        const s = haal();
        expect(s.gegevens["bakker"]?.regeling).toBe("Week op / week af");
        expect(s.gegevens["bakker"]?.gezag).toBe("Gezamenlijk");
        expect(s.gegevens["bakker"]?.overig).toBe("Situatie");
        const doelen = s.doelen.filter((d) => d.dossier === "bakker").map((d) => d.tekst);
        expect(doelen.filter((t) => t === "Vakantieverdeling overeenkomen").length).toBe(1);
        expect(s.doelen.find((d) => d.tekst === "Nieuw doel")?.status).toBe("Te bespreken");
    });
    test("nieuw dossier: geen gezinstoegang, intern verslag nooit voor ouders", () => {
        legIntakeVast("nieuw-1", aanmelding, { gezag: "Gezamenlijk", regeling: "Om de week" }, [], { rol: "Mediator", start: "2026-10-08" });
        const s = haal();
        expect(s.aanmeldingen["nieuw-1"]?.hulpverleners.length).toBe(1);
        expect(mijnRechten("nieuw-1")).toEqual(["notities", "journaal", "acties"]);
        expect(JSON.stringify(voorOudersVan(s, "nieuw-1"))).not.toContain("Veel spanning");
    });
});
