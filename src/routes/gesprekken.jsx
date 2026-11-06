import { useTranslation } from "react-i18next";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell, Card, PageHeader } from "@/components/AppShell";
import { bewaarOnderdelen, demoTranscript, moduleLabels, useGesprekken, voegGesprekToe, werkOpnameBij, zetBewaar, zetModule, } from "@/lib/gesprekken-store";
import { useMeldingen } from "@/lib/gesprekken-store";
import { OnveiligKnop } from "@/components/Onveilig";
import { AppIcon, TekenLabel } from "@/components/AppIcon";
import { uur } from "@/lib/tijd-tekst";
export const Route = createFileRoute("/gesprekken")({
    head: () => ({
        meta: [
            { title: "Bellen via de app — Ouderschap & Co" },
            { name: "description", content: "Bel of videobel de andere ouder vanuit de app." },
            { property: "og:title", content: "Bellen via de app — Ouderschap & Co" },
            { property: "og:description", content: "Bel of videobel de andere ouder vanuit de app." },
            { property: "og:type", content: "website" },
            { name: "twitter:card", content: "summary" },
        ],
    }),
    component: Gesprekken,
});
const nu = () => new Date().toTimeString().slice(0, 5);
function Schakel({ aan, onClick }) {
    return (<button onClick={onClick} aria-pressed={aan} className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${aan ? "bg-brand" : "bg-border"}`}>
      <span className={`absolute top-0.5 size-5 rounded-full bg-card transition-all ${aan ? "left-5" : "left-0.5"}`}/>
    </button>);
}
function Uit({ m }) {
    return (<Card className="text-center">
      <p className="text-sm"><TekenLabel waarde={moduleLabels[m].t}/> staat uit.</p>
      <button onClick={() => zetModule(m, true)} className="mt-3 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-primary-foreground">Aanzetten</button>
    </Card>);
}
function Gesprekken() {
    const { t } = useTranslation();
    const [w, setW] = useState("bellen");
    const s = useGesprekken();
    const opnames = s.gesprekken.filter((g) => g.opname).length;
    const titel = w === "opnames" ? "Opgenomen gesprekken" : w === "privacy" ? "Privacy bij bellen" : "Bellen via de app";
    return (<AppShell>
      <PageHeader titel={titel} {...(w === "bellen" ? { subtitel: "Bel de andere ouder vanuit de app." } : {})} terug="/contact"/>
      <div className="mt-5 space-y-4">
        {w === "bellen" && <Bellen />}
        {w === "opnames" && <Opnames />}
        {w === "privacy" && <Privacy />}
      </div>
      <div className="mt-6 space-y-1 text-sm">
        {w !== "bellen" && (
          <button onClick={() => setW("bellen")} className="inline-flex items-center gap-1 min-h-11 font-semibold text-brand">
            <ChevronLeft className="size-4" />
            <span>Terug naar bellen</span>
          </button>
        )}
        {w === "bellen" && opnames > 0 && (
          <button onClick={() => setW("opnames")} className="inline-flex items-center gap-1 min-h-11 font-semibold text-brand">
            <span>Opgenomen gesprekken ({opnames})</span>
            <ChevronRight className="size-4" />
          </button>
        )}
        {w === "bellen" && <button onClick={() => setW("privacy")} className="block min-h-11 text-xs text-ink-soft underline">Privacy en instellingen</button>}
      </div>
    </AppShell>);
}
function Bellen() {
    const s = useGesprekken();
    const [fase, setFase] = useState("rust");
    const [soort, setSoort] = useState("audio");
    const [sec, setSec] = useState(0);
    const [begin, setBegin] = useState("");
    const [akkoord, setAkkoord] = useState([]);
    const [opStart, setOpStart] = useState("");
    const [opEind, setOpEind] = useState("");
    const [melding, setMelding] = useState("");
    const [afgelopen, setAfgelopen] = useState(null);
    useEffect(() => {
        if (fase === "gaat") {
            const t = setTimeout(() => { setFase("bezig"); setBegin(nu()); setSec(0); }, 1500);
            return () => clearTimeout(t);
        }
        if (fase !== "rust") {
            const t = setInterval(() => setSec((x) => x + 1), 1000);
            return () => clearInterval(t);
        }
        return undefined;
    }, [fase]);
    const bel = (sr) => { setSoort(sr); setFase("gaat"); setMelding(""); setAkkoord([]); setAfgelopen(null); setOpEind(""); };
    const ophangen = () => {
        const duur = `${Math.max(1, Math.round(sec / 60))} minuten`;
        voegGesprekToe({
            id: Date.now(), soort, datum: "12 maart", begin, eind: nu(), duur: duur.replace("minuten", "min"), status: "Beantwoord",
            ...(opStart ? { opname: { aangevraagd: "Sanne", akkoord, start: opStart, eind: opEind || nu() } } : {}),
        });
        setAfgelopen({ duur, begin });
        setFase("rust");
        setOpStart("");
    };
    const tijd = `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
    if (!s.aan.audio && !s.aan.video)
        return <Uit m="audio"/>;
    if (fase !== "rust")
        return (<Card className="space-y-4 text-center">
      {fase === "opname" && (<div role="status" className="flex items-center justify-between gap-2 rounded-md bg-destructive/15 px-3 py-2 text-sm font-semibold text-destructive">
          <span>● Opname actief · Sanne en Joris zien dit allebei</span>
          <button onClick={() => { setOpEind(nu()); setFase("bezig"); setMelding("De opname is gestopt. Het gesprek gaat verder zonder opname."); }} className="min-h-11 rounded-full border border-destructive/40 px-3 text-xs">Stop opname</button>
        </div>)}
      <div className="mx-auto grid size-24 place-items-center rounded-full bg-accent-warm/40"><AppIcon functie={soort === "video" ? "video" : "bellen"} maat="lg" vorm="kaal"/></div>
      <p className="font-display text-lg font-bold">Joris Bakker</p>
      <p className="text-sm text-ink-soft">{fase === "gaat" ? "Aan het bellen…" : tijd}</p>
      {fase === "uitleg" && (<div className="space-y-2 rounded-md border border-border bg-card p-4 text-left text-sm">
          <p className="font-semibold">Gesprek opnemen?</p>
          <ul className="list-disc space-y-1 pl-5 text-xs text-ink-soft">
            <li>Jullie weten allebei dat er wordt opgenomen. Joris moet eerst akkoord geven.</li>
            <li>Alleen jij en Joris kunnen de opname terugluisteren. Een professional krijgt nooit automatisch toegang.</li>
            <li>De opname wordt bewaard in jullie beveiligde gezinsomgeving.</li>
            <li>Zolang de opname loopt, staat bovenaan "Opname actief". Je kunt altijd stoppen.</li>
          </ul>
          <div className="flex gap-2 pt-1">
            <button onClick={() => setFase("verzoek")} className="min-h-11 flex-1 rounded-full bg-brand text-sm font-semibold text-primary-foreground">Vraag Joris om akkoord</button>
            <button onClick={() => setFase("bezig")} className="min-h-11 rounded-full border border-border px-4 text-sm font-semibold">Niet opnemen</button>
          </div>
        </div>)}
      {fase === "verzoek" && (<div className="space-y-3 rounded-md border border-border bg-card p-4 text-left">
          <p className="font-semibold">Wacht op akkoord van Joris</p>
          <p className="text-sm text-ink-soft">De opname start pas als Joris akkoord geeft.</p>
          <p className="text-xs text-ink-soft">Voorbeeld — reageer namens Joris:</p>
          <div className="flex gap-2">
            <button onClick={() => { const w = `12 maart ${nu()}`; setAkkoord([{ wie: "Sanne", wanneer: w }, { wie: "Joris", wanneer: w }]); setOpStart(nu()); setFase("opname"); }} className="min-h-11 flex-1 rounded-full bg-brand text-sm font-semibold text-primary-foreground">Akkoord</button>
            <button onClick={() => { setFase("bezig"); setMelding("Joris gaf geen akkoord. Het gesprek gaat verder zonder opname."); }} className="min-h-11 flex-1 rounded-full border border-border text-sm font-semibold">Niet akkoord</button>
          </div>
        </div>)}
      {melding && fase === "bezig" && <p className="text-sm text-ink-soft">{melding}</p>}
      <div className="flex justify-center gap-3">
        {fase === "bezig" && s.aan.opname && !opStart && (<button onClick={() => { setFase("uitleg"); setMelding(""); }} className="min-h-11 rounded-full border border-border px-4 text-sm font-semibold">Opnemen…</button>)}
        <button onClick={ophangen} className="min-h-11 rounded-full bg-destructive px-5 text-sm font-semibold text-primary-foreground">Ophangen</button>
      </div>
    </Card>);
    return (<>
      {afgelopen && (<Card className="space-y-3">
          <div><p className="font-semibold">Gesprek afgelopen</p><p className="text-sm text-ink-soft">{afgelopen.duur}</p></div>
          <p className="text-xs text-ink-soft">Een telefoongesprek is zelf nooit een gezamenlijke afspraak. Hebben jullie iets afgesproken? Leg het dan samen vast.</p>
          <div className="flex gap-2">
            <Link to="/afspraken" className="flex min-h-11 flex-1 items-center justify-center rounded-full bg-brand text-sm font-semibold text-primary-foreground">Afspraak vastleggen</Link>
            <button onClick={() => setAfgelopen(null)} className="min-h-11 flex-1 rounded-full border border-border text-sm font-semibold">Niets doen</button>
          </div>
          <details>
            <summary className="flex min-h-11 cursor-pointer list-none items-center text-sm font-semibold text-ink-soft">••• Meer</summary>
            <OnveiligKnop gesprek={`Gesprek met Joris, gestart ${afgelopen.begin}`}/>
          </details>
        </Card>)}
      <h2 className="font-display text-lg">Bellen met Joris</h2>
      <div className="grid grid-cols-2 gap-3">
        <button disabled={!s.aan.audio} onClick={() => bel("audio")} className="flex min-h-16 items-center justify-center gap-2 rounded-lg bg-brand font-semibold text-primary-foreground disabled:opacity-40"><AppIcon functie="bellen" maat="sm" vorm="kaal"/>Bellen</button>
        <button disabled={!s.aan.video} onClick={() => bel("video")} className="flex min-h-16 items-center justify-center gap-2 rounded-lg border border-border bg-card font-semibold disabled:opacity-40"><AppIcon functie="video" maat="sm" vorm="kaal"/>Videobellen</button>
      </div>
      <p className="text-xs text-ink-soft">Een gewoon gesprek wordt niet opgenomen.</p>
      <Logboek />
      <details className="rounded-lg border border-border bg-card px-4">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between text-sm font-semibold">Recente gesprekken <span className="text-ink-soft" aria-hidden>›</span></summary>
        <div className="divide-y divide-border pb-2">
          {s.gesprekken.map((g) => (<div key={g.id} className="flex items-center gap-3 py-2.5">
              <AppIcon functie={g.soort === "video" ? "video" : "bellen"} maat="sm"/>
              <div className="flex-1">
                <p className="text-sm font-semibold">Joris · {g.datum}</p>
                <p className="text-xs text-ink-soft">{g.begin}–{g.eind} · {g.duur}</p>
              </div>
              {g.opname && <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-ink-soft">Opgenomen</span>}
            </div>))}
        </div>
      </details>
    </>);
}
function Opnames() {
    const s = useGesprekken();
    const [open, setOpen] = useState(null);
    const [acties, setActies] = useState({});
    const lijst = s.gesprekken.filter((g) => g.opname);
    const voorstellen = [
        { k: "a1", soort: "Afspraak gevonden", t: "Joris haalt Noah vrijdag om 17:00 uur op bij de BSO.", v: "Toevoegen aan agenda?" },
        { k: "a2", soort: "📝 Taak gevonden", t: "Sanne belt maandag de tandarts voor Emma.", v: "Taak aanmaken?" },
        { k: "a3", soort: "💶 Kostenafspraak gevonden", t: "De zwemles betalen we voortaan 50/50.", v: "Voorstellen aan Joris als afspraak?" },
        { k: "a4", soort: "Spul genoemd", t: "De voetbalschoenen liggen bij Joris.", v: "Aanpassen bij Spullen?" },
    ];
    return (<>
      <p className="text-sm text-ink-soft">Alleen Sanne en Joris kunnen deze opnames zien. Een professional, familielid of bonusouder krijgt nooit automatisch toegang. Elke keer dat iemand een opname opent, wordt dat vastgelegd.</p>
      {lijst.length === 0 && <Card className="text-sm text-ink-soft">Hier verschijnen gesprekken zodra jullie er een vastleggen.</Card>}
      {lijst.map((g) => {
            const o = g.opname;
            const isOpen = open === g.id;
            return (<Card key={g.id} className="space-y-3">
            <button onClick={() => setOpen(isOpen ? null : g.id)} className="flex w-full items-center gap-3 text-left">
              <AppIcon functie="spraak" maat="sm"/>
              <div className="flex-1">
                <p className="text-sm font-semibold">Sanne & Joris · {g.datum}</p>
                <p className="text-xs text-ink-soft">{o.start}–{o.eind} · {g.duur}{o.kind ? ` · over ${o.kind}` : ""}</p>
              </div>
              <ChevronDown className={`size-4 text-ink-soft transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </button>
            {isOpen && (<div className="space-y-3 border-t border-border pt-3">
                <div className="rounded-md bg-muted/60 p-3 text-xs">
                  <p className="font-semibold">Toestemming</p>
                  <p>Aangevraagd door {o.aangevraagd}</p>
                  {o.akkoord.map((a) => <p key={a.wie}>✓ {a.wie} akkoord · {a.wanneer}</p>)}
                  <p>Opname {o.start} tot {o.eind}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold"><TekenLabel waarde="🎧 Originele opname"/></p>
                  <div className="mt-1 flex items-center gap-2 rounded-full bg-card px-3 py-2 text-xs"><span>▶</span><div className="h-1 flex-1 rounded-full bg-border"/><span>{g.duur}</span></div>
                  <p className="mt-1 text-[11px] text-ink-soft">Demo: er is geen echt geluidsbestand.</p>
                </div>
                {s.aan.transcriptie ? (o.transcript ? (<div>
                      <p className="text-sm font-semibold"><TekenLabel waarde="📝 Automatisch gegenereerd transcript"/></p>
                      <div className="mt-1 space-y-1 rounded-md bg-card p-3 text-xs">{o.transcript.map((r) => <p key={r}>{r}</p>)}</div>
                      <p className="mt-1 text-[11px] text-ink-soft">Automatische transcriptie kan fouten bevatten. Controleer belangrijke afspraken altijd zelf.</p>
                    </div>) : (<button onClick={() => werkOpnameBij(g.id, { transcript: demoTranscript })} className="rounded-full border border-border px-4 py-2 text-sm font-semibold">Gesprek uitschrijven</button>)) : <p className="text-xs text-ink-soft">Uitschrijven staat uit (zie Privacy).</p>}
                {s.aan.samenvatting && o.transcript && (o.samenvatting ? (<div className="rounded-md bg-brand-soft/60 p-3 text-sm">
                      <p className="font-semibold">Besproken</p>
                      <ul className="mt-1 list-disc pl-5">{o.samenvatting.map((r) => <li key={r}>{r}</li>)}</ul>
                      <p className="mt-2 text-[11px] text-ink-soft">Neutrale samenvatting van praktische punten. Er wordt niet beoordeeld wie gelijk heeft of wat iemand bedoelt.</p>
                    </div>) : (<button onClick={() => werkOpnameBij(g.id, { samenvatting: ["Joris haalt Noah vrijdag om 17:00 uur op.", "Sanne maakt een afspraak bij de tandarts.", "Zwemles wordt 50/50 betaald.", "De zomervakantie wordt volgende week verder besproken."] })} className="rounded-full border border-border px-4 py-2 text-sm font-semibold"><TekenLabel waarde="✨ Samenvatting maken"/></button>))}
                {s.aan.acties && o.samenvatting && (<div className="space-y-2">
                    <p className="text-sm font-semibold">Voorstellen uit dit gesprek</p>
                    <p className="text-[11px] text-ink-soft">Niets wordt automatisch definitief. Jij bekijkt en bevestigt elke actie.</p>
                    {voorstellen.map((v) => (<div key={v.k} className="rounded-md bg-card p-3 text-sm">
                        <p className="text-xs font-semibold text-ink-soft"><TekenLabel waarde={v.soort}/></p>
                        <p>"{v.t}"</p>
                        {acties[v.k] ? (<p className="mt-1 text-xs font-semibold text-brand">{acties[v.k] === "ja" ? (v.k === "a3" ? "✓ Voorgesteld — wacht op Joris" : "✓ Toegevoegd") : "Overgeslagen"}</p>) : (<div className="mt-2 flex items-center gap-2">
                            <span className="flex-1 text-xs text-ink-soft">{v.v}</span>
                            <button onClick={() => setActies({ ...acties, [v.k]: "ja" })} className="rounded-full bg-brand px-3 py-1 text-xs font-semibold text-primary-foreground">Ja</button>
                            <button onClick={() => setActies({ ...acties, [v.k]: "nee" })} className="rounded-full border border-border px-3 py-1 text-xs font-semibold">Nee</button>
                          </div>)}
                      </div>))}
                  </div>)}
              </div>)}
          </Card>);
        })}
    </>);
}
function Privacy() {
    const s = useGesprekken();
    const opties = ["30 dagen", "3 maanden", "1 jaar", "Tot ik verwijder"];
    const vragen = [
        ["Welke gegevens bewaren we?", `Van gesprekken: wie, wanneer, hoe lang. Van aankomstbevestigingen: wie, bij welke overdracht en hoe laat. Opnames alleen als iedereen akkoord gaf. Nu opgeslagen: ${s.gesprekken.filter((g) => g.opname).length} opname(s) en ${s.checkins.length} aankomstbevestiging(en).`],
        ["Waarom bewaren we dit?", "Om samen duidelijkheid te hebben over afspraken. Nooit voor reclame, profielen of het trainen van AI."],
        ["Wie kan mijn gegevens zien?", "Alleen jij en Joris. Een professional ziet alleen wat jullie samen apart delen, en nooit automatisch opnames."],
        ["Welke toestemmingen heb ik gegeven?", "Bij elke opname staat wie akkoord gaf en wanneer. Je vindt dat onder Opnames."],
        ["Hoe gebruik ik mijn privacyrechten?", "Je kunt je gegevens inzien, laten verwijderen of exporteren. Staat er ook iets van Joris in, dan vragen we eerst of hij akkoord is."],
    ];
    return (<>
      <Card className="divide-y divide-border py-1">
        {Object.keys(moduleLabels).map((m) => (<div key={m} className="flex items-center justify-between gap-3 py-3">
            <div><p className="text-sm font-semibold"><TekenLabel waarde={moduleLabels[m].t}/></p><p className="text-xs text-ink-soft">{moduleLabels[m].u}</p></div>
            <Schakel aan={s.aan[m]} onClick={() => zetModule(m, !s.aan[m])}/>
          </div>))}
      </Card>
      <h2 className="font-display font-bold">Hoe lang bewaren?</h2>
      <Card className="space-y-2">
        {bewaarOnderdelen.map((b) => (<label key={b} className="flex items-center justify-between gap-3 text-sm">
            {b}
            <select value={s.bewaar[b]} onChange={(e) => zetBewaar(b, e.target.value)} className="rounded-full border border-border bg-card px-3 py-1 text-sm">
              {opties.map((o) => <option key={o}>{o}</option>)}
            </select>
          </label>))}
        <p className="text-[11px] text-ink-soft">Voorbeeldinstellingen. De echte termijnen worden vastgesteld na een juridische en privacytoets.</p>
      </Card>
      <h2 className="font-display font-bold">Privacycentrum</h2>
      {vragen.map(([v, a]) => (<details key={v} className="rounded-lg p-4">
          <summary className="cursor-pointer text-sm font-semibold">{v}</summary>
          <p className="mt-2 text-sm text-ink-soft">{a}</p>
        </details>))}
      <Link to="/professionals" className="block text-sm font-semibold text-brand">Wie heeft toegang tot ons gezin? ›</Link>
      <p className="text-center text-xs text-ink-soft">Geen verborgen opnames. De app volgt je nooit. Geen automatische oordelen.</p>
    </>);
}
function Logboek() {
    const m = useMeldingen();
    if (!m.length)
        return null;
    return (<Card className="space-y-2">
      <p className="text-sm font-semibold"><TekenLabel waarde="Wat je zelf hebt vastgelegd"/> <span className="font-normal text-ink-soft">· alleen voor jou</span></p>
      {m.map((x) => (<div key={x.id} className="rounded-md bg-muted/60 p-3 text-sm">
          <p className="text-xs text-ink-soft">{x.datum} · {uur(x.tijd)}{x.gesprek ? ` · ${x.gesprek}` : ""}</p>
          <p>{x.notitie || "Geen notitie toegevoegd."}</p>
        </div>))}
    </Card>);
}
