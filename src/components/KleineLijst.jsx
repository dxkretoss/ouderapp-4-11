import { useState } from "react";
import { Card } from "@/components/AppShell";
const sessieLijsten = new Map();
export function koppelLijstBudget(sessie, id, budgetId) {
    const lijst = sessieLijsten.get(sessie);
    if (!lijst?.some((i) => i.id === id))
        return false;
    sessieLijsten.set(sessie, lijst.map((i) => i.id === id ? { ...i, budgetId } : i));
    return true;
}
export const nieuwLijstItem = (tekst, wie, kind, klaar = false) => ({ id: Date.now() + Math.random(), tekst, wie, kind, klaar });
export const toggleLijstItem = (lijst, id) => lijst.map((i) => i.id === id ? { ...i, klaar: !i.klaar } : i);
export function useLijst(start, sessie) {
    const [lijst, setLijst] = useState(() => {
        const bron = (sessie ? sessieLijsten.get(sessie) : undefined) ?? start.map((s, i) => ({ ...s, id: i }));
        if (sessie)
            sessieLijsten.set(sessie, bron);
        return bron;
    });
    const wijzig = (f) => setLijst((l) => { const nieuw = f(l); if (sessie)
        sessieLijsten.set(sessie, nieuw); return nieuw; });
    return {
        lijst,
        koppelBudget: (id, budgetId) => wijzig((l) => l.map((i) => i.id === id ? { ...i, budgetId } : i)),
        toggle: (id) => wijzig((l) => toggleLijstItem(l, id)),
        voegToe: (tekst, wie, kind, klaar = false) => {
            const item = nieuwLijstItem(tekst, wie, kind, klaar);
            wijzig((l) => [item, ...l]);
            return item.id;
        },
    };
}
export function Lijst({ data, wieOpties, labels, placeholder, }) {
    const [tekst, setTekst] = useState("");
    const [wie, setWie] = useState(wieOpties[0]);
    const [kind, setKind] = useState("Emma");
    return (<>
      <Card className="mt-4 space-y-2">
        <input value={tekst} onChange={(e) => setTekst(e.target.value)} placeholder={placeholder} className="w-full rounded-md bg-surface px-3 py-2 text-sm"/>
        <div className="flex gap-2">
          <select value={wie} onChange={(e) => setWie(e.target.value)} className="flex-1 rounded-md bg-surface px-3 py-2 text-sm">
            {wieOpties.map((w) => <option key={w}>{w}</option>)}
          </select>
          <select value={kind} onChange={(e) => setKind(e.target.value)} className="flex-1 rounded-md bg-surface px-3 py-2 text-sm">
            <option>Emma</option><option>Noah</option><option>Allebei</option>
          </select>
          <button onClick={() => { if (tekst.trim()) {
        data.voegToe(tekst.trim(), wie ?? "", kind);
        setTekst("");
    } }} className="rounded-md bg-brand px-4 text-sm font-semibold text-primary-foreground">Toevoegen</button>
        </div>
      </Card>
      <ul className="mt-3 space-y-2">
        {data.lijst.map((i) => (<li key={i.id}>
            <button onClick={() => data.toggle(i.id)} className="flex w-full items-center gap-3 rounded-md border border-border px-3 py-3 text-left text-sm">
              <span className={`grid size-6 shrink-0 place-items-center rounded-full border ${i.klaar ? "border-brand bg-brand text-surface" : "border-ink-soft/40"}`}>{i.klaar ? "✓" : ""}</span>
              <span className="flex-1">
                <span className={i.klaar ? "text-ink-soft line-through" : "font-medium"}>{i.tekst}</span>
                <span className="block text-xs text-ink-soft">{i.wie} · {i.kind}</span>
              </span>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${i.klaar ? "bg-brand-soft text-brand" : "bg-accent-warm/30 text-ink"}`}>
                {i.klaar ? labels[1] : labels[0]}
              </span>
            </button>
          </li>))}
      </ul>
    </>);
}
