/** Een nieuw voorstel is nooit een bevestiging; bij een wijziging blijft het bestaande akkoordbedrag gelden. */
export function bevestigdBudget(b) {
    if (!b)
        return undefined;
    return b.status === "akkoord" || b.status === "uitgegeven" || ((b.status === "wacht" || b.status === "tegenvoorstel") && b.stappen.some((s) => s.wat === "Akkoord")) ? b : undefined;
}
export function gekoppeldBudget(budgetId, budgetten) {
    return bevestigdBudget(budgetten.find((b) => b.id === budgetId));
}
