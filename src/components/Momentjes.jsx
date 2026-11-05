import { useState } from "react";
import { AppIcon, Pictogram, TekenLabel, tekstMetIcoon } from "@/components/AppIcon";
import { useKring, persoonLabel, mag, wieNaam } from "@/lib/kring-store";
import { kinderen, parents } from "@/lib/demo-data";
import { momentLabel, mijlpalen, reacties, reageer, voegMomentjeToe, } from "@/lib/momentjes-store";
export function MomentjeKaart({ m, kijker }) {
    const [tekstOpen, setTekstOpen] = useState(false);
    const [tekst, setTekst] = useState("");
    const kind = kinderen.find((k) => k.id === m.kindId);
    const vanMij = kijker ? m.auteurId === kijker : m.van === "sanne";
    const auteur = m.van === "kring" ? `Momentje van ${wieNaam(m.auteurId)}` : parents[m.van].naam;
    const kringTekst = m.kringIds?.length ? ` · ${m.kringIds.map((id) => wieNaam(id)).join(", ")}` : "";
    const getoond = tekstMetIcoon(m.tekst);
    return (<div className="overflow-hidden rounded-lg border border-border">
      {m.foto ? <img src={m.foto} alt="" className="aspect-[4/3] w-full object-cover"/> : null}
      <div className="p-4">
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
          <img src={kind.avatar} alt={kind.naam} className="size-6 rounded-full object-cover"/>
          <span>{kind.naam}</span>
          <span className="text-ink-soft">· {auteur} · {m.wanneer}</span>
        </div>
        <p className="mt-2 flex items-start gap-1.5 text-[15px] leading-snug">{getoond.teken ? <Pictogram waarde={getoond.teken} maat="sm" className="mt-0.5"/> : null}<span>{getoond.tekst}</span></p>
        <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-semibold">
          {m.mijlpaal ? <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-accent-warm"><AppIcon functie="mijlpaal" maat="sm" vorm="kaal"/> {m.mijlpaal}</span> : null}
          {m.moment !== "geen" ? <span className="rounded-full bg-brand-soft px-2 py-0.5 text-brand">{momentLabel[m.moment]}</span> : null}
          <span className="rounded-full bg-muted px-2 py-0.5 text-ink-soft">
            {kijker ? "Gedeeld met jou" : m.prive ? "Alleen voor jou" : m.van === "kring" ? "Gedeeld met de ouders" : `Gedeeld met ${m.van === "sanne" ? parents.joris.naam : "jou"}${kringTekst}`}
          </span>
        </div>
        {m.reactie || m.reactieTekst ? (<p className="mt-3 rounded-md bg-white/70 px-3 py-2 text-xs">
            <b>{vanMij ? parents.joris.naam : "Jij"}:</b> {m.reactie ? <Pictogram waarde={m.reactie} maat="sm" vorm="kaal"/> : null} {m.reactieTekst}
          </p>) : null}
        {!vanMij && !m.reactie && !kijker ? (tekstOpen ? (<div className="mt-3 flex gap-2">
              <input value={tekst} maxLength={80} onChange={(e) => setTekst(e.target.value)} placeholder="Korte reactie" className="flex-1 rounded-xl bg-surface px-3 py-2 text-xs outline-none"/>
              <button onClick={() => { reageer(m.id, { reactie: "💬", reactieTekst: tekst || "👍" }); setTekstOpen(false); }} className="rounded-xl bg-brand px-3 text-xs font-semibold text-primary-foreground">Stuur</button>
            </div>) : (<div className="mt-3 flex flex-wrap gap-1.5">
              {reacties.map((r) => (<button key={r.e} onClick={() => reageer(m.id, { reactie: r.e, reactieTekst: r.l })} className="flex items-center gap-1 rounded-full border border-border bg-white/70 px-2.5 py-1 text-xs font-semibold">
                  <Pictogram waarde={r.e} maat="sm" vorm="kaal"/> {r.l}
                </button>))}
              <button onClick={() => setTekstOpen(true)} className="rounded-full px-2 py-1 text-xs font-semibold text-ink-soft"><AppIcon functie="berichten" maat="sm" vorm="kaal"/></button>
            </div>)) : null}
      </div>
    </div>);
}
export function DeelMomentje({ open, onSluit, kindId: startKind, alsKring }) {
    const kring = useKring();
    const kindKeuze = alsKring ? kinderen.filter((k) => { const p = kring.personen.find((x) => x.id === alsKring); return p ? mag(p, k.id, "momentjes", "bijdragen") : false; }) : kinderen;
    const [kindId, setKindId] = useState(startKind ?? kindKeuze[0]?.id ?? kinderen[0]?.id ?? "");
    const [kringIds, setKringIds] = useState([]);
    // Alleen kringleden die momentjes van dit kind mogen bekijken, komen in aanmerking.
    const kringVoorKind = kring.personen.filter((p) => mag(p, kindId, "momentjes"));
    const [foto, setFoto] = useState();
    const [tekst, setTekst] = useState("");
    const [moment, setMoment] = useState("geen");
    const [mijlpaal, setMijlpaal] = useState();
    const [prive, setPrive] = useState(false);
    if (!open)
        return null;
    const deel = () => {
        const nu = new Date();
        voegMomentjeToe({
            id: String(Date.now()), kindId, van: alsKring ? "kring" : "sanne", auteurId: alsKring, tekst: tekst.trim(), foto, moment, mijlpaal, prive: alsKring ? false : prive,
            kringIds: alsKring || prive ? [] : kringIds.filter((id) => kringVoorKind.some((p) => p.id === id)),
            datum: `${nu.getFullYear()}-${String(nu.getMonth() + 1).padStart(2, "0")}-${String(nu.getDate()).padStart(2, "0")}`,
            wanneer: `Vandaag · ${nu.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })} uur`,
        });
        setTekst("");
        setFoto(undefined);
        setMoment("geen");
        setMijlpaal(undefined);
        setPrive(false);
        setKringIds([]);
        onSluit();
    };
    const chip = (actief) => `rounded-full border px-3 py-1.5 text-xs font-semibold ${actief ? "border-brand bg-brand text-primary-foreground" : "border-border bg-white/70"}`;
    return (<div className="fixed inset-0 z-40 flex items-end justify-center bg-ink/30 px-4 pb-4" onClick={onSluit}>
      <div className="bg-background max-h-[88vh] w-full max-w-md overflow-y-auto rounded-lg border border-border p-5" onClick={(e) => e.stopPropagation()}>
        <p className="flex items-center gap-1.5 font-display text-lg font-bold">Deel een momentje <AppIcon functie="momentjes" maat="sm" vorm="kaal"/></p>
        <p className="mt-3 text-xs text-ink-soft">1. Over wie?</p>
        <div className="mt-1.5 flex gap-2">
          {kindKeuze.map((k) => (<button key={k.id} onClick={() => setKindId(k.id)} className={`flex items-center gap-2 ${chip(kindId === k.id)}`}>
              <img src={k.avatar} alt="" className="size-5 rounded-full object-cover"/>{k.naam}
            </button>))}
        </div>
        <p className="mt-4 text-xs text-ink-soft">2. Foto (mag ook zonder)</p>
        <label className="mt-1.5 block cursor-pointer overflow-hidden rounded-md border border-dashed border-brand/40 bg-white/60 text-center text-sm font-semibold text-brand">
          {foto ? <img src={foto} alt="" className="aspect-[4/3] w-full object-cover"/> : <span className="block py-5"><TekenLabel waarde="📷 Foto maken of kiezen"/></span>}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f)
        setFoto(URL.createObjectURL(f)); }}/>
        </label>
        <p className="mt-4 text-xs text-ink-soft">3. Wat wil je delen?</p>
        <textarea value={tekst} onChange={(e) => setTekst(e.target.value)} rows={2} placeholder="Bijv. Ze heeft haar zwemdiploma gehaald!" className="mt-1.5 w-full resize-none rounded-md bg-white/80 p-3 text-sm outline-none"/>
        <details className="mt-2 text-xs">
          <summary className="cursor-pointer py-1 font-semibold text-ink-soft">Meer opties (moment, mijlpaal)</summary>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {["vooraf", "tijdens", "na"].map((m) => (<button key={m} onClick={() => setMoment(moment === m ? "geen" : m)} className={chip(moment === m)}>{momentLabel[m]}</button>))}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {mijlpalen.map((m) => (<button key={m} onClick={() => setMijlpaal(mijlpaal === m ? undefined : m)} className={`flex items-center gap-1 ${chip(mijlpaal === m)}`}><AppIcon functie="mijlpaal" maat="sm" vorm="kaal"/> {m}</button>))}
          </div>
        </details>
        {alsKring ? (<p className="mt-3 text-xs text-ink-soft">Je momentje wordt gedeeld met de ouders van {kinderen.find((k) => k.id === kindId)?.naam}.</p>) : (<>
            <p className="mt-4 text-xs text-ink-soft">4. Wie mag dit zien?</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <button onClick={() => { setPrive(true); setKringIds([]); }} className={chip(prive)}>Alleen voor mij</button>
              <button onClick={() => setPrive(false)} className={chip(!prive)}>{parents.joris.naam}</button>
              {kringVoorKind.length ? (<button onClick={() => { setPrive(false); setKringIds(kringIds.length === kringVoorKind.length ? [] : kringVoorKind.map((p) => p.id)); }} className={chip(!prive && kringIds.length === kringVoorKind.length)}>
                  De kring rond {kinderen.find((k) => k.id === kindId)?.naam}
                </button>) : null}
            </div>
            {!prive && kringVoorKind.length ? (<div className="mt-2 flex flex-wrap gap-1.5">
                {kringVoorKind.map((p) => {
                    const aan = kringIds.includes(p.id);
                    return (<button key={p.id} onClick={() => setKringIds(aan ? kringIds.filter((x) => x !== p.id) : [...kringIds, p.id])} className={chip(aan)}>
                      {aan ? "✓ " : ""}{persoonLabel(p)}
                    </button>);
                })}
              </div>) : null}
          </>)}
        <button disabled={!tekst.trim() && !foto} onClick={deel} className="mt-4 w-full rounded-md bg-brand py-3 font-semibold text-primary-foreground disabled:opacity-40">
          {alsKring ? "Delen" : prive ? "Bewaren" : kringIds.length ? `Delen met ${parents.joris.naam} + ${kringIds.length}` : `Delen met ${parents.joris.naam}`}
        </button>
      </div>
    </div>);
}
