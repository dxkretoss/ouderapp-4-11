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
import { useStart } from "@/lib/start-store";
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
    const { t } = useTranslation();
    return (
      <div className="flex w-full items-center justify-between gap-3 py-3 text-left">
        <p className="text-sm font-semibold">{label}</p>
        <span className="text-xs text-ink-soft">{t("settings.notAvailableYet", "Nog niet beschikbaar")}</span>
      </div>
    );
}

function Keuze({ opties, waarde, onKies }) {
    return (
      <div className="space-y-2">
        {opties.map(([id, titel, uitleg]) => (
          <button
            key={id}
            onClick={() => onKies(id)}
            className={`flex w-full items-start gap-3 rounded-md border px-3 py-3 text-left ${waarde === id ? "border-brand bg-brand-soft/60" : "border-border"}`}
          >
            <span className={`mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border ${waarde === id ? "border-brand" : "border-ink-soft/40"}`}>
              {waarde === id ? <span className="size-2 rounded-full bg-brand"/> : null}
            </span>
            <span>
              <span className="block text-sm font-semibold">{titel}</span>
              <span className="block text-xs text-ink-soft">{uitleg}</span>
            </span>
          </button>
        ))}
      </div>
    );
}

function Wissel({ label, uitleg, aan, onWissel, uit }) {
    return (
      <button
        onClick={onWissel}
        disabled={uit}
        role="switch"
        aria-checked={aan}
        className="flex w-full items-center justify-between gap-3 py-3 text-left disabled:opacity-50"
      >
        <div>
          <p className="text-sm font-semibold">{label}</p>
          <p className="text-xs text-ink-soft">{uitleg}</p>
        </div>
        <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${aan ? "bg-brand" : "bg-border"}`}>
          <span className={`absolute top-0.5 size-5 rounded-full bg-card transition-all ${aan ? "left-5" : "left-0.5"}`}/>
        </span>
      </button>
    );
}

function Instellingen() {
    const { t } = useTranslation();
    const vk = useVoorkeuren();
    const [slotMogelijk, setSlotMogelijk] = useState(null);
    const [slotMelding, setSlotMelding] = useState(null);

    useEffect(() => {
      apparaatOndersteunt().then(setSlotMogelijk);
    }, []);

    const wisselSlot = async () => {
        setSlotMelding(null);
        if (vk.vergrendelId) {
            zetVoorkeur("vergrendelId", null);
            return;
        }
        try {
            zetVoorkeur("vergrendelId", await registreerSlot());
            sessionStorage.setItem("onzeapp-ontgrendeld", "1");
            setSlotMelding(t("settings.appLockActive", "App vergrendelen staat aan."));
        }
        catch {
            setSlotMelding(t("settings.appLockFailed", "Het instellen is niet gelukt of werd geannuleerd."));
        }
    };

    const startSt = useStart();
    const s = parents.sanne;
    const checkin = useCheckin();
    const [gebruik, setGebruik] = useState("samen");
    const regio = useRegio();

    const isEigen = startSt.eigen;
    const profielNaam = isEigen ? (startSt.naam?.trim() || t("common.you", "Jij")) : s.volledigeNaam;
    const profielSubtitel = isEigen
      ? (startSt.uitgenodigd
          ? t("settings.parent2Invited", "Ouder 2 uitgenodigd")
          : t("settings.parent2NotConnected", "De andere ouder is nog niet gekoppeld"))
      : t("settings.userCardSubtitle", {
          role: s.rol === "Ouder 1" ? t("settings.parent1", "Ouder 1") : s.rol === "Ouder 2" ? t("settings.parent2", "Ouder 2") : s.rol,
          partner: parents.joris.volledigeNaam,
          defaultValue: `${s.rol} · gekoppeld aan ${parents.joris.volledigeNaam}`,
        });

    return (
      <AppShell>
        <PageHeader titel={t("settings.title", "Instellingen")}/>
        
        <h2 className="mt-5 font-display font-bold">{t("language.title", "Taal / Language")}</h2>
        <Card className="mt-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">{t("menu.language", "Taal wijzigen")}</p>
            <p className="text-xs text-ink-soft">Nederlands & English</p>
          </div>
          <LanguageSelector />
        </Card>

        <Link to="/exporteren" className="mt-5 flex items-center justify-between border-y border-border py-3.5">
          <span>
            <span className="block text-sm font-semibold">{t("menu.exportLink", "Overzicht bewaren of delen")}</span>
            <span className="block text-xs text-ink-soft">{t("menu.exportDesc", "Gegevens & export · feitelijk PDF-overzicht")}</span>
          </span>
          <span aria-hidden className="text-lg text-ink-soft">›</span>
        </Link>

        <Card className="mt-6 flex items-center gap-4">
          {isEigen && !startSt.beeld ? (
            <span className="grid size-16 place-items-center rounded-xl bg-brand-soft font-display text-2xl font-bold text-brand">
              {profielNaam.slice(0, 1).toUpperCase()}
            </span>
          ) : (
            <img src={isEigen ? startSt.beeld : s.avatar} alt={profielNaam} className="size-16 rounded-xl object-cover"/>
          )}
          <div>
            <p className="font-display text-lg font-bold">{profielNaam}</p>
            <p className="text-xs text-ink-soft">{profielSubtitel}</p>
          </div>
        </Card>

        <h2 className="mt-6 font-display font-bold">{t("settings.familyAndAccess", "Gezin & toegang")}</h2>
        <Link to="/kinderen" className="mt-3 flex min-h-[44px] items-center justify-between border-y border-border py-3.5">
          <span>
            <span className="block text-sm font-semibold">{t("settings.manageFamily", "Gezin beheren")}</span>
            <span className="block text-xs text-ink-soft">{t("settings.manageFamilyDesc", "Kinderen en belangrijke personen aanvullen")}</span>
          </span>
          <span aria-hidden className="text-lg text-ink-soft">›</span>
        </Link>
        <Link to="/gezag" className="flex min-h-11 items-center justify-between border-b border-border py-3.5">
          <span>
            <span className="block text-sm font-semibold">{t("settings.custodyAndAccess", "Gezag & toegang")}</span>
            <span className="block text-xs text-ink-soft">{t("settings.custodyAndAccessDesc", "Gezagsinformatie en bestaande instellingen per kind")}</span>
          </span>
          <span aria-hidden className="text-lg text-brand">›</span>
        </Link>

        <Card className="mt-3">
          <div className="flex items-start gap-3">
            <UsersRound className="mt-0.5 size-5 shrink-0 text-brand" strokeWidth={1.6}/>
            <div className="flex-1">
              <p className="text-sm font-semibold">{t("settings.appUsage", "Gebruik van de app")}</p>
              <p className="text-xs text-ink-soft">{t("settings.appUsageDesc", "Kies of jullie samen werken of dat je de app voor jezelf gebruikt.")}</p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {[
              ["samen", t("settings.useTogether", "Samen gebruiken"), t("settings.useTogetherDesc", "Jullie beheren de gezinsomgeving samen.")],
              ["alleen", t("settings.useAlone", "Alleen gebruiken"), t("settings.useAloneDesc", "Alles blijft privé; later uitnodigen kan altijd.")],
            ].map(([id, titel, uitleg]) => (
              <button
                key={id}
                onClick={() => setGebruik(id)}
                className={`flex w-full items-start gap-3 rounded-md border px-3 py-3 text-left ${gebruik === id ? "border-brand bg-brand-soft/60" : "border-border"}`}
              >
                <span className={`mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border ${gebruik === id ? "border-brand" : "border-ink-soft/40"}`}>
                  {gebruik === id ? <span className="size-2 rounded-full bg-brand"/> : null}
                </span>
                <span>
                  <span className="block text-sm font-semibold">{titel}</span>
                  <span className="block text-xs text-ink-soft">{uitleg}</span>
                </span>
              </button>
            ))}
          </div>
          <Link to="/solo" className="mt-3 inline-block text-xs font-semibold text-brand">
            {t("settings.viewPersonalFeatures", "Bekijk persoonlijke functies →")}
          </Link>
          <Link to="/solo" hash="email-koppeling" className="mt-1 block text-xs font-semibold text-brand">
            {t("settings.emailConnection", "E-mailkoppeling →")}
          </Link>
        </Card>

        <h2 className="mt-6 font-display font-bold">{t("settings.display", "Weergave")}</h2>
        <Link to="/extra-ondersteuning" className="mt-3 flex min-h-11 items-center justify-between gap-3 border-y border-border py-3.5">
          <span>
            <span className="block text-sm font-semibold">{t("settings.extraSupport", "Extra houvast")}</span>
            <span className="block text-xs text-ink-soft">
              {t("settings.extraSupportDesc", {
                status: vk.extraHouvast ? t("settings.on", "Aan") : t("settings.off", "Uit"),
                defaultValue: `${vk.extraHouvast ? "Aan" : "Uit"} · jouw weergave en opties voor Co`,
              })}
            </span>
          </span>
          <span aria-hidden className="text-lg text-brand">›</span>
        </Link>

        <Card className="mt-3">
          <p className="mb-3 text-xs text-ink-soft">{t("settings.theme", "Thema")}</p>
          <Keuze
            waarde={vk.thema}
            onKies={(tVal) => zetVoorkeur("thema", tVal)}
            opties={[
              ["licht", t("settings.themeLight", "Licht"), t("settings.themeLightDesc", "Ivoor en salie, zoals je gewend bent.")],
              ["donker", t("settings.themeDark", "Donker"), t("settings.themeDarkDesc", "Warm en gedempt, rustig voor de ogen in de avond.")],
              ["automatisch", t("settings.themeAuto", "Automatisch"), t("settings.themeAutoDesc", "Volgt de instelling van je apparaat.")],
            ]}
          />
        </Card>

        <Card className="mt-3">
          <p className="mb-2 text-xs text-ink-soft">{t("settings.dynamicHomeNotice", "Dynamische Home — de bovenkant van Home beweegt rustig mee met tijdstip, weer en bijzondere dagen. Je overzicht blijft altijd op dezelfde plek.")}</p>
          <Wissel label={t("settings.dynamicHome", "Dynamische Home")} uitleg={t("settings.dynamicHomeDesc", "Begroeting en sfeer passen zich aan het moment aan")} aan={vk.livingHome} onWissel={() => zetVoorkeur("livingHome", !vk.livingHome)}/>
          {vk.livingHome && (
            <>
              <Wissel label={t("settings.weatherEffects", "Weereffecten")} uitleg={t("settings.weatherEffectsDesc", "Een zacht weerbeeld en klein weertekentje")} aan={vk.weerEffecten} onWissel={() => zetVoorkeur("weerEffecten", !vk.weerEffecten)}/>
              <Wissel label={t("settings.seasonEffects", "Seizoenseffecten")} uitleg={t("settings.seasonEffectsDesc", "Iets frissere of warmere tinten per seizoen")} aan={vk.seizoenEffecten} onWissel={() => zetVoorkeur("seizoenEffecten", !vk.seizoenEffecten)}/>
              <Wissel label={t("settings.specialMoments", "Bijzondere momenten")} uitleg={t("settings.specialMomentsDesc", "Verjaardag van een kind en wisseldagen")} aan={vk.bijzondereMomenten} onWissel={() => zetVoorkeur("bijzondereMomenten", !vk.bijzondereMomenten)}/>
              <p className="mb-2 mt-3 text-xs text-ink-soft">{t("settings.motion", "Beweging")}</p>
              <Keuze
                waarde={vk.beweging}
                onKies={(b) => zetVoorkeur("beweging", b)}
                opties={[
                  ["automatisch", t("settings.motionAuto", "Automatisch"), t("settings.motionAutoDesc", "Volgt je apparaat; minder beweging als je dat daar hebt ingesteld.")],
                  ["verminderd", t("settings.motionReduced", "Verminderd"), t("settings.motionReducedDesc", "Geen vallende regen, sneeuw of confetti.")],
                ]}
              />
              <label className="mt-3 block text-xs text-ink-soft">
                {t("settings.weatherFor", "Weer voor")}
                <input defaultValue={vk.weerPlaats} onBlur={(e) => zetVoorkeur("weerPlaats", e.target.value.trim() || "Haarlem")} className="mt-1 block w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-ink"/>
              </label>
              <p className="mt-1 text-[11px] text-ink-soft">{t("settings.weatherPrivacyNotice", "Alleen deze plaats wordt gebruikt. Geen GPS, geen locatiegeschiedenis.")}</p>
            </>
          )}
        </Card>

        <h2 className="mt-6 font-display font-bold">{t("settings.subscription", "Abonnement")}</h2>
        <Link to="/abonnement" className="mt-3 flex items-center gap-3 rounded-lg border border-border bg-card p-4">
          <CreditCard className="size-5 shrink-0 text-brand" strokeWidth={1.6}/>
          <span className="flex-1">
            <span className="block text-sm font-semibold">{t("settings.subscription", "Abonnement")}</span>
            <span className="block text-xs text-ink-soft">{t("settings.subscriptionDesc", "Huidig abonnement, opzeggen en account")}</span>
          </span>
          <span aria-hidden className="text-lg text-ink-soft">›</span>
        </Link>

        <h2 className="mt-6 font-display font-bold">{t("settings.legalAndPrivacy", "Juridisch & privacy")}</h2>
        <Link to="/privacy" className="mt-3 flex items-center justify-between rounded-lg border border-border bg-card p-4">
          <span>
            <span className="block text-sm font-semibold">{t("settings.whoSeesWhat", "Wie ziet wat")}</span>
            <span className="block text-xs text-ink-soft">{t("settings.whoSeesWhatDesc", "In één overzicht wie welke informatie mag zien")}</span>
          </span>
          <span aria-hidden className="text-lg text-ink-soft">›</span>
        </Link>
        <Link to="/juridisch" className="mt-3 flex items-center justify-between rounded-lg border border-border bg-card p-4">
          <span>
            <span className="block text-sm font-semibold">{t("settings.termsAndPrivacy", "Voorwaarden en privacy")}</span>
            <span className="block text-xs text-ink-soft">{t("settings.termsAndPrivacyDesc", "Algemene voorwaarden, privacy, cookies, abonnementsvoorwaarden")}</span>
          </span>
          <span aria-hidden className="text-lg text-ink-soft">›</span>
        </Link>

        <h2 className="mt-6 font-display font-bold">{t("settings.schoolHolidays", "Schoolvakanties")}</h2>
        <Card className="mt-3">
          <p className="text-xs text-ink-soft">{t("settings.schoolHolidaysDesc", "Kies de regio van de school. Vakanties verschijnen rustig in de agenda; de verdeling spreken jullie apart af.")}</p>
          <div className="mt-3 space-y-2">
            {["noord", "midden", "zuid"].map((r) => (
              <button
                key={r}
                onClick={() => zetRegio(r)}
                className={`flex w-full items-start gap-3 rounded-md border px-3 py-3 text-left ${regio === r ? "border-brand bg-brand-soft/60" : "border-border"}`}
              >
                <span className={`mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border ${regio === r ? "border-brand" : "border-ink-soft/40"}`}>
                  {regio === r ? <span className="size-2 rounded-full bg-brand"/> : null}
                </span>
                <span>
                  <span className="block text-sm font-semibold">{regioLabel[r]}</span>
                  <span className="block text-xs text-ink-soft">{regioUitleg[r]}</span>
                </span>
              </button>
            ))}
          </div>
        </Card>

        <h2 className="mt-6 font-display font-bold">{t("settings.dailyCheckin", "Dagelijkse check-in")}</h2>
        <Card className="mt-3 py-1">
          <button onClick={() => setCheckinAan(!checkin.aan)} className="flex w-full items-center justify-between gap-3 py-3 text-left">
            <div>
              <p className="text-sm font-semibold">{t("settings.dailyCheckinQuestion", "Vraag op de dag van overdracht")}</p>
              <p className="text-xs text-ink-soft">{t("settings.dailyCheckinDesc", "Kort delen hoe de kinderen geslapen en gegeten hebben en hoe ze zich voelen")}</p>
            </div>
            <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checkin.aan ? "bg-brand" : "bg-border"}`}>
              <span className={`absolute top-0.5 size-5 rounded-full bg-card shadow transition-all ${checkin.aan ? "left-5" : "left-0.5"}`}/>
            </span>
          </button>
          <Link to="/" onClick={toonVoorbeeld} className="block border-t border-border py-3 text-xs font-semibold text-brand">
            {t("settings.dailyCheckinPreview", "Bekijk hoe dit eruitziet ›")}
          </Link>
        </Card>

        <h2 className="mt-6 font-display font-bold">{t("settings.smartHelp", "Slimme hulp")}</h2>
        <Card className="mt-3 divide-y divide-border py-1">
          <Wissel label={t("settings.smartSuggestionsHome", "Slimme suggesties op Home")} uitleg={t("settings.smartSuggestionsHomeDesc", "Hooguit drie kleine suggesties onder 'Even vooruitkijken'")} aan={vk.slimSuggesties} onWissel={() => zetVoorkeur("slimSuggesties", !vk.slimSuggesties)}/>
          <Wissel label={t("settings.thisWeekAndTomorrow", "Deze week & morgen")} uitleg={t("settings.thisWeekAndTomorrowDesc", "Een korte samenvatting van agenda, wisselmomenten en routines")} aan={vk.weekVooruit} onWissel={() => zetVoorkeur("weekVooruit", !vk.weekVooruit)}/>
          <Wissel label={t("settings.handoverPrep", "Overdrachtsvoorbereiding")} uitleg={t("settings.handoverPrepDesc", "'Wellicht nodig' bij de meeneemlijst, op basis van routines en activiteiten")} aan={vk.overdrachtHulp} onWissel={() => zetVoorkeur("overdrachtHulp", !vk.overdrachtHulp)}/>
          <Wissel label={t("settings.calendarCheck", "Agenda even controleren")} uitleg={t("settings.calendarCheckDesc", "Een rustige check bij overlap met een andere afspraak of verblijfsmoment")} aan={vk.conflictControle} onWissel={() => zetVoorkeur("conflictControle", !vk.conflictControle)}/>
        </Card>

        <h2 className="mt-6 font-display font-bold">{t("settings.communication", "Communicatie")}</h2>
        <Link to="/gesprekken" className="mt-3 flex min-h-11 items-center justify-between border-y border-border py-3.5">
          <span>
            <span className="block text-sm font-semibold">{t("settings.callViaApp", "Bellen via de app")}</span>
            <span className="block text-xs text-ink-soft">{t("settings.callViaAppDesc", "Bellen en privacy bij gesprekken")}</span>
          </span>
          <span aria-hidden className="text-lg text-brand">›</span>
        </Link>
        <Card className="mt-3 divide-y divide-border py-1">
          <Button variant="ghost" role="switch" aria-checked={vk.communicatieSuggesties} onClick={() => zetVoorkeur("communicatieSuggesties", !vk.communicatieSuggesties)} className="h-auto w-full justify-between gap-3 whitespace-normal px-0 py-3 text-left hover:bg-transparent">
            <span>
              <span className="block text-sm font-semibold">{t("settings.smartCommSuggestions", "Slimme suggesties")}</span>
              <span className="block text-xs text-ink-soft">{t("settings.smartCommSuggestionsDesc", "Ontvang handige tips om berichten duidelijker te maken en afspraken makkelijker vast te leggen.")}</span>
            </span>
            <span className={`relative h-6 w-11 shrink-0 rounded-full ${vk.communicatieSuggesties ? "bg-brand" : "bg-border"}`}><span className={`absolute top-0.5 size-5 rounded-full bg-card ${vk.communicatieSuggesties ? "left-5" : "left-0.5"}`}/></span>
          </Button>
          {vk.verborgenCommunicatieSuggesties.length ? (
            <Button variant="link" onClick={() => zetVoorkeur("verborgenCommunicatieSuggesties", [])} className="h-auto min-h-11 whitespace-normal px-0 text-xs">
              {t("settings.restoreHiddenSuggestions", "Verborgen suggestiesoorten weer tonen")}
            </Button>
          ) : null}
          <Wissel label={t("settings.structuredArranging", "Rustig regelen · Meer duidelijkheid, minder discussie.")} uitleg={t("settings.structuredArrangingDesc", "Maak afspraken met duidelijke keuzes. Zo hoef je minder heen en weer te berichten en zie je wat al geregeld is. Geldt alleen voor jouw scherm; berichten, spoed en veiligheid blijven gewoon werken.")} aan={vk.gestructureerdAfstemmen} onWissel={() => zetVoorkeur("gestructureerdAfstemmen", !vk.gestructureerdAfstemmen)}/>
          <Wissel label={t("settings.pauseProposalReminders", "Herinneringen bij voorstellen pauzeren")} uitleg={t("settings.pauseProposalRemindersDesc", "Geen herinneringen meer sturen bij openstaande voorstellen, bijvoorbeeld bij veiligheids- of contactafspraken. Voorstellen blijven gewoon zichtbaar en reageren kan altijd.")} aan={vk.herinneringenGepauzeerd} onWissel={() => zetVoorkeur("herinneringenGepauzeerd", !vk.herinneringenGepauzeerd)}/>
          <Wissel label={t("settings.coWritingHelp", "Schrijfhulp van Co")} uitleg={t("settings.coWritingHelpDesc", "Co helpt bij het schrijven en beantwoorden van berichten.")} aan={vk.aiSchrijfhulp} onWissel={() => zetVoorkeur("aiSchrijfhulp", !vk.aiSchrijfhulp)}/>
          <Wissel label={t("settings.calmerCommunication", "Rustiger communiceren · aanbevolen")} uitleg={t("settings.calmerCommunicationDesc", "Ontvang een suggestie wanneer een bericht mogelijk voor meer spanning zorgt.")} aan={vk.rustigerCommuniceren} onWissel={() => zetVoorkeur("rustigerCommuniceren", !vk.rustigerCommuniceren)}/>
          <p className="py-2 text-[11px] text-ink-soft">{t("settings.aiPrivacyNotice", "Staat een functie aan, dan wordt je bericht alleen op dat moment door AI gelezen, via onze eigen server. Er wordt niets van bewaard en de andere ouder ziet het niet. Staat een functie uit, dan leest AI daarvoor niets mee. Berichten versturen werkt altijd, ook zonder AI.")}</p>
        </Card>

        <h2 className="mt-6 font-display font-bold">{t("settings.calendarAndNotifications", "Agenda & meldingen")}</h2>
        <Card className="mt-3 divide-y divide-border py-1">
          <Wissel label={t("settings.showHolidays", "Feestdagen tonen")} uitleg={t("settings.showHolidaysDesc", "Koningsdag, Pasen, Sinterklaas en meer in de agenda. Alleen ter informatie: de verdeling van de week blijft gewoon gelden")} aan={vk.bijzonderTonen} onWissel={() => zetVoorkeur("bijzonderTonen", !vk.bijzonderTonen)}/>
          <Wissel label={t("settings.holidayReminders", "Herinneringen voor feestdagen")} uitleg={t("settings.holidayRemindersDesc", "Hooguit één bericht, een week van tevoren — handig om samen af te stemmen")} aan={vk.bijzonderHerinneren} onWissel={() => zetVoorkeur("bijzonderHerinneren", !vk.bijzonderHerinneren)}/>
          <Wissel label={t("settings.eveningQuietMode", "Rustmodus 's avonds")} uitleg={t("settings.eveningQuietModeDesc", { from: vk.rustVan, to: vk.rustTot, defaultValue: `Jouw rustmoment: ${vk.rustVan} uur – ${vk.rustTot} uur. Meldingen versturen is nog niet beschikbaar in het voorbeeldgezin.` })} aan={vk.rustmodus} onWissel={() => zetVoorkeur("rustmodus", !vk.rustmodus)}/>
          <Wissel label={t("settings.bundleNotifications", "Meldingen bundelen")} uitleg={t("settings.bundleNotificationsDesc", "Losse meldingen over taken, agenda, spullen en kosten komen samen in één bericht, bijv. “Voor morgen zijn er 3 dingen om te weten.”")} aan={vk.bundelen} onWissel={() => zetVoorkeur("bundelen", !vk.bundelen)}/>
          <Wissel label={t("settings.alwaysAllowUrgent", "Nu afstemmen altijd doorlaten")} uitleg={t("settings.alwaysAllowUrgentDesc", "Iets dat snel geregeld moet worden, krijg je meteen te zien — ook tijdens de rustmodus. Dit wordt nooit gebundeld")} aan={vk.nuAfstemmenAltijd} onWissel={() => zetVoorkeur("nuAfstemmenAltijd", !vk.nuAfstemmenAltijd)}/>
        </Card>

        <p className="mt-3 text-xs text-ink-soft">{t("settings.notificationsNotice", "Echte meldingen en leesbevestigingen zijn pas beschikbaar met veilig gekoppelde ouderaccounts.")}</p>
        <Card className="mt-3 divide-y divide-border py-1">
          <Schakelaar label={t("settings.notifNewAppointments", "Nieuwe afspraken")} uitleg={t("settings.notifNewAppointmentsDesc", "Als er iets in de agenda komt")} standaard/>
          <Schakelaar label={t("settings.notifChangedAppointments", "Gewijzigde afspraken")} uitleg={t("settings.notifChangedAppointmentsDesc", "Als een afspraak verandert")} standaard/>
          <Schakelaar label={t("settings.notifHandoverMoments", "Wisselmomenten")} uitleg={t("settings.notifHandoverMomentsDesc", "Herinnering een dag van tevoren")} standaard/>
          <Schakelaar label={t("settings.notifNewMessages", "Nieuwe berichten")} uitleg={t("settings.notifNewMessagesDesc", "Direct een melding")} standaard/>
          <Schakelaar label={t("settings.notifChangeRequests", "Wijzigingsverzoeken")} uitleg={t("settings.notifChangeRequestsDesc", "Als de ander een ruil voorstelt")} standaard/>
          <Schakelaar label={t("settings.notifNewExpenses", "Nieuwe kosten")} uitleg={t("settings.notifNewExpensesDesc", "Wekelijkse samenvatting")} standaard={false}/>
          <Schakelaar label={t("settings.notifPaymentRequests", "Betaalverzoeken")} uitleg={t("settings.notifPaymentRequestsDesc", "Als er nog iets te betalen is")} standaard/>
          <Schakelaar label={t("settings.notifAddedDocuments", "Toegevoegde documenten")} uitleg={t("settings.notifAddedDocumentsDesc", "Als er een document bijkomt")} standaard={false}/>
        </Card>

        <h2 className="mt-6 font-display font-bold">{t("settings.privacyAndSecurity", "Privacy & beveiliging")}</h2>
        <Card className="mt-3 divide-y divide-border py-1">
          <Wissel
            label={t("settings.lockApp", "App vergrendelen")}
            uitleg={slotMogelijk === false ? t("settings.lockAppUnsupported", "Dit apparaat of deze browser biedt geen Face ID, vingerafdruk of pincode aan") : t("settings.lockAppSupported", "Ontgrendel met Face ID, Touch ID, vingerafdruk of de pincode van je apparaat")}
            aan={!!vk.vergrendelId}
            onWissel={wisselSlot}
            uit={slotMogelijk === false && !vk.vergrendelId}
          />
          {slotMelding ? <p className="py-2 text-xs text-ink-soft">{slotMelding}</p> : null}
          <p className="py-2 text-[11px] text-ink-soft">{t("settings.biometricsNotice", "Je apparaat controleert wie je bent. Ouderschap & Co bewaart nooit je gezicht, vingerafdruk of pincode.")}</p>
          <Schakelaar label={t("settings.showReadReceipts", "Leesbevestiging tonen")} uitleg={t("settings.showReadReceiptsDesc", "De ander ziet wanneer je iets gelezen hebt")} standaard/>
        </Card>

        <p className="mt-6 text-center text-xs text-ink-soft">{t("settings.footerTagline", "Ouderschap & Co · De app die ouders verbindt")}</p>
      </AppShell>
    );
}
