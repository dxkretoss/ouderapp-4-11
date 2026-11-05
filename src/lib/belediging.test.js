import { describe, expect, test } from "bun:test";
import { bevatBelediging } from "./belediging";
describe("bevatBelediging", () => {
    test("duidelijke beledigingen worden herkend", () => {
        expect(bevatBelediging("eikel")).toBe(true);
        expect(bevatBelediging("Jij bent echt een eikel.")).toBe(true);
        expect(bevatBelediging("Wat ben jij een egoïst")).toBe(true);
        expect(bevatBelediging("Je bent een IDIOOT")).toBe(true);
    });
    test("veelvoorkomende spelfout van een belediging wordt herkend", () => {
        expect(bevatBelediging("eikl")).toBe(true);
    });
    test("gewone en zakelijke berichten geven nooit een treffer", () => {
        expect(bevatBelediging("Zou je Noah morgen kunnen ophalen?")).toBe(false);
        expect(bevatBelediging("Ik ga niet akkoord met dit voorstel.")).toBe(false);
        expect(bevatBelediging("Je komt ook nooit je afspraken na.")).toBe(false);
        expect(bevatBelediging("De eikenlaan is omgevallen")).toBe(false);
    });
    test("een belediging in een AI-voorstel maakt het ongeschikt", () => {
        expect(bevatBelediging("Ik vind het vervelend, eikel, dat je niet komt.")).toBe(true);
        expect(bevatBelediging("Ik vind het vervelend dat onze afspraken niet altijd worden nagekomen.")).toBe(false);
    });
});
