import { forwardRef } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AppRadius, type LucideIcon } from "@/designsystem";

interface GhostButtonProps extends Omit<ButtonProps, "variant"> {
  icon?: LucideIcon;
  fullWidth?: boolean;
}

/**
 * GhostButton — low-emphasis action (transparent until hovered/pressed).
 *
 * Purpose: tertiary actions and toolbar buttons that must not compete with the
 * primary CTA. Usage: `<GhostButton icon={AppIcons.settings}>Ещё</GhostButton>`.
 * Limits: presentational. Depends on: Design System radius token, ui/Button.
 */
export const GhostButton = forwardRef<HTMLButtonElement, GhostButtonProps>(
  ({ className, icon: Icon, fullWidth = false, children, ...props }, ref) => (
    <Button
      ref={ref}
      variant="ghost"
      className={cn(AppRadius.role.button, fullWidth && "w-full", className)}
      {...props}
    >
      {Icon ? <Icon /> : null}
      {children}
    </Button>
  ),
);
GhostButton.displayName = "GhostButton";
