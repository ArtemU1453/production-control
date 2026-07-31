import { CardView, LoadingView } from "@/components";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { icons } from "@/resources/icons";
import { strings } from "@/resources/strings";
import { useSettingsViewModel } from "@/viewmodels";
import { SettingsScaffold } from "./SettingsScaffold";

function toNumber(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** Security settings: local PIN lock, biometrics, auto-lock and delete
 *  confirmation. The PIN is a local access gate, not cryptographic protection. */
export function SecuritySettingsView() {
  const { loading, settings, update } = useSettingsViewModel();

  return (
    <SettingsScaffold title={strings.admin.security} subtitle={strings.admin.securityHint}>
      {loading ? (
        <LoadingView />
      ) : (
        <div className="space-y-4">
          <CardView title="Доступ" icon={icons.security} animate>
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="settings-pin-enabled" className="text-sm">
                  PIN-код при входе
                </Label>
                <Switch
                  id="settings-pin-enabled"
                  checked={settings.pinEnabled}
                  onCheckedChange={(checked) => update("pinEnabled", checked)}
                />
              </div>
              {settings.pinEnabled ? (
                <div className="space-y-2">
                  <Label htmlFor="settings-pin">PIN-код</Label>
                  <Input
                    id="settings-pin"
                    type="password"
                    inputMode="numeric"
                    maxLength={8}
                    className="rounded-2xl"
                    value={settings.pin}
                    onChange={(event) => update("pin", event.target.value.replace(/\D/g, ""))}
                    placeholder="••••"
                  />
                  <p className="text-xs text-muted-foreground">
                    PIN — локальная блокировка, а не средство криптозащиты данных.
                  </p>
                </div>
              ) : null}
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="settings-biometrics" className="text-sm">
                  Биометрия (при поддержке устройства)
                </Label>
                <Switch
                  id="settings-biometrics"
                  checked={settings.biometricsEnabled}
                  onCheckedChange={(checked) => update("biometricsEnabled", checked)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="settings-autolock">Автоблокировка (мин, 0 — выкл.)</Label>
                <Input
                  id="settings-autolock"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  className="rounded-2xl"
                  value={settings.autoLockMinutes}
                  onChange={(event) =>
                    update("autoLockMinutes", toNumber(event.target.value, settings.autoLockMinutes))
                  }
                />
              </div>
            </div>
          </CardView>

          <CardView title="Подтверждения" icon={icons.error} headerTone="accent" animate>
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="settings-confirm-delete" className="text-sm">
                Подтверждать удаление
              </Label>
              <Switch
                id="settings-confirm-delete"
                checked={settings.confirmDelete}
                onCheckedChange={(checked) => update("confirmDelete", checked)}
              />
            </div>
          </CardView>
        </div>
      )}
    </SettingsScaffold>
  );
}
