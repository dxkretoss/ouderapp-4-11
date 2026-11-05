import { nodig, wachtOpMij } from "./afspraken-store";
export const zorgReactie = (v) => v.status !== "open" ? "Afgerond" : v.van === "Sanne" ? "Wacht op de ander" : "Wacht op jou";
export const afspraakReactie = (a) => !a.voorstel || !nodig(a.voorstel).length ? "Afgerond" : wachtOpMij(a) ? "Wacht op jou" : "Wacht op de ander";
export const budgetReactie = (b) => b.status !== "wacht" && b.status !== "tegenvoorstel" ? "Afgerond" : b.aanZet === "Sanne" ? "Wacht op jou" : "Wacht op de ander";
export const vakantieReactie = (v) => v.status !== "voorstel" ? "Afgerond" : v.van === "Sanne" ? "Wacht op de ander" : "Wacht op jou";
