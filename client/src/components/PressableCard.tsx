import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { AppAnimation, AppCardStyle, haptics } from "@/designsystem";

interface PressableCardProps {
  children: ReactNode;
  onClick?: () => void;
  /** Fire a light selection haptic on press (default true when tappable). */
  haptic?: boolean;
  className?: string;
  "aria-label"?: string;
}

/**
 * PressableCard — an interactive card with entrance + press feedback.
 *
 * Purpose: tappable Card-First surfaces that feel native — fade/rise on mount,
 * a subtle scale on press and an optional selection haptic. Usage:
 * `<PressableCard onClick={open}>…</PressableCard>`. Limits: presentational; the
 * caller owns the action. Non-interactive when `onClick` is omitted. Honours
 * Reduce Motion globally. Depends on: framer-motion, Design System card/motion
 * tokens, haptics.
 */
export function PressableCard({ children, onClick, haptic = true, className, ...aria }: PressableCardProps) {
  const interactive = Boolean(onClick);
  return (
    <motion.div
      initial={AppAnimation.itemEnter.initial}
      animate={AppAnimation.itemEnter.animate}
      transition={AppAnimation.transition.normal}
      whileTap={interactive ? AppAnimation.press.whileTap : undefined}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={aria["aria-label"]}
      onClick={() => {
        if (!interactive) {
          return;
        }
        if (haptic) {
          haptics.selection();
        }
        onClick?.();
      }}
      onKeyDown={(event) => {
        if (interactive && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          onClick?.();
        }
      }}
      className={cn(AppCardStyle.surface, interactive && "cursor-pointer", className)}
    >
      {children}
    </motion.div>
  );
}
