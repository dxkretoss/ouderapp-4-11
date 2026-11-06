import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AppLogo } from "@/components/AppLogo";
import { Badge, FilterBalk, OverzichtKaart } from "@/components/ui-kit";
import { InterneAfsluiting } from "@/components/pro/BetrokkenheidAfsluiten";
import { GezinIntake } from "@/components/pro/GezinIntake";
import { createFileRoute, Link } from "@tanstack/react-router";
import { proToegangBakker } from "@/lib/export-rechten";
import { useMemo, useState } from "react";
import { AppShell, Card, PageHeader } from "@/components/AppShell";
import { AppIcon, TekenLabel } from "@/components/AppIcon";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { DossierWerkruimte, evaluatieTekst, tabVoorModus } from "@/components/pro/DossierWerkruimte";
import { drukNiveau } from "@/lib/communicatiedruk";
import { actieStatus, dagenTot, datumKort, IK, mijnRechten, toggleActie, useProWerk, zetMelding } from "@/lib/pro-journaal-store";
import { uur } from "@/lib/tijd-tekst";
import { recenteProGebeurtenissen } from "@/lib/pro-recent";
/* Eigen acties: alleen wat jij zelf moet doen. Acties "voor ouders" tellen hier niet mee. */
const eigenActie = (a) => a.voor.split(", ").includes(IK);
export const Route = createFileRoute("/professionals")({
    head: () => ({
        meta: [
            { title: "Professionals — Ouderschap & Co" },
            { name: "description", content: "Rustig werkdashboard voor mediators en coaches, en toegang die ouders zelf regelen." },
            { property: "og:title", content: "Professionals — Ouderschap & Co" },
            { property: "og:description", content: "Mijn werk rondom verschillende gezinnen overzichtelijk op één plek." },
            { property: "og:type", content: "website" },
            { name: "twitter:card", content: "summary" },
        ],
    }),
    component: Professionals,
});
const alleOnderdelen = ["Planning", "Zorgregeling", "Communicatie", "Afspraken", "Besluiten", "Documenten", "Kosten", "Overdracht", "Gesprekken", "Opnames", "Momentjes"];
const startDossiers = [
    { id: "jansen", gezin: "Familie Jansen", kinderen: ["Noor – 7 jaar", "Sem – 4 jaar"], ouders: "Sophie & Mark", rol: "Mediator", sinds: "12 september 2026", toegang: ["Planning", "Afspraken", "Communicatie", "Besluiten", "Documenten"], berichten: 2, verzoeken: 1, volgende: "Vandaag 14:30", binnenkort: true, status: "actief" },
    { id: "deboer", gezin: "Familie De Boer", kinderen: ["Lotte – 11 jaar"], ouders: "Eva & Thomas", rol: "Mediator", sinds: "3 juli 2026", toegang: ["Planning", "Communicatie", "Overdracht"], berichten: 1, verzoeken: 0, volgende: "Vandaag 10:00", binnenkort: true, status: "actief" },
    { id: "smit", gezin: "Familie Smit", kinderen: ["Daan – 9 jaar", "Mila – 6 jaar"], ouders: "Iris & Bas", rol: "Mediator", sinds: "22 september 2026", toegang: ["Afspraken", "Documenten", "Kosten"], berichten: 0, verzoeken: 1, nieuw: true, status: "actief" },
    { id: "bakker", gezin: "Familie Bakker de Vries", kinderen: ["Emma – 9 jaar", "Noah – 6 jaar"], ouders: "Sanne & Joris", rol: "Mediator", sinds: "1 maart 2026", toegang: proToegangBakker, berichten: 0, verzoeken: 0, volgende: "Do 2 okt 09:30", status: "actief" },
    { id: "visser", gezin: "Familie Visser", kinderen: ["Tim – 13 jaar"], ouders: "Anouk & Rik", rol: "Mediator", sinds: "10 januari 2026", toegang: [], berichten: 0, verzoeken: 0, status: "afgesloten" },
];
const startAandacht = [
    { id: "at1", dossier: "jansen", tekst: "Er staat een gezamenlijk besluit open waarbij jouw reactie is gevraagd." },
    { id: "at2", dossier: "deboer", tekst: "Een ouder heeft jou genoemd in een bericht." },
    { id: "at3", dossier: "smit", tekst: "Verzoek om toegang tot een document." },
];
/** Waar elk aandachtspunt naartoe leidt — één klik naar de bron. */
const ATTENTIE = {
    at1: { label: "Bekijk besluit", tab: "Afspraken" },
    at2: { label: "Bekijk bericht", tab: "Communicatie" },
    at3: { label: "Bekijk document", tab: "Documenten" },
};
const activiteit = [
    { wanneer: "Vandaag 13:42 uur", dossier: "jansen", tekst: "Nieuwe afspraak voorgesteld" },
    { wanneer: "Vandaag 11:08 uur", dossier: "smit", tekst: "Document gedeeld" },
    { wanneer: "Gisteren 18:20 uur", dossier: "deboer", tekst: "Overdrachtsafspraak gewijzigd" },
    { wanneer: "Gisteren 09:15 uur", dossier: "bakker", tekst: "Afspraak ‘Halen en brengen’ bijgewerkt" },
];
/** Eén agendaBron: alle afspraken van de professional komen hier vandaan. */
const agendaItems = [
    { dag: "Vandaag", tijd: "10:00", dossier: "deboer", soort: "Gesprek met ouders", bereik: "dag" },
    { dag: "Vandaag", tijd: "14:30", dossier: "jansen", soort: "Gezamenlijk gesprek", bereik: "dag" },
    { dag: "Ma 29 sep", tijd: "11:00", dossier: "smit", soort: "Kennismaking", bereik: "week" },
    { dag: "Di 30 sep", tijd: "16:00", dossier: "jansen", soort: "Deadline conceptafspraken", bereik: "week" },
    { dag: "Wo 1 okt", tijd: "13:00", dossier: "deboer", soort: "Evaluatiemoment", bereik: "week" },
    { dag: "Do 2 okt", tijd: "09:30", dossier: "bakker", soort: "Gezamenlijk gesprek", bereik: "week" },
    { dag: "Vr 3 okt", tijd: "15:00", dossier: "smit", soort: "Gesprek met ouders", bereik: "week" },
    { dag: "Di 14 okt", tijd: "10:00", dossier: "jansen", soort: "Evaluatiemoment", bereik: "maand" },
    { dag: "Do 23 okt", tijd: "14:00", dossier: "bakker", soort: "Evaluatiemoment", bereik: "maand" },
];
/** Unavailable until server-authorized measured sources are connected. No fabricated signals. */
const drukData = {};
const startUitnodigingen = [
    { id: "u1", van: "Cato en Tony", gezin: "Familie Willems", kinderen: "Fenna (5)", rol: "Gezinscoach", onderdelen: ["Planning", "Afspraken", "Momentjes"], einde: "31 maart 2027" },
];
const naam = (id) => startDossiers.find((d) => d.id === id)?.gezin ?? id;
const oudersVan = (d) => d.ouders.split(" & ");
/* ---------- tijden ---------- */
const dagLabel = (iso) => {
    const n = dagenTot(iso.slice(0, 10));
    if (n === 0)
        return "Vandaag";
    if (n === 1)
        return "Morgen";
    return new Date(iso).toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" });
};
const tijdVan = (iso) => new Date(iso).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
/* Agenda-notcheringen ("Vandaag", "di 30 sep", "6 oktober") omzetten naar één tijdstip, zodat de lijst echt op datum staat. */
const MAANDEN = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
const VOLLEDIGE_MAANDEN = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];
const WEEKDAGEN = ["zo", "ma", "di", "wo", "do", "vr", "za"];
function datumVan(dag, tijd) {
    const d = dag.toLowerCase().replace(/\./g, "").trim();
    const [uu = 0, mm = 0] = (tijd || "").split(":").map(Number);
    const basis = new Date();
    basis.setHours(uu, mm, 0, 0);
    if (d === "vandaag")
        return basis.getTime();
    if (d === "morgen") {
        basis.setDate(basis.getDate() + 1);
        return basis.getTime();
    }
    if (d === "gisteren") {
        basis.setDate(basis.getDate() - 1);
        return basis.getTime();
    }
    const delen = d.split(" ");
    const dagNr = Number(delen.find((x) => /^\d+$/.test(x)) ?? NaN);
    const inMaand = (lijst) => lijst.findIndex((m) => delen.some((x) => x.startsWith(m)));
    let maandIdx = inMaand(MAANDEN);
    if (maandIdx < 0)
        maandIdx = inMaand(VOLLEDIGE_MAANDEN);
    if (Number.isFinite(dagNr) && maandIdx >= 0) {
        const k = new Date(basis.getFullYear(), maandIdx, dagNr, uu, mm, 0, 0);
        if (k.getTime() < Date.now() - 180 * 86_400_000)
            k.setFullYear(k.getFullYear() + 1);
        return k.getTime();
    }
    const wd = WEEKDAGEN.findIndex((w) => delen.some((x) => x.startsWith(w)));
    if (wd >= 0) {
        const k = new Date(basis);
        k.setDate(k.getDate() + ((wd - k.getDay() + 7) % 7));
        k.setHours(uu, mm, 0, 0);
        return k.getTime();
    }
    return Number.MAX_SAFE_INTEGER;
}
const isoVanWanneer = (w) => {
    const [dagDeel, tijdDeel] = w.split(" ");
    const basis = new Date();
    if (dagDeel === "Gisteren")
        basis.setDate(basis.getDate() - 1);
    const [u = 9, m = 0] = (tijdDeel ?? "09:00").split(":").map(Number);
    basis.setHours(u, m, 0, 0);
    return basis.toISOString();
};
const activiteitWeergave = (iso) => {
    const n = dagenTot(iso.slice(0, 10));
    const tijd = tijdVan(iso);
    if (n === 0)
        return `vandaag ${uur(tijd)}`;
    if (n === 1)
        return `morgen ${uur(tijd)}`;
    if (n === -1)
        return `gisteren ${uur(tijd)}`;
    return datumKort(iso.slice(0, 10));
};
const nieuwsteMoment = (id, werk) => [...werk.log.filter((l) => l.dossier === id).map((l) => l.moment), ...activiteit.filter((a) => a.dossier === id).map((a) => isoVanWanneer(a.wanneer))].sort().at(-1);
const laatsteActiviteit = (id, werk) => {
    const nieuwste = nieuwsteMoment(id, werk);
    return nieuwste ? activiteitWeergave(nieuwste) : "nog geen activiteit";
};
/** Een voorgestelde afspraak is pas definitief als elke benodigde ouder akkoord gaf. */
function overlegStatus(g, d) {
    const ouders = oudersVan(d);
    if (g.nietAkkoord && Object.keys(g.nietAkkoord).length)
        return { klaar: false, tekst: "Geen akkoord van " + Object.keys(g.nietAkkoord).join(" en ") };
    const wachten = ouders.filter((o) => !g.akkoord[o]);
    if (!wachten.length)
        return { klaar: true, tekst: "Definitief" };
    return { klaar: false, tekst: `Wacht op akkoord van ${wachten.join(" en ")}` };
}
const overLeggen = (werk, dossiers) => werk.gezamenlijk.filter((g) => g.ingepland && g.verstuurd).flatMap((g) => {
    const d = dossiers.find((x) => x.id === g.dossier);
    if (!d)
        return [];
    return [{ g, d, status: overlegStatus(g, d) }];
});
/** Afspraken die uit een voorgelegd overleg zijn ontstaan — ze staan al in de agenda, geen tweede record. */
const definitieveOverlegAfspraken = (werk, dossiers) => overLeggen(werk, dossiers).filter((x) => x.status.klaar).map((x) => ({
    dag: dagLabel(x.g.ingepland), tijd: tijdVan(x.g.ingepland), dossier: x.d.id, soort: "Gesprek vastgelegd na akkoord ouders", bron: "overleg",
}));
function signalen(dossiers, werk, aandacht) {
    const lijst = [];
    dossiers.forEach((d) => {
        const r = mijnRechten(d.id, werk);
        if (r.includes("veiligBekijken") || r.includes("veiligBeheren"))
            werk.veilig.filter((v) => v.dossier === d.id && v.status === "actief" && dagenTot(v.evaluatie) <= 7).forEach((v) => lijst.push({ id: `veilig-${v.id}`, dossier: d.id, hoofd: "Veiligheidsafspraak evalueren", detail: `${v.titel} · ${evaluatieTekst(v.evaluatie)}`, label: "Bekijk afspraak", tab: "Veiligheid" }));
        const verlopen = werk.acties.filter((a) => a.dossier === d.id && actieStatus(a) === "Verlopen");
        if (verlopen.length)
            lijst.push({ id: `verlopen-${d.id}`, dossier: d.id, hoofd: `${verlopen.length} ${verlopen.length === 1 ? "actie" : "acties"} verlopen`, detail: verlopen[0].tekst, label: "Bekijk acties", tab: "Acties" });
        if (r.includes("docBekijken")) {
            const docs = werk.log.filter((l) => l.dossier === d.id && l.soort === "documenten" && dagenTot(l.moment.slice(0, 10)) >= -2);
            if (docs.length)
                lijst.push({ id: `doc-${d.id}`, dossier: d.id, hoofd: "Nieuw document ontvangen", detail: `${docs.length} document${docs.length > 1 ? "en" : ""} · ${activiteitWeergave(docs.at(-1).moment)}`, label: "Bekijk document", tab: "Documenten" });
        }
        const druk = r.includes("communicatie") ? drukData[d.id]?.[0] : undefined;
        if (druk && drukNiveau(druk.s) === "hoog")
            lijst.push({ id: `druk-${d.id}`, dossier: d.id, hoofd: "Veel nieuwe berichten", detail: `${druk.s.berichten} berichten · ${druk.s.periode.toLowerCase()}`, label: "Bekijk communicatie", tab: "Communicatie" });
        aandachtVoor(d, aandacht).forEach((a) => {
            const m = ATTENTIE[a.id] ?? { label: "Bekijk dossier" };
            lijst.push({ id: a.id, dossier: d.id, hoofd: a.tekst, detail: naam(d.id), label: m.label, tab: m.tab, afhandelen: [a.id] });
        });
    });
    return lijst;
}
const aandachtVoor = (d, aandacht) => aandacht.filter((a) => a.dossier === d.id);
const niveauLabel = { geen: "Geen toegang", bekijken: "Alleen bekijken", voorstellen: "Voorstellen doen", bijdragen: "Bekijken en bijdragen" };
const niveauStijl = { geen: "bg-muted text-ink-soft", bekijken: "bg-brand-soft text-brand", voorstellen: "bg-accent-soft text-accent-foreground", bijdragen: "bg-brand text-primary-foreground" };
const niveaus = ["geen", "bekijken", "voorstellen", "bijdragen"];
const startToegang = [
    { id: "p1", naam: "Marloes Jansen", rol: "Mediator", organisatie: "Mediationpraktijk Midden", initialen: "MJ", start: "2026-03-01", einde: "2026-12-01", ingetrokken: false,
        rechten: { Planning: "bekijken", Zorgregeling: "bekijken", Communicatie: "geen", Afspraken: "voorstellen", Besluiten: "bekijken", Documenten: "bijdragen", Kosten: "geen", Overdracht: "geen", Gesprekken: "geen", Opnames: "geen", Momentjes: "geen" } },
    { id: "p2", naam: "Ruben Smit", rol: "Gezinscoach", organisatie: "Buurtteam Utrecht", initialen: "RS", start: "2026-10-01", einde: "", ingetrokken: false,
        rechten: { Planning: "bekijken", Zorgregeling: "geen", Communicatie: "geen", Afspraken: "bekijken", Besluiten: "geen", Documenten: "geen", Kosten: "geen", Overdracht: "geen", Gesprekken: "geen", Opnames: "geen", Momentjes: "geen" } },
];
/* ---------- component ---------- */
function Chip({ actief, onClick, children }) {
    return (<button onClick={onClick} className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${actief ? "bg-brand text-primary-foreground" : "border border-border text-ink-soft"}`}>
      {children}
    </button>);
}
function Professionals() {
    const { t } = useTranslation();
    const [kant, setKant] = useState("pro");
    // Dossierlijst leeft hier, zodat een via intake toegevoegd gezin blijft staan bij wisselen naar de toegangsaanvraag (sessie).
    const dossierState = useState(startDossiers);
    if (kant === "pro")
        return <ProCockpit onOuderKant={() => setKant("ouders")} dossierState={dossierState}/>;
    return (<AppShell breed>
      <PageHeader titel="Professionals" subtitel="Jullie bepalen wie wat mag zien"/>
      <div className="mt-4 grid grid-cols-2 gap-1 rounded-md bg-surface p-1">
        <button onClick={() => setKant("pro")} className="rounded-xl py-2 text-xs font-semibold text-ink-soft">Als professional</button>
        <span aria-current="page" className="rounded-xl bg-card py-2 text-center text-xs font-semibold text-ink">Toegang professional</span>
      </div>
      <OuderToegang />
    </AppShell>);
}
const iconen = {
    Overzicht: "M4 5h7v6H4zM13 5h7v4h-7zM13 11h7v8h-7zM4 13h7v6H4z",
    Dossiers: "M4 6a1 1 0 0 1 1-1h4l2 2h8a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z",
    Agenda: "M5 6h14v14H5zM5 10h14M9 4v4M15 4v4",
    Acties: "M5 7l2 2 3-3M5 15l2 2 3-3M13 8h6M13 16h6",
    Berichten: "M5 6h14v10H9l-4 3z",
    Documenten: "M7 4h7l4 4v12H7zM14 4v4h4M10 13h5M10 16h5",
    Organisatie: "M5 20V8l7-4 7 4v12M9 20v-5h6v5M9 10h.01M15 10h.01",
    Instellingen: "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4",
    Profiel: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM5 20a7 7 0 0 1 14 0",
    plus: "M12 5v14M5 12h14",
    menu: "M4 7h16M4 12h16M4 17h16",
    terug: "M14 6l-6 6 6 6",
};
function Icoon({ naam, className = "size-[18px]" }) {
    return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${className}`} aria-hidden>
      <path d={iconen[naam]}/>
    </svg>);
}
const hoofdNav = ["Overzicht", "Dossiers", "Agenda", "Acties", "Berichten", "Documenten"];
const onderNav = ["Organisatie", "Instellingen", "Profiel"];
const navLabel = {
    Overzicht: "Overzicht", Dossiers: "Dossiers", Agenda: "Agenda", Acties: "Acties", Berichten: "Berichten",
    Documenten: "Documenten", Organisatie: "Team / organisatie", Instellingen: "Instellingen", Profiel: "Profiel",
};
function ProCockpit({ onOuderKant, dossierState }) {
    const werk = useProWerk();
    const [nav, setNav] = useState("Overzicht");
    const [menuOpen, setMenuOpen] = useState(false);
    const [intakeOpen, setIntakeOpen] = useState(false);
    const [dossierBron, setDossiers] = dossierState;
    const dossiers = dossierBron.map((d) => werk.pros.some((p) => p.dossier === d.id && p.naam === IK && !p.actief) && !werk.pros.some((p) => p.dossier === d.id && p.naam === IK && p.actief) ? { ...d, status: "afgesloten", toegang: [] } : d);
    const [open, setOpen] = useState(null);
    const [aandacht, setAandacht] = useState(startAandacht);
    const [uitnodigingen, setUitnodigingen] = useState(startUitnodigingen);
    const [dossierFilter, setDossierFilter] = useState("Alle");
    const [tabVerzoek, setTabVerzoek] = useState();
    const [modusVerzoek, setModusVerzoek] = useState();
    const [agendaW, setAgendaW] = useState("Week");
    const openDossier = (id, tab, modus) => {
        setOpen(id);
        setNav("Dossiers");
        setMenuOpen(false);
        setTabVerzoek(tab ? { tab, n: Date.now() } : undefined);
        setModusVerzoek(modus ? { modus, n: Date.now() } : undefined);
        if (typeof window !== "undefined")
            window.scrollTo({ top: 0 });
    };
    const kies = (n) => { setNav(n); setOpen(null); setMenuOpen(false); };
    const huidig = dossiers.find((d) => d.id === open);
    const actieve = dossiers.filter((d) => d.status === "actief");
    const sig = useMemo(() => signalen(actieve, werk, aandacht), [actieve, werk, aandacht]); // eslint-disable-line react-hooks/exhaustive-deps
    const overleg = useMemo(() => overLeggen(werk, actieve), [werk, actieve]); // eslint-disable-line react-hooks/exhaustive-deps
    const accepteer = (id) => {
        const u = uitnodigingen.find((x) => x.id === id);
        if (!u)
            return;
        setDossiers((d) => [...d, { id: "willems", gezin: u.gezin, kinderen: ["Fenna – 5 jaar"], ouders: "Cato & Tony", rol: u.rol, sinds: "25 september 2026", toegang: u.onderdelen, berichten: 0, verzoeken: 0, nieuw: true, status: "actief" }]);
        setUitnodigingen((l) => l.filter((x) => x.id !== id));
    };
    const NavKnop = ({ n }) => {
        const actief = nav === n;
        return (<Button variant="ghost" onClick={() => kies(n)} aria-current={actief ? "page" : undefined} className={`relative flex h-auto min-h-11 w-full justify-start gap-3 whitespace-normal rounded-md px-3 py-2 text-left text-sm transition-colors duration-200 ${actief ? "bg-brand-soft font-semibold text-ink" : "text-ink-soft hover:bg-muted/70 hover:text-ink"}`}>
        {actief && <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-brand" aria-hidden/>}
        <Icoon naam={n} className={`size-[18px] ${actief ? "text-brand" : ""}`}/><span>{navLabel[n]}</span>
      </Button>);
    };
    const navInhoud = (<>
      <nav className="space-y-0.5" aria-label="Hoofdnavigatie">{hoofdNav.map((n) => <NavKnop key={n} n={n}/>)}</nav>
      <div className="mt-auto space-y-0.5 border-t border-border pt-3">
        {onderNav.map((n) => <NavKnop key={n} n={n}/>)}
        <button onClick={onOuderKant} className="mt-2 block w-full px-3 py-1.5 text-left text-[11px] text-ink-soft hover:text-ink">Toegang regelen als ouder</button>
        <Link to="/meer" className="flex items-center gap-1 px-3 py-1.5 text-[11px] text-ink-soft hover:text-ink">
          <ChevronLeft className="size-3.5" />
          <span>Terug naar gezinsapp</span>
        </Link>
      </div>
    </>);
    return (<div className="pro-cockpit min-h-screen w-full bg-background font-body text-ink">
      {/* Mobiel: compacte balk met uitklapbare navigatie */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background px-4 py-3 lg:hidden">
        <button onClick={() => setMenuOpen((m) => !m)} aria-label="Menu" aria-expanded={menuOpen} className="grid size-9 place-items-center rounded-md text-ink-soft hover:bg-muted"><Icoon naam="menu"/></button>
        <div className="min-w-0"><AppLogo className="w-40"/><span className="block text-center text-xs text-ink-soft">Professional</span></div>
        <span className="max-w-24 text-right text-xs text-ink-soft">{navLabel[nav]}</span>
      </header>
      {menuOpen && (<div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-label="Navigatie">
          <button className="absolute inset-0 bg-ink/30" aria-label="Sluit menu" onClick={() => setMenuOpen(false)}/>
          <div className="relative flex h-full w-64 flex-col bg-background p-4">{navInhoud}</div>
        </div>)}

      <div className="lg:grid lg:grid-cols-[212px_minmax(0,1fr)]">
        <aside className="sticky top-0 hidden h-screen flex-col border-r border-border px-3 py-5 lg:flex">
          <div className="mb-6 px-3">
            <AppLogo className="w-full"/>
            <p className="mt-2 text-sm text-ink-soft">Professional</p>
          </div>
          {navInhoud}
        </aside>

        <div className="mx-auto w-full max-w-[1240px] px-4 py-5 sm:px-6 lg:px-10 lg:py-8">
          <div className={intakeOpen ? "hidden" : nav === "Overzicht" ? "relative z-10 float-right ml-3" : "mb-4 flex justify-end"}>
            <ProToevoegen dossiers={actieve} huidig={huidig} werk={werk} onNieuw={() => { setIntakeOpen(true); if (typeof window !== "undefined")
        window.scrollTo({ top: 0 }); }} onKies={(id, m) => openDossier(id, tabVoorModus[m], m)}/>
          </div>
          <div className={intakeOpen ? "hidden" : huidig || nav === "Overzicht" ? "" : "xl:grid xl:grid-cols-[minmax(0,1fr)_280px] xl:gap-8"}>
            <main className="min-w-0">
              {nav !== "Overzicht" && !(nav === "Dossiers" && huidig) && (<button onClick={() => { kies("Overzicht"); if (typeof window !== "undefined")
            window.scrollTo({ top: 0 }); }} className="mb-3 inline-flex min-h-[44px] items-center gap-1.5 rounded-md text-sm font-medium text-ink-soft transition-colors hover:text-ink">
                  <Icoon naam="terug" className="size-4"/>Overzicht
                </button>)}
              {nav === "Overzicht" && (<Dashboard dossiers={actieve} signalen={sig} overleg={overleg} filter={dossierFilter} setFilter={setDossierFilter} onOpen={openDossier} onAfgehandeld={(id) => setAandacht((a) => a.filter((x) => x.id !== id))} naar={kies} naarAgendaDag={() => { setAgendaW("Dag"); kies("Agenda"); }}/>)}
              {nav === "Dossiers" && !huidig && (<DossierLijst dossiers={dossiers} uitnodigingen={uitnodigingen} signalen={sig} filter={dossierFilter} setFilter={setDossierFilter} onOpen={(id) => openDossier(id)} onAccepteer={accepteer} onWeiger={(id) => setUitnodigingen((l) => l.filter((x) => x.id !== id))}/>)}
              {nav === "Dossiers" && huidig && (<>
                  <DossierWerkruimte key={huidig.id} dossier={huidig} druk={drukData[huidig.id] ?? []} tabVerzoek={tabVerzoek} modusVerzoek={modusVerzoek} context={<Zijpaneel dossiers={actieve} aandacht={aandacht} onOpen={openDossier} huidig={huidig.id}/>} afspraken={agendaItems.filter((a) => a.dossier === huidig.id)} onTerug={() => setOpen(null)} onBeeindig={() => { setDossiers((d) => d.map((x) => (x.id === huidig.id ? { ...x, status: "afgesloten", toegang: [] } : x))); setOpen(null); }}/>
                </>)}
              {nav === "Agenda" && <Agenda dossiers={actieve} w={agendaW} setW={setAgendaW} overleg={overleg} onOpen={openDossier}/>}
              {nav === "Berichten" && <ProBerichten dossiers={actieve} onOpen={openDossier}/>}
              {nav === "Acties" && <Acties dossiers={actieve} onOpen={openDossier}/>}
              {nav === "Documenten" && <ProDocumenten dossiers={actieve} onOpen={openDossier}/>}
              {nav === "Organisatie" && <Organisatie />}
              {nav === "Instellingen" && <Meldingen />}
              {nav === "Profiel" && <Profiel />}
            </main>

            <aside className={`${huidig || nav === "Overzicht" ? "hidden" : ""} mt-10 border-t border-border pt-6 xl:mt-0 xl:border-t-0 xl:border-l xl:pl-8 xl:pt-0`} aria-label="Context">
              {huidig && nav === "Dossiers"
            ? <Zijpaneel dossiers={actieve} aandacht={aandacht} onOpen={openDossier} huidig={huidig.id}/>
            : <ContextKolom dossiers={actieve} werk={werk} onOpen={openDossier}/>}
            </aside>
          </div>
          <GezinIntake open={intakeOpen} onSluit={() => setIntakeOpen(false)} dossiers={dossiers} onNieuwGezin={(g) => { const id = `intake-${Date.now()}`; setDossiers((l) => [...l, { id, gezin: g.gezin, kinderen: g.kinderen, ouders: g.ouders, rol: "", sinds: new Date().toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" }), toegang: [], berichten: 0, verzoeken: 0, nieuw: true, status: "actief" }]); return id; }} onOpen={(id) => { setIntakeOpen(false); openDossier(id, "Dossiergegevens"); }} onToegang={() => { setIntakeOpen(false); onOuderKant(); }}/>
          <p className="mt-10 text-[11px] text-ink-soft">Voorbeeldomgeving · geen beveiligd cliëntdossier. Online accounts en toegangscontrole zijn nog niet aangesloten. Interne notities blijven buiten de ouderweergave.</p>
        </div>
      </div>
    </div>);
}
const OPTIE = {
    afspraak: { titel: "Afspraak plannen", uitleg: "Voorstel naar ouders; definitief zodra iedereen akkoord is", functie: "agenda", modus: "afspraak" },
    actie: { titel: "Actie toevoegen", uitleg: "Concrete opdracht voor jou of voor ouders", functie: "taken", modus: "actie" },
    bericht: { titel: "Bericht aan ouders", uitleg: "Één tekst, voor één of beide ouders", functie: "berichten", modus: "bericht" },
    document: { titel: "Document toevoegen", uitleg: "Uploaden binnen je rechten", functie: "documenten", modus: "document" },
    journaal: { titel: "Contactjournaal", uitleg: "Contactmoment vastleggen, met keuze wie het ziet", functie: "logboek", modus: "journaal" },
    notitie: { titel: "Interne notitie", uitleg: "Privé voor jou, nooit zichtbaar voor ouders", functie: "slot", modus: "notitie" },
    vastleggen: { titel: "Afspraak vastleggen", uitleg: "Wat is er afgesproken, met evaluatiedatum", functie: "afspraak", modus: "gezamenlijk" },
    veilig: { titel: "Veiligheidsafspraak", uitleg: "Met evaluatiedatum en zichtbaarheid", functie: "veiligheid", modus: "veilig" },
};
function optiesVoor(d, werk) {
    if (!d)
        return [OPTIE.afspraak, OPTIE.actie, OPTIE.bericht, OPTIE.document, OPTIE.vastleggen];
    const r = mijnRechten(d.id, werk);
    return [
        ...(r.includes("agenda") ? [OPTIE.afspraak] : []),
        ...(r.includes("acties") ? [OPTIE.actie] : []),
        ...(r.includes("berichten") ? [OPTIE.bericht] : []),
        ...(r.includes("docToevoegen") ? [OPTIE.document] : []),
        ...(r.includes("journaal") ? [OPTIE.journaal] : []),
        OPTIE.notitie,
        ...(r.includes("berichten") ? [OPTIE.vastleggen] : []),
        ...(r.includes("veiligBeheren") ? [OPTIE.veilig] : []),
    ];
}
function ProToevoegen({ dossiers, huidig, werk, onKies, onNieuw }) {
    const [open, setOpen] = useState(false);
    const [gezin, setGezin] = useState(huidig?.id ?? null);
    const [wacht, setWacht] = useState(null);
    const gekozen = dossiers.find((d) => d.id === gezin);
    const opties = optiesVoor(gekozen, werk);
    const kiesModus = (m) => {
        if (gezin) {
            setOpen(false);
            onKies(gezin, m);
            return;
        }
        setWacht(m);
    };
    return (<Sheet open={open} onOpenChange={(o) => { setOpen(o); if (o) {
        setGezin(huidig?.id ?? null);
        setWacht(null);
    } }}>
      <SheetTrigger asChild>
        <Button type="button" variant="outline" size="icon" aria-label="Toevoegen" title="Toevoegen" className="rounded-full border-brand/40 bg-background text-brand hover:bg-brand-soft hover:text-brand">
          <Icoon naam="plus"/>
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="inset-x-0 mx-auto w-full max-w-md pro-cockpit rounded-t-2xl border-border bg-background px-5 pb-8 pt-4">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border"/>
        <SheetHeader className="pr-8 text-left">
          <SheetTitle className="font-display text-xl font-medium text-ink">{wacht ? "Voor welk gezin?" : "Wat wil je toevoegen?"}</SheetTitle>
          <SheetDescription className="sr-only">Kies wat je wilt toevoegen en voor welk gezin.</SheetDescription>
        </SheetHeader>
        {gekozen && !wacht ? (<p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-ink-soft">
            Voor: <span className="font-semibold text-ink">{gekozen.gezin}</span>
            <button onClick={() => setGezin(null)} className="font-semibold text-brand hover:underline">ander gezin</button>
          </p>) : null}
        <div className="mt-3 space-y-0.5">
          {!wacht && <Button type="button" variant="ghost" onClick={() => { setOpen(false); onNieuw(); }} className="h-auto w-full justify-start whitespace-normal px-0 py-3"><AppIcon functie="kinderen" maat="lg"/><span className="text-left"><span className="block font-semibold">Nieuw gezin aanmelden</span><span className="block text-xs font-normal text-ink-soft">Intake voorbereiden · voorbeeldflow</span></span></Button>}
          {wacht ? dossiers.map((d) => (<Button key={d.id} type="button" variant="ghost" onClick={() => { setOpen(false); onKies(d.id, wacht); }} className="h-auto w-full justify-start whitespace-normal rounded-none px-0 py-3 text-left hover:bg-transparent">
              <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-ink">{d.gezin}</span></span>
              <ChevronRight className="size-5 shrink-0 text-ink-soft" />
            </Button>)) : opties.map((o) => (<Button key={o.modus} type="button" variant="ghost" onClick={() => kiesModus(o.modus)} className="h-auto w-full justify-start whitespace-normal rounded-none px-0 py-3.5 text-left hover:bg-transparent">
              <AppIcon functie={o.functie} maat="lg"/>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-ink">{o.titel}</span>
                <span className="mt-0.5 block text-xs font-normal leading-relaxed text-ink-soft">{o.uitleg}</span>
              </span>
              <ChevronRight className="size-5 shrink-0 text-ink-soft" />
            </Button>))}
        </div>
      </SheetContent>
    </Sheet>);
}
/** Rechterkolom buiten een dossier: wat er vastgelegd is, geen tweede werklijst. */
function ContextKolom({ dossiers, werk, onOpen }) {
    const recent = recenteProGebeurtenissen(werk.log, dossiers.map((d) => d.id));
    const bronTab = { contact: "Contactjournaal", communicatie: "Communicatie", afspraken: "Tijdlijn", wijzigingen: "Tijdlijn", documenten: "Documenten", veiligheid: "Veiligheid" };
    return (<div className="space-y-6 xl:sticky xl:top-8">
      <section>
        <h2 className={kopStijl}>Recent vastgelegd</h2>
        <div className="mt-2 divide-y divide-border border-y border-border">
          {recent.map((l) => (<Button key={l.id} variant="ghost" onClick={() => onOpen(l.dossier, bronTab[l.soort])} className="h-auto w-full justify-start whitespace-normal rounded-none px-0 py-2 text-left">
              <span className="min-w-0 flex-1"><span className="block text-xs font-normal text-ink-soft">{datumKort(l.moment.slice(0, 10))} · {dossiers.find((d) => d.id === l.dossier)?.gezin}</span><span className="block text-sm font-normal">{l.tekst}</span></span><span className="inline-flex items-center gap-1 shrink-0 text-xs text-brand"><span>Bekijk bron</span><ChevronRight className="size-3.5" /></span>
            </Button>))}
          {recent.length === 0 && <p className="py-2.5 text-xs text-ink-soft">Nog niets vastgelegd.</p>}
        </div>
      </section>
    </div>);
}
/** Sinds je laatste bezoek: alleen feitelijke wijzigingen binnen jouw rechten, elk punt opent de bron. */
function nieuwsSinds(id, werk) {
    const vorige = werk.journaal.filter((j) => j.dossier === id && ["Gesprek", "Videogesprek", "Overleg", "Huisbezoek"].includes(j.type)).sort((a, b) => b.moment.localeCompare(a.moment))[0];
    const sinds = werk.log.filter((l) => l.dossier === id && (!vorige || l.moment > vorige.moment));
    return { vorige, sinds };
}
function SindsLaatsteBezoek({ dossier, onBron }) {
    const werk = useProWerk();
    const r = mijnRechten(dossier.id, werk);
    const { vorige, sinds } = nieuwsSinds(dossier.id, werk);
    const tel = (s) => sinds.filter((l) => l.soort === s).length;
    const punten = [];
    if (tel("wijzigingen"))
        punten.push({ tekst: `${tel("wijzigingen")} ${tel("wijzigingen") === 1 ? "wijziging" : "wijzigingen"} vastgelegd`, tab: "Tijdlijn" });
    if (tel("afspraken"))
        punten.push({ tekst: `${tel("afspraken")} ${tel("afspraken") === 1 ? "registratie" : "registraties"} rond afspraken en acties`, tab: "Tijdlijn" });
    if (tel("documenten") && r.includes("docBekijken"))
        punten.push({ tekst: `${tel("documenten")} nieuw document`, tab: "Documenten" });
    if (tel("communicatie") && (r.includes("communicatie") || r.includes("berichten")))
        punten.push({ tekst: `${tel("communicatie")} berichtregistraties`, tab: "Communicatie" });
    if (tel("veiligheid") && (r.includes("veiligBekijken") || r.includes("veiligBeheren")))
        punten.push({ tekst: `${tel("veiligheid")} registratie veiligheidsafspraken`, tab: "Veiligheid" });
    const Bron = ({ tab, children }) => (<button onClick={() => onBron(tab)} className="group flex w-full items-baseline justify-between gap-3 py-1.5 text-left text-sm">
      <span>{children}</span><span className="inline-flex items-center gap-1 shrink-0 text-[11px] text-ink-soft group-hover:text-brand"><span>Bekijk bron</span><ChevronRight className="size-3" /></span>
    </button>);
    return (<div className="border-t border-border pt-3">
      <h2 className={kopStijl}>Sinds je laatste bezoek</h2>
      <p className="mt-1 text-[11px] text-ink-soft">Laatst geregistreerd gesprek: {vorige ? datumKort(vorige.moment) : "geen gesprek in het contactjournaal"}</p>
      <div className="mt-1 divide-y divide-border">
        {punten.slice(0, 4).map((p) => <Bron key={p.tekst} tab={p.tab}>{p.tekst}</Bron>)}
        {punten.length === 0 && <p className="py-1.5 text-sm text-ink-soft">Geen nieuwe registraties sinds het vorige gesprek.</p>}
      </div>
      <p className="mt-1 text-[11px] text-ink-soft">Alleen geregistreerde gegevens binnen jouw rechten. Er worden geen conclusies getrokken.</p>
    </div>);
}
function ProDocumenten({ dossiers, onOpen }) {
    const werk = useProWerk();
    const met = dossiers.filter((d) => mijnRechten(d.id, werk).includes("docBekijken"));
    return (<>
      <h1 className="font-display text-2xl">Documenten</h1>
      <p className="mt-1 text-xs text-ink-soft">Alleen dossiers waarin ouders jou documenten laten bekijken.</p>
      <div className={`${regelsStijl} mt-5`}>
        {met.map((d) => {
            const n = werk.log.filter((l) => l.dossier === d.id && l.soort === "documenten").length;
            return (<button key={d.id} onClick={() => onOpen(d.id, "Documenten")} className="flex w-full items-center justify-between gap-3 px-2 py-3 text-left transition-colors duration-200 hover:bg-muted/50">
              <span className="text-sm font-semibold">{d.gezin}</span>
              <span className="inline-flex items-center gap-1 text-xs text-ink-soft">
                <span>{n ? `${n} recent toegevoegd` : "Geen nieuwe documenten"}</span>
                <ChevronRight className="size-3.5" />
              </span>
            </button>);
        })}
        {met.length === 0 && <p className="py-3 text-sm text-ink-soft">Geen dossiers met documenttoegang.</p>}
      </div>
    </>);
}
function Organisatie() {
    const werk = useProWerk();
    const collegas = werk.pros.filter((p) => p.organisatieId === "org-midden");
    return (<>
      <h1 className="font-display text-2xl">Team / organisatie</h1>
      <p className="mt-1 text-xs text-ink-soft">Mediationpraktijk Midden</p>
      <h2 className={`${kopStijl} mt-6`}>Dossiers binnen de organisatie</h2>
      <div className={regelsStijl}>
        {collegas.map((p) => (<div key={p.id} className="flex justify-between gap-3 py-2.5 text-sm">
            <span>{p.naam} · {p.rol}</span><span className="text-xs text-ink-soft">{naam(p.dossier)}{p.actief ? "" : " · beëindigd"}</span>
          </div>))}
      </div>
      <p className="mt-3 text-[11px] text-ink-soft">Toegang blijft per dossier door ouders geregeld; de organisatie geeft geen extra rechten.</p>
    </>);
}
function SectieTitel({ children, extra }) {
    return (<div className="mt-6 mb-2 flex items-end justify-between">
      <h2 className="font-display text-lg font-bold">{children}</h2>
      {extra}
    </div>);
}
const dossierFilters = ["Alle", "Actie voor mij", "Recent", "Afspraak deze week"];
const kopStijl = "pro-section-title";
const regelsStijl = "mt-2 divide-y divide-border border-y border-border";
const kinderenKop = (kinderen) => kinderen.map((k) => k.replace(" – ", " (").replace(" jaar", ")")).join(" · ");
function begroeting() {
    const u = new Date().getHours();
    return `${u < 12 ? "Goedemorgen" : u < 18 ? "Goedemiddag" : "Goedenavond"}, ${IK}`;
}
function Dashboard({ dossiers, setFilter, onOpen, naar, naarAgendaDag }) {
    const werk = useProWerk();
    const openActies = werk.acties.filter((a) => !a.klaar && eigenActie(a) && dossiers.some((d) => d.id === a.dossier));
    const nu = new Date();
    const zelfdeDag = (ts) => { const x = new Date(ts); return x.getFullYear() === nu.getFullYear() && x.getMonth() === nu.getMonth() && x.getDate() === nu.getDate(); };
    const vandaag = [
        ...agendaItems.map((a) => ({ ts: datumVan(a.dag, a.tijd), tijd: a.tijd, dossier: a.dossier, soort: a.soort })),
        ...definitieveOverlegAfspraken(werk, dossiers).map((a) => ({ ts: datumVan(a.dag, a.tijd), tijd: a.tijd, dossier: a.dossier, soort: a.soort })),
    ].filter((a) => dossiers.some((d) => d.id === a.dossier) && zelfdeDag(a.ts)).sort((a, b) => a.ts - b.ts);
    const eerstvolgende = vandaag.find((a) => a.ts >= nu.getTime()) ?? vandaag[0];
    // Geen beveiligde communicatiebron: geen signalen, geen tellingen, geen risico-inschatting.
    const gezinnen = dossiers.filter((d) => mijnRechten(d.id, werk).length > 0).slice(0, 3);
    const datum = nu.toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" });
    const tellers = [
        { aantal: String(dossiers.length), label: "Actieve gezinnen", kleur: "text-brand", onClick: () => { setFilter("Alle"); naar("Dossiers"); } },
        { aantal: "—", label: "Vraagt aandacht", kleur: "text-accent-warm", sub: "Nog geen gegevens" },
        { aantal: "—", label: "AI-interventies", kleur: "text-oker", sub: "Nog geen gegevens" },
    ];
    return (<div className="clear-none space-y-8">
      <header>
        <div className="pr-14">
          <h1 className="font-display text-2xl leading-tight">{begroeting()}</h1>
          <p className="mt-1 text-sm text-ink-soft first-letter:uppercase">{datum} · voorbeeldomgeving</p>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2" aria-label="Overzicht">
          {tellers.map((t) => {
            const inhoud = <><span className={`block font-display text-3xl font-bold tabular-nums leading-none ${t.kleur}`}>{t.aantal}</span><span className="mt-1.5 block text-xs text-ink-soft">{t.label}</span>{t.sub ? <span className="block text-[11px] text-ink-soft">{t.sub}</span> : null}</>;
            return t.onClick
                ? <button key={t.label} onClick={t.onClick} className="rounded-lg border border-border px-3 py-3 text-left transition-colors hover:bg-brand-soft">{inhoud}</button>
                : <div key={t.label} className="rounded-lg border border-border px-3 py-3" aria-label={`${t.label}: nog geen gegevens`}>{inhoud}</div>;
        })}
        </div>
      </header>

      <section aria-labelledby="aandacht-kop">
        <h2 id="aandacht-kop" className="font-display text-xl">Welke gezinnen vragen aandacht?</h2>
        <p className="mt-1 text-xs text-ink-soft">Communicatiesignalen komen pas beschikbaar met toestemming van beide ouders. Ontbrekende gegevens betekenen geen risico.</p>
        <div className="mt-3 divide-y divide-border border-y border-border">
          {gezinnen.map((d) => (<button key={d.id} onClick={() => onOpen(d.id, "Overzicht")} className="flex w-full items-center gap-3 px-1 py-3 text-left transition-colors hover:bg-muted/40">
              <span aria-hidden className="size-2.5 shrink-0 rounded-full bg-ink-soft/40"/>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{d.gezin}</span>
                <span className="block text-xs text-ink-soft">Nog geen gegevens · berichten en AI-interventies: —</span>
              </span>
              <span className="inline-flex items-center gap-1 shrink-0 text-sm text-brand">
                <span>Bekijk gezin</span>
                <ChevronRight className="size-4" />
              </span>
            </button>))}
          {gezinnen.length === 0 && <p className="py-3 text-sm text-ink-soft">Nog geen gezinnen met toegang.</p>}
        </div>
        <button onClick={() => naar("Dossiers")} className="mt-2 inline-flex items-center gap-1 text-sm text-brand hover:underline">
          <span>Bekijk alle gezinnen</span>
          <ChevronRight className="size-4" />
        </button>
      </section>

      <section aria-labelledby="werk-kop">
        <h2 id="werk-kop" className="font-display text-xl">Mijn werk vandaag</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <button onClick={naarAgendaDag} className="flex items-center gap-3 rounded-lg border border-border px-3 py-3 text-left transition-colors hover:bg-brand-soft">
            <AppIcon functie="agenda" maat="sm"/>
            <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">Mijn afspraken · {vandaag.length}</span><span className="block text-xs text-ink-soft">{eerstvolgende ? `Eerstvolgende: ${eerstvolgende.tijd ? uur(eerstvolgende.tijd) + " · " : ""}${eerstvolgende.soort}` : "Geen afspraken vandaag"}</span></span>
            <ChevronRight className="size-5 shrink-0 text-ink-soft" />
          </button>
          <button onClick={() => naar("Acties")} className="flex items-center gap-3 rounded-lg border border-border px-3 py-3 text-left transition-colors hover:bg-brand-soft">
            <AppIcon functie="taken" maat="sm"/>
            <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">Mijn acties · {openActies.length}</span><span className="block text-xs text-ink-soft">{openActies.length === 1 ? "1 openstaande actie" : `${openActies.length} openstaande acties`}</span></span>
            <ChevronRight className="size-5 shrink-0 text-ink-soft" />
          </button>
        </div>
      </section>
    </div>);
}
/** Compacte weekagenda op het overzicht: leest dezelfde agendabron als de volledige Agenda. */
function WeekAgenda({ dossiers, onOpen, naarAgenda }) {
    const werk = useProWerk();
    const nu = new Date();
    nu.setHours(0, 0, 0, 0);
    const [gekozen, setGekozen] = useState(nu.getTime());
    const g = new Date(gekozen);
    const maandag = new Date(g);
    maandag.setDate(g.getDate() - ((g.getDay() + 6) % 7));
    const dagen = Array.from({ length: 7 }, (_, i) => { const x = new Date(maandag); x.setDate(maandag.getDate() + i); return x; });
    const zelfdeDag = (ts, d) => { const x = new Date(ts); return x.getFullYear() === d.getFullYear() && x.getMonth() === d.getMonth() && x.getDate() === d.getDate(); };
    const alle = [
        ...agendaItems.map((a) => ({ ts: datumVan(a.dag, a.tijd), tijd: a.tijd, dossier: a.dossier, soort: a.soort })),
        ...definitieveOverlegAfspraken(werk, dossiers).map((a) => ({ ts: datumVan(a.dag, a.tijd), tijd: a.tijd, dossier: a.dossier, soort: a.soort })),
    ].filter((a) => dossiers.some((d) => d.id === a.dossier));
    const vandaagLijst = alle.filter((a) => zelfdeDag(a.ts, g)).sort((a, b) => a.ts - b.ts);
    const schuif = (n) => { const x = new Date(gekozen); x.setDate(x.getDate() + n); setGekozen(x.getTime()); };
    const titel = zelfdeDag(nu.getTime(), g) ? "Vandaag" : g.toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" });
    return (<section aria-label="Mijn agenda">
      <div className="grid grid-cols-[minmax(0,1fr)_max-content] items-center gap-2 sm:flex sm:justify-between">
        <h2 className="min-w-0 font-display text-xl">Mijn agenda</h2>
        <Button variant="ghost" onClick={naarAgenda} className="h-auto shrink-0 px-0 py-1 text-xs font-normal text-brand flex items-center gap-1"><span>Volledig overzicht</span><ChevronRight className="size-3.5" /></Button>
      </div>
      <div className="mt-1 flex items-center justify-between text-ink-soft">
        <Button variant="ghost" size="icon" onClick={() => schuif(-7)} aria-label="Vorige week" className="size-11"><ChevronLeft className="size-5" /></Button>
        <span className="text-xs">{maandag.toLocaleDateString("nl-NL", { day: "numeric", month: "long" })} – {dagen.at(-1)?.toLocaleDateString("nl-NL", { day: "numeric", month: "long" })}</span>
        <Button variant="ghost" size="icon" onClick={() => schuif(7)} aria-label="Volgende week" className="size-11"><ChevronRight className="size-5" /></Button>
      </div>
      <div className="mt-2 grid grid-cols-7 gap-1" role="tablist" aria-label="Kies een dag">
        {dagen.map((d) => {
            const actief = zelfdeDag(gekozen, d);
            const heeft = alle.some((a) => zelfdeDag(a.ts, d));
            return (<Button variant="ghost" key={d.getTime()} role="tab" aria-selected={actief} aria-label={d.toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" })} onClick={() => setGekozen(d.getTime())} className={`h-auto w-full max-w-12 min-w-0 justify-self-center flex-col items-center gap-0 rounded-md px-0 py-1 text-[11px] transition-colors ${actief ? "bg-brand text-primary-foreground hover:bg-brand hover:text-primary-foreground" : zelfdeDag(nu.getTime(), d) ? "bg-brand-soft text-ink" : "text-ink-soft hover:bg-muted"}`}>
              <span>{d.toLocaleDateString("nl-NL", { weekday: "short" }).replace(".", "")}</span>
              <span className="text-sm font-semibold tabular-nums leading-tight">{d.getDate()}</span>
              <span className={`mt-0.5 size-1 rounded-full ${heeft ? (actief ? "bg-primary-foreground" : "bg-brand") : "bg-transparent"}`} aria-hidden/>
            </Button>);
        })}
      </div>
      <p className={`${kopStijl} sr-only mt-3 first-letter:uppercase`}>{titel}</p>
      <div className="mt-2">
        {vandaagLijst.map((a) => (<Button variant="ghost" key={a.ts + a.dossier + a.soort} onClick={() => onOpen(a.dossier, "Afspraken")} className="grid h-auto w-full grid-cols-[80px_minmax(0,1fr)_auto] items-center gap-3 whitespace-normal rounded-none px-0 py-1.5 text-left font-normal hover:bg-muted/40">
            <span className="text-xs font-semibold tabular-nums text-ink-soft">{a.tijd ? uur(a.tijd) : "—"}</span>
            <span className="min-w-0"><span className="block text-sm font-semibold">{a.soort}</span><span className="block text-[11px] text-ink-soft">{naam(a.dossier)}</span></span>
            <ChevronRight className="size-4 text-ink-soft shrink-0" />
          </Button>))}
        {vandaagLijst.length === 0 && <p className="px-2 py-2 text-sm text-ink-soft">Geen afspraken gepland</p>}
      </div>
    </section>);
}
/* ---------- acties ---------- */
function ActieRegel({ a, onOpen }) {
    const status = actieStatus(a);
    return (<div className="flex items-start gap-3 px-2 py-3 transition-colors duration-200 hover:bg-muted/40">
      <button onClick={() => toggleActie(a.id)} aria-label={`${a.tekst} afvinken`} className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border text-[11px] ${a.klaar ? "border-brand bg-brand text-primary-foreground" : "border-border"}`}>
        {a.klaar ? "✓" : ""}
      </button>
      <button onClick={() => onOpen(a.dossier, "Acties")} className="min-w-0 flex-1 text-left">
        <span className={`block text-sm ${a.klaar ? "text-ink-soft line-through" : ""}`}>{a.tekst}</span>
        <span className={`text-[11px] ${status === "Verlopen" ? "text-accent-warm" : "text-ink-soft"}`}>{naam(a.dossier)} · {a.voor}{a.deadline ? ` · ${status === "Verlopen" ? "verlopen" : "vóór"} ${datumKort(a.deadline)}` : ""}</span>
      </button>
    </div>);
}
function Acties({ dossiers, onOpen }) {
    const werk = useProWerk();
    const [f, setF] = useState("Vandaag");
    const groep = (a) => { const n = a.deadline ? dagenTot(a.deadline) : 8; return n <= 0 ? "Vandaag" : n === 1 ? "Morgen" : "Deze week"; };
    const vanMij = werk.acties.filter((a) => eigenActie(a) && dossiers.some((d) => d.id === a.dossier));
    const lijst = f === "Afgerond" ? vanMij.filter((a) => a.klaar) : vanMij.filter((a) => !a.klaar && (f === "Alles" || groep(a) === f));
    return (<>
      <SectieTitel>Mijn acties</SectieTitel>
      <p className="-mt-1 mb-2 text-[11px] text-ink-soft">Wat jij zelf moet doen. Afvinken is hier je eigen registratie; ouders zien alleen wat voor hen bedoeld is.</p>
      <div className="flex flex-wrap gap-2 pb-1">
        {["Vandaag", "Morgen", "Deze week", "Alles", "Afgerond"].map((x) => <Chip key={x} actief={f === x} onClick={() => setF(x)}>{x}</Chip>)}
      </div>
      <div className={`${regelsStijl}`}>
        {lijst.map((a) => <ActieRegel key={a.id} a={a} onOpen={onOpen}/>)}
        {lijst.length === 0 && <p className="px-2 py-3 text-sm text-ink-soft">Niets in deze lijst.</p>}
      </div>
    </>);
}
function Zijpaneel({ dossiers, aandacht, onOpen, huidig }) {
    const werk = useProWerk();
    const lijst = huidig ? dossiers.filter((d) => d.id === huidig) : dossiers;
    const acties = werk.acties.filter((a) => !a.klaar && lijst.some((d) => d.id === a.dossier));
    const volgende = agendaItems.find((a) => lijst.some((d) => d.id === a.dossier));
    const overleg = werk.gezamenlijk.filter((g) => g.ingepland && g.verstuurd && lijst.some((d) => d.id === g.dossier));
    return (<div className="pro-dossier-context mt-4 grid gap-4 border-y border-border py-4 sm:grid-cols-2 lg:grid-cols-3">
      <section>
        <h2 className={kopStijl}>Komende afspraak</h2>
        {volgende ? <button onClick={() => onOpen(volgende.dossier, "Afspraken")} className="mt-2 block text-left text-sm">{volgende.dag} {uur(volgende.tijd)}<span className="block text-xs text-ink-soft">{volgende.soort}{!huidig ? ` · ${naam(volgende.dossier)}` : ""}</span></button> : <p className="mt-2 text-xs text-ink-soft">Niets gepland.</p>}
      </section>
      <section>
        <h2 className={kopStijl}>Open acties</h2>
        {acties.length ? acties.slice(0, 3).map((a) => (<button key={a.id} onClick={() => onOpen(a.dossier, "Acties")} className="mt-2 block w-full text-left">
            <span className="block text-sm">{a.tekst}</span>
            <span className={`text-[11px] ${actieStatus(a) === "Verlopen" ? "text-accent-warm" : "text-ink-soft"}`}>{!huidig ? `${naam(a.dossier)} · ` : ""}{actieStatus(a)}{a.deadline ? ` · ${datumKort(a.deadline)}` : ""}</span>
          </button>)) : <p className="mt-2 text-xs text-ink-soft">Geen open acties.</p>}
      </section>
      {overleg.length ? (<section>
          <h2 className={kopStijl}>In afstemming</h2>
          {overleg.map((g) => {
                const d = lijst.find((x) => x.id === g.dossier);
                const s = overlegStatus(g, d);
                return (<button key={g.id} onClick={() => onOpen(g.dossier, "Afspraken")} className="mt-2 block w-full text-left">
                <span className="block text-sm">{g.tekst}</span>
                <span className="text-[11px] text-ink-soft">{s.tekst}</span>
              </button>);
            })}
        </section>) : null}
      {huidig && lijst[0] ? <div className="sm:col-span-2 lg:col-span-3"><SindsLaatsteBezoek dossier={lijst[0]} onBron={(t) => onOpen(huidig, t)}/></div> : null}
    </div>);
}
function DossierKaart({ d, werk, signaal, onOpen }) {
    const voorMij = werk.acties.filter((a) => a.dossier === d.id && !a.klaar && eigenActie(a)).length;
    const week = agendaItems.filter((a) => a.dossier === d.id && a.bereik !== "maand").length;
    return (<OverzichtKaart onClick={() => onOpen(d.id)} titel={d.gezin} sub={kinderenKop(d.kinderen)} rechts={d.nieuw ? <Badge toon="actie">Nieuw</Badge> : null} badges={<>
        {voorMij > 0 && <Badge toon="actie"><AppIcon functie="actie" maat="sm" vorm="kaal"/> {voorMij} {voorMij === 1 ? "actie" : "acties"} voor jou</Badge>}
        {week > 0 && <Badge toon="info"><AppIcon functie="agenda" maat="sm" vorm="kaal"/> {week} {week === 1 ? "afspraak" : "afspraken"} deze week</Badge>}
        {signaal && <Badge>{signaal.hoofd}</Badge>}
      </>}>
      <p className="mt-2 text-[11px] text-ink-soft">Laatste activiteit: {laatsteActiviteit(d.id, werk)}</p>
      <p className="text-[11px] text-ink-soft">Rol: {d.rol} · Betrokken sinds {d.sinds}</p>
    </OverzichtKaart>);
}
function DossierLijst({ dossiers, uitnodigingen, signalen, filter, setFilter, onOpen, onAccepteer, onWeiger }) {
    const werk = useProWerk();
    const [sub, setSub] = useState("Actief");
    const [zoek, setZoek] = useState("");
    const metAandacht = new Set(signalen.map((s) => s.dossier));
    const recent = new Set(dossiers.filter((d) => {
        const nieuwste = [...werk.log.filter((l) => l.dossier === d.id).map((l) => l.moment), ...activiteit.filter((a) => a.dossier === d.id).map((a) => isoVanWanneer(a.wanneer))].sort().at(-1);
        return !!nieuwste && Date.now() - Date.parse(nieuwste) < 3 * 86_400_000;
    }).map((d) => d.id));
    const actief = dossiers.filter((d) => d.status === "actief").filter((d) => {
        if (zoek && !`${d.gezin} ${d.kinderen.join(" ")} ${d.ouders}`.toLowerCase().includes(zoek.toLowerCase()))
            return false;
        if (filter === "Actie voor mij")
            return metAandacht.has(d.id);
        if (filter === "Afspraak deze week")
            return agendaItems.some((a) => a.dossier === d.id && a.bereik !== "maand");
        if (filter === "Recent")
            return recent.has(d.id);
        return true;
    });
    return (<>
      <div className="mt-4 grid grid-cols-3 gap-1 rounded-md bg-surface p-1">
        {["Actief", "Uitnodigingen", "Afgesloten"].map((s) => (<button key={s} onClick={() => setSub(s)} className={`rounded-xl py-2 text-xs font-semibold ${sub === s ? "bg-card shadow-sm" : "text-ink-soft"}`}>
            {s}{s === "Uitnodigingen" && uitnodigingen.length > 0 ? ` (${uitnodigingen.length})` : ""}
          </button>))}
      </div>
      {sub === "Actief" ? (<>
          <label className="mt-4 block">
            <span className="sr-only">Zoek dossier</span>
            <input value={zoek} onChange={(e) => setZoek(e.target.value)} placeholder="Zoek dossier…" aria-label="Zoek dossier" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-brand"/>
          </label>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 border-b border-border text-xs" role="tablist">
            {dossierFilters.map((f) => (<button key={f} role="tab" aria-selected={filter === f} onClick={() => setFilter(f)} className={`-mb-px border-b-2 pb-2 font-semibold transition-colors duration-200 ${filter === f ? "border-brand text-ink" : "border-transparent text-ink-soft hover:text-ink"}`}>{f}</button>))}
          </div>
        </>) : null}
      <div className="mt-4 space-y-3">
        {sub === "Actief" && (actief.length ? actief.map((d) => <DossierKaart key={d.id} d={d} werk={werk} signaal={signalen.find((s) => s.dossier === d.id)} onOpen={onOpen}/>)
            : <p className="text-sm text-ink-soft">Geen dossiers binnen dit filter.</p>)}
        {sub === "Afgesloten" && dossiers.filter((d) => d.status === "afgesloten").map((d) => (<Card key={d.id} className="opacity-70">
            <p className="font-display font-bold">{d.gezin}</p>
            <p className="text-xs text-ink-soft">{d.rol} · betrokkenheid beëindigd</p>
            <p className="mt-2 text-[11px] text-ink-soft"><TekenLabel waarde="🔒 Geen toegang meer tot gezinsgegevens. Alleen jouw eigen privé-notities blijven voor jou bewaard."/></p>
            {werk.pros.filter((p) => p.dossier === d.id && p.naam === IK && !p.actief).map((p) => <InterneAfsluiting key={p.id} professional={p}/>)}
          </Card>))}
        {sub === "Uitnodigingen" && (uitnodigingen.length === 0 ? <p className="text-sm text-ink-soft">Geen nieuwe uitnodigingen.</p> : uitnodigingen.map((u) => (<Card key={u.id}>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand">Nieuwe uitnodiging</p>
            <p className="mt-1 font-display font-bold">{u.van} nodigen je uit als {u.rol.toLowerCase()} voor hun gezin.</p>
            <dl className="mt-3 space-y-1 text-xs">
              <div className="flex justify-between"><dt className="text-ink-soft">Wie nodigt uit</dt><dd>{u.van}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-soft">Gezin</dt><dd>{u.gezin} · {u.kinderen}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-soft">Rol</dt><dd>{u.rol}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-soft">Einddatum</dt><dd>{u.einde}</dd></div>
            </dl>
            <p className="mt-2 text-xs text-ink-soft">Toegang gevraagd tot: {u.onderdelen.join(" • ")}</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button onClick={() => onAccepteer(u.id)} className="rounded-xl bg-brand py-2 text-xs font-semibold text-primary-foreground">Accepteren</button>
              <button onClick={() => onWeiger(u.id)} className="rounded-xl bg-muted py-2 text-xs font-semibold text-ink-soft">Weigeren</button>
            </div>
            <p className="mt-2 text-[11px] text-ink-soft">Je krijgt pas toegang nadat je hebt geaccepteerd.</p>
          </Card>)))}
      </div>
    </>);
}
function Agenda({ dossiers, w, setW, overleg, onOpen }) {
    const werk = useProWerk();
    const [dossierF, setDossierF] = useState("alle");
    const [soortF, setSoortF] = useState("Alle");
    const bereik = w === "Dag" ? ["dag"] : w === "Week" ? ["dag", "week"] : ["dag", "week", "maand"];
    const maxDagen = w === "Dag" ? 0 : w === "Week" ? 7 : 31;
    const soortVan = (s) => (s.startsWith("Deadline") ? "Deadlines" : s.startsWith("Evaluatie") ? "Evaluaties" : "Gesprekken");
    const items = [
        ...agendaItems.filter((a) => bereik.includes(a.bereik)).map((a) => ({ dag: a.dag, tijd: a.tijd, dossier: a.dossier, soort: a.soort, bron: "agenda", type: soortVan(a.soort), sort: bereik.indexOf(a.bereik) })),
        ...overleg.filter((x) => x.status.klaar && x.g.ingepland).map((x) => ({ dag: dagLabel(x.g.ingepland), tijd: tijdVan(x.g.ingepland), dossier: x.d.id, soort: "Gesprek vastgelegd na akkoord ouders", bron: "overleg", type: "Gesprekken", sort: 0 })),
        ...werk.veilig.filter((v) => v.status === "actief" && dagenTot(v.evaluatie) >= 0 && dagenTot(v.evaluatie) <= maxDagen && mijnRechten(v.dossier, werk).some((r) => r === "veiligBekijken" || r === "veiligBeheren"))
            .map((v) => ({ dag: datumKort(v.evaluatie), tijd: "", dossier: v.dossier, soort: `Evaluatie veiligheidsafspraak: ${v.titel}`, bron: "veiligheid", type: "Veiligheid", sort: 1 })),
        ...werk.acties.filter((a) => !a.klaar && a.deadline && dagenTot(a.deadline) >= 0 && dagenTot(a.deadline) <= maxDagen)
            .map((a) => ({ dag: datumKort(a.deadline), tijd: "", dossier: a.dossier, soort: `Deadline: ${a.tekst}`, bron: "deadline", type: "Deadlines", sort: 1 })),
    ].filter((x) => (dossierF === "alle" || x.dossier === dossierF) && (soortF === "Alle" || x.type === soortF))
        .sort((a, b) => datumVan(a.dag, a.tijd) - datumVan(b.dag, b.tijd) || a.tijd.localeCompare(b.tijd));
    const veld = "rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand";
    return (<>
      <SectieTitel>Agenda</SectieTitel>
      <FilterBalk doorlopen opties={["Dag", "Week", "Maand"]} waarde={w} onChange={setW}/>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <select value={dossierF} onChange={(e) => setDossierF(e.target.value)} className={veld} aria-label="Dossier"><option value="alle">Alle dossiers</option>{dossiers.map((d) => <option key={d.id} value={d.id}>{d.gezin}</option>)}</select>
        <select value={soortF} onChange={(e) => setSoortF(e.target.value)} className={veld} aria-label="Type"><option>Alle</option>{["Gesprekken", "Evaluaties", "Deadlines", "Veiligheid"].map((s) => <option key={s}>{s}</option>)}</select>
      </div>
      <div className="mt-3 divide-y divide-border border-y border-border">
        {items.map((a, i) => (<button key={i} onClick={() => onOpen(a.dossier)} className="flex w-full gap-3 py-3 text-left">
            <div className="w-20 shrink-0"><p className="text-[11px] text-ink-soft">{a.dag}</p><p className="font-display text-sm font-bold text-brand">{a.tijd}</p></div>
            <div className="min-w-0"><p className="text-sm font-semibold">{naam(a.dossier)}</p><p className="text-xs text-ink-soft">{a.soort}</p></div>
            <span className="ml-auto self-center text-[11px] font-semibold uppercase tracking-wider text-ink-soft">{a.type}</span>
          </button>))}
        {items.length === 0 && <p className="py-3 text-sm text-ink-soft">Niets binnen deze filters.</p>}
      </div>
      {overleg.some((x) => !x.status.klaar) ? (<>
          <h3 className={`${kopStijl} mt-6`}>In afstemming</h3>
          <div className={regelsStijl}>
            {overleg.filter((x) => !x.status.klaar).map((x) => (<div key={x.g.id} className="flex justify-between gap-3 px-2 py-2.5 text-sm">
                <span className="min-w-0"><span className="block truncate">{x.g.tekst}</span><span className="text-[11px] text-ink-soft">{x.d.gezin}{x.g.ingepland ? ` · voorgesteld voor ${dagLabel(x.g.ingepland)} ${tijdVan(x.g.ingepland)}` : ""}</span></span>
                <span className="shrink-0 text-xs text-ink-soft">{x.status.tekst}</span>
              </div>))}
          </div>
          <p className="mt-1 text-[11px] text-ink-soft">Pas als elke benodigde ouder akkoord is, verschijnt de afspraak hier in de agenda. Gezien is niet hetzelfde als akkoord.</p>
        </>) : null}
    </>);
}
function ProBerichten({ dossiers, onOpen }) {
    const met = dossiers.filter((d) => d.toegang.includes("Communicatie"));
    return (<>
      <SectieTitel>Berichten</SectieTitel>
      <p className="-mt-1 mb-2 text-[11px] text-ink-soft">Alleen gesprekken waarvoor ouders jou toegang tot communicatie gaven.</p>
      <div className="space-y-2">
        {met.map((d) => (<button key={d.id} onClick={() => onOpen(d.id, "Communicatie")} className="block w-full text-left">
            <Card className="flex items-center justify-between">
              <div><p className="font-semibold">{d.gezin}</p><p className="text-xs text-ink-soft">{d.berichten > 0 ? "Er is een nieuw bericht voor jou" : "Geen nieuwe berichten"}</p></div>
              {d.berichten > 0 && <span className="grid size-6 place-items-center rounded-full bg-brand text-[11px] font-bold text-primary-foreground">{d.berichten}</span>}
            </Card>
          </button>))}
      </div>
    </>);
}
function Profiel() {
    const [velden, setVelden] = useState([
        { label: "Naam", waarde: "Marloes Jansen", zichtbaar: true },
        { label: "Functie", waarde: "MfN-registermediator", zichtbaar: true },
        { label: "Organisatie/praktijk", waarde: "Mediationpraktijk Midden", zichtbaar: true },
        { label: "E-mailadres", waarde: "marloes@mediationmidden.nl", zichtbaar: true },
        { label: "Telefoonnummer", waarde: "030 - 765 43 21", zichtbaar: false },
        { label: "Registratienummer", waarde: "MfN 12345", zichtbaar: true },
    ]);
    return (<>
      <SectieTitel>Professioneel profiel</SectieTitel>
      <Card>
        <div className="flex items-center gap-3">
          <div className="grid size-14 place-items-center rounded-md bg-brand font-display text-lg font-bold text-primary-foreground">MJ</div>
          <div><p className="font-display font-bold">Marloes Jansen</p><p className="text-xs text-ink-soft">Mediator</p></div>
        </div>
        <p className="mt-4 text-[11px] text-ink-soft">Jij bepaalt welke gegevens ouders zien.</p>
        <div className="mt-2 divide-y divide-border">
          {velden.map((v, i) => (<div key={v.label} className="flex items-center justify-between py-2.5">
              <div><p className="text-[11px] text-ink-soft">{v.label}</p><p className="text-sm">{v.waarde}</p></div>
              <button onClick={() => setVelden((l) => l.map((x, j) => (j === i ? { ...x, zichtbaar: !x.zichtbaar } : x)))} className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${v.zichtbaar ? "bg-brand-soft text-brand" : "bg-muted text-ink-soft"}`}>
                {v.zichtbaar ? "Zichtbaar" : "Verborgen"}
              </button>
            </div>))}
        </div>
      </Card>
      <Meldingen />
    </>);
}
function OuderToegang() {
    const [lijst, setLijst] = useState(startToegang);
    const [uitnodigen, setUitnodigen] = useState(false);
    const [concept, setConcept] = useState({ naam: "", email: "", rol: "Mediator", organisatie: "" });
    const [uitnodigingStatus, setUitnodigingStatus] = useState("");
    const zet = (id, o, n) => setLijst((l) => l.map((p) => (p.id === id ? { ...p, rechten: { ...p.rechten, [o]: n } } : p)));
    const upd = (id, veld, v) => setLijst((l) => l.map((p) => (p.id === id ? { ...p, [veld]: v } : p)));
    return (<>
      <p className="mt-4 text-xs text-ink-soft">De gezinsomgeving is van jullie. Geef per onderdeel toegang en kies eventueel een start- en einddatum.</p>
      <div className="mt-4 space-y-4">
        {lijst.map((p) => (<Card key={p.id} className={p.ingetrokken ? "opacity-60" : ""}>
            <div className="flex items-center gap-3">
              <div className="grid size-12 place-items-center rounded-md bg-brand font-display font-bold text-primary-foreground">{p.initialen}</div>
              <div className="flex-1"><p className="font-display font-bold">{p.naam}</p><p className="text-xs text-ink-soft">{p.rol} · {p.organisatie}</p></div>
            </div>
            {!p.ingetrokken && (<>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <label className="text-[11px] text-ink-soft">Startdatum<input type="date" value={p.start} onChange={(e) => upd(p.id, "start", e.target.value)} className="mt-1 w-full rounded-xl bg-surface px-2 py-1.5 text-xs text-ink"/></label>
                  <label className="text-[11px] text-ink-soft">Einddatum<input type="date" value={p.einde} onChange={(e) => upd(p.id, "einde", e.target.value)} className="mt-1 w-full rounded-xl bg-surface px-2 py-1.5 text-xs text-ink"/></label>
                </div>
                <div className="mt-3 space-y-2">
                  {alleOnderdelen.map((o) => (<div key={o} className="flex items-center justify-between gap-2 rounded-xl bg-surface px-3 py-2">
                      <span className="text-xs">{o}</span>
                      <select value={p.rechten[o]} onChange={(e) => zet(p.id, o, e.target.value)} className={`rounded-full px-2 py-1 text-[11px] font-semibold outline-none ${niveauStijl[p.rechten[o]]}`}>
                        {niveaus.map((n) => <option key={n} value={n}>{niveauLabel[n]}</option>)}
                      </select>
                    </div>))}
                </div>
              </>)}
            <button onClick={() => setLijst((l) => l.map((x) => (x.id === p.id ? { ...x, ingetrokken: !x.ingetrokken } : x)))} className="mt-3 w-full rounded-xl bg-muted py-2 text-xs font-semibold text-ink-soft">
              {p.ingetrokken ? "Toegang opnieuw geven" : "Toegang intrekken"}
            </button>
          </Card>))}
      </div>
      <p className="mt-4 text-xs text-ink-soft">Een professional krijgt pas toegang als beide ouders akkoord geven en de uitnodiging is geaccepteerd. Berichten blijven standaard privé.</p>
      <Button onClick={() => { setUitnodigen(true); setUitnodigingStatus(""); }} className="mt-4 min-h-11 w-full bg-brand text-primary-foreground shadow-none">+ Professional uitnodigen</Button>
      {uitnodigen ? <form className="mt-3 space-y-3 border-y border-border py-4" onSubmit={(e) => { e.preventDefault(); if (!concept.naam.trim() || !concept.email.trim())
            return; setUitnodigingStatus(`Uitnodiging voor ${concept.naam.trim()} voorbereid. Er is nog geen toegang gegeven of e-mail verstuurd.`); setUitnodigen(false); }}>
        <h2 className="font-display font-bold">Professional uitnodigen</h2>
        {[['naam', 'Naam'], ['email', 'E-mailadres'], ['organisatie', 'Organisatie']].map(([veld, label]) => <label key={veld} className="block text-xs font-semibold">{label}<input aria-label={label} type={veld === 'email' ? 'email' : 'text'} required={veld !== 'organisatie'} value={concept[veld]} onChange={(e) => setConcept((c) => ({ ...c, [veld]: e.target.value }))} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"/></label>)}
        <label className="block text-xs font-semibold">Rol<select aria-label="Rol professional" value={concept.rol} onChange={(e) => setConcept((c) => ({ ...c, rol: e.target.value }))} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"><option>Mediator</option><option>Gezinscoach</option><option>Andere professional</option></select></label>
        <p className="text-xs text-ink-soft">In deze voorbeeldomgeving kun je de uitnodiging voorbereiden. Versturen en toegang geven zijn nog niet aangesloten.</p>
        <div className="flex gap-2"><Button type="submit">Uitnodiging voorbereiden</Button><Button type="button" variant="ghost" onClick={() => setUitnodigen(false)}>Annuleren</Button></div>
      </form> : null}
      {uitnodigingStatus ? <p role="status" className="mt-3 text-xs text-brand">{uitnodigingStatus}</p> : null}
    </>);
}
function Meldingen() {
    const { meldingen } = useProWerk();
    const opties = [["actie", "Nieuwe toegewezen actie"], ["document", "Nieuw document"], ["gezamenlijk", "Nieuwe gezamenlijke afspraak"], ["evaluatie", "Veiligheidsafspraak moet worden geëvalueerd"], ["druk", "Hoge communicatiedruk"], ["wijziging", "Belangrijke dossierwijziging"]];
    return (<section className="mt-8">
      <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand">Meld mij bij</h2>
      <p className="mt-1 text-[11px] text-ink-soft">Jij kiest waarvoor je een melding krijgt, zodat je niet bij ieder signaal gestoord wordt.</p>
      <div className="mt-2 divide-y divide-border border-y border-border">
        {opties.map(([k, l]) => (<label key={k} className="flex items-center justify-between py-2.5 text-sm">{l}
            <input type="checkbox" checked={!!meldingen[k]} onChange={(e) => zetMelding(k, e.target.checked)} className="size-4 accent-[var(--brand)]"/>
          </label>))}
      </div>
    </section>);
}
