import { expect, test } from "bun:test";
import { maandagVan, plusDagen, voorkomens } from "./agenda-datum";
test("agenda opent op maandag van de huidige week", () => expect(maandagVan("2026-10-21")).toBe("2026-10-19"));
test("kalenderdag over zomertijd behoudt datum", () => expect(plusDagen("2026-10-25", 1)).toBe("2026-10-26"));
test("geselecteerde dag toont uitsluitend die afspraak", () => {
    const a = { id: "a", titel: "Sport", datum: "2026-10-19", tijd: "15:00", categorie: "sport", kind: "Emma" };
    expect(voorkomens(a, "2026-10-20", "2026-10-20")).toEqual([]);
    expect(voorkomens(a, "2026-10-19", "2026-10-19")).toEqual(["2026-10-19"]);
});
test("Home en Agenda gebruiken dezelfde herhalingsdatum", () => {
    const a = { id: "a", titel: "Sport", datum: "2026-10-12", tijd: "15:00", categorie: "sport", kind: "Emma", herhaling: { freq: "wekelijks", interval: 1, eenheid: "weken" }, overslaan: ["2026-10-19"] };
    expect(voorkomens(a, "2026-10-19", "2026-10-26")).toEqual(["2026-10-26"]);
});
const reeks = (datum, herhaling, tot) => voorkomens({ id: "r", titel: "t", datum, tijd: "", categorie: "overig", kind: "", herhaling }, datum, tot);
test("wekelijks herhaalt elke 7 dagen", () => expect(reeks("2026-10-05", { freq: "wekelijks", interval: 1, eenheid: "weken" }, "2026-10-26")).toEqual(["2026-10-05", "2026-10-12", "2026-10-19", "2026-10-26"]));
test("om de week herhaalt elke 14 dagen", () => expect(reeks("2026-10-05", { freq: "tweewekelijks", interval: 1, eenheid: "weken" }, "2026-11-02")).toEqual(["2026-10-05", "2026-10-19", "2026-11-02"]));
test("maandelijks op de 31e slaat geen maand over", () => expect(reeks("2026-01-31", { freq: "maandelijks", interval: 1, eenheid: "weken" }, "2026-04-30")).toEqual(["2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30"]));
test("aangepast elke 3 weken", () => expect(reeks("2026-10-01", { freq: "aangepast", interval: 3, eenheid: "weken" }, "2026-11-12")).toEqual(["2026-10-01", "2026-10-22", "2026-11-12"]));
test("aangepast elke 2 maanden", () => expect(reeks("2026-08-31", { freq: "aangepast", interval: 2, eenheid: "maanden" }, "2027-01-01")).toEqual(["2026-08-31", "2026-10-31", "2026-12-31"]));
test("herhaling stopt na einddatum", () => expect(reeks("2026-10-05", { freq: "wekelijks", interval: 1, eenheid: "weken", eind: "2026-10-15" }, "2026-12-31")).toEqual(["2026-10-05", "2026-10-12"]));
