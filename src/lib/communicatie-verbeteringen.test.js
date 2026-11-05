import { describe, expect, test } from "bun:test";
import { herkenTaakVerzoek, mogelijkVerwijt, vindCommunicatieSuggestie } from "./communicatie-suggesties";
import { takenState, toggleTaak, voegTaakToe, zetContactStatus } from "./taken-store";
import { aanwezigVoor, startAfstemming, statusRegel } from "./aanwezigheid-store";
describe("rustige communicatie zonder nieuwe verplichtingen", () => {
    test("subtiele druk wordt herkend", () => {
        expect(mogelijkVerwijt("Als je echt om Emma gaf, zou je dit wel doen.")).toBe(true);
        expect(mogelijkVerwijt("Blijkbaar zijn de kinderen weer niet belangrijk genoeg voor je.")).toBe(true);
        expect(mogelijkVerwijt("Je doet ook nooit iets goed.")).toBe(true);
    });
    test("een grens of gewone gevoelsuiting geeft geen verwijtsignaal", () => {
        expect(mogelijkVerwijt("Ik wil niet samen naar de ouderavond.")).toBe(false);
        expect(mogelijkVerwijt("Ik vind het vervelend dat de afspraak niet is nagekomen.")).toBe(false);
    });
    test("lang bericht behoudt uitsluitend de letterlijke praktische vraag", () => {
        expect(herkenTaakVerzoek("Je bent nooit bereikbaar en trouwens, wil je vrijdag de gymtas meegeven?")).toEqual({ tekst: "vrijdag de gymtas meegeven", dag: "vrijdag", datum: undefined });
    });
    test("bedreiging biedt geen gewone taak", () => expect(herkenTaakVerzoek("Ik maak je kapot. Wil je de gymtas meegeven?")).toBeNull());
    test("een ontvangen verzoek maakt zelf geen taak en geeft geen akkoord", () => {
        const aantal = takenState().taken.length;
        const s = vindCommunicatieSuggestie("", [{ id: "vraag", van: "joris", tekst: "Wil je vrijdag de gymtas meegeven?" }], [], { aan: true, verborgen: [], veiligheid: false, verwerkt: false });
        expect(s?.soort).toBe("taak");
        expect(s?.taak?.datum).toBeUndefined();
        expect(takenState().taken.length).toBe(aantal);
    });
    test("hetzelfde bronbericht levert slechts één taak op", () => {
        const t = { tekst: "Gymtas meegeven", kind: "emma", wie: "", herhaling: "eenmalig", berichtId: "dedup-bericht", gesprekId: "dedup-gesprek" };
        const id = voegTaakToe(t);
        expect(voegTaakToe(t)).toBe(id);
        expect(takenState().taken.filter((x) => x.berichtId === t.berichtId)).toHaveLength(1);
    });
    test("gevraagde taak kan niet vóór acceptatie worden afgerond", () => {
        const id = voegTaakToe({ tekst: "Schoolformulier invullen", kind: "emma", wie: "", overdragenAan: "joris", herhaling: "eenmalig" });
        toggleTaak(id);
        zetContactStatus(id, "afgerond");
        expect(takenState().taken.find((t) => t.id === id)?.wie).toBe("");
        expect(takenState().taken.find((t) => t.id === id)?.klaar).toBe(false);
    });
    test("afronden in Taken komt in agenda terug zonder schoolakkoord", () => {
        const a = startAfstemming("verbeteringen-contact", "afzonderlijk", "sanne", { kind: "emma", afspraakTitel: "Ouderavond", contactWie: "sanne" });
        if (!a.contactTaakId)
            throw new Error("Contacttaak ontbreekt");
        toggleTaak(a.contactTaakId);
        const taak = takenState().taken.find((t) => t.id === a.contactTaakId);
        expect(taak?.contactStatus).toBe("afgerond");
        expect(aanwezigVoor(a.afspraakId)?.uitkomst).toBeUndefined();
        expect(statusRegel(a, taak?.contactStatus)).toBe("Contacttaak afgerond — uitkomst nog vastleggen");
        zetContactStatus(a.contactTaakId, "wacht-op-reactie");
        expect(takenState().taken.find((t) => t.id === a.contactTaakId)?.klaar).toBe(false);
    });
});
