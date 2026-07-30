import { forwardRef } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "@/resources/icons";

interface SecondaryButtonProps extends Omit<ButtonProps, "variant"> {
  icon?: LucideIcon;
  fullWidth?: boolean;
}

/** Secondary action button, styled to match {@link PrimaryButton}'s geometry. */
export const SecondaryButton = forwardRef<HTMLButtonElement, SecondaryButtonProps>(
  ({ className, icon: Icon, fullWidth = false, children, ...props }, ref) => (
    <Button
      ref={ref}
      variant="secondary"
      className={cn("rounded-2xl", fullWidth && "w-full", className)}
      {...props}
    >
      {Icon ? <Icon /> : null}
      {children}
    </Button>
  ),
);
SecondaryButton.displayName = "SecondaryButton";
