import { vindDeadline } from "@/lib/deadline";
import { bevestig } from "@/lib/feedback";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { pauzeAdvies, pauzeRegel } from "@/lib/communicatiedruk";
import { AppShell, BackButton } from "@/components/AppShell";
import { gesprekken, parents } from "@/lib/demo-data";
import { useServerFn } from "@tanstack/react-start";
import { coachBericht, toonBericht, alGereageerd } from "@/lib/coach.functions";
import { vatGesprekSamen } from "@/lib/samenvatting.functions";
import { HulpKaart } from "@/components/Onveilig";
import { Plus, Mail, Search, Moon, ChevronRight, Pin, PinOff, Bell, BellOff, MoreHorizontal, Info } from "lucide-react";
import { useVoorkeuren, zetVoorkeur, wisselVastgezet, dempGesprek, isGedempt } from "@/lib/voorkeuren-store";
import { EmailGesprek } from "@/components/EmailGesprek";
import { EvenMeedenken } from "@/components/EvenMeedenken";
import { useEmailKoppeling } from "@/lib/email-koppeling-store";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { NuAfstemmenKaart, NuAfstemmenStart } from "@/components/NuAfstemmen";
import { openNuAfstemmen, useNuAfstemmen } from "@/lib/nu-afstemmen-store";
import { start as eigenStart, useStart } from "@/lib/start-store";
import { AppIcon, Pictogram } from "@/components/AppIcon";
import { z } from "zod";
import { Communicatiemeter, FijnGecommuniceerd } from "@/components/Communicatiemeter";
import { signaalUitBeoordeling, signaalVraagtHerformulering, verdientBevestiging } from "@/lib/communicatiemeter";
import { bevatBelediging } from "@/lib/belediging";
import { analyseVoor, moetWaarschuwen, toonAfwijking } from "@/lib/deescalatie";
import { Button } from "@/components/ui/button";
import { heeftHerformulering } from "@/lib/coach-vergelijking";
import { maakCoachCache } from "@/lib/coach-cache";
import { CommunicatieSuggestie } from "@/components/CommunicatieSuggestie";
import { agendaVanBericht, herkenPraktisch, mogelijkeOnveiligheid, mogelijkVerwijt } from "@/lib/communicatie-suggesties";
export const Route = createFileRoute("/berichten")({
    validateSearch: z.object({ concept: z.string().optional(), gesprek: z.string().optional() }),
    head: () => ({
        meta: [
            { title: "Berichten — Ouderschap & Co" },
            {
                name: "description",
                content: "Rustig overleg per onderwerp, met hulp om een bericht neutraler en kindgerichter te formuleren.",
            },
            { property: "og:title", content: "Berichten — Ouderschap & Co" },
            { property: "og:type", content: "website" },
            { name: "twitter:card", content: "summary" },
            {
                property: "og:description",
                content: "Berichten per onderwerp, zodat belangrijke afspraken niet verdwijnen.",
            },
        ],
    }),
    component: BerichtenPagina,
});
function BerichtenPagina() {
    const { t, i18n } = useTranslation();
    const isEn = i18n.language?.startsWith("en");
    const context = Route.useSearch();
    const [actief, setActief] = useState(context.gesprek ?? null);
    const [, forceer] = useState(0);
    const [nieuwOpen, setNieuwOpen] = useState(false);
    const [naam, setNaam] = useState("");
    const [berichtOpen, setBerichtOpen] = useState(false);
    const [concept, setConcept] = useState("");
    useEffect(() => { if (context.concept) {
        setConcept(context.concept);
        setBerichtOpen(true);
    } }, [context.concept]);
    const { koppeling, berichten: mails } = useEmailKoppeling();
    const startSt = useStart();
    const start = () => {
        const n = naam.trim();
        if (!n)
            return;
        if (startSt.eigen) {
            const eid = eigenStart.onderwerpToevoegen(n);
            setNaam("");
            setNieuwOpen(false);
            setActief(eid);
            return;
        }
        const id = `nieuw-${Date.now()}`;
        gesprekken.unshift({
            ...gesprekken[0],
            id,
            onderwerp: n,
            icoon: "💬",
            laatste: "Nog geen berichten",
            laatsteTijd: "Nu",
            ongelezen: 0,
            berichten: [],
        });
        setNaam("");
        setNieuwOpen(false);
        forceer((x) => x + 1);
        setActief(id);
    };
    const vk = useVoorkeuren();
    const [rustOpen, setRustOpen] = useState(false);
    const [zoekOpen, setZoekOpen] = useState(false);
    const [zoek, setZoek] = useState("");
    const [menuVoor, setMenuVoor] = useState(null);
    const zoekActief = zoekOpen && zoek.trim().length > 0;
    const q = zoek.trim().toLowerCase();
    const lijst = gesprekken
        .map((g) => {
        if (!zoekActief)
            return { g, treffer: null };
        if (g.onderwerp.toLowerCase().includes(q) || g.laatsteTijd.toLowerCase().includes(q))
            return { g, treffer: null };
        const b = g.berichten.find((x) => x.tekst.toLowerCase().includes(q) || x.tijd.toLowerCase().includes(q));
        return b ? { g, treffer: `${b.tijd} · ${b.tekst}` } : null;
    })
        .filter((x) => !!x)
        .sort((a, b) => Number(vk.vastgezet.includes(b.g.id)) - Number(vk.vastgezet.includes(a.g.id)));
    const [naOpen, setNaOpen] = useState(false);
    const nuAfstemmen = useNuAfstemmen();
    const topicKeyMap = {
      "Dagelijks": "daily",
      "School": "school",
      "Vakantieplanning": "vacationPlanning",
      "Kosten & betalen": "expensesAndPayment",
      "Afspraken & overleg": "agreementsAndConsultation",
      "Gezondheid": "health"
    };
    const vertaalOnderwerp = (onderwerp) => {
      if (!onderwerp) return "";
      const k = topicKeyMap[onderwerp];
      return k ? t(`messages.topics.${k}`, onderwerp) : onderwerp;
    };

    if (!actief) {
        return (<AppShell>
        <div className="flex items-start gap-2">
          <h1 className="flex-1 font-display text-2xl font-extrabold leading-tight">{t("messages.title", "Berichten")}</h1>
          <button onClick={() => setZoekOpen((o) => !o)} aria-label={t("messages.searchAria", "Zoeken in berichten")} aria-pressed={zoekOpen} className="mt-1 grid size-9 shrink-0 place-items-center rounded-full border border-border text-ink-soft">
            <Search className="size-4" strokeWidth={1.8}/>
          </button>
          <button onClick={() => setRustOpen(true)} aria-label={vk.rustmodus ? t("messages.quietModeActive", "Rustmodus staat aan") : t("messages.quietModeConfigure", "Rustmodus instellen")} className={`relative mt-1 grid size-9 shrink-0 place-items-center rounded-full border ${vk.rustmodus ? "border-brand/40 bg-brand-soft text-brand" : "border-border text-ink-soft"}`}>
            <Moon className="size-4" strokeWidth={1.8}/>
            {vk.rustmodus ? <span aria-hidden="true" className="absolute right-1 top-1 size-1.5 rounded-full bg-brand"/> : null}
          </button>
          <button onClick={() => setNieuwOpen(true)} aria-label={t("messages.newTopic", "Nieuw onderwerp")} className="mt-1 grid size-9 shrink-0 place-items-center rounded-full border border-border text-brand">
            <Plus className="size-4" strokeWidth={1.8}/>
          </button>
        </div>
        <NieuwBericht open={berichtOpen} voorinvul={context.concept} onSluit={() => setBerichtOpen(false)} onStart={(gid, tekst) => { setBerichtOpen(false); setConcept(tekst); forceer((x) => x + 1); setActief(gid); }}/>
        <NuAfstemmenStart open={naOpen} onSluit={() => setNaOpen(false)}/>
        <RustSheet open={rustOpen} onSluit={() => setRustOpen(false)}/>
        {vk.rustmodus ? <p className="mt-1 text-sm text-ink-soft">{t("messages.quietModeNotice", "Rustmodus aan · {{from}} uur – {{to}} uur geen meldingen", { from: vk.rustVan, to: vk.rustTot })}</p> : null}
        {zoekOpen ? (<input autoFocus value={zoek} onChange={(e) => setZoek(e.target.value)} placeholder={t("messages.searchPlaceholder", "Zoek op trefwoord, onderwerp, datum of kind")} aria-label={t("messages.searchAria", "Zoeken in berichten")} className="mt-3 w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm"/>) : null}
        {zoekActief ? null : (<button onClick={() => setNaOpen(true)} className="mt-4 flex w-full items-center gap-3 rounded-md border border-border bg-surface px-3 py-3 text-left">
            <AppIcon functie="afstemmen" maat="sm"/>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">{t("messages.quickCoordination", "Snel iets afstemmen")}</span>
              <span className="block text-xs text-ink-soft">{t("messages.quickCoordinationDesc", "Als iets vandaag geregeld moet worden, zoals een ziek kind of ophalen dat niet lukt")}</span>
            </span>
            <ChevronRight className="size-4 text-ink-soft" strokeWidth={1.8}/>
          </button>)}
        {openNuAfstemmen(nuAfstemmen).map((n) => <NuAfstemmenKaart key={n.id} n={n}/>)}

        {!zoekActief ? (<div className="mt-5">
            <h2 className="font-display text-base font-bold">{t("messages.byTopic", "Berichten per onderwerp")}</h2>
            <p className="text-xs text-ink-soft">{t("messages.byTopicDesc", "Voor gewone berichten en overleg. Zo blijft alles overzichtelijk bij elkaar.")}</p>
          </div>) : null}
        <div className={!zoekActief ? "mt-2.5 space-y-2.5" : "mt-5 space-y-2.5"}>
          {koppeling ? (<button onClick={() => setActief("__email")} className="flex w-full items-center gap-3 rounded-md border border-border bg-card p-3 text-left">
              <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand"><Mail className="size-5" strokeWidth={1.8}/></div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{t("messages.communicationWithOtherParent", "Communicatie met andere ouder")}</p>
                <p className="truncate text-xs text-ink-soft">{t("messages.viaEmail", "Via e-mail · {{text}}", { text: mails[mails.length - 1]?.tekst ?? t("messages.noMessagesYet", "Nog geen berichten") })}</p>
              </div>
            </button>) : null}
          {!koppeling ? (<section className="rounded-lg border border-border bg-card p-4">
              <p className="font-display text-lg font-bold">{t("messages.withOtherParent", "Berichten met de andere ouder")}</p>
              <p className="mt-1 text-sm text-ink-soft">{startSt.uitgenodigd ? t("messages.inviteHintInvited", "De uitnodiging staat klaar. Zodra de andere ouder die accepteert en gekoppeld is, kunnen jullie hier berichten uitwisselen.") : t("messages.inviteHintNotInvited", "Berichten uitwisselen kan zodra de andere ouder is uitgenodigd en gekoppeld.")} {t("messages.prepareHint", "Je kunt alvast een onderwerp en een concept voorbereiden; er wordt nog niets verstuurd.")}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {!startSt.uitgenodigd ? <Link to="/solo" onClick={() => eigenStart.markeer({ uitgenodigd: true })} className="inline-flex min-h-[44px] items-center rounded-xl bg-brand px-4 text-sm font-semibold text-primary-foreground">{t("messages.inviteOtherParent", "Andere ouder uitnodigen")}</Link> : null}
                <button type="button" onClick={() => setNieuwOpen(true)} className="inline-flex min-h-[44px] items-center rounded-xl border border-brand/40 px-4 text-sm font-semibold text-brand hover:bg-brand-soft">{t("messages.newTopicBtn", "+ Nieuw onderwerp")}</button>
              </div>
            </section>) : null}
          {startSt.onderwerpen.map((o) => (<button key={o.id} onClick={() => setActief(o.id)} className="flex w-full items-center gap-3 rounded-md border border-border p-3 text-left">
              <AppIcon functie="berichten" maat="sm"/>
              <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{o.naam}</p><p className="truncate text-xs text-ink-soft">{t("messages.preparedNotSent", "Voorbereid · nog niet verstuurd")}</p></div>
            </button>))}
          {zoekActief && !lijst.length && !startSt.onderwerpen.length ? <p className="py-6 text-center text-sm text-ink-soft">{t("messages.noConversationsFound", 'Geen gesprekken gevonden voor "{{search}}".', { search: zoek.trim() })}</p> : null}
          {!startSt.eigen && lijst.map(({ g, treffer }) => {
                const vast = vk.vastgezet.includes(g.id);
                const stil = isGedempt(vk, g.id);
                return (<div key={g.id} className="relative flex items-center gap-3 rounded-md border border-border p-3">
              <button onClick={() => setActief(g.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-lg">
                  <Pictogram waarde={g.icoon} maat="md" vorm="kaal"/>
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`flex items-center gap-1.5 text-sm ${g.ongelezen > 0 ? "font-bold text-ink" : "font-semibold"}`}>
                    {vast ? <Pin aria-label="Vastgezet" className="size-3 shrink-0 text-ink-soft" strokeWidth={1.8}/> : null}
                    <span className="truncate">{vertaalOnderwerp(g.onderwerp)}</span>
                    {stil ? <BellOff aria-label="Meldingen gedempt" className="size-3 shrink-0 text-ink-soft" strokeWidth={1.8}/> : null}
                  </p>
                  <p className={`truncate text-xs ${g.ongelezen > 0 ? "text-ink" : "text-ink-soft"}`}>{treffer ?? g.laatste}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[11px] text-ink-soft">{g.laatsteTijd}</span>
                  {g.ongelezen > 0 ? <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-semibold text-brand" aria-label={`${g.ongelezen} ongelezen`}>{g.ongelezen}</span> : null}
                </div>
              </button>
              <button onClick={() => setMenuVoor(menuVoor === g.id ? null : g.id)} aria-label={`Opties voor ${g.onderwerp}`} className="grid size-9 shrink-0 place-items-center rounded-full text-ink-soft">
                <MoreHorizontal className="size-4" strokeWidth={1.8}/>
              </button>
              {menuVoor === g.id ? (<div className="absolute right-2 top-12 z-10 w-56 rounded-md border border-border bg-background p-1 text-sm">
                  <button onClick={() => { if (!wisselVastgezet(g.id))
                        bevestig("Maximaal drie gesprekken", { uitleg: "Maak eerst een ander gesprek los." }); setMenuVoor(null); }} className="flex w-full items-center gap-2 rounded px-3 py-2.5 text-left hover:bg-brand-soft">
                    {vast ? <PinOff className="size-4" strokeWidth={1.8}/> : <Pin className="size-4" strokeWidth={1.8}/>}{vast ? t("messages.unpin", "Losmaken") : t("messages.pin", "Vastzetten")}
                  </button>
                  {stil ? (<button onClick={() => { dempGesprek(g.id, null); setMenuVoor(null); }} className="flex w-full items-center gap-2 rounded px-3 py-2.5 text-left hover:bg-brand-soft"><Bell className="size-4" strokeWidth={1.8}/>Meldingen weer aan</button>) : [[8, "8 uur"], [24, "1 dag"], [168, "1 week"]].map(([u, l]) => (<button key={u} onClick={() => { dempGesprek(g.id, u); setMenuVoor(null); bevestig(`Gedempt voor ${l}`, { uitleg: "Spoed en overdrachten komen wel door." }); }} className="flex w-full items-center gap-2 rounded px-3 py-2.5 text-left hover:bg-brand-soft"><BellOff className="size-4" strokeWidth={1.8}/>Meldingen dempen · {l}</button>))}
                </div>) : null}
            </div>);
            })}
        </div>

        <div className="mt-4 rounded-md border border-border p-4">
          <p className="text-sm font-semibold">{t("messages.prepareTopic", "Onderwerp voorbereiden")}</p>
          <p className="mt-1 text-xs text-ink-soft">
            {t("messages.prepareTopicDesc", "Bijvoorbeeld \"Zwemdiploma\", \"Verjaardagsfeest\" of \"Rapportgesprek\".")}
          </p>
          {nieuwOpen ? (<form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); start(); }}>
              <input autoFocus value={naam} onChange={(e) => setNaam(e.target.value)} placeholder={t("messages.topicName", "Naam van het onderwerp")} className="min-w-0 flex-1 rounded-md border bg-background px-3 py-2.5 text-sm"/>
              <button type="submit" disabled={!naam.trim()} className="rounded-md bg-brand px-4 text-sm font-semibold text-white disabled:opacity-50">
                {t("messages.start", "Start")}
              </button>
            </form>) : (<button onClick={() => setNieuwOpen(true)} className="mt-3 w-full rounded-md border border-border bg-card py-2.5 text-sm font-semibold text-brand">
              {t("messages.addTopic", "+ Onderwerp")}
            </button>)}
        </div>
      </AppShell>);
    }
    if (actief === "__email")
        return <EmailGesprek onTerug={() => setActief(null)}/>;
    if (startSt.eigen) {
        const o = startSt.onderwerpen.find((x) => x.id === actief);
        return <Gesprek id={actief} eigen={{ naam: o?.naam ?? "Onderwerp", uitgenodigd: startSt.uitgenodigd }} concept={concept} onTerug={() => { setActief(null); setConcept(""); }}/>;
    }
    return <Gesprek id={actief} concept={concept} onTerug={() => { setActief(null); setConcept(""); }}/>;
}
/** Nieuw bericht: kiest een bevoegde ontvanger + onderwerp/kind en gebruikt het bestaande gesprekkensysteem. */
function NieuwBericht({ open, voorinvul, onSluit, onStart }) {
    const { t } = useTranslation();
    const [ontvanger, setOntvanger] = useState("joris");
    const [onderwerp, setOnderwerp] = useState("nieuw");
    const [nieuwNaam, setNieuwNaam] = useState("");
    const [kind, setKind] = useState("Emma & Noah");
    const [tekst, setTekst] = useState("");
    useEffect(() => { if (voorinvul) {
        setTekst(voorinvul);
        setNieuwNaam("Afspraak gaat niet door");
    } }, [voorinvul]);
    // Alleen ontvangers met toegang tot Berichten. De mediator heeft in deze demo geen toegang tot berichten tussen ouders.
    const ontvangers = [{ id: "joris", label: `${parents.joris.naam} (andere ouder)` }];
    const kan = tekst.trim() && (onderwerp !== "nieuw" || nieuwNaam.trim());
    const start = () => {
        let gid = onderwerp;
        if (onderwerp === "nieuw") {
            gid = `nieuw-${Date.now()}`;
            gesprekken.unshift({ ...gesprekken[0], id: gid, onderwerp: kind === "Emma & Noah" ? nieuwNaam.trim() : `${nieuwNaam.trim()} · ${kind}`, icoon: "💬", laatste: "Nog geen berichten", laatsteTijd: "Nu", ongelezen: 0, berichten: [] });
        }
        onStart(gid, tekst.trim());
        setTekst("");
        setNieuwNaam("");
        setOnderwerp("nieuw");
    };
    const veld = "mt-1 w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm";
    return (<Sheet open={open} onOpenChange={(o) => !o && onSluit()}>
      <SheetContent side="bottom" className="inset-x-0 mx-auto w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-2xl bg-background px-5 pb-8">
        <SheetHeader className="text-left">
          <SheetTitle className="font-display text-xl font-medium">{t("messages.newMessage", "Nieuw bericht")}</SheetTitle>
          <SheetDescription className="text-xs text-ink-soft">{t("messages.newMessageDesc", "Je kunt alleen iemand kiezen die toegang heeft tot Berichten.")}</SheetDescription>
        </SheetHeader>
        <div className="mt-3 space-y-3 text-sm">
          <label className="block"><span className="text-xs font-semibold text-ink-soft">{t("messages.to", "Aan")}</span>
            <select value={ontvanger} onChange={(e) => setOntvanger(e.target.value)} className={veld}>{ontvangers.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select>
          </label>
          <label className="block"><span className="text-xs font-semibold text-ink-soft">{t("messages.subject", "Onderwerp")}</span>
            <select value={onderwerp} onChange={(e) => setOnderwerp(e.target.value)} className={veld}>
              <option value="nieuw">{t("messages.newSubjectOpt", "Nieuw onderwerp…")}</option>
              {gesprekken.map((g) => <option key={g.id} value={g.id}>{g.onderwerp}</option>)}
            </select>
          </label>
          {onderwerp === "nieuw" ? (<>
              <input value={nieuwNaam} onChange={(e) => setNieuwNaam(e.target.value)} placeholder="Bijv. Zwemdiploma" className={veld}/>
              <label className="block"><span className="text-xs font-semibold text-ink-soft">{t("messages.about", "Over")}</span>
                <select value={kind} onChange={(e) => setKind(e.target.value)} className={veld}><option>Emma & Noah</option><option>Emma</option><option>Noah</option></select>
              </label>
            </>) : null}
          <label className="block"><span className="text-xs font-semibold text-ink-soft">{t("messages.message", "Bericht")}</span>
            <textarea value={tekst} onChange={(e) => setTekst(e.target.value)} rows={4} className={`${veld} resize-none`} placeholder={t("messages.writeMessagePlaceholder", "Schrijf je bericht")}/>
          </label>
          <p className="text-[11px] text-ink-soft">{t("messages.newMessageHint", "In het gesprek kun je het nog nalezen en laten herformuleren voordat je verstuurt.")}</p>
          <button disabled={!kan} onClick={start} className="w-full rounded-md bg-brand py-3 text-sm font-semibold text-primary-foreground disabled:opacity-40">{t("messages.continueToConversation", "Verder naar gesprek")}</button>
        </div>
      </SheetContent>
    </Sheet>);
}
const stijlen = ["Rustiger", "Korter", "Neutraler", "Duidelijker", "Meer kindgericht"];
function Gesprek({ id, concept = "", onTerug, eigen }) {
    const { t } = useTranslation();
    // Eigen gezin: alleen het eigen onderwerp, geen voorbeeldgesprek of -deelnemers.
    const gesprek = eigen ? { id, onderwerp: eigen.naam, icoon: "💬", berichten: [] } : gesprekken.find((g) => g.id === id);
    const coach = useServerFn(coachBericht);
    const toonFn = useServerFn(toonBericht);
    const vatSamen = useServerFn(vatGesprekSamen);
    const [samenvatting, setSamenvatting] = useState(null);
    const [vatBezig, setVatBezig] = useState(false);
    const [berichten, setBerichten] = useState(gesprek.berichten);
    const [tekst, setTekst] = useState(concept);
    const conceptSleutel = `onzeapp-concept-${id}`;
    const [conceptGeladen, setConceptGeladen] = useState(false);
    const [conceptHersteld, setConceptHersteld] = useState(false);
    useEffect(() => {
        if (!concept) {
            try {
                const c = localStorage.getItem(conceptSleutel);
                if (c) {
                    setTekst(c);
                    setConceptHersteld(true);
                }
            }
            catch { /* geen opslag */ }
        }
        setConceptGeladen(true);
    }, [conceptSleutel]); // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => {
        if (!conceptGeladen)
            return;
        try {
            if (tekst.trim())
                localStorage.setItem(conceptSleutel, tekst);
            else
                localStorage.removeItem(conceptSleutel);
        }
        catch { /* geen opslag */ }
    }, [tekst, conceptGeladen, conceptSleutel]);
    const [voorstel, setVoorstel] = useState(null);
    const [infoOpen, setInfoOpen] = useState(false);
    const [waarschuwing, setWaarschuwing] = useState(null);
    const [beledigingCheck, setBeledigingCheck] = useState(false);
    const [bezig, setBezig] = useState(false);
    const [fout, setFout] = useState(null);
    const [stijlOpen, setStijlOpen] = useState(false);
    const [actiesVoor, setActiesVoor] = useState(null);
    const vkG = useVoorkeuren();
    const gezinsStart = useStart();
    const suggestieNamen = eigen ? gezinsStart.kinderen.map((k) => k.naam) : ["Emma", "Noah"];
    // Geen geverifieerde gezinsbron beschikbaar; voorbeeldplanning is geen bewijs van akkoord.
    const bevestigd = false;
    const [alGewaarschuwd, setAlGewaarschuwd] = useState(null);
    const analyse = useRef(null);
    const contextVoorCoach = berichten.slice(-6).map((b) => ({ van: b.van === "sanne" ? "ik" : "ander", tekst: b.tekst.slice(0, 1200) }));
    const analyseSleutel = (inhoud) => JSON.stringify([inhoud, contextVoorCoach]);
    const huidigeSleutel = analyseSleutel(tekst);
    const actueleSleutel = useRef(huidigeSleutel);
    actueleSleutel.current = huidigeSleutel;
    const cache = useRef(maakCoachCache());
    const meterCache = useRef(maakCoachCache());
    const schrijfNummer = useRef(0);
    const [traag, setTraag] = useState(false);
    const laatsteStijl = useRef("Rustiger");
    useEffect(() => { if (!bezig) {
        setTraag(false);
        return;
    } const t = setTimeout(() => setTraag(true), 8000); return () => clearTimeout(t); }, [bezig]);
    useEffect(() => { if (!vkG.aiSchrijfhulp) {
        cache.current.wis();
        meterCache.current.wis();
        analyse.current = null;
        schrijfNummer.current++;
        setBezig(false);
        setVoorstel(null);
    } }, [vkG.aiSchrijfhulp]);
    useEffect(() => () => { schrijfNummer.current++; }, []);
    // Pauze bij snel heen-en-weer: kijkt naar het werkelijke patroon van beide kanten (configureerbare regel).
    const [tikken, setTikken] = useState([]);
    const [ruimte, setRuimte] = useState(false);
    const [pauzeTot, setPauzeTot] = useState(null);
    const [nu, setNu] = useState(Date.now());
    useEffect(() => {
        if (!pauzeTot)
            return;
        const t = setInterval(() => { setNu(Date.now()); if (Date.now() >= pauzeTot)
            setPauzeTot(null); }, 1000);
        return () => clearInterval(t);
    }, [pauzeTot]);
    // Communicatiemeter: na een schrijfpauze één check per ongewijzigde tekst, via de bestaande analysecache.
    const meterAan = vkG.rustigerCommuniceren && vkG.aiSchrijfhulp;
    const [meter, setMeter] = useState(null);
    const [meterBezig, setMeterBezig] = useState(false);
    const [fijn, setFijn] = useState(null);
    useEffect(() => {
        if (!meterAan || bezig || tekst.trim().length < 2) {
            setMeterBezig(false);
            return;
        }
        const sleutel = analyseSleutel(tekst);
        if (meter?.sleutel === sleutel)
            return;
        const bekend = analyseVoor(analyse.current, sleutel);
        if (bekend) {
            setMeter({ sleutel, resultaat: bekend });
            return;
        }
        let weg = false;
        const t = setTimeout(async () => {
            setMeterBezig(true);
            try {
                const t2 = await meterCache.current.vraag(sleutel, () => toonFn({ data: { tekst, context: contextVoorCoach } }));
                if (weg)
                    return;
                setMeter({ sleutel, resultaat: t2 });
            }
            catch {
                if (!weg)
                    setMeter({ sleutel, resultaat: null });
            }
            finally {
                if (!weg)
                    setMeterBezig(false);
            }
        }, 600);
        return () => { weg = true; clearTimeout(t); };
    }, [huidigeSleutel, meterAan, bezig]); // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => { if (!fijn)
        return; const t = setTimeout(() => setFijn(null), 1800); return () => clearTimeout(t); }, [fijn]);
    const huidigSignaal = meter && tekst.trim() && meter.sleutel === analyseSleutel(tekst) ? signaalUitBeoordeling(meter.resultaat) : null;
    const huidigeBeoordeling = analyseVoor(analyse.current, huidigeSleutel) ?? (meter?.sleutel === huidigeSleutel ? meter.resultaat : null);
    const afstemmingNodig = huidigeBeoordeling?.afstemming === "overleg" || huidigeBeoordeling?.afstemming === "druk";
    const resterend = pauzeTot ? Math.max(0, pauzeTot - nu) : 0;
    const verstuur = (inhoud, negeerRuimte = false) => {
        if (!inhoud.trim() || pauzeTot || eigen)
            return;
        const nieuw = [...tikken, { van: "sanne", ts: Date.now() }];
        const advies = pauzeAdvies(nieuw);
        if (advies === "pauze" && negeerRuimte) {
            setPauzeTot(Date.now() + pauzeRegel.pauzeMs);
            setNu(Date.now());
            return;
        }
        if (advies !== "geen" && !negeerRuimte) {
            setRuimte(true);
            return;
        }
        setTikken(nieuw);
        setRuimte(false);
        const beoordelingBijVerzenden = analyseVoor(analyse.current, analyseSleutel(inhoud)) ?? (meter?.sleutel === analyseSleutel(inhoud) ? meter.resultaat : null);
        const nieuwId = `n${berichten.length}-${Date.now()}`;
        const nieuweBerichten = [...berichten, { id: nieuwId, van: "sanne", tekst: inhoud.trim(), tijd: "Nu" }];
        const bronGesprek = gesprekken.find((g) => g.id === id);
        if (bronGesprek) {
            bronGesprek.berichten = nieuweBerichten;
            bronGesprek.laatste = inhoud.trim();
            bronGesprek.laatsteTijd = "Nu";
        }
        setBerichten(nieuweBerichten);
        // Pas ná het toevoegen, alleen voor de afzender, alleen bij betrouwbaar rustige/neutrale toon.
        setFijn(meterAan && verdientBevestiging(beoordelingBijVerzenden) ? nieuwId : null);
        schrijfNummer.current++;
        setBezig(false);
        setFout(null);
        setTekst("");
        setVoorstel(null);
        setWaarschuwing(null);
        setBeledigingCheck(false);
    };
    /** Demo: simuleer een snelle reactie van de andere ouder om het patroon te kunnen testen. */
    const demoReactie = () => {
        setTikken((t) => [...t, { van: "joris", ts: Date.now() }]);
        setBerichten((b) => [...b, { id: `r${b.length}`, van: "joris", tekst: "Dat zie ik anders.", tijd: "Nu" }]);
    };
    const probeerVersturen = () => {
        if (!tekst.trim())
            return;
        // Veiligheid gaat altijd voor: lokale dreigingscontrole, ook vóórdat de AI heeft geoordeeld.
        if (mogelijkeOnveiligheid(tekst)) {
            setAlGewaarschuwd(tekst);
            setWaarschuwing({ voorstel: "", methode: "geen", reactieNodig: true, veranderingen: [], openPunten: [], afwijking: false, niveau: "dreigend" });
            return;
        }
        // Duidelijke belediging: direct een lokale bevestiging, zonder op de AI te wachten.
        if (bevatBelediging(tekst) && tekst.trim() !== (alGewaarschuwd ?? "").trim()) {
            setAlGewaarschuwd(tekst);
            setBeledigingCheck(true);
            return;
        }
        const r = analyseVoor(analyse.current, huidigeSleutel) ?? (meter?.sleutel === huidigeSleutel ? meter.resultaat : null);
        // Alleen een bestaande beoordeling benutten. Verzenden wacht nooit op een AI-aanvraag.
        if (meterAan && r && moetWaarschuwen(r, tekst, alGewaarschuwd)) {
            setAlGewaarschuwd(tekst);
            setWaarschuwing({ voorstel: "", methode: "geen", reactieNodig: true, veranderingen: [], openPunten: [], afwijking: false, ...r });
            return;
        }
        verstuur(tekst);
    };
    const herschrijf = async (stijl, alsVoorstel = false, basis) => {
        const bron = basis ?? tekst;
        if (!bron.trim() || !vkG.aiSchrijfhulp)
            return;
        const origineel = bron, sleutel = analyseSleutel(bron);
        const nummer = ++schrijfNummer.current;
        laatsteStijl.current = stijl;
        setStijlOpen(false);
        setBeledigingCheck(false);
        setBezig(true);
        setFout(null);
        try {
            const r = await cache.current.vraag(JSON.stringify([sleutel, stijl, alsVoorstel]), () => coach({ data: { tekst: origineel, stijl, context: contextVoorCoach, alsVoorstel } }));
            if (nummer !== schrijfNummer.current || (actueleSleutel.current !== sleutel && !basis))
                return;
            // De AI beoordeelt het origineel: nooit als beoordeling van het voorstel bewaren.
            analyse.current = { sleutel, resultaat: r };
            setMeter({ sleutel, resultaat: r });
            // Een voorstel dat zelf nog een belediging bevat is geen bruikbaar voorstel: eerlijk melden, niets aanbieden.
            const onbruikbaar = bevatBelediging(r.voorstel);
            setVoorstel({ soort: "schrijven", origineel, tekst: onbruikbaar ? "" : r.voorstel, niveau: r.niveau, reactieNodig: true, veranderingen: onbruikbaar ? [] : r.veranderingen, afwijking: toonAfwijking(r.afwijking, bevestigd), nieuweDetails: r.nieuweDetails, zinvol: onbruikbaar ? false : r.zinvol });
        }
        catch (e) {
            if (nummer === schrijfNummer.current)
                setFout(e instanceof Error ? e.message : "Er ging iets mis.");
        }
        finally {
            if (nummer === schrijfNummer.current)
                setBezig(false);
        }
    };
    /** "Ander voorstel": vraag een variant met de volgende stijl, altijd vanuit de eigen oorspronkelijke tekst. */
    const anderVoorstel = (origineel) => {
        const volgende = stijlen[(stijlen.indexOf(laatsteStijl.current) + 1) % stijlen.length] ?? "Rustiger";
        void herschrijf(volgende, false, origineel);
    };
    /** Hulp bij antwoorden op een ontvangen bericht; gebruikt de bestaande schrijfcoach met gesprekscontext. */
    const helpAntwoorden = async (b, variant = 0) => {
        if (!vkG.aiSchrijfhulp)
            return;
        const nummer = ++schrijfNummer.current;
        const sleutel = actueleSleutel.current;
        setBezig(true);
        setFout(null);
        setActiesVoor(null);
        const i = berichten.findIndex((x) => x.id === b.id);
        const zet = (x) => ({ van: x.van === "sanne" ? "ik" : "ander", tekst: x.tekst });
        const context = berichten.slice(Math.max(0, i - 8), i).map(zet);
        // Alleen wat er ná dit bericht kwam tot het volgende bericht van de ander: dat is jouw reactie hierop.
        const volgendeAnder = berichten.findIndex((x, j) => j > i && x.van !== "sanne");
        const daarna = berichten.slice(i + 1, volgendeAnder === -1 ? i + 9 : Math.min(volgendeAnder, i + 9)).map(zet);
        const gedaan = alGereageerd(daarna);
        try {
            const r = await cache.current.vraag(JSON.stringify([b.tekst, "antwoord", context, daarna, variant]), () => coach({ data: { tekst: b.tekst, stijl: "antwoord", context, daarna, variant } }));
            if (nummer !== schrijfNummer.current || sleutel !== actueleSleutel.current)
                return;
            setVoorstel({ soort: "antwoord", bronId: b.id, variant, origineel: b.tekst, tekst: bevatBelediging(r.voorstel) || mogelijkeOnveiligheid(r.voorstel) ? "" : r.voorstel, niveau: r.niveau, reactieNodig: gedaan ? !!r.voorstel.trim() : r.reactieNodig, alGereageerd: gedaan, openPunten: r.openPunten, nieuweDetails: r.nieuweDetails });
        }
        catch (e) {
            if (nummer === schrijfNummer.current)
                setFout(e instanceof Error ? e.message : "Er ging iets mis.");
        }
        finally {
            if (nummer === schrijfNummer.current)
                setBezig(false);
        }
    };
    return (<AppShell>
      <div className="flex items-center gap-3">
        <button onClick={onTerug} className="knop-kruis size-10 shrink-0" aria-label="Terug">
          <span className="text-lg leading-none">‹</span>
        </button>
        <div>
          <h1 className="font-display text-xl font-extrabold leading-tight"><span className="inline-flex items-center gap-1.5"><Pictogram waarde={gesprek.icoon} maat="sm" vorm="kaal"/>{gesprek.onderwerp}</span></h1>
          <p className="text-xs text-ink-soft">{eigen ? "Concept · de andere ouder is nog niet gekoppeld" : "Sanne & Joris"}</p>
        </div>
      </div>

      <div className="mt-3">
        {eigen || !berichten.length || !vkG.aiSchrijfhulp ? null : samenvatting ? (<div className="rounded-md border border-border bg-card p-3 text-sm">
            <div className="flex items-center justify-between"><p className="text-xs font-semibold text-ink-soft">{t("messages.summaryOnlyForYou", "Samenvatting · alleen voor jou")}</p><button onClick={() => setSamenvatting(null)} className="knop-kruis size-7 text-xs" aria-label="Sluiten">✕</button></div>
            <p className="mt-1 whitespace-pre-line text-ink">{samenvatting}</p>
          </div>) : (<button onClick={async () => { setVatBezig(true); setFout(null); try {
            setSamenvatting(await vatSamen({ data: { berichten: berichten.map((b) => ({ van: b.van === "sanne" ? "Ik" : "Andere ouder", tekst: b.tekst })) } }));
        }
        catch (e) {
            setFout(e instanceof Error ? e.message : "Er ging iets mis.");
        }
        finally {
            setVatBezig(false);
        } }} disabled={vatBezig} className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-ink-soft">
            {vatBezig ? t("messages.summarizing", "Even samenvatten…") : t("messages.summarizeConversation", "Vat dit gesprek samen")}
          </button>)}
      </div>

      <div className="mt-5 space-y-3">
        {berichten.map((b) => {
            const vanMij = b.van === "sanne";
            return (<div key={b.id} className={`flex ${vanMij ? "justify-end" : "justify-start"}`}>
              <div className="min-w-0 max-w-[85%] break-words">
                <div className={`rounded-md px-4 py-2.5 text-sm ${vanMij ? "bg-brand text-primary-foreground" : "border border-border text-ink"}`}>{b.tekst}</div>
                <p className={`mt-1 text-[11px] text-ink-soft ${vanMij ? "text-right" : ""}`}>
                  {(vanMij ? t("messages.you", "Jij") : parents.joris.naam)} · {b.tijd}
                  {" · "}<button type="button" onClick={() => setActiesVoor(actiesVoor === b.id ? null : b.id)} className="font-semibold underline-offset-2 hover:underline">{t("messages.actOnThis", "Hier iets mee doen")}</button>
                  {!vanMij && vkG.aiSchrijfhulp ? <>{" · "}<button type="button" disabled={bezig} onClick={() => helpAntwoorden(b)} className="font-semibold text-brand underline-offset-2 hover:underline">{t("messages.helpMeRespond", "Help me reageren")}</button></> : null}
                </p>
                {!vanMij && mogelijkeOnveiligheid(b.tekst) ? <div className="mt-2 text-sm" role="note"><p className="text-ink">Dit bericht bevat mogelijk bedreigende taal. Je hoeft hier niet direct op te reageren.</p><details className="mt-1 text-xs"><summary className="min-h-11 cursor-pointer text-brand">Hulp en veiligheidsopties</summary><HulpKaart /></details></div> : !vanMij && mogelijkVerwijt(b.tekst) ? <p className="mt-1 text-xs text-ink-soft">Je kunt rustig de tijd nemen om te reageren.</p> : null}
                {actiesVoor === b.id ? (<div className={`mt-1.5 space-y-1 rounded-md border border-border bg-card p-2 text-xs ${vanMij ? "text-right" : ""}`}>
                    {/* Elke keuze opent alleen de bestaande flow met de tekst vooraf ingevuld; de gebruiker vult aan en bevestigt. */}
                    {herkenPraktisch(b.tekst, suggestieNamen)?.zorg ? <Link to="/zorgregeling" search={{ actie: "wijziging", bron: "berichten", omschrijving: b.tekst }} className="block rounded px-2 py-1.5 font-semibold text-brand hover:bg-brand-soft">Wijziging voorstellen</Link> : <Link to="/agenda" search={agendaVanBericht(b.tekst, suggestieNamen)} className="block rounded px-2 py-1.5 font-semibold text-brand hover:bg-brand-soft">Maak afspraak</Link>}
                    <p className="px-2 pb-1 text-[11px] text-ink-soft">{herkenPraktisch(b.tekst, suggestieNamen)?.persoonlijk ? "Alleen voor je eigen agenda. Controleer de gegevens." : "Wordt eerst een voorstel. Pas na samen akkoord staat het als afspraak vast."}</p>
                    <Link to="/taken" search={{ taak: b.tekst, berichtId: b.id, gesprekId: id }} className="block rounded px-2 py-1.5 font-semibold text-ink hover:bg-brand-soft">{t("messages.asTask", "Als taak")}</Link>
                    <Link to="/kosten" search={{ uitgave: b.tekst.slice(0, 200) }} className="block rounded px-2 py-1.5 font-semibold text-ink hover:bg-brand-soft">{t("messages.asExpense", "Als kosten")}</Link>
                    <Link to="/afspraken" search={{ nieuw: "afspraak", bron: b.tekst }} className="block rounded px-2 py-1.5 font-semibold text-ink hover:bg-brand-soft">{t("messages.recordThis", "Leg dit vast")}</Link>
                    {vindDeadline(b.tekst) ? <Link to="/taken" search={{ taak: b.tekst.slice(0, 60), deadline: vindDeadline(b.tekst) }} className="block rounded px-2 py-1.5 font-semibold text-brand hover:bg-brand-soft">{t("messages.saveDeadline", "Deadline opslaan")}</Link> : null}
                  </div>) : null}
              </div>
            </div>);
        })}
      </div>

      {waarschuwing && !voorstel ? (<div className={`mt-4 rounded-md border p-4 ${waarschuwing.niveau === "licht" ? "border-border bg-card" : "border-accent-warm bg-accent-warm/20"}`}>
          {waarschuwing.niveau === "geen" ? null : waarschuwing.niveau !== "dreigend" ? (<>
              <p className="font-semibold">Even anders formuleren?</p>
              <p className="mt-1 text-sm text-ink-soft">Dit bericht kan wellicht voor meer spanning zorgen. Wil je bekijken hoe je dezelfde boodschap rustiger kunt overbrengen?</p>
            </>) : (<>
              <p className="font-semibold">Dit bericht bevat taal die als dreigend kan worden ervaren.</p>
              <p className="mt-1 text-sm text-ink-soft">Een vriendelijkere formulering is niet altijd genoeg. Bij direct gevaar bel je 112.</p>
            </>)}
          {waarschuwing.afwijking ? <div className={waarschuwing.niveau === "geen" ? "" : "mt-3"}><AfwijkingHint /></div> : null}
          <div className="mt-3 flex flex-col gap-2">
            {waarschuwing.niveau === "geen" ? null : <button onClick={() => herschrijf("Rustiger")} className="flex items-center justify-center gap-1.5 rounded-md bg-brand py-2.5 text-sm font-semibold text-primary-foreground"><AppIcon functie="slim" maat="sm" vorm="kaal"/>Bekijk voorstel</button>}
            <div className="flex gap-2">
              <button onClick={() => verstuur(tekst)} className="flex-1 rounded-md border border-border py-2.5 text-sm font-semibold text-ink-soft">Toch versturen</button>
              <button onClick={() => setWaarschuwing(null)} className="flex-1 rounded-md border border-border py-2.5 text-sm font-semibold">Terug naar bericht</button>
            </div>
          </div>
          {waarschuwing.niveau === "dreigend" ? <div className="mt-3"><HulpKaart /></div> : null}
        </div>) : null}

      {beledigingCheck && !voorstel ? (<div className="mt-4 rounded-md border border-border bg-card p-4" role="alertdialog" aria-label="Bevestiging voor verzenden">
          <p className="font-semibold">Wil je dit zo versturen?</p>
          <p className="mt-1 text-sm text-ink-soft">Je bericht bevat een belediging. Dit kan het contact met de andere ouder moeilijker maken.</p>
          <p className="mt-2 rounded-md bg-muted p-2.5 text-sm text-ink">{tekst}</p>
          <div className="mt-3 flex flex-col gap-2">
            <button onClick={() => herschrijf("Rustiger")} className="flex items-center justify-center gap-1.5 rounded-md bg-brand py-2.5 text-sm font-semibold text-primary-foreground"><AppIcon functie="slim" maat="sm" vorm="kaal"/>Help me formuleren</button>
            <button onClick={() => setBeledigingCheck(false)} className="rounded-md border border-border py-2.5 text-sm font-semibold">Terug naar bericht</button>
            <button onClick={() => verstuur(tekst)} className="py-1.5 text-xs text-ink-soft underline-offset-2 hover:underline">Toch versturen</button>
          </div>
        </div>) : null}

      {voorstel ? (<div className="mt-4 space-y-3 rounded-md border border-brand/20 bg-brand-soft p-4">
          <div className="flex items-start justify-between gap-2">
            <p className="flex items-center gap-1.5 font-display text-base font-semibold"><AppIcon functie="slim" maat="sm" vorm="kaal"/>Hulp bij formuleren</p>
            <button type="button" onClick={() => setInfoOpen((o) => !o)} aria-label="Over deze schrijfhulp" className="text-ink-soft"><Info className="size-4"/></button>
          </div>
          <p className="text-xs text-ink-soft">We helpen je om je boodschap duidelijk en rustig over te brengen. Jouw eigen tekst blijft altijd bewaard.</p>
          {infoOpen ? (<p className="rounded-md bg-card p-2.5 text-[11px] text-ink-soft">
              De hulp gebruikt twee bekende methoden van Bill Eddy (High Conflict Institute). <strong>BIFF</strong>: kort, feitelijk, vriendelijk en duidelijk. <strong>EAR</strong>: begrip, aandacht en respect. Je inhoud en grenzen blijven van jou.
            </p>) : null}
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">{voorstel.soort === "antwoord" ? "Ontvangen bericht" : "Jouw tekst"}</p>
          <p className="-mt-2 text-sm text-ink-soft">{voorstel.origineel}</p>
          {voorstel.niveau === "dreigend" ? (<div className="space-y-2">
              <p className="text-sm text-ink">{voorstel.soort === "antwoord" ? "Dit bericht bevat taal die als dreigend kan worden ervaren. Je hoeft hier niet op te reageren. Je veiligheid gaat voor." : "Je bericht bevat taal die als dreigend kan worden ervaren. Wil je dat we helpen de boodschap rustig over te brengen?"}</p>
              <HulpKaart />
            </div>) : null}
          {voorstel.alGereageerd ? (<p className="rounded-md bg-muted p-2.5 text-sm font-semibold text-ink">Je hebt hier al op gereageerd.{voorstel.tekst.trim() ? " Hieronder staat wellicht een kleine aanvulling." : " Een aanvulling lijkt niet nodig."}</p>) : null}
          {voorstel.soort === "schrijven" && (!heeftHerformulering(voorstel.origineel, voorstel.tekst) || voorstel.zinvol === false) ? (<div className="space-y-3">
              <p className="text-sm font-semibold text-ink">{voorstel.nieuweDetails?.length ? "De schrijfhulp kon geen passend voorstel maken." : voorstel.niveau === "geen" && !afstemmingNodig ? "Je bericht is al duidelijk geformuleerd." : "De schrijfhulp heeft geen passende andere formulering gevonden."}</p>
              <p className="text-sm text-ink-soft">{voorstel.nieuweDetails?.length ? "Het resultaat bevatte details die niet in jullie gesprek staan. Je oorspronkelijke bericht blijft behouden." : "Er is geen betekenisvolle andere formulering gevonden. De toon en eventuele afstemming over de inhoud zijn verschillende dingen; jouw wens blijft behouden."}</p>
              {voorstel.afwijking ? <AfwijkingHint /> : null}
              <Button variant="outline" onClick={() => { setVoorstel(null); setWaarschuwing(null); }} className="h-auto w-full whitespace-normal py-2.5">Verder met mijn bericht</Button>
            </div>) : voorstel.soort === "antwoord" && voorstel.alGereageerd && !voorstel.tekst.trim() ? (<button onClick={() => setVoorstel(null)} className="w-full rounded-md bg-brand py-2.5 text-sm font-semibold text-primary-foreground">Sluiten</button>) : voorstel.soort === "antwoord" && !voorstel.reactieNodig && !voorstel.toonToch ? (<div className="space-y-2">
              <p className="text-sm text-ink">Reageren lijkt nu niet nodig. Je kunt het gesprek ook even laten rusten.</p>
              <div className="flex gap-2">
                <button onClick={() => setVoorstel(null)} className="flex-1 rounded-md bg-brand py-2.5 text-sm font-semibold text-primary-foreground">Laten rusten</button>
                {voorstel.tekst.trim() ? <button onClick={() => setVoorstel({ ...voorstel, toonToch: true })} className="flex-1 rounded-md border border-border bg-card py-2.5 text-sm font-semibold">Toch een antwoord</button> : null}
              </div>
            </div>) : voorstel.tekst.trim() ? (<>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wider text-brand">{voorstel.soort === "antwoord" ? (voorstel.alGereageerd ? "Voorstel voor een aanvulling" : "Voorstel voor je antwoord") : "Voorgestelde tekst"}</span>
                <textarea value={voorstel.tekst} onChange={(e) => setVoorstel({ ...voorstel, tekst: e.target.value })} rows={4} className="mt-1 w-full resize-none rounded-md border border-border bg-card p-2.5 text-sm text-ink outline-none"/>
              </label>
              {voorstel.veranderingen?.length ? (<div>
                  <p className="text-xs font-semibold text-ink-soft">Wat is er veranderd</p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-ink-soft">{voorstel.veranderingen.slice(0, 3).map((v) => <li key={v}>{v}</li>)}</ul>
                </div>) : null}
              {voorstel.openPunten?.length ? (<div className="rounded-md bg-card p-2.5">
                  <p className="text-xs font-semibold text-ink">Nog niet beantwoord in dit voorstel</p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-ink-soft">{voorstel.openPunten.map((v) => <li key={v}>{v}</li>)}</ul>
                  <p className="mt-1 text-[11px] text-ink-soft">Vul dit zelf aan als je dat wilt. De hulp zegt niets toe namens jou.</p>
                </div>) : null}
              {voorstel.nieuweDetails?.length ? (<p className="rounded-md bg-card p-2.5 text-xs text-ink">Let op: {voorstel.nieuweDetails.map((d) => `"${d}"`).join(", ")} staat niet in jullie gesprek. Controleer of dit klopt.</p>) : null}
              {voorstel.afwijking ? <AfwijkingHint /> : null}
              <div className="flex flex-col gap-2">
                <Button onClick={() => {
                    const inhoud = voorstel.tekst;
                    setTekst(inhoud);
                    // Een al gecontroleerd en bewust overgenomen voorstel niet opnieuw laten herschrijven.
                    if (voorstel.soort === "schrijven" && analyseVoor(analyse.current, analyseSleutel(inhoud)) && !voorstel.nieuweDetails?.length) {
                        setAlGewaarschuwd(inhoud);
                    }
                    setVoorstel(null);
                    setWaarschuwing(null);
                }} className="h-auto min-h-11 w-full whitespace-normal py-2.5">{voorstel.soort === "antwoord" ? "Gebruik dit antwoord" : "Gebruik dit voorstel"}</Button>
                <div className="flex gap-2">
                  {voorstel.soort === "schrijven" ? <button disabled={bezig} onClick={() => anderVoorstel(voorstel.origineel)} className="flex-1 rounded-md border border-border bg-card py-2.5 text-sm font-semibold text-brand disabled:opacity-50">{bezig ? "Even kijken…" : "Ander voorstel"}</button> : null}
                  {voorstel.soort === "antwoord" ? <Button variant="outline" disabled={bezig} onClick={() => { const bron = berichten.find((b) => b.id === voorstel.bronId); if (bron)
                void helpAntwoorden(bron, Math.min(100, (voorstel.variant ?? 0) + 1)); }} className="h-auto min-h-11 flex-1 whitespace-normal">Ander voorstel</Button> : null}
                  <button onClick={() => { if (voorstel.soort === "schrijven")
                setTekst(voorstel.origineel); setVoorstel(null); }} className="flex-1 rounded-md border border-border bg-card py-2.5 text-sm font-semibold text-ink-soft">{voorstel.soort === "antwoord" ? "Terug" : "Terug naar mijn tekst"}</button>
                </div>
              </div>
            </>) : (<button onClick={() => setVoorstel(null)} className="w-full rounded-md border border-border bg-card py-2.5 text-sm font-semibold">Sluiten</button>)}
          <p className="text-[11px] text-ink-soft">Er wordt niets vanzelf verstuurd: het voorstel komt in je schrijfvak en jij beslist. {eigen ? "De andere ouder" : "Joris"} ziet niet dat je hulp hebt gebruikt, Co legt geen afspraken vast. Je concept blijft op dit apparaat bewaard.</p>
        </div>) : null}


      {ruimte && !pauzeTot ? (<div className="mt-4 rounded-md border border-border bg-card p-4">
          <p className="font-semibold">Even ruimte nemen?</p>
          <p className="mt-1 text-sm text-ink-soft">Er worden in korte tijd veel berichten over en weer gestuurd. Wellicht helpt het om dit gesprek even te laten rusten.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={() => { setRuimte(false); }} className="rounded-md bg-brand px-4 py-2 text-xs font-semibold text-primary-foreground">Later verder</button>
            <button onClick={() => setRuimte(false)} className="rounded-md border border-border px-4 py-2 text-xs font-semibold">Bericht nog eens bekijken</button>
            <button onClick={() => { setRuimte(false); setStijlOpen(true); }} className="rounded-md border border-border px-4 py-2 text-xs font-semibold text-brand">Rustiger formuleren</button>
            <button onClick={() => { setRuimte(false); verstuur(tekst, true); }} className="px-2 py-2 text-xs text-ink-soft">Toch versturen</button>
          </div>
        </div>) : null}

      {pauzeTot ? (<div className="mt-4 rounded-md border border-border bg-brand-soft p-4" role="status">
          <p className="font-semibold">Dit gesprek heeft even pauze</p>
          <p className="mt-1 text-sm text-ink-soft">Over {Math.floor(resterend / 60000)}:{String(Math.floor((resterend % 60000) / 1000)).padStart(2, "0")} kun je hier weer verder. Je kunt je bericht ondertussen rustig afmaken.</p>
          <p className="mt-2 text-xs text-ink-soft">Iets dringends of onveilig? Vastleggen en hulp zoeken blijft altijd mogelijk.</p>
          <div className="mt-2"><HulpKaart /></div>
        </div>) : null}

      <div className="relative mt-4 rounded-lg border border-border p-3">
        {vkG.aiSchrijfhulp ? <EvenMeedenken gesprekId={id} eigen={!!eigen} huidigConcept={tekst} onOvernemen={(t) => { schrijfNummer.current++; setBezig(false); setVoorstel(null); setWaarschuwing(null); setBeledigingCheck(false); setTekst(t); }}/> : null}
        {fijn ? <FijnGecommuniceerd key={fijn}/> : null}
        <textarea aria-label="Schrijf een bericht" value={tekst} onChange={(e) => { schrijfNummer.current++; setBezig(false); setVoorstel(null); setWaarschuwing(null); setBeledigingCheck(false); setTekst(e.target.value); }} rows={3} placeholder="Schrijf een bericht…" className="w-full resize-none bg-transparent px-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring placeholder:text-ink-soft/70"/>
        {meterAan ? <Communicatiemeter signaal={huidigSignaal} bezig={meterBezig}/> : null}
        <CommunicatieSuggestie concept={tekst} berichten={berichten} namen={suggestieNamen} gesprekId={id} veiligheid={huidigeBeoordeling?.niveau === "dreigend" || huidigeBeoordeling?.afstemming === "druk" || waarschuwing?.niveau === "dreigend" || voorstel?.niveau === "dreigend" || mogelijkeOnveiligheid(tekst)} verwerkt={bezig || !!voorstel || stijlOpen || !!waarschuwing || ruimte || !!pauzeTot} onAanvullen={(t) => { schrijfNummer.current++; setTekst(t); }}/>
        {afstemmingNodig && !signaalVraagtHerformulering(huidigSignaal) && !voorstel ? <div className="mt-1 px-1 text-xs text-ink-soft"><p>Dit onderwerp vraagt wellicht om afstemming.</p><Button variant="link" disabled={bezig} onClick={() => herschrijf("Duidelijker", true)} className="h-auto whitespace-normal p-0 text-xs">Help mij dit als voorstel te formuleren →</Button></div> : signaalVraagtHerformulering(huidigSignaal) && !voorstel ? <Button variant="link" disabled={bezig} onClick={() => herschrijf("Rustiger")} className="mt-1 h-auto px-1 text-xs text-accent-foreground">Bekijk een andere formulering</Button> : null}
        {stijlOpen ? (<div className="mt-2 flex flex-wrap gap-2">
            {stijlen.map((s) => (<button key={s} onClick={() => herschrijf(s)} className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-brand">{s}</button>))}
          </div>) : null}
        {fout || traag ? <div className="mt-2 text-xs text-ink"><p>{fout ?? "De schrijfhulp heeft meer tijd nodig. Je bericht blijft bewaard."}</p><div className="mt-2 flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => { schrijfNummer.current++; cache.current.wis(); herschrijf(laatsteStijl.current, afstemmingNodig); }}>Opnieuw proberen</Button>{!eigen ? <Button size="sm" onClick={probeerVersturen}>Gewoon versturen</Button> : null}</div></div> : null}
        {conceptHersteld && tekst.trim() ? (<p className="mt-1 px-1 text-[11px] text-ink-soft">
            Je concept is bewaard. <button type="button" onClick={() => { setTekst(""); setConceptHersteld(false); }} className="font-semibold text-brand">Opnieuw beginnen</button>
          </p>) : null}
        <div className="mt-2 flex items-center gap-2">
          {vkG.aiSchrijfhulp ? <button disabled={bezig || !tekst.trim()} onClick={() => setStijlOpen((o) => !o)} aria-expanded={stijlOpen} className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-border bg-card/70 py-2.5 text-xs font-semibold text-brand disabled:opacity-50">
            <AppIcon functie="slim" maat="sm" vorm="kaal"/>{bezig ? "Even kijken…" : "Help met formuleren"}
          </button> : <span className="flex-1"/>}
          {eigen ? <button disabled={!tekst.trim()} onClick={() => { setConceptHersteld(true); bevestig("Concept bewaard", { uitleg: "Bewaard op dit apparaat." }); }} className="rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">Concept bewaren</button> : <Button disabled={!tekst.trim() || !!pauzeTot} onClick={probeerVersturen}>
            Versturen
          </Button>}
        </div>
      </div>
      {eigen ? (<div className="mt-3 rounded-md border border-border bg-card p-3 text-sm">
          <p className="text-ink-soft">Je concept wordt bewaard op dit apparaat. Versturen kan zodra de andere ouder is uitgenodigd en gekoppeld.</p>
          {!eigen.uitgenodigd ? <Link to="/solo" onClick={() => eigenStart.markeer({ uitgenodigd: true })} className="mt-2 inline-flex min-h-[44px] items-center font-semibold text-brand">Andere ouder uitnodigen ›</Link> : null}
        </div>) : import.meta.env.DEV ? <button onClick={demoReactie} className="mt-3 text-[11px] text-ink-soft underline">Demo: snelle reactie van de andere ouder</button> : null}
    </AppShell>);
}
/** Compact venster voor de bestaande rustmodus; geen omweg via Instellingen. */
function RustSheet({ open, onSluit }) {
    const { t } = useTranslation();
    const vk = useVoorkeuren();
    const veld = "mt-1 w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm";
    return (<Sheet open={open} onOpenChange={(o) => !o && onSluit()}>
      <SheetContent side="bottom" className="inset-x-0 mx-auto w-full max-w-md rounded-t-2xl bg-background px-5 pb-8">
        <SheetHeader className="text-left">
          <SheetTitle className="font-display text-xl font-medium">{t("messages.quietModeSheet.title", "Rustmodus")}</SheetTitle>
          <SheetDescription className="text-xs text-ink-soft">{t("messages.quietModeSheet.desc", "Binnen deze tijden krijg je geen meldingen over berichten. Nu afstemmen en overdrachten komen wel door.")}</SheetDescription>
        </SheetHeader>
        <label className="mt-4 flex items-center justify-between gap-3 text-sm font-semibold">
          {t("messages.quietModeSheet.enable", "Rustmodus aan")}
          <input type="checkbox" checked={vk.rustmodus} onChange={() => zetVoorkeur("rustmodus", !vk.rustmodus)} className="size-5 accent-[var(--brand)]"/>
        </label>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="block text-xs font-semibold text-ink-soft">{t("messages.quietModeSheet.from", "Vanaf")}<input type="time" value={vk.rustVan} onChange={(e) => e.target.value && zetVoorkeur("rustVan", e.target.value)} className={veld}/></label>
          <label className="block text-xs font-semibold text-ink-soft">{t("messages.quietModeSheet.to", "Tot")}<input type="time" value={vk.rustTot} onChange={(e) => e.target.value && zetVoorkeur("rustTot", e.target.value)} className={veld}/></label>
        </div>
        <button onClick={onSluit} className="mt-5 w-full rounded-md bg-brand py-3 text-sm font-semibold text-primary-foreground">{t("common.done", "Klaar")}</button>
      </SheetContent>
    </Sheet>);
}
/** Neutrale hint: blokkeert niets, geeft geen oordeel of juridisch advies. */
function AfwijkingHint() {
    const { t } = useTranslation();
    return (<div className="rounded-md border border-border bg-card p-3">
      <p className="text-sm text-ink">{t("messages.deviationHint.title", "Dit lijkt wellicht af te wijken van jullie afspraak. Wil je er een voorstel van maken?")}</p>
      <p className="mt-1 text-[11px] text-ink-soft">{t("messages.deviationHint.desc", "Een inschatting van de schrijfhulp, geen vaststelling. Er verandert niets aan jullie afspraken.")}</p>
      <Link to="/zorgregeling" search={{ actie: "wijziging", bron: "berichten" }} className="mt-2 inline-flex rounded-md border border-border px-3 py-2 text-xs font-semibold text-brand">{t("messages.deviationHint.action", "Maak er een voorstel van")}</Link>
    </div>);
}
