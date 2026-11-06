import i18n from "@/i18n";
import { ZorgAfstemmen } from "@/components/ZorgAfstemmen";
import { AgendaWissels } from "@/components/AgendaWissels";
import { AgendaVakanties } from "@/components/AgendaVakanties";
import { useActiviteiten } from "@/components/Activiteiten";
import { agendaReacties, weekBereik } from "@/lib/agenda-presentatie";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { agendaZorgOp, ouderLabel, magOverdrachtVoorbereiden } from "@/lib/agenda-zorg";
import { useVakanties } from "@/lib/vakantie-store";
import { BewerkPotlood } from "@/components/ui-kit";
import { useBevestigPopup } from "@/lib/feedback";
import { Assistent } from "@/components/Assistent";
import { GeschiedenisKnop } from "@/components/Geschiedenis";
import { leg, leg as legAudit, legVerschillen as legVerschillenAudit } from "@/lib/audit-store";
import { createFileRoute, Link, useRouter, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { X, MoreHorizontal, ArrowLeftRight, CalendarPlus, CircleHelp, FilePen, ListChecks, Palmtree, Lock, ChevronLeft, ChevronRight } from "lucide-react";
import { LanguageSelector } from "@/components/LanguageSelector";
import { AppShell, Card } from "@/components/AppShell";
import { ContextToevoegen } from "@/components/ContextToevoegen";
import { HulpKnop } from "@/components/HulpVragen";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { afspraken, categorieMeta, gesprekken } from "@/lib/demo-data";
import { kindNamen, useZorg, zorgDag } from "@/lib/zorg-store";
import { useTaken, voegTaakToe } from "@/lib/taken-store";
import { nieuwBudget } from "@/lib/budget-store";
import { Button } from "@/components/ui/button";
import { bijzondereDagOp } from "@/lib/bijzondere-dagen";
import { useVoorkeuren } from "@/lib/voorkeuren-store";
import { controleerAfspraak, controleerPrive, afstemStatus, ikGa, koppelAfstem } from "@/lib/slimme-hulp";
import { startNuAfstemmen } from "@/lib/nu-afstemmen-store";
import { useRegio, vakantieOp, vakantiesTussen, regioLabel } from "@/lib/schoolvakanties";
import { geldigeRegeling, useStart, start, plekOp } from "@/lib/start-store";
import { Pictogram } from "@/components/AppIcon";
import { uur } from "@/lib/tijd-tekst";
import { iso, dt, plusDagen, maandagVan, voorkomens } from "@/lib/agenda-datum";
import { AppIcon } from "@/components/AppIcon";
import { VoorstelIntrekken } from "@/components/VoorstelIntrekken";
import { AanwezigheidBlok, AanwezigheidFormulier } from "@/components/AanwezigheidAfstemmen";
import { aanwezigVoor, startAfstemming, statusRegel, useAanwezigheid } from "@/lib/aanwezigheid-store";
export const Route = createFileRoute("/agenda")({
  validateSearch: z.object({ onderdeel: z.enum(["kalender", "vakanties"]).optional(), zorgActie: z.enum(["wijziging", "regeling"]).optional(), zorgVoorstel: z.string().optional(), vakantieNieuw: z.enum(["vakantie", "bijzonder"]).optional(), nieuw: z.boolean().optional(), voorstel: z.boolean().optional(), persoonlijk: z.boolean().optional(), vanuitBericht: z.boolean().optional(), locatie: z.string().optional(), omschrijving: z.string().optional(), categorie: z.string().optional(), titel: z.string().optional(), datum: z.string().optional(), tijd: z.string().optional(), herhaling: z.enum(["wekelijks", "tweewekelijks", "maandelijks"]).optional(), kind: z.string().optional(), dag: z.string().optional(), importBedrag: z.number().positive().max(100000).optional(), importTaak: z.string().max(300).optional(), importMee: z.string().max(300).optional(), afspraak: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Gedeelde agenda — Ouderschap & Co" },
      { name: "description", content: "School, sport, opvang, medische afspraken, verjaardagen en vakanties in één gedeelde agenda." },
      { property: "og:title", content: "Gedeelde agenda — Ouderschap & Co" },
      { property: "og:description", content: "Eén agenda voor beide ouders, met duidelijke categorieën en verantwoordelijkheid." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AgendaPagina,
});
const getLocale = () => (i18n.language?.startsWith("en") ? "en-US" : "nl-NL");
const DEMO_VANDAAG = "2025-03-12"; // demo-vandaag
/** Eigen gezin gebruikt de echte datum (zelfde bron als Home); het voorbeeldgezin blijft op de demo-datum. Wordt per render gezet in AgendaPage. */
let VANDAAG = DEMO_VANDAAG;
const weekNr = (s) => { const d = dt(s); d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7)); const j = new Date(d.getFullYear(), 0, 4); return 1 + Math.round(((d.getTime() - j.getTime()) / 864e5 - 3 + ((j.getDay() + 6) % 7)) / 7); };
const lang = (s, loc = getLocale()) => dt(s).toLocaleDateString(loc, { weekday: "long", day: "numeric", month: "long" });
const kort = (s, loc = getLocale()) => dt(s).toLocaleDateString(loc, { day: "numeric", month: "short" });
const maandNaam = (d, loc = getLocale()) => d.toLocaleDateString(loc, { month: "long", year: "numeric" });
const freqLabel = { geen: "Niet herhalen", wekelijks: "Wekelijks", tweewekelijks: "Om de week", maandelijks: "Maandelijks", aangepast: "Aangepast" };
/** Demo-zorgregeling is ingevuld voor maart 2026. */
const verblijf = (zorg, kind, s) => (s.startsWith("2025-03") ? zorgDag(zorg, kind, dt(s).getDate()) : undefined);
const isWissel = (zorg, s) => {
  const nu = verblijf(zorg, "emma", s), gister = verblijf(zorg, "emma", plusDagen(s, -1));
  return !!nu && !!gister && nu.ouder !== gister.ouder;
};
const demoOp = (s) => (s.startsWith("2025-03") ? afspraken.filter((a) => a.dag === dt(s).getDate()) : []);
function AgendaPagina() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith("en") ? "en-US" : "nl-NL";
  const router = useRouter();
  const zorg = useZorg();
  const regio = useRegio();
  const activiteiten = useActiviteiten();
  const reacties = agendaReacties(activiteiten.voorstellen);
  const [voorstellenOpen, setVoorstellenOpen] = useState(false);
  const vakanties = useVakanties();
  const [kindFilter, setKindFilter] = useState("alle");
  const { taken } = useTaken();
  const [weergave, setWeergave] = useState("week");
  const [nieuwOpen, setNieuwOpen] = useState(false);
  const [bewerk, setBewerk] = useState(null);
  const [bereik, setBereik] = useState("alleen");
  const [verwijderVk, setVerwijderVk] = useState(null);
  const [annuleringNietNodig, setAnnuleringNietNodig] = useState(null);
  const [melding, setMelding] = useState(null);
  useBevestigPopup(melding);
  const [controle, setControle] = useState(null);
  const vkSlim = useVoorkeuren();
  const [detail, setDetail] = useState(null);
  const [voorstellen, setWachtend] = useState([]);
  const wachtend = voorstellen.filter((w) => !w.status);
  const [voorstelNieuw, setVoorstelNieuw] = useState(false);
  const [verborgen, setVerborgen] = useState([]);
  const [modus, setModus] = useState("aanpassen");
  const [gedeeld, setGedeeld] = useState(true);
  const [locatie, setLocatie] = useState("");
  const [toelichting, setToelichting] = useState("");
  const [herinnering, setHerinnering] = useState("geen");
  const [titel, setTitel] = useState("");
  const [aanwezigKeuze, setAanwezigKeuze] = useState(null);
  const [aanwezigWieGaat, setAanwezigWieGaat] = useState(null);
  const [aanwezigContactWie, setAanwezigContactWie] = useState(null);
  const [verlatenVraag, setVerlatenVraag] = useState(false);
  const sluitNieuw = () => {
    if (titel.trim() && !bewerk)
      setVerlatenVraag(true);
    else
      setNieuwOpen(false);
  };
  const [datum, setDatum] = useState("");
  const [tijd, setTijd] = useState("");
  const [eindtijd, setEindtijd] = useState("");
  const [priveBotsing, setPriveBotsing] = useState(null);
  const [afstemTekst, setAfstemTekst] = useState(null);
  const [categorie, setCategorie] = useState("medisch");
  const [kind, setKind] = useState("");
  const [herhaling, setHerhaling] = useState({ freq: "geen", interval: 2, eenheid: "weken" });
  const [demoExtra, setDemoExtra] = useState([]);
  const [importExtra, setImportExtra] = useState(null);
  const [maandOffset, setMaandOffset] = useState(0);
  const [weekOffset, setWeekOffset] = useState(0);
  // Bewaar de bestaande opslagnaam; de standaardingang opent altijd deze week.
  const AGENDA_GEHEUGEN = "onzeapp-agenda-weergave";
  const bewaar = (w, wo, mo) => {
    try {
      localStorage.setItem(AGENDA_GEHEUGEN, JSON.stringify({ w, wo, mo }));
    }
    catch { /* geen opslag */ }
  };
  const zetWeergave = (w) => { setWeergave(w); bewaar(w, weekOffset, maandOffset); };
  const zetWeekOffset = (f) => setWeekOffset((x) => { const n = typeof f === "function" ? f(x) : f; bewaar(weergave, n, maandOffset); return n; });
  const zetMaandOffset = (f) => setMaandOffset((x) => { const n = typeof f === "function" ? f(x) : f; bewaar(weergave, weekOffset, n); return n; });
  // Vanuit zoeken naar een afspraak: maandweergave, zodat het item zeker zichtbaar is.
  const doelHash = useRouterState({ select: (s) => s.location.hash });
  useEffect(() => {
    if (doelHash.startsWith("item-"))
      setWeergave("maand");
  }, [doelHash]);
  const [gekozenDag, setGekozenDag] = useState(null);
  const [weekDag, setWeekDag] = useState(null);
  // Eigen gezin: geen voorbeelddata; wel de eigen regeling als dagkleuring.
  const startSt = useStart();
  const eigen = startSt.eigen;
  VANDAAG = eigen ? iso(new Date()) : DEMO_VANDAAG;
  // Eigen gezin: afspraken en kinderen uit de eigen gezinsgegevens; voorbeeldgezin blijft apart.
  const extra = eigen ? startSt.agenda : demoExtra;
  const setExtra = (f) => (eigen ? start.zetAgenda((l) => f(l)) : setDemoExtra(f));
  const kindKeuzes = eigen ? [...startSt.kinderen.map((k) => k.naam), ...(startSt.kinderen.length > 1 ? ["Alle kinderen"] : [])] : ["Emma", "Noah", "Allebei"];
  /** Zelfde kindkeuze, maar dan in de vorm die het hulpverzoek gebruikt. */
  const hulpKind = () => (kind === "Alle kinderen" ? "alle" : kind === "Allebei" ? "beide" : startSt.kinderen.find((k) => k.naam === kind)?.id ?? (kind === "Noah" ? "noah" : "emma"));
  const standaardKind = eigen ? (startSt.kinderen[0]?.naam ?? "") : "Emma";
  const alleNamen = eigen ? startSt.kinderen.map((k) => k.naam) : ["Emma", "Noah"];
  const eigenRegeling = startSt.regeling && startSt.regeling !== "later" && geldigeRegeling(startSt.regeling) ? startSt.regeling : null;
  const [filter, setFilter] = useState("alles");
  const heeftPrive = extra.some((a) => a.gedeeld === false);
  const demoVoor = (s) => (eigen || filter === "prive" ? [] : demoOp(s).filter((a) => !verborgen.includes(a.id) && !extra.some((x) => x.id === a.id) && a.categorie !== "wissel" && (kindFilter === "alle" || /allebei|&|kinderen/i.test(a.kind) || a.kind === profielen.find((k) => k.id === kindFilter)?.naam)));
  const eigenPlekVan = (d) => (eigenRegeling ? plekOp(eigenRegeling, dt(d)) : undefined);
  const eigenWisselVan = (d) => (eigenRegeling ? plekOp(eigenRegeling, dt(d)) !== plekOp(eigenRegeling, dt(plusDagen(d, -1))) : undefined);
  const getoondeMaand = new Date(dt(VANDAAG).getFullYear(), dt(VANDAAG).getMonth() + maandOffset, 1);
  const weekStart = plusDagen(maandagVan(VANDAAG), weekOffset * 7);
  const weekDagen = Array.from({ length: 7 }, (_, i) => plusDagen(weekStart, i));
  const vk = (van, tot) => extra.filter((a) => (kindFilter === "alle" || a.gedeeld === false || a.kind === geselecteerdeNaam || /allebei|alle kinderen|&/i.test(a.kind)) && !verborgen.includes(a.id) && (filter === "alles" || (filter === "prive") === (a.gedeeld === false))).flatMap((a) => voorkomens(a, van, tot).map((d) => ({ a, datum: d }))).sort((x, y) => (x.datum + x.a.tijd).localeCompare(y.datum + y.a.tijd));
  const wachtOp = (id) => wachtend.some((w) => w.vk.a.id === id);
  const openNieuw = (vooraf = weekDag ?? VANDAAG) => {
    setVoorstelNieuw(false);
    setBewerk(null);
    setModus("aanpassen");
    setTitel("");
    setDatum(vooraf);
    setTijd("");
    setEindtijd("");
    setPriveBotsing(null);
    setAfstemTekst(null);
    setCategorie("overig");
    setKind(standaardKind);
    setLocatie("");
    setToelichting("");
    setHerinnering("geen");
    setGedeeld(true);
    setHerhaling({ freq: "geen", interval: 2, eenheid: "weken" });
    setGekozenDag(null);
    setImportExtra(null);
    setNieuwOpen(true);
  };
  // Vooraf ingevuld vanuit de assistent: alleen invullen, de ouder slaat zelf op.
  const zoek = Route.useSearch();
  const zorgVan = (d) => agendaZorgOp(zorg, vakanties, startSt, d, kindFilter);
  const profielen = eigen ? startSt.kinderen : [{ id: "emma", naam: "Emma" }, { id: "noah", naam: "Noah" }];
  useEffect(() => {
    if (zoek.kind && profielen.some((k) => k.id === zoek.kind))
      setKindFilter(zoek.kind);
  }, [zoek.kind]);
  const geselecteerdeNaam = profielen.find((k) => k.id === kindFilter)?.naam;
  const sluitZorg = () => router.navigate({ to: "/agenda", search: { onderdeel: "kalender" }, replace: true });
  useEffect(() => {
    if (!zoek.nieuw)
      return;
    openNieuw(zoek.datum ?? zoek.dag ?? VANDAAG);
    if (zoek.titel)
      setTitel(zoek.titel);
    if (zoek.voorstel) {
      setVoorstelNieuw(true);
      setDatum(zoek.datum ?? "");
      setKind(zoek.kind ?? "");
    }
    if (zoek.vanuitBericht) {
      setDatum(zoek.datum ?? "");
      setKind(zoek.kind ?? "");
    }
    if (zoek.persoonlijk)
      setGedeeld(false);
    if (zoek.locatie)
      setLocatie(zoek.locatie);
    if (zoek.omschrijving)
      setToelichting(zoek.omschrijving);
    if (zoek.tijd)
      setTijd(zoek.tijd);
    if (zoek.kind)
      setKind(zoek.kind === "emma" ? "Emma" : zoek.kind === "noah" ? "Noah" : kindKeuzes.includes(zoek.kind) ? zoek.kind : standaardKind);
    if (zoek.categorie && zoek.categorie in categorieMeta)
      setCategorie(zoek.categorie);
    if (zoek.herhaling)
      setHerhaling({ freq: zoek.herhaling, interval: 2, eenheid: "weken" });
    if (zoek.importBedrag || zoek.importTaak || zoek.importMee) {
      setImportExtra({ bedrag: zoek.importBedrag ? String(zoek.importBedrag) : "", taak: zoek.importTaak ?? "", mee: zoek.importMee ?? "" });
      setCategorie("school");
    }
    if (zoek.titel && /zwem|sport|voetbal|training/i.test(zoek.titel))
      setCategorie("sport");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoek.nieuw]);
  // Doorklik vanuit Home (Deze week / Morgen): open direct die dag.
  useEffect(() => {
    if (zoek.dag && /^\d{4}-\d{2}-\d{2}$/.test(zoek.dag)) {
      setWeekOffset(Math.round((dt(maandagVan(zoek.dag)).getTime() - dt(maandagVan(VANDAAG)).getTime()) / 604800000));
      setWeekDag(zoek.dag);
      if (!zoek.nieuw && !zoek.afspraak)
        setGekozenDag(zoek.dag);
    }
  }, [zoek.dag]);
  const doelAfspraak = !eigen && zoek.afspraak ? afspraken.find((x) => x.id === zoek.afspraak) : undefined;
  const doelEigen = zoek.afspraak ? extra.find((x) => x.id === zoek.afspraak) : undefined;
  useEffect(() => {
    if (doelEigen)
      setDetail({ a: doelEigen, datum: zoek.dag ?? doelEigen.datum });
  }, [zoek.afspraak, zoek.dag]);
  const [doelOpen, setDoelOpen] = useState(false);
  useEffect(() => { setDoelOpen(!!zoek.afspraak); }, [zoek.afspraak]);
  const openBewerk = (v, m = "aanpassen") => {
    setBewerk(v);
    setModus(m);
    setBereik(m === "herhaling" ? "toekomst" : "alleen");
    setTitel(v.a.titel);
    setDatum(v.datum);
    setTijd(v.a.tijd);
    setEindtijd(v.a.eindtijd ?? "");
    setCategorie(v.a.categorie);
    setKind(v.a.kind);
    setPriveBotsing(null);
    setLocatie(v.a.locatie ?? "");
    setToelichting(v.a.toelichting ?? "");
    setHerinnering(v.a.herinnering ?? "geen");
    setGedeeld(v.a.gedeeld !== false);
    setHerhaling(v.a.herhaling ?? { freq: "geen", interval: 2, eenheid: "weken" });
    setNieuwOpen(true);
  };
  const actieVast = (a, actie) => {
    const v = { a: { id: a.id, titel: a.titel, datum: `2025-03-${String(a.dag).padStart(2, "0")}`, tijd: a.tijd, locatie: a.locatie, categorie: a.categorie, kind: a.kind, gedeeld: true }, datum: `2025-03-${String(a.dag).padStart(2, "0")}` };
    setDoelOpen(false);
    if (actie === "verwijderen")
      setVerwijderVk(v);
    else
      openBewerk(v, actie);
  };
  const isReeks = (a) => !!a.herhaling && a.herhaling.freq !== "geen";
  /** Direct wijzigen: persoonlijke afspraak, of eigen gezin waarin nog geen andere ouder meedoet (geen voorstel aan niemand). */
  const direct = (a) => a.gedeeld === false || (eigen && !startSt.uitgenodigd);
  const wordtVoorstel = bewerk ? !direct(bewerk.a) : voorstelNieuw && gedeeld;
  const toon = (v) => !bewerk || (modus === "verplaatsen" && v === "datum") || (modus === "herhaling" && v === "herhaling");
  const verwijder = (v, b) => {
    const { a, datum: d } = v;
    const leg = (...args) => {
      if (a.gedeeld !== false)
        legAudit(...args);
    };
    if (!isReeks(a) || b === "reeks" || (b === "toekomst" && d === a.datum)) {
      leg("afspraak", a.id, a.titel, "verwijderd");
      setExtra((l) => l.filter((x) => x.id !== a.id));
      if (!eigen && afspraken.some((x) => x.id === a.id))
        setVerborgen((l) => [...l, a.id]);
    }
    else if (b === "alleen") {
      leg("afspraak", a.id, `${a.titel} (${kort(d)})`, "verwijderd");
      setExtra((l) => l.map((x) => (x.id === a.id ? { ...x, overslaan: [...(x.overslaan ?? []), d] } : x)));
    }
    else {
      leg("afspraak", a.id, `${a.titel} vanaf ${kort(d)}`, "verwijderd");
      setExtra((l) => l.map((x) => (x.id === a.id ? { ...x, herhaling: { ...x.herhaling, freq: x.herhaling?.freq ?? "geen", interval: x.herhaling?.interval ?? 1, eenheid: x.herhaling?.eenheid ?? "weken", eind: plusDagen(d, -1) } } : x)));
    }
    setVerwijderVk(null);
  };
  const labels = { titel: "titel", datum: "datum", tijd: "tijd", categorie: "categorie", kind: "kind", locatie: "locatie" };
  /** Voert een definitieve wijziging uit (direct bij persoonlijk, of na akkoord bij gedeeld). */
  const pasToe = (bv, velden, b) => {
    const oud = bv.a;
    const nieuwId =
      `nieuw-${Date.now()}`;
    const legVerschillen = (...args) => {
      if (velden.gedeeld !== false)
        legVerschillenAudit(...args);
    };
    if (!isReeks(oud) || b === "reeks" || (b === "toekomst" && bv.datum === oud.datum)) {
      const nieuw = { ...oud, ...velden, datum: isReeks(oud) && b !== "toekomst" ? oud.datum : velden.datum };
      if (oud.gedeeld === false && velden.gedeeld !== false)
        leg("afspraak", oud.id, nieuw.titel, "toegevoegd", undefined, "Sanne", { kinderen: /allebei|alle kinderen|&/i.test(nieuw.kind) ? alleNamen : [nieuw.kind] });
      else
        legVerschillen("afspraak", oud.id, nieuw.titel, oud, nieuw, labels);
      setExtra((l) => l.some((x) => x.id === oud.id) ? l.map((x) => (x.id === oud.id ? nieuw : x)) : [...l, nieuw]);
    }
    else if (b === "alleen") {
      setExtra((l) => [...l.map((x) => (x.id === oud.id ? { ...x, overslaan: [...(x.overslaan ?? []), bv.datum] } : x)), { id: nieuwId, ...velden, herhaling: undefined }]);
      legVerschillen("afspraak", oud.id, velden.titel, { ...oud, datum: bv.datum }, { ...oud, ...velden }, labels);
    }
    else {
      setExtra((l) => [...l.map((x) => (x.id === oud.id ? { ...x, herhaling: { ...x.herhaling, freq: x.herhaling?.freq ?? "geen", interval: x.herhaling?.interval ?? 1, eenheid: x.herhaling?.eenheid ?? "weken", eind: plusDagen(bv.datum, -1) } } : x)), { id: nieuwId, ...velden }]);
      legVerschillen("afspraak", oud.id, velden.titel, { ...oud, datum: bv.datum }, { ...oud, ...velden }, labels);
    }
  };
  const accepteer = (w) => {
    if (!wachtend.includes(w))
      return;
    setWachtend((l) => l.map((x) => x === w ? { ...x, status: "geaccepteerd" } : x));
    leg("afspraak", w.vk.a.id, w.vk.a.titel, "ACCEPTED");
    const velden = w.velden;
    if (w.soort === "nieuw" && velden)
      setExtra((l) => [...l, { id: w.vk.a.id, ...velden }]);
    else if (w.soort === "verwijder")
      verwijder(w.vk, w.bereik);
    else if (w.velden)
      pasToe(w.vk, w.velden, w.bereik);
    setMelding("De andere ouder ging akkoord. De agenda is bijgewerkt.");
  };
  const opslaan = (tochToevoegen = false, vastId) => {
    if (!titel.trim() || !datum || (gedeeld && !kind.trim()))
      return;
    if (!tochToevoegen && !gedeeld) {
      const b = controleerPrive({ datum, tijd, eindtijd }, extra.filter((x) => x.gedeeld !== false && x.id !== bewerk?.a.id).map((x) => ({ id: x.id, titel: x.titel, datum: x.datum, tijd: x.tijd, kind: x.kind })));
      if (b.length) {
        setPriveBotsing(b);
        setAfstemTekst(null);
        return;
      }
    }
    setPriveBotsing(null);
    setAfstemTekst(null);
    if (!tochToevoegen && gedeeld && vkSlim.conflictControle) {
      const c = controleerAfspraak({ datum, tijd, eindtijd, kind, titel, categorie }, extra.filter((x) => x.gedeeld !== false).flatMap((x) => voorkomens(x, datum, datum).map((d) => ({ id: x.id, titel: x.titel, datum: d, tijd: x.tijd, eindtijd: x.eindtijd, kind: x.kind }))), bewerk?.a.id, !eigen);
      if (c.length) {
        setControle(c);
        return;
      }
    }
    setControle(null);
    const velden = { titel: titel.trim(), datum, tijd, eindtijd: eindtijd || undefined, categorie, kind, herhaling: herhaling.freq === "geen" ? undefined : herhaling, locatie: locatie.trim() || undefined, toelichting: toelichting.trim() || undefined, herinnering, gedeeld };
    if (bewerk) {
      if (wordtVoorstel) {
        setWachtend((l) => [...l.filter((x) => x.vk.a.id !== bewerk.a.id), { vk: bewerk, soort: "wijzig", bereik: isReeks(bewerk.a) ? bereik : "reeks", velden }]);
        if (gedeeld)
          leg("afspraak", bewerk.a.id, titel.trim(), "CREATED", undefined, "Sanne", { meta: { status: "Wacht op de ander", voorstel: "Wijziging", datum, tijd } });
        setMelding("Wijziging voorgesteld. De huidige afspraak blijft gelden tot de andere ouder akkoord geeft.");
      }
      else {
        pasToe(bewerk, velden, isReeks(bewerk.a) ? bereik : "reeks");
        setMelding(gedeeld ? "Afspraak is nu gedeeld met de andere ouder." : "Afspraak aangepast.");
      }
    }
    else {
      const id = vastId ??
        `nieuw-${Date.now()}`;
      const meta = categorieMeta[categorie];
      if (wordtVoorstel) {
        setWachtend((l) => [...l, { vk: { a: { id, ...velden }, datum }, soort: "nieuw", bereik: "reeks", velden }]);
        leg("afspraak", id, velden.titel, "CREATED", undefined, "Sanne", { kinderen: [kind], meta: { status: "Wacht op de ander", voorstel: "Nieuwe afspraak", datum, tijd } });
        setMelding("Afspraak voorgesteld in het voorbeeldgezin. Nog niet bevestigd in de agenda.");
        setNieuwOpen(false);
        setBewerk(null);
        return;
      }
      setExtra((l) => [...l, { id, ...velden }]);
      // Aanwezigheid afstemmen: alleen bij een gedeelde afspraak voor een kind; "later" bewaart de keuze zonder voorstel.
      if (gedeeld && aanwezigKeuze) {
        const taakKind = /allebei|&|alle kinderen/i.test(kind) ? "beide" : kind.toLowerCase();
        startAfstemming(id, aanwezigKeuze, "sanne", { ...(aanwezigWieGaat ? { wieGaat: aanwezigWieGaat } : {}), ...(aanwezigContactWie ? { contactWie: aanwezigContactWie } : {}), kind: taakKind, afspraakTitel: velden.titel });
      }
      setAanwezigKeuze(null);
      setAanwezigWieGaat(null);
      setAanwezigContactWie(null);
      // Privé: niets in de gedeelde geschiedenis, export of meldingen.
      if (gedeeld)
        leg("afspraak", id, velden.titel, "toegevoegd", undefined, "Sanne", { kinderen: /allebei|alle kinderen|&/i.test(kind) ? alleNamen : [kind] });
      if (importExtra) {
        const taakKind = /allebei|&/i.test(kind) ? "beide" : kind === "Noah" ? "noah" : "emma";
        for (const tekst of new Set([importExtra.taak.trim(), importExtra.mee.trim()].filter(Boolean))) {
          voegTaakToe({ tekst, kind: taakKind, wie: "", herhaling: "eenmalig", deadline: datum });
        }
        const bedrag = Number(importExtra.bedrag.replace(",", "."));
        if (bedrag > 0)
          nieuwBudget({ wat: titel.trim(), kind: /allebei|&/i.test(kind) ? "Emma & Noah" : kind, max: bedrag, pctSanne: 50, toelichting: `Uit de schoolbrief · ${lang(datum)}. Nog geen betaling geregistreerd.` });
        setImportExtra(null);
      }
      if (gedeeld)
        gesprekken.unshift({ ...gesprekken[0], id: `afspraak-${id}`, onderwerp: velden.titel, icoon: meta?.icoon ?? "📌", laatste: "Nog geen berichten", laatsteTijd: "Nu", ongelezen: 0, berichten: [] });
      setMelding(eigen ? "Afspraak toegevoegd op dit apparaat." : gedeeld ? "Afspraak toegevoegd in het voorbeeldgezin." : "Persoonlijke afspraak toegevoegd. Alleen jij ziet hem.");
    }
    setBewerk(null);
    setNieuwOpen(false);
  };
  const maandVan = iso(getoondeMaand);
  const maandTot = iso(new Date(getoondeMaand.getFullYear(), getoondeMaand.getMonth() + 1, 0));
  const leeg = (getoondeMaand.getDay() + 6) % 7;
  const maandDagen = Array.from({ length: dt(maandTot).getDate() }, (_, i) => plusDagen(maandVan, i));
  const vakInMaand = vakantiesTussen(regio, maandVan, maandTot);
  return (<AppShell>
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-extrabold leading-tight">{t("calendar.title", "Agenda")}</h1>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <LanguageSelector variant="compact" />
        <Assistent pagina="Agenda" />
        <ContextToevoegen titel={t("contextToevoegen.title", "Wat wil je toevoegen?")} acties={[
          { titel: t("contextToevoegen.appointment.title", "Afspraak"), uitleg: t("contextToevoegen.appointment.desc", "Zet iets in de gedeelde agenda, eventueel herhalend."), icoon: CalendarPlus, onKies: () => openNieuw() },
          { titel: t("contextToevoegen.scheduleChange.title", "Wijziging zorgverdeling voorstellen"), uitleg: t("contextToevoegen.scheduleChange.desc", "Alleen deze keer of vanaf nu."), icoon: ArrowLeftRight, functie: "wissel", onKies: () => router.navigate({ to: "/agenda", search: { zorgActie: "wijziging" } }) },
          { titel: t("contextToevoegen.agreement.title", "Afspraak tussen jullie"), uitleg: t("contextToevoegen.agreement.desc", "Leg samen een praktische afspraak vast."), icoon: FilePen, functie: "afspraak", onKies: () => router.navigate({ to: "/afspraken", search: { nieuw: "afspraak", bron: "agenda" } }) },
          { titel: t("contextToevoegen.holiday.title", "Vakantie voorstellen"), uitleg: t("contextToevoegen.holiday.desc", "Spreek een vakantieperiode af."), icoon: Palmtree, functie: "vakantie", onKies: () => router.navigate({ to: "/agenda", search: { onderdeel: "vakanties", vakantieNieuw: "vakantie" } }) },
          { titel: t("contextToevoegen.specialDay.title", "Bijzondere dag verdelen"), uitleg: t("contextToevoegen.specialDay.desc", "Een feestdag of persoonlijk moment."), icoon: Palmtree, functie: "feest", onKies: () => router.navigate({ to: "/agenda", search: { onderdeel: "vakanties", vakantieNieuw: "bijzonder" } }) },
          { titel: t("contextToevoegen.task.title", "Taak"), uitleg: t("contextToevoegen.task.desc", "Iets dat geregeld moet worden."), icoon: ListChecks, onKies: () => router.navigate({ to: "/taken" }) },
          { titel: t("contextToevoegen.help.title", "Hulp vragen aan je netwerk"), uitleg: t("contextToevoegen.help.desc", "Vraag opa, oma of iemand anders die kan ophalen of overnemen."), icoon: CircleHelp, functie: "hulp", onKies: () => router.navigate({ to: "/taken", search: { hulp: true } }) },
        ]} />
        <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-11" aria-label="Agenda opties" title="Agenda opties"><AppIcon functie="meer" maat="sm" vorm="kaal" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="shadow-none"><DropdownMenuItem className="min-h-11" onSelect={() => router.navigate({ to: "/agenda", search: { zorgActie: "regeling" } })}><AppIcon functie="zorgregeling" maat="sm" vorm="kaal" />{t("calendar.changeRecurringSchedule", "Vaste verdeling wijzigen")}</DropdownMenuItem><DropdownMenuItem asChild className="min-h-11"><Link to="/tijdlijn"><AppIcon functie="geschiedenis" maat="sm" vorm="kaal" />{t("calendar.viewPreviousChanges", "Eerdere wijzigingen bekijken")}</Link></DropdownMenuItem><DropdownMenuItem className="min-h-11" onSelect={() => setVoorstellenOpen(true)}><AppIcon functie="voorstel" maat="sm" vorm="kaal" />{t("calendar.viewAllProposals", "Alle voorstellen bekijken")}</DropdownMenuItem><DropdownMenuItem asChild className="min-h-11"><Link to="/veranderd">{t("calendar.alignNow", "Nu afstemmen")}</Link></DropdownMenuItem></DropdownMenuContent></DropdownMenu>
      </div>
    </div>
    <p className="mt-1 text-sm text-ink-soft">{eigen ? t("calendar.personalSubtitle", "Jouw agenda. Alleen jij ziet dit.") : t("calendar.subtitle", "Jouw agenda en wat jullie delen.")}</p>

    {melding ? <div className="mt-4 rounded-md border border-brand/20 bg-brand-soft p-3 text-sm text-brand">{melding}</div> : null}
    <div className="mt-3 flex rounded-md bg-muted p-1" role="group" aria-label="Agenda onderdeel"><Button variant="ghost" aria-pressed={zoek.onderdeel !== "vakanties"} className={`min-h-11 flex-1 ${zoek.onderdeel !== "vakanties" ? "bg-brand-soft text-brand font-semibold" : "text-ink-soft"}`} onClick={() => router.navigate({ to: "/agenda", search: {} })}>{t("calendar.tabAgenda", "Agenda")}</Button><Button variant="ghost" aria-pressed={zoek.onderdeel === "vakanties"} className={`min-h-11 flex-1 ${zoek.onderdeel === "vakanties" ? "bg-brand-soft text-brand font-semibold" : "text-ink-soft"}`} onClick={() => router.navigate({ to: "/agenda", search: { onderdeel: "vakanties" } })}>{t("calendar.tabHolidays", "Vakanties")}</Button></div>
    {reacties.length ? <Button variant="ghost" className="mt-2 min-h-11 h-auto w-full justify-between gap-2 whitespace-normal border-b border-border px-0 text-left text-xs text-brand" onClick={() => setVoorstellenOpen(true)}><span>{reacties.length === 1 ? t("calendar.oneProposalWaiting", "1 voorstel wacht op jou") : t("calendar.proposalsWaiting", "{{count}} voorstellen wachten op jou", { count: reacties.length })}</span><span className="inline-flex items-center gap-1"><span>{t("calendar.view", "Bekijken")}</span><ChevronRight className="size-3.5" /></span></Button> : null}
    {zoek.onderdeel === "vakanties" ? <AgendaVakanties toevoegen={zoek.vakantieNieuw} onVerwerkt={() => router.navigate({ to: "/agenda", search: { onderdeel: "vakanties" }, replace: true })} /> : <>
      <div className="mt-2 flex min-h-11 items-center justify-between gap-2">
        <div className="flex" role="group" aria-label="Kalenderweergave">
          {["dag", "week", "maand"].map((w) => (<Button variant="ghost" key={w} aria-pressed={weergave === w} onClick={() => zetWeergave(w)} className={`min-h-11 min-w-11 rounded-none border-b-2 px-2 text-sm font-semibold capitalize ${weergave === w ? "border-brand text-brand" : "border-transparent text-ink-soft"}`}>{w === "dag" ? t("calendar.day", "Dag") : w === "week" ? t("calendar.week", "Week") : t("calendar.month", "Maand")}</Button>))}
        </div>
        {profielen.length > 1 ? <select aria-label="Zorgverdeling per kind" value={kindFilter} onChange={(e) => setKindFilter(e.target.value)} className="min-h-11 min-w-0 max-w-40 rounded-md border-none bg-background px-1 text-sm text-ink">{[{ id: "alle", naam: t("calendar.allChildren", "Alle kinderen") }, ...profielen].map((k) => <option key={k.id} value={k.id}>{k.naam}</option>)}</select> : null}
      </div>

      {heeftPrive ? (<div className="mt-3 flex gap-2" role="group" aria-label="Agenda filteren">
        {[["alles", t("calendar.all", "Alles")], ["kinderen", t("calendar.children", "Kinderen")], ["prive", t("calendar.private", "Privé")]].map(([k, l]) => <Chip key={k} actief={filter === k} onClick={() => setFilter(k)}>{l}</Chip>)}
      </div>) : null}

      {weergave === "dag" ? (<div className="mt-4 space-y-2.5">
        <ZorgLegenda />
        <Card>
          <p className="text-xs font-semibold tracking-wider text-brand uppercase">{t("calendar.todayLabel", "Vandaag")} · {lang(VANDAAG)}</p>
          <p className="mt-1 font-display text-lg font-bold">
            {zorgVan(VANDAAG).kinderen.map((k) => `${k.naam}: ${ouderLabel(k.ouder).toLowerCase()}`).join(" · ") || t("calendar.yourOwnCalendar", "Je eigen agenda")}
          </p>
        </Card>
        <AgendaWissels datum={VANDAAG} gegevens={zorgVan(VANDAAG)} />
        {demoVoor(VANDAAG).map((a) => <AfspraakRij key={a.id} id={a.id} onActie={(actie) => actieVast(a, actie)} />)}
        {vk(VANDAAG, VANDAAG).map((v) => <ExtraAfspraakRij key={v.a.id + v.datum} v={v} onOpen={setDetail} wacht={wachtOp(v.a.id)} onAkkoord={wachtOp(v.a.id) ? () => {
          const w = wachtend.find((x) => x.vk.a.id === v.a.id); if (w)
            accepteer(w);
        } : undefined} />)}
        <button onClick={() => setGekozenDag(VANDAAG)} className="text-xs font-semibold text-brand">{t("calendar.viewAllForToday", "Alles van vandaag bekijken →")}</button>
      </div>) : null}

      {weergave === "week" ? (<>
        <section className="mt-2 border-y border-border py-2" aria-label="Weekkalender">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => { zetWeekOffset((w) => w - 1); setWeekDag(null); }} aria-label="Vorige week" className="size-11 shrink-0"><ChevronLeft className="size-5" /></Button>
            <div className="text-center">
              <h2 className="font-display text-sm font-bold">{weekOffset === 0 ? `${t("calendar.thisWeek", "Deze week")} · ` : ""}{weekBereik(weekStart)}</h2>
            </div>
            <Button variant="ghost" size="icon" onClick={() => { zetWeekOffset((w) => w + 1); setWeekDag(null); }} aria-label="Volgende week" className="size-11 shrink-0"><ChevronRight className="size-5" /></Button>
          </div>
          <ZorgLegenda />
          <div className="mt-3 grid grid-cols-7 gap-1">
            {weekDagen.map((d) => <DagCel key={d} d={d} groot gegevens={zorgVan(d)} zorg={zorg} regio={regio} heeftIets={demoVoor(d).length + vk(d, d).length > 0} onKies={setWeekDag} geselecteerd={d === weekDag} eigenPlek={eigenPlekVan(d)} eigenWissel={eigenWisselVan(d)} />)}
          </div>
          {weekOffset !== 0 ? <button onClick={() => { zetWeekOffset(0); setWeekDag(null); }} className="mt-3 text-xs font-semibold text-brand">{t("calendar.backToThisWeek", "Terug naar deze week")}</button> : null}
        </section>
        {eigen && extra.length === 0 ? <Button variant="link" className="min-h-11 px-0" onClick={() => openNieuw()}>{t("calendar.addFirstAppointment", "Eerste afspraak toevoegen")}</Button> : null}
        <div className="mt-3 space-y-2.5">
          {weekDag ? <div className="flex items-center justify-between gap-3 border-b border-border pb-2"><p className="text-sm font-semibold capitalize">{lang(weekDag)}</p><Button variant="ghost" size="icon" aria-label="Afspraak toevoegen op geselecteerde dag" onClick={() => openNieuw(weekDag)}><AppIcon functie="toevoegen" maat="sm" vorm="kaal" /></Button></div> : null}
          {(weekDag ? [weekDag] : weekDagen).map((d) => <AgendaWissels key={d} datum={d} gegevens={zorgVan(d)} />)}
          {weekDag ? <div className="text-sm">{zorgVan(weekDag).kinderen.map((k) => <p key={k.id}>{k.naam} · {ouderLabel(k.ouder)}{k.uitzondering ? ` · ${k.uitzondering}` : ""}</p>)}</div> : null}
          {(weekDag ? [weekDag] : weekDagen).flatMap((d) => demoVoor(d)).map((a) => <AfspraakRij key={a.id} id={a.id} onActie={(actie) => actieVast(a, actie)} />)}
          {vk(weekDag ?? weekStart, weekDag ?? plusDagen(weekStart, 6)).map((v) => <ExtraAfspraakRij key={v.a.id + v.datum} v={v} onOpen={setDetail} wacht={wachtOp(v.a.id)} onAkkoord={wachtOp(v.a.id) ? () => {
            const w = wachtend.find((x) => x.vk.a.id === v.a.id); if (w)
              accepteer(w);
          } : undefined} />)}
          {weekDag && !demoVoor(weekDag).length && !vk(weekDag, weekDag).length ? <p className="text-sm text-ink-soft">{t("calendar.noAppointmentsOnDay", "Geen afspraken op deze dag.")}</p> : null}
        </div>
        <section className="mt-4 border-y border-border py-3">
          <p className="text-sm font-semibold">{t("calendar.upcoming4Weeks", "Komende 4 weken")}</p>
          <ZorgLegenda />
          <div className="mt-3 grid grid-cols-7 gap-1 px-1.5 text-center text-xs text-ink-soft" aria-hidden="true">
            {[
              t("calendar.days.mon", "Ma"),
              t("calendar.days.tue", "Di"),
              t("calendar.days.wed", "Wo"),
              t("calendar.days.thu", "Do"),
              t("calendar.days.fri", "Vr"),
              t("calendar.days.sat", "Za"),
              t("calendar.days.sun", "Zo"),
            ].map((dag) => <span key={dag}>{dag}</span>)}
          </div>
          <div className="mt-3 space-y-1.5">
            {[0, 1, 2, 3].map((w) => {
              const start = plusDagen(maandagVan(VANDAAG), (weekOffset + w) * 7);
              const nu = start === maandagVan(VANDAAG);
              return (<div key={start} className={`rounded-md px-1.5 py-1 ${nu ? "bg-secondary" : ""}`}>
                <div className="mb-1 text-xs text-ink-soft"><span className={nu ? "font-semibold text-ink" : ""}>{nu ? t("calendar.thisWeek", "Deze week") : `Week ${weekNr(start)}`}</span></div>
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: 7 }, (_, i) => plusDagen(start, i)).map((d) => <DagCel key={d} d={d} gegevens={zorgVan(d)} zorg={zorg} regio={regio} heeftIets={demoVoor(d).length + vk(d, d).length > 0} onKies={setGekozenDag} eigenPlek={eigenPlekVan(d)} eigenWissel={eigenWisselVan(d)} />)}
                </div>
              </div>);
            })}
          </div>
        </section>
      </>) : null}

      {weergave === "maand" ? (<>
        <section className="mt-2 border-y border-border py-3">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => zetMaandOffset((m) => m - 1)} className="size-11" aria-label="Vorige maand"><ChevronLeft className="size-5" /></Button>
            <p className="font-display text-base font-bold capitalize">{getoondeMaand.toLocaleDateString(getLocale(), { month: "long", year: "numeric" })}</p>
            <Button variant="ghost" size="icon" onClick={() => zetMaandOffset((m) => m + 1)} className="size-11" aria-label="Volgende maand"><ChevronRight className="size-5" /></Button>
          </div>
          <ZorgLegenda />
          <div className="mt-3 grid grid-cols-7 gap-1.5 text-center text-[11px] text-ink-soft">
            {[
              t("calendar.days.mon", "Ma"),
              t("calendar.days.tue", "Di"),
              t("calendar.days.wed", "Wo"),
              t("calendar.days.thu", "Do"),
              t("calendar.days.fri", "Vr"),
              t("calendar.days.sat", "Za"),
              t("calendar.days.sun", "Zo"),
            ].map((d) => <span key={d}>{d}</span>)}
          </div>
          <div className="mt-2 grid grid-cols-7 gap-1.5">
            {Array.from({ length: leeg }).map((_, i) => <span key={`l${i}`} />)}
            {maandDagen.map((d) => <DagCel key={d} d={d} gegevens={zorgVan(d)} zorg={zorg} regio={regio} heeftIets={demoVoor(d).length + vk(d, d).length > 0} onKies={setGekozenDag} eigenPlek={eigenPlekVan(d)} eigenWissel={eigenWisselVan(d)} />)}
          </div>
        </section>
        {vakInMaand.map((v) => (<div key={v.naam + v.van} className="mt-3 flex items-center justify-between gap-3 border-b border-border px-1 pb-3">
          <div>
            <p className="text-sm font-semibold">{v.naam}</p>
            <p className="text-xs text-ink-soft">{kort(v.van)} – {kort(v.tot)} · {regioLabel[regio]} · schoolkalender</p>
          </div>
          <Link to="/agenda" search={{ onderdeel: "vakanties" }} className="shrink-0 text-xs font-semibold text-brand">{t("calendar.proposeSchedule", "Verdeling voorstellen")}</Link>
        </div>))}
        <div className="mt-3 space-y-2.5">
          {maandDagen.map((d) => <AgendaWissels key={d} datum={d} gegevens={zorgVan(d)} />)}
          {maandDagen.flatMap((d) => demoVoor(d)).map((a) => <AfspraakRij key={a.id} id={a.id} onActie={(actie) => actieVast(a, actie)} />)}
          {vk(maandVan, maandTot).map((v) => <ExtraAfspraakRij key={v.a.id + v.datum} v={v} onOpen={setDetail} wacht={wachtOp(v.a.id)} onAkkoord={wachtOp(v.a.id) ? () => {
            const w = wachtend.find((x) => x.vk.a.id === v.a.id); if (w)
              accepteer(w);
          } : undefined} />)}
          {maandDagen.every((d) => demoVoor(d).length === 0) && vk(maandVan, maandTot).length === 0 ? <Card className="text-sm text-ink-soft">{t("calendar.thisMonthQuiet", "Deze maand is nog rustig.")} <button type="button" onClick={() => openNieuw()} className="font-semibold text-brand">{t("calendar.addAppointment", "Afspraak toevoegen")}</button></Card> : null}
        </div>
      </>) : null}

    </>}
    {(voorstellenOpen || zoek.zorgActie || zoek.zorgVoorstel) && !eigen ? <Sheet open={voorstellenOpen || !!zoek.zorgActie || !!zoek.zorgVoorstel} onOpenChange={(o) => {
      if (!o) {
        setVoorstellenOpen(false);
        sluitZorg();
      }
    }}><SheetContent side="bottom" className="inset-x-0 mx-auto w-full max-w-md max-h-[80dvh] overflow-y-auto rounded-t-2xl bg-background px-5 pb-8"><SheetHeader className="pr-8 text-left"><SheetTitle>{t("calendar.proposalsSheet.title", "Voorstellen")}</SheetTitle><SheetDescription>{t("calendar.proposalsSheet.existingAgreementsStay", "De bestaande afspraken blijven gelden tot het benodigde akkoord.")}</SheetDescription></SheetHeader><ZorgAfstemmen kind={kindFilter === "alle" ? "alle" : kindFilter === "noah" ? "noah" : "emma"} startActie={zoek.zorgActie} doel={zoek.zorgVoorstel} sluit={sluitZorg} />{activiteiten.voorstellen.filter((v) => v.bron !== "zorg" && v.bron !== "budget" && v.bron !== "kost").map((v) => <Button asChild variant="ghost" key={v.sleutel} className="h-auto min-h-11 w-full justify-start whitespace-normal"><a href={v.naar}>{v.titel} · {v.aanJou ? t("expenses.actionNeeded", "Jouw reactie nodig") : t("common.viewProposal", "Bekijk voorstel")}</a></Button>)}{voorstellen.map((w) => <div key={w.vk.a.id} className="flex items-center gap-2 border-b border-border py-2"><Button variant="ghost" className="h-auto min-h-11 flex-1 justify-start whitespace-normal text-left" onClick={() => { setVoorstellenOpen(false); setDetail(w.vk); }}><span>{w.vk.a.titel}<span className="block text-xs text-ink-soft">{w.status === "ingetrokken" ? t("calendar.statusWithdrawn", "Ingetrokken") : w.status === "geaccepteerd" ? t("calendar.statusAgreed", "Afgesproken") : t("calendar.statusWaitingOther", "Wacht op de andere ouder")}</span></span></Button><GeschiedenisKnop soort="afspraak" itemId={w.vk.a.id} naam={w.vk.a.titel} /></div>)}<Button asChild variant="link" className="min-h-11 px-0"><Link to="/activiteiten" search={{ onderdeel: "regelen" }}>{t("calendar.viewProposalsOverview", "Bestaande voorstellenoverzicht bekijken")}</Link></Button></SheetContent></Sheet> : zoek.zorgActie && eigen ? <p className="mt-3 text-sm text-ink-soft">{t("calendar.sharedChangeSoloHint", "Een gedeelde wijziging voorstellen kan zodra de ouderaccounts veilig gekoppeld zijn. Je huidige verdeling blijft zichtbaar.")}</p> : null}
    <DagSheet gegevens={gekozenDag ? zorgVan(gekozenDag) : zorgVan(VANDAAG)} dag={gekozenDag} onSluit={() => setGekozenDag(null)} zorg={zorg} regio={regio} eigen={eigen} eigenKinderen={eigen && eigenRegeling && gekozenDag ? startSt.kinderen.map((k) => ({ naam: k.naam, plek: plekOp(eigenRegeling, dt(gekozenDag)) })) : undefined} eigenWissel={gekozenDag ? eigenWisselVan(gekozenDag) : undefined} extra={gekozenDag ? vk(gekozenDag, gekozenDag) : []} taken={gekozenDag && !eigen ? taken.filter((t) => t.deadline === gekozenDag && !t.klaar) : []} onToevoegen={() => openNieuw(gekozenDag ?? "")} onOpen={(v) => { setGekozenDag(null); setDetail(v); }} onOpenVast={(id) => {
      setGekozenDag(null); if (zoek.afspraak === id)
        setDoelOpen(true);
      else
        router.navigate({ to: "/agenda", search: { afspraak: id } });
    }} />

    <AfspraakDetail v={detail} direct={detail ? direct(detail.a) : false} wacht={detail ? wachtend.find((w) => w.vk.a.id === detail.a.id) : undefined} ingetrokken={detail ? voorstellen.some((w) => w.vk.a.id === detail.a.id && w.status === "ingetrokken") : false} onSluit={() => setDetail(null)} onActie={(m) => {
      const d = detail; if (!d)
        return; setDetail(null); if (m === "verwijderen")
        setVerwijderVk(d);
      else
        openBewerk(d, m);
    }} onIntrekken={() => {
      const w = wachtend.find((x) => x.vk.a.id === detail?.a.id); if (w) {
        setWachtend((l) => l.map((x) => x === w ? { ...x, status: "ingetrokken" } : x));
        leg("afspraak", w.vk.a.id, w.vk.a.titel, "CANCELLED", { veld: "status", oud: "Wacht op de ander", nieuw: "Ingetrokken" });
        setMelding("Voorstel ingetrokken. De huidige agenda blijft gelden.");
      } setDetail(null);
    }} onAkkoord={() => {
      const w = wachtend.find((x) => x.vk.a.id === detail?.a.id); if (w)
        accepteer(w); setDetail(null);
    }} />

    {/* Doorklik vanuit Home: precies deze afspraak openen, los van de gekozen weergave. */}
    {zoek.afspraak ? (doelAfspraak ? (doelAfspraak.categorie === "wissel"
      ? <WisselmomentSheet open={doelOpen} onSluit={() => setDoelOpen(false)} a={doelAfspraak} />
      : <VasteAfspraakSheet open={doelOpen} onSluit={() => setDoelOpen(false)} a={doelAfspraak} onActie={(actie) => actieVast(doelAfspraak, actie)} />)
      : doelOpen && !doelEigen ? <div role="alert" className="fixed inset-x-4 bottom-24 z-50 mx-auto max-w-md rounded-md border border-border bg-card p-4 text-sm"><p className="font-semibold">{t("calendar.appointmentNoLongerExists", "Deze afspraak bestaat niet meer")}</p><p className="mt-1 text-ink-soft">{t("calendar.appointmentMovedOrDeleted", "Hij is wellicht verplaatst of verwijderd. Bekijk de agenda voor de actuele planning.")}</p><button onClick={() => setDoelOpen(false)} className="mt-2 font-semibold text-brand">{t("common.close", "Sluiten")}</button></div> : null) : null}
    <Sheet open={!!verwijderVk} onOpenChange={(o) => !o && setVerwijderVk(null)}>
      <SheetContent side="bottom" className="inset-x-0 mx-auto w-full max-w-md rounded-t-2xl bg-background px-5 pb-8">
        <SheetHeader className="text-left">
          <SheetTitle className="font-display text-lg">{t("calendar.cancelModal.cancelAppointmentPrompt", "Afspraak annuleren?")}</SheetTitle>
          <SheetDescription>{verwijderVk ? `${verwijderVk.a.titel} · ${lang(verwijderVk.datum)}` : ""}</SheetDescription>
        </SheetHeader>
        {verwijderVk ? (<div className="mt-4 space-y-2">
          {!direct(verwijderVk.a) ? <p className="text-sm text-ink-soft">De andere ouder krijgt een melding van je voorstel zodra jullie accounts veilig gekoppeld zijn. In dit voorbeeld wordt geen echte melding verstuurd. De afspraak blijft staan tot akkoord.</p> : null}
          {afstemStatus(verwijderVk.a.id) === "akkoord" && annuleringNietNodig !== verwijderVk.a.id ? <section className="rounded-md border border-border p-3"><p className="text-sm">Deze afspraak was afgestemd met de andere ouder. Wil je laten weten dat hij niet doorgaat?</p><div className="mt-2 flex gap-4"><Link to="/berichten" search={{ concept: `De afspraak ${verwijderVk.a.titel} op ${lang(verwijderVk.datum)} om ${uur(verwijderVk.a.tijd)} gaat niet door. We hadden dit afgestemd; ik laat het je daarom weten. De verwijdering leg ik apart ter akkoord voor.` }} className="inline-flex min-h-11 items-center text-sm font-semibold text-brand">Bericht voorbereiden</Link><button onClick={() => setAnnuleringNietNodig(verwijderVk.a.id)} className="min-h-11 text-sm text-ink-soft">Niet nodig</button></div><p className="text-xs text-ink-soft">Je controleert het bericht vóór verzending. De afspraak blijft staan tot akkoord op de verwijdering.</p></section> : null}
          {isReeks(verwijderVk.a) ? (<fieldset className="rounded-md border border-border p-3">
            <legend className="px-1 text-xs font-semibold text-ink-soft">{t("calendar.cancelModal.applyToScope", "Waarop wil je dit toepassen?")}</legend>
            {["alleen", "toekomst", "reeks"].map((b) => (<label key={b} className="flex items-center gap-2 py-1 text-sm">
              <input type="radio" name="vbereik" checked={bereik === b} onChange={() => setBereik(b)} className="accent-[var(--color-brand)]" />{b === "alleen" ? t("calendar.cancelModal.onlyThisOccurrence", "Alleen deze afspraak") : b === "toekomst" ? t("calendar.cancelModal.allFutureOccurrences", "Deze en alle toekomstige afspraken") : t("calendar.entireSeries", "Hele reeks")}
            </label>))}
          </fieldset>) : null}
          {!direct(verwijderVk.a) ? (<>
            <Button onClick={() => { setWachtend((l) => [...l.filter((x) => x.vk.a.id !== verwijderVk.a.id || x.status), { vk: verwijderVk, soort: "verwijder", bereik: isReeks(verwijderVk.a) ? bereik : "reeks" }]); setVerwijderVk(null); setMelding("Annulering voorgesteld. De afspraak blijft staan tot de andere ouder akkoord geeft."); }} className="w-full">{t("calendar.cancelModal.confirmCancel", "Annulering voorstellen")}</Button>
          </>) : (<Button onClick={() => { verwijder(verwijderVk, isReeks(verwijderVk.a) ? bereik : "reeks"); setMelding("Afspraak geannuleerd."); }} className="w-full">{t("calendar.cancelModal.confirmCancel", "Afspraak annuleren")}</Button>)}
          <button onClick={() => setVerwijderVk(null)} className="w-full py-2 text-sm font-semibold text-ink-soft">{t("calendar.cancelModal.keep", "Behouden")}</button>
        </div>) : null}
      </SheetContent>
    </Sheet>

    {nieuwOpen ? (<div className="fixed inset-0 z-30 flex items-end justify-center bg-ink/30 px-5 pb-5" onClick={sluitNieuw}>
      <div className="relative max-h-[80dvh] w-full max-w-md overflow-y-auto rounded-lg border border-border bg-background p-5" onClick={(e) => e.stopPropagation()}>
        <button onClick={sluitNieuw} aria-label="Sluiten" className="knop-kruis absolute right-4 top-4 size-9"><X className="size-5" /></button>
        {verlatenVraag ? (<div className="mt-8 rounded-md border border-border bg-card p-4">
          <p className="font-display text-lg">Afspraak verlaten?</p>
          <p className="mt-1 text-sm text-ink-soft">Je wijzigingen zijn nog niet opgeslagen.</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm font-semibold">
            <button onClick={() => setVerlatenVraag(false)} className="rounded-md bg-brand py-2 text-primary-foreground">Verder bewerken</button>
            <button onClick={() => { setVerlatenVraag(false); setNieuwOpen(false); }} className="rounded-md border border-border py-2 text-ink-soft">Verlaten</button>
          </div>
        </div>) : null}
        <p className="font-display text-lg font-bold">{!bewerk ? "Nieuwe afspraak" : modus === "tijd" ? "Tijd wijzigen" : modus === "locatie" ? "Locatie wijzigen" : modus === "verplaatsen" ? "Afspraak verplaatsen" : modus === "herhaling" ? "Herhalen aanpassen" : "Afspraak bewerken"}</p>
        {bewerk && modus === "aanpassen" ? <div className="mt-3 flex flex-wrap gap-2"><Button variant="outline" onClick={() => setModus("tijd")}><AppIcon functie="tijd" maat="sm" vorm="kaal" />Tijd wijzigen</Button><Button variant="outline" onClick={() => setModus("locatie")}><AppIcon functie="locatie" maat="sm" vorm="kaal" />Locatie wijzigen</Button><Button variant="outline" onClick={() => { setNieuwOpen(false); setVerwijderVk(bewerk); }}><AppIcon functie="niet" maat="sm" vorm="kaal" />Afspraak annuleren</Button></div> : null}
        {bewerk && isReeks(bewerk.a) ? (<fieldset className="mt-3 rounded-md border border-border p-3">
          <legend className="px-1 text-xs font-semibold text-ink-soft">Waarop wil je dit toepassen?</legend>
          {(modus === "herhaling" ? ["toekomst", "reeks"] : ["alleen", "toekomst", "reeks"]).map((b) => (<label key={b} className="flex items-center gap-2 py-1 text-sm">
            <input type="radio" name="bereik" checked={bereik === b} onChange={() => setBereik(b)} className="accent-[var(--color-brand)]" />{bereikNaam[b]}
          </label>))}
        </fieldset>) : null}
        {bewerk && modus === "verplaatsen" ? (<div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-md border border-border p-3"><p className="text-xs text-ink-soft">Huidig</p><p className="font-semibold capitalize">{dt(bewerk.datum).toLocaleDateString(getLocale(), { weekday: "long" })} {uur(bewerk.a.tijd)}</p></div>
          <div className="rounded-md border border-brand/40 bg-brand-soft/50 p-3"><p className="text-xs text-ink-soft">Nieuw</p><p className="font-semibold capitalize">{datum ? dt(datum).toLocaleDateString(getLocale(), { weekday: "long" }) : "—"} {uur(tijd)}</p></div>
        </div>) : null}
        <div className="mt-4 space-y-3">
          {bewerk && ["aanpassen", "tijd", "locatie"].includes(modus) ? <>
            <p className="text-sm font-semibold">{bewerk.a.titel} · {lang(bewerk.datum)}</p>
            {modus === "tijd" ? <><label className="block text-sm">Begintijd<input type="time" value={tijd} onChange={(e) => setTijd(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2.5" /></label><label className="block text-sm">Eindtijd (optioneel)<input type="time" value={eindtijd} onChange={(e) => setEindtijd(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2.5" /></label></> : null}
            {modus === "locatie" ? <label className="block text-sm">Locatie<input value={locatie} onChange={(e) => setLocatie(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2.5" /></label> : null}
          </> : null}
          {toon("titel") ? <input value={titel} onChange={(e) => setTitel(e.target.value)} placeholder="Titel, bijv. Tandarts" className="w-full rounded-md border border-border bg-card px-4 py-3 text-sm outline-none placeholder:text-ink-soft/70" /> : null}
          {toon("datum") ? (<div className="grid grid-cols-2 gap-2">
            <label className="block"><span className="mb-1 block text-xs font-semibold text-ink-soft">Datum</span>
              <input type="date" value={datum} onChange={(e) => setDatum(e.target.value)} className="w-full rounded-md border border-border bg-card px-3 py-2.5 text-sm outline-none" /></label>
            <label className="block"><span className="mb-1 block text-xs font-semibold text-ink-soft">Begintijd</span>
              <input type="time" value={tijd} onChange={(e) => setTijd(e.target.value)} className="w-full rounded-md border border-border bg-card px-3 py-2.5 text-sm outline-none" /></label>
            <label className="col-span-2 block"><span className="mb-1 block text-xs font-semibold text-ink-soft">Eindtijd (optioneel)</span>
              <input type="time" value={eindtijd} onChange={(e) => setEindtijd(e.target.value)} className="w-full rounded-md border border-border bg-card px-3 py-2.5 text-sm outline-none" /></label>
          </div>) : null}
          {toon("herhaling") ? (<div>
            <span className="mb-1 block text-xs font-semibold text-ink-soft">Herhalen</span>
            <div className="flex flex-wrap gap-2">
              {Object.keys(freqLabel).map((f) => (<Chip key={f} actief={herhaling.freq === f} onClick={() => setHerhaling({ ...herhaling, freq: f })}>{freqLabel[f]}</Chip>))}
            </div>
            {herhaling.freq === "aangepast" ? (<div className="mt-2 flex items-center gap-2 text-sm">
              <span className="text-ink-soft">Elke</span>
              <input type="number" min={1} max={12} value={herhaling.interval} onChange={(e) => setHerhaling({ ...herhaling, interval: Math.max(1, Number(e.target.value) || 1) })} className="w-16 rounded-md border border-border bg-card px-2 py-1.5" />
              <select value={herhaling.eenheid} onChange={(e) => setHerhaling({ ...herhaling, eenheid: e.target.value })} className="rounded-md border border-border bg-card px-2 py-1.5">
                <option value="weken">weken</option><option value="maanden">maanden</option>
              </select>
            </div>) : null}
            {herhaling.freq !== "geen" ? (<label className="mt-2 block"><span className="mb-1 block text-xs text-ink-soft">Tot en met (optioneel)</span>
              <input type="date" value={herhaling.eind ?? ""} onChange={(e) => setHerhaling({ ...herhaling, eind: e.target.value || undefined })} className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm" /></label>) : null}
          </div>) : null}
          {toon("rest") ? (<>
            <fieldset>
              <legend className="mb-1 text-xs font-semibold text-ink-soft">Voor wie is de afspraak?</legend>
              {!bewerk ? (<div className="flex flex-wrap gap-2">
                {kindKeuzes.map((k) => <Chip key={k} actief={gedeeld && kind === k} onClick={() => { setKind(k); setGedeeld(true); }}>{/^(allebei|alle kinderen)$/i.test(k) && kindKeuzes.length === 3 ? "Beide kinderen" : k}</Chip>)}
                <Chip actief={!gedeeld} onClick={() => { setGedeeld(false); setKind(""); }}><span className="inline-flex items-center gap-1"><Lock aria-hidden className="size-3.5" strokeWidth={1.8} />Voor mezelf</span></Chip>
              </div>) : gedeeld ? (<div className="flex flex-wrap gap-2">{kindKeuzes.map((k) => <Chip key={k} actief={kind === k} onClick={() => setKind(k)}>{/^(allebei|alle kinderen)$/i.test(k) && kindKeuzes.length === 3 ? "Beide kinderen" : k}</Chip>)}</div>) : <p className="inline-flex items-center gap-1 text-sm"><Lock aria-hidden className="size-3.5 text-ink-soft" strokeWidth={1.8} />Voor mezelf</p>}
              {!gedeeld ? <p className="mt-1.5 inline-flex items-center gap-1 text-xs text-ink-soft"><Lock aria-hidden className="size-3" strokeWidth={1.8} />Dit blijft privé en is alleen voor jouw eigen overzicht.</p> : null}
            </fieldset>
            <label className="block">
              <span className="block text-xs font-semibold text-ink-soft">Categorie (optioneel)</span>
              <span className="mb-1 block text-[11px] text-ink-soft">Kies een categorie om afspraken later makkelijker terug te vinden.</span>
              <select value={categorie} onChange={(e) => setCategorie(e.target.value || "overig")} className="w-full rounded-md border border-border bg-card px-3 py-2.5 text-sm">
                {Object.entries(categorieMeta).map(([key, meta]) => <option key={key} value={key}>{meta.label}</option>)}
              </select>
            </label>
            <input value={locatie} onChange={(e) => setLocatie(e.target.value)} placeholder="Locatie (optioneel)" className="w-full rounded-md border border-border bg-card px-4 py-2.5 text-sm outline-none placeholder:text-ink-soft/70" />
            <textarea value={toelichting} onChange={(e) => setToelichting(e.target.value)} rows={2} placeholder="Toelichting (optioneel)" className="w-full rounded-md border border-border bg-card px-4 py-2.5 text-sm outline-none placeholder:text-ink-soft/70" />
            <label className="block"><span className="mb-1 block text-xs font-semibold text-ink-soft">Herinnering</span>
              <select value={herinnering} onChange={(e) => setHerinnering(e.target.value)} className="w-full rounded-md border border-border bg-card px-3 py-2.5 text-sm">
                {Object.keys(herinneringLabel).map((h) => <option key={h} value={h}>{herinneringLabel[h]}</option>)}
              </select></label>
            {!bewerk && gedeeld && kind.trim() ? (<AanwezigheidFormulier keuze={aanwezigKeuze} wieGaat={aanwezigWieGaat} contactWie={aanwezigContactWie} onKeuze={setAanwezigKeuze} onWieGaat={setAanwezigWieGaat} onContactWie={setAanwezigContactWie} />) : null}
            {bewerk && bewerk.a.gedeeld === false ? (<fieldset>
              <legend className="mb-1 text-xs font-semibold text-ink-soft">Wie kan deze afspraak zien?</legend>
              <div className="flex flex-wrap gap-2">
                <Chip actief={gedeeld} onClick={() => {
                  setGedeeld(true); if (!kind)
                    setKind(standaardKind);
                }}>Bewust delen met de andere ouder</Chip>
                <Chip actief={!gedeeld} onClick={() => setGedeeld(false)}>Alleen voor mij</Chip>
              </div>
              {gedeeld ? <p className="mt-1.5 rounded-md bg-muted p-2 text-xs">Na opslaan ziet de andere ouder: titel, datum, tijd, locatie en toelichting van deze afspraak.</p> : null}
            </fieldset>) : null}
          </>) : null}
          {voorstelNieuw ? <p className="text-xs text-ink-soft">De oorspronkelijke berichttekst staat bij Toelichting. Controleer zelf de datum, tijd, het kind en de omschrijving; er zijn geen ontbrekende details ingevuld.</p> : null}
          <p className="text-xs text-ink-soft">{wordtVoorstel ? "Bij een gezamenlijke afspraak krijgt de andere ouder een melding van je voorstel zodra jullie accounts veilig gekoppeld zijn. In dit voorbeeld wordt geen echte melding verstuurd. De afspraak blijft gelden tot akkoord." : eigen ? "Bewaard op dit apparaat. Delen kan zodra de andere ouder echt gekoppeld is." : !bewerk && gedeeld ? "Deze afspraak wordt toegevoegd aan het voorbeeldgezin." : "Alleen jij ziet deze afspraak; je wijziging wordt direct opgeslagen."}</p>
        </div>
        {priveBotsing ? (<div role="status" className="mt-4 rounded-md border border-border bg-muted p-3 text-sm">
          <p className="font-semibold">Dit lijkt te overlappen</p>
          <p className="mt-1 text-xs text-ink-soft">Je hebt op dit moment ook een persoonlijke afspraak. {priveBotsing.map((b) => b.tekst).join(" ")}</p>
          {afstemTekst === null ? (<div className="mt-2 flex flex-wrap gap-2">
            <button onClick={() => { setGekozenDag(datum); }} className="rounded-full border border-border px-3 py-1 text-xs font-semibold">Bekijk planning</button>
            <button onClick={() => setAfstemTekst(priveBotsing[0]?.bericht ?? "")} className="rounded-full bg-brand px-3 py-1 text-xs font-semibold text-primary-foreground">Even afstemmen</button>
            <button onClick={() => opslaan(true)} className="rounded-full border border-border px-3 py-1 text-xs font-semibold">Gewoon opslaan</button>
          </div>) : (<div className="mt-2 space-y-2">
            <p className="text-xs">Wil je vragen of de andere ouder dit kan overnemen? Controleer het bericht eerst. Er staat niets in over je persoonlijke afspraak.</p>
            <textarea aria-label="Bericht aan de andere ouder" value={afstemTekst} onChange={(e) => setAfstemTekst(e.target.value)} rows={3} className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm" />
            <div className="flex flex-wrap gap-2">
              <button disabled={!afstemTekst.trim()} onClick={() => {
                const b = priveBotsing[0];
                if (!b)
                  return;
                startNuAfstemmen({ categorie: "halen", kindIds: /allebei|&|kinderen/i.test(b.kind) ? ["emma", "noah"] : [b.kind.toLowerCase()], titel: `${b.titel} op ${kort(datum)}`, toelichting: afstemTekst.trim(), reactieGewenst: "zsm" });
                opslaan(true);
                setMelding("Persoonlijke afspraak bewaard en je vraag is verstuurd. De andere ouder ziet niets van je afspraak.");
              }} className="rounded-full bg-brand px-3 py-1 text-xs font-semibold text-primary-foreground">Versturen</button>
              <button onClick={() => setAfstemTekst(null)} className="rounded-full border border-border px-3 py-1 text-xs font-semibold">Terug</button>
            </div>
          </div>)}
        </div>) : null}
        {controle ? (<div role="status" className="mt-4 rounded-md border border-border bg-muted p-3 text-sm">
          <p className="font-semibold">Even controleren</p>
          {controle.map((c, i) => <p key={`${c.soort}-${i}`} className="mt-1 text-xs text-ink-soft">{c.tekst}</p>)}
          <div className="mt-2 flex flex-wrap gap-2">
            {controle.some((c) => c.soort !== "overlap") ? (<button onClick={() => {
              const nieuwId =
                `nieuw-${Date.now()}`;
              const verzoek = startNuAfstemmen({
                categorie: "planning",
                kindIds: /allebei|&/i.test(kind) ? ["emma", "noah"] : [kind.toLowerCase()],
                titel: `${titel.trim()} op ${kort(datum)}`,
                toelichting: `${controle.map((c) => c.tekst).join(" ")} Komt ${titel.trim()}${tijd ? ` om ${uur(tijd)}` : ""} uit?`,
                reactieGewenst: "zsm",
              });
              koppelAfstem(bewerk ? bewerk.a.id : nieuwId, verzoek);
              opslaan(true, bewerk ? undefined : nieuwId);
              setMelding("De afspraak wordt nog afgestemd. Gezien is nog geen akkoord, en geen reactie ook niet.");
            }} className="rounded-full bg-brand px-3 py-1 text-xs font-semibold text-primary-foreground">Ja, even vragen</button>) : null}
            <Button variant="outline" size="sm" onClick={() => opslaan(true)}>Toch opslaan</Button>
            <button onClick={() => setControle(null)} className="rounded-full border border-border px-3 py-1 text-xs font-semibold">Andere tijd kiezen</button>
            {controle.filter((c) => c.afspraakId).map((c) => <Button key={c.afspraakId} variant="outline" size="sm" onClick={() => {
              const a = extra.find((a) => a.id === c.afspraakId); if (a)
                setDetail({ a, datum });
              else {
                setNieuwOpen(false);
                router.navigate({ to: "/agenda", search: { afspraak: c.afspraakId, dag: datum } });
              }
            }}>Bekijk afspraak</Button>)}
          </div>
          {controle.some((c) => c.soort !== "overlap") ? <p className="mt-2 text-xs text-ink-soft">Kies je "Ja, even vragen", dan staat de afspraak erin als "wordt afgestemd". Gezien betekent nog geen akkoord, en geen reactie ook niet.</p> : null}
          {controle.some((c) => c.soort === "verblijf" || c.soort === "wissel") ? (<div className="mt-3 border-t border-border pt-2">
            <p className="text-xs font-semibold">Wie brengt of haalt {/allebei|&/i.test(kind) ? "de kinderen" : kind}?</p>
            <div className="mt-1.5 flex flex-wrap gap-2">
              <button onClick={() => {
                const nieuwId =
                  `nieuw-${Date.now()}`; opslaan(true, bewerk ? undefined : nieuwId); ikGa(bewerk ? bewerk.a.id : nieuwId, titel.trim());
              }} className="rounded-full bg-brand px-3 py-1 text-xs font-semibold text-primary-foreground">Ik</button>
              <button onClick={() => { startNuAfstemmen({ categorie: "halen", kindIds: /allebei|&/i.test(kind) ? ["emma", "noah"] : [kind.toLowerCase()], titel: `${titel.trim()} op ${kort(datum)}`, toelichting: `Wie wil ${titel.trim()} op ${kort(datum)} brengen of ophalen?`, reactieGewenst: "zsm" }); setMelding("Afspraak toegevoegd en de vraag naar wie het regelt is gestuurd."); opslaan(true); }} className="rounded-full border border-border px-3 py-1 text-xs font-semibold">Andere ouder vragen</button>
            </div>
          </div>) : null}
        </div>) : null}
        {importExtra && !bewerk ? <fieldset className="mt-4 space-y-3 border-t border-border pt-3"><legend className="text-sm font-semibold">Ook meenemen uit de schoolbrief</legend>
          {importExtra.bedrag ? <label className="block text-xs font-semibold">Budget voorstellen (€)<input aria-label="Budget uit schoolbrief" type="number" min="0.01" max="100000" step="0.01" value={importExtra.bedrag} onChange={(e) => setImportExtra((v) => v ? { ...v, bedrag: e.target.value } : v)} className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-sm" /></label> : null}
          {importExtra.taak ? <label className="block text-xs font-semibold">Taak<input aria-label="Taak uit schoolbrief" value={importExtra.taak} onChange={(e) => setImportExtra((v) => v ? { ...v, taak: e.target.value } : v)} className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-sm" /></label> : null}
          {importExtra.mee ? <label className="block text-xs font-semibold">Voorbereiding<input aria-label="Voorbereiding uit schoolbrief" value={importExtra.mee} onChange={(e) => setImportExtra((v) => v ? { ...v, mee: e.target.value } : v)} className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-sm" /></label> : null}
          <p className="text-xs text-ink-soft">Taken komen bij Taken, met deze datum en nog niemand toegewezen. Het budget is een voorstel, geen betaling.</p>
          <Button variant="ghost" onClick={() => setImportExtra(null)}>Alleen de afspraak bewaren</Button>
        </fieldset> : null}
        {gedeeld && !bewerk ? <div className="mt-4">
          <HulpKnop voorstel={{ kind: hulpKind(), ...(titel ? { wat: titel } : {}), ...(datum ? { datum } : {}), ...(tijd ? { tijd } : {}) }} />
        </div> : null}
        <div className="sticky bottom-0 -mx-1 bg-background px-1 pb-1 pt-3">
          {!(bewerk && modus === "aanpassen") ? <Button onClick={() => opslaan()} disabled={!titel.trim() || !datum || (gedeeld && !kind.trim()) || (voorstelNieuw && eigen) || (importExtra?.bedrag ? !(Number(importExtra.bedrag.replace(",", ".")) > 0) : false)} className="min-h-11 w-full bg-brand text-primary-foreground shadow-none">
            {importExtra && !bewerk ? "Selectie bevestigen" : wordtVoorstel ? (bewerk ? "Wijziging voorstellen" : "Afspraak voorstellen") : !bewerk ? "Afspraak opslaan" : "Wijziging opslaan"}
          </Button> : null}
        </div>
      </div>
    </div>) : null}
  </AppShell>);
}
const bereikNaam = { alleen: "Alleen deze afspraak", toekomst: "Deze en toekomstige afspraken", reeks: "Hele reeks" };
const herinneringLabel = { geen: "Geen herinnering", uur: "1 uur van tevoren", dag: "1 dag van tevoren", twee: "2 dagen van tevoren" };
function Chip({ actief, onClick, children }) {
  return (<button type="button" onClick={onClick} className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${actief ? "border-brand bg-brand text-primary-foreground" : "border-border bg-card"}`}>{children}</button>);
}
function ZorgLegenda() {
  const { t } = useTranslation();
  return <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-soft" aria-label="Legenda zorgverdeling"><span><span className="font-semibold text-brand">{t("calendar.greenWithYou", "Groen: bij jou")}</span></span><span>·</span><span><span className="font-semibold text-accent-warm">{t("calendar.peachWithOther", "Perzik: bij de andere ouder")}</span></span><span>·</span><span className="inline-flex items-center gap-1"><AppIcon functie="wissel" vorm="kaal" maat="sm" />{t("calendar.handoverLabel", "Wissel")}</span></div>;
}
function DagCel({ gegevens, d, zorg, regio, heeftIets, onKies, groot, geselecteerd, eigenPlek, eigenWissel }) {
  const { t } = useTranslation();
  const ouder = gegevens.kleur === "ik" ? "sanne" : gegevens.kleur === "ander" ? "joris" : undefined;
  const vandaag = d === VANDAAG;
  const wissel = gegevens.wissels.length > 0;
  const vak = vakantieOp(regio, d);
  const { bijzonderTonen } = useVoorkeuren();
  const bd = bijzonderTonen ? bijzondereDagOp(d) : undefined;
  const datum = dt(d);
  return (<Button variant="ghost" type="button" onClick={() => onKies(d)} aria-pressed={!!geselecteerd} aria-label={`${lang(d)}, ${gegevens.kleur === "gemengd" ? "verschillend verdeeld, " : ""}${gegevens.kinderen.map((k) => `${k.naam}: ${ouderLabel(k.ouder)}`).join(", ")}${vandaag ? ", vandaag" : ""}${wissel ? ", wisselmoment" : ""}${vak ? `, ${vak.naam}` : ""}${bd ? `, ${bd.naam}` : ""}`} className={`relative h-auto min-h-11 min-w-0 flex-col gap-0 rounded-lg px-0 text-center zorg-${gegevens.kleur} ${wissel ? "zorg-wissel" : ""} ${groot ? "min-h-20 py-2" : "py-1"} ${geselecteerd ? "outline-2 outline-brand" : vandaag ? "outline-2 outline-ink" : ""}`}>
    {groot ? <span className="block text-[11px] capitalize text-ink-soft">{datum.toLocaleDateString(getLocale(), { weekday: "short" })}</span> : null}
    <span className={`block ${groot ? "text-sm" : "text-[11px]"} ${vandaag ? "font-extrabold" : "font-semibold"} ${ouder === "sanne" ? "text-brand" : ouder === "joris" ? "text-accent-warm" : "text-ink"}`}>{datum.getDate()}</span>
    <span className="mx-auto mt-0.5 flex h-4 items-center justify-center gap-0.5">
      {wissel ? <AppIcon functie="wissel" maat="sm" vorm="kaal" /> : null}
      {heeftIets ? <span className="size-1 rounded-full bg-ink/50" /> : null}
      {bd ? <span className="size-1 rounded-full bg-accent-warm" /> : null}
    </span>
    {groot && gegevens.kleur === "gemengd" ? <span className="relative block text-[10px] text-ink">{t("calendar.splitSchedule", "Verdeeld")}</span> : null}
    {vak ? <span className="absolute inset-x-1.5 bottom-0.5 h-0.5 rounded bg-ink-soft/40" /> : null}
    {vandaag && groot ? <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-ink px-1.5 text-[8px] font-bold text-background">{t("calendar.today", "vandaag")}</span> : null}
  </Button>);
}
function DagSheet({ gegevens, dag, onSluit, zorg, regio, extra, taken, onToevoegen, onOpen, onOpenVast, eigen, eigenKinderen, eigenWissel }) {
  const { t } = useTranslation();
  const d = dag ?? VANDAAG;
  const kinderen = eigen
    ? (eigenKinderen ?? []).map((k) => ({ k: k.naam, v: { ouder: k.plek === "ik" ? "sanne" : "joris", uitzondering: undefined } }))
    : ["emma", "noah"].map((k) => ({ k, v: verblijf(zorg, k, d) })).filter((x) => x.v);
  const demo = eigen ? [] : demoOp(d).filter((a) => !extra.some((v) => v.a.id === a.id));
  const school = demo.filter((a) => a.categorie === "school" || a.categorie === "sport");
  const overig = demo.filter((a) => a.categorie !== "school" && a.categorie !== "sport" && a.categorie !== "wissel");
  const wisselDemo = demo.filter((a) => a.categorie === "wissel");
  const wissel = eigenWissel ?? (!eigen && isWissel(zorg, d));
  const vak = vakantieOp(regio, d);
  const { bijzonderTonen } = useVoorkeuren();
  const bd = bijzonderTonen ? bijzondereDagOp(d) : undefined;
  const bijzonder = [vak ? `${vak.naam} (schoolkalender)` : null, bd ? `${bd.naam} (kalender)` : null, ...kinderen.map((x) => (x.v?.uitzondering ? `${eigen ? x.k : kindNamen[x.k]}: ${x.v.uitzondering}` : null))].filter(Boolean);
  const Sectie = ({ titel, children }) => (<div className="py-3"><p className="text-[11px] font-semibold tracking-wider text-ink-soft uppercase">{titel}</p><div className="mt-1.5 space-y-1 text-sm">{children}</div></div>);
  return (<Sheet open={!!dag} onOpenChange={(o) => !o && onSluit()}>
    <SheetContent side="bottom" className="inset-x-0 mx-auto w-full max-w-md max-h-[85vh] overflow-y-auto rounded-t-2xl bg-background px-5 pb-8">
      <SheetHeader className="text-left">
        <div className="flex items-center justify-between pr-7"><SheetTitle className="font-display text-xl font-medium first-letter:uppercase">{lang(d)}</SheetTitle><Button variant="ghost" size="icon" aria-label="Afspraak toevoegen op deze dag" onClick={onToevoegen}><AppIcon functie="toevoegen" maat="sm" vorm="kaal" /></Button></div>
        <SheetDescription className="sr-only">Wat er op deze dag speelt</SheetDescription>
      </SheetHeader>
      <div className="mt-2 divide-y divide-border border-y border-border">
        {gegevens.kinderen.length ? <Sectie titel={t("calendar.daySheet.stayAccordingToPlan", "Verblijf volgens planning")}>{gegevens.kinderen.map((k) => <div key={k.id}><p>{k.naam} · {ouderLabel(k.ouder)}</p>{k.delen?.map((d, i) => <p key={i} className="text-xs text-ink-soft">{d.tijdVan ?? "00:00"}–{d.tijdTot ?? "23:59"} · {d.ouder === "Sanne" ? t("calendar.daySheet.atYou", "Bij jou") : d.ouder === "Joris" ? t("calendar.daySheet.atOtherParent", "Bij de andere ouder") : "Samen"}</p>)}{k.overlap.length ? <p className="text-xs text-accent-warm">Deze afspraken overlappen: {k.overlap.join(" en ")}. Stem de verdeling af; er is niets automatisch gewijzigd.</p> : null}</div>)}</Sectie> : null}
        <AgendaWissels datum={d} gegevens={gegevens} />
        {overig.length || extra.length ? (<Sectie titel={t("calendar.daySheet.appointments", "Afspraken")}>
          {overig.map((a) => <Button key={a.id} variant="ghost" onClick={() => onOpenVast(a.id)} aria-label={`${a.titel} openen`} className="h-auto min-h-11 w-full justify-between gap-2 whitespace-normal px-0 text-left"><span>{uur(a.tijd)} · {a.titel} · {a.kind}</span><AppIcon functie="oog" maat="sm" vorm="kaal" /></Button>)}
          {extra.map((v) => <button key={v.a.id} type="button" onClick={() => onOpen(v)} className="flex min-h-[44px] w-full items-center justify-between gap-2 text-left" aria-label={`${v.a.titel} openen`}><span>{v.a.tijd ? uur(v.a.tijd) : "Hele dag"} · {v.a.titel} · {v.a.kind}{afstemStatus(v.a.id) === "akkoord" ? " · Afgestemd ✓" : ""}{v.a.herhaling ? " · herhalend" : ""}</span><ChevronRight className="size-4 text-ink-soft shrink-0" /></button>)}
        </Sectie>) : null}
        {school.length ? <Sectie titel={t("calendar.daySheet.schoolAndActivities", "School & activiteiten")}>{school.map((a) => <Button key={a.id} variant="ghost" onClick={() => onOpenVast(a.id)} aria-label={`${a.titel} openen`} className="h-auto min-h-11 w-full justify-between gap-2 whitespace-normal px-0 text-left"><span>{uur(a.tijd)} · {a.titel}</span><AppIcon functie="oog" maat="sm" vorm="kaal" /></Button>)}</Sectie> : null}
        {taken.length ? <Sectie titel={t("calendar.daySheet.tasks", "Taken")}>{taken.map((t) => <p key={t.id}>{t.tekst}</p>)}</Sectie> : null}
        {bijzonder.length ? <Sectie titel={t("calendar.daySheet.special", "Bijzonder")}>{bijzonder.map((b) => <p key={b}>{b}</p>)}</Sectie> : null}
        {!kinderen.length && !demo.length && !extra.length && !taken.length && !bijzonder.length && !wissel ? <p className="py-3 text-sm text-ink-soft">{t("calendar.daySheet.nothingPlanned", "Niets gepland op deze dag.")}</p> : null}
      </div>
      <button onClick={onToevoegen} className="mt-4 w-full rounded-md border border-brand/40 py-3 text-sm font-semibold text-brand">{t("calendar.daySheet.addSomething", "+ Toevoegen")}</button>
    </SheetContent>
  </Sheet>);
}
function ExtraAfspraakRij({ v, onOpen, wacht, onAkkoord }) {
  const { a } = v;
  useAanwezigheid();
  const { taken } = useTaken();
  const aan = a.gedeeld !== false ? aanwezigVoor(a.id) : undefined;
  const aanTaak = aan?.contactTaakId ? taken.find((t) => t.id === aan.contactTaakId) : undefined;
  const aanRegel = aan && !wacht ? statusRegel(aan, aanTaak?.contactStatus) : null;
  return (<div className="rounded-md border border-border bg-card p-3">
    <div className="flex items-center gap-3">
      <button onClick={() => onOpen(v)} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-label={`${a.titel} openen`}>
        <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-lg"><Pictogram waarde={categorieMeta[a.categorie]?.icoon ?? "📌"} maat="md" vorm="kaal" /></div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{a.titel}</p>
          <p className="text-xs text-ink-soft">
            {dt(v.datum).toLocaleDateString(getLocale(), { day: "numeric", month: "long" })}{a.tijd ? ` · ${uur(a.tijd)}` : ""} · {a.kind}
            {a.herhaling && a.herhaling.freq !== "geen" ? ` · ${freqLabel[a.herhaling.freq].toLowerCase()}` : ""}
            {a.gedeeld === false ? <span className="ml-1.5 rounded-full border border-border px-1.5 py-px text-[11px] font-semibold">Privé</span> : null}
          </p>
          {wacht ? <p className="text-[11px] font-semibold text-ink-soft">Reactie open · huidige afspraak blijft gelden</p> : null}
          {aanRegel ? <p className="text-[11px] text-ink-soft">{aanRegel}</p> : null}
        </div>
      </button>
      <GeschiedenisKnop soort="afspraak" itemId={a.id} naam={a.titel} />
    </div>
    {wacht && onAkkoord ? (<div className="mt-2 flex gap-2 pl-14 text-xs font-semibold">
      {import.meta.env.DEV ? <button onClick={onAkkoord} className="min-h-[36px] rounded-full bg-brand-soft px-3.5 text-brand">Demo: akkoord</button> : null}
      <button onClick={() => onOpen(v)} className="min-h-[36px] rounded-full border border-border px-3.5 text-ink-soft">Bekijk voorstel</button>
    </div>) : null}
  </div>);
}
const freqTekst = (h) => (h && h.freq !== "geen" ? freqLabel[h.freq] : "Niet herhalend");
/** Detailweergave van een afspraak met een rustige ••• knop: alleen opties die bij deze afspraak passen. */
function AfspraakDetail({ v, direct, wacht, ingetrokken, onSluit, onActie, onIntrekken, onAkkoord }) {
  const [menu, setMenu] = useState(false);
  useEffect(() => setMenu(false), [v]);
  if (!v)
    return null;
  const { a } = v;
  const gedeeld = !direct;
  const reeks = !!a.herhaling && a.herhaling.freq !== "geen";
  const opties = [
    ...(gedeeld ? [] : [{ id: "aanpassen", label: "Aanpassen" }]),
    { id: "verplaatsen", label: "Verplaatsen" },
    { id: "verwijderen", label: "Verwijderen" },
    ...(reeks ? [{ id: "herhaling", label: "Herhalen aanpassen" }] : []),
    ...(gedeeld ? [{ id: "aanpassen", label: "Voorstel tot wijziging doen" }] : []),
  ];
  const rij = (l, w) => (w ? <div className="flex justify-between gap-3 py-2"><dt className="text-ink-soft">{l}</dt><dd className="text-right font-semibold">{w}</dd></div> : null);
  if (ingetrokken)
    return <Sheet open onOpenChange={(o) => !o && onSluit()}><SheetContent side="bottom" className="inset-x-0 mx-auto w-full max-w-md rounded-t-2xl bg-background"><SheetHeader><SheetTitle>{a.titel}</SheetTitle><SheetDescription>Ingetrokken · dit voorstel kan niet meer worden goedgekeurd. De huidige agenda blijft gelden.</SheetDescription></SheetHeader><div className="mt-3 flex items-center gap-2"><GeschiedenisKnop soort="afspraak" itemId={a.id} naam={a.titel} /><span className="text-sm">Wijzigingsgeschiedenis</span></div></SheetContent></Sheet>;
  return (<Sheet open onOpenChange={(o) => !o && onSluit()}>
    <SheetContent side="bottom" className="inset-x-0 mx-auto w-full max-w-md max-h-[80dvh] overflow-y-auto rounded-t-2xl bg-background px-5 pb-8">
      <SheetHeader className="pr-20 text-left">
        <SheetTitle className="font-display text-xl font-medium">{a.titel}</SheetTitle>
        <SheetDescription>{lang(v.datum)}{a.tijd ? ` · ${uur(a.tijd)}` : ""}</SheetDescription>
      </SheetHeader>
      {!wacht ? (<button onClick={() => setMenu((m) => !m)} aria-label="Meer opties" aria-expanded={menu} className="absolute right-12 top-4 grid size-8 place-items-center rounded-full text-ink-soft hover:bg-secondary">
        <MoreHorizontal className="size-5" strokeWidth={1.6} />
      </button>) : null}
      {!wacht ? <BewerkPotlood onClick={() => onActie("aanpassen")} label={gedeeld ? "Wijziging voorstellen" : "Afspraak bewerken"} className="right-20! top-2!" /> : null}
      {menu ? (<div className="mt-3 divide-y divide-border rounded-md border border-border bg-card">
        {opties.map((o) => <button key={o.label} onClick={() => onActie(o.id)} className="block w-full px-4 py-3 text-left text-sm font-semibold">{o.label}</button>)}
        <Link to="/kosten" search={{ uitgave: a.titel }} onClick={onSluit} className="block w-full px-4 py-3 text-left text-sm font-semibold">Kosten toevoegen</Link>
      </div>) : null}
      <dl className="mt-4 divide-y divide-border border-y border-border text-sm">
        {rij("Kind", a.kind)}
        {rij("Soort", categorieMeta[a.categorie]?.label)}
        {rij("Locatie", a.locatie)}
        {rij("Herhaling", freqTekst(a.herhaling))}
        {rij("Herinnering", a.herinnering && a.herinnering !== "geen" ? herinneringLabel[a.herinnering] : undefined)}
        {rij("Zichtbaar voor", a.gedeeld !== false ? "Beide ouders" : "Alleen jij")}
      </dl>
      {a.toelichting ? <p className="mt-3 text-sm text-ink-soft">{a.toelichting}</p> : null}
      {a.gedeeld !== false && !wacht ? <AanwezigheidBlok afspraakId={a.id} titel={a.titel} kind={a.kind} datum={v.datum} /> : null}
      {a.gedeeld !== false ? <div className="mt-3 flex items-center gap-2 text-xs text-ink-soft"><GeschiedenisKnop soort="afspraak" itemId={a.id} naam={a.titel} /><span>Wijzigingsgeschiedenis</span></div> : null}
      {!wacht ? (<div className="mt-4 grid grid-cols-2 gap-2 text-sm font-semibold">
        <button onClick={() => onActie("aanpassen")} className="min-h-[44px] rounded-md border border-brand/40 text-brand">{gedeeld ? "Wijziging voorstellen" : "Bewerken"}</button>
        <button onClick={() => onActie("verwijderen")} className="min-h-[44px] rounded-md border border-border text-ink-soft">Afspraak verwijderen</button>
      </div>) : null}
      {gedeeld && !wacht ? <p className="mt-3 text-[11px] text-ink-soft">Gedeelde afspraak: wijzigen of verwijderen gaat via een voorstel aan de andere ouder.</p> : null}
      {wacht ? (<div className="mt-4 rounded-md border border-border bg-card p-3 text-sm">
        <p className="font-semibold">{wacht.soort === "nieuw" ? "Nieuwe afspraak voorgesteld" : wacht.soort === "verwijder" ? "Verwijdering voorgesteld" : "Wijziging voorgesteld"}</p>
        {wacht.velden ? <p className="mt-1 text-xs text-ink-soft">Nieuw: {lang(wacht.velden.datum)}{wacht.velden.tijd ? ` · ${uur(wacht.velden.tijd)}` : ""}{wacht.velden.titel !== a.titel ? ` · ${wacht.velden.titel}` : ""}</p> : null}
        <p className="mt-1 text-xs text-ink-soft">Reactie open · de huidige afspraak blijft gelden. Geen reactie betekent geen akkoord.</p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-semibold">
          <VoorstelIntrekken onBevestig={onIntrekken} />
        </div>
      </div>) : null}
    </SheetContent>
  </Sheet>);
}
/** Detail van een vaste (voorbeeld)afspraak: wijzigen loopt via een voorstel. */
function VasteAfspraakSheet({ open, onSluit, a, onActie }) {
  const { t } = useTranslation();
  const [menu, setMenu] = useState(false);
  return (<Sheet open={open} onOpenChange={(o) => !o && onSluit()}>
    <SheetContent side="bottom" className="inset-x-0 mx-auto w-full max-w-md rounded-t-2xl bg-background px-5 pb-8">
      <SheetHeader className="pr-20 text-left">
        <SheetTitle className="font-display text-xl font-medium">{a.titel}</SheetTitle>
        <SheetDescription>{a.datumLabel} · {uur(a.tijd)} · {a.kind}</SheetDescription>
      </SheetHeader>
      <button onClick={() => setMenu((m) => !m)} aria-label={t("common.actions", "Meer opties")} className="absolute right-12 top-4 grid size-8 place-items-center rounded-full text-ink-soft hover:bg-secondary"><MoreHorizontal className="size-5" strokeWidth={1.6} /></button>
      {menu ? (<div className="mt-3 divide-y divide-border rounded-md border border-border bg-card">
        <Button variant="ghost" className="w-full justify-start" onClick={() => onActie("tijd")}><AppIcon functie="tijd" maat="sm" vorm="kaal" />{t("calendar.changeTime", "Tijd wijzigen")}</Button>
        <Button variant="ghost" className="w-full justify-start" onClick={() => onActie("locatie")}><AppIcon functie="locatie" maat="sm" vorm="kaal" />{t("calendar.changeLocation", "Locatie wijzigen")}</Button>
        <Button variant="ghost" className="w-full justify-start" onClick={() => onActie("verwijderen")}><AppIcon functie="niet" maat="sm" vorm="kaal" />{t("calendar.cancelAppointment", "Afspraak annuleren")}</Button>
      </div>) : null}
      <p className="mt-4 text-sm">{a.locatie}</p>
      <Button variant="outline" onClick={() => onActie("aanpassen")} className="mt-4 w-full">{t("calendar.editAppointment", "Afspraak bewerken")}</Button>
      <p className="mt-3 text-xs text-ink-soft">{t("calendar.jointAppointmentNotice", "Bij een gezamenlijke afspraak krijgt de andere ouder een melding van je wijziging of annulering zodra jullie accounts veilig gekoppeld zijn. In dit voorbeeld wordt geen echte melding verstuurd. De afspraak blijft gelden tot akkoord.")}</p>
    </SheetContent>
  </Sheet>);
}
function AfspraakRij({ id, onActie }) {
  const { t } = useTranslation();
  const a = afspraken.find((x) => x.id === id);
  const bijSanne = a?.ouder === "sanne";
  const [open, setOpen] = useState(false);
  // Vanuit zoeken: dit item direct in beeld en open, zonder opnieuw te zoeken.
  const doel = useRouterState({ select: (s) => s.location.hash }) === `item-${id}`;
  useEffect(() => {
    if (doel)
      setOpen(true);
  }, [doel]);
  if (!a)
    return null;
  const isWisselMoment = a.categorie === "wissel";
  const inhoud = (<>
    <div className={`grid size-11 shrink-0 place-items-center rounded-xl text-lg ${bijSanne ? "bg-brand-soft" : "bg-accent-soft"}`}><Pictogram waarde={categorieMeta[a.categorie].icoon} maat="md" vorm="kaal" /></div>
    <div className="min-w-0 flex-1 text-left">
      <p className="truncate text-sm font-semibold">{a.titel}</p>
      <p className="text-xs text-ink-soft">{a.datumLabel} · {uur(a.tijd)} · {a.kind}</p>
      <p className="text-[11px] text-ink-soft/80">{a.locatie}</p>
    </div>
  </>);
  return (<div id={`item-${a.id}`} className="zoekdoel flex items-center gap-3 rounded-md border border-border bg-card p-3">
    <button onClick={() => setOpen(true)} className="flex min-w-0 flex-1 items-center gap-3" aria-label={`${isWisselMoment ? t("calendar.handoverMoment", "Wisselmoment") : a.titel} ${a.datumLabel} ${a.tijd} openen`}>{inhoud}</button>
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${bijSanne ? "bg-brand-soft text-brand" : "bg-accent-soft text-accent-warm"}`}>{bijSanne ? t("calendar.withYou", "Bij jou") : t("calendar.withOtherParent", "Bij de andere ouder")}</span>
    <GeschiedenisKnop soort="afspraak" itemId={a.id} naam={a.titel} />
    {isWisselMoment ? <WisselmomentSheet open={open} onSluit={() => setOpen(false)} a={a} /> : <VasteAfspraakSheet open={open} onSluit={() => setOpen(false)} a={a} onActie={(actie) => { setOpen(false); onActie(actie); }} />}
  </div>);
}
/** Detail van een wisselmoment: direct vanuit de Agenda, met alleen relevante acties. */
function WisselmomentSheet({ open, onSluit, a }) {
  const { t } = useTranslation();
  const router = useRouter();
  const vk = useVoorkeuren();
  const wisselDatum = `2025-03-${String(a.dag).padStart(2, "0")}`;
  const { spullen } = useTaken();
  const aantalMee = spullen.filter((s) => s.type === "mee").length;
  const knop = "w-full rounded-md border border-border px-4 py-3 text-left text-sm font-semibold";
  return (<Sheet open={open} onOpenChange={(o) => !o && onSluit()}>
    <SheetContent side="bottom" className="inset-x-0 mx-auto w-full max-w-md rounded-t-2xl bg-background px-5 pb-8">
      <SheetHeader className="pr-8 text-left">
        <SheetTitle className="font-display text-xl font-medium">{t("calendar.handoverMoment", "Wisselmoment")}</SheetTitle>
        <SheetDescription className="text-sm text-ink">{a.datumLabel} · {uur(a.tijd)}</SheetDescription>
      </SheetHeader>
      <dl className="mt-3 divide-y divide-border border-y border-border text-sm">
        <div className="flex justify-between py-2.5"><dt className="text-ink-soft">{t("calendar.location", "Locatie")}</dt><dd className="font-semibold">{a.locatie}</dd></div>
        <div className="flex justify-between py-2.5"><dt className="text-ink-soft">{t("calendar.child", "Kind")}</dt><dd className="font-semibold">{a.kind}</dd></div>
        <div className="flex justify-between py-2.5"><dt className="text-ink-soft">{t("calendar.itemsToTake", "Mee te nemen")}</dt><dd className="font-semibold">{aantalMee} {t(aantalMee === 1 ? "calendar.item" : "calendar.items", aantalMee === 1 ? "ding" : "dingen")}</dd></div>
      </dl>
      <div className="mt-4 space-y-2">
        <Button variant="outline" className={knop} onClick={() => router.navigate({ to: "/overdracht" })}>{t("calendar.wissels.viewHandover", "Overdracht bekijken")}</Button>
        {magOverdrachtVoorbereiden(wisselDatum, a.tijd, new Date(), vk.overdrachtHulp) ? <Button variant="outline" className={knop} onClick={() => router.navigate({ to: "/overdracht" })}>{t("calendar.wissels.prepareHandover", "Overdracht voorbereiden")}</Button> : null}
        <button className={knop} onClick={() => router.navigate({ to: "/agenda", search: { zorgActie: "wijziging" } })}>{t("calendar.wissels.proposeChange", "Wijziging voorstellen")}</button>
        {a.locatie ? <a className={`${knop} block`} href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a.locatie)}`} target="_blank" rel="noreferrer">{t("calendar.viewRouteLocation", "Route / locatie bekijken")}</a> : null}
      </div>
    </SheetContent>
  </Sheet>);
}
