import { expect, test } from "bun:test";
import { ordenAandacht } from "./pro-aandacht";
test("drie eerste punten bevatten verlopen en belangrijke acties vóór minder urgente informatie", () => {
    const items = [{ id: "informatie", rang: 4 }, { id: "morgen", rang: 3 }, { id: "hoog", rang: 0, datum: "2026-10-10" }, { id: "verlopen", rang: 0, datum: "2026-10-01" }, { id: "vandaag", rang: 1 }];
    expect(ordenAandacht(items).slice(0, 3).map((x) => x.id)).toEqual(["verlopen", "hoog", "vandaag"]);
});
test("twintig dossiers blijven volledig bereikbaar zonder bronobjecten te wijzigen", () => {
    const items = Object.freeze(Array.from({ length: 20 }, (_, n) => Object.freeze({ id: `gezin-${n}`, rang: n === 19 ? 0 : 4 })));
    const sorted = ordenAandacht(items);
    expect(sorted).toHaveLength(20);
    expect(sorted[0]).toBe(items[19]);
    expect(new Set(sorted.map((x) => x.id)).size).toBe(20);
    expect(items[0]?.id).toBe("gezin-0");
    expect(sorted.slice(0, 3)).toHaveLength(3);
});
