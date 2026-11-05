import { useState } from "react";
import { useZorg } from "@/lib/zorg-store";
import { useAfspraken } from "@/lib/afspraken-store";
import { useBudgetten } from "@/lib/budget-store";
import { useVakanties } from "@/lib/vakantie-store";
import { statusTekst, telling, verzamelVoorstellen } from "@/lib/openstaande-voorstellen";
import { FilterBalk } from "@/components/ui-kit";
const kop = "text-sm font-semibold";
const bronLabel = { zorg: "Verdeling", afspraak: "Afspraak", budget: "Budget", vakantie: "Vakantie", kost: "Uitgave", aanwezigheid: "Aanwezigheid" };
/**
 * Feitelijk afstemmingsoverzicht voor bevoegde professionals: alleen wat ouders zelf hebben
 * geregistreerd (voorstellen en reacties). Geen oordeel, geen patroonanalyse, geen conclusies
 * over gedrag of intenties. Getoond voor het fictieve voorbeeldgezin.
 */
export function AfstemmingTab() {
    const zorg = useZorg();
    const afspraken = useAfspraken();
    const budgetten = useBudgetten();
    const vakanties = useVakanties();
    const [typeFilter, setTypeFilter] = useState("alle");
    const [statusFilter, setStatusFilter] = useState("alle");
    const vandaag = new Date().toISOString().slice(0, 10);
    const alle = verzamelVoorstellen({ zorg: zorg.voorstellen, afspraken, budgetten, vakanties }, vandaag);
    const t = telling(alle);
    const zichtbaar = alle.filter((v) => (typeFilter === "alle" || v.bron === typeFilter) && (statusFilter === "alle" || v.status === statusFilter));
    const feit = (label, n) => (<div key={label} className="rounded-lg border border-border px-3 py-2">
      <p className="text-lg font-bold text-ink">{n}</p>
      <p className="text-[11px] text-ink-soft">{label}</p>
    </div>);
    return (<section>
      <h3 className={kop}>Afstemmingsoverzicht</h3>
      <p className="mt-1 text-[11px] text-ink-soft">
        Alleen wat ouders zelf hebben geregistreerd: voorstellen, reacties en gewenste reactiedatums. Dit overzicht zegt niets over gedrag of intenties. Voorbeeldgegevens van het fictieve gezin.
      </p>
      <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
        {feit("Ingediend", t.ingediend)}
        {feit("Beantwoord", t.beantwoord)}
        {feit("Zonder reactie", t.zonderReactie)}
        {feit("Reactiedatum verstreken", t.verstreken)}
        {feit("Tegenvoorstellen", t.tegenvoorstellen)}
      </div>
      <div className="mt-4 space-y-2">
        <FilterBalk opties={[{ id: "alle", label: "Alles" }, { id: "zorg", label: "Verdeling" }, { id: "afspraak", label: "Afspraken" }, { id: "budget", label: "Budget" }, { id: "vakantie", label: "Vakantie" }]} waarde={typeFilter} onChange={setTypeFilter}/>
        <FilterBalk opties={[{ id: "alle", label: "Alle statussen" }, ...["wacht-op-reactie", "wacht-op-jouw-reactie", "meer-tijd-gevraagd", "tegenvoorstel-ontvangen", "reactiedatum-verstreken", "akkoord", "niet-akkoord", "ingetrokken", "afgerond"].map((s) => ({ id: s, label: statusTekst[s] }))]} waarde={statusFilter} onChange={setStatusFilter}/>
      </div>
      <ul className="mt-2 divide-y divide-border">
        {zichtbaar.map((v) => (<li key={v.sleutel} className="py-2.5 text-sm">
            <p className="font-semibold">{v.titel} <span className="text-xs font-normal text-ink-soft">· {bronLabel[v.bron]}</span></p>
            <p className="text-xs text-ink-soft">{statusTekst[v.status]}{v.reactieDatum ? ` · gewenste reactiedatum ${v.reactieDatum}` : ""}</p>
          </li>))}
        {zichtbaar.length === 0 ? <li className="py-3 text-sm text-ink-soft">Geen voorstellen in deze selectie.</li> : null}
      </ul>
    </section>);
}
