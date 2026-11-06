import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Mail, Paperclip, ChevronLeft } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { coachBericht } from "@/lib/coach.functions";
import { bewaarBijDocumenten, demoAntwoord, herkenSuggesties, useEmailKoppeling, verstuurEmail } from "@/lib/email-koppeling-store";
const stijlen = [["Rustiger", "Rustiger formuleren"], ["Korter", "Korter en feitelijker maken"], ["Meer kindgericht", "Kindgericht formuleren"]];
const doel = { wissel: "/samen-regelen", agenda: "/agenda", kosten: "/kosten" };
function tijd(ts) {
    const d = new Date(ts);
    const vandaag = new Date().toDateString() === d.toDateString();
    return `${vandaag ? "Vandaag" : d.toLocaleDateString("nl-NL", { day: "numeric", month: "short" })} ${d.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}`;
}
/** Eén conversatie binnen Berichten voor gekoppelde e-mail; geen aparte inbox. */
export function EmailGesprek({ onTerug }) {
    const { koppeling, berichten } = useEmailKoppeling();
    const coach = useServerFn(coachBericht);
    const [tekst, setTekst] = useState("");
    const [voorstel, setVoorstel] = useState(null);
    const [bezig, setBezig] = useState(false);
    const [fout, setFout] = useState(null);
    const [genegeerd, setGenegeerd] = useState([]);
    if (!koppeling)
        return null;
    const herschrijf = async (stijl) => {
        if (!tekst.trim())
            return;
        setBezig(true);
        setFout(null);
        try {
            setVoorstel((await coach({ data: { tekst, stijl } })).voorstel);
        }
        catch (e) {
            setFout(e instanceof Error ? e.message : "Er ging iets mis.");
        }
        finally {
            setBezig(false);
        }
    };
    return (<AppShell>
      <div className="flex items-center gap-3">
        <button onClick={onTerug} className="knop-kruis size-10 shrink-0 flex items-center justify-center cursor-pointer" aria-label="Terug">
          <ChevronLeft className="size-5 text-ink" strokeWidth={2.5} />
        </button>
        <div>
          <h1 className="font-display text-xl font-extrabold leading-tight">Communicatie met andere ouder</h1>
          <p className="flex items-center gap-1 text-xs text-ink-soft"><Mail className="size-3" strokeWidth={1.8}/> Via e-mail · {koppeling.naam || koppeling.email}</p>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {berichten.map((b) => {
            const mij = b.richting === "uit";
            const sug = mij ? [] : herkenSuggesties(b.tekst).filter((s) => !genegeerd.includes(b.id + s.soort));
            return (<div key={b.id} className={`flex flex-col ${mij ? "items-end" : "items-start"}`}>
              <p className="mb-1 text-[11px] text-ink-soft">{tijd(b.ts)}</p>
              <div className={`max-w-[85%] rounded-md px-4 py-2.5 text-sm ${mij ? "bg-brand text-primary-foreground" : "border border-border bg-card text-ink"}`}>
                {b.tekst}
                {b.bijlagen.length ? (<div className="mt-2 space-y-1 border-t border-current/20 pt-2">
                    <p className="flex items-center gap-1 text-[11px] opacity-80"><Paperclip className="size-3" strokeWidth={1.8}/> {b.bijlagen.length} bijlage{b.bijlagen.length > 1 ? "n" : ""}</p>
                    {b.bijlagen.map((x) => (<div key={x.id} className="flex items-center justify-between gap-2 text-xs">
                        <span className="truncate">{x.naam}</span>
                        {mij ? null : x.inDocumenten
                            ? <span className="shrink-0 text-brand">✓ Bij Documenten</span>
                            : <button onClick={() => bewaarBijDocumenten(b.id, x.id)} className="shrink-0 font-semibold text-brand">Opslaan bij Documenten</button>}
                      </div>))}
                  </div>) : null}
              </div>
              <p className="mt-1 flex items-center gap-1 text-[11px] text-ink-soft"><Mail className="size-2.5" strokeWidth={1.8}/> {mij ? "Jij" : "Andere ouder"} · via e-mail</p>
              {sug.map((s) => (<div key={s.soort} className="mt-2 w-[85%] rounded-md border border-border bg-surface p-3">
                  <p className="text-sm font-semibold">{s.titel}</p>
                  {s.detail ? <p className="mt-0.5 text-xs text-ink-soft">{s.detail}</p> : null}
                  <p className="mt-1 text-[11px] text-ink-soft">Herkend uit het originele bericht. Er verandert niets tot jij het zelf bevestigt.</p>
                  <div className="mt-2 flex gap-2">
                    <Link to={doel[s.soort]} className="rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-primary-foreground">{s.actie}</Link>
                    <button onClick={() => setGenegeerd((g) => [...g, b.id + s.soort])} className="rounded-md border border-border px-3 py-1.5 text-xs">Niet nu</button>
                  </div>
                </div>))}
            </div>);
        })}
      </div>

      <div className="mt-6 rounded-md border border-border bg-card p-3">
        {voorstel !== null ? (<div className="mb-3 rounded-md bg-brand-soft p-3 text-sm">
            <p className="text-[11px] font-semibold text-ink-soft">Voorstel — jij kiest</p>
            <p className="mt-1">{voorstel}</p>
            <div className="mt-2 flex gap-2">
              <button onClick={() => { setTekst(voorstel); setVoorstel(null); }} className="rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-primary-foreground">Gebruiken</button>
              <button onClick={() => setVoorstel(null)} className="rounded-md border border-border px-3 py-1.5 text-xs">Mijn tekst houden</button>
            </div>
          </div>) : null}
        <textarea value={tekst} onChange={(e) => setTekst(e.target.value)} rows={3} placeholder="Typ een bericht..." className="w-full resize-none rounded-md bg-surface p-3 text-sm outline-none"/>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {stijlen.map(([k, l]) => (<button key={k} disabled={!tekst.trim() || bezig} onClick={() => herschrijf(k)} className="rounded-full border border-border px-2.5 py-1 text-[11px] disabled:opacity-40">{l}</button>))}
        </div>
        {fout ? <p className="mt-2 text-xs text-accent-warm">{fout}</p> : null}
        <button disabled={!tekst.trim()} onClick={() => { verstuurEmail(tekst); setTekst(""); }} className="mt-3 w-full rounded-md bg-brand py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-40">Versturen via e-mail</button>
        <p className="mt-2 text-[11px] text-ink-soft">De andere ouder ontvangt dit als gewone e-mail en heeft geen account nodig. Hij of zij krijgt geen toegang tot de app.</p>
      </div>
      <button onClick={demoAntwoord} className="mt-3 text-[11px] text-ink-soft underline">Demo: antwoord per e-mail nabootsen</button>
    </AppShell>);
}
