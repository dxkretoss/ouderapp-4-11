import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { useBevestigPopup } from "@/lib/feedback";
import { RustigTip, useKeuzeTeksten } from "@/components/RustigTip";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { Badge, BewerkPotlood, FilterBalk, OverzichtKaart } from "@/components/ui-kit";
import { AppShell, Card, PageHeader } from "@/components/AppShell";
import { AppIcon } from "@/components/AppIcon";
import { VoorstelIntrekken } from "@/components/VoorstelIntrekken";
import { Button } from "@/components/ui/button";
import { zetVoorkeur, useVoorkeuren } from "@/lib/voorkeuren-store";
import { ANDER, IK, metPro, naam, nodig, ONDERWERPEN, PRO, PRO_LABEL, useAfspraken, vandaag, voerUit, wachtOpMij, zetAfspraken, zin, trekAfspraakIn, isIngevuldeAfspraak } from "@/lib/afspraken-store";
export const Route = createFileRoute("/afspraken")({
    head: () => ({
        meta: [
            { title: "Afspraken — Ouderschap & Co" },
            { name: "description", content: "Hier zie je wat jullie samen hebben afgesproken, sinds wanneer en hoe het is ontstaan." },
            { property: "og:title", content: "Afspraken — Ouderschap & Co" },
            { property: "og:description", content: "Voorstellen, reageren, afspreken en terugvinden — met bewaarde geschiedenis." },
            { property: "og:type", content: "website" },
            { name: "twitter:card", content: "summary" },
        ],
    }),
    validateSearch: z.object({ weergave: z.enum(["professional"]).optional(), nieuw: z.enum(["voorstel", "afspraak"]).optional(), afspraak: z.string().optional(), bron: z.string().optional() }),
    component: AfsprakenPagina,
});
const rechtenOpties = ["Geen toegang", "Alleen bekijken", "Voorstellen doen", "Toevoegen", "Wijzigen", "Status aanpassen", "Evalueren"];
function AfsprakenPagina() {
    const { t } = useTranslation();
    const zoek = Route.useSearch();
    const rol = zoek.weergave === "professional" ? "pro" : "ouder";
    const ik = rol === "pro" ? PRO : IK;
    const lijst = useAfspraken();
    const vk = useVoorkeuren();
    const [houvastTip, setHouvastTip] = useState(false);
    const setLijst = zetAfspraken;
    const [open, setOpen] = useState(zoek.afspraak ?? null);
    useEffect(() => { setOpen(zoek.afspraak ?? null); setNieuw(!!zoek.nieuw); }, [zoek.afspraak, zoek.nieuw]);
    const [nieuw, setNieuw] = useState(!!zoek.nieuw);
    const [recht, setRecht] = useState("Evalueren");
    const [toegang, setToegang] = useState(false);
    const [melding, setMelding] = useState(null);
    useBevestigPopup(melding);
    const update = (id, f) => setLijst((l) => l.map((a) => (a.id === id ? f(a) : a)));
    const stelVoor = (id, v) => update(id, (a) => ({ ...a, voorstel: { ...v, door: ik, datum: vandaag(), akkoord: rol === "ouder" ? { [IK]: true } : {} }, geschiedenis: [{ datum: vandaag(), tekst: `${ik === PRO ? PRO : ik} ${v.soort === "stoppen" ? "stelde voor de afspraak te stoppen" : "stelde een wijziging voor"}.` }, ...a.geschiedenis] }));
    const reageer = (id, wie, keuze, altTekst) => update(id, (a) => {
        const v = a.voorstel;
        if (!v || !nodig(v).includes(wie))
            return a;
        const d = vandaag();
        if (keuze === "niet")
            return { ...a, voorstel: undefined, status: v.soort === "nieuw" ? "Niet doorgegaan" : a.status, geschiedenis: [{ datum: d, tekst: `${wie} ging niet akkoord. ${v.soort === "nieuw" ? "Er is geen afspraak gemaakt." : "De huidige afspraak blijft gelden."}` }, ...a.geschiedenis] };
        if (keuze === "ander")
            return { ...a, voorstel: { soort: v.soort === "stoppen" ? "wijziging" : v.soort, door: wie, tekst: altTekst, datum: d, akkoord: { [wie]: true } }, geschiedenis: [{ datum: d, tekst: `${wie} deed een ander voorstel: ${altTekst}. Het oorspronkelijke voorstel is niet goedgekeurd: ${v.tekst ?? a.tekst}.` }, ...a.geschiedenis] };
        const na = { ...a, voorstel: { ...v, akkoord: { ...v.akkoord, [wie]: true } }, geschiedenis: [{ datum: d, tekst: `${wie} ging akkoord${v.soort === "wijziging" ? " met de wijziging" : ""}.` }, ...a.geschiedenis] };
        return nodig(na.voorstel).length ? na : voerUit(na);
    });
    const gekozen = lijst.find((a) => a.id === open);
    if (gekozen) {
        return (<AppShell>
        <div className="mt-2">
          <button onClick={() => setOpen(null)} className="min-h-11 inline-flex items-center gap-1 text-sm font-semibold text-brand">
            <ChevronLeft className="size-4 shrink-0" />
            <span>{t("agreements.title", "Afspraken")}</span>
          </button>
        </div>
        <Detail a={gekozen} rol={rol} magVoorstellen={rol === "ouder" || rechtenOpties.indexOf(recht) >= 2} magEvalueren={rol === "pro" && recht === "Evalueren"} onVoorstel={(v) => { stelVoor(gekozen.id, v); setMelding(v.soort === "stoppen" ? "Je voorstel om te stoppen is verstuurd. De afspraak blijft gelden tot er akkoord is." : "Je wijzigingsvoorstel is verstuurd. De huidige afspraak blijft gelden tot er akkoord is."); }} onReageer={(k, t) => {
                reageer(gekozen.id, IK, k, t);
                if (k === "niet" && !gekozen.veiligheid && !vk.extraHouvast && !vk.extraHouvastTipGezien) {
                    zetVoorkeur("extraHouvastTipGezien", true);
                    setHouvastTip(true);
                }
            }} onIntrekken={() => { if (trekAfspraakIn(gekozen.id, ik))
            setMelding("Voorstel ingetrokken. De huidige afspraken blijven gelden."); }} onEvalueer={(k) => update(gekozen.id, (x) => ({ ...x, evaluatie: k === "Behouden" ? undefined : x.evaluatie, geschiedenis: [{ datum: vandaag(), tekst: `Samen bekeken met Lotte: ${k.toLowerCase()}.` }, ...x.geschiedenis] }))}/>
        {melding ? <p role="status" className="mt-3 text-xs text-ink-soft">{melding}</p> : null}
        {houvastTip ? <Link to="/extra-ondersteuning" className="mt-3 inline-flex min-h-11 items-center text-xs text-brand">Liever iets vastleggen? Bekijk Extra houvast.</Link> : null}
        {import.meta.env.DEV && gekozen.voorstel && nodig(gekozen.voorstel).includes(ANDER) ? (<button onClick={() => reageer(gekozen.id, ANDER, "akkoord")} className="mt-3 min-h-11 rounded-md border border-dashed border-border px-3 text-xs text-ink-soft">Voorbeeld: Joris gaat akkoord</button>) : null}
      </AppShell>);
    }
    const q = "";
    const zichtbaar = lijst.filter(isIngevuldeAfspraak).filter((a) => (a.status === "Actief" || a.status === "Gestopt" || a.status === "Voorstel") && (!q || `${a.titel} ${a.tekst} ${a.onderwerp}`.toLowerCase().includes(q)));
    const aandacht = rol === "ouder" ? lijst.filter(wachtOpMij) : [];
    const groepen = ONDERWERPEN.map(([, g]) => g).filter((g, i, s) => s.indexOf(g) === i).map((g) => [g, zichtbaar.filter((a) => a.onderwerp === g && a.status !== "Gestopt" && !aandacht.includes(a))]).filter(([, l]) => l.length);
    const gestopt = zichtbaar.filter((a) => a.status === "Gestopt");
    return (<AppShell>
      <PageHeader titel={t("agreements.headerTitle", "Afspraken tussen jullie")} subtitel={t("agreements.headerSubtitle", "Hier zie je wat jullie samen hebben afgesproken.")} terug="/extra-ondersteuning" actie={<div className="flex">
          {rol === "ouder" || rechtenOpties.indexOf(recht) >= 2 ? <button aria-label={t("agreements.proposeNewAria", "Nieuwe afspraak voorstellen")} onClick={() => setNieuw(true)} className="inline-flex size-11 items-center justify-center rounded-full text-xl font-semibold text-brand hover:bg-muted">+</button> : null}
        </div>}/>


      {melding ? (<Card className="mt-4">
          <p className="flex items-center gap-1.5 text-sm font-semibold"><AppIcon functie="melding" maat="sm" vorm="kaal"/>{melding}</p>
          <button onClick={() => setMelding(null)} className="mt-1 min-h-11 text-xs font-semibold text-brand">{t("agreements.close", "Sluiten")}</button>
        </Card>) : null}

      {nieuw ? <NieuweAfspraak pro={rol === "pro"} voorinvul={zoek.bron && !["agenda", "samen-regelen"].includes(zoek.bron) ? zoek.bron : ""} onAnnuleer={() => setNieuw(false)} onVerstuur={(onderwerp, titel, tekst) => {
                const d = vandaag();
                setLijst((l) => [...l, { id: `n${Date.now()}`, titel, tekst, onderwerp, kind: "Emma & Noah", status: "Voorstel", ...(rol === "pro" ? { bron: metPro } : {}), versies: [],
                        voorstel: { soort: "nieuw", door: ik, datum: d, akkoord: rol === "ouder" ? { [IK]: true } : {} }, geschiedenis: [{ datum: d, tekst: `${ik === PRO ? PRO : ik} stelde deze afspraak voor.` }] }]);
                setNieuw(false);
                setMelding(rol === "pro" ? "Je voorstel staat klaar voor beide ouders. Het geldt pas als zij allebei akkoord zijn." : "Je voorstel is verstuurd naar Joris. Het geldt pas als hij akkoord is.");
            }}/> : null}

      {aandacht.length ? (<Sectie titel={t("agreements.yourAttention", "Jouw aandacht")}>
          {aandacht.map((a) => <Rij key={a.id} a={a} onOpen={() => setOpen(a.id)} status={`${naam(a.voorstel.door)} ${zin(a.voorstel)}`} actie/>)}
        </Sectie>) : null}

      <div className="mt-4 flex flex-wrap gap-x-4">
        <Link to="/halen-brengen" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand"><AppIcon functie="overdracht" maat="sm" vorm="kaal"/>{t("agreements.pickupDropoff", "Halen en brengen")}</Link>
        <Link to="/contact" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand"><AppIcon functie="berichten" maat="sm" vorm="kaal"/>{t("agreements.contactAgreements", "Contactafspraken")}</Link>
      </div>
      {groepen.length ? <h2 className="mt-6 font-display text-lg font-bold">{t("agreements.whatAgreedSection", "Wat hebben jullie afgesproken?")}</h2> : <p className="mt-6 text-sm text-ink-soft">{q ? t("agreements.noAgreementsFound", "Geen afspraken gevonden.") : t("agreements.noAgreementsYet", "Nog geen afspraken.")}</p>}
      {groepen.map(([g, l]) => (<Sectie key={g} titel={g}>
          {l.map((a) => <Rij key={a.id} a={a} onOpen={() => setOpen(a.id)}/>)}
        </Sectie>))}
      {gestopt.length ? <Sectie titel={t("agreements.stoppedSection", "Gestopt")}>{gestopt.map((a) => <Rij key={a.id} a={a} onOpen={() => setOpen(a.id)} status={t("agreements.stoppedOn", { date: a.gestoptOp, defaultValue: `Gestopt op ${a.gestoptOp}` })}/>)}</Sectie> : null}

      <Card className="mt-6">
        <p className="text-sm font-semibold">{PRO_LABEL}</p>
        <p className="mt-0.5 text-xs text-ink-soft">{recht === "Geen toegang" ? "Kan geen afspraken zien." : recht === "Evalueren" ? "Kan afspraken bekijken, voorstellen en samen met jullie bekijken." : `Kan afspraken ${recht.toLowerCase()}.`} Wat Lotte vastlegt, geldt pas als jullie allebei akkoord zijn.</p>
        <button onClick={() => setToegang(!toegang)} className="mt-1 min-h-11 inline-flex items-center gap-1 text-xs font-semibold text-brand">{toegang ? t("agreements.hideAccess", "Verberg toegang") : <><span>{t("agreements.viewAccess", "Bekijk toegang")}</span><ChevronRight className="size-3.5" /></>}</button>
        {toegang ? <Transparantie recht={recht} setRecht={setRecht}/> : null}
      </Card>

      {rol === "pro" ? <><ProDashboard lijst={lijst}/><Caseload /></> : null}

      <p className="mt-6 text-xs text-ink-soft">{t("agreements.proposalDisclaimer", "Een voorstel is nog geen afspraak. Gezien is niet hetzelfde als akkoord, en geen reactie ook niet. Een nieuwe versie bewaart altijd de oude.")}</p>
    </AppShell>);
}
function Sectie({ titel, children }) {
    return (<section className="mt-5">
      <h3 className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">{titel}</h3>
      <div className="mt-2 divide-y divide-border rounded-md border border-border bg-card">{children}</div>
    </section>);
}
function Rij({ a, onOpen, status, actie }) {
    const s = status ?? (a.voorstel ? (wachtOpMij(a) ? "Jouw reactie is nodig" : `Wacht op reactie van ${nodig(a.voorstel).join(" en ")}`) : null);
    return (<button onClick={onOpen} className="flex w-full items-center gap-3 px-3 py-3 text-left">
      {a.veiligheid ? <AppIcon functie="veiligheid" maat="sm"/> : null}
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{a.titel}</span>
        <span className="mt-0.5 block text-xs text-ink-soft">{a.tekst}</span>
        {s ? <span className="mt-1 block"><Badge toon={actie || s === "Jouw reactie is nodig" ? "actie" : "klaar"}>{s}</Badge></span> : null}
      </span>
      <ChevronRight className="size-5 shrink-0 text-ink-soft" />
    </button>);
}
function Veld({ label, children }) {
    return <div><dt className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">{label}</dt><dd className="mt-0.5">{children}</dd></div>;
}
function Detail({ a, rol, magVoorstellen, magEvalueren, onVoorstel, onReageer, onIntrekken, onEvalueer }) {
    const { t } = useTranslation();
    const versie = a.versie ?? 0;
    const [gezien, setGezien] = useState(versie);
    const eigen = useRef(false);
    useEffect(() => { if (eigen.current) {
        eigen.current = false;
        setGezien(versie);
    } }, [versie]);
    const verouderd = versie !== gezien;
    const k = useKeuzeTeksten();
    const doe = (f) => { if (verouderd)
        return; eigen.current = true; f(); };
    const [bewerk, setBewerk] = useState(false);
    const [tekst, setTekst] = useState(a.tekst);
    const [alt, setAlt] = useState(null);
    const [meer, setMeer] = useState(false);
    const [historie, setHistorie] = useState(false);
    const veld = "w-full rounded-md border border-border bg-surface px-3 py-2 text-sm";
    const v = a.voorstel;
    const kanAanpassen = magVoorstellen && a.status === "Actief" && !v && !verouderd;
    if (verouderd) {
        return (<Card className="mt-3 space-y-2" role="status">
        <p className="font-semibold">{t("agreements.agreementChangedNotice", "Deze afspraak is ondertussen veranderd.")}</p>
        <p className="text-xs text-ink-soft">{t("agreements.agreementChangedDesc", "Je reactie of voorstel is niet verstuurd. Bekijk eerst de nieuwste versie en bepaal dan opnieuw wat je wilt.")}</p>
        <button onClick={() => { setGezien(versie); setBewerk(false); setAlt(null); }} className="min-h-11 w-full rounded-full bg-brand text-sm font-semibold text-primary-foreground">{t("agreements.viewLatestVersion", "Bekijk nieuwste versie")}</button>
      </Card>);
    }
    if (bewerk) {
        return (<Card className="mt-3 space-y-3">
        <h1 className="font-display text-xl font-bold">{t("agreements.editAgreement", "Afspraak aanpassen")}</h1>
        <div><p className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">{t("agreements.currentAgreement", "Huidige afspraak")}</p><p className="mt-1 text-sm">{a.tekst}</p></div>
        <label className="block"><span className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">{t("agreements.yourNewProposal", "Jouw voorstel")}</span><textarea rows={3} className={`mt-1 ${veld}`} value={tekst} onChange={(e) => setTekst(e.target.value)}/></label>
        {a.formeel ? <p className="text-[11px] text-ink-soft">{t("agreements.formalDocumentNote", "Een wijziging in de app verandert het oorspronkelijke document niet.")}</p> : null}
        <p className="text-xs text-ink-soft">{t("agreements.proposalPendingNotice", "Dit is een voorstel. De huidige afspraak blijft gelden tot de benodigde instemming is gegeven.")}</p>
        <button disabled={!tekst.trim() || tekst.trim() === a.tekst} onClick={() => doe(() => { onVoorstel({ soort: "wijziging", tekst: tekst.trim() }); setBewerk(false); })} className="min-h-11 w-full rounded-full bg-brand text-sm font-semibold text-primary-foreground disabled:opacity-40">{t("agreements.proposeChange", "Wijziging voorstellen")}</button>
        <button onClick={() => setBewerk(false)} className="min-h-11 w-full text-sm font-semibold text-ink-soft">{t("agreements.cancel", "Annuleren")}</button>
      </Card>);
    }
    return (<Card className="relative mt-3">
      {kanAanpassen ? <BewerkPotlood onClick={() => { setTekst(a.tekst); setBewerk(true); }} label={t("agreements.editAgreement", "Afspraak aanpassen")}/> : null}
      {a.veiligheid ? <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-soft"><AppIcon functie="veiligheid" maat="sm" vorm="kaal"/>{t("agreements.safetyAgreement", "Afspraak over veiligheid")}</p> : null}
      <h1 className="pr-12 font-display text-xl font-bold">{a.titel}</h1>
      {a.status === "Ingetrokken" ? <p className="mt-1 text-sm text-ink-soft">{t("agreements.withdrawnNotice", "Ingetrokken · geen afspraak gemaakt")}</p> : a.status === "Gestopt" ? <p className="mt-1 text-sm text-ink-soft">Gestopt op {a.gestoptOp}</p> : a.status === "Voorstel" ? <p className="mt-1 text-sm text-ink-soft">{t("agreements.proposalNotice", "Voorstel · nog geen afspraak")}</p> : null}

      {v ? (<div className="mt-4 space-y-2 rounded-md border border-border p-3 text-sm">
          <p className="font-semibold">{v.door === IK ? t("agreements.yourProposal", "Jouw voorstel") : `${v.door === PRO ? PRO : v.door} ${zin(v)}.`}</p>
          {v.soort === "wijziging" ? <><p><span className="text-xs text-ink-soft">Nu:</span><br />{a.tekst}</p><p><span className="text-xs text-ink-soft">Voorstel:</span><br />{v.tekst}</p></> : v.soort === "stoppen" ? <p>{t("agreements.stopsWhenAgreed", "De afspraak stopt pas als jullie allebei akkoord zijn.")}</p> : <p>{v.tekst ?? a.tekst}</p>}
          <p className="text-xs text-ink-soft">{nodig(v).length ? `Wacht op: ${nodig(v).map((o) => (o === IK ? "jou" : o)).join(" en ")}.` : null} Geen reactie betekent geen akkoord.</p>
          {rol === "ouder" && wachtOpMij(a) ? (alt === null ? (<div className="grid gap-2 pt-1">
              <button onClick={() => doe(() => onReageer("akkoord"))} className="min-h-11 rounded-full bg-brand text-sm font-semibold text-primary-foreground">{t("agreements.agree", "Akkoord")}</button>
              <Button variant="outline" onClick={() => setAlt(v.tekst ?? a.tekst)}>{k.ander}</Button>
              <Button variant="ghost" onClick={() => doe(() => onReageer("niet"))}>{k.niet}</Button>
              <RustigTip moment={a.veiligheid ? null : "voorstel"} veiligheid={!!a.veiligheid}/>
            </div>) : (<div className="space-y-2 pt-1">
              <p className="text-xs text-ink-soft">Het oorspronkelijke voorstel is niet goedgekeurd. Je alternatief wordt opnieuw ter afstemming voorgelegd.</p>
              <textarea rows={3} className={veld} value={alt} onChange={(e) => setAlt(e.target.value)}/>
              <button disabled={!alt.trim()} onClick={() => doe(() => { onReageer("ander", alt.trim()); setAlt(null); })} className="min-h-11 w-full rounded-full bg-brand text-sm font-semibold text-primary-foreground disabled:opacity-40">{t("agreements.sendOtherProposal", "Ander voorstel sturen")}</button>
            </div>)) : null}
          {v.door === (rol === "pro" ? PRO : IK) && nodig(v).length ? <VoorstelIntrekken onBevestig={() => doe(onIntrekken)}/> : null}
        </div>) : null}

      <dl className="mt-4 space-y-3 text-sm">
        <Veld label={t("agreements.whatAgreedQuestion", "Wat hebben jullie afgesproken?")}>{a.tekst}</Veld>
        <Veld label={t("agreements.appliesTo", "Geldt voor")}>{a.kind}</Veld>
        {a.afgesprokenOp ? <Veld label={t("agreements.agreedOn", "Afgesproken op")}>{a.afgesprokenOp}</Veld> : null}
        {a.geldtVanaf ? <Veld label={t("agreements.appliesFrom", "Geldt vanaf")}>{a.geldtVanaf}</Veld> : null}
        {a.afgesprokenDoor ? <Veld label={t("agreements.agreedBy", "Afgesproken door")}>{a.afgesprokenDoor}</Veld> : null}
        {a.bron?.soort === "professional" ? <Veld label={t("agreements.recordedWith", "Vastgelegd met")}>{a.bron.label}</Veld> : null}
        {a.bron?.soort === "document" ? <Veld label={t("agreements.source", "Bron")}>{a.bron.label}{a.bron.datum ? ` · ${a.bron.datum}` : ""}{a.bron.document ? <><br /><Link to="/documenten" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-brand"><span>{t("agreements.viewDocument", "Bekijk document")}</span><ChevronRight className="size-3.5" /></Link></> : null}</Veld> : null}
        {a.evaluatie && a.status === "Actief" ? <Veld label={t("agreements.revisitTogether", "Samen weer bekijken")}>{a.evaluatie}{a.bron?.soort === "professional" ? <span className="block text-xs text-ink-soft">Op {a.evaluatie.replace(/ \d{4}$/, "")} bekijken jullie met Lotte of deze afspraak nog goed werkt.</span> : null}</Veld> : null}
      </dl>

      {a.koppeling ? <p className="mt-3 rounded-md bg-brand-soft/60 p-2 text-[11px]"><span className="inline-flex items-center gap-1.5"><AppIcon functie="link" maat="sm" vorm="kaal"/>{a.koppeling}</span></p> : null}

      <Button variant="ghost" onClick={() => setHistorie(!historie)} className="mt-3 h-auto min-h-11 w-full justify-between border-t border-border px-0 pt-2 text-sm font-semibold"><span>{t("agreements.changeHistory", "Wijzigingsgeschiedenis")}</span> <ChevronDown className={"size-4 text-ink-soft shrink-0 transition-transform " + (historie ? "rotate-180" : "")} /></Button>
      {historie ? (<div className="space-y-2 text-xs">
          {v ? <p className="text-ink-soft">{v.door} stelde op {v.datum} een {v.soort === "nieuw" ? "nieuwe afspraak" : "wijziging"} voor. Wacht op goedkeuring van {nodig(v).join(" en ")}.</p> : null}
          {a.geschiedenis.map((g, i) => <p key={i}><span className="text-ink-soft">{g.datum}</span><br />{g.tekst}</p>)}
          {a.versies.length ? <div className="border-t border-border pt-2"><p className="font-semibold">Eerdere versies</p>{a.versies.map((x, i) => <p key={i} className="mt-1"><span className="text-ink-soft">Gold tot {x.tot}</span><br />{x.tekst}</p>)}</div> : null}
          <p className="text-[11px] text-ink-soft">{t("agreements.historyCannotBeChanged", "Deze geschiedenis kan niet worden aangepast of verwijderd.")}</p>
        </div>) : null}

      {kanAanpassen ? (<div className="border-t border-border pt-1">
          <button onClick={() => setMeer(!meer)} aria-label="Meer opties" className="min-h-11 text-sm font-semibold text-ink-soft">•••</button>
          {meer ? <button onClick={() => doe(() => { onVoorstel({ soort: "stoppen" }); setMeer(false); })} className="block min-h-11 text-sm font-semibold text-brand">{t("agreements.proposeStop", "Voorstellen om afspraak te stoppen")}</button> : null}
        </div>) : null}

      {magEvalueren && a.evaluatie && a.status === "Actief" ? (<div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
          <span className="w-full text-[11px] text-ink-soft">{t("agreements.reviewedTogetherOutcome", "Samen bekeken — uitkomst:")}</span>
          <button onClick={() => doe(() => onEvalueer("Behouden"))} className="min-h-11 rounded-full border border-border px-3">{t("agreements.worksWellKeep", "Werkt goed, behouden")}</button>
          <button onClick={() => { setTekst(a.tekst); setBewerk(true); }} className="min-h-11 rounded-full border border-border px-3">{t("agreements.proposeAdjustment", "Aanpassing voorstellen")}</button>
        </div>) : null}
    </Card>);
}
function NieuweAfspraak({ pro, voorinvul = "", onVerstuur, onAnnuleer }) {
    const { t } = useTranslation();
    const [onderwerp, setOnderwerp] = useState(null);
    const [titel, setTitel] = useState("");
    const [tekst, setTekst] = useState(voorinvul);
    const veld = "w-full rounded-md border border-border bg-surface px-3 py-2 text-sm";
    return (<Card className="mt-4 space-y-3">
      {!onderwerp ? (<>
          <p className="font-display text-lg font-bold">{t("agreements.whatTopicQuestion", "Waar willen jullie iets over afspreken?")}</p>
          <div className="divide-y divide-border rounded-md border border-border">
            {ONDERWERPEN.map(([l, g]) => <button key={l} onClick={() => setOnderwerp(g)} className="flex min-h-11 w-full items-center justify-between px-3 text-left text-sm cursor-pointer hover:bg-muted/40"><span>{l}</span><ChevronRight className="size-4 shrink-0 text-ink-soft" /></button>)}
          </div>
        </>) : (<>
          <p className="font-display text-lg font-bold">{t("agreements.whatToAgreeQuestion", "Wat wil je afspreken?")}</p>
          <p className="text-xs text-ink-soft">{onderwerp}</p>
          <input className={veld} placeholder={t("agreements.titlePlaceholder", "Korte titel, bijvoorbeeld: Zwemles om de week")} value={titel} onChange={(e) => setTitel(e.target.value)}/>
          <textarea rows={3} className={veld} placeholder={t("agreements.descPlaceholder", "Schrijf in gewone woorden wat je wilt afspreken.")} value={tekst} onChange={(e) => setTekst(e.target.value)}/>
          <p className="rounded-md bg-muted px-3 py-2 text-xs">Dit is een voorstel. De afspraak geldt pas nadat de benodigde instemming is gegeven{pro ? " van beide ouders" : ""}.</p>
          <button disabled={!titel.trim() || !tekst.trim()} onClick={() => onVerstuur(onderwerp, titel.trim(), tekst.trim())} className="min-h-11 w-full rounded-full bg-brand text-sm font-semibold text-primary-foreground disabled:opacity-40">{t("agreements.sendProposalBtn", "Voorstel versturen")}</button>
        </>)}
      <button onClick={onAnnuleer} className="min-h-11 w-full text-sm font-semibold text-ink-soft">Annuleren</button>
    </Card>);
}
function Transparantie({ recht, setRecht }) {
    const { t } = useTranslation();
    return (<div className="mt-2 border-t border-border pt-3">
      <p className="text-sm font-semibold">Toegang van Lotte</p>
      <p className="mt-1 text-xs text-ink-soft">Lotte Jansen, gezinscoach · toegang tot en met 31 december 2026</p>
      <label className="mt-3 block text-[11px] font-semibold text-ink-soft">Wat mag Lotte bij Afspraken?</label>
      <select value={recht} onChange={(e) => setRecht(e.target.value)} className="mt-1 w-full rounded-md bg-surface px-3 py-2 text-sm">
        {rechtenOpties.map((r) => <option key={r}>{r}</option>)}
      </select>
      <p className="mt-2 text-[11px] text-ink-soft">{recht === "Geen toegang" ? "Lotte ziet geen afspraken." : "Lotte ziet alle afspraken. Wat zij voorstelt, geldt pas na akkoord van beide ouders."} Beide ouders moeten akkoord zijn met deze toegang.</p>
    </div>);
}
function ProDashboard({ lijst }) {
    const { t } = useTranslation();
    const tel = [
        { n: lijst.filter((a) => a.status === "Actief").length, l: "actieve afspraken" },
        { n: lijst.filter((a) => a.veiligheid && a.status === "Actief").length, l: "veiligheidsafspraken" },
        { n: lijst.filter((a) => a.voorstel).length, l: "wacht op akkoord" },
        { n: lijst.filter((a) => a.evaluatie && a.status === "Actief").length, l: "samen weer bekijken" },
    ];
    return (<Card className="mt-4">
      <p className="font-display font-bold">Gezin De Vries / Bakker</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {tel.map((t) => <div key={t.l} className="rounded-md bg-surface p-2"><p className="font-display text-xl font-extrabold">{t.n}</p><p className="text-[11px] text-ink-soft">{t.l}</p></div>)}
      </div>
      <p className="mt-2 text-[11px] text-ink-soft">Alleen feitelijke statussen. Geen risicoscores.</p>
    </Card>);
}
const achternamen = ["De Vries / Bakker", "Jansen", "Visser / Smit", "Meijer", "De Boer", "Mulder / Bos", "Vos", "Peters", "Hendriks / Dekker", "Van Dijk", "Kok", "Brouwer", "Van Leeuwen", "Willems / Maas", "Verhoeven", "Koster", "Prins", "Huisman", "Post / Kuipers", "Scholten"];
const filters = ["Evaluatie binnenkort", "Wacht op bevestiging", "Recent gewijzigd", "Actieve veiligheidsafspraken", "Afgeronde afspraken"];
const caseload = achternamen.map((naam, i) => ({ naam, tags: filters.filter((_, j) => (i * 7 + j * 3) % 5 < 2) }));
function Caseload() {
    const { t } = useTranslation();
    const [f, setF] = useState(null);
    const zichtbaar = caseload.filter((g) => !f || g.tags.includes(f));
    return (<section className="mt-8">
      <h2 className="font-display text-lg font-bold">Afspraken – Mijn gezinnen</h2>
      <p className="mt-1 text-xs text-ink-soft">{caseload.length} gezinnen · zonder gevoelige inhoud</p>
      <FilterBalk className="mt-3" opties={["Alle", ...filters]} waarde={f ?? "Alle"} onChange={(x) => setF(x === "Alle" ? null : x)}/>
      <div className="mt-3 space-y-2">
        {zichtbaar.map((g) => <OverzichtKaart key={g.naam} titel={`Gezin ${g.naam}`} badges={g.tags.length ? g.tags.map((t) => <Badge key={t}>{t}</Badge>) : <Badge>Geen aandachtspunten</Badge>}/>)}
      </div>
    </section>);
}
