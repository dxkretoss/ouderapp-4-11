import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Card } from "@/components/AppShell";
import { geldigEmail, stelKoppelingIn, stopKoppeling, useEmailKoppeling, wijzigAdres } from "@/lib/email-koppeling-store";
/** Solo → Communicatie: e-mail van andere ouder koppelen, wijzigen of stoppen. */
export function EmailKoppelingInstellen() {
    const { koppeling, archief } = useEmailKoppeling();
    const [email, setEmail] = useState("");
    const [naam, setNaam] = useState("");
    const [modus, setModus] = useState("rust");
    const invoer = "mt-1 w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm font-normal text-ink";
    return (<Card className="mt-3" id="email-koppeling">
      <p className="text-sm font-semibold">E-mail van andere ouder koppelen</p>
      <p className="mt-1 text-xs text-ink-soft">Gebruikt de andere ouder de app niet? Je kunt e-mails van deze ouder hier verzamelen, zodat communicatie rondom jullie kind op één plek blijft.</p>

      {!koppeling ? (<form className="mt-3 space-y-2" onSubmit={(e) => { e.preventDefault(); if (geldigEmail(email)) {
            stelKoppelingIn(email, naam);
            setEmail("");
            setNaam("");
        } }}>
          <label className="block text-xs font-semibold text-ink-soft">E-mailadres andere ouder
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ouder@example.com" className={invoer}/>
          </label>
          <label className="block text-xs font-semibold text-ink-soft">Naam (optioneel)
            <input value={naam} onChange={(e) => setNaam(e.target.value)} className={invoer}/>
          </label>
          <ul className="list-disc space-y-0.5 pl-4 text-[11px] text-ink-soft">
            <li>Alleen e-mails van en naar dit ene adres komen in de app. Werk, nieuwsbrieven, vrienden en andere mail nooit.</li>
            <li>De andere ouder krijgt geen toegang tot je agenda, kosten, documenten, momentjes of notities.</li>
            <li>Originele e-mails worden nooit aangepast.</li>
          </ul>
          <button disabled={!geldigEmail(email)} className="w-full rounded-md bg-brand py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-40">E-mailkoppeling instellen</button>
        </form>) : (<div className="mt-3 space-y-2">
          <div className="rounded-md bg-surface px-3 py-2.5">
            <p className="text-[11px] text-ink-soft">Gekoppeld e-mailadres</p>
            <p className="text-sm font-semibold">{koppeling.email}</p>
            {koppeling.naam ? <p className="text-xs text-ink-soft">{koppeling.naam}</p> : null}
          </div>
          <Link to="/berichten" className="block text-xs font-semibold text-brand">Naar de conversatie in Berichten ›</Link>
          {modus === "rust" ? (<div className="flex gap-2">
              <button onClick={() => setModus("wijzig")} className="flex-1 rounded-md border border-border py-2 text-xs font-semibold">E-mailadres wijzigen</button>
              <button onClick={() => setModus("stop")} className="flex-1 rounded-md border border-border py-2 text-xs font-semibold">Koppeling stoppen</button>
            </div>) : null}
          {modus === "wijzig" ? (<form className="space-y-2" onSubmit={(e) => { e.preventDefault(); if (geldigEmail(email)) {
                wijzigAdres(email);
                setEmail("");
                setModus("rust");
            } }}>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nieuw@example.com" className={invoer}/>
              <p className="text-[11px] text-ink-soft">Eerdere berichten blijven als archief bewaard. Vanaf nu komt alleen mail van het nieuwe adres binnen.</p>
              <div className="flex gap-2">
                <button disabled={!geldigEmail(email)} className="flex-1 rounded-md bg-brand py-2 text-xs font-semibold text-primary-foreground disabled:opacity-40">Opslaan</button>
                <button type="button" onClick={() => setModus("rust")} className="flex-1 rounded-md border border-border py-2 text-xs">Annuleren</button>
              </div>
            </form>) : null}
          {modus === "stop" ? (<div className="space-y-2 rounded-md bg-surface p-3">
              <p className="text-xs">Na het stoppen komen er geen nieuwe e-mails meer binnen en kun je niet meer vanuit de app antwoorden. Wat wil je met de opgeslagen communicatie?</p>
              <button onClick={() => { stopKoppeling(true); setModus("rust"); }} className="w-full rounded-md bg-brand py-2 text-xs font-semibold text-primary-foreground">Stoppen en berichten bewaren als archief</button>
              <button onClick={() => { stopKoppeling(false); setModus("rust"); }} className="w-full rounded-md border border-border py-2 text-xs font-semibold">Stoppen en berichten uit de app verwijderen</button>
              <p className="text-[11px] text-ink-soft">Verwijderen gebeurt alleen in de app; de e-mails in je eigen mailbox blijven staan.</p>
              <button onClick={() => setModus("rust")} className="w-full py-1 text-xs text-ink-soft">Annuleren</button>
            </div>) : null}
        </div>)}
      {archief.length ? <p className="mt-2 text-[11px] text-ink-soft">{archief.length} eerdere e-mails bewaard in het archief.</p> : null}
    </Card>);
}
