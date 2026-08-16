import { useMemo } from "react";
import { Archive, ArrowLeft, TriangleAlert } from "lucide-react";
import { Link } from "wouter";
import {
  CardView,
  EmptyState,
  InfoRow,
  LoadingView,
  ScreenScaffold,
  StatusBadge,
} from "@/components";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { icons } from "@/resources/icons";
import { AppTypography } from "@/designsystem";
import {
  jumboOperationTitle,
  machineTitle,
  wasteKindTitle,
} from "@/models";
import { formatArea, formatMeters, formatMm } from "@/extensions/number";
import { formatDate, formatDateTime } from "@/extensions/date";
import { useArchiveDetailViewModel } from "@/viewmodels";
import { buildJumboProduction, NO_DATA } from "./archive/jumboProduction";

export function ArchiveDetailView({ archiveId }: { archiveId: string }) {
  const vm = useArchiveDetailViewModel(archiveId);

  // Normalized production report — derived purely from the frozen snapshot.
  const production = useMemo(
    () => (vm.archived ? buildJumboProduction(vm.archived) : null),
    [vm.archived],
  );

  if (vm.loading) {
    return (
      <ScreenScaffold title="Карточка архива">
        <LoadingView />
      </ScreenScaffold>
    );
  }

  if (!vm.archived || !production) {
    return (
      <ScreenScaffold title="Карточка архива">
        <EmptyState icon={Archive} title="Запись архива не найдена" />
      </ScreenScaffold>
    );
  }

  const { archived } = vm;
  const t = production.totals;
  const operators = production.operators.length ? production.operators.join(", ") : NO_DATA;
  const machines = production.machines.length
    ? production.machines.map((m) => machineTitle(m)).join(", ")
    : NO_DATA;

  return (
    <ScreenScaffold
      title={`Джамбо № ${archived.jumbo.stockNumber} · ${archived.jumbo.materialCode}`}
      subtitle={`${formatDateTime(production.producedAt)} · ${machines} · ${operators}`}
      toolbar={
        <Link href="/archive">
          <Button variant="secondary" size="icon" className="rounded-xl" aria-label="Назад в архив">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
      }
      wide
    >
      <div className="space-y-4">
        {/* ── Основная информация ─────────────────────────────────────────── */}
        <CardView title="Основная информация" icon={icons.analytics} animate>
          <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
            <div className="space-y-1">
              <InfoRow label="Джамбо" value={`№ ${archived.jumbo.stockNumber}`} />
              <InfoRow label="Материал" value={archived.jumbo.materialCode} />
              <InfoRow label="Дата и время" value={formatDateTime(production.producedAt)} />
              <InfoRow label="Станок" value={machines} />
              <InfoRow label="Оператор" value={operators} last />
            </div>
            <div className="space-y-1">
              <InfoRow label="Исходная намотка" value={formatMeters(t.initialWindingM)} />
              <InfoRow label="Использовано материала" value={formatMeters(t.usedMaterialM)} />
              <InfoRow label="Остаток Джамба" value={formatMeters(t.remainderM)} />
              <InfoRow label="Циклов" value={`${t.cycles}`} />
              <InfoRow label="Отход" value={`${t.wastePercent.toFixed(1)}%`} />
              <InfoRow label="Выход" value={`${t.yieldPercent.toFixed(1)}%`} last />
            </div>
          </div>
        </CardView>

        {/* ── Произведено ─────────────────────────────────────────────────── */}
        <CardView title="Произведено" icon={icons.dashboard} animate>
          {production.lines.length === 0 ? (
            <p className={cn(AppTypography.footnote, "text-muted-foreground")}>{NO_DATA}</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-card-border">
              <table className="w-full min-w-[460px] text-left">
                <thead className="bg-muted/50">
                  <tr className={cn(AppTypography.caption2, "text-muted-foreground")}>
                    <th className="px-3 py-1.5 font-medium">Размер</th>
                    <th className="px-3 py-1.5 text-right font-medium">Количество</th>
                    <th className="px-3 py-1.5 text-right font-medium">Длина</th>
                    <th className="px-3 py-1.5 font-medium">Назначение</th>
                  </tr>
                </thead>
                <tbody className={cn(AppTypography.footnote, "tabular-nums")}>
                  {production.lines.map((line, index) => (
                    <tr key={`${line.widthMm}-${line.lengthM}-${line.destination}-${index}`} className="border-t border-card-border">
                      <td className="px-3 py-1.5 font-medium">{formatMm(line.widthMm)}</td>
                      <td className="px-3 py-1.5 text-right font-semibold">{line.count} шт.</td>
                      <td className="px-3 py-1.5 text-right">{formatMeters(line.lengthM)}</td>
                      <td className="px-3 py-1.5">
                        {line.toWarehouse ? (
                          <StatusBadge label="Склад" tone="neutral" />
                        ) : (
                          <span className={line.destination === NO_DATA ? "text-muted-foreground" : undefined}>
                            {line.destination}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardView>

        {/* ── Итого ───────────────────────────────────────────────────────── */}
        <CardView title="Итого" icon={icons.gauge} animate>
          <div className="space-y-1">
            <InfoRow label="Всего рулонов" value={`${t.totalRolls} шт.`} />
            <InfoRow label="Основных" value={`${t.mainRolls} шт.`} />
            <InfoRow label="Дополнительных" value={`${t.additionalRolls} шт.`} />
            {t.sampleRolls > 0 ? <InfoRow label="Образцов" value={`${t.sampleRolls} шт.`} /> : null}
            <InfoRow label="На склад" value={`${t.toWarehouse} шт.`} />
            <InfoRow label="По заказчикам" value={`${t.toCustomers} шт.`} />
            {t.byCustomer.map((c) => (
              <InfoRow key={c.customer} label={`— ${c.customer}`} value={`${c.count} шт.`} />
            ))}
            <InfoRow label="Брак" value={`${t.defects} шт.`} />
            <InfoRow label="Использовано материала" value={formatMeters(t.usedMaterialM)} />
            <InfoRow label="Остаток Джамба" value={formatMeters(t.remainderM)} />
            <InfoRow label="Отход" value={`${t.wastePercent.toFixed(1)}%`} last />
          </div>
        </CardView>

        {/* ── Брак ────────────────────────────────────────────────────────── */}
        <CardView title="Брак" icon={TriangleAlert} animate>
          {t.defects === 0 ? (
            <p className={cn(AppTypography.footnote, "text-muted-foreground")}>Брак не зафиксирован.</p>
          ) : (
            <div className="space-y-2">
              <div className={cn(AppTypography.footnote, "text-muted-foreground")}>
                Всего браковано: <span className="font-semibold text-destructive tabular-nums">{t.defects} шт.</span>
              </div>
              <div className="overflow-x-auto rounded-xl border border-card-border">
                <table className="w-full min-w-[360px] text-left">
                  <thead className="bg-muted/50">
                    <tr className={cn(AppTypography.caption2, "text-muted-foreground")}>
                      <th className="px-3 py-1.5 font-medium">Размер</th>
                      <th className="px-3 py-1.5 text-right font-medium">Количество</th>
                      <th className="px-3 py-1.5 font-medium">Причина</th>
                    </tr>
                  </thead>
                  <tbody className={cn(AppTypography.footnote, "tabular-nums")}>
                    {production.defects.map((d, index) => (
                      <tr key={`${d.widthMm ?? ""}-${d.reason ?? ""}-${index}`} className="border-t border-card-border">
                        <td className="px-3 py-1.5">{d.widthMm ? formatMm(d.widthMm) : NO_DATA}</td>
                        <td className="px-3 py-1.5 text-right font-semibold text-destructive">{d.count} шт.</td>
                        <td className="px-3 py-1.5">{d.reason || NO_DATA}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardView>

        {/* ── Потери (сохранено) ──────────────────────────────────────────── */}
        <CardView title="Потери" icon={icons.gauge} headerTone="accent" animate>
          {archived.wastes.length === 0 ? (
            <div className="py-2 text-sm text-muted-foreground">Записей о потерях нет</div>
          ) : (
            <div className="space-y-2">
              {archived.wastes.map((waste, index) => (
                <InfoRow
                  key={waste.id}
                  label={`${wasteKindTitle(waste.kind)}${waste.lengthM ? ` · ${formatMeters(waste.lengthM)}` : ""}`}
                  value={formatArea(waste.areaM2)}
                  last={index === archived.wastes.length - 1}
                />
              ))}
            </div>
          )}
        </CardView>

        {/* ── Журнал операций (сохранено) ─────────────────────────────────── */}
        <CardView title="Журнал операций" icon={icons.clock} animate>
          <ol className="space-y-4">
            {archived.operations.map((operation, index) => (
              <li key={operation.id} className="relative flex gap-3">
                <div className="flex flex-col items-center">
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-primary" />
                  {index < archived.operations.length - 1 ? (
                    <span className="mt-1 w-px flex-1 bg-border" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1 pb-1">
                  <div className="text-sm font-medium">{jumboOperationTitle(operation.type)}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatDateTime(operation.timestamp)}
                    {operation.operator ? ` · ${operation.operator}` : ""}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </CardView>

        <div className="px-1 text-center text-xs text-muted-foreground">
          Архивировано: {formatDate(archived.archivedAt)}
        </div>
      </div>
    </ScreenScaffold>
  );
}
