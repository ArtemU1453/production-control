import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { Pencil, Plus, Trash2 } from "lucide-react";
import {
  CardView,
  EmptyState,
  LoadingView,
  PrimaryButton,
  ScreenScaffold,
  SecondaryButton,
} from "@/components";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { AppTypography } from "@/designsystem";
import { icons } from "@/resources/icons";
import { strings } from "@/resources/strings";
import { formatMeters } from "@/extensions/number";
import { useReceiptViewModel, type ReceiptItemDraft } from "@/viewmodels";

type ReceiptVM = ReturnType<typeof useReceiptViewModel>;

/** Compact add-form: one row (Ширина · Намотка · Комментарий · Добавить). Keeps
 *  the width across adds and returns focus to Намотка for fast bulk entry. */
function AddJumboForm({ vm }: { vm: ReceiptVM }) {
  const [width, setWidth] = useState("");
  const [winding, setWinding] = useState("");
  const [comment, setComment] = useState("");
  const windingRef = useRef<HTMLInputElement>(null);

  // Prefill width from the material's standard width; reset when material changes.
  useEffect(() => {
    setWidth(vm.defaultWidthMm ? String(vm.defaultWidthMm) : "");
  }, [vm.defaultWidthMm]);

  const canAdd = Number(width) > 0 && Number(winding) > 0;
  const add = () => {
    if (!canAdd) {
      return;
    }
    vm.addJumbo({ widthMm: Number(width), initialWindingM: Number(winding), comment: comment.trim() });
    // Keep the width (usually constant across a batch); clear the rest and jump
    // straight back to Намотка so the next Jumbo can be typed immediately.
    setWinding("");
    setComment("");
    windingRef.current?.focus();
  };
  const onEnter = (event: React.KeyboardEvent) => {
    if (event.key === "Enter") {
      event.preventDefault();
      add();
    }
  };

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="w-24 space-y-1">
        <Label className="text-[11px]">Ширина, мм</Label>
        <Input type="number" inputMode="numeric" className="rounded-2xl" value={width} onChange={(e) => setWidth(e.target.value)} onKeyDown={onEnter} />
      </div>
      <div className="w-28 space-y-1">
        <Label className="text-[11px]">Намотка, м</Label>
        <Input ref={windingRef} type="number" inputMode="numeric" className="rounded-2xl" value={winding} onChange={(e) => setWinding(e.target.value)} onKeyDown={onEnter} />
      </div>
      <div className="min-w-[8rem] flex-1 space-y-1">
        <Label className="text-[11px]">Комментарий</Label>
        <Input className="rounded-2xl" value={comment} placeholder="Необязательно" onChange={(e) => setComment(e.target.value)} onKeyDown={onEnter} />
      </div>
      <PrimaryButton icon={Plus} disabled={!canAdd} onClick={add}>
        Добавить
      </PrimaryButton>
    </div>
  );
}

