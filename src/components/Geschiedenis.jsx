import { useState } from "react";
import { History } from "lucide-react";
import { eventKop, momentTekst, useAudit } from "@/lib/audit-store";
/** Klein klokje bij een item; opent een alleen-lezen tijdlijn voor dat ene item. */
export function GeschiedenisKnop({ soort, itemId, naam }) {
    const [open, setOpen] = useState(false);
    const alle = useAudit();
    const regels = alle.filter((g) => g.soort === soort && g.itemId === itemId).slice().sort((a, b) => b.moment.localeCompare(a.moment));
    return (<>
      <button onClick={(e) => { e.stopPropagation(); setOpen(true); }} aria-label="Wijzigingsgeschiedenis bekijken" title="Wijzigingsgeschiedenis bekijken" className="inline-grid size-10 shrink-0 place-items-center rounded-full text-ink-soft hover:text-ink">
        <History className="size-3.5" strokeWidth={1.6}/>
      </button>
      {open ? (<div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/30 px-4 pb-4" onClick={() => setOpen(false)}>
          <div className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-lg border border-border bg-background p-5" onClick={(e) => e.stopPropagation()}>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand">Wijzigingsgeschiedenis</p>
            <p className="mt-1 font-display text-xl">{naam}</p>
            <ol className="mt-4 border-l border-border pl-4">
              {regels.map((g) => (<li key={g.eventId} className="relative pb-4">
                  <span className="absolute -left-[21px] top-1.5 size-2 rounded-full bg-brand"/>
                  <p className="text-xs text-ink-soft">{momentTekst(g.moment)}</p>
                  <p className="text-sm">{eventKop(g)}</p>
                  {g.wijzigingen.map((x) => (<p key={x.veld} className="text-xs text-ink-soft">{x.oud} → {x.nieuw}</p>))}
                </li>))}
              {regels.length === 0 ? <li className="pb-4 text-sm text-ink-soft">Nog geen wijzigingen vastgelegd.</li> : null}
            </ol>
            <p className="text-[11px] text-ink-soft">Alleen-lezen en zichtbaar voor beide ouders. Niemand kan deze geschiedenis aanpassen of verwijderen.</p>
            <button onClick={() => setOpen(false)} className="mt-4 w-full rounded-md border border-border py-2.5 text-sm">Sluiten</button>
          </div>
        </div>) : null}
    </>);
}
