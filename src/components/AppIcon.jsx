import { Archive, Baby, Backpack, Banknote, Bell, Bike, BookMarked, BookOpen, Brain, Briefcase, CalendarDays, CalendarRange, Camera, Car, CircleCheck, CircleDot, CircleHelp, CircleX, ClipboardList, Clock, Copy, Cloud, CloudLightning, CloudSun, Contact, CreditCard, Cake, Download, Dumbbell, Eye, FileText, FolderOpen, Feather, Flag, Gift, Handshake, Headphones, Heart, HeartPulse, History, Home, Hourglass, IdCard, Info, KeyRound, LayoutGrid, Lightbulb, Link, ListChecks, Lock, Luggage, Mail, MapPin, Megaphone, MessageCircle, Mic, Moon, Newspaper, NotebookPen, Package, PawPrint, PencilLine, Phone, Piano, Pill, Pin, Plane, Receipt, RefreshCw, Ruler, Scale, School, Search, Send, Settings, ShieldCheck, Shirt, Smile, Sparkles, Stethoscope, Sun, Smartphone, Star, Snowflake, Target, ThumbsDown, ThumbsUp, ToyBrick, TrendingUp, TriangleAlert, Trophy, Umbrella, Upload, UserRound, UserRoundCog, UsersRound, Utensils, Video, Wallet, Waves, Waypoints, Meh, Frown, PartyPopper, Siren, Footprints, ShoppingBasket, HandCoins, Split, Plus, } from "lucide-react";
/**
 * Eén centrale mapping: dezelfde functie = overal hetzelfde icoon en dezelfde kleur.
 * Icoon = dunne outline, kleur = één zachte toon binnen een ronde badge.
 */
