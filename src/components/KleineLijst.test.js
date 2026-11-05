import { expect, test } from "bun:test";
import { nieuwLijstItem, toggleLijstItem } from "./KleineLijst";
import { useBudgetten } from "@/lib/budget-store";
import { useKosten } from "@/lib/kosten-store";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
test("afvinken bewaart de koppeling en verandert geen budgetten of uitgaven", () => {
    let voor = "";
    function FinancieleBron() { voor = JSON.stringify({ budgetten: useBudgetten(), kosten: useKosten() }); return null; }
    renderToStaticMarkup(createElement(FinancieleBron));
    const snapshot = voor;
    const item = { ...nieuwLijstItem("Laarzen", "Nodig", "Noah"), budgetId: "b1" };
    const resultaat = toggleLijstItem([item], item.id);
    expect(resultaat).toHaveLength(1);
    expect(resultaat[0]).toEqual({ ...item, klaar: true });
    renderToStaticMarkup(createElement(FinancieleBron));
    expect(voor).toBe(snapshot);
});
test("al gekocht is niet meer een openstaande aankoop maar blijft in geschiedenis", () => {
    const tas = nieuwLijstItem("Schooltas", "Nodig", "Emma", true);
    expect([tas].filter((i) => !i.klaar)).toHaveLength(0);
    expect([tas].filter((i) => i.klaar).map((i) => i.tekst)).toEqual(["Schooltas"]);
});
test("nog nodig blijft een openstaande aankoop", () => {
    expect(nieuwLijstItem("Schooltas", "Nodig", "Emma").klaar).toBe(false);
});
