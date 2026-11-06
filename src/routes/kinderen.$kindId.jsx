import { Mijlpalen, useMijlpalenLijst, voegMijlpaal } from "@/components/Mijlpalen";
import { BewerkPotlood } from "@/components/ui-kit";
import { useKring, adresboek, persoonLabel } from "@/lib/kring-store";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { AppShell, Card, PageHeader } from "@/components/AppShell";
import { useState, useEffect } from "react";
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
import { ChildSheet } from "@/components/ChildSheet";
import { updateChild } from "@/lib/child-service";
import { useAuth } from "@/contexts/AuthContext";
import { Pencil, Plus, Check, Loader2, ChevronRight, ChevronDown } from "lucide-react";

export const Route = createFileRoute("/kinderen/$kindId")({
    loader: ({ params }) => {
        const demo = kinderen.find((k) => k.id === params.kindId);
        return { naam: demo?.naam ?? "Kindprofiel" };
    },
    head: ({ loaderData }) => {
        const t = loaderData ? `${loaderData.naam} — Ouderschap & Co` : "Kindprofiel — Ouderschap & Co";
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
    const demo = kinderen.find((x) => x.id === kindId);
    const custom = st.kinderen.find((x) => x.id === kindId);

    if (!demo && !custom)
        return <KindNietGevonden />;

    return <KindProfiel kindId={kindId} demoData={demo} customData={custom} />;
}

function KindProfiel({ kindId, demoData, customData }) {
    const { t } = useTranslation();
    const { user } = useAuth();
    const isCustom = !!customData;

    // Unified child properties
    const k = isCustom
      ? {
          id: customData.id,
          naam: customData.naam || "Kind",
          achternaam: customData.achternaam || "",
          geboortedatum: customData.geboortedatum || "",
          leeftijd: customData.geboortedatum ? leeftijdTekst(customData.geboortedatum) : "",
          avatar: customData.avatar || customData.beeld || null,
          kleur: customData.kleur || "#3C6E71",
          school: customData.school || "",
          opvang: customData.opvang || "",
          praktisch: customData.praktisch || customData.beschrijving || "",
          contacten: customData.contacten || [],
        }
      : demoData;

    const b = isCustom
      ? {
          klas: customData.klas || "",
          schoolInfo: customData.schoolInfo || "",
          huishoudens: customData.huishoudens || [],
          maten: {
            kleding: customData.kledingmaat || "",
            schoen: customData.schoenmaat || "",
            sport: customData.sportmaat || "",
            gewijzigd: customData.gewijzigd || "Recent",
          },
          activiteiten: customData.activiteiten || [],
        }
      : kindbank[kindId] || { klas: "", schoolInfo: "", huishoudens: [], maten: {}, activiteiten: [] };

    const demoMedisch = useGezondheid(kindId);
    const medisch = isCustom
      ? {
          huisarts: customData.arts || customData.huisarts || "",
          tandarts: customData.tandarts || "",
          apotheek: customData.apotheek || "",
          allergieen: customData.allergieen || "",
          medicatie: customData.medisch || customData.medicatie || "",
          verzekering: customData.verzekering || "",
          bijzonderheden: customData.bijzonderheden || "",
        }
      : demoMedisch || {};

    const [childSheetOpen, setChildSheetOpen] = useState(false);
    const [gezondheidConcept, setGezondheidConcept] = useState(null);
    const [gezondheidOpgeslagen, setGezondheidOpgeslagen] = useState(false);
    const [open, setOpen] = useState(null);
    const [omschrijving, setOmschrijving] = useState(null);
    const [bewerkKind, setBewerkKind] = useState(null);
    const [saving, setSaving] = useState(false);

    const { lijst } = useMomentjes();
    const mijn = lijst.filter((m) => m.kindId === kindId);
    const mijlpalen = useMijlpalenLijst().filter((m) => m.kind === kindId);
    const [alleMomenten, setAlleMomenten] = useState(false);

    const [cadeaus, setCadeaus] = useState([
        { id: 1, tekst: "Cadeautip 1", door: "" },
    ]);
    const [nieuwCadeau, setNieuwCadeau] = useState("");

    const docs = documenten.filter((d) => d.kind && d.kind.includes(k.naam));
    const contacten = k.contacten || [];
    const kring = adresboek(k.id).map(persoonLabel);
    const mensen = ["Jij", "De andere ouder", ...kring];
    const groep = b.klas ? b.klas.split("·")[0]?.trim() : "";
    const act = b.activiteiten?.[0];

    const notFilled = t("childProfile.notFilledYet", "Nog niet ingevuld");
    const groepen = [
        {
          id: "basis",
          icoon: "👤",
          titel: t("childProfile.basisTitle", "Basis"),
          samenvatting: k.geboortedatum ? t("childProfile.born", "Geboren {{date}}", { date: k.geboortedatum }) : t("childProfile.bornAndNames", "Geboortedatum en namen"),
          rijen: [
            { label: t("common.name", "Naam"), waarde: `${k.naam} ${k.achternaam || ""}`.trim() },
            { label: t("childProfile.birthDate", "Geboren"), waarde: k.geboortedatum || notFilled },
            ...(b.huishoudens?.length ? b.huishoudens.map((h, i) => ({ label: `${t("childProfile.household", "Huishouden")} ${i + 1}`, waarde: h })) : [{ label: t("childProfile.households", "Huishoudens"), waarde: t("childProfile.bothHomes", "Beide huizen") }]),
          ],
        },
        {
          id: "school",
          icoon: "🏫",
          titel: t("childProfile.schoolAndCare", "School & opvang"),
          samenvatting: [k.school, groep].filter(Boolean).join(" · ") || t("childProfile.schoolClassDaycare", "School, klas en opvang"),
          rijen: [
            { label: t("childProfile.school", "School"), waarde: k.school || notFilled },
            { label: t("childProfile.class", "Klas"), waarde: b.klas || notFilled },
            { label: t("childProfile.daycare", "Opvang"), waarde: k.opvang || notFilled },
            ...(b.schoolInfo ? [{ label: t("childProfile.important", "Belangrijk"), waarde: b.schoolInfo }] : []),
          ],
        },
        {
          id: "gezondheid",
          icoon: "🩺",
          titel: t("childProfile.health", "Gezondheid"),
          samenvatting: [medisch.huisarts && t("childProfile.gp", "Huisarts"), medisch.tandarts && t("childProfile.dentist", "Tandarts"), medisch.allergieen && t("childProfile.allergies", "Allergieën")].filter(Boolean).join(" · ") || t("childProfile.doctorAllergiesMedication", "Arts, allergieën en medicatie"),
          rijen: [
            { label: t("childProfile.gp", "Huisarts"), waarde: medisch.huisarts || notFilled },
            { label: t("childProfile.dentist", "Tandarts"), waarde: medisch.tandarts || notFilled },
            { label: t("childProfile.pharmacy", "Apotheek"), waarde: medisch.apotheek || notFilled },
            { label: t("childProfile.allergies", "Allergieën"), waarde: medisch.allergieen || t("childProfile.noneKnown", "Geen bekend") },
            { label: t("childProfile.medication", "Medicatie"), waarde: medisch.medicatie || t("childProfile.none", "Geen") },
            { label: t("childProfile.insurance", "Zorgverzekering"), waarde: medisch.verzekering || notFilled },
            { label: t("childProfile.specialDetails", "Bijzonderheden"), waarde: medisch.bijzonderheden || t("childProfile.noSpecialDetails", "Geen bijzonderheden") },
          ],
          voet: t("childProfile.healthTipFoot", "Handig voor oppas, opa en oma of een logeerpartijtje."),
        },
        {
          id: "maten",
          icoon: "👕",
          titel: t("childProfile.sizes", "Maten"),
          samenvatting: [b.maten?.kleding && `${t("childProfile.clothing", "Kleding")} ${b.maten.kleding}`, b.maten?.schoen && `${t("childProfile.shoes", "Schoenen")} ${b.maten.schoen}`].filter(Boolean).join(" · ") || t("childProfile.clothingAndShoeSizes", "Kleding- en schoenmaten"),
          rijen: [
            { label: t("childProfile.clothing", "Kleding"), waarde: b.maten?.kleding || notFilled },
            { label: t("childProfile.shoes", "Schoenen"), waarde: b.maten?.schoen || notFilled },
            ...(b.maten?.sport ? [{ label: t("childProfile.sports", "Sport"), waarde: b.maten.sport }] : []),
          ],
          voet: b.maten?.gewijzigd ? t("childProfile.lastChanged", "Laatst gewijzigd {{date}}", { date: b.maten.gewijzigd }) : undefined,
        },
        {
          id: "activiteiten",
          icoon: act?.icoon ?? "⚽",
          titel: t("childProfile.activities", "Activiteiten"),
          samenvatting: b.activiteiten?.length ? b.activiteiten.map((a) => `${a.naam} · ${a.wanneer?.split(" ")[0]?.toLowerCase()}`).join(", ") : t("childProfile.sportsClubsHobbies", "Sport, clubjes en hobby's"),
          rijen: b.activiteiten?.length ? b.activiteiten.map((a) => ({ label: a.naam, waarde: a.wanneer })) : [{ label: t("childProfile.activities", "Activiteiten"), waarde: t("childProfile.noActivitiesAdded", "Nog geen activiteiten toegevoegd") }],
        },
    ];

    const momenten = [
        ...mijn.map((m) => ({ soort: "Momentje", sleutel: m.datum ?? "0", m })),
        ...mijlpalen.map((p) => ({ soort: "Mijlpaal", sleutel: `${p.jaar}-00`, p })),
    ].sort((a, b2) => b2.sleutel.localeCompare(a.sleutel));
    const zichtbaar = alleMomenten ? momenten : momenten.slice(0, 4);

    const Rij = ({ id, icoon, titel, samenvatting, rechts }) => {
        const isOpen = open === id;
        return (
          <button onClick={() => setOpen(isOpen ? null : id)} className="flex min-h-14 w-full items-center gap-3 py-2.5 text-left cursor-pointer" aria-expanded={isOpen}>
            {icoon}
            <span className="min-w-0 flex-1">
              <span className="block font-display text-sm font-bold text-ink">{titel}</span>
              <span className="block truncate text-xs text-ink-soft">{samenvatting || t("childProfile.emptyFieldAdd", "Nog niets ingevuld · voeg iets toe")}</span>
            </span>
            <span aria-hidden className="shrink-0 text-ink-soft">
              {isOpen ? (
                <ChevronDown className="size-5 rotate-180 transition-transform" />
              ) : rechts ?? (samenvatting ? (
                <ChevronRight className="size-5" />
              ) : (
                <Plus className="size-5 text-brand" />
              ))}
            </span>
          </button>
        );
    };

    const handleSaveHealth = async (concept) => {
      setSaving(true);
      if (isCustom && user?.id) {
        try {
          await updateChild(k.id, user.id, {
            arts: concept.huisarts,
            medisch: concept.medicatie,
            allergieen: concept.allergieen,
            huisarts: concept.huisarts,
            tandarts: concept.tandarts,
            apotheek: concept.apotheek,
            verzekering: concept.verzekering,
            bijzonderheden: concept.bijzonderheden,
          });
        } catch (err) {
          console.warn("Update child health notice:", err);
        }
      } else {
        bewaarGezondheid(kindId, concept);
      }
      setGezondheidConcept(null);
      setGezondheidOpgeslagen(true);
      setSaving(false);
      bevestig(t("childProfile.healthSavedNotice", "Gezondheidsgegevens opgeslagen"));
    };

    const handleSaveDescription = async (desc) => {
      setOmschrijving(desc);
      setBewerkKind(null);
      if (isCustom && user?.id) {
        try {
          await updateChild(k.id, user.id, { praktisch: desc });
        } catch (err) {
          console.warn("Update child description notice:", err);
        }
      }
      bevestig(t("childProfile.descriptionSavedNotice", "Omschrijving opgeslagen"));
    };

    return (<AppShell>
      <PageHeader titel={t("childProfile.allAbout", "Alles over {{name}}", { name: k.naam })} subtitel={t("childProfile.allAboutSub", "Eén plek voor alle praktische informatie")} terug="/kinderen"/>
      
      {/* Profile Card with Avatar & Edit pencil */}
      <Card className="relative mt-5 flex items-center justify-between p-4">
        <div className="flex items-center gap-4">
          {k.avatar ? (
            <img src={k.avatar} alt={k.naam} className="size-16 rounded-2xl object-cover shadow-2xs"/>
          ) : (
            <span className="grid size-16 place-items-center rounded-2xl bg-brand-soft font-display text-2xl font-bold text-brand shadow-2xs">
              {k.naam.slice(0, 1).toUpperCase()}
            </span>
          )}
          <div className="min-w-0">
            <p className="font-display text-lg font-extrabold text-ink">{k.naam}{k.leeftijd ? `, ${k.leeftijd}` : ""}</p>
            <p className="text-sm text-ink-soft truncate">{omschrijving || k.praktisch || t("childProfile.practicalInfoAdd", "Praktische informatie toevoegen")}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setChildSheetOpen(true)}
          className="rounded-xl border border-border bg-card p-2 text-ink hover:bg-muted transition cursor-pointer"
          aria-label={t("childProfile.editChildData", "Gegevens van {{name}} bewerken", { name: k.naam })}
        >
          <Pencil className="size-4 text-brand" />
        </button>
      </Card>

      {bewerkKind !== null ? (
        <form className="mt-2 space-y-3 border-y border-border py-3" onSubmit={(e) => { e.preventDefault(); handleSaveDescription(bewerkKind.trim()); }}>
          <label className="block text-xs font-semibold">{t("childProfile.shortDesc", "Korte omschrijving")}<textarea aria-label={t("childProfile.shortDesc", "Korte omschrijving")} rows={2} value={bewerkKind} onChange={(e) => setBewerkKind(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-normal"/></label>
          <p className="text-xs text-ink-soft">{t("childProfile.editTip", "Naam, geboortedatum en school pas je aan met de bewerkknop hierboven.")}</p>
          <div className="flex gap-2">
            <Button type="submit" className="min-h-11 bg-brand text-primary-foreground shadow-none">{t("common.save", "Opslaan")}</Button>
            <Button type="button" variant="ghost" onClick={() => setBewerkKind(null)}>{t("common.cancel", "Annuleren")}</Button>
          </div>
        </form>
      ) : null}

      {/* Belangrijke personen */}
      <div className="mt-5 border-y border-border">
        <Link to={`/kring/${k.id}`} className="flex min-h-14 items-center gap-3 py-2.5">
          <AppIcon functie="contact" maat="md"/>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-sm font-bold">{t("childProfile.keyPersons", "Belangrijke personen")}</span>
            <span className="block truncate text-xs text-ink-soft">{mensen.length} {mensen.length === 1 ? t("childProfile.onePerson", "persoon") : t("childProfile.personsCount", "{{count}} personen", { count: mensen.length })} · {mensen.slice(0, 2).join(" · ")}{mensen.length > 2 ? t("childProfile.andMore", " en nog {{count}} meer", { count: mensen.length - 2 }) : ""}</span>
          </span>
          <ChevronRight className="size-5 shrink-0 text-ink-soft" />
        </Link>
        <button onClick={() => setOpen(open === "contact" ? null : "contact")} aria-expanded={open === "contact"} className="mb-2 ml-12 text-xs font-semibold text-brand cursor-pointer">
          {contacten.length ? t("childProfile.contactsCount", "{{count}} belangrijke contacten", { count: contacten.length }) : t("childProfile.addContacts", "+ Contacten toevoegen")}
        </button>
        {open === "contact" ? (
          <div className="mb-3 space-y-2">
            {contacten.length > 0 ? (
              contacten.map((c) => (
                <div key={c.naam} className="flex items-center justify-between gap-3 rounded-md bg-white/60 dark:bg-card px-3 py-2 border border-border">
                  <div><p className="text-sm font-semibold">{c.naam}</p><p className="text-xs text-ink-soft">{c.rol}</p></div>
                  <a href={`tel:${c.telefoon?.replace(/\D/g, "")}`} className="flex min-h-11 shrink-0 items-center gap-1.5 text-xs font-semibold text-brand"><AppIcon functie="bellen" maat="sm" vorm="kaal"/>{c.telefoon}</a>
                </div>
              ))
            ) : (
              <p className="text-xs text-ink-soft px-3 py-2">{t("childProfile.noContactsLinked", "Nog geen contactpersonen direct gekoppeld.")}</p>
            )}
          </div>
        ) : null}
      </div>

      {/* Praktische informatie */}
      <div className="flex items-center justify-between mt-6">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-soft">{t("childProfile.practicalInfo", "Praktische informatie")}</h2>
        <button
          type="button"
          onClick={() => setChildSheetOpen(true)}
          className="text-xs font-semibold text-brand hover:underline cursor-pointer"
        >
          {t("common.editAll", "Bewerken")}
        </button>
      </div>

      <div className="mt-1 divide-y divide-border border-y border-border">
        {groepen.map((g) => (
          <div key={g.id} id={`onderdeel-${g.id}`} className="scroll-mt-20">
            <Rij id={g.id} icoon={<Pictogram waarde={g.icoon} maat="md"/>} titel={g.titel} samenvatting={g.samenvatting}/>
            {open === g.id ? (
              <div className="mb-3 space-y-2">
                {g.rijen.map((r) => (
                  <div key={r.label} className="rounded-xl bg-card border border-border px-3.5 py-2.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">{r.label}</p>
                    <p className="text-sm mt-0.5">{r.waarde}</p>
                  </div>
                ))}
                {g.voet ? <p className="text-[11px] text-ink-soft px-1">{g.voet}</p> : null}

                {/* Inline Health Editing */}
                {g.id === "gezondheid" ? (
                  gezondheidConcept ? (
                    <form className="space-y-3 border-t border-border pt-3 mt-2" onSubmit={(e) => { e.preventDefault(); handleSaveHealth(gezondheidConcept); }}>
                      {Object.entries({
                        huisarts: t("childProfile.gp", "Huisarts"),
                        tandarts: t("childProfile.dentist", "Tandarts"),
                        apotheek: t("childProfile.pharmacy", "Apotheek"),
                        allergieen: t("childProfile.allergies", "Allergieën"),
                        medicatie: t("childProfile.medication", "Medicatie"),
                        verzekering: t("childProfile.insurance", "Zorgverzekering"),
                        bijzonderheden: t("childProfile.specialDetails", "Bijzonderheden")
                      }).map(([veld, label]) => (
                        <label key={veld} className="block text-xs font-semibold">
                          {label}
                          <textarea
                            aria-label={label}
                            value={gezondheidConcept[veld] || ""}
                            onChange={(e) => setGezondheidConcept((v) => ({ ...v, [veld]: e.target.value }))}
                            rows={2}
                            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-normal"
                          />
                        </label>
                      ))}
                      <p className="text-xs text-ink-soft">{t("childProfile.healthPrivacyNote", "Gezondheidsgegevens worden gedeeld met geautoriseerde ouders en beschermd volgens de ingestelde rechten.")}</p>
                      <div className="flex flex-wrap gap-2">
                        <Button type="submit" disabled={saving} className="min-h-11 bg-brand text-primary-foreground shadow-none">
                          {saving ? <Loader2 className="size-4 animate-spin" /> : t("childProfile.saveHealth", "Gezondheid opslaan")}
                        </Button>
                        <Button type="button" variant="ghost" onClick={() => setGezondheidConcept(null)}>{t("common.cancel", "Annuleren")}</Button>
                      </div>
                    </form>
                  ) : (
                    <div className="pt-2">
                      <Button variant="ghost" className="min-h-11 gap-1.5 text-brand" onClick={() => { setGezondheidConcept({ ...medisch }); setGezondheidOpgeslagen(false); }}>
                        <AppIcon functie="notitie" maat="sm" vorm="kaal"/>
                        {t("childProfile.editHealth", "Gezondheid aanpassen")}
                      </Button>
                      {gezondheidOpgeslagen ? <p role="status" className="text-xs text-brand mt-1">{t("childProfile.healthUpdated", "Gezondheid bijgewerkt.")}</p> : null}
                    </div>
                  )
                ) : null}

                {/* General edit button for other sections */}
                {g.id !== "gezondheid" && (
                  <div className="pt-1">
                    <Button variant="ghost" size="sm" onClick={() => setChildSheetOpen(true)} className="text-xs text-brand gap-1">
                      <Pencil className="size-3" />
                      <span>{t("childProfile.adjustSection", "{{title}} aanpassen", { title: g.titel })}</span>
                    </Button>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        ))}

        {/* Documenten */}
        <div id="onderdeel-docs">
          <Rij id="docs" icoon={<AppIcon functie="documenten" maat="md"/>} titel={t("childProfile.documents", "Documenten")} samenvatting={docs.length ? t("childProfile.documentsLinked", "{{count}} documenten", { count: docs.length }) : t("childProfile.noDocuments", "Geen documenten gekoppeld")}/>
          {open === "docs" ? (
            <div className="mb-3 space-y-2">
              {docs.map((d) => (
                <Link key={d.id} to="/documenten" className="flex min-h-11 items-center gap-2 rounded-xl bg-card border border-border px-3.5 py-2 text-sm">
                  <span className="flex-1">{d.naam}</span>
                  <span className="text-[11px] text-ink-soft">{d.categorie}</span>
                </Link>
              ))}
              <Link to="/documenten" className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline pt-1">
                <span>{t("childProfile.addDocument", "+ Document toevoegen")}</span>
                <ChevronRight className="size-3.5" />
              </Link>
            </div>
          ) : null}
        </div>

        {/* Feest & verjaardag */}
        <div id="onderdeel-feest">
          <Rij id="feest" icoon={<AppIcon functie="feest" maat="md"/>} titel={t("childProfile.birthdayAndParties", "Verjaardag & feestjes")} samenvatting={k.geboortedatum ? t("childProfile.birthdayOnDate", "Jarig {{date}}", { date: k.geboortedatum }) : t("childProfile.birthdayAndWishes", "Verjaardag en wensen")}/>
          {open === "feest" ? (
            <div className="mb-3 space-y-2">
              <Button asChild variant="ghost" className="min-h-11 w-full justify-between">
                <Link to="/planning" search={{ toevoegen: "bijzonder", periode: `Verjaardag ${k.naam}` }}>
                  {t("childProfile.whoCelebratesWhen", "Wie viert wanneer?")}
                  <ChevronRight className="size-4 shrink-0 text-ink-soft" />
                </Link>
              </Button>
              <Button asChild variant="ghost" className="min-h-11 w-full justify-between">
                <Link to="/taken" search={{ taak: `Traktatie voor school · ${k.naam}`, kind: k.id }}>
                  {t("childProfile.schoolTreats", "Traktatie voor school")}
                  <ChevronRight className="size-4 shrink-0 text-ink-soft" />
                </Link>
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      {/* Child editing sheet connected directly to Supabase */}
      <ChildSheet
        open={childSheetOpen}
        onClose={() => setChildSheetOpen(false)}
        childToEdit={isCustom ? customData : { ...k, ...b }}
        onChildUpdated={() => {
          setChildSheetOpen(false);
          bevestig("Kindprofiel bijgewerkt");
        }}
      />
    </AppShell>);
}
