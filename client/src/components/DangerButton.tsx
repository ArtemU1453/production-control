import { forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AppRadius, type LucideIcon } from "@/designsystem";

interface DangerButtonProps extends Omit<ButtonProps, "variant"> {
  icon?: LucideIcon;
  loading?: boolean;
  fullWidth?: boolean;
}

/**
 * DangerButton — destructive call-to-action.
 *
 * Purpose: confirm irreversible/removing actions with the destructive tone.
 * Usage: `<DangerButton icon={AppIcons.error} onClick={remove}>Удалить</DangerButton>`.
 * Limits: presentational only; the caller owns confirmation and side effects.
 * Depends on: Design System radius token, ui/Button.
 */
export const DangerButton = forwardRef<HTMLButtonElement, DangerButtonProps>(
  ({ className, icon: Icon, loading = false, fullWidth = false, disabled, children, ...props }, ref) => (
    <Button
      ref={ref}
      variant="destructive"
      disabled={disabled || loading}
      className={cn(AppRadius.role.button, fullWidth && "w-full", className)}
      {...props}
    >
      {loading ? <Loader2 className="animate-spin" /> : Icon ? <Icon /> : null}
      {children}
    </Button>
  ),
);
DangerButton.displayName = "DangerButton";
