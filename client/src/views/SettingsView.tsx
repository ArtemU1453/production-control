import {
  CardView,
  InfoRow,
  LoadingView,
  ScreenScaffold,
  SegmentedControl,
  type SegmentOption,
} from "@/components";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { icons } from "@/resources/icons";
import { strings } from "@/resources/strings";
import { DocumentSchedule, documentScheduleOrder, documentScheduleTitle } from "@/models";
import { useSettingsViewModel } from "@/viewmodels";

const scheduleOptions: ReadonlyArray<SegmentOption<DocumentSchedule>> = documentScheduleOrder.map(
  (schedule) => ({ value: schedule, label: documentScheduleTitle(schedule) }),
);

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

          <CardView title="Рассылка отчётов" icon={icons.reports} headerTone="accent" animate>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="settings-recipients">Получатели</Label>
                <Textarea
                  id="settings-recipients"
                  className="rounded-2xl"
                  value={settings.reportRecipients}
                  onChange={(event) => update("reportRecipients", event.target.value)}
                  placeholder="name@company.com, chief@company.com"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="settings-cc">Копия (CC)</Label>
                  <Input
                    id="settings-cc"
                    className="rounded-2xl"
                    value={settings.reportCc}
                    onChange={(event) => update("reportCc", event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settings-bcc">Скрытая (BCC)</Label>
                  <Input
                    id="settings-bcc"
                    className="rounded-2xl"
                    value={settings.reportBcc}
                    onChange={(event) => update("reportBcc", event.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="settings-subject">Тема письма</Label>
                <Input
                  id="settings-subject"
                  className="rounded-2xl"
                  value={settings.reportSubject}
                  onChange={(event) => update("reportSubject", event.target.value)}
                  placeholder="Производственный отчёт за {month}"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="settings-body">Текст письма</Label>
                <Textarea
                  id="settings-body"
                  className="rounded-2xl"
                  value={settings.reportBody}
                  onChange={(event) => update("reportBody", event.target.value)}
                />
              </div>
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
              <div className="space-y-2">
                <Label className="text-sm">Расписание</Label>
                <SegmentedControl
                  options={scheduleOptions}
                  value={settings.reportSchedule}
                  onChange={(value) => update("reportSchedule", value)}
                  aria-label="Расписание автоматической отправки"
                />
              </div>
            </div>
          </CardView>

          <CardView title="Оформление" icon={icons.settings} animate>
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="settings-dark" className="text-sm">
                {strings.settings.darkTheme}
              </Label>
              <Switch id="settings-dark" checked={isDark} onCheckedChange={setDark} />
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
