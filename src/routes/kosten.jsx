import { Afrekenen } from "@/components/Afrekenen";
import { GeldInvoer } from "@/components/GeldInvoer";
import { leesGeld } from "@/lib/geld-invoer";
import { zichtbareKostenActies } from "@/lib/kosten-overzicht";
import { Assistent } from "@/components/Assistent";
import { NIET_AKKOORD_STATUS, aanZetBij, beoordeelKosten, budgetMelding, isGedekt, nietAkkoordKostTekst, tegenvoorstelVerstuurdTekst, wachtOpJouwAkkoord } from "@/lib/kosten-akkoord";
import { useKeuzeTeksten } from "@/components/RustigTip";
import { VasteLasten } from "@/components/VasteLasten";
import { GeschiedenisKnop } from "@/components/Geschiedenis";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { Camera, MoreHorizontal, Paperclip, Receipt, X, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { koppelUitgave, useBudgetten } from "@/lib/budget-store";
import { bevestig } from "@/lib/feedback";
import { LanguageSelector } from "@/components/LanguageSelector";
import { AppShell, BackButton } from "@/components/AppShell";
import { AppIcon, Pictogram } from "@/components/AppIcon";
import { BonScanner } from "@/components/BonScanner";
import { BudgetVoorstel } from "@/components/BudgetVoorstel";
import { Badge } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { EigenLeeg } from "@/components/EigenLeeg";
import { useStart, start as startActie, kostenWijzen, kostenMomenten, standaardPct } from "@/lib/start-store";
import { kinderen } from "@/lib/demo-data";
import { setKosten, useKosten, useVerrekenInstellingen, setSleutel, setModus, setOntvangerBevestigt, reageerOpVerrekening, voegBijlageToe, voegOpmerkingToe, useKostExtra, heeftBijlagen, } from "@/lib/kosten-store";
import { DEMO_VANDAAG } from "@/lib/slimme-hulp";
import { afrekenWeergave, verrekeningStatus, berekenSaldo, sleutelVoor, statusLabel, } from "@/lib/verrekening";
export const Route = createFileRoute("/kosten")({
  head: () => ({
    meta: [
      { title: "Kosten — Ouderschap & Co" },
      {
        name: "description",
        content: "Uitgaven voor de kinderen, jullie verdeling en duidelijk zien wie nog welk bedrag betaalt.",
      },
      { property: "og:title", content: "Kosten — Ouderschap & Co" },
      {
        property: "og:description",
        content: "Samen kosten bijhouden en overzichtelijk afrekenen voor de kinderen.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  validateSearch: z.object({ budget: z.string().optional(), uitgave: z.string().optional(), kind: z.string().optional(), benodigdheid: z.string().optional(), bronItem: z.string().optional() }),
  component: KostenPagina,
});
const euro = (n) => n.toLocaleString("nl-NL", { style: "currency", currency: "EUR" });
const categorieen = ["School", "Sport", "Kleding", "Zorg", "Opvang", "Activiteiten", "Medisch", "Overig"];
function KostenPagina() {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language?.startsWith("en");
  const [scherm, setScherm] = useState("overzicht");
  const [berekeningTerug, setBerekeningTerug] = useState("overzicht");
  const [periode, setPeriode] = useState("maand");
  const { uitgave, kind: voorKind, budget, benodigdheid, bronItem } = Route.useSearch();
  const [nieuwOpen, setNieuwOpen] = useState(!!uitgave);
  const [vanBudget, setVanBudget] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const alle = useKosten();
  const { sleutels, modus, ontvangerBevestigt, historie } = useVerrekenInstellingen();
  const saldo = berekenSaldo(alle);
  const netto = saldo.netto; // positief: Joris → Sanne
  const weergave = afrekenWeergave(modus, DEMO_VANDAAG);
  // Alleen wat op jou (Sanne) wacht: een kost die Sanne zelf invoerde wacht op Joris.
  const budgetten = useBudgetten();
  const beoordeling = beoordeelKosten(alle, budgetten, DEMO_VANDAAG);
  const opJou = alle.filter((k) => wachtOpJouwAkkoord(k, beoordeling.get(k.id)));
  const gedekt = alle.filter((k) => isGedekt(k, beoordeling.get(k.id)));
  const keuze = useKeuzeTeksten();
  const [wijzigStart, setWijzigStart] = useState(false);
  const afspraken = budgetten.filter((v) => v.status === "akkoord" || v.status === "uitgegeven");
  const [toonBudgetten, setToonBudgetten] = useState(true);
  const [voorstelKey, setVoorstelKey] = useState(0);
  const [toonAlle, setToonAlle] = useState(false);
  const [alleActies, setAlleActies] = useState(false);
  const [budgetDetail, setBudgetDetail] = useState(budget && budget !== "nieuw" ? budget : null);
  const [manier, setManier] = useState(undefined);
  const [betaalStart, setBetaalStart] = useState(false);
  // Eigen gezin: begin leeg in plaats van met het voorbeeldgezin.
  const startSt = useStart();
  if (startSt.eigen)
    return (<>
      <EigenKosten st={startSt} onNieuw={() => setNieuwOpen(true)} />
      {budget === "nieuw" ? <p className="mx-auto max-w-md px-5 py-3 text-sm text-ink-soft">{t("expenses.jointBudgetProposalSoloHint", "Een gezamenlijk budgetvoorstel kan zodra de andere ouder echt gekoppeld is. Er zijn geen kosten toegevoegd.")}</p> : null}
      {nieuwOpen ? <NieuweUitgave eigen={startSt} sleutels={sleutels} voorinvul={uitgave} voorKind={voorKind} onSluit={() => setNieuwOpen(false)} /> : null}
    </>);
  if (scherm === "berekening")
    return <BerekeningScherm saldo={saldo} onTerug={() => { setScherm(berekeningTerug); setBerekeningTerug("overzicht"); }} />;
  if (scherm === "verrekenen")
    return (<Afrekenen periode={periode} startVerzoek={betaalStart} onTerug={() => { setBetaalStart(false); setScherm("overzicht"); }} onBerekening={() => { setBerekeningTerug("verrekenen"); setScherm("berekening"); }} />);
  if (scherm === "instellingen")
    return (<InstellingenScherm sleutels={sleutels} modus={modus} ontvangerBevestigt={ontvangerBevestigt} onTerug={() => setScherm("overzicht")} />);
  if (scherm === "historie")
    return <HistorieScherm historie={historie} onTerug={() => setScherm("overzicht")} />;
  const openPosten = [...saldo.jorisAanSanne.posten, ...saldo.sanneAanJoris.posten].map((p) => p.post);
  const totaalOpen = openPosten.reduce((s, k) => s + k.bedrag, 0);
  const acties = [
    ...opJou.map((k) => ({ id: k.id, titel: k.omschrijving, bedrag: k.bedrag, status: t("expenses.actionNeeded", "Jouw reactie nodig"), open: () => setDetailId(k.id) })),
  ];
  const ontvangenBudgetten = budgetten.filter((b) => b.aanZet === "Sanne" && (b.status === "wacht" || b.status === "tegenvoorstel"));
  const wachtBevestiging = historie.some((v) => v.status === "wacht-op-ontvanger");
  const opmaak = (nieuweManier) => { setManier(nieuweManier); setNieuwOpen(true); };
  return (<AppShell>
    <div className="flex items-center justify-between">
      <div className="flex items-start gap-3">
        {/* <BackButton terug="/"/> */}
        <div>
          <h1 className="font-display text-3xl leading-tight">{t("expenses.title", "Kosten")}</h1>
          <p className="mt-1 text-sm text-ink-soft">{t("expenses.expensesForChildren", "Uitgaven voor de kinderen")}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <LanguageSelector variant="compact" />
        <Assistent pagina="Kosten" />
        <DropdownMenu>
          <DropdownMenuTrigger aria-label={t("common.actions", "Meer opties")} className="grid size-11 place-items-center rounded-full text-ink-soft hover:bg-muted">
            <MoreHorizontal className="size-5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setScherm("berekening")}>{t("expenses.viewCalculation", "Bekijk berekening")}</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setScherm("historie")}>{t("expenses.settlementHistory", "Historie van afrekeningen")}</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setScherm("instellingen")}>{t("expenses.distributionAndSettlement", "Verdeling & afrekenen")}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>

    <div className="mt-2 animate-in fade-in duration-300">
      <section aria-label={t("expenses.financialOverview", "Financieel overzicht")} className="mt-4 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <AppIcon functie="portemonnee" maat="md" />
          <div><p className="text-xs font-semibold text-ink-soft">{t("expenses.toSettle", "Nog te verrekenen")}</p><p className={`font-display text-2xl font-bold tabular-nums ${netto < -0.009 ? "text-accent-warm" : netto > 0.009 ? "text-brand" : "text-ink"}`}>{euro(Math.abs(netto))}</p></div>
        </div>
        <p className="mt-1 text-xs text-ink-soft">{t("expenses.confirmedExpenses", "{{count}} bevestigde uitgaven", { count: saldo.aantalPosten })}</p>
        <p className="mt-3 text-sm font-semibold">{saldo.aantalPosten === 0 || Math.abs(netto) < 0.01 ? (wachtBevestiging ? t("expenses.paymentWaitingConfirmation", "Betaling wacht op bevestiging") : t("expenses.allSettled", "Alles is verrekend.")) : netto > 0 ? t("expenses.youWillReceive", "Je ontvangt nog {{amount}}.", { amount: euro(Math.abs(netto)) }) : t("expenses.youNeedToPay", "Je moet nog {{amount}} betalen.", { amount: euro(Math.abs(netto)) })}</p>
        {weergave === "tussenstand" && Math.abs(netto) >= 0.01 ? <p className="mt-1 text-xs text-ink-soft">{t("expenses.interimBalanceHint", "Tussenstand · jullie rekenen iedere maand af.")}</p> : null}
        <div className="mt-3 flex flex-wrap gap-2">
          {(saldo.aantalPosten > 0 && Math.abs(netto) >= 0.01 && weergave !== "tussenstand") || historie.some((v) => v.status !== "afgerond" && v.kostIds?.length) ? <Button onClick={() => setScherm("verrekenen")} className="min-h-11 flex-1 shadow-none">{t("expenses.settle", "Afrekenen")}</Button> : null}
          {netto > 0.009 && weergave !== "tussenstand" ? <Button variant="outline" className="min-h-11" onClick={() => setScherm("verrekenen")}>{t("expenses.paymentRequest", "Betaalverzoek")}</Button> : null}
          <Button variant="outline" onClick={() => setScherm("berekening")} className="min-h-11 flex-1 shadow-none">{t("expenses.viewCalc", "Bekijk berekening")}</Button>
        </div>
      </section>

      {/* Prominent main button: Kosten toevoegen (Receipt scanning is inside the modal flow) */}
      <Button className="mt-4 min-h-12 w-full text-base font-bold shadow-xs flex items-center justify-center gap-2" onClick={() => opmaak()}>
        <AppIcon functie="toevoegen" vorm="kaal" />
        <span>{t("expenses.addExpenseMain", "Kosten toevoegen")}</span>
      </Button>

      {/* Action shortcuts */}
      <div className="mt-2.5 grid grid-cols-2 gap-2">
        <Button variant="outline" className="h-auto min-h-[72px] justify-start whitespace-normal px-3 py-2.5 text-left rounded-xl border-border" onClick={() => { setToonBudgetten(true); setVoorstelKey((k) => k + 1); }}>
          <AppIcon functie="voorstel" maat="sm" vorm="kaal" />
          <span className="min-w-0">
            <span className="block text-sm font-semibold">{t("expenses.submitBudgetProposal", "Budgetvoorstel indienen")}</span>
            <span className="mt-0.5 block text-xs font-normal text-ink-soft">{t("expenses.agreeInAdvance", "Spreek vooraf een bedrag af.")}</span>
          </span>
        </Button>
        <Button variant="outline" className="h-auto min-h-[72px] justify-start whitespace-normal px-3 py-2.5 text-left rounded-xl border-border" onClick={() => { setBetaalStart(true); setScherm("verrekenen"); }}>
          <AppIcon functie="betaalverzoek" maat="sm" vorm="kaal" />
          <span className="min-w-0">
            <span className="block text-sm font-semibold">{t("expenses.paymentRequest", "Betaalverzoek")}</span>
            <span className="mt-0.5 block text-xs font-normal text-ink-soft">{t("expenses.requestPaymentDesc", "Vraag een betaling aan.")}</span>
          </span>
        </Button>
      </div>

      {acties.length || ontvangenBudgetten.length ? <section className="mt-5" aria-label={t("expenses.actionNeeded", "Jouw reactie nodig")}>
        <h2 className="font-display text-lg font-bold">{t("expenses.actionNeeded", "Jouw reactie nodig")} <span className="text-sm font-normal text-ink-soft">({acties.length + ontvangenBudgetten.length})</span></h2>
        <div className="mt-1 divide-y divide-border border-y border-border">
          {ontvangenBudgetten.map((b) => <Button key={b.id} variant="ghost" onClick={() => setBudgetDetail(b.id)} className="h-auto min-h-14 w-full justify-between gap-3 whitespace-normal px-0 py-3 text-left"><span className="min-w-0"><span className="block text-sm font-semibold">{b.wat}</span><span className="block text-xs text-accent-warm">{t("expenses.actionNeeded", "Jouw reactie nodig")}</span></span><ChevronRight className="size-5 shrink-0 text-brand" /></Button>)}
          {zichtbareKostenActies(acties, alleActies).map((a) => <Button key={a.id} variant="ghost" onClick={a.open} aria-label={`Open ${a.titel}`} className="h-auto min-h-16 w-full justify-between gap-3 rounded-none px-0 py-2.5 text-left whitespace-normal">
            <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{a.titel}</span><span className="block text-xs font-normal text-accent-warm">{a.status}</span></span>
            <span className="shrink-0 text-sm font-bold tabular-nums">{euro(a.bedrag)}</span><ChevronRight className="size-5 shrink-0 text-brand" />
          </Button>)}
        </div>
        {acties.length > 3 ? <Button variant="link" onClick={() => setAlleActies((v) => !v)} className="min-h-11 px-0">{alleActies ? "Toon minder" : "Bekijk alle openstaande acties"}</Button> : null}
      </section> : null}

      {/* SECTION 1: Budget proposals (pending proposals and responses) */}
      <section className="mt-6 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="font-display text-lg font-bold text-ink">{t("expenses.budgetProposalsTitle", "Budgetvoorstellen")}</h2>
            <p className="mt-0.5 text-xs text-ink-soft">{t("expenses.budgetProposalsDesc", "Openstaande voorstellen en reacties · tellen nog niet mee in je saldo.")}</p>
          </div>
        </div>
        <div className="mt-2">
          <BudgetVoorstel key={voorstelKey} filter="lopend" bronItem={bronItem} voorinvul={benodigdheid} voorKind={voorKind} startOpen={budget === "nieuw" || voorstelKey > 0} onUitgave={(b) => { setVanBudget(b); setNieuwOpen(true); }} />
        </div>
      </section>

      {/* SECTION 2: Agreed budgets (approved by both parents) */}
      <section className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-50/20 dark:bg-emerald-950/10 p-4">
        <div>
          <h2 className="font-display text-lg font-bold text-ink">{t("expenses.agreedBudgetsTitle", "Afgesproken budgetten")}</h2>
          <p className="mt-0.5 text-xs text-ink-soft">{t("expenses.agreedBudgetsDesc", "Budgetten die door beide ouders zijn goedgekeurd.")}</p>
        </div>
        <div className="mt-2">
          <BudgetVoorstel filter="afgesproken" onUitgave={(b) => { setVanBudget(b); setNieuwOpen(true); }} />
        </div>
        <Button variant="link" onClick={() => setScherm("instellingen")} className="mt-2 px-0 text-xs text-brand font-semibold">{t("expenses.distributionAndSettlement", "Verdeling & afrekenen instellen →")}</Button>
      </section>

      {/* Eerdere voorstellen */}
      <section className="mt-6 rounded-2xl border border-border bg-card/60 p-4">
        <h2 className="font-display text-base font-bold text-ink">{t("expenses.previousProposals", "Eerdere voorstellen")}</h2>
        <p className="mt-0.5 text-xs text-ink-soft">{t("expenses.previousProposalsDesc", "Afgewezen of ingetrokken. Ze blijven bewaard.")}</p>
        <div className="mt-2">
          <BudgetVoorstel filter="eerder" onUitgave={(b) => { setVanBudget(b); setNieuwOpen(true); }} />
        </div>
      </section>

      <section className="mt-6">
        <button onClick={() => setToonAlle((o) => !o)} aria-expanded={toonAlle} className="flex min-h-12 w-full items-center justify-between rounded-md border border-border px-4 text-sm font-semibold">
          <span>{t("expenses.allRecordedExpenses", "Alle gemaakte kosten")}</span>
          <span className="inline-flex items-center gap-1 text-xs font-normal text-ink-soft">
            <span>{alle.length}</span>
            <ChevronDown className={"size-4 transition-transform " + (toonAlle ? "rotate-180" : "")} />
          </span>
        </button>
        {toonAlle ? <Transacties alle={alle} historie={historie} onOpen={setDetailId} /> : null}
      </section>
    </div>

    {nieuwOpen ? <NieuweUitgave sleutels={sleutels} budget={vanBudget} voorinvul={uitgave} voorKind={voorKind} startManier={manier} onSluit={() => { setNieuwOpen(false); setVanBudget(null); setManier(undefined); }} /> : null}
    {budgetDetail ? <Sheet open onOpenChange={(o) => {
      if (!o)
        setBudgetDetail(null);
    }}><SheetContent side="bottom" className="inset-x-0 mx-auto w-full max-w-md max-h-[80dvh] overflow-y-auto rounded-t-2xl bg-background px-5 pb-8 pt-4"><SheetHeader className="pr-8 text-left"><SheetTitle>{t("expenses.budgetDetailTitle", "Budgetdetails")}</SheetTitle><SheetDescription>{t("expenses.budgetDetailDesc", "Bekijk jullie budget en de bestaande afspraken.")}</SheetDescription></SheetHeader><div className="mt-3"><BudgetVoorstel doelId={budgetDetail} onKlaar={() => setBudgetDetail(null)} onUitgave={(b) => { setBudgetDetail(null); setVanBudget(b); setNieuwOpen(true); }} /></div></SheetContent></Sheet> : null}
    <KostDetail key={detailId ?? ""} startWijzig={wijzigStart} kost={alle.find((k) => k.id === detailId) ?? null} onSluit={() => { setDetailId(null); setWijzigStart(false); }} onVerrekenen={() => { setDetailId(null); setScherm("verrekenen"); }} />
  </AppShell>);
}
function kostStatus(k, t) {
  const s = k.status;
  if (s === "betaald" || s === "verrekend")
    return { label: t ? t("expenses.detail.statusSettled", "Afgerekend") : "Afgerekend", toon: "klaar" };
  if (s === "openstaand" || s === "bevestigd")
    return { label: t ? t("expenses.toSettle", "Nog te verrekenen") : "Nog te verrekenen", toon: "info" };
  if (s === "wacht")
    return { label: aanZetBij(k) === "sanne" ? (t ? t("expenses.actionNeeded", "Jouw reactie nodig") : "Jouw reactie nodig") : (t ? t("expenses.waitingForOther", "Wacht op reactie van de andere ouder") : "Wacht op reactie van de andere ouder"), toon: "actie" };
  return { label: statusLabel[s] ?? s, toon: "neutraal" };
}
function KostRij({ k, onOpen }) {
  const { t } = useTranslation();
  const kostenBron = useKosten();
  const budgetBron = useBudgetten();
  const gedekt = beoordeelKosten(kostenBron, budgetBron, DEMO_VANDAAG).get(k.id)?.soort === "gedekt";
  const st = gedekt ? { label: t("expenses.toSettle", "Nog te verrekenen"), toon: "info" } : kostStatus(k, t);
  return (<div id={`item-${k.id}`} role="button" tabIndex={0} onClick={onOpen} onKeyDown={(e) => {
    if (e.key === "Enter")
      onOpen();
  }} className="zoekdoel flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5">
    <Pictogram waarde={k.icoon} maat="md" />
    <div className="min-w-0 flex-1">
      <p className="flex items-center gap-1 text-sm font-semibold"><span className="truncate">{k.omschrijving}</span>{heeftBijlagen(k.id) ? <Paperclip className="size-3.5 shrink-0 text-ink-soft" aria-label="Met bijlage" /> : null}</p>
      <p className="text-xs text-ink-soft">{k.kind} · {k.categorie} · {k.datum}</p>
      <p className="text-[11px] text-ink-soft/80">{k.betaaldDoor === "sanne" ? t("expenses.paidByYou", "Jij betaald") : t("expenses.paidByOther", { name: "Joris", defaultValue: "Joris betaald" })} · {k.verdeling}</p>
    </div>
    <div className="text-right">
      <p className="text-sm font-bold tabular-nums">{euro(k.bedrag)}</p>
      <Badge toon={st.toon} className="mt-1">{st.label}</Badge>
    </div>
  </div>);
}
function Transacties({ alle, historie, onOpen }) {
  const { t } = useTranslation();
  const [kind, setKind] = useState("Alle");
  const [cat, setCat] = useState("Alle");
  const [status, setStatus] = useState("Alle");
  const [periode, setPeriode] = useState("Alle");
  const maanden = [...new Set(alle.map((k) => k.datum.split(" ").slice(1).join(" ")).filter(Boolean))];
  const lijst = alle.filter((k) => !k.isBudget && k.status !== "voorstel" &&
    (kind === "Alle" || k.kind === kind) &&
    (cat === "Alle" || k.categorie === cat) &&
    (status === "Alle" || kostStatus(k, t).label === status) &&
    (periode === "Alle" || k.datum.endsWith(periode)));
  const Kies = ({ label, waarde, opties, onChange }) => (<label className="flex flex-col gap-1 text-[11px] font-semibold text-ink-soft">{label}
    <select value={waarde} onChange={(e) => onChange(e.target.value)} className="min-h-10 rounded-md border border-border bg-card px-2 text-sm font-normal text-ink">
      {["Alle", ...opties].map((o) => <option key={o}>{o === "Alle" ? t("common.all", "Alle") : o}</option>)}
    </select>
  </label>);
  return (<div className="animate-in fade-in duration-300">
    <div className="mt-5 grid grid-cols-2 gap-2">
      <Kies label={t("expenses.child", "Kind")} waarde={kind} opties={[...new Set(alle.map((k) => k.kind))]} onChange={setKind} />
      <Kies label={t("expenses.period", "Periode")} waarde={periode} opties={maanden} onChange={setPeriode} />
      <Kies label={t("expenses.category", "Categorie")} waarde={cat} opties={[...new Set(alle.map((k) => k.categorie))]} onChange={setCat} />
      <Kies label={t("expenses.status", "Status")} waarde={status} opties={[...new Set(alle.map((k) => kostStatus(k, t).label))]} onChange={setStatus} />
    </div>
    <h2 className="mt-5 font-display text-lg font-bold">{t("expenses.title", "Kosten")} <span className="text-sm font-normal text-ink-soft">({lijst.length})</span></h2>
    <div className="mt-2 space-y-2">
      {lijst.length === 0 ? <p className="text-sm text-ink-soft">{t("expenses.noExpensesMatchingFilters", "Geen kosten met deze filters.")}</p> : lijst.map((k) => <KostRij key={k.id} k={k} onOpen={() => onOpen(k.id)} />)}
    </div>
    <h2 className="mt-6 font-display text-lg font-bold">{t("expenses.settlementsAndPayments", "Afrekeningen en betalingen")}</h2>
    <div className="mt-2 divide-y divide-border border-y border-border">
      {historie.map((v) => (<div key={v.id} className="flex items-center gap-3 py-3">
        <AppIcon functie="portemonnee" maat="sm" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{v.maand}</p>
          <p className="text-xs text-ink-soft">{v.datum} · {v.wijze}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold tabular-nums">{euro(v.bedrag)}</p>
          <Badge toon={v.status === "afgerond" ? "klaar" : "actie"} className="mt-1">{verrekeningStatus(v.status)}</Badge>
        </div>
      </div>))}
    </div>
    <p className="mt-3 text-xs text-ink-soft">Betalen via de app (bijvoorbeeld iDEAL) is nog niet beschikbaar. Een betaling staat pas als verrekend wanneer de ontvanger die heeft bevestigd.</p>
  </div>);
}
// --- Berekening: exact zichtbaar hoe het saldo is opgebouwd ---
function BerekeningScherm({ saldo, onTerug }) {
  const { t } = useTranslation();
  const posten = [...saldo.jorisAanSanne.posten, ...saldo.sanneAanJoris.posten].map((p) => p.post);
  const totaal = posten.reduce((n, k) => n + k.bedrag, 0);
  const jouw = posten.reduce((n, k) => n + k.aandeelSanne, 0);
  return (<AppShell>
    <div className="flex items-start gap-3">
      {/* <button onClick={onTerug} className="knop-kruis mt-2 size-9 shrink-0" aria-label="Terug">
        <span className="text-lg leading-none">‹</span>
      </button> */}
      <div>
        <h1 className="font-display text-2xl font-extrabold leading-tight">{t("expenses.calc.title", "Berekening")}</h1>
        <p className="mt-1 text-sm text-ink-soft">{t("expenses.calc.subtitle", "Zo hebben we berekend wie nog welk bedrag betaalt.")}</p>
      </div>
    </div>

    <dl className="mt-5 divide-y divide-border border-y border-border text-sm">
      {[
        [t("expenses.calc.totalOutstanding", "Totaal openstaand"), totaal],
        [t("expenses.calc.yourShare", "Jouw aandeel"), jouw],
        [t("expenses.calc.otherShare", "Aandeel Joris"), totaal - jouw],
        [t("expenses.calc.advancedByYou", "Voorgeschoten door jou"), posten.filter((k) => k.betaaldDoor === "sanne").reduce((n, k) => n + k.bedrag, 0)],
        [t("expenses.calc.advancedByOther", "Voorgeschoten door Joris"), posten.filter((k) => k.betaaldDoor !== "sanne").reduce((n, k) => n + k.bedrag, 0)]
      ].map(([label, bedrag]) => <div key={label} className="flex justify-between gap-3 py-2.5"><dt className="text-ink-soft">{label}</dt><dd className="font-semibold">{euro(Number(bedrag))}</dd></div>)}
    </dl>

    <section className="mt-5">
      <h2 className="font-display text-lg font-bold">{t("expenses.calc.toPayByOtherToYou", "Te betalen door Joris aan Sanne")}</h2>
      <ul className="mt-2 divide-y divide-border">
        {saldo.jorisAanSanne.posten.map(({ post, aandeel }) => (<li key={post.id} className="flex items-center justify-between py-2.5 text-sm">
          <span className="flex items-center gap-2"><Pictogram waarde={post.icoon} maat="sm" vorm="kaal" />{post.omschrijving}</span>
          <span className="font-semibold">{euro(aandeel)}</span>
        </li>))}
      </ul>
      <p className="border-t border-border pt-2.5 text-right text-sm font-bold">Totaal {euro(saldo.jorisAanSanne.totaal)}</p>
    </section>

    <section className="mt-6">
      <h2 className="font-display text-lg font-bold">{t("expenses.calc.toPayByYouToOther", "Te betalen door Sanne aan Joris")}</h2>
      <ul className="mt-2 divide-y divide-border">
        {saldo.sanneAanJoris.posten.map(({ post, aandeel }) => (<li key={post.id} className="flex items-center justify-between py-2.5 text-sm">
          <span className="flex items-center gap-2"><Pictogram waarde={post.icoon} maat="sm" vorm="kaal" />{post.omschrijving}</span>
          <span className="font-semibold">{euro(aandeel)}</span>
        </li>))}
      </ul>
      <p className="border-t border-border pt-2.5 text-right text-sm font-bold">Totaal {euro(saldo.sanneAanJoris.totaal)}</p>
    </section>

    <section className="mt-6 rounded-lg border border-border bg-card p-5 text-center">
      <p className="text-[11px] font-semibold tracking-[0.14em] text-brand uppercase">{t("expenses.calc.afterSettlement", "Na verrekening")}</p>
      <p className="mt-2 text-sm text-ink-soft">
        {euro(saldo.jorisAanSanne.totaal)} − {euro(saldo.sanneAanJoris.totaal)}
      </p>
      <p className="mt-1 font-display text-2xl font-extrabold text-accent-warm">
        {saldo.netto >= 0 ? "Joris → Sanne" : "Sanne → Joris"}: {euro(Math.abs(saldo.netto))}
      </p>
    </section>
  </AppShell>);
}
// --- Instellingen: verdeelsleutels, modus, ontvangerbevestiging ---
function InstellingenScherm({ sleutels, modus, ontvangerBevestigt, onTerug, }) {
  const { t } = useTranslation();
  return (<AppShell>
    <div className="flex items-start gap-3">
      {/* <button onClick={onTerug} className="knop-kruis mt-2 size-9 shrink-0" aria-label="Terug">
        <span className="text-lg leading-none">‹</span>
      </button> */}
      <div>
        <h1 className="font-display text-2xl font-extrabold leading-tight">{t("expenses.settingsSection.title", "Verdeling & afrekenen")}</h1>
        <p className="mt-1 text-sm text-ink-soft">{t("expenses.settingsSection.subtitle", "Jullie bepalen zelf de verdeling — de app rekent alleen mee.")}</p>
      </div>
    </div>

    <section className="mt-5">
      <h2 className="font-display text-lg font-bold">{t("expenses.settingsSection.standardDistribution", "Standaard kostenverdeling")}</h2>
      <p className="text-xs text-ink-soft">{t("expenses.settingsSection.standardDistributionDesc", "Wordt voorgesteld bij nieuwe uitgaven. Per uitgave kun je afwijken.")}</p>
      <div className="mt-3 divide-y divide-border rounded-lg border border-border bg-card">
        {Object.entries(sleutels).map(([cat, s]) => (<div key={cat} className="flex items-center justify-between px-4 py-3">
          <p className="text-sm font-semibold">{cat}</p>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-ink-soft">Sanne</span>
            <select value={s.sanne} onChange={(e) => setSleutel(cat, Number(e.target.value))} className="rounded-md border border-border bg-background px-2 py-1 text-sm">
              {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((p) => (<option key={p} value={p}>{p}%</option>))}
            </select>
            <span className="text-ink-soft">/ Joris {s.joris}%</span>
          </div>
        </div>))}
      </div>
    </section>

    <section className="mt-6">
      <h2 className="font-display text-lg font-bold">{t("expenses.settingsSection.whenSettle", "Wanneer rekenen jullie de kosten af?")}</h2>
      <p className="mt-2 text-sm text-ink-soft">{t("expenses.settingsSection.whenSettleDesc", "Op het gekozen moment berekenen we wie nog welk bedrag aan de ander moet betalen. Zo hoeven jullie niet iedere losse uitgave apart af te rekenen.")}</p>
      <div className="mt-3 space-y-2 rounded-lg border border-border bg-card p-4">
        {[
          ["direct", t("expenses.settingsSection.afterEachExpense", "Na iedere uitgave")],
          ["maandelijks", t("expenses.settingsSection.monthly", "Iedere maand")],
          ["zelf", t("expenses.settingsSection.decideYourselves", "Zelf bepalen")],
        ].map(([m, label]) => (<label key={m} className="flex items-start gap-3 text-sm">
          <input type="radio" name="modus" checked={modus === m} onChange={() => setModus(m)} className="mt-0.5 size-4 accent-[var(--color-brand)]" />
          {label}
        </label>))}
      </div>
    </section>

    <section className="mt-6">
      <label className="flex items-start gap-3 rounded-lg border border-border bg-card p-4 text-sm">
        <input type="checkbox" checked={ontvangerBevestigt} onChange={(e) => setOntvangerBevestigt(e.target.checked)} className="mt-0.5 size-4 accent-[var(--color-brand)]" />
        <span>
          <b>{t("expenses.settingsSection.confirmByRecipient", "Betaling door ontvanger laten bevestigen.")}</b> {t("expenses.settingsSection.confirmByRecipientDesc", "De ander bevestigt zodra het bedrag ontvangen is.")}
        </span>
      </label>
    </section>
  </AppShell>);
}
// --- Historie ---
function HistorieScherm({ historie, onTerug, }) {
  const { t } = useTranslation();
  return (<AppShell>
    <div className="flex items-start gap-3">
      {/* <button onClick={onTerug} className="knop-kruis mt-2 size-9 shrink-0" aria-label="Terug">
        <span className="text-lg leading-none">‹</span>
      </button> */}
      <div>
        <h1 className="font-display text-2xl font-extrabold leading-tight">{t("expenses.historySection.title", "Historie")}</h1>
        <p className="mt-1 text-sm text-ink-soft">{t("expenses.historySection.subtitle", "Eerdere betalingen tussen jullie.")}</p>
      </div>
    </div>
    <ul className="mt-5 divide-y divide-border">
      {historie.map((v) => (<li key={v.id} className="py-3.5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">{v.maand}</p>
          <Badge>{verrekeningStatus(v.status)}</Badge>
        </div>
        <p className="mt-0.5 text-sm text-ink-soft">
          {v.bedrag === 0
            ? t("expenses.historySection.noPaymentNeeded", "Geen betaling nodig")
            : `${euro(v.bedrag)} · ${v.van === "joris" ? "Joris → Sanne" : "Sanne → Joris"} · ${v.wijze}`}
        </p>
        <p className="text-[11px] text-ink-soft/80">{v.datum}</p>
        {v.status === "wacht-op-ontvanger" && v.aan === "sanne" ? (<Button className="mt-2 min-h-11 shadow-none" onClick={() => {
          if (reageerOpVerrekening(v.id, "sanne", "ontvangen"))
            bevestig("Ontvangst bevestigd.");
        }}>{t("expenses.historySection.confirmReceived", { amount: euro(v.bedrag), defaultValue: `Ik heb ${euro(v.bedrag)} ontvangen` })}</Button>) : null}
        {v.status === "ontvangst-bevestigd" && v.aan === "sanne" ? <Button className="mt-2" onClick={() => {
          if (reageerOpVerrekening(v.id, "sanne", "afronden"))
            bevestig("Afrekening afgerond.");
        }}>{t("expenses.detail.agree", "Afrekening afronden")}</Button> : null}
      </li>))}
    </ul>
  </AppShell>);
}
let bewaardConcept = null;
/** Gescande bon wordt een gewone kostenpost die wacht op de andere ouder — nooit automatisch goedgekeurd. */
function bonAlsKost(b) {
  const m = b.verdeling.match(/^(\d+) \/ (\d+)$/);
  const pct = b.verdeling === "Volledig Sanne" ? 100 : b.verdeling === "Volledig Joris" ? 0 : m ? Number(m[1]) : 50;
  setKosten((l) => [{ ...l[0], id: b.id ?? String(Date.now()), omschrijving: b.omschrijving, categorie: "Bon", icoon: "🧾", kind: b.kind, datum: b.datum ?? "12 maart", bedrag: b.bedrag, betaaldDoor: "sanne", verdeling: `${pct} / ${100 - pct}`, aandeelSanne: Math.round(b.bedrag * pct) / 100, status: "wacht" }, ...l]);
  bevestig("Uitgave opgeslagen", { uitleg: "Wacht op bevestiging van Joris" });
}
function NieuweUitgave({ sleutels, budget: startBudget, voorinvul, voorKind, onSluit, eigen, startManier, }) {
  const { t } = useTranslation();
  const budgetten = useBudgetten();
  const bronKosten = useKosten();
  const [budget, setBudget] = useState(startBudget ?? null);
  const ikNaam = eigen ? eigen.naam || t("expenses.modal.you", "Jij") : "Sanne";
  const anderNaam = eigen ? t("expenses.otherShare", "Andere ouder") : "Joris";
  const eigenPct = eigen ? standaardPct(eigen.kostenAfspraak) : 50;
  const kindKeuzes = eigen ? [...eigen.kinderen.map((k) => k.naam), ...(eigen.kinderen.length > 1 ? ["Alle kinderen"] : []), "Gezin/algemeen"] : [...kinderen.map((k) => k.naam), "Beide kinderen", "Gezin/algemeen"];
  // Uit een bericht: bedrag alleen voorstellen als er een herkenbaar €-bedrag in staat; gebruiker controleert altijd.
  const bedragUitTekst = voorinvul?.match(/€\s?(\d+(?:[.,]\d{1,2})?)/)?.[1] ?? "";
  const start = !budget && !voorinvul && !eigen ? bewaardConcept : null;
  const [omschrijving, setOmschrijving] = useState(start?.omschrijving ?? budget?.wat ?? voorinvul?.replace(/€\s?\d+(?:[.,]\d{1,2})?/, "").replace(/\s+/g, " ").trim().slice(0, 60) ?? "");
  const [bedragTekst, setBedragTekst] = useState(start?.bedragTekst ?? (budget ? String(budget.max).replace(".", ",") : bedragUitTekst));
  const [betaaldDoor, setBetaaldDoor] = useState(start?.betaaldDoor ?? "sanne");
  const [kind, setKind] = useState(start?.kind ?? (budget ? (budget.kind.includes("&") ? "Beide kinderen" : budget.kind) : voorKind === "Allebei" ? "Beide kinderen" : voorKind ?? (eigen ? kindKeuzes[0] : "Emma")));
  const [categorie, setCategorie] = useState(start?.categorie ?? "School");
  const [manier, setManier] = useState(startManier ?? "hand");
  const [datum, setDatum] = useState(new Date().toLocaleDateString("sv-SE"));
  const [toelichting, setToelichting] = useState("");
  const [meer, setMeer] = useState(false);
  const [vraagSluiten, setVraagSluiten] = useState(false);
  const [verdeling, setVerdeling] = useState(budget ? (budget.pctSanne === 50 ? "50" : "anders") : eigen?.kostenAfspraak.wijze === "per-uitgave" ? "50" : "standaard");
  const [pctSanne, setPctSanne] = useState(budget?.pctSanne ?? 60);
  const [bon, setBon] = useState("");
  const [bijlage, setBijlage] = useState("");
  const [extraKeuze, setExtraKeuze] = useState(null);
  const navigeer = useNavigate();
  const bedrag = leesGeld(bedragTekst) ?? 0;
  const sleutel = eigen ? { sanne: eigenPct ?? 100, joris: 100 - (eigenPct ?? 100) } : sleutelVoor(sleutels, categorie);
  const alleenBijhouden = !!eigen && eigenPct === null;
  const effectiefSanne = verdeling === "standaard" ? sleutel.sanne : verdeling === "50" ? 50 : verdeling === "volledig" ? 100 : pctSanne;
  const deelSanne = Math.round(bedrag * effectiefSanne) / 100;
  const deelJoris = Math.round((bedrag - deelSanne) * 100) / 100;
  const ingevuld = manier === "hand" && !budget && !voorinvul && !!(omschrijving.trim() || bedragTekst.trim() || bon || bijlage);
  const probeerSluiten = () => (ingevuld ? setVraagSluiten(true) : onSluit());
  useEffect(() => {
    const esc = (e) => {
      if (e.key === "Escape")
        probeerSluiten();
    };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  });
  const budgetBeoordeling = budget ? beoordeelKosten([...bronKosten, { id: "invoer", omschrijving, categorie: budget.categorie ?? categorie, kind, datum, bedrag, status: "wacht", betaaldDoor, aandeelSanne: Math.round(bedrag * budget.pctSanne) / 100, budgetId: budget.id }], budgetten, datum).get("invoer") : null;
  const budgetRest = budgetBeoordeling?.soort === "boven" ? budgetBeoordeling.rest : budget?.max ?? 0;
  const overschot = budget ? Math.round((bedrag - budgetRest) * 100) / 100 : 0;
  const overschreden = budgetBeoordeling?.soort === "boven" && overschot > 0.009;
  const opslaan = () => {
    if (!omschrijving.trim() || bedrag <= 0 || !datum || !kind)
      return;
    if (overschreden && !extraKeuze)
      return;
    if (eigen) {
      startActie.kostToevoegen({ id: `ek-${Date.now()}`, omschrijving, categorie, kind, datum, bedrag, pctIk: alleenBijhouden ? null : effectiefSanne, bon: bon || undefined });
      bevestig(t("expenses.modal.savedExpenseNotification", "Uitgave opgeslagen"), { uitleg: omschrijving });
      onSluit();
      return;
    }
    bewaardConcept = null;
    const id = String(Date.now());
    // Bij overschrijding: het afgesproken deel volgt de budgetverdeling; het extra deel apart.
    const basis = overschreden ? budgetRest : bedrag;
    const pctBasis = budget ? budget.pctSanne : effectiefSanne;
    const pctExtra = extraKeuze === "eigen" ? (betaaldDoor === "sanne" ? 100 : 0) : pctBasis;
    setKosten((l) => [
      ...(overschreden ? [{
        ...l[0],
        id: `${id}-extra`,
        omschrijving: `${omschrijving} · extra boven budget`,
        categorie,
        icoon: "🧾",
        kind,
        datum,
        bedrag: overschot,
        betaaldDoor,
        verdeling: `${pctExtra} / ${100 - pctExtra}`,
        aandeelSanne: Math.round(overschot * pctExtra) / 100,
        // Eigen rekening: geen verrekening nodig. Ter afstemming: wacht op instemming van de andere ouder.
        status: (extraKeuze === "eigen" ? "verrekend" : "wacht"),
      }] : []),
      {
        ...l[0],
        id,
        omschrijving,
        categorie,
        icoon: "🧾",
        kind,
        datum,
        bedrag: basis,
        betaaldDoor,
        verdeling: `${pctBasis} / ${100 - pctBasis}`,
        aandeelSanne: Math.round(basis * pctBasis) / 100,
        budgetId: budget?.id,
        status: "wacht",
      },
      ...l,
    ]);
    if (bon)
      voegBijlageToe(id, bon, "bon", omschrijving);
    if (bijlage)
      voegBijlageToe(id, bijlage, "bijlage", omschrijving);
    if (toelichting.trim())
      voegOpmerkingToe(id, toelichting.trim(), omschrijving);
    if (budget)
      koppelUitgave(budget.id, id, bedrag);
    bevestig(t("expenses.modal.savedExpenseNotification", "Uitgave opgeslagen"), { uitleg: omschrijving });
    onSluit();
  };
  return (<div className="fixed inset-0 z-30 flex items-end justify-center bg-ink/30 px-5 pb-5" onClick={probeerSluiten}>
    <div role="dialog" aria-modal="true" aria-label={budget ? t("expenses.modal.titleAdd", "Uitgave toevoegen") : t("expenses.modal.titleNew", "Nieuwe uitgave")} className="relative max-h-[85vh] w-full max-w-md overflow-y-auto rounded-lg border border-border bg-background p-5" onClick={(e) => e.stopPropagation()} onTouchStart={(e) => { e.currentTarget.dataset["y"] = String(e.touches[0]?.clientY ?? 0); }} onTouchEnd={(e) => {
      const el = e.currentTarget; const dy = (e.changedTouches[0]?.clientY ?? 0) - Number(el.dataset["y"] ?? 0); if (dy > 90 && el.scrollTop <= 0)
        probeerSluiten();
    }}>
      <button type="button" onClick={probeerSluiten} aria-label={t("expenses.modal.close", "Sluiten")} className="knop-kruis absolute right-2 top-2 size-11"><X className="size-5" /></button>
      <p className="pr-10 font-display text-lg font-bold">{budget ? t("expenses.modal.titleAdd", "Uitgave toevoegen") : t("expenses.modal.titleNew", "Nieuwe uitgave")}</p>
      {vraagSluiten ? (<div className="mt-4 space-y-2 border-y border-border py-4">
        <p className="text-sm font-semibold">{t("expenses.modal.saveDraftPrompt", "Wil je deze uitgave bewaren als concept?")}</p>
        <button onClick={() => { bewaardConcept = { omschrijving, bedragTekst, betaaldDoor, kind, categorie }; bevestig(t("expenses.modal.conceptSavedNotification", "Concept bewaard")); onSluit(); }} className="min-h-11 w-full rounded-md bg-brand text-sm font-semibold text-primary-foreground">{t("expenses.modal.saveDraft", "Concept bewaren")}</button>
        <button onClick={() => { bewaardConcept = null; onSluit(); }} className="min-h-11 w-full rounded-md border border-border text-sm font-semibold text-ink-soft">{t("expenses.modal.delete", "Verwijderen")}</button>
        <button onClick={() => setVraagSluiten(false)} className="min-h-11 w-full text-sm font-semibold text-brand">{t("expenses.modal.continueEditing", "Verder invullen")}</button>
      </div>) : manier === "kies" ? (<div className="mt-4 space-y-2">
        <button onClick={() => setManier("scan")} className="flex min-h-14 w-full items-center gap-3 rounded-md border border-border px-3 text-left text-sm font-semibold"><AppIcon functie="foto" maat="md" />{t("expenses.modal.scanReceipt", "Bon scannen")}</button>
        <button onClick={() => setManier("hand")} className="flex min-h-14 w-full items-center gap-3 rounded-md border border-border px-3 text-left text-sm font-semibold"><AppIcon functie="notitie" maat="md" />{t("expenses.modal.manualInput", "Handmatig invoeren")}</button>
      </div>) : manier === "scan" ? (<div className="mt-4 space-y-2">
        <p className="text-xs text-ink-soft">{t("expenses.modal.scanDescription", "De herkende gegevens worden vooraf ingevuld. Je controleert alles vóór het opslaan.")}</p>
        <BonScanner standaardPct={eigen ? eigenPct ?? 100 : sleutel.sanne} onKosten={(b) => {
          if (eigen)
            startActie.kostToevoegen({ id: `ek-${Date.now()}`, omschrijving: b.omschrijving, categorie: "Bon", kind: kindKeuzes[0], datum: new Date().toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" }), bedrag: b.bedrag, pctIk: eigenPct });
          else
            bonAlsKost(b); onSluit();
        }} onDocument={() => onSluit()} />
        <button onClick={() => setManier("hand")} className="min-h-11 text-sm font-semibold text-brand">{t("expenses.modal.preferManual", "Liever handmatig invoeren")}</button>
      </div>) : <>
        {budget ? <p className="mt-1 text-xs text-ink-soft">{t("expenses.modal.agreedBudgetNotice", { max: euro(budget.max), pct: budget.pctSanne, otherPct: 100 - budget.pctSanne, defaultValue: `Afgesproken budget: ${euro(budget.max)} · verdeling ${budget.pctSanne} / ${100 - budget.pctSanne}. Vul het werkelijke bedrag in.` })}</p> : null}
        <Button variant="link" className="px-0" onClick={() => setManier("scan")}><AppIcon functie="foto" maat="sm" vorm="kaal" />{t("expenses.modal.scanReceipt", "Bon scannen")}</Button>
        <div className="mt-4 space-y-3">
          <input value={omschrijving} onChange={(e) => setOmschrijving(e.target.value)} placeholder={eigen ? t("expenses.modal.descPlaceholderEigen", "Omschrijving, bijv. Zwemles") : t("expenses.modal.descPlaceholderDemo", "Omschrijving, bijv. Voetbalschoenen Noah")} className="w-full rounded-md border border-border bg-card px-4 py-3 text-sm outline-none placeholder:text-ink-soft/70" />
          <GeldInvoer value={bedragTekst} onChange={setBedragTekst} label={t("expenses.modal.amount", "Bedrag")} />
          {!eigen ? <label className="block text-xs font-semibold">{t("expenses.modal.agreedBudgetOptional", "Afgesproken budget (vrijwillig)")}<select aria-label={t("expenses.modal.agreedBudgetOptional", "Afgesproken budget")} value={budget?.id ?? ""} onChange={(e) => {
            const b = budgetten.find((b) => b.id === e.target.value) ?? null; setBudget(b); if (b) {
              setKind(b.kind);
              setCategorie(b.categorie ?? categorie);
              setVerdeling(b.pctSanne === 50 ? "50" : "anders");
              setPctSanne(b.pctSanne);
            }
          }} className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-sm"><option value="">{t("expenses.modal.noBudgetLinked", "Geen budget koppelen")}</option>{budgetten.filter((b) => b.status === "akkoord" || b.status === "uitgegeven").map((b) => <option key={b.id} value={b.id}>{b.wat}</option>)}</select></label> : null}
          {budget && budgetMelding(budgetBeoordeling) ? <p className="text-xs text-accent-warm">{budgetMelding(budgetBeoordeling)}</p> : null}
          <label className="block text-xs font-semibold">{t("expenses.modal.dateOfExpense", "Datum van de uitgave")}<input type="date" aria-label={t("expenses.modal.dateOfExpense", "Datum van de uitgave")} value={datum} onChange={(e) => setDatum(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-sm" /></label>

          <p className="text-xs font-semibold text-ink-soft">{t("expenses.modal.paidBy", "Betaald door")}</p>
          {eigen ? <p className="rounded-md border border-brand bg-brand-soft px-3 py-2 text-sm font-semibold text-brand">{ikNaam}<span className="block text-[11px] font-normal text-ink-soft">{t("expenses.modal.soloNotLinkedHint", "De andere ouder is nog niet gekoppeld. Je houdt deze uitgave voor jezelf bij, zonder saldo of betaalverzoek.")}</span></p> : <div className="flex gap-2">
            {["sanne", "joris"].map((o) => (<button key={o} onClick={() => setBetaaldDoor(o)} className={`flex-1 rounded-md border py-2 text-sm font-semibold ${betaaldDoor === o ? "border-brand bg-brand-soft text-brand" : "border-border text-ink-soft"}`}>
              {o === "sanne" ? "Sanne" : "Joris"}
            </button>))}
          </div>}

          <p className="text-xs font-semibold text-ink-soft">{t("expenses.modal.for", "Voor")}</p>
          <div className="flex flex-wrap gap-2">
            {kindKeuzes.map((k) => {
              const label = k === "Gezin/algemeen" ? t("expenses.modal.familyGeneral", "Gezin/algemeen") : k === "Beide kinderen" ? t("expenses.modal.bothChildren", "Beide kinderen") : k === "Alle kinderen" ? t("expenses.modal.allChildren", "Alle kinderen") : k;
              return (<button key={k} onClick={() => setKind(k)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${kind === k ? "border-brand bg-brand-soft text-brand" : "border-border text-ink-soft"}`}>
                {label}
              </button>);
            })}
          </div>

          {meer ? <>
            <p className="text-xs font-semibold text-ink-soft">{t("expenses.modal.categoryLabel", "Categorie")}</p>
            <div className="flex flex-wrap gap-2">
              {categorieen.map((c) => (<button key={c} onClick={() => setCategorie(c)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${categorie === c ? "border-brand bg-brand-soft text-brand" : "border-border text-ink-soft"}`}>
                {c}
              </button>))}
            </div>
          </> : null}

          {alleenBijhouden ? <p className="text-xs text-ink-soft">{t("expenses.modal.soloSplitHint", "Je houdt deze uitgave alleen bij, zonder verdeling. Dit kun je aanpassen bij Kostenafspraken.")}</p> : <>
            <p className="text-xs font-semibold text-ink-soft">{eigen ? t("expenses.provisional", "Voorlopige verdeling") : t("expenses.howDivideCosts", "Hoe verdelen jullie deze kosten?")}</p>
            <div className="space-y-2">
              {[
                ...(eigen?.kostenAfspraak.wijze === "per-uitgave" ? [] : [["standaard", t("expenses.modal.splitStandard", { pct: sleutel.sanne, otherPct: sleutel.joris, otherName: anderNaam, defaultValue: `Volgens ${eigen ? "jouw afspraak" : "standaardverdeling"} (${sleutel.sanne} / ${sleutel.joris})` })]]),
                ["50", t("expenses.modal.split50", { share: Math.round(bedrag * 50) / 100, defaultValue: "50 / 50" })],
                ["anders", t("expenses.modal.splitOther", "Ander percentage")],
                ["volledig", t("expenses.modal.splitEntirelyMine", "Volledig voor één ouder")],
              ].map(([v, label]) => (<label key={v} className="flex items-center gap-3 text-sm">
                <input type="radio" name="verdeling" checked={verdeling === v} onChange={() => setVerdeling(v)} className="size-4 accent-[var(--color-brand)]" />
                {label}
              </label>))}
              {verdeling === "anders" ? (<div className="flex items-center gap-2 pl-7 text-sm">
                <span className="text-ink-soft">{ikNaam}</span>
                <input type="number" min={0} max={100} value={pctSanne} onChange={(e) => setPctSanne(Math.min(100, Math.max(0, Number(e.target.value))))} className="w-16 rounded-md border border-border bg-card px-2 py-1 text-sm" />
                <span className="text-ink-soft">% / {anderNaam} {100 - pctSanne}%</span>
              </div>) : null}
            </div>

            {bedrag > 0 ? (<div className="rounded-md border border-border bg-card p-3 text-sm">
              <p className="flex justify-between"><span>{ikNaam}</span><b>{euro(deelSanne)}</b></p>
              <p className="mt-1 flex justify-between"><span>{anderNaam}</span><b>{euro(deelJoris)}</b></p>
            </div>) : null}
          </>}

          {overschreden ? (<div role="status" className="rounded-md border border-accent-warm/50 bg-muted p-3 text-sm">
            <p className="font-semibold">{t("expenses.modal.extraBudgetExceeded", { amount: euro(overschot), defaultValue: `Afgesproken budget overschreden met ${euro(overschot)}` })}</p>
            <p className="mt-0.5 text-xs text-ink-soft">{t("expenses.modal.budgetWithinAgreementNotice", { max: euro(budget.max), extra: euro(overschot), defaultValue: `${euro(budget.max)} valt binnen de afspraak. Wat doe je met de extra ${euro(overschot)}?` })}</p>
            <div className="mt-2 space-y-1.5">
              {[["eigen", t("expenses.modal.extraOwnExpense", "Voor eigen rekening"), t("expenses.modal.extraOwnDesc", "Je betaalt het extra deel zelf")], ["afstemmen", t("expenses.modal.extraAskOther", `Voorstellen aan ${anderNaam}`), t("expenses.modal.extraAskOtherDesc", { name: anderNaam, defaultValue: `Telt pas mee als ${anderNaam} instemt` })]].map(([v, l, sub]) => (<label key={v} className="flex items-start gap-3">
                <input type="radio" name="extra" checked={extraKeuze === v} onChange={() => setExtraKeuze(v)} className="mt-1 size-4 accent-[var(--color-brand)]" />
                <span>{l}<span className="block text-[11px] text-ink-soft">{sub}</span></span>
              </label>))}
            </div>
          </div>) : null}
          {!meer && <BonKeuze gekozen={bon} onKies={setBon} />}
          {meer ? <BijlageKiezers bon={bon} bijlage={bijlage} onBon={setBon} onBijlage={setBijlage} /> : (
            <button type="button" onClick={() => setMeer(true)} className="min-h-11 text-left text-sm font-semibold text-brand">
              <span className="inline-flex items-center gap-1">
                <span>{t("common.moreOptions", "Meer opties")}</span>
                <ChevronRight className="size-4" />
              </span>
              <span className="block text-[11px] font-normal text-ink-soft">{t("expenses.modal.categoryLabel", "Categorie")} ({categorie}), {t("expenses.modal.receiptOptional", "bon")}</span>
            </button>
          )}
        </div>
        <label className="mt-3 block text-xs font-semibold">{t("expenses.modal.notesOptional", "Toelichting (optioneel)")}<textarea value={toelichting} onChange={(e) => setToelichting(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-sm" /></label>
        <Button onClick={opslaan} disabled={!omschrijving.trim() || bedrag <= 0 || !datum || !kind || (overschreden && !extraKeuze)} className="mt-4 w-full rounded-md bg-brand py-3 text-sm font-semibold text-primary-foreground disabled:opacity-40">
          {t("expenses.modal.saveExpense", "Uitgave opslaan")}
        </Button>
      </>}
    </div>
  </div>);
}
function BonKeuze({ gekozen, onKies }) {
  const { t } = useTranslation();
  return (<div className="py-2">
    <p className="text-sm font-semibold">{t("expenses.modal.receiptOptional", "Bonnetje (optioneel)")}{gekozen ? <span className="ml-2 text-xs font-normal text-ink-soft">{gekozen}</span> : null}</p>
    <div className="mt-1 grid grid-cols-2 gap-2">
      <BestandKnop label={t("expenses.modal.takePhoto", "Foto maken")} icoon={Camera} accept="image/*" capture onKies={onKies} />
      <BestandKnop label={t("expenses.modal.chooseFile", "Bestand kiezen")} icoon={Receipt} accept="image/*,application/pdf" onKies={onKies} />
    </div>
  </div>);
}
function BestandKnop({ label, gekozen, icoon: Icon, accept, capture, onKies }) {
  return (<label className="flex cursor-pointer items-center gap-2 py-2.5 text-sm font-semibold text-brand">
    <Icon className="size-4" strokeWidth={1.6} />
    <span className="flex-1">{label}</span>
    {gekozen ? <span className="truncate text-xs font-normal text-ink-soft">{gekozen}</span> : null}
    <input type="file" accept={accept} capture={capture ? "environment" : undefined} className="sr-only" onChange={(e) => {
      const n = e.target.files?.[0]?.name; if (n)
        onKies(n); e.target.value = "";
    }} />
  </label>);
}
function BijlageKiezers({ bon, bijlage, onBon, onBijlage }) {
  const { t } = useTranslation();
  return (<div className="divide-y divide-border border-y border-border">
    <BonKeuze gekozen={bon} onKies={onBon} />
    <BestandKnop label={t("expenses.modal.addOtherAttachment", "Andere bijlage toevoegen")} gekozen={bijlage} icoon={Paperclip} accept="image/*,application/pdf,.doc,.docx,.txt" onKies={onBijlage} />
  </div>);
}
function KostDetail({ kost, onSluit, onVerrekenen, startWijzig = false }) {
  const { t } = useTranslation();
  const extra = useKostExtra(kost?.id ?? "");
  const bronKosten = useKosten();
  const bronBudgetten = useBudgetten();
  const beoordeling = beoordeelKosten(bronKosten, bronBudgetten, DEMO_VANDAAG).get(kost?.id ?? "");
  const keuze = useKeuzeTeksten();
  const [opm, setOpm] = useState("");
  const [wijzig, setWijzig] = useState(startWijzig);
  const [nieuwBedrag, setNieuwBedrag] = useState("");
  const [nieuweVerdeling, setNieuweVerdeling] = useState("");
  const [meer, setMeer] = useState(startWijzig);
  if (!kost)
    return null;
  const status = kost.status;
  const gedekt = status === "wacht" && beoordeling?.soort === "gedekt";
  const label = status === "betaald" || status === "verrekend" ? t("expenses.detail.statusSettled", "Afgerekend") : status === "openstaand" || status === "bevestigd" || gedekt ? t("expenses.detail.statusApproved", "Toegevoegd aan jullie verrekening") : (statusLabel[status] ?? status);
  const pct = Math.round((kost.aandeelSanne / kost.bedrag) * 100);
  const open = status === "openstaand" || status === "bevestigd" || gedekt;
  const actieKnop = "flex w-full items-center justify-between py-3 text-left text-sm font-semibold";
  return (<Sheet open onOpenChange={(o) => {
    if (!o) {
      setWijzig(false);
      setOpm("");
      onSluit();
    }
  }}>
    <SheetContent side="bottom" className="inset-x-0 mx-auto w-full max-w-md max-h-[80dvh] overflow-y-auto rounded-t-2xl bg-background px-5 pb-8 pt-4">
      <SheetHeader className="pr-8 text-left">
        <SheetTitle className="font-display text-2xl font-medium">{kost.omschrijving}</SheetTitle>
        <SheetDescription className="text-xs">{kost.kind} · {kost.datum} · {t("expenses.paidBy", "betaald door {{name}}", { name: kost.betaaldDoor === "sanne" ? t("expenses.modal.you", "jou") : t("expenses.otherShare", "de andere ouder") })}</SheetDescription>
      </SheetHeader>
      <p className="mt-3 font-display text-3xl">{euro(kost.bedrag)}</p>
      <dl className="mt-4 divide-y divide-border border-y border-border text-sm">
        <div className="flex justify-between py-2.5"><dt className="text-ink-soft">{t("expenses.detail.division", "Verdeling")}</dt><dd>{pct} / {100 - pct}</dd></div>
        <div className="flex justify-between py-2.5"><dt className="text-ink-soft">{t("expenses.yourShare", "Jouw deel")}</dt><dd className="font-semibold">{euro(kost.aandeelSanne)}</dd></div>
        <div className="flex justify-between py-2.5"><dt className="text-ink-soft">{t("common.status", "Status")}</dt><dd>{label}</dd></div>
      </dl>

      {wachtOpJouwAkkoord(kost, beoordeling) ? <div className="mt-4">
        <p className="text-xs text-ink-soft">{t("expenses.detail.statusWaiting", "Nog geen akkoord over deze uitgave of verdeling.")}</p>
        {budgetMelding(beoordeling) ? <p className="mt-1 text-xs font-semibold text-accent-warm">{budgetMelding(beoordeling)}</p> : null}
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={() => { setKosten((l) => l.map((x) => x.id === kost.id ? { ...x, status: "openstaand" } : x)); voegOpmerkingToe(kost.id, "Akkoord", kost.omschrijving); bevestig(t("expenses.detail.statusApproved", "Afgesproken. Telt mee in de volgende afrekening.")); onSluit(); }} className="min-h-11 flex-1 text-xs">{keuze.akkoord}</Button>
          <Button variant="outline" onClick={() => { setMeer(true); setWijzig(true); }} className="min-h-11 flex-1 text-xs">{keuze.ander}</Button>
          <Button variant="outline" onClick={() => { setKosten((l) => l.map((x) => x.id === kost.id ? { ...x, status: NIET_AKKOORD_STATUS } : x)); voegOpmerkingToe(kost.id, "Niet akkoord", kost.omschrijving); bevestig(nietAkkoordKostTekst); onSluit(); }} className="min-h-11 flex-1 text-xs">{keuze.niet}</Button>
        </div>
      </div> : gedekt && beoordeling?.soort === "gedekt" ? <div className="mt-3"><p className="text-xs text-ink-soft">Budget: {beoordeling.budget.wat} · {beoordeling.budget.pctSanne} / {100 - beoordeling.budget.pctSanne}. Een nieuw akkoord is niet nodig.</p><p className="mt-1 text-xs text-brand">{t("expenses.detail.statusApproved", "Deze uitgave is toegevoegd aan jullie verrekening.")}</p></div> : null}

      <Button variant="ghost" aria-expanded={meer} onClick={() => setMeer((v) => !v)} className="mt-3 w-full justify-between px-0">{t("common.moreOptions", "Meer opties")} <span aria-hidden>{meer ? "−" : "+"}</span></Button>
      {meer ? <>

        {extra.bijlagen.length ? (<div className="mt-4"><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand">{t("expenses.detail.receipt", "Bijlagen")}</p>
          {extra.bijlagen.map((b) => <p key={b.id} className="mt-1 flex items-center gap-2 text-sm">{b.soort === "bon" ? <Receipt className="size-3.5" /> : <Paperclip className="size-3.5" />}{b.naam}<span className="text-[11px] text-ink-soft">{b.soort === "bon" ? t("expenses.modal.receiptTag", "bon/factuur") : t("expenses.modal.attachmentTag", "bijlage")}</span></p>)}
        </div>) : null}
        {extra.opmerkingen.length ? (<div className="mt-4"><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand">{t("expenses.detail.notes", "Opmerkingen")}</p>
          {extra.opmerkingen.map((o) => <p key={o.id} className="mt-1 text-sm">{o.tekst}<span className="ml-1 text-[11px] text-ink-soft">· {o.door}</span></p>)}
        </div>) : null}

        <div className="mt-5 divide-y divide-border border-y border-border">
          {/* Geen losse betaling per uitgave: betalen gaat altijd via de gezamenlijke afrekening. */}
          {open ? <button className={actieKnop} onClick={onVerrekenen}><span>{t("expenses.viewCalculation", "Bekijk gezamenlijke afrekening")}</span><ChevronRight className="size-5 shrink-0 text-ink-soft" /></button> : null}
          <BestandKnop label={t("expenses.modal.scanReceipt", "Bon/factuur toevoegen")} icoon={Receipt} accept="image/*,application/pdf" onKies={(n) => voegBijlageToe(kost.id, n, "bon", kost.omschrijving)} />
          <BestandKnop label={t("expenses.modal.chooseFile", "Andere bijlage toevoegen")} icoon={Paperclip} accept="image/*,application/pdf,.doc,.docx,.txt" onKies={(n) => voegBijlageToe(kost.id, n, "bijlage", kost.omschrijving)} />
          <div className="py-3">
            <div className="flex gap-2">
              <input value={opm} onChange={(e) => setOpm(e.target.value)} placeholder={t("expenses.detail.notePlaceholder", "Opmerking toevoegen")} aria-label={t("expenses.detail.notePlaceholder", "Opmerking")} className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand" />
              <button disabled={!opm.trim()} onClick={() => { voegOpmerkingToe(kost.id, opm.trim(), kost.omschrijving); setOpm(""); }} className="rounded-md border border-border px-3 text-xs font-semibold disabled:opacity-40">{t("expenses.detail.send", "Plaats")}</button>
            </div>
          </div>
          {status !== "betaald" ? (!wijzig ? (<button className={actieKnop} onClick={() => setWijzig(true)}><span>{t("expenses.detail.proposeCorrection", "Fout melden of correctie voorstellen")}</span><ChevronRight className="size-5 shrink-0 text-ink-soft" /></button>) : (<div className="py-3">
            <p className="text-xs text-ink-soft">{t("expenses.detail.changeNotice", "Bedrag en verdeling veranderen pas als de andere ouder akkoord gaat.")}</p>
            <div className="mt-2 flex gap-2">
              <GeldInvoer value={nieuwBedrag} onChange={setNieuwBedrag} label={t("expenses.modal.amount", "Nieuw bedrag")} className="flex-1" />
              <input value={nieuweVerdeling} onChange={(e) => setNieuweVerdeling(e.target.value)} placeholder={t("expenses.detail.splitPlaceholder", "Verdeling, bijv. 60 / 40")} aria-label={t("expenses.detail.splitAria", "Andere verdeling")} className="w-28 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand" />
              <Button size="sm" onClick={() => {
                const n = leesGeld(nieuwBedrag) ?? 0; const vd = nieuweVerdeling.trim(); if (nieuwBedrag && n <= 0)
                  return; if (n > 0 || vd) {
                    voegOpmerkingToe(kost.id, `${open ? "Correctie voorgesteld" : "Ander voorstel"}:${n > 0 ? ` bedrag ${euro(n)}` : ""}${vd ? ` verdeling ${vd}` : ""}`, kost.omschrijving);
                    if (!open)
                      setKosten((l) => l.map((x) => (x.id === kost.id ? { ...x, status: "wacht", aanZet: "joris" } : x)));
                    setWijzig(false);
                    setNieuwBedrag("");
                    setNieuweVerdeling("");
                    bevestig(open ? "Correctie vastgelegd. De bestaande bedragen en verrekening blijven gelden." : tegenvoorstelVerstuurdTekst);
                    onSluit();
                  }
              }}>{t("expenses.proposeBudget", "Voorstellen")}</Button>
            </div>
          </div>)) : null}
          <div className="flex items-center justify-between py-3 text-sm font-semibold">{t("expenses.history", "Bekijk geschiedenis")}<GeschiedenisKnop soort="kosten" itemId={kost.id} naam={kost.omschrijving} /></div>
        </div>
      </> : null}
    </SheetContent>
  </Sheet>);
}
// --- Eigen gezin: eigen uitgaven en vrijblijvende, voorlopige kostenafspraken ---
function EigenKosten({ st, onNieuw }) {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language?.startsWith("en");
  const [instellen, setInstellen] = useState(false);
  const [historieOpen, setHistorieOpen] = useState(false);
  const a = st.kostenAfspraak;
  const totaal = st.kosten.reduce((s, k) => s + k.bedrag, 0);
  const wijze = kostenWijzen.find((w) => w.id === a.wijze) ?? kostenWijzen[0];
  const wijzeNaam = a.wijze === "eigen" ? `${a.pctIk} / ${100 - a.pctIk}` : t(`expenses.splitModes.${wijze?.id}.name`, wijze?.naam);
  const momentItem = kostenMomenten.find((m) => m.id === a.moment);
  const momentNaam = t(`expenses.settleMoments.${a.moment}`, momentItem?.naam || "").toLowerCase();
  const samenvatting = a.wijze === "alleen" ? wijzeNaam : `${wijzeNaam} · ${momentNaam} ${t("expenses.settlementSuffix", "afrekenen")}`;
  if (instellen)
    return <EigenAfspraken st={st} onTerug={() => setInstellen(false)} />;
  if (!st.kosten.length)
    return (<EigenLeeg titel={t("expenses.title", "Kosten")} icoon="kosten" tekst={t("expenses.trackExpensesDesc", "Houd de kosten voor de kinderen bij. Een verdeling instellen kan later, dat hoeft niet eerst.")} knop={t("expenses.addFirstExpense", "Eerste uitgave toevoegen")} onKnop={onNieuw} extra={<button onClick={() => setInstellen(true)} className="mt-3 min-h-11 inline-flex items-center gap-1 text-sm font-semibold text-brand"><span>{t("expenses.setupAgreementsLink", "Kostenafspraken instellen")}</span><ChevronRight className="size-4" /></button>} />);
  return (<AppShell>
    <div className="flex items-start gap-3">
      {/* <BackButton terug="/" /> */}
      <div className="flex-1">
        <h1 className="font-display text-2xl font-extrabold leading-tight">{t("expenses.title", "Kosten")}</h1>
        <p className="mt-1 text-sm text-ink-soft">{t("expenses.expensesFor", { names: st.kinderen.map((k) => k.naam).join(" & ") || t("common.children", "de kinderen"), defaultValue: `Uitgaven voor ${st.kinderen.map((k) => k.naam).join(" & ") || "de kinderen"}` })}</p>
      </div>

    </div>
    <p className="mt-4 text-sm text-ink-soft">{t("expenses.totalTracked", "Totaal bijgehouden")} <b className="text-ink">{euro(totaal)}</b>. {t("expenses.soloBalanceNote", "Zolang de andere ouder niet gekoppeld is, is er geen gezamenlijk saldo of betaalverzoek.")}</p>
    <button onClick={() => setInstellen(true)} className="mt-3 flex min-h-11 w-full items-center justify-between border-y border-border py-2 text-left text-sm">
      <span><span className="font-semibold">{t("expenses.expenseAgreements", "Kostenafspraken")}</span><span className="block text-xs text-ink-soft">{samenvatting} · {t("expenses.provisional", "voorlopig")}</span></span>
      <ChevronRight className="size-5 shrink-0 text-ink-soft" />
    </button>
    <Button onClick={onNieuw} className="mt-4 min-h-12 w-full"><AppIcon functie="toevoegen" vorm="kaal" />{t("expenses.addExpense", "+ Uitgave toevoegen")}</Button>
    <Button variant="ghost" onClick={() => setHistorieOpen((v) => !v)} aria-expanded={historieOpen} className="mt-4 min-h-14 w-full justify-between border-y border-border px-0"><span>{t("expenses.allRecordedExpenses", "Alle gemaakte kosten")} · {st.kosten.length}</span><ChevronRight className="size-5 shrink-0" /></Button>
    {historieOpen ? <ul className="mt-2 divide-y divide-border">
      {st.kosten.map((k) => (<li key={k.id} className="flex items-center gap-3 py-3">
        <AppIcon functie="kosten" maat="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{k.omschrijving}</p>
          <p className="text-xs text-ink-soft">{k.kind} · {k.datum} · {t("expenses.paidBy", { name: st.naam || t("common.you", "jou"), defaultValue: `betaald door ${st.naam || "jou"}` })}{k.pctIk === null ? "" : ` · ${t("expenses.provisional", "voorlopig")} ${k.pctIk} / ${100 - k.pctIk}`}</p>
        </div>
        <b className="text-sm">{euro(k.bedrag)}</b>
      </li>))}
    </ul> : null}
  </AppShell>);
}
function EigenAfspraken({ st, onTerug }) {
  const { t } = useTranslation();
  const a = st.kostenAfspraak;
  const keuze = (actief) => `flex w-full min-h-11 items-start gap-3 py-2.5 text-left text-sm ${actief ? "font-semibold text-brand" : ""}`;
  return (<AppShell>
    <div className="flex items-start gap-3">
      {/* <button onClick={onTerug} className="knop-kruis size-11 shrink-0" aria-label="Terug"><span className="text-lg leading-none">‹</span></button> */}
      <div>
        <h1 className="font-display text-2xl font-extrabold leading-tight">{t("expenses.expenseAgreements", "Kostenafspraken")}</h1>
        <p className="mt-1 text-sm text-ink-soft">{t("expenses.expenseAgreementsDesc", "Vrijblijvend. Zolang de andere ouder niet gekoppeld is, is dit jouw voorstel en nog geen gezamenlijke afspraak.")}</p>
      </div>
    </div>
    <section className="mt-5">
      <h2 className="font-display text-lg font-bold">{t("expenses.howDivideCosts", "Hoe wil je de kosten verdelen?")}</h2>
      <div className="mt-2 divide-y divide-border border-y border-border">
        {kostenWijzen.map((w) => (<label key={w.id} className={keuze(a.wijze === w.id)}>
          <input type="radio" name="wijze" checked={a.wijze === w.id} onChange={() => startActie.zetKostenAfspraak({ wijze: w.id })} className="mt-1 size-4 accent-[var(--color-brand)]" />
          <span>{t(`expenses.splitModes.${w.id}.name`, w.naam)}<span className="block text-xs font-normal text-ink-soft">{t(`expenses.splitModes.${w.id}.desc`, w.uitleg)}</span></span>
        </label>))}
      </div>
      {a.wijze === "eigen" ? (<div className="mt-3 flex items-center gap-2 text-sm">
        <span className="text-ink-soft">{st.naam || t("common.you", "Jij")}</span>
        <input type="number" min={0} max={100} aria-label={t("expenses.yourPercentage", "Jouw percentage")} value={a.pctIk} onChange={(e) => startActie.zetKostenAfspraak({ pctIk: Math.min(100, Math.max(0, Number(e.target.value))) })} className="w-16 rounded-md border border-border bg-card px-2 py-1 text-sm" />
        <span className="text-ink-soft">% / {t("expenses.otherParent", "andere ouder")} {100 - a.pctIk}%</span>
      </div>) : null}
    </section>
    {a.wijze !== "alleen" ? (<section className="mt-6">
      <h2 className="font-display text-lg font-bold">{t("expenses.whenSettleCosts", "Wanneer rekenen jullie de kosten af?")}</h2>
      <div className="mt-2 divide-y divide-border border-y border-border">
        {kostenMomenten.map((m) => (<label key={m.id} className={keuze(a.moment === m.id)}>
          <input type="radio" name="moment" checked={a.moment === m.id} onChange={() => startActie.zetKostenAfspraak({ moment: m.id })} className="mt-1 size-4 accent-[var(--color-brand)]" />
          <span>{t(`expenses.settleMoments.${m.id}`, m.naam)}</span>
        </label>))}
      </div>
    </section>) : null}
    <p className="mt-5 text-xs text-ink-soft">{t("expenses.jointAgreementNotice", "Na het koppelen van de andere ouder kan die dit voorstel bekijken. Pas na akkoord van jullie beiden wordt het een gezamenlijke afspraak.")}</p>
    <Button onClick={onTerug} className="mt-4 min-h-11 w-full shadow-none">{t("expenses.done", "Klaar")}</Button>
  </AppShell>);
}
