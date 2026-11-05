import { cn } from "@/lib/utils";
import { AppIcon } from "@/components/AppIcon";
/** Eén gedeeld lampje voor Co, zonder gezicht of technisch AI-symbool. */
export function CoBadge({ maat = "md", className }) {
    return (<span aria-hidden className={cn("inline-flex shrink-0 select-none", className)}>
      <AppIcon functie="co" maat={maat}/>
    </span>);
}
