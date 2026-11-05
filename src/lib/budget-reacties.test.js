import { expect, test } from "bun:test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { nieuwBudget, reageer, trekBudgetIn, useBudgetten, vraagMeerTijdBudget, wijzigBudgetVoorstel } from "./budget-store";
import { bevestigdBudget } from "./budget-weergave";
function lees(id) {
    let b;
    function Lees() { b = useBudgetten().find((v) => v.id === id); return null; }
    renderToString(createElement(Lees));
    if (!b)
        throw new Error("budget ontbreekt");
    return b;
}
test("meer tijd bewaart gekozen moment zonder akkoord, bedragwijziging of kosten", () => {
    const id = nieuwBudget({ wat: "Uitstelbudget", kind: "Emma", max: 60, pctSanne: 50 });
    const tot = new Date(Date.now() + 3 * 86400000).toISOString();
    expect(vraagMeerTijdBudget(id, "Joris", tot)).toBe(true);
    expect(lees(id).stappen.at(-1)?.terugkijkMoment).toBe(tot);
    expect(lees(id).status).toBe("wacht");
    expect(lees(id).aanZet).toBe("Joris");
    expect(lees(id).max).toBe(60);
    expect(lees(id).kostId).toBeUndefined();
    expect(Boolean(bevestigdBudget(lees(id)))).toBe(false);
    reageer(id, "Joris", "akkoord");
    expect(lees(id).status).toBe("akkoord");
});
test("uitstel laat andere voorstellen intact", () => {
    const voor = lees("b1");
    const id = nieuwBudget({ wat: "Ander uitstel", kind: "Noah", max: 40, pctSanne: 50 });
    vraagMeerTijdBudget(id, "Joris", new Date(Date.now() + 86400000).toISOString());
    expect(lees("b1")).toBe(voor);
});
test("uitstel in het verleden of door verkeerde ouder verandert niets", () => {
    const id = nieuwBudget({ wat: "Momentcontrole", kind: "Emma", max: 30, pctSanne: 50 });
    const voor = lees(id);
    expect(vraagMeerTijdBudget(id, "Joris", "2020-01-01T20:00:00Z")).toBe(false);
    expect(vraagMeerTijdBudget(id, "Sanne", new Date(Date.now() + 86400000).toISOString())).toBe(false);
    expect(lees(id)).toBe(voor);
});
test("vier budgetreacties houden één bron en akkoord vereist de andere ouder", () => {
    const id = nieuwBudget({ wat: "Testbudget", kind: "Emma", max: 20, pctSanne: 50 });
    reageer(id, "Sanne", "akkoord");
    expect(lees(id).status).toBe("wacht");
    expect(vraagMeerTijdBudget(id, "Joris")).toBe(true);
    expect(lees(id).status).toBe("wacht");
    reageer(id, "Joris", { tegen: 18 });
    expect(lees(id).aanZet).toBe("Sanne");
    expect(lees(id).max).toBe(20);
    reageer(id, "Sanne", "akkoord");
    expect(lees(id).max).toBe(18);
    expect(lees(id).status).toBe("akkoord");
    expect(wijzigBudgetVoorstel(id, "Sanne", 25, 60)).toBe(true);
    expect(lees(id).max).toBe(18);
    expect(lees(id).pctSanne).toBe(50);
    reageer(id, "Joris", "geweigerd");
    expect(lees(id).max).toBe(18);
    expect(lees(id).status).toBe("akkoord");
    expect(lees(id).stappen.at(-1)?.wat).toBe("Niet akkoord");
    expect(wijzigBudgetVoorstel(id, "Sanne", 25, 60)).toBe(true);
    expect(trekBudgetIn(id, "Sanne")).toBe(true);
    expect(lees(id).status).toBe("akkoord");
    expect(lees(id).max).toBe(18);
});
