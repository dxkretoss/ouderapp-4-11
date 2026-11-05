import i18n from "@/i18n";

/** Weergave van een tijdstip in lopende tekst: "14:30" → "14:30 uur" (NL) of "14:30" (EN). */
export function uur(t) {
  if (!t) return "";
  const s = t.trim();
  const isEn = i18n?.language?.startsWith("en");
  if (isEn) {
    return s.replace(/\s*uur$/, "");
  }
  return /\d{1,2}:\d{2}$/.test(s) ? `${s} uur` : s;
}

/** Zet "uur" achter ieder tijdstip in een tekst, zonder dubbele toevoeging (alleen in NL). */
export function metUur(tekst) {
  if (!tekst) return "";
  const isEn = i18n?.language?.startsWith("en");
  if (isEn) return tekst;
  return tekst.replace(/\b(\d{1,2}:\d{2})\b(?!:|\s*uur)/g, "$1 uur");
}
