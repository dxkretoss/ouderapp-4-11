import { uur } from "@/lib/tijd-tekst";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { accepteerHulp, useHulpVerzoeken } from "@/lib/taken-store";
import { z } from "zod";
import { Bell, Check, Heart, Home, Menu, ShieldPlus } from "lucide-react";
import { kinderen, parents, useGezondheid } from "@/lib/demo-data";
import { useMomentjes } from "@/lib/momentjes-store";
import { DeelMomentje, MomentjeKaart } from "@/components/Momentjes";
import { bevestig, isActief, mag, persoonLabel, toggleMee, useKring, } from "@/lib/kring-store";
export const Route = createFileRoute("/verzorger")({
    validateSearch: z.object({ p: z.string().optional(), s: z.string().optional() }),
    head: () => ({ meta: [
            { title: "Voor de kring — Ouderschap & Co" },
            { name: "description", content: "Eenvoudige weergave voor opa's, oma's en verzorgers: alleen wat jij nodig hebt rondom het kind." },
            { property: "og:title", content: "Voor de kring — Ouderschap & Co" },
            { property: "og:description", content: "Alleen wat jij nodig hebt rondom het kind." },
            { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
        ] }),
    component: Verzorger,
});
function Verzorger() {
    const { p: pid, s } = Route.useSearch();
    const kring = useKring();
    if (!pid) {
        return (<Kader>
        <h1 className="font-display text-3xl">Voorbeeld: de kring</h1>
        <p className="mt-2 text-sm text-ink-soft">Bekijk de app zoals iemand uit de kring hem ziet. Iedereen ziet alleen wat ouders met hem of haar delen.</p>
        <div className="mt-6 divide-y divide-border border-y border-border">
          {kring.personen.map((p) => (<Link key={p.id} to="/verzorger" search={{ p: p.id, s: p.sleutel }} className="flex items-center justify-between py-3 text-sm">
              <span><b>{persoonLabel(p)}</b><span className="block text-xs text-ink-soft">{p.rol}{isActief(p) ? "" : " · geen toegang meer"}</span></span>›
            </Link>))}
        </div>
        <Link to="/meer" className="mt-6 block text-center text-xs font-semibold text-brand">Terug naar de ouder-app</Link>
      </Kader>);
    }
    const p = kring.personen.find((x) => x.id === pid);
    // Oude of ingetrokken links werken niet meer: sleutel moet kloppen en toegang moet actief zijn.
    if (!p || p.sleutel !== s || !isActief(p)) {
        return (<Kader>
        <h1 className="font-display text-2xl">Deze link werkt niet meer</h1>
        <p className="mt-2 text-sm text-ink-soft">De toegang is verlopen of gestopt. Neem contact op met de ouders als je denkt dat dit niet klopt.</p>
        <Link to="/verzorger" className="mt-6 block text-xs font-semibold text-brand">Terug naar het voorbeeld</Link>
      </Kader>);
    }
    return <KringApp p={p}/>;
}
function Kader({ children, nav }) {
    return (<div className="app-canvas min-h-screen w-full font-body text-ink">
      <div className="mx-auto max-w-md px-5 pb-32 pt-8">{children}</div>
      {nav}
    </div>);
}
const kop = "text-[11px] font-bold uppercase tracking-[0.14em] text-brand";
function KringApp({ p }) {
    const kring = useKring();
    const hulpLijst = useHulpVerzoeken();
    const { lijst } = useMomentjes();
    const [tab, setTab] = useState("home");
    const [deel, setDeel] = useState(false);
    const kids = kinderen.filter((k) => p.rechten[k.id]);
    const kidsMet = (o, min) => kids.filter((k) => mag(p, k.id, o, min));
    const momentjesKids = kidsMet("momentjes");
    const magDelen = kidsMet("momentjes", "bijdragen").length > 0;
    const wisselKids = kidsMet("wissel");
    const noodKids = kidsMet("nood");
    const zichtbaarMoment = (m) => m.kindIds.some((k) => mag(p, k, m.soort === "wissel" ? "wissel" : "agenda"));
    const mijnMomenten = kring.momenten.filter((m) => kring.wie[m.id] === p.id && zichtbaarMoment(m));
    const wissels = kring.momenten.filter((m) => m.soort === "wissel" && m.kindIds.some((k) => wisselKids.some((x) => x.id === k)));
    const mijnMomentjes = lijst.filter((m) => !m.prive && momentjesKids.some((k) => k.id === m.kindId) && (m.auteurId === p.id || m.kringIds?.includes(p.id)));
    const hulpVoorMij = hulpLijst.filter((h) => h.ontvangers.includes(p.id));
    const tabs = [
        { id: "home", label: "Home", icoon: Home },
        ...(momentjesKids.length ? [{ id: "momentjes", label: "Momentjes", icoon: Heart }] : []),
        { id: "meer", label: "Menu", icoon: Menu },
    ];
    const nav = (<nav className="fixed bottom-0 left-1/2 z-20 w-full max-w-md -translate-x-1/2 border-t border-border bg-background">
      <div className="flex justify-around pt-2.5 pb-1">
        {tabs.map((t) => (<button key={t.id} onClick={() => setTab(t.id)} className={`flex flex-col items-center gap-1 border-t-2 px-4 py-1 ${tab === t.id ? "border-brand text-ink" : "border-transparent text-ink-soft"}`}>
            <t.icoon className="size-5" strokeWidth={1.6}/><span className="text-[11px] font-semibold">{t.label}</span>
          </button>))}
      </div>
    </nav>);
    const naamKids = (ids) => kids.filter((k) => ids.includes(k.id)).map((k) => k.naam).join(" en ");
    const meldingen = [
        ...mijnMomenten.map((m) => `${m.dag} ${m.soort === "wissel" ? "haal" : "breng"} je ${naamKids(m.kindIds.filter((k) => mag(p, k, m.soort === "wissel" ? "wissel" : "agenda")))} om ${m.tijd}`),
        ...(mijnMomentjes.some((m) => m.auteurId !== p.id) ? ["Nieuw Momentje gedeeld"] : []),
    ];
    return (<Kader nav={nav}>
      <div className="flex items-center justify-between">
        <p className="text-xs text-ink-soft">Hoi {p.naam}</p>
        <Link to="/verzorger" className="text-[11px] font-semibold text-brand">Voorbeeld sluiten</Link>
      </div>

      {tab === "home" ? (<>
          <h1 className="mt-1 font-display text-3xl">{mijnMomenten.length ? "Binnenkort" : "Alles rustig"}</h1>
          {mijnMomenten.length === 0 ? <p className="mt-2 text-sm text-ink-soft">Je hebt geen afspraken rondom {naamKids(kids.map((k) => k.id))}.</p> : null}
          <div className="mt-5 space-y-6">
            {mijnMomenten.map((m) => <MijnMoment key={m.id} m={m} p={p}/>)}
          </div>

          {wissels.length && !mijnMomenten.some((m) => m.soort === "wissel") ? (<section className="mt-8">
              <h2 className={kop}>Volgende wisselmoment</h2>
              <p className="mt-2 text-sm font-semibold">{wissels[0].dag} · {wissels[0].tijd}</p>
            </section>) : null}

          {hulpVoorMij.length ? (<section className="mt-8">
              <h2 className={kop}>Hulp gevraagd</h2>
              {hulpVoorMij.map((h) => (<div key={h.id} className="mt-2 border-b border-border pb-3 text-sm">
                  <p className="font-semibold">{h.wat}</p>
                  <p className="text-xs text-ink-soft">{new Date(h.datum).toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" })} · {uur(h.tijd)}</p>
                  {h.status === "open" ? <button onClick={() => accepteerHulp(h.id, p.id)} className="mt-2 min-h-11 rounded-full bg-brand px-4 text-xs font-semibold text-primary-foreground">Ik doe het</button>
                        : <p className="mt-1 text-xs text-ink-soft">{h.geaccepteerdDoor === p.id ? "Jij regelt dit. De ouders zien dat je het oppakt." : h.status === "geaccepteerd" ? "Iemand anders regelt dit al. Dank je wel!" : "Dit verzoek is niet meer nodig."}</p>}
                </div>))}
            </section>) : null}

          {mijnMomentjes[0] ? (<section className="mt-8">
              <h2 className={kop}>Nieuw Momentje</h2>
              <p className="mt-2 text-sm">{mijnMomentjes[0].tekst}</p>
              <button onClick={() => setTab("momentjes")} className="mt-2 text-xs font-semibold text-brand">Bekijk Momentje ›</button>
            </section>) : null}

          {meldingen.length ? (<section className="mt-8">
              <h2 className={kop}>Meldingen</h2>
              <ul className="mt-2 divide-y divide-border border-y border-border text-sm">
                {meldingen.map((t) => <li key={t} className="flex items-center gap-2 py-2.5"><Bell className="size-3.5 text-ink-soft" strokeWidth={1.6}/>{t}</li>)}
              </ul>
            </section>) : null}
        </>) : null}

      {tab === "momentjes" ? (<>
          <div className="mt-1 flex items-center justify-between">
            <h1 className="font-display text-3xl">Momentjes</h1>
            {magDelen ? <button onClick={() => setDeel(true)} className="text-xs font-semibold text-brand">+ Deel</button> : null}
          </div>
          <div className="mt-5 space-y-3">
            {mijnMomentjes.map((m) => <MomentjeKaart key={m.id} m={m} kijker={p.id}/>)}
            {mijnMomentjes.length === 0 ? <p className="text-sm text-ink-soft">Er zijn nog geen momentjes met je gedeeld.</p> : null}
          </div>
          {magDelen ? <DeelMomentje open={deel} onSluit={() => setDeel(false)} alsKring={p.id}/> : null}
        </>) : null}

      {tab === "meer" ? (<>
          <h1 className="mt-1 font-display text-3xl">Menu</h1>
          {wisselKids.length ? (<section className="mt-6">
              <h2 className={kop}>Komende wisselmomenten</h2>
              <div className="mt-1 divide-y divide-border border-y border-border">
                {wissels.map((m) => (<div key={m.id} className="py-3 text-sm">
                    <p className="font-semibold">{m.dag} · {uur(m.tijd)}</p>
                    <p className="text-xs text-ink-soft">Wisselmoment · {m.plek}</p>
                  </div>))}
              </div>
            </section>) : null}
          {noodKids.map((k) => <Noodkaart key={k.id} kindId={k.id}/>)}
          {!wisselKids.length && !noodKids.length ? <p className="mt-4 text-sm text-ink-soft">Er is verder niets met je gedeeld.</p> : null}
        </>) : null}
    </Kader>);
}
function MijnMoment({ m, p }) {
    const kring = useKring();
    const kids = kinderen.filter((k) => m.kindIds.includes(k.id) && mag(p, k.id, m.soort === "wissel" ? "wissel" : "agenda"));
    const spullen = m.kindIds.some((k) => mag(p, k, "spullen"));
    const spullenAanpassen = m.kindIds.some((k) => mag(p, k, "spullen", "bijdragen"));
    const agenda = m.kindIds.some((k) => mag(p, k, "agenda"));
    const klaar = kring.meeKlaar[m.id] ?? [];
    const bev = kring.bevestigd[m.id];
    const nogMee = m.mee.filter((x) => !klaar.includes(x)).length;
    return (<section className="border-t border-border pt-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand">{m.dag}</p>
      <p className="mt-1 font-display text-xl">{uur(m.tijd)} · {m.soort === "wissel" ? `Jij haalt ${kids.map((k) => k.naam).join(" en ")} op` : m.titel}</p>
      <p className="text-sm text-ink-soft">{m.plek}</p>
      {spullen ? (<>
          <p className="mt-3 text-xs font-semibold">Mee {nogMee ? `· ${nogMee} nog te doen` : ""}</p>
          <ul className="mt-1 space-y-1">
            {m.mee.map((x) => {
                const ok = klaar.includes(x);
                return (<li key={x}>
                  <button disabled={!spullenAanpassen} onClick={() => toggleMee(m.id, x)} className="flex items-center gap-2 text-sm">
                    <span className={`grid size-5 place-items-center rounded-full border ${ok ? "border-brand bg-brand text-primary-foreground" : "border-border"}`}>{ok ? <Check className="size-3"/> : null}</span>{x}
                  </button>
                </li>);
            })}
          </ul>
        </>) : null}
      {agenda && m.daarna ? <p className="mt-3 text-xs"><b>Daarna</b> · {m.daarna}</p> : null}
      <div className="mt-4 flex gap-2">
        <button onClick={() => bevestig(m.id, "regel")} className={`flex-1 rounded-md border py-2.5 text-sm font-semibold ${bev === "regel" ? "border-brand bg-brand-soft" : "border-border"}`}>Ik regel dit {bev === "regel" ? "✓" : ""}</button>
        <button onClick={() => bevestig(m.id, "er")} className={`flex-1 rounded-md py-2.5 text-sm font-semibold ${bev === "er" ? "bg-brand text-primary-foreground" : "border border-border"}`}>Ik ben er {bev === "er" ? "✓" : ""}</button>
      </div>
    </section>);
}
function Noodkaart({ kindId }) {
    const kring = useKring();
    const k = kinderen.find((x) => x.id === kindId);
    const b = useGezondheid(kindId);
    const v = kring.noodkaart[kindId] ?? [];
    if (!k || !b)
        return null;
    const rij = (l, w) => <div key={l} className="py-2"><p className="text-[11px] uppercase tracking-wide text-ink-soft">{l}</p><p className="text-sm">{w}</p></div>;
    return (<section className="mt-7">
      <h2 className={`${kop} flex items-center gap-1.5`}><ShieldPlus className="size-3.5" strokeWidth={1.6}/>Noodkaart {k.naam}</h2>
      <div className="mt-1 divide-y divide-border border-y border-border">
        {rij("Naam", `${k.naam} ${k.achternaam}`)}
        {v.includes("geboortedatum") ? rij("Geboren", k.geboortedatum) : null}
        {v.includes("contacten") ? rij("Noodcontacten", `${parents.sanne.naam} · ${parents.joris.naam}`) : null}
        {v.includes("huisarts") ? rij("Huisarts", b.huisarts) : null}
        {v.includes("allergieen") ? rij("Allergieën", b.allergieen) : null}
        {v.includes("medicatie") ? rij("Medicatie", b.medicatie) : null}
        {v.includes("extra") && kring.noodExtra[kindId] ? rij("Goed om te weten", kring.noodExtra[kindId]) : null}
      </div>
    </section>);
}
