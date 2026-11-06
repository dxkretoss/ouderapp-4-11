import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export function PageLoader({
  label,
  sublabel,
  fullPage = false,
  className = "",
  size = "md",
}) {
  const { t } = useTranslation();
  const displayLabel = label ?? t("common.loading", "Gegevens laden...");
  const displaySublabel = sublabel ?? null;

  const spinnerSize = size === "sm" ? "size-6" : size === "lg" ? "size-10" : "size-8";

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-col items-center justify-center gap-3 text-center",
        fullPage ? "min-h-[50vh] py-16" : "py-12",
        className
      )}
    >
      <div className="relative flex items-center justify-center">
        <div className="absolute size-12 rounded-full bg-brand/15 blur-md animate-pulse" />
        <Loader2 className={cn(spinnerSize, "animate-spin text-brand relative z-10")} />
      </div>
      {displayLabel && (
        <p className="text-sm font-semibold text-ink animate-pulse">
          {displayLabel}
        </p>
      )}
      {displaySublabel && (
        <p className="text-xs text-ink-soft max-w-xs">
          {displaySublabel}
        </p>
      )}
    </div>
  );
}

export default PageLoader;

