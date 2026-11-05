import { Link } from "@tanstack/react-router";
import { useZorg } from "@/lib/zorg-store";
import { useAfspraken } from "@/lib/afspraken-store";
import { useBudgetten } from "@/lib/budget-store";
import { useVakanties } from "@/lib/vakantie-store";
import { useStart } from "@/lib/start-store";
import { useAudit } from "@/lib/audit-store";
import { useMomentjes } from "@/lib/momentjes-store";
import { useVoorkeuren } from "@/lib/voorkeuren-store";
import { verzamelVoorstellen } from "@/lib/openstaande-voorstellen";
import { heeftNieuws, verzamelActiviteiten } from "@/lib/activiteiten";
import { AppIcon } from "@/components/AppIcon";
const vandaagIso = () => new Date().toISOString().slice(0, 10);
/** Eén hook die activiteiten afleidt uit de bestaande bronnen; eigen gezin toont geen demo-bronnen. */
export function useActiviteiten() {
    const zorg = useZorg();
    const afspraken = useAfspraken();
    const budgetten = useBudgetten();
    const vakanties = useVakanties();
    const audit = useAudit();
    const m = useMomentjes();
    const st = useStart();
    const vk = useVoorkeuren();
    const voorstellen = st.eigen ? [] : verzamelVoorstellen({ zorg: zorg.voorstellen, afspraken, budgetten, vakanties }, vandaagIso());
    const lijst = verzamelActiviteiten({ ik: "sanne", voorstellen, audit, momentjes: st.eigen ? [] : m.lijst });
    return { lijst, voorstellen, gelezen: vk.activiteitGelezen ?? [] };
}
/** Subtiel belletje op Home: alleen een bolletje bij iets nieuws, nooit een teller. */
export function ActiviteitenBel() {
    const { lijst, gelezen } = useActiviteiten();
    const nieuws = heeftNieuws(lijst, gelezen);
    return (<Link to="/activiteiten" aria-label={nieuws ? "Activiteiten, er is iets nieuws" : "Activiteiten"} className="relative grid size-11 place-items-center rounded-full">
      <span className="grid size-9 place-items-center rounded-full border border-border"><AppIcon functie="melding" maat="sm" vorm="kaal"/></span>
      {nieuws ? <span aria-hidden="true" className="absolute right-2 top-2 size-2.5 rounded-full bg-accent-warm ring-2 ring-background"/> : null}
    </Link>);
}
