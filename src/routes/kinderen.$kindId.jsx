import { Mijlpalen, useMijlpalenLijst, voegMijlpaal } from "@/components/Mijlpalen";
import { BewerkPotlood } from "@/components/ui-kit";
import { useKring, adresboek, persoonLabel } from "@/lib/kring-store";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { AppShell, Card, PageHeader } from "@/components/AppShell";
import { useState } from "react";
import { documenten, kindbank, kinderen, useGezondheid, bewaarGezondheid } from "@/lib/demo-data";
import { Button } from "@/components/ui/button";
import { DeelMomentje, MomentjeKaart } from "@/components/Momentjes";
import { useMomentjes } from "@/lib/momentjes-store";
import { AppIcon, Pictogram } from "@/components/AppIcon";
import { useStart, leeftijdTekst, gezagKeuzes, kindKleuren, start } from "@/lib/start-store";
import { bevestig } from "@/lib/feedback";
import { GezagSheet } from "@/components/EersteHome";
import { MedischGezag } from "@/components/MedischGezag";
import { BeeldKiezer, ProfielBeeld } from "@/components/ProfielBeeld";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
export const Route = createFileRoute("/kinderen/$kindId")({
    loader: ({ params }) => {
        const kind = kinderen.find((k) => k.id === params.kindId);
        // Eigen kinderen staan op dit apparaat; die kent de server niet.
        if (!kind && !params.kindId.startsWith("k-"))
            throw notFound();
        return { naam: kind?.naam ?? "Kindprofiel" };
    },
    head: ({ loaderData }) => {
        const t = loaderData ? `${loaderData.naam} — Ouderschap & Co` : "Niet gevonden — Ouderschap & Co";
        return {
            meta: [
                { title: t },
                { name: "description", content: "Kindprofiel met school, opvang, zorg en contacten." },
                { property: "og:title", content: t },
                { property: "og:description", content: "Kindprofiel met school, opvang, zorg en contacten." },
                { property: "og:type", content: "profile" },
                { name: "twitter:card", content: "summary" },
            ],
        };
    },
    notFoundComponent: KindNietGevonden,
    component: KindProfielWrap,
});
function KindNietGevonden() {
    const { t } = useTranslation();
    return (<AppShell>
      <PageHeader titel={t("childProfile.notFoundTitle", "Kind niet gevonden")} terug="/kinderen"/>
    </AppShell>);
}
function KindProfielWrap() {
    const { kindId } = Route.useParams();
    const st = useStart();
    if (!st.eigen)
        return kinderen.some((x) => x.id === kindId) ? <KindProfiel /> : <KindNietGevonden />;
    const k = st.kinderen.find((x) => x.id === kindId);
    if (!k)
        return <KindNietGevonden />;
    const leeftijd = leeftijdTekst(k.geboortedatum);
    return <EigenProfiel kindId={k.id} naam={k.naam} geboortedatum={k.geboortedatum} leeftijd={leeftijd} kleur={k.kleur} beeld={k.beeld}/>;
}
function EigenProfiel({ kindId, naam, geboortedatum, leeftijd, kleur, beeld }) {
    const { t } = useTranslation();
    const st = useStart();
    const [gezagOpen, setGezagOpen] = useState(false);
    const [beeldOpen, setBeeldOpen] = useState(false);
    const k = { naam, geboortedatum };
    const g = st.gezag;
    const kleurHex = kleur ?? "#6F7F68";
    return (<AppShell>
      <PageHeader titel={k.naam} subtitel={leeftijd ?? "Kindprofiel"} terug="/kinderen"/>
      <div className="mt-4 flex items-center gap-4">
        <button type="button" onClick={() => setBeeldOpen(true)} aria-label={`Foto of avatar van ${k.naam} wijzigen`} className="relative shrink-0">
          <ProfielBeeld beeld={beeld} naam={k.naam} kleur={kleurHex} maat={56}/>
          <span aria-hidden="true" className="absolute -bottom-0.5 -right-0.5 grid size-6 place-items-center rounded-full border border-border bg-card"><AppIcon functie="notitie" maat="sm" vorm="kaal"/></span>
        </button>
        <Sheet open={beeldOpen} onOpenChange={setBeeldOpen}>
          <SheetContent side="bottom" className="inset-x-0 mx-auto w-full max-w-md max-h-[92vh] overflow-y-auto rounded-t-3xl bg-background">
            <SheetHeader><SheetTitle className="font-display">{t("childProfile.photoOrAvatarTitle", "Foto of avatar van {{name}}", { name: k.naam })}</SheetTitle></SheetHeader>
            <div className="px-4 pb-6"><BeeldKiezer beeld={beeld} naam={k.naam} overslaanTekst="Sluiten" onKies={(b) => { if (!b && !beeld) {
        setBeeldOpen(false);
        return;
    } start.zetKindBeeld(kindId, b); bevestig(b ? "Afbeelding opgeslagen" : "Afbeelding verwijderd"); setBeeldOpen(false); }}/></div>
          </SheetContent>
        </Sheet>
        <div>
          <p className="text-xs text-ink-soft">{t("childProfile.colorOf", "Kleur van {{name}}", { name: k.naam })}</p>
          <div className="mt-1 flex gap-2" role="group" aria-label={`Kleur van ${k.naam} kiezen`}>
            {kindKleuren.map((c) => (<button key={c.id} onClick={() => { start.zetKindKleur(kindId, c.hex); bevestig("Kleur opgeslagen"); }} aria-label={`Kleur ${c.id}`} aria-pressed={kleurHex === c.hex} className="size-8 rounded-full border-2" style={{ backgroundColor: c.hex, borderColor: kleurHex === c.hex ? c.hex : "transparent", opacity: kleurHex === c.hex ? 1 : 0.45 }}/>))}
          </div>
        </div>
      </div>
      <dl className="mt-6 divide-y divide-border border-y border-border text-sm">
        <div className="flex justify-between py-3"><dt className="text-ink-soft">{t("childProfile.nameLabel", "Naam")}</dt><dd className="font-semibold">{k.naam}</dd></div>
        <div className="flex justify-between py-3"><dt className="text-ink-soft">{t("childProfile.birthDateLabel", "Geboortedatum")}</dt><dd>{k.geboortedatum ? new Date(k.geboortedatum).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" }) : "Nog niet ingevuld"}</dd></div>
        <div className="flex items-start justify-between gap-4 py-3"><dt className="text-ink-soft">{t("childProfile.custodyLabel", "Gezag")}</dt><dd className="text-right">
          {g ? <><span className="font-semibold">{gezagKeuzes.find((x) => x.id === g.situatie)?.naam}</span><span className="block text-xs text-ink-soft">Ingevuld door {g.ingevuldDoor} · nog niet bevestigd door de andere ouder</span></> : "Nog niet ingevuld"}
          <button onClick={() => setGezagOpen(true)} className="mt-1 block min-h-[44px] w-full text-right text-xs font-semibold text-brand">{g ? t("childProfile.edit", "Wijzigen") : t("childProfile.fillIn", "Invullen")}</button>
        </dd></div>
      </dl>
      <p className="mt-4 text-sm text-ink-soft">School, gezondheid en belangrijke personen voor {k.naam} kun je later aanvullen. Hier staan nu de gegevens die je bij de start hebt ingevuld. Gezag is alleen informatie en verandert niets aan toegang.</p>
      <GezagSheet open={gezagOpen} onClose={() => setGezagOpen(false)}/>
    </AppShell>);
}
function KindProfiel() {
    const { t } = useTranslation();
    const { kindId } = Route.useParams();
    const k = kinderen.find((x) => x.id === kindId);
    const b = kindbank[kindId];
    const medisch = useGezondheid(kindId);
    useKring();
    const [gezondheidConcept, setGezondheidConcept] = useState(null);
    const [gezondheidOpgeslagen, setGezondheidOpgeslagen] = useState(false);
    const { lijst } = useMomentjes();
    const mijn = lijst.filter((m) => m.kindId === kindId);
    const mijlpalen = useMijlpalenLijst().filter((m) => m.kind === kindId);
    const [deelOpen, setDeelOpen] = useState(false);
    const [toevoegen, setToevoegen] = useState(false);
    const [mijlpaalTekst, setMijlpaalTekst] = useState("");
    const [alleMomenten, setAlleMomenten] = useState(false);
    const [open, setOpen] = useState(null);
    const [omschrijving, setOmschrijving] = useState(null);
    const [bewerkKind, setBewerkKind] = useState(null);
    const [cadeaus, setCadeaus] = useState([
        { id: 1, tekst: "Lego-set", door: "" },
        { id: 2, tekst: "Nieuwe tekenstiften", door: "Oma Els" },
    ]);
    const [nieuwCadeau, setNieuwCadeau] = useState("");
    if (!k || !b || !medisch)
        return <KindNietGevonden />;
    const docs = documenten.filter((d) => d.kind.includes(k.naam));
    const contacten = [...k.contacten, ...(b.trainer ? [b.trainer] : [])];
    const kring = adresboek(k.id).map(persoonLabel);
    const mensen = ["Sanne", "Joris", ...kring];
    const groep = b.klas.split("·")[0]?.trim() ?? "";
    const act = b.activiteiten[0];
    const groepen = [
        { id: "basis", icoon: "👤", titel: "Basis", samenvatting: `Geboren ${k.geboortedatum}`, rijen: [
                { label: "Naam", waarde: `${k.naam} ${k.achternaam}` },
                { label: "Geboren", waarde: k.geboortedatum },
                ...b.huishoudens.map((h, i) => ({ label: `Huishouden ${i + 1}`, waarde: h })),
            ] },
        { id: "school", icoon: "🏫", titel: "School & opvang", samenvatting: [k.school, k.school.toLowerCase().includes(groep.toLowerCase()) ? "" : groep].filter(Boolean).join(" · "), rijen: [
                { label: "School", waarde: k.school },
                { label: "Klas", waarde: b.klas },
                { label: "Opvang", waarde: k.opvang },
                { label: "Belangrijk", waarde: b.schoolInfo },
            ].filter((r) => r.waarde) },
        { id: "gezondheid", icoon: "🩺", titel: "Gezondheid", samenvatting: [medisch.huisarts && "Huisarts", medisch.tandarts && "tandarts", medisch.allergieen && "allergie"].filter(Boolean).join(" · "), rijen: [
                { label: "Huisarts", waarde: medisch.huisarts },
                { label: "Tandarts", waarde: medisch.tandarts },
                { label: "Apotheek", waarde: medisch.apotheek },
                { label: "Allergieën", waarde: medisch.allergieen },
                { label: "Medicatie", waarde: medisch.medicatie },
                { label: "Zorgverzekering", waarde: medisch.verzekering },
                { label: "Bijzonderheden", waarde: medisch.bijzonderheden },
            ], voet: "Handig voor oppas, opa en oma of een logeerpartijtje." },
        { id: "maten", icoon: "👕", titel: "Maten", samenvatting: [b.maten.kleding && `Kleding ${b.maten.kleding}`, b.maten.schoen && `schoenen ${b.maten.schoen}`].filter(Boolean).join(" · "), rijen: [
                { label: "Kleding", waarde: b.maten.kleding },
                { label: "Schoenen", waarde: b.maten.schoen },
                ...(b.maten.sport ? [{ label: "Sport", waarde: b.maten.sport }] : []),
            ], voet: `Laatst gewijzigd ${b.maten.gewijzigd}` },
        { id: "activiteiten", icoon: act?.icoon ?? "⚽", titel: "Activiteiten", samenvatting: b.activiteiten.map((a) => `${a.naam} · ${a.wanneer.split(" ")[0]?.toLowerCase()}`).join(", "), rijen: b.activiteiten.map((a) => ({ label: a.naam, waarde: a.wanneer })) },
    ];
    const momenten = [
        ...mijn.map((m) => ({ soort: "Momentje", sleutel: m.datum ?? "0", m })),
        ...mijlpalen.map((p) => ({ soort: "Mijlpaal", sleutel: `${p.jaar}-00`, p })),
    ].sort((a, b2) => b2.sleutel.localeCompare(a.sleutel));
    const zichtbaar = alleMomenten ? momenten : momenten.slice(0, 4);
    const Rij = ({ id, icoon, titel, samenvatting, rechts }) => {
        const isOpen = open === id;
        return (<button onClick={() => setOpen(isOpen ? null : id)} className="flex min-h-14 w-full items-center gap-3 py-2.5 text-left" aria-expanded={isOpen}>
        {icoon}
        <span className="min-w-0 flex-1">
          <span className="block font-display text-sm font-bold">{titel}</span>
          <span className="block truncate text-xs text-ink-soft">{samenvatting || "Nog niets ingevuld · voeg iets toe"}</span>
        </span>
        <span aria-hidden className="text-ink-soft">{isOpen ? "–" : rechts ?? (samenvatting ? "›" : "+")}</span>
      </button>);
    };
    return (<AppShell>
      <PageHeader titel={t("childProfile.allAbout", "Alles over {{name}}", { name: k.naam })} subtitel={t("childProfile.allAboutSub", "Eén plek voor alle praktische informatie")} terug="/kinderen"/>
      <Card className="relative mt-5 flex items-center gap-4 pr-12">
        <img src={k.avatar} alt={k.naam} className="size-16 rounded-lg object-cover"/>
        <div className="min-w-0">
          <p className="font-display text-lg font-extrabold">{k.naam}, {k.leeftijd} jaar</p>
          <p className="text-sm text-ink-soft">{omschrijving ?? k.praktisch}</p>
        </div>
        <BewerkPotlood onClick={() => setBewerkKind(omschrijving ?? k.praktisch)} label={`Gegevens van ${k.naam} aanpassen`}/>
      </Card>
      {bewerkKind !== null ? (<form className="mt-2 space-y-3 border-y border-border py-3" onSubmit={(e) => { e.preventDefault(); setOmschrijving(bewerkKind.trim() || k.praktisch); setBewerkKind(null); }}>
          <label className="block text-xs font-semibold">Korte omschrijving<textarea aria-label="Korte omschrijving" rows={2} value={bewerkKind} onChange={(e) => setBewerkKind(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-normal"/></label>
          <p className="text-xs text-ink-soft">Naam, geboortedatum en huishoudens pas je aan onder Basis.</p>
          <div className="flex gap-2"><Button type="submit" className="min-h-11 bg-brand text-primary-foreground shadow-none">Opslaan</Button><Button type="button" variant="ghost" onClick={() => setBewerkKind(null)}>Annuleren</Button></div>
        </form>) : null}

      <div className="mt-5 border-y border-border">
        <Link to="/kring/$kindId" params={{ kindId: k.id }} className="flex min-h-14 items-center gap-3 py-2.5">
          <AppIcon functie="contact" maat="md"/>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-sm font-bold">{t("childProfile.keyPersons", "Belangrijke personen")}</span>
            <span className="block truncate text-xs text-ink-soft">{mensen.length} {mensen.length === 1 ? "persoon" : "mensen"} · {mensen.slice(0, 2).join(" · ")}{mensen.length > 2 ? ` en ${mensen.length - 2} meer` : ""}</span>
          </span>
          <span aria-hidden className="text-lg text-ink-soft">›</span>
        </Link>
        <button onClick={() => setOpen(open === "contact" ? null : "contact")} aria-expanded={open === "contact"} className="mb-2 ml-12 text-xs font-semibold text-brand">
          {contacten.length} belangrijke contacten {open === "contact" ? "–" : "+"}
        </button>
        {open === "contact" ? (<div className="mb-3 space-y-2">
            {contacten.map((c) => (<div key={c.naam} className="flex items-center justify-between gap-3 rounded-md bg-white/60 px-3 py-2">
                <div><p className="text-sm font-semibold">{c.naam}</p><p className="text-xs text-ink-soft">{c.rol}</p></div>
                <a href={`tel:${c.telefoon.replace(/\D/g, "")}`} className="flex min-h-11 shrink-0 items-center gap-1.5 text-xs font-semibold text-brand"><AppIcon functie="bellen" maat="sm" vorm="kaal"/>{c.telefoon}</a>
              </div>))}
          </div>) : null}
      </div>

      <h2 className="mt-6 text-xs font-semibold text-ink-soft">{t("childProfile.practicalInfo", "Praktische informatie")}</h2>
      <div className="mt-1 divide-y divide-border border-y border-border">
        {groepen.map((g) => (<div key={g.id} id={`onderdeel-${g.id}`} className="scroll-mt-20">
            <Rij id={g.id} icoon={<Pictogram waarde={g.icoon} maat="md"/>} titel={g.titel} samenvatting={g.samenvatting}/>
            {open === g.id ? (<div className="mb-3 space-y-2">
                {g.rijen.map((r) => (<div key={r.label} className="rounded-md bg-white/60 px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">{r.label}</p>
                    <p className="text-sm">{r.waarde}</p>
                  </div>))}
                {g.voet ? <p className="text-[11px] text-ink-soft">{g.voet}</p> : null}
                {g.id === "gezondheid" ? (gezondheidConcept ? <form className="space-y-3 border-t border-border pt-3" onSubmit={(e) => { e.preventDefault(); bewaarGezondheid(kindId, gezondheidConcept); setGezondheidConcept(null); setGezondheidOpgeslagen(true); }}>
                    {Object.entries({ huisarts: "Huisarts", tandarts: "Tandarts", apotheek: "Apotheek", allergieen: "Allergieën", medicatie: "Medicatie", verzekering: "Zorgverzekering", bijzonderheden: "Bijzonderheden" }).map(([veld, label]) => <label key={veld} className="block text-xs font-semibold">{label}<textarea aria-label={label} value={gezondheidConcept[veld]} onChange={(e) => setGezondheidConcept((v) => v ? { ...v, [veld]: e.target.value } : v)} rows={2} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-normal"/></label>)}
                    <p className="text-xs text-ink-soft">Je deelt dit met de andere ouder. Mensen uit de kring zien alleen de gegevens waarvoor ze toestemming hebben.</p>
                    <div className="flex flex-wrap gap-2"><Button type="submit" className="min-h-11 bg-brand text-primary-foreground shadow-none">{t("childProfile.saveHealth", "Gezondheid opslaan")}</Button><Button type="button" variant="ghost" onClick={() => setGezondheidConcept(null)}>Annuleren</Button></div>
                  </form> : <><Button variant="ghost" className="min-h-11 gap-1.5 text-brand" onClick={() => { setGezondheidConcept({ ...medisch }); setGezondheidOpgeslagen(false); }}><AppIcon functie="notitie" maat="sm" vorm="kaal"/>{t("childProfile.editHealth", "Gezondheid aanpassen")}</Button>{gezondheidOpgeslagen ? <p role="status" className="text-xs text-brand">{t("childProfile.healthUpdated", "Gezondheid bijgewerkt.")}</p> : null}<MedischGezag kindId={k.id} naam={k.naam} leeftijd={k.leeftijd}/></>) : null}
              </div>) : null}
          </div>))}

        <div id="onderdeel-docs">
          <Rij id="docs" icoon={<AppIcon functie="documenten" maat="md"/>} titel="Documenten" samenvatting={docs.length ? `${docs.length} ${docs.length === 1 ? "document" : "documenten"}` : ""}/>
          {open === "docs" ? (<div className="mb-3 space-y-2">
              {docs.map((d) => (<Link key={d.id} to="/documenten" className="flex min-h-11 items-center gap-2 rounded-md bg-white/60 px-3 py-2 text-sm"><span className="flex-1">{d.naam}</span><span className="text-[11px] text-ink-soft">{d.categorie}</span></Link>))}
              {docs.length === 0 ? <Link to="/documenten" className="text-xs font-semibold text-brand">Document toevoegen ›</Link> : null}
            </div>) : null}
        </div>

        <div id="onderdeel-feest">
          <Rij id="feest" icoon={<AppIcon functie="feest" maat="md"/>} titel="Verjaardag & feestjes" samenvatting={`Jarig ${k.geboortedatum} · cadeaulijst ${cadeaus.length}`}/>
          {open === "feest" ? (<div className="mb-3 space-y-2">
              <Button asChild variant="ghost" className="min-h-11 w-full justify-between"><Link to="/planning" search={{ toevoegen: "bijzonder", periode: `Verjaardag ${k.naam}` }}>{t("childProfile.whoCelebratesWhen", "Wie viert wanneer?")}<span aria-hidden>›</span></Link></Button>
              <Button asChild variant="ghost" className="min-h-11 w-full justify-between"><Link to="/taken" search={{ taak: `Traktatie voor school · ${k.naam}`, kind: k.id }}>{t("childProfile.schoolTreats", "Traktatie voor school")}<span aria-hidden>›</span></Link></Button>
              <Button asChild variant="ghost" className="min-h-11 w-full justify-between"><Link to="/taken" search={{ taak: `Uitnodigingen kinderfeestje · ${k.naam}`, kind: k.id }}>{t("childProfile.partyInvites", "Uitnodigingen kinderfeestje")}<span aria-hidden>›</span></Link></Button>
              <div className="border-t border-border pt-3">
                <p className="font-display text-sm font-bold">{t("childProfile.wishlistTitle", "Cadeaulijst")}</p>
                <div className="mt-2 space-y-2">
                  <div className="flex gap-2">
                    <input value={nieuwCadeau} onChange={(e) => setNieuwCadeau(e.target.value)} placeholder={`Wens van ${k.naam}`} className="flex-1 rounded-md bg-white/60 px-3 py-2 text-sm"/>
                    <button onClick={() => { if (nieuwCadeau.trim()) {
            setCadeaus((c) => [...c, { id: Date.now(), tekst: nieuwCadeau.trim(), door: "" }]);
            setNieuwCadeau("");
        } }} className="min-h-11 rounded-md bg-brand px-4 text-sm font-semibold text-primary-foreground">Toevoegen</button>
                  </div>
                  {cadeaus.map((c) => (<div key={c.id} className="flex items-center justify-between gap-3 rounded-md bg-white/60 px-3 py-2 text-sm">
                      <div><p className="flex items-center gap-1.5 font-medium"><AppIcon functie="cadeau" maat="sm" vorm="kaal"/>{c.tekst}</p>{c.door ? <p className="text-xs text-ink-soft">Gekocht door {c.door}</p> : null}</div>
                      {!c.door ? <button onClick={() => setCadeaus((l) => l.map((x) => (x.id === c.id ? { ...x, door: "Sanne (jij)" } : x)))} className="shrink-0 rounded-full bg-brand-soft px-3 py-1.5 text-xs font-semibold text-brand">{t("childProfile.iBuyThis", "Ik koop dit")}</button> : null}
                    </div>))}
                  <p className="text-[11px] text-ink-soft">Zo krijgt {k.naam} geen twee keer hetzelfde cadeau.</p>
                </div>
              </div>
            </div>) : null}
        </div>
      </div>

      <section className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-bold">{t("childProfile.momentsOf", "{{name}}'s momenten", { name: k.naam })}</h2>
          <button onClick={() => setToevoegen((v) => !v)} className="min-h-11 text-xs font-semibold text-brand">{t("childProfile.addMoment", "+ Moment toevoegen")}</button>
        </div>
        {toevoegen ? (<div className="mt-2 space-y-2 border-y border-border py-3">
            <Button variant="ghost" className="min-h-11 w-full justify-between" onClick={() => { setToevoegen(false); setDeelOpen(true); }}>Momentje delen (met foto)<span aria-hidden>›</span></Button>
            <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (!mijlpaalTekst.trim())
            return; voegMijlpaal({ kind: k.id, jaar: new Date().getFullYear(), tekst: mijlpaalTekst.trim() }); setMijlpaalTekst(""); setToevoegen(false); }}>
              <input aria-label="Mijlpaal" className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm" placeholder="Of een mijlpaal, bijv. zwemdiploma B" value={mijlpaalTekst} onChange={(e) => setMijlpaalTekst(e.target.value)}/>
              <button className="min-h-11 rounded-md bg-brand px-3 text-sm font-semibold text-primary-foreground">Bewaar</button>
            </form>
          </div>) : null}
        <div className="mt-3 space-y-3">
          {zichtbaar.map((x) => x.soort === "Momentje"
            ? <div key={`momentje-${x.m.id}`}><p className="mb-1 text-[11px] font-semibold text-ink-soft">Momentje</p><MomentjeKaart m={x.m}/></div>
            : <div key={`mijlpaal-${x.p.id}`} className="flex items-start gap-2 border-b border-border pb-3"><AppIcon functie="mijlpaal" maat="sm"/><div><p className="text-sm font-semibold">{x.p.tekst}</p><p className="text-[11px] text-ink-soft">Mijlpaal · {x.p.jaar}</p></div></div>)}
          {momenten.length === 0 ? <p className="text-sm text-ink-soft">Hier komen de mooie momenten van {k.naam}. <button type="button" onClick={() => setDeelOpen(true)} className="font-semibold text-brand">{t("childProfile.shareFirstMoment", "Deel het eerste momentje")}</button></p> : null}
        </div>
        {momenten.length > 4 || alleMomenten ? (<button onClick={() => setAlleMomenten((v) => !v)} className="mt-3 min-h-11 text-sm font-semibold text-brand">{alleMomenten ? t("childProfile.showLess", "Minder tonen") : t("childProfile.viewAllMoments", "Bekijk alle momenten ›")}</button>) : null}
        {alleMomenten ? <Mijlpalen kindId={k.id} naam={k.naam} momentjesPerJaar={mijn.reduce((acc, m) => { const j = m.datum ? Number(m.datum.slice(0, 4)) : NaN; return Number.isFinite(j) ? { ...acc, [j]: (acc[j] ?? 0) + 1 } : acc; }, {})}/> : null}
      </section>
      <DeelMomentje open={deelOpen} onSluit={() => setDeelOpen(false)} kindId={k.id}/>
    </AppShell>);
}
