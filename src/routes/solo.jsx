import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, Card, PageHeader } from "@/components/AppShell";
import { EmailKoppelingInstellen } from "@/components/EmailKoppelingInstellen";
import { Pictogram } from "@/components/AppIcon";
export const Route = createFileRoute("/solo")({
    head: () => ({
        meta: [
            { title: "Solo gebruiken — Ouderschap & Co" },
            { name: "description", content: "Gebruik Ouderschap & Co ook alleen: houd agenda, kosten, afspraken en een logboek bij als de andere ouder niet meedoet." },
            { property: "og:title", content: "Solo gebruiken — Ouderschap & Co" },
            { property: "og:description", content: "Overzicht en rust voor jezelf, ook als de andere ouder (nog) niet meedoet." },
            { property: "og:type", content: "website" },
            { name: "twitter:card", content: "summary" },
        ],
    }),
    component: Solo,
});
const voordelen = [
    { icoon: "📅", titel: "Eigen agenda & verdeling van de week", tekst: "Houd bij wanneer de kinderen bij jou zijn en welke afspraken er zijn." },
    { icoon: "💶", titel: "Kosten bijhouden", tekst: "Noteer wat je uitgeeft voor de kinderen, met bonnetjes erbij." },
    { icoon: "📓", titel: "Persoonlijk logboek", tekst: "Leg feitelijk en rustig vast wat er gebeurt, met datum en tijd." },
    { icoon: "📁", titel: "Documenten bij de hand", tekst: "Ouderschapsplan, schoolinfo en medische papieren op één plek." },
];
const logboek = [
    { id: "l1", datum: "10 maart · 14:35 uur", tekst: "Wissel verliep goed. Kinderen waren op tijd opgehaald bij school." },
    { id: "l2", datum: "7 maart · 20:10 uur", tekst: "Verzoek gestuurd om zomervakantie te plannen. Nog geen reactie." },
    { id: "l3", datum: "3 maart · 18:00 uur", tekst: "Schoolreisje Emma betaald (€ 42,00). Bonnetje bij Kosten." },
];
function Solo() {
    const [aan, setAan] = useState(false);
    const [notities, setNotities] = useState(logboek);
    const [nieuw, setNieuw] = useState("");
    const [email, setEmail] = useState("sanne@voorbeeld.nl");
    const [delen, setDelen] = useState("dicht");
    const [meenemen, setMeenemen] = useState({ agenda: true, kosten: true, documenten: false, logboek: false });
    return (<AppShell>
      <PageHeader titel="Solo gebruiken" subtitel="Voor jezelf, ook als de ander niet meedoet"/>

      <Card className="mt-6">
        <p className="text-sm leading-relaxed">
          Niet elke ouder is (meteen) klaar om samen te werken. In solo-modus gebruik je Ouderschap & Co gewoon voor jezelf.
          Alles blijft privé. Wil de andere ouder later toch meedoen? Dan nodig je hem of haar uit en kies je zelf wat je deelt.
        </p>
        <button onClick={() => setAan(!aan)} className="mt-4 flex w-full items-center justify-between rounded-md bg-surface px-4 py-3">
          <span className="text-sm font-semibold">Solo-modus {aan ? "aan" : "uit"}</span>
          <span className={`relative h-6 w-11 rounded-full transition-colors ${aan ? "bg-brand" : "bg-border"}`}>
            <span className={`absolute top-0.5 size-5 rounded-full bg-card shadow transition-all ${aan ? "left-5" : "left-0.5"}`}/>
          </span>
        </button>
        {aan ? (<p className="mt-3 text-xs text-brand">✓ Je gebruikt de app nu alleen. Niets wordt gedeeld met de andere ouder.</p>) : null}
      </Card>

      <h2 className="mt-6 font-display font-bold">Wat je solo kunt doen</h2>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {voordelen.map((v) => (<Card key={v.titel}>
            <Pictogram waarde={v.icoon} maat="md"/>
            <p className="mt-2 text-sm font-semibold">{v.titel}</p>
            <p className="mt-1 text-xs text-ink-soft">{v.tekst}</p>
          </Card>))}
      </div>

      <h2 className="mt-6 font-display font-bold">Mijn logboek</h2>
      <p className="mt-1 text-xs text-ink-soft">
        Schrijf feitelijk op wat er gebeurt. Dat geeft overzicht, en het helpt als je later met een mediator praat.
      </p>
      <Card className="mt-3">
        <textarea value={nieuw} onChange={(e) => setNieuw(e.target.value)} placeholder="Wat is er vandaag gebeurd?" rows={3} className="w-full resize-none rounded-xl bg-surface p-3 text-sm outline-none"/>
        <button disabled={!nieuw.trim()} onClick={() => {
            setNotities([{ id: String(Date.now()), datum: "Vandaag", tekst: nieuw.trim() }, ...notities]);
            setNieuw("");
        }} className="mt-2 w-full rounded-xl bg-brand py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40">
          Toevoegen
        </button>
      </Card>
      <div className="mt-3 space-y-3">
        {notities.map((n) => (<Card key={n.id}>
            <p className="text-[11px] font-semibold text-ink-soft">{n.datum}</p>
            <p className="mt-1 text-sm">{n.tekst}</p>
          </Card>))}
      </div>

      <h2 className="mt-6 font-display font-bold">Communicatie</h2>
      <EmailKoppelingInstellen />

      <h2 className="mt-6 font-display font-bold">Jouw account</h2>
      <Card className="mt-3">
        <p className="text-xs text-ink-soft">Solo werkt volledig met één eigen account. Er hoeft niemand anders uitgenodigd te worden.</p>
        <label className="mt-3 block text-xs font-semibold text-ink-soft">E-mailadres
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm font-normal text-ink"/>
        </label>
      </Card>

      <Card className="mt-6 bg-accent-soft">
        <p className="text-sm font-semibold">Toch samen verder?</p>
        <p className="mt-1 text-xs text-ink-soft">Start een gedeelde omgeving wanneer het goed voelt. Al je gegevens blijven bewaard; jij kiest wat de ander ziet.</p>
        {delen === "dicht" ? <button onClick={() => setDelen("kiezen")} className="mt-3 w-full rounded-md bg-brand py-2.5 text-sm font-semibold text-primary-foreground">Samen verder in de app</button> : null}
        {delen === "kiezen" ? (<div className="mt-3 space-y-2 text-sm">
            <p className="text-xs font-semibold">Wat wil je delen? De rest blijft privé.</p>
            {[["agenda", "Agenda en verdeling van de week"], ["kosten", "Kosten"], ["documenten", "Documenten"], ["logboek", "Persoonlijk logboek"]].map(([k, l]) => (<label key={k} className="flex items-center gap-2"><input type="checkbox" checked={meenemen[k]} onChange={() => setMeenemen({ ...meenemen, [k]: !meenemen[k] })} className="accent-[var(--brand)]"/>{l}</label>))}
            <p className="text-[11px] text-ink-soft">Niets wordt automatisch gedeeld; ook de e-mailgeschiedenis blijft privé. Het logboek staat standaard op privé. Niets wordt verwijderd.</p>
            <button onClick={() => setDelen("verstuurd")} className="w-full rounded-md bg-brand py-2.5 text-sm font-semibold text-primary-foreground">Uitnodiging klaarzetten</button>
          </div>) : null}
        {delen === "verstuurd" ? <p className="mt-3 text-xs text-brand">✓ Uitnodiging klaargezet. Pas als de andere ouder accepteert, wordt gedeeld wat je koos.</p> : null}
        <Link to="/professionals" className="mt-3 inline-block text-xs font-semibold text-brand">
          Of vraag hulp aan een mediator ›
        </Link>
      </Card>
    </AppShell>);
}
