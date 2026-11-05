import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { z } from "zod";
import { Check, Circle, Download, Eye, FileText, Share2 } from "lucide-react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { afspraken, categorieMeta, documenten, gesprekken, kinderen, parents } from "@/lib/demo-data";
import { start as besluiten } from "@/lib/besluiten-data";
import { useKosten } from "@/lib/kosten-store";
import { leg, soortLabel, useAudit } from "@/lib/audit-store";
import { geschiedenisDatum, useAfspraken } from "@/lib/afspraken-store";
import { magAudit, magBron, magKind, proKijkers, vroegste } from "@/lib/export-rechten";
export const Route = createFileRoute("/exporteren")({
    validateSearch: z.object({ pro: z.string().optional() }),
    head: () => ({
        meta: [
            { title: "Overzicht bewaren of delen — Ouderschap & Co" },
            { name: "description", content: "Stel een feitelijk, chronologisch PDF-dossier samen, controleer het voorbeeld en deel het zelf." },
            { property: "og:title", content: "Overzicht bewaren of delen — Ouderschap & Co" },
            { property: "og:description", content: "Kies periode, kinderen en onderdelen; bekijk eerst een voorbeeld en maak dan een nette PDF." },
            { property: "og:type", content: "website" },
            { name: "twitter:card", content: "summary" },
        ],
    }),
    component: Exporteren,
});
const APP = "Ouderschap & Co";
const delen = [
    { id: "wissel", label: "Verdeling van de week & wisselmomenten", bronnen: ["agenda"] },
    { id: "verzoeken", label: "Wijzigingen en verzoeken", bronnen: ["verzoek"] },
    { id: "besluiten", label: "Afspraken & besluiten", bronnen: ["agenda", "besluit"] },
    { id: "communicatie", label: "Communicatie", bronnen: ["bericht"] },
    { id: "kosten", label: "Kosten", bronnen: ["kost"] },
    { id: "documenten", label: "Documenten", bronnen: ["document"] },
    { id: "geschiedenis", label: "Wijzigingsgeschiedenis", bronnen: "audit" },
];
const maanden = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];
const kort = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
/** Demo-labels zoals "8 maart" of "10 mrt 20:14" naar een datum (demo-jaar 2026; latere maanden in 2025). */
function parseLabel(l) {
    const m = l.toLowerCase().match(/(\d{1,2})\s+([a-z]+)(?:\s+(\d{1,2}):(\d{2}))?/);
    if (!m)
        return new Date("2026-03-11T12:00");
    let mi = maanden.indexOf(m[2]);
    if (mi < 0)
        mi = kort.indexOf(m[2].slice(0, 3));
    const jaar = mi > 2 ? 2025 : 2026;
    return new Date(jaar, Math.max(mi, 0), Number(m[1]), Number(m[3] ?? 12), Number(m[4] ?? 0));
}
const d2 = (d) => d.toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
const t2 = (d) => d.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
const dt = (d) => `${d2(d)} · ${t2(d)} uur`;
const naam = (id) => (id in parents ? parents[id].naam : id);
const kindNamen = kinderen.map((k) => k.naam);
/** Welke kinderen een tekstveld noemt; noemt het niemand, dan geldt het voor het hele gezin. */
const kindVan = (s) => { const l = kindNamen.filter((n) => s.toLowerCase().includes(n.toLowerCase())); return l.length ? l : kindNamen; };
const euro = (n) => `€ ${n.toFixed(2).replace(".", ",")}`;
const actieNl = { CREATED: "Aangemaakt", UPDATED: "Gewijzigd", DELETED: "Verwijderd", ACCEPTED: "Geaccepteerd", DECLINED: "Afgewezen", CANCELLED: "Geannuleerd", EXPORTED: "Gegenereerd" };
function Exporteren() {
    const { pro } = Route.useSearch();
    const kijker = (pro && proKijkers[pro]) || { type: "ouder", id: "sanne" };
    const kosten = useKosten();
    const audit = useAudit();
    const onzeAfspraken = useAfspraken();
    const [stap, setStap] = useState("kies");
    const [periode, setPeriode] = useState("1j");
    const [van, setVan] = useState("2026-01-01");
    const [tot, setTot] = useState(new Date().toISOString().slice(0, 10));
    const toegestaneKinderen = kindNamen.filter((k) => magKind(kijker, k));
    const [kids, setKids] = useState(toegestaneKinderen);
    const magDeel = (d) => d.bronnen === "audit" ? ["afspraak", "schema", "besluit", "kosten"].some((s) => magAudit(kijker, s)) : d.bronnen.some((b) => magBron(kijker, b));
    const toegestaan = delen.filter(magDeel);
    const [kies, setKies] = useState(toegestaan.filter((d) => d.id !== "communicatie" && d.id !== "documenten").map((d) => d.id));
    const [bezig, setBezig] = useState(false);
    const [pdf, setPdf] = useState(null);
    const [deelCheck, setDeelCheck] = useState(false);
    const bereik = () => {
        const nu = new Date();
        let s, e;
        if (periode === "eigen") {
            s = new Date(`${van}T00:00`);
            e = new Date(`${tot}T23:59`);
        }
        else {
            s = new Date(nu);
            s.setMonth(s.getMonth() - (periode === "3m" ? 3 : 12));
            e = nu;
        }
        const v = vroegste(kijker);
        if (v && s < v)
            s = v; // nooit eerder dan de toegestane periode
        return [s, e];
    };
    const gekozen = delen.filter((d) => kies.includes(d.id) && magDeel(d));
    /** Verzamelt uitsluitend feiten, gefilterd via de centrale rechtencheck. Geen interpretatie of oordeel. */
    const data = useMemo(() => {
        const [s, e] = bereik();
        const ok = (i) => i.wanneer >= s && i.wanneer <= e && i.kinderen.some((k) => kids.includes(k) && magKind(kijker, k));
        const sorteer = (l) => l.filter(ok).sort((a, b) => a.wanneer.getTime() - b.wanneer.getTime());
        const evs = audit.filter((g) => magAudit(kijker, g.soort));
        const evKids = (g) => (g.kinderen.length ? [...g.kinderen] : kindNamen);
        const ag = (wissel) => (magBron(kijker, "agenda") ? afspraken.filter((a) => (a.categorie === "wissel") === wissel) : []).map((a) => {
            const [h, m] = a.tijd.split(":");
            return { wanneer: new Date(2026, 2, a.dag, Number(h) || 12, Number(m) || 0), titel: `${categorieMeta[a.categorie].label}: ${a.titel}`,
                velden: [["Kind", a.kind], ["Locatie", a.locatie], ["Vastgelegd door", naam(a.ouder)]], kinderen: kindVan(a.kind) };
        });
        return {
            wissel: sorteer(ag(true)),
            verzoeken: sorteer(evs.filter((g) => g.soort === "schema").map((g) => ({
                wanneer: new Date(g.moment), titel: `Wijzigingsverzoek ${actieNl[g.actie].toLowerCase()}`, kinderen: evKids(g),
                velden: [["Betreft", g.meta['betreft'] ?? g.itemNaam], ...g.wijzigingen.map((x) => [x.veld === "status" ? "Status" : x.veld, x.veld === "status" ? x.nieuw : `${x.oud} → ${x.nieuw}`]), [g.actie === "CREATED" ? "Aangemaakt door" : "Door", g.actorNaam]],
            }))),
            besluiten: sorteer([
                ...ag(false),
                // Onze afspraken: rechtstreeks uit de ene afsprakenbron (eigen geschiedenis), geen kopie in de audit.
                ...(magBron(kijker, "agenda") ? onzeAfspraken : []).flatMap((a) => a.geschiedenis.flatMap((g) => {
                    const d = geschiedenisDatum(g.datum);
                    return d ? [{ wanneer: d, titel: a.titel, kinderen: kindVan(a.kind),
                            velden: [["Afspraak", a.tekst], ["Status", a.status], ["Registratie", g.tekst], ...(a.bron ? [["Herkomst", a.bron.label]] : [])] }] : [];
                })),
                ...(magBron(kijker, "besluit") ? besluiten : []).flatMap((b) => b.log.map((l) => ({
                    wanneer: parseLabel(l.wanneer), titel: b.titel, kinderen: b.kind === "beide" ? kindNamen : kindVan(b.kind),
                    velden: [["Type", b.soort], ["Registratie", l.wat], ["Door", l.wie]],
                }))),
            ]),
            communicatie: sorteer((magBron(kijker, "bericht") ? gesprekken : []).flatMap((g) => g.berichten.map((b, i) => ({
                wanneer: new Date(2026, 2, 11, 8 + i, 0), titel: naam(b.van), tekst: b.tekst, groep: g.onderwerp, kinderen: kindNamen,
                velden: [["Onderwerp", g.onderwerp], ["Oorspronkelijke tijd", b.tijd]],
            })))),
            kosten: sorteer((magBron(kijker, "kost") ? kosten : []).map((k) => ({
                wanneer: parseLabel(k.datum), titel: k.omschrijving, kinderen: kindVan(k.kind),
                velden: [["Bedrag", euro(k.bedrag)], ["Categorie", k.categorie], ["Kind", k.kind], ["Verdeling", k.verdeling], ["Status", k.status], ["Toegevoegd door", naam(k.betaaldDoor)]],
            }))),
            documenten: sorteer((magBron(kijker, "document") ? documenten : []).map((d) => ({
                wanneer: parseLabel(d.gewijzigd), titel: d.naam, kinderen: kindVan(d.kind),
                velden: [["Categorie", d.categorie], ["Kind", d.kind], ["Laatst gewijzigd", d.gewijzigd]],
            }))),
            geschiedenis: sorteer(evs.map((g) => ({
                wanneer: new Date(g.moment), titel: actieNl[g.actie], groep: `${soortLabel[g.soort]} · ${g.itemNaam}`, kinderen: evKids(g),
                velden: [...g.wijzigingen.map((x) => [x.veld, `${x.oud} → ${x.nieuw}`]), ...Object.entries(g.meta).map(([k, v]) => [k, v]), ["Door", `${g.actorNaam} (${g.actorRol.toLowerCase()})`]],
            }))),
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [audit, onzeAfspraken, kosten, kids, periode, van, tot, pro]);
    const [s, e] = bereik();
    const periodeTekst = `${d2(s)} – ${d2(e)}`;
    const kidsTekst = kids.length === kindNamen.length ? kids.join(" & ") : kids.join(", ");
    async function maak() {
        setBezig(true);
        const { jsPDF } = await import("jspdf");
        const exportId = `DX-${Date.now().toString(36).toUpperCase().slice(-6)}`;
        const nu = new Date();
        const doc = new jsPDF({ unit: "mm", format: "a4" });
        const W = 210, M = 20, B = W - 2 * M, ONDER = 272;
        const groen = [111, 127, 104], inkt = [47, 42, 38], grijs = [110, 104, 98];
        const kopjes = [];
        let sectie = "";
        let y = 0;
        // 1. Voorblad
        doc.setTextColor(...groen).setFont("helvetica", "bold").setFontSize(10).text(APP.toUpperCase(), M, 50);
        doc.setTextColor(...inkt).setFont("times", "normal").setFontSize(30).text("Dossieroverzicht", M, 66);
        doc.setFontSize(18).text(kidsTekst, M, 78);
        y = 98;
        [["Periode", periodeTekst], ["Gegenereerd", dt(nu)], ["Samengesteld door", kijker.type === "ouder" ? naam(kijker.id) : kijker.naam], ["Export-ID", exportId]].forEach(([l, w]) => {
            doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(...groen).text(l.toUpperCase(), M, y);
            doc.setFont("helvetica", "normal").setFontSize(11).setTextColor(...inkt).text(w, M + 45, y);
            y += 9;
        });
        doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(...grijs).text(`Automatisch samengesteld uit geregistreerde gegevens binnen ${APP}.`, M, 260);
        // 2. Inhoud + Over dit document (inhoud wordt achteraf ingevuld)
        doc.addPage();
        const inhoudPagina = doc.getNumberOfPages();
        const nieuwePagina = () => {
            doc.addPage();
            y = 28;
            doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(...grijs).text(`Dossieroverzicht · ${sectie}`, M, 14);
            doc.setDrawColor(225, 220, 212).setLineWidth(0.2).line(M, 17, W - M, 17);
        };
        const ruimte = (h) => { if (y + h > ONDER) {
            nieuwePagina();
            return true;
        } return false; };
        const hoofdstuk = (label, nr) => {
            sectie = label;
            nieuwePagina();
            kopjes.push({ label, pagina: doc.getNumberOfPages() });
            doc.setFont("times", "normal").setFontSize(20).setTextColor(...inkt).text(`${nr}. ${label}`, M, y);
            y += 4;
            doc.setDrawColor(...groen).setLineWidth(0.4).line(M, y, W - M, y);
            y += 10;
        };
        const blokHoogte = (it, breedte) => {
            const t = doc.setFont("helvetica", "bold").setFontSize(10.5).splitTextToSize(it.titel, breedte).length * 5;
            const v = it.velden.reduce((a, [l, w]) => a + doc.setFont("helvetica", "normal").setFontSize(9.5).splitTextToSize(`${l}: ${w}`.replace(/→/g, "->"), breedte).length * 4.5, 0);
            return t + v + 11;
        };
        const tekenBlok = (it, metDatum = true) => {
            const x = M + 42, br = B - 42;
            ruimte(blokHoogte(it, br));
            if (metDatum) {
                doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(...inkt).text(d2(it.wanneer), M, y);
                doc.setFont("helvetica", "normal").setTextColor(...grijs).text(t2(it.wanneer), M, y + 4.5);
            }
            const t = doc.setFont("helvetica", "bold").setFontSize(10.5).setTextColor(...inkt).splitTextToSize(it.titel, br);
            doc.text(t, x, y);
            let yy = y + t.length * 5 + 1;
            it.velden.forEach(([l, w]) => {
                const r = doc.setFont("helvetica", "normal").setFontSize(9.5).setTextColor(...grijs).splitTextToSize(`${l}: ${w}`.replace(/→/g, "->"), br);
                doc.text(r, x, yy);
                yy += r.length * 4.5;
            });
            y = Math.max(yy, y + 12) + 5;
            doc.setDrawColor(232, 228, 220).setLineWidth(0.2).line(M, y - 3.5, W - M, y - 3.5);
        };
        // 3. Samenvatting (alleen feitelijke aantallen)
        let nr = 1;
        hoofdstuk("Samenvatting", nr++);
        const regels = [["Periode", periodeTekst], ["Kinderen", kids.join(", ")], ...gekozen.map((d) => [d.label, `${data[d.id].length} registraties`])];
        regels.forEach(([l, w]) => { ruimte(8); doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(...inkt).text(l, M, y); doc.setFont("helvetica", "normal").setTextColor(...grijs).text(w, M + 75, y); y += 7; });
        y += 4;
        doc.setFontSize(9).text(doc.splitTextToSize("Deze samenvatting telt alleen het aantal geregistreerde items per onderdeel. Er worden geen conclusies getrokken.", B), M, y);
        // 4. Onderdelen
        gekozen.forEach((d) => {
            hoofdstuk(d.label, nr++);
            const items = data[d.id];
            if (!items.length) {
                doc.setFont("helvetica", "italic").setFontSize(10).setTextColor(...grijs).text("Geen registraties in deze periode.", M, y);
                return;
            }
            if (d.id === "communicatie") {
                let dag = "";
                items.forEach((it) => {
                    const r = doc.setFont("helvetica", "normal").setFontSize(10).splitTextToSize(it.tekst ?? "", B);
                    const h = r.length * 4.8 + 12;
                    if (d2(it.wanneer) !== dag) {
                        ruimte(h + 12);
                        dag = d2(it.wanneer);
                        doc.setFont("times", "normal").setFontSize(13).setTextColor(...inkt).text(dag, M, y);
                        y += 8;
                    }
                    else
                        ruimte(h);
                    doc.setFont("helvetica", "bold").setFontSize(9.5).setTextColor(...inkt).text(`${t2(it.wanneer)} · ${it.titel}`, M, y);
                    doc.setFont("helvetica", "normal").setFontSize(8.5).setTextColor(...grijs).text(`Onderwerp: ${it.groep} · oorspronkelijke tijd ${it.velden[1][1]}`, M + 50, y);
                    doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(...inkt).text(r, M, y + 5);
                    y += h;
                });
            }
            else if (d.id === "geschiedenis") {
                const groepen = new Map();
                items.forEach((it) => groepen.set(it.groep, [...(groepen.get(it.groep) ?? []), it]));
                groepen.forEach((lijst, g) => {
                    ruimte(12 + blokHoogte(lijst[0], B - 42));
                    doc.setFont("times", "normal").setFontSize(13).setTextColor(...inkt).text(g, M, y);
                    y += 8;
                    lijst.forEach((it) => tekenBlok(it));
                    y += 3;
                });
            }
            else
                items.forEach((it) => tekenBlok(it));
        });
        // Inhoud invullen
        doc.setPage(inhoudPagina);
        y = 30;
        doc.setFont("times", "normal").setFontSize(22).setTextColor(...inkt).text("Inhoud", M, y);
        y += 12;
        kopjes.forEach((k, i) => {
            doc.setFont("helvetica", "normal").setFontSize(11).setTextColor(...inkt).text(`${i + 1}. ${k.label}`, M, y);
            doc.setTextColor(...grijs).text(String(k.pagina), W - M, y, { align: "right" });
            doc.setDrawColor(225, 220, 212).setLineDashPattern([0.6, 1.2], 0).line(M + 70, y, W - M - 10, y).setLineDashPattern([], 0);
            y += 8;
        });
        y += 14;
        doc.setFont("times", "normal").setFontSize(15).setTextColor(...inkt).text("Over dit document", M, y);
        y += 7;
        doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(...grijs).text(doc.splitTextToSize(`Dit document is automatisch samengesteld uit gegevens die binnen ${APP} zijn geregistreerd gedurende de geselecteerde periode. Het document geeft geregistreerde informatie en wijzigingen weer en bevat geen inhoudelijke of juridische beoordeling door ${APP}. Items staan per onderdeel op volgorde van datum (oudste eerst). Het bevat alleen informatie waartoe de samensteller toegang heeft; persoonlijke notities en privénotities van professionals zijn nooit opgenomen.`, B), M, y);
        // Footer op elke pagina na het voorblad
        const n = doc.getNumberOfPages(), vandaag = d2(nu);
        for (let i = 2; i <= n; i++) {
            doc.setPage(i);
            doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(...grijs);
            doc.text(`Gegenereerd via ${APP} · ${vandaag} · Export-ID: ${exportId}`, M, 287);
            doc.text(`Pagina ${i} van ${n}`, W - M, 287, { align: "right" });
        }
        const blob = doc.output("blob");
        const file = new File([blob], `dossier-${nu.toISOString().slice(0, 10)}.pdf`, { type: "application/pdf" });
        if (pdf)
            URL.revokeObjectURL(pdf.url);
        setPdf({ url: URL.createObjectURL(blob), file, id: exportId });
        // Exportactie zelf vastleggen (niet naar wie het later wordt doorgestuurd)
        leg("dossier", exportId, "Dossier gegenereerd", "EXPORTED", undefined, kijker.type === "ouder" ? naam(kijker.id) : "Mediator", {
            kinderen: kids, meta: { periode: periodeTekst, onderdelen: gekozen.map((d) => d.label).join(", "), "export-ID": exportId },
        });
        setBezig(false);
        setStap("gereed");
        setDeelCheck(false);
    }
    async function deel() {
        if (!pdf)
            return;
        const nav = navigator;
        if (nav.canShare?.({ files: [pdf.file] })) {
            try {
                await nav.share({ files: [pdf.file], title: "Dossieroverzicht", text: `Dossieroverzicht ${kidsTekst}, samengesteld via ${APP}.` });
                return;
            }
            catch { /* geannuleerd */ }
        }
        window.location.href = `mailto:?subject=${encodeURIComponent("Dossieroverzicht " + kidsTekst)}&body=${encodeURIComponent("Hierbij het dossieroverzicht uit " + APP + ". Voeg het gedownloade PDF-bestand als bijlage toe.")}`;
    }
    const kop = "text-[11px] font-bold uppercase tracking-[0.14em] text-brand";
    const keuze = (aan) => `rounded-md border px-3 py-2 text-sm font-semibold ${aan ? "border-brand bg-brand-soft text-ink" : "border-border text-ink-soft"}`;
    const primair = "flex w-full items-center justify-center gap-2 rounded-md bg-brand py-3.5 text-sm font-semibold text-primary-foreground disabled:opacity-50";
    const secundair = "flex w-full items-center justify-center gap-2 rounded-md border border-border py-3 text-sm font-semibold";
    const toggleKind = (k) => setKids(kids.includes(k) ? kids.filter((x) => x !== k) : [...kids, k]);
    return (<AppShell>
      <PageHeader titel="Overzicht bewaren of delen" subtitel={kijker.type === "ouder" ? "Een feitelijk, chronologisch overzicht van wat in de app is geregistreerd." : "Alleen onderdelen waarvoor jij toegang hebt van de ouders."} terug={kijker.type === "ouder" ? "/documenten" : "/professionals"}/>

      {stap === "kies" ? (<>
          <section className="mt-8">
            <h2 className={kop}>Periode</h2>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <button onClick={() => setPeriode("3m")} className={keuze(periode === "3m")}>Laatste 3 maanden</button>
              <button onClick={() => setPeriode("1j")} className={keuze(periode === "1j")}>Laatste jaar</button>
              <button onClick={() => setPeriode("eigen")} className={keuze(periode === "eigen")}>Zelf kiezen</button>
            </div>
            {periode === "eigen" ? (<div className="mt-3 flex gap-2">
                <label className="flex-1 text-xs text-ink-soft">Van<input type="date" value={van} onChange={(e) => setVan(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-background p-2 text-sm text-ink"/></label>
                <label className="flex-1 text-xs text-ink-soft">Tot en met<input type="date" value={tot} onChange={(e) => setTot(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-background p-2 text-sm text-ink"/></label>
              </div>) : null}
          </section>

          <section className="mt-8">
            <h2 className={kop}>Voor wie wil je het dossier maken?</h2>
            <div className="mt-1 divide-y divide-border border-y border-border">
              {toegestaneKinderen.map((k) => (<label key={k} className="flex items-center gap-3 py-3 text-sm">
                  <input type="checkbox" checked={kids.includes(k)} onChange={() => toggleKind(k)} className="size-4 accent-[var(--color-brand)]"/>{k}
                </label>))}
              {toegestaneKinderen.length > 1 ? (<label className="flex items-center gap-3 py-3 text-sm">
                  <input type="checkbox" checked={kids.length === toegestaneKinderen.length} onChange={() => setKids(kids.length === toegestaneKinderen.length ? [] : toegestaneKinderen)} className="size-4 accent-[var(--color-brand)]"/>Beide kinderen
                </label>) : null}
            </div>
            <p className="mt-2 text-[11px] text-ink-soft">Alleen informatie over de gekozen kinderen komt erin. Gezinsbrede berichten worden wel meegenomen als je Communicatie kiest.</p>
          </section>

          <section className="mt-8">
            <h2 className={kop}>Wat neem je mee?</h2>
            <div className="mt-1 divide-y divide-border border-y border-border">
              {delen.map((d) => {
                const mag = magDeel(d);
                return (<label key={d.id} className={`flex items-center gap-3 py-3 text-sm ${mag ? "" : "text-ink-soft/60"}`}>
                    <input type="checkbox" disabled={!mag} checked={mag && kies.includes(d.id)} onChange={() => setKies(kies.includes(d.id) ? kies.filter((x) => x !== d.id) : [...kies, d.id])} className="size-4 accent-[var(--color-brand)]"/>
                    {d.label}{mag ? null : <span className="ml-auto text-[11px]">Geen toegang</span>}
                  </label>);
            })}
            </div>
            <p className="mt-2 text-[11px] text-ink-soft">Persoonlijke notities, privénotities van professionals en privé-momentjes komen er nooit in.</p>
          </section>

          <button onClick={() => setStap("overzicht")} disabled={!gekozen.length || !kids.length} className={`mt-8 ${primair}`}>Verder</button>
        </>) : null}

      {stap === "overzicht" ? (<section className="mt-8">
          <p className="font-display text-xl">Je dossier samenstellen</p>
          <dl className="mt-4 space-y-3 text-sm">
            <div><dt className={kop}>Periode</dt><dd className="mt-0.5">{periodeTekst}</dd></div>
            <div><dt className={kop}>Kinderen</dt><dd className="mt-0.5">{kids.join(", ")}</dd></div>
          </dl>
          <p className={`mt-5 ${kop}`}>Opgenomen</p>
          <ul className="mt-1 divide-y divide-border border-y border-border">
            {delen.filter(magDeel).map((d) => {
                const aan = kies.includes(d.id);
                return (<li key={d.id} className={`flex items-center gap-3 py-2.5 text-sm ${aan ? "" : "text-ink-soft"}`}>
                  {aan ? <Check className="size-4 text-brand" strokeWidth={2}/> : <Circle className="size-3.5 text-ink-soft/60" strokeWidth={1.6}/>}
                  {d.label}{aan ? <span className="ml-auto text-xs text-ink-soft">{data[d.id].length}</span> : null}
                </li>);
            })}
          </ul>
          <div className="mt-6 space-y-2">
            <button onClick={() => setStap("voorbeeld")} className={secundair}><Eye className="size-4" strokeWidth={1.8}/>Voorbeeld bekijken</button>
            <button onClick={maak} disabled={bezig} className={primair}><FileText className="size-4" strokeWidth={1.8}/>{bezig ? "Bezig…" : "PDF genereren"}</button>
            <button onClick={() => setStap("kies")} className="w-full py-2 text-xs font-semibold text-brand">Selectie aanpassen</button>
          </div>
        </section>) : null}

      {stap === "voorbeeld" ? (<section className="mt-6">
          <p className="font-display text-xl">Voorbeeld van je dossier</p>
          <p className="mt-1 text-xs text-ink-soft">Precies deze gegevens komen in de PDF. Controleer of je dit wilt delen.</p>
          <div className="mt-4 rounded-md border border-border bg-background p-4">
            <p className={kop}>{APP}</p>
            <p className="mt-1 font-display text-2xl">Dossieroverzicht</p>
            <p className="text-sm">{kidsTekst} · {periodeTekst}</p>
            <p className="mt-3 text-[11px] text-ink-soft">Communicatie: {kies.includes("communicatie") ? "wordt meegenomen" : "niet opgenomen"} · Wijzigingsgeschiedenis: {kies.includes("geschiedenis") ? "wordt meegenomen" : "niet opgenomen"} · Documenten: {kies.includes("documenten") ? `${data.documenten.length} vermeld` : "niet opgenomen"}</p>
            {gekozen.map((d, i) => (<div key={d.id} className="mt-5 border-t border-border pt-3">
                <p className="font-display text-lg">{i + 2}. {d.label}</p>
                {data[d.id].length === 0 ? <p className="text-xs italic text-ink-soft">Geen registraties in deze periode.</p> : null}
                <ul className="mt-1 space-y-2">
                  {data[d.id].map((it, j) => (<li key={j} className="text-xs">
                      <p className="text-ink-soft">{dt(it.wanneer)}{it.groep && d.id === "geschiedenis" ? ` · ${it.groep}` : ""}</p>
                      <p className="font-semibold text-ink">{it.titel}</p>
                      {it.tekst ? <p>{it.tekst}</p> : null}
                      {(d.id === "communicatie" ? it.velden.slice(0, 1) : it.velden).map(([l, w]) => <p key={l} className="text-ink-soft">{l}: {w}</p>)}
                    </li>))}
                </ul>
              </div>))}
          </div>
          <div className="mt-6 space-y-2">
            <button onClick={maak} disabled={bezig} className={primair}><FileText className="size-4" strokeWidth={1.8}/>{bezig ? "Bezig…" : "PDF genereren"}</button>
            <button onClick={() => setStap("kies")} className={secundair}>Selectie aanpassen</button>
          </div>
        </section>) : null}

      {stap === "gereed" && pdf ? (<section className="mt-8">
          <p className="font-display text-xl">Dossier gereed</p>
          <p className="text-xs text-ink-soft">{pdf.file.name} · Export-ID {pdf.id}</p>
          <div className="mt-4 space-y-2">
            <a href={pdf.url} target="_blank" rel="noreferrer" className={secundair}><Eye className="size-4" strokeWidth={1.8}/>PDF bekijken</a>
            <a href={pdf.url} download={pdf.file.name} className={primair}><Download className="size-4" strokeWidth={1.8}/>Download PDF</a>
            {deelCheck ? (<div className="rounded-md border border-border p-3">
                <p className="text-sm">Controleer voor het delen of dit dossier alleen informatie bevat die je wilt verstrekken.</p>
                <div className="mt-3 flex gap-2">
                  <button onClick={() => setDeelCheck(false)} className="flex-1 rounded-md border border-border py-2 text-sm">Nog niet</button>
                  <button onClick={deel} className="flex-1 rounded-md bg-brand py-2 text-sm font-semibold text-primary-foreground">Delen</button>
                </div>
              </div>) : (<button onClick={() => setDeelCheck(true)} className={secundair}><Share2 className="size-4" strokeWidth={1.8}/>Delen</button>)}
          </div>
          <p className="mt-4 text-[11px] text-ink-soft">Dat dit dossier is gemaakt staat in de wijzigingsgeschiedenis. Naar wie je het stuurt wordt niet vastgelegd.</p>
          <button onClick={() => setStap("kies")} className="mt-4 w-full py-2 text-xs font-semibold text-brand">Nieuw dossier samenstellen</button>
        </section>) : null}
    </AppShell>);
}
