import { useTranslation } from "react-i18next";
import { uur } from "@/lib/tijd-tekst";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { z } from "zod";
import { useState } from "react";
import { Check, ChevronRight, ChevronLeft, Clock, HeartHandshake, Plus, ShieldCheck, UserRound, Users } from "lucide-react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { BewerkPotlood } from "@/components/ui-kit";
import { UitnodigingDelen } from "@/components/UitnodigingDelen";
import { kinderen, parents, professionals } from "@/lib/demo-data";
import { geenRechten, isActief, niveau, onderdelen, periodeTekst, persoonLabel, rechtenSamenvatting, rolOpties, toggleNoodVeld, trekIn, kandidatenVoor, contactKandidaten, noodcontacten, useKring, voegPersoonToe, wieNaam, wijzigPersoon, zetWie, } from "@/lib/kring-store";
export const Route = createFileRoute("/kring/$kindId")({
    validateSearch: z.object({ toevoegen: z.boolean().optional(), rol: z.string().optional() }),
    loader: ({ params }) => {
        const kind = kinderen.find((k) => k.id === params.kindId);
        if (!kind)
            throw notFound();
        return { naam: kind.naam };
    },
    head: ({ loaderData }) => {
        const t = loaderData ? `Belangrijke personen bij ${loaderData.naam} — Ouderschap & Co` : "Niet gevonden — Ouderschap & Co";
        const d = "De mensen die belangrijk zijn in het dagelijks leven van je kind, met precies de toegang die nodig is.";
        return { meta: [
                { title: t }, { name: "description", content: d },
                { property: "og:title", content: t }, { property: "og:description", content: d },
                { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
            ] };
    },
    notFoundComponent: () => <AppShell><PageHeader titel="Kind niet gevonden" terug="/kinderen"/></AppShell>,
    component: KringPagina,
});
const sectieKop = "text-[11px] font-bold uppercase tracking-[0.14em] text-brand";
const knop = "rounded-md bg-brand px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-40";
const veldK = "mt-1 w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm text-ink";
const keuze = (aan) => `rounded-md border px-3 py-2 text-sm font-semibold ${aan ? "border-brand bg-brand-soft text-ink" : "border-border text-ink-soft"}`;
function Rij({ icoon, titel, sub, extra, onClick }) {
    const inhoud = (<>
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-soft/70 text-brand">{icoon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{titel}</span>
        <span className="block text-xs text-ink-soft">{sub}</span>
        {extra ? <span className="mt-0.5 block text-xs text-ink-soft">{extra}</span> : null}
      </span>
      {onClick ? <ChevronRight className="size-4 text-ink-soft" strokeWidth={1.6}/> : null}
    </>);
    return onClick
        ? <button onClick={onClick} className="flex w-full items-center gap-3 py-3 text-left">{inhoud}</button>
        : <div className="flex items-center gap-3 py-3">{inhoud}</div>;
}
function KringPagina() {
    const { t } = useTranslation();
    const { kindId } = Route.useParams();
    const kind = kinderen.find((k) => k.id === kindId);
    const kring = useKring();
    const zoekK = Route.useSearch();
    const [scherm, setScherm] = useState(zoekK.toevoegen ? { t: "toevoegen" } : { t: "lijst" });
    const leden = kring.personen.filter((p) => p.rechten[kindId] && !p.ingetrokken);
    const momenten = kring.momenten.filter((m) => m.kindIds.includes(kindId));
    if (scherm.t === "toevoegen")
        return <Toevoegen kindId={kindId} beginRol={zoekK.rol} klaar={() => setScherm({ t: "lijst" })}/>;
    if (scherm.t === "persoon") {
        const p = kring.personen.find((x) => x.id === scherm.id);
        if (p)
            return <PersoonDetail p={p} kindId={kindId} terug={() => setScherm({ t: "lijst" })}/>;
    }
    if (scherm.t === "nood")
        return <NoodkaartInstellen kindId={kindId} terug={() => setScherm({ t: "lijst" })}/>;
    return (<AppShell>
      <PageHeader titel="Belangrijke personen" subtitel={`De mensen die belangrijk zijn in ${kind.naam}'s dagelijks leven.`} terug={`/kinderen/${kindId}`}/>

      <section className="mt-8">
        <h2 className={sectieKop}>Ouders</h2>
        <div className="mt-1 divide-y divide-border border-y border-border">
          <Rij icoon={<UserRound className="size-4" strokeWidth={1.6}/>} titel={parents.sanne.naam} sub="Ouder"/>
          <Rij icoon={<UserRound className="size-4" strokeWidth={1.6}/>} titel={parents.joris.naam} sub="Ouder"/>
        </div>
      </section>

      <section className="mt-7">
        <h2 className={sectieKop}>Familie & verzorgers</h2>
        <div className="mt-1 divide-y divide-border border-y border-border">
          {leden.map((p) => (<Rij key={p.id} icoon={p.foto ? <img src={p.foto} alt="" className="size-9 rounded-full object-cover"/> : <HeartHandshake className="size-4" strokeWidth={1.6}/>} titel={persoonLabel(p)} sub={`${p.rol}${p.noodcontact ? " · noodcontact" : ""}`} extra={p.uitgenodigd === false ? "Contact · geen toegang tot de app" : isActief(p) ? (p.periode.type === "doorlopend" ? rechtenSamenvatting(p, kindId) : periodeTekst(p.periode)) : "Toegang verlopen"} onClick={() => setScherm({ t: "persoon", id: p.id })}/>))}
          {leden.length === 0 ? <p className="py-3 text-sm text-ink-soft">Nog niemand toegevoegd.</p> : null}
        </div>
      </section>

      <section className="mt-7">
        <h2 className={sectieKop}>Professionals</h2>
        <div className="mt-1 divide-y divide-border border-y border-border">
          {professionals.filter((p) => p.status.startsWith("Actief")).map((p) => (<Link key={p.id} to="/professionals" className="block">
              <Rij icoon={<ShieldCheck className="size-4" strokeWidth={1.6}/>} titel={p.naam} sub={p.rol} extra="Beperkte professionele toegang"/>
            </Link>))}
        </div>
        <p className="mt-2 text-[11px] text-ink-soft">Professionals hebben een eigen, aparte toegang. Die beheer je via Professional betrekken.</p>
      </section>

      {noodcontacten(kindId).length ? (<p className="mt-3 text-xs text-ink-soft">Noodcontact: {noodcontacten(kindId).map((p) => `${persoonLabel(p)}${p.telefoon ? ` (${p.telefoon})` : ""}`).join(", ")}</p>) : null}
      <button onClick={() => setScherm({ t: "toevoegen" })} className="mt-6 flex w-full items-center justify-center gap-2 rounded-md border border-brand py-3 text-sm font-semibold text-brand">
        <Plus className="size-4" strokeWidth={1.8}/> Iemand toevoegen
      </button>

      <section className="mt-9">
        <h2 className={sectieKop}>Wie haalt of brengt?</h2>
        <p className="mt-1 text-xs text-ink-soft">Wie je kiest, ziet alleen wat nodig is voor dat moment.</p>
        <div className="mt-2 divide-y divide-border border-y border-border">
          {momenten.map((m) => {
            const wie = kring.wie[m.id];
            const kandidaten = kandidatenVoor(m);
            const bev = kring.bevestigd[m.id];
            return (<div key={m.id} className="py-3">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold">{m.dag} · {uur(m.tijd)} · {m.titel}</p>
                  {bev && wie && wie !== "sanne" && wie !== "joris" ? (<span className="flex items-center gap-1 text-[11px] font-semibold text-brand"><Check className="size-3"/>{bev === "er" ? "Is er" : "Bevestigd"}</span>) : null}
                </div>
                <p className="text-xs text-ink-soft">{m.plek}</p>
                <select value={wie ?? ""} onChange={(e) => zetWie(m.id, e.target.value)} aria-label={`Wie regelt ${m.titel}?`} className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                  <option value="sanne">Sanne</option>
                  <option value="joris">Joris</option>
                  {kandidaten.map((p) => <option key={p.id} value={p.id}>{persoonLabel(p)}</option>)}
                  {contactKandidaten(m).map((p) => <option key={p.id} value={p.id}>{persoonLabel(p)} (contact, zonder app)</option>)}
                </select>
                {wie && kring.personen.find((x) => x.id === wie)?.uitgenodigd === false ? <p className="mt-1 text-[11px] text-ink-soft">Door jou geregistreerd · geen digitale bevestiging</p> : bev && wie && !["sanne", "joris"].includes(wie) ? <p className="mt-1 text-[11px] text-ink-soft">{wieNaam(wie)} heeft bevestigd.</p> : wie && !["sanne", "joris"].includes(wie) ? <p className="mt-1 text-[11px] text-ink-soft">Wacht op bevestiging</p> : null}
                <Link to="/veranderd" search={{ moment: m.id, kind: kindId }} className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-brand">
                  <span>Nu afstemmen</span>
                  <ChevronRight className="size-3" />
                </Link>
              </div>);
        })}
        </div>
        <p className="mt-2 text-[11px] text-ink-soft">Alleen mensen met toegang tot wisselmomenten of agenda van alle betrokken kinderen kun je kiezen.</p>
      </section>

      <section className="mt-9">
        <h2 className={sectieKop}>Noodkaart voor verzorgers</h2>
        <div className="mt-1 border-y border-border">
          <Rij icoon={<ShieldCheck className="size-4" strokeWidth={1.6}/>} titel="Wat staat op de noodkaart?" sub={`${(kring.noodkaart[kindId] ?? []).length} onderdelen gedeeld`} onClick={() => setScherm({ t: "nood" })}/>
        </div>
      </section>

      <Link to="/verzorger" className="mt-8 flex items-center gap-2 text-xs font-semibold text-brand">
        <Users className="size-4" strokeWidth={1.6}/> Bekijk hoe de kring het ziet (voorbeeld)
      </Link>
    </AppShell>);
}
const suggestie = ["agenda", "wissel", "taken", "spullen", "nood", "momentjes"];
function Toevoegen({ kindId, klaar, beginRol }) {
    const kind = kinderen.find((k) => k.id === kindId);
    const [stap, setStap] = useState(1);
    const [rol, setRol] = useState(beginRol && rolOpties.includes(beginRol) ? beginRol : "");
    const [anders, setAnders] = useState("");
    const [naam, setNaam] = useState("");
    const [telefoon, setTelefoon] = useState("");
    const [email, setEmail] = useState("");
    const [adres, setAdres] = useState("");
    const [foto, setFoto] = useState();
    const [nood, setNood] = useState(false);
    const [kids, setKids] = useState([kindId]);
    const [periode, setPeriode] = useState({ type: "doorlopend" });
    const [rechten, setRechten] = useState({});
    const [voorstel, setVoorstel] = useState([]);
    const rolLabel = rol === "Anders" ? anders.trim() : rol;
    if (rol === "Professional") {
        return (<AppShell>
        <PageHeader titel="Professional betrekken" terug={`/kring/${kindId}`}/>
        <p className="mt-6 text-sm text-ink-soft">Professionals krijgen een aparte, professionele toegang met eigen afspraken over privacy.</p>
        <Link to="/professionals" className={`mt-5 block text-center ${knop}`}>Naar Professional betrekken</Link>
        <button onClick={() => setRol("")} className="mt-3 w-full py-2 text-sm text-ink-soft">Terug</button>
      </AppShell>);
    }
    const wieTitel = naam.trim() ? (["Opa", "Oma"].includes(rolLabel) ? `${rolLabel.toLowerCase()} ${naam.trim()}` : naam.trim()) : "deze persoon";
    const zetRecht = (k, o, n) => setRechten((r) => ({ ...r, [k]: { ...(r[k] ?? geenRechten()), [o]: n } }));
    const opslaan = () => {
        const def = {};
        kids.forEach((k) => { def[k] = rechten[k] ?? geenRechten(); });
        setVerstuurd(voegPersoonToe({ ...profiel(), periode, rechten: def, uitgenodigd: true }));
    };
    const [verstuurd, setVerstuurd] = useState(null);
    const profiel = () => ({ naam: naam.trim(), rol: rolLabel, contact: telefoon.trim() || email.trim(), telefoon: telefoon.trim() || undefined, email: email.trim() || undefined, adres: adres.trim() || undefined, foto, noodcontact: nood, gezag: "geen" });
    const alleenContact = () => {
        const def = {};
        kids.forEach((k) => { def[k] = geenRechten(); });
        voegPersoonToe({ ...profiel(), periode: { type: "doorlopend" }, rechten: def, uitgenodigd: false });
        klaar();
    };
    const leesFoto = (f) => { if (!f)
        return; const r = new FileReader(); r.onload = () => setFoto(String(r.result)); r.readAsDataURL(f); };
    return (<AppShell>
      <PageHeader titel={`Iemand toevoegen aan ${kind.naam}'s kring`} subtitel="Geef alleen toegang tot wat deze persoon nodig heeft." terug={`/kring/${kindId}`}/>
      <p className="mt-6 text-[11px] font-semibold text-ink-soft">Stap {stap} van 4</p>

      {stap === 1 ? (<>
          <h2 className="mt-2 font-display text-xl">Wie wil je toevoegen?</h2>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {[...rolOpties, "Professional"].map((r) => <button key={r} onClick={() => setRol(r)} className={keuze(rol === r)}>{r}</button>)}
          </div>
          {rol === "Anders" ? <input value={anders} onChange={(e) => setAnders(e.target.value)} placeholder="Bijv. tante, peetouder, buurtoppas" className="mt-3 w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm"/> : null}
          <button disabled={!rolLabel} onClick={() => setStap(2)} className={`mt-6 w-full ${knop}`}>Verder</button>
        </>) : null}

      {stap === 2 ? (<>
          <h2 className="mt-2 font-display text-xl">Wie is het?</h2>
          <label className="mt-4 block text-xs text-ink-soft">Naam<input value={naam} onChange={(e) => setNaam(e.target.value)} className={veldK}/></label>
          <p className="mt-1 text-[11px] text-ink-soft">Relatie tot {kind.naam}: {rolLabel}</p>
          <label className="mt-3 flex items-center gap-3 text-xs text-ink-soft">
            {foto ? <img src={foto} alt="" className="size-12 rounded-full object-cover"/> : <span className="grid size-12 place-items-center rounded-full bg-brand-soft text-brand"><UserRound className="size-5" strokeWidth={1.6}/></span>}
            <span>Profielfoto (optioneel)<input type="file" accept="image/*" onChange={(e) => leesFoto(e.target.files?.[0])} className="mt-1 block text-xs"/></span>
          </label>
          <label className="mt-3 block text-xs text-ink-soft">Telefoonnummer (optioneel)<input type="tel" value={telefoon} onChange={(e) => setTelefoon(e.target.value)} className={veldK}/></label>
          <label className="mt-3 block text-xs text-ink-soft">E-mailadres (optioneel)<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={veldK}/></label>
          <label className="mt-3 block text-xs text-ink-soft">Adres (optioneel)<input value={adres} onChange={(e) => setAdres(e.target.value)} className={veldK}/></label>
          <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={nood} onChange={() => setNood(!nood)} className="accent-[var(--brand)]"/> Noodcontact</label>
          <p className="mt-5 text-sm font-semibold">Voor welk kind?</p>
          <div className="mt-2 flex gap-2">
            {kinderen.map((k) => {
                const aan = kids.includes(k.id);
                return <button key={k.id} onClick={() => setKids(aan ? kids.filter((x) => x !== k.id) : [...kids, k.id])} className={keuze(aan)}>{aan ? "✓ " : ""}{k.naam}</button>;
            })}
          </div>
          <div className="mt-6 rounded-md border border-border p-3 text-xs text-ink-soft">
            Iemand opslaan geeft <span className="font-semibold text-ink">geen</span> toegang tot de app. Wil je dat deze persoon iets kan zien, kies dan "Uitnodigen voor de app" en bepaal zelf wat.
          </div>
          <div className="mt-4 grid gap-2">
            <button disabled={!naam.trim() || kids.length === 0} onClick={alleenContact} className="rounded-md border border-brand py-3 text-sm font-semibold text-brand disabled:opacity-40">Contact opslaan</button>
            <button disabled={!naam.trim() || kids.length === 0 || !(telefoon.trim() || email.trim())} onClick={() => setStap(3)} className={knop}>Uitnodigen voor de app</button>
            {naam.trim() && !(telefoon.trim() || email.trim()) ? <p className="text-[11px] text-ink-soft">Voor een uitnodiging is een telefoonnummer of e-mailadres nodig.</p> : null}
            <button onClick={() => setStap(1)} className="py-2 text-sm text-ink-soft">Terug</button>
          </div>
        </>) : null}

      {stap === 3 ? (<>
          <h2 className="mt-2 font-display text-xl">Hoe lang mag {wieTitel} toegang hebben?</h2>
          <PeriodeKeuze periode={periode} onChange={setPeriode}/>
          {periode.type !== "doorlopend" ? (<div className="mt-6 border-t border-border pt-4">
              <p className="font-display text-lg">Tijdelijk toegang geven</p>
              <p className="text-xs text-ink-soft">Handig als iemand een tijdje oppast of helpt. Welke informatie heeft {wieTitel} nodig?</p>
              <div className="mt-3 space-y-1">
                {suggestie.map((o) => {
                    const aan = voorstel.includes(o);
                    return (<button key={o} onClick={() => setVoorstel(aan ? voorstel.filter((x) => x !== o) : [...voorstel, o])} className="flex w-full items-center gap-3 py-1.5 text-left text-sm">
                      <span className={`grid size-5 place-items-center rounded border ${aan ? "border-brand bg-brand text-primary-foreground" : "border-border"}`}>{aan ? <Check className="size-3"/> : null}</span>
                      {onderdelen.find((x) => x.id === o).titel}
                    </button>);
                })}
              </div>
              <p className="mt-2 text-[11px] text-ink-soft">Je bevestigt in de volgende stap zelf wat er gedeeld wordt.</p>
            </div>) : null}
          <div className="mt-6 flex gap-2">
            <button onClick={() => setStap(2)} className="flex-1 rounded-md border border-border py-3 text-sm">Terug</button>
            <button onClick={() => {
                if (voorstel.length) {
                    const n = {};
                    kids.forEach((k) => { n[k] = { ...geenRechten(), ...Object.fromEntries(voorstel.map((o) => [o, "bekijken"])) }; });
                    setRechten(n);
                }
                setStap(4);
            }} className={`flex-1 ${knop}`}>Verder</button>
          </div>
        </>) : null}

      {verstuurd ? (<>
          <h2 className="mt-2 font-display text-xl">Uitnodiging versturen</h2>
          <UitnodigingDelen p={verstuurd}/>
          <button onClick={klaar} className={`mt-6 w-full ${knop}`}>Klaar</button>
        </>) : stap === 4 ? (<>
          <h2 className="mt-2 font-display text-xl">Wat mag {wieTitel} zien en doen?</h2>
          <p className="mt-1 text-xs text-ink-soft">Alles staat standaard op geen toegang. Privéberichten tussen ouders, kosten, besluiten, dossierexport, volledige documenten en de volledige wijzigingsgeschiedenis zijn nooit deelbaar.</p>
          {rolLabel === "Stiefouder / bonusouder" ? <p className="mt-2 rounded-md bg-brand-soft/60 px-3 py-2 text-xs">Een bonusouder krijgt niet vanzelf dezelfde rechten als een ouder, en heeft in de app geen gezag. Je kiest hieronder zelf wat {wieTitel} mag zien.</p> : null}
          {kids.map((k) => (<RechtenEditor key={k} kindNaam={kinderen.find((x) => x.id === k).naam} rechten={rechten[k] ?? geenRechten()} onChange={(o, n) => zetRecht(k, o, n)}/>))}
          <div className="mt-6 flex gap-2">
            <button onClick={() => setStap(3)} className="flex-1 rounded-md border border-border py-3 text-sm">Terug</button>
            <button onClick={opslaan} className={`flex-1 ${knop}`}>Uitnodiging versturen</button>
          </div>
        </>) : null}
    </AppShell>);
}
/** Snelle keuzes voor tijdelijke toegang; alleen invulhulp, de ouder bevestigt daarna zelf. */
function snelPeriodes() {
    const iso = (d) => d.toISOString().slice(0, 10);
    const nu = new Date();
    const plus = (n) => { const d = new Date(nu); d.setDate(d.getDate() + n); return d; };
    const totVrij = (5 - nu.getDay() + 7) % 7;
    return [
        { l: "Vandaag", start: iso(nu), eind: iso(nu) },
        { l: "Dit weekend", start: iso(plus(totVrij)), eind: iso(plus(totVrij + 2)) },
        { l: "Komende week", start: iso(nu), eind: iso(plus(6)) },
    ];
}
function PeriodeKeuze({ periode, onChange }) {
    const opties = [{ t: "doorlopend", l: "Doorlopend" }, { t: "tot", l: "Tot een bepaalde datum" }, { t: "periode", l: "Alleen gedurende een periode" }];
    const veld = "rounded-md border border-border bg-background px-3 py-2 text-sm";
    return (<div className="mt-4 space-y-2">
      {opties.map((o) => (<button key={o.t} onClick={() => onChange(o.t === "doorlopend" ? { type: "doorlopend" } : o.t === "tot" ? { type: "tot", eind: "2027-07-24" } : { type: "periode", start: "2027-07-10", eind: "2027-07-24" })} className={`flex w-full items-center gap-3 text-left ${keuze(periode.type === o.t)}`}>
          <span className={`size-3.5 rounded-full border ${periode.type === o.t ? "border-4 border-brand" : "border-ink-soft"}`}/>{o.l}
        </button>))}
      {periode.type === "tot" ? <input type="date" value={periode.eind} onChange={(e) => onChange({ type: "tot", eind: e.target.value })} className={`w-full ${veld}`} aria-label="Einddatum"/> : null}
      {periode.type === "periode" ? (<div className="flex items-center gap-2">
          <input type="date" value={periode.start} onChange={(e) => onChange({ ...periode, start: e.target.value })} className={`flex-1 ${veld}`} aria-label="Startdatum"/>
          <span className="text-xs text-ink-soft">t/m</span>
          <input type="date" value={periode.eind} onChange={(e) => onChange({ ...periode, eind: e.target.value })} className={`flex-1 ${veld}`} aria-label="Einddatum"/>
        </div>) : null}
      {periode.type !== "doorlopend" ? (<div className="flex flex-wrap gap-2 pt-1">
          {snelPeriodes().map((s) => (<button key={s.l} type="button" onClick={() => onChange({ type: "periode", start: s.start, eind: s.eind })} className="rounded-full border border-brand/40 px-3 py-1 text-xs font-semibold text-brand">{s.l}</button>))}
        </div>) : null}
      {periode.type !== "doorlopend" ? <p className="text-[11px] text-ink-soft">Na de einddatum vervalt de toegang vanzelf.</p> : null}
    </div>);
}
function RechtenEditor({ kindNaam, rechten, onChange }) {
    return (<section className="mt-5">
      <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand">Toegang tot {kindNaam}</h3>
      <div className="mt-1 divide-y divide-border border-y border-border">
        {onderdelen.map((o) => (<div key={o.id} className="py-3">
            <p className="text-sm font-semibold">{o.titel}</p>
            <p className="text-[11px] text-ink-soft">{o.uitleg}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {o.niveaus.map((n) => (<button key={n.id} onClick={() => onChange(o.id, n.id)} aria-pressed={rechten[o.id] === n.id} className={`rounded-full border px-3 py-1 text-xs font-semibold ${rechten[o.id] === n.id ? "border-brand bg-brand text-primary-foreground" : "border-border text-ink-soft"}`}>
                  {n.label}
                </button>))}
            </div>
          </div>))}
      </div>
    </section>);
}
function PersoonDetail({ p, kindId, terug }) {
    const [bewerk, setBewerk] = useState(false);
    const [intrekken, setIntrekken] = useState(false);
    const [rechten, setRechten] = useState(p.rechten);
    const [periode, setPeriode] = useState(p.periode);
    const kind = kinderen.find((k) => k.id === kindId);
    const actief = isActief(p);
    return (<AppShell>
      <div className="relative flex items-start gap-3 pr-12">
        {p.uitgenodigd !== false && !bewerk ? <BewerkPotlood onClick={() => setBewerk(true)} label={`Rechten van ${persoonLabel(p)} aanpassen`} className="right-0 top-0"/> : null}
        <button onClick={terug} className="knop-kruis mt-2 size-9 shrink-0 flex items-center justify-center cursor-pointer" aria-label="Terug"><ChevronLeft className="size-5 text-ink" strokeWidth={2.5} /></button>
        <div>
          <h1 className="font-display text-3xl">{persoonLabel(p)}</h1>
          <p className="mt-1 text-sm text-ink-soft">{p.rol}{p.noodcontact ? " · noodcontact" : ""}</p>
        </div>
        {p.foto ? <img src={p.foto} alt="" className="ml-auto size-14 rounded-full object-cover"/> : null}
      </div>
      <div className="mt-5 divide-y divide-border border-y border-border text-sm">
        {p.telefoon || (!p.email && p.contact) ? <a href={`tel:${p.telefoon ?? p.contact}`} className="flex justify-between py-2.5"><span className="text-ink-soft">Telefoon</span><span>{p.telefoon ?? p.contact}</span></a> : null}
        {p.email ? <a href={`mailto:${p.email}`} className="flex justify-between py-2.5"><span className="text-ink-soft">E-mail</span><span>{p.email}</span></a> : null}
        {p.adres ? <div className="flex justify-between py-2.5"><span className="text-ink-soft">Adres</span><span className="text-right">{p.adres}</span></div> : null}
        <button onClick={() => wijzigPersoon(p.id, { noodcontact: !p.noodcontact })} className="flex w-full justify-between py-2.5"><span className="text-ink-soft">Noodcontact</span><span className="font-semibold text-brand">{p.noodcontact ? "Ja" : "Nee"}</span></button>
        <div className="flex justify-between py-2.5"><span className="text-ink-soft">Gezag</span><span>Nee</span></div>
      </div>
      {p.uitgenodigd === false ? (<div className="mt-5">
          <p className="text-sm">Opgeslagen als contact. {p.naam} heeft geen toegang tot de app.</p>
          <button disabled={!(p.telefoon || p.email)} onClick={() => { wijzigPersoon(p.id, { uitgenodigd: true }); setBewerk(true); }} className={`mt-3 w-full ${knop}`}>Uitnodigen voor de app</button>
          {!(p.telefoon || p.email) ? <p className="mt-1 text-[11px] text-ink-soft">Voeg eerst een telefoonnummer of e-mailadres toe.</p> : <p className="mt-1 text-[11px] text-ink-soft">Daarna kies je zelf wat {p.naam} mag zien; alles begint op geen toegang.</p>}
        </div>) : null}
      {!actief ? <p className="mt-4 rounded-md bg-muted px-3 py-2 text-xs text-ink-soft"><Clock className="mr-1 inline size-3"/>De toegang is verlopen en is vanzelf gestopt.</p> : null}

      {p.uitgenodigd && p.bevestigd === false ? (<section className="mt-6">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand">Uitnodiging nog niet bevestigd</h3>
          <UitnodigingDelen p={p}/>
        </section>) : null}
      {p.uitgenodigd === false ? null : bewerk ? (<>
          {Object.keys(rechten).map((k) => (<RechtenEditor key={k} kindNaam={kinderen.find((x) => x.id === k).naam} rechten={rechten[k]} onChange={(o, n) => setRechten((r) => ({ ...r, [k]: { ...r[k], [o]: n } }))}/>))}
          <h3 className="mt-6 text-[11px] font-bold uppercase tracking-[0.14em] text-brand">Toegang</h3>
          <PeriodeKeuze periode={periode} onChange={setPeriode}/>
          <div className="mt-6 flex gap-2">
            <button onClick={() => { setRechten(p.rechten); setPeriode(p.periode); setBewerk(false); }} className="flex-1 rounded-md border border-border py-3 text-sm">Annuleren</button>
            <button onClick={() => { wijzigPersoon(p.id, { rechten, periode }); setBewerk(false); }} className={`flex-1 ${knop}`}>Opslaan</button>
          </div>
        </>) : (<>
          {Object.keys(p.rechten).map((k) => (<section key={k} className="mt-6">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand">Toegang tot {kinderen.find((x) => x.id === k).naam}</h3>
              <div className="mt-1 divide-y divide-border border-y border-border">
                {onderdelen.map((o) => (<div key={o.id} className="flex justify-between gap-3 py-2.5 text-sm">
                    <span>{o.titel}</span>
                    <span className="text-right text-ink-soft">{o.niveaus.find((n) => n.id === niveau(p, k, o.id)).label}</span>
                  </div>))}
              </div>
            </section>))}
          <h3 className="mt-6 text-[11px] font-bold uppercase tracking-[0.14em] text-brand">Toegang</h3>
          <p className="mt-1 text-sm">{periodeTekst(p.periode)}</p>
          <p className="mt-4 text-[11px] text-ink-soft">Nooit zichtbaar: berichten tussen ouders, kosten, volledige verdeling van de week, wijzigingsverzoeken, onderlinge afspraken, gezag, rapportages, professionele notities en juridische documenten.</p>
          <button onClick={() => setBewerk(true)} className={`mt-6 w-full ${knop}`}>Rechten aanpassen</button>
          <button onClick={() => setIntrekken(true)} className="mt-2 w-full rounded-md border border-border py-3 text-sm font-semibold text-accent-warm">Toegang intrekken</button>
          <Link to="/verzorger" search={{ p: p.id, s: p.sleutel }} className="mt-4 block text-center text-xs font-semibold text-brand">Bekijk wat {persoonLabel(p)} ziet</Link>
        </>)}

      {intrekken ? (<div className="fixed inset-0 z-40 flex items-end justify-center bg-ink/30 px-4 pb-4" onClick={() => setIntrekken(false)}>
          <div className="w-full max-w-md rounded-lg border border-border bg-background p-5" onClick={(e) => e.stopPropagation()}>
            <p className="font-display text-lg">Toegang intrekken</p>
            <p className="mt-2 text-sm text-ink-soft">{p.naam} kan daarna niet langer bij de gedeelde informatie van {Object.keys(p.rechten).map((k) => kinderen.find((x) => x.id === k).naam).join(" en ") || kind.naam}.</p>
            <div className="mt-5 flex gap-2">
              <button onClick={() => setIntrekken(false)} className="flex-1 rounded-md border border-border py-3 text-sm">Annuleren</button>
              <button onClick={() => { trekIn(p.id); terug(); }} className={`flex-1 ${knop}`}>Toegang intrekken</button>
            </div>
          </div>
        </div>) : null}
    </AppShell>);
}
const noodVelden = [
    { id: "geboortedatum", label: "Geboortedatum" }, { id: "contacten", label: "Noodcontacten (ouders)" },
    { id: "huisarts", label: "Huisarts" }, { id: "allergieen", label: "Allergieën" },
    { id: "medicatie", label: "Medicatie-instructies" }, { id: "extra", label: "Extra praktische info" },
];
function NoodkaartInstellen({ kindId, terug }) {
    const kring = useKring();
    const kind = kinderen.find((k) => k.id === kindId);
    const aan = kring.noodkaart[kindId] ?? [];
    return (<AppShell>
      <div className="flex items-start gap-3">
        <button onClick={terug} className="knop-kruis mt-2 size-9 shrink-0 flex items-center justify-center cursor-pointer" aria-label="Terug"><ChevronLeft className="size-5 text-ink" strokeWidth={2.5} /></button>
        <div>
          <h1 className="font-display text-3xl">Noodkaart {kind.naam}</h1>
          <p className="mt-1 text-sm text-ink-soft">Alleen wat je hier aanzet, zien verzorgers met toegang tot noodinformatie. De naam staat er altijd op.</p>
        </div>
      </div>
      <div className="mt-6 divide-y divide-border border-y border-border">
        {noodVelden.map((v) => (<button key={v.id} onClick={() => toggleNoodVeld(kindId, v.id)} className="flex w-full items-center justify-between py-3 text-left text-sm">
            {v.label}
            <span className={`relative h-6 w-10 rounded-full ${aan.includes(v.id) ? "bg-brand" : "bg-muted"}`}>
              <span className={`absolute top-0.5 size-5 rounded-full bg-background transition-all ${aan.includes(v.id) ? "left-[18px]" : "left-0.5"}`}/>
            </span>
          </button>))}
      </div>
    </AppShell>);
}
