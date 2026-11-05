/** Toegang van de mediator tot het dossier van dit gezin (enige bron; ook gebruikt door het professional-dashboard). */
export const proToegangBakker = ["Planning", "Zorgregeling", "Documenten", "Afspraken"];
export const proKijkers = {
    bakker: { type: "professional", dossierId: "bakker", naam: "Mediator", toegang: proToegangBakker, kinderen: ["Emma", "Noah"], vanaf: "2026-03-01" },
};
const bronNaarPro = {
    agenda: ["Planning", "Afspraken", "Zorgregeling"],
    verzoek: ["Zorgregeling"],
    besluit: ["Besluiten"],
    bericht: ["Communicatie"],
    kost: ["Kosten"],
    document: ["Documenten"],
};
export const auditBron = { afspraak: "agenda", schema: "verzoek", besluit: "besluit", kosten: "kost", dossier: null, taak: null, spul: null };
export function magBron(k, bron) {
    if (k.type === "ouder")
        return true; // beide ouders zien alle gedeelde gezinsinformatie
    return bronNaarPro[bron].some((o) => k.toegang.includes(o));
}
export function magAudit(k, soort) {
    const b = auditBron[soort];
    if (!b)
        return k.type === "ouder"; // exportlog alleen voor ouders (accountbeveiliging)
    return magBron(k, b);
}
export const magKind = (k, kind) => k.type === "ouder" || k.kinderen.includes(kind);
/** Vroegste datum die de kijker mag zien. */
export const vroegste = (k) => (k.type === "ouder" ? null : new Date(`${k.vanaf}T00:00`));
