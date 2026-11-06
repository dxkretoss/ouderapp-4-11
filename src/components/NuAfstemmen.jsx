import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { kinderen } from "@/lib/demo-data";
import { categorieLabel, reactieLabel, reageerNuAfstemmen, startNuAfstemmen, } from "@/lib/nu-afstemmen-store";
const kindNamen = (ids) => ids.map((id) => kinderen.find((k) => k.id === id)?.naam ?? id).join(" & ");
/** Oplossingskaart: warm amber/klei, nooit fel rood. Gedeeld door Home en Berichten. */
export function NuAfstemmenKaart({ n }) {
  const { t } = useTranslation();
  const [anders, setAnders] = useState(false);
  const [tekst, setTekst] = useState("");
  return (<section role="status" className="relative mt-4 rounded-lg border border-accent-warm/40 px-4 py-3" style={{ background: "color-mix(in oklab, var(--accent-warm) 9%, var(--card))" }}>
    <p className="text-[11px] font-semibold tracking-[0.14em] text-accent-warm uppercase">{t("quickCoordination.cardHeader", "Nu afstemmen")} · {kindNamen(n.kindIds)}</p>
    <p className="mt-1 font-display text-lg font-bold leading-snug">{n.titel}</p>
    {n.toelichting ? <p className="mt-0.5 text-sm text-ink-soft">{n.toelichting}</p> : null}
    <p className="mt-1 text-[11px] text-ink-soft">{n.van === "ander" ? t("quickCoordination.fromOtherParent", "Van de andere ouder") : t("quickCoordination.startedByYouWaiting", "Door jou gestart · wacht op reactie")} · {t("quickCoordination.desiredResponse", { label: reactieLabel[n.reactieGewenst].toLowerCase(), defaultValue: `reactie gewenst: ${reactieLabel[n.reactieGewenst].toLowerCase()}` })}</p>
    {n.van === "ander" ? (anders ? (<form className="mt-3 flex gap-2" onSubmit={(e) => {
      e.preventDefault(); if (tekst.trim())
        reageerNuAfstemmen(n.id, tekst.trim());
    }}>
      <input autoFocus value={tekst} onChange={(e) => setTekst(e.target.value)} placeholder={t("quickCoordination.yourProposal", "Jouw voorstel")} className="min-w-0 flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm" />
      <button className="rounded-md bg-brand px-3 text-sm font-semibold text-primary-foreground">{t("quickCoordination.send", "Sturen")}</button>
    </form>) : (<div className="mt-3 flex flex-wrap gap-2">
      {n.opties.map((o) => (<button key={o} onClick={() => (o === "Ander voorstel" ? setAnders(true) : reageerNuAfstemmen(n.id, o))} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${o === "Ander voorstel" ? "border border-border text-ink-soft" : "bg-brand text-primary-foreground"}`}>{o === "Ander voorstel" ? t("quickCoordination.otherProposal", "Ander voorstel") : o}</button>))}
    </div>)) : null}
    <p className="mt-2 text-[11px] text-ink-soft">{t("quickCoordination.noAgendaChangeNotice", "Je reactie verandert de agenda niet vanzelf.")}</p>
  </section>);
}
/** Korte flow: categorie, kind, tijdsdruk, één zin. */
export function NuAfstemmenStart({ open, onSluit }) {
  const { t } = useTranslation();
  const [cat, setCat] = useState(null);
  const [kids, setKids] = useState([]);
  const [reactie, setReactie] = useState("zsm");
  const [titel, setTitel] = useState("");
  const reset = () => { setCat(null); setKids([]); setReactie("zsm"); setTitel(""); };
  const verstuur = () => {
    if (!cat || !titel.trim())
      return;
    startNuAfstemmen({ categorie: cat, kindIds: kids.length ? kids : kinderen.map((k) => k.id), titel: titel.trim(), toelichting: "", reactieGewenst: reactie });
    reset();
    onSluit();
  };
  const chip = (aan) => `rounded-full border px-3 py-1.5 text-xs font-semibold ${aan ? "border-accent-warm bg-accent-warm/15 text-ink" : "border-border text-ink-soft"}`;
  return (<Sheet open={open} onOpenChange={(o) => {
    if (!o) {
      reset();
      onSluit();
    }
  }}>
    <SheetContent side="bottom" className="inset-x-0 mx-auto w-full max-w-md max-h-[80dvh] overflow-y-auto rounded-t-2xl bg-background px-5 pb-8">
      <SheetHeader className="pr-8 text-left">
        <SheetTitle className="font-display text-xl font-medium">{t("quickCoordination.sheetTitle", "Heeft dit snel aandacht nodig?")}</SheetTitle>
        <SheetDescription className="text-xs">{t("quickCoordination.sheetDesc", "Gebruik dit als iets rondom je kind niet kan wachten, zoals ziekte, een onverwachte wijziging of een probleem rond de overdracht.")}</SheetDescription>
      </SheetHeader>
      <p className="mt-4 text-xs font-semibold">{t("quickCoordination.whatAbout", "Waar gaat het over?")}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {Object.keys(categorieLabel).map((c) => <button key={c} onClick={() => setCat(c)} className={chip(cat === c)}>{categorieLabel[c]}</button>)}
      </div>
      <p className="mt-4 text-xs font-semibold">{t("quickCoordination.whichChild", "Welk kind?")}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {kinderen.map((k) => <button key={k.id} onClick={() => setKids((s) => (s.includes(k.id) ? s.filter((x) => x !== k.id) : [...s, k.id]))} className={chip(kids.includes(k.id))}>{k.naam}</button>)}
        <span className="self-center text-[11px] text-ink-soft">{t("quickCoordination.unselectedMeansBoth", "Niets gekozen = beide")}</span>
      </div>
      <label className="mt-4 block text-xs font-semibold" htmlFor="na-titel">{t("quickCoordination.whatsHappening", "Wat is er?")}</label>
      <input id="na-titel" value={titel} onChange={(e) => setTitel(e.target.value)} placeholder={t("quickCoordination.placeholder", "Bijv. Ophalen om 15:00 uur lukt niet")} className="mt-2 w-full rounded-md border border-border bg-card px-3 py-2.5 text-sm" />
      <p className="mt-4 text-xs font-semibold">{t("quickCoordination.responseDesired", "Reactie gewenst")}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {Object.keys(reactieLabel).map((r) => <button key={r} onClick={() => setReactie(r)} className={chip(reactie === r)}>{reactieLabel[r]}</button>)}
      </div>
      <button disabled={!cat || !titel.trim()} onClick={verstuur} className="mt-5 w-full rounded-md bg-brand py-3 text-sm font-semibold text-primary-foreground disabled:opacity-40">{t("quickCoordination.sendAction", "Versturen")}</button>
    </SheetContent>
  </Sheet>);
}
