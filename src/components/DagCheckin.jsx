import { useState } from "react";
import { kinderen, parents } from "@/lib/demo-data";
import { Pictogram, TekenLabel } from "@/components/AppIcon";
import { isOverdrachtsdag, markeerCheckinGetoond, setCheckinAan, useCheckin } from "@/lib/checkin-store";
const gevoel = ["😢", "😕", "😐", "🙂", "😄"];
function Keuzes({ opties, waarde, onKies }) {
    return (<div className="mt-1.5 flex flex-wrap gap-1.5">
      {opties.map((o) => (<button key={o} onClick={() => onKies(o)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${waarde === o ? "border-brand bg-brand text-primary-foreground" : "border-border bg-white/70"}`}>
          {<TekenLabel waarde={o}/>}
        </button>))}
    </div>);
}
export function DagCheckin() {
    const { aan, getoond, voorbeeld } = useCheckin();
    const [antw, setAntw] = useState({});
    const [verstuurd, setVerstuurd] = useState(false);
    if (!voorbeeld && (!aan || getoond || !isOverdrachtsdag()))
        return null;
    const zet = (id, p) => setAntw((a) => ({ ...a, [id]: { ...a[id], ...p } }));
    const sluit = () => markeerCheckinGetoond();
    return (<div className="fixed inset-0 z-40 flex items-end justify-center bg-ink/30 px-4 pb-4" onClick={sluit}>
      <div className="bg-background max-h-[88vh] w-full max-w-md overflow-y-auto rounded-lg border border-border p-5" onClick={(e) => e.stopPropagation()}>
        {verstuurd ? (<div className="py-6 text-center">
            <Pictogram waarde="💚" maat="lg" className="mx-auto"/>
            <p className="mt-2 font-display text-lg font-bold">Gedeeld met {parents.joris.naam}</p>
            <p className="mt-1 text-sm text-ink-soft">Fijn dat jullie elkaar op de hoogte houden.</p>
            <button onClick={sluit} className="mt-5 w-full rounded-md bg-brand py-3 text-sm font-semibold text-primary-foreground">
              Naar mijn overzicht
            </button>
          </div>) : (<>
            <p className="text-xs font-semibold tracking-wider text-brand uppercase">Overdrachtsdag · even kort</p>
            <p className="mt-1 font-display text-lg font-bold">Hoe gaat het vandaag met de kinderen?</p>
            <p className="mt-1 text-xs text-ink-soft">Alles is optioneel. {parents.joris.naam} ziet wat je deelt.</p>
            <div className="mt-4 space-y-3">
              {kinderen.map((k) => (<div key={k.id} className="rounded-md border border-border bg-white/60 p-3">
                  <div className="flex items-center gap-2">
                    <img src={k.avatar} alt={k.naam} className="size-8 rounded-full object-cover"/>
                    <p className="font-semibold">{k.naam}</p>
                  </div>
                  <p className="mt-3 text-xs text-ink-soft">Hoe voelt {k.naam} zich?</p>
                  <div className="mt-1.5 flex justify-between">
                    {gevoel.map((g) => (<button key={g} onClick={() => zet(k.id, { gevoel: g })} aria-label={`Gevoel ${g}`} className={`grid size-11 place-items-center rounded-full transition ${antw[k.id]?.gevoel === g ? "scale-110 bg-brand-soft ring-2 ring-brand" : "bg-white/70"}`}>
                        <Pictogram waarde={g} maat="md"/>
                      </button>))}
                  </div>
                  <p className="mt-3 text-xs text-ink-soft">Geslapen</p>
                  <Keuzes opties={["😴 Goed", "Wisselend", "Onrustig"]} waarde={antw[k.id]?.slaap} onKies={(v) => zet(k.id, { slaap: v })}/>
                  <p className="mt-3 text-xs text-ink-soft">Gegeten</p>
                  <Keuzes opties={["🍽 Goed", "Beetje", "Weinig"]} waarde={antw[k.id]?.eten} onKies={(v) => zet(k.id, { eten: v })}/>
                </div>))}
            </div>
            <button disabled={Object.keys(antw).length === 0} onClick={() => setVerstuurd(true)} className="mt-4 w-full rounded-md bg-brand py-3 text-sm font-semibold text-primary-foreground disabled:opacity-40">
              Delen met {parents.joris.naam}
            </button>
            <div className="mt-2 flex justify-between text-xs font-semibold text-ink-soft">
              <button onClick={sluit} className="py-2">Nu niet</button>
              <button onClick={() => { setCheckinAan(false); sluit(); }} className="py-2">Niet meer vragen</button>
            </div>
          </>)}
      </div>
    </div>);
}
