import React, { createContext, useContext, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "@tanstack/react-router";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { ChevronRight } from "lucide-react";

const AuthModalContext = createContext({
  requireAuth: (callback) => false,
  openAuthModal: () => { },
  closeAuthModal: () => { },
  user: null,
});

export function AuthModalProvider({ children }) {
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const [pendingCallback, setPendingCallback] = useState(null);

  // If pending callback exists and user finishes loading, execute it without opening the modal
  useEffect(() => {
    if (!loading && user && pendingCallback) {
      setOpen(false);
      pendingCallback();
      setPendingCallback(null);
    }
  }, [user, loading, pendingCallback]);

  const requireAuth = (callback) => {
    if (loading) {
      // Still initializing auth session from localStorage; do NOT prematurely prompt user to login
      if (typeof callback === "function") {
        setPendingCallback(() => callback);
      }
      return false;
    }
    if (!user) {
      if (typeof callback === "function") {
        setPendingCallback(() => callback);
      }
      setOpen(true);
      return false;
    }
    if (typeof callback === "function") {
      callback();
    }
    return true;
  };

  const closeAuthModal = () => {
    setOpen(false);
    setPendingCallback(null);
  };

  return (
    <AuthModalContext.Provider
      value={{
        requireAuth,
        openAuthModal: () => setOpen(true),
        closeAuthModal,
        user,
        loading,
      }}
    >
      {children}
      <AuthRequiredModal open={open} onClose={closeAuthModal} />
    </AuthModalContext.Provider>
  );
}

export function useAuthPrompt() {
  return useContext(AuthModalContext);
}

export function AuthRequiredModal({ open, onClose }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleLogin = () => {
    onClose?.();
    navigate({ to: "/login" });
  };

  const handleRegister = () => {
    onClose?.();
    navigate({ to: "/register" });
  };

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose?.()}>
      <SheetContent side="bottom" className="rounded-t-3xl bg-background p-0 sm:max-w-md sm:mx-auto">
        <SheetHeader className="border-b border-border/80 px-6 py-4 text-left">
          <SheetTitle className="font-display text-lg font-bold text-ink">
            {t("authModal.titel", "Inloggen of aanmelden")}
          </SheetTitle>
        </SheetHeader>
        <div className="space-y-2.5 px-6 py-5">
          <button
            type="button"
            onClick={handleLogin}
            className="flex min-h-[48px] w-full items-center justify-between rounded-xl border border-border bg-card px-4 text-left text-sm font-semibold hover:border-brand/50 transition-colors"
          >
            <span>{t("authModal.inloggen", "Inloggen")}</span>
            <ChevronRight className="size-4 text-ink-soft shrink-0" />
          </button>

          <button
            type="button"
            onClick={handleRegister}
            className="flex min-h-[48px] w-full items-center justify-between rounded-xl border border-border bg-card px-4 text-left text-sm font-semibold hover:border-brand/50 transition-colors"
          >
            <span>{t("authModal.aanmelden", "Account aanmaken")}</span>
            <ChevronRight className="size-4 text-ink-soft shrink-0" />
          </button>

          <p className="pt-1 text-xs text-ink-soft leading-relaxed">
            {t(
              "authModal.uitleg",
              "Om kinderen toe te voegen, afspraken te plannen, kosten te verdelen of taken aan te maken, moet je ingelogd zijn met een account."
            )}
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default AuthRequiredModal;
