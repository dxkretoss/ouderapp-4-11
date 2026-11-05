import { expect, test } from "bun:test";
import { agendaReacties, weekBereik } from "./agenda-presentatie";
test("weekdatums komen uit de geselecteerde week, ook over maand- en jaargrenzen", () => {
    expect(weekBereik("2025-03-10")).toBe("10–16 maart");
    expect(weekBereik("2025-03-31")).toBe("31 maart–6 april");
    expect(weekBereik("2026-12-28")).toBe("28 december 2026–3 januari 2027");
});
test("Agenda meldt alleen open niet-financiële voorstellen voor jouw reactie", () => {
    const v = { sleutel: "zorg-1", bron: "zorg", bronId: "1", titel: "Zorg", omschrijving: "", status: "wacht-op-jouw-reactie", aanJou: true, naar: "/agenda" };
    expect(agendaReacties([v, { ...v, sleutel: "ander", aanJou: false }, { ...v, sleutel: "afgerond", status: "akkoord" }, { ...v, sleutel: "budget", bron: "budget" }, { ...v, sleutel: "vakantie", bron: "vakantie" }]).map((x) => x.sleutel)).toEqual(["zorg-1", "vakantie"]);
    expect(agendaReacties([{ ...v, aanJou: false }])).toEqual([]);
});
