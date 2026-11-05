import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Check } from "lucide-react";
import { AppShell, Card, PageHeader } from "@/components/AppShell";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { abonnementen, bewaarPlan, euro, inbegrepen, useAbonnement, zetAbonnement } from "@/lib/abonnement";
export const Route = createFileRoute("/abonnement")({
    head: () => ({
        meta: [
            { title: "Abonnement — Ouderschap & Co" },
            { name: "description", content: "Je abonnement bekijken, wijzigen of eenvoudig opzeggen. Altijd duidelijk wat er gebeurt." },
            { property: "og:title", content: "Abonnement — Ouderschap & Co" },
            { property: "og:description", content: "Duidelijke prijzen, eenvoudig opzeggen en je gegevens in eigen hand." },
            { property: "og:type", content: "website" },
            { name: "twitter:card", content: "summary" },
        ],
    }),
    component: AbonnementPagina,
});
const datum = (s) => new Date(s).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
function AbonnementPagina() {
    const ab = useAbonnement();
    const plan = abonnementen.find((a) => a.id === ab.planId) ?? abonnementen[0];
    const [beheren, setBeheren] = useState(false);
    const [stap, setStap] = useState("");
    const sluit = () => setStap("");
    return (<AppShell>
      <PageHeader titel="Abonnement" subtitel="Je abonnement en je gegevens" terug="/instellingen"/>

      {ab.status !== "actief" ? (<Card className="mt-6">
          <p className="font-display text-xl">Welkom terug</p>
          <p className="mt-1 text-sm text-ink-soft">
            {ab.status === "bewaren" ? "Je gegevens zijn bewaard. Hervat je abonnement en je gezinsomgeving staat weer klaar, zonder alles opnieuw in te voeren."
                : ab.status === "opgezegd" ? `Je abonnement is opgezegd. Je hebt toegang tot ${datum(ab.verlengdatum)}. Je gegevens zijn nog beschikbaar.`
                    : "Je hebt verwijdering van je account aangevraagd. Zolang dat nog niet is uitgevoerd, kun je hervatten."}
          </p>
          <button onClick={() => zetAbonnement({ status: "actief" })} className="mt-3 w-full rounded-md bg-brand py-2.5 text-sm font-semibold text-primary-foreground">Volledig abonnement hervatten</button>
        </Card>) : null}

      <h2 className="mt-6 font-display font-bold">Huidig abonnement</h2>
      <Card className="mt-3">
        <dl className="divide-y divide-border text-sm">
          <div className="flex justify-between py-2"><dt className="text-ink-soft">Abonnement</dt><dd className="font-semibold">{ab.status === "bewaren" ? bewaarPlan.naam : plan.naam}</dd></div>
          <div className="flex justify-between py-2"><dt className="text-ink-soft">Prijs</dt><dd className="font-semibold">{ab.status === "bewaren" ? `${euro(bewaarPlan.prijsCent)} per maand` : `${euro(plan.prijsCent)} per ${plan.periode}`}</dd></div>
          <div className="flex justify-between py-2"><dt className="text-ink-soft">{ab.status === "opgezegd" ? "Toegang tot" : "Volgende verlenging"}</dt><dd className="font-semibold">{datum(ab.verlengdatum)}</dd></div>
          <div className="flex justify-between gap-3 py-2"><dt className="text-ink-soft">Betaalmethode</dt><dd className="text-right font-semibold">{ab.betaalmethode}</dd></div>
          <div className="flex justify-between py-2"><dt className="text-ink-soft">Status</dt><dd className="font-semibold">{{ actief: "Actief", opgezegd: "Opgezegd", bewaren: "Alleen bewaren", verwijderaanvraag: "Verwijdering aangevraagd" }[ab.status]}</dd></div>
        </dl>
        <button onClick={() => setBeheren((b) => !b)} className="mt-2 w-full rounded-md border border-border py-2.5 text-sm font-semibold text-brand">Abonnement beheren</button>
        {beheren ? (<div className="mt-3 space-y-2">
            {abonnementen.map((a) => (<button key={a.id} onClick={() => zetAbonnement({ planId: a.id, status: "actief" })} className={`flex w-full items-center justify-between rounded-md border p-3 text-left text-sm ${ab.planId === a.id && ab.status === "actief" ? "border-brand bg-brand-soft/60" : "border-border"}`}>
                <span><span className="block font-semibold">{a.naam}</span>{a.toelichting ? <span className="text-xs text-brand">{a.toelichting}</span> : null}</span>
                <span className="font-semibold">{euro(a.prijsCent)} / {a.periode}</span>
              </button>))}
            <p className="text-[11px] text-ink-soft">Betaalmethode wijzigen kan straks via de betaalpagina. In deze voorbeeldversie wordt nog niets afgeschreven.</p>
          </div>) : null}
      </Card>

      <h2 className="mt-6 font-display font-bold">Wat zit erin</h2>
      <ul className="mt-2 space-y-1.5 text-sm">
        {inbegrepen.map((i) => <li key={i} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-brand" strokeWidth={1.8}/>{i}</li>)}
      </ul>

      {ab.status === "actief" ? (<button onClick={() => setStap("opzeggen")} className="mt-6 w-full rounded-md border border-border py-3 text-sm font-semibold">Abonnement opzeggen</button>) : null}
      <Link to="/juridisch" className="mt-3 block text-center text-xs font-semibold text-brand">Abonnementsvoorwaarden lezen</Link>

      <h2 className="mt-8 font-display font-bold">Account</h2>
      <p className="mt-1 text-xs text-ink-soft">Account verwijderen is iets anders dan opzeggen: je gezinsomgeving en gegevens worden dan verwijderd volgens de geldende regels.</p>
      <button onClick={() => setStap("verwijderen")} className="mt-3 w-full rounded-md border border-border py-3 text-sm font-semibold text-ink-soft">Account verwijderen</button>

      <Sheet open={!!stap} onOpenChange={(o) => !o && sluit()}>
        <SheetContent side="bottom" className="left-1/2 max-h-[90vh] w-full max-w-md -translate-x-1/2 overflow-y-auto rounded-t-2xl bg-background px-5 pb-8">
          {stap === "opzeggen" ? (<>
              <SheetHeader className="text-left"><SheetTitle className="font-display text-xl font-medium">Abonnement opzeggen?</SheetTitle>
                <SheetDescription>Je houdt alle functies tot en met {datum(ab.verlengdatum)}. Daarna stoppen de betaalde functies. Je account blijft bestaan.</SheetDescription></SheetHeader>
              <div className="mt-4 grid gap-2">
                <button onClick={sluit} className="rounded-md bg-brand py-2.5 text-sm font-semibold text-primary-foreground">Abonnement behouden</button>
                <button onClick={() => setStap("keuze")} className="rounded-md border border-border py-2.5 text-sm font-semibold">Doorgaan met opzeggen</button>
              </div>
            </>) : stap === "keuze" ? (<>
              <SheetHeader className="text-left"><SheetTitle className="font-display text-xl font-medium">Wat wil je met je gegevens?</SheetTitle>
                <SheetDescription>Jij kiest. Niets hiervan is verplicht.</SheetDescription></SheetHeader>
              <div className="mt-4 grid gap-2 text-left">
                <button onClick={() => { zetAbonnement({ status: "opgezegd" }); sluit(); }} className="rounded-md border border-border p-3 text-left text-sm"><span className="block font-semibold">Alleen opzeggen</span><span className="text-xs text-ink-soft">Account en gegevens blijven bestaan. Je kunt later hervatten.</span></button>
                <button onClick={() => setStap("bewaren")} className="rounded-md border border-border p-3 text-left text-sm"><span className="block font-semibold">Opzeggen en gegevens bewaren · {euro(bewaarPlan.prijsCent)} per maand</span><span className="text-xs text-ink-soft">Bekijk eerst precies wat dat betekent.</span></button>
                <button onClick={() => setStap("verwijderen")} className="rounded-md border border-border p-3 text-left text-sm"><span className="block font-semibold">Account en gegevens verwijderen</span><span className="text-xs text-ink-soft">Altijd mogelijk, ook zonder bewaarabonnement.</span></button>
              </div>
            </>) : stap === "bewaren" ? (<>
              <SheetHeader className="text-left"><SheetTitle className="font-display text-xl font-medium">Je gegevens bewaren</SheetTitle>
                <SheetDescription>{euro(bewaarPlan.prijsCent)} per maand, maandelijks opzegbaar.</SheetDescription></SheetHeader>
              <div className="mt-4 space-y-3 text-sm">
                <Lijst titel="Dit blijft bewaard" items={bewaarPlan.blijftBewaard}/>
                <Lijst titel="Dit kun je nog doen" items={bewaarPlan.blijftBeschikbaar}/>
                <Lijst titel="Dit gaat uit" items={bewaarPlan.gaatUit}/>
                <p><span className="font-semibold">Hoe lang:</span> zolang het bewaarabonnement loopt, maximaal {bewaarPlan.bewaartermijnMaanden} maanden.</p>
                <p><span className="font-semibold">Terugkomen:</span> hervat je volledige abonnement hier; alles staat weer klaar.</p>
                <p><span className="font-semibold">Toch verwijderen:</span> dat kan altijd via Account verwijderen.</p>
              </div>
              <button onClick={() => { zetAbonnement({ status: "bewaren" }); sluit(); }} className="mt-4 w-full rounded-md bg-brand py-2.5 text-sm font-semibold text-primary-foreground">Kies gegevens bewaren</button>
              <button onClick={() => setStap("keuze")} className="mt-2 w-full py-2 text-sm font-semibold text-ink-soft">Terug</button>
            </>) : stap === "verwijderen" ? (<>
              <SheetHeader className="text-left"><SheetTitle className="font-display text-xl font-medium">Account verwijderen?</SheetTitle>
                <SheetDescription>Dit is iets anders dan je abonnement opzeggen.</SheetDescription></SheetHeader>
              <div className="mt-3 space-y-2 text-sm text-ink-soft">
                <p>Je account en jouw gegevens worden verwijderd volgens de geldende regels. Gedeelde gegevens die de andere ouder ook gebruikt, blijven voor die ouder bestaan.</p>
                <p>Tip: exporteer eerst je dossier als je iets wilt bewaren.</p>
              </div>
              <div className="mt-4 grid gap-2">
                <Link to="/exporteren" className="rounded-md border border-border py-2.5 text-center text-sm font-semibold text-brand">Eerst dossier exporteren</Link>
                <button onClick={() => { zetAbonnement({ status: "verwijderaanvraag" }); sluit(); }} className="rounded-md bg-brand py-2.5 text-sm font-semibold text-primary-foreground">Verwijdering aanvragen</button>
                <button onClick={sluit} className="py-2 text-sm font-semibold text-ink-soft">Annuleren</button>
              </div>
            </>) : null}
        </SheetContent>
      </Sheet>
    </AppShell>);
}
function Lijst({ titel, items }) {
    return (<div>
      <p className="font-semibold">{titel}</p>
      <ul className="mt-1 space-y-0.5 text-ink-soft">{items.map((i) => <li key={i}>· {i}</li>)}</ul>
    </div>);
}
