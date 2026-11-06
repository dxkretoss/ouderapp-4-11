import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui-kit";
import { AppIcon } from "@/components/AppIcon";
import { wieNaam } from "@/lib/kring-store";
import { hulpKandidaten, kindNaam, trekHulpIn, useHulpVerzoeken, vraagHulp } from "@/lib/taken-store";
import { useStart } from "@/lib/start-store";
import { bevestig } from "@/lib/feedback";
import { uur } from "@/lib/tijd-tekst";
const veld = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm";
const datumTekst = (d) => new Date(d).toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" });
const kindTekst = (k) => kindNaam(k).join(" & ");
/** Het formulier zelf — één keer gebouwd, hergebruikt in Taken, Agenda en de wisselflow. */
export function HulpForm({ voorstel = {}, onKlaar }) {
    const st = useStart();
    const opties = st.eigen
        ? [...st.kinderen.map((k) => ({ id: k.id, naam: k.naam })), ...(st.kinderen.length > 1 ? [{ id: "alle", naam: "Alle kinderen" }] : [])]
        : [{ id: "emma", naam: "Emma" }, { id: "noah", naam: "Noah" }, { id: "beide", naam: "Emma & Noah" }];
    const standaard = voorstel.kind ?? (st.eigen ? st.kinderen[0]?.id ?? "alle" : "emma");
    const [kind, setKind] = useState(standaard);
    const [wat, setWat] = useState(voorstel.wat ?? "");
    const [datum, setDatum] = useState(voorstel.datum ?? "");
    const [tijd, setTijd] = useState(voorstel.tijd ?? "15:00");
    const [aan, setAan] = useState([]);
    const kandidaten = hulpKandidaten(kind);
    const verstuur = () => {
        if (vraagHulp({ kind, wat: wat.trim(), datum, tijd, ontvangers: aan })) {
            bevestig("Hulpverzoek klaargezet voor de gekozen personen.");
            onKlaar?.();
        }
    };
    return (<div className="mt-2 space-y-3 rounded-md border border-border bg-card p-3">
      <label className="block text-xs font-semibold">Voor wie
        <select value={kind} onChange={(e) => { setKind(e.target.value); setAan([]); }} className={`mt-1 ${veld}`}>
          {opties.map((o) => <option key={o.id} value={o.id}>{o.naam}</option>)}
        </select>
      </label>
      <label className="block text-xs font-semibold">Welke hulp
        <input value={wat} onChange={(e) => setWat(e.target.value)} placeholder="Bijv. Emma ophalen van school" className={`mt-1 ${veld}`}/>
      </label>
      <div className="flex gap-2">
        <label className="flex-1 text-xs font-semibold">Datum<input type="date" value={datum} onChange={(e) => setDatum(e.target.value)} className={`mt-1 ${veld}`}/></label>
        <label className="w-28 text-xs font-semibold">Tijd<input type="time" value={tijd} onChange={(e) => setTijd(e.target.value)} className={`mt-1 ${veld}`}/></label>
      </div>
      <fieldset>
        <legend className="text-xs font-semibold">Aan wie</legend>
        {kandidaten.length ? kandidaten.map((p) => (<label key={p.id} className="flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" checked={aan.includes(p.id)} onChange={(e) => setAan((l) => (e.target.checked ? [...l, p.id] : l.filter((x) => x !== p.id)))} className="size-5 accent-[var(--color-brand)]"/>
            {wieNaam(p.id)} <span className="text-xs text-ink-soft">· {p.rol}</span>
          </label>)) : <p className="mt-1 text-xs text-ink-soft">Er is nog niemand met toegang tot wisselmomenten of taken voor {kindTekst(kind)}. Dat stel je in bij Belangrijke personen.</p>}
      </fieldset>
      <p className="text-[11px] text-ink-soft">Wie het eerst accepteert, krijgt de taak. De zorgregeling verandert hierdoor niet.</p>
      <div className="flex gap-2">
        <Button disabled={!wat.trim() || !datum || !aan.length} onClick={verstuur} className="min-h-11 bg-brand text-primary-foreground shadow-none">Verzoek klaarzetten</Button>
        <Button variant="ghost" onClick={() => onKlaar?.()}>Annuleren</Button>
      </div>
    </div>);
}
/** Rij die in een aanmaakscherm laat zien dat je ook iemand uit je netwerk kunt vragen. */
export function HulpKnop({ voorstel = {}, label = "Hulp vragen aan je netwerk" }) {
    const [open, setOpen] = useState(false);
    if (!open) {
        return (<button type="button" onClick={() => setOpen(true)} className="flex min-h-11 w-full items-center gap-2 rounded-md border border-border px-3 text-left text-sm font-semibold text-ink">
        <AppIcon functie="hulp" maat="sm" vorm="kaal"/>
        <span className="flex-1">{label}</span>
        <ChevronRight className="size-5 shrink-0 text-ink-soft" />
      </button>);
    }
    return (<div>
      <p className="text-xs font-semibold text-ink-soft">{label}</p>
      <HulpForm voorstel={voorstel} onKlaar={() => setOpen(false)}/>
    </div>);
}
/** Hulp vragen aan je netwerk — onderdeel van Taken; acceptatie wordt een gewone taak. */
export function HulpVragen({ open: openVanBuiten, onOpenChange }) {
    const lijst = useHulpVerzoeken();
    const [zelf, setZelf] = useState(false);
    const open = openVanBuiten ?? zelf;
    const zetOpen = (o) => { setZelf(o); onOpenChange?.(o); };
    return (<section className="mt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">Hulp vragen</h2>
        {!open ? (
          <button onClick={() => zetOpen(true)} className="min-h-11 inline-flex items-center gap-1 text-xs font-semibold text-brand">
            <span>Hulp vragen aan je netwerk</span>
            <ChevronRight className="size-3.5" />
          </button>
        ) : null}
      </div>
      {open ? <HulpForm onKlaar={() => zetOpen(false)}/> : null}
      {lijst.length ? (<div className="mt-2 divide-y divide-border rounded-md border border-border bg-card">
          {lijst.map((h) => (<div key={h.id} className="px-3 py-3">
              <p className="text-sm font-semibold">{h.wat}</p>
              <p className="text-xs text-ink-soft">{kindTekst(h.kind)} · {datumTekst(h.datum)} · {uur(h.tijd)}</p>
              <p className="mt-1 text-xs">Gevraagd aan: {h.ontvangers.map((o) => wieNaam(o)).join(", ")}</p>
              <div className="mt-1 flex items-center gap-3">
                {h.status === "open" ? <Badge toon="klaar">Wacht op reactie</Badge> : h.status === "geaccepteerd" ? <Badge toon="info">{wieNaam(h.geaccepteerdDoor)} regelt dit</Badge> : <Badge toon="klaar">Ingetrokken</Badge>}
                {h.status === "open" ? <button onClick={() => trekHulpIn(h.id)} className="min-h-11 text-xs font-semibold text-ink-soft">Intrekken</button> : null}
              </div>
            </div>))}
        </div>) : null}
      <p className="mt-2 text-[11px] text-ink-soft">In deze voorbeeldversie worden nog geen echte meldingen verstuurd. Hoe het eruitziet voor de ontvanger, zie je in Belangrijke personen → voorbeeldweergave.</p>
    </section>);
}
