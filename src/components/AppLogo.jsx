import React from "react";
import { useTranslation } from "react-i18next";
import logoImg from "@/assets/ouderschap-co-logo.png";

export function AppLogo({ className = "", slogan = false }) {
  const { t } = useTranslation();

  return (
    <div className={`inline-flex flex-col select-none ${className}`}>
      <img
        src={logoImg}
        alt="Ouderschap & Co"
        className="h-8 sm:h-9 w-auto max-w-[190px] object-contain object-left"
      />
      {slogan ? (
        <p className="mt-1 text-xs text-ink-soft">
          {t("header.appSlogan", "De app die ouders verbindt")}
        </p>
      ) : null}
    </div>
  );
}
