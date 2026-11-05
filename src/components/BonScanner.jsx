import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { GeldInvoer } from "@/components/GeldInvoer";
import { leesGeld } from "@/lib/geld-invoer";
import { useServerFn } from "@tanstack/react-start";
import { AppIcon, TekenLabel } from "@/components/AppIcon";
import { koppelUitgave, useBudgetten } from "@/lib/budget-store";
import { leesBon } from "@/lib/bon.functions";
const kinderOpties = ["Emma & Noah", "Emma", "Noah"];
const docCategorieen = ["Bonnen", "Schooldocumenten", "Medisch", "Verzekeringen", "Officiële afspraken", "Brieven", "Overig"];
/** Verklein de foto vóór het uitlezen, zodat het snel en zuinig blijft. */
async function verklein(dataUrl) {
    const img = new Image();
    img.src = dataUrl;
    await img.decode();
    const s = Math.min(1, 1400 / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * s);
    c.height = Math.round(img.height * s);
    c.getContext("2d")?.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.85);
}
export function BonScanner({ standaard = "kosten", standaardPct = 50, onKosten, onDocument, }) {
    const { t } = useTranslation();
    const invoer = useRef(null);
    const lees = useServerFn(leesBon);
    const afspraak = `${standaardPct} / ${100 - standaardPct}`;
    const verdeelOpties = [...new Set([afspraak, "50 / 50", "Volledig Sanne", "Volledig Joris"])];
    const [foto, setFoto] = useState(null);
    const [soort, setSoort] = useState(standaard);
    const [naam, setNaam] = useState("");
    const [winkel, setWinkel] = useState("");
    const [datum, setDatum] = useState("");
    const [bedrag, setBedrag] = useState("");
    const [kind, setKind] = useState(kinderOpties[0]);
    const [verdeling, setVerdeling] = useState(afspraak);
    const [categorie, setCategorie] = useState(docCategorieen[0]);
    const [ook, setOok] = useState(true);
    const [klaar, setKlaar] = useState(null);
    const [leest, setLeest] = useState(false);
    const [leesMelding, setLeesMelding] = useState(null);
    const budgetten = useBudgetten();
    const [koppel, setKoppel] = useState(null);
    const uitlezen = async (f) => {
        setLeest(true);
        setLeesMelding(null);
        try {
            const g = await lees({ data: { foto: f } });
            if (g.omschrijving)
                setNaam(g.omschrijving);
            if (g.winkel)
                setWinkel(g.winkel);
            if (g.datum) {
                const m = g.datum.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
                setDatum(m ? `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}` : /^\d{4}-\d{2}-\d{2}$/.test(g.datum) ? g.datum : "");
            }
            if (g.bedrag)
                setBedrag(String(g.bedrag).replace(".", ","));
            setLeesMelding(g.bedrag || g.winkel ? "Herkend — controleer de gegevens en pas aan waar nodig." : "Weinig herkend. Vul de gegevens zelf in.");
        }
        catch (e) {
            setLeesMelding(e instanceof Error ? e.message : "Uitlezen lukt nu even niet. Vul de gegevens zelf in.");
        }
        finally {
            setLeest(false);
        }
    };
    const kies = (f) => {
        if (!f)
            return;
        const r = new FileReader();
        r.onload = async () => {
            const ruw = String(r.result);
            setFoto(ruw);
            if (soort === "kosten") {
                try {
                    await uitlezen(await verklein(ruw));
                }
                catch {
                    setLeesMelding("Vul de gegevens zelf in.");
                }
            }
        };
        r.readAsDataURL(f);
        setKlaar(null);
    };
    /** Zelfde kind, bedrag binnen 10% van een afgesproken budget dat nog niet is uitgegeven. */
    const vindBudget = () => {
        const bedragNummer = leesGeld(bedrag) ?? 0;
        return budgetten.find((b) => b.status === "akkoord" && !b.kostId && Math.abs(b.max - bedragNummer) <= Math.max(2, b.max * 0.1) && (b.kind === kind || kind === "Emma & Noah"));
    };
    const omschr = () => naam.trim() ? (winkel.trim() && !naam.includes(winkel.trim()) ? `${naam.trim()} (${winkel.trim()})` : naam.trim()) : winkel.trim() || "Gescande bon";
    const finaliseer = (b) => {
        if (!foto)
            return;
        if (soort === "kosten") {
            const id = `bon-${Date.now()}`;
            const bedragNummer = leesGeld(bedrag) ?? 0;
            if (bedragNummer <= 0)
                return;
            const d = datum ? new Date(datum) : null;
            onKosten({ id, omschrijving: omschr(), bedrag: bedragNummer, kind, verdeling, foto, ...(d && !isNaN(+d) ? { datum: d.toLocaleDateString("nl-NL", { day: "numeric", month: "long" }) } : {}) });
            if (b)
                koppelUitgave(b.id, id, bedragNummer);
            if (ook)
                onDocument({ naam: `Bon: ${omschr()}`, categorie: "Bonnen", kind, foto });
            setKlaar(b ? `✓ Toegevoegd en gekoppeld aan ${b.wat}` : "✓ Toegevoegd bij kosten" + (ook ? " en bewaard bij documenten" : ""));
        }
        else {
            onDocument({ naam: naam.trim() || "Gescand document", categorie, kind, foto });
            setKlaar("✓ Bewaard bij documenten");
        }
        setFoto(null);
        setNaam("");
        setBedrag("");
        setWinkel("");
        setDatum("");
        setKoppel(null);
        setLeesMelding(null);
    };
    const opslaan = () => {
        if (!foto)
            return;
        if (soort === "kosten" && !koppel) {
            const b = vindBudget();
            if (b) {
                setKoppel(b);
                return;
            }
        }
        finaliseer(koppel ?? undefined);
    };
    const veld = "w-full rounded-xl bg-surface px-3 py-2 text-sm outline-none";
    const tab = (a) => `flex-1 rounded-xl py-2 text-xs font-semibold ${a ? "bg-brand text-primary-foreground" : "text-ink-soft"}`;
    return (<div className="rounded-lg border border-border p-4">
      <input ref={invoer} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { kies(e.target.files?.[0]); e.target.value = ""; }}/>
      {!foto ? (<>
          <button onClick={() => invoer.current?.click()} className="flex w-full items-center gap-3 rounded-md border border-dashed border-brand/40 bg-surface p-4 text-left">
            <AppIcon functie="foto" maat="lg"/>
            <span>
              <span className="block text-sm font-semibold">{t("bonScanner.uploadOrPhoto", "Bon fotograferen of uploaden")}</span>
              <span className="block text-xs text-ink-soft">{t("bonScanner.uploadDesc", "Bedrag, datum, winkel en omschrijving worden waar mogelijk herkend")}</span>
            </span>
          </button>
          {klaar ? <p className="mt-2 text-xs font-semibold text-brand">{klaar}</p> : null}
        </>) : (<div className="space-y-2">
          <img src={foto} alt={t("bonScanner.scannedReceipt", "Gescande bon")} className="max-h-56 w-full rounded-md object-contain bg-surface"/>
          <div className="flex rounded-md bg-surface p-1">
            <button onClick={() => setSoort("kosten")} className={tab(soort === "kosten")}><TekenLabel waarde={t("bonScanner.asExpense", "💶 Als kosten")}/></button>
            <button onClick={() => setSoort("document")} className={tab(soort === "document")}><TekenLabel waarde={t("bonScanner.asDocument", "📁 Als document")}/></button>
          </div>
          {leest ? <p role="status" className="animate-pulse rounded-md bg-muted p-2 text-xs text-ink-soft">{t("bonScanner.readingReceipt", "Bon wordt uitgelezen…")}</p> : leesMelding ? <p role="status" className="rounded-md bg-muted p-2 text-xs text-ink-soft">{leesMelding}</p> : null}
          <input className={veld} aria-label={t("expenses.modal.amount", "Omschrijving")} placeholder={soort === "kosten" ? t("bonScanner.descPlaceholderExpense", "Omschrijving, bijv. Schoolreisje") : t("bonScanner.descPlaceholderDoc", "Naam document")} value={naam} onChange={(e) => setNaam(e.target.value)}/>
          {soort === "kosten" ? (<>
              <div className="grid grid-cols-2 gap-2">
                <input className={veld} aria-label={t("bonScanner.store", "Winkel")} placeholder={t("bonScanner.store", "Winkel")} value={winkel} onChange={(e) => setWinkel(e.target.value)}/>
                <input className={veld} aria-label={t("bonScanner.date", "Datum")} type="date" value={datum} onChange={(e) => setDatum(e.target.value)}/>
              </div>
              <GeldInvoer label={t("bonScanner.amount", "Bedrag")} value={bedrag} onChange={setBedrag}/>
              <select className={veld} aria-label={t("bonScanner.split", "Verdeling")} value={verdeling} onChange={(e) => setVerdeling(e.target.value)}>
                {verdeelOpties.map((v) => <option key={v} value={v}>{v === afspraak ? t("bonScanner.splitAgreed", { v, defaultValue: `Volgens afspraak (${v})` }) : v}</option>)}
              </select>
            </>) : (<select className={veld} value={categorie} onChange={(e) => setCategorie(e.target.value)}>
              {docCategorieen.map((c) => <option key={c}>{c}</option>)}
            </select>)}
          <select className={veld} value={kind} onChange={(e) => setKind(e.target.value)}>
            {kinderOpties.map((k) => <option key={k}>{k}</option>)}
          </select>
          {soort === "kosten" ? (<label className="flex items-center gap-2 text-xs text-ink-soft">
              <input type="checkbox" checked={ook} onChange={(e) => setOok(e.target.checked)}/> {t("bonScanner.saveToDocsToo", "Bon ook bewaren bij documenten")}
            </label>) : null}
          {koppel ? (<div role="status" className="rounded-md border border-border bg-muted p-3">
              <p className="text-xs text-ink-soft">Hoort deze €{bedrag} bij <span className="font-semibold">{koppel.wat}</span> van {koppel.kind}?</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button onClick={() => finaliseer(koppel)} className="rounded-full bg-brand px-3 py-1 text-xs font-semibold text-primary-foreground">Ja, koppelen</button>
                <button onClick={() => { setKoppel(null); finaliseer(); }} className="rounded-full border border-border px-3 py-1 text-xs font-semibold">Andere kostenpost</button>
              </div>
            </div>) : null}
          <div className="flex gap-2">
            <button onClick={() => { setFoto(null); setKoppel(null); setLeesMelding(null); }} className="flex-1 rounded-xl bg-muted py-2 text-sm font-semibold text-ink-soft">{t("bonScanner.retry", "Opnieuw")}</button>
            <button onClick={opslaan} disabled={leest || (soort === "kosten" && !(leesGeld(bedrag) ?? 0))} className="flex-1 rounded-xl bg-brand py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40">{t("bonScanner.checkAndSave", "Controleren & opslaan")}</button>
          </div>
        </div>)}
    </div>);
}
