import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

/**
 * Profielbeeld voor ouders en kinderen: eigen foto, geïllustreerde avatar of initiaal.
 * Waarde in bestaande profielgegevens: undefined = initiaal, "avatar:<n>" = avatar, "data:image/jpeg..." = foto.
 * Foto's worden op dit apparaat rond bijgesneden, verkleind en opnieuw opgeslagen (geen metadata).
 */
const huid = ["#F3D6C0", "#E2B48F", "#C68E66", "#9A6644", "#6B4430"];
const haar = ["#2E241E", "#6B4A32", "#B07A44", "#D8B26A", "#8C8C88", "#7A3B2A"];
// stijl: 0 kort, 1 lang, 2 krullen, 3 knot, 4 kaal/kortgeschoren, 5 pony
export const avatars = [
  [0, 0, 0], [1, 1, 1], [2, 2, 2], [3, 3, 3], [4, 0, 4], [0, 3, 5],
  [1, 5, 1], [2, 1, 0], [3, 0, 2], [4, 2, 3], [0, 4, 0], [2, 3, 5],
].map(([h, c, s], i) => ({ id: `avatar:${i}`, huid: huid[h], haar: haar[c], stijl: s }));

function AvatarSvg({ n }) {
  const a = avatars[n] ?? avatars[0];
  const H = a.haar;
  return (
    <svg viewBox="0 0 64 64" className="size-full" aria-hidden="true">
      <rect width="64" height="64" fill="color-mix(in oklab, var(--brand) 14%, var(--card))" />
      {a.stijl === 1 && <path d="M14 30c0-14 8-20 18-20s18 6 18 20v26H14z" fill={H} />}
      {a.stijl === 2 && (
        <g fill={H}>
          {[16, 22, 28, 34, 40, 46, 19, 45].map((x, i) => (
            <circle key={i} cx={x} cy={i > 5 ? 30 : 20 - (i % 2) * 3} r="7" />
          ))}
        </g>
      )}
      <path d="M18 64c0-10 6-15 14-15s14 5 14 15z" fill="color-mix(in oklab, var(--accent-warm) 55%, var(--card))" />
      <rect x="28" y="40" width="8" height="10" rx="3" fill={a.huid} />
      <ellipse cx="32" cy="31" rx="12" ry="13.5" fill={a.huid} />
      {a.stijl === 0 && <path d="M20 29c0-9 5-13 12-13s12 4 12 13c-3-5-7-7-12-7s-9 2-12 7z" fill={H} />}
      {a.stijl === 1 && <path d="M20 30c0-9 5-14 12-14s12 5 12 14c-4-6-8-8-12-8s-8 2-12 8z" fill={H} />}
      {a.stijl === 3 && (
        <g fill={H}>
          <circle cx="32" cy="13" r="6" />
          <path d="M20 29c0-9 5-13 12-13s12 4 12 13c-3-5-7-7-12-7s-9 2-12 7z" />
        </g>
      )}
      {a.stijl === 4 && <path d="M20.5 27c1-7 5-10.5 11.5-10.5S42.5 20 43.5 27c-3-3-7-4.5-11.5-4.5S23.5 24 20.5 27z" fill={H} opacity="0.55" />}
      {a.stijl === 5 && <path d="M20 31c0-10 5-15 12-15s12 5 12 15v-3c-6 0-14-2-18-7-2 3-4 6-6 10z" fill={H} />}
      <circle cx="27.5" cy="31" r="1.4" fill="#3A2E28" />
      <circle cx="36.5" cy="31" r="1.4" fill="#3A2E28" />
      <path d="M28.5 37c2 1.6 5 1.6 7 0" stroke="#3A2E28" strokeWidth="1.3" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function ProfielBeeld({ beeld, naam, kleur = "#6F7F68", maat = 48 }) {
  const stijl = { width: maat, height: maat };
  if (beeld?.startsWith("avatar:"))
    return <span className="block shrink-0 overflow-hidden rounded-full" style={stijl}><AvatarSvg n={Number(beeld.slice(7))} /></span>;
  if (beeld?.startsWith("data:image/") || beeld?.startsWith("http://") || beeld?.startsWith("https://"))
    return <img src={beeld} alt={naam || ""} className="shrink-0 rounded-full object-cover" style={stijl} />;
  return (
    <span className="grid shrink-0 place-items-center rounded-full font-display font-bold" style={{ ...stijl, fontSize: maat * 0.42, backgroundColor: `${kleur}22`, color: kleur }}>
      {(naam || "?").slice(0, 1).toUpperCase()}
    </span>
  );
}

const TOEGESTAAN = ["image/jpeg", "image/png", "image/webp"];
export const MAX_BYTES = 10 * 1024 * 1024;

/** Rond (vierkant midden) bijsnijden, verkleinen tot 320px en opnieuw als JPEG opslaan: dat verwijdert ook EXIF/locatiegegevens. */
export async function verwerkFoto(file) {
  if (!TOEGESTAAN.includes(file.type))
    throw new Error("Kies een foto in JPG, PNG of WebP.");
  if (file.size > MAX_BYTES)
    throw new Error("Deze foto is groter dan 10 MB. Kies een kleinere foto.");
  const bmp = await createImageBitmap(file);
  const z = Math.min(bmp.width, bmp.height);
  const c = document.createElement("canvas");
  c.width = c.height = 320;
  c.getContext("2d").drawImage(bmp, (bmp.width - z) / 2, (bmp.height - z) / 2, z, z, 0, 0, 320, 320);
  bmp.close();
  return c.toDataURL("image/jpeg", 0.82);
}

/** Drie keuzes: foto, avatar, overslaan/initiaal. Gebruikt bij registratie, kind toevoegen en achteraf wijzigen. */
export function BeeldKiezer({ beeld, naam, onKies, overslaanTekst }) {
  const { t } = useTranslation();
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [fout, setFout] = useState("");
  const [bezig, setBezig] = useState(false);
  const invoer = useRef(null);
  const knop = "flex min-h-[48px] w-full items-center justify-center rounded-xl border border-border bg-card px-4 text-sm font-semibold transition-colors hover:bg-muted/60 disabled:opacity-50 cursor-pointer";

  const defaultOverslaan = overslaanTekst ?? t("profileImage.skipForNow", "Voorlopig overslaan");

  return (
    <div>
      <div className="flex justify-center">
        <ProfielBeeld beeld={beeld} naam={naam || "?"} maat={80} />
      </div>
      <input
        ref={invoer}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        aria-label={t("profileImage.chooseFileAria", "Foto kiezen")}
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          setFout("");
          setBezig(true);
          try {
            onKies(await verwerkFoto(f));
          } catch (err) {
            setFout(err instanceof Error ? err.message : t("profileImage.errorGeneric", "De foto kon niet worden geladen. Probeer het opnieuw."));
          } finally {
            setBezig(false);
          }
        }}
      />
      <div className="mt-4 space-y-2">
        <button
          type="button"
          disabled={bezig}
          className={knop}
          onClick={() => invoer.current?.click()}
        >
          {bezig
            ? t("profileImage.processing", "Foto verwerken…")
            : t("profileImage.uploadOrTake", "Foto uploaden of maken")}
        </button>
        <button
          type="button"
          className={knop}
          aria-expanded={avatarOpen}
          onClick={() => setAvatarOpen((o) => !o)}
        >
          {t("profileImage.chooseAvatar", "Avatar kiezen")}
        </button>
        {avatarOpen ? (
          <div className="grid grid-cols-4 gap-3 py-2" role="group" aria-label={t("profileImage.avatars", "Avatars")}>
            {avatars.map((a, i) => (
              <button
                key={a.id}
                type="button"
                aria-label={`Avatar ${i + 1}`}
                aria-pressed={beeld === a.id}
                onClick={() => onKies(a.id)}
                className="mx-auto rounded-full border-2 p-0.5 cursor-pointer"
                style={{ borderColor: beeld === a.id ? "var(--brand)" : "transparent" }}
              >
                <ProfielBeeld beeld={a.id} naam="" maat={56} />
              </button>
            ))}
          </div>
        ) : null}
        <button
          type="button"
          className="min-h-[44px] w-full text-sm font-semibold text-ink-soft hover:text-ink cursor-pointer"
          onClick={() => onKies(undefined)}
        >
          {beeld
            ? t("profileImage.removeImage", "Afbeelding verwijderen · terug naar initiaal")
            : defaultOverslaan}
        </button>
      </div>
      {fout ? <p role="alert" className="mt-2 text-center text-xs text-ink">{fout}</p> : null}
      <p className="mt-3 text-center text-[11px] leading-snug text-ink-soft">
        {t("profileImage.privacyHint", "Een foto wordt rond bijgesneden, verkleind en zonder locatiegegevens bewaard, alleen op dit apparaat.")}
      </p>
    </div>
  );
}

