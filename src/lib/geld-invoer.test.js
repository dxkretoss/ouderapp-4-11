import { expect, test } from "bun:test";
import { leesGeld, schrijfGeld } from "./geld-invoer";
for (const [input, output] of [["60", "60,00"], ["60,5", "60,50"], ["60.50", "60,50"], ["1250", "1.250,00"], ["0,75", "0,75"], ["1000,99", "1.000,99"]]) {
    test(`geldinvoer ${input}`, () => { const n = leesGeld(input ?? ""); expect(n).not.toBeNull(); if (n !== null)
        expect(schrijfGeld(n)).toBe(output); });
}
test("duizendtallen lezen zonder bedrag te veranderen", () => expect(leesGeld("1.250,00")).toBe(1250));
test("leeg, negatief en ongeldige bedragen weigeren", () => { for (const s of ["", "-1", "abc", "12,3,4", "1.2.3", "60."])
    expect(leesGeld(s)).toBeNull(); });
test("afronden op twee decimalen", () => expect(leesGeld("1,005")).toBe(1.01));
