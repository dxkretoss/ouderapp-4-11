import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
export function VoorstelIntrekken({ onBevestig }) {
    const [open, setOpen] = useState(false);
    return <>
    <Button variant="ghost" size="sm" className="text-ink-soft" onClick={() => setOpen(true)}>Voorstel intrekken</Button>
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent className="max-w-[calc(100%-2rem)] rounded-xl shadow-none sm:max-w-md">
        <AlertDialogTitle>Voorstel intrekken?</AlertDialogTitle>
        <AlertDialogDescription>Het voorstel blijft in de geschiedenis als ‘Ingetrokken’. Het kan daarna niet meer worden goedgekeurd. De huidige afspraken blijven gelden.</AlertDialogDescription>
        <AlertDialogFooter><AlertDialogCancel>Terug</AlertDialogCancel><AlertDialogAction onClick={onBevestig}>Ja, intrekken</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>;
}
