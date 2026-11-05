import { useEffect, useState } from "react";
import { Copy, Mail, MessageCircle, Share2 } from "lucide-react";
import { kinderen } from "@/lib/demo-data";
import { persoonLabel } from "@/lib/kring-store";
/** Deelt een unieke uitnodigingslink. De link alleen geeft geen toegang: de ontvanger moet inloggen en bevestigen. */
export function UitnodigingDelen({ p }) {
    const [origin, setOrigin] = useState("");
    const [gekopieerd, setGekopieerd] = useState(false);
    const [kanDelen, setKanDelen] = useState(false);
    useEffect(() => { setOrigin(window.location.origin); setKanDelen(typeof navigator.share === "function"); }, []);
    const link = `${origin}/uitnodiging?t=${encodeURIComponent(p.sleutel)}`;
    const kids = kinderen.filter((k) => p.rechten[k.id]).map((k) => k.naam).join(" en ");
    const tekst = `Hoi ${p.naam}, je bent uitgenodigd als ${p.rol.toLowerCase()} rondom ${kids} in Ouderschap & Co. Open de link, log in en bevestig de uitnodiging: ${link}`;
    const rij = "flex w-full items-center gap-3 py-3 text-left text-sm font-semibold";
    return (<div>
      <p className="mt-1 text-xs text-ink-soft">Voor {persoonLabel(p)} · {p.rol} · {kids}. Alleen de rechten die je hebt gekozen.</p>
      <div className="mt-3 divide-y divide-border border-y border-border">
        <a className={rij} href={`mailto:${p.email ?? ""}?subject=${encodeURIComponent("Uitnodiging voor Ouderschap & Co")}&body=${encodeURIComponent(tekst)}`}><Mail className="size-4 text-brand" strokeWidth={1.6}/>Via e-mail</a>
        <a className={rij} href={`https://wa.me/?text=${encodeURIComponent(tekst)}`} target="_blank" rel="noopener noreferrer"><MessageCircle className="size-4 text-brand" strokeWidth={1.6}/>Via WhatsApp</a>
        <button className={rij} onClick={async () => { try {
        await navigator.clipboard.writeText(link);
        setGekopieerd(true);
        setTimeout(() => setGekopieerd(false), 2000);
    }
    catch { /* geen klembord */ } }}>
          <Copy className="size-4 text-brand" strokeWidth={1.6}/>{gekopieerd ? "Link gekopieerd" : "Link kopiëren"}
        </button>
        {kanDelen ? <button className={rij} onClick={() => navigator.share({ title: "Uitnodiging voor Ouderschap & Co", text: tekst, url: link }).catch(() => { })}><Share2 className="size-4 text-brand" strokeWidth={1.6}/>Delen via…</button> : null}
      </div>
      <p className="mt-2 text-[11px] text-ink-soft">Wie de link heeft, krijgt niet vanzelf toegang. {p.naam} moet eerst inloggen of een account maken en de uitnodiging bevestigen. Intrekken kan altijd; de link werkt dan niet meer.</p>
    </div>);
}
