import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Check } from "lucide-react";
import { AppIcon } from "@/components/AppIcon";
import { AppShell, PageHeader } from "@/components/AppShell";
import { contactKandidaten, kandidatenVoor, persoonLabel, regelStatus, useKring, wijzigMoment, zetWie } from "@/lib/kring-store";
import { dienVoorstelIn } from "@/lib/zorg-store";
import { meeLijst, useTaken } from "@/lib/taken-store";
import { HulpForm } from "@/components/HulpVragen";
import { uur } from "@/lib/tijd-tekst";
const situaties = ["ziek", "later", "halen", "anderhaalt", "afspraak", "taak", "anders"];
export const Route = createFileRoute("/veranderd")({
    validateSearch: z.object({ situatie: z.enum(situaties).optional(), moment: z.string().optional(), kind: z.enum(["emma", "noah"]).optional() }),
    head: () => ({
        meta: [
            { title: "Nu afstemmen — Ouderschap & Co" },
            { name: "description", content: "Kind ziek, ophalen lukt niet of een afspraak verschuift: regel het rustig vanuit de situatie." },
            { property: "og:title", content: "Nu afstemmen — Ouderschap & Co" },
            { property: "og:description", content: "Vanuit de situatie, met de bestaande planning en kring erachter." },
            { property: "og:type", content: "website" },
            { name: "twitter:card", content: "summary" },
        ],
    }),
    component: Veranderd,
});
const opties = [
    { id: "ziek", titel: "Kind is ziek", icoon: "ziek" },
    { id: "later", titel: "Ik ben later", icoon: "later" },
    { id: "halen", titel: "Ophalen of overdracht lukt niet", icoon: "ophalen" },
    { id: "afspraak", titel: "Planning is onverwacht veranderd", icoon: "planwijziging" },
    { id: "anders", titel: "Iets anders", icoon: "iets" },
];
const extraTitels = { anderhaalt: "Iemand anders haalt of brengt", taak: "Ik wil een taak overdragen" };
const kindNaam = { emma: "Emma", noah: "Noah" };
const kop = "text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft";
const knop = "rounded-md border border-border px-3 py-2 text-left text-sm";
const primair = "rounded-md bg-brand px-4 py-2 text-sm font-semibold text-primary-foreground";
const momentLabel = (m) => `${m.dag} · ${uur(m.tijd)} · ${m.titel}`;
function Veranderd() {
    const router = useRouter();
    const s = Route.useSearch();
    const kring = useKring();
    const ga = (p) => router.navigate({ to: "/veranderd", search: { ...s, ...p }, replace: true });
    const moment = kring.momenten.find((m) => m.id === s.moment);
    const kind = s.kind ?? moment?.kindIds[0];
    return (<AppShell>
      <PageHeader titel="Nu afstemmen" subtitel={s.situatie ? (opties.find((o) => o.id === s.situatie)?.titel ?? extraTitels[s.situatie] ?? "") : "Waarover wil je nu afstemmen?"} terug="/"/>
      {moment ? (<p className="mt-4 border-l-2 border-brand pl-3 text-sm">
          <b>{momentLabel(moment)}</b>
          <span className="block text-xs text-ink-soft">{moment.kindIds.map((k) => kindNaam[k]).join(" & ")} · {moment.plek}</span>
        </p>) : null}

      {!s.situatie ? (<ul className="mt-6 divide-y divide-border border-y border-border">
          {opties.map((o) => (<li key={o.id}>
              <button onClick={() => ga({ situatie: o.id })} className="flex w-full items-center gap-3 py-3.5 text-left">
                <AppIcon functie={o.icoon}/>
                <span className="flex-1 text-sm font-semibold">{o.titel}</span>
                <span className="text-ink-soft">›</span>
              </button>
            </li>))}
        </ul>) : s.situatie === "later" ? (<Later moment={moment}/>) : s.situatie === "ziek" ? (<Ziek kind={kind} onKind={(k) => ga({ kind: k })} onAfspraak={(id) => ga({ situatie: "afspraak", moment: id })} onHalen={(id) => ga({ situatie: "anderhaalt", moment: id })}/>) : s.situatie === "halen" || s.situatie === "anderhaalt" ? (<Halen moment={moment} kind={kind} kiesMoment={(id) => ga({ moment: id })} direct={s.situatie === "anderhaalt"} onTijd={() => ga({ situatie: "afspraak" })}/>) : s.situatie === "afspraak" ? (<AfspraakWijzigen moment={moment} kind={kind} kiesMoment={(id) => ga({ moment: id })}/>) : s.situatie === "taak" ? (<div className="mt-6 space-y-3">
          <p className="text-sm text-ink-soft">Kies bij een taak "Taak overdragen". De ander krijgt de taak pas als die accepteert.</p>
          <Link to="/taken" className={`inline-block ${primair}`}>Naar taken</Link>
        </div>) : (<div className="mt-6 space-y-3">
          <p className="text-sm text-ink-soft">Iets anders? Deel het rustig, of doe een voorstel.</p>
          <div className="grid gap-2">
            <Link to="/berichten" className={knop}>Bericht sturen →</Link>
            <Link to="/samen-regelen" className={knop}>Iets samen regelen →</Link>
          </div>
        </div>)}
      {s.situatie ? <button onClick={() => router.navigate({ to: "/veranderd", search: {}, replace: true })} className="mt-8 text-xs font-semibold text-ink-soft">← Andere situatie kiezen</button> : null}
    </AppShell>);
}
function KindKeuze({ kind, onKind }) {
    return (<div className="mt-2 flex gap-2">
      {["emma", "noah"].map((k) => (<button key={k} onClick={() => onKind(k)} aria-pressed={kind === k} className={`rounded-full px-4 py-1.5 text-sm font-semibold ${kind === k ? "bg-brand text-primary-foreground" : "border border-border text-ink-soft"}`}>{kindNaam[k]}</button>))}
    </div>);
}
const gevolgOpties = [
    { id: "school", label: "School/opvang" },
    { id: "halen", label: "Ophalen of brengen" },
    { id: "wissel", label: "Wisselmoment" },
    { id: "activiteit", label: "Activiteit/afspraak" },
    { id: "geen", label: "Geen gevolgen voor de planning" },
];
function Ziek({ kind, onKind, onAfspraak, onHalen }) {
    const kring = useKring();
    const [gevolgen, setGevolgen] = useState([]);
    const toggle = (id) => setGevolgen((g) => (id === "geen" ? (g.includes("geen") ? [] : ["geen"]) : g.includes(id) ? g.filter((x) => x !== id) : [...g.filter((x) => x !== "geen"), id]));
    const voorKind = kind ? kring.momenten.filter((m) => m.kindIds.includes(kind)) : [];
    const wissel = voorKind.find((m) => m.soort === "wissel");
    const afspraak = voorKind.find((m) => m.soort === "afspraak");
    return (<div className="mt-6 space-y-6">
      <div><p className={kop}>Wie is ziek?</p><KindKeuze kind={kind} onKind={onKind}/></div>
      {kind ? (<div>
          <p className={kop}>Heeft dit gevolgen voor de planning?</p>
          <div className="mt-2 grid gap-2">
            {gevolgOpties.map((g) => (<label key={g.id} className="flex items-center gap-3 text-sm">
                <input type="checkbox" checked={gevolgen.includes(g.id)} onChange={() => toggle(g.id)} className="size-4 accent-[var(--brand)]"/>{g.label}
              </label>))}
          </div>
        </div>) : null}
      {kind && gevolgen.length ? (<div className="space-y-4 border-t border-border pt-4">
          {gevolgen.includes("school") ? <p className="text-sm">Ziekmelden bij school of opvang doe je zelf; de app geeft dit niet door.</p> : null}
          {gevolgen.includes("wissel") && wissel ? (<div>
              <p className="text-sm">{wissel.dag} om {uur(wissel.tijd)} staat een wisselmoment gepland.</p>
              <p className="text-xs text-ink-soft">Een ziekmelding verandert de verdeling van de week niet. Wil je iets aanpassen, dan doe je een voorstel.</p>
              <Link to="/zorgregeling" search={{ actie: "wijziging", bron: "ziek" }} className="mt-2 inline-block text-sm font-semibold text-brand">Wijziging voorstellen →</Link>
            </div>) : null}
          {gevolgen.includes("halen") && wissel ? (<div>
              <p className="text-sm">{momentLabel(wissel)}</p>
              <button onClick={() => onHalen(wissel.id)} className="mt-1 text-sm font-semibold text-brand">Iemand anders laten halen of brengen →</button>
            </div>) : null}
          {gevolgen.includes("activiteit") && afspraak ? (<div>
              <p className="text-sm">{afspraak.titel} staat {afspraak.dag.toLowerCase()} om {uur(afspraak.tijd)} gepland.</p>
              <button onClick={() => onAfspraak(afspraak.id)} className="mt-1 text-sm font-semibold text-brand">Afspraak aanpassen →</button>
            </div>) : null}
          {gevolgen.includes("geen") ? <p className="text-sm">Dan blijft alles zoals gepland.</p> : null}
          <Link to="/berichten" className="inline-block text-sm font-semibold text-brand">De andere ouder laten weten →</Link>
          <p className="text-[11px] text-ink-soft">De app geeft geen medisch advies; dit gaat alleen over de praktische planning.</p>
        </div>) : null}
    </div>);
}
function MomentKeuze({ kind, moment, kiesMoment, filter }) {
    const kring = useKring();
    const lijst = kring.momenten.filter((m) => (!kind || m.kindIds.includes(kind)) && (!filter || filter(m)));
    if (moment)
        return null;
    return (<div className="mt-6">
      <p className={kop}>Om welk moment gaat het?</p>
      <div className="mt-2 grid gap-2">
        {lijst.map((m) => <button key={m.id} onClick={() => kiesMoment(m.id)} className={knop}>{momentLabel(m)}</button>)}
      </div>
    </div>);
}
function Halen({ moment, kind, kiesMoment, direct, onTijd }) {
    useKring();
    useTaken();
    const [kringOpen, setKringOpen] = useState(direct);
    const [hulpOpen, setHulpOpen] = useState(false);
    useEffect(() => setKringOpen(direct), [direct]);
    if (!moment)
        return <MomentKeuze kind={kind} moment={moment} kiesMoment={kiesMoment}/>;
    const status = regelStatus(moment.id);
    const kandidaten = kandidatenVoor(moment);
    return (<div className="mt-6 space-y-5">
      {status && status.wie !== "sanne" && status.wie !== "joris" ? (<p className={`text-sm font-semibold ${status.bevestigd ? "text-brand" : "text-ink-soft"}`}>{status.tekst}</p>) : null}
      {!kringOpen ? (<div>
          <p className={kop}>Wat wil je doen?</p>
          <div className="mt-2 grid gap-2">
            <button onClick={() => setKringOpen(true)} className={knop}>Iemand uit de kring vragen</button>
            <Link to="/zorgregeling" search={{ actie: "wijziging", bron: "veranderd" }} className={knop}>Andere oplossing voorstellen</Link>
            <button onClick={onTijd} className={knop}>Tijd wijzigen</button>
            <button onClick={onTijd} className={knop}>Locatie wijzigen</button>
            <button onClick={() => setHulpOpen(true)} className={knop}>Hulp vragen aan je netwerk</button>
          </div>
          {hulpOpen ? <HulpForm voorstel={{ kind: moment.kindIds.length > 1 ? "beide" : moment.kindIds[0] ?? "emma", wat: moment.titel, tijd: moment.tijd }} onKlaar={() => setHulpOpen(false)}/> : null}
        </div>) : (<div>
          <p className={kop}>Wie kan dit overnemen?</p>
          <div className="mt-2 grid gap-2">
            {kandidaten.map((p) => (<button key={p.id} onClick={() => zetWie(moment.id, p.id)} aria-pressed={status?.wie === p.id} className={`${knop} flex items-center justify-between ${status?.wie === p.id ? "border-brand" : ""}`}>
                <span>{persoonLabel(p)} vragen</span>{status?.wie === p.id ? <Check className="size-4 text-brand"/> : null}
              </button>))}
            {contactKandidaten(moment).map((p) => (<button key={p.id} onClick={() => zetWie(moment.id, p.id)} aria-pressed={status?.wie === p.id} className={`${knop} flex items-center justify-between ${status?.wie === p.id ? "border-brand" : ""}`}>
                <span>{persoonLabel(p)} <span className="text-[11px] font-normal text-ink-soft">· contact, zonder app</span></span>{status?.wie === p.id ? <Check className="size-4 text-brand"/> : null}
              </button>))}
            {status && status.wie !== "sanne" && status.wie !== "joris" ? <p className="text-[11px] text-ink-soft">{status.tekst}</p> : null}
            {kandidaten.length === 0 ? <p className="text-sm text-ink-soft">Nog niemand in de kring heeft toegang tot dit moment.</p> : null}
            <Link to="/kring/$kindId" params={{ kindId: moment.kindIds[0] }} className="text-sm font-semibold text-brand">+ Andere verzorger toevoegen</Link>
          </div>
          <p className="mt-3 text-[11px] text-ink-soft">Iemand vragen is nog geen afspraak: pas na bevestiging staat het vast. Heeft iemand geen eigen toegang, dan is alleen door jou geregistreerd dat het is afgesproken.</p>
          {status && status.wie !== "sanne" && status.wie !== "joris" && kandidaten.some((p) => p.id === status.wie) ? (<div className="mt-4 border-t border-border pt-3">
              <p className={kop}>Wat {kandidaten.find((p) => p.id === status.wie) ? persoonLabel(kandidaten.find((p) => p.id === status.wie)) : ""} te zien krijgt</p>
              <p className="mt-1 text-sm font-semibold">{moment.dag} · {moment.titel}</p>
              <p className="text-xs text-ink-soft">{uur(moment.tijd)} · {moment.plek}</p>
              <p className="mt-1 text-xs">Mee: {meeLijst(moment).join(", ")}</p>
              {moment.daarna ? <p className="text-xs">Daarna: {moment.daarna}</p> : null}
              <p className="mt-1 text-[11px] text-ink-soft">Geen berichten, kosten, voorstellen of de volledige verdeling van de week.</p>
            </div>) : null}
        </div>)}
    </div>);
}
function AfspraakWijzigen({ moment, kind, kiesMoment }) {
    const [tijd, setTijd] = useState(moment?.tijd ?? "");
    const [plek, setPlek] = useState(moment?.plek ?? "");
    const [klaar, setKlaar] = useState(null);
    useEffect(() => { setTijd(moment?.tijd ?? ""); setPlek(moment?.plek ?? ""); setKlaar(null); }, [moment?.id]);
    if (!moment)
        return <MomentKeuze kind={kind} moment={moment} kiesMoment={kiesMoment}/>;
    const isWissel = moment.soort === "wissel";
    const opslaan = () => {
        if (isWissel) {
            dienVoorstelIn({
                soort: "eenmalig", aanleiding: "moment", kinderen: moment.kindIds, dagen: [],
                tekst: `${moment.titel} ${moment.dag.toLowerCase()}: ${tijd !== moment.tijd ? `${uur(moment.tijd)} → ${uur(tijd)}` : ""}${plek !== moment.plek ? ` ${moment.plek} → ${plek}` : ""}`.trim(),
                datumLabel: `${moment.dag} ${moment.tijd}`,
                moment: { id: moment.id, ...(tijd !== moment.tijd ? { tijd } : {}), ...(plek !== moment.plek ? { plek } : {}) },
            });
            setKlaar("Voorstel verstuurd. De huidige tijd en plek blijven gelden tot er akkoord is.");
        }
        else {
            wijzigMoment(moment.id, { tijd, plek });
            setKlaar("Afspraak aangepast en vastgelegd in de geschiedenis.");
        }
    };
    return (<div className="mt-6 space-y-3">
      {isWissel ? <p className="text-xs text-ink-soft">Een wisselmoment pas je aan via een voorstel; het verandert pas na akkoord.</p> : null}
      <label className="block text-xs text-ink-soft">Tijd<input type="time" value={tijd} onChange={(e) => setTijd(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-ink"/></label>
      <label className="block text-xs text-ink-soft">Locatie<input value={plek} onChange={(e) => setPlek(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-ink"/></label>
      {klaar ? <p className="text-sm font-semibold text-brand">{klaar}</p> : (<button disabled={tijd === moment.tijd && plek === moment.plek} onClick={opslaan} className={`${primair} disabled:opacity-40`}>{isWissel ? "Voorstel versturen" : "Opslaan"}</button>)}
    </div>);
}
function Later({ moment }) {
    const [min, setMin] = useState(null);
    const [ander, setAnder] = useState(false);
    const [tijd, setTijd] = useState("");
    const [klaar, setKlaar] = useState(false);
    const wat = moment ? `${moment.titel} (${uur(moment.tijd)})` : "ons wisselmoment";
    const tekst = min ? `Ik ben ongeveer ${min} minuten later voor ${wat}. Sorry voor het ongemak, ik laat het weten als ik er ben.` : tijd ? `Ik ben later voor ${wat}. Ik verwacht er rond ${uur(tijd)} te zijn.` : "";
    if (klaar)
        return <p className="mt-6 flex items-center gap-2 text-sm font-semibold"><Check className="size-4 text-brand"/> Bericht klaargezet voor de andere ouder (voorbeeld). De planning blijft hetzelfde.</p>;
    return (<div className="mt-6 space-y-4">
      <p className={kop}>Hoeveel later?</p>
      <div className="flex flex-wrap gap-2">
        {[10, 20, 30].map((m) => (<button key={m} onClick={() => { setMin(m); setAnder(false); }} aria-pressed={min === m} className={`rounded-full px-4 py-2 text-sm font-semibold ${min === m ? "bg-brand text-primary-foreground" : "border border-border"}`}>+{m} min</button>))}
        <button onClick={() => { setAnder(true); setMin(null); }} aria-pressed={ander} className={`rounded-full px-4 py-2 text-sm font-semibold ${ander ? "bg-brand text-primary-foreground" : "border border-border"}`}>Andere tijd</button>
      </div>
      {ander ? <input type="time" value={tijd} onChange={(e) => setTijd(e.target.value)} className="rounded-md border border-border bg-background px-3 py-2 text-sm" aria-label="Verwachte tijd"/> : null}
      {tekst ? (<div className="space-y-3">
          <p className={kop}>Bericht aan de andere ouder</p>
          <p className="border-l-2 border-brand pl-3 text-sm">{tekst}</p>
          <button onClick={() => setKlaar(true)} className={primair}>Bericht versturen</button>
        </div>) : null}
    </div>);
}
