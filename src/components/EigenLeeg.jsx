import React from "react";
import { useTranslation } from "react-i18next";
import { AppShell, BackButton } from "@/components/AppShell";
import { Assistent } from "@/components/Assistent";
import { AppIcon } from "@/components/AppIcon";

/**
 * Lege weergave voor een eigen gezin: de pagina begint leeg in plaats van met
 * het voorbeeldgezin, met uitleg en één duidelijke eerste stap.
 * Met toevoegLabel/onToevoeg komt er een primaire toevoegknop én een plusje rechtsboven.
 */
export function EigenLeeg({
  titel,
  icoon,
  tekst,
  knop,
  onKnop,
  extra,
  toevoegLabel,
  onToevoeg,
}) {
  const { t } = useTranslation();

  return (
    <AppShell>
      <div className="flex items-start gap-3">
        <BackButton terug="/" />
        <h1 className="flex-1 font-display text-2xl font-extrabold leading-tight">{titel}</h1>
        {onToevoeg ? (
          <button
            type="button"
            aria-label={toevoegLabel ?? t("common.actions", "Toevoegen")}
            onClick={onToevoeg}
            className="inline-flex size-11 items-center justify-center rounded-full text-xl font-semibold text-brand hover:bg-muted cursor-pointer"
          >
            +
          </button>
        ) : null}
        <div className="mt-1">
          <Assistent pagina={titel} />
        </div>
      </div>
      <div className="mt-10 flex flex-col items-center text-center">
        <AppIcon functie={icoon} maat="lg" className="size-16 rounded-2xl" />
        <p className="mt-4 font-display text-lg font-bold">
          {t("common.emptyStateTitle", "Hier is het nog rustig")}
        </p>
        <p className="mt-1 max-w-xs text-sm text-ink-soft">{tekst}</p>
        {onToevoeg ? (
          <button
            type="button"
            onClick={onToevoeg}
            className="mt-5 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-primary-foreground cursor-pointer hover:opacity-90"
          >
            {toevoegLabel ?? t("common.actions", "Toevoegen")}
          </button>
        ) : null}
        <button
          type="button"
          onClick={onKnop}
          className={
            onToevoeg
              ? "mt-3 min-h-11 text-sm font-semibold text-ink-soft cursor-pointer hover:text-ink"
              : "mt-5 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-primary-foreground cursor-pointer hover:opacity-90"
          }
        >
          {knop}
        </button>
        {extra}
      </div>
    </AppShell>
  );
}
