import { useTranslation } from "react-i18next";
import { VakantieFormulier, Reistoestemming } from "@/components/AgendaVakanties";
import { Button } from "@/components/ui/button";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useBevestigPopup } from "@/lib/feedback";
import { AppShell, Card, PageHeader } from "@/components/AppShell";
import { VoorstelIntrekken } from "@/components/VoorstelIntrekken";
import { RustigTip, useKeuzeTeksten } from "@/components/RustigTip";
import { useState } from "react";
import { useVakanties, vakantieLijst, stelVerdelingVoor, accepteerVakantie, trekVakantieIn, wijsVakantieAf } from "@/lib/vakantie-store";
export const Route = createFileRoute("/vakantie/$id")({
    loader: ({ params }) => {
        const v = vakantieLijst().find((x) => x.id === params.id);
        if (!v)
            throw notFound();
        return { naam: v.naam, periode: v.periode };
    },
    head: ({ loaderData }) => ({
        meta: [
            { title: `${loaderData?.naam ?? "Vakantie"} — Ouderschap & Co` },
            { name: "description", content: `Alles over ${loaderData?.naam ?? "deze vakantie"} op één plek: verdeling, reis en voorbereiding.` },
            { property: "og:title", content: `${loaderData?.naam ?? "Vakantie"} — Ouderschap & Co` },
            { property: "og:description", content: "Verdeling, reis en voorbereiding van één vakantie bij elkaar." },
            { property: "og:type", content: "website" },
            { name: "twitter:card", content: "summary" },
        ],
    }),
    notFoundComponent: () => (<AppShell><PageHeader titel="Vakantie niet gevonden" terug="/planning"/><p className="px-5 text-sm text-ink-soft">Deze vakantie staat er niet meer. <Link to="/planning" className="text-brand underline">Terug naar vakanties</Link></p></AppShell>),
    component: VakantiePagina,
});
function VakantiePagina() {
    const { t } = useTranslation();
    const { id } = Route.useParams();
    const v = useVakanties().find((x) => x.id === id);
    const k = useKeuzeTeksten();
    const [melding, setMelding] = useState("");
    const [wijzig, setWijzig] = useState(false);
    useBevestigPopup(melding);
    if (!v)
        return null;
    const status = v.status === "ingetrokken" ? "Ingetrokken" : v.status === "afgesproken" ? "Afgesproken" : v.status === "voorstel" ? (v.van === "Sanne" ? "Voorstel verstuurd · wacht op antwoord" : "Voorstel van de andere ouder · jouw reactie nodig") : "Nog niet geregeld";
    return (<AppShell>
      <PageHeader titel={v.naam} subtitel={v.periode} terug="/planning"/>
      <div className="space-y-3 px-5 pb-8">
        <Card>
          <p className="text-xs text-ink-soft">Bij wie</p>
          <p className="font-display text-lg font-bold">{v.ouder === "Sanne" ? "Bij jou" : v.ouder === "Joris" ? "Bij de andere ouder" : v.ouder === "Samen" ? "Samen" : "Nog niet geregeld"}</p>
          <p className="mt-1 text-sm">{status}</p>
          {v.status !== "afgesproken" && <p className="mt-1 text-xs text-ink-soft">Tot er akkoord is, blijft de huidige verdeling van de week gelden.</p>}
          {v.status === "open" && (<div className="mt-3 flex gap-2">
              {["Sanne", "Joris", "Samen"].map((o) => (<button key={o} onClick={() => stelVerdelingVoor(v.id, o)} className="flex-1 rounded-md bg-surface py-2 text-xs font-medium">{o === "Sanne" ? "Bij jou" : o === "Joris" ? "Bij de andere ouder" : "Samen"}</button>))}
            </div>)}
          {melding ? <p role="status" className="mt-2 text-sm font-semibold text-brand">{melding}</p> : null}
          {v.status === "voorstel" && v.van && v.van !== "Sanne" && (<div className="mt-3 grid gap-2 text-xs font-semibold">
              <button onClick={() => { if (accepteerVakantie(v.id, "Sanne"))
            setMelding("Afgesproken. Fijn dat er duidelijkheid is."); }} className="min-h-11 rounded-md bg-brand text-primary-foreground">Akkoord</button>
              <button onClick={() => setWijzig(true)} className="min-h-11 rounded-md border border-border">Ander voorstel</button>
              <button onClick={() => { if (wijsVakantieAf(v.id))
            setMelding("Je gaat niet akkoord. De vakantie is nog niet geregeld; de verdeling van de week blijft gelden."); }} className="min-h-11 rounded-md border border-border text-ink-soft">Niet akkoord</button>
            </div>)}
          {v.status !== "afgesproken" ? <div className="mt-2"><RustigTip moment="vakantie"/></div> : null}
          {v.status === "voorstel" && v.van === "Sanne" && (<div className="mt-3 flex gap-2 text-xs">
              <VoorstelIntrekken onBevestig={() => trekVakantieIn(v.id)}/>

            </div>)}
        </Card>
        {v.status === "afgesproken" ? <Button className="min-h-11" variant="outline" onClick={() => setWijzig(true)}>Afspraak wijzigen</Button> : null}
        {v.afgesproken ? <p className="text-sm text-ink-soft">De oorspronkelijke afspraak blijft gelden: {v.afgesproken.periode}.</p> : null}
        {v.buitenland ? <Reistoestemming vakantie={v}/> : null}
        {wijzig ? <VakantieFormulier bestaand={v} onSluit={() => setWijzig(false)}/> : null}
        {v.geschiedenis?.length ? <details className="border-y border-border py-3"><summary className="min-h-11 text-sm font-semibold">Wijzigingsgeschiedenis</summary>{v.geschiedenis.map((g, i) => <p key={i} className="py-2 text-xs text-ink-soft">{g.datum.slice(0, 10)} · {g.door === "Sanne" ? "Jij" : "De andere ouder"} · {g.actie} · {g.velden.periode}</p>)}</details> : null}
        {v.details && (<Card>
            <p className="text-xs text-ink-soft">Reis & afspraken</p>
            <p className="text-sm">{v.details}</p>
          </Card>)}
        <Card>
          <p className="mb-2 font-display font-bold">Voorbereiden</p>
          <div className="grid gap-2 text-sm">
            <Link to="/agenda" className="rounded-md bg-surface px-3 py-2">In de agenda bekijken</Link>
            <Link to="/taken" className="rounded-md bg-surface px-3 py-2">Paklijst & taken</Link>
            <Link to="/kosten" className="rounded-md bg-surface px-3 py-2">Kosten van deze vakantie</Link>
          </div>
        </Card>
      </div>
    </AppShell>);
}
