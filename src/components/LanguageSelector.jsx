import React from "react";
import { useTranslation } from "react-i18next";

export function LanguageSelector({ variant = "default", className = "" }) {
  const { i18n } = useTranslation();
  const currentLang = i18n.language?.startsWith("en") ? "en" : "nl";

  if (variant === "compact") {
    return (
      <div
        className={`inline-flex items-center rounded-full border-2 border-slate-300 dark:border-border bg-white dark:bg-card p-0.5 text-xs font-semibold shadow-sm z-20 ${className}`}
        role="group"
        aria-label="Language selection"
      >
        <button
          type="button"
          onClick={() => i18n.changeLanguage("nl")}
          className={`rounded-full px-2.5 py-1 transition-all cursor-pointer ${
            currentLang === "nl"
              ? "bg-[#204E4A] text-white shadow-xs font-bold"
              : "text-slate-700 dark:text-ink-soft hover:text-ink font-medium"
          }`}
          aria-pressed={currentLang === "nl"}
          aria-label="Nederlands"
        >
          NL
        </button>
        <button
          type="button"
          onClick={() => i18n.changeLanguage("en")}
          className={`rounded-full px-2.5 py-1 transition-all cursor-pointer ${
            currentLang === "en"
              ? "bg-[#204E4A] text-white shadow-xs font-bold"
              : "text-slate-700 dark:text-ink-soft hover:text-ink font-medium"
          }`}
          aria-pressed={currentLang === "en"}
          aria-label="English"
        >
          EN
        </button>
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center rounded-xl border border-border bg-card p-1 text-xs font-medium ${className}`}
      role="group"
      aria-label="Language selection"
    >
      <button
        type="button"
        onClick={() => i18n.changeLanguage("nl")}
        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all cursor-pointer ${
          currentLang === "nl"
            ? "bg-brand text-white font-semibold shadow-xs"
            : "text-ink-soft hover:text-ink"
        }`}
        aria-pressed={currentLang === "nl"}
      >
        <span className="font-bold">NL</span>
        <span>Nederlands</span>
      </button>
      <button
        type="button"
        onClick={() => i18n.changeLanguage("en")}
        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all cursor-pointer ${
          currentLang === "en"
            ? "bg-brand text-white font-semibold shadow-xs"
            : "text-ink-soft hover:text-ink"
        }`}
        aria-pressed={currentLang === "en"}
      >
        <span className="font-bold">EN</span>
        <span>English</span>
      </button>
    </div>
  );
}
