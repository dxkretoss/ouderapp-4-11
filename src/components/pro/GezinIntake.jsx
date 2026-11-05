import { useState } from "react";
import { differenceInYears, parseISO, isValid } from "date-fns";
import { Button } from "@/components/ui/button";
import { IK, legIntakeVast, vandaagIso } from "@/lib/pro-journaal-store";
const nieuwKind = () => ({ naam: "", geboortedatum: "", school: "", klas: "", regeling: "", bijzonder: "" });
const nieuwContact = () => ({ naam: "", organisatie: "", functie: "", contact: "", rol: "", samenwerking: "" });
const ouderVelden = [["dossier", "Dossiernaam", "text", true], ...[1, 2].flatMap((i) => [[`ouder${i}`, `Naam ouder ${i}`, "text", i === 1], [`email${i}`, `E-mailadres ouder ${i}`, "email"], [`tel${i}`, `Telefoonnummer ouder ${i}`, "tel"], [`adres${i}`, `Adres ouder ${i}`]]), ["situatie", "Gezinssituatie", "textarea"], ["gezag", "Gezag, indien bekend"]];
const redenVelden = [["datum", "Aanmelddatum", "date", true], ["verwijzer", "Verwijzer of aanmeldende instantie"], ["reden", "Reden van aanmelding", "textarea", true], ["hulpvraag", "Hulpvraag van ouders en/of kinderen", "textarea"], ["doelen", "Gewenste begeleidingsdoelen", "textarea"], ["aandacht", "Relevante aandachtspunten", "textarea"]];
const startVelden = [["rol", "Eigen rol", "text", true], ["start", "Startdatum begeleiding", "date", true], ["eerste", "Eerste afspraken en vervolgstappen", "textarea"]];
const kindLabels = { naam: "Naam kind", geboortedatum: "Geboortedatum", school: "School/kinderopvang", klas: "Groep of klas", regeling: "Huidige zorg- en woonregeling", bijzonder: "Praktische bijzonderheden" };
const contactLabels = { naam: "Naam", organisatie: "Organisatie", functie: "Functie", contact: "Contactgegevens", rol: "Rol bij het gezin", samenwerking: "Afspraken over samenwerking" };
const stappen = ["Gezin en ouders", "Kinderen", "Reden van aanmelding", "Andere betrokken hulpverlening", "Start begeleiding", "Samenvatting controleren"];
const inputStijl = "mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-normal";
const leeftijd = (g) => (g && isValid(parseISO(g)) ? differenceInYears(parseISO(vandaagIso()), parseISO(g)) : undefined);
export function GezinIntake({ open, onSluit, dossiers, onNieuwGezin, onOpen, onToegang }) {
    const [stap, setStap] = useState(0);
    const [bestaand, setBestaand] = useState("");
    const [velden, setVelden] = useState({ datum: vandaagIso(), start: vandaagIso() });
    const [kinderen, setKinderen] = useState([nieuwKind()]);
    const [contacten, setContacten] = useState([]);
    const [hulp, setHulp] = useState("");
    const [uitnodigen, setUitnodigen] = useState("");
    const [klaar, setKlaar] = useState(null);
    const [controle, setControle] = useState(false);
    const [melding, setMelding] = useState("");
    const gekozen = dossiers.find((d) => d.id === bestaand);
    const dubbel = !gekozen && !!velden['dossier']?.trim() && dossiers.find((d) => d.gezin.trim().toLowerCase() === velden['dossier']?.trim().toLowerCase());
    const veld = ([key, label, type = "text", vereist = false], values = velden, wijzig = (k, v) => setVelden((s) => ({ ...s, [k]: v })), suffix = "") => <label key={key} className="block text-sm font-semibold">{label}{!vereist && " (optioneel)"}{type === "textarea" ? <textarea aria-label={label + suffix} required={vereist} rows={2} value={values[key] ?? ""} onChange={(e) => wijzig(key, e.target.value)} className={inputStijl}/> : <input aria-label={label + suffix} type={type} max={key === "geboortedatum" ? vandaagIso() : undefined} required={vereist} value={values[key] ?? ""} onChange={(e) => wijzig(key, e.target.value)} className={inputStijl}/>}</label>;
    const overzicht = [
        `Gezin: ${gekozen?.gezin ?? velden['dossier'] ?? ""}`,
        ...(gekozen ? [`Bestaande ouders: ${gekozen.ouders}. Kinderen: ${gekozen.kinderen.join(", ")}.`] : []),
        ...[...(gekozen ? ouderVelden.slice(-2) : ouderVelden), ...redenVelden, ...startVelden].filter(([k]) => velden[k]?.trim()).map(([k, l]) => `${l}: ${velden[k]}`),
        ...(gekozen ? (velden['kindAanvulling'] ? [`Aanvullende kindinformatie: ${velden['kindAanvulling']}`] : []) : kinderen.map((k, i) => `Kind ${i + 1}:\n${Object.entries(k).filter(([, v]) => v).map(([l, v]) => `${kindLabels[l]}: ${v}`).join("\n")}`)),
        `Andere hulpverlening: ${hulp || "nog niet bekend"}`,
        ...(hulp === "Ja" ? contacten.map((c, i) => `Professional ${i + 1}:\n${Object.entries(c).filter(([, v]) => v).map(([k, v]) => `${contactLabels[k]}: ${v}`).join("\n")}`) : []),
        `Eigen professional: ${IK}. Voorbereiden: ${uitnodigen || "later bepalen"} (niet uitgevoerd).`,
        "Toegang tot gezinsgegevens: staat uit tot de ouders toestemming geven. Ouders worden niet uitgenodigd.",
    ].join("\n\n");
    const v = (k) => velden[k]?.trim() ?? "";
    const reset = () => { setStap(0); setBestaand(""); setVelden({ datum: vandaagIso(), start: vandaagIso() }); setKinderen([nieuwKind()]); setContacten([]); setHulp(""); setUitnodigen(""); setKlaar(null); setControle(false); setMelding(""); };
    const sluit = () => { if (klaar)
        reset(); onSluit(); };
    const afronden = () => {
        const ks = kinderen.filter((k) => k.naam.trim());
        const id = gekozen?.id ?? onNieuwGezin({ gezin: v("dossier"), ouders: [v("ouder1"), v("ouder2")].filter(Boolean).join(" & "), kinderen: ks.map((k) => { const l = leeftijd(k.geboortedatum ?? ""); return l === undefined ? k.naam.trim() : `${k.naam.trim()} – ${l} jaar`; }) });
        const ouderContact = [1, 2].map((i) => [v(`ouder${i}`), v(`email${i}`), v(`tel${i}`), v(`adres${i}`)].filter(Boolean).join(" · ")).filter((x) => x.includes(" · "));
        const kindInfo = gekozen ? [v("kindAanvulling")] : ks.map((k) => [k.naam.trim(), k.geboortedatum && `geboren ${k.geboortedatum}`, k.school && `school: ${k.school}`, k.klas && `groep/klas: ${k.klas}`, k.bijzonder].filter(Boolean).join(" · "));
        legIntakeVast(id, { datum: v("datum"), verwijzer: v("verwijzer"), reden: v("reden"), hulpvraag: v("hulpvraag"), aandacht: v("aandacht"), hulpverleners: hulp === "Ja" ? contacten.filter((c) => c.naam.trim() || c.organisatie.trim()) : [] }, { gezag: v("gezag"), regeling: gekozen ? "" : ks.filter((k) => k.regeling.trim()).map((k) => (ks.length > 1 ? `${k.naam.trim()}: ${k.regeling.trim()}` : k.regeling.trim())).join("; "), start: v("start"), praktisch: v("eerste"), overig: [v("situatie"), ...ouderContact, ...kindInfo].filter(Boolean).join(" | ") }, v("doelen").split(/\n|;/), { rol: v("rol"), start: v("start") });
        return id;
    };
    const klaarGezin = dossiers.find((d) => d.id === klaar)?.gezin ?? (v("dossier") || "het gezin");
    if (!open)
        return null;
    const voortgang = <ol aria-label="Voortgang intake" className="mt-5 grid grid-cols-5 gap-1.5">{stappen.slice(0, 5).map((t, i) => { const status = i < stap ? "klaar" : i === stap ? "nu" : "later"; return <li key={t} aria-current={status === "nu" ? "step" : undefined} className="min-w-0"><span className={`block h-1.5 rounded-full ${status === "later" ? "bg-border" : "bg-primary"}`}/><span className={`mt-1.5 block text-xs leading-snug sm:text-sm ${status === "nu" ? "font-semibold text-ink" : "text-ink-soft"}`}><span className="sm:hidden">{i + 1}</span><span className="hidden sm:inline">{i + 1}. {t}</span></span></li>; })}</ol>;
    return <div className="mx-auto w-full max-w-2xl">
    <button type="button" onClick={sluit} className="mb-3 inline-flex min-h-[44px] items-center gap-1.5 rounded-md text-sm font-medium text-ink-soft transition-colors hover:text-ink"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="size-4 shrink-0" aria-hidden><path d="M14 6l-6 6 6 6"/></svg>Terug naar overzicht</button>
    <h1 className="font-display text-2xl">Nieuw gezin aanmelden</h1>
    <p className="mt-1 text-sm text-ink-soft">Prototype · gegevens blijven alleen tijdens dit bezoek bewaard en verdwijnen na herladen.</p>
    {!klaar && voortgang}
    {klaar ? <div className="mt-6 space-y-3"><h3 className="font-display text-lg">Intake vastgelegd bij {klaarGezin}</h3><p className="text-sm">Je vindt de gegevens in het dossier onder Dossiergegevens: aanmelding (intern), doelen en betrokken hulpverlening. Ingevulde velden zijn aangevuld, bestaande gegevens zijn niet gewist.</p><p className="text-sm">Toegang tot gezinsgegevens staat uit totdat de ouders toestemming geven. Er is niemand uitgenodigd.</p><p className="text-xs text-ink-soft">Tijdelijk: na herladen zijn deze gegevens weg.</p><div className="flex flex-wrap gap-2"><Button onClick={() => { const id = klaar; reset(); onOpen(id); }}>Dossier openen</Button><Button variant="outline" onClick={() => { reset(); onToegang(); }}>Toegangsaanvraag openen</Button><Button variant="ghost" onClick={sluit}>Sluiten</Button></div></div> : <form className="mt-6 space-y-4" onSubmit={(e) => { e.preventDefault(); if (dubbel)
            return; if (stap < 5) {
            setStap(stap + 1);
            setMelding("");
        }
        else if (controle)
            setKlaar(afronden()); }}>
      <p className="text-xs text-ink-soft">{stap < 5 ? `Stap ${stap + 1} van 5` : "Controleren vóór afronden"}</p><h3 className="font-display text-lg">{stappen[stap]}</h3>
      {stap === 0 && <><label className="block text-sm font-semibold">Bestaat het gezin al?<select aria-label="Bestaat het gezin al?" value={bestaand} onChange={(e) => setBestaand(e.target.value)} className={inputStijl}><option value="">Nieuw gezin voorbereiden</option>{dossiers.map((d) => <option key={d.id} value={d.id}>{d.gezin}</option>)}</select></label>{gekozen ? <p className="text-sm">{gekozen.gezin} · {gekozen.ouders}. Deze intake verwijst naar het bestaande gezin; er wordt geen kopie gemaakt.</p> : null}{(gekozen ? ouderVelden.slice(-2) : ouderVelden).map((v) => veld(v))}{dubbel && <p role="alert" className="text-sm">Dit dossier bestaat al. Kies {dubbel.gezin} hierboven om een dubbel gezin te voorkomen.</p>}</>}
      {stap === 1 && <>{gekozen ? <><p className="text-sm">Bestaande kinderen: {gekozen.kinderen.join(" · ")}</p><p className="text-xs text-ink-soft">Geboortedatums en gekoppelde schoolgegevens zijn hier nog niet beschikbaar. Er worden geen kindprofielen gekopieerd.</p>{veld(["kindAanvulling", "Aanvullende praktische kindinformatie", "textarea"])}</> : <>{kinderen.map((k, i) => <fieldset key={i} className="space-y-2 border-t border-border pt-3"><legend className="font-semibold">Kind {i + 1}</legend>{Object.keys(kindLabels).map((key) => veld([key, kindLabels[key], key === "geboortedatum" ? "date" : "text", key === "naam"], k, (key, value) => setKinderen((ks) => ks.map((v, j) => j === i ? { ...v, [key]: value } : v)), ` ${i + 1}`))}{k.geboortedatum && isValid(parseISO(k.geboortedatum)) && <p className="text-xs text-ink-soft">Leeftijd: {differenceInYears(parseISO(vandaagIso()), parseISO(k.geboortedatum))} jaar</p>}{kinderen.length > 1 && <Button type="button" variant="ghost" onClick={() => setKinderen((ks) => ks.filter((_, j) => j !== i))}>Kind verwijderen</Button>}</fieldset>)}<Button type="button" variant="outline" onClick={() => setKinderen((ks) => [...ks, nieuwKind()])}>Kind toevoegen</Button></>}</>}
      {stap === 2 && redenVelden.map((v) => veld(v))}
      {stap === 3 && <><label className="block text-sm font-semibold">Is er andere hulpverlening betrokken?<select aria-label="Is er andere hulpverlening betrokken?" value={hulp} onChange={(e) => { setHulp(e.target.value); if (e.target.value === "Ja" && !contacten.length)
            setContacten([nieuwContact()]); }} className={inputStijl}><option value="">Nog niet bekend</option><option>Ja</option><option>Nee</option></select></label>{hulp === "Ja" && <>{contacten.map((c, i) => <fieldset key={i} className="space-y-2 border-t border-border pt-3"><legend className="font-semibold">Professional {i + 1}</legend>{Object.keys(contactLabels).map((key) => veld([key, contactLabels[key]], c, (key, value) => setContacten((cs) => cs.map((v, j) => i === j ? { ...v, [key]: value } : v)), ` professional ${i + 1}`))}<Button type="button" variant="ghost" onClick={() => setContacten((cs) => cs.filter((_, j) => j !== i))}>Professional verwijderen</Button></fieldset>)}<Button type="button" variant="outline" onClick={() => setContacten((cs) => [...cs, nieuwContact()])}>Professional toevoegen</Button><p className="text-xs text-ink-soft">Dit zijn contactgegevens. Deze personen krijgen geen toegang tot de app.</p></>}</>}
      {stap === 4 && <><p className="text-sm">Jouw naam: {IK}</p>{startVelden.map((v) => veld(v))}<label className="block text-sm font-semibold">Ouders uitnodigen of koppelen<select aria-label="Ouders uitnodigen of koppelen" value={uitnodigen} onChange={(e) => setUitnodigen(e.target.value)} className={inputStijl}><option value="">Later bepalen</option><option>Uitnodiging voorbereiden</option><option>Koppeling aan bestaand gezin voorbereiden</option></select></label><section className="border-y border-border py-3"><h4 className="font-semibold">Nog te regelen vóór toegang</h4><ul className="mt-2 list-disc pl-5 text-sm"><li>Toestemming van beide ouders, waar vereist</li><li>Uitnodiging geaccepteerd en ouder gekoppeld</li><li>Per onderdeel expliciet gekozen toegangsrechten</li><li>Betrokken hulpverleners krijgen standaard geen toegang</li></ul><p className="mt-2 text-xs text-ink-soft">Dit formulier verleent geen rechten. Na afronden kun je de toegangsaanvraag openen.</p></section></>}
      {stap === 5 && <><p className="text-xs text-ink-soft">Professionele intake · intern. Geen automatische deling met ouders of andere professionals.</p><p className="whitespace-pre-wrap break-words text-sm">{overzicht}</p><label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={controle} onChange={(e) => setControle(e.target.checked)} className="mt-1"/>Ik heb de intake gecontroleerd.</label></>}
      {melding && <p role="status" className="text-xs text-ink-soft">{melding}</p>}
      <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center gap-2 border-t border-border bg-background px-4 py-3 sm:mx-0 sm:px-0">{stap > 0 && <Button type="button" variant="outline" onClick={() => { setStap(stap - 1); setControle(false); }}>Vorige</Button>}<Button type="submit" disabled={!!dubbel || (stap === 5 && !controle)}>{stap === 5 ? "Intake afronden" : "Volgende"}</Button><Button type="button" variant="ghost" onClick={() => setMelding("Concept blijft tijdelijk beschikbaar bij sluiten en opnieuw openen; herladen wist de invoer.")}>Concept tijdelijk bewaren</Button><Button type="button" variant="ghost" onClick={sluit}>Sluiten</Button></div>
    </form>}
  </div>;
}
