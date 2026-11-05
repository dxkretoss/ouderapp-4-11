import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
const Input = z.object({ tekst: z.string().min(10).max(8000), vandaag: z.string().max(20) });
const Item = z.object({ titel: z.string().max(160), datum: z.string(), tijd: z.string(), kind: z.enum(["emma", "noah", ""]), zeker: z.boolean(), bedrag: z.number().positive().max(100000).nullable().default(null), taak: z.string().max(300).default(""), voorbereiding: z.string().max(300).default("") });
const systeem = `Je leest een Nederlandse schoolbrief of nieuwsbrief en haalt alleen concrete activiteiten met een datum eruit (studiedag, ouderavond, schoolreis, vrije dag, sportdag, inleveren van iets).
Antwoord ALLEEN met JSON: {"items":[{"titel":"kort","datum":"YYYY-MM-DD","tijd":"HH:MM of leeg","kind":"emma, noah of leeg","zeker":true/false,"bedrag":null,"taak":"","voorbereiding":""}]}.
Houd informatie over dezelfde activiteit bij elkaar. Neem een genoemd bedrag als getal over, een expliciete deadline of actie onder taak, en letterlijk genoemde meeneemspullen onder voorbereiding. Bijvoorbeeld schoolreis vrijdag 09:00, €17,50, lunch meenemen: één item met bedrag 17.5 en voorbereiding Lunch meenemen. Bedrag null en tekst leeg als de brief dit niet noemt. Verzin geen taken, bedragen, kinderen of spullen.
Gebruik het opgegeven jaar als het jaar ontbreekt. Zet zeker op false als datum of tijd onduidelijk is. Maximaal 10 items.`;
/** Herkent alleen; verwerken gebeurt na controle in de bestaande agenda-flow. */
export const leesSchoolinfo = createServerFn({ method: "POST" })
    .inputValidator((d) => Input.parse(d))
    .handler(async ({ data }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key)
        throw new Error("AI is nog niet ingesteld.");
    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "fetch" },
        body: JSON.stringify({
            model: "openai/gpt-6-astra",
            instructions: systeem,
            input: `Vandaag: ${data.vandaag}. Kinderen: Emma (emma), Noah (noah).\n\n${data.tekst}`,
            store: false,
            reasoning: { effort: "low" },
        }),
    });
    if (!res.ok) {
        if (res.status === 429)
            throw new Error("Het is even druk. Probeer het zo nog eens.");
        if (res.status === 402)
            throw new Error("De AI-tegoeden zijn op.");
        throw new Error("Uitlezen lukt nu even niet.");
    }
    const j = await res.json();
    const tekst = j.output_text ?? (j.output ?? []).flatMap((o) => o.content ?? []).map((c) => c.text ?? "").join("");
    const m = tekst.match(/\{[\s\S]*\}/);
    if (!m)
        return [];
    try {
        return z.object({ items: z.array(Item).max(10) }).parse(JSON.parse(m[0])).items;
    }
    catch {
        return [];
    }
});
