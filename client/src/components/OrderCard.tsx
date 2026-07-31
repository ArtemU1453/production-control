import { Link } from "wouter";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { AppCardStyle, AppTypography } from "@/designsystem";

interface OrderCardProps {
  orderNumber: string;
  customer: string;
  machineLabel: string;
  rollsLabel: string;
  dateLabel: string;
  href?: string;
}

/**
 * OrderCard — a production order (cutting session) summary card.
 *
 * Purpose: Card-First history/order rows. Usage:
 * `<OrderCard orderNumber="ORD-9" customer="ООО" machineLabel="Станок №1"
 *   rollsLabel="50 рул." dateLabel="31.07.2026" />`. Limits: display-only; the
 * caller formats fields. Depends on: Design System card/typography tokens.
 */
export function OrderCard({ orderNumber, customer, machineLabel, rollsLabel, dateLabel, href }: OrderCardProps) {
  const body = (
    <div className={cn(AppCardStyle.surface, href && AppCardStyle.interactive)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className={cn(AppTypography.headline, "truncate")}>Заказ {orderNumber}</div>
          <div className={cn(AppTypography.footnote, "truncate text-muted-foreground")}>{customer}</div>
        </div>
        {href ? <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" /> : null}
      </div>
      <div className={cn(AppTypography.caption, "mt-2 text-muted-foreground")}>
        {machineLabel} · {rollsLabel} · {dateLabel}
      </div>
    </div>
  );
  return href ? (
    <Link href={href} className="block">
      {body}
    </Link>
  ) : (
    body
  );
}