export const iconen = {
    home: { icoon: Home, toon: "salie" },
    toevoegen: { icoon: Plus, toon: "salie" },
    kopieren: { icoon: Copy, toon: "blauwgrijs" },
    agenda: { icoon: CalendarDays, toon: "blauw" },
    berichten: { icoon: MessageCircle, toon: "lavendel" },
    kosten: { icoon: Banknote, toon: "groen" },
    meer: { icoon: LayoutGrid, toon: "taupe" },
    kinderen: { icoon: Baby, toon: "salie" },
    taken: { icoon: ListChecks, toon: "blauw" },
    momentjes: { icoon: Heart, toon: "koraal" },
    documenten: { icoon: FileText, toon: "blauwgrijs" },
    zorgregeling: { icoon: CalendarRange, toon: "salie" },
    overdracht: { icoon: Backpack, toon: "klei" },
    voorstel: { icoon: NotebookPen, toon: "lavendel" },
    wijziging: { icoon: History, toon: "taupe" },
    samen: { icoon: Waypoints, toon: "klei" },
    wissel: { icoon: RefreshCw, toon: "klei" },
    vakantie: { icoon: Sun, toon: "honing" },
    professionals: { icoon: UserRoundCog, toon: "blauwgrijs" },
    ondersteuning: { icoon: UsersRound, toon: "blauwgrijs" },
    juridisch: { icoon: Scale, toon: "taupe" },
    veiligheid: { icoon: ShieldCheck, toon: "blauwgrijs" },
    instellingen: { icoon: Settings, toon: "taupe" },
    hulp: { icoon: CircleHelp, toon: "honing" },
    afspraak: { icoon: Handshake, toon: "salie" },
    post: { icoon: Mail, toon: "lavendel" },
    slim: { icoon: Sparkles, toon: "honing" },
    // Overige functies (ook hier: één icoon + één toon per functie)
    school: { icoon: School, toon: "blauw" },
    opvang: { icoon: ToyBrick, toon: "salie" },
    sport: { icoon: Dumbbell, toon: "klei" },
    zwemmen: { icoon: Waves, toon: "blauw" },
    muziek: { icoon: Piano, toon: "lavendel" },
    medisch: { icoon: Stethoscope, toon: "koraal" },
    medicijn: { icoon: Pill, toon: "koraal" },
    noodkaart: { icoon: HeartPulse, toon: "koraal" },
    nood: { icoon: Siren, toon: "koraal" },
    verjaardag: { icoon: Cake, toon: "honing" },
    cadeau: { icoon: Gift, toon: "koraal" },
    feest: { icoon: PartyPopper, toon: "koraal" },
    foto: { icoon: Camera, toon: "koraal" },
    video: { icoon: Video, toon: "blauw" },
    bellen: { icoon: Phone, toon: "blauw" },
    telefoon: { icoon: Smartphone, toon: "blauw" },
    spraak: { icoon: Mic, toon: "lavendel" },
    opname: { icoon: Headphones, toon: "taupe" },
    notitie: { icoon: PencilLine, toon: "blauwgrijs" },
    logboek: { icoon: BookMarked, toon: "blauwgrijs" },
    boek: { icoon: BookOpen, toon: "blauw" },
    map: { icoon: FolderOpen, toon: "taupe" },
    bon: { icoon: Receipt, toon: "groen" },
    betaalverzoek: { icoon: HandCoins, toon: "blauw" },
    delen: { icoon: Split, toon: "honing" },
    exporteren: { icoon: Upload, toon: "blauw" },
    importeren: { icoon: Download, toon: "blauw" },
    lijst: { icoon: ClipboardList, toon: "blauw" },
    slot: { icoon: Lock, toon: "blauwgrijs" },
    link: { icoon: Link, toon: "blauw" },
    oog: { icoon: Eye, toon: "blauwgrijs" },
    tijd: { icoon: Clock, toon: "taupe" },
    afstemmen: { icoon: Handshake, toon: "koraal" },
    ziek: { icoon: Stethoscope, toon: "koraal" },
    later: { icoon: Clock, toon: "honing" },
    ophalen: { icoon: Car, toon: "klei" },
    planwijziging: { icoon: RefreshCw, toon: "blauw" },
    iets: { icoon: MessageCircle, toon: "lavendel" },
    wachten: { icoon: Hourglass, toon: "taupe" },
    geschiedenis: { icoon: History, toon: "taupe" },
    melding: { icoon: Bell, toon: "honing" },
    locatie: { icoon: MapPin, toon: "klei" },
    slapen: { icoon: Moon, toon: "lavendel" },
    eten: { icoon: Utensils, toon: "honing" },
    kleding: { icoon: Shirt, toon: "klei" },
    maten: { icoon: Ruler, toon: "klei" },
    schoenen: { icoon: Footprints, toon: "klei" },
    auto: { icoon: Car, toon: "taupe" },
    fiets: { icoon: Bike, toon: "salie" },
    vliegen: { icoon: Plane, toon: "blauw" },
    reis: { icoon: Luggage, toon: "honing" },
    identiteit: { icoon: IdCard, toon: "blauwgrijs" },
    persoon: { icoon: UserRound, toon: "taupe" },
    ster: { icoon: Star, toon: "honing" },
    mijlpaal: { icoon: Trophy, toon: "honing" },
    doel: { icoon: Target, toon: "klei" },
    waardering: { icoon: ThumbsUp, toon: "salie" },
    afwijzen: { icoon: ThumbsDown, toon: "taupe" },
    twijfel: { icoon: Brain, toon: "lavendel" },
    vrolijk: { icoon: Smile, toon: "honing" },
    rust: { icoon: Feather, toon: "salie" },
    stil: { icoon: Meh, toon: "taupe" },
    verdrietig: { icoon: Frown, toon: "blauw" },
    info: { icoon: Info, toon: "blauwgrijs" },
    actie: { icoon: CircleDot, toon: "koraal" },
    letop: { icoon: TriangleAlert, toon: "honing" },
    akkoord: { icoon: CircleCheck, toon: "salie" },
    niet: { icoon: CircleX, toon: "koraal" },
    dier: { icoon: PawPrint, toon: "salie" },
    sleutel: { icoon: KeyRound, toon: "honing" },
    portemonnee: { icoon: Wallet, toon: "groen" },
    kaart: { icoon: CreditCard, toon: "blauw" },
    trend: { icoon: TrendingUp, toon: "groen" },
    werk: { icoon: Briefcase, toon: "taupe" },
    nieuws: { icoon: Newspaper, toon: "blauwgrijs" },
    archief: { icoon: Archive, toon: "taupe" },
    boodschappen: { icoon: ShoppingBasket, toon: "honing" },
    doos: { icoon: Package, toon: "klei" },
    zoeken: { icoon: Search, toon: "blauw" },
    weer: { icoon: CloudSun, toon: "blauw" },
    regen: { icoon: Umbrella, toon: "blauw" },
    zon: { icoon: Sun, toon: "honing" },
    bewolkt: { icoon: Cloud, toon: "blauwgrijs" },
    sneeuw: { icoon: Snowflake, toon: "blauw" },
    onweer: { icoon: CloudLightning, toon: "honing" },
    nacht: { icoon: Moon, toon: "lavendel" },
    idee: { icoon: Lightbulb, toon: "honing" },
    co: { icoon: Lightbulb, toon: "groen" },
    sturen: { icoon: Send, toon: "lavendel" },
    merk: { icoon: Pin, toon: "taupe" },
    overig: { icoon: Pin, toon: "taupe" },
    beslissing: { icoon: Scale, toon: "taupe" },
    omroep: { icoon: Megaphone, toon: "honing" },
    contact: { icoon: Contact, toon: "blauwgrijs" },
    vlag: { icoon: Flag, toon: "klei" },
};
const maten = {
    sm: { box: "size-7", ic: "size-3.5" },
    md: { box: "size-9", ic: "size-[18px]" },
    lg: { box: "size-11", ic: "size-[22px]" },
};
/**
 * Warm, licht gekleurd producticoon: dunne outline in één zachte kleur,
 * altijd binnen een ronde badge. `vorm`: "zacht" = met badge, "kaal" = alleen het icoon.
 */
