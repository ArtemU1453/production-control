import { CardView, LoadingView } from "@/components";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { icons } from "@/resources/icons";
import { strings } from "@/resources/strings";
import { useSettingsViewModel } from "@/viewmodels";
import { SettingsScaffold } from "./SettingsScaffold";

function toNumber(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** Production settings: write-off threshold, machines and display formats. */
export function ProductionSettingsView() {
  const { loading, settings, update } = useSettingsViewModel();

  return (
    <SettingsScaffold title={strings.admin.production} subtitle={strings.admin.productionHint}>
      {loading ? (
        <LoadingView />
      ) : (
        <div className="space-y-4">
          <CardView title="Производство" icon={icons.cut} animate>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="settings-threshold">Порог списания Джамба (м)</Label>
                <Input
                  id="settings-threshold"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  className="rounded-2xl"
                  value={settings.jumboThresholdM}
                  onChange={(event) =>
                    update("jumboThresholdM", toNumber(event.target.value, settings.jumboThresholdM))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Когда остаток становится меньше порога, Джамб помечается «Подлежит списанию».
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="settings-machine-count">Количество станков</Label>
                <Input
                  id="settings-machine-count"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  className="rounded-2xl"
                  value={settings.machineCount}
                  onChange={(event) =>
                    update("machineCount", toNumber(event.target.value, settings.machineCount))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="settings-machine-names">Названия станков</Label>
                <Input
                  id="settings-machine-names"
                  className="rounded-2xl"
                  value={settings.machineNames}
                  onChange={(event) => update("machineNames", event.target.value)}
                  placeholder="Станок №1, Станок №2"
                />
              </div>
            </div>
          </CardView>

          <CardView title="Форматы" icon={icons.clock} headerTone="accent" animate>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="settings-date-format">Формат даты</Label>
                <Input
                  id="settings-date-format"
                  className="rounded-2xl"
                  value={settings.dateFormat}
                  onChange={(event) => update("dateFormat", event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="settings-time-format">Формат времени</Label>
                <Input
                  id="settings-time-format"
                  className="rounded-2xl"
                  value={settings.timeFormat}
                  onChange={(event) => update("timeFormat", event.target.value)}
                />
              </div>
            </div>
          </CardView>
        </div>
      )}
    </SettingsScaffold>
  );
}
