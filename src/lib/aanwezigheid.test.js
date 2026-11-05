import { beforeEach, describe, expect, test } from "bun:test";
import { aanwezigVoor, deelNabespreking, markeerContactOpgenomen, reageer, reactiesVoor, resetAanwezigheid, startAfstemming, statusRegel, zetUitkomst } from "./aanwezigheid-store";
import { takenState, zetContactStatus } from "./taken-store";
const opties = { kind: "emma", afspraakTitel: "Ouderavond Emma" };
beforeEach(() => resetAanwezigheid());
describe("aanwezigheid afstemmen", () => {
    test("samen gaan: akkoord stemt af, liever niet samen houdt het open zonder schuldtaal", () => {
        startAfstemming("a1", "samen", "sanne", opties);
        expect(aanwezigVoor("a1").fase).toBe("voorstel");
        expect(reactiesVoor(aanwezigVoor("a1")).map((r) => r.label)).toEqual(["Akkoord", "Ander voorstel", "Liever niet samen"]);
        expect(reageer("a1", "akkoord", "joris")).toBe(true);
        expect(aanwezigVoor("a1").fase).toBe("afgestemd");
        expect(statusRegel(aanwezigVoor("a1"))).toBe("Samen gaan — afgestemd");
        startAfstemming("a2", "samen", "sanne", opties);
        reageer("a2", "liever-niet-samen", "joris");
        const a = aanwezigVoor("a2");
        expect(a.fase).toBe("open");
        expect(a.geschiedenis[0].tekst).toContain("Samen gaan is niet afgesproken");
        expect(a.geschiedenis[0].tekst).not.toMatch(/weiger|niet mee/);
    });
    test("de indiener kan niet op het eigen voorstel reageren", () => {
        startAfstemming("a1", "samen", "sanne", opties);
        expect(reageer("a1", "akkoord", "sanne")).toBe(false);
        expect(aanwezigVoor("a1").fase).toBe("voorstel");
    });
    test("een tegenvoorstel vervangt het actuele voorstel, geschiedenis blijft", () => {
        startAfstemming("a1", "samen", "sanne", opties);
        startAfstemming("a1", "een", "joris", { ...opties, wieGaat: "joris" });
        const a = aanwezigVoor("a1");
        expect(a.keuze).toBe("een");
        expect(a.door).toBe("joris");
        expect(a.geschiedenis.length).toBe(2);
        expect(a.geschiedenis[0].tekst).toContain("vervangt het vorige voorstel");
    });
    test("een van ons gaat: dat lukt stemt af, dat lukt niet houdt het open", () => {
        startAfstemming("a1", "een", "sanne", { ...opties, wieGaat: "joris" });
        expect(reageer("a1", "dat-lukt-niet", "joris")).toBe(true);
        expect(aanwezigVoor("a1").fase).toBe("open");
        startAfstemming("a1", "een", "sanne", { ...opties, wieGaat: "sanne" });
        reageer("a1", "dat-lukt", "joris");
        expect(statusRegel(aanwezigVoor("a1"))).toBe("Eén ouder gaat (jij) — afgestemd");
    });
    test("afzonderlijk: 'ik neem contact op' maakt direct een eigen taak", () => {
        const voor = takenState().taken.length;
        const a = startAfstemming("a1", "afzonderlijk", "sanne", { ...opties, contactWie: "sanne" });
        expect(a.fase).toBe("afgestemd"); // eigen toezegging: geen akkoord van de andere ouder nodig
        expect(takenState().taken.length).toBe(voor + 1);
        const taak = takenState().taken.find((t) => t.id === a.contactTaakId);
        expect(taak.wie).toBe("sanne");
        expect(taak.contactStatus).toBe("nog-te-regelen");
        expect(taak.afspraakId).toBe("a1");
        expect(statusRegel(aanwezigVoor("a1"), taak.contactStatus)).toBe("Jij neemt contact op met school");
    });
    test("afzonderlijk: de andere ouder krijgt de taak pas na bevestiging (overdracht)", () => {
        const a = startAfstemming("a1", "afzonderlijk", "sanne", { ...opties, contactWie: "joris" });
        const taak = takenState().taken.find((t) => t.id === a.contactTaakId);
        expect(taak.wie).toBe("");
        expect(taak.overdragenAan).toBe("joris");
    });
    test("afzonderlijk: geen dubbele contacttaak bij herhaalde keuze", () => {
        startAfstemming("a1", "afzonderlijk", "sanne", { ...opties, contactWie: "sanne" });
        const voor = takenState().taken.length;
        startAfstemming("a1", "afzonderlijk", "sanne", { ...opties, contactWie: "sanne" });
        expect(takenState().taken.length).toBe(voor);
    });
    test("uitkomst werkt de taakstatus bij: wacht op school / mogelijk / niet mogelijk", () => {
        const a = startAfstemming("a1", "afzonderlijk", "sanne", { ...opties, contactWie: "sanne" });
        markeerContactOpgenomen("a1");
        expect(takenState().taken.find((t) => t.id === a.contactTaakId).contactStatus).toBe("contact-opgenomen");
        zetUitkomst("a1", "wacht-op-school");
        expect(takenState().taken.find((t) => t.id === a.contactTaakId).contactStatus).toBe("wacht-op-reactie");
        expect(statusRegel(aanwezigVoor("a1"), "wacht-op-reactie")).toBe("Afzonderlijke gesprekken aangevraagd — wacht op school");
        zetUitkomst("a1", "mogelijk");
        expect(aanwezigVoor("a1").fase).toBe("afgestemd");
        expect(takenState().taken.find((t) => t.id === a.contactTaakId).klaar).toBe(true);
        zetUitkomst("a1", "niet-mogelijk");
        expect(takenState().taken.find((t) => t.id === a.contactTaakId).contactStatus).toBe("niet-mogelijk");
    });
    test("taakstatus uit het takenoverzicht komt terug in de statusregel", () => {
        const a = startAfstemming("a1", "afzonderlijk", "sanne", { ...opties, contactWie: "sanne" });
        zetContactStatus(a.contactTaakId, "wacht-op-reactie");
        const taak = takenState().taken.find((t) => t.id === a.contactTaakId);
        expect(statusRegel(aanwezigVoor("a1"), taak.contactStatus)).toBe("Afzonderlijke gesprekken aangevraagd — wacht op school");
    });
    test("later afstemmen: geen voorstel, afspraak blijft open", () => {
        startAfstemming("a1", "later", "sanne", opties);
        const a = aanwezigVoor("a1");
        expect(a.fase).toBe("open");
        expect(statusRegel(a)).toBe("Aanwezigheid nog afstemmen");
    });
    test("nabespreking delen: zichtbaar wie het toevoegde, geen automatische bevestiging", () => {
        deelNabespreking("a1", "Emma doet het goed op school.", "Nieuwe boeken meenemen.", "sanne");
        const a = aanwezigVoor("a1");
        expect(a.nabespreking.door).toBe("sanne");
        expect(a.nabespreking.besproken).toContain("Emma");
        deelNabespreking("a1", "", "", "sanne");
        expect(aanwezigVoor("a1").nabespreking.besproken).toContain("Emma");
    });
    test("andere ouder kan zelf contact toezeggen zonder overdracht", () => {
        const a = startAfstemming("zelf-joris", "afzonderlijk", "joris", { ...opties, contactWie: "joris" });
        const taak = takenState().taken.find((t) => t.id === a.contactTaakId);
        expect(taak?.wie).toBe("joris");
        expect(taak?.overdragenAan).toBeUndefined();
    });
});
