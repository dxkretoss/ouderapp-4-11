import { describe, expect, it } from "bun:test";
import { conceptBruikbaar, overnameKeuze, voorbeeldContext } from "./meedenken";
const berichten = Array.from({ length: 9 }, (_, i) => ({ id: `b${i}`, van: "joris", tijd: "09:00", tekst: `Voorbeeld ${i}` }));
describe("Even meedenken grenzen", () => {
    it("neemt zonder toestemming geen berichten mee", () => expect(voorbeeldContext(berichten, false, false)).toEqual([]));
    it("neemt voor een eigen gezin nooit berichten mee, ook met toestemming", () => expect(voorbeeldContext(berichten, true, true)).toEqual([]));
    it("gebruikt hooguit zes recente fictieve berichten", () => {
        expect(voorbeeldContext(berichten, true, false).map((b) => b.tekst)).toEqual(["Voorbeeld 3", "Voorbeeld 4", "Voorbeeld 5", "Voorbeeld 6", "Voorbeeld 7", "Voorbeeld 8"]);
    });
    it("vervangt een bestaand concept niet zonder bevestiging", () => expect(overnameKeuze("Mijn eigen tekst", "Ik wil afzonderlijk deelnemen.")).toBeNull());
    it("neemt alleen op expliciete keuze de geselecteerde tekst over", () => expect(overnameKeuze("Mijn eigen tekst", "Ik wil afzonderlijk deelnemen.", true)).toBe("Ik wil afzonderlijk deelnemen."));
    it("biedt geen belediging of bedreiging als concept aan", () => {
        expect(conceptBruikbaar("Je bent een eikel")).toBe(false);
        expect(conceptBruikbaar("Ik maak je kapot")).toBe(false);
        expect(conceptBruikbaar("Ik wil liever afzonderlijk deelnemen.")).toBe(true);
    });
});
