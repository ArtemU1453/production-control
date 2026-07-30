import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TrendPoint } from "../models";

export interface StatusSlice {
  label: string;
  value: number;
  color: string;
}

export type TrendMetric = "orders" | "rolls" | "materialUsedM" | "usefulAreaM2";

interface AnalyticsChartsProps {
  trend: TrendPoint[];
  statuses: StatusSlice[];
  metric: TrendMetric;
  chartType: "line" | "bar";
}

const METRIC_LABEL: Record<TrendMetric, string> = {
  orders: "Заказы",
  rolls: "Рулоны",
  materialUsedM: "Расход, м",
  usefulAreaM2: "Полезная, м²",
};

const AXIS = { fontSize: 11, stroke: "hsl(215 16% 47%)" };
const ACCENT = "#2563eb";

/** Recharts-based analytics charts. Lazy-loaded so the charting library is only
 *  fetched on the analytics screen. */
export default function AnalyticsCharts({ trend, statuses, metric, chartType }: AnalyticsChartsProps) {
  const pie = statuses.filter((slice) => slice.value > 0);

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-2 text-xs text-muted-foreground">Динамика · {METRIC_LABEL[metric]}</div>
        <ResponsiveContainer width="100%" height={240}>
          {chartType === "line" ? (
            <LineChart data={trend} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(215 20% 88%)" />
              <XAxis dataKey="bucket" tick={AXIS} />
              <YAxis tick={AXIS} />
              <Tooltip />
              <Line type="monotone" dataKey={metric} stroke={ACCENT} strokeWidth={2} dot={false} name={METRIC_LABEL[metric]} />
            </LineChart>
          ) : (
            <BarChart data={trend} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(215 20% 88%)" />
              <XAxis dataKey="bucket" tick={AXIS} />
              <YAxis tick={AXIS} />
              <Tooltip />
              <Bar dataKey={metric} fill={ACCENT} radius={[4, 4, 0, 0]} name={METRIC_LABEL[metric]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {pie.length > 0 ? (
        <div>
          <div className="mb-2 text-xs text-muted-foreground">Распределение Джамбов по статусу</div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pie} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={80} label>
                {pie.map((slice) => (
                  <Cell key={slice.label} fill={slice.color} />
                ))}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      ) : null}
    </div>
  );
}
