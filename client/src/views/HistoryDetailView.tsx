import { Link } from "wouter";
import { ArrowLeft, TriangleAlert } from "lucide-react";
import {
  CardView,
  InfoRow,
  LoadingView,
  ScreenScaffold,
  SecondaryButton,
  SectionHeader,
  StatusBadge,
} from "@/components";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { icons } from "@/resources/icons";
import { AppTypography } from "@/designsystem";
import { coatingTitle, machineTitle } from "@/models";
import { formatDateTime, formatDuration, formatElapsed } from "@/extensions/date";
import { formatArea, formatMeters, formatMm } from "@/extensions/number";
import { finishedMainWidthMm } from "@/core/calculator/calculatorLogic";
import { useHistoryDetailViewModel } from "@/viewmodels";
import type { SessionRollLine } from "./history/sessionReport";

/** Roll-movement table for one group (main / additional / samples). Each size is
 *  its own row; sizes are never merged. Scrolls horizontally on narrow screens. */
function MovementTable({ title, lines }: { title: string; lines: SessionRollLine[] }) {
  if (lines.length === 0) {
    return null;
  }
  return (
    <div className="space-y-2">
      <div className={cn(AppTypography.caption2, "font-semibold uppercase text-muted-foreground")}>{title}</div>
      <div className="overflow-x-auto rounded-xl border border-card-border">
        <table className="w-full min-w-[560px] text-left">
          <thead className="bg-muted/50">
            <tr className={cn(AppTypography.caption2, "text-muted-foreground")}>
              <th className="px-3 py-1.5 font-medium">Размер</th>
              <th className="px-3 py-1.5 text-right font-medium">Длина</th>
              <th className="px-3 py-1.5 text-right font-medium">Произв.</th>
              <th className="px-3 py-1.5 text-right font-medium">В заказ</th>
              <th className="px-3 py-1.5 text-right font-medium">На склад</th>
              <th className="px-3 py-1.5 text-right font-medium">Продано</th>
              <th className="px-3 py-1.5 text-right font-medium">Списан</th>
              <th className="px-3 py-1.5 text-right font-medium">Осталось</th>
            </tr>
          </thead>
          <tbody className={cn(AppTypography.footnote, "tabular-nums")}>
            {lines.map((line, index) => (
              <tr key={`${line.label}-${index}`} className="border-t border-card-border">
                <td className="px-3 py-1.5">
                  <span className="font-medium">{line.label}</span>
                  <span className="ml-1 text-muted-foreground">{formatMm(line.widthMm)}</span>
                </td>
                <td className="px-3 py-1.5 text-right">{formatMeters(line.lengthM)}</td>
                <td className="px-3 py-1.5 text-right font-semibold">{line.movement.produced}</td>
                <td className="px-3 py-1.5 text-right">{line.movement.toOrder}</td>
                <td className="px-3 py-1.5 text-right">{line.movement.toWarehouse}</td>
                <td className="px-3 py-1.5 text-right">{line.movement.sold}</td>
                <td className="px-3 py-1.5 text-right text-destructive">{line.movement.writtenOff || "—"}</td>
                <td className="px-3 py-1.5 text-right">{line.movement.remaining}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * HistoryDetailView — the full report for one cutting session («Подробнее»).
 *
 * Shows the persisted snapshot (Jumbo, material, parameters, cutting scheme,
 * yield/waste) and, per roll size, the produced quantity plus its finished-goods
 * movement (order / warehouse / sold / written-off / remaining), and the defects
 * recorded for the run. Every figure comes from stored data — the cutting
 * algorithm is never re-run — so old records keep their exact original result.
 */
export function HistoryDetailView({ sessionId }: { sessionId: string }) {
  const { loading, session, report } = useHistoryDetailViewModel(sessionId);

  if (loading) {
    return (
      <ScreenScaffold title="Отчёт по нарезке">
        <LoadingView />
      </ScreenScaffold>
    );
  }

  if (!session || !report) {
    return (
      <ScreenScaffold title="Отчёт по нарезке">
        <CardView>
          <p className={cn(AppTypography.footnote, "text-muted-foreground")}>Запись не найдена.</p>
          <Link href="/history">
            <SecondaryButton icon={ArrowLeft} className="mt-3">
              К истории
            </SecondaryButton>
          </Link>
        </CardView>
      </ScreenScaffold>
    );
  }

  const r = session.result;
  const order = session.order;
  const yieldPercent = r.total_area_m2 > 0 ? Math.round((r.useful_area_m2 / r.total_area_m2) * 100) : 0;
  const additionalWidths = report.additionalLines.map((l) => formatMm(l.widthMm)).join(" · ");

  return (
    <ScreenScaffold
      title={`Джамб № ${session.jumboStockNumber}`}
      subtitle={`${machineTitle(order.machine)} · ${formatDateTime(session.createdAt)}${order.customer ? ` · ${order.customer}` : ""}`}
      toolbar={
        <Link href="/history">
          <Button variant="secondary" size="icon" className="rounded-xl" aria-label="К истории">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
      }
      wide
    >
      {/* ── Параметры нарезки ───────────────────────────────────────────── */}
      <CardView>
        <div className="mb-2 flex items-center justify-between gap-2">
          <SectionHeader title="Нарезка" icon={icons.cut} />
          <StatusBadge
            label={`Отход ${r.waste_percent.toFixed(1)}%`}
            tone={r.waste_percent > 7 ? "danger" : "neutral"}
          />
        </div>
        <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
          <div className="space-y-1">
            <InfoRow label="Джамбо" value={`№ ${session.jumboStockNumber}`} />
            <InfoRow label="Материал" value={session.materialCode} />
            <InfoRow label="Дата и время" value={formatDateTime(session.createdAt)} />
            <InfoRow label="Станок" value={machineTitle(order.machine)} />
            <InfoRow label="Оператор" value={order.operator || "—"} />
            <InfoRow label="Заказчик" value={order.customer || "—"} />
            {order.coating ? <InfoRow label="Красящий слой" value={coatingTitle(order.coating)} last /> : null}
          </div>
          <div className="space-y-1">
            <InfoRow label="Основной размер" value={formatMm(finishedMainWidthMm(r))} />
            <InfoRow label="Доп. размеры" value={additionalWidths || "—"} />
            <InfoRow label="Циклов" value={`${r.cycles_used}`} />
            <InfoRow label="Расход материала" value={formatMeters(r.used_length_m)} />
            <InfoRow label="Остаток Джамбо" value={formatMeters(r.remaining_jumbo_m)} />
            <InfoRow label="Полезная площадь" value={formatArea(r.useful_area_m2)} />
            <InfoRow label="Выход" value={`${yieldPercent}%`} />
            <InfoRow
              label="Время выполнения"
              value={
                session.activeDurationMs != null
                  ? formatDuration(session.activeDurationMs)
                  : formatElapsed(session.startedAt, session.completedAt)
              }
              last
            />
          </div>
        </div>
      </CardView>

      {/* ── Рулоны: разбивка по размерам + движение ──────────────────────── */}
      <CardView title="Рулоны из этого Джамбо" icon={icons.dashboard} className="mt-4 space-y-3">
        <MovementTable title="Основные рулоны" lines={report.mainLines} />
        <MovementTable title="Дополнительные рулоны" lines={report.additionalLines} />
        <MovementTable title="Образцы" lines={report.sampleLines} />
        <div className={cn(AppTypography.caption, "flex flex-wrap gap-x-4 gap-y-1 pt-1 text-muted-foreground")}>
          <span>Всего произведено: <span className="font-semibold text-foreground tabular-nums">{report.totals.produced}</span></span>
          <span>В заказ: <span className="font-semibold text-foreground tabular-nums">{report.totals.toOrder}</span></span>
          <span>На склад: <span className="font-semibold text-foreground tabular-nums">{report.totals.toWarehouse}</span></span>
          <span>Продано: <span className="font-semibold text-foreground tabular-nums">{report.totals.sold}</span></span>
          <span>Осталось: <span className="font-semibold text-foreground tabular-nums">{report.totals.remaining}</span></span>
        </div>
      </CardView>

      {/* ── Брак ─────────────────────────────────────────────────────────── */}
      <CardView title="Брак" icon={TriangleAlert} className="mt-4">
        {report.defects.length === 0 ? (
          <p className={cn(AppTypography.footnote, "text-muted-foreground")}>Брак не зафиксирован.</p>
        ) : (
          <div className="space-y-2">
            <div className={cn(AppTypography.footnote, "text-muted-foreground")}>
              Всего браковано: <span className="font-semibold text-destructive tabular-nums">{report.defectCount} шт.</span>
            </div>
            <div className="overflow-x-auto rounded-xl border border-card-border">
              <table className="w-full min-w-[520px] text-left">
                <thead className="bg-muted/50">
                  <tr className={cn(AppTypography.caption2, "text-muted-foreground")}>
                    <th className="px-3 py-1.5 font-medium">Дата и время</th>
                    <th className="px-3 py-1.5 text-right font-medium">Кол-во</th>
                    <th className="px-3 py-1.5 text-right font-medium">Размер</th>
                    <th className="px-3 py-1.5 font-medium">Причина</th>
                    <th className="px-3 py-1.5 font-medium">Оператор</th>
                  </tr>
                </thead>
                <tbody className={cn(AppTypography.footnote)}>
                  {report.defects.map((d) => (
                    <tr key={d.id} className="border-t border-card-border align-top">
                      <td className="px-3 py-1.5 tabular-nums text-muted-foreground">{formatDateTime(d.at)}</td>
                      <td className="px-3 py-1.5 text-right font-semibold tabular-nums text-destructive">{d.count}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{d.widthMm ? formatMm(d.widthMm) : "—"}</td>
                      <td className="px-3 py-1.5">{d.reason || "—"}</td>
                      <td className="px-3 py-1.5 text-muted-foreground">{d.operator || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardView>
    </ScreenScaffold>
  );
}
