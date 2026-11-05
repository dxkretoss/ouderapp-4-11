import { describe, expect, test } from "bun:test";
import { zetVoorkeur, useVoorkeuren } from "./voorkeuren-store";
import { afsprakenState, isIngevuldeAfspraak, zetAfspraken } from "./afspraken-store";
import { renderToString } from "react-dom/server";
import { createElement } from "react";
describe("Extra houvast verandert alleen de eigen weergave", () => {
    test("nieuwe gebruikers starten uit", () => {
        let aan;
        function Lees() { aan = useVoorkeuren().extraHouvast; return null; }
        renderToString(createElement(Lees));
        expect(aan).toBe(false);
    });
    test("aan en uit wijzigen geen bronrecords, reacties of geschiedenis", () => {
        const voor = JSON.stringify(afsprakenState());
        zetVoorkeur("extraHouvast", true);
        zetVoorkeur("extraHouvast", false);
        expect(JSON.stringify(afsprakenState())).toBe(voor);
        expect(afsprakenState().find(a => a.id === "a3")?.voorstel?.akkoord).toEqual({ Joris: true });
    });
    test("standaard voorbeelden blijven in de bron maar niet in het invoeroverzicht", () => {
        const voorbeeld = afsprakenState().find(a => a.id === "a3");
        expect(voorbeeld).toBeDefined();
        if (!voorbeeld)
            throw new Error("voorbeeld ontbreekt");
        expect(isIngevuldeAfspraak(voorbeeld)).toBe(false);
        expect(voorbeeld.geschiedenis).toHaveLength(2);
    });
    test("zelf gemaakte afspraken blijven zichtbaar na uitschakelen", () => {
        zetAfspraken(l => [...l, { id: "houvast-test", titel: "Contact", tekst: "Woensdag afstemmen", onderwerp: "Contact", kind: "Emma", status: "Voorstel", versies: [], geschiedenis: [] }]);
        zetVoorkeur("extraHouvast", false);
        const eigen = afsprakenState().find(a => a.id === "houvast-test");
        if (!eigen)
            throw new Error("eigen afspraak verdwenen");
        expect(isIngevuldeAfspraak(eigen)).toBe(true);
        expect(eigen.status).toBe("Voorstel");
    });
});
