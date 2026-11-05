import { describe, expect, test, spyOn } from "bun:test";
import { datumVerstreken, statusTekst, telling, verzamelVoorstellen, wachtOpAnder, wachtOpJou, afgerond } from "./openstaande-voorstellen";
import { magHerinnering, telHerinneringen, herinneringTekst } from "./herinneringen";
const VANDAAG = "2026-10-23";
const zorgOpen = Object.freeze({ id: "z1", van: "Joris", soort: "eenmalig", kinderen: ["emma"], tekst: "Ruil zaterdag", datumLabel: "Za 25 oktober", dagen: [25], naarOuder: "sanne", status: "open" });
const budgetWacht = { id: "b9", wat: "Zwemles", kind: "Emma", max: 80, pctSanne: 50, door: "Joris", status: "wacht", aanZet: "Sanne", stappen: [{ wie: "Joris", wat: "Voorstel", bedrag: 80, moment: "2026-10-20T10:00:00Z" }] };
const bronnen = (over = {}) => ({ zorg: [], afspraken: [], budgetten: [], vakanties: [], ...over });
describe("Openstaande voorstellen — statusmapping", () => {
    test("open zorgvoorstel van de ander wacht op jouw reactie", () => {
        const [item] = verzamelVoorstellen(bronnen({ zorg: [zorgOpen] }), VANDAAG);
        expect(item.status).toBe("wacht-op-jouw-reactie");
        expect(item.aanJou).toBe(true);
    });
    test("eigen open voorstel wacht op reactie van de ander", () => {
        const [item] = verzamelVoorstellen(bronnen({ zorg: [{ ...zorgOpen, van: "Sanne" }] }), VANDAAG);
        expect(item.status).toBe("wacht-op-reactie");
        expect(item.aanJou).toBe(false);
    });
    test("verstreken reactiedatum: status verandert, voorstel blijft open (nooit automatisch akkoord)", () => {
        const [item] = verzamelVoorstellen(bronnen({ zorg: [{ ...zorgOpen, reactieDatum: "2026-10-16" }] }), VANDAAG);
        expect(item.status).toBe("reactiedatum-verstreken");
        expect(item.status).not.toBe("akkoord");
        expect(datumVerstreken("2026-10-16", VANDAAG)).toBe(true);
        expect(datumVerstreken("2026-10-30", VANDAAG)).toBe(false);
        expect(datumVerstreken(undefined, VANDAAG)).toBe(false);
    });
    test("meer tijd gevraagd is een eigen status zonder instemming", () => {
        const [item] = verzamelVoorstellen(bronnen({ zorg: [{ ...zorgOpen, meerTijd: { door: "Sanne", datum: VANDAAG } }] }), VANDAAG);
        expect(item.status).toBe("meer-tijd-gevraagd");
    });
    test("budget: tegenvoorstel bij de verzender is 'tegenvoorstel ontvangen'", () => {
        const tegen = { ...budgetWacht, status: "tegenvoorstel", aanZet: "Joris" };
        const [item] = verzamelVoorstellen(bronnen({ budgetten: [tegen] }), VANDAAG);
        expect(item.status).toBe("tegenvoorstel-ontvangen");
    });
    test("niet akkoord en ingetrokken blijven zichtbaar als feitelijke status", () => {
        const items = verzamelVoorstellen(bronnen({ budgetten: [{ ...budgetWacht, status: "geweigerd" }, { ...budgetWacht, id: "b10", status: "ingetrokken" }] }), VANDAAG);
        expect(items.map((i) => i.status)).toEqual(["niet-akkoord", "ingetrokken"]);
    });
    test("filters: wacht op jou / wacht op ander / afgerond", () => {
        const items = verzamelVoorstellen(bronnen({ zorg: [zorgOpen, { ...zorgOpen, id: "z2", van: "Sanne" }, { ...zorgOpen, id: "z3", status: "geaccepteerd" }] }), VANDAAG);
        expect(wachtOpJou(items)).toHaveLength(1);
        expect(wachtOpAnder(items)).toHaveLength(1);
        expect(afgerond(items)).toHaveLength(1);
    });
    test("telling voor professionals is feitelijk en bevat geen oordeel", () => {
        const items = verzamelVoorstellen(bronnen({ zorg: [zorgOpen, { ...zorgOpen, id: "z2", status: "geaccepteerd" }, { ...zorgOpen, id: "z3", reactieDatum: "2026-10-01" }] }), VANDAAG);
        const t = telling(items);
        expect(t).toEqual({ ingediend: 3, beantwoord: 1, zonderReactie: 1, verstreken: 1, tegenvoorstellen: 0 });
        for (const s of Object.values(statusTekst)) {
            expect(s).not.toMatch(/weigert|onwillig|tegenwerk|conflict|schuld/i);
        }
    });
});
describe("Herinneringen — begrensd en pauzeerbaar", () => {
    test("maximaal één herinnering vóór de reactiedatum", () => {
        const klok = spyOn(Date, "now").mockReturnValue(new Date("2026-10-23T12:00:00Z").getTime());
        try {
            expect(magHerinnering({ verstuurd: [], reactieDatum: "2026-10-30", gepauzeerd: false }).mag).toBe(true);
            const tweede = magHerinnering({ verstuurd: ["2026-10-20"], reactieDatum: "2026-10-30", gepauzeerd: false });
            expect(tweede.mag).toBe(false);
            expect(tweede.reden).toContain("al een herinnering");
        }
        finally {
            klok.mockRestore();
        }
    });
    test("maximaal één herinnering ná de reactiedatum", () => {
        expect(telHerinneringen(["2026-10-10", "2026-11-02"], "2026-10-16")).toEqual({ voor: 1, na: 1 });
        expect(magHerinnering({ verstuurd: ["2026-10-10", "2026-11-02"], reactieDatum: "2026-10-16", gepauzeerd: false }).mag).toBe(false);
    });
    test("zonder reactiedatum: maximaal één herinnering", () => {
        expect(magHerinnering({ verstuurd: ["2026-10-20"], gepauzeerd: false }).mag).toBe(false);
    });
    test("gepauzeerd (veiligheidsafspraken) blokkeert altijd, met uitleg", () => {
        const o = magHerinnering({ verstuurd: [], gepauzeerd: true });
        expect(o.mag).toBe(false);
        expect(o.reden).toContain("gepauzeerd");
    });
    test("herinneringstekst is vriendelijk en zonder druk", () => {
        const t = herinneringTekst("de schoolkosten");
        expect(t).toContain("wanneer je daar gelegenheid voor hebt");
        expect(t).not.toMatch(/moet|eis|direct reageren/i);
    });
});
