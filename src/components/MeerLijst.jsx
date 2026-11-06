import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { AppIcon } from "@/components/AppIcon";
export function MeerSectie({ titel, items, klein, compact = false, onBezoek }) {
    return (<section className={compact ? "mt-5" : klein ? "mt-6" : "mt-8"}>
      {klein ? <h3 className={compact ? "text-xs font-semibold text-ink-soft" : "text-[11px] font-semibold uppercase tracking-wider text-ink-soft/80"}>{titel}</h3> : <h2 className="font-display text-base font-semibold text-ink-soft">{titel}</h2>}
      <div className={compact ? "mt-1 divide-y divide-border" : "mt-2 space-y-0.5"}>
        {items.map((item) => {
            return (<Link key={item.to} to={item.to} onClick={() => onBezoek?.(item.to)} className={`group flex items-center gap-3.5 transition-colors hover:bg-muted/60 ${compact ? "min-h-14 py-2" : "-mx-2 min-h-[64px] rounded-xl px-2 py-2.5"}`}>
            <AppIcon functie={item.icoon} maat="lg"/>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold leading-snug text-ink">{item.titel}</span>
                <span className="mt-0.5 block text-xs leading-snug text-ink-soft">{item.context ?? item.tekst}</span>
              </span>
              {item.aantal ? <span aria-label={`${item.aantal} wacht op jou`} className="grid size-5 shrink-0 place-items-center rounded-full bg-[color-mix(in_oklch,var(--ic-koraal)_22%,transparent)] text-[11px] font-bold text-ink">{item.aantal}</span> : null}
              <ChevronRight className="size-5 shrink-0 text-ink-soft/70 transition-transform group-hover:translate-x-0.5" />
            </Link>);
        })}
      </div>
    </section>);
}
