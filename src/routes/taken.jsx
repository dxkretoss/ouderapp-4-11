import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { z } from "zod";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, Card, PageHeader } from "@/components/AppShell";
import { GeschiedenisKnop } from "@/components/Geschiedenis";
import { wieNaam } from "@/lib/kring-store";
import { accepteerOverdracht, annuleerOverdracht, contactStatusLabel, eigenTaken, kindNaam, taakKandidaten, taakWieTekst, toggleTaak, useTaken, voegTaakToe, vraagOverdracht } from "@/lib/taken-store";
import { useStart } from "@/lib/start-store";
import { bevestig } from "@/lib/feedback";
import { HulpKnop, HulpVragen } from "@/components/HulpVragen";
import { useNavigate } from "@tanstack/react-router";
// Eigen gezin: eigen taken (geen voorbeelddata), met plusje en toevoegformulier.
function TakenWrap() {
    const st = useStart();
    if (st.eigen)
        return <EigenTaken />;
    return <Taken />;
}
function EigenTaken() {
    const { t } = useTranslation();
    const st = useStart();
    useTaken(); // herbereken bij wijzigingen
    const nav = useNavigate();
    const [nieuw, setNieuw] = useState(false);
    const [hulpOpen, setHulpOpen] = useState(!!Route.useSearch().hulp);
    const [tekst, setTekst] = useState("");
    const [kind, setKind] = useState(st.kinderen[0]?.id ?? "alle");
    const lijst = eigenTaken();
    const actief = lijst.filter((t) => !t.klaar);
    const klaar = lijst.filter((t) => t.klaar);
    const knop = (aan) => `min-h-11 rounded-full border px-3 text-sm ${aan ? "border-brand bg-brand-soft font-semibold" : "border-border"}`;
    const opslaan = () => {
        if (!tekst.trim())
            return;
        voegTaakToe({ tekst: tekst.trim(), kind, wie: "sanne", herhaling: "eenmalig" });
        bevestig("Taak toegevoegd", { uitleg: tekst.trim() });
        setTekst("");
        setNieuw(false);
    };
    return (<AppShell>
      <PageHeader titel={t("tasks.headerTitle", "Taken")} subtitel={t("tasks.headerSubtitle", "Wie regelt wat en wat moet nog gebeuren.")} actie={<button aria-label={t("tasks.newTaskAria", "Nieuwe taak")} onClick={() => setNieuw(true)} className="inline-flex size-11 items-center justify-center rounded-full text-xl font-semibold text-brand hover:bg-muted">+</button>}/>
      {nieuw ? (<Card className="mt-4 space-y-3">
          <p className="font-display text-lg font-bold">{t("tasks.newTask", "Nieuwe taak")}</p>
          <label className="block text-sm font-semibold">{t("tasks.whatNeedsDoing", "Wat moet er gebeuren?")}<input value={tekst} onChange={(e) => setTekst(e.target.value)} placeholder={t("tasks.placeholder", "Bijv. schoolformulier invullen")} className={`mt-1 w-full font-normal ${veld}`}/></label>
          {st.kinderen.length ? (<fieldset><legend className="text-sm font-semibold">{t("tasks.forWhom", "Voor wie?")}</legend><div className="mt-1 flex flex-wrap gap-2">
              {st.kinderen.map((k) => <button key={k.id} onClick={() => setKind(k.id)} aria-pressed={kind === k.id} className={knop(kind === k.id)}>{k.naam}</button>)}
              {st.kinderen.length > 1 ? <button onClick={() => setKind("alle")} aria-pressed={kind === "alle"} className={knop(kind === "alle")}>{t("tasks.allChildren", "Alle kinderen")}</button> : null}
            </div></fieldset>) : null}
          <HulpKnop voorstel={{ kind, wat: tekst }}/>
          <div className="flex gap-2">
            <button onClick={opslaan} className="min-h-11 flex-1 rounded-full bg-brand text-sm font-semibold text-primary-foreground">{t("tasks.add", "Toevoegen")}</button>
            <button onClick={() => setNieuw(false)} className="min-h-11 px-3 text-sm text-ink-soft">{t("tasks.cancel", "Annuleren")}</button>
          </div>
        </Card>) : null}
      {!lijst.length && !nieuw ? (<div className="mt-10 flex flex-col items-center text-center">
          <p className="font-display text-lg font-bold">{t("tasks.emptyTitle", "Hier is het nog rustig")}</p>
          <p className="mt-1 max-w-xs text-sm text-ink-soft">{t("tasks.emptyDesc", "Hier komen de taken voor de kinderen, zoals inschrijven of iets regelen.")}</p>
          <button onClick={() => setNieuw(true)} className="mt-5 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-primary-foreground">{t("tasks.addFirstTask", "Eerste taak toevoegen")}</button>
          <button onClick={() => nav({ to: "/meer" })} className="mt-3 min-h-11 text-sm font-semibold text-ink-soft">{t("tasks.backToMenu", "Terug naar Menu")}</button>
        </div>) : null}
      {actief.length ? (<ul className="mt-4 divide-y divide-border rounded-md border border-border bg-card">
          {actief.map((t) => (<li key={t.id} className="flex items-center gap-3 px-3 py-3">
              <button onClick={() => { toggleTaak(t.id); bevestig("Geregeld", { uitleg: t.tekst, tril: true, ongedaan: () => toggleTaak(t.id) }); }} aria-label="Markeer als geregeld" className="grid size-6 shrink-0 place-items-center rounded-full border border-ink-soft/40"/>
              <span className="flex-1 text-sm font-semibold">{t.tekst}</span>
              <span className="text-xs text-ink-soft">{kindNaam(t.kind).join(" & ")}</span>
            </li>))}
        </ul>) : null}
      {klaar.length ? (<ul className="mt-3 divide-y divide-border rounded-md border border-border bg-card">
          {klaar.map((t) => (<li key={t.id} className="flex items-center gap-3 px-3 py-3">
              <button onClick={() => toggleTaak(t.id)} aria-label="Markeer als open" className="grid size-6 shrink-0 place-items-center rounded-full border border-brand bg-brand text-primary-foreground">✓</button>
              <span className="flex-1 text-sm text-ink-soft line-through">{t.tekst}</span>
            </li>))}
        </ul>) : null}
      <HulpVragen open={hulpOpen} onOpenChange={setHulpOpen}/>
    </AppShell>);
}
export const Route = createFileRoute("/taken")({
    head: () => ({
        meta: [
            { title: "Taken — Ouderschap & Co" },
            { name: "description", content: "Wie regelt wat en wat moet nog gebeuren." },
            { property: "og:title", content: "Taken — Ouderschap & Co" },
            { property: "og:description", content: "Wie regelt wat en wat moet nog gebeuren rond de kinderen." },
            { property: "og:type", content: "website" },
            { name: "twitter:card", content: "summary" },
        ],
    }),
    validateSearch: z.object({ taak: z.string().optional(), deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), kind: z.string().optional(), hulp: z.boolean().optional(), dag: z.string().optional(), berichtId: z.string().optional(), gesprekId: z.string().optional() }),
    component: TakenWrap,
});
const herhalingLabel = { eenmalig: "Eenmalig", wekelijks: "Elke week", maandelijks: "Elke maand", jaarlijks: "Elk jaar", aangepast: "Aangepast" };
const veld = "rounded-md border border-border bg-background px-3 py-2 text-sm";
const datumTekst = (d) => new Date(d).toLocaleDateString("nl-NL", { day: "numeric", month: "long" });
const kindTekst = (k) => (k === "beide" ? "Emma & Noah" : k === "emma" ? "Emma" : "Noah");
const DAG = 86_400_000;
/** Later = deadline meer dan drie weken weg. */
const isLater = (t) => !!t.deadline && new Date(t.deadline).getTime() - Date.now() > 21 * DAG;
function Taken() {
    const { t } = useTranslation();
    const { taken } = useTaken();
    const zoek = Route.useSearch();
    const [nieuw, setNieuw] = useState(!!zoek.taak || !!zoek.deadline);
    const [open, setOpen] = useState(null);
    const [afgerond, setAfgerond] = useState(false);
    const [hulpOpen, setHulpOpen] = useState(!!zoek.hulp);
    const actief = taken.filter((t) => !t.klaar);
    const later = actief.filter(isLater);
    const rest = actief.filter((t) => !isLater(t));
    const voorJou = rest.filter((t) => t.wie === "sanne" && !t.overdragenAan);
    // Nog afstemmen = nog geen verantwoordelijke of een overdracht die op antwoord wacht.
    const nogAfstemmen = rest.filter((t) => !t.wie || t.overdragenAan);
    const andereOuder = rest.filter((t) => t.wie && t.wie !== "sanne" && !t.overdragenAan);
    const klaar = taken.filter((t) => t.klaar);
    const rij = (t) => <TaakRij key={t.id} t={t} open={open === t.id} onOpen={() => setOpen(open === t.id ? null : t.id)}/>;
    return (<AppShell>
      <PageHeader titel={t("tasks.headerTitle", "Taken")} subtitel={t("tasks.headerSubtitle", "Wie regelt wat en wat moet nog gebeuren.")} actie={<button aria-label={t("tasks.newTaskAria", "Nieuwe taak")} onClick={() => setNieuw(true)} className="inline-flex size-11 items-center justify-center rounded-full text-xl font-semibold text-brand hover:bg-muted">+</button>}/>

      <HulpVragen open={hulpOpen} onOpenChange={setHulpOpen}/>

      {nieuw ? <NieuweTaak onKlaar={() => setNieuw(false)}/> : null}

      {voorJou.length ? <Groep titel={t("tasks.forYou", "Voor jou")}>{voorJou.map(rij)}</Groep> : null}
      {nogAfstemmen.length ? <Groep titel={t("tasks.toCoordinate", "Nog afstemmen")}>{nogAfstemmen.map(rij)}</Groep> : null}
      {andereOuder.length ? <Groep titel={t("tasks.withOtherParent", "Bij de andere ouder")}>{andereOuder.map(rij)}</Groep> : null}
      {later.length ? <Groep titel={t("tasks.later", "Later")}>{later.map(rij)}</Groep> : null}
      {!actief.length ? <p className="mt-6 text-sm text-ink-soft">{t("tasks.allDone", "Alles is geregeld.")}</p> : null}

      {klaar.length ? (<div className="mt-4">
          <button onClick={() => setAfgerond(!afgerond)} className="min-h-11 inline-flex items-center gap-1 text-sm font-semibold text-brand">
            {afgerond ? t("tasks.hideCompleted", "Verberg afgeronde taken") : (
              <>
                <span>{t("tasks.viewCompleted", "Bekijk afgeronde taken")}</span>
                <ChevronRight className="size-4" />
              </>
            )}
          </button>
          {afgerond ? <Groep titel={t("tasks.completed", "Afgerond")}>{klaar.map(rij)}</Groep> : null}
        </div>) : null}

    </AppShell>);
}
function Groep({ titel, children }) {
    return (<section className="mt-5">
      <h2 className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">{titel}</h2>
      <ul className="mt-2 divide-y divide-border rounded-md border border-border bg-card">{children}</ul>
    </section>);
}
function TaakRij({ t, open, onOpen }) {
    const { t: trans } = useTranslation();
    const [overdragen, setOverdragen] = useState(false);
    const sub = [kindTekst(t.kind), t.contactStatus ? contactStatusLabel[t.contactStatus] : null, t.deadline ? `vóór ${datumTekst(t.deadline)}` : t.wie && t.wie !== "sanne" ? `${wieNaam(t.wie)} regelt dit` : !t.wie ? "Nog niemand" : null].filter(Boolean).join(" · ");
    return (<li id={`item-${t.id}`} className="zoekdoel px-3 py-3">
      <div className="flex items-start gap-3">
        <button disabled={!!t.overdragenAan} onClick={() => { toggleTaak(t.id); if (!t.klaar)
        bevestig("Geregeld", { uitleg: t.tekst, tril: true, ongedaan: () => toggleTaak(t.id) }); }} aria-pressed={t.klaar} aria-label={t.klaar ? "Markeer als open" : "Markeer als geregeld"} className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border ${t.klaar ? "border-brand bg-brand text-primary-foreground" : "border-ink-soft/40"}`}>{t.klaar ? "✓" : ""}</button>
        <button onClick={onOpen} aria-expanded={open} className="min-w-0 flex-1 text-left">
          <span className={`block text-sm ${t.klaar ? "text-ink-soft line-through" : "font-semibold"}`}>{t.tekst}</span>
          <span className="block text-xs text-ink-soft">{sub}</span>
          {t.overdragenAan ? <span className="block text-xs text-ink-soft">Gevraagd aan {wieNaam(t.overdragenAan)} · wacht op antwoord</span> : null}
        </button>
        <ChevronDown className={`size-5 text-ink-soft shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </div>
      {open ? (<div className="ml-9 mt-2 space-y-1 text-xs">
          <p className="text-ink-soft">{taakWieTekst(t.wie)}{t.herhaling !== "eenmalig" ? ` · ${t.herhaling === "aangepast" ? t.herhalingTekst ?? "Terugkerend" : herhalingLabel[t.herhaling]}` : ""}{t.herinnerDagen ? ` · herinnering ${t.herinnerDagen} ${t.herinnerDagen === 1 ? "dag" : "dagen"} vooraf` : ""}</p>
          {t.overdragenAan ? (<p><button onClick={() => annuleerOverdracht(t.id)} className="min-h-11 font-semibold text-brand">{trans("tasks.cancelRequest", "Vraag intrekken")}</button>{import.meta.env.DEV ? <> · <button onClick={() => accepteerOverdracht(t.id)} className="text-ink-soft underline">Voorbeeld: accepteren</button></> : null}</p>) : overdragen ? (<div className="flex flex-wrap gap-2">
              {taakKandidaten(t).filter((k) => k.id !== t.wie).map((k) => (<button key={k.id} onClick={() => { vraagOverdracht(t.id, k.id); setOverdragen(false); }} className="min-h-11 rounded-full border border-border px-3 font-semibold">{k.naam}</button>))}
              <button onClick={() => setOverdragen(false)} className="min-h-11 px-2 text-ink-soft">Annuleren</button>
            </div>) : !t.klaar ? <button onClick={() => setOverdragen(true)} className="min-h-11 font-semibold text-brand">{trans("tasks.transferTask", "Taak overdragen")}</button> : null}
          {t.berichtId && t.gesprekId ? <Button asChild variant="link" className="h-auto min-h-11 px-0 text-xs"><Link to="/berichten" search={{ gesprek: t.gesprekId }}>{trans("tasks.viewOriginalConversation", "Oorspronkelijk gesprek bekijken")}</Link></Button> : null}
          <GeschiedenisKnop soort="afspraak" itemId={t.id} naam={t.tekst}/>
        </div>) : null}
    </li>);
}
function NieuweTaak({ onKlaar }) {
    const { t } = useTranslation();
    const { taak: voorinvul, deadline: voorDeadline, kind: voorKind, dag, berichtId, gesprekId } = Route.useSearch();
    const [tekst, setTekst] = useState(voorinvul ?? "");
    const [kind, setKind] = useState(voorKind ?? (berichtId ? "" : "emma"));
    const [wie, setWie] = useState(berichtId ? "" : "sanne");
    const [metDatum, setMetDatum] = useState(!!voorDeadline || !!dag);
    const [deadline, setDeadline] = useState(voorDeadline ?? "");
    const [herhaling, setHerhaling] = useState("eenmalig");
    const [herhalingTekst, setHerhalingTekst] = useState("");
    const [herinner, setHerinner] = useState(voorDeadline ? 2 : 0);
    const kandidaten = taakKandidaten({ kind });
    const ander = kandidaten.find((k) => k.id === "joris");
    const opslaan = () => {
        if (!tekst.trim() || !kind || (dag && metDatum && !deadline))
            return;
        const d = metDatum && deadline ? deadline : "";
        voegTaakToe({ tekst: tekst.trim(), kind, wie: wie === "sanne" ? "sanne" : "", ...(wie && wie !== "sanne" ? { overdragenAan: wie } : {}), berichtId, gesprekId, herhaling, ...(herhaling === "aangepast" && herhalingTekst ? { herhalingTekst } : {}), ...(d ? { deadline: d } : {}), ...(d && herinner ? { herinnerDagen: herinner } : {}) });
        bevestig("Taak toegevoegd", { uitleg: tekst.trim() });
        onKlaar();
    };
    const knop = (aan) => `min-h-11 rounded-full border px-3 text-sm ${aan ? "border-brand bg-brand-soft font-semibold" : "border-border"}`;
    return (<Card className="mt-4 space-y-3">
      <p className="font-display text-lg font-bold">{t("tasks.newTask", "Nieuwe taak")}</p>
      {berichtId ? <p className="text-xs text-ink-soft">Controleer het verzoek. Kies zelf het kind en wie dit regelt. Een verzoek is nog geen toezegging.{dag ? ` Welke datum bedoel je met “${dag}”?` : ""}</p> : null}
      {wie === "joris" ? <p className="text-xs text-ink-soft">De andere ouder wordt gevraagd. Wacht op antwoord; er is nog niemand toegewezen.</p> : null}
      <label className="block text-sm font-semibold">{t("tasks.whatNeedsDoing", "Wat moet er gebeuren?")}<input value={tekst} onChange={(e) => setTekst(e.target.value)} placeholder={t("tasks.placeholder", "Bijv. schoolformulier invullen")} className={`mt-1 w-full font-normal ${veld}`}/></label>
      <fieldset><legend className="text-sm font-semibold">{t("tasks.forWhom", "Voor wie?")}</legend><div className="mt-1 flex flex-wrap gap-2">
        {[["emma", "Emma"], ["noah", "Noah"], ["beide", t("tasks.allChildren", "Beide kinderen")]].map(([k, l]) => <button key={k} onClick={() => setKind(k)} aria-pressed={kind === k} className={knop(kind === k)}>{l}</button>)}
      </div></fieldset>
      <fieldset><legend className="text-sm font-semibold">{t("tasks.whoArrangesThis", "Wie regelt dit?")}</legend><div className="mt-1 flex flex-wrap gap-2">
        <button onClick={() => setWie("sanne")} aria-pressed={wie === "sanne"} className={knop(wie === "sanne")}>{t("tasks.iArrange", "Ik")}</button>
        {ander ? <button onClick={() => setWie("joris")} aria-pressed={wie === "joris"} className={knop(wie === "joris")}>{ander.naam}</button> : null}
        <button onClick={() => setWie("")} aria-pressed={wie === ""} className={knop(wie === "")}>{t("tasks.stillCoordinate", "Nog afstemmen")}</button>
      </div></fieldset>
      <fieldset><legend className="text-sm font-semibold">{t("tasks.when", "Wanneer?")}</legend><div className="mt-1 flex flex-wrap gap-2">
        <button onClick={() => setMetDatum(true)} aria-pressed={metDatum} className={knop(metDatum)}>{t("tasks.dateBtn", "Datum")}</button>
        <button onClick={() => setMetDatum(false)} aria-pressed={!metDatum} className={knop(!metDatum)}>{t("tasks.noDateBtn", "Geen datum")}</button>
      </div>
        {metDatum ? <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} aria-label={t("tasks.dateBtn", "Datum")} className={`mt-2 w-full ${veld}`}/> : null}
        {metDatum && deadline ? <select value={herinner} onChange={(e) => setHerinner(Number(e.target.value))} aria-label={t("tasks.reminderLabel", "Herinner mij")} className={`mt-2 w-full ${veld}`}><option value={0}>{t("tasks.noReminder", "Geen herinnering")}</option><option value={1}>{t("tasks.reminder1Day", "1 dag vooraf")}</option><option value={3}>{t("tasks.reminder3Days", "3 dagen vooraf")}</option><option value={7}>{t("tasks.reminder1Week", "1 week vooraf")}</option></select> : null}
      </fieldset>
      <fieldset><legend className="text-sm font-semibold">{t("tasks.repetition", "Herhaling?")}</legend><div className="mt-1 flex flex-wrap gap-2">
        <button onClick={() => setHerhaling("eenmalig")} aria-pressed={herhaling === "eenmalig"} className={knop(herhaling === "eenmalig")}>{t("tasks.singleTime", "Eenmalig")}</button>
        <button onClick={() => setHerhaling(herhaling === "eenmalig" ? "wekelijks" : herhaling)} aria-pressed={herhaling !== "eenmalig"} className={knop(herhaling !== "eenmalig")}>{t("tasks.recurring", "Terugkerend")}</button>
      </div>
        {herhaling !== "eenmalig" ? <select value={herhaling} onChange={(e) => setHerhaling(e.target.value)} aria-label="Hoe vaak" className={`mt-2 w-full ${veld}`}>{["wekelijks", "maandelijks", "jaarlijks", "aangepast"].map((h) => <option key={h} value={h}>{herhalingLabel[h]}</option>)}</select> : null}
        {herhaling === "aangepast" ? <input value={herhalingTekst} onChange={(e) => setHerhalingTekst(e.target.value)} placeholder={t("tasks.repetitionPlaceholder", "Bijv. elk half jaar")} className={`mt-2 w-full ${veld}`}/> : null}
      </fieldset>
      <HulpKnop voorstel={{ kind, wat: tekst, ...(metDatum && deadline ? { datum: deadline } : {}) }}/>
      <button onClick={opslaan} disabled={!tekst.trim() || !kind || (!!dag && metDatum && !deadline)} className="min-h-11 w-full rounded-full bg-brand text-sm font-semibold text-primary-foreground disabled:opacity-40">{t("tasks.addTaskBtn", "Taak toevoegen")}</button>
      <button onClick={onKlaar} className="min-h-11 w-full text-sm font-semibold text-ink-soft">{t("common.cancel", "Annuleren")}</button>
    </Card>);
}
