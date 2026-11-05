import { useState } from "react";
import { useTranslation } from "react-i18next";
import { childColors, defaultChildColor } from "@/context/AppContext";
import { BeeldKiezer } from "@/components/ProfielBeeld";
import { X, Check, Baby, UserPlus } from "lucide-react";

export function AddChildModal({ isOpen, onClose, onSave, existingCount = 0 }) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState("form"); // "form" | "confirm"
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [beeld, setBeeld] = useState(undefined);
  const [color, setColor] = useState(() => defaultChildColor(existingCount));
  const [custody, setCustody] = useState("unknown");

  if (!isOpen) return null;

  const handleSave = (e) => {
    e?.preventDefault();
    if (!name.trim()) return;

    onSave({
      name: name.trim(),
      birthDate,
      color,
      photo: beeld,
      custody,
    });

    setPhase("confirm");
  };

  const resetForm = () => {
    setName("");
    setBirthDate("");
    setBeeld(undefined);
    setColor(defaultChildColor(existingCount + 1));
    setCustody("unknown");
    setPhase("form");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/45 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-t-3xl sm:rounded-2xl border border-border bg-background p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-brand/12 text-brand">
              <Baby size={20} strokeWidth={2} />
            </span>
            <h2 className="font-display text-xl font-bold text-ink">
              {phase === "form" ? t("children.form.title") : t("children.form.stepFinishedTitle")}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-full text-ink-soft hover:bg-surface hover:text-ink"
            aria-label={t("common.close")}
          >
            <X size={18} />
          </button>
        </div>

        {phase === "form" ? (
          <form onSubmit={handleSave} className="mt-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-ink-soft">
                {t("children.form.firstName")} *
              </label>
              <input
                type="text"
                autoFocus
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("children.form.firstNamePlaceholder")}
                className="mt-1.5 w-full rounded-xl border border-border bg-card px-3.5 py-3 text-sm font-medium outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-soft">
                {t("children.form.birthDate")}
              </label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm font-medium outline-none focus:border-brand"
              />
              <p className="mt-1 text-[11px] text-ink-soft">
                {t("children.form.birthDateHelp")}
              </p>
            </div>

            {/* Photo / Avatar Section */}
            <div className="pt-1 border-t border-border mt-3">
              <p className="mb-2 text-xs font-semibold text-ink-soft">
                Foto of avatar (optioneel, kan ook later)
              </p>
              <BeeldKiezer
                beeld={beeld}
                naam={name}
                onKies={setBeeld}
                overslaanTekst="Geen afbeelding, toon de eerste letter"
              />
            </div>

            {/* Color Accent */}
            <div className="pt-1 border-t border-border mt-3">
              <label className="block text-xs font-semibold text-ink-soft mb-2">
                {t("children.form.color")}
              </label>
              <div className="flex items-center gap-3">
                {childColors.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setColor(c.hex)}
                    className="size-8 rounded-full border-2 transition-transform active:scale-90 grid place-items-center"
                    style={{
                      backgroundColor: c.hex,
                      borderColor: color === c.hex ? "var(--ink)" : "transparent",
                    }}
                    aria-label={c.id}
                  >
                    {color === c.hex ? <Check size={14} className="text-white" strokeWidth={3} /> : null}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-[11px] text-ink-soft">
                {t("children.form.colorHelp")}
              </p>
            </div>

            <div className="flex items-center gap-3 pt-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl border border-border py-3 text-sm font-semibold text-ink hover:bg-surface"
              >
                {t("children.form.cancel")}
              </button>
              <button
                type="submit"
                disabled={!name.trim()}
                className="flex-1 rounded-xl bg-brand py-3 text-sm font-semibold text-white shadow-xs hover:opacity-90 disabled:opacity-40"
              >
                {t("children.form.save")}
              </button>
            </div>
          </form>
        ) : (
          <div className="mt-5 space-y-4">
            <p className="text-sm text-ink-soft leading-relaxed">
              {t("children.form.stepFinishedText")}
            </p>

            <button
              type="button"
              onClick={resetForm}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 text-sm font-semibold text-ink hover:bg-surface"
            >
              <UserPlus size={16} />
              <span>{t("children.form.addAnotherChild")}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl bg-brand py-3 text-sm font-semibold text-white shadow-xs hover:opacity-90"
            >
              {t("children.form.finishForNow")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
