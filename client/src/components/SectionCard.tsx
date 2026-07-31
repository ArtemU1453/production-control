import type { ReactNode } from "react";
import { CardView } from "./CardView";
import type { LucideIcon } from "@/designsystem";

interface SectionCardProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  headerTone?: "primary" | "accent";
  headerTrailing?: ReactNode;
  children: ReactNode;
  animate?: boolean;
  className?: string;
}

/**
 * SectionCard — a titled content section on the standard card surface.
 *
 * Purpose: the canonical grouping container used across detail screens and
 * settings, so every titled block looks identical. Usage:
 * `<SectionCard title="Параметры" icon={AppIcons.material}>…</SectionCard>`.
 * Limits: always titled (use CardView for a bare surface). Composes CardView so
 * geometry/material stay single-sourced. Depends on: Design System (via CardView).
 */
export function SectionCard({
  title,
  subtitle,
  icon,
  headerTone,
  headerTrailing,
  children,
  animate = true,
  className,
}: SectionCardProps) {
  return (
    <CardView
      title={title}
      subtitle={subtitle}
      icon={icon}
      headerTone={headerTone}
      headerTrailing={headerTrailing}
      animate={animate}
      className={className}
    >
      {children}
    </CardView>
  );
}
