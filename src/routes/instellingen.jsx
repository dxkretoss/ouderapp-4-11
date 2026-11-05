import { Button } from "@/components/ui/button";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CreditCard, UsersRound } from "lucide-react";
import { useVoorkeuren, zetVoorkeur } from "@/lib/voorkeuren-store";
import { apparaatOndersteunt, registreerSlot } from "@/lib/app-slot";
import { AppShell, Card, PageHeader } from "@/components/AppShell";
import { LanguageSelector } from "@/components/LanguageSelector";
import { parents } from "@/lib/demo-data";
import { setCheckinAan, toonVoorbeeld, useCheckin } from "@/lib/checkin-store";
import { regioLabel, regioUitleg, useRegio, zetRegio } from "@/lib/schoolvakanties";
export const Route = createFileRoute("/instellingen")({
    head: () => ({
        meta: [
            { title: "Instellingen — Ouderschap & Co" },
            { name: "description", content: "Beheer je profiel, meldingen, rustmomenten en privacy." },
            { property: "og:title", content: "Instellingen — Ouderschap & Co" },
            { property: "og:description", content: "Stel Ouderschap & Co in zoals het voor jou werkt." },
            { property: "og:type", content: "website" },
            { name: "twitter:card", content: "summary" },
        ],
    }),
    component: Instellingen,
});
function Schakelaar({ label }) {
    return <div className="flex w-full items-center justify-between gap-3 py-3 text-left"><p className="text-sm font-semibold">{label}</p><span className="text-xs text-ink-soft">Nog niet beschikbaar</span></div>;
}
function Keuze({ opties, waarde, onKies }) {
    return (<div className="space-y-2">
      {opties.map(([id, titel, uitleg]) => (<button key={id} onClick={() => onKies(id)} className={`flex w-full items-start gap-3 rounded-md border px-3 py-3 text-left ${waarde === id ? "border-brand bg-brand-soft/60" : "border-border"}`}>
          <span className={`mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border ${waarde === id ? "border-brand" : "border-ink-soft/40"}`}>
            {waarde === id ? <span className="size-2 rounded-full bg-brand"/> : null}
          </span>
          <span><span className="block text-sm font-semibold">{titel}</span><span className="block text-xs text-ink-soft">{uitleg}</span></span>
        </button>))}
    </div>);
}
function Wissel({ label, uitleg, aan, onWissel, uit }) {
    return (<button onClick={onWissel} disabled={uit} role="switch" aria-checked={aan} className="flex w-full items-center justify-between gap-3 py-3 text-left disabled:opacity-50">
      <div>
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-xs text-ink-soft">{uitleg}</p>
      </div>
      <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${aan ? "bg-brand" : "bg-border"}`}>
        <span className={`absolute top-0.5 size-5 rounded-full bg-card transition-all ${aan ? "left-5" : "left-0.5"}`}/>
      </span>
    </button>);
}
function Instellingen() {
    const { t } = useTranslation();
    const vk = useVoorkeuren();
    const [slotMogelijk, setSlotMogelijk] = useState(null);
    const [slotMelding, setSlotMelding] = useState(null);
    useEffect(() => { apparaatOndersteunt().then(setSlotMogelijk); }, []);
    const wisselSlot = async () => {
        setSlotMelding(null);
        if (vk.vergrendelId) {
            zetVoorkeur("vergrendelId", null);
            return;
        }
        try {
            zetVoorkeur("vergrendelId", await registreerSlot());
            sessionStorage.setItem("onzeapp-ontgrendeld", "1");
            setSlotMelding("App vergrendelen staat aan.");
        }
        catch {
            setSlotMelding("Het instellen is niet gelukt of werd geannuleerd.");
        }
    };
    const s = parents.sanne;
    const checkin = useCheckin();
    const [gebruik, setGebruik] = useState("samen");
    const regio = useRegio();
    return (<AppShell>
      <PageHeader titel={t("navbar.settings", t("menu.sections.settings", "Instellingen"))}/>
      <h2 className="mt-5 font-display font-bold">{t("language.title", "Taal / Language")}</h2>
      <Card className="mt-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">{t("menu.language", "Taal wijzigen")}</p>
          <p className="text-xs text-ink-soft">Nederlands & English</p>
        </div>
        <LanguageSelector />
      </Card>
      <Link to="/exporteren" className="mt-5 flex items-center justify-between border-y border-border py-3.5">
        <span><span className="block text-sm font-semibold">{t("menu.exportLink", "Overzicht bewaren of delen")}</span><span className="block text-xs text-ink-soft">{t("menu.exportDesc", "Gegevens & export · feitelijk PDF-overzicht")}</span></span>
        <span aria-hidden className="text-lg text-ink-soft">›</span>
      </Link>
      <Card className="mt-6 flex items-center gap-4">
        <img src={s.avatar} alt={s.naam} className="size-16 rounded-md object-cover"/>
        <div>
          <p className="font-display text-lg font-bold">{s.volledigeNaam}</p>
          <p className="text-xs text-ink-soft">{s.rol} · gekoppeld aan {parents.joris.volledigeNaam}</p>
        </div>
      </Card>
      <h2 className="mt-6 font-display font-bold">Gezin & toegang</h2>
      <Link to="/kinderen" className="mt-3 flex min-h-[44px] items-center justify-between border-y border-border py-3.5">
        <span><span className="block text-sm font-semibold">Gezin beheren</span><span className="block text-xs text-ink-soft">Kinderen en belangrijke personen aanvullen</span></span>
        <span aria-hidden className="text-lg text-ink-soft">›</span>
      </Link>
      <Link to="/gezag" className="flex min-h-11 items-center justify-between border-b border-border py-3.5">
        <span><span className="block text-sm font-semibold">Gezag & toegang</span><span className="block text-xs text-ink-soft">Gezagsinformatie en bestaande instellingen per kind</span></span>
        <span aria-hidden className="text-lg text-brand">›</span>
      </Link>
      <Card className="mt-3">
        <div className="flex items-start gap-3">
          <UsersRound className="mt-0.5 size-5 shrink-0 text-brand" strokeWidth={1.6}/>
          <div className="flex-1">
            <p className="text-sm font-semibold">Gebruik van de app</p>
            <p className="text-xs text-ink-soft">Kies of jullie samen werken of dat je de app voor jezelf gebruikt.</p>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          {[
            ["samen", "Samen gebruiken", "Jullie beheren de gezinsomgeving samen."],
            ["alleen", "Alleen gebruiken", "Alles blijft privé; later uitnodigen kan altijd."],
        ].map(([id, titel, uitleg]) => (<button key={id} onClick={() => setGebruik(id)} className={`flex w-full items-start gap-3 rounded-md border px-3 py-3 text-left ${gebruik === id ? "border-brand bg-brand-soft/60" : "border-border"}`}>
              <span className={`mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border ${gebruik === id ? "border-brand" : "border-ink-soft/40"}`}>
                {gebruik === id ? <span className="size-2 rounded-full bg-brand"/> : null}
              </span>
              <span><span className="block text-sm font-semibold">{titel}</span><span className="block text-xs text-ink-soft">{uitleg}</span></span>
            </button>))}
        </div>
        <Link to="/solo" className="mt-3 inline-block text-xs font-semibold text-brand">Bekijk persoonlijke functies →</Link>
        <Link to="/solo" hash="email-koppeling" className="mt-1 block text-xs font-semibold text-brand">E-mailkoppeling →</Link>
      </Card>
      <h2 className="mt-6 font-display font-bold">Weergave</h2>
      <Link to="/extra-ondersteuning" className="mt-3 flex min-h-11 items-center justify-between gap-3 border-y border-border py-3.5"><span><span className="block text-sm font-semibold">Extra houvast</span><span className="block text-xs text-ink-soft">{vk.extraHouvast ? "Aan" : "Uit"} · jouw weergave en opties voor Co</span></span><span aria-hidden className="text-lg text-brand">›</span></Link>
      <Card className="mt-3">
        <p className="mb-3 text-xs text-ink-soft">Thema</p>
        <Keuze waarde={vk.thema} onKies={(t) => zetVoorkeur("thema", t)} opties={[
            ["licht", "Licht", "Ivoor en salie, zoals je gewend bent."],
            ["donker", "Donker", "Warm en gedempt, rustig voor de ogen in de avond."],
            ["automatisch", "Automatisch", "Volgt de instelling van je apparaat."],
        ]}/>
      </Card>
      <Card className="mt-3">
        <p className="mb-2 text-xs text-ink-soft">Dynamische Home — de bovenkant van Home beweegt rustig mee met tijdstip, weer en bijzondere dagen. Je overzicht blijft altijd op dezelfde plek.</p>
        <Wissel label="Dynamische Home" uitleg="Begroeting en sfeer passen zich aan het moment aan" aan={vk.livingHome} onWissel={() => zetVoorkeur("livingHome", !vk.livingHome)}/>
        {vk.livingHome && <>
          <Wissel label="Weereffecten" uitleg="Een zacht weerbeeld en klein weertekentje" aan={vk.weerEffecten} onWissel={() => zetVoorkeur("weerEffecten", !vk.weerEffecten)}/>
          <Wissel label="Seizoenseffecten" uitleg="Iets frissere of warmere tinten per seizoen" aan={vk.seizoenEffecten} onWissel={() => zetVoorkeur("seizoenEffecten", !vk.seizoenEffecten)}/>
          <Wissel label="Bijzondere momenten" uitleg="Verjaardag van een kind en wisseldagen" aan={vk.bijzondereMomenten} onWissel={() => zetVoorkeur("bijzondereMomenten", !vk.bijzondereMomenten)}/>
          <p className="mb-2 mt-3 text-xs text-ink-soft">Beweging</p>
          <Keuze waarde={vk.beweging} onKies={(b) => zetVoorkeur("beweging", b)} opties={[
                ["automatisch", "Automatisch", "Volgt je apparaat; minder beweging als je dat daar hebt ingesteld."],
                ["verminderd", "Verminderd", "Geen vallende regen, sneeuw of confetti."],
            ]}/>
          <label className="mt-3 block text-xs text-ink-soft">Weer voor
            <input defaultValue={vk.weerPlaats} onBlur={(e) => zetVoorkeur("weerPlaats", e.target.value.trim() || "Haarlem")} className="mt-1 block w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-ink"/>
          </label>
          <p className="mt-1 text-[11px] text-ink-soft">Alleen deze plaats wordt gebruikt. Geen GPS, geen locatiegeschiedenis.</p>
        </>}
      </Card>
      <h2 className="mt-6 font-display font-bold">Abonnement</h2>
      <Link to="/abonnement" className="mt-3 flex items-center gap-3 rounded-lg border border-border bg-card p-4">
        <CreditCard className="size-5 shrink-0 text-brand" strokeWidth={1.6}/>
        <span className="flex-1"><span className="block text-sm font-semibold">Abonnement</span><span className="block text-xs text-ink-soft">Huidig abonnement, opzeggen en account</span></span>
        <span aria-hidden className="text-lg text-ink-soft">›</span>
      </Link>
      <h2 className="mt-6 font-display font-bold">Juridisch & privacy</h2>
      <Link to="/privacy" className="mt-3 flex items-center justify-between rounded-lg border border-border bg-card p-4">
        <span><span className="block text-sm font-semibold">Wie ziet wat</span><span className="block text-xs text-ink-soft">In één overzicht wie welke informatie mag zien</span></span>
        <span aria-hidden className="text-lg text-ink-soft">›</span>
      </Link>
      <Link to="/juridisch" className="mt-3 flex items-center justify-between rounded-lg border border-border bg-card p-4">
        <span><span className="block text-sm font-semibold">Voorwaarden en privacy</span><span className="block text-xs text-ink-soft">Algemene voorwaarden, privacy, cookies, abonnementsvoorwaarden</span></span>
        <span aria-hidden className="text-lg text-ink-soft">›</span>
      </Link>
      <h2 className="mt-6 font-display font-bold">Schoolvakanties</h2>
      <Card className="mt-3">
        <p className="text-xs text-ink-soft">Kies de regio van de school. Vakanties verschijnen rustig in de agenda; de verdeling spreken jullie apart af.</p>
        <div className="mt-3 space-y-2">
          {["noord", "midden", "zuid"].map((r) => (<button key={r} onClick={() => zetRegio(r)} className={`flex w-full items-start gap-3 rounded-md border px-3 py-3 text-left ${regio === r ? "border-brand bg-brand-soft/60" : "border-border"}`}>
              <span className={`mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border ${regio === r ? "border-brand" : "border-ink-soft/40"}`}>
                {regio === r ? <span className="size-2 rounded-full bg-brand"/> : null}
              </span>
              <span><span className="block text-sm font-semibold">{regioLabel[r]}</span><span className="block text-xs text-ink-soft">{regioUitleg[r]}</span></span>
            </button>))}
        </div>
      </Card>
      <h2 className="mt-6 font-display font-bold">Dagelijkse check-in</h2>
      <Card className="mt-3 py-1">
        <button onClick={() => setCheckinAan(!checkin.aan)} className="flex w-full items-center justify-between gap-3 py-3 text-left">
          <div>
            <p className="text-sm font-semibold">Vraag op de dag van overdracht</p>
            <p className="text-xs text-ink-soft">Kort delen hoe de kinderen geslapen en gegeten hebben en hoe ze zich voelen</p>
          </div>
          <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checkin.aan ? "bg-brand" : "bg-border"}`}>
            <span className={`absolute top-0.5 size-5 rounded-full bg-card shadow transition-all ${checkin.aan ? "left-5" : "left-0.5"}`}/>
          </span>
        </button>
        <Link to="/" onClick={toonVoorbeeld} className="block border-t border-border py-3 text-xs font-semibold text-brand">Bekijk hoe dit eruitziet ›</Link>
      </Card>
      <h2 className="mt-6 font-display font-bold">Slimme hulp</h2>
      <Card className="mt-3 divide-y divide-border py-1">
        <Wissel label="Slimme suggesties op Home" uitleg="Hooguit drie kleine suggesties onder 'Even vooruitkijken'" aan={vk.slimSuggesties} onWissel={() => zetVoorkeur("slimSuggesties", !vk.slimSuggesties)}/>
        <Wissel label="Deze week & morgen" uitleg="Een korte samenvatting van agenda, wisselmomenten en routines" aan={vk.weekVooruit} onWissel={() => zetVoorkeur("weekVooruit", !vk.weekVooruit)}/>
        <Wissel label="Overdrachtsvoorbereiding" uitleg="'Wellicht nodig' bij de meeneemlijst, op basis van routines en activiteiten" aan={vk.overdrachtHulp} onWissel={() => zetVoorkeur("overdrachtHulp", !vk.overdrachtHulp)}/>
        <Wissel label="Agenda even controleren" uitleg="Een rustige check bij overlap met een andere afspraak of verblijfsmoment" aan={vk.conflictControle} onWissel={() => zetVoorkeur("conflictControle", !vk.conflictControle)}/>
      </Card>
      <h2 className="mt-6 font-display font-bold">Communicatie</h2>
      <Link to="/gesprekken" className="mt-3 flex min-h-11 items-center justify-between border-y border-border py-3.5">
        <span><span className="block text-sm font-semibold">Bellen via de app</span><span className="block text-xs text-ink-soft">Bellen en privacy bij gesprekken</span></span>
        <span aria-hidden className="text-lg text-brand">›</span>
      </Link>
      <Card className="mt-3 divide-y divide-border py-1">
        <Button variant="ghost" role="switch" aria-checked={vk.communicatieSuggesties} onClick={() => zetVoorkeur("communicatieSuggesties", !vk.communicatieSuggesties)} className="h-auto w-full justify-between gap-3 whitespace-normal px-0 py-3 text-left hover:bg-transparent">
          <span><span className="block text-sm font-semibold">Slimme suggesties</span><span className="block text-xs text-ink-soft">Ontvang handige tips om berichten duidelijker te maken en afspraken makkelijker vast te leggen.</span></span>
          <span className={`relative h-6 w-11 shrink-0 rounded-full ${vk.communicatieSuggesties ? "bg-brand" : "bg-border"}`}><span className={`absolute top-0.5 size-5 rounded-full bg-card ${vk.communicatieSuggesties ? "left-5" : "left-0.5"}`}/></span>
        </Button>
        {vk.verborgenCommunicatieSuggesties.length ? <Button variant="link" onClick={() => zetVoorkeur("verborgenCommunicatieSuggesties", [])} className="h-auto min-h-11 whitespace-normal px-0 text-xs">Verborgen suggestiesoorten weer tonen</Button> : null}
        <Wissel label="Rustig regelen · Meer duidelijkheid, minder discussie." uitleg="Maak afspraken met duidelijke keuzes. Zo hoef je minder heen en weer te berichten en zie je wat al geregeld is. Geldt alleen voor jouw scherm; berichten, spoed en veiligheid blijven gewoon werken." aan={vk.gestructureerdAfstemmen} onWissel={() => zetVoorkeur("gestructureerdAfstemmen", !vk.gestructureerdAfstemmen)}/>
        <Wissel label="Herinneringen bij voorstellen pauzeren" uitleg="Geen herinneringen meer sturen bij openstaande voorstellen, bijvoorbeeld bij veiligheids- of contactafspraken. Voorstellen blijven gewoon zichtbaar en reageren kan altijd." aan={vk.herinneringenGepauzeerd} onWissel={() => zetVoorkeur("herinneringenGepauzeerd", !vk.herinneringenGepauzeerd)}/>
        <Wissel label="Schrijfhulp van Co" uitleg="Co helpt bij het schrijven en beantwoorden van berichten." aan={vk.aiSchrijfhulp} onWissel={() => zetVoorkeur("aiSchrijfhulp", !vk.aiSchrijfhulp)}/>
        <Wissel label="Rustiger communiceren · aanbevolen" uitleg="Ontvang een suggestie wanneer een bericht mogelijk voor meer spanning zorgt." aan={vk.rustigerCommuniceren} onWissel={() => zetVoorkeur("rustigerCommuniceren", !vk.rustigerCommuniceren)}/>
        <p className="py-2 text-[11px] text-ink-soft">Staat een functie aan, dan wordt je bericht alleen op dat moment door AI gelezen, via onze eigen server. Er wordt niets van bewaard en de andere ouder ziet het niet. Staat een functie uit, dan leest AI daarvoor niets mee. Berichten versturen werkt altijd, ook zonder AI.</p>
      </Card>
      <h2 className="mt-6 font-display font-bold">Agenda & meldingen</h2>
      <Card className="mt-3 divide-y divide-border py-1">
        <Wissel label="Feestdagen tonen" uitleg="Koningsdag, Pasen, Sinterklaas en meer in de agenda. Alleen ter informatie: de verdeling van de week blijft gewoon gelden" aan={vk.bijzonderTonen} onWissel={() => zetVoorkeur("bijzonderTonen", !vk.bijzonderTonen)}/>
        <Wissel label="Herinneringen voor feestdagen" uitleg="Hooguit één bericht, een week van tevoren — handig om samen af te stemmen" aan={vk.bijzonderHerinneren} onWissel={() => zetVoorkeur("bijzonderHerinneren", !vk.bijzonderHerinneren)}/>
        <Wissel label="Rustmodus 's avonds" uitleg={`Jouw rustmoment: ${vk.rustVan} uur – ${vk.rustTot} uur. Meldingen versturen is nog niet beschikbaar in het voorbeeldgezin.`} aan={vk.rustmodus} onWissel={() => zetVoorkeur("rustmodus", !vk.rustmodus)}/>
        <Wissel label="Meldingen bundelen" uitleg="Losse meldingen over taken, agenda, spullen en kosten komen samen in één bericht, bijv. “Voor morgen zijn er 3 dingen om te weten.”" aan={vk.bundelen} onWissel={() => zetVoorkeur("bundelen", !vk.bundelen)}/>
        <Wissel label="Nu afstemmen altijd doorlaten" uitleg="Iets dat snel geregeld moet worden, krijg je meteen te zien — ook tijdens de rustmodus. Dit wordt nooit gebundeld" aan={vk.nuAfstemmenAltijd} onWissel={() => zetVoorkeur("nuAfstemmenAltijd", !vk.nuAfstemmenAltijd)}/>
      </Card>
      <p className="mt-3 text-xs text-ink-soft">Echte meldingen en leesbevestigingen zijn pas beschikbaar met veilig gekoppelde ouderaccounts.</p>
      <Card className="mt-3 divide-y divide-border py-1">
        <Schakelaar label="Nieuwe afspraken" uitleg="Als er iets in de agenda komt" standaard/>
        <Schakelaar label="Gewijzigde afspraken" uitleg="Als een afspraak verandert" standaard/>
        <Schakelaar label="Wisselmomenten" uitleg="Herinnering een dag van tevoren" standaard/>
        <Schakelaar label="Nieuwe berichten" uitleg="Direct een melding" standaard/>
        <Schakelaar label="Wijzigingsverzoeken" uitleg="Als de ander een ruil voorstelt" standaard/>
        <Schakelaar label="Nieuwe kosten" uitleg="Wekelijkse samenvatting" standaard={false}/>
        <Schakelaar label="Betaalverzoeken" uitleg="Als er nog iets te betalen is" standaard/>
        <Schakelaar label="Toegevoegde documenten" uitleg="Als er een document bijkomt" standaard={false}/>

      </Card>
      <h2 className="mt-6 font-display font-bold">Privacy & beveiliging</h2>
      <Card className="mt-3 divide-y divide-border py-1">
        <Wissel label="App vergrendelen" uitleg={slotMogelijk === false ? "Dit apparaat of deze browser biedt geen Face ID, vingerafdruk of pincode aan" : "Ontgrendel met Face ID, Touch ID, vingerafdruk of de pincode van je apparaat"} aan={!!vk.vergrendelId} onWissel={wisselSlot} uit={slotMogelijk === false && !vk.vergrendelId}/>
        {slotMelding ? <p className="py-2 text-xs text-ink-soft">{slotMelding}</p> : null}
        <p className="py-2 text-[11px] text-ink-soft">Je apparaat controleert wie je bent. Ouderschap & Co bewaart nooit je gezicht, vingerafdruk of pincode.</p>
        <Schakelaar label="Leesbevestiging tonen" uitleg="De ander ziet wanneer je iets gelezen hebt" standaard/>
      </Card>
      <p className="mt-6 text-center text-xs text-ink-soft">Ouderschap & Co · De app die ouders verbindt</p>
    </AppShell>);
}
