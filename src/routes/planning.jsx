import { AgendaVakanties } from "@/components/AgendaVakanties";
import { Sectie } from "@/components/ui-kit";
import { createFileRoute, Link, Navigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { CalendarDays, CalendarRange, Gift, Palmtree } from "lucide-react";
import { AppShell, Card, PageHeader } from "@/components/AppShell";
import { ContextToevoegen } from "@/components/ContextToevoegen";
import { VerdeelHulp, ReisHulp } from "@/components/VerdeelHulp";
import { useVakanties, voegVakantieVoorstelToe, stelVerdelingVoor, accepteerVakantie, trekVakantieIn } from "@/lib/vakantie-store";
import { useZorg, zorgDag } from "@/lib/zorg-store";
import { AppIcon, TekenLabel } from "@/components/AppIcon";
import { Button } from "@/components/ui/button";
import { VoorstelIntrekken } from "@/components/VoorstelIntrekken";
export const Route = createFileRoute("/planning")({
    validateSearch: z.object({ eerder: z.boolean().optional(), toevoegen: z.enum(["vakantie", "verdelen", "bijzonder", "periode"]).optional(), periode: z.string().optional() }),
    head: () => ({
        meta: [
            { title: "Vakanties & bijzondere dagen — Ouderschap & Co" },
            { name: "description", content: "Vakanties verdelen, wie gaat er mee, dubbelcheck, weekoverdracht en beslissingen met een deadline." },
            { property: "og:title", content: "Planning & vakanties — Ouderschap & Co" },
            { property: "og:description", content: "Samen vooruit plannen, rustig en overzichtelijk." },
            { property: "og:type", content: "website" },
            { name: "twitter:card", content: "summary" },
        ],
    }),
    component: PlanningInAgenda,
});
function PlanningInAgenda() {
    const zoek = Route.useSearch();
    if (!zoek.eerder)
        return <Navigate to="/agenda" replace search={{ onderdeel: "vakanties", vakantieNieuw: zoek.toevoegen === "bijzonder" ? "bijzonder" : zoek.toevoegen ? "vakantie" : undefined }}/>;
    return <EerderePlanning />;
}
function EerderePlanning() {
    const zoek = Route.useSearch();
    const [eerder, setEerder] = useState(false);
    if (eerder)
        return <><div className="mx-auto max-w-md px-5 pt-4"><Button variant="outline" onClick={() => setEerder(false)}>Terug naar vakanties</Button></div><Planning /></>;
    return <AppShell><PageHeader titel="Vakanties & bijzondere dagen" terug="/agenda"/><AgendaVakanties toevoegen={zoek.toevoegen === "bijzonder" ? "bijzonder" : zoek.toevoegen ? "vakantie" : undefined}/><Button variant="link" className="mt-4 min-h-11 px-0 text-xs" onClick={() => setEerder(true)}>Eerdere planningsonderdelen bekijken</Button></AppShell>;
}
const kleur = {
    Sanne: "bg-brand-soft text-brand",
    Joris: "bg-accent-warm/40 text-ink",
    Samen: "bg-surface text-ink",
    "Nog open": "border border-dashed border-ink-soft/40 text-ink-soft",
};
const leegReis = { bestemming: "", vertrek: "", terug: "", adres: "", reis: "", contact: "" };
const MAANDEN = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
/** Haalt een periode uit bekende notaties: "25 apr–3 mei", "25 apr t/m 3 mei", "2025-04-25 t/m 2025-05-03". Onbekende tekst = geen controle. */
function periodeDatalen(tekst) {
    const t = tekst.toLowerCase().replace(/[–—]/g, "-").replace(/\s+(t\/m|tot en met|tot)\s+/g, "-");
    const iso = [...t.matchAll(/(\d{4})-(\d{2})-(\d{2})/g)].map((m) => new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
    if (iso.length >= 2)
        return iso[0] <= iso[1] ? { van: iso[0], tot: iso[1] } : { van: iso[1], tot: iso[0] };
    const dt = [...t.matchAll(/(\d{1,2})\s*(jan|feb|mrt|apr|mei|jun|jul|aug|sep|okt|nov|dec)[a-zë]*/g)]
        .map((m) => ({ dag: Number(m[1]), mnd: MAANDEN.indexOf(m[2]) }))
        .filter((x) => x.mnd >= 0 && x.dag >= 1 && x.dag <= 31);
    if (dt.length < 2)
        return null;
    const a = new Date(2025, dt[0].mnd, dt[0].dag);
    const b = new Date(2025, dt[1].mnd, dt[1].dag);
    return a <= b ? { van: a, tot: b } : { van: b, tot: a };
}
/** Aantal dagen in deze periode dat Emma volgens de verdeling van de week bij de andere ouder is. */
function dagenBijAndereOuder(zorg, van, tot) {
    let n = 0;
    const d = new Date(van);
    for (let i = 0; d <= tot && i < 62; i++, d.setDate(d.getDate() + 1)) {
        if (d.getFullYear() === 2025 && d.getMonth() === 2 && zorgDag(zorg, "emma", d.getDate()).ouder !== "sanne")
            n++;
    }
    return n;
}
function Planning() {
    const { t } = useTranslation();
    const router = useRouter();
    const { toevoegen, periode } = Route.useSearch();
    const vak = useVakanties();
    const [gezien, setGezien] = useState({});
    const [besl, setBesl] = useState({});
    const [afst, setAfst] = useState({});
    const [voorstel, setVoorstel] = useState({ naam: periode ?? (toevoegen === "verdelen" ? "Meivakantie" : ""), periode: "", ouder: "Nog open", details: "" });
    const [buitenland, setBuitenland] = useState(false);
    const [reis, setReis] = useState(leegReis);
    const [docs, setDocs] = useState([]);
    const zorg = useZorg();
    const [overlap, setOverlap] = useState(null);
    const [reisdocument, setReisdocument] = useState("");
    const verstuurVakantie = (meta) => {
        if (buitenland && !reisdocument)
            return;
        const reisTekst = buitenland ? [reis.bestemming, reis.vertrek && reis.terug ? `${reis.vertrek} t/m ${reis.terug}` : "", docs.length ? `${docs.length} document(en)` : "", reisdocument === "geldig" ? "Paspoort/ID gecontroleerd door ouder" : "Paspoort/ID nog te regelen"].filter(Boolean).join(" · ") : "";
        voegVakantieVoorstelToe({ ...voorstel, details: [voorstel.details, reisTekst, meta].filter(Boolean).join(" · ") });
        setBuitenland(false);
        setReis(leegReis);
        setDocs([]);
        setOverlap(null);
        setReisdocument("");
        router.navigate({ to: "/planning", search: {} });
    };
    useEffect(() => {
        if (!toevoegen)
            return;
        setVoorstel({ naam: periode ?? (toevoegen === "verdelen" ? "Meivakantie" : ""), periode: "", ouder: "Nog open", details: "" });
        window.requestAnimationFrame(() => document.querySelector("#nieuw-periodevoorstel")?.scrollIntoView({ behavior: "smooth", block: "center" }));
    }, [toevoegen, periode]);
    return (<AppShell>
       <PageHeader titel={t("calendar.tabHolidays", "Vakanties & bijzondere dagen")} subtitel="Vakanties verdelen en samen vooruit plannen" actie={<ContextToevoegen titel={t("contextToevoegen.title", "Wat wil je toevoegen?")} acties={[
                { titel: t("contextToevoegen.planning.vacationProposalTitle", "Vakantievoorstel"), uitleg: t("contextToevoegen.planning.vacationProposalDesc", "Stel een vakantieperiode voor."), icoon: Palmtree, onKies: () => router.navigate({ to: "/planning", search: { toevoegen: "vakantie" } }) },
                { titel: t("contextToevoegen.planning.schoolHolidayTitle", "Schoolvakantie verdelen"), uitleg: t("contextToevoegen.planning.schoolHolidayDesc", "Maak een voorstel voor de verdeling van een schoolvakantie."), icoon: CalendarRange, onKies: () => router.navigate({ to: "/planning", search: { toevoegen: "verdelen", periode: "Meivakantie" } }) },
                { titel: t("contextToevoegen.planning.specialDayTitle", "Feestdag / bijzondere dag"), uitleg: t("contextToevoegen.planning.specialDayDesc", "Maak een voorstel voor een feestdag, verjaardag of andere bijzondere dag."), icoon: Gift, onKies: () => router.navigate({ to: "/planning", search: { toevoegen: "bijzonder" } }) },
                { titel: t("contextToevoegen.planning.otherPeriodTitle", "Andere periode"), uitleg: t("contextToevoegen.planning.otherPeriodDesc", "Maak een voorstel voor een zelfgekozen periode."), icoon: CalendarDays, onKies: () => router.navigate({ to: "/planning", search: { toevoegen: "periode" } }) },
            ]}/>}/>

      <div className="mt-4 space-y-3">
        <VerdeelHulp />
        <ReisHulp />
        {toevoegen ? (<Card className="scroll-mt-4" id="nieuw-periodevoorstel">
            <p className="font-display font-bold">{toevoegen === "vakantie" ? "Vakantievoorstel" : toevoegen === "verdelen" ? "Schoolvakantie verdelen" : toevoegen === "bijzonder" ? "Feestdag of bijzondere dag" : "Andere periode"}</p>
            <p className="mt-1 text-xs text-ink-soft">Je kunt de vooraf ingevulde gegevens altijd aanpassen.</p>
            <div className="mt-3 space-y-2">
              <input value={voorstel.naam} onChange={(e) => setVoorstel({ ...voorstel, naam: e.target.value })} placeholder="Naam, bijvoorbeeld Meivakantie" className="w-full rounded-md bg-surface px-3 py-2 text-sm outline-none"/>
              <input value={voorstel.periode} onChange={(e) => setVoorstel({ ...voorstel, periode: e.target.value })} placeholder="Periode, bijvoorbeeld 25 apr–3 mei" className="w-full rounded-md bg-surface px-3 py-2 text-sm outline-none"/>
              <select value={voorstel.ouder} onChange={(e) => setVoorstel({ ...voorstel, ouder: e.target.value })} className="w-full rounded-md bg-surface px-3 py-2 text-sm outline-none">
                {["Nog open", "Sanne", "Joris", "Samen"].map((ouder) => <option key={ouder}>{ouder}</option>)}
              </select>
              <textarea value={voorstel.details} onChange={(e) => setVoorstel({ ...voorstel, details: e.target.value })} placeholder="Toelichting (optioneel)" rows={2} className="w-full resize-none rounded-md bg-surface px-3 py-2 text-sm outline-none"/>
              <label className="flex items-center gap-2 py-1 text-sm"><input type="checkbox" checked={buitenland} onChange={(e) => setBuitenland(e.target.checked)} className="accent-[var(--color-brand)]"/> Reis naar het buitenland</label>
              {buitenland ? (<div className="space-y-2 rounded-md border border-border p-3">
                  {[["bestemming", "Bestemming"], ["adres", "Verblijfadres"], ["reis", "Reisgegevens (vlucht, vertrektijd)"], ["contact", "Contact tijdens verblijf"]].map(([k, label]) => (<input key={k} value={reis[k]} onChange={(e) => setReis({ ...reis, [k]: e.target.value })} placeholder={label} className="w-full rounded-md bg-surface px-3 py-2 text-sm outline-none"/>))}
                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-xs text-ink-soft">Vertrek<input type="date" value={reis.vertrek} onChange={(e) => setReis({ ...reis, vertrek: e.target.value })} className="mt-1 w-full rounded-md bg-surface px-2 py-2 text-sm text-ink outline-none"/></label>
                    <label className="text-xs text-ink-soft">Terugkomst<input type="date" value={reis.terug} onChange={(e) => setReis({ ...reis, terug: e.target.value })} className="mt-1 w-full rounded-md bg-surface px-2 py-2 text-sm text-ink outline-none"/></label>
                  </div>
                  <p className="pt-1 text-sm font-semibold">Toestemming & documenten</p>
                  <fieldset className="space-y-2 border-y border-border py-3">
                    <legend className="text-sm font-semibold">Is het paspoort of de ID-kaart van ieder kind geldig voor deze reis?</legend>
                    <p className="text-xs text-ink-soft">Controleer ook de eisen van je bestemming. De app kent de geldigheidsdatum niet.</p>
                    <label className="flex items-center gap-2 text-sm"><input type="radio" name="reisdocument" checked={reisdocument === "geldig"} onChange={() => setReisdocument("geldig")}/>Ja, gecontroleerd</label>
                    <label className="flex items-center gap-2 text-sm"><input type="radio" name="reisdocument" checked={reisdocument === "regelen"} onChange={() => setReisdocument("regelen")}/>Nog te regelen</label>
                    {reisdocument === "regelen" ? <Button asChild variant="link" size="sm" className="h-auto px-0"><Link to="/taken" search={{ taak: `Paspoort/ID controleren voor ${reis.bestemming || voorstel.naam}` }}>Als taak voorbereiden →</Link></Button> : null}
                  </fieldset>
                  <input type="file" multiple onChange={(e) => setDocs(Array.from(e.target.files ?? []).map((f) => f.name))} className="w-full text-xs" aria-label="Documenten toevoegen"/>
                  {docs.length ? <p className="text-xs text-ink-soft">Toegevoegd: {docs.join(", ")}</p> : null}
                  <p className="text-xs leading-relaxed text-ink-soft">Bijvoorbeeld een toestemmingsformulier of reisdocumenten. Of toestemming nodig is, hangt van je situatie af; de app beoordeelt dat niet. Meer informatie: <a className="font-semibold text-brand underline" href="https://www.rijksoverheid.nl/onderwerpen/paspoort-en-identiteitskaart/vraag-en-antwoord/toestemming-op-reis-met-kind" target="_blank" rel="noreferrer">Rijksoverheid — op reis met een kind</a>.</p>
                </div>) : null}
              {overlap ? (<div role="status" className="rounded-md border border-border bg-muted p-3">
                  <p className="text-xs text-ink-soft">Deze periode valt {overlap} {overlap === 1 ? "dag" : "dagen"} bij de andere ouder. Wil je dit meesturen als afstemvraag?</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button onClick={() => verstuurVakantie("Graag afstemmen: valt deels op dagen bij de andere ouder")} className="rounded-full bg-brand px-3 py-1 text-xs font-semibold text-primary-foreground">Ja, met afstemvraag</button>
                    <button onClick={() => verstuurVakantie()} className="rounded-full border border-border px-3 py-1 text-xs font-semibold">Nee, gewoon versturen</button>
                  </div>
                </div>) : null}
              <button disabled={!voorstel.naam.trim() || !voorstel.periode.trim() || (buitenland && !reisdocument)} onClick={() => {
                if (overlap === null) {
                    const p = periodeDatalen(voorstel.periode);
                    const n = p ? dagenBijAndereOuder(zorg, p.van, p.tot) : 0;
                    if (n > 0) {
                        setOverlap(n);
                        return;
                    }
                }
                verstuurVakantie();
            }} className="w-full rounded-md bg-brand py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40">Voorstel versturen</button>
              <p className="text-[11px] text-ink-soft">Na akkoord wordt dit vastgelegd als "Afgesproken". Dit is geen digitale handtekening.</p>
            </div>
          </Card>) : null}
        <Sectie titel="Vakanties" sub="Eerst wat nog afgestemd moet worden" open>{(<>
            <p className="text-sm text-ink-soft">Schoolvakanties 2026 (regio Midden). Tik op een ouder om een verdeling voor te stellen.</p>
            {[...vak].sort((a, b) => Number(a.status === "afgesproken") - Number(b.status === "afgesproken")).map((v) => (<Card key={v.id}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link to="/vakantie/$id" params={{ id: v.id }} className="font-display font-bold underline-offset-2 hover:underline">{v.naam} ›</Link>
                    <p className="text-sm text-ink-soft">{v.periode}</p>
                    {v.details && <p className="mt-1 flex items-center gap-1 text-xs"><AppIcon functie="vliegen" maat="sm" vorm="kaal"/>{v.details}</p>}
                    {v.status === "ingetrokken" ? <p className="mt-1 text-[11px] text-ink-soft">Ingetrokken · huidige verdeling van de week blijft gelden</p> : v.status === "afgesproken" ? <p className="mt-1 text-[11px] text-brand">Afgesproken ✓</p> : v.status === "voorstel" ? <p className="mt-1 text-[11px] text-ink-soft">Voorstel verstuurd · reactie open · huidige verdeling van de week blijft gelden</p> : <p className="mt-1 text-[11px] text-ink-soft">Huidige verdeling van de week blijft gelden</p>}
                  </div>
                  <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${kleur[v.ouder]}`}>{v.ouder}</span>
                </div>
                {v.status === "voorstel" && v.van === "Sanne" && (<div className="mt-3 flex gap-2 text-xs">
                    <VoorstelIntrekken onBevestig={() => trekVakantieIn(v.id)}/>
                    {import.meta.env.DEV ? <button onClick={() => accepteerVakantie(v.id)} className="flex-1 rounded-md bg-surface py-2 text-ink-soft">Test: andere ouder akkoord</button> : null}
                  </div>)}
                {v.status === "open" && (<div className="mt-3 flex gap-2">
                    {["Sanne", "Joris", "Samen"].map((o) => (<button key={o} onClick={() => stelVerdelingVoor(v.id, o)} className="flex-1 rounded-md bg-surface py-2 text-xs font-medium">{o}</button>))}
                  </div>)}
              </Card>))}
          </>)}</Sectie>

        <Sectie titel="Wie gaat mee">{[
            { wat: "Weekend Texel (mei)", wie: ["Sanne", "Emma", "Noah", "Oma Els"] },
            { wat: "Skivakantie (feb)", wie: ["Joris", "Emma", "Noah", "Lotte (partner Joris)"] },
            { wat: "Verjaardag neef Daan", wie: ["Joris", "Noah"] },
        ].map((x) => (<Card key={x.wat}>
            <p className="font-display font-bold">{x.wat}</p>
            <div className="mt-2 flex flex-wrap gap-2">{x.wie.map((w) => <span key={w} className="rounded-full bg-surface px-3 py-1 text-xs">{w}</span>)}</div>
          </Card>))}</Sectie>

        {(() => {
            const nogTeZien = ["Studiedag wo 25 maart", "Paspoorten verlopen in juni", "Rapportgesprek Emma vr 20 maart"].filter((t) => !gezien[t]);
            if (!nogTeZien.length)
                return null;
            return (<Sectie titel="Dubbelcheck" sub={`${nogTeZien.length} om even te bekijken`}>{(<>
                <p className="text-sm text-ink-soft">Belangrijke dingen die je allebei wilt zien. Zo hoeft niemand te vragen: "Heb je dit gelezen?"</p>
                <p className="text-xs text-ink-soft">Gezien betekent alleen dat je het gelezen hebt. Akkoord geef je altijd apart, bij het voorstel zelf.</p>
                {nogTeZien.map((t) => (<Card key={t} className="flex items-center justify-between gap-3">
                    <div className="text-sm">
                      <p className="font-medium">{t}</p>
                      <p className="text-xs text-ink-soft">Joris heeft dit gezien</p>
                    </div>
                    <button onClick={() => setGezien((g) => ({ ...g, [t]: true }))} className="shrink-0 rounded-full bg-brand-soft px-3 py-1.5 text-xs font-semibold text-brand">Gezien</button>
                  </Card>))}
              </>)}</Sectie>);
        })()}

        <Sectie titel="Weekoverdracht">{(<Card>
            <p className="font-display font-bold">Komende week bij Joris</p>
            <ul className="mt-3 space-y-2 text-sm">
              {["Do 17:00 uur voetbal Noah", "Di 16:00 uur zwemles Emma", "Wo studiedag, geen school", "Neusspray Emma 's ochtends", "Emma: spreekbeurt oefenen"].map((t) => <li key={t} className="rounded-md bg-surface px-4 py-3">{t}</li>)}
            </ul>
            <p className="mt-3 text-xs text-ink-soft">Automatisch samengesteld uit de agenda, zodat de andere ouder in één oogopslag weet wat er komt.</p>
          </Card>)}</Sectie>

        <Sectie titel="Beslissen vóór">{[
            { t: "Zomerkamp Emma inschrijven", d: "Beslissen vóór 1 april", s: "Inschrijving sluit" },
            { t: "Zwemles Noah: B-diploma", d: "Beslissen vóór 15 april", s: "Plek wordt vrijgehouden" },
        ].map((x) => (<Card key={x.t}>
            <p className="font-display font-bold">{x.t}</p>
            <p className="text-sm text-destructive">⏰ {x.d}</p>
            <p className="text-xs text-ink-soft">{x.s}</p>
            {besl[x.t] ? <p className="mt-2 text-sm font-semibold text-brand">Jouw reactie: {besl[x.t]}</p> : (<div className="mt-3 flex gap-2">
                {["Ja, doen", "Liever niet", "Eerst overleggen"].map((o) => <button key={o} onClick={() => setBesl((b) => ({ ...b, [x.t]: o }))} className="flex-1 rounded-md bg-surface py-2 text-xs font-medium">{o}</button>)}
              </div>)}
          </Card>))}</Sectie>

        <Sectie titel="Even afstemmen">{(<>
            <p className="text-sm text-ink-soft">Kleine vragen die geen heel bericht nodig hebben.</p>
            {["Mag Emma zaterdag logeren bij Fleur?", "Noah naar de kapper, doe jij het of ik?", "Zelfde bedtijd in de vakantie: 20:00 uur?"].map((q) => (<Card key={q}>
                <p className="text-sm font-medium">{q}</p>
                {afst[q] ? <p className="mt-2 text-sm font-semibold text-brand">{afst[q]}</p> : (<div className="mt-2 flex gap-2">
                    {["👍 Prima", "🤔 Even bellen", "👎 Liever niet"].map((o) => <button key={o} onClick={() => setAfst((a) => ({ ...a, [q]: o }))} className="flex-1 rounded-md bg-surface py-2 text-xs"><TekenLabel waarde={o}/></button>)}
                  </div>)}
              </Card>))}
          </>)}</Sectie>
      </div>
    </AppShell>);
}
