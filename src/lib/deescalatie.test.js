import { describe, expect, test } from "bun:test";
import { analyseVoor, moetWaarschuwen, toonAfwijking } from "./deescalatie";
describe("proactieve de-escalatie", () => {
    test("rustig bericht geeft geen melding", () => expect(moetWaarschuwen({ niveau: "geen" }, "Ok", null)).toBe(false));
    test("verwijt geeft melding", () => expect(moetWaarschuwen({ niveau: "licht" }, "Jij bent altijd te laat", null)).toBe(true));
    test("zelfde ongewijzigde concept niet nog eens", () => expect(moetWaarschuwen({ niveau: "licht" }, "Jij bent altijd te laat", "Jij bent altijd te laat")).toBe(false));
    test("dreiging blijft altijd zichtbaar", () => expect(moetWaarschuwen({ niveau: "dreigend" }, "x", "x")).toBe(true));
    test("zonder bevestigde afspraak geen afwijkingsmelding", () => expect(toonAfwijking(true, false)).toBe(false));
    test("met bevestigde afspraak wel", () => expect(toonAfwijking(true, true)).toBe(true));
    test("ongewijzigd concept hergebruikt analyse", () => expect(analyseVoor({ sleutel: "bericht-context", resultaat: "rustig" }, "bericht-context")).toBe("rustig"));
    test("gewijzigd concept hergebruikt geen analyse", () => expect(analyseVoor({ sleutel: "bericht-context", resultaat: "rustig" }, "ander-context")).toBeNull());
});
