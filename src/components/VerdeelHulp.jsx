import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useVakanties, verdeelSuggestie, stelVerdelingVoor } from "@/lib/vakantie-store";
export function VerdeelHulp() {
    const vak = useVakanties();
    const [open, setOpen] = useState(false);
    const { telling, voorstel } = verdeelSuggestie(vak);
    if (!voorstel.length)
        return null;
    return (<div className="rounded-md border border-border bg-card px-4 py-3">
      <button onClick={() => setOpen(!open)} className="w-full text-left">
        <p className="text-sm font-semibold">Hulp bij verdelen</p>
        <p className="text-xs text-ink-soft">{voorstel.length} {voorstel.length === 1 ? "vakantie staat" : "vakanties staan"} nog open. Ik kan een om-en-om idee laten zien.</p>
      </button>
      {open ? (<div className="mt-3">
          <p className="text-xs text-ink-soft">Nu: Sanne {telling.Sanne} en Joris {telling.Joris} afgesproken vakanties. Een lange zomervakantie telt hier net zo zwaar als een kort paasweekend, dus deze telling zegt niet wat eerlijk of passend is.</p>
          <p className="mt-2 text-xs text-ink-soft">Bekijk het als een manier om samen mogelijkheden te bekijken. Wat bij jullie past, bepalen jullie zelf.</p>
          <ul className="mt-2 divide-y divide-border border-y border-border text-sm">
            {voorstel.map((v) => <li key={v.id} className="flex justify-between gap-3 py-2"><span>{v.naam} <span className="text-xs text-ink-soft">· {v.periode}</span></span><span className="font-semibold">{v.ouder}</span></li>)}
          </ul>
          <p className="mt-2 text-[11px] text-ink-soft">Deze suggestie verandert niets vanzelf: de verdeling van de week en bestaande vakantieafspraken blijven zoals ze zijn. Pas na akkoord van de andere ouder is iets afgesproken.</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button onClick={() => setOpen(false)} className="rounded-md border border-border py-2 text-sm font-semibold text-ink-soft">Niet nu</button>
            <button onClick={() => { voorstel.forEach((v) => stelVerdelingVoor(v.id, v.ouder)); setOpen(false); }} className="rounded-md bg-brand py-2 text-sm font-semibold text-primary-foreground">Als voorstel sturen</button>
          </div>
        </div>) : null}
    </div>);
}
/** Reishulp: per afgesproken vakantie snelkoppelingen naar bestaande flows (agenda, taak, kosten), vooraf ingevuld. Maakt zelf niets aan. */
export function ReisHulp() {
    const vak = useVakanties().filter((v) => v.status === "afgesproken" && v.details);
    const [open, setOpen] = useState(null);
    if (!vak.length)
        return null;
    return (<div className="rounded-md border border-border bg-card px-4 py-3">
      <p className="text-sm font-semibold">Reis voorbereiden</p>
      <p className="text-xs text-ink-soft">Kies een vakantie; ik zet vertrek, paklijst en kosten voor je klaar.</p>
      <ul className="mt-2 divide-y divide-border border-y border-border">
        {vak.map((v) => (<li key={v.id} className="py-2">
            <button onClick={() => setOpen(open === v.id ? null : v.id)} className="w-full text-left text-sm">{v.naam} <span className="text-xs text-ink-soft">· {v.periode} · {v.details}</span></button>
            {open === v.id ? (<div className="mt-2 flex flex-wrap gap-2">
                <Link to="/agenda" search={{ nieuw: true, titel: `Vertrek ${v.naam}` }} className="rounded-full border border-brand/40 px-3 py-1.5 text-xs font-semibold text-brand">Vertrek in agenda</Link>
                <Link to="/taken" search={{ taak: `Paklijst ${v.naam}` }} className="rounded-full border border-brand/40 px-3 py-1.5 text-xs font-semibold text-brand">Paklijst als taak</Link>
                <Link to="/kosten" search={{ uitgave: `Reis ${v.naam}` }} className="rounded-full border border-brand/40 px-3 py-1.5 text-xs font-semibold text-brand">Reiskosten</Link>
              </div>) : null}
          </li>))}
      </ul>
      <p className="mt-2 text-[11px] text-ink-soft">Er wordt niets vanzelf toegevoegd; je bewaart alles zelf.</p>
    </div>);
}
