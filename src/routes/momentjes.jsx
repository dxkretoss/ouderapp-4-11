import { useTranslation } from "react-i18next";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, Card, PageHeader } from "@/components/AppShell";
import { DeelMomentje, MomentjeKaart } from "@/components/Momentjes";
import { kinderen } from "@/lib/demo-data";
import { setHerinnering, setProfessionals, useMomentjes, voegMomentjeToe } from "@/lib/momentjes-store";
import { bevestig } from "@/lib/feedback";
import { TekenLabel } from "@/components/AppIcon";
import { useStart } from "@/lib/start-store";
import { useNavigate } from "@tanstack/react-router";
// Eigen gezin: eigen momentjes (geen voorbeelddata), met plusje en toevoegformulier.
function MomentjesPaginaWrap() {
    const { t } = useTranslation();
    const st = useStart();
    if (st.eigen)
        return <EigenMomentjes />;
    return <MomentjesPagina />;
}
function EigenMomentjes() {
    const st = useStart();
    const { lijst } = useMomentjes();
    const nav = useNavigate();
    const [nieuw, setNieuw] = useState(false);
    const [tekst, setTekst] = useState("");
    const [kind, setKind] = useState(st.kinderen[0]?.id ?? "");
    const eigen = lijst.filter((m) => st.kinderen.some((k) => k.id === m.kindId));
    const kindNaamVan = (id) => st.kinderen.find((k) => k.id === id)?.naam ?? "";
    const opslaan = () => {
        if (!tekst.trim() || !kind)
            return;
        const nu = new Date();
        voegMomentjeToe({
            id: `m${Date.now()}`, kindId: kind, van: "sanne", tekst: tekst.trim(),
            wanneer: nu.toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "long" }) + ` · ${nu.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })} uur`,
            datum: nu.toISOString().slice(0, 10), moment: "geen", prive: false,
        });
        bevestig("Momentje bewaard", { uitleg: tekst.trim() });
        setTekst("");
        setNieuw(false);
    };
    const knop = (aan) => `min-h-11 rounded-full border px-3 text-sm ${aan ? "border-brand bg-brand-soft font-semibold" : "border-border"}`;
    return (<AppShell>
      <PageHeader titel={t("momentsPage.headerTitle", "Momentjes")} subtitel="Je hoeft er niet altijd bij te zijn om er een beetje bij te zijn" terug="/meer" actie={<button aria-label="Momentje toevoegen" onClick={() => setNieuw(true)} className="inline-flex size-11 items-center justify-center rounded-full text-xl font-semibold text-brand hover:bg-muted">+</button>}/>
      {nieuw ? (<Card className="mt-4 space-y-3">
          <p className="font-display text-lg font-bold">Nieuw momentje</p>
          <label className="block text-sm font-semibold">Wat wil je bewaren?<textarea value={tekst} onChange={(e) => setTekst(e.target.value)} placeholder="Bijv. eerste keer zelf fietsen" rows={3} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-normal"/></label>
          {st.kinderen.length ? (<fieldset><legend className="text-sm font-semibold">Van welk kind?</legend><div className="mt-1 flex flex-wrap gap-2">
              {st.kinderen.map((k) => <button key={k.id} onClick={() => setKind(k.id)} aria-pressed={kind === k.id} className={knop(kind === k.id)}>{k.naam}</button>)}
            </div></fieldset>) : null}
          <div className="flex gap-2">
            <button onClick={opslaan} className="min-h-11 flex-1 rounded-full bg-brand text-sm font-semibold text-primary-foreground">Bewaren</button>
            <button onClick={() => setNieuw(false)} className="min-h-11 px-3 text-sm text-ink-soft">Annuleren</button>
          </div>
        </Card>) : null}
      {!eigen.length && !nieuw ? (<div className="mt-10 flex flex-col items-center text-center">
          <p className="font-display text-lg font-bold">Hier is het nog rustig</p>
          <p className="mt-1 max-w-xs text-sm text-ink-soft">Hier bewaar je mooie en belangrijke momentjes van de kinderen.</p>
          <button onClick={() => setNieuw(true)} className="mt-5 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-primary-foreground">Eerste momentje bewaren</button>
          <button onClick={() => nav({ to: "/meer" })} className="mt-3 min-h-11 text-sm font-semibold text-ink-soft">Terug naar Menu</button>
        </div>) : null}
      <div className="mt-4 space-y-3">
        {eigen.map((m) => (<Card key={m.id}>
            <p className="text-xs font-semibold text-ink-soft">{kindNaamVan(m.kindId)} · {m.wanneer}</p>
            <p className="mt-1 text-sm">{m.tekst}</p>
          </Card>))}
      </div>
    </AppShell>);
}
export const Route = createFileRoute("/momentjes")({
    head: () => ({
        meta: [
            { title: "Momentjes — Ouderschap & Co" },
            { name: "description", content: "Deel leuke en bijzondere momenten van je kind met de andere ouder." },
            { property: "og:title", content: "Momentjes — Ouderschap & Co" },
            { property: "og:description", content: "Er een beetje bij zijn, ook als je er niet bent." },
            { property: "og:type", content: "website" },
            { name: "twitter:card", content: "summary" },
        ],
    }),
    component: MomentjesPaginaWrap,
});
function Schakel({ aan, onClick, label, uitleg }) {
    return (<button onClick={onClick} className="flex w-full items-center justify-between gap-3 py-3 text-left">
      <div><p className="text-sm font-semibold">{label}</p><p className="text-xs text-ink-soft">{uitleg}</p></div>
      <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${aan ? "bg-brand" : "bg-border"}`}>
        <span className={`absolute top-0.5 size-5 rounded-full bg-card shadow transition-all ${aan ? "left-5" : "left-0.5"}`}/>
      </span>
    </button>);
}
function MomentjesPagina() {
    const { t } = useTranslation();
    const { lijst, herinnering, professionals } = useMomentjes();
    const [open, setOpen] = useState(false);
    const [filter, setFilter] = useState("alle");
    const zichtbaar = filter === "alle" ? lijst : filter === "mijlpaal" ? lijst.filter((m) => m.mijlpaal) : lijst.filter((m) => m.kindId === filter);
    const chip = (a) => `shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${a ? "bg-brand text-primary-foreground" : "border border-border bg-surface"}`;
    const [filterOpen, setFilterOpen] = useState(false);
    const opties = [["alle", "Alles"], ...kinderen.map((k) => [k.id, k.naam]), ["mijlpaal", "Mijlpalen"]];
    const filterNaam = opties.find(([id]) => id === filter)?.[1] ?? "Alles";
    return (<AppShell>
      <PageHeader titel="Momentjes" subtitel="Je hoeft er niet altijd bij te zijn om er een beetje bij te zijn" terug="/meer"/>
      <button onClick={() => setOpen(true)} className="mt-5 w-full rounded-lg bg-brand py-5 font-display text-lg font-bold text-primary-foreground shadow-lg shadow-brand/30">
        <TekenLabel waarde="💛 Deel een momentje"/>
      </button>
      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-ink-soft">Je ziet: <span className="font-semibold text-ink">{filterNaam}</span></p>
        <button onClick={() => setFilterOpen(true)} className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold">Filter</button>
      </div>
      {filterOpen ? (<div className="fixed inset-0 z-50 flex items-end bg-ink/30" onClick={() => setFilterOpen(false)}>
          <div role="dialog" aria-label="Filter momentjes" className="mx-auto w-full max-w-md rounded-t-2xl bg-background p-5" onClick={(e) => e.stopPropagation()}>
            <p className="font-display font-bold">Wat wil je zien?</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {opties.map(([id, naam]) => (<button key={id} onClick={() => { setFilter(id); setFilterOpen(false); }} className={chip(filter === id)}>{naam}</button>))}
            </div>
          </div>
        </div>) : null}
      <div className="mt-3 space-y-3">
        {zichtbaar.map((m) => <MomentjeKaart key={m.id} m={m}/>)}
        {zichtbaar.length === 0 ? <p className="py-6 text-center text-sm text-ink-soft">Nog geen momentjes hier.</p> : null}
      </div>
      <h2 className="mt-6 font-display font-bold">Privacy &amp; herinneringen</h2>
      <Card className="mt-3 divide-y divide-border py-1">
        <Schakel aan={herinnering} onClick={() => setHerinnering(!herinnering)} label="Af en toe een zacht duwtje" uitleg={<>“Een leuk moment om te delen? <TekenLabel waarde="💛"/>” — nooit verplichtend</>}/>
        <Schakel aan={professionals} onClick={() => setProfessionals(!professionals)} label="Professionals mogen Momentjes zien" uitleg="Staat standaard uit, ook als zij elders toegang hebben"/>
      </Card>
      <p className="mt-3 text-xs text-ink-soft">
        Momentjes zijn helemaal vrijwillig en alleen zichtbaar binnen jullie gezin. Privé-momentjes blijven privé, ook als later iemand wordt uitgenodigd.
      </p>
      <DeelMomentje open={open} onSluit={() => setOpen(false)}/>
    </AppShell>);
}
