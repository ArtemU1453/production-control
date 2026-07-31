import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { AppAnimation } from "@/designsystem";

interface AnimatedListProps<T> {
  items: T[];
  /** Stable key per item (required for enter/exit/reorder animation). */
  keyOf: (item: T) => string;
  children: (item: T) => ReactNode;
  className?: string;
}

/**
 * AnimatedList — a list that animates insertion, removal and reordering.
 *
 * Purpose: give Card-First lists (warehouse, history, notifications) smooth
 * enter/exit/layout transitions instead of abrupt jumps. Usage:
 * `<AnimatedList items={jumbos} keyOf={(j)=>j.id}>{(j)=><JumboCard …/>}</AnimatedList>`.
 * Limits: presentational wrapper — data/order come from the caller. Honours
 * Reduce Motion globally via MotionConfig. Depends on: framer-motion, Design
 * System motion tokens.
 */
export function AnimatedList<T>({ items, keyOf, children, className }: AnimatedListProps<T>) {
  return (
    <div className={cn("space-y-3", className)}>
      <AnimatePresence initial={false}>
        {items.map((item) => (
          <motion.div
            key={keyOf(item)}
            layout
            initial={AppAnimation.itemEnter.initial}
            animate={AppAnimation.itemEnter.animate}
            exit={AppAnimation.itemEnter.exit}
            transition={AppAnimation.transition.normal}
          >
            {children(item)}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
