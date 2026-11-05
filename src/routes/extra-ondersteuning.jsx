import { useTranslation } from "react-i18next";
import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { AppShell, Card, PageHeader } from "@/components/AppShell";
import { AppIcon } from "@/components/AppIcon";
import { CoBadge } from "@/components/CoBadge";
import { CoPrivacy } from "@/components/CoPrivacy";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { bevestig } from "@/lib/feedback";
import { useVoorkeuren, zetVoorkeur } from "@/lib/voorkeuren-store";
export const Route = createFileRoute("/extra-ondersteuning")({
    validateSearch: z.object({ onderdeel: z.enum(["afspraken", "intro"]).optional() }),
    head: () => ({ meta: [
            { title: "Extra houvast — Ouderschap & Co" },
            { name: "description", content: "Rustig je gedachten ordenen met Co, samen afspraken vastleggen en terugkijken." },
            { property: "og:title", content: "Extra houvast — Ouderschap & Co" },
            { property: "og:description", content: "Ontdek optionele ondersteuning voor communicatie, afspraken en begeleiding." },
            { property: "og:type", content: "website" },
            { name: "twitter:card", content: "summary" },
        ] }),
    component: Extra,
});
const mogelijkheden = [
    ["co", "Even je verhaal kwijt", "Vertel wat je bezighoudt. Co luistert en denkt neutraal mee."],
    ["berichten", "Hulp bij lastige berichten", "Maak van je gedachten een duidelijk, respectvol bericht."],
    ["samen", "Samen naar oplossingen zoeken", "Verken mogelijkheden als jullie ergens niet uitkomen."],
    ["afspraak", "Afspraken & beslissingen", "Leg voorstellen en afspraken helder vast."],
    ["geschiedenis", "Terugkijken", "Zie wat jullie eerder hebben afgesproken of veranderd."],
    ["ondersteuning", "Samenwerken met begeleiding", "Betrek een professional als die betrokken is."],
    ["exporteren", "Een overzicht bewaren of delen", "Maak een feitelijk overzicht van relevante afspraken."],
];
const rij = "flex min-h-14 items-center gap-3 border-b border-border py-3.5";
function RijTekst({ titel, tekst }) {
    return <><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{titel}</span><span className="mt-0.5 block text-xs leading-relaxed text-ink-soft">{tekst}</span></span><span className="text-xl text-brand" aria-hidden>›</span></>;
}
function Extra() {
    const { t } = useTranslation();
    const vk = useVoorkeuren();
    const { onderdeel } = Route.useSearch();
    const navigate = Route.useNavigate();
    const aanzetten = () => { zetVoorkeur("extraHouvast", true); bevestig("Extra houvast staat aan."); void navigate({ search: {} }); };
    if (vk.extraHouvast && onderdeel === "afspraken")
        return <AppShell>
    <PageHeader titel="Afspraken & beslissingen" subtitel="Leg afspraken en belangrijke keuzes samen vast." terug="/extra-ondersteuning"/>
    <div className="mt-4">
      <Link to="/afspraken" className={rij}><AppIcon functie="afspraak"/><RijTekst titel="Afspraken tussen jullie" tekst="Onderlinge afspraken, zoals halen, brengen en contact."/></Link>
      <Link to="/beslissingen" className={rij}><AppIcon functie="voorstel"/><RijTekst titel="Samen iets beslissen" tekst="Belangrijke keuzes voorstellen en vastleggen."/></Link>
    </div>
  </AppShell>;
    const intro = !vk.extraHouvast || onderdeel === "intro";
    return <AppShell>
    <PageHeader titel={t("extraSupportPage.headerTitle", "Extra houvast & Ondersteuning")} terug="/meer"/>
    {intro ? <>
      <h2 className="mt-5 font-display text-xl font-bold">Soms is samen regelen best lastig.</h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">Of je nu ergens mee zit, een lastig bericht moet sturen of samen een afspraak wilt maken: je hoeft het niet allemaal alleen uit te zoeken.</p>
      <div className="mt-5 flex items-start gap-3 rounded-lg bg-brand-soft p-4">
        <CoBadge maat="lg"/><div className="min-w-0"><h3 className="font-display font-bold">Maak kennis met Co</h3><p className="mt-1 text-sm leading-relaxed">Co is je digitale meedenker. Een rustige plek om je gedachten te ordenen, zonder oordeel.</p></div>
      </div>
      <h3 className="mt-5 font-display font-bold">Hier kan Extra houvast je bij helpen</h3>
      <div className="mt-1">{mogelijkheden.map(([functie, titel, tekst]) => <div key={titel} className={rij}>{functie === "co" ? <CoBadge /> : <AppIcon functie={functie}/>}<span className="min-w-0"><span className="block text-sm font-semibold">{titel}</span><span className="mt-0.5 block text-xs leading-relaxed text-ink-soft">{tekst}</span></span></div>)}</div>
      <p className="mt-3 text-xs leading-relaxed text-ink-soft">Na aanzetten vind je de optionele onderdelen hier bij elkaar. Agenda, Berichten, het taalfilter, Kosten en ontvangen verzoeken blijven altijd beschikbaar. Co met echte gezinsgegevens is nog niet beschikbaar.</p>
      <Card className="mt-5">
        <h3 className="font-display font-bold">Wil je Extra houvast gebruiken?</h3>
        <p className="mt-2 text-sm text-ink-soft">Je kunt het op ieder moment aan- of uitzetten. Alleen jouw weergave verandert.</p>
        {vk.extraHouvast ? <Button asChild className="mt-4 min-h-11 w-full"><Link to="/extra-ondersteuning" search={{}}>Naar mijn Extra houvast</Link></Button> : <Button className="mt-4 min-h-11 w-full" onClick={aanzetten}>Extra houvast aanzetten</Button>}
        <p className="mt-2 text-xs text-ink-soft">Voorlopig wordt je keuze alleen op dit apparaat bewaard, nog niet per ingelogde ouder.</p>
      </Card>
    </> : <>
      <div className="mt-5 rounded-lg bg-brand-soft p-4">
        <div className="flex items-center gap-3"><CoBadge maat="lg"/><div><h2 className="font-display font-bold">Even sparren met Co?</h2><p className="mt-1 text-sm text-ink-soft">Samen zoeken naar een oplossing die werkt.</p></div></div>
        <Button asChild className="mt-3 min-h-11"><Link to="/verhaal">Praat met Co</Link></Button>
        <p className="mt-2 text-xs text-ink-soft">Co is je digitale meedenker. Gebruik voorlopig alleen fictieve gegevens.</p>
      </div>
      <nav aria-label="Extra houvast onderdelen" className="mt-3">
        <Link to="/verhaal" className={rij}><CoBadge /><RijTekst titel="Rustiger communiceren" tekst="Co helpt je bij lastige gesprekken."/></Link>
        <Link to="/extra-ondersteuning" search={{ onderdeel: "afspraken" }} className={rij}><AppIcon functie="afspraak"/><RijTekst titel="Afspraken & beslissingen" tekst="Leg afspraken en belangrijke keuzes samen vast."/></Link>
        <Link to="/tijdlijn" className={rij}><AppIcon functie="geschiedenis"/><RijTekst titel="Terugkijken" tekst="Bekijk wat is veranderd of afgesproken."/></Link>
        <Link to="/ondersteuning" className={rij}><AppIcon functie="ondersteuning"/><RijTekst titel="Begeleiding" tekst="Werk samen met een betrokken professional."/></Link>
        <Link to="/exporteren" className={rij}><AppIcon functie="exporteren"/><RijTekst titel="Overzicht bewaren of delen" tekst="Maak een feitelijk overzicht van jullie afspraken."/></Link>
      </nav>
      <Button asChild variant="link" className="min-h-11 px-0"><Link to="/extra-ondersteuning" search={{ onderdeel: "intro" }}>Wat is Extra houvast?</Link></Button>
    </>}
    <CoPrivacy />
    {!intro ? <section className="mt-5">
      <h3 className="font-display font-bold">Instellingen Extra houvast</h3>
      <div className="mt-2 flex items-center justify-between gap-3 border-b border-border py-3"><label htmlFor="houvast-aan" className="text-sm font-semibold">Extra houvast gebruiken</label><Switch id="houvast-aan" checked={vk.extraHouvast} onCheckedChange={(aan) => { zetVoorkeur("extraHouvast", aan); bevestig("Extra houvast staat uit. Je gegevens blijven bewaard."); }}/></div>
      <div className="flex items-start justify-between gap-3 py-3"><div><label htmlFor="co-knelpunten" className="text-sm font-semibold">Co mag meedenken bij terugkerende knelpunten.</label><p className="mt-1 text-xs text-ink-soft">Nog niet beschikbaar. Er worden geen gebeurtenissen of privégesprekken geanalyseerd.</p></div><Switch id="co-knelpunten" checked={false} disabled aria-describedby="co-knelpunten-uitleg"/></div>
      <p id="co-knelpunten-uitleg" className="text-xs text-ink-soft">Deze afzonderlijke keuze blijft uit totdat veilige gegevens en toegangscontrole beschikbaar zijn. Uit- en inloggen met een eigen oudervoorkeur is nog niet aangesloten.</p>
    </section> : null}
  </AppShell>;
}
