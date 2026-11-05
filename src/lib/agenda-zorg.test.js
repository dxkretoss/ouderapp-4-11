import { expect, test } from "bun:test";
import { agendaZorgOp, vakantieDelenOp, magOverdrachtVoorbereiden } from "./agenda-zorg";
import { zorgState, zorgOp, dienVoorstelIn, accepteer, wijsAf } from "./zorg-store";
import { startState } from "./start-store";
import { voegVakantieVoorstelToe, vakantieLijst, accepteerVakantie, wijzigVakantieVoorstel, wijsVakantieAf, actieveVakantie } from "./vakantie-store";
import { vakantiesVoor } from "./schoolvakanties";
const st = { ...startState(), eigen: false };
test("care colours reverse from the viewing parent's perspective", () => {
    const a = agendaZorgOp(zorgState(), [], st, "2025-03-12", "emma", "sanne");
    const b = agendaZorgOp(zorgState(), [], st, "2025-03-12", "emma", "joris");
    expect(a.kleur).toBe("ik");
    expect(b.kleur).toBe("ander");
});
test("mixed child care and child selection use the same schedule", () => {
    const id = dienVoorstelIn({ soort: "eenmalig", kinderen: ["noah"], dagen: [12], datums: ["2025-03-12"], naarOuder: "joris", tekst: "Andere dag", datumLabel: "12 maart" });
    expect(accepteer(id, "Joris")).toBe(true);
    expect(agendaZorgOp(zorgState(), [], st, "2025-03-12").kleur).toBe("gemengd");
    expect(agendaZorgOp(zorgState(), [], st, "2025-03-12", "noah").kleur).toBe("ander");
});
test("temporary proposal only applies after approval and ends on its exact date", () => {
    const date = "2026-11-03", old = zorgOp(zorgState(), "emma", date).ouder;
    const target = old === "sanne" ? "joris" : "sanne";
    const id = dienVoorstelIn({ soort: "eenmalig", kinderen: ["emma"], dagen: [3], datums: [date], naarOuder: target, tekst: "Eenmalig", datumLabel: date });
    expect(zorgOp(zorgState(), "emma", date).ouder).toBe(old);
    expect(accepteer(id, "Sanne")).toBe(false);
    expect(accepteer(id, "Joris")).toBe(true);
    expect(zorgOp(zorgState(), "emma", date).ouder).toBe(target);
    expect(zorgOp(zorgState(), "emma", "2026-12-03").uitzondering).toBeUndefined();
});
test("structural change starts only on the approved start date", () => {
    const old = zorgOp(zorgState(), "noah", "2027-01-04").ouder;
    const id = dienVoorstelIn({ soort: "structureel", kinderen: ["noah"], dagen: [5], datums: ["2027-01-05"], naarOuder: "joris", tekst: "Vanaf nu", datumLabel: "5 januari" });
    expect(zorgOp(zorgState(), "noah", "2027-01-05").uitzondering).toBeUndefined();
    expect(accepteer(id, "Joris")).toBe(true);
    expect(zorgOp(zorgState(), "noah", "2027-01-04").ouder).toBe(old);
    expect(zorgOp(zorgState(), "noah", "2027-01-05").ouder).toBe("joris");
    expect(zorgOp(zorgState(), "noah", "2027-01-12").ouder).toBe("sanne");
});
test("declined care proposal never changes planning", () => {
    const old = zorgOp(zorgState(), "emma", "2027-02-01").ouder;
    const id = dienVoorstelIn({ soort: "eenmalig", kinderen: ["emma"], dagen: [1], datums: ["2027-02-01"], naarOuder: old === "sanne" ? "joris" : "sanne", tekst: "Niet akkoord", datumLabel: "1 februari" });
    expect(wijsAf(id, "Joris")).toBe(true);
    expect(accepteer(id, "Joris")).toBe(false);
    expect(zorgOp(zorgState(), "emma", "2027-02-01").ouder).toBe(old);
});
const fields = { naam: "Kerst", periode: "2026-12-25 t/m 2026-12-26", vanDatum: "2026-12-25", totDatum: "2026-12-26", ouder: "Sanne", details: "", kinderen: ["emma"], soort: "bijzonder", herhaal: "afwisselend", verdeling: [{ van: "2026-12-25", tot: "2026-12-25", ouder: "Sanne" }, { van: "2026-12-26", tot: "2026-12-26", ouder: "Joris" }] };
const holiday = { ...fields, id: "test", status: "afgesproken" };
test("first and second Christmas day may differ and alternate yearly", () => {
    expect(vakantieDelenOp(holiday, "2026-12-25", "emma")[0]?.ouder).toBe("Sanne");
    expect(vakantieDelenOp(holiday, "2026-12-26", "emma")[0]?.ouder).toBe("Joris");
    expect(vakantieDelenOp(holiday, "2027-12-25", "emma")[0]?.ouder).toBe("Joris");
    expect(vakantieDelenOp(holiday, "2028-12-25", "emma")[0]?.ouder).toBe("Sanne");
    expect(vakantieDelenOp(holiday, "2026-12-25", "noah")).toEqual([]);
});
test("holiday overrides only its agreed period then ordinary care resumes", () => {
    expect(agendaZorgOp(zorgState(), [holiday], st, "2026-12-25", "emma").kleur).toBe("ik");
    expect(agendaZorgOp(zorgState(), [holiday], st, "2026-12-27", "emma").kinderen).toEqual(agendaZorgOp(zorgState(), [], st, "2026-12-27", "emma").kinderen);
    expect(agendaZorgOp(zorgState(), [holiday], st, "2026-12-27", "emma").wissels[0]?.naar).toBe("sanne");
    expect(vakantieDelenOp({ ...holiday, status: "voorstel" }, "2026-12-25", "emma")).toEqual([]);
});
test("holiday revision and rejection preserve original dates and history", () => {
    const id = voegVakantieVoorstelToe(fields);
    expect(accepteerVakantie(id, "Joris")).toBe(true);
    expect(wijzigVakantieVoorstel(id, { ...fields, vanDatum: "2026-12-24" })).toBe(true);
    let v = vakantieLijst().find((x) => x.id === id);
    if (!v)
        throw Error("Missing source");
    expect(actieveVakantie(v)?.vanDatum).toBe("2026-12-25");
    expect(wijsVakantieAf(id, "Joris")).toBe(true);
    v = vakantieLijst().find((x) => x.id === id);
    if (!v)
        throw Error("Missing source");
    expect(v.vanDatum).toBe("2026-12-25");
    expect(v.geschiedenis?.at(-1)?.actie).toBe("Niet akkoord");
});
test("conflicting agreed periods remain explicit, not silently selected", () => {
    const other = { ...holiday, id: "other", ouder: "Joris", verdeling: [{ van: "2026-12-25", tot: "2026-12-26", ouder: "Joris" }] };
    const day = agendaZorgOp(zorgState(), [holiday, other], st, "2026-12-25", "emma");
    expect(day.kinderen[0]?.overlap).toHaveLength(2);
    expect(day.kinderen[0]?.ouder).toBeUndefined();
});
test("handover preparation is available only within 24 hours beforehand", () => {
    const moment = new Date(2026, 10, 4, 14, 30);
    expect(magOverdrachtVoorbereiden("2026-11-04", "14:30", new Date(moment.getTime() - 24 * 3600000), true)).toBe(true);
    expect(magOverdrachtVoorbereiden("2026-11-04", "14:30", new Date(moment.getTime() - 24 * 3600000 - 1), true)).toBe(false);
    expect(magOverdrachtVoorbereiden("2026-11-04", "14:30", new Date(moment.getTime() + 1), true)).toBe(false);
    expect(magOverdrachtVoorbereiden("2026-11-04", "14:30", moment, false)).toBe(false);
});
test("official 2026-27 and 2027-28 region data distinguish advice and fixed dates", () => {
    expect(vakantiesVoor("noord").find((v) => v.naam === "Herfstvakantie" && v.schooljaar === "2026-2027")?.van).toBe("2026-10-10");
    expect(vakantiesVoor("zuid").find((v) => v.naam === "Voorjaarsvakantie" && v.schooljaar === "2026-2027")?.van).toBe("2027-02-13");
    expect(vakantiesVoor("midden").find((v) => v.naam === "Zomervakantie" && v.schooljaar === "2027-2028")?.van).toBe("2028-07-08");
    expect(vakantiesVoor("midden").find((v) => v.naam === "Herfstvakantie")?.advies).toBe(true);
    expect(vakantiesVoor("midden").find((v) => v.naam === "Kerstvakantie")?.advies).toBe(false);
});
