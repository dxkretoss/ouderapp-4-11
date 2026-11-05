import { useGesprekken } from "@/lib/gesprekken-store";
/** Rustige, tijdelijke status bij een overdracht. Alleen "onderweg", nooit locatie, route of aankomsttijd. */
export function OnderwegStatus({ momentId }) {
    const { onderweg } = useGesprekken();
    const wie = onderweg[momentId];
    if (!wie)
        return null;
    return <p role="status" className="mt-2 rounded-md bg-brand-soft px-3 py-2 text-sm font-semibold">{wie} is onderweg</p>;
}
