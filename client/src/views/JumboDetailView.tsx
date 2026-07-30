import { useEffect, useState } from "react";
import {
  CardView,
  EmptyState,
  InfoRow,
  LoadingView,
  MetricCard,
  PrimaryButton,
  ScreenScaffold,
  SecondaryButton,
  StatusBadge,
} from "@/components";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { icons } from "@/resources/icons";
import { strings } from "@/resources/strings";
import {
  JumboStatus,
  jumboOperationTitle,
  jumboStatusColorRole,
  jumboStatusTitle,
  jumboStatusOrder,
} from "@/models";
import { formatArea, formatMeters } from "@/extensions/number";
import { formatDate, formatDateTime } from "@/extensions/date";
import { useJumboDetailViewModel, type JumboEdit } from "@/viewmodels";

export function JumboDetailView({ jumboId }: { jumboId: string }) {
  const vm = useJumboDetailViewModel(jumboId);
  const [edit, setEdit] = useState<JumboEdit | null>(null);

  useEffect(() => {
    if (vm.jumbo) {
      setEdit({
        status: vm.jumbo.status,
        currentRemainderM: vm.jumbo.currentRemainderM,
        comment: vm.jumbo.comment ?? "",
      });
    }
  }, [vm.jumbo]);

  if (vm.loading) {
    return (
      <ScreenScaffold title={strings.jumbo.title}>
        <LoadingView />
      </ScreenScaffold>
    );
  }

  if (!vm.jumbo || !edit) {
    return (
      <ScreenScaffold title={strings.jumbo.title}>
        <EmptyState icon={icons.jumbo} title="Джамб не найден" />
      </ScreenScaffold>
    );
  }

  const jumbo = vm.jumbo;
  const role = jumboStatusColorRole(jumbo.status);

  return (
    <ScreenScaffold
      title={`№ ${jumbo.stockNumber}`}
      toolbar={<StatusBadge label={jumboStatusTitle(jumbo.status)} tone={role} />}
    >
      <div className="space-y-4">
        <CardView title="Сведения" icon={icons.jumbo} animate>
          <div className="space-y-2">
            <InfoRow label="Материал" value={`${jumbo.materialCode}${vm.material ? ` · ${vm.material.name}` : ""}`} />
            <InfoRow label="Ширина" value={`${jumbo.widthMm} мм`} />
            <InfoRow label="Начальная намотка" value={formatMeters(jumbo.initialWindingM)} />
            <InfoRow label="Текущий остаток" value={formatMeters(jumbo.currentRemainderM)} />
            <InfoRow label="Дата поступления" value={formatDate(jumbo.arrivalDate)} />
            <InfoRow
              label="Начало использования"
              value={jumbo.usageStartDate ? formatDate(jumbo.usageStartDate) : "—"}
            />
            <InfoRow
              label="Окончание использования"
              value={jumbo.usageEndDate ? formatDate(jumbo.usageEndDate) : "—"}
              last
            />
          </div>
        </CardView>

        <CardView title="Накопительные показатели" icon={icons.analytics} headerTone="accent" animate>
          <div className="grid grid-cols-2 gap-3">
            <MetricCard label="Использовано" value={formatMeters(jumbo.usedLength)} />
            <MetricCard label="Полезная площадь" value={formatArea(jumbo.usefulArea)} />
            <MetricCard label="Брак" value={formatArea(jumbo.wasteArea)} />
            <MetricCard label="Тех. остаток" value={formatArea(jumbo.scrapArea)} />
            <MetricCard
              label="Коэффициент"
              value={`${(jumbo.efficiency * 100).toFixed(1)}%`}
              className="col-span-2"
            />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Показатели хранятся в записи Джамба и будут обновляться после каждой операции на
            следующих этапах.
          </p>
        </CardView>

        <CardView title="Управление" icon={icons.settings} animate>
          <div className="space-y-4">
            {jumbo.status === JumboStatus.onStock ? (
              <SecondaryButton fullWidth onClick={() => void vm.startUsage()}>
                Начать использование
              </SecondaryButton>
            ) : null}

            <div className="space-y-2">
              <Label>Статус</Label>
              <Select
                value={edit.status}
                onValueChange={(value) => setEdit({ ...edit, status: value as JumboStatus })}
              >
                <SelectTrigger className="rounded-2xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {jumboStatusOrder.map((status) => (
                    <SelectItem key={status} value={status}>
                      {jumboStatusTitle(status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="jumbo-remainder">Текущий остаток, м</Label>
              <Input
                id="jumbo-remainder"
                type="number"
                inputMode="numeric"
                className="rounded-2xl"
                value={edit.currentRemainderM}
                onChange={(event) =>
                  setEdit({ ...edit, currentRemainderM: Number(event.target.value) })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="jumbo-comment">Комментарий</Label>
              <Input
                id="jumbo-comment"
                className="rounded-2xl"
                value={edit.comment}
                onChange={(event) => setEdit({ ...edit, comment: event.target.value })}
              />
            </div>

            {vm.error ? <div className="text-sm text-destructive">{vm.error}</div> : null}

            <PrimaryButton fullWidth loading={vm.saving} onClick={() => void vm.saveEdit(edit)}>
              Сохранить изменения
            </PrimaryButton>
          </div>
        </CardView>

        <CardView title={strings.jumbo.timeline} icon={icons.history} animate>
          {vm.operations.length === 0 ? (
            <div className="py-2 text-sm text-muted-foreground">Операций пока нет</div>
          ) : (
            <ol className="space-y-4">
              {vm.operations.map((operation, index) => (
                <li key={operation.id} className="relative flex gap-3">
                  <div className="flex flex-col items-center">
                    <span className="mt-1 h-2.5 w-2.5 rounded-full bg-primary" />
                    {index < vm.operations.length - 1 ? (
                      <span className="mt-1 w-px flex-1 bg-border" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1 pb-1">
                    <div className="text-sm font-medium">{jumboOperationTitle(operation.type)}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDateTime(operation.timestamp)}
                      {operation.operator ? ` · ${operation.operator}` : ""}
                    </div>
                    {operation.comment ? (
                      <div className="mt-0.5 text-xs text-muted-foreground">{operation.comment}</div>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </CardView>
      </div>
    </ScreenScaffold>
  );
}
