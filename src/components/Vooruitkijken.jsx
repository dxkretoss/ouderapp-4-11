import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Compass, MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { laterHerinneren, morgenOverzicht, nietMeerTonen, nogTeRegelenDezeWeek, sindsLaatsteBezoek, suggesties, useSlimmeHulp, weekOverzicht } from "@/lib/slimme-hulp";
import { useTaken } from "@/lib/taken-store";
import { useKring } from "@/lib/kring-store";
import { useVoorkeuren } from "@/lib/voorkeuren-store";
import { useAudit } from "@/lib/audit-store";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { uur } from "@/lib/tijd-tekst";

/** "Even vooruitkijken" op Home: hooguit 3 suggesties, uitleg per suggestie, wegdrukken; plus Deze week / Morgen. */
export function Vooruitkijken() {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language?.startsWith("en");

  useSlimmeHulp();
  useTaken();
  useKring();
  useAudit();
  const vk = useVoorkeuren();
  const [waarom, setWaarom] = useState(null);
  const [week, setWeek] = useState(false);
  const [avond, setAvond] = useState(false);
  const [sinds, setSinds] = useState(null);
  const [laterId, setLaterId] = useState(null);
  const [laterDag, setLaterDag] = useState("");
  const [, ververs] = useState(0);

  useEffect(() => {
    setAvond(new Date().getHours() >= 18);
    setSinds(sindsLaatsteBezoek());
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => ververs((n) => n + 1), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const herinner = (morgen) => {
    if (!laterId) return;
    const tijd = new Date();
    if (morgen) tijd.setDate(tijd.getDate() + 1);
    tijd.setHours(morgen ? 9 : 19, 0, 0, 0);
    if (tijd.getTime() <= Date.now()) tijd.setTime(Date.now() + 3600000);
    laterHerinneren(laterId, tijd.getTime());
    setLaterId(null);
  };

  // Helper translations for suggestions
  const translateTitle = (title) => {
    if (!isEn) return title;
    return title
      .replace(/Handig voor maandag/i, "Helpful for Monday")
      .replace(/Handig voor dinsdag/i, "Helpful for Tuesday")
      .replace(/Handig voor woensdag/i, "Helpful for Wednesday")
      .replace(/Handig voor donderdag/i, "Helpful for Thursday")
      .replace(/Handig voor vrijdag/i, "Helpful for Friday")
      .replace(/Handig voor zaterdag/i, "Helpful for Saturday")
      .replace(/Handig voor zondag/i, "Helpful for Sunday");
  };

  const translateText = (text) => {
    if (!isEn) return text;
    return text
      .replace(/Donderdag heeft Noah voetbaltraining en de voetbalschoenen staan bij de andere ouder\./i, "Thursday Noah has soccer practice and the football shoes are with the other parent.")
      .replace(/heeft Noah voetbaltraining/gi, "Noah has soccer practice")
      .replace(/de voetbalschoenen staan/gi, "the football shoes are")
      .replace(/bij de andere ouder/gi, "with the other parent")
      .replace(/bij jou/gi, "with you");
  };

  const translateAction = (label) => {
    if (!isEn) return label;
    if (label.toLowerCase().includes("bekijk spullen")) return t("home.viewItems", "View items");
    return label;
  };

  // Home 5.0: hooguit twee slimme suggesties; "Voor morgen" staat al in Komende dagen.
  const lijst = vk.slimSuggesties ? suggesties().slice(0, 1) : [];
  if (!lijst.length && !vk.weekVooruit && !sinds) return null;

  return (
    <section className="relative mt-7" aria-label={t("home.lookAhead", "Vooruitblik")}>
      {sinds ? (
        <div className="mb-4 border-b border-border pb-3 text-xs text-ink-soft">
          <p className="font-semibold text-ink">{t("home.sinceLastVisit", "Sinds je laatste bezoek")}</p>
          <ul className="mt-1 space-y-1">
            {sinds.regels.map((r) => (
              <li key={r.id}>
                <Link to={r.to} hash={r.hash} onClick={() => setSinds(null)} className="inline-flex min-h-11 items-center font-semibold text-brand">
                  {r.tekst} →
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-1 flex gap-4">
            <button type="button" onClick={() => setSinds(null)} className="font-semibold text-ink-soft cursor-pointer">
              {t("common.seen", "Gezien")}
            </button>
          </div>
        </div>
      ) : null}

      {lijst.length ? (
        <>
          <h2 className="flex items-center gap-2 font-display text-lg font-bold">
            <Compass className="size-4 text-brand" strokeWidth={1.6} aria-hidden="true" />
            {t("home.lookAhead", "Vooruitblik")}
          </h2>
          <ul className="mt-2 divide-y divide-border border-y border-border">
            {lijst.map((s) => (
              <li key={s.id} className="py-3">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{translateTitle(s.titel)}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">{translateText(s.tekst)}</p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger aria-label={t("common.actions", "Meer opties")} className="-mr-2 -mt-2 grid size-10 shrink-0 place-items-center rounded-full text-ink-soft cursor-pointer">
                      <MoreHorizontal className="size-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => setWaarom(waarom === s.id ? null : s.id)}>
                        {t("home.whyAmISeeingThis", "Waarom zie ik dit?")}
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => { setLaterId(s.id); setLaterDag(""); }}>
                        {t("home.remindLater", "Later herinneren")}
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => nietMeerTonen(s.type)}>
                        {t("home.dontShowThisType", "Dit soort niet meer tonen")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {waarom === s.id ? (
                  <p className="mt-2 rounded-md bg-muted px-3 py-2 text-[11px] leading-relaxed text-ink-soft">
                    {s.waarom}
                  </p>
                ) : null}
                <div className="mt-2 flex flex-wrap gap-2">
                  {s.acties.slice(0, 1).map((a) =>
                    a.to ? (
                      <Link key={a.label} to={a.to} search={a.search} className="rounded-full border border-brand/40 px-3 py-1 text-xs font-semibold text-brand">
                        {translateAction(a.label)}
                      </Link>
                    ) : (
                      <button key={a.label} onClick={a.doe} className="rounded-full border border-brand/40 px-3 py-1 text-xs font-semibold text-brand cursor-pointer">
                        {translateAction(a.label)}
                      </button>
                    )
                  )}
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {vk.weekVooruit ? (
        <div className="mt-3">
          <button
            onClick={() => setWeek(!week)}
            aria-expanded={week}
            className="mt-1 text-xs font-semibold text-brand cursor-pointer hover:underline"
          >
            {week ? t("home.hideThisWeek", "Deze week verbergen") : t("home.viewThisWeek", "Deze week bekijken →")}
          </button>
          {week ? (
            <div className="mt-2 space-y-3 border-l-2 border-border pl-3">
              {weekOverzicht()
                .filter((d) => d.regels.length)
                .map((d) => (
                  <DagBlok key={d.iso} titel={d.label} dag={d} isEn={isEn} />
                ))}
              {nogTeRegelenDezeWeek() ? (
                <p className="text-xs text-ink-soft">
                  {t("home.pendingThisWeek", {
                    count: nogTeRegelenDezeWeek(),
                    defaultValue: `${nogTeRegelenDezeWeek()} ${nogTeRegelenDezeWeek() === 1 ? "ding" : "dingen"} om deze week nog te regelen`,
                  })}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      <Sheet open={laterId !== null} onOpenChange={(open) => { if (!open) setLaterId(null); }}>
        <SheetContent side="bottom" className="mx-auto max-w-lg">
          <SheetHeader>
            <SheetTitle>{t("home.whenToSeeAgain", "Wanneer wil je dit weer zien?")}</SheetTitle>
            <SheetDescription>{t("home.whenToSeeAgainDesc", "Het punt komt dan terug, zolang het nog openstaat.")}</SheetDescription>
          </SheetHeader>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => herinner(false)}>
              {t("home.tonight", "Vanavond")}
            </Button>
            <Button variant="outline" onClick={() => herinner(true)}>
              {t("common.tomorrow", "Morgen")}
            </Button>
          </div>
          <label className="mt-4 block text-sm font-semibold">
            {t("home.otherDay", "Andere dag")}
            <input
              type="datetime-local"
              value={laterDag}
              onChange={(e) => setLaterDag(e.target.value)}
              className="mt-2 block w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
            />
          </label>
          <Button
            className="mt-3 w-full"
            disabled={!laterDag || !Number.isFinite(new Date(laterDag).getTime()) || new Date(laterDag).getTime() <= Date.now()}
            onClick={() => {
              if (!laterId) return;
              laterHerinneren(laterId, new Date(laterDag).getTime());
              setLaterId(null);
            }}
          >
            {t("common.save", "Bewaren")}
          </Button>
        </SheetContent>
      </Sheet>
    </section>
  );
}

function DagBlok({ titel, dag, isEn }) {
  const dagVertaald = (d) => {
    if (!isEn) return d;
    return d
      .replace(/^Maandag/i, "Monday")
      .replace(/^Dinsdag/i, "Tuesday")
      .replace(/^Woensdag/i, "Wednesday")
      .replace(/^Donderdag/i, "Thursday")
      .replace(/^Vrijdag/i, "Friday")
      .replace(/^Zaterdag/i, "Saturday")
      .replace(/^Zondag/i, "Sunday");
  };

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">{dagVertaald(titel)}</p>
      <ul className="mt-1 space-y-1">
        {dag.regels.map((r, i) => (
          <li key={i}>
            <Link to={r.naar} search={r.dag ? { dag: r.dag } : undefined} className="block text-sm">
              <span className="font-semibold">
                {r.tijd && r.tijd !== "Hele dag" ? `${uur(r.tijd)} · ` : ""}
                {r.tekst}
              </span>
              {r.sub ? <span className="block text-xs text-ink-soft">{r.sub}</span> : null}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
