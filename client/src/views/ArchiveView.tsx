import { useMemo, useState } from "react";
import { Link } from "wouter";
import { Archive, ChevronRight, ShieldAlert, Trash2 } from "lucide-react";
import {
  CardView,
  EmptyState,
  LoadingView,
  ScreenScaffold,
  SearchBar,
  SegmentedControl,
  StatusBadge,
  type SegmentOption,
} from "@/components";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { AppTypography } from "@/designsystem";
import { useToast } from "@/hooks/use-toast";
import { strings } from "@/resources/strings";
import { formatDateTime } from "@/extensions/date";
import { machineTitle, type ArchivedJumbo } from "@/models";
import {
  ARCHIVE_CLEAR_PHRASE,
  ARCHIVE_MONTHS,
  useArchiveViewModel,
  type ArchiveMaterialFilter,
  type ArchiveYearFilter,
} from "@/viewmodels";
import { buildJumboProduction } from "./archive/jumboProduction";

const MONTH_NAMES: Record<string, string> = {
  "01": "Январь", "02": "Февраль", "03": "Март", "04": "Апрель",
  "05": "Май", "06": "Июнь", "07": "Июль", "08": "Август",
  "09": "Сентябрь", "10": "Октябрь", "11": "Ноябрь", "12": "Декабрь",
};

/** One archive list row: short production summary + link to the full report. */
function ArchiveRow({ entry }: { entry: ArchivedJumbo }) {
  const p = useMemo(() => buildJumboProduction(entry), [entry]);
  const machines = p.machines.length ? p.machines.map((m) => machineTitle(m)).join(", ") : "—";
  const operators = p.operators.length ? p.operators.join(", ") : "—";
  return (
    <Link href={`/archive/${entry.id}`} className="block">
      <div className="glass noise flex items-center gap-3 rounded-3xl border-card-border p-4 transition-transform active:scale-[0.99]">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground">
          <Archive className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">
            Джамбо № {entry.jumbo.stockNumber} · {entry.jumbo.materialCode}
          </div>
          <div className="truncate text-xs text-muted-foreground">
            {formatDateTime(p.producedAt)} · {machines} · {operators}
          </div>
          <div className="truncate text-xs text-muted-foreground">
            {p.totals.totalRolls} рулонов · {p.totals.mainRolls} основных · {p.totals.additionalRolls} дополнительных ·{" "}
            {p.totals.wastePercent.toFixed(1)}% отхода
          </div>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      </div>
    </Link>
  );
}

type ClearStep = "confirm" | "password" | "final";

/** Password-gated «Очистить архив» flow: warning → password → final confirm.
 *  Deletes only archived Jumbos; nothing else is touched. */
