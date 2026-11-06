import { agendaItems, iso, plusDagen, voorkomens, dt } from "@/lib/agenda-datum";
import { uur } from "@/lib/tijd-tekst";
import { AppLogo } from "@/components/AppLogo";
import { LanguageSelector } from "@/components/LanguageSelector";
import { AppIcon } from "@/components/AppIcon";
import { IkBenLater } from "@/components/IkBenLater";
import { EigenKinderen, EigenVandaag, EigenVolgende } from "@/components/EersteHome";
import { useStart, start as startActies } from "@/lib/start-store";
import { NuAfstemmenKaart } from "@/components/NuAfstemmen";
import { openNuAfstemmen, useNuAfstemmen } from "@/lib/nu-afstemmen-store";
import { markeerVanOverzicht, neemHeropen } from "@/lib/terug-store";
import { accepteer as accepteerZorg, wijsAf as wijsAfZorg } from "@/lib/zorg-store";
import { reageer as reageerBudget } from "@/lib/budget-store";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AppShell } from "@/components/AppShell";
import { ActiviteitenBel, useActiviteiten } from "@/components/Activiteiten";
import { useBudgetten } from "@/lib/budget-store";
import { useZorg } from "@/lib/zorg-store";
import { eigenOpenVoorstellen, useAfspraken } from "@/lib/afspraken-store";
import { useVakanties } from "@/lib/vakantie-store";
import { useTeControleren } from "@/lib/import-store";
import { useActiesVerwerkt } from "@/lib/acties-store";
import { useProWerk, voorOudersVan } from "@/lib/pro-journaal-store";
import { LivingSfeer } from "@/components/LivingHome";
import { begroeting, bijzonderMoment } from "@/lib/living-home";
import { useVoorkeuren } from "@/lib/voorkeuren-store";
import { DagCheckin } from "@/components/DagCheckin";
import { Vooruitkijken } from "@/components/Vooruitkijken";
import { nogTeVerrekenen, useKosten } from "@/lib/kosten-store";
import { berekenSaldo } from "@/lib/verrekening";
import { useWissel } from "@/lib/wissel-store";
import { meeLijst, useTaken } from "@/lib/taken-store";
import { afspraken, categorieMeta, kinderen, parents, zorgweek } from "@/lib/demo-data";
import { useMomentjes } from "@/lib/momentjes-store";
import { regelStatus, toggleMee, useKring } from "@/lib/kring-store";
import { useAuth } from "@/contexts/AuthContext";
import { fetchChildren } from "@/lib/child-service";
import { User, ChevronLeft, ChevronRight } from "lucide-react";
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Home — Ouderschap & Co" },
      {
        name: "description",
        content: "Wat speelt er vandaag, wat moet je nog regelen en wat komt er aan: je rustige dagoverzicht voor co-ouderschap.",
      },
      { property: "og:title", content: "Home — Ouderschap & Co" },
      { property: "og:description", content: "Je dagelijkse overzicht voor co-ouderschap in één rustig scherm." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HomePagina,
});
/** Eén Home. Bij een eigen gezin vallen voorbeeldbronnen weg en groeien de onderdelen mee met wat echt bekend is. */
function HomePagina() {
  return <Dashboard />;
}
const acties = [
  { id: "afspraak-voorstel", icoon: "voorstel", titel: "Voorgestelde afspraak", sub: "Rustige berichttijden na 20:00 uur", status: "Wacht op jou", naar: "/afspraken" },
];
const toevoegOpties = [
  { icoon: "agenda", label: "Afspraak" },
  { to: "/afspraken", icoon: "voorstel", label: "Voorstel" },
  { to: "/taken", icoon: "taken", label: "Taak" },
  { to: "/kosten", icoon: "kosten", label: "Kosten" },
  { to: "/momentjes", icoon: "momentjes", label: "Momentje" },
  { to: "/documenten", icoon: "documenten", label: "Document" },
  { to: "/overdracht", icoon: "overdracht", label: "Overdracht" },
];
/** Afspraak vanaf Home: eerst de soort kiezen, daarna opent het agendaformulier alvast bij de juiste soort. */
const afspraakOpties = Object.entries(categorieMeta).map(([key, meta]) => ({
  to: "/agenda",
  search: { nieuw: true, categorie: key },
  label: meta.label,
}));
/** Voorstel doen vanaf Home: direct de soort kiezen, daarna opent de bestaande flow. */
const voorstelOpties = [
  { label: "Wisselmoment aanpassen", to: "/zorgregeling", search: { actie: "wijziging", bron: "home" } },
  { label: "Tijd wijzigen", to: "/veranderd", search: { situatie: "afspraak" } },
  { label: "Dag ruilen", to: "/zorgregeling", search: { actie: "wijziging", bron: "home" } },
  { label: "Extra dag/nacht", to: "/zorgregeling", search: { actie: "wijziging", bron: "home" } },
  { label: "Nieuwe afspraak", to: "/afspraken", search: { nieuw: "voorstel", bron: "home" } },
  { label: "Vakantie voorstellen", to: "/planning", search: { toevoegen: "vakantie" } },
  { label: "Ophalen of brengen", to: "/veranderd", search: { situatie: "halen" } },
  { label: "Budgetvoorstel", to: "/kosten", search: { budget: "nieuw" } },
  { label: "Nieuwe afspraak die rust geeft", to: "/afspraken", search: { nieuw: "voorstel", bron: "rust" } },
  { label: "Anders", to: "/afspraken", search: { nieuw: "voorstel", bron: "home" } },
];
const euro = (n) => n.toLocaleString("nl-NL", { style: "currency", currency: "EUR" });
const nu = new Date();
const vandaagNaam = nu.toLocaleDateString("nl-NL", { weekday: "long" });
const vandaagDatum = nu.toLocaleDateString("nl-NL", { day: "numeric", month: "long" });
function OverdrachtIcoon() {
  return (<svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 7V5.75A1.75 1.75 0 0 1 9.75 4h4.5A1.75 1.75 0 0 1 16 5.75V7" />
    <path d="M5.5 7.5h13A1.5 1.5 0 0 1 20 9v8.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5V9a1.5 1.5 0 0 1 1.5-1.5Z" />
    <path d="M4 12h16M9 11v2M15 11v2" />
  </svg>);
}
function WisselIcoon() {
  return (<svg aria-hidden="true" viewBox="0 0 16 16" className="size-[13px]" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3.5 5.75h9" />
    <path d="M10.25 3.25 12.75 5.75 10.25 8.25" />
    <path d="M12.5 10.25h-9" />
    <path d="M5.75 7.75 3.25 10.25 5.75 12.75" />
  </svg>);
}
function Dashboard() {
  const { t, i18n } = useTranslation();
  const { user, profile, loading: authLoading } = useAuth();
  const nav = useNavigate();
  const st = useStart();
  const eigen = st.eigen;
  const isEn = i18n.language?.startsWith("en");
  const locale = isEn ? "en-US" : "nl-NL";

  // Redirect to welcome screen if not authenticated and not in demo mode
  useEffect(() => {
    if (!authLoading) {
      let isDemo = false;
      try {
        isDemo = localStorage.getItem("onzeapp_demo_mode") === "true";
      } catch { }
      if (!user && !isDemo) {
        nav({ to: "/welkom" });
      }
    }
  }, [user, authLoading, nav]);

  // Dynamically sync children and user state whenever authenticated user is present
  useEffect(() => {
    if (user?.id) {
      if (user.name) {
        startActies.zetNaam(user.name);
      }
      if (user.avatar_url) {
        startActies.zetOuderBeeld(user.avatar_url);
      }
      fetchChildren(user.id).then((kids) => {
        if (Array.isArray(kids) && kids.length > 0) {
          startActies.zetKinderen(kids);
        }
      }).catch((e) => console.warn("[Dashboard] fetchChildren notice:", e));
    }
  }, [user?.id, user?.name, user?.avatar_url]);

  const currentProfileName = (user?.name || profile?.name || (eigen ? st.naam : "") || "").trim();
  const isGenericOuder = !currentProfileName || /^ouder(\s*\d+)?$/i.test(currentProfileName) || /^parent(\s*\d+)?$/i.test(currentProfileName) || currentProfileName === "0" || currentProfileName.toLowerCase() === "ouder";
  const userInitial = (!isGenericOuder && currentProfileName)
    ? currentProfileName.slice(0, 1).toUpperCase()
    : null;
  const userAvatar = profile?.avatar_url || user?.avatar_url || (eigen ? st.beeld : parents.sanne.avatar);

  const demoDagenEN = { 10: "Mon", 11: "Tue", 12: "Wed", 13: "Thu", 14: "Fri", 15: "Sat", 16: "Sun" };
  const dagNaam = (n) => isEn ? (demoDagenEN[n] ?? "") : (zorgweek.find((d) => d.datum === n)?.dag ?? "");
  const maandKort = isEn ? "Mar" : "mrt";
  const vertaalTitel = (titel) => {
    if (!isEn || !titel) return titel;
    return titel
      .replace(/^Ouderavond/i, "Parents' evening")
      .replace(/^Voetbaltraining/i, "Soccer practice")
      .replace(/^Tandarts/i, "Dentist")
      .replace(/^Zwemles/i, "Swimming lesson")
      .replace(/^Wisselmoment/i, "Handover");
  };
  const vertaalDatumLabel = (lbl) => {
    if (!isEn || !lbl) return lbl;
    return lbl
      .replace(/^Ma /i, "Mon ")
      .replace(/^Di /i, "Tue ")
      .replace(/^Wo /i, "Wed ")
      .replace(/^Do /i, "Thu ")
      .replace(/^Vr /i, "Fri ")
      .replace(/^Za /i, "Sat ")
      .replace(/^Zo /i, "Sun ")
      .replace(/\bjanuari\b/gi, "January")
      .replace(/\bfebruari\b/gi, "February")
      .replace(/\bmaart\b/gi, "March")
      .replace(/\bapril\b/gi, "April")
      .replace(/\bmei\b/gi, "May")
      .replace(/\bjuni\b/gi, "June")
      .replace(/\bjuli\b/gi, "July")
      .replace(/\baugustus\b/gi, "August")
      .replace(/\bseptember\b/gi, "September")
      .replace(/\boktober\b/gi, "October")
      .replace(/\bnovember\b/gi, "November")
      .replace(/\bdecember\b/gi, "December")
      .replace(/\bmrt\b/gi, "Mar");
  };

  const [toevoegenOpen, setToevoegenOpen] = useState(false);
  const [voorstelMenu, setVoorstelMenu] = useState(false);
  const [afspraakMenu, setAfspraakMenu] = useState(false);
  const [puntenOpen, setPuntenOpen] = useState(false);
  const PLAN_GEZIEN = "onzeapp-plan-wijziging-gezien-8-maart";
  const [planGezien, setPlanGezien] = useState(false);
  useEffect(() => {
    try {
      setPlanGezien(localStorage.getItem(PLAN_GEZIEN) === "1");
    }
    catch { /* geen opslag */ }
  }, []);
  useEffect(() => {
    if (neemHeropen())
      setPuntenOpen(true);
  }, []);
  const [spullenOpen, setSpullenOpen] = useState(false);
  const verwerkt = useActiesVerwerkt();
  const kring = useKring();
  const nuAfstemmen = useNuAfstemmen();
  useTaken();
  // Eén bron voor wat er mee moet: dezelfde lijst als Overdracht en Even vooruitkijken.
  const wisselMoment = kring.momenten.find((m) => m.soort === "wissel");
  const meeItems = wisselMoment ? meeLijst(wisselMoment) : [];
  const meeKlaar = wisselMoment ? kring.meeKlaar[wisselMoment.id] ?? [] : [];
  const ophalen = regelStatus("w1");
  const wissel = useWissel();
  const kostenLijst = useKosten();
  const saldo = nogTeVerrekenen(kostenLijst);
  const saldoDetail = berekenSaldo(kostenLijst);
  const [kostenOpen, setKostenOpen] = useState(false);
  const { lijst: momentjes } = useMomentjes();
  const heeftSaldo = Math.abs(saldo) >= 0.01;
  const saldoTekst = euro(Math.abs(saldo));
  // Wat de professional aan deze ouder vraagt, komt uit dezelfde bron als in de professionele werkruimte.
  const vanPro = voorOudersVan(useProWerk(), "bakker", "Sanne");
  const proItems = [
    ...vanPro.acties.filter((a) => !a.klaar).map((a) => ({ id: `pro-${a.id}`, icoon: "taken", titel: a.tekst, sub: "Gevraagd door je professional", status: "Wacht op jou", naar: "/ondersteuning" })),
    ...vanPro.gezamenlijk.filter((g) => !g.akkoord["Sanne"] && !g.nietAkkoord?.["Sanne"]).map((g) => ({ id: `pro-${g.id}`, icoon: "afspraak", titel: "Afspraak ter bevestiging", sub: g.tekst, status: "Wacht op jou", naar: "/ondersteuning" })),
    ...vanPro.berichten.filter((b) => !b.gezien["Sanne"]).map((b) => ({ id: `pro-${b.id}`, icoon: "post", titel: "Bericht van je professional", sub: b.onderwerp, status: "Wacht op jou", naar: "/ondersteuning" })),
  ];
  // Status komt uit de bron: wat elders is afgehandeld, verdwijnt hier vanzelf.
  const alleBudgetten = useBudgetten();
  const alleZorg = useZorg().voorstellen;
  const alleVakanties = useVakanties();
  // Afgerond: uit dezelfde bronnen, alleen-lezen, zodat niets dubbel wordt opgeslagen.
  const afgerond = [
    ...alleBudgetten.filter((b) => b.status === "akkoord").map((b) => ({ id: `ab-${b.id}`, titel: `Budget afgesproken: ${b.wat}`, naar: "/kosten" })),
    ...alleZorg.filter((v) => v.status !== "open").map((v) => ({ id: `az-${v.id}`, titel: `${vertaalDatumLabel(v.datumLabel)} · ${v.status === "geaccepteerd" ? "akkoord" : v.status}`, naar: "/zorgregeling" })),
    ...alleVakanties.filter((v) => v.status === "afgesproken").map((v) => ({ id: `av-${v.id}`, titel: `${v.naam} afgesproken`, naar: "/planning" })),
  ];
  const budgetItems = alleBudgetten.filter((b) => b.status === "wacht" || b.status === "tegenvoorstel").map((b) => ({
    id: `budget-${b.id}`, icoon: "kosten", titel: b.status === "tegenvoorstel" ? t("home.budgetCounterProposal", "Tegenvoorstel budget") : t("home.budgetProposal", "Budgetvoorstel"),
    sub: `${b.wat} · ${b.kind} · ${euro(b.stappen.at(-1)?.bedrag ?? b.max)}`, status: b.aanZet === "Sanne" ? "Wacht op jou" : "Afstemming loopt", naar: "/kosten",
    snel: b.aanZet === "Sanne" ? [{ label: t("common.agree", "Akkoord"), doe: () => reageerBudget(b.id, "Sanne", "akkoord") }] : undefined,
  }));
  const zorgItems = alleZorg.filter((v) => v.status === "open").map((v) => ({
    id: `zorg-${v.id}`, icoon: "zorgregeling", titel: v.soort === "eenmalig" ? t("home.askChangeSingleDay", "Vraag om een dag te wijzigen") : t("home.askChangeCareSchedule", "Vraag om de vaste verdeling te wijzigen"),
    voorstelId: v.id, voorstelKind: v.kinderen[0], sub: vertaalDatumLabel(v.datumLabel), status: v.van === "Sanne" ? "Afstemming loopt" : "Wacht op jou", naar: "/zorgregeling",
    snel: v.van === "Sanne" ? undefined : [{ label: t("common.agree", "Akkoord"), doe: () => accepteerZorg(v.id) }, { label: t("common.reject", "Afwijzen"), doe: () => wijsAfZorg(v.id) }],
  }));
  const afspraakItems = eigenOpenVoorstellen(useAfspraken()).map((v) => ({
    id: `afspraak-${v.id}`, icoon: "voorstel", titel: t("home.yourProposal", "Jouw voorstel"), sub: `${v.titel} · ${v.kind}`, status: "Afstemming loopt", naar: "/afspraken",
  }));
  const vakantieItems = alleVakanties.filter((v) => v.status === "voorstel").map((v) => ({
    id: `vakantie-${v.id}`, icoon: "vakantie", titel: v.van === "Sanne" ? t("home.yourHolidayProposal", "Jouw vakantievoorstel") : t("home.holidayProposal", "Vakantievoorstel"), sub: `${v.naam} · ${v.periode}`,
    status: v.van === "Sanne" ? "Afstemming loopt" : "Wacht op jou", naar: "/planning",
  }));
  const importOpen = useTeControleren();
  const importItems = importOpen > 0 ? [{
    id: "import-ouderschapsplan", icoon: "documenten", titel: t("home.checkParentingPlan", "Ouderschapsplan controleren"),
    sub: importOpen === 1 ? "1 herkende afspraak wacht op je keuze" : `${importOpen} herkende afspraken wachten op je keuze`, status: "Wacht op jou", naar: "/documenten",
  }] : [];
  const openActies = eigen ? [...afspraakItems] : [
    // Geld komt eerst in "Nog te regelen": zo staat het niet los bovenaan, maar tussen de punten die jouw actie vragen.
    ...(heeftSaldo
      ? [{
        id: "kosten-openstaand",
        icoon: "kosten",
        titel: t("home.toPay", "Nog te betalen"),
        sub: saldo > 0 ? t("home.stillToPayAmount", "Nog {{amount}} te betalen", { amount: saldoTekst }) : t("home.youWillReceiveAmount", "Je ontvangt nog {{amount}}", { amount: saldoTekst }),
        status: "Wacht op jou",
        naar: "/kosten",
      }]
      : []),
    ...budgetItems,
    ...vakantieItems,
    ...importItems,
    ...afspraakItems,
    ...zorgItems,
    ...acties.filter((a) => !verwerkt.has(a.id)),
    ...proItems,
  ];
  // Wat op jou wacht eerst; wat al loopt bij de ander daarna. Binnen een groep blijft de volgorde gelijk.
  const zorgVoorJou = eigen ? [] : alleZorg.filter((v) => v.status === "open" && v.van !== "Sanne");
  const voorJou = useActiviteiten().voorstellen.filter((v) => v.aanJou && !["akkoord", "afgerond", "afgewezen", "ingetrokken"].includes(v.status)).length;
  const toonActies = [...openActies].sort((a, b) => Number(a.status !== "Wacht op jou") - Number(b.status !== "Wacht op jou")).slice(0, 3);
  const vk = useVoorkeuren();
  const [klokNu, setKlokNu] = useState(null);
  useEffect(() => setKlokNu(new Date()), []);
  const spullenTeGaan = meeItems.filter((x) => !meeKlaar.includes(x)).length;
  const huidigeDag = 12;
  const wisseldag = zorgweek.find((dag) => dag.wissel);
  const huidigeIndex = zorgweek.findIndex((dag) => dag.datum === huidigeDag);
  const wisselIndex = zorgweek.findIndex((dag) => dag.wissel);
  const wisselPct = ((wisselIndex + 14.5 / 24) / zorgweek.length) * 100;
  const huidigePct = ((huidigeIndex + 0.5) / zorgweek.length) * 100;
  const dagenTotWissel = wisseldag ? wisseldag.datum - huidigeDag : 2;
  const zwemtasNodig = !wissel.klaar.has("zwemtas");
  const dagen = zorgweek.filter((d) => d.datum >= 12 && d.datum <= 15);
  const vorigJaar = new Date(nu.getFullYear() - 1, nu.getMonth(), nu.getDate());
  const vorigJaarIso = `${vorigJaar.getFullYear()}-${String(vorigJaar.getMonth() + 1).padStart(2, "0")}-${String(vorigJaar.getDate()).padStart(2, "0")}`;
  const jaarMomentjes = momentjes.filter((m) => m.datum === vorigJaarIso && !m.prive);
  const moment = bijzonderMoment({ kinderen, wisselTijd: dagenTotWissel === 0 ? "14:30" : undefined, nu });
  const tip = dagenTotWissel <= 2
    ? "Leg spullen die mee moeten alvast op één plek."
    : "Een korte, praktische overdracht geeft kinderen vaak meer rust.";
  const overdrachtDichtbij = dagenTotWissel <= 1;
  // Vertrekmodus: op de wisseldag in de 3 uur vóór 14:30; na de wissel verdwijnt hij.
  const uurNu = new Date().getHours() + new Date().getMinutes() / 60;
  const vertrekModus = dagenTotWissel <= 0 && uurNu >= 11.5 && uurNu < 14.5;
  const wisselLabel = dagenTotWissel <= 0 ? "Vandaag · 14:30 uur" : dagenTotWissel === 1 ? "Morgen · 14:30 uur" : "Vrijdag · 14:30 uur";
  const komend = afspraken
    .filter((a) => a.dag >= huidigeDag && !a.titel.startsWith("Wisselmoment"))
    .sort((a, b) => a.dag - b.dag || a.tijd.localeCompare(b.tijd))
    .slice(0, 2);
  const eigenVandaag = klokNu ? iso(klokNu) : "";
  const eigenKomend = eigenVandaag ? agendaItems(st.agenda).flatMap((a) => voorkomens(a, eigenVandaag, plusDagen(eigenVandaag, 365)).map((datum) => ({ a, datum }))).sort((x, y) => (x.datum + x.a.tijd).localeCompare(y.datum + y.a.tijd)).slice(0, 2) : [];

  return (<AppShell>
    {!st.eigen ? (<button onClick={() => {
      startActies.terugNaarEigen();
      try { localStorage.removeItem("onzeapp_demo_mode"); } catch { }
    }} className="mb-3 flex min-h-[44px] w-full items-center justify-center rounded-full border border-border bg-card px-4 text-sm font-semibold text-brand hover:bg-brand-soft transition cursor-pointer gap-1.5">
      <ChevronLeft className="size-4 shrink-0" />
      <span>{t("home.backToOwnFamily", "Terug naar mijn eigen gezin")}</span>
    </button>) : null}
    <LivingSfeer moment={eigen ? null : moment} />
    {eigen ? null : <DagCheckin />}

    {/* header */}
    <div className="relative flex items-center justify-between">
      <AppLogo className="w-36 max-w-[42%]" />
      <div className="flex items-center gap-2">
        <ActiviteitenBel />
        <button onClick={() => setToevoegenOpen(true)} aria-label={t("common.actions", "Toevoegen")} className="grid size-9 place-items-center rounded-full border border-brand/40 text-lg leading-none text-brand cursor-pointer hover:bg-brand-soft">
          +
        </button>
        <Link to="/instellingen" aria-label={t("header.settings", "Instellingen")}>
          {userAvatar ? (
            <img
              src={userAvatar}
              alt={currentProfileName || "Profiel"}
              width={36}
              height={36}
              className="size-9 rounded-full object-cover"
            />
          ) : userInitial ? (
            <span className="grid size-9 place-items-center rounded-full bg-brand-soft font-display font-bold text-brand">
              {userInitial}
            </span>
          ) : (
            <span className="grid size-9 place-items-center rounded-full bg-brand-soft text-brand">
              <User className="size-4" />
            </span>
          )}
        </Link>
      </div>
    </div>

    {/* begroeting */}
    <div className="relative mt-6">
      <h1 className="font-display text-[23px] leading-tight">
        {(() => {
          const hr = (klokNu || nu).getHours();
          const timeGreeting = hr < 12 ? t("home.greetingMorning", "Goedemorgen") : hr < 18 ? t("home.greetingAfternoon", "Goedemiddag") : hr < 23 ? t("home.greetingEvening", "Goedenavond") : t("home.greetingNight", "Goedenacht");
          const userName = eigen ? (currentProfileName || "") : parents.sanne.naam;
          return userName ? `${timeGreeting}, ${userName}` : `${timeGreeting}`;
        })()}
      </h1>
      <p className="mt-0.5 flex items-center text-sm text-ink-soft">
        {(klokNu || nu).toLocaleDateString(locale, { day: "numeric", month: "long" })}
      </p>
      {!eigen && vk.livingHome && vk.bijzondereMomenten && moment && <p className="mt-1 text-xs font-semibold text-accent-warm">{moment.tekst}</p>}
      {/* kinderen: tikken opent de volledige kindpagina (noodkaart, school, verzekeringen) */}
      {eigen ? <EigenKinderen /> : <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Open de pagina van een kind">
        {kinderen.map((kind) => (<Link key={kind.id} to={`/kinderen/${kind.id}`} className="flex items-center gap-2 rounded-full border border-border bg-card py-1 pl-1 pr-3 text-sm transition-colors hover:border-brand/40">
          <img src={kind.avatar} alt="" loading="lazy" width={816} height={816} className="size-7 rounded-full object-cover" />
          <span className="font-semibold">{kind.naam}</span>
          <ChevronRight className="size-3.5 text-ink-soft shrink-0" />
        </Link>))}
      </div>}
    </div>

    {/* Nu afstemmen doorbreekt tijdelijk de rust; gewone berichten staan alleen als badge in de balk onderaan */}
    {openNuAfstemmen(nuAfstemmen).filter((n) => !eigen || n.id !== "na-demo").map((n) => <NuAfstemmenKaart key={n.id} n={n} />)}


    {/* vandaag: tijdlijn bovenaan — de kinderen zijn bij jou tot het wisselmoment */}
    {eigen ? <EigenVandaag /> : <section className="relative mt-5 rounded-lg border border-border px-5 py-4" style={{ background: "linear-gradient(160deg, color-mix(in oklab, var(--brand) 10%, var(--card)), var(--card) 55%)" }}>
      <p className="text-[11px] font-semibold tracking-[0.14em] text-brand uppercase">{t("common.today", "Vandaag")}</p>
      <p className="mt-1 font-display text-xl font-bold leading-snug">
        {dagenTotWissel <= 0
          ? t("home.handoverToday", "Vandaag is een wisseldag")
          : t("home.kidsWithYouToday", { names: "Emma & Noah", defaultValue: "Emma & Noah zijn vandaag bij jou" })}
      </p>
      <p className="mt-0.5 text-sm text-ink-soft">
        {dagenTotWissel <= 0
          ? t("home.nextHandoverToday", "Wissel vandaag · 14:30 uur")
          : dagenTotWissel === 1
            ? t("home.nextHandoverTomorrow", "Volgende wissel · morgen 14:30 uur")
            : t("home.nextHandoverFriday", "Volgende wissel · vrijdag 14:30 uur")}
      </p>

      {/* compacte weeklijn */}
      <div className="relative mt-3 h-4" aria-label="Weeklijn: de kinderen zijn bij jou tot het wisselmoment">
        <span className="absolute left-0 right-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full" style={{ background: `linear-gradient(to right, color-mix(in oklab, var(--brand) 88%, var(--card)) ${wisselPct}%, color-mix(in oklab, var(--accent-warm) 68%, var(--card)) ${wisselPct}%)` }} />
        <span className="home-vandaag-punt absolute top-1/2 size-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand" style={{ left: `${huidigePct}%`, boxShadow: "0 0 0 2.5px var(--card)" }} />
        <span className="absolute top-1/2 grid size-4 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-card text-brand ring-1 ring-brand/25" style={{ left: `${wisselPct}%` }}>
          <WisselIcoon />
        </span>
      </div>
      <div className="mt-1 grid grid-cols-7">
        {zorgweek.map((d) => (<span key={d.datum} className={`text-center text-[9px] uppercase tracking-[0.12em] ${d.datum === huidigeDag ? "font-bold text-ink" : "text-ink-soft"}`}>{dagNaam(d.datum)}</span>))}
      </div>

      {/* overdracht: pas binnen 24 uur, als één klikbaar geheel */}
      {vertrekModus && meeItems.length && !wissel.overdrachtIngevuld ? (<div className="mt-4 rounded-md bg-brand-soft/60 px-3 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand">{t("home.almostTime", "Bijna tijd")} · {wisselLabel}</p>
        {wisselMoment ? <IkBenLater momentId={wisselMoment.id} /> : null}
        <ul className="mt-2 space-y-1.5">
          {meeItems.map((item) => {
            const klaar = meeKlaar.includes(item);
            return (<li key={item}>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={klaar} onChange={() => wisselMoment && toggleMee(wisselMoment.id, item)} className="size-4 accent-[var(--brand)]" />
                <span className={klaar ? "text-ink-soft line-through" : ""}>{item}</span>
              </label>
            </li>);
          })}
        </ul>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-ink-soft">
            {spullenTeGaan === 0 ? t("home.allCheckedOff", "Alles afgevinkt ✓") : t("home.itemsNotCheckedOff", "{{count}} dingen nog niet afgevinkt", { count: spullenTeGaan })}
          </span>
          <Link to="/overdracht" className="inline-flex items-center gap-1 text-xs font-semibold text-brand">
            <span>{t("home.openHandover", "Overdracht openen")}</span>
            <ChevronRight className="size-3.5" />
          </Link>
        </div>
      </div>) : overdrachtDichtbij ? (wissel.overdrachtIngevuld || spullenTeGaan === 0 ? (<Link to="/overdracht" className="mt-4 flex items-center gap-3 border-t border-border pt-3">
        <span className="text-brand" aria-hidden="true">✓</span>
        <span className="flex-1">
          <span className="block text-sm font-semibold text-brand">
            {t("home.allReadyForHandover", "Alles klaar voor de overdracht")}
          </span>
          <span className="text-xs text-ink-soft">{wisselLabel}</span>
        </span>
        <ChevronRight className="size-5 shrink-0 text-ink-soft" />
      </Link>) : (<Link to="/overdracht" className="mt-4 flex items-center gap-3 rounded-md bg-brand-soft/60 px-3 py-3">
        <span className="text-brand"><OverdrachtIcoon /></span>
        <span className="flex-1">
          <span className="block text-sm font-semibold">
            {t("home.prepareHandover", "Overdracht voorbereiden")}
          </span>
          <span className="text-xs text-ink-soft">
            {wisselLabel} · {t("home.itemsStillNeeded", "{{count}} dingen moeten nog mee", { count: spullenTeGaan })}
          </span>
        </span>
        <ChevronRight className="size-5 shrink-0 text-ink-soft" />
      </Link>)) : null}
    </section>}

    {/* wat er aan komt: kort overzicht voor beide kinderen, max. drie momenten */}
    {!eigen && komend.length ? (<section className="relative mt-5">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-lg font-bold">{t("home.upcoming", "Binnenkort")}</h2>
        <Link to="/agenda" className="inline-flex items-center gap-0.5 text-xs font-semibold text-brand">
          <span>{t("home.agendaLink", "Agenda")}</span>
          <ChevronRight className="size-3.5" />
        </Link>
      </div>
      <ul className="mt-2">
        {komend.map((a) => (<li key={a.id}>
          <Link to="/agenda" search={{ afspraak: a.id }} className="flex items-baseline gap-3 py-2 text-sm">
            <span className="w-20 shrink-0 text-sm font-bold text-brand">{dagNaam(a.dag)} {a.dag} {maandKort}</span>
            <span className="min-w-0 flex-1 truncate">{uur(a.tijd)} · {vertaalTitel(a.titel.split(" · ")[0])}</span>
            <span className="shrink-0 text-xs text-ink-soft">{a.kind}</span>
          </Link>
        </li>))}
      </ul>
    </section>) : null}

    {eigen && eigenKomend.length ? <section className="relative mt-5">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-lg font-bold">{t("home.upcoming", "Binnenkort")}</h2>
        <Link to="/agenda" className="inline-flex items-center gap-0.5 text-xs font-semibold text-brand">
          <span>{t("home.agendaLink", "Agenda")}</span>
          <ChevronRight className="size-3.5" />
        </Link>
      </div>
      <ul className="mt-2">{eigenKomend.map(({ a, datum }) => <li key={a.id + datum}><Link to="/agenda" search={{ afspraak: a.id, dag: datum }} className="flex items-start gap-3 py-2 text-sm"><span className="w-20 shrink-0 font-bold text-brand">{dt(datum).toLocaleDateString(locale, { day: "numeric", month: "short" })}</span><span className="min-w-0 flex-1"><span className="block truncate">{a.tijd ? `${uur(a.tijd)} · ` : ""}{a.titel}</span><span className="text-xs text-ink-soft">{a.kind}</span></span></Link></li>)}</ul>
    </section> : null}

    {/* nog te regelen: één compacte regel, alleen wat echt op jou wacht */}
    {voorJou > 0 ? (<Link to="/activiteiten" search={{ onderdeel: "regelen" }} className="relative mt-6 flex items-center justify-between border-y border-border py-3">
      <span className="font-display text-lg font-bold">{t("home.toArrange", "Nog te regelen")}</span>
      <span className="inline-flex items-center gap-1 text-sm font-semibold text-accent-warm">
        <span>{t(voorJou === 1 ? "home.actionsForYou" : "home.actionsForYouPlural", { count: voorJou, defaultValue: `${voorJou} ${voorJou === 1 ? "actie" : "acties"} voor jou` })}</span>
        <ChevronRight className="size-4" />
      </span>
    </Link>) : (<p className="relative mt-6 border-y border-border py-3 text-sm text-ink-soft"><span className="font-display text-lg font-bold text-ink">{t("home.toArrange", "Nog te regelen")}</span><span className="mt-0.5 block text-brand">{t("home.allAligned", "✓ Alles is afgestemd.")}</span></p>)}

    {zorgVoorJou.length ? <ul className="relative mt-2 divide-y divide-border">{zorgVoorJou.map((v) => <li key={v.id}><Link to="/zorgregeling" search={{ voorstel: v.id, kind: v.kinderen[0] }} className="flex items-start justify-between gap-3 py-2.5 text-sm"><span className="min-w-0"><span className="block font-semibold">{t("home.scheduleChangeProposal", "Voorstel om de zorgverdeling te wijzigen")}</span><span className="text-xs text-ink-soft">{vertaalDatumLabel(v.datumLabel)} · {v.kinderen.map((k) => k === "emma" ? "Emma" : "Noah").join(" & ")}</span></span><ChevronRight className="size-4 text-brand shrink-0" /></Link></li>)}</ul> : null}
    {eigen ? <EigenVolgende /> : <Vooruitkijken />}

    {/* alleen wat er veranderd is — verdwijnt zodra je het bekeken hebt */}
    {false && !eigen && !planGezien ? (<Link to="/documenten" onClick={() => {
      setPlanGezien(true); try {
        localStorage.setItem(PLAN_GEZIEN, "1");
      }
      catch { /* geen opslag */ }
    }} className="relative mt-4 block text-xs text-ink-soft">
      {t("home.parentingPlanChanged", "Ouderschapsplan gewijzigd op 8 maart")} · <span className="font-semibold text-brand">{t("common.view", "Bekijken")}</span>
    </Link>) : null}

    {!eigen && jaarMomentjes.length ? (
      <Link to="/momentjes" className="relative mt-4 inline-flex items-center gap-1 text-xs text-ink-soft">
        <span>
          {t("home.oneYearAgoToday", "Een jaar geleden vandaag")} · <span className="font-semibold text-ink">{jaarMomentjes.length === 1 ? jaarMomentjes[0]?.tekst : t("home.momentsCount", { count: jaarMomentjes.length, defaultValue: `${jaarMomentjes.length} momentjes` })}</span>
        </span>
        <ChevronRight className="size-3.5" />
      </Link>
    ) : null}

    {toevoegenOpen ? (<div className="absolute inset-0 z-40 flex items-end justify-center bg-black/40 backdrop-blur-xs rounded-3xl overflow-hidden" onClick={() => { setToevoegenOpen(false); setVoorstelMenu(false); setAfspraakMenu(false); }}>
      <div className="max-h-[85%] w-full overflow-y-auto rounded-t-3xl bg-background p-5 pb-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
        {voorstelMenu ? <p className="font-display text-lg font-bold">{t("home.whatToArrange", "Wat wil je regelen?")}</p> : afspraakMenu ? <p className="font-display text-lg font-bold">{t("home.whatAppointment", "Wat voor afspraak is het?")}</p> : null}
        {!voorstelMenu && !afspraakMenu ? (<>
          <Link to="/veranderd" className="mt-3 flex items-center gap-3 rounded-lg bg-[color-mix(in_oklch,var(--ic-koraal)_14%,transparent)] px-3 py-3">
            <AppIcon functie="afstemmen" />
            <span className="flex-1">
              <span className="block text-sm font-bold">{t("home.coordinateNow", "Nu afstemmen")}</span>
              <span className="block text-xs font-semibold text-ink">{t("home.somethingChanged", "Er is onverwacht iets veranderd")}</span>
              <span className="block text-xs text-ink-soft">{t("home.coordinateDetail", "Bijvoorbeeld ziek, vertraagd of ophalen lukt niet.")}</span>
            </span>
            <ChevronRight className="size-5 shrink-0 text-ink-soft" />
          </Link>
          <div className="my-4 h-px bg-border" />
          <p className="font-display text-lg font-bold">{t("home.whatToAdd", "Wat wil je toevoegen?")}</p>
        </>) : null}
        <ul className="mt-3 space-y-0.5">
          {voorstelMenu
            ? voorstelOpties.map((o) => (<li key={o.label}>
              <Link to={o.to} search={o.search} className="flex items-center gap-3 py-3 text-sm font-semibold">
                <span className="flex-1">{t(`home.proposalOptions.${o.label === "Wisselmoment aanpassen" ? "switchMoment" : o.label === "Tijd wijzigen" ? "changeTime" : o.label === "Dag ruilen" ? "swapDay" : o.label === "Extra dag/nacht" ? "extraDay" : o.label === "Nieuwe afspraak" ? "newAgreement" : o.label === "Vakantie voorstellen" ? "proposeHoliday" : o.label === "Ophalen of brengen" ? "pickupDropoff" : o.label === "Budgetvoorstel" ? "budgetProposal" : o.label === "Nieuwe afspraak die rust geeft" ? "peaceAgreement" : "other"}`, o.label)}</span>
                <ChevronRight className="size-5 shrink-0 text-ink-soft" />
              </Link>
            </li>))
            : afspraakMenu
              ? afspraakOpties.map((o) => (<li key={o.label}>
                <Link to={o.to} search={o.search} onClick={() => { setToevoegenOpen(false); setAfspraakMenu(false); }} className="flex items-center gap-3 py-3 text-sm font-semibold">
                  <span className="flex-1">{o.label}</span>
                  <ChevronRight className="size-5 shrink-0 text-ink-soft" />
                </Link>
              </li>))
              : toevoegOpties.map((o) => (<li key={o.label}>
                {o.label === "Voorstel" ? (<button onClick={() => setVoorstelMenu(true)} className="flex w-full items-center gap-3 py-3 text-left text-sm font-semibold">
                  <AppIcon functie={o.icoon} />
                  <span className="flex-1">{t("home.makeProposal", "Voorstel doen")}</span>
                  <ChevronRight className="size-5 shrink-0 text-ink-soft" />
                </button>) : o.label === "Afspraak" ? (<Link to="/agenda" search={{ nieuw: true }} onClick={() => setToevoegenOpen(false)} className="flex w-full items-center gap-3 py-3 text-left text-sm font-semibold">
                  <AppIcon functie={o.icoon} />
                  <span className="flex-1">{t("home.appointment", "Afspraak")}</span>
                  <ChevronRight className="size-5 shrink-0 text-ink-soft" />
                </Link>) : (<Link to={o.to} search={("search" in o ? o.search : undefined)} className="flex items-center gap-3 py-3 text-sm font-semibold">
                  <AppIcon functie={o.icoon} />
                  <span className="flex-1">{o.label === "Taak" ? t("home.task", "Taak") : o.label === "Kosten" ? t("home.expense", "Kosten") : o.label === "Momentje" ? t("home.moment", "Momentje") : o.label === "Document" ? t("home.document", "Document") : o.label === "Overdracht" ? t("home.handover", "Overdracht") : o.label}</span>
                  <ChevronRight className="size-5 shrink-0 text-ink-soft" />
                </Link>)}
              </li>))}
        </ul>
        <button onClick={() => (voorstelMenu ? setVoorstelMenu(false) : afspraakMenu ? setAfspraakMenu(false) : setToevoegenOpen(false))} className="mt-3 w-full py-2 text-sm font-semibold text-ink-soft">
          {voorstelMenu || afspraakMenu ? t("common.back", "Terug") : t("common.close", "Sluiten")}
        </button>
      </div>
    </div>) : null}
    <Sheet open={puntenOpen} onOpenChange={setPuntenOpen}>
      <SheetContent side="bottom" className="inset-x-0 mx-auto w-full max-w-md max-h-[85vh] overflow-y-auto rounded-t-xl bg-card">
        <SheetHeader><SheetTitle className="font-display">{openActies.length === 1 ? t("home.actionsToAlignOne", "1 punt om af te stemmen") : t("home.actionsToAlignCount", { count: openActies.length, defaultValue: `${openActies.length} punten om af te stemmen` })}</SheetTitle></SheetHeader>
        {openActies.length === 0 ? <p className="px-4 pb-4 text-sm text-brand">{t("home.allAlignedCheck", "✓ Alles is afgestemd")}</p> : (<div className="px-4 pb-4">
          {["Wacht op jou", "Afstemming loopt"].map((groep) => {
            const items = openActies.filter((a) => (groep === "Wacht op jou" ? a.status === "Wacht op jou" : a.status !== "Wacht op jou"));
            if (items.length === 0)
              return null;
            return (<section key={groep} className="mt-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{groep === "Wacht op jou" ? t("home.waitingForYou", "Wacht op jou") : t("home.alignmentInProgress", "Afstemming loopt")} · {items.length}</h3>
              <ul className="divide-y divide-border">
                {items.map((a) => (<li key={a.id}>
                  <Link to={a.naar} search={("voorstelId" in a ? { voorstel: a.voorstelId, kind: a.voorstelKind } : undefined)} onClick={(e) => {
                    setPuntenOpen(false); if (a.id === "kosten-openstaand") {
                      e.preventDefault();
                      setKostenOpen(true);
                    }
                    else
                      markeerVanOverzicht();
                  }} className="flex items-center gap-3 py-3">
                    <AppIcon functie={a.icoon} maat="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold leading-snug">{a.titel}</p>
                      <p className="truncate text-xs text-ink-soft">{a.sub}</p>
                    </div>
                    <ChevronRight className="size-5 shrink-0 text-ink-soft" />
                  </Link>
                  {"snel" in a && a.snel ? (<div className="-mt-1 flex gap-2 pb-3 pl-9">
                    {a.snel.map((s) => (<button key={s.label} type="button" onClick={s.doe} className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-ink hover:bg-muted">{s.label}</button>))}
                  </div>) : null}
                </li>))}
              </ul>
            </section>);
          })}
        </div>)}
        {afgerond.length > 0 ? (<details className="px-4 pb-6">
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-ink-soft">{t("common.completed", "Afgerond")} · {afgerond.length}</summary>
          <ul className="mt-2 divide-y divide-border">
            {afgerond.map((a) => (<li key={a.id}>
              <Link to={a.naar} onClick={() => { setPuntenOpen(false); markeerVanOverzicht(); }} className="flex items-center gap-3 py-2.5 text-sm text-ink-soft">
                <span className="text-brand">✓</span><span className="flex-1">{a.titel}</span><ChevronRight className="size-4 shrink-0 text-ink-soft" />
              </Link>
            </li>))}
          </ul>
        </details>) : null}
      </SheetContent>
    </Sheet>
    <Sheet open={spullenOpen} onOpenChange={setSpullenOpen}>
      <SheetContent side="bottom" className="inset-x-0 mx-auto w-full max-w-md max-h-[85vh] overflow-y-auto rounded-t-xl bg-card">
        <SheetHeader><SheetTitle className="font-display">{spullenTeGaan === 0 ? t("home.everythingReady", "Alles staat klaar") : t("home.itemsToTakeCount", { count: spullenTeGaan, defaultValue: `${spullenTeGaan} ${spullenTeGaan === 1 ? "ding" : "dingen"} om mee te nemen` })}</SheetTitle></SheetHeader>
        <ul className="divide-y divide-border px-4">
          {meeItems.map((item) => {
            const klaar = meeKlaar.includes(item);
            return (<li key={item}>
              <label className="flex cursor-pointer items-center gap-3 py-3">
                <input type="checkbox" checked={klaar} onChange={() => wisselMoment && toggleMee(wisselMoment.id, item)} className="size-4 accent-[var(--brand)]" />
                <span className={`text-sm ${klaar ? "text-ink-soft line-through" : ""}`}>{item}</span>
              </label>
            </li>);
          })}
        </ul>
        <Link to="/overdracht" onClick={() => setSpullenOpen(false)} className="mx-4 mb-4 mt-2 inline-block text-sm font-semibold text-brand">{t("home.viewWholeHandover", "Hele overdracht bekijken →")}</Link>
      </SheetContent>
    </Sheet>
    <Sheet open={kostenOpen} onOpenChange={setKostenOpen}>
      <SheetContent side="bottom" className="inset-x-0 mx-auto w-full max-w-md max-h-[85vh] overflow-y-auto rounded-t-xl bg-card">
        <SheetHeader><SheetTitle className="font-display">{saldo > 0 ? t("expenses.stillToPay", "Nog {{amount}} te betalen", { amount: saldoTekst }) : t("expenses.youReceive", "Je ontvangt nog {{amount}}", { amount: saldoTekst })}</SheetTitle></SheetHeader>
        <div className="space-y-4 px-4 pb-4">
          {[[t("expenses.yourShareInOtherParentCosts", "Jouw aandeel in kosten van de andere ouder"), saldoDetail.sanneAanJoris], [t("expenses.otherParentShareInYourCosts", "Aandeel van de andere ouder in jouw kosten"), saldoDetail.jorisAanSanne]].map(([titel, kant]) => kant.posten.length === 0 ? null : (<div key={titel}>
            <p className="text-xs font-semibold text-ink-soft">{titel}</p>
            <ul className="mt-1 divide-y divide-border">
              {kant.posten.map(({ post, aandeel }) => (<li key={post.id} className="flex items-baseline justify-between gap-3 py-2.5 text-sm">
                <span className="min-w-0"><span className="block truncate font-semibold">{post.omschrijving}</span><span className="text-xs text-ink-soft">{euro(post.bedrag)} {t("expenses.total", "totaal")}</span></span>
                <span className="shrink-0 font-semibold">{euro(aandeel)}</span>
              </li>))}
            </ul>
          </div>))}
          <div className="flex justify-between border-t border-border pt-3 text-sm font-semibold"><span>{t("expenses.stillToPayLabel", "Nog te betalen")}</span><span>{saldoTekst}</span></div>
          <Link to="/kosten" onClick={() => setKostenOpen(false)} className="inline-block text-sm font-semibold text-brand">{t("expenses.viewPayment", "Betaling bekijken →")}</Link>
        </div>
      </SheetContent>
    </Sheet>
  </AppShell>);
}
