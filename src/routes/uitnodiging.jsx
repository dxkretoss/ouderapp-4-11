import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { z } from "zod";
import { kinderen } from "@/lib/demo-data";
import { bevestigUitnodiging, persoonVoorUitnodiging, rechtenSamenvatting, useKring } from "@/lib/kring-store";
export const Route = createFileRoute("/uitnodiging")({
    validateSearch: z.object({ t: z.string().optional() }),
    head: () => ({ meta: [
            { title: "Uitnodiging — Ouderschap & Co" },
            { name: "description", content: "Bevestig je uitnodiging voor de kring rond een kind in Ouderschap & Co." },
            { property: "og:title", content: "Uitnodiging — Ouderschap & Co" },
            { property: "og:description", content: "Log in en bevestig je uitnodiging." },
            { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
            { name: "robots", content: "noindex" },
        ] }),
    component: Uitnodiging,
});
function Uitnodiging() {
    const { t } = useTranslation();
    const { t: token } = Route.useSearch();
    useKring();
    const p = token ? persoonVoorUitnodiging(token) : undefined;
    const [stap, setStap] = useState("open");
    const [email, setEmail] = useState("");
    const [ingelogd, setIngelogd] = useState(false);
    const knop = "w-full rounded-md bg-brand py-3 text-sm font-semibold text-primary-foreground disabled:opacity-40";
    if (stap === "klaar")
        return (<Kader><h1 className="font-display text-3xl">Welkom in de kring</h1><p className="mt-2 text-sm text-ink-soft">Je uitnodiging is bevestigd. Je ziet alleen wat de ouders met je delen.</p>
      <Link to="/verzorger" className="mt-6 block text-sm font-semibold text-brand">Naar de app ›</Link></Kader>);
    if (!p)
        return (<Kader><h1 className="font-display text-2xl">Deze uitnodiging werkt niet</h1><p className="mt-2 text-sm text-ink-soft">De link is al gebruikt, ingetrokken of klopt niet. Vraag de ouders om een nieuwe uitnodiging.</p></Kader>);
    const kids = kinderen.filter((k) => p.rechten[k.id]);
    return (<Kader>
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand">Uitnodiging</p>
      <h1 className="mt-1 font-display text-3xl">Hoi {p.naam}</h1>
      <p className="mt-2 text-sm text-ink-soft">Je bent uitgenodigd als {p.rol.toLowerCase()} rondom {kids.map((k) => k.naam).join(" en ")}.</p>

      {stap === "open" ? (<><p className="mt-6 text-sm">Om je privacy en die van de kinderen te beschermen, log je eerst in of maak je een account.</p>
          <button onClick={() => setStap("inloggen")} className={`mt-4 ${knop}`}>Inloggen of account maken</button></>) : null}

      {stap === "inloggen" ? (<><label className="mt-6 block text-xs font-semibold">E-mailadres
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-brand"/></label>
          <button disabled={!/.+@.+\..+/.test(email)} onClick={() => { setIngelogd(true); setStap("bevestig"); }} className={`mt-4 ${knop}`}>Doorgaan</button>
          <p className="mt-2 text-[11px] text-ink-soft">Voorbeeld: in deze demo wordt nog geen echt account aangemaakt.</p></>) : null}

      {stap === "bevestig" ? (<>
          <h2 className="mt-6 text-[11px] font-bold uppercase tracking-[0.14em] text-brand">Wat je straks kunt zien</h2>
          <div className="mt-1 divide-y divide-border border-y border-border">
            {kids.map((k) => <p key={k.id} className="py-2.5 text-sm"><b>{k.naam}</b> · {rechtenSamenvatting({ ...p, bevestigd: true }, k.id)}</p>)}
          </div>
          <button onClick={() => { if (bevestigUitnodiging(p.sleutel, ingelogd))
            setStap("klaar"); }} className={`mt-6 ${knop}`}>Uitnodiging bevestigen</button>
        </>) : null}
    </Kader>);
}
function Kader({ children }) {
    return <div className="app-canvas min-h-screen font-body text-ink"><div className="mx-auto max-w-md px-5 py-10">{children}</div></div>;
}
