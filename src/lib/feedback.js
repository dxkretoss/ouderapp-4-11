import { useEffect } from "react";
import { toast } from "sonner";
/** Toont een opgeslagen bevestiging ook als pop-up, zodat je hem ziet waar je ook bent op de pagina. */
export function useBevestigPopup(tekst) {
    useEffect(() => { const kort = tekst ? kortePopup(tekst) : null; if (kort)
        bevestig(kort); }, [tekst]);
}
/**
 * Korte, vaste pop-uptekst bij een (langere) bevestiging op de pagina.
 * "Geregeld!" alleen als de tekst zelf al een definitieve bevestiging beschrijft. Geen succes → null.
 */
export function kortePopup(tekst) {
    const t = tekst.replace(/^✓\s*/, "");
    if (/^kies hieronder/i.test(t))
        return null;
    if (/niet akkoord|afgewezen/i.test(t))
        return "Niet akkoord. De afspraak is niet gewijzigd.";
    if (/ingetrokken/i.test(t))
        return "Voorstel ingetrokken. Er is niets gewijzigd.";
    if (/voorgesteld|voorstel.*verstuurd|wijzigingsvoorstel|vraag verstuurd|voorstel staat klaar/i.test(t))
        return "Voorstel verstuurd. Wacht op antwoord.";
    if (/ging akkoord|ja gezegd|verdeling is aangepast|^afgesproken/i.test(t))
        return "Geregeld! De afspraak is bevestigd.";
    if (/^(persoonlijke )?afspraak toegevoegd/i.test(t))
        return "Afspraak toegevoegd.";
    return t;
}
/** Zachte trilling alleen waar het apparaat dat ondersteunt; nooit vereist. */
export function zachteTril() {
    try {
        if (typeof navigator !== "undefined" && "vibrate" in navigator) {
            if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches)
                return;
            navigator.vibrate(12);
        }
    }
    catch {
        /* geen ondersteuning: gewoon doorgaan */
    }
}
/** Eén bevestiging voor de hele app. Alleen aanroepen nádat de actie echt is opgeslagen. */
export function bevestig(tekst, opties) {
    if (opties?.tril)
        zachteTril();
    // Vaste id: een nieuwe bevestiging vervangt de vorige, nooit meerdere tegelijk.
    toast.success(tekst, {
        id: "bevestiging",
        description: opties?.uitleg,
        duration: opties?.ongedaan ? 6000 : 3000,
        action: opties?.ongedaan ? { label: "Ongedaan maken", onClick: opties.ongedaan } : undefined,
    });
}
/** Eén begrijpelijke foutmelding, met opnieuw proberen waar dat kan. */
export function meldFout(tekst, opnieuw) {
    toast.error(tekst, { id: "bevestiging", duration: 6000, action: opnieuw ? { label: "Opnieuw proberen", onClick: opnieuw } : undefined });
}
