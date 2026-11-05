import { expect, test } from "bun:test";
import { zichtbareKostenActies } from "./kosten-overzicht";
test("het kostenoverzicht toont maximaal drie openstaande acties", () => {
    expect(zichtbareKostenActies(["uitgave", "budget", "afrekening", "vierde"])).toEqual(["uitgave", "budget", "afrekening"]);
});
test("alle openstaande acties blijven bereikbaar zonder de bron te wijzigen", () => {
    const bron = [1, 2, 3, 4];
    expect(zichtbareKostenActies(bron, true)).toBe(bron);
    expect(bron).toEqual([1, 2, 3, 4]);
});
