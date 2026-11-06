import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { AppShell, Card, PageHeader } from "@/components/AppShell";
import { kinderen } from "@/lib/demo-data";
import { useStart, leeftijdTekst } from "@/lib/start-store";
import { KindSheet } from "@/components/EersteHome";
import { ChildSheet } from "@/components/ChildSheet";
import { useState } from "react";
import { ProfielBeeld } from "@/components/ProfielBeeld";
import { useKring, persoonLabel } from "@/lib/kring-store";
import { Plus, UserPlus, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/kinderen/")({
    head: () => ({
        meta: [
            { title: "Kinderen — Ouderschap & Co" },
            { name: "description", content: "Profielen van de kinderen met school, opvang, zorg en belangrijke contacten." },
            { property: "og:title", content: "Kinderen — Ouderschap & Co" },
            { property: "og:description", content: "Alle informatie over de kinderen, voor beide ouders gelijk." },
            { property: "og:type", content: "website" },
            { name: "twitter:card", content: "summary" },
        ],
    }),
    component: Kinderen,
});

function Kinderen() {
    const { t } = useTranslation();
    const st = useStart();
    const kring = useKring();
    const betrokkenen = kring.personen.filter((p) => !p.ingetrokken && st.kinderen.some((k) => p.rechten[k.id]));
    const [kindOpen, setKindOpen] = useState(false);
    const [childSheetOpen, setChildSheetOpen] = useState(false);

    const lijst = st.eigen ? st.kinderen : kinderen;

    return (
      <AppShell>
        <div className="flex items-center justify-between">
          <PageHeader titel={t("childrenSection.title", "Kinderen")} subtitel={t("childrenSection.subtitle", "Dezelfde informatie, in beide huizen")}/>
        </div>

        {/* Action Button: + Kind toevoegen */}
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setChildSheetOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand py-3 px-4 text-sm font-semibold text-primary-foreground hover:bg-brand/90 transition shadow-xs cursor-pointer"
          >
            <Plus className="size-4" />
            <span>{t("sheets.child.title", "+ Kind toevoegen")}</span>
          </button>
        </div>

        <div className="mt-5 space-y-3">
          {lijst.map((k) => (
            <Link key={k.id} to={`/kinderen/${k.id}`} className="block">
              <Card className="flex items-center gap-4 p-3.5 hover:border-brand/40 transition">
                {k.avatar || k.beeld ? (
                  <img src={k.avatar || k.beeld} alt={k.naam} className="size-16 rounded-xl object-cover shadow-2xs"/>
                ) : (
                  <span className="grid size-16 place-items-center rounded-xl bg-brand-soft font-display text-2xl font-bold text-brand shadow-2xs">
                    {k.naam.slice(0, 1).toUpperCase()}
                  </span>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-display text-lg font-bold text-ink truncate">{k.naam}</p>
                  <p className="text-xs text-ink-soft truncate">
                    {k.geboortedatum ? leeftijdTekst(k.geboortedatum) : (k.leeftijd ? `${k.leeftijd} jaar` : "Profiel bekijken")}
                    {k.school ? ` · ${k.school}` : ""}
                  </p>
                </div>
                <ChevronRight className="size-5 text-ink-soft shrink-0 pr-1" />
              </Card>
            </Link>
          ))}
        </div>

        {!lijst.length ? (
          <div className="mt-6 rounded-2xl border border-dashed border-border p-6 text-center">
            <p className="text-sm font-semibold text-ink">{t("childrenSection.noChildrenYet", "Je hebt nog geen kind toegevoegd.")}</p>
            <p className="mt-1 text-xs text-ink-soft">Voeg je kind toe om school, afspraken en zorgverdeling bij te houden.</p>
            <button
              onClick={() => setChildSheetOpen(true)}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-brand/90 transition cursor-pointer"
            >
              <Plus className="size-3.5" />
              <span>{t("sheets.child.title", "Kind toevoegen")}</span>
            </button>
          </div>
        ) : null}

        {/* Dynamic Child Creation Sheet */}
        <ChildSheet
          open={childSheetOpen}
          onClose={() => setChildSheetOpen(false)}
          onChildAdded={() => setChildSheetOpen(false)}
        />
        <KindSheet open={!!kindOpen} start={kindOpen || "kind"} onClose={() => setKindOpen(false)}/>
      </AppShell>
    );
}
