import { createFileRoute, Navigate } from "@tanstack/react-router";
import { z } from "zod";
export const Route = createFileRoute("/samen-regelen")({
    head: () => ({
        meta: [
            { title: "Samen regelen — Ouderschap & Co" },
            { name: "description", content: "Ruilen, voorstellen en praktische afspraken samen afstemmen." },
            { property: "og:title", content: "Samen regelen — Ouderschap & Co" },
            { property: "og:description", content: "Alles wat jullie samen willen afstemmen, op één plek." },
            { property: "og:type", content: "website" },
            { name: "twitter:card", content: "summary" },
        ],
    }),
    validateSearch: z.object({ voor: z.string().optional() }),
    component: SamenRegelenVerwijzing,
});
function SamenRegelenVerwijzing() {
    return <Navigate to="/activiteiten" search={{ onderdeel: "regelen" }} replace/>;
}
