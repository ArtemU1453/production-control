import type { ReactNode } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";
import { AppSpacing, AppTypography } from "@/designsystem";

interface BottomSheetProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Element that opens the sheet (omit when controlling via `open`). */
  trigger?: ReactNode;
  title?: string;
  description?: string;
  children: ReactNode;
}

/**
 * BottomSheet — a modal sheet that slides up from the bottom edge.
 *
 * Purpose: contextual actions and pickers on a phone-first layout (e.g. choosing
 * a Jumbo). Usage (uncontrolled): `<BottomSheet trigger={<Button/>} title="…">…
 * </BottomSheet>`; or controlled via `open`/`onOpenChange`. Limits: presentation
 * container only. Depends on: ui/drawer (vaul) + Design System spacing/typography.
 */
export function BottomSheet({ open, onOpenChange, trigger, title, description, children }: BottomSheetProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      {trigger ? <DrawerTrigger asChild>{trigger}</DrawerTrigger> : null}
      <DrawerContent>
        {title ? (
          <DrawerHeader>
            <DrawerTitle className={AppTypography.title2}>{title}</DrawerTitle>
            {description ? (
              <DrawerDescription className={cn(AppTypography.footnote, "text-muted-foreground")}>
                {description}
              </DrawerDescription>
            ) : null}
          </DrawerHeader>
        ) : null}
        <div className={cn(AppSpacing.padX.sm, "pb-8")}>{children}</div>
      </DrawerContent>
    </Drawer>
  );
}
