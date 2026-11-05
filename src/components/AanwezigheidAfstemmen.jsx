import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useServerFn } from "@tanstack/react-start";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { AppIcon } from "@/components/AppIcon";
import { afsprakenState } from "@/lib/afspraken-store";
import { aanwezigVoor, deelNabespreking, keuzeLabel, markeerContactOpgenomen, reageer, reactiesVoor, startAfstemming, statusRegel, useAanwezigheid, zetUitkomst } from "@/lib/aanwezigheid-store";
import { contactStatusLabel, useTaken, voegTaakToe } from "@/lib/taken-store";
import { schoolBericht } from "@/lib/schoolbericht.functions";
/** Zijn er betrouwbaar vastgelegde veiligheidsafspraken? Dan presenteren we samen gaan niet als vanzelfsprekend. */
export const heeftVeiligheidsafspraken = () => afsprakenState().some((a) => a.veiligheid && a.status === "Actief");
const chip = (actief) => `rounded-full border px-3.5 py-2 text-xs font-semibold ${actief ? "border-brand bg-brand-soft text-brand" : "border-border bg-card text-ink"}`;
/** Compacte keuze: hoe willen jullie deze afspraak regelen? Alle keuzes zijn gelijkwaardig. */
export function AanwezigheidKiezer({ open, onSluit, onKies }) {
    const { t } = useTranslation();
    const [keuze, setKeuze] = useState(null);
    const [wieGaat, setWieGaat] = useState(null);
    const [contactWie, setContactWie] = useState(null);
    const veilig = heeftVeiligheidsafspraken();
    const klaar = keuze === "samen" || keuze === "later" || (keuze === "een" && wieGaat) || (keuze === "afzonderlijk" && contactWie);
    const bevestig = () => {
        if (!keuze || !klaar)
            return;
        onKies(keuze, { ...(wieGaat ? { wieGaat } : {}), ...(contactWie ? { contactWie } : {}) });
        setKeuze(null);
        setWieGaat(null);
        setContactWie(null);
    };
    return (<Sheet open={open} onOpenChange={(o) => { if (!o) {
        setKeuze(null);
        setWieGaat(null);
        setContactWie(null);
        onSluit();
    } }}>
      <SheetContent side="bottom" className="inset-x-0 mx-auto w-full max-w-md max-h-[85vh] overflow-y-auto rounded-t-2xl bg-background px-5 pb-8">
        <SheetHeader className="text-left">
          <SheetTitle className="font-display text-xl font-medium">{t("attendanceModal.howToArrange", "Hoe willen jullie deze afspraak regelen?")}</SheetTitle>
          <SheetDescription className="text-xs text-ink-soft">{t("attendanceModal.practicalNotice", "Maak samen een praktische afspraak over wie erbij is. Dit gaat niet over wie ergens naartoe mag.")}</SheetDescription>
        </SheetHeader>
        {veilig ? <p className="mt-3 rounded-md bg-muted p-2.5 text-xs text-ink-soft">Er zijn afspraken over veilig contact. Kies wat daarbij past.</p> : null}
        <div className="mt-4 flex flex-wrap gap-2">
          {Object.keys(keuzeLabel).map((k) => (<button key={k} onClick={() => setKeuze(k)} className={chip(keuze === k)}>{keuzeLabel[k]}</button>))}
        </div>
        {keuze === "samen" ? <p className="mt-3 text-sm text-ink-soft">{t("attendanceModal.togetherDesc", "Je stelt voor om samen naar deze afspraak te gaan. De andere ouder ontvangt een rustig voorstel.")}</p> : null}
        {keuze === "een" ? (<div className="mt-4">
            <p className="text-sm font-semibold">{t("attendanceModal.oneOfUsDesc", "Wie zou naar deze afspraak kunnen gaan?")}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button onClick={() => setWieGaat("sanne")} className={chip(wieGaat === "sanne")}>{t("attendanceModal.iCanGo", "Ik kan gaan")}</button>
              <button onClick={() => setWieGaat("joris")} className={chip(wieGaat === "joris")}>{t("attendanceModal.proposeOtherGoes", "Ik wil voorstellen dat de andere ouder gaat")}</button>
              <button onClick={() => setWieGaat("onbekend")} className={chip(wieGaat === "onbekend")}>{t("attendanceModal.notKnownYet", "Nog niet bekend")}</button>
            </div>
            <p className="mt-2 text-xs text-ink-soft">Dit is een praktische verdeling. De andere ouder is daarmee niet uitgesloten van aanwezigheid.</p>
          </div>) : null}
        {keuze === "afzonderlijk" ? (<div className="mt-4">
            <p className="text-sm font-semibold">{t("attendanceModal.preferSeparate", "Liever afzonderlijk deelnemen?")}</p>
            <p className="mt-1 text-xs text-ink-soft">Jullie kunnen vragen of een afzonderlijk gesprek mogelijk is. School of de betrokken organisatie bepaalt wat er kan.</p>
            <p className="mt-3 text-sm font-semibold">{t("attendanceModal.whoContacts", "Wie neemt hierover contact op?")}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button onClick={() => setContactWie("sanne")} className={chip(contactWie === "sanne")}>{t("attendanceModal.iWillContact", "Ik neem contact op")}</button>
              <button onClick={() => setContactWie("joris")} className={chip(contactWie === "joris")}>{t("attendanceModal.askOtherToContact", "Ik vraag de andere ouder om contact op te nemen")}</button>
              <button onClick={() => setContactWie("nog")} className={chip(contactWie === "nog")}>{t("attendanceModal.coordinateLater", "Nog afstemmen")}</button>
            </div>
          </div>) : null}
        {keuze === "later" ? <p className="mt-3 text-sm text-ink-soft">De afspraak staat gewoon in de agenda. Jullie stemmen de aanwezigheid later af.</p> : null}
        <Button disabled={!klaar} onClick={bevestig} className="mt-5 min-h-11 w-full bg-brand text-primary-foreground shadow-none">
          {keuze === "later" ? t("common.save", "Bewaren") : t("attendanceModal.sendProposal", "Voorstel versturen")}
        </Button>
      </SheetContent>
    </Sheet>);
}
const verzoekOpties = [
    ["afzonderlijk", "Afzonderlijk deelnemen aanvragen"],
    ["verzetten", "Afspraak verzetten"],
    ["telefonisch", "Telefonisch deelnemen navragen"],
    ["zelfde-informatie", "Dezelfde informatie voor beide ouders"],
    ["tweede-tijdstip", "Een tweede tijdstip aanvragen"],
    ["bevestigen", "Afspraak bevestigen"],
    ["anders", "Een andere praktische vraag"],
];
/** Blok in het afspraakdetail: één statusregel, reacties, contacttaak, berichthulp en nabespreking. */
export function AanwezigheidBlok({ afspraakId, titel, kind, datum }) {
    useAanwezigheid();
    const { taken } = useTaken();
    const vraagBericht = useServerFn(schoolBericht);
    const a = aanwezigVoor(afspraakId);
    const taak = a?.contactTaakId ? taken.find((t) => t.id === a.contactTaakId) : undefined;
    const [kiezerOpen, setKiezerOpen] = useState(false);
    const [uitkomstVraag, setUitkomstVraag] = useState(false);
    const [uitkomstToelichting, setUitkomstToelichting] = useState("");
    const [regelenVraag, setRegelenVraag] = useState(null);
    const [taakTekst, setTaakTekst] = useState("");
    const [taakWie, setTaakWie] = useState("sanne");
    const [berichtOpen, setBerichtOpen] = useState(false);
    const [verzoek, setVerzoek] = useState("afzonderlijk");
    const [concept, setConcept] = useState(null);
    const [berichtBezig, setBerichtBezig] = useState(false);
    const [berichtFout, setBerichtFout] = useState(null);
    const [gekopieerd, setGekopieerd] = useState(false);
    const [nabesprekingOpen, setNabesprekingOpen] = useState(false);
    const [besproken, setBesproken] = useState("");
    const [gemaakteAfspraken, setGemaakteAfspraken] = useState("");
    const voorbij = datum < new Date().toISOString().slice(0, 10);
    const taakKind = /allebei|&|kinderen/i.test(kind) ? "beide" : kind.toLowerCase();
    const kies = (keuze, opties) => {
        startAfstemming(afspraakId, keuze, "sanne", { ...opties, kind: taakKind, afspraakTitel: titel });
        setKiezerOpen(false);
    };
    const maakBericht = async () => {
        setBerichtBezig(true);
        setBerichtFout(null);
        setConcept(null);
        try {
            setConcept((await vraagBericht({ data: { afspraak: titel, kind, verzoek } })).concept);
        }
        catch (e) {
            setBerichtFout(e instanceof Error ? e.message : "Er ging iets mis.");
        }
        finally {
            setBerichtBezig(false);
        }
    };
    const kopieer = async () => {
        if (!concept)
            return;
        try {
            await navigator.clipboard.writeText(concept);
            setGekopieerd(true);
            setTimeout(() => setGekopieerd(false), 2000);
        }
        catch { /* selecteren kan handmatig */ }
    };
    return (<div className="mt-4 rounded-md border border-border bg-card p-3.5">
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink-soft"><AppIcon functie="agenda" maat="sm" vorm="kaal"/>Aanwezigheid</p>
      <p className="mt-1.5 text-sm font-semibold">{statusRegel(a, taak?.contactStatus) ?? "Aanwezigheid nog afstemmen"}</p>

      {/* Huidig voorstel van de andere ouder: rustig reageren, zonder verplichte uitleg. */}
      {a?.fase === "voorstel" && a.door !== "sanne" ? (<div className="mt-3">
          <p className="text-sm text-ink-soft">De andere ouder stelt voor: {keuzeLabel[a.keuze].toLowerCase()}{a.keuze === "een" && a.wieGaat && a.wieGaat !== "onbekend" ? (a.wieGaat === "joris" ? " · de andere ouder gaat" : " · jij zou gaan") : ""}.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {reactiesVoor(a).map((r) => (<button key={r.id} onClick={() => r.id === "ander" ? setKiezerOpen(true) : reageer(afspraakId, r.id, "sanne")} className={r.id === "akkoord" || r.id === "dat-lukt" ? "rounded-md bg-brand px-3.5 py-2 text-xs font-semibold text-primary-foreground" : "rounded-md border border-border px-3.5 py-2 text-xs font-semibold"}>{r.label}</button>))}
          </div>
          <p className="mt-2 text-[11px] text-ink-soft">Je hoeft niet uit te leggen waarom iets niet past. Geen reactie is geen akkoord.</p>
        </div>) : null}
      {a?.fase === "voorstel" && a.door === "sanne" ? (<div className="mt-2">
          <p className="text-xs text-ink-soft">Wacht op antwoord. Geen reactie betekent geen akkoord; de afspraak blijft gewoon in de agenda staan.</p>
          {import.meta.env.DEV ? (<div className="mt-2 flex flex-wrap gap-2">
              {reactiesVoor(a).map((r) => (<button key={r.id} onClick={() => r.id === "ander" ? startAfstemming(afspraakId, a.keuze === "samen" ? "een" : "samen", "joris", { kind: taakKind, afspraakTitel: titel, wieGaat: "joris" }) : reageer(afspraakId, r.id, "joris")} className="rounded-full border border-dashed border-border px-3 py-1 text-[11px] text-ink-soft">Demo: andere ouder — {r.label}</button>))}
            </div>) : null}
        </div>) : null}
      {(!a || a.fase === "open") ? (<button onClick={() => setKiezerOpen(true)} className="mt-3 rounded-md border border-brand/40 px-3.5 py-2 text-xs font-semibold text-brand">{a ? "Kies een mogelijkheid" : "Aanwezigheid afstemmen"}</button>) : null}
      {a?.fase === "afgestemd" ? <button onClick={() => setKiezerOpen(true)} className="mt-2 text-[11px] font-semibold text-ink-soft underline-offset-2 hover:underline">Opnieuw afstemmen</button> : null}

      {/* Contacttaak met school/organisatie: dezelfde taak als in het takenoverzicht. */}
      {taak ? (<div className="mt-3 border-t border-border pt-3">
          <p className="text-xs text-ink-soft">Taak: {taak.tekst}</p>
          <p className="mt-0.5 text-xs font-semibold">{taak.overdragenAan ? "Wacht op bevestiging van de andere ouder" : contactStatusLabel[taak.contactStatus ?? "nog-te-regelen"]}{taak.wie === "sanne" ? " · jij regelt dit" : taak.wie ? " · de andere ouder regelt dit" : ""}</p>
          {taak.wie === "sanne" && !taak.overdragenAan && (taak.contactStatus === "nog-te-regelen" || taak.contactStatus === "contact-opgenomen" || taak.contactStatus === "wacht-op-reactie" || taak.contactStatus === "afgerond") && !uitkomstVraag && a?.uitkomst !== "mogelijk" && a?.uitkomst !== "niet-mogelijk" ? (<Button variant="outline" onClick={() => { if (taak.contactStatus === "nog-te-regelen")
                markeerContactOpgenomen(afspraakId); setUitkomstVraag(true); }} className="mt-2 h-auto min-h-11 whitespace-normal text-xs">{taak.contactStatus === "nog-te-regelen" ? "Ik heb contact opgenomen" : "Uitkomst vastleggen"}</Button>) : null}
          {uitkomstVraag ? (<div className="mt-2 space-y-2">
              <p className="text-sm font-semibold">Wat is de uitkomst?</p>
              <div className="flex flex-wrap gap-2">
                {[["mogelijk", "Afzonderlijke gesprekken zijn mogelijk"], ["wacht-op-school", "School komt hierop terug"], ["niet-mogelijk", "Afzonderlijk is niet mogelijk"], ["anders", "Anders"]].map(([id, label]) => (<button key={id} onClick={() => { zetUitkomst(afspraakId, id, uitkomstToelichting); setUitkomstVraag(false); setUitkomstToelichting(""); }} className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold">{label}</button>))}
              </div>
              <input value={uitkomstToelichting} onChange={(e) => setUitkomstToelichting(e.target.value)} placeholder="Korte toelichting (optioneel)" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none"/>
            </div>) : null}
          {a?.uitkomst === "mogelijk" ? <p className="mt-2 text-xs text-ink-soft">Zijn de afzonderlijke data en tijden al bekend? Leg ze vast via de bestaande agenda.</p> : null}
          {a?.uitkomst === "niet-mogelijk" ? (<div className="mt-2 rounded-md bg-muted p-2.5 text-xs">
              <p className="font-semibold">Afzonderlijke gesprekken zijn niet mogelijk.</p>
              <p className="mt-1 text-ink-soft">Jullie kunnen bekijken welke andere vorm passend is: één ouder gaat, samen gaan als jullie dat allebei willen, een andere mogelijkheid met school bespreken, of later afstemmen.</p>
              <button onClick={() => setKiezerOpen(true)} className="mt-2 rounded-md border border-border bg-card px-3 py-1.5 font-semibold">Andere mogelijkheid kiezen</button>
            </div>) : null}
          {a?.uitkomstToelichting ? <p className="mt-1 text-[11px] text-ink-soft">{a.uitkomstToelichting}</p> : null}
        </div>) : null}

      {/* Moet er nog iets geregeld worden? Alleen een taak als er echt iets te regelen is. */}
      {regelenVraag === null && !uitkomstVraag ? (<div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <p className="w-full text-xs text-ink-soft">Moet er nog iets geregeld worden?</p>
          <button onClick={() => setRegelenVraag("ja")} className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold">Ja</button>
          <button onClick={() => setBerichtOpen((o) => !o)} className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-brand">Help met een bericht</button>
        </div>) : null}
      {regelenVraag === "ja" ? (<div className="mt-3 space-y-2 border-t border-border pt-3">
          <input value={taakTekst} onChange={(e) => setTaakTekst(e.target.value)} placeholder="Wat moet er gebeuren? Bijv. afspraak verzetten" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none"/>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setTaakWie("sanne")} className={chip(taakWie === "sanne")}>Ik regel dit</button>
            <button onClick={() => setTaakWie("joris")} className={chip(taakWie === "joris")}>De andere ouder vragen</button>
          </div>
          {taakWie === "joris" ? <p className="text-[11px] text-ink-soft">De taak is pas van de andere ouder als die dit bevestigt.</p> : null}
          <div className="flex gap-2">
            <Button size="sm" disabled={!taakTekst.trim()} onClick={() => { voegTaakToe({ tekst: taakTekst.trim(), kind: taakKind, wie: taakWie === "sanne" ? "sanne" : "", herhaling: "eenmalig", afspraakId, ...(taakWie === "joris" ? { overdragenAan: "joris" } : {}) }); setTaakTekst(""); setRegelenVraag(null); }}>Taak toevoegen</Button>
            <Button size="sm" variant="outline" onClick={() => setRegelenVraag(null)}>Nee, niets regelen</Button>
          </div>
        </div>) : null}

      {/* Hulp bij een neutraal bericht aan school of de organisatie; de ouder controleert en verstuurt zelf. */}
      {berichtOpen ? (<div className="mt-3 space-y-2 border-t border-border pt-3">
          <p className="text-sm font-semibold">Help met een bericht</p>
          <select aria-label="Soort verzoek" value={verzoek} onChange={(e) => setVerzoek(e.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
            {verzoekOpties.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
          <Button size="sm" disabled={berichtBezig} onClick={maakBericht}>{berichtBezig ? "Even schrijven…" : "Maak een concept"}</Button>
          {berichtFout ? <p className="text-xs text-ink-soft">{berichtFout} <button onClick={maakBericht} className="font-semibold text-brand">Opnieuw proberen</button></p> : null}
          {concept ? (<>
              <textarea aria-label="Conceptbericht" value={concept} onChange={(e) => setConcept(e.target.value)} rows={5} className="w-full resize-none rounded-md border border-border bg-background p-2.5 text-sm outline-none"/>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={kopieer}>{gekopieerd ? "Gekopieerd" : "Kopieer bericht"}</Button>
                <p className="text-[11px] text-ink-soft">Controleer het bericht en verstuur het zelf via je eigen kanaal.</p>
              </div>
            </>) : null}
        </div>) : null}

      {/* Na afloop: belangrijkste punten delen, zichtbaar wie het toevoegde. */}
      {voorbij ? (<div className="mt-3 border-t border-border pt-3">
          {a?.nabespreking ? (<div className="text-xs">
              <p className="font-semibold">Belangrijkste punten</p>
              {a.nabespreking.besproken ? <p className="mt-1 text-ink-soft">Besproken: {a.nabespreking.besproken}</p> : null}
              {a.nabespreking.afspraken ? <p className="mt-1 text-ink-soft">Afspraken: {a.nabespreking.afspraken}</p> : null}
              <p className="mt-1 text-[11px] text-ink-soft">Toegevoegd door {a.nabespreking.door === "sanne" ? "jou" : "de andere ouder"} op {a.nabespreking.datum} · nog niet bevestigd door de andere ouder.</p>
            </div>) : nabesprekingOpen ? (<div className="space-y-2">
              <label className="block text-xs font-semibold">Wat is besproken?<textarea value={besproken} onChange={(e) => setBesproken(e.target.value)} rows={2} className="mt-1 w-full resize-none rounded-md border border-border bg-background p-2 text-sm outline-none"/></label>
              <label className="block text-xs font-semibold">Zijn er afspraken gemaakt?<textarea value={gemaakteAfspraken} onChange={(e) => setGemaakteAfspraken(e.target.value)} rows={2} className="mt-1 w-full resize-none rounded-md border border-border bg-background p-2 text-sm outline-none"/></label>
              <div className="flex gap-2">
                <Button size="sm" disabled={!besproken.trim() && !gemaakteAfspraken.trim()} onClick={() => { deelNabespreking(afspraakId, besproken, gemaakteAfspraken, "sanne"); setNabesprekingOpen(false); }}>Delen</Button>
                <Button size="sm" variant="outline" onClick={() => setNabesprekingOpen(false)}>Annuleren</Button>
              </div>
            </div>) : (<button onClick={() => setNabesprekingOpen(true)} className="rounded-md border border-border px-3.5 py-2 text-xs font-semibold">Wil je de belangrijkste punten delen?</button>)}
        </div>) : null}

      <AanwezigheidKiezer open={kiezerOpen} onSluit={() => setKiezerOpen(false)} onKies={kies}/>
    </div>);
}
/** Compacte uitklapper in het formulier 'Nieuwe afspraak'; alleen bij een gedeelde afspraak voor een kind. */
export function AanwezigheidFormulier({ keuze, wieGaat, contactWie, onKeuze, onWieGaat, onContactWie }) {
    const [open, setOpen] = useState(false);
    return (<div className="rounded-md border border-border bg-card/60 p-3">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center justify-between text-left">
        <span>
          <span className="block text-xs font-semibold text-ink-soft">Aanwezigheid afstemmen (optioneel)</span>
          <span className="block text-[11px] text-ink-soft">{keuze ? keuzeLabel[keuze] : "Maak samen een praktische afspraak over wie erbij is."}</span>
        </span>
        <span className="text-ink-soft">{open ? "−" : "+"}</span>
      </button>
      {open ? (<div className="mt-3 space-y-3">
          <div className="flex flex-wrap gap-2">
            {Object.keys(keuzeLabel).map((k) => (<button key={k} type="button" onClick={() => onKeuze(keuze === k ? null : k)} className={chip(keuze === k)}>{keuzeLabel[k]}</button>))}
          </div>
          {keuze === "een" ? (<div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => onWieGaat("sanne")} className={chip(wieGaat === "sanne")}>Ik kan gaan</button>
              <button type="button" onClick={() => onWieGaat("joris")} className={chip(wieGaat === "joris")}>De andere ouder</button>
              <button type="button" onClick={() => onWieGaat("onbekend")} className={chip(wieGaat === "onbekend")}>Nog niet bekend</button>
            </div>) : null}
          {keuze === "afzonderlijk" ? (<div>
              <p className="text-[11px] text-ink-soft">School of de organisatie bepaalt of afzonderlijk deelnemen mogelijk is.</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" onClick={() => onContactWie("sanne")} className={chip(contactWie === "sanne")}>Ik neem contact op</button>
                <button type="button" onClick={() => onContactWie("joris")} className={chip(contactWie === "joris")}>De andere ouder vragen</button>
                <button type="button" onClick={() => onContactWie("nog")} className={chip(contactWie === "nog")}>Nog afstemmen</button>
              </div>
            </div>) : null}
          <p className="text-[11px] text-ink-soft">Je kunt de afspraak ook opslaan zonder dit af te stemmen.</p>
        </div>) : null}
    </div>);
}
