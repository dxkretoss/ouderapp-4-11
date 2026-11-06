import { Sectie, BewerkPotlood } from "@/components/ui-kit";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, Card, PageHeader } from "@/components/AppShell";
import { Lijst, useLijst } from "@/components/KleineLijst";
import { eigenSpullen, kindNaam, useTaken, voegSpulToe, zetSpul } from "@/lib/taken-store";
import { useStart } from "@/lib/start-store";
import { bevestig } from "@/lib/feedback";
import { useNavigate } from "@tanstack/react-router";
// Eigen gezin: eigen spullen (geen voorbeelddata), met plusje en toevoegformulier.
function SpullenWrap() {
    const st = useStart();
    if (st.eigen)
        return <EigenSpullen />;
    return <Spullen />;
}
function EigenSpullen() {
    const { t } = useTranslation();
    const st = useStart();
    useTaken(); // herbereken bij wijzigingen
    const nav = useNavigate();
    const [nieuw, setNieuw] = useState(false);
    const [naam, setNaam] = useState("");
    const [kind, setKind] = useState(st.kinderen[0]?.id ?? "");
    const [type, setType] = useState("mee");
    const lijst = eigenSpullen();
    const opslaan = () => {
        if (!naam.trim() || !kind)
            return;
        voegSpulToe({ naam: naam.trim(), kind, type });
        bevestig("Spul toegevoegd", { uitleg: naam.trim() });
        setNaam("");
        setNieuw(false);
    };
    return (<AppShell>
      <PageHeader titel={t("items.headerTitle", "Spullen")} subtitel={t("items.headerSubtitle", "Wat moet mee en waar zijn belangrijke spullen?")} actie={<button aria-label={t("items.newItemAria", "Nieuw spul")} onClick={() => setNieuw(true)} className="inline-flex size-11 items-center justify-center rounded-full text-xl font-semibold text-brand hover:bg-muted">+</button>}/>
      {nieuw ? (<Card className="mt-4 space-y-3">
          <p className="font-display text-lg font-bold">{t("items.newItem", "Nieuw spul")}</p>
          <label className="block text-sm font-semibold">{t("items.whatIsIt", "Wat is het?")}<input value={naam} onChange={(e) => setNaam(e.target.value)} placeholder={t("items.placeholder", "Bijv. knuffel, sporttas")} className={`mt-1 w-full font-normal ${veld}`}/></label>
          {st.kinderen.length ? (<fieldset><legend className="text-sm font-semibold">{t("items.whichChild", "Van welk kind?")}</legend><div className="mt-1 flex flex-wrap gap-2">
              {st.kinderen.map((k) => <button key={k.id} onClick={() => setKind(k.id)} aria-pressed={kind === k.id} className={knop(kind === k.id)}>{k.naam}</button>)}
            </div></fieldset>) : null}
          <fieldset><legend className="text-sm font-semibold">{t("items.whatWithIt", "Wat ermee?")}</legend><div className="mt-1 flex flex-wrap gap-2">
            {["mee", "vast", "dubbel"].map((tp) => <button key={tp} onClick={() => setType(tp)} aria-pressed={type === tp} className={knop(type === tp)}>{typeLabel[tp]}</button>)}
          </div></fieldset>
          <div className="flex gap-2">
            <button onClick={opslaan} className="min-h-11 flex-1 rounded-full bg-brand text-sm font-semibold text-primary-foreground">{t("items.add", "Toevoegen")}</button>
            <button onClick={() => setNieuw(false)} className="min-h-11 px-3 text-sm text-ink-soft">{t("items.cancel", "Annuleren")}</button>
          </div>
        </Card>) : null}
      {!lijst.length && !nieuw ? (<div className="mt-10 flex flex-col items-center text-center">
          <p className="font-display text-lg font-bold">{t("items.allDoneQuiet", "Hier is het nog rustig")}</p>
          <p className="mt-1 max-w-xs text-sm text-ink-soft">{t("items.allDoneQuietDesc", "Hier houd je bij welke spullen meegaan tussen de huizen.")}</p>
          <button onClick={() => setNieuw(true)} className="mt-5 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-primary-foreground">{t("items.addFirstItem", "Eerste spul toevoegen")}</button>
          <button onClick={() => nav({ to: "/meer" })} className="mt-3 min-h-11 text-sm font-semibold text-ink-soft">{t("items.backToMenu", "Terug naar Menu")}</button>
        </div>) : null}
      {["mee", "vast", "dubbel"].map((tp) => {
            const l = lijst.filter((s) => s.type === tp);
            if (!l.length)
                return null;
            return (<section key={tp} className="mt-5">
            <h2 className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">{groepLabel[tp]}</h2>
            <ul className="mt-2 divide-y divide-border rounded-md border border-border bg-card">
              {l.map((s) => (<li key={s.id} className="flex min-h-14 items-center gap-3 px-3 py-3">
                  <span className="flex-1"><span className="block text-sm font-semibold">{s.naam}</span>
                    <span className="block text-xs text-ink-soft">{kindNaam(s.kind).join(" & ")}</span></span>
                </li>))}
            </ul>
          </section>);
        })}
    </AppShell>);
}
export const Route = createFileRoute("/spullen")({
    head: () => ({
        meta: [
            { title: "Spullen — Ouderschap & Co" },
            { name: "description", content: "Wat moet mee en waar zijn belangrijke spullen?" },
            { property: "og:title", content: "Spullen — Ouderschap & Co" },
            { property: "og:description", content: "Wat meewisselt, wat een vaste plek heeft en wat in beide huizen ligt." },
            { property: "og:type", content: "website" },
            { name: "twitter:card", content: "summary" },
        ],
    }),
    component: SpullenWrap,
});
const typeLabel = { mee: "Wisselt mee", vast: "Vaste plek", dubbel: "In beide huizen" };
const groepLabel = { mee: "Moet mee", vast: "Vaste plek", dubbel: "In beide huizen" };
const plekTekst = (p) => (p === "sanne" ? "bij Sanne" : p === "joris" ? "bij Joris" : p ? `${p === "school" ? "op school" : p}` : "plek nog onbekend");
const veld = "rounded-md border border-border bg-background px-3 py-2 text-sm";
const knop = (aan) => `min-h-11 rounded-full border px-3 text-sm ${aan ? "border-brand bg-brand-soft font-semibold" : "border-border"}`;
const paklijsten = {
    Weekend: ["Pyjama", "Tandenborstel", "Knuffel", "Oplader tablet", "Huiswerk"],
    Vakantie: ["Paspoort / ID", "Zonnebrand", "Zwemspullen", "Medicatie", "Reisspelletjes"],
    Sportdag: ["Sportkleding", "Bidon", "Pet", "Lunchpakket"],
    Schoolreisje: ["Lunch & drinken", "Regenjas", "Zakgeld", "Toestemmingsbriefje"],
};
const routines = [
    { dag: "Maandag", tekst: "Gymtas Emma mee naar school" },
    { dag: "Dinsdag", tekst: "Zwemtas Emma" },
    { dag: "Donderdag", tekst: "Voetbalschoenen Noah" },
    { dag: "Zondag", tekst: "Neusspray Emma aanvullen" },
];
function Spullen() {
    const { t } = useTranslation();
    const { spullen } = useTaken();
    const [nieuw, setNieuw] = useState(false);
    const [open, setOpen] = useState(null);
    const [pak, setPak] = useState("Weekend");
    const [ingepakt, setIngepakt] = useState(new Set());
    const vergeten = useLijst([
        { tekst: "Bibliotheekboek", wie: "Terug naar Joris", kind: "Emma", klaar: false },
        { tekst: "Winterjas", wie: "Terug naar Sanne", kind: "Noah", klaar: false },
    ]);
    const gekozen = spullen.find((s) => s.id === open);
    if (gekozen)
        return <AppShell><SpulDetail s={gekozen} terug={() => setOpen(null)}/></AppShell>;
    return (<AppShell>
      <PageHeader titel="Spullen" subtitel="Wat moet mee en waar zijn belangrijke spullen?" actie={<button aria-label="Nieuw spul" onClick={() => setNieuw(true)} className="inline-flex size-11 items-center justify-center rounded-full text-xl font-semibold text-brand hover:bg-muted">+</button>}/>

      {nieuw ? <NieuwSpul onKlaar={() => setNieuw(false)}/> : null}

      {["mee", "vast", "dubbel"].map((type) => {
            const l = spullen.filter((s) => s.type === type);
            if (!l.length)
                return null;
            return (<section key={type} className="mt-5">
            <h2 className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">{groepLabel[type]}</h2>
            <ul className="mt-2 divide-y divide-border rounded-md border border-border bg-card">
              {l.map((s) => (<li key={s.id}>
                  <button onClick={() => setOpen(s.id)} className="flex min-h-14 w-full items-center gap-3 px-3 py-3 text-left">
                    <span className="flex-1"><span className="block text-sm font-semibold">{s.naam}</span>
                      <span className="block text-xs text-ink-soft">{s.kind === "emma" ? "Emma" : "Noah"}{type === "mee" ? " · volgende overdracht" : type === "vast" ? ` · ${plekTekst(s.plek)}` : ""}</span></span>
                    <ChevronRight className="size-5 shrink-0 text-ink-soft" />
                  </button>
                </li>))}
            </ul>
          </section>);
        })}
      <Link to="/overdracht" className="mt-3 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-brand"><span>Overdracht bekijken</span><ChevronRight className="size-4" /></Link>

      <div className="mt-4">
        <Sectie titel="Niet vergeten" sub="Wat terug moet naar het andere huis">
          <Lijst data={vergeten} wieOpties={["Terug naar Joris", "Terug naar Sanne"]} labels={["Moet terug", "Terug"]} placeholder="Bijv. knuffel, jas"/>
        </Sectie>
        <Sectie titel="Paklijsten">{(<>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {Object.keys(paklijsten).map((p) => <button key={p} onClick={() => { setPak(p); setIngepakt(new Set()); }} className={`min-h-11 rounded-md px-3 text-sm ${pak === p ? "bg-brand-soft font-semibold text-brand" : "border border-border"}`}>{p}</button>)}
            </div>
            <Card className="mt-4">
              <p className="font-display font-bold">{pak}</p>
              <ul className="mt-3 space-y-2">
                {(paklijsten[pak] ?? []).map((s) => (<li key={s}><button onClick={() => setIngepakt((x) => { const n = new Set(x); if (n.has(s))
                n.delete(s);
            else
                n.add(s); return n; })} className="flex min-h-11 w-full items-center gap-3 text-left text-sm">
                    <span className={`grid size-6 place-items-center rounded-full border ${ingepakt.has(s) ? "border-brand bg-brand text-surface" : "border-ink-soft/40"}`}>{ingepakt.has(s) ? "✓" : ""}</span>
                    <span className={ingepakt.has(s) ? "text-ink-soft line-through" : ""}>{s}</span>
                  </button></li>))}
              </ul>
              <p className="mt-3 text-xs text-ink-soft">{ingepakt.size} van {(paklijsten[pak] ?? []).length} ingepakt</p>
            </Card>
          </>)}</Sectie>
        <Sectie titel="Vaste spullen per dag" sub="Wat elke week mee moet">{(<ul className="mt-4 divide-y divide-border rounded-md border border-border bg-card">
            {routines.map((r) => <li key={r.dag} className="px-3 py-3"><p className="text-[11px] font-semibold uppercase text-ink-soft">Elke {r.dag.toLowerCase()}</p><p className="text-sm">{r.tekst}</p></li>)}
          </ul>)}</Sectie>
      </div>
    </AppShell>);
}
function PlekKeuze({ type, plek, setType, setPlek }) {
    const anders = plek !== "sanne" && plek !== "joris";
    return (<>
      <fieldset><legend className="text-sm font-semibold">Waar hoort het?</legend><div className="mt-1 flex flex-wrap gap-2">
        {Object.keys(typeLabel).map((t) => <button key={t} onClick={() => setType(t)} aria-pressed={type === t} className={knop(type === t)}>{typeLabel[t]}</button>)}
      </div></fieldset>
      {type === "vast" ? (<fieldset><legend className="text-sm font-semibold">Waar?</legend><div className="mt-1 flex flex-wrap gap-2">
          <button onClick={() => setPlek("sanne")} aria-pressed={plek === "sanne"} className={knop(plek === "sanne")}>Bij Sanne</button>
          <button onClick={() => setPlek("joris")} aria-pressed={plek === "joris"} className={knop(plek === "joris")}>Bij Joris</button>
          <button onClick={() => setPlek(anders && plek ? plek : "school")} aria-pressed={anders} className={knop(anders)}>Anders</button>
        </div>{anders ? <input value={plek} onChange={(e) => setPlek(e.target.value)} placeholder="Bijv. school, oma" aria-label="Andere plek" className={`mt-2 w-full ${veld}`}/> : null}</fieldset>) : type === "mee" ? <p className="text-xs text-ink-soft">Dit komt vanzelf op de lijst bij de volgende overdracht.</p> : null}
    </>);
}
function SpulDetail({ s, terug }) {
    const [bewerk, setBewerk] = useState(false);
    return (<>
      <div className="mt-2"><button onClick={terug} className="min-h-11 inline-flex items-center gap-1 text-sm font-semibold text-brand cursor-pointer"><ChevronLeft className="size-4 shrink-0" /><span>Spullen</span></button></div>
      <Card className="relative mt-3 space-y-3">
        {!bewerk ? <BewerkPotlood onClick={() => setBewerk(true)} label="Plek aanpassen"/> : null}
        <div><h1 className="pr-12 font-display text-xl font-bold">{s.naam}</h1><p className="text-sm text-ink-soft">{s.kind === "emma" ? "Emma" : "Noah"}</p></div>
        {bewerk ? (<>
            <PlekKeuze type={s.type} plek={s.plek ?? "sanne"} setType={(t) => zetSpul(s.id, { type: t, ...(t === "vast" && !s.plek ? { plek: "sanne" } : {}) })} setPlek={(p) => zetSpul(s.id, { plek: p })}/>
            <button onClick={() => setBewerk(false)} className="min-h-11 w-full rounded-full bg-brand text-sm font-semibold text-primary-foreground">Klaar</button>
          </>) : (<dl className="text-sm"><dt className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">Waar hoort het?</dt><dd className="mt-0.5">{typeLabel[s.type]}{s.type === "vast" ? ` · ${plekTekst(s.plek)}` : ""}</dd></dl>)}
        {s.type === "mee" ? <Link to="/overdracht" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-brand"><span>Bekijk bij de overdracht</span><ChevronRight className="size-4" /></Link> : null}
      </Card>
    </>);
}
function NieuwSpul({ onKlaar }) {
    const [naam, setNaam] = useState("");
    const [kind, setKind] = useState("emma");
    const [type, setType] = useState("mee");
    const [plek, setPlek] = useState("sanne");
    return (<Card className="mt-4 space-y-3">
      <p className="font-display text-lg font-bold">Nieuw spul</p>
      <label className="block text-sm font-semibold">Wat is het?<input value={naam} onChange={(e) => setNaam(e.target.value)} placeholder="Bijv. schooltas" className={`mt-1 w-full font-normal ${veld}`}/></label>
      <fieldset><legend className="text-sm font-semibold">Voor wie?</legend><div className="mt-1 flex gap-2">
        {["emma", "noah"].map((k) => <button key={k} onClick={() => setKind(k)} aria-pressed={kind === k} className={knop(kind === k)}>{k === "emma" ? "Emma" : "Noah"}</button>)}
      </div></fieldset>
      <PlekKeuze type={type} plek={plek} setType={setType} setPlek={setPlek}/>
      <button disabled={!naam.trim()} onClick={() => { voegSpulToe({ naam: naam.trim(), kind, type, ...(type === "vast" ? { plek } : {}) }); onKlaar(); }} className="min-h-11 w-full rounded-full bg-brand text-sm font-semibold text-primary-foreground disabled:opacity-40">Toevoegen</button>
      <button onClick={onKlaar} className="min-h-11 w-full text-sm font-semibold text-ink-soft">Annuleren</button>
    </Card>);
}
