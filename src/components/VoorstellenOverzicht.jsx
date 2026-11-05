import { useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useActiviteiten } from "@/components/Activiteiten";
import { Button } from "@/components/ui/button";
import { FilterBalk } from "@/components/ui-kit";
import { useZorg, stuurHerinnering } from "@/lib/zorg-store";
import { useBudgetten, stuurBudgetHerinnering } from "@/lib/budget-store";
import { useVoorkeuren } from "@/lib/voorkeuren-store";
import { magHerinnering } from "@/lib/herinneringen";
import { isOpen, statusTekst } from "@/lib/openstaande-voorstellen";
import { bevestig } from "@/lib/feedback";
/** Read existing proposals, including outgoing responses and source-owned reminder limits. */
export function VoorstellenOverzicht() {
    const { t } = useTranslation();
    const { voorstellen } = useActiviteiten();
    const zorg = useZorg();
    const budgetten = useBudgetten();
    const vk = useVoorkeuren();
    const router = useRouter();
    const [filter, setFilter] = useState("jou");
    const zichtbaar = voorstellen.filter((v) => filter === "jou" ? v.aanJou && isOpen(v) : filter === "ander" ? !v.aanJou && isOpen(v) : filter === "reacties" ? v.status === "tegenvoorstel-ontvangen" || v.status === "meer-tijd-gevraagd" : !isOpen(v));
    const mag = (v) => {
        if (v.aanJou || !isOpen(v))
            return false;
        const z = zorg.voorstellen.find((x) => x.id === v.bronId);
        const b = budgetten.find((x) => x.id === v.bronId);
        if (v.bron === "zorg" && z)
            return magHerinnering({ verstuurd: z.herinneringen ?? [], reactieDatum: z.reactieDatum, gepauzeerd: vk.herinneringenGepauzeerd }).mag;
        if (v.bron === "budget" && b)
            return magHerinnering({ verstuurd: b.stappen.filter((s) => s.wat === "Herinnering verstuurd").map((s) => s.moment), reactieDatum: b.reactieDatum, gepauzeerd: vk.herinneringenGepauzeerd }).mag;
        return false;
    };
    return <section className="mt-4" aria-label={t("home.toArrange", "Nog te regelen")}>
    <h2 className="font-display text-lg font-semibold">{t("home.toArrange", "Nog te regelen")}</h2>
    <FilterBalk opties={[{ id: "jou", label: t("proposals.filterYourResponse", "Jouw reactie") }, { id: "ander", label: t("proposals.filterOtherParent", "Andere ouder") }, { id: "reacties", label: t("proposals.filterResponses", "Reacties") }, { id: "eerder", label: t("proposals.filterEarlier", "Eerder") }]} waarde={filter} onChange={setFilter}/>
    <ul className="divide-y divide-border">{zichtbaar.map((v) => <li key={v.sleutel} className="py-3">
      <Button variant="ghost" className="h-auto min-h-11 w-full justify-start whitespace-normal px-0 text-left" onClick={() => router.navigate({ href: v.naar })}><span><span className="block font-semibold">{v.titel}</span><span className="block text-xs font-normal text-ink-soft">{v.omschrijving}</span><span className="block text-xs text-brand">{statusTekst[v.status]}</span></span></Button>
      {v.reactieDatum && isOpen(v) ? <p className="text-xs text-ink-soft">{t("proposals.desiredResponseDate", "Gewenste reactiedatum: {{date}}. Dit is een verzoek, geen verplichting.", { date: v.reactieDatum })}</p> : null}
      {mag(v) ? <Button variant="link" className="px-0 text-xs" onClick={() => { const ok = v.bron === "zorg" ? stuurHerinnering(v.bronId) : stuurBudgetHerinnering(v.bronId, "Sanne"); if (ok)
            bevestig(t("proposals.reminderNotice", "Herinnering vastgelegd in het voorbeeld. Er is geen echte melding verstuurd.")); }}>{t("proposals.sendReminder", "Herinnering sturen")}</Button> : null}
    </li>)}</ul>
    {!zichtbaar.length ? <p className="mt-3 text-sm text-ink-soft">{t("proposals.noProposals", "Er staan hier geen voorstellen.")}</p> : null}
  </section>;
}
