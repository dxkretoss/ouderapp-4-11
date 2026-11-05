import { describe, expect, test } from "bun:test";
import { agendaVanBericht, herkenPraktisch, vindCommunicatieSuggestie } from "./communicatie-suggesties";
const opties = { aan: true, verborgen: [], veiligheid: false, verwerkt: false };
const vind = (t, berichten = [], extra = {}) => vindCommunicatieSuggestie(t, berichten, ["Emma", "Noah"], { ...opties, ...extra });
const eerste = { id: "a", van: "sanne", tekst: "Ik stel voor om zondag om 16.00 uur te wisselen." };
const tweede = { id: "b", van: "joris", tekst: "Voor mij zou zondag om 18.00 uur beter uitkomen." };
const paar = [eerste, tweede];
describe("1 — lokale verduidelijking", () => {
    test("A: later ophalen vraagt tijd", () => expect(vind("Ik haal de kinderen vrijdag later op.")?.aanvulling).toBe(" Tijdstip: [zelf invullen]"));
    test("B: tijd en school zijn duidelijk", () => expect(vind("Ik haal ze vrijdag om 16.00 uur bij school op.")).toBeNull());
    test("C: ik regel het vraagt geen geld of datum", () => expect(vind("Ik regel het.")).toBeNull());
    test("D: concrete tijd verwijdert de suggestie", () => expect(vind("Ik haal de kinderen vrijdag later op, om 16:00 uur.")).toBeNull());
    test("bekende bevestigde tijd voorkomt vraag", () => expect(vind("Ik haal vrijdag later op.", [], { bekendeTijd: true })).toBeNull());
    test("alleen vrijdag of ontbreken plek is geen reden", () => expect(vind("Ik kom ze zaterdag ophalen.")).toBeNull());
    test("onduidelijke afspraak uit opdracht vraagt tijd", () => expect(vind("Ik haal haar vrijdag wel op.")?.aanvulling).toBe(" Tijdstip: [zelf invullen]"));
    test("expliciet daar vraagt locatie", () => expect(vind("Ik kom ze daar ophalen.")?.aanvulling).toBe(" Ophaalplek: [zelf invullen]"));
    test("bekende plek voorkomt vraag", () => expect(vind("Ik kom ze daar ophalen.", [], { bekendeLocatie: true })).toBeNull());
    test("betaling volgende week vraagt datum, niet bedrag", () => expect(vind("Ik betaal mijn deel volgende week.")?.aanvulling).toBe(" Betaaldatum: [zelf invullen]"));
    test("sluiten herhaalt niet voor zelfde concept", () => { const t = "Ik haal vrijdag later op."; const s = vind(t); expect(s).not.toBeNull(); expect(vind(t, [], { weggeklikt: s?.sleutel })).toBeNull(); });
});
describe("2 — bestaande afspraakflow", () => {
    test("E: concrete wissel zonder fictief akkoord", () => { const s = vind("", [{ id: "a", van: "sanne", tekst: "Prima, dan wisselen we zondag om 17.00 uur." }]); expect(s?.gegevens?.tijd).toBe("17:00"); expect(s?.gegevens?.datum).toBeUndefined(); });
    test("F: expliciete persoonlijke afspraak blijft privé", () => { const s = agendaVanBericht("Mijn eigen afspraak bij de tandarts is maandag om 10:00 uur."); expect(s.persoonlijk).toBe(true); expect(s.voorstel).toBe(false); expect(s.kind).toBeUndefined(); });
    test("G: wissel gebruikt wijziging", () => expect(herkenPraktisch("Zullen we zondag om 17:00 uur wisselen?")?.zorg).toBe(true));
    test("H: voorstel blijft voorstel", () => expect(agendaVanBericht("Kan ik Emma vrijdag om 16:00 ophalen?", ["Emma"]).voorstel).toBe(true));
    test("prima alleen is onvoldoende", () => expect(vind("", [{ id: "a", van: "joris", tekst: "Prima." }])).toBeNull());
    test("directe prima-reactie opent alleen controlemogelijkheid", () => expect(vind("", [{ id: "a", van: "sanne", tekst: "Zullen we zondag om 17:00 uur wisselen?" }, { id: "b", van: "joris", tekst: "Prima." }])?.soort).toBe("agenda"));
    test("geen datum, kind of locatie verzinnen", () => { const s = agendaVanBericht("Zullen we zondag om 17:00 uur wisselen?"); expect([s.datum, s.kind, s.locatie]).toEqual([undefined, undefined, undefined]); });
});
describe("3 — concrete verschillen", () => {
    test("I: twee voorstellen met bronnen, geen overeenstemming", () => { const s = vind("", paar); expect(s?.soort).toBe("verschil"); expect(s?.tijden).toEqual(["16:00", "18:00"]); expect(s?.bronnen).toEqual(["a", "b"]); });
    test("J: verschillende activiteiten niet vergelijken", () => { const s = vind("", [{ ...eerste, tekst: "Ik stel voor zondag om 16:00 bij school op te halen." }, { ...tweede, tekst: "Ik stel voor zondag om 18:00 bij voetbal op te halen." }]); expect(s?.soort).not.toBe("verschil"); });
    test("K: ingetrokken of afgerond niet tonen", () => { for (const tekst of ["Laat maar, ingetrokken.", "Afgerond, vastgelegd in Agenda."])
        expect(vind("", [eerste, { ...tweede, tekst }])).toBeNull(); });
    test("verschillende kinderen niet vergelijken", () => expect(vind("", paar.map((b, i) => ({ ...b, tekst: b.tekst + (i ? " Voor Noah." : " Voor Emma.") })))?.soort).not.toBe("verschil"));
});
describe("samenhang en veiligheid", () => {
    test("L: veiligheid krijgt voorrang", () => expect(vind("Ik haal vrijdag later op.", [], { veiligheid: true })).toBeNull());
    test("dreiging in recente berichten onderdrukt gewone hints", () => expect(vind("Ik haal vrijdag later op.", [{ id: "a", van: "joris", tekst: "Ik maak je kapot." }])).toBeNull());
    test("M: schakelaar stopt alle soorten", () => { expect(vind("Ik haal vrijdag later op.", [], { aan: false })).toBeNull(); expect(vind("", paar, { aan: false })).toBeNull(); });
    test("per soort niet meer tonen", () => expect(vind("", paar, { verborgen: ["verschil"] })).toBeNull());
    test("lopende verwerking stopt nieuwe suggestie", () => expect(vind("Ik haal vrijdag later op.", [], { verwerkt: true })).toBeNull());
});
