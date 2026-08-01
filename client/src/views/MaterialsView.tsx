import { useState } from "react";
import { Link, useLocation } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Copy, Pencil, Plus, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  EmptyState,
  LoadingView,
  PrimaryButton,
  ScreenScaffold,
  SearchBar,
  SecondaryButton,
  SegmentedControl,
  type SegmentOption,
} from "@/components";
import { cn } from "@/lib/utils";
import { icons } from "@/resources/icons";
import { strings } from "@/resources/strings";
import { AppTypography } from "@/designsystem";
import { MaterialStatus, materialStatusTitle, type Material } from "@/models";
import { formatDateTime } from "@/extensions/date";
import { useToast } from "@/hooks/use-toast";
import {
  useMaterialsViewModel,
  type MaterialSortKey,
  type MaterialStatusFilter,
} from "@/viewmodels";

const statusOptions: ReadonlyArray<SegmentOption<MaterialStatusFilter>> = [
  { value: "all", label: "Все" },
  { value: MaterialStatus.active, label: materialStatusTitle(MaterialStatus.active) },
  { value: MaterialStatus.inactive, label: materialStatusTitle(MaterialStatus.inactive) },
];

const sortOptions: ReadonlyArray<SegmentOption<MaterialSortKey>> = [
  { value: "code", label: "Код" },
  { value: "name", label: "Название" },
  { value: "manufacturer", label: "Производитель" },
  { value: "createdAt", label: "Дата" },
];

const STATUS_COLOR: Record<MaterialStatus, string> = {
  [MaterialStatus.active]: "hsl(142 71% 45%)",
  [MaterialStatus.inactive]: "hsl(0 78% 54%)",
};

function StatusDot({ status }: { status: MaterialStatus }) {
  return (
    <span className={cn(AppTypography.caption, "inline-flex items-center gap-1.5")}>
      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: STATUS_COLOR[status] }} aria-hidden />
      {materialStatusTitle(status)}
    </span>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className={cn(AppTypography.caption, "shrink-0 text-muted-foreground")}>{label}</dt>
      <dd className={cn(AppTypography.footnote, "min-w-0 break-words text-right")}>{value || "—"}</dd>
    </div>
  );
}

/** A compact catalog card. Full details render only when expanded (one card at
 *  a time), so long lists stay light. */
function MaterialCard({
  material,
  expanded,
  onToggle,
  onDuplicate,
  onDelete,
}: {
  material: Material;
  expanded: boolean;
  onToggle: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const Icon = icons.material;
  return (
    <div className="flex flex-col rounded-2xl border border-card-border bg-card/70 p-3">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex items-start gap-3 rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
          <Icon className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className={cn(AppTypography.subheadline, "block truncate font-mono")}>{material.code}</span>
          <span className={cn(AppTypography.caption, "block truncate text-muted-foreground")}>{material.name || "—"}</span>
          <span className={cn(AppTypography.caption, "mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-muted-foreground")}>
            <span>{material.standardWidthMm} мм</span>
            <span>·</span>
            <span>{material.thicknessMicron} мкм</span>
          </span>
          <span className="mt-1 flex items-center justify-between gap-2">
            <StatusDot status={material.status} />
            <ChevronDown
              className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", expanded && "rotate-180")}
              aria-hidden
            />
          </span>
        </span>
      </button>

      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-3 border-t border-card-border pt-3">
              <dl className="space-y-1.5">
                <DetailRow label="Код" value={material.code} />
                <DetailRow label="Название" value={material.name} />
                <DetailRow label="Производитель" value={material.manufacturer} />
                <DetailRow label="Толщина" value={`${material.thicknessMicron} мкм`} />
                <DetailRow label="Ширина" value={`${material.standardWidthMm} мм`} />
                <DetailRow label="Описание" value={material.description} />
                <DetailRow label="Создан" value={formatDateTime(material.createdAt)} />
                <DetailRow label="Статус" value={materialStatusTitle(material.status)} />
              </dl>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <Link href={`/materials/${material.id}/edit`} className="col-span-2">
                  <PrimaryButton icon={Pencil} fullWidth>
                    Редактировать
                  </PrimaryButton>
                </Link>
                <SecondaryButton icon={Copy} onClick={onDuplicate}>
                  Дублировать
                </SecondaryButton>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <SecondaryButton icon={Trash2} className="text-destructive">
                      Удалить
                    </SecondaryButton>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Удалить материал?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Материал «{material.code} · {material.name}» будет удалён. Действие необратимо.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Отмена</AlertDialogCancel>
                      <AlertDialogAction onClick={onDelete}>Удалить</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/** Reference book of materials: a compact, responsive grid catalog with instant
 *  search, status filter, sort and expandable cards. Data, search, CRUD and the
 *  edit form are unchanged — this is the list presentation only. */
export function MaterialsView() {
  const vm = useMaterialsViewModel();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const onDuplicate = async (material: Material) => {
    const newId = await vm.duplicate(material);
    toast({ title: "Материал дублирован", description: "Проверьте код и сохраните." });
    setLocation(`/materials/${newId}/edit`);
  };

  return (
    <ScreenScaffold title={strings.materials.title} subtitle={`Материалов: ${vm.materials.length}`} wide>
      <div className="space-y-3">
        {/* Compact control bar: search · filter · sort · add — in one zone. */}
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <SearchBar
            value={vm.query}
            onChange={vm.setQuery}
            placeholder="Код, название, производитель"
            className="lg:flex-1"
          />
          <div className="flex flex-wrap items-center gap-2">
            <SegmentedControl
              options={statusOptions}
              value={vm.statusFilter}
              onChange={vm.setStatusFilter}
              aria-label="Фильтр по статусу"
            />
            <SegmentedControl
              options={sortOptions}
              value={vm.sortKey}
              onChange={vm.setSortKey}
              aria-label="Сортировка"
            />
            <Link href="/materials/new">
              <PrimaryButton icon={Plus}>Добавить</PrimaryButton>
            </Link>
          </div>
        </div>

        {vm.loading ? (
          <LoadingView />
        ) : vm.materials.length === 0 ? (
          <EmptyState
            icon={icons.material}
            title={strings.materials.empty}
            message={strings.materials.emptyHint}
            action={
              <Link href="/materials/new">
                <Button className="rounded-xl">
                  <Plus className="mr-1 h-4 w-4" /> Добавить материал
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {vm.materials.map((material) => (
              <MaterialCard
                key={material.id}
                material={material}
                expanded={expandedId === material.id}
                onToggle={() => setExpandedId((prev) => (prev === material.id ? null : material.id))}
                onDuplicate={() => void onDuplicate(material)}
                onDelete={() => void vm.remove(material.id)}
              />
            ))}
          </div>
        )}
      </div>
    </ScreenScaffold>
  );
}
