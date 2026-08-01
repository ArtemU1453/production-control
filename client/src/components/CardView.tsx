import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { animations } from "@/core/theme/theme";
import { SectionHeader } from "./SectionHeader";
import type { LucideIcon } from "@/resources/icons";

interface CardViewProps {
  children: ReactNode;
  /** Optional header rendered above a separator. */
  title?: string;
  subtitle?: string;
  icon?: LucideIcon;
  headerTone?: "primary" | "accent";
  headerTrailing?: ReactNode;
  className?: string;
  /** Animate the card in on mount. */
  animate?: boolean;
}

/** The standard surface for content across the app: a glass card with a rounded
 *  geometry and an optional titled header. */
export function CardView({
  children,
  title,
  subtitle,
  icon,
  headerTone,
  headerTrailing,
  className,
  animate = false,
}: CardViewProps) {
  const body = (
    <Card className={cn("glass noise rounded-2xl border-card-border p-3", className)}>
      {title ? (
        <>
          <SectionHeader
            title={title}
            subtitle={subtitle}
            icon={icon}
            tone={headerTone}
            trailing={headerTrailing}
          />
          <Separator className="my-2.5" />
        </>
      ) : null}
      {children}
    </Card>
  );

  if (!animate) {
    return body;
  }
  return (
    <motion.div
      initial={animations.cardEnter.initial}
      animate={animations.cardEnter.animate}
      transition={animations.cardEnter.transition}
    >
      {body}
    </motion.div>
  );
}
