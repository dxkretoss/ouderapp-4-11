import { describe, expect, test } from "bun:test";
import { heeftHerformulering } from "./coach-vergelijking";
describe("een identiek AI-resultaat is geen herformulering", () => {
    const origineel = "ik wil de kinderen de hele zomervakantie houden";
    test("dezelfde vakantiewens is geen verbetering", () => {
        expect(heeftHerformulering(origineel, origineel)).toBe(false);
    });
    test("alleen hoofdletter, punt en witruimte tellen niet", () => {
        expect(heeftHerformulering(origineel, "  Ik wil de kinderen de hele   zomervakantie houden. ")).toBe(false);
    });
    test("een werkelijk andere formulering telt wel", () => {
        expect(heeftHerformulering(origineel, "Mijn wens is om de kinderen de hele zomervakantie bij mij te hebben.")).toBe(true);
    });
    test("een leeg AI-resultaat is geen herformulering", () => {
        expect(heeftHerformulering(origineel, " ")).toBe(false);
    });
});
