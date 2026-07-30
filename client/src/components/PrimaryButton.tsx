import { forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "@/resources/icons";

interface PrimaryButtonProps extends Omit<ButtonProps, "variant"> {
  icon?: LucideIcon;
  loading?: boolean;
  fullWidth?: boolean;
}

/** Primary call-to-action button. Consistent radius, optional leading icon and
 *  a built-in loading state so screens never re-implement busy buttons. */
export const PrimaryButton = forwardRef<HTMLButtonElement, PrimaryButtonProps>(
  (
    { className, icon: Icon, loading = false, fullWidth = false, disabled, children, ...props },
    ref,
  ) => (
    <Button
      ref={ref}
      variant="default"
      disabled={disabled || loading}
      className={cn("rounded-2xl", fullWidth && "w-full", className)}
      {...props}
    >
      {loading ? <Loader2 className="animate-spin" /> : Icon ? <Icon /> : null}
      {children}
    </Button>
  ),
);
PrimaryButton.displayName = "PrimaryButton";
