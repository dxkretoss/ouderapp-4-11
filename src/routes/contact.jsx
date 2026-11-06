import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { AppIcon } from "@/components/AppIcon";
import { Badge } from "@/components/ui-kit";
import { markeerGebruikt } from "@/lib/gezag-store";
import { professionals } from "@/lib/demo-data";
import { bereikbareBegeleiders, GEZIN_DOSSIER, useProWerk } from "@/lib/pro-journaal-store";
export const Route = createFileRoute("/contact")({
    head: () => ({
        meta: [
            { title: "Contact makkelijker maken — Ouderschap & Co" },
            { name: "description", content: "Extra mogelijkheden om duidelijk contact met elkaar te hebben." },
            { property: "og:title", content: "Contact makkelijker maken — Ouderschap & Co" },
            { property: "og:description", content: "Bellen via de app en afspraken over contact." },
            { property: "og:type", content: "website" },
            { name: "twitter:card", content: "summary" },
        ],
    }),
    component: Contact,
});
const startGezamenlijk = [
    { id: "app", t: "Communicatie via de app", u: "Praktische communicatie loopt via de app.", status: "actief", sinds: "12 september" },
    { id: "onderwerpen", t: "Onderwerpen gescheiden houden", u: "Eén onderwerp per gesprek, zodat alles overzichtelijk blijft.", status: "geen" },
    { id: "verzoeken", t: "Praktische verzoeken apart", u: "Verzoeken lopen via Samen regelen, niet via gewone berichten.", status: "geen" },
    { id: "pro", t: "Communicatie via een begeleider", u: "Lastige onderwerpen lopen via de betrokken professional.", status: "geen" },
];
function Groep({ titel, children }) {
    return (<section className="mt-6">
      <h2 className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">{titel}</h2>
      <div className="mt-2 divide-y divide-border rounded-md border border-border bg-card">{children}</div>
    </section>);
}
function Rij({ to, i, t, u }) {
    return (<Link to={to} onClick={() => markeerGebruikt("/contact")} className="flex min-h-14 items-center gap-3 px-3 py-3">
      <AppIcon functie={i} maat="md"/>
      <span className="flex-1"><span className="block text-sm font-semibold">{t}</span><span className="block text-xs text-ink-soft">{u}</span></span>
      <ChevronRight className="size-5 text-ink-soft shrink-0" />
    </Link>);
}
// Alleen tonen als een actieve professional volgens de bestaande rechten via de app bereikbaar is.
// Op dit moment heeft geen enkele betrokken professional toegang tot Berichten, dus deze rij blijft verborgen.
const organisatie = (naam) => professionals.find((p) => p.naam.startsWith(naam))?.organisatie;
function Contact() {
    const { t } = useTranslation();
    const werk = useProWerk();
    const bereikbaar = bereikbareBegeleiders(GEZIN_DOSSIER, werk);
    const [gezamenlijk, setGezamenlijk] = useState(startGezamenlijk);
    const [nachtrust, setNachtrust] = useState(false);
    const [van, setVan] = useState("21:00");
    const [tot, setTot] = useState("08:00");
    const [bewerkNacht, setBewerkNacht] = useState(false);
    return (<AppShell>
      <PageHeader titel="Contact makkelijker maken" subtitel="Extra mogelijkheden om duidelijk contact met elkaar te hebben." terug="/extra-ondersteuning"/>
      <div className="mt-5 divide-y divide-border rounded-md border border-border bg-card">
        <Rij to="/gesprekken" i="bellen" t="Bellen via de app" u="Bel de andere ouder vanuit de app."/>
        <a href="#afspraken-contact" className="flex min-h-14 items-center gap-3 px-3 py-3"><AppIcon functie="berichten" maat="md"/><span className="flex-1"><span className="block text-sm font-semibold">Afspraken over contact</span><span className="block text-xs text-ink-soft">Leg samen vast hoe jullie contact willen hebben.</span></span><ChevronRight className="size-5 text-ink-soft shrink-0" /></a>
        {bereikbaar.length >= 3 ? <Rij to="/begeleider-gesprek" i="ondersteuning" t="Contact met begeleider" u="Kies met wie je contact wilt."/> : bereikbaar.map((p) => (<Link key={p.id} to="/begeleider-gesprek" search={{ pro: p.id }} onClick={() => markeerGebruikt("/contact")} className="flex min-h-14 items-center gap-3 px-3 py-3">
            <AppIcon functie="ondersteuning" maat="md"/>
            <span className="flex-1"><span className="block text-sm font-semibold">Contact met {p.naam}</span><span className="block text-xs text-ink-soft">{[p.rol, organisatie(p.naam)].filter(Boolean).join(" · ")}</span></span>
            <ChevronRight className="size-5 text-ink-soft shrink-0" />
          </Link>))}
      </div>

      <div id="afspraken-contact"/>
      <Groep titel="Afspraken over contact · gedeeld met beide ouders">
        <p className="px-3 pt-3 text-xs text-ink-soft">Een gezamenlijke afspraak geldt pas als jullie allebei akkoord zijn.</p>
        {gezamenlijk.map((a) => (<div key={a.id} className="px-3 py-3">
            <p className="text-sm font-semibold">{a.t}</p>
            <p className="text-[11px] font-semibold text-ink-soft">Gezamenlijke afspraak · gedeeld met beide ouders</p>
            <p className="mt-0.5 text-xs">{a.u}</p>
            {a.status === "actief" ? (<Link to="/afspraken" className="mt-1 flex min-h-11 items-center justify-between text-xs"><Badge toon="info">Actief sinds {a.sinds}</Badge><ChevronRight className="size-4 text-ink-soft shrink-0" /></Link>) : a.status === "voorstel" ? (<div className="mt-1"><Badge toon="klaar">Wacht op reactie van Joris</Badge></div>) : (<button onClick={() => setGezamenlijk((l) => l.map((x) => (x.id === a.id ? { ...x, status: "voorstel" } : x)))} className="mt-1 min-h-11 inline-flex items-center gap-1 text-xs font-semibold text-brand"><span>Voorstellen aan Joris</span><ChevronRight className="size-3.5" /></button>)}
          </div>))}
      </Groep>

      <Groep titel="Alleen voor jou">
        <div className="relative px-3 py-3">
          <p className="pr-12 text-sm font-semibold">Meldingen 's nachts dempen</p>
          <p className="text-[11px] font-semibold text-ink-soft">Alleen voor jou</p>
          <button onClick={() => setBewerkNacht(!bewerkNacht)} aria-label="Nachtrust aanpassen" className="absolute right-2 top-2 inline-flex size-11 items-center justify-center rounded-full text-ink-soft hover:bg-muted"><AppIcon functie="notitie" maat="sm" vorm="kaal"/></button>
          <p className="mt-0.5 text-xs">{nachtrust ? `${van} – ${tot}` : "Staat uit"}</p>
          {bewerkNacht ? (<div className="mt-2 space-y-2">
              <label className="flex min-h-11 items-center justify-between text-sm">Dempen<input type="checkbox" checked={nachtrust} onChange={(e) => setNachtrust(e.target.checked)} className="size-5 accent-[var(--color-brand)]"/></label>
              <div className="flex gap-2 text-sm">
                <input type="time" value={van} onChange={(e) => setVan(e.target.value)} className="flex-1 rounded-xl bg-surface px-3 py-2" aria-label="Vanaf"/>
                <input type="time" value={tot} onChange={(e) => setTot(e.target.value)} className="flex-1 rounded-xl bg-surface px-3 py-2" aria-label="Tot"/>
              </div>
              <p className="text-[11px] text-ink-soft">Dit verandert niets voor Joris.</p>
            </div>) : null}
        </div>
      </Groep>
      <p className="mt-4 text-xs text-ink-soft">Een betrokken professional ziet gesprekken of opnames niet automatisch. Dat kan alleen als jullie dat apart hebben gedeeld.</p>
    </AppShell>);
}
