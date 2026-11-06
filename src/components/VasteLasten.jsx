import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { GeldInvoer } from "@/components/GeldInvoer";
import { leesGeld } from "@/lib/geld-invoer";
import { useVasteLasten, voegLastToe } from "@/lib/vaste-lasten-store";
const euro = (n) => n.toLocaleString("nl-NL", { style: "currency", currency: "EUR" });
const veld = "rounded-md border border-border bg-background px-3 py-2 text-sm";
export function VasteLasten() {
    const { lasten } = useVasteLasten();
    const [open, setOpen] = useState(false);
    const [wat, setWat] = useState("");
    const [bedrag, setBedrag] = useState("");
    const [kind, setKind] = useState("Emma");
    const totaal = lasten.reduce((s, l) => s + l.perMaand, 0);
    const jouwDeel = lasten.reduce((s, l) => s + (l.perMaand * l.pctSanne) / 100, 0);
    const [toon, setToon] = useState(null);
    const Rij = ({ id, titel, sub }) => (<button onClick={() => setToon(toon === id ? null : id)} aria-expanded={toon === id} className="flex min-h-14 w-full items-center gap-3 py-2.5 text-left">
      <span className="min-w-0 flex-1"><span className="block font-display text-sm font-bold">{titel}</span><span className="block truncate text-xs text-ink-soft">{sub}</span></span>
      <ChevronDown className={`size-5 text-ink-soft shrink-0 transition-transform ${toon === id ? "rotate-180" : ""}`} />
    </button>);
    return (<section className="mt-6 divide-y divide-border border-y border-border">
      <div>
      <Rij id="lasten" titel="Vaste lasten" sub={`${lasten.length} vaste kosten · samen ${euro(totaal)} per maand`}/>
      {toon === "lasten" ? <div className="pb-3">
      <div className="flex justify-end">
        <button onClick={() => setOpen((o) => !o)} className="text-xs font-semibold text-brand">{open ? "Sluiten" : "+ Toevoegen"}</button>
      </div>
      {open ? (<form className="mt-2 grid gap-2" onSubmit={(e) => { e.preventDefault(); const b = leesGeld(bedrag) ?? 0; if (!wat.trim() || !(b > 0))
                return; voegLastToe({ wat: wat.trim(), kind, perMaand: b, pctSanne: 50 }); setWat(""); setBedrag(""); setOpen(false); }}>
          <input className={veld} placeholder="Wat (bijv. contributie hockey)" value={wat} onChange={(e) => setWat(e.target.value)}/>
          <div className="grid grid-cols-2 gap-2">
            <GeldInvoer label="Per maand" value={bedrag} onChange={setBedrag}/>
            <select className={veld} value={kind} onChange={(e) => setKind(e.target.value)}><option>Emma</option><option>Noah</option><option>Emma &amp; Noah</option></select>
          </div>
          <button className="rounded-md bg-brand py-2 text-sm font-semibold text-primary-foreground">Vaste last opslaan</button>
        </form>) : null}
      <ul className="mt-2 divide-y divide-border">
        {lasten.map((l) => (<li key={l.id} className="flex items-center justify-between py-2.5 text-sm">
            <div><p className="font-semibold">{l.wat}</p><p className="text-xs text-ink-soft">{l.kind} · {l.pctSanne}/{100 - l.pctSanne}</p></div>
            <span className="font-semibold">{euro(l.perMaand)}<span className="text-xs font-normal text-ink-soft"> /mnd</span></span>
          </li>))}
      </ul>
      <p className="mt-1 text-xs text-ink-soft">Samen {euro(totaal)} per maand · jouw deel {euro(jouwDeel)}</p>

      </div> : null}
      </div>
    </section>);
}
