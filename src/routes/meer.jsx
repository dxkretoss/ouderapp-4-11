import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, User } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useStart } from "@/lib/start-store";
import { useVakanties } from "@/lib/vakantie-store";
import { useTaken } from "@/lib/taken-store";
import { AppShell, BackButton } from "@/components/AppShell";
import { MeerSectie } from "@/components/MeerLijst";
import { AppIcon } from "@/components/AppIcon";
import { ProfielBeeld } from "@/components/ProfielBeeld";
import { useAuth } from "@/contexts/AuthContext";
export const Route = createFileRoute("/meer")({
  validateSearch: z.object({ hulp: z.boolean().optional() }),
  head: () => ({
    meta: [
      { title: "Menu — Ouderschap & Co" },
      { name: "description", content: "Je sneltoetsen en alle onderdelen voor dagelijks regelen, je gezin, steun en je account." },
      { property: "og:title", content: "Menu — Ouderschap & Co" },
      { property: "og:description", content: "Alle onderdelen van Ouderschap & Co op één plek." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Meer,
});
const dagelijks = [
  { to: "/agenda", icoon: "agenda", titel: "Agenda", tekst: "Afspraken, zorgverdeling en vakanties" },
  { to: "/taken", icoon: "taken", titel: "Taken", tekst: "Wie regelt wat en wat moet nog gebeuren" },
  { to: "/spullen", icoon: "doos", titel: "Spullen", tekst: "Wat moet mee en waar ligt wat" },
  { to: "/momentjes", icoon: "momentjes", titel: "Momentjes", tekst: "Mooie momenten bewaren en delen" },
];
const gezin = [
  { to: "/kinderen", icoon: "kinderen", titel: "Kinderen", tekst: "Profielen, school, zorg en contacten" },
  { to: "/documenten", icoon: "documenten", titel: "Documenten", tekst: "Belangrijke documenten op één plek" },
];
const ondersteuning = [
  { to: "/verhaal", icoon: "co", titel: "Co", tekst: "Je digitale meedenker" },
  { to: "/extra-ondersteuning", icoon: "rust", titel: "Extra houvast", tekst: "Een beetje extra steun bij samen regelen" },
  { to: "/ondersteuning", icoon: "ondersteuning", titel: "Professionals", tekst: "Samenwerken met een betrokken professional" },
];
const account = [
  { to: "/instellingen", icoon: "instellingen", titel: "Instellingen", tekst: "Profiel, meldingen en privacy" },
  { to: "/meer?hulp=true", icoon: "hulp", titel: "Hulp en uitleg", tekst: "Rondleiding, uitleg en contact" },
  { to: "/juridische-hulp", icoon: "juridisch", titel: "Voorwaarden en privacy", tekst: "Gebruiksvoorwaarden, privacyverklaring en je gegevens" },
];
/** Shortcut defaults keep their original order and destinations, whatever the category order is. */
const snelStandaard = [
  gezin[0], // Kinderen
  dagelijks[1], // Taken
  { to: "/boodschappen", icoon: "boodschappen", titel: "Nog nodig", tekst: "Bestaande aankoopideeën" },
  dagelijks[2], // Spullen
  dagelijks[3], // Momentjes
  gezin[1], // Documenten
].filter((v) => Boolean(v));
/** Extra zoekwoorden per onderdeel, zodat synoniemen ook raken. */
const zoekwoorden = {
  "/kinderen": "kind profiel school gezondheid noodkaart",
  "/taken": "taak regelen wie",
  "/boodschappen": "nodig lijstje kopen boodschap",
  "/spullen": "mee overdracht spul",
  "/momentjes": "foto moment leuk",
  "/documenten": "document paspoort papieren",
  "/agenda": "regeling verdeling week schema vakantie feestdagen bijzondere dagen",
  "/activiteiten": "ruilen voorstel afspreken reacties herinneringen",
  "/planning": "vakantie feestdagen bijzondere dagen",
  "/ondersteuning": "begeleiding professional hulpverlener",
  "/extra-ondersteuning": "extra houvast extra hulp afspraken beslissingen terugkijken overzicht",
  "/juridische-hulp": "juridisch privacy voorwaarden gezag",
  "/instellingen": "instellingen profiel meldingen privacy toegang account",
  "/rondleiding": "rondleiding uitleg start",
  "/welkom": "hulp contact opnieuw beginnen introductie",
  "/meer?hulp=true": "hulp rondleiding uitleg contact opnieuw beginnen introductie",
};
// Recent gebruikt: alleen op dit apparaat, per gebruiker (localStorage).
const RECENT_SLEUTEL = "onzeapp-meer-recent";
function leesRecent() {
  try {
    const r = JSON.parse(localStorage.getItem(RECENT_SLEUTEL) ?? "[]");
    return Array.isArray(r) ? r.filter((x) => typeof x?.to === "string") : [];
  }
  catch {
    return [];
  }
}
export function registreerMeerBezoek(to) {
  try {
    const rest = leesRecent().filter((x) => x.to !== to);
    localStorage.setItem(RECENT_SLEUTEL, JSON.stringify([{ to, at: Date.now() }, ...rest].slice(0, 6)));
  }
  catch {
    /* opslag niet beschikbaar: geen recent-lijst */
  }
}
const SCROLL_SLEUTEL = "onzeapp-meer-scroll";
const itemTranslations = {
  "Agenda": { titel: "Calendar", tekst: "Appointments, care schedule and holidays" },
  "Taken": { titel: "Tasks", tekst: "Who handles what and what still needs to be done" },
  "Spullen": { titel: "Belongings", tekst: "What goes along and where things are" },
  "Momentjes": { titel: "Moments", tekst: "Preserve and share special moments" },
  "Kinderen": { titel: "Children", tekst: "Profiles, school, healthcare and contacts" },
  "Kind": { titel: "Child", tekst: "Profile, school, healthcare and contacts" },
  "Documenten": { titel: "Documents", tekst: "Important documents in one place" },
  "Belangrijke personen": { titel: "Important contacts", tekst: "Connected family, caregivers and access" },
  "Verbonden personen": { titel: "Connected people", tekst: "Co-parents, family members and caregivers with access" },
  "Co": { titel: "Co", tekst: "Your digital co-thinker" },
  "Extra houvast": { titel: "Extra support", tekst: "A little extra reassurance while co-parenting" },
  "Professionals": { titel: "Professionals", tekst: "Collaborate with an involved professional" },
  "Instellingen": { titel: "Settings", tekst: "Profile, notifications and privacy" },
  "Hulp en uitleg": { titel: "Help & explanation", tekst: "Tour, explanation and contact" },
  "Voorwaarden en privacy": { titel: "Terms and privacy", tekst: "Terms of use, privacy policy and your data" },
  "Nog nodig": { titel: "Still needed", tekst: "Purchase ideas & wish list" },
};

function Meer() {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language?.startsWith("en");
  const vertaalItem = (item) => {
    if (!isEn || !item) return item;
    const tr = itemTranslations[item.titel];
    if (!tr) return item;
    return { ...item, titel: tr.titel, tekst: tr.tekst };
  };
  const zoekRoute = Route.useSearch();
  const [hulpOpen, setHulpOpen] = useState(!!zoekRoute.hulp);
  const [personenOpen, setPersonenOpen] = useState(false);
  const [introBevestigen, setIntroBevestigen] = useState(false);
  useEffect(() => {
    if (zoekRoute.hulp)
      setHulpOpen(true);
  }, [zoekRoute.hulp]);
  // Zelfde bronnen en statussen als Home ("Wacht op jou") en Samen regelen: geen eigen telling.
  const vakantie = useVakanties().filter((v) => v.status === "voorstel" && v.van !== "Sanne").length;
  // Eigen gezin: voorbeeldvoorstellen tellen niet mee.
  const startState = useStart();
  const eigen = startState.eigen;
  const taken = useTaken().taken.filter((t) => !t.klaar && (t.overdragenAan === "sanne" || (t.wie === "sanne" && !t.overdragenAan))).length;
  const aantallen = eigen ? {} : { "/agenda": vakantie, "/taken": taken };
  const profielen = eigen ? startState.kinderen : [{ id: "emma", naam: "Emma" }, { id: "noah", naam: "Noah" }];
  const gezinItems = gezin.map((i) => i.to === "/kinderen" && profielen.length === 1 ? { ...i, titel: "Kind" } : i);
  const alle = [...dagelijks, ...gezinItems, ...ondersteuning, ...account];
  const [zoek, setZoek] = useState("");
  const [recent, setRecent] = useState([]);
  useEffect(() => setRecent(leesRecent().filter((r) => r.to !== "/samen-regelen").map((r) => r.to === "/zorgregeling" || r.to === "/planning" ? { ...r, to: "/agenda" } : r.to === "/rondleiding" || r.to === "/welkom" ? { ...r, to: "/meer?hulp=true" } : r)), []);
  // Scrollpositie bewaren bij terugkeer naar Meer.
  const hersteld = useRef(false);
  useEffect(() => {
    if (hersteld.current)
      return;
    hersteld.current = true;
    const y = Number(sessionStorage.getItem(SCROLL_SLEUTEL) ?? 0);
    if (y > 0)
      window.scrollTo(0, y);
    const bewaar = () => sessionStorage.setItem(SCROLL_SLEUTEL, String(window.scrollY));
    window.addEventListener("scroll", bewaar, { passive: true });
    return () => window.removeEventListener("scroll", bewaar);
  }, []);
  const q = zoek.trim().toLowerCase();
  const resultaten = q
    ? alle.filter((i) => `${i.titel} ${i.tekst} ${zoekwoorden[i.to] ?? ""}`.toLowerCase().includes(q))
    : [];
  // Snel naar: 1) open acties, 2) recent gebruikt (nieuwste eerst), 3) standaardonderdelen. Elk onderdeel één keer.
  const metAantal = (i) => ({ ...i, aantal: aantallen[i.to] ?? 0 });
  const acties = alle.filter((i) => (aantallen[i.to] ?? 0) > 0).sort((x, y) => (aantallen[y.to] ?? 0) - (aantallen[x.to] ?? 0));
  const recentAlle = recent.map((r) => [...alle, ...snelStandaard].find((i) => i.to === r.to && i.to !== "/extra-ondersteuning")).filter((x) => !!x);
  const uniek = [...acties, ...recentAlle, ...snelStandaard.map((i) => i.to === "/kinderen" && profielen.length === 1 ? { ...i, titel: "Kind" } : i)].filter((i, n, a) => a.findIndex((x) => x.to === i.to) === n);
  const snel = uniek.slice(0, 6).map(metAantal);
  const overigeActies = acties.slice(6);
  const { user, profile } = useAuth();
  const gebruikersnaam = (user?.name || profile?.name || (eigen ? startState.naam.trim() : "") || (eigen ? "Jij" : "Sanne")).trim();
  const userAvatar = profile?.avatar_url || user?.avatar_url || (eigen ? startState.beeld : null);
  const isGenericMeerUser = !gebruikersnaam || /^ouder(\s*\d+)?$/i.test(gebruikersnaam) || /^parent(\s*\d+)?$/i.test(gebruikersnaam) || gebruikersnaam === "0" || gebruikersnaam === "Jij" || gebruikersnaam === "You";
  const initiaal = !isGenericMeerUser ? gebruikersnaam.charAt(0).toUpperCase() : null;
  return (<AppShell>
    <div className="flex items-start gap-3">
      <div className="min-w-0 flex-1">
        <h1 className="font-display text-2xl font-extrabold">{t("navbar.menu", "Menu")}</h1>
        <p className="mt-1 text-sm text-ink-soft">{t("menu.headerSubtitle", "Alles rondom jullie gezin, overzichtelijk bij elkaar.")}</p>
      </div>
      <Link to="/instellingen" aria-label={`Profiel en instellingen van ${gebruikersnaam}`} onClick={() => registreerMeerBezoek("/instellingen")} className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-full bg-brand-soft font-display text-base font-bold text-brand transition-transform active:scale-95">
        {userAvatar ? <img src={userAvatar} alt={gebruikersnaam} className="size-full object-cover" /> : initiaal ? initiaal : <User className="size-5 text-brand" />}
      </Link>
    </div>

    {/* Snel naar: zes ronde pictogrammen */}
    <section className="mt-4" aria-label="Snel naar">
      <h2 className="font-display text-base font-semibold text-ink-soft">{t("menu.quickAccess", "Snel naar")}</h2>
      <div className="mt-2 grid grid-cols-3 gap-x-3 gap-y-3">
        {snel.map((raw) => {
          const item = vertaalItem(raw);
          return (<Link key={item.to} to={item.to} onClick={() => registreerMeerBezoek(item.to)} className="group flex flex-col items-center gap-2 rounded-2xl py-1 transition-transform active:scale-95">
            <span className="relative transition-transform group-hover:scale-105">
              <AppIcon functie={item.icoon} maat="lg" />
              {item.aantal ? <span aria-hidden="true" className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-[color-mix(in_oklch,var(--ic-koraal)_22%,var(--background))] text-[11px] font-bold text-ink">{item.aantal}</span> : null}
            </span>
            <span className="text-center text-xs font-semibold leading-tight text-ink">{item.titel}</span>
            {item.aantal ? <span className="sr-only">{item.aantal} wacht op jou</span> : null}
          </Link>);
        })}
      </div>
      {overigeActies.length > 0 ? (<p className="mt-4 text-center text-xs text-ink-soft">
        {t("menu.itemsWaitingForYou", "Nog {{count}} onderdelen wachten op jou: ", { count: overigeActies.length })}{overigeActies.map((i, n) => (<span key={i.to}>{n > 0 ? ", " : ""}<Link to={i.to} onClick={() => registreerMeerBezoek(i.to)} className="font-semibold text-brand underline-offset-2 hover:underline">{vertaalItem(i).titel}</Link></span>))}
      </p>) : null}
    </section>

    {/* Alle overige onderdelen */}
    <label className="mt-5 flex min-h-11 items-center gap-2 border-b border-border py-2"><AppIcon functie="zoeken" maat="sm" vorm="kaal" /><input value={zoek} onChange={(e) => setZoek(e.target.value)} placeholder={t("menu.searchPlaceholder", "Zoek in het menu")} aria-label={t("menu.searchPlaceholder", "Zoek in het menu")} className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></label>
    <section className="mt-2">
      {q ? <><MeerSectie titel={t("menu.searchResults", "Gevonden")} klein compact onBezoek={registreerMeerBezoek} items={resultaten.map(metAantal).map(vertaalItem)} />{!resultaten.length ? <p className="mt-2 text-sm text-ink-soft">{t("menu.noResults", "Niets gevonden. Probeer een ander woord.")}</p> : null}{/persoon|contact|familie|verzorger|people/.test(q) ? <Button variant="link" className="min-h-11 px-0" onClick={() => setPersonenOpen(true)}>{t("menu.viewImportantContacts", "Belangrijke personen bekijken")}</Button> : null}</> : <>
        <MeerSectie titel={t("menu.sections.daily", "Dagelijks")} klein compact onBezoek={registreerMeerBezoek} items={dagelijks.map(metAantal).map(vertaalItem)} />
        <MeerSectie titel={t("menu.sections.family", "Gezin")} klein compact onBezoek={registreerMeerBezoek} items={gezinItems.map(metAantal).map(vertaalItem)} />
        <Button variant="ghost" className="min-h-14 h-auto w-full justify-start gap-3.5 whitespace-normal rounded-none border-b border-border px-0 text-left" onClick={() => setPersonenOpen(true)}><AppIcon functie="contact" maat="lg" /><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{t("menu.importantPeople", "Belangrijke personen")}</span><span className="block text-xs font-normal text-ink-soft">{t("menu.importantPeopleDesc", "Familie, verzorgers en andere betrokkenen")}</span></span><ChevronRight className="size-5 shrink-0 text-ink-soft" /></Button>
        {[{ titel: "Steun", key: "support", items: ondersteuning }, { titel: "Account", key: "settings", items: account }].map((c) => <MeerSectie key={c.titel} titel={t(`menu.sections.${c.key}`, c.titel)} klein compact onBezoek={registreerMeerBezoek} items={c.items.map(metAantal).map(vertaalItem)} />)}
      </>}
    </section>
    <Sheet open={personenOpen} onOpenChange={setPersonenOpen}>
      <SheetContent side="bottom" className="inset-x-0 mx-auto w-full max-w-md max-h-[80dvh] overflow-y-auto rounded-t-2xl bg-background px-5 pb-8">
        <SheetHeader className="pr-8 text-left">
          <SheetTitle>{t("menu.importantPeopleSheet.title", "Belangrijke personen")}</SheetTitle>
          <SheetDescription>{t("menu.importantPeopleSheet.desc", "Kies een kind voor de bestaande contacten. Een contact toevoegen geeft geen toegang tot de app.")}</SheetDescription>
        </SheetHeader>
        <div className="mt-3 divide-y divide-border">
          {profielen.map((k) => (
            <Button asChild key={k.id} variant="ghost" className="min-h-11 w-full justify-between">
              <Link to={eigen ? "/kinderen/$kindId" : "/kring/$kindId"} params={{ kindId: k.id }}>
                {k.naam}
                <ChevronRight className="size-4 shrink-0 text-ink-soft" />
              </Link>
            </Button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
    <Sheet open={hulpOpen} onOpenChange={(o) => { setHulpOpen(o); setIntroBevestigen(false); }}>
      <SheetContent side="bottom" className="inset-x-0 mx-auto w-full max-w-md max-h-[80dvh] overflow-y-auto rounded-t-2xl bg-background px-5 pb-8">
        <SheetHeader className="pr-8 text-left">
          <SheetTitle>{t("menu.helpSheet.title", "Hulp en uitleg")}</SheetTitle>
          <SheetDescription>{t("menu.helpSheet.desc", "Rondleiding, uitleg en bestaande hulp op één plek.")}</SheetDescription>
        </SheetHeader>
        <div className="mt-3 divide-y divide-border">
          <Button asChild variant="ghost" className="min-h-11 w-full justify-start">
            <Link to="/rondleiding">{t("menu.helpSheet.startTour", "Rondleiding starten")}</Link>
          </Button>
          <details className="py-2">
            <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold">{t("menu.helpSheet.faqTitle", "Uitleg en veelgestelde vragen")}</summary>
            <p className="pb-2 text-sm text-ink-soft">{t("menu.helpSheet.faqDesc", "Je kunt de rondleiding zo vaak starten als je wilt. Dat verandert geen kindprofielen, afspraken of andere gezinsgegevens. In het voorbeeldgezin worden geen echte meldingen of betalingen verstuurd.")}</p>
          </details>
          <Button asChild variant="ghost" className="min-h-11 w-full justify-start">
            <Link to="/ondersteuning">{t("menu.helpSheet.contactOrHelp", "Contact of hulp")}</Link>
          </Button>
          <Button variant="ghost" className="min-h-11 w-full justify-start" onClick={() => setIntroBevestigen(true)}>
            {t("menu.helpSheet.reopenIntro", "Introductie opnieuw openen")}
          </Button>
          {introBevestigen ? (
            <div className="space-y-3 py-3">
              <p className="text-sm">{t("menu.helpSheet.introWarning", "De introductie zelf verwijdert niets. Als je daarna een nieuw gezin begint, vervangt dit je eigen gegevens op dit apparaat, waaronder kinderen, afspraken en uitgaven. De rondleiding opnieuw starten verandert niets.")}</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => setIntroBevestigen(false)}>{t("common.back", "Terug")}</Button>
                <Button asChild>
                  <Link to="/welkom">{t("menu.helpSheet.understoodOpen", "Ik begrijp het, open introductie")}</Link>
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  </AppShell>);
}
