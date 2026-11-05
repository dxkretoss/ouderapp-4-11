import { describe, expect, test } from "bun:test";
import { kortePopup } from "./feedback";
describe("korte pop-upteksten", () => {
    test("voorstel is nooit 'Geregeld!'", () => {
        expect(kortePopup("Wijziging voorgesteld. De huidige afspraak blijft gelden tot de andere ouder akkoord geeft.")).toBe("Voorstel verstuurd. Wacht op antwoord.");
        expect(kortePopup("Vraag verstuurd. De verdeling verandert pas als de ander ja zegt.")).toBe("Voorstel verstuurd. Wacht op antwoord.");
    });
    test("definitief akkoord wordt 'Geregeld!'", () => {
        expect(kortePopup("Je hebt ja gezegd. De verdeling is aangepast.")).toBe("Geregeld! De afspraak is bevestigd.");
    });
    test("afwijzing", () => {
        expect(kortePopup("Voorstel afgewezen. Er verandert niets.")).toBe("Niet akkoord. De afspraak is niet gewijzigd.");
    });
    test("afspraak toegevoegd", () => {
        expect(kortePopup("Afspraak toegevoegd op dit apparaat.")).toBe("Afspraak toegevoegd.");
    });
    test("tussenstap geeft geen succesmelding", () => {
        expect(kortePopup("Kies hieronder bij wie je de vakantie voorstelt.")).toBeNull();
    });
});
