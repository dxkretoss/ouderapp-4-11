import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

// Crisp vector SVG flags that render consistently on all platforms (avoiding OS emoji letter fallbacks)
function FlagNL({ className = "size-3.5 rounded-full" }) {
  return (
    <svg className={className} viewBox="0 0 640 480" fill="none" aria-hidden="true">
      <g clipPath="url(#nl-clip)">
        <path fill="#21468B" d="M0 320h640v160H0z" />
        <path fill="#FFFFFF" d="M0 160h640v160H0z" />
        <path fill="#AE1C28" d="M0 0h640v160H0z" />
      </g>
      <defs>
        <clipPath id="nl-clip">
          <rect width="640" height="480" rx="30" />
        </clipPath>
      </defs>
    </svg>
  );
}

function FlagEN({ className = "size-3.5 rounded-full" }) {
  return (
    <svg className={className} viewBox="0 0 640 480" fill="none" aria-hidden="true">
      <g clipPath="url(#en-clip)">
        <path fill="#012169" d="M0 0h640v480H0z" />
        <path fill="#FFF" d="m75 0 244 181L562 0h78v62L400 241l240 178v61h-80L320 301 81 480H0v-60l239-179L0 64V0h75z" />
        <path fill="#C8102E" d="m424 281 216 159v40L369 281h55zm-184-82L0 17v-17l279 200-39-1zm-12 163 18 13L0 480v-40l188-139h40zm184-164L640 38v40L452 198h-40z" />
        <path fill="#FFF" d="M256 0h128v480H256z" />
        <path fill="#FFF" d="M0 176h640v128H0z" />
        <path fill="#C8102E" d="M280 0h80v480h-80z" />
        <path fill="#C8102E" d="M0 200h640v80H0z" />
      </g>
      <defs>
        <clipPath id="en-clip">
          <rect width="640" height="480" rx="30" />
        </clipPath>
      </defs>
    </svg>
  );
}

export function getCurrentLanguage() {
  if (typeof window === "undefined") return "nl";
  const saved = localStorage.getItem("i18nextLng") || localStorage.getItem("app_taal");
  if (saved && (saved.startsWith("en") || saved === "en")) return "en";
  return "nl";
}

/**
 * Reusable LanguageSwitcher component powered by react-i18next.
 * Supports:
 * - "compact" / "header": Pill with vector flags and NL / EN for headers
 * - "card": Detailed switch with titles for Settings
 * - "floating": Sticky bottom-right floating badge
 */
export function LanguageSwitcher({ className = "", variant = "floating" }) {
  const { i18n, t } = useTranslation();

  const currentLang = i18n.language && i18n.language.startsWith("en") ? "en" : "nl";

  const changeLanguage = (language) => {
    if (["nl", "en"].includes(language) && language !== currentLang) {
      i18n.changeLanguage(language);
    }
  };

  // Card Variant (Settings / Instellingen)
  if (variant === "card") {
    return (
      <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-2 ${className}`}>
        <div>
          <p className="text-sm font-semibold text-ink">{t("languageSwitcher.title")}</p>
          <p className="text-xs text-ink-soft">{t("languageSwitcher.subtitle")}</p>
        </div>
        <div
          className="flex items-center self-start sm:self-auto rounded-full border border-border bg-muted/60 p-0.5 text-xs font-semibold"
          role="group"
          aria-label={t("languageSwitcher.title")}
        >
          <button
            type="button"
            onClick={() => changeLanguage("nl")}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-all cursor-pointer ${
              currentLang === "nl"
                ? "bg-card text-brand font-bold shadow-2xs"
                : "text-ink-soft hover:text-ink"
            }`}
            title="Nederlands"
            aria-pressed={currentLang === "nl"}
          >
            <FlagNL className="size-3.5 shrink-0" />
            <span>Nederlands</span>
          </button>
          <button
            type="button"
            onClick={() => changeLanguage("en")}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-all cursor-pointer ${
              currentLang === "en"
                ? "bg-card text-brand font-bold shadow-2xs"
                : "text-ink-soft hover:text-ink"
            }`}
            title="English"
            aria-pressed={currentLang === "en"}
          >
            <FlagEN className="size-3.5 shrink-0" />
            <span>English</span>
          </button>
        </div>
      </div>
    );
  }

  // Compact Header Variant (Header Navbar)
  if (variant === "compact" || variant === "header") {
    return (
      <div
        className={cn(
          "inline-flex items-center rounded-full border border-border/80 bg-surface/80 p-0.5 shadow-2xs backdrop-blur-md",
          className
        )}
        role="group"
        aria-label={t("languageSwitcher.select")}
      >
        <button
          type="button"
          onClick={() => changeLanguage("nl")}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition-all duration-150 cursor-pointer ${
            currentLang === "nl"
              ? "bg-brand text-primary-foreground shadow-xs"
              : "text-ink-soft hover:text-ink hover:bg-muted/50"
          }`}
          title="Nederlands (Dutch)"
          aria-pressed={currentLang === "nl"}
        >
          <FlagNL className="size-3.5 shrink-0" />
          <span>NL</span>
        </button>
        <button
          type="button"
          onClick={() => changeLanguage("en")}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition-all duration-150 cursor-pointer ${
            currentLang === "en"
              ? "bg-brand text-primary-foreground shadow-xs"
              : "text-ink-soft hover:text-ink hover:bg-muted/50"
          }`}
          title="English"
          aria-pressed={currentLang === "en"}
        >
          <FlagEN className="size-3.5 shrink-0" />
          <span>EN</span>
        </button>
      </div>
    );
  }

  // Floating sticky bottom-right widget (AppShell)
  return (
    <aside
      className={cn("fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40", className)}
      aria-label="Language selector"
    >
      <div
        className="flex items-center rounded-full border border-border/80 bg-card/95 p-0.5 shadow-lg backdrop-blur-md ring-1 ring-border/50 hover:shadow-xl transition-all"
        role="group"
        aria-label={t("languageSwitcher.select")}
      >
        <button
          type="button"
          onClick={() => changeLanguage("nl")}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all duration-150 cursor-pointer ${
            currentLang === "nl"
              ? "bg-brand text-primary-foreground shadow-2xs"
              : "text-ink-soft hover:text-ink hover:bg-muted/50"
          }`}
          title="Nederlands (Dutch)"
          aria-pressed={currentLang === "nl"}
        >
          <FlagNL className="size-3.5 shrink-0" />
          <span>NL</span>
        </button>
        <button
          type="button"
          onClick={() => changeLanguage("en")}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all duration-150 cursor-pointer ${
            currentLang === "en"
              ? "bg-brand text-primary-foreground shadow-2xs"
              : "text-ink-soft hover:text-ink hover:bg-muted/50"
          }`}
          title="English"
          aria-pressed={currentLang === "en"}
        >
          <FlagEN className="size-3.5 shrink-0" />
          <span>EN</span>
        </button>
      </div>
    </aside>
  );
}

export default LanguageSwitcher;
