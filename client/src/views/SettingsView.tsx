import { CardView, InfoRow, LoadingView, ScreenScaffold } from "@/components";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { icons } from "@/resources/icons";
import { strings } from "@/resources/strings";
import { useSettingsViewModel } from "@/viewmodels";

/** Settings screen. Values persist through the settings repository (the
 *  app-storage layer); appearance flows through the ThemeManager. */
export function SettingsView() {
  const { loading, settings, isDark, appVersion, update, setDark } = useSettingsViewModel();

  return (
    <ScreenScaffold title={strings.settings.title}>
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

          <CardView title="Отчёты и оформление" icon={icons.reports} headerTone="accent" animate>
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="settings-autosend" className="text-sm">
                  {strings.settings.autoSend}
                </Label>
                <Switch
                  id="settings-autosend"
                  checked={settings.autoSendReports}
                  onCheckedChange={(checked) => update("autoSendReports", checked)}
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="settings-dark" className="text-sm">
                  {strings.settings.darkTheme}
                </Label>
                <Switch id="settings-dark" checked={isDark} onCheckedChange={setDark} />
              </div>
            </div>
          </CardView>

          <CardView title="О приложении" icon={icons.dashboard} animate>
            <InfoRow label={strings.settings.version} value={appVersion} last />
          </CardView>
        </div>
      )}
    </ScreenScaffold>
  );
}
