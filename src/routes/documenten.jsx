import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { FilterBalk, OverzichtKaart } from "@/components/ui-kit";
import { AppShell, PageHeader } from "@/components/AppShell";
import { BonScanner } from "@/components/BonScanner";
import { documenten } from "@/lib/demo-data";
import { OuderschapsplanImport } from "@/components/OuderschapsplanImport";
import { SchoolinfoUitlezen } from "@/components/SchoolinfoUitlezen";
import { Pictogram } from "@/components/AppIcon";
import { Button } from "@/components/ui/button";
import { useStart } from "@/lib/start-store";
import { bevestig } from "@/lib/feedback";
import { useNavigate } from "@tanstack/react-router";
function DocumentenWrap() {
    const st = useStart();
    if (st.eigen)
        return <EigenDocumenten />;
    return <Documenten />;
}
function EigenDocumenten() {
    const { t } = useTranslation();
    const st = useStart();
    const nav = useNavigate();
    const upload = useRef(null);
    const [lijst, setLijst] = useState([]);
    const [kind, setKind] = useState(st.kinderen[0]?.naam ?? "Hele gezin");
    const kies = (f) => {
        if (!f)
            return;
        setLijst((l) => [{ id: String(Date.now()), naam: f.name, kind, datum: "Vandaag" }, ...l]);
        bevestig("Document toegevoegd", { uitleg: f.name });
    };
    return (<AppShell>
      <PageHeader titel={t("documents.headerTitle", "Documenten")} subtitel={t("documents.headerSubtitle", "Veilig gedeeld tussen jullie beiden")} actie={<button aria-label={t("documents.uploadAria", "Document uploaden")} onClick={() => upload.current?.click()} className="inline-flex size-11 items-center justify-center rounded-full text-xl font-semibold text-brand hover:bg-muted">+</button>}/>
      <input ref={upload} type="file" className="hidden" aria-label={t("documents.chooseDocAria", "Document kiezen")} accept=".pdf,.doc,.docx,.txt,image/*" onChange={(e) => { kies(e.target.files?.[0]); e.target.value = ""; }}/>
      {st.kinderen.length ? (<select value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Voor welk kind" className="mt-4 w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
          {st.kinderen.map((k) => <option key={k.id} value={k.naam}>{k.naam}</option>)}
          <option value="Hele gezin">{t("documents.wholeFamily", "Hele gezin")}</option>
        </select>) : null}
      {!lijst.length ? (<div className="mt-10 flex flex-col items-center text-center">
          <p className="font-display text-lg font-bold">{t("documents.emptyTitle", "Hier is het nog rustig")}</p>
          <p className="mt-1 max-w-xs text-sm text-ink-soft">{t("documents.emptyDesc", "Hier staan straks de documenten van je gezin, zoals schoolinformatie en afspraken.")}</p>
          <button onClick={() => upload.current?.click()} className="mt-5 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-primary-foreground">{t("documents.uploadFirstDocument", "Eerste document uploaden")}</button>
          <button onClick={() => nav({ to: "/meer" })} className="mt-3 min-h-11 text-sm font-semibold text-ink-soft">{t("documents.backToMenu", "Terug naar Menu")}</button>
        </div>) : (<ul className="mt-4 divide-y divide-border rounded-md border border-border bg-card">
          {lijst.map((d) => (<li key={d.id} className="flex items-center gap-3 px-3 py-3">
              <span className="flex-1"><span className="block text-sm font-semibold">{d.naam}</span>
                <span className="block text-xs text-ink-soft">{d.kind} · {d.datum}</span></span>
            </li>))}
        </ul>)}
    </AppShell>);
}
export const Route = createFileRoute("/documenten")({
    head: () => ({
        meta: [
            { title: "Documenten — Ouderschap & Co" },
            { name: "description", content: "Ouderschapsplan, schoolrapporten, medische papieren en verzekeringen veilig gedeeld." },
            { property: "og:title", content: "Documenten — Ouderschap & Co" },
            { property: "og:description", content: "Alle belangrijke documenten van de kinderen op één plek." },
            { property: "og:type", content: "website" },
            { name: "twitter:card", content: "summary" },
        ],
    }),
    component: DocumentenWrap,
});
function Documenten() {
    const { t } = useTranslation();
    const [alle, setAlle] = useState(documenten);
    const upload = useRef(null);
    const [bestand, setBestand] = useState(null);
    const [uploadNaam, setUploadNaam] = useState("");
    const [uploadKind, setUploadKind] = useState("Emma & Noah");
    const [uploadStatus, setUploadStatus] = useState("");
    const cats = ["Alles", ...Array.from(new Set(alle.map((d) => d.categorie)))];
    const [cat, setCat] = useState("Alles");
    const lijst = alle.filter((d) => cat === "Alles" || d.categorie === cat);
    return (<AppShell>
      <PageHeader titel="Documenten" subtitel="Veilig gedeeld tussen jullie beiden"/>
      <div className="mt-5">
        <OuderschapsplanImport onOpgeslagen={(d) => setAlle((l) => [{ id: String(Date.now()), naam: d.naam, categorie: "Officiële afspraken", kind: "Emma & Noah", gewijzigd: "Vandaag", grootte: d.grootte, icoon: "📄" }, ...l])}/>
      </div>
      <div className="mt-3"><SchoolinfoUitlezen /></div>
      <div className="mt-5">
        <BonScanner standaard="document" onDocument={(d) => setAlle((l) => [{ id: String(Date.now()), naam: d.naam, categorie: d.categorie, kind: d.kind, gewijzigd: "Vandaag", grootte: "Foto", icoon: d.categorie === "Bonnen" ? "🧾" : "📷" }, ...l])} onKosten={(k) => setAlle((l) => [{ id: String(Date.now()), naam: `Bon: ${k.omschrijving}`, categorie: "Bonnen", kind: k.kind, gewijzigd: "Vandaag", grootte: "Foto", icoon: "🧾" }, ...l])}/>
      </div>
      <FilterBalk className="mt-5" opties={cats} waarde={cat} onChange={setCat}/>
      <div className="mt-4 space-y-3">
        {lijst.map((d) => (<div key={d.id} id={`item-${d.id}`} className="zoekdoel rounded-md"><OverzichtKaart icoon={<Pictogram waarde={d.icoon} maat="md" vorm="kaal"/>} titel={d.naam} sub={`${d.kind} · ${d.gewijzigd} · ${d.grootte}`}/></div>))}
      </div>
      <input ref={upload} type="file" className="hidden" aria-label="Document kiezen" accept=".pdf,.doc,.docx,.txt,image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) {
        setBestand(f);
        setUploadNaam(f.name);
        setUploadStatus("");
    } e.target.value = ""; }}/>
      <Button onClick={() => upload.current?.click()} className="mt-5 min-h-11 w-full bg-brand text-primary-foreground shadow-none">
        + {t("documents.uploadDocument", "Document uploaden")}
      </Button>
      {bestand ? <form className="mt-3 space-y-3 border-y border-border py-4" onSubmit={(e) => { e.preventDefault(); if (!uploadNaam.trim())
            return; setAlle((l) => [{ id: `upload-${Date.now()}`, naam: uploadNaam.trim(), categorie: "Overig", kind: uploadKind, gewijzigd: "Vandaag", grootte: `${Math.max(1, Math.round(bestand.size / 1024))} KB`, icoon: "📄" }, ...l]); setCat("Alles"); setBestand(null); setUploadStatus("Document toegevoegd aan dit overzicht."); }}>
        <label className="block text-xs font-semibold">{t("documents.docNameLabel", "Naam document")}<input aria-label="Naam document" value={uploadNaam} onChange={(e) => setUploadNaam(e.target.value)} required className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"/></label>
        <label className="block text-xs font-semibold">{t("documents.forWhoLabel", "Voor wie?")}<select aria-label="Document voor wie" value={uploadKind} onChange={(e) => setUploadKind(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"><option>Emma & Noah</option><option>Emma</option><option>Noah</option></select></label>
        <p className="text-xs text-ink-soft">In deze voorbeeldomgeving blijft het document op je apparaat; de naam verschijnt in dit overzicht.</p>
        <div className="flex gap-2"><Button type="submit" disabled={!uploadNaam.trim()}>Toevoegen aan overzicht</Button><Button type="button" variant="ghost" onClick={() => setBestand(null)}>Annuleren</Button></div>
      </form> : null}
      {uploadStatus ? <p role="status" className="mt-2 text-xs text-brand">{uploadStatus}</p> : null}
      <Link to="/exporteren" className="mt-8 flex items-center justify-between border-y border-border py-3.5 text-sm">
        <span><span className="block font-semibold">Overzicht bewaren of delen</span><span className="block text-xs text-ink-soft">Een feitelijk PDF-overzicht, als je dat nodig hebt</span></span>
        <span className="text-ink-soft">›</span>
      </Link>
    </AppShell>);
}
