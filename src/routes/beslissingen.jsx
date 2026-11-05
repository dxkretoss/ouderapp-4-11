import { start } from "@/lib/besluiten-data";
import { GeschiedenisKnop } from "@/components/Geschiedenis";
import { leg } from "@/lib/audit-store";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { AppShell, Card, PageHeader } from "@/components/AppShell";
import { kinderen } from "@/lib/demo-data";
import { useGezagState } from "@/lib/gezag-store";
export const Route = createFileRoute("/beslissingen")({
    head: () => ({
        meta: [
            { title: "Beslissingen — Ouderschap & Co" },
            { name: "description", content: "Belangrijke beslissingen over je kind voorstellen, bespreken en vastleggen." },
            { property: "og:title", content: "Beslissingen — Ouderschap & Co" },
            { property: "og:description", content: "Samen beslissen, met een neutraal besluitenlogboek." },
            { property: "og:type", content: "website" },
            { name: "twitter:card", content: "summary" },
        ],
    }),
    validateSearch: z.object({ soort: z.string().optional(), kind: z.string().optional() }),
    component: Beslissingen,
});
const soorten = ["Schoolkeuze", "Medisch", "Verhuizing", "Verdeling van de week", "Opvoeding"];
function status(b) {
    if (b.modus !== "goedkeuring")
        return { t: b.modus === "informatie" ? "Ter informatie" : "Ik hoor graag jouw mening", c: "bg-bg-muted" };
    if (b.sanne === "niet" || b.joris === "niet")
        return { t: "Niet akkoord", c: "bg-accent-warm/40" };
    if (b.sanne === "akkoord" && b.joris === "akkoord")
        return { t: "Samen akkoord", c: "bg-brand text-primary-foreground" };
    return { t: "In afwachting", c: "bg-white" };
}
function Beslissingen() {
    const { gezag } = useGezagState();
    const [lijst, setLijst] = useState(start);
    const [titel, setTitel] = useState("");
    const zoek = Route.useSearch();
    const [soort, setSoort] = useState(soorten.includes(zoek.soort ?? "") ? zoek.soort : soorten[0]);
    const [kind, setKind] = useState(kinderen.some((k) => k.id === zoek.kind) ? zoek.kind : kinderen[0]?.id ?? "");
    const [mening, setMening] = useState("mening");
    const [openLog, setOpenLog] = useState(null);
    const samen = gezag[kind] === "gezamenlijk";
    const nu = "12 mrt " + new Date().toTimeString().slice(0, 5);
    const reageer = (id, wie, r) => {
        const b0 = lijst.find((b) => b.id === id);
        if (b0)
            leg("besluit", String(id), b0.titel, "gewijzigd", { veld: `reactie ${wie === "sanne" ? "Sanne" : "Joris"}`, oud: b0[wie] ?? "nog geen reactie", nieuw: r === "akkoord" ? "akkoord" : "niet akkoord" }, wie === "sanne" ? "Sanne" : "Joris");
        setLijst(lijst.map((b) => b.id === id ? { ...b, [wie]: r, log: [...b.log, { wanneer: nu, wie: wie === "sanne" ? "Sanne" : "Joris", wat: r === "akkoord" ? "Akkoord" : "Niet akkoord" }] } : b));
    };
    const voorstellen = () => {
        if (!titel.trim())
            return;
        const nid = Date.now();
        leg("besluit", String(nid), titel, "toegevoegd");
        setLijst([{ id: nid, titel, soort, kind, sanne: samen ? "akkoord" : undefined, modus: samen ? "goedkeuring" : mening, log: [{ wanneer: nu, wie: "Sanne", wat: samen ? "Voorstel gedaan" : "Gedeeld" }] }, ...lijst]);
        setTitel("");
    };
    return (<AppShell>
      <PageHeader titel="Beslissingen" subtitel="Belangrijke keuzes rustig samen vastleggen."/>

      <Card className="mt-5 space-y-3">
        <p className="text-sm font-semibold">Nieuwe beslissing</p>
        <input value={titel} onChange={(e) => setTitel(e.target.value)} placeholder="Bijv. Noah naar zwemles op zaterdag" className="w-full rounded-md border border-white/70 bg-white/80 p-3 text-sm"/>
        <div className="flex gap-2">
          <select value={soort} onChange={(e) => setSoort(e.target.value)} className="flex-1 rounded-md border border-white/70 bg-white/80 p-2.5 text-sm">{soorten.map((x) => <option key={x}>{x}</option>)}</select>
          <select value={kind} onChange={(e) => setKind(e.target.value)} className="flex-1 rounded-md border border-white/70 bg-white/80 p-2.5 text-sm">{kinderen.map((k) => <option key={k.id} value={k.id}>{k.naam}</option>)}</select>
        </div>
        {samen ? (<p className="text-xs text-ink-soft">Pas als jullie allebei akkoord zijn, staat de beslissing als ‘Samen akkoord’.</p>) : (<div className="flex gap-2">
            {["mening", "informatie"].map((m) => (<button key={m} onClick={() => setMening(m)} className={`flex-1 rounded-full border px-3 py-2 text-xs font-semibold ${mening === m ? "border-brand bg-white" : "border-border bg-surface text-ink-soft"}`}>{m === "mening" ? "Ik hoor graag jouw mening" : "Ter informatie"}</button>))}
          </div>)}
        <button onClick={voorstellen} className="w-full rounded-full bg-brand py-3 text-sm font-semibold text-primary-foreground">{samen ? "Voorstellen aan Joris" : "Delen met Joris"}</button>
      </Card>

      <div className="mt-5 space-y-3">
        {lijst.map((b) => {
            const st = status(b);
            const k = kinderen.find((x) => x.id === b.kind);
            return (<Card key={b.id} id={`item-${b.id}`} className="zoekdoel space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] tracking-wider text-ink-soft uppercase">{b.soort} · {k.naam}</span>
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${st.c}`}>{st.t}</span>
              </div>
              <div className="flex items-start justify-between gap-2"><p className="font-semibold">{b.titel}</p><GeschiedenisKnop soort="besluit" itemId={String(b.id)} naam={b.titel}/></div>
              {b.modus === "goedkeuring" && (<div className="flex gap-4 text-xs text-ink-soft">
                  <span>Sanne: {b.sanne === "akkoord" ? "✓ akkoord" : b.sanne === "niet" ? "niet akkoord" : "…"}</span>
                  <span>Joris: {b.joris === "akkoord" ? "✓ akkoord" : b.joris === "niet" ? "niet akkoord" : "…"}</span>
                </div>)}
              {b.modus === "goedkeuring" && !b.joris && (<div className="flex gap-2">
                  <span className="self-center text-[11px] text-ink-soft">Demo als Joris:</span>
                  <button onClick={() => reageer(b.id, "joris", "akkoord")} className="rounded-full bg-brand px-3 py-1 text-xs font-semibold text-primary-foreground">Akkoord</button>
                  <button onClick={() => reageer(b.id, "joris", "niet")} className="rounded-full bg-white px-3 py-1 text-xs font-semibold">Niet akkoord</button>
                </div>)}
              <button onClick={() => setOpenLog(openLog === b.id ? null : b.id)} className="text-xs font-semibold text-brand">{openLog === b.id ? "Verberg logboek" : `Logboek (${b.log.length})`}</button>
              {openLog === b.id && (<ol className="space-y-1 border-l-2 border-brand-soft pl-3 text-xs">
                  {b.log.map((l, i) => <li key={i}><span className="text-ink-soft">{l.wanneer} · {l.wie}</span> — {l.wat}</li>)}
                </ol>)}
            </Card>);
        })}
      </div>
      <p className="mt-4 text-xs text-ink-soft">Eerdere registraties worden nooit stilletjes aangepast: correcties verschijnen als nieuwe regel in het logboek.</p>
    </AppShell>);
}
