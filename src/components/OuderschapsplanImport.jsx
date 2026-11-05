import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { FileUp, Loader2 } from "lucide-react";
import { herkenAfspraken } from "@/lib/ouderschapsplan.functions";
import { voegGeimporteerdToe, zetTeControleren } from "@/lib/import-store";
// Bewaard tussen paginabezoeken, zodat Home en Documenten dezelfde open punten tonen.
const cache = { bestand: null, items: null };
export function OuderschapsplanImport({ onOpgeslagen }) {
    const herken = useServerFn(herkenAfspraken);
    const input = useRef(null);
    const [bestand, setBestand] = useState(cache.bestand);
    const [bezig, setBezig] = useState(false);
    const [fout, setFout] = useState("");
    const [items, setItems] = useState(cache.items);
    const [toon, setToon] = useState(!!cache.items);
    const [selectie, setSelectie] = useState([]);
    useEffect(() => { cache.bestand = bestand; cache.items = items; }, [bestand, items]);
    const kies = async (f) => {
        if (!f)
            return;
        if (f.size > 10 * 1024 * 1024)
            return setFout("Dit bestand is groter dan 10 MB.");
        setFout("");
        setItems(null);
        setSelectie([]);
        const buf = new Uint8Array(await f.arrayBuffer());
        let bin = "";
        for (let i = 0; i < buf.length; i += 0x8000)
            bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
        const grootte = f.size > 1024 * 1024 ? `${(f.size / 1024 / 1024).toFixed(1).replace(".", ",")} MB` : `${Math.ceil(f.size / 1024)} kB`;
        const b = { naam: f.name, type: f.type || "application/pdf", url: URL.createObjectURL(f), data: btoa(bin), grootte };
        setBestand(b);
        onOpgeslagen({ naam: f.name, grootte, url: b.url }); // origineel ongewijzigd bewaard
    };
    const start = async () => {
        if (!bestand)
            return;
        setBezig(true);
        setFout("");
        try {
            const r = await herken({ data: { naam: bestand.naam, type: bestand.type, data: bestand.data } });
            setItems(r.map((g) => ({ ...g, keuze: "open", tekst: g.voorstel })));
            setToon(false);
        }
        catch (e) {
            setFout(e instanceof Error ? e.message : "Er ging iets mis.");
        }
        finally {
            setBezig(false);
        }
    };
    useEffect(() => { zetTeControleren(items ? items.filter((x) => x.keuze === "open" || x.keuze === "aanpassen").length : 0); }, [items]);
    const zet = (i, p) => setItems((l) => l.map((x, n) => (n === i ? { ...x, ...p } : x)));
    const voegToe = (i) => {
        const g = items[i];
        const id = `imp-${Date.now()}-${i}`;
        voegGeimporteerdToe({ id, titel: g.onderdeel, tekst: g.tekst, categorie: g.categorie, bron: g.bron, document: bestand.naam });
        zet(i, { keuze: "toegevoegd" });
    };
    return (<section className="rounded-lg border border-border bg-card p-4">
      <p className="font-display text-lg">Ouderschapsplan</p>
      <p className="mt-1 text-xs text-ink-soft">Upload je plan. Het originele bestand blijft ongewijzigd bewaard.</p>
      <input ref={input} type="file" accept="application/pdf,text/plain,.pdf,.txt" className="hidden" onChange={(e) => kies(e.target.files?.[0])} aria-label="Ouderschapsplan kiezen"/>
      {!bestand ? (<button onClick={() => input.current?.click()} className="mt-3 flex w-full items-center justify-center gap-2 rounded-md border border-brand/40 py-2.5 text-sm font-semibold text-brand">
          <FileUp className="size-4"/> Ouderschapsplan toevoegen
        </button>) : (<div className="mt-3 space-y-3">
          <p className="text-sm font-semibold text-brand">Ouderschapsplan opgeslagen ✓ <span className="font-normal text-ink-soft">· {bestand.naam}</span></p>
          {!items ? (<button onClick={start} disabled={bezig} className="flex w-full items-center justify-center gap-2 rounded-md bg-brand py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
              {bezig ? <><Loader2 className="size-4 animate-spin"/> Afspraken herkennen…</> : "Belangrijke afspraken herkennen"}
            </button>) : null}
          <p className="text-[11px] text-ink-soft">Herkenning is een hulpmiddel, geen juridische uitleg. Niets komt in de app zonder jouw keuze.</p>
        </div>)}
      {fout ? <p role="alert" className="mt-3 rounded-md bg-secondary px-3 py-2 text-xs">{fout}</p> : null}

      {items ? (<div className="mt-4">
          {items.length === 0 ? <p className="text-sm text-ink-soft">We hebben geen afspraken kunnen herkennen in dit document.</p> : (<>
              <p className="text-sm font-semibold">We hebben {items.length} mogelijke {items.length === 1 ? "afspraak" : "afspraken"} gevonden:</p>
              <ul className="mt-2 space-y-1 text-sm">
                {items.map((g, i) => <li key={i} className={g.zeker ? "" : "text-accent-warm"}>{g.zeker ? "✓" : "?"} {g.onderdeel}{g.zeker ? "" : " — controle nodig"}</li>)}
              </ul>
              {!toon ? <button onClick={() => setToon(true)} className="mt-3 w-full rounded-md border border-border py-2.5 text-sm font-semibold">Bekijk gevonden afspraken</button> : (<div className="mt-4 space-y-3">
                  <p className="font-display text-lg">Dit hebben we gevonden</p>
                  {items.map((g, i) => (<div key={i} className="rounded-md border border-border p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold">{g.onderdeel}</p>
                        {!g.zeker ? <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold">Controleer dit onderdeel</span> : null}
                      </div>
                      <p className="mt-1 text-sm text-ink-soft">{g.samenvatting}</p>
                      <p className="mt-2 text-[11px] text-ink-soft">Bron: {g.bron}</p>
                      <p className="mt-2 text-xs text-ink-soft">Voorgestelde verwerking:</p>
                      {g.keuze === "aanpassen" ? (<textarea value={g.tekst} onChange={(e) => zet(i, { tekst: e.target.value })} rows={2} className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none"/>) : <p className="text-sm font-semibold">"{g.tekst}"</p>}
                      {g.keuze === "toegevoegd" ? <p className="mt-2 text-xs font-semibold text-brand">Toegevoegd aan Onze afspraken ✓</p>
                            : g.keuze === "niet" ? <p className="mt-2 text-xs text-ink-soft">Niet toegevoegd · <button className="underline" onClick={() => zet(i, { keuze: "open" })}>ongedaan maken</button></p>
                                : (<div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
                            <label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={selectie.includes(i)} disabled={!g.tekst.trim()} onChange={(e) => setSelectie((l) => e.target.checked ? [...l, i] : l.filter((n) => n !== i))}/>Meenemen in selectie</label>
                            <button onClick={() => zet(i, { keuze: "niet" })} className="rounded-md border border-border px-3 py-1.5 text-ink-soft">Niet toevoegen</button>
                            {g.keuze !== "aanpassen" ? <button onClick={() => zet(i, { keuze: "aanpassen" })} className="rounded-md border border-border px-3 py-1.5 text-ink-soft">Aanpassen</button> : null}
                          </div>)}
                    </div>))}
                  <p className="text-xs text-ink-soft">Controleer de geselecteerde tekst. Deze onderdelen komen in Onze afspraken; je verdeling van de week en agenda blijven ongewijzigd.</p>
                  <button disabled={!selectie.some((i) => items[i] && (items[i].keuze === "open" || items[i].keuze === "aanpassen") && items[i].tekst.trim())} onClick={() => { selectie.forEach((i) => { const g = items[i]; if (g && (g.keuze === "open" || g.keuze === "aanpassen") && g.tekst.trim())
                    voegToe(i); }); setSelectie([]); }} className="w-full rounded-md bg-brand px-3 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-40">Selectie toevoegen</button>
                  <Link to="/afspraken" className="block text-center text-xs font-semibold text-brand">Naar Onze afspraken ›</Link>
                </div>)}
            </>)}
        </div>) : null}
    </section>);
}