export function AppIcon({ functie, maat = "md", vorm = "zacht", actief = true, className = "" }) {
    const def = iconen[functie] ?? iconen.meer;
    const Icon = def.icoon;
    const kleur = `var(--ic-${def.toon})`;
    const m = maten[maat];
    const svg = <Icon aria-hidden="true" className={m.ic} strokeWidth={1.75} style={{ color: kleur, opacity: actief ? 1 : 0.62, fill: actief && vorm === "kaal" ? `color-mix(in oklab, ${kleur} 18%, transparent)` : undefined }}/>;
    if (vorm === "kaal")
        return <span className={`inline-grid place-items-center ${className}`}>{svg}</span>;
    return (<span className={`grid shrink-0 place-items-center rounded-full ${m.box} ${className}`} style={{ background: `color-mix(in oklab, ${kleur} 15%, var(--background))` }}>
      {svg}
    </span>);
}
/** Tekens die in de data staan (oud-forfait) → dezelfde functie, dus hetzelfde icoon. */
const tekenFunctie = {
    "🏫": "school", "📚": "boek", "📓": "logboek", "📝": "notitie", "📄": "documenten",
    "📁": "map", "🧾": "bon", "📤": "exporteren", "📋": "lijst", "📌": "overig",
    "📍": "locatie", "📅": "agenda", "📆": "agenda", "🔔": "melding", "🔒": "slot",
    "🔗": "link", "👀": "oog", "🕓": "tijd", "🕰": "geschiedenis", "🗂": "map",
    "💬": "berichten", "📞": "bellen", "🎥": "video", "🎙": "spraak", "🎧": "opname",
    "📱": "telefoon", "📷": "foto", "📸": "foto", "💶": "kosten", "🤝": "samen",
    "⚖": "beslissing", "🛡": "veiligheid", "🛂": "identiteit", "🆘": "noodkaart",
    "🚨": "nood", "🛟": "ondersteuning", "🔁": "wissel", "🔄": "wissel",
    "🎒": "overdracht", "🏠": "home", "🏡": "home", "🌙": "slapen", "🌴": "vakantie",
    "☀": "vakantie", "⚽": "sport", "🏊": "zwemmen", "🎹": "muziek", "🚲": "fiets",
    "🚗": "auto", "✈": "vliegen", "🧳": "reis", "🍽": "eten", "🍪": "eten", "🥞": "eten",
    "🧥": "kleding", "👕": "kleding", "👟": "schoenen", "💊": "medisch", "🩺": "medisch",
    "🎂": "verjaardag", "🎁": "cadeau", "🎉": "feest", "⭐": "ster", "🌟": "ster",
    "✨": "slim", "🕊": "rust", "💛": "momentjes", "💚": "momentjes", "❤": "momentjes",
    "🥰": "momentjes", "👧": "kinderen", "👤": "persoon", "🧸": "opvang", "😊": "vrolijk",
    "😄": "vrolijk", "🙂": "vrolijk", "😌": "rust", "😕": "twijfel", "😐": "stil",
    "😟": "stil", "😢": "verdrietig", "😴": "slapen", "🤔": "twijfel", "🤐": "stil",
    "👍": "waardering", "👎": "afwijzen", "👏": "waardering", "🎯": "doel", "🐬": "dier",
    "🐐": "dier", "🔵": "info", "🔴": "opname", "🟠": "actie", "⚙": "instellingen",
    "ℹ": "info", "⚠": "letop", "❓": "hulp", "💡": "idee", "🔑": "sleutel",
};
/** Zet een teken uit de data (of een functienaam) om naar een functie. */
export function functieUitTeken(waarde) {
    const schoon = waarde.replace(/\uFE0F/g, "").trim();
    if (tekenFunctie[schoon])
        return tekenFunctie[schoon];
    if (schoon in iconen)
        return schoon;
    return "meer";
}
/** Icoon dat een teken uit de data toont in dezelfde badge-stijl als alles elders. */
export function Pictogram({ waarde, maat = "md", vorm = "zacht", actief = true, className = "" }) {
    return <AppIcon functie={functieUitTeken(waarde)} maat={maat} vorm={vorm} actief={actief} className={className}/>;
}
const TEKEN = /^[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}]/u;
const TEKEN_IN_TEKST = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}]\uFE0F?/gu;
/**
 * Tekst die ergens een teken bevat (bijv. een ouder die "🍪" typte):
 * geeft het teken terug plus de tekst zonder dat teken, voor weergave met een icoon.
 */
