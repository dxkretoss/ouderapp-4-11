import { useTranslation } from "react-i18next";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { AppIcon } from "@/components/AppIcon";
import { BewerkPotlood } from "@/components/ui-kit";
import { IK } from "@/lib/pro-journaal-store";
import { proKijkers, proToegangBakker } from "@/lib/export-rechten";
import { AppShell, PageHeader } from "@/components/AppShell";
import { MeerSectie } from "@/components/MeerLijst";
import { VoorOuders } from "@/components/pro/VoorOuders";
import { useStart } from "@/lib/start-store";
export const Route = createFileRoute("/ondersteuning")({
    head: () => ({
        meta: [
            { title: "Begeleiding — Ouderschap & Co" },
            { name: "description", content: "Wie helpt jullie en wat kan diegene zien?" },
            { property: "og:title", content: "Begeleiding — Ouderschap & Co" },
            { property: "og:description", content: "Wie helpt jullie en wat kan diegene zien?" },
            { property: "og:type", content: "website" },
            { name: "twitter:card", content: "summary" },
        ],
    }),
    component: Ondersteuning,
});
/** Wat een professional kan zien komt alleen uit de bestaande toegangslijst (export-rechten), nooit uit functie of organisatie. */
const betrokken = [
    { id: "bakker", naam: IK, functie: "Mediator", organisatie: "Mediationpraktijk Midden", toegang: proToegangBakker, vanaf: proKijkers["bakker"].vanaf },
];
const onderdeelLabel = { Zorgregeling: "Verdeling van de week", Planning: "Agenda", Documenten: "Geselecteerde documenten", Communicatie: "Berichten tussen ouders", Afspraken: "Afspraken", Besluiten: "Besluiten", Kosten: "Kosten" };
const alleOnderdelen = Object.keys(onderdeelLabel);
function Ondersteuning() {
    const { t } = useTranslation();
    const router = useRouter();
    const [open, setOpen] = useState(null);
    const eigen = !!useStart().eigen;
    if (eigen)
        return <AppShell>
    <PageHeader titel="Begeleiding" subtitel="Wie helpt jullie en wat kan diegene zien?" terug="/extra-ondersteuning"/>
    <p className="mt-5 text-sm text-ink-soft">Er zijn nog geen veilig gekoppelde en bevestigde professionals beschikbaar. Hier verschijnen alleen betrokken professionals nadat hun toegang voor jouw gezin is gecontroleerd.</p>
    <p className="mt-3 text-sm text-ink-soft">Gesprekken met Co worden niet automatisch gedeeld.</p>
  </AppShell>;
    const hoofd = betrokken[0];
    const meer = [
        { to: "/extra-ondersteuning", icoon: "ondersteuning", titel: "Extra houvast", tekst: "Voor als je afspraken graag duidelijk vastlegt." },
    ];
    return (<AppShell>
      <PageHeader titel="Begeleiding" subtitel="Wie helpt jullie en wat kan diegene zien?" actie={<BewerkPotlood onClick={() => router.navigate({ to: "/professionals" })} label="Toegang aanpassen"/>}/>
      <p className="mt-3 text-xs text-ink-soft">Voorbeeldgezin · fictieve begeleiding en voorbeeldrechten, geen echte koppeling. Privégesprekken met Co worden niet automatisch gedeeld.</p>
      <div className="mt-5 flex items-center gap-3 border-y border-border py-3">
        <AppIcon functie="professionals"/>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{hoofd.naam}</p>
          <p className="text-xs text-ink-soft">{hoofd.functie} · {hoofd.organisatie}</p>
          <p className="text-xs text-ink-soft">Heeft toegang tot {hoofd.toegang.length} onderdelen</p>
        </div>
        <button onClick={() => { setOpen(hoofd.id); document.getElementById("betrokken")?.scrollIntoView({ behavior: "smooth" }); }} className="text-xs font-semibold text-brand">Bekijk toegang ›</button>
      </div>
      <div className="mt-8"><VoorOuders dossier="bakker" ouder="Sanne"/></div>
      <section id="betrokken" className="mt-8">
        <h2 className="font-display text-lg font-bold">Wie is betrokken?</h2>
        <ul className="mt-2 divide-y divide-border border-y border-border">
          {betrokken.map((p) => (<li key={p.id} className="py-3">
              <button onClick={() => setOpen(open === p.id ? null : p.id)} aria-expanded={open === p.id} className="flex w-full items-center gap-3 text-left">
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{p.naam}</span>
                  <span className="block text-xs text-ink-soft">{p.functie} · {p.organisatie} · toegang sinds {new Date(`${p.vanaf}T00:00`).toLocaleDateString("nl-NL", { day: "numeric", month: "long" })}</span>
                </span>
                <span className="text-ink-soft">{open === p.id ? "⌃" : "›"}</span>
              </button>
              {open === p.id ? (<div className="mt-3 pl-1">
                  <p className="text-xs font-semibold">Wat kan deze professional zien?</p>
                  <ul className="mt-1 space-y-1 text-sm">
                    {alleOnderdelen.map((o) => (<li key={o} className={p.toegang.includes(o) ? "" : "text-ink-soft"}>{p.toegang.includes(o) ? "✓" : "—"} {onderdeelLabel[o]}</li>))}
                    <li className="text-ink-soft">— Persoonlijke notities</li>
                  </ul>
                  <Link to="/professionals" className="mt-2 inline-block text-xs font-semibold text-brand">Toegang aanpassen ›</Link>
                </div>) : null}
            </li>))}
        </ul>
        <Link to="/professionals" className="mt-3 inline-block text-sm font-semibold text-brand">+ Professional toevoegen</Link>
      </section>
      <MeerSectie titel="Meer hulp" items={meer}/>
    </AppShell>);
}
