import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
// A fresh process represents a reload: the module cache and in-memory state are gone.
function run(script) {
    const result = spawnSync(process.execPath, ["-e", script], { cwd: process.cwd(), encoding: "utf8" });
    if (result.status !== 0)
        throw new Error(result.stderr);
    return JSON.parse(result.stdout.trim());
}
const storage = `const saved = new Map(); globalThis.window = { localStorage: { getItem: (k) => saved.get(k) ?? null, setItem: (k,v) => saved.set(k,v) } };`;
const create = `const m = await import('./src/lib/kring-store.ts'); const p = m.voegPersoonToe({ naam:'Familielid', rol:'Oma', contact:'', uitgenodigd:false, periode:{type:'doorlopend'}, rechten:{'k-eigen':m.geenRechten()} });`;
test("familielid blijft na herladen bewaard in het bestaande adresboek", () => {
    const stored = run(`${storage} ${create} console.log(saved.get('onzeapp-kring-personen'));`);
    const restored = run(`${storage} saved.set('onzeapp-kring-personen', ${JSON.stringify(JSON.stringify(stored))}); const m = await import('./src/lib/kring-store.ts'); console.log(JSON.stringify(m.adresboek('k-eigen')));`);
    expect(restored).toHaveLength(1);
    expect(restored[0].naam).toBe("Familielid");
    expect(restored[0].id).toBe(stored.at(-1).id);
});
test("bewaren geeft familieleden geen toegang of gezag", () => {
    const result = run(`${storage} ${create} console.log(JSON.stringify({ niveaus:m.onderdelen.map(o=>m.niveau(p,'k-eigen',o.id)), uitnodiging:p.uitgenodigd, gezag:p.gezag ?? 'geen', anderKind:m.adresboek('emma').some(x=>x.id===p.id) }));`);
    expect(result.niveaus).toEqual(Array(7).fill("geen"));
    expect(result.uitnodiging).toBe(false);
    expect(result.gezag).toBe("geen");
    expect(result.anderKind).toBe(false);
});
test("bestaande contactwijzigingen blijven eveneens bewaard", () => {
    const result = run(`${storage} ${create} m.wijzigPersoon(p.id,{contact:'nieuw contact'}); console.log(JSON.stringify(JSON.parse(saved.get('onzeapp-kring-personen')).find(x=>x.id===p.id)));`);
    expect(result.contact).toBe("nieuw contact");
    expect(result.rechten["k-eigen"].agenda).toBe("geen");
});
test("na voorlopig afronden kan altijd nog een kind toegevoegd worden", () => {
    const result = run(`${storage} globalThis.localStorage=window.localStorage; const {start}=await import('./src/lib/start-store.ts'); start.begin('Ouder','zelf'); start.kindToevoegen('Eerste'); start.markeer({voortgangVerborgen:true}); start.kindToevoegen('Tweede'); console.log(saved.get('onzeapp-eigen-start'));`);
    expect(result.kinderen.map((k) => k.naam)).toEqual(["Eerste", "Tweede"]);
    expect(result.gebruik).toBe("zelf");
});
