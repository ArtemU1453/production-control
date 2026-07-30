import { Link, useLocation } from "wouter";
import { Plus, Trash2 } from "lucide-react";
import {
  CardView,
  EmptyState,
  LoadingView,
  PrimaryButton,
  ScreenScaffold,
  SecondaryButton,
} from "@/components";
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
import { icons } from "@/resources/icons";
import { strings } from "@/resources/strings";
import { useReceiptViewModel } from "@/viewmodels";

/** Receipt of a raw-material batch: one material, one arrival date (editable
 *  once) and several Jumbo rows created together on submit. */
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
    <ScreenScaffold title={strings.receipt.title}>
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
        <div className="space-y-4">
          <CardView title="Партия" icon={icons.boxes} animate>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Материал</Label>
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

              <div className="space-y-2">
                <Label htmlFor="arrival-date">Дата поступления</Label>
                <Input
                  id="arrival-date"
                  type="date"
                  className="rounded-2xl"
                  value={vm.arrivalDate}
                  disabled={vm.dateLocked}
                  onChange={(event) => vm.changeArrivalDate(event.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {vm.dateLocked
                    ? "Дата зафиксирована и применена ко всей партии."
                    : "Подставлена автоматически. Изменить можно один раз — она применится ко всей партии."}
                </p>
              </div>
            </div>
          </CardView>

          <CardView title="Джамбы" icon={icons.jumbo} animate>
            <div className="space-y-3">
              {vm.items.map((item, index) => (
                <div key={index} className="space-y-3 rounded-2xl border bg-card/60 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">
                      Джамб {index + 1}
                    </span>
                    {vm.items.length > 1 ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-lg text-muted-foreground"
                        aria-label="Убрать строку"
                        onClick={() => vm.removeItem(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Номер складского учёта</Label>
                      <Input
                        className="rounded-2xl"
                        value={item.stockNumber}
                        onChange={(event) => vm.setItemField(index, "stockNumber", event.target.value)}
                        placeholder="J-0001"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Ширина, мм</Label>
                      <Input
                        type="number"
                        inputMode="numeric"
                        className="rounded-2xl"
                        value={item.widthMm || ""}
                        onChange={(event) => vm.setItemField(index, "widthMm", Number(event.target.value))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Намотка, м</Label>
                      <Input
                        type="number"
                        inputMode="numeric"
                        className="rounded-2xl"
                        value={item.initialWindingM || ""}
                        onChange={(event) =>
                          vm.setItemField(index, "initialWindingM", Number(event.target.value))
                        }
                      />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Комментарий</Label>
                      <Input
                        className="rounded-2xl"
                        value={item.comment}
                        onChange={(event) => vm.setItemField(index, "comment", event.target.value)}
                        placeholder="Необязательно"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <SecondaryButton icon={Plus} fullWidth onClick={vm.addItem}>
                Добавить Джамб
              </SecondaryButton>
            </div>
          </CardView>

          {vm.error ? <div className="text-sm text-destructive">{vm.error}</div> : null}

          <PrimaryButton fullWidth loading={vm.saving} onClick={() => void onSubmit()}>
            Оприходовать партию ({vm.items.length})
          </PrimaryButton>
        </div>
      )}
    </ScreenScaffold>
  );
}
