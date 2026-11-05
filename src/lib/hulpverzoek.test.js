import { describe, expect, test, beforeEach } from "bun:test";
import { accepteerHulp, hulpKandidaten, hulpState, resetHulpVoorTest, takenState, vraagHulp } from "./taken-store";
beforeEach(() => resetHulpVoorTest());
describe("hulpverzoek", () => {
    test("alleen bevoegde kringpersonen ontvangen het verzoek", () => {
        expect(hulpKandidaten("emma").map((p) => p.id)).toEqual(["marja", "lisa"]);
        const id = vraagHulp({ kind: "emma", wat: "Emma ophalen", datum: "2027-03-12", tijd: "15:00", ontvangers: ["marja", "peter"] });
        expect(hulpState().find((h) => h.id === id).ontvangers).toEqual(["marja"]);
    });
    test("eerste acceptatie wint, tweede wordt geweigerd", () => {
        const id = vraagHulp({ kind: "emma", wat: "Emma ophalen", datum: "2027-03-12", tijd: "15:00", ontvangers: ["marja", "lisa"] });
        expect(accepteerHulp(id, "lisa")).toBe(true);
        expect(accepteerHulp(id, "marja")).toBe(false);
        const h = hulpState().find((x) => x.id === id);
        expect(h.geaccepteerdDoor).toBe("lisa");
        expect(takenState().taken.filter((t) => t.id === h.taakId && t.wie === "lisa")).toHaveLength(1);
    });
});
