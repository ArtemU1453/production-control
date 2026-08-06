import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
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
  const { toast } = useToast();
  const [edit, setEdit] = useState<JumboEdit | null>(null);
  const [closeComment, setCloseComment] = useState("");

  const onClose = async () => {
    const outcome = await vm.close(closeComment);
    if (outcome) {
      toast({
        title: "Джамб закрыт и перемещён в архив",
        description: `Технологический остаток: ${formatMeters(outcome.waste.lengthM ?? 0)} · Использование: ${outcome.archived.statistics.usefulPercent.toFixed(1)}%`,
      });
    }
  };

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
      toolbar={
        <>
          <Link href="/warehouse">
            <Button variant="secondary" size="icon" className="rounded-xl" aria-label="Назад к складу">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <StatusBadge label={jumboStatusTitle(jumbo.status)} tone={role} />
        </>
      }
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

        {vm.canClose && vm.closeSummary ? (
          <CardView title="Закрытие Джамба" icon={icons.archive} animate>
            <div className="space-y-3">
              <div className="space-y-2">
                <InfoRow label="Номер" value={vm.closeSummary.stockNumber} />
                <InfoRow label="Материал" value={vm.closeSummary.materialCode} />
                <InfoRow label="Начальная намотка" value={formatMeters(vm.closeSummary.initialWindingM)} />
                <InfoRow label="Остаток" value={formatMeters(vm.closeSummary.currentRemainderM)} />
                <InfoRow label="Использовано" value={formatMeters(vm.closeSummary.usedLength)} />
                <InfoRow label="Полезная площадь" value={formatArea(vm.closeSummary.usefulArea)} />
                <InfoRow label="Количество заказов" value={vm.closeSummary.ordersCount} />
                <InfoRow label="Количество рулонов" value={vm.closeSummary.rollsCount} last />
              </div>
              <div className="space-y-1">
                <Label htmlFor="close-comment" className="text-xs">Комментарий</Label>
                <Textarea
                  id="close-comment"
                  className="rounded-2xl"
                  value={closeComment}
                  onChange={(event) => setCloseComment(event.target.value)}
                  placeholder="Необязательно"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Остаток будет списан как технологический остаток, показатели зафиксированы, Джамб
                перемещён в архив. Действие необратимо.
              </p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <PrimaryButton fullWidth loading={vm.closing} icon={icons.archive}>
                    Закрыть Джамб
                  </PrimaryButton>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Закрыть Джамб № {vm.closeSummary.stockNumber}?</AlertDialogTitle>
                  </AlertDialogHeader>
                  <div className="space-y-1 text-sm">
                    <InfoRow label="Остаток → тех. остаток" value={formatMeters(vm.closeSummary.currentRemainderM)} />
                    <InfoRow label="Использовано" value={formatMeters(vm.closeSummary.usedLength)} />
                    <InfoRow label="Заказов / Рулонов" value={`${vm.closeSummary.ordersCount} / ${vm.closeSummary.rollsCount}`} last />
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Отмена</AlertDialogCancel>
                    <AlertDialogAction onClick={() => void onClose()}>Закрыть и архивировать</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardView>
        ) : null}

        {vm.jumbo.status === JumboStatus.archived ? (
          <CardView animate>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <icons.archive className="h-4 w-4" />
              Джамб закрыт и находится в архиве.
            </div>
          </CardView>
        ) : null}

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
