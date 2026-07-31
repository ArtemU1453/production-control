import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { AppShadow, type LucideIcon } from "@/designsystem";

interface FloatingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  /** Required accessible label — the button shows only an icon. */
  "aria-label": string;
}

/**
 * FloatingButton — a round floating action button (FAB).
 *
 * Purpose: the single most important action on a screen (e.g. "Новый заказ").
 * Usage: `<FloatingButton icon={AppIcons.quick} aria-label="Создать" onClick={…} />`.
 * Limits: icon-only, so `aria-label` is mandatory; positioning is the caller's
 * responsibility. Depends on: Design System shadow token (floating elevation).
 */
export const FloatingButton = forwardRef<HTMLButtonElement, FloatingButtonProps>(
  ({ className, icon: Icon, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      className={cn(
        "inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform active:scale-95",
        AppShadow.level.floating,
        className,
      )}
      {...props}
    >
      <Icon className="h-6 w-6" />
    </button>
  ),
);
FloatingButton.displayName = "FloatingButton";
