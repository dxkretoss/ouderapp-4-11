import { useRef, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useServerFn } from "@tanstack/react-start";
import { Mic, Search, Square, Loader2 } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { vraagAssistent, zetSpraakOm } from "@/lib/assistent.functions";
import { afspraken, documenten, kinderen } from "@/lib/demo-data";
import { afsprakenState } from "@/lib/afspraken-store";
import { vakantieLijst } from "@/lib/vakantie-store";
import { kringState, regelStatus } from "@/lib/kring-store";
import { takenState } from "@/lib/taken-store";
import { useRegio, vakantiesVoor, regioLabel } from "@/lib/schoolvakanties";
const voorbeelden = ["Wanneer is het volgende wisselmoment?", "Wanneer begint de herfstvakantie?", "Ik wil vrijdag ruilen.", "Voeg zwemles iedere woensdag toe.", "Waar staat het ouderschapsplan?", "Wie haalt Emma vrijdag op?"];
/** Bouwt de context alleen uit gegevens die de ingelogde ouder in de app zelf ook ziet (geen notities van professionals of privénotities). */
function bouwContext(regio, pagina) {
    const k = kringState();
    return [
        pagina ? `De ouder stelt de vraag vanaf de pagina "${pagina}"; gebruik dat als context bij onduidelijke vragen.` : "",
        "Vandaag: donderdag 12 maart 2026. Ingelogde ouder: Sanne (de andere ouder heet in de app 'de andere ouder').",
        `Kinderen: ${kinderen.map((c) => `${c.naam} (id ${c.id})`).join(", ")}.`,
        "Agenda:", ...afspraken.map((a) => `- ${a.titel} · ${a.datumLabel} · ${a.tijd} · ${a.kind} · ${a.locatie}${a.categorie === "wissel" ? " (wisselmoment)" : ""}`),
        "Halen/brengen:", ...k.momenten.map((m) => `- ${m.titel} ${m.dag} ${m.tijd} (${m.plek}) voor ${m.kindIds.join(" & ")}: ${regelStatus(m.id)?.tekst ?? "nog niemand gekoppeld"}`),
        `Schoolvakanties (${regioLabel[regio]}):`, ...vakantiesVoor(regio).map((v) => `- ${v.naam}: ${v.van} t/m ${v.tot}`),
        "Vakantieverdeling:", ...vakantieLijst().map((v) => `- ${v.naam} (${v.periode}): ${v.ouder} · ${v.status}`),
        "Documenten (Menu → Documenten):", ...documenten.map((d) => `- ${d.naam} · ${d.categorie} · ${d.kind}`),
    ].join("\n");
}
const tipKeyMap = {
  "Wanneer is het volgende wisselmoment?": "nextHandover",
  "Wanneer begint de herfstvakantie?": "autumnHoliday",
  "Ik wil vrijdag ruilen.": "swapFriday",
  "Voeg zwemles iedere woensdag toe.": "addSwimming",
  "Waar staat het ouderschapsplan?": "wherePlan",
  "Wie haalt Emma vrijdag op?": "whoPicksUp",
  "Wat staat er deze week?": "thisWeek",
  "Hoeveel moet ik nog betalen?": "howMuchPay",
  "Zet de schoolreis bij kosten.": "schoolTripCost",
  "Ik wil een bericht sturen over de ouderavond.": "messageParentEvening",
  "Wie heeft Kerst?": "whoHasChristmas"
};

const getTipLabel = (tip, t) => {
  const k = tipKeyMap[tip];
  return k ? t(`assistant.tips.${k}`, tip) : tip;
};

