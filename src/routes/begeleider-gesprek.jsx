import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { AppShell, PageHeader } from "@/components/AppShell";
import { bereikbareBegeleiders, GEZIN_DOSSIER, momentKort, stuurOuderBericht, useProWerk, zelfdeGesprek } from "@/lib/pro-journaal-store";
export const Route = createFileRoute("/begeleider-gesprek")({
    validateSearch: z.object({ met: z.enum(["prive", "samen"]).optional(), pro: z.string().optional() }),
    head: () => ({
        meta: [
            { title: "Gesprek met je begeleider — Ouderschap & Co" },
            { name: "description", content: "Berichten met jullie betrokken professional, met altijd zichtbaar wie meeleest." },
            { property: "og:title", content: "Gesprek met je begeleider — Ouderschap & Co" },
            { property: "og:description", content: "Altijd duidelijk wie het gesprek kan lezen." },
            { property: "og:type", content: "website" },
            { name: "twitter:card", content: "summary" },
        ],
    }),
    component: BegeleiderGesprek,
});
const IKZELF = "Sanne";
const ANDERE = "Joris";
function BegeleiderGesprek() {
    const werk = useProWerk();
    const { met = "prive", pro: proId } = Route.useSearch();
    const navigate = Route.useNavigate();
    const [tekst, setTekst] = useState("");
    const bereikbaar = bereikbareBegeleiders(GEZIN_DOSSIER, werk);
    const ouders = met === "samen" ? [IKZELF, ANDERE] : [IKZELF];
    // Een bestaand gesprek blijft leesbaar, ook als de begeleider geen berichten meer mag ontvangen.
    const pro = proId ? werk.pros.find((p) => p.id === proId && p.dossier === GEZIN_DOSSIER) : bereikbaar.length === 1 ? bereikbaar[0] : undefined;
    const magSturen = !!pro && bereikbaar.some((p) => p.id === pro.id);
    if (!pro && bereikbaar.length > 1) {
        return (<AppShell>
        <PageHeader titel="Contact met begeleider" terug="/contact"/>
        <h2 className="mt-6 text-sm font-semibold">Met wie wil je contact?</h2>
        <div className="mt-2 divide-y divide-border rounded-md border border-border bg-card">
          {bereikbaar.map((p) => (<button key={p.id} onClick={() => navigate({ search: { pro: p.id } })} className="flex min-h-14 w-full items-center gap-3 px-3 py-3 text-left">
              <span className="flex-1"><span className="block text-sm font-semibold">{p.naam}</span><span className="block text-xs text-ink-soft">{p.rol}</span></span>
              <span className="text-ink-soft" aria-hidden>›</span>
            </button>))}
        </div>
      </AppShell>);
    }
    if (!pro) {
        return (<AppShell>
        <PageHeader titel="Gesprek met begeleider" terug="/contact"/>
        <p className="mt-6 text-sm text-ink-soft">Er is nu geen begeleider die je via de app kunt bereiken.</p>
      </AppShell>);
    }
    const lezers = met === "samen" ? `${IKZELF}, ${ANDERE} en ${pro.naam}` : `Alleen jij en ${pro.naam}`;
    const lijst = werk.berichten.filter((b) => zelfdeGesprek(b, GEZIN_DOSSIER, ouders)).sort((a, b) => a.moment.localeCompare(b.moment));
    const verstuur = () => {
        if (!tekst.trim() || !magSturen)
            return;
        stuurOuderBericht(GEZIN_DOSSIER, IKZELF, ouders, tekst.trim());
        setTekst("");
    };
    return (<AppShell>
      <PageHeader titel={`Gesprek met ${pro.naam}`} subtitel={`${pro.rol}`} terug="/contact"/>
      <div role="tablist" className="mt-5 grid grid-cols-2 gap-1 rounded-full border border-border p-1 text-sm font-semibold">
        {[["prive", "Alleen wij tweeën"], ["samen", `Met ${ANDERE} erbij`]].map(([k, l]) => (<button key={k} role="tab" aria-selected={met === k} onClick={() => navigate({ search: { met: k, pro: proId } })} className={`min-h-11 rounded-full ${met === k ? "bg-brand-soft text-ink" : "text-ink-soft"}`}>{l}</button>))}
      </div>
      <p className="mt-3 rounded-md bg-muted px-3 py-2 text-sm"><b>Wie kan dit lezen?</b> {lezers}.</p>
      <p className="mt-1 text-[11px] text-ink-soft">Dit zijn twee aparte gesprekken. Berichten uit het ene gesprek verschijnen nooit in het andere.</p>

      <div className="mt-5 space-y-3">
        {lijst.length === 0 ? <p className="text-sm text-ink-soft">Nog geen berichten in dit gesprek.</p> : null}
        {lijst.map((b) => (<div key={b.id} className={`max-w-[85%] rounded-lg border border-border px-3 py-2 text-sm ${b.door === IKZELF ? "ml-auto bg-brand-soft" : "bg-card"}`}>
            {b.onderwerp !== "Gesprek met begeleider" ? <p className="text-xs font-semibold">{b.onderwerp}</p> : null}
            <p>{b.tekst}</p>
            <p className="mt-1 text-[11px] text-ink-soft">{b.door === IKZELF ? "Jij" : b.door} · {momentKort(b.moment)}</p>
          </div>))}
      </div>

      {!magSturen ? <p role="status" className="mt-5 rounded-md bg-muted px-3 py-2 text-sm">Je kunt {pro.naam} via de app niet meer berichten. Eerdere berichten blijven hier staan.</p> : <div className="mt-5 space-y-2">
        <label className="block text-xs text-ink-soft" htmlFor="bericht">Je bericht · leesbaar voor: {lezers}</label>
        <textarea id="bericht" value={tekst} onChange={(e) => setTekst(e.target.value)} rows={3} className="w-full rounded-md border border-border bg-card p-3 text-sm"/>
        <button onClick={verstuur} disabled={!tekst.trim()} className="min-h-11 w-full rounded-full bg-brand text-sm font-semibold text-primary-foreground disabled:opacity-40">Versturen</button>
      </div>}
    </AppShell>);
}
