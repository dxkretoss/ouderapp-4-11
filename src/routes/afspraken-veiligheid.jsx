import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
/** Oude adres: stuurt veilig door naar de ene Afspraken-pagina. */
export const Route = createFileRoute("/afspraken-veiligheid")({
    validateSearch: z.object({ weergave: z.enum(["professional"]).optional() }),
    beforeLoad: ({ search }) => { throw redirect({ to: "/afspraken", search: search.weergave ? { weergave: search.weergave } : {}, replace: true }); },
});