const getKnopLabel = (actie, t) => {
  const map = {
    wissel_ruil: t("assistant.actions.swap", "Ruil openen"),
    extra_nacht: t("assistant.actions.extraNight", "Voorstel openen"),
    tijd_wisselmoment: t("assistant.actions.sendProposal", "Voorstel versturen"),
    afspraak_toevoegen: t("assistant.actions.openAppointment", "Afspraak openen"),
    afspraak_wijzigen: t("assistant.actions.openCalendar", "Agenda openen"),
    afspraak_maken: t("assistant.actions.openProposal", "Voorstel openen"),
    document_zoeken: t("assistant.actions.toDocuments", "Naar documenten"),
    kring_toevoegen: t("assistant.actions.addPerson", "Persoon toevoegen"),
    ziek: t("assistant.actions.sickReport", "Ziekmelding openen"),
    vakantie: t("assistant.actions.toHolidays", "Naar vakanties"),
    taak_toevoegen: t("assistant.actions.openTask", "Taak openen"),
    momentje: t("assistant.actions.openMoment", "Momentje openen"),
    kosten: t("assistant.actions.openExpenses", "Kosten openen"),
    bericht: t("assistant.actions.openMessages", "Berichten openen"),
  };
  return map[actie] ?? t("common.open", "Openen");
};

