import { describe, expect, test } from "bun:test";
import { verzamelActiviteiten, nieuw, heeftNieuws, perCategorie, markeerIds } from "./activiteiten";
const voorstel = { sleutel: "zorg-z1", bron: "zorg", bronId: "z1", titel: "Wijzigingsvoorstel verdeling", omschrijving: "Za 25 okt", status: "wacht-op-jouw-reactie", aanJou: true, naar: "/zorgregeling" };
const ev = (actor, actie, id = "e1") => ({ eventId: id, itemId: "a1", soort: "afspraak", itemNaam: "Schoolgesprek", actorId: actor, actorNaam: actor === "joris" ? "Joris" : "Sanne", actorRol: "Ouder", actie, wijzigingen: actie === "UPDATED" ? [{ veld: "tijd", oud: "14:00", nieuw: "15:30" }] : [], kinderen: [], meta: {}, moment: "2026-11-03T10:00:00Z" });
const mom = (id, van, prive = false) => ({ id, kindId: "emma", van, tekst: "Leuk", wanneer: "Za 8 maart", moment: "geen", prive });
describe("Activiteiten", () => {
    test("openstaand verzoek staat onder Nog te regelen en blijft na lezen in Nieuw", () => {
        const l = verzamelActiviteiten({ ik: "sanne", voorstellen: [voorstel], audit: [], momentjes: [] });
        expect(l[0].categorie).toBe("regelen");
        expect(nieuw(l, markeerIds(l[0])).length).toBe(1);
    });
    test("eigen handelingen geven geen activiteit; verwijderen door de ander valt onder Gewijzigd", () => {
        const l = verzamelActiviteiten({ ik: "sanne", voorstellen: [], audit: [ev("sanne", "DELETED"), ev("joris", "DELETED", "e2")], momentjes: [] });
        expect(l.length).toBe(1);
        expect(l[0].categorie).toBe("gewijzigd");
        expect(l[0].uitleg).toContain("Joris heeft Schoolgesprek verwijderd");
    });
    test("wijziging toont oude en nieuwe waarde", () => {
        const [a] = verzamelActiviteiten({ ik: "sanne", voorstellen: [], audit: [ev("joris", "UPDATED")], momentjes: [] });
        expect(a.wijzigingen).toEqual([{ veld: "tijd", oud: "14:00", nieuw: "15:30" }]);
    });
    test("privé en eigen Momentjes verschijnen niet; gedeelde worden gebundeld", () => {
        const l = verzamelActiviteiten({ ik: "sanne", voorstellen: [], audit: [], momentjes: [mom("1", "joris"), mom("2", "joris"), mom("3", "joris", true), mom("4", "sanne")] });
        expect(l.length).toBe(1);
        expect(l[0].titel).toBe("2 Momentjes gedeeld");
    });
    test("gelezen haalt informatieve activiteit uit Nieuw maar houdt hem in Alles; geen bolletje", () => {
        const l = verzamelActiviteiten({ ik: "sanne", voorstellen: [], audit: [ev("joris", "CREATED")], momentjes: [] });
        const g = markeerIds(l[0]);
        expect(nieuw(l, g).length).toBe(0);
        expect(l.length).toBe(1);
        expect(heeftNieuws(l, g)).toBe(false);
    });
    test("lege categorieën worden niet getoond", () => {
        expect(perCategorie([])).toEqual([]);
    });
});
