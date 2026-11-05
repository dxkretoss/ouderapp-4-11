import { describe, expect, test } from "bun:test";
import { eerderZonderAkkoord, kiesReminder, nietAkkoordTekst, onderwerpen } from "./afstemming";
const v = (id, status, van = "Joris") => ({ id, van, soort: "eenmalig", kinderen: ["emma"], tekst: "Vrijdag later wisselen", datumLabel: "Vr 20 maart", dagen: [20], naarOuder: "joris", status });
describe("gestructureerd afstemmen", () => {
    test("A/B: één afwijzing is geen vastgelopen onderwerp en geen akkoord", () => {
        const [o] = onderwerpen([v("1", "afgewezen")]);
        expect(o?.geenOvereenstemming).toBe(false);
    });
    test("C/D: twee rondes zonder akkoord geven 'geen overeenstemming' in één onderwerp", () => {
        const l = onderwerpen([v("1", "alternatief"), v("2", "afgewezen", "Sanne")]);
        expect(l).toHaveLength(1);
        expect(l[0]?.geenOvereenstemming).toBe(true);
    });
    test("E: een open voorstel zonder reactie is nooit afgerond", () => {
        expect(onderwerpen([v("1", "afgewezen"), v("2", "afgewezen"), v("3", "open")])[0]?.geenOvereenstemming).toBe(false);
    });
    test("akkoord in de reeks betekent geen vastgelopen onderwerp", () => {
        expect(onderwerpen([v("1", "afgewezen"), v("2", "alternatief"), v("3", "geaccepteerd")])[0]?.geenOvereenstemming).toBe(false);
    });
    test("D: identiek eerder afgewezen voorstel wordt herkend", () => {
        expect(eerderZonderAkkoord([v("1", "afgewezen")], v("x", "open"))).toBe(true);
        expect(eerderZonderAkkoord([v("1", "geaccepteerd")], v("x", "open"))).toBe(false);
    });
    test("H: niet akkoord noemt alleen een bevestigde afspraak als die bestaat", () => {
        expect(nietAkkoordTekst(true)).toContain("bevestigde afspraak verandert hierdoor niet");
        expect(nietAkkoordTekst(false)).toContain("nog niet opgelost");
    });
    test("G/F: reminder nooit bij veiligheid of na sluiten", () => {
        expect(kiesReminder("vakantie", { aan: true, veiligheid: false, gesloten: [] })?.tekst).toContain("vakanties");
        expect(kiesReminder("vakantie", { aan: true, veiligheid: true, gesloten: [] })).toBeNull();
        expect(kiesReminder("vakantie", { aan: true, veiligheid: false, gesloten: ["vakantie"] })).toBeNull();
        expect(kiesReminder("voorstel", { aan: false, veiligheid: false, gesloten: [] })).toBeNull();
    });
});
