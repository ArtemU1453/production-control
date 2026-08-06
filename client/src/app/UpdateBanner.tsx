import { useState } from "react";
import { PrimaryButton, SecondaryButton } from "@/components";
import { cn } from "@/lib/utils";
import { AppTypography } from "@/designsystem";
import { useAppUpdate } from "@/core/update/useAppUpdate";

/**
 * UpdateBanner — checks for a newer deployed version on startup and, if one is
 * available, offers to reload. Silent when the app is already up to date.
 * Rendered once in the app shell; purely additive (overlays as fixed chrome).
 */
export function UpdateBanner() {
  const { hasUpdate, applyUpdate } = useAppUpdate({ autoCheck: true });
  const [dismissed, setDismissed] = useState(false);

  if (!hasUpdate || dismissed) {
    return null;
  }

  return (
    <div
      data-app-chrome
      className="fixed inset-x-0 bottom-20 z-50 flex justify-center px-3 lg:bottom-4"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="glass noise flex w-full max-w-md items-center gap-3 rounded-2xl border border-card-border p-3 shadow-lg">
        <div className="min-w-0 flex-1">
          <div className={cn(AppTypography.footnote, "font-medium")}>Доступно обновление</div>
          <div className={cn(AppTypography.caption, "text-muted-foreground")}>Перезагрузить приложение?</div>
        </div>
        <SecondaryButton onClick={() => setDismissed(true)}>Позже</SecondaryButton>
        <PrimaryButton onClick={() => void applyUpdate()}>Обновить сейчас</PrimaryButton>
      </div>
    </div>
  );
}
