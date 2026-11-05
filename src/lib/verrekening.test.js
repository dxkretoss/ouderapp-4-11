import { expect, test } from "bun:test";
import { berekenSaldo, betaalOvergang, veiligeBetaallink } from "./verrekening";
import { kosten } from "./demo-data";
const v = { id: "V-1", maand: "Oktober", datum: "20 oktober", bedrag: 11.48, van: "joris", aan: "sanne", wijze: "Handmatig", status: "nog-te-betalen", kostIds: ["1", "2"] };
test("20 euro regenlaarzen 50/50 verlaagt 11,48 naar 1,48; dubbele ID telt eenmaal", () => {
    const basis = kosten[0];
    if (!basis)
        throw new Error("testbasis ontbreekt");
    const schuld = { ...basis, id: "schuld", bedrag: 22.96, aandeelSanne: 11.48, betaaldDoor: "joris", status: "openstaand" };
    const laarzen = { ...basis, id: "laarzen", bedrag: 20, aandeelSanne: 10, betaaldDoor: "sanne", status: "openstaand" };
    expect(berekenSaldo([schuld, laarzen]).netto).toBe(-1.48);
    expect(berekenSaldo([schuld, laarzen, laarzen]).netto).toBe(-1.48);
});
test("onbevestigde en afgewezen uitgaven veranderen saldo niet", () => {
    const basis = kosten[0];
    if (!basis)
        throw new Error("testbasis ontbreekt");
    expect(berekenSaldo([{ ...basis, status: "wacht" }, { ...basis, id: "afgewezen", status: "betwist" }], []).netto).toBe(0);
});
test("betaling aangeven is geen ontvangst of afronding en behoudt bedrag/kosten", () => {
    const n = betaalOvergang(v, "joris", "aangegeven");
    expect(n?.status).toBe("wacht-op-ontvanger");
    expect(n?.bedrag).toBe(11.48);
    expect(n?.kostIds).toEqual(["1", "2"]);
});
test("alleen betaler mag betaling aangeven", () => { expect(betaalOvergang(v, "sanne", "aangegeven")).toBeNull(); });
test("alleen ontvanger mag ontvangst bevestigen", () => {
    expect(betaalOvergang(v, "joris", "ontvangen")).toBeNull();
    expect(betaalOvergang(v, "sanne", "ontvangen")?.status).toBe("ontvangst-bevestigd");
});
test("niet afronden zonder ontvangst", () => { expect(betaalOvergang(v, "sanne", "afronden")).toBeNull(); });
test("dubbele melding en dubbele ontvangst worden geweigerd", () => {
    expect(betaalOvergang({ ...v, status: "wacht-op-ontvanger" }, "joris", "aangegeven")).toBeNull();
    expect(betaalOvergang({ ...v, status: "ontvangst-bevestigd" }, "sanne", "ontvangen")).toBeNull();
});
test("onveilige of nagemaakte betaallinks geweigerd", () => {
    for (const url of ["javascript:alert(1)", "http://tikkie.me/pay/test", "https://tikkie.me.evil.test/pay/test", "https://user:pass@tikkie.me/pay/test"])
        expect(veiligeBetaallink(url)).toBeNull();
    expect(veiligeBetaallink("https://tikkie.me/pay/test")).toBe("https://tikkie.me/pay/test");
});
