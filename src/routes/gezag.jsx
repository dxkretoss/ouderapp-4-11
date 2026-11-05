import { useTranslation } from "react-i18next";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, Card, PageHeader } from "@/components/AppShell";
import { kinderen } from "@/lib/demo-data";
import { gezagLabels, regelingNaam, setGezagState, useGezagState } from "@/lib/gezag-store";
import { AppIcon, TekenLabel } from "@/components/AppIcon";
export const Route = createFileRoute("/gezag")({
    head: () => ({
        meta: [
            { title: "Gezag & afspraken — Ouderschap & Co" },
            { name: "description", content: "Leg per kind de gezagssituatie vast en bepaal wie wat mag in de app." },
            { property: "og:title", content: "Gezag & afspraken — Ouderschap & Co" },
            { property: "og:description", content: "Gezag, omgang en rechten per kind, helder en rustig uitgelegd." },
            { property: "og:type", content: "website" },
            { name: "twitter:card", content: "summary" },
        ],
    }),
    component: GezagPagina,
});
const rechten = [
    "Informatie bekijken",
    "Informatie toevoegen",
    "Praktische afspraken voorstellen",
    "Beslissingen goedkeuren",
    "Documenten bekijken",
    "Documenten toevoegen",
    "Professionals uitnodigen",
    "Instellingen van het gezin wijzigen",
];
const afwijkingen = [
    "Aangepaste omgang",
    "Informatie- of consultatieregeling",
    "Beperkte informatie-uitwisseling",
    "Begeleide omgang",
    "Tijdelijk geen omgang",
    "Beperkingen rondom communicatie",
    "Andere vastgestelde afspraken",
];
const uitleg = [
    { t: "Gezamenlijk gezag", u: "Beide ouders beslissen samen over belangrijke zaken, zoals school, medische zorg en waar het kind woont. Na een scheiding blijft gezamenlijk gezag meestal bestaan." },
    { t: "Eenhoofdig gezag", u: "Eén ouder heeft het gezag en neemt belangrijke beslissingen. De andere ouder heeft wel recht op omgang en informatie, tenzij anders bepaald." },
    { t: "Omgang", u: "Het contact tussen een kind en de ouder zonder gezag." },
    { t: "Zorgregeling", u: "Hoe ouders met gezamenlijk gezag de zorg en opvoeding verdelen." },
    { t: "Omgangsregeling", u: "Wanneer het kind bij de ouder zonder gezag is." },
    { t: "Informatie en raadpleging", u: "De ouder met gezag informeert de andere ouder over belangrijke zaken en vraagt diens mening, bijvoorbeeld over school of gezondheid." },
];
function magOuder(g, ouder, recht) {
    const heeftGezag = g === "gezamenlijk" || (g === "ouder1" && ouder === "sanne") || (g === "ouder2" && ouder === "joris");
    if (heeftGezag)
        return true;
    return ["Informatie bekijken", "Informatie toevoegen", "Praktische afspraken voorstellen", "Documenten bekijken"].includes(recht);
}
function GezagPagina() {
    const { t } = useTranslation();
    const s = useGezagState();
    const [kindId, setKindId] = useState(kinderen[0]?.id ?? "");
    const [open, setOpen] = useState(null);
    const [afw, setAfw] = useState([]);
    const kind = kinderen.find((k) => k.id === kindId);
    const g = s.gezag[kindId] ?? "onbekend";
    const onduidelijk = g === "anders" || g === "onbekend" || g === "voogd" || s.afwijkend;
    return (<AppShell>
      <PageHeader titel={t("custodyPage.headerTitle", "Gezag & Toegang")} subtitel="Per kind vastleggen wat voor jullie situatie geldt."/>

      <div className="mt-5 flex gap-2">
        {kinderen.map((k) => (<button key={k.id} onClick={() => setKindId(k.id)} className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold ${kindId === k.id ? "border-brand bg-white" : "border-transparent bg-surface text-ink-soft"}`}>
            <img src={k.avatar} alt="" className="size-6 rounded-full object-cover"/>
            {k.naam}
          </button>))}
      </div>

      <Card className="mt-4 space-y-2">
        <p className="text-sm font-semibold">Gezagssituatie van {kind.naam}</p>
        {Object.keys(gezagLabels).map((k) => (<label key={k} className={`flex cursor-pointer items-center gap-3 rounded-md border p-3 text-sm ${g === k ? "border-brand bg-white" : "border-border bg-surface"}`}>
            <input type="radio" name="gezag" checked={g === k} onChange={() => setGezagState({ gezag: { ...s.gezag, [kindId]: k }, bevestigd: { ...s.bevestigd, [kindId]: false } })} className="accent-[var(--color-brand)]"/>
            {gezagLabels[k]}
          </label>))}
        <div className="flex items-center justify-between rounded-md bg-bg-muted p-3 text-sm">
          {s.bevestigd[kindId] ? (<span className="inline-flex items-center gap-1.5"><AppIcon functie="akkoord" maat="sm" vorm="kaal"/>Bevestigd door beide ouders · uittreksel gezagsregister toegevoegd</span>) : (<>
              <span className="text-ink-soft">Nog niet bevestigd</span>
              <button onClick={() => setGezagState({ bevestigd: { ...s.bevestigd, [kindId]: true } })} className="rounded-full bg-brand px-3 py-1.5 text-xs font-semibold text-primary-foreground">Bevestigen + document</button>
            </>)}
        </div>
        <p className="text-xs text-ink-soft">Tip: het gezagsregister van de rechtbank laat zien wie gezag heeft. Voeg het uittreksel of een beschikking toe bij Documenten.</p>
      </Card>

      {onduidelijk && (<Card className="mt-4 bg-accent-warm/25">
          <p className="text-sm"><TekenLabel waarde="ℹ️ De rechten binnen jouw situatie kunnen afhangen van specifieke afspraken of een rechterlijke beslissing. Controleer daarom altijd welke regeling voor jouw gezin geldt."/></p>
        </Card>)}

      <Card className="mt-4">
        <p className="text-sm font-semibold">In de app heet dit: de {regelingNaam(g)}</p>
        <p className="mt-1 text-xs text-ink-soft">
          {g === "gezamenlijk"
            ? "Belangrijke beslissingen worden pas als gezamenlijk akkoord getoond als jullie allebei akkoord zijn."
            : "Belangrijke beslissingen worden gedeeld als ‘Ter informatie’ of ‘Ik hoor graag jouw mening’ — niet als goedkeuring."}
        </p>
      </Card>

      <Card className="mt-4">
        <p className="text-sm font-semibold">Wie mag wat?</p>
        <p className="mt-1 text-xs text-ink-soft">Algemene uitleg bij de gekozen gezagssituatie, geen instelling voor toegang. Bij een bijzondere regeling kun je de afspraken hieronder bekijken.</p>
        <div className="mt-3 grid grid-cols-[1fr_auto_auto] gap-x-4 gap-y-2 text-sm">
          <span />
          <span className="text-xs font-semibold text-brand">Sanne</span>
          <span className="text-xs font-semibold">Joris</span>
          {rechten.map((r) => (<div key={r} className="contents">
              <span className="text-ink-soft">{r}</span>
              {["sanne", "joris"].map((o) => {
                const val = magOuder(g, o, r);
                return (<span key={o} className="text-center" aria-label={`${r} ${o}: ${val ? "in de algemene uitleg" : "afhankelijk van de regeling"}`}>
                    {val ? "✓" : "—"}
                  </span>);
            })}
            </div>))}
        </div>
      </Card>

      <Card className="mt-4 space-y-3">
        <label className="flex items-center justify-between gap-3 text-sm font-semibold">
          Er is een afwijkende rechterlijke uitspraak of regeling
          <input type="checkbox" checked={s.afwijkend} onChange={(e) => setGezagState({ afwijkend: e.target.checked })} className="size-5 accent-[var(--color-brand)]"/>
        </label>
        {s.afwijkend && (<>
            <p className="text-xs text-ink-soft">Bekijk welke onderwerpen bij jullie regeling horen. Dit verandert geen toegang. De app bepaalt nooit zelf welke beperking geldt.</p>
            <div className="flex flex-wrap gap-2">
              {afwijkingen.map((a) => (<button key={a} onClick={() => setAfw(afw.includes(a) ? afw.filter((x) => x !== a) : [...afw, a])} className={`rounded-full border px-3 py-1.5 text-xs ${afw.includes(a) ? "border-brand bg-brand text-primary-foreground" : "border-white/70 bg-white/70"}`}>{a}</button>))}
            </div>
          </>)}
      </Card>

      <h2 className="mt-6 font-display text-lg font-bold">Goed om te weten</h2>
      <p className="text-xs text-ink-soft">Algemene informatie over het Nederlandse systeem — geen persoonlijk juridisch advies.</p>
      <div className="mt-3 space-y-2">
        {uitleg.map((u) => (<Card key={u.t} className="p-0">
            <button onClick={() => setOpen(open === u.t ? null : u.t)} className="flex w-full items-center justify-between p-4 text-left text-sm font-semibold">
              {u.t}<span className="text-ink-soft">{open === u.t ? "−" : "+"}</span>
            </button>
            {open === u.t && <p className="px-4 pb-4 text-sm text-ink-soft">{u.u}</p>}
          </Card>))}
      </div>
    </AppShell>);
}
