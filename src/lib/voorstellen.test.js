import { expect, test } from "bun:test";
import { overlappendeAfspraken, controleerAfspraak } from "./slimme-hulp";
import { afsprakenState, zetAfspraken, trekAfspraakIn, voerUit } from "./afspraken-store";
import { nieuwBudget, trekBudgetIn, reageer } from "./budget-store";
import { vakantieLijst, stelVerdelingVoor, trekVakantieIn, accepteerVakantie } from "./vakantie-store";
import { alleRegels } from "./audit-store";
import { dienVoorstelIn, trekIn, accepteer } from "./zorg-store";
import { afspraakReactie, vakantieReactie } from "./samen-regelen";
const a = { id: "zwem", titel: "Zwemles", datum: "2026-10-23", tijd: "15:00", eindtijd: "16:30", kind: "Emma" };
test("gedeeltelijke overlap vergelijkt begin en eind, niet een marge van 60 minuten", () => {
    expect(overlappendeAfspraken({ ...a, id: "nieuw", tijd: "16:15", eindtijd: "17:00" }, [a])).toHaveLength(1);
});
test("aansluitende afspraken overlappen niet", () => expect(overlappendeAfspraken({ ...a, tijd: "16:30", eindtijd: "17:00" }, [a])).toHaveLength(0));
test("verschillend kind of datum geeft geen overlap", () => {
    expect(overlappendeAfspraken({ ...a, kind: "Noah" }, [a])).toHaveLength(0);
    expect(overlappendeAfspraken({ ...a, datum: "2026-10-24" }, [a])).toHaveLength(0);
});
test("een gecombineerde kindkeuze sluit alleen de genoemde kinderen in", () => {
    expect(overlappendeAfspraken({ ...a, kind: "Emma & Noah" }, [a])).toHaveLength(1);
    expect(overlappendeAfspraken({ ...a, kind: "Noah & Iris" }, [a])).toHaveLength(0);
});
test("een bewerkte afspraak botst niet met zichzelf", () => expect(overlappendeAfspraken(a, [a], "zwem")).toHaveLength(0));
test("zonder eindtijd wordt geen duur verzonnen", () => expect(overlappendeAfspraken({ ...a, eindtijd: undefined, tijd: "15:30" }, [{ ...a, eindtijd: undefined }])).toHaveLength(0));
test("eigen gezin leest nooit voorbeeldafspraken voor overlap", () => expect(controleerAfspraak({ ...a, datum: "2025-03-12", tijd: "14:30" }, [], undefined, false)).toHaveLength(0));
const afspraak = (id, soort = "nieuw") => ({ id, titel: "Ophalen", tekst: "Ophalen 15:00", onderwerp: "Halen & brengen", kind: "Emma", status: soort === "nieuw" ? "Voorstel" : "Actief", versies: [], geschiedenis: [], voorstel: { soort, door: "Sanne", tekst: "Ophalen 16:00", datum: "19 oktober 2026", akkoord: { Sanne: true } } });
test("eigen afspraakvoorstel blijft ingetrokken in geschiedenis en kan niet uitgevoerd worden", () => {
    zetAfspraken((l) => [...l, afspraak("intrek-a")]);
    expect(trekAfspraakIn("intrek-a", "Joris")).toBe(false);
    expect(trekAfspraakIn("intrek-a")).toBe(true);
    const na = afsprakenState().find((x) => x.id === "intrek-a");
    expect(na?.status).toBe("Ingetrokken");
    expect(na?.voorstel).toBeUndefined();
    if (!na)
        throw new Error("Afspraak ontbreekt");
    expect(na.geschiedenis).toHaveLength(1);
    expect(voerUit(na)).toBe(na);
    expect(afspraakReactie(na)).toBe("Afgerond");
    expect(trekAfspraakIn("intrek-a")).toBe(false);
});
test("ingetrokken wijzigingsvoorstel behoudt de bestaande afspraak", () => {
    zetAfspraken((l) => [...l, afspraak("intrek-w", "wijziging")]);
    expect(trekAfspraakIn("intrek-w")).toBe(true);
    const na = afsprakenState().find((x) => x.id === "intrek-w");
    expect(na?.status).toBe("Actief");
    expect(na?.tekst).toBe("Ophalen 15:00");
});
test("onvoldoende ouderakkoord voert niets uit", () => {
    const v = afspraak("akkoord");
    expect(voerUit(v)).toBe(v);
});
test("goedkeuring van een alternatief bevestigt uitsluitend de alternatieve tekst", () => {
    const a = afspraak("alternatief");
    const na = voerUit({ ...a, voorstel: { soort: "nieuw", door: "Joris", tekst: "Ophalen 17:00", datum: "19 oktober 2026", akkoord: { Sanne: true, Joris: true } } });
    expect(na.tekst).toBe("Ophalen 17:00");
    expect(na.status).toBe("Actief");
    expect(na.voorstel).toBeUndefined();
});
test("ingetrokken budget kan niet alsnog akkoord krijgen", () => {
    nieuwBudget({ wat: "Intrektest", kind: "Emma", max: 60, pctSanne: 50 });
    const id = alleRegels().filter((e) => e.soort === "kosten" && e.actie === "CREATED").at(-1)?.itemId;
    if (!id)
        throw new Error("Budget ontbreekt");
    expect(trekBudgetIn(id, "Joris")).toBe(false);
    expect(trekBudgetIn(id)).toBe(true);
    const aantal = alleRegels().length;
    reageer(id, "Joris", "akkoord");
    expect(alleRegels().length).toBe(aantal);
    expect(trekBudgetIn(id)).toBe(false);
});
test("vakantievoorstel blijft na intrekken bewaard en kan niet geaccepteerd worden", () => {
    stelVerdelingVoor("v4", "Sanne");
    expect(trekVakantieIn("v4", "Joris")).toBe(false);
    expect(trekVakantieIn("v4")).toBe(true);
    expect(accepteerVakantie("v4")).toBe(false);
    const v = vakantieLijst().find((x) => x.id === "v4");
    expect(v?.status).toBe("ingetrokken");
    if (!v)
        throw new Error("Vakantie ontbreekt");
    expect(vakantieReactie(v)).toBe("Afgerond");
});
test("ingetrokken zorgvoorstel kan niet goedgekeurd worden", () => {
    const id = dienVoorstelIn({ soort: "eenmalig", kinderen: ["emma"], dagen: [16], tekst: "Ruil", datumLabel: "16 maart", naarOuder: "sanne" });
    expect(trekIn(id)).toBe(true);
    expect(accepteer(id, "Joris")).toBe(false);
});
