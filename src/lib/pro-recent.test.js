import { expect, test } from "bun:test";
import { recenteProGebeurtenissen } from "./pro-recent";
test("recent toont maximaal drie bestaande gebeurtenissen in datumvolgorde zonder geschiedenis te wijzigen", () => {
    const log = [1, 4, 2, 3].map((n) => Object.freeze({ id: String(n), dossier: "toegestaan", moment: `2026-10-0${n}T12:00:00Z`, tekst: `Event ${n}`, door: "Marloes", soort: "contact" }));
    Object.freeze(log);
    const recent = recenteProGebeurtenissen(log, ["toegestaan"]);
    expect(recent.map((x) => x.id)).toEqual(["4", "3", "2"]);
    expect(recent[0]).toBe(log[1]);
    expect(log.map((x) => x.id)).toEqual(["1", "4", "2", "3"]);
});
test("geen gebeurtenissen buiten toegankelijke dossiers", () => {
    expect(recenteProGebeurtenissen([{ id: "1", dossier: "privé", moment: "2026-10-08", tekst: "Intern", door: "Ander", soort: "contact" }], ["toegestaan"])).toEqual([]);
});