function ClearArchiveDialog({
  count,
  pinConfigured,
  verify,
  onCleared,
}: {
  count: number;
  pinConfigured: boolean;
  verify: (input: string) => boolean;
  onCleared: () => Promise<void>;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<ClearStep>("confirm");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function reset() {
    setStep("confirm");
    setPassword("");
    setError(null);
    setBusy(false);
  }

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      reset();
    }
  }

  function submitPassword() {
    if (verify(password)) {
      setError(null);
      setStep("final");
    } else {
      setError("Неверный пароль. Архив не удалён.");
    }
  }

  async function confirmDelete() {
    setBusy(true);
    await onCleared();
    setBusy(false);
    setOpen(false);
    reset();
    toast({ title: "Архив очищен" });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <Button
        variant="outline"
        className="shrink-0 rounded-2xl border-destructive-border text-destructive"
        onClick={() => onOpenChange(true)}
      >
        <Trash2 className="h-4 w-4" />
        Очистить архив
      </Button>
      <DialogContent>
        {step === "confirm" ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-destructive" />
                Очистить архив
              </DialogTitle>
            </DialogHeader>
            <p className={cn(AppTypography.footnote, "text-muted-foreground")}>
              Удалить все архивные записи? Это действие нельзя отменить. Будут удалены только записи
              архива ({count} шт.) — склад, материалы, производство и настройки не затрагиваются.
            </p>
            <DialogFooter>
              <Button variant="secondary" className="rounded-2xl" onClick={() => onOpenChange(false)}>
                Отмена
              </Button>
              <Button variant="destructive" className="rounded-2xl" onClick={() => setStep("password")}>
                Продолжить
              </Button>
            </DialogFooter>
          </>
        ) : step === "password" ? (
          <>
            <DialogHeader>
              <DialogTitle>Подтверждение паролем</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="archive-clear-pass" className="text-sm">
                {pinConfigured
                  ? "Введите PIN-код для подтверждения"
                  : `Введите «${ARCHIVE_CLEAR_PHRASE}» для подтверждения`}
              </Label>
              <Input
                id="archive-clear-pass"
                type={pinConfigured ? "password" : "text"}
                inputMode={pinConfigured ? "numeric" : "text"}
                autoFocus
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitPassword();
                }}
                className="rounded-2xl"
                placeholder={pinConfigured ? "••••" : ARCHIVE_CLEAR_PHRASE}
              />
              {error ? (
                <p className={cn(AppTypography.caption, "text-destructive")}>{error}</p>
              ) : !pinConfigured ? (
                <p className={cn(AppTypography.caption2, "text-muted-foreground")}>
                  PIN-код не задан. Его можно включить в «Настройки → Безопасность».
                </p>
              ) : null}
            </div>
            <DialogFooter>
              <Button variant="secondary" className="rounded-2xl" onClick={() => setStep("confirm")}>
                Назад
              </Button>
              <Button
                variant="destructive"
                className="rounded-2xl"
                disabled={password.trim().length === 0}
                onClick={submitPassword}
              >
                Подтвердить
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-destructive" />
                Окончательное удаление
              </DialogTitle>
            </DialogHeader>
            <p className={cn(AppTypography.footnote, "text-muted-foreground")}>
              Пароль верный. Удалить все {count} записей архива безвозвратно?
            </p>
            <DialogFooter>
              <Button variant="secondary" className="rounded-2xl" onClick={() => onOpenChange(false)}>
                Отмена
              </Button>
              <Button
                variant="destructive"
                className="rounded-2xl"
                disabled={busy}
                onClick={() => void confirmDelete()}
              >
                Удалить архив
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Archive of closed Jumbos with frozen statistics, search and filters. */
export function ArchiveView() {
  const vm = useArchiveViewModel();

  const materialOptions: ReadonlyArray<SegmentOption<ArchiveMaterialFilter>> = [
    { value: "all", label: "Все материалы" },
    ...vm.materialOptions.map((code) => ({ value: code, label: code })),
  ];
  const yearOptions: ReadonlyArray<SegmentOption<ArchiveYearFilter>> = [
    { value: "all", label: "Все годы" },
    ...vm.yearOptions.map((year) => ({ value: year, label: year })),
  ];

  return (
    <ScreenScaffold title={strings.archive.title}>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <SearchBar
            value={vm.query}
            onChange={vm.setQuery}
            placeholder="Номер, материал, оператор, период"
            className="flex-1"
          />
          {vm.archived.length > 0 ? (
            <ClearArchiveDialog
              count={vm.archived.length}
              pinConfigured={vm.pinConfigured}
              verify={vm.verifyClearPassword}
              onCleared={vm.clearArchive}
            />
          ) : null}
        </div>
        <SegmentedControl
          options={materialOptions}
          value={vm.materialFilter}
          onChange={vm.setMaterialFilter}
          aria-label="Фильтр по материалу"
        />
        <div className="flex items-center gap-2">
          <SegmentedControl
            options={yearOptions}
            value={vm.yearFilter}
            onChange={vm.setYearFilter}
            aria-label="Фильтр по году"
            className="flex-1"
          />
          <Select value={vm.monthFilter} onValueChange={vm.setMonthFilter}>
            <SelectTrigger className="w-32 shrink-0 rounded-2xl">
              <SelectValue placeholder="Месяц" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все месяцы</SelectItem>
              {ARCHIVE_MONTHS.map((month) => (
                <SelectItem key={month} value={month}>
                  {MONTH_NAMES[month]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {vm.loading ? (
          <LoadingView />
        ) : vm.archived.length === 0 ? (
          <CardView animate>
            <EmptyState icon={Archive} title={strings.archive.empty} message={strings.archive.emptyHint} />
          </CardView>
        ) : (
          <div className="space-y-3">
            {vm.archived.map((entry) => (
              <ArchiveRow key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </div>
    </ScreenScaffold>
  );
}
