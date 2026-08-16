import { useEffect, useMemo } from "react";
import { Link } from "wouter";
import { ArrowLeft, Printer } from "lucide-react";
import {
  LoadingView,
  PrimaryButton,
  ScreenScaffold,
  SecondaryButton,
} from "@/components";
import { cn } from "@/lib/utils";
import { AppTypography } from "@/designsystem";
import { coatingTitle, machineTitle } from "@/models";
import { qrDataUrl } from "@/core/labels/qr";
import { useFinishedRollViewModel } from "@/viewmodels";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("ru-RU");
}

/**
 * Printable label for a finished roll. Renders a compact card with the roll's
 * key attributes and a self-contained QR code (no network). App chrome and the
 * action buttons are marked `data-no-print`, so only the label prints.
 */
export function FinishedRollLabelView({ rollId }: { rollId: string }) {
  const vm = useFinishedRollViewModel(rollId);
  const roll = vm.roll;

  const qr = useMemo(() => {
    if (!roll) return "";
    const payload = [
      `РЛ:${roll.number}`,
      `Мат:${roll.materialCode}`,
      `Слой:${roll.coating ? coatingTitle(roll.coating) : "-"}`,
      `${roll.widthMm}x${roll.lengthM}`,
    ].join(" | ");
    return qrDataUrl(payload, 4, 2);
  }, [roll]);

  // Ctrl/Cmd+P works too; keep an explicit button for touch devices.
  useEffect(() => {
    document.title = roll ? `Этикетка ${roll.number}` : "Этикетка";
  }, [roll]);

  if (vm.loading) {
    return (
      <ScreenScaffold title="Этикетка">
        <LoadingView />
      </ScreenScaffold>
    );
  }
  if (!roll) {
    return (
      <ScreenScaffold title="Этикетка">
        <p className={cn(AppTypography.footnote, "text-muted-foreground")}>Рулон не найден.</p>
      </ScreenScaffold>
    );
  }

  const cell = (label: string, value: string) => (
    <div className="min-w-0">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="truncate text-sm font-semibold tabular-nums">{value}</div>
    </div>
  );

  return (
    <ScreenScaffold
      title="Печать этикетки"
      toolbar={
        <div data-no-print className="flex items-center gap-2">
          <Link href={`/finished-goods/${roll.id}`}>
            <SecondaryButton icon={ArrowLeft}>Назад</SecondaryButton>
          </Link>
          <PrimaryButton icon={Printer} onClick={() => window.print()}>
            Печать
          </PrimaryButton>
        </div>
      }
    >
      <div className="mx-auto max-w-[420px]">
        {/* The label itself — this is what prints. */}
        <div className="rounded-2xl border-2 border-foreground/70 bg-white p-4 text-black">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wide text-neutral-500">Готовый рулон</div>
              <div className="truncate text-xl font-bold tabular-nums">{roll.number}</div>
            </div>
            <img src={qr} alt="QR" className="h-24 w-24 shrink-0" />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
            {cell("Материал", roll.materialCode)}
            {cell("Слой", roll.coating ? coatingTitle(roll.coating) : "—")}
            {cell("Ширина", `${roll.widthMm} мм`)}
            {cell("Длина", `${roll.lengthM} м`)}
            {cell("Дата", formatDate(roll.producedAt))}
            {cell("Джамбо", roll.jumboStockNumber || "—")}
            {cell("Станок", machineTitle(roll.machine))}
          </div>
        </div>
        <p data-no-print className={cn(AppTypography.caption, "mt-3 text-center text-muted-foreground")}>
          Нажмите «Печать», затем выберите принтер или «Сохранить как PDF».
        </p>
      </div>
    </ScreenScaffold>
  );
}