export function tekstMetIcoon(tekst) {
    const gevonden = tekst.match(TEKEN_IN_TEKST);
    if (!gevonden)
        return { tekst };
    const schoon = tekst
        .replace(TEKEN_IN_TEKST, "")
        .replace(/[ \t]{2,}/g, " ")
        .replace(/\s+([,.!?;:])/g, "$1")
        .trim();
    return { teken: gevonden[0], tekst: schoon };
}
/** Staat een tekst met een teken (uit de data) voorop? */
export const tekenStart = (s) => TEKEN.test(s.trim());
/** Tekst zonder het voorloopteken, voor weergave naast een icoon. */
export const tekstZonderTeken = (s) => s.replace(TEKEN, "").replace(/^\uFE0F/, "").replace(/^\s+/, "");
/**
 * Label dat in de data met een teken begint: toont hetzelfde icoon als elders,
 * plus de tekst zonder het teken. Teksten zonder teken blijven zoals ze zijn.
 */
export function TekenLabel({ waarde, maat = "sm", className = "" }) {
    if (!tekenStart(waarde))
        return <>{waarde}</>;
    return (<span className={`inline-flex items-center gap-1.5 ${className}`}>
      <Pictogram waarde={waarde} maat={maat} vorm="kaal"/>
      {tekstZonderTeken(waarde)}
    </span>);
}
