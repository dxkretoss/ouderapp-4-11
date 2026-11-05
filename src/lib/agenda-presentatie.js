import i18n from "@/i18n";
import { dt, plusDagen } from "./agenda-datum";
import { wachtOpJou } from "./openstaande-voorstellen";
/** Read-only selection; Costs keeps ownership of financial proposals. */
export const agendaReacties = (voorstellen) => wachtOpJou(voorstellen).filter((v) => v.bron !== "budget" && v.bron !== "kost");
export function weekBereik(start) {
    const isEn = i18n?.language?.startsWith("en");
    const loc = isEn ? "en-US" : "nl-NL";
    const van = dt(start), tot = dt(plusDagen(start, 6));
    const zelfdeMaand = van.getMonth() === tot.getMonth() && van.getFullYear() === tot.getFullYear();
    const begin = zelfdeMaand ? String(van.getDate()) : van.toLocaleDateString(loc, { day: "numeric", month: "long", ...(van.getFullYear() !== tot.getFullYear() ? { year: "numeric" } : {}) });
    return `${begin}–${tot.toLocaleDateString(loc, { day: "numeric", month: "long", ...(van.getFullYear() !== tot.getFullYear() ? { year: "numeric" } : {}) })}`;
}
