import { useTranslation } from "react-i18next";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, Card, PageHeader } from "@/components/AppShell";
import { AppIcon } from "@/components/AppIcon";
import { useStart } from "@/lib/start-store";
export const Route = createFileRoute("/rondleiding")({
    head: () => ({
        meta: [
            { title: "Rondleiding — Ouderschap & Co" },
            { name: "description", content: "Stap voor stap door de app, met je eigen gezin." },
            { property: "og:title", content: "Rondleiding — Ouderschap & Co" },
            { property: "og:description", content: "Leer de app rustig kennen, stap voor stap." },
            { property: "og:type", content: "website" },
            { name: "twitter:card", content: "summary" },
        ],
    }),
    component: Rondleiding,
});
function Rondleiding() {
    const { t } = useTranslation();
    const s = useStart();
    const [i, setI] = useState(0);
    const kids = s.eigen && s.kinderen.length ? s.kinderen.map((k) => k.naam).join(" & ") : "je kinderen";
    const stappen = [
        { icoon: "home", titel: "Home", tekst: `Hier zie je in één oogopslag waar ${kids} vandaag zijn, wat er aan komt en wat nog geregeld wil worden.`, to: "/", knop: "Bekijk Home" },
        { icoon: "kinderen", titel: "Je kinderen", tekst: "Per kind bewaar je school, noodkaart en verzekeringen. Alles wat je invult, hoort bij dat kind.", to: s.eigen ? "/" : "/kinderen", knop: s.kinderen.length ? "Bekijk je kinderen" : "Kind toevoegen", klaar: s.kinderen.length > 0 },
        { icoon: "zorgregeling", titel: "Verdeling van de week", tekst: "Kies het patroon dat bij jullie past. Een wijziging geldt pas als jullie allebei akkoord zijn.", to: s.eigen ? "/" : "/zorgregeling", knop: "Verdeling instellen", klaar: s.regeling !== null },
        { icoon: "agenda", titel: "Agenda", tekst: "Afspraken per kind, met een rustig maandoverzicht. Gedeelde afspraken stel je samen af.", to: "/agenda", knop: "Open de agenda", klaar: s.afspraakToegevoegd },
        { icoon: "berichten", titel: "Berichten", tekst: "Praat per onderwerp. Van een bericht maak je met één tik een afspraak, taak of kostenpost.", to: "/berichten", knop: "Open Berichten" },
        { icoon: "kosten", titel: "Kosten", tekst: "Houd samen bij wat jullie uitgeven, en zie direct wie wat nog moet betalen.", to: "/kosten", knop: "Open Kosten" },
        ...(s.gebruik === "samen" ? [{ icoon: "samen", titel: "De andere ouder", tekst: "Nodig de andere ouder uit. Jullie zien dan dezelfde planning en afspraken.", to: "/instellingen", knop: "Uitnodigen", klaar: s.uitgenodigd }] : []),
        { icoon: "meer", titel: "Menu", tekst: "Taken, spullen, momentjes, documenten, vakanties en hulp vind je hier, netjes gegroepeerd.", to: "/meer", knop: "Terug naar Menu" },
    ];
    const stap = stappen[i];
    const laatste = i === stappen.length - 1;
    return (<AppShell>
      <PageHeader titel={t("tourPage.headerTitle", "Rondleiding")} subtitel={s.eigen && s.naam ? `Welkom ${s.naam}, we lopen samen door de app` : "Stap voor stap door de app"} terug="/meer"/>
      <p className="mt-5 text-xs text-ink-soft">Stap {i + 1} van {stappen.length}</p>
      <div className="mt-2 flex gap-1" aria-hidden>
        {stappen.map((_, n) => <span key={n} className={`h-1 flex-1 rounded-full ${n <= i ? "bg-brand" : "bg-border"}`}/>)}
      </div>
      <Card className="mt-4">
        <div className="flex items-center gap-3">
          <AppIcon functie={stap.icoon} maat="lg"/>
          <div>
            <h2 className="font-display text-lg font-bold">{stap.titel}</h2>
            {stap.klaar ? <p className="text-xs text-brand">Al ingesteld</p> : null}
          </div>
        </div>
        <p className="mt-3 text-sm leading-relaxed">{stap.tekst}</p>
        <Link to={stap.to} className="mt-4 block w-full rounded-xl border border-border py-2.5 text-center text-sm font-semibold">{stap.knop}</Link>
      </Card>
      <div className="mt-4 flex gap-2">
        <button disabled={i === 0} onClick={() => setI(i - 1)} className="flex-1 rounded-xl border border-border py-3 text-sm font-semibold disabled:opacity-40">Vorige</button>
        {laatste
            ? <Link to="/" className="flex-1 rounded-xl bg-brand py-3 text-center text-sm font-semibold text-primary-foreground">Klaar, naar Home</Link>
            : <button onClick={() => setI(i + 1)} className="flex-1 rounded-xl bg-brand py-3 text-sm font-semibold text-primary-foreground">Volgende</button>}
      </div>
      <p className="mt-4 text-center text-xs text-ink-soft">Je kunt de rondleiding altijd opnieuw starten via het Menu.</p>
    </AppShell>);
}
