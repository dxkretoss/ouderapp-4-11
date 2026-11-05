import { describe, expect, test } from "bun:test";
import { betrouwbareToon, signaalUitBeoordeling, signaalVraagtHerformulering, toonPositie, verdientBevestiging, vraagtHerformulering } from "./communicatiemeter";
describe("communicatiemeter", () => {
    test("zonder of onzekere beoordeling: geen score", () => {
        expect(betrouwbareToon(null)).toBeNull();
        expect(betrouwbareToon({ toon: "onzeker", niveau: "geen" })).toBeNull();
        expect(toonPositie(null)).toBeNull();
    });
    test("indicator van groen (0) naar donkerrood (100)", () => {
        expect(toonPositie("rustig")).toBe(0);
        expect(toonPositie("escalerend")).toBe(100);
    });
    test("dreigend niveau wordt nooit mild getoond", () => {
        expect(betrouwbareToon({ toon: "vriendelijk", niveau: "dreigend" })).toBe("escalerend");
    });
    test("neutraal en vriendelijk krijgen de groene bevestiging", () => {
        expect(verdientBevestiging({ toon: "neutraal", niveau: "geen", afstemming: "passend" })).toBe(true);
        expect(verdientBevestiging({ toon: "vriendelijk", niveau: "geen", afstemming: "passend" })).toBe(true);
    });
    test("mogelijk escalerend of onbeoordeeld: geen bevestiging", () => {
        expect(verdientBevestiging({ toon: "escalerend", niveau: "escalerend", afstemming: "druk" })).toBe(false);
        expect(verdientBevestiging(null)).toBe(false);
    });
    test("vanaf oranje verschijnt 'Even anders formuleren?'", () => {
        expect(vraagtHerformulering("gevoelig")).toBe(true);
        expect(vraagtHerformulering("neutraal")).toBe(false);
    });
});
test("neutral vacation wish and friendly unsupported agreement get no smiley", () => {
    expect(verdientBevestiging({ toon: "neutraal", niveau: "geen", afstemming: "overleg" })).toBe(false);
    expect(verdientBevestiging({ toon: "vriendelijk", niveau: "geen", afstemming: "druk" })).toBe(false);
});
test("missing or uncertain assessment and failed send get no smiley", () => {
    expect(verdientBevestiging({ toon: "rustig", niveau: "geen" })).toBe(false);
    expect(verdientBevestiging({ toon: "onzeker", niveau: "geen", afstemming: "passend" })).toBe(false);
    expect(verdientBevestiging({ toon: "rustig", niveau: "geen", afstemming: "passend" }, false)).toBe(false);
});
describe("vier communicatiesignalen", () => {
    test("rustig en vriendelijk worden Prettig, neutraal wordt Zakelijk", () => {
        expect(signaalUitBeoordeling({ toon: "rustig", niveau: "geen" })).toBe("prettig");
        expect(signaalUitBeoordeling({ toon: "vriendelijk", niveau: "geen" })).toBe("prettig");
        expect(signaalUitBeoordeling({ toon: "neutraal", niveau: "geen" })).toBe("zakelijk");
    });
    test("gevoelig en verwijtend worden Hard, escalerend wordt Kwetsend", () => {
        expect(signaalUitBeoordeling({ toon: "gevoelig", niveau: "geen" })).toBe("hard");
        expect(signaalUitBeoordeling({ toon: "verwijtend", niveau: "licht" })).toBe("hard");
        expect(signaalUitBeoordeling({ toon: "escalerend", niveau: "escalerend" })).toBe("kwetsend");
    });
    test("dreigend niveau toont altijd Kwetsend, onzeker toont niets", () => {
        expect(signaalUitBeoordeling({ toon: "vriendelijk", niveau: "dreigend" })).toBe("kwetsend");
        expect(signaalUitBeoordeling({ toon: "onzeker", niveau: "geen" })).toBeNull();
        expect(signaalUitBeoordeling(null)).toBeNull();
    });
    test("alleen Hard en Kwetsend bieden een andere formulering aan", () => {
        expect(signaalVraagtHerformulering("prettig")).toBe(false);
        expect(signaalVraagtHerformulering("zakelijk")).toBe(false);
        expect(signaalVraagtHerformulering("hard")).toBe(true);
        expect(signaalVraagtHerformulering("kwetsend")).toBe(true);
        expect(signaalVraagtHerformulering(null)).toBe(false);
    });
});
