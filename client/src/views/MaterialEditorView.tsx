import { useLocation } from "wouter";
import { Trash2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { CardView, LoadingView, PrimaryButton, ScreenScaffold } from "@/components";
import { useToast } from "@/hooks/use-toast";
import { icons } from "@/resources/icons";
import { MaterialStatus, MATERIAL_CODE_LENGTH } from "@/models";
import { useMaterialEditorViewModel } from "@/viewmodels";

/** Create/edit form for a material. Handles validation, unique-code checks and
 *  deletion of an existing record. */
export function MaterialEditorView({ materialId }: { materialId?: string }) {
  const vm = useMaterialEditorViewModel(materialId);
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const onSave = async () => {
    if (await vm.save()) {
      navigate("/materials");
    }
  };

  const onDelete = async () => {
    const result = await vm.remove();
    if (result.ok) {
      navigate("/materials");
    } else if (result.message) {
      toast({ title: "Удаление невозможно", description: result.message, variant: "destructive" });
    }
  };

  return (
    <ScreenScaffold
      title={vm.isNew ? "Новый материал" : "Редактирование"}
      toolbar={
        !vm.isNew ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="secondary" size="icon" className="rounded-xl" aria-label="Удалить материал">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Удалить материал?</AlertDialogTitle>
                <AlertDialogDescription>Действие необратимо.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Отмена</AlertDialogCancel>
                <AlertDialogAction onClick={() => void onDelete()}>Удалить</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : undefined
      }
    >
      {vm.loading ? (
        <LoadingView />
      ) : (
        <CardView title="Параметры материала" icon={icons.material} animate>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="material-code">Код ({MATERIAL_CODE_LENGTH} символов)</Label>
                <Input
                  id="material-code"
                  className="rounded-2xl font-mono"
                  value={vm.draft.code}
                  maxLength={MATERIAL_CODE_LENGTH}
                  onChange={(event) => vm.setField("code", event.target.value)}
                  placeholder="AB123456"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="material-name">Название</Label>
                <Input
                  id="material-name"
                  className="rounded-2xl"
                  value={vm.draft.name}
                  onChange={(event) => vm.setField("name", event.target.value)}
                  placeholder="БОПП 20"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="material-manufacturer">Производитель</Label>
              <Input
                id="material-manufacturer"
                className="rounded-2xl"
                value={vm.draft.manufacturer}
                onChange={(event) => vm.setField("manufacturer", event.target.value)}
                placeholder="Завод"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="material-thickness">Толщина, мкм</Label>
                <Input
                  id="material-thickness"
                  type="number"
                  inputMode="numeric"
                  className="rounded-2xl"
                  value={vm.draft.thicknessMicron || ""}
                  onChange={(event) => vm.setField("thicknessMicron", Number(event.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="material-width">Стандартная ширина, мм</Label>
                <Input
                  id="material-width"
                  type="number"
                  inputMode="numeric"
                  className="rounded-2xl"
                  value={vm.draft.standardWidthMm || ""}
                  onChange={(event) => vm.setField("standardWidthMm", Number(event.target.value))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="material-description">Описание</Label>
              <Textarea
                id="material-description"
                className="rounded-2xl"
                value={vm.draft.description}
                onChange={(event) => vm.setField("description", event.target.value)}
                placeholder="Дополнительно"
              />
            </div>

            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="material-active" className="text-sm">
                Активен
              </Label>
              <Switch
                id="material-active"
                checked={vm.draft.status === MaterialStatus.active}
                onCheckedChange={(checked) =>
                  vm.setField("status", checked ? MaterialStatus.active : MaterialStatus.inactive)
                }
              />
            </div>

            {vm.error ? <div className="text-sm text-destructive">{vm.error}</div> : null}

            <PrimaryButton fullWidth loading={vm.saving} onClick={() => void onSave()}>
              Сохранить
            </PrimaryButton>
          </div>
        </CardView>
      )}
    </ScreenScaffold>
  );
}
