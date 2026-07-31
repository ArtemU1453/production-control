import type { ReactNode } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CalcResult } from "@/services";
import { AppTypography } from "@/designsystem";
import { cn } from "@/lib/utils";

/**
 * Colours are literal token values (not CSS vars) because Recharts writes them
 * as SVG presentation attributes, where `var()` does not resolve — matching the
 * existing analytics charts. Tuned to the light palette; legible in both themes.
 */
const C = {
  useful: "hsl(222 84% 56%)",
  additional: "hsl(188 86% 40%)",
  waste: "hsl(0 78% 54%)",
  neutral: "hsl(230 12% 55%)",
  axis: "hsl(215 16% 47%)",
} as const;

const AXIS = { fontSize: 11, fill: C.axis } as const;

interface CuttingChartsProps {
  plan: CalcResult;
}

/**
 * CuttingCharts — the analytics section ("аналитика"). Lazy-loaded so Recharts
 * ships only when the results are shown. Every series is built from the engine
 * result; the charts add no calculations of their own.
 */
export default function CuttingCharts({ plan }: CuttingChartsProps) {
  const yieldPercent =
    plan.total_area_m2 > 0 ? (plan.useful_area_m2 / plan.total_area_m2) * 100 : 0;

  const areaData = [
    { name: "Полезно", value: plan.useful_area_m2, fill: C.useful },
    { name: "Отход", value: plan.waste_area_m2, fill: C.waste },
  ].filter((d) => d.value > 0);

  const distData = [
    { name: "Основные", value: plan.total_main_rolls, fill: C.useful },
    { name: "Доп.", value: plan.total_additional_rolls, fill: C.additional },
  ].filter((d) => d.value > 0);

  const coverageData = [
    { name: "Заказ", value: plan.order_rolls, fill: C.neutral },
    { name: "Осн. рулоны", value: plan.total_main_rolls, fill: C.useful },
    { name: "Излишек", value: plan.surplus_main_rolls, fill: C.additional },
    { name: "Нехватка", value: plan.shortage_rolls, fill: C.waste },
  ].filter((d) => d.value > 0);

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <ChartFrame title="Использование материала (м²)">
        <div className="relative">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={areaData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={78}
                paddingAngle={2}
                strokeWidth={0}
              >
                {areaData.map((slice) => (
                  <Cell key={slice.name} fill={slice.fill} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => `${v} м²`} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn(AppTypography.title2)}>{Math.round(yieldPercent)}%</span>
            <span className={cn(AppTypography.caption2, "text-muted-foreground")}>выход</span>
          </div>
        </div>
        <Legend items={areaData} />
      </ChartFrame>

      <ChartFrame title="Распределение рулонов">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={distData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
            <XAxis dataKey="name" tick={AXIS} axisLine={false} tickLine={false} />
            <YAxis tick={AXIS} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip formatter={(v: number) => `${v} шт.`} cursor={{ fill: "hsl(215 20% 88% / 0.3)" }} />
            <Bar dataKey="value" radius={[6, 6, 0, 0]}>
              {distData.map((d) => (
                <Cell key={d.name} fill={d.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <Legend items={distData} />
      </ChartFrame>

      <ChartFrame title="Покрытие заказа (шт.)">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart
            data={coverageData}
            layout="vertical"
            margin={{ top: 4, right: 12, left: 8, bottom: 0 }}
          >
            <XAxis type="number" tick={AXIS} axisLine={false} tickLine={false} allowDecimals={false} />
            <YAxis
              type="category"
              dataKey="name"
              tick={AXIS}
              width={78}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip formatter={(v: number) => `${v} шт.`} cursor={{ fill: "hsl(215 20% 88% / 0.3)" }} />
            <Bar dataKey="value" radius={[0, 6, 6, 0]}>
              {coverageData.map((d) => (
                <Cell key={d.name} fill={d.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartFrame>
    </div>
  );
}

function ChartFrame({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-card-border bg-card/40 p-3">
      <div className={cn(AppTypography.caption2, "mb-2 text-muted-foreground")}>{title}</div>
      {children}
    </div>
  );
}

function Legend({ items }: { items: { name: string; fill: string }[] }) {
  return (
    <div className={cn(AppTypography.caption, "mt-1 flex flex-wrap items-center gap-x-3 gap-y-1")}>
      {items.map((item) => (
        <span key={item.name} className="flex items-center gap-1.5 text-muted-foreground">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: item.fill }} />
          {item.name}
        </span>
      ))}
    </div>
  );
}
