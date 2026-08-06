import { Link } from "wouter";
import { ArrowLeft, PackageCheck, Lock, LockOpen } from "lucide-react";
import {
  CardView,
  InfoRow,
  LoadingView,
  PrimaryButton,
  ScreenScaffold,
  SecondaryButton,
  SectionHeader,
  StatusBadge,
  Timeline,
  type TimelineItem,
} from "@/components";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AppTypography } from "@/designsystem";
import {
  FinishedRollStatus,
  coatingTitle,
  finishedRollStatusColorRole,
  finishedRollStatusTitle,
  machineTitle,
} from "@/models";
import { useFinishedRollViewModel } from "@/viewmodels";

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("ru-RU");
}

/**
 * Finished-roll detail card. Shows the full context of one produced roll, its
 * complete movement history, and the actions available from its current status
 * (reserve / release / ship). Nothing is ever deleted — a shipped roll stays
 * here with its history intact.
 */
export function FinishedRollDetailView({ rollId }: { rollId: string }) {
  const vm = useFinishedRollViewModel(rollId);

  if (vm.loading) {
    return (
      <ScreenScaffold title="Готовый рулон">
        <LoadingView />
      </ScreenScaffold>
    );
  }

  if (!vm.roll) {
    return (
      <ScreenScaffold title="Готовый рулон">
        <CardView>
          <p className={cn(AppTypography.footnote, "text-muted-foreground")}>Рулон не найден.</p>
          <Link href="/finished-goods">
            <SecondaryButton icon={ArrowLeft} className="mt-3">
              К списку
            </SecondaryButton>
          </Link>
        </CardView>
      </ScreenScaffold>
    );
  }

  const roll = vm.roll;
  const role = finishedRollStatusColorRole(roll.status);
  const canReserve = roll.status === FinishedRollStatus.inStock || roll.status === FinishedRollStatus.inOrder;
  const canRelease = roll.status === FinishedRollStatus.reserved;
  const canShip = roll.status !== FinishedRollStatus.shipped;

  const historyItems: TimelineItem[] = roll.history
    .slice()
    .reverse()
    .map((entry) => ({
      id: entry.id,
      title: entry.title,
      subtitle: entry.operator ? `Оператор: ${entry.operator}` : undefined,
      timestamp: formatDateTime(entry.at),
      tone: finishedRollStatusColorRole(entry.status),
    }));

  return (
    <ScreenScaffold
      title={roll.number}
      subtitle={`Заказ ${roll.orderNumber || "—"} · ${roll.materialCode}`}
      toolbar={
        <Link href="/finished-goods">
          <Button variant="secondary" size="icon" className="rounded-xl" aria-label="К списку">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
      }
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <CardView>
          <div className="mb-3 flex items-center justify-between gap-2">
            <SectionHeader title="Рулон" />
            <StatusBadge label={finishedRollStatusTitle(roll.status)} tone={role} />
          </div>
          <div className="space-y-1">
            <InfoRow label="№ рулона" value={roll.number} />
            <InfoRow label="Материал" value={roll.materialCode} />
            <InfoRow label="Ширина" value={`${roll.widthMm} мм`} />
            <InfoRow label="Длина" value={`${roll.lengthM} м`} />
            <InfoRow label="Количество" value={`${roll.count} шт.`} />
            {roll.coating ? <InfoRow label="Красящий слой" value={coatingTitle(roll.coating)} /> : null}
            <InfoRow label="Дата изготовления" value={formatDateTime(roll.producedAt)} />
            <InfoRow label="Станок" value={machineTitle(roll.machine)} />
            <InfoRow label="Оператор" value={roll.operator || "—"} />
            <InfoRow label="Джамбо" value={roll.jumboStockNumber || "—"} />
            <InfoRow label="Заказ" value={roll.orderNumber || "—"} />
            {roll.sourceReason ? <InfoRow label="Причина появления" value={roll.sourceReason} /> : null}
            {roll.storageLocation ? <InfoRow label="Место хранения" value={roll.storageLocation} /> : null}
            <InfoRow label="Статус" value={finishedRollStatusTitle(roll.status)} last={!roll.comment} />
            {roll.comment ? <InfoRow label="Комментарий" value={roll.comment} last /> : null}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {canReserve ? (
              <SecondaryButton icon={Lock} onClick={() => void vm.reserve(roll.operator)}>
                Зарезервировать
              </SecondaryButton>
            ) : null}
            {canRelease ? (
              <SecondaryButton icon={LockOpen} onClick={() => void vm.releaseReservation(roll.operator)}>
                Снять резерв
              </SecondaryButton>
            ) : null}
            {canShip ? (
              <PrimaryButton icon={PackageCheck} onClick={() => void vm.ship(roll.operator)}>
                Отгрузить
              </PrimaryButton>
            ) : null}
          </div>
        </CardView>

        <CardView>
          <SectionHeader title="История" />
          <div className="mt-3">
            {historyItems.length > 0 ? (
              <Timeline items={historyItems} />
            ) : (
              <p className={cn(AppTypography.footnote, "text-muted-foreground")}>История пуста.</p>
            )}
          </div>
        </CardView>
      </div>
    </ScreenScaffold>
  );
}
