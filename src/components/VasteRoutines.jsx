import { useState } from "react";
import { X } from "lucide-react";
import { useKring } from "@/lib/kring-store";
import { useSlimmeHulp, verwijderRoutine, voegRoutineToe, routineNietNodig } from "@/lib/slimme-hulp";
const dagen = ["maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag", "zondag"];
const kindNaam = { emma: "Emma", noah: "Noah" };
/**
 * Persoonlijke routines voor 'Wat moet mee?'. De app mag een patroon voorstellen
 * (spullen die bij een terugkerende activiteit horen), maar maakt nooit zelf een routine:
 * alleen na "Ja, voortaan". Een routine is geen gezamenlijke afspraak.
 */
export function VasteRoutines() {
    const { routines, routineNietNodig: nietNodig } = useSlimmeHulp();
    const kring = useKring();
    const [open, setOpen] = useState(false);
    const [item, setItem] = useState("");
    const [dag, setDag] = useState("maandag");
    const [kind, setKind] = useState("emma");
    const heeft = (k, d, i) => routines.some((r) => r.kind === k && r.dag === d && r.item.toLowerCase().includes(i.toLowerCase()));
    const voorstellen = kring.momenten
        .filter((m) => m.soort === "afspraak")
        .flatMap((m) => m.kindIds.flatMap((k) => m.mee.map((i) => ({ sleutel: `${m.id}-${k}-${i}`, kind: k, dag: m.dag.toLowerCase(), item: i, titel: m.titel }))))
        .filter((p) => p.kind in kindNaam && !heeft(p.kind, p.dag, p.item) && !nietNodig.includes(p.sleutel))
        .slice(0, 2);
    return (<section className="mt-6">
      <h2 className="font-display text-lg font-bold">Vaste routines</h2>
      <p className="text-xs text-ink-soft">Spullen die op een vaste dag mee moeten. Alleen voor jou — geen afspraak met de andere ouder.</p>
      <ul className="mt-2 space-y-1.5">
        {routines.map((r) => (<li key={r.id} className="flex items-center gap-2 text-sm">
            <span className="min-w-0 flex-1">{r.item}<span className="block text-[11px] text-ink-soft">Elke {r.dag} · {kindNaam[r.kind]}</span></span>
            <button onClick={() => verwijderRoutine(r.id)} aria-label={`Routine ${r.item} verwijderen`} className="text-brand"><X className="size-3.5"/></button>
          </li>))}
      </ul>

      {voorstellen.map((p) => (<div key={p.sleutel} className="mt-3 rounded-md bg-muted px-3 py-2 text-sm">
          <p>De {p.item.toLowerCase()} hoort bij {kindNaam[p.kind]}s {p.titel.toLowerCase()} op {p.dag}.</p>
          <p className="text-xs text-ink-soft">Voortaan vanzelf voorstellen bij de overdracht?</p>
          <div className="mt-2 flex gap-2">
            <button onClick={() => voegRoutineToe({ dag: p.dag, kind: p.kind, item: `${p.item} ${kindNaam[p.kind]}`, reden: `Elke ${p.dag} ${p.titel.toLowerCase()}` })} className="rounded-full bg-brand px-3 py-1 text-xs font-semibold text-primary-foreground">Ja, voortaan</button>
            <button onClick={() => routineNietNodig(p.sleutel)} className="rounded-full border border-border px-3 py-1 text-xs font-semibold">Niet nodig</button>
          </div>
        </div>))}

      {open ? (<form className="mt-3 space-y-2" onSubmit={(e) => { e.preventDefault(); if (!item.trim())
            return; voegRoutineToe({ dag, kind, item: item.trim(), reden: `Elke ${dag}` }); setItem(""); setOpen(false); }}>
          <input value={item} onChange={(e) => setItem(e.target.value)} placeholder="Bijv. Gymtas" aria-label="Wat moet mee" className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm"/>
          <div className="flex gap-2">
            <select value={dag} onChange={(e) => setDag(e.target.value)} aria-label="Dag" className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-sm">{dagen.map((d) => <option key={d}>{d}</option>)}</select>
            <select value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Kind" className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-sm"><option value="emma">Emma</option><option value="noah">Noah</option></select>
          </div>
          <button className="rounded-md border border-border px-3 py-1.5 text-sm font-semibold text-brand">Routine bewaren</button>
        </form>) : (<button onClick={() => setOpen(true)} className="mt-3 text-xs font-semibold text-brand">+ Routine toevoegen</button>)}
    </section>);
}
