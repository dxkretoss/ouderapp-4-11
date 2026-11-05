import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Home, CalendarDays, MessageCircle, Banknote, LayoutGrid } from "lucide-react";

export function BottomNav() {
  const { t } = useTranslation();

  const navItems = [
    { to: "/", label: t("navbar.home"), icon: Home },
    { to: "/agenda", label: t("navbar.calendar"), icon: CalendarDays },
    { to: "/berichten", label: t("navbar.messages"), icon: MessageCircle },
    { to: "/kosten", label: t("navbar.expenses"), icon: Banknote },
    { to: "/meer", label: t("navbar.menu"), icon: LayoutGrid },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex min-w-[56px] flex-col items-center gap-1 rounded-xl px-2 py-1 transition-all ${
                  isActive
                    ? "text-brand font-bold"
                    : "text-ink-soft hover:text-ink font-medium"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`grid size-7 place-items-center rounded-lg transition-transform ${
                      isActive ? "bg-brand/12 scale-105" : ""
                    }`}
                  >
                    <Icon size={20} strokeWidth={isActive ? 2.3 : 1.7} />
                  </span>
                  <span className="text-[11px] leading-none tracking-tight">
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