const perPagina = {
    Agenda: ["Wat staat er deze week?", "Voeg zwemles iedere woensdag toe."],
    Kosten: ["Hoeveel moet ik nog betalen?", "Zet de schoolreis bij kosten."],
    Berichten: ["Ik wil een bericht sturen over de ouderavond."],
    "Vakanties & bijzondere dagen": ["Wanneer begint de herfstvakantie?", "Wie heeft Kerst?"],
    Documenten: ["Waar staat het ouderschapsplan?"],
    "Verdeling van de week": ["Ik wil vrijdag ruilen.", "Wanneer is het volgende wisselmoment?"],
};
export function Assistent({ pagina } = {}) {
    const { t } = useTranslation();
    const tips = (pagina && perPagina[pagina]) || voorbeelden;
    const router = useRouter();
    const regio = useRegio();
    const vraagFn = useServerFn(vraagAssistent);
    const spraakFn = useServerFn(zetSpraakOm);
    const [open, setOpen] = useState(false);
    const [vraag, setVraag] = useState("");
    const [bezig, setBezig] = useState("");
    const [fout, setFout] = useState("");
    const [uitSpraak, setUitSpraak] = useState(false);
    const [antwoord, setAntwoord] = useState(null);
    const rec = useRef(null);
    const invoer = useRef(null);
    const stel = async (v = vraag) => {
        if (!v.trim())
            return;
        setBezig("denken");
        setFout("");
        setAntwoord(null);
        try {
            setAntwoord(await vraagFn({ data: { vraag: v.trim(), context: bouwContext(regio, pagina) } }));
        }
        catch (e) {
            setFout(e instanceof Error ? e.message : "Er ging iets mis.");
        }
        finally {
            setBezig("");
        }
    };
    const startOpname = async () => {
        setFout("");
        setAntwoord(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const r = new MediaRecorder(stream);
            const delen = [];
            r.ondataavailable = (e) => e.data.size && delen.push(e.data);
            r.onstop = async () => {
                stream.getTracks().forEach((t) => t.stop());
                setBezig("omzetten");
                try {
                    const type = (r.mimeType || "audio/webm").replace(/^video\//, "audio/");
                    const buf = new Uint8Array(await new Blob(delen, { type }).arrayBuffer());
                    let bin = "";
                    buf.forEach((b) => (bin += String.fromCharCode(b)));
                    const { tekst } = await spraakFn({ data: { audio: btoa(bin), type } });
                    if (!tekst)
                        setFout("Ik heb niets verstaan. Probeer het nog eens of typ je vraag.");
                    // Herkende tekst direct zichtbaar en bewerkbaar in het tekstveld; nooit automatisch verwerken.
                    setVraag(tekst);
                    setUitSpraak(!!tekst);
                    setTimeout(() => invoer.current?.focus(), 0);
                }
                catch (e) {
                    setFout(e instanceof Error ? e.message : "Spraak omzetten lukte niet.");
                }
                finally {
                    setBezig("");
                }
            };
            rec.current = r;
            r.start();
            setBezig("opnemen");
        }
        catch {
            setFout("De microfoon is niet beschikbaar. Je kunt je vraag ook typen.");
        }
    };
    const openFlow = (a) => {
        setOpen(false);
        const kind = a.kind || undefined;
        switch (a.actie) {
            case "wissel_ruil": return router.navigate({ to: "/zorgregeling", search: { actie: "wijziging", bron: "assistent" } });
            case "extra_nacht": return router.navigate({ to: "/zorgregeling", search: { actie: "wijziging", bron: "assistent" } });
            case "tijd_wisselmoment": return router.navigate({ to: "/veranderd", search: { situatie: "halen", ...(kind ? { kind } : {}) } });
            case "ziek": return router.navigate({ to: "/veranderd", search: { situatie: "ziek", ...(kind ? { kind } : {}) } });
            case "afspraak_toevoegen": return router.navigate({ to: "/agenda", search: { nieuw: true, titel: a.titel || undefined, datum: a.datum || undefined, tijd: a.tijd || undefined, herhaling: a.herhaling !== "geen" ? a.herhaling : undefined, kind: a.kind || undefined } });
            case "afspraak_wijzigen": return router.navigate({ to: "/agenda" });
            case "afspraak_maken": return router.navigate({ to: "/afspraken", search: { nieuw: "voorstel", bron: "assistent" } });
            case "document_zoeken": return router.navigate({ to: "/documenten" });
            case "kring_toevoegen": return router.navigate({ to: "/kring/$kindId", params: { kindId: a.kind || "emma" }, search: { toevoegen: true, ...(a.rol ? { rol: a.rol } : {}) } });
            case "vakantie": return router.navigate({ to: "/planning", search: { toevoegen: "vakantie" } });
            case "taak_toevoegen": return router.navigate({ to: "/taken" });
            case "momentje": return router.navigate({ to: "/momentjes" });
            case "kosten": return router.navigate({ to: "/kosten" });
            case "bericht": return router.navigate({ to: "/berichten" });
            default: return;
        }
    };
    const aanpassen = () => { setAntwoord(null); setTimeout(() => invoer.current?.focus(), 0); };
    return (<>
      <button onClick={() => setOpen(true)} aria-label={t("assistant.openAria", "Zoeken of iets regelen")} className="grid size-9 place-items-center rounded-full border border-border text-ink-soft">
        <Search className="size-4" strokeWidth={1.8}/>
      </button>
      <Sheet open={open} onOpenChange={(o) => { if (!o && rec.current?.state === "recording")
        rec.current.stop(); setOpen(o); }}>
        <SheetContent side="bottom" className="inset-x-0 mx-auto w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-2xl bg-background px-5 pb-8">
          <SheetHeader className="pr-8 text-left">
            <SheetTitle className="font-display text-xl font-medium">{t("assistant.title", "Waar kan ik je mee helpen?")}</SheetTitle>
            <SheetDescription className="text-xs">{t("assistant.desc", "Ik zoek in je eigen gegevens en open de juiste plek. Ik verander zelf niets; jij bevestigt altijd.")}</SheetDescription>
          </SheetHeader>

          <form className="mt-4 flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); setUitSpraak(false); stel(); }}>
            <textarea ref={invoer} rows={2} value={vraag} onChange={(e) => setVraag(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        setUitSpraak(false);
        stel();
    } }} placeholder={t("assistant.inputPlaceholder", "Typ of spreek je vraag in")} aria-label={t("assistant.inputAria", "Je vraag")} className="min-w-0 flex-1 resize-none rounded-md border border-border bg-card px-3 py-2.5 text-sm outline-none"/>
            {bezig === "opnemen" ? (<button type="button" onClick={() => rec.current?.stop()} aria-label={t("assistant.stopRecordingAria", "Opname stoppen")} className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-warm text-primary-foreground"><Square className="size-4"/></button>) : (<button type="button" onClick={startOpname} disabled={!!bezig} aria-label={t("assistant.recordAria", "Inspreken")} className="grid size-10 shrink-0 place-items-center rounded-full border border-brand/40 text-brand disabled:opacity-40"><Mic className="size-4"/></button>)}
          </form>
          {bezig === "opnemen" ? <p role="status" className="mt-2 flex items-center gap-2 text-xs font-semibold text-accent-warm"><span className="size-2 animate-pulse rounded-full bg-accent-warm"/> {t("assistant.listening", "Ik luister… tik op het vierkantje om te stoppen")}</p> : null}
          {bezig === "omzetten" ? <p role="status" className="mt-2 text-xs text-ink-soft">{t("assistant.converting", "Spraak omzetten naar tekst…")}</p> : null}
          {!antwoord && !bezig ? <DirectGevonden zoek={vraag} kies={(d) => { setOpen(false); router.navigate({ to: d.to, search: d.search, ...(d.hash ? { hash: d.hash } : {}) }); }}/> : null}
          {uitSpraak && vraag && !bezig ? (<div className="mt-3 rounded-md border border-border bg-card p-3 text-sm">
              <p className="text-xs text-ink-soft">{t("assistant.voiceConfirmationPrompt", "Dit heb ik verstaan. Klopt het niet helemaal? Pas de tekst hierboven aan.")}</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button onClick={() => { setVraag(""); setUitSpraak(false); invoer.current?.focus(); }} className="rounded-md border border-border py-2 text-sm font-semibold text-ink-soft">{t("assistant.clear", "Wissen")}</button>
                <button onClick={() => { setUitSpraak(false); stel(); }} className="rounded-md bg-brand py-2 text-sm font-semibold text-primary-foreground">{t("assistant.confirmContinue", "Ja, ga verder")}</button>
              </div>
            </div>) : null}

          {bezig === "denken" ? <p role="status" className="mt-4 flex items-center gap-2 text-sm text-ink-soft"><Loader2 className="size-4 animate-spin"/> {t("assistant.thinking", "Even kijken…")}</p> : null}
          {fout ? <p role="alert" className="mt-3 rounded-md bg-secondary px-3 py-2 text-xs text-ink">{fout}</p> : null}

          {antwoord ? (<div className="mt-4 rounded-md border border-border bg-card p-4">
              {antwoord.actie !== "geen" && antwoord.actie !== "verduidelijk" ? <p className="mb-1 font-display text-base">{t("assistant.actionHeading", "Dit wil je regelen")}</p> : null}
              <p className="text-sm leading-relaxed">{antwoord.antwoord}</p>
              {antwoord.actie === "verduidelijk" && antwoord.opties.length ? (<div className="mt-3 flex flex-wrap gap-2">
                  {antwoord.opties.map((o) => <button key={o} onClick={() => { const nv = `${vraag.trim()} — ${o}`; setVraag(nv); stel(nv); }} className="rounded-full border border-brand/40 px-3 py-1.5 text-xs font-semibold text-brand">{o}</button>)}
                </div>) : null}
              {antwoord.actie !== "geen" && antwoord.actie !== "verduidelijk" ? (<>
                  {antwoord.samenvatting.length ? (<dl className="mt-3 divide-y divide-border border-y border-border text-sm">
                      {antwoord.samenvatting.map((s) => <div key={s.label} className="flex justify-between gap-3 py-2"><dt className="text-ink-soft">{s.label}</dt><dd className="text-right font-semibold">{s.waarde}</dd></div>)}
                    </dl>) : null}
                  <p className="mt-3 text-[11px] text-ink-soft">{t("assistant.nothingChangedNotice", "Er is nog niets veranderd. Je controleert alles op de volgende pagina en verstuurt of bewaart het zelf.")}</p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button onClick={aanpassen} className="rounded-md border border-border py-2.5 text-sm font-semibold text-ink-soft">{t("assistant.adjust", "Aanpassen")}</button>
                    <button onClick={() => openFlow(antwoord)} className="rounded-md bg-brand py-2.5 text-sm font-semibold text-primary-foreground">{getKnopLabel(antwoord.actie, t)}</button>
                  </div>
                </>) : null}
            </div>) : null}

          {!antwoord && !bezig && !vraag ? (<div className="mt-4 flex flex-wrap gap-2">
              {tips.map((v) => <button key={v} onClick={() => { setVraag(getTipLabel(v, t)); stel(v); }} className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-ink-soft">{getTipLabel(v, t)}</button>)}
            </div>) : null}
        </SheetContent>
      </Sheet>
    </>);
}
function DirectGevonden({ zoek, kies }) {
    const { t } = useTranslation();
    const q = zoek.trim().toLowerCase();
    if (q.length < 2)
        return null;
    const stop = new Set(["wat", "wie", "waar", "wanneer", "hoe", "een", "het", "de", "van", "voor", "bij", "met", "ik", "wil", "is", "zijn", "op", "en", "naar", "mijn", "staat", "kan"]);
    const woorden = q.split(/[^a-zà-ÿ0-9]+/).filter((w) => w.length >= 2 && !stop.has(w));
    if (!woorden.length)
        return null;
    const pas = (t) => { const l = t.toLowerCase(); return woorden.some((w) => l.includes(w) || l.split(/\s+/).some((x) => x.startsWith(w))); };
    const paginas = [
        { label: "Agenda", to: "/agenda", woorden: "agenda afspraak kalender week" },
        { label: "Kosten", to: "/kosten", woorden: "kosten geld betalen bedrag verrekenen uitgave bon" },
        { label: "Berichten", to: "/berichten", woorden: "berichten bericht chat" },
        { label: "Verdeling van de week", to: "/zorgregeling", woorden: "verdeling week zorgregeling schema wissel omgang" },
        { label: "Overdracht", to: "/overdracht", woorden: "overdracht spullen mee tas" },
        { label: "Taken", to: "/taken", woorden: "taken taak deadline regelen" },
        { label: "Nog nodig", to: "/boodschappen", woorden: "nog nodig lijstje boodschappen nodig kopen gekocht winkel" },
        { label: "Spullen", to: "/spullen", woorden: "spullen mee knuffel tas paklijst vergeten" },
        { label: "Documenten", to: "/documenten", woorden: "documenten document pdf plan rapport" },
        { label: "Vakanties & bijzondere dagen", to: "/planning", woorden: "vakantie vakanties feestdag kerst zomer reis" },
        { label: "Momentjes", to: "/momentjes", woorden: "momentjes foto moment" },
        { label: "Kinderen", to: "/kinderen", woorden: "kinderen emma noah noodkaart school verzekering kring oma opa oppas" },
        { label: "Instellingen", to: "/instellingen", woorden: "instellingen thema donker meldingen" },
        { label: "Begeleiding", to: "/ondersteuning", woorden: "begeleiding begeleider ondersteuning professional mediator gezinscoach" },
    ];
    const res = [
        ...paginas.filter((p) => pas(p.woorden) || pas(p.label)).map((p) => ({ label: p.label, soort: "Pagina", to: p.to })),
        ...afspraken.filter((a) => pas(a.titel) || pas(a.locatie)).map((a) => ({ label: a.titel, soort: `Afspraak · ${a.datumLabel}`, to: "/agenda", hash: `item-${a.id}` })),
        ...afsprakenState().filter((a) => a.status !== "Niet doorgegaan" && (pas(a.titel) || pas(a.onderwerp) || pas(a.kind) || pas(a.tekst))).map((a) => ({ label: a.titel, soort: `Gemaakte afspraak · ${a.onderwerp}`, to: "/afspraken" })),
        ...documenten.filter((d) => pas(d.naam) || pas(d.categorie)).map((d) => ({ label: d.naam, soort: "Document", to: "/documenten", hash: `item-${d.id}` })),
        ...takenState().taken.filter((t) => pas(t.tekst)).map((t) => ({ label: t.tekst, soort: t.klaar ? "Taak · afgerond" : "Taak", to: "/taken", hash: `item-${t.id}` })),
        ...kringState().personen.filter((p) => !p.ingetrokken && (pas(p.naam) || pas(p.rol))).map((p) => ({ label: p.naam, soort: `Kring · ${p.rol}`, to: "/kinderen" })),
    ].slice(0, 6);
    if (!res.length)
        return null;
    return (<div className="mt-3">
      <p className="text-xs font-semibold text-ink-soft">{t("assistant.instantMatches", "Direct gevonden")}</p>
      <ul className="mt-1 space-y-1">
        {res.map((r, i) => (<li key={i}><button type="button" onClick={() => kies(r)} className="w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted">{r.label}<span className="block text-[11px] text-ink-soft">{r.soort}</span></button></li>))}
      </ul>
      <p className="mt-1 text-[11px] text-ink-soft">{t("assistant.pressEnterToAsk", "Druk op Enter om het Co te vragen.")}</p>
    </div>);
}
