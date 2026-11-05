import { expect, test } from "bun:test";
import { standaardKindKleur, kindKleuren, patronen, plekOp, tweeWekenVanaf, vandaagVolgens, standaardPct, leeftijdTekst, basisStappen } from "./start-store";
const r = { patroon: "om-de-week", dagen: patronen[0].dagen, wisseltijd: "14:30", startMaandag: "2026-10-05" };
test("om de week: do 8 okt 2026 bij jou, volgende wissel ma 12 okt", () => {
    const v = vandaagVolgens(r, new Date(2026, 9, 8));
    expect(v.plek).toBe("ik");
    expect(v.volgende.getDate()).toBe(12);
});
test("twee weken vanaf deze week volgt dezelfde regeling als de agenda", () => {
    const w = tweeWekenVanaf(r, new Date(2026, 9, 22));
    expect(w[0]).toBe(plekOp(r, new Date(2026, 9, 19)));
    expect(w[0]).toBe("ik");
    expect(w[7]).toBe("ander");
});
test("weekenden afwisselen en één weekend per twee weken verschillen", () => {
    expect(patronen.find((p) => p.id === "weekenden").dagen).not.toEqual(patronen.find((p) => p.id === "een-weekend").dagen);
});
test("alleen bijhouden verdeelt niets", () => expect(standaardPct({ wijze: "alleen", pctIk: 60, moment: "maand" })).toBeNull());
test("50/50 geeft 50", () => expect(standaardPct({ wijze: "50", pctIk: 60, moment: "maand" })).toBe(50));
test("eigen percentage wordt gebruikt", () => expect(standaardPct({ wijze: "eigen", pctIk: 60, moment: "week" })).toBe(60));
test("leeftijd onder 1 jaar in maanden (Bodine, 11-05-2026)", () => {
    expect(leeftijdTekst("2026-05-11", new Date(2026, 9, 8))).toBe("4 maanden");
});
test("leeftijd vanaf 1 jaar in jaren", () => {
    expect(leeftijdTekst("2018-05-11", new Date(2026, 9, 8))).toBe("8 jaar");
});
test("verjaardag nog niet geweest dit jaar telt mee", () => {
    expect(leeftijdTekst("2018-11-20", new Date(2026, 9, 8))).toBe("7 jaar");
});
test("zonder of met ongeldige geboortedatum geen leeftijd", () => {
    expect(leeftijdTekst(undefined, new Date(2026, 9, 8))).toBeNull();
    expect(leeftijdTekst("geen-datum", new Date(2026, 9, 8))).toBeNull();
    expect(leeftijdTekst("2027-01-01", new Date(2026, 9, 8))).toBeNull();
});
const basis = { naam: "Ik", kinderen: [{ id: "k-1", naam: "Bodine" }], regeling: "later" };
test("start is klaar zonder uitnodiging zodra gezag is ingevuld", () => {
    expect(basisStappen({ ...basis, gezag: { situatie: "onbekend", ingevuldDoor: "Ik", bevestigdDoorAnder: false } }).every((x) => x.klaar)).toBe(true);
});
test("zonder gezag is de start nog niet klaar", () => {
    expect(basisStappen({ ...basis, gezag: null }).every((x) => x.klaar)).toBe(false);
});
test("ieder kind krijgt een andere zachte kleur uit het palet", () => {
    expect(standaardKindKleur(0)).toBe(kindKleuren[0].hex);
    expect(standaardKindKleur(1)).toBe(kindKleuren[1].hex);
    expect(standaardKindKleur(0)).not.toBe(standaardKindKleur(1));
    expect(standaardKindKleur(kindKleuren.length)).toBe(kindKleuren[0].hex);
});
