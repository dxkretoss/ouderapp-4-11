import { useSyncExternalStore } from "react";
let state = {
    lasten: [],
    potjes: [],
};
const ls = new Set();
const zet = (s) => { state = { ...state, ...s }; ls.forEach((l) => l()); };
export function voegLastToe(l) { zet({ lasten: [...state.lasten, { ...l, id: `l${Date.now()}` }] }); }
export function stortInPotje(id, wie, bedrag) {
    zet({ potjes: state.potjes.map((p) => (p.id === id ? { ...p, stortingen: [...p.stortingen, { wie, bedrag, datum: "Vandaag" }] } : p)) });
}
/** Alleen een verwijzing naar de rekening; de app verplaatst nooit zelf geld. */
export function koppelRekening(id, rekening) {
    zet({ potjes: state.potjes.map((p) => { if (p.id !== id)
            return p; const { rekening: _oud, ...rest } = p; return rekening ? { ...rest, rekening } : rest; }) });
}
export const geldigeIban = (s) => /^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(s.replace(/\s/g, "").toUpperCase());
export const potSaldo = (p) => p.stortingen.reduce((s, x) => s + x.bedrag, 0);
export function useVasteLasten() { return useSyncExternalStore((l) => { ls.add(l); return () => ls.delete(l); }, () => state, () => state); }
