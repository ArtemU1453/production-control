import type { ReactNode } from "react";
import { Link } from "wouter";
import { ChevronRight, Moon, Sun } from "lucide-react";
import { CardView, LoadingView, ScreenScaffold, StatusBadge } from "@/components";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTheme } from "@/core/theme/ThemeManager";
import { icons, type IconName } from "@/resources/icons";
import { strings } from "@/resources/strings";
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
        {subtitle ? (
          <div className="truncate text-xs text-muted-foreground">{subtitle}</div>
        ) : null}
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

function LastCalculation({ children }: { children: ReactNode }) {
  return <div className="space-y-2">{children}</div>;
}

/** The home dashboard: a summary of the latest calculation plus quick-access
 *  cards for every section, including prepared stubs for future modules. */
export function DashboardView() {
  const { loading, lastOrder, ordersCount } = useDashboardViewModel();
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
          title="Последний расчёт"
          icon={icons.clock}
          animate
          headerTrailing={
            lastOrder ? (
              <StatusBadge
                label={`Отход: ${lastOrder.result.waste_percent.toFixed(1)}%`}
                tone={lastOrder.result.waste_percent > 7 ? "danger" : "neutral"}
              />
            ) : undefined
          }
        >
          {loading ? (
            <LoadingView />
          ) : lastOrder ? (
            <LastCalculation>
              <div className="text-xs text-muted-foreground">
                {formatDateTime(lastOrder.createdAt)}
              </div>
              <div className="text-lg font-semibold">
                {lastOrder.input.rollWidthMm} × {lastOrder.input.rollLengthM} м
              </div>
              <div className="text-sm text-muted-foreground">
                Заказ: {lastOrder.input.orderRolls} шт · Ручьёв: {lastOrder.result.main_count} · Циклов:{" "}
                {lastOrder.result.cycles_used}
              </div>
            </LastCalculation>
          ) : (
            <div className="text-sm text-muted-foreground">
              Ещё нет расчётов. Откройте «Расчёт» и сохраните первый результат.
            </div>
          )}
        </CardView>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <DashboardCard
            title="Быстрый расчёт"
            subtitle="Новый раскрой Джамба"
            icon="quick"
            href="/calculator"
          />
          <DashboardCard
            title="История"
            subtitle={`Сохранённых расчётов: ${ordersCount}`}
            icon="history"
            href="/history"
            tone="accent"
          />
          <DashboardCard
            title="Склад"
            subtitle="Учёт Джамбов"
            icon="warehouse"
            href="/warehouse"
            badge="Скоро"
          />
          <DashboardCard
            title="Отчёты"
            subtitle="PDF и рассылка"
            icon="reports"
            href="/reports"
            badge="Скоро"
          />
          <DashboardCard
            title="Архив"
            subtitle="Списанные Джамбы"
            icon="archive"
            badge="Скоро"
            tone="accent"
          />
          <DashboardCard
            title="Настройки"
            subtitle="Профиль и оформление"
            icon="settings"
            href="/settings"
          />
        </div>
      </div>
    </ScreenScaffold>
  );
}
