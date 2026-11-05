import { useState } from "react";
import { TekenLabel } from "@/components/AppIcon";
import { voegMeldingToe } from "@/lib/gesprekken-store";
export function HulpKaart() {
    return (<div className="space-y-1 rounded-md bg-accent-warm/25 p-3 text-sm">
      <p className="font-semibold">Hulp nodig?</p>
      <p><TekenLabel waarde="🚨 Direct gevaar"/>: <a href="tel:112" className="font-semibold underline">bel 112</a></p>
      <p><TekenLabel waarde="🏠 Veilig Thuis"/>, gratis en anoniem, 24/7: <a href="tel:08002000" className="font-semibold underline">0800-2000</a></p>
      <p className="text-xs text-ink-soft">Je kunt je logboek zelf delen met een hulpverlener of advocaat als je dat wilt.</p>
    </div>);
}
export function OnveiligKnop({ gesprek, klein }) {
    const [open, setOpen] = useState(false);
    const [notitie, setNotitie] = useState("");
    const [klaar, setKlaar] = useState(false);
    const nu = new Date();
    const opslaan = () => {
        voegMeldingToe({ id: Date.now(), datum: "12 maart", tijd: nu.toTimeString().slice(0, 5), ...(gesprek ? { gesprek } : {}), notitie: notitie.trim() });
        setKlaar(true);
        setNotitie("");
    };
    if (!open)
        return (<button onClick={() => { setOpen(true); setKlaar(false); }} className={`rounded-full border border-border ${klein ? "px-4 py-2.5 text-sm" : "w-full py-3 text-sm"} font-semibold`}>
      Iets over dit gesprek vastleggen
    </button>);
    return (<div className="space-y-3 rounded-md border border-border bg-card p-4 text-left">
      {klaar ? (<>
          <p className="font-semibold">✓ Vastgelegd in je persoonlijke logboek</p>
          <p className="text-sm text-ink-soft">Alleen jij ziet dit. Joris krijgt geen melding.</p>
        </>) : (<>
          <p className="font-semibold">Wil je iets over dit gesprek voor jezelf vastleggen?</p>
          <p className="text-xs"><b>Wie kan dit zien?</b> Alleen jij. Joris, professionals en instanties krijgen hier niets van te zien of te horen.</p>
          <p className="text-xs text-ink-soft">Datum en tijd worden automatisch vastgelegd. Schrijf zo feitelijk mogelijk op wat er gezegd is. Er wordt niemand automatisch ingelicht.</p>
          <textarea value={notitie} onChange={(e) => setNotitie(e.target.value)} rows={3} placeholder="Bijv. letterlijke woorden, tijdstip, wie erbij was (optioneel)" className="w-full rounded-md border border-border bg-card p-3 text-sm"/>
          <div className="flex gap-2">
            <button onClick={opslaan} className="flex-1 rounded-full bg-brand py-2 text-sm font-semibold text-primary-foreground">Vastleggen</button>
            <button onClick={() => setOpen(false)} className="rounded-full border border-border px-4 py-2 text-sm font-semibold">Annuleren</button>
          </div>
        </>)}
      <HulpKaart />
      {klaar && <button onClick={() => setOpen(false)} className="text-sm font-semibold text-brand">Sluiten</button>}
    </div>);
}
