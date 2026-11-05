import { expect, test } from "bun:test";
import { geldigUitstelMoment, uitstelMoment } from "./budget-uitstel";
test("Vanavond kiest vandaag om 20:00 uur", () => {
    const now = new Date(2026, 10, 4, 10);
    expect(uitstelMoment("vanavond", now)).toBe(new Date(2026, 10, 4, 20).toISOString());
});
test("Morgen kiest de volgende kalenderdag", () => {
    expect(uitstelMoment("morgen", new Date(2026, 10, 4, 10))).toBe(new Date(2026, 10, 5, 20).toISOString());
});
test("Over 3 dagen kiest drie kalenderdagen later", () => {
    expect(uitstelMoment("drie-dagen", new Date(2026, 10, 4, 10))).toBe(new Date(2026, 10, 7, 20).toISOString());
});
test("een verstreken terugkijkmoment kan niet worden gekozen", () => {
    expect(uitstelMoment("vanavond", new Date(2026, 10, 4, 21))).toBeUndefined();
    expect(geldigUitstelMoment("2026-11-03T20:00:00Z", new Date("2026-11-04T10:00:00Z"))).toBe(false);
    expect(geldigUitstelMoment("ongeldig")).toBe(false);
});
