import { expect, test } from "bun:test";
import { bevestigdBudget, gekoppeldBudget } from "./budget-weergave";
import { nieuwBudget, reageer, useBudgetten } from "./budget-store";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
const leesBudgetten = () => {
    let resultaat = [];
    function Bron() { resultaat = useBudgetten(); return null; }
    renderToStaticMarkup(createElement(Bron));
    return resultaat;
};
test("tegenvoorstel wordt pas bevestigd na reactie van vereiste ouder", () => {
    const id = nieuwBudget({ wat: "Laarzen", kind: "Noah", max: 40, pctSanne: 50 });
    reageer(id, "Joris", { tegen: 60 });
    expect(gekoppeldBudget(id, leesBudgetten())).toBeUndefined();
    reageer(id, "Sanne", "akkoord");
    expect(gekoppeldBudget(id, leesBudgetten())?.max).toBe(60);
});
test("afwijzing bewaart originele bedrag en historie en wordt geen akkoord of uitgave", () => {
    const id = nieuwBudget({ wat: "Helm", kind: "Emma", max: 35, pctSanne: 50 });
    reageer(id, "Joris", "geweigerd");
    const bron = leesBudgetten().find((b) => b.id === id);
    expect(bron?.status).toBe("geweigerd");
    expect(bron?.max).toBe(35);
    expect(bron?.kostId).toBeUndefined();
    expect(bron?.stappen.map((s) => s.wat)).toEqual(["Voorstel", "Niet akkoord"]);
    expect(gekoppeldBudget(id, leesBudgetten())).toBeUndefined();
});
const budget = { id: "b-test", wat: "Laarzen", kind: "Noah", max: 40, pctSanne: 50, door: "Sanne", status: "akkoord", aanZet: "Joris", stappen: [{ wie: "Joris", wat: "Akkoord", moment: "2026-10-20" }] };
test("alleen expliciet gekoppeld bevestigd budget verschijnt bij een taak", () => {
    expect(gekoppeldBudget(budget.id, [budget])?.max).toBe(40);
    expect(gekoppeldBudget(undefined, [budget])).toBeUndefined();
});
test("onbevestigd voorstel verschijnt niet als afgesproken bedrag", () => {
    expect(bevestigdBudget({ ...budget, status: "wacht", stappen: [] })).toBeUndefined();
});
test("een voorgestelde wijziging vervangt het bevestigde bedrag niet", () => {
    expect(bevestigdBudget({ ...budget, status: "tegenvoorstel", stappen: [...budget.stappen, { wie: "Sanne", wat: "Tegenvoorstel", bedrag: 60, moment: "2026-10-21" }] })?.max).toBe(40);
});
test("na bevestigde wijziging wordt het actuele bedrag gelezen", () => {
    expect(gekoppeldBudget(budget.id, [{ ...budget, max: 60 }])?.max).toBe(60);
});
