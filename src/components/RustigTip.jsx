import { useState } from "react";
import { AppIcon } from "@/components/AppIcon";
import { Button } from "@/components/ui/button";
import { kiesReminder } from "@/lib/afstemming";
import { useVoorkeuren } from "@/lib/voorkeuren-store";
/** Eén korte, sluitbare kindgerichte tip — alleen als Rustig regelen aan staat. */
export function RustigTip({ moment, veiligheid = false }) {
    const aan = useVoorkeuren().gestructureerdAfstemmen;
    const [gesloten, setGesloten] = useState([]);
    const r = kiesReminder(moment, { aan, veiligheid, gesloten });
    if (!r)
        return null;
    return <div className="flex items-center gap-2 text-xs text-ink-soft"><AppIcon functie="slim" maat="sm" vorm="kaal"/><span className="flex-1">{r.tekst}</span><Button variant="ghost" size="icon" aria-label="Tip sluiten" className="size-11" onClick={() => setGesloten([...gesloten, r.moment])}><AppIcon functie="niet" maat="sm" vorm="kaal"/></Button></div>;
}
/** Zichtbare knopteksten: in Rustig regelen overal dezelfde drie keuzes. */
export function useKeuzeTeksten() {
    const aan = useVoorkeuren().gestructureerdAfstemmen;
    return aan ? { akkoord: "Akkoord", ander: "Ander voorstel", niet: "Niet akkoord" } : { akkoord: "Akkoord", ander: "Ander voorstel doen", niet: "Afwijzen" };
}
