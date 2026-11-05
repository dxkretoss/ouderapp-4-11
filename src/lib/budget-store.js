/**
 * Budgetvoorstellen: afspraken over een TOEKOMSTIGE uitgave. Nooit zelf een kostenpost.
 * Flow: voorstel → reactie → eventueel tegenvoorstel → akkoord ("Afgesproken budget") → later "Uitgave toevoegen" via de bestaande kostenflow.
 * Elke stap wordt als nieuw audit-event vastgelegd; eerdere stappen worden niet overschreven (stappen-array is append-only).
 */
import { useSyncExternalStore } from "react";
import { leg } from "@/lib/audit-store";
import { verwerkActie } from "@/lib/acties-store";
import { geldigUitstelMoment } from "@/lib/budget-uitstel";
const nu = () => new Date().toISOString();
let lijst = [];
const listeners = new Set();
export const budgetSnapshot = () => lijst;
const zet = (id, fn) => { lijst = lijst.map((b) => (b.id === id ? fn(b) : b)); listeners.forEach((l) => l()); };
const stap = (b, s) => Object.freeze([...b.stappen, Object.freeze({ ...s, moment: nu() })]);
const verdeling = (pct) => `${pct} / ${100 - pct}`;
const ander = (w) => (w === "Sanne" ? "Joris" : "Sanne");
export function nieuwBudget(b) {
    const v = { ...b, id: `b${Date.now()}`, door: "Sanne", status: "wacht", aanZet: "Joris", stappen: [{ wie: "Sanne", wat: "Voorstel", bedrag: b.max, moment: nu() }] };
    lijst = [v, ...lijst];
    listeners.forEach((l) => l());
    leg("kosten", v.id, `Budget: ${v.wat}`, "CREATED", undefined, "Sanne", { meta: { soort: "budgetvoorstel", bedrag: String(v.max), verdeling: verdeling(v.pctSanne) } });
    return v.id;
}
export function reageer(id, wie, r) {
    const b = lijst.find((x) => x.id === id);
    if (!b || b.aanZet !== wie || (b.status !== "wacht" && b.status !== "tegenvoorstel"))
        return;
    if (typeof r === "object") {
        if (!Number.isFinite(r.tegen) || r.tegen <= 0)
            return;
        zet(id, (x) => ({ ...x, status: "tegenvoorstel", aanZet: ander(wie), stappen: stap(x, { wie, wat: "Tegenvoorstel", bedrag: r.tegen }) }));
        leg("kosten", id, `Budget: ${b.wat}`, "UPDATED", { veld: "budget (tegenvoorstel)", oud: String(b.stappen.at(-1)?.bedrag ?? b.max), nieuw: String(r.tegen) }, wie);
    }
    else {
        const laatste = [...b.stappen].reverse().find((s) => s.bedrag)?.bedrag ?? b.max;
        const pct = [...b.stappen].reverse().find((s) => s.pctSanne !== undefined)?.pctSanne ?? b.pctSanne;
        const bestaandAkkoord = b.stappen.some((s) => s.wat === "Akkoord");
        zet(id, (x) => ({ ...x, status: r === "geweigerd" && bestaandAkkoord ? (x.kostId ? "uitgegeven" : "akkoord") : r, ...(r === "akkoord" ? { max: laatste, pctSanne: pct } : {}), stappen: stap(x, { wie, wat: r === "akkoord" ? "Akkoord" : "Niet akkoord" }) }));
        leg("kosten", id, `Budget: ${b.wat}`, r === "akkoord" ? "ACCEPTED" : "DECLINED", undefined, wie, { meta: { bedrag: String(laatste) } });
    }
    if (id === "b1")
        verwerkActie("budget-voetbalschoenen");
}
/** A change remains in the same source record; confirmed amount/distribution stay until acceptance. */
export function wijzigBudgetVoorstel(id, wie, bedrag, pctSanne) {
    const b = lijst.find((x) => x.id === id);
    if (!b || (b.status !== "akkoord" && b.status !== "uitgegeven") || !Number.isFinite(bedrag) || bedrag <= 0 || !Number.isFinite(pctSanne) || pctSanne < 0 || pctSanne > 100)
        return false;
    zet(id, (x) => ({ ...x, status: "tegenvoorstel", aanZet: ander(wie), stappen: stap(x, { wie, wat: "Wijzigingsvoorstel", bedrag, pctSanne }) }));
    leg("kosten", id, `Budget: ${b.wat}`, "UPDATED", { veld: "budgetvoorstel", oud: String(b.max), nieuw: String(bedrag) }, wie);
    return true;
}
export function trekBudgetIn(id, wie = "Sanne") {
    const b = lijst.find((x) => x.id === id);
    if (!b || (b.status !== "wacht" && b.status !== "tegenvoorstel") || b.aanZet === wie)
        return false;
    const bestaandAkkoord = b.stappen.some((s) => s.wat === "Akkoord");
    zet(id, (x) => ({ ...x, status: bestaandAkkoord ? (x.kostId ? "uitgegeven" : "akkoord") : "ingetrokken", stappen: stap(x, { wie, wat: "Ingetrokken" }) }));
    leg("kosten", id, `Budget: ${b.wat}`, "CANCELLED", { veld: "status", oud: b.status, nieuw: "ingetrokken" }, wie);
    if (id === "b1")
        verwerkActie("budget-voetbalschoenen");
    return true;
}
/** Meer tijd vragen: alleen wie aan zet is; het voorstel blijft open, zonder instemming of verplichting. */
export function vraagMeerTijdBudget(id, wie, tot) {
    const b = lijst.find((x) => x.id === id);
    if (!b || b.aanZet !== wie || (b.status !== "wacht" && b.status !== "tegenvoorstel"))
        return false;
    if (tot && !geldigUitstelMoment(tot))
        return false;
    zet(id, (x) => ({ ...x, stappen: stap(x, { wie, wat: "Meer tijd gevraagd", ...(tot ? { terugkijkMoment: tot } : {}) }) }));
    leg("kosten", id, `Budget: ${b.wat}`, "UPDATED", { veld: "reactie", oud: "open", nieuw: "meer tijd gevraagd" }, wie);
    return true;
}
/** Vriendelijke herinnering: alleen de verzender (wie níet aan zet is); vastgelegd als stap, begrensd via herinneringen.ts. */
export function stuurBudgetHerinnering(id, wie) {
    const b = lijst.find((x) => x.id === id);
    if (!b || b.aanZet === wie || (b.status !== "wacht" && b.status !== "tegenvoorstel"))
        return false;
    zet(id, (x) => ({ ...x, stappen: stap(x, { wie, wat: "Herinnering verstuurd" }) }));
    leg("kosten", id, `Budget: ${b.wat}`, "UPDATED", { veld: "herinnering", oud: "", nieuw: "herinnering verstuurd" }, wie);
    return true;
}
export function koppelUitgave(id, kostId, bedrag) {
    const b = lijst.find((x) => x.id === id);
    if (!b || b.status !== "akkoord")
        return;
    zet(id, (x) => ({ ...x, status: "uitgegeven", kostId, stappen: stap(x, { wie: "Sanne", wat: "Werkelijke uitgave", bedrag }) }));
    leg("kosten", id, `Budget: ${b.wat}`, "UPDATED", { veld: "werkelijke uitgave", oud: `budget ${b.max}`, nieuw: String(bedrag) }, "Sanne", { meta: { kostId } });
}
export function useBudgetten() {
    return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => lijst, () => lijst);
}
