import { Link } from "wouter";
import { ChevronRight, Moon, Sun } from "lucide-react";
import {
  CardView,
  LoadingView,
  MetricCard,
  ScreenScaffold,
  StatusBadge,
} from "@/components";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTheme } from "@/core/theme/ThemeManager";
import { icons, type IconName } from "@/resources/icons";
import { strings } from "@/resources/strings";
import { formatArea, formatMeters } from "@/extensions/number";
import { formatDateTime } from "@/extensions/date";
import { useDashboardViewModel } from "@/viewmodels";

interface DashboardCardProps {
  title: string;
  subtitle?: string;
  icon: IconName;
  href?: string;
  badge?: string;
  tone?: "primary" | "accent";
}

function DashboardCard({ title, subtitle, icon, href, badge, tone = "primary" }: DashboardCardProps) {
  const Icon = icons[icon];
  const body = (
    <div
      className={cn(
        "glass noise flex h-full items-center gap-3 rounded-3xl border-card-border p-4 transition-transform",
        href ? "cursor-pointer active:scale-[0.98]" : "opacity-80",
      )}
    >
      <div
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
          tone === "primary"
            ? "bg-primary text-primary-foreground shadow-[var(--shadow-glow)]"
            : "bg-accent text-accent-foreground",
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold">{title}</span>
          {badge ? (
            <Badge variant="secondary" className="rounded-full text-[10px]">
              {badge}
            </Badge>
          ) : null}
        </div>
        {subtitle ? <div className="truncate text-xs text-muted-foreground">{subtitle}</div> : null}
      </div>
      {href ? <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" /> : null}
    </div>
  );

  if (!href) {
    return body;
  }
  return (
    <Link href={href} className="block">
      {body}
    </Link>
  );
}

/** The home dashboard: live warehouse counters and production totals from the
 *  repositories, the latest session, and quick-access cards for every section. */
export function DashboardView() {
  const { loading, lastSession, sessionsCount, materialsCount, counts, totals, archiveTotals } =
    useDashboardViewModel();
  const { isDark, toggle } = useTheme();

  return (
    <ScreenScaffold
      title={strings.dashboard.title}
      subtitle={strings.dashboard.subtitle}
      toolbar={
        <Button
          variant="secondary"
          size="icon"
          className="rounded-xl"
          onClick={toggle}
          aria-label={isDark ? "Светлая тема" : "Тёмная тема"}
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      }
    >
      <div className="space-y-4">
        <CardView
          title="Склад сырья"
          icon={icons.warehouse}
          animate
          headerTrailing={<StatusBadge label={`Всего: ${counts.total}`} tone="neutral" />}
        >
          {loading ? (
            <LoadingView />
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <MetricCard label="На складе" value={counts.onStock} />
              <MetricCard label="В работе" value={counts.inWork} />
              <MetricCard label="К списанию" value={counts.toWriteOff} />
              <MetricCard label="Архив" value={counts.archived} />
            </div>
          )}
        </CardView>

        <CardView title="Производство" icon={icons.gauge} headerTone="accent" animate>
          {loading ? (
            <LoadingView />
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <MetricCard label="Заказов сегодня" value={totals.ordersToday} />
              <MetricCard label="Изготовлено рулонов" value={totals.rollsMade} />
              <MetricCard label="Использовано материала" value={formatMeters(totals.materialUsedM)} />
              <MetricCard label="Полезная площадь" value={formatArea(totals.usefulAreaM2)} />
            </div>
          )}
        </CardView>

        <CardView
          title="Архив"
          icon={icons.archive}
          animate
          headerTrailing={<StatusBadge label={`Архивировано: ${archiveTotals.archivedCount}`} tone="muted" />}
        >
          {loading ? (
            <LoadingView />
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <MetricCard label="Использовано материала" value={formatMeters(totals.materialUsedM)} />
              <MetricCard label="Средний % использования" value={`${archiveTotals.avgUsefulPercent}%`} />
              <MetricCard label="Средний % брака" value={`${archiveTotals.avgWastePercent}%`} />
              <MetricCard label="Изготовлено рулонов" value={totals.rollsMade} />
            </div>
          )}
        </CardView>

        <CardView
          title="Последний заказ"
          icon={icons.clock}
          animate
          headerTrailing={
            lastSession ? (
              <StatusBadge
                label={`Отход: ${lastSession.result.waste_percent.toFixed(1)}%`}
                tone={lastSession.result.waste_percent > 7 ? "danger" : "neutral"}
              />
            ) : undefined
          }
        >
          {loading ? (
            <LoadingView />
          ) : lastSession ? (
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">{formatDateTime(lastSession.createdAt)}</div>
              <div className="text-lg font-semibold">
                {lastSession.order.orderNumber || "Без номера"}
                {lastSession.order.customer ? ` · ${lastSession.order.customer}` : ""}
              </div>
              <div className="text-sm text-muted-foreground">
                Джамб № {lastSession.jumboStockNumber} · Рулонов: {lastSession.result.total_rolls} ·
                Циклов: {lastSession.result.cycles_used}
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              Ещё нет заказов. Откройте «Производство» и выполните первый расчёт.
            </div>
          )}
        </CardView>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <DashboardCard title="Производство" subtitle="Новый заказ по Джамбу" icon="gauge" href="/production" />
          <DashboardCard title="Быстрый расчёт" subtitle="Свободный калькулятор" icon="quick" href="/calculator" tone="accent" />
          <DashboardCard title="Материалы" subtitle={`Материалов: ${materialsCount}`} icon="material" href="/materials" />
          <DashboardCard title="Склад" subtitle={`Всего Джамбов: ${counts.total}`} icon="warehouse" href="/warehouse" tone="accent" />
          <DashboardCard title="История" subtitle={`Заказов: ${sessionsCount}`} icon="history" href="/history" />
          <DashboardCard title="Архив" subtitle={`В архиве: ${counts.archived}`} icon="archive" href="/archive" tone="accent" />
          <DashboardCard title="Аналитика" subtitle="Отчёты предприятия" icon="analytics" href="/reports" />
          <DashboardCard title="Настройки" subtitle="Профиль и оформление" icon="settings" href="/settings" />
        </div>
      </div>
    </ScreenScaffold>
  );
}
