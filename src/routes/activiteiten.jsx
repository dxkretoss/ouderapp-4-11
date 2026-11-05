import { useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { MoreHorizontal } from "lucide-react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { AppIcon } from "@/components/AppIcon";
import { FilterBalk } from "@/components/ui-kit";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useActiviteiten } from "@/components/Activiteiten";
import { categorieTitel, isGelezen, markeerIds, nieuw, perCategorie } from "@/lib/activiteiten";
import { zetVoorkeur } from "@/lib/voorkeuren-store";
import { VoorstellenOverzicht } from "@/components/VoorstellenOverzicht";
import { z } from "zod";
export const Route = createFileRoute("/activiteiten")({
    validateSearch: z.object({ onderdeel: z.enum(["regelen"]).optional() }),
    head: () => ({
        meta: [
            { title: "Activiteiten — Ouderschap & Co" },
            { name: "description", content: "Zie op één plek wat er is toegevoegd, gewijzigd of nog op je reactie wacht." },
            { property: "og:title", content: "Activiteiten — Ouderschap & Co" },
            { property: "og:description", content: "Rustig overzicht van nieuwe en gewijzigde afspraken en openstaande verzoeken." },
            { property: "og:type", content: "website" },
            { name: "twitter:card", content: "summary" },
        ],
    }),
    component: ActiviteitenPagina,
});
function ActiviteitenPagina() {
    const zoek = Route.useSearch();
    const { lijst, gelezen } = useActiviteiten();
    const [filter, setFilter] = useState("nieuw");
    const [open, setOpen] = useState(null);
    const zichtbaar = filter === "nieuw" ? nieuw(lijst, gelezen) : lijst;
    const groepen = perCategorie(zichtbaar);
    const lees = (a) => zetVoorkeur("activiteitGelezen", [...new Set([...gelezen, ...markeerIds(a)])]);
    return (<AppShell>
      <PageHeader titel="Activiteiten" terug="/"/>
      <VoorstellenOverzicht />
      {zoek.onderdeel !== "regelen" ? <>
      <FilterBalk className="mt-3" opties={[{ id: "nieuw", label: "Nieuw" }, { id: "alles", label: "Alles" }]} waarde={filter} onChange={setFilter}/>
      {groepen.length === 0 ? (<p className="mt-8 text-center text-sm text-ink-soft">Alles bijgewerkt. Er is niets nieuws.</p>) : groepen.map((g) => (<section key={g.categorie} className="mt-5" aria-label={categorieTitel[g.categorie]}>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{categorieTitel[g.categorie]}</h2>
          <ul className="mt-1 divide-y divide-border">
            {g.items.map((a) => <Rij key={a.id} a={a} gelezen={isGelezen(a, gelezen)} onOpen={() => { lees(a); setOpen(a); }} onLees={() => lees(a)}/>)}
          </ul>
        </section>))}
      <Details a={open} onClose={() => setOpen(null)}/>
      </> : null}
    </AppShell>);
}
function Rij({ a, gelezen, onOpen, onLees }) {
    return (<li className="flex items-center gap-2">
      <button onClick={onOpen} className="flex min-h-[56px] min-w-0 flex-1 items-center gap-3 py-2 text-left">
        <AppIcon functie={a.icoon} maat="sm"/>
        <span className="min-w-0 flex-1">
          <span className={`block truncate text-sm ${gelezen ? "" : "font-semibold"}`}>{a.titel}</span>
          <span className="block truncate text-xs text-ink-soft">{a.uitleg}</span>
        </span>
        {a.tijd ? <span className="shrink-0 text-[11px] text-ink-soft">{a.tijd}</span> : null}
        {!gelezen ? <span aria-label="Ongelezen" className="size-2 shrink-0 rounded-full bg-accent-warm"/> : null}
      </button>
      <Popover>
        <PopoverTrigger aria-label={`Opties voor ${a.titel}`} className="grid size-11 shrink-0 place-items-center rounded-full text-ink-soft">
          <MoreHorizontal className="size-4" aria-hidden="true"/>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-60 p-1">
          {!gelezen ? <button onClick={onLees} className="min-h-11 w-full rounded px-3 text-left text-sm">Gelezen</button> : null}
          <div className="px-3 py-2 text-sm text-ink-soft">
            <p className="font-semibold">Later herinneren</p>
            <p className="text-xs">Nog niet beschikbaar. Dit vraagt een veilige herinnering via de server.</p>
          </div>
          {a.verzoek ? <p className="px-3 pb-2 text-xs text-ink-soft">Dit verzoek blijft openstaan tot je hebt gereageerd.</p> : null}
        </PopoverContent>
      </Popover>
    </li>);
}
function Details({ a, onClose }) {
    const router = useRouter();
    return (<Sheet open={!!a} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
        {a ? (<>
            <SheetHeader className="text-left">
              <SheetTitle className="font-display text-lg">{a.titel}</SheetTitle>
              <SheetDescription>{a.uitleg}</SheetDescription>
            </SheetHeader>
            {a.onderdelen ? (<ul className="mt-3 divide-y divide-border">
                {a.onderdelen.map((o) => <li key={o.id} className="py-2 text-sm">{o.uitleg}{o.tijd ? <span className="block text-xs text-ink-soft">{o.tijd}</span> : null}</li>)}
              </ul>) : null}
            {a.wijzigingen?.length ? (<dl className="mt-3 space-y-2 text-sm">
                {a.wijzigingen.map((w) => (<div key={w.veld}>
                    <dt className="font-semibold">{w.veld}</dt>
                    <dd className="text-ink-soft">Was: {w.oud}</dd>
                    <dd>Wordt: {w.nieuw}</dd>
                  </div>))}
              </dl>) : null}
            {a.details?.length ? (<dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                {a.details.map((d) => <div key={d.label} className="contents"><dt className="text-ink-soft">{d.label}</dt><dd>{d.waarde}</dd></div>)}
              </dl>) : null}
            <button onClick={() => { onClose(); router.navigate({ href: a.naar }); }} className="mt-4 flex min-h-11 w-full items-center justify-center rounded-md bg-brand px-4 text-sm font-semibold text-primary-foreground">
              {a.verzoek ? "Bekijken en reageren" : "Openen"}
            </button>
          </>) : null}
      </SheetContent>
    </Sheet>);
}
