import { useState } from "react";
import { Eye } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { AppIcon } from "@/components/AppIcon";
import { datumKort, markeerBerichtGezien, markeerGezamenlijk, momentKort, toggleActie, useProWerk, voorOudersVan, } from "@/lib/pro-journaal-store";
const kop = "font-display text-lg font-bold";
const knop = "rounded-md border border-border px-3 py-1.5 text-xs font-semibold";
const primair = "rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-primary-foreground";
/**
 * Eén weergave van wat ouders van de professional zien.
 * Wordt gebruikt in de ouderapp (interactief, voor één ouder) én als alleen-lezen "Bekijk als ouder" voor professionals,
 * zodat beide altijd exact dezelfde gegevens tonen.
 * "Nog te doen" telt precies wat Home als "Wacht op jou" van de professional toont.
 */
export function VoorOuders({ dossier, ouder, alleenLezen = false }) {
    const s = useProWerk();
    const v = voorOudersVan(s, dossier, ouder);
    const kan = !alleenLezen && !!ouder;
    const [alles, setAlles] = useState(false);
    const o = ouder ?? "";
    const acties = v.acties.filter((a) => !a.klaar);
    const akkoordNodig = v.gezamenlijk.filter((g) => !g.akkoord[o] && !g.nietAkkoord?.[o]);
    const ongelezen = v.berichten.filter((b) => !b.gezien[o]);
    const aantal = acties.length + akkoordNodig.length + ongelezen.length;
    const gedeeld = [
        ...v.berichten.filter((b) => b.gezien[o] || !ouder).map((b) => ({ id: b.id, moment: b.moment, label: "Bericht", icoon: "post", titel: b.onderwerp, tekst: b.tekst, extra: `${b.door} · aan ${b.aan.toLowerCase()}` })),
        ...v.journaal.map((j) => ({ id: j.id, moment: j.moment, label: "Verslag", icoon: "documenten", titel: j.onderwerp, tekst: j.notitie, extra: j.type })),
        ...v.gezamenlijk.filter((g) => g.akkoord[o] || g.nietAkkoord?.[o] || !ouder).map((g) => ({ id: g.id, moment: g.moment, label: "Afspraak", icoon: "afspraak", titel: "Gezamenlijke afspraak", tekst: g.tekst, extra: `${g.ingepland ? `Ingepland: ${momentKort(g.ingepland)} · ` : ""}Akkoord: ${Object.keys(g.akkoord).join(", ") || "nog niemand"}${g.nietAkkoord && Object.keys(g.nietAkkoord).length ? ` · niet akkoord: ${Object.keys(g.nietAkkoord).join(", ")}` : ""}` })),
        ...v.veilig.map((x) => ({ id: x.id, moment: `${x.start}T00:00`, label: x.status === "actief" ? "Veiligheidsafspraak · actief" : "Veiligheidsafspraak · beëindigd", icoon: "veiligheid", titel: x.titel, tekst: x.afspraak, extra: `${x.kind} · vanaf ${datumKort(x.start)}`, veilig: x.status === "actief" })),
    ].sort((a, b) => b.moment.localeCompare(a.moment));
    const zichtbaar = alles ? gedeeld : gedeeld.slice(0, 3);
    if (!aantal && !gedeeld.length)
        return <p className="text-sm text-ink-soft">Er is nog niets met jullie gedeeld.</p>;
    return (<div className="space-y-8">
      {aantal ? (<section>
          <h2 className={kop}>Nog te doen · {aantal}</h2>
          <ul className="mt-2 divide-y divide-border border-y border-border">
            {acties.map((a) => (<li key={a.id} className="py-3">
                <p className="text-sm font-semibold">{a.tekst}</p>
                <p className="text-xs text-ink-soft">{a.deadline ? `Uiterlijk ${datumKort(a.deadline)}` : a.omschrijving}</p>
                {kan ? (<div className="mt-2 flex gap-2">
                    {/rooster|upload|document/i.test(a.tekst) ? <Link to="/documenten" className={primair}>Uploaden ›</Link> : null}
                    <button onClick={() => toggleActie(a.id, o)} className={knop}>Gedaan</button>
                  </div>) : null}
              </li>))}
            {akkoordNodig.map((g) => (<li key={g.id} className="py-3">
                <p className="text-[11px] font-semibold text-ink-soft">Jouw akkoord wordt gevraagd</p>
                <p className="text-sm font-semibold">Nieuwe afspraak ter goedkeuring</p>
                <p className="text-sm">{g.tekst}</p>
                {g.ingepland ? <p className="mt-0.5 text-xs text-ink-soft">Ingepland: {momentKort(g.ingepland)} · met jullie allebei</p> : null}
                {kan ? (<div className="mt-2 flex gap-2">
                    <button onClick={() => markeerGezamenlijk(g.id, o, "akkoord")} className={primair}>Akkoord</button>
                    <button onClick={() => markeerGezamenlijk(g.id, o, "nietAkkoord")} className={knop}>Niet akkoord</button>
                  </div>) : null}
              </li>))}
            {ongelezen.map((b) => (<li key={b.id} className="py-3">
                <p className="text-[11px] font-semibold text-ink-soft">Ter informatie · bericht van {b.door}</p>
                <p className="text-sm font-semibold">{b.onderwerp}</p>
                <p className="text-sm">{b.tekst}</p>
                {kan ? <button onClick={() => markeerBerichtGezien(b.id, o)} className={`${knop} mt-2`}>Gezien</button> : null}
              </li>))}
          </ul>
          <p className="mt-2 text-[11px] text-ink-soft">Gezien betekent niet akkoord. Geen reactie ook niet.</p>
        </section>) : null}

      {gedeeld.length ? (<section>
          <h2 className={kop}>Gedeeld met jullie</h2>
          <p className="text-xs text-ink-soft">Alleen wat bewust met jullie is gedeeld. Interne notities zie je hier nooit.</p>
          <ul className="mt-2 divide-y divide-border border-y border-border">
            {zichtbaar.map((g) => (<li key={g.id} className={`flex gap-3 py-3 ${g.veilig ? "border-l-2 border-[var(--ic-salie)] pl-2" : ""}`}>
                <AppIcon functie={g.icoon} maat="sm"/>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold text-ink-soft">{g.label} · {g.moment.endsWith("T00:00") ? datumKort(g.moment.slice(0, 10)) : momentKort(g.moment)}</p>
                  <p className="text-sm font-semibold">{g.titel}</p>
                  <p className="text-sm">{g.tekst}</p>
                  {g.extra ? <p className="mt-0.5 text-[11px] text-ink-soft">{g.extra}</p> : null}
                </div>
              </li>))}
          </ul>
          {gedeeld.length > 3 ? <button onClick={() => setAlles(!alles)} className="mt-2 text-xs font-semibold text-brand">{alles ? "Minder tonen" : "Bekijk alles ›"}</button> : null}
        </section>) : null}
    </div>);
}
export function VoorbeeldBanner({ onSluit }) {
    return (<div className="mb-5 flex items-center gap-3 rounded-md border border-brand/40 bg-brand-soft px-3 py-2.5 text-xs">
      <Eye className="size-4 shrink-0 text-brand"/>
      <span className="flex-1 font-semibold">Voorbeeldweergave — je bekijkt wat ouders kunnen zien. Je kunt hier niets namens een ouder aanpassen.</span>
      <button onClick={onSluit} className="font-semibold text-brand">Sluiten</button>
    </div>);
}
