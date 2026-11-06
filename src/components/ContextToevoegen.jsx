import { Plus, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { AppIcon } from "@/components/AppIcon";
export function ContextToevoegen({ titel, acties, toegestaan = true, open, onOpenChange }) {
    if (!toegestaan)
        return null;
    return (<Sheet {...(open !== undefined ? { open } : {})} {...(onOpenChange ? { onOpenChange } : {})}>
      <SheetTrigger asChild>
        <Button type="button" variant="outline" size="icon" aria-label={titel} title={titel} className="mt-2 shrink-0 rounded-full border-brand/40 bg-background text-brand hover:bg-brand-soft hover:text-brand">
          <Plus aria-hidden="true" strokeWidth={1.8}/>
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="inset-x-0 mx-auto w-full max-w-md rounded-t-2xl border-border bg-background px-5 pb-8 pt-4">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border"/>
        <SheetHeader className="pr-8 text-left">
          <SheetTitle className="font-display text-xl font-medium text-ink">{titel}</SheetTitle>
          <SheetDescription className="sr-only">Kies wat je vanaf deze pagina wilt regelen.</SheetDescription>
        </SheetHeader>
        <div className="mt-3 space-y-0.5">
          {acties.map((actie) => {
            const Icon = actie.icoon;
            return (<SheetClose asChild key={actie.titel}>
                <Button type="button" variant="ghost" onClick={actie.onKies} className="h-auto w-full justify-start whitespace-normal rounded-none px-0 py-3.5 text-left hover:bg-transparent">
                  {actie.functie ? (<AppIcon functie={actie.functie} maat="lg"/>) : (<span className="app-icoon-vorm grid size-11 shrink-0 place-items-center bg-brand-soft text-[var(--ic-salie)]"><Icon strokeWidth={1.75} className="size-6"/></span>)}
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-ink">{actie.titel}</span>
                    <span className="mt-0.5 block text-xs font-normal leading-relaxed text-ink-soft">{actie.uitleg}</span>
                  </span>
                  <ChevronRight className="size-5 shrink-0 text-ink-soft" />
                </Button>
              </SheetClose>);
        })}
        </div>
      </SheetContent>
    </Sheet>);
}
