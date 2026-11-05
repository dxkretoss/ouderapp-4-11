import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useKring } from "@/lib/kring-store";
import { dienVoorstelIn, useZorg } from "@/lib/zorg-store";
import { startNuAfstemmen } from "@/lib/nu-afstemmen-store";
import { AppIcon } from "@/components/AppIcon";
import { bevestig } from "@/lib/feedback";
/** One shared quick action; sends context and a one-off proposal, never changes the exchange directly. */
export function IkBenLater({ momentId }) {
    const { t } = useTranslation();
    const kring = useKring();
    const zorg = useZorg();
    const [open, setOpen] = useState(false);
    const [tijd, setTijd] = useState("");
    const m = kring.momenten.find((x) => x.id === momentId && x.soort === "wissel");
    if (!m)
        return null;
    const wacht = zorg.voorstellen.find((v) => v.status === "open" && v.moment?.id === m.id);
    const later = (min) => {
        const [uur, minuut] = m.tijd.split(":").map(Number);
        if (uur === undefined || minuut === undefined || !Number.isFinite(uur) || !Number.isFinite(minuut))
            return;
        const totaal = uur * 60 + minuut + min;
        if (totaal >= 1440)
            return;
        setTijd(`${String(Math.floor(totaal / 60)).padStart(2, "0")}:${String(totaal % 60).padStart(2, "0")}`);
    };
    const verstuur = () => {
        if (!tijd || tijd <= m.tijd || wacht)
            return;
        const kinderen = m.kindIds.filter((k) => k === "emma" || k === "noah");
        const tekst = `Ik ben later bij het wisselmoment ${m.dag.toLowerCase()} bij ${m.plek}. Verwachte aankomst: ${tijd} uur in plaats van ${m.tijd} uur. Komt dat uit?`;
        dienVoorstelIn({ soort: "eenmalig", aanleiding: "moment", kinderen, dagen: [], tekst, datumLabel: `${m.dag} ${m.tijd}`, moment: { id: m.id, tijd } });
        startNuAfstemmen({ categorie: "planning", kindIds: kinderen, titel: `Ik ben later · verwacht ${tijd} uur`, toelichting: `${tekst} Geef akkoord bij het wijzigingsvoorstel om de tijd vast te leggen.`, reactieGewenst: "zsm", oudeTijd: m.tijd, nieuweTijd: tijd });
        setOpen(false);
        bevestig("Verstuurd naar de andere ouder ✓", { uitleg: "Wacht op reactie van de andere ouder", tril: true });
    };
    return <>
    {wacht ? <p role="status" className="mt-2 text-xs text-ink-soft">{t("calendar.lateModal.waitingNotice", { time: m.tijd, defaultValue: `Tijdvoorstel verstuurd · ${m.tijd} uur blijft gelden tot akkoord.` })} <Link to="/zorgregeling" className="font-semibold text-brand">{t("calendar.lateModal.viewProposal", "Bekijk voorstel →")}</Link></p> : <Button variant="link" size="sm" className="h-auto px-0" onClick={() => { setTijd(""); setOpen(true); }}><AppIcon functie="tijd" maat="sm" vorm="kaal"/>{t("calendar.lateModal.button", "Ik ben later")}</Button>}
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="bottom" className="inset-x-0 mx-auto w-full max-w-md mx-auto max-w-md">
        <SheetHeader><SheetTitle>{t("calendar.lateModal.title", "Ik ben later")}</SheetTitle><SheetDescription>{t("calendar.lateModal.subtitle", { day: m.dag, time: m.tijd, place: m.plek, defaultValue: `${m.dag} · afgesproken om ${m.tijd} uur bij ${m.plek}` })}</SheetDescription></SheetHeader>
        <fieldset className="mt-4"><legend className="text-sm font-semibold">{t("calendar.lateModal.howMuchLater", "Hoeveel later verwacht je er te zijn?")}</legend><div className="mt-2 flex gap-3">{[10, 20, 30].map((min) => <Button key={min} variant="outline" onClick={() => later(min)}>+{min} min</Button>)}</div></fieldset>
        <label className="mt-4 block text-sm font-semibold">{t("calendar.lateModal.expectedArrival", "Verwachte aankomst")}<input type="time" value={tijd} onChange={(e) => setTijd(e.target.value)} className="mt-2 block w-full rounded-md border border-border bg-surface px-3 py-2"/></label>
        <p className="mt-3 text-xs text-ink-soft">{t("calendar.lateModal.notice", "Je bericht en tijdvoorstel gaan naar de andere ouder. De afgesproken tijd verandert alleen na akkoord op het voorstel.")}</p>
        <Button className="mt-4 w-full" disabled={!tijd || tijd <= m.tijd || !!wacht} onClick={verstuur}>{t("calendar.lateModal.send", "Bericht en voorstel versturen")}</Button>
      </SheetContent>
    </Sheet>
  </>;
}
