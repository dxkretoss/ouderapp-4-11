import { createFileRoute, Link } from "@tanstack/react-router";
import { SlimmeMeeLijst } from "@/components/SlimmeMeeLijst";
import { VasteRoutines } from "@/components/VasteRoutines";
import { useEffect, useState } from "react";
import { beginOverdracht, markeerOverdrachtIngevuld, useWissel } from "@/lib/wissel-store";
import { useAudit } from "@/lib/audit-store";
import { AppShell, Card, PageHeader } from "@/components/AppShell";
import { kinderen } from "@/lib/demo-data";
import { TekenLabel } from "@/components/AppIcon";
import { IkBenLater } from "@/components/IkBenLater";
import { OnderwegStatus } from "@/components/OnderwegStatus";
import { useTaken } from "@/lib/taken-store";
import { magAudit } from "@/lib/export-rechten";
export const Route = createFileRoute("/overdracht")({
    head: () => ({
        meta: [
            { title: "Overdracht — Ouderschap & Co" },
            { name: "description", content: "Geef bij het wisselmoment in één minuut mee wat belangrijk is voor je kind." },
            { property: "og:title", content: "Overdracht — Ouderschap & Co" },
            { property: "og:description", content: "Twee huizen, maar de belangrijke informatie rondom het kind verhuist mee." },
            { property: "og:type", content: "website" },
            { name: "twitter:card", content: "summary" },
        ],
    }),
    component: Overdracht,
});
const stemmingen = ["😊 Vrolijk", "😌 Rustig", "Moe", "😟 Wat stil", "😢 Verdrietig"];
const slaap = ["Goed", "Wisselend", "Onrustig"];
const onderwerpenOud = ["School / huiswerk", "Spullen mee", "Medicatie", "Emoties", "Sport / hobby", "Afspraken"];
const onderwerpenJong = ["Slaap", "Voeding", "Gezondheid", "Medicatie", "Spullen mee", "Knuffel / troost"];
const overgang = ["Soepel", "Even wennen", "Lastig"];
const startLog = [
    { id: 1, datum: "7 maart", kind: "emma", richting: "Van Joris naar jou", stemming: "😊 Vrolijk", slaap: "Goed", overgang: "Soepel", onderwerpen: ["School / huiswerk"], positief: "Trots op haar spreekbeurt over dolfijnen 🐬" },
    { id: 2, datum: "7 maart", kind: "noah", richting: "Van Joris naar jou", stemming: "Moe", slaap: "Onrustig", overgang: "Even wennen", onderwerpen: ["Spullen mee"], notitie: "Knuffel konijn lag nog bij Joris, is nagebracht.", positief: "Kijkt uit naar het voetbaltoernooi zaterdag" },
    { id: 3, datum: "28 feb", kind: "noah", richting: "Van jou naar Joris", stemming: "😟 Wat stil", slaap: "Onrustig", overgang: "Even wennen", onderwerpen: ["Emoties"], notitie: "Wilde afscheid nemen van de hond." },
    { id: 4, datum: "21 feb", kind: "emma", richting: "Van Joris naar jou", stemming: "😌 Rustig", slaap: "Goed", overgang: "Soepel", onderwerpen: [], positief: "Heeft zelf pannenkoeken gebakken 🥞" },
    { id: 5, datum: "14 feb", kind: "noah", richting: "Van jou naar Joris", stemming: "😌 Rustig", slaap: "Onrustig", overgang: "Soepel", onderwerpen: ["Medicatie"], notitie: "Paracetamol om 8 uur gehad, lichte verhoging." },
];
function Chips({ opties, waarde, onKies, multi }) {
    return (<div className="flex flex-wrap gap-2">
      {opties.map((o) => {
            const aan = waarde.includes(o);
            return (<button key={o} type="button" onClick={() => onKies(o)} aria-pressed={aan} className={`rounded-full border px-3 py-1.5 text-sm transition ${aan ? "border-brand bg-brand text-primary-foreground" : "border-white/70 bg-white/70"}`}>
            {multi && aan ? "✓ " : ""}<TekenLabel waarde={o}/>
          </button>);
        })}
    </div>);
}
function Overdracht() {
    const [tab, setTab] = useState("meegeven");
    const [kindId, setKindId] = useState(kinderen[0]?.id ?? "emma");
    const kind = kinderen.find((k) => k.id === kindId);
    const jong = (kind?.leeftijd ?? 0) < 4;
    const [stemming, setStemming] = useState();
    const [slaapV, setSlaap] = useState();
    const [overgangV, setOvergang] = useState();
    const [onderwerpen, setOnderwerpen] = useState([]);
    const [notitie, setNotitie] = useState("");
    const [positief, setPositief] = useState("");
    const [log, setLog] = useState(startLog);
    const [verstuurd, setVerstuurd] = useState(false);
    const [filter, setFilter] = useState("alle");
    const audit = useAudit();
    const wissel = useWissel();
    const { spullen } = useTaken();
    useEffect(() => { beginOverdracht(kindId); }, [kindId]);
    const sinds = wissel.laatsteOverdracht[kindId];
    const gezien = new Set();
    const nieuweInfo = [...audit].reverse().filter((e) => {
        const sleutel = `${e.soort}:${e.itemId}`;
        if (!sinds || e.moment <= sinds || !kind || e.meta["zichtbaarheid"] === "privé" || !e.kinderen.includes(kind.naam) || !magAudit({ type: "ouder", id: "sanne" }, e.soort))
            return false;
        if (gezien.has(sleutel))
            return false;
        gezien.add(sleutel);
        if (e.actie !== "CREATED" && e.actie !== "UPDATED" && e.actie !== "ACCEPTED")
            return false;
        if (e.meta["type"] === "Spul")
            return spullen.some((s) => s.id === e.itemId && s.kind === kindId && s.type === "mee");
        return e.soort === "afspraak" || (e.soort === "dossier" && e.meta["type"] === "Gezondheid");
    }).slice(0, 3);
    const reset = () => { setStemming(undefined); setSlaap(undefined); setOvergang(undefined); setOnderwerpen([]); setNotitie(""); setPositief(""); };
    const versturen = () => {
        setLog([{ id: Date.now(), datum: "12 maart", kind: kindId, richting: "Van jou naar Joris", stemming, slaap: slaapV, overgang: overgangV, onderwerpen, notitie: notitie || undefined, positief: positief || undefined }, ...log]);
        reset();
        setVerstuurd(true);
        markeerOverdrachtIngevuld(kindId);
    };
    const zichtbaar = log.filter((r) => filter === "alle" || r.kind === filter);
    const telling = (fn) => zichtbaar.filter(fn).length;
    if (!kind)
        return null;
    return (<AppShell>
      <PageHeader titel="Overdracht" subtitel="Twee huizen, maar de belangrijke informatie verhuist mee."/>
      <SlimmeMeeLijst momentId="w1"/>
      <OnderwegStatus momentId="w1"/>
      <IkBenLater momentId="w1"/>
      <Link to="/veranderd" search={{ moment: "w1" }} className="mt-2 inline-block text-xs font-semibold text-brand">Nu afstemmen →</Link>
      <VasteRoutines />

      <div className="mt-5 grid grid-cols-2 gap-1 rounded-full bg-white/60 p-1 text-sm font-semibold">
        {["meegeven", "terugblik"].map((t) => (<button key={t} onClick={() => setTab(t)} className={`rounded-full py-2 ${tab === t ? "bg-white shadow-sm" : "text-ink-soft"}`}>
            {t === "meegeven" ? "Meegeven" : "Terugblik"}
          </button>))}
      </div>

      {tab === "meegeven" ? (<div className="mt-5 space-y-4">
          <Card className="bg-brand-soft/60">
            <p className="text-sm"><b>Vrijdag 14:30 uur</b> · Basisschool De Boomgaard</p>
            <p className="mt-1 text-sm text-ink-soft">Morgen gaan de kinderen naar Joris. Is er iets wat fijn is om mee te geven? Duurt ongeveer een minuut — alles is optioneel.</p>
          </Card>

          {verstuurd && (<Card className="border-brand">
              <p className="font-semibold"><TekenLabel waarde="💚 Meegegeven aan Joris"/></p>
              <p className="text-sm text-ink-soft">Joris ziet je overdracht vóór het wisselmoment.</p>
              <button onClick={() => setVerstuurd(false)} className="mt-2 text-sm font-semibold text-brand">Nog een kind invullen</button>
            </Card>)}

          <div className="flex gap-2">
            {kinderen.map((k) => (<button key={k.id} onClick={() => { setKindId(k.id); reset(); }} className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold ${kindId === k.id ? "border-brand bg-white" : "border-transparent bg-surface text-ink-soft"}`}>
                <img src={k.avatar} alt="" className="size-6 rounded-full object-cover"/>
                {k.naam}
              </button>))}
          </div>

          <Card className="space-y-4">
            {nieuweInfo.length ? <section className="space-y-2" aria-label="Wat is er nieuw"><p className="text-sm font-semibold">Wat is er nieuw voor {kind.naam}?</p><p className="text-xs text-ink-soft">Wil je dit meenemen in de overdracht? Je kiest zelf wat je deelt.</p>{nieuweInfo.map((e) => <label key={e.eventId} className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={notitie.split("\n").includes(`${e.itemNaam}${e.wijzigingen.length ? ` · ${e.wijzigingen.map((w) => `${w.veld}: ${w.nieuw}`).join("; ")}` : " · toegevoegd"}`)} onChange={(event) => { const regel = `${e.itemNaam}${e.wijzigingen.length ? ` · ${e.wijzigingen.map((w) => `${w.veld}: ${w.nieuw}`).join("; ")}` : " · toegevoegd"}`; setNotitie((v) => event.target.checked ? [v, regel].filter(Boolean).join("\n") : v.split("\n").filter((r) => r !== regel).join("\n")); }}/>{e.itemNaam}</label>)}</section> : null}
            <div>
              <p className="mb-2 text-sm font-semibold">Hoe gaat het met {kind.naam}?</p>
              <Chips opties={stemmingen} waarde={stemming ? [stemming] : []} onKies={(v) => setStemming(v === stemming ? undefined : v)}/>
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold">Hoe heeft {kind.naam} geslapen?</p>
              <Chips opties={slaap} waarde={slaapV ? [slaapV] : []} onKies={(v) => setSlaap(v === slaapV ? undefined : v)}/>
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold">Iets om op te letten?</p>
              <Chips multi opties={jong ? onderwerpenJong : onderwerpenOud} waarde={onderwerpen} onKies={(v) => setOnderwerpen(onderwerpen.includes(v) ? onderwerpen.filter((o) => o !== v) : [...onderwerpen, v])}/>
            </div>
            <textarea value={notitie} onChange={(e) => setNotitie(e.target.value)} rows={2} placeholder={`Is er iets fijns of belangrijks dat Joris moet weten? (optioneel)`} className="w-full rounded-md border border-white/70 bg-white/80 p-3 text-sm"/>
          </Card>

          <Card className="space-y-2 bg-accent-warm/20">
            <p className="text-sm font-semibold"><TekenLabel waarde="🌟 Ook het mooie delen"/></p>
            <p className="text-xs text-ink-soft">Wat was leuk om te weten? Waar was {kind.naam} trots op? Waar kijkt {kind.naam} naar uit?</p>
            <input value={positief} onChange={(e) => setPositief(e.target.value)} placeholder="Bijv. trots op zijn zwemdiploma" className="w-full rounded-md border border-white/70 bg-white/80 p-3 text-sm"/>
          </Card>

          <Card className="space-y-2">
            <p className="text-sm font-semibold">Na het wisselmoment: hoe ging de overgang voor {kind.naam}?</p>
            <Chips opties={overgang} waarde={overgangV ? [overgangV] : []} onKies={(v) => setOvergang(v === overgangV ? undefined : v)}/>
            <p className="text-xs text-ink-soft">Dit gaat over hoe {kind.naam} het ervaart — niet over de andere ouder.</p>
          </Card>

          <button onClick={versturen} className="w-full rounded-full bg-brand py-3.5 font-semibold text-primary-foreground">Meegeven aan Joris</button>
        </div>) : (<div className="mt-5 space-y-4">
          <p className="text-sm text-ink-soft">Een neutraal overzicht van jouw eigen eerdere notities. Alleen voor jou zichtbaar. Er worden geen conclusies getrokken.</p>
          <div className="flex gap-2">
            {[{ id: "alle", naam: "Allebei" }, ...kinderen].map((k) => (<button key={k.id} onClick={() => setFilter(k.id)} className={`rounded-full px-3 py-1.5 text-sm font-semibold ${filter === k.id ? "bg-white shadow-sm" : "bg-surface text-ink-soft"}`}>{k.naam}</button>))}
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
                { l: "Soepele overgang", n: telling((r) => r.overgang === "Soepel") },
                { l: "Onrustig geslapen", n: telling((r) => r.slaap === "Onrustig") },
                { l: "Mooie momenten", n: telling((r) => !!r.positief) },
            ].map((s) => (<Card key={s.l} className="p-3">
                <p className="font-display text-2xl font-bold">{s.n}</p>
                <p className="text-[11px] text-ink-soft">{s.l}</p>
              </Card>))}
          </div>
          <p className="text-xs text-ink-soft">Van de laatste {zichtbaar.length} overdrachten. Valt je iets op? Je kunt het altijd bespreken met de andere ouder of een professional.</p>
          {zichtbaar.map((r) => {
                const k = kinderen.find((x) => x.id === r.kind);
                return (<Card key={r.id} className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <img src={k.avatar} alt="" className="size-7 rounded-full object-cover"/>
                  <p className="flex-1 text-sm font-semibold">{k.naam} · {r.datum}</p>
                  <span className="text-[11px] text-ink-soft">{r.richting}</span>
                </div>
                <div className="flex flex-wrap gap-1.5 text-xs">
                  {[r.stemming, r.slaap && `Slaap: ${r.slaap}`, r.overgang && `Overgang: ${r.overgang}`, ...r.onderwerpen].filter(Boolean).map((t) => (<span key={t} className="rounded-full bg-white/80 px-2 py-0.5">{t}</span>))}
                </div>
                {r.notitie && <p className="text-sm text-ink-soft">{r.notitie}</p>}
                {r.positief && <p className="text-sm"><TekenLabel waarde={`🌟 ${r.positief}`}/></p>}
              </Card>);
            })}
        </div>)}
    </AppShell>);
}
