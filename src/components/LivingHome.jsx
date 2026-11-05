import { useEffect, useState } from "react";
import { AppIcon } from "@/components/AppIcon";
import { useVoorkeuren } from "@/lib/voorkeuren-store";
import { dagdeel, haalWeer, seizoen } from "@/lib/living-home";
/** Sfeerlaag achter de bovenkant van Home. Raakt nooit tekst, kaarten of knoppen (pointer-events: none). */
export function LivingSfeer({ moment }) {
    const vk = useVoorkeuren();
    const [nu, setNu] = useState(null);
    const [confetti, setConfetti] = useState(false);
    useEffect(() => setNu(new Date()), []);
    useEffect(() => {
        if (moment?.soort !== "verjaardag" || !vk.bijzondereMomenten)
            return;
        const k = `lh-jarig-${new Date().toDateString()}`;
        if (sessionStorage.getItem(k))
            return;
        sessionStorage.setItem(k, "1");
        setConfetti(true);
        const t = setTimeout(() => setConfetti(false), 2000);
        return () => clearTimeout(t);
    }, [moment, vk.bijzondereMomenten]);
    if (!vk.livingHome || !nu)
        return <div className="home-sfeer" aria-hidden/>;
    const ruw = undefined;
    const w = ruw === "zon" && ["avond", "nacht"].includes(dagdeel(nu)) ? undefined : ruw;
    const cls = [
        "home-sfeer living",
        `lh-${dagdeel(nu)}`,
        vk.seizoenEffecten ? `lh-${seizoen(nu)}` : "",
        w ? `lh-w-${w}` : "",
        vk.bijzondereMomenten && moment ? `lh-m-${moment.soort}` : "",
        vk.beweging === "verminderd" ? "lh-stil" : "",
    ].join(" ");
    return (<div className={cls} aria-hidden>
      <svg className="lh-vormen" viewBox="0 0 200 120" preserveAspectRatio="xMaxYMin meet">
        <ellipse className="lh-vorm-a" cx="120" cy="40" rx="62" ry="46"/>
        <ellipse className="lh-vorm-b" cx="160" cy="58" rx="54" ry="42"/>
      </svg>
      {(w === "regen" || w === "sneeuw") && (<div className={`lh-deeltjes lh-${w}`}>
          {Array.from({ length: w === "regen" ? 14 : 7 }, (_, i) => (<span key={i} style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i * 0.53) % 4}s` }}/>))}
        </div>)}
      {confetti && vk.beweging !== "verminderd" && (<div className="lh-confetti">
          {Array.from({ length: 10 }, (_, i) => <span key={i} style={{ left: `${8 + i * 9}%`, animationDelay: `${(i % 4) * 0.12}s` }}/>)}
        </div>)}
    </div>);
}
function useWeer() {
    const { weerPlaats, weerEffecten, livingHome } = useVoorkeuren();
    const [w, setW] = useState(null);
    useEffect(() => {
        if (!weerEffecten || !livingHome)
            return;
        let weg = false;
        haalWeer(weerPlaats).then((r) => { if (!weg)
            setW(r); });
        return () => { weg = true; };
    }, [weerPlaats, weerEffecten, livingHome]);
    return w;
}
const weerFunctie = { zon: "zon", bewolkt: "bewolkt", regen: "regen", sneeuw: "sneeuw", onweer: "onweer" };
const woorden = { zon: "zonnig", bewolkt: "bewolkt", regen: "regen", sneeuw: "sneeuw", onweer: "onweer" };
/** Klein weersymbool naast de datum — geen weerkaart. */
export function WeerTeken() {
    const vk = useVoorkeuren();
    const w = useWeer();
    if (!vk.livingHome || !vk.weerEffecten || !w)
        return null;
    const donker = ["avond", "nacht"].includes(dagdeel(new Date()));
    const functie = w.weer === "zon" && donker ? "nacht" : weerFunctie[w.weer];
    return (<span className="ml-2 inline-flex items-center gap-1 text-ink-soft" title={`Weer in ${vk.weerPlaats}`}>
      <AppIcon functie={functie} maat="sm" vorm="kaal"/>
      <span className="sr-only">{woorden[w.weer]}, </span>{w.graden}°
    </span>);
}