/** Edit an already-added Jumbo (width / winding / comment). */
function EditJumboDialog({ vm, index, item }: { vm: ReceiptVM; index: number; item: ReceiptItemDraft }) {
  const [open, setOpen] = useState(false);
  const [width, setWidth] = useState(String(item.widthMm || ""));
  const [winding, setWinding] = useState(String(item.initialWindingM || ""));
  const [comment, setComment] = useState(item.comment);

  const onOpenChange = (next: boolean) => {
    if (next) {
      setWidth(String(item.widthMm || ""));
      setWinding(String(item.initialWindingM || ""));
      setComment(item.comment);
    }
    setOpen(next);
  };
  const save = () => {
    vm.setItemField(index, "widthMm", Number(width) || 0);
    vm.setItemField(index, "initialWindingM", Number(winding) || 0);
    vm.setItemField(index, "comment", comment);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-muted-foreground" aria-label="Изменить">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Изменить Джамбо</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[11px]">Ширина, мм</Label>
              <Input type="number" className="rounded-2xl" value={width} onChange={(e) => setWidth(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Намотка, м</Label>
              <Input type="number" className="rounded-2xl" value={winding} onChange={(e) => setWinding(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">Комментарий</Label>
            <Input className="rounded-2xl" value={comment} onChange={(e) => setComment(e.target.value)} />
          </div>
          <PrimaryButton fullWidth onClick={save}>
            Сохранить
          </PrimaryButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Compact Jumbo card — only this Jumbo's own data (material is known from the
 *  batch and is not repeated). */
function JumboCard({ vm, index, item }: { vm: ReceiptVM; index: number; item: ReceiptItemDraft }) {
  const row = (label: string, value: string) => (
    <div className="flex items-baseline justify-between gap-2">
      <span className={cn(AppTypography.caption, "text-muted-foreground")}>{label}</span>
      <span className={cn(AppTypography.footnote, "tabular-nums font-medium")}>{value}</span>
    </div>
  );
  return (
    <div className="rounded-xl border border-card-border bg-card/60 p-2.5">
      <div className="space-y-0.5">
        {row("Ширина", `${item.widthMm} мм`)}
        {row("Намотка", formatMeters(item.initialWindingM))}
        {row("Остаток", formatMeters(item.initialWindingM))}
      </div>
      {item.comment ? (
        <div className={cn(AppTypography.caption, "mt-1 truncate text-muted-foreground")} title={item.comment}>
          {item.comment}
        </div>
      ) : null}
      <div className="mt-2 flex items-center justify-between border-t border-card-border pt-1.5">
        <span className={cn(AppTypography.caption2, "inline-flex items-center gap-1 font-medium text-[hsl(142_71%_40%)] dark:text-[hsl(142_71%_58%)]")}>
          <span className="h-1.5 w-1.5 rounded-full bg-[hsl(142_71%_45%)]" />
          Активен
        </span>
        <div className="flex items-center gap-0.5">
          <EditJumboDialog vm={vm} index={index} item={item} />
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-lg text-muted-foreground hover:text-destructive"
            aria-label="Удалить"
            onClick={() => vm.removeItem(index)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Receipt of a raw-material batch: one material, one arrival date (editable
 *  once) and many Jumbos added quickly into an adaptive card grid. */
export function ReceiptView() {
  const vm = useReceiptViewModel();
  const [, navigate] = useLocation();

  const onSubmit = async () => {
    const created = await vm.submit();
    if (created) {
      navigate("/warehouse");
    }
  };

  return (
    <ScreenScaffold title={strings.receipt.title} wide>
      {vm.loading ? (
        <LoadingView />
      ) : vm.materials.length === 0 ? (
        <CardView animate>
          <EmptyState
            icon={icons.material}
            title={strings.warehouse.needMaterial}
            message={strings.materials.emptyHint}
            action={
              <Link href="/materials/new">
                <PrimaryButton icon={icons.material}>Добавить материал</PrimaryButton>
              </Link>
            }
          />
        </CardView>
      ) : (
        <div className="space-y-3">
          {/* ── Sticky batch panel + add-form (always visible) ───────── */}
          <div className="sticky top-0 z-20 -mt-3 bg-background/95 pb-2 pt-3 backdrop-blur lg:top-12">
            <CardView className="p-3">
              {/* Batch — one compact row */}
              <div className="flex flex-wrap items-end gap-2">
                <div className="w-40 space-y-1">
                  <Label className="text-[11px]">Дата поступления</Label>
                  <Input
                    type="date"
                    className="rounded-2xl"
                    value={vm.arrivalDate}
                    disabled={vm.dateLocked}
                    title={vm.dateLocked ? "Дата зафиксирована для всей партии" : "Изменить можно один раз — применится ко всей партии"}
                    onChange={(e) => vm.changeArrivalDate(e.target.value)}
                  />
                </div>
                <div className="min-w-[12rem] flex-1 space-y-1">
                  <Label className="text-[11px]">Материал</Label>
                  <Select value={vm.materialId} onValueChange={vm.setMaterialId}>
                    <SelectTrigger className="rounded-2xl">
                      <SelectValue placeholder="Выберите материал" />
                    </SelectTrigger>
                    <SelectContent>
                      {vm.materials.map((material) => (
                        <SelectItem key={material.id} value={material.id}>
                          {material.code} · {material.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <PrimaryButton
                  icon={icons.boxes}
                  loading={vm.saving}
                  disabled={vm.items.length === 0}
                  onClick={() => void onSubmit()}
                >
                  Оприходовать ({vm.items.length})
                </PrimaryButton>
              </div>

              {/* Add-form — one compact row */}
              <div className="mt-2.5 border-t border-card-border pt-2.5">
                <AddJumboForm vm={vm} />
              </div>

              {vm.error ? <div className={cn(AppTypography.caption, "mt-2 text-destructive")}>{vm.error}</div> : null}
            </CardView>
          </div>

          {/* ── Scrollable grid of added Jumbos (3 / 2 / 1) ──────────── */}
          <div className="flex items-center justify-between px-0.5">
            <span className={cn(AppTypography.caption2, "text-muted-foreground")}>Добавленные Джамбо</span>
            <span className={cn(AppTypography.caption2, "text-muted-foreground")}>{vm.items.length}</span>
          </div>
          {vm.items.length === 0 ? (
            <div className={cn(AppTypography.footnote, "rounded-xl border border-dashed border-card-border py-10 text-center text-muted-foreground")}>
              Добавьте Джамбо через форму выше — карточки появятся здесь.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {vm.items.map((item, index) => (
                <JumboCard key={index} vm={vm} index={index} item={item} />
              ))}
            </div>
          )}
        </div>
      )}
    </ScreenScaffold>
  );
}
