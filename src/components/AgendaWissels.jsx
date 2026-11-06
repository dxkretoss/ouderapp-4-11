import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { AppIcon } from "@/components/AppIcon";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { magOverdrachtVoorbereiden, ouderLabel } from "@/lib/agenda-zorg";
import { useVoorkeuren } from "@/lib/voorkeuren-store";
import { dt } from "@/lib/agenda-datum";
import { uur } from "@/lib/tijd-tekst";

/** One derived handover per child/date; no new appointment or handover record. */
export function AgendaWissels({ datum, gegevens }) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const vk = useVoorkeuren();
  const locale = i18n.language?.startsWith("en") ? "en-US" : "nl-NL";

  if (!gegevens.wissels.length) return null;

  return (
    <section className="my-2 border-l-2 border-accent-warm bg-accent-warm/10 px-3 py-2">
      <Button
        variant="ghost"
        className="h-auto min-h-11 w-full justify-start whitespace-normal px-0 text-left"
        onClick={() => setOpen(true)}
      >
        <AppIcon functie="wissel" maat="lg" />
        <span className="min-w-0">
          <span className="block font-semibold">{t("calendar.handoverMoment", "Wisselmoment")}</span>
          <span className="block text-xs font-normal text-ink-soft">
            {dt(datum).toLocaleDateString(locale, { day: "numeric", month: "long" })} ·{" "}
            {gegevens.wissels.map((k) => `${k.naam}${k.tijd ? ` · ${uur(k.tijd)}` : ""}`).join(" · ")}
          </span>
        </span>
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="inset-x-0 mx-auto w-full max-w-md max-h-[80dvh] overflow-y-auto rounded-t-2xl bg-background px-5 pb-8">
          <SheetHeader>
            <SheetTitle>{t("calendar.handoverMoment", "Wisselmoment")}</SheetTitle>
            <SheetDescription>
              {dt(datum).toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-3 divide-y divide-border">
            {gegevens.wissels.map((k) => (
              <div key={k.id} className="py-3 text-sm">
                <p className="font-semibold">
                  {k.tijd
                    ? k.naar === "sanne"
                      ? t("calendar.wissels.goesAtToYou", { name: k.naam, time: uur(k.tijd), defaultValue: `${k.naam} gaat om ${uur(k.tijd)} naar jou.` })
                      : t("calendar.wissels.goesAtToOther", { name: k.naam, time: uur(k.tijd), defaultValue: `${k.naam} gaat om ${uur(k.tijd)} naar de andere ouder.` })
                    : t("calendar.wissels.switchesHome", { name: k.naam, defaultValue: `${k.naam} wisselt van huis.` })}
                </p>
                <p className="mt-1 text-xs text-ink-soft">
                  {ouderLabel(k.van)} → {ouderLabel(k.naar)}
                </p>
                <p className="mt-1 text-xs text-ink-soft">
                  {t("calendar.wissels.handoverLocation", {
                    location: k.plek || t("calendar.wissels.notFilledIn", "Nog niet ingevuld"),
                    defaultValue: `Overdrachtslocatie: ${k.plek || "Nog niet ingevuld"}`,
                  })}
                </p>
                {k.uitzondering ? <p className="mt-1 text-xs">{k.uitzondering}</p> : null}
              </div>
            ))}
          </div>
          <div className="mt-3 grid gap-2">
            <Button asChild variant="outline">
              <Link to="/overdracht">{t("calendar.wissels.viewHandover", "Overdracht bekijken")}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/agenda" search={{ zorgActie: "wijziging", dag: datum }} onClick={() => setOpen(false)}>
                {t("calendar.wissels.proposeChange", "Wijziging voorstellen")}
              </Link>
            </Button>
            {gegevens.wissels.some((k) => magOverdrachtVoorbereiden(datum, k.tijd, new Date(), vk.overdrachtHulp)) ? (
              <Button asChild>
                <Link to="/overdracht">{t("calendar.wissels.prepareHandover", "Overdracht voorbereiden")}</Link>
              </Button>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </section>
  );
}
