import React from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, Trash2, X, Loader2 } from "lucide-react";

/**
 * Custom Themed Confirmation Modal for Ouderschap & Co.
 * Matches warm ivory/sage branding and dark mode aesthetics.
 */
export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "destructive", // 'destructive' | 'brand'
  loading = false,
  icon: CustomIcon,
}) {
  const IconComponent = CustomIcon || (variant === "destructive" ? Trash2 : AlertTriangle);

  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && onClose?.()}>
      <AlertDialogContent className="max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <AlertDialogHeader className="space-y-3 text-left border-b border-border/80 pb-4">
          <div className="flex items-center justify-between">
            <div
              className={`grid size-12 place-items-center rounded-2xl ${
                variant === "destructive"
                  ? "bg-destructive/10 text-destructive"
                  : "bg-brand-soft text-brand"
              }`}
            >
              <IconComponent className="size-6" />
            </div>
          </div>

          <AlertDialogTitle className="font-display text-lg font-bold text-ink">
            {title}
          </AlertDialogTitle>

          <AlertDialogDescription className="text-xs sm:text-sm text-ink-soft leading-relaxed">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="mt-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
          <AlertDialogCancel
            onClick={onClose}
            disabled={loading}
            className="w-full sm:w-auto rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-semibold text-ink hover:bg-muted/50 transition m-0"
          >
            {cancelText}
          </AlertDialogCancel>

          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              if (loading) return;
              onConfirm?.();
            }}
            disabled={loading}
            className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold text-white shadow-xs transition disabled:opacity-50 disabled:pointer-events-none ${
              variant === "destructive"
                ? "bg-destructive hover:bg-destructive/90"
                : "bg-brand hover:bg-brand/90"
            }`}
          >
            {loading && <Loader2 className="size-3.5 animate-spin" />}
            <span>{confirmText}</span>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
