import { CardView, LoadingView } from "@/components";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { icons } from "@/resources/icons";
import { strings } from "@/resources/strings";
import { useSettingsViewModel } from "@/viewmodels";
import { SettingsScaffold } from "./SettingsScaffold";

/** General settings: enterprise profile and appearance. */
export function GeneralSettingsView() {
  const { loading, settings, isDark, update, setDark } = useSettingsViewModel();

  return (
    <SettingsScaffold title={strings.admin.general} subtitle={strings.admin.generalHint}>
      {loading ? (
        <LoadingView />
      ) : (
        <div className="space-y-4">
          <CardView title="Профиль" icon={icons.settings} animate>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="settings-company">{strings.settings.company}</Label>
                <Input
                  id="settings-company"
                  className="rounded-2xl"
                  value={settings.companyName}
                  onChange={(event) => update("companyName", event.target.value)}
                  placeholder="ООО «Предприятие»"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="settings-operator">{strings.settings.operator}</Label>
                <Input
                  id="settings-operator"
                  className="rounded-2xl"
                  value={settings.operator}
                  onChange={(event) => update("operator", event.target.value)}
                  placeholder="Имя оператора"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="settings-email">{strings.settings.email}</Label>
                <Input
                  id="settings-email"
                  type="email"
                  inputMode="email"
                  className="rounded-2xl"
                  value={settings.email}
                  onChange={(event) => update("email", event.target.value)}
                  placeholder="name@company.com"
                />
              </div>
            </div>
          </CardView>

          <CardView title="Оформление" icon={icons.quick} animate>
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="settings-dark" className="text-sm">
                {strings.settings.darkTheme}
              </Label>
              <Switch id="settings-dark" checked={isDark} onCheckedChange={setDark} />
            </div>
          </CardView>
        </div>
      )}
    </SettingsScaffold>
  );
}
