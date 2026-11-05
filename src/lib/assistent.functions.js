import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
/**
 * Intent-register: één regel per bedoeling. Nieuwe intent = één item erbij
 * (plus een navigatieregel in de assistent). De AI kiest alleen een intent.
 */
export const intents = [
    { id: "geen", uitleg: "alleen informatie geven of zoeken" },
    { id: "verduidelijk", uitleg: "de vraag is onduidelijk; stel één korte vraag en geef 2-4 korte keuzes in 'opties'. Nooit gokken." },
    { id: "afspraak_toevoegen", uitleg: "nieuwe agenda-afspraak (bijv. zwemles, tandarts)" },
    { id: "afspraak_wijzigen", uitleg: "bestaande agenda-afspraak wijzigen/verplaatsen/verwijderen" },
    { id: "tijd_wisselmoment", uitleg: "wisselmoment of halen/brengen naar een andere tijd" },
    { id: "wissel_ruil", uitleg: "dag ruilen" },
    { id: "extra_nacht", uitleg: "extra dag of nacht voorstellen" },
    { id: "afspraak_maken", uitleg: "voorstel voor een onderlinge afspraak/regel tussen ouders" },
    { id: "taak_toevoegen", uitleg: "taak toevoegen" },
    { id: "momentje", uitleg: "Momentje toevoegen" },
    { id: "kosten", uitleg: "kosten toevoegen" },
    { id: "vakantie", uitleg: "vakantie plannen of verdelen" },
    { id: "kring_toevoegen", uitleg: "persoon (opa, oma, oppas…) aan De kring toevoegen; zet 'rol'" },
    { id: "document_zoeken", uitleg: "document zoeken" },
    { id: "bericht", uitleg: "bericht starten" },
    { id: "ziek", uitleg: "kind is ziek" },
];
export const acties = intents.map((i) => i.id);
const systeem = `Je bent de rustige zoek- en regelassistent van een Nederlandse co-ouderschapsapp. Je helpt één ingelogde ouder (Sanne).
Gebruik UITSLUITEND de meegegeven context; verzin niets. Weet je iets niet, zeg dat kort en eerlijk.
Je voert NOOIT zelf iets uit. Bij een actie kies je alleen welke bestaande flow geopend moet worden en vul je bekende velden voor; de ouder controleert en bevestigt zelf.
Schrijf "antwoord" in kort, warm Nederlands (max 2 zinnen), zonder te oordelen over de andere ouder.
"actie" is één van:
${intents.map((i) => `- ${i.id}: ${i.uitleg}`).join("\n")}
Is niet duidelijk wat er bedoeld wordt (bijv. "Ik wil vrijdag iets veranderen"), kies dan verduidelijk, zet de vraag in "antwoord" (bijv. "Wat wil je vrijdag veranderen?") en keuzes in "opties" (bijv. Wisselmoment, Afspraak, Ophalen/brengen, Anders). Vraag alleen wat echt ontbreekt.
"samenvatting": de vooringevulde gegevens als label/waarde, bijv. {Wat, Wisselmoment}, {Dag, Vrijdag 13 maart}, {Huidig, 14:30}, {Voorstel, 15:30}. Leeg bij geen actie of verduidelijk.
"opties": alleen bij verduidelijk, anders leeg.
"kind": emma, noah of "" (beide/onbekend). "titel", "datum" (YYYY-MM-DD), "tijd" (HH:MM), "herhaling": vooral voor afspraak_toevoegen, anders lege string / "geen". "rol": bij kring_toevoegen één van Opa, Oma, Stiefouder / bonusouder, Familielid, Oppas, Andere verzorger, anders "".`;
const schema = {
    type: "object", additionalProperties: false,
    required: ["antwoord", "actie", "samenvatting", "opties", "kind", "titel", "datum", "tijd", "rol", "herhaling"],
    properties: {
        antwoord: { type: "string" },
        actie: { type: "string", enum: [...acties] },
        samenvatting: { type: "array", items: { type: "object", additionalProperties: false, required: ["label", "waarde"], properties: { label: { type: "string" }, waarde: { type: "string" } } } },
        opties: { type: "array", items: { type: "string" } },
        kind: { type: "string", enum: ["emma", "noah", ""] },
        titel: { type: "string" },
        datum: { type: "string" },
        tijd: { type: "string" },
        rol: { type: "string" },
        herhaling: { type: "string", enum: ["geen", "wekelijks", "tweewekelijks", "maandelijks"] },
    },
};
function foutMelding(status, wat) {
    if (status === 429)
        return "Het is even druk. Probeer het zo nog eens.";
    if (status === 402)
        return "De AI-tegoeden zijn op. Vul ze aan via Instellingen → Abonnement en tegoed.";
    if (status === 403)
        return "De assistent heeft op dit moment geen toegang tot AI.";
    return `${wat} is even niet bereikbaar.`;
}
async function leesSse(res, onEvent) {
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    for (;;) {
        const { done, value } = await reader.read();
        if (done)
            break;
        buf += dec.decode(value, { stream: true });
        const regels = buf.split("\n");
        buf = regels.pop() ?? "";
        for (const r of regels) {
            if (!r.startsWith("data:"))
                continue;
            const p = r.slice(5).trim();
            if (!p || p === "[DONE]")
                continue;
            try {
                onEvent(JSON.parse(p));
            }
            catch { /* negeer */ }
        }
    }
}
export const vraagAssistent = createServerFn({ method: "POST" })
    .inputValidator((d) => z.object({ vraag: z.string().min(1).max(1000), context: z.string().max(12000) }).parse(d))
    .handler(async ({ data }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key)
        throw new Error("AI is nog niet ingesteld.");
    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "fetch" },
        body: JSON.stringify({
            model: "openai/gpt-6-astra",
            instructions: `${systeem}\n\nCONTEXT (alleen gegevens waar deze ouder toegang toe heeft):\n${data.context}`,
            input: data.vraag,
            stream: true, store: false,
            reasoning: { effort: "low" },
            text: { format: { type: "json_schema", name: "assistent", strict: true, schema } },
        }),
    });
    if (!res.ok || !res.body)
        throw new Error(foutMelding(res.status, "De assistent"));
    let out = "";
    await leesSse(res, (e) => { if (e.type === "response.output_text.delta" && e.delta)
        out += e.delta; });
    try {
        return JSON.parse(out);
    }
    catch {
        throw new Error("De assistent gaf geen bruikbaar antwoord. Probeer het anders te vragen.");
    }
});
export const zetSpraakOm = createServerFn({ method: "POST" })
    .inputValidator((d) => z.object({ audio: z.string().min(1).max(14_000_000), type: z.string() }).parse(d))
    .handler(async ({ data }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key)
        throw new Error("AI is nog niet ingesteld.");
    const bytes = Uint8Array.from(atob(data.audio), (c) => c.charCodeAt(0));
    const mime = data.type.replace(/^video\//, "audio/").split(";")[0] || "audio/webm";
    const form = new FormData();
    form.append("file", new Blob([bytes], { type: mime }), `opname.${mime.split("/")[1] ?? "webm"}`);
    form.append("model", "google/gemini-3.5-transcribe");
    form.append("language", "nl");
    form.append("stream", "true");
    const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
        method: "POST",
        headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "fetch" },
        body: form,
    });
    if (!res.ok || !res.body)
        throw new Error(foutMelding(res.status, "Spraak omzetten"));
    let tekst = "", klaar = "";
    await leesSse(res, (e) => {
        if (e.type === "transcript.text.delta" && e.delta)
            tekst += e.delta;
        if (e.type === "transcript.text.done" && e.text)
            klaar = e.text;
    });
    return { tekst: (klaar || tekst).trim() };
});
