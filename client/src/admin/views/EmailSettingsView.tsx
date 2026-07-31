import { CardView, LoadingView, SegmentedControl, type SegmentOption } from "@/components";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { icons } from "@/resources/icons";
import { strings } from "@/resources/strings";
import { DocumentSchedule, documentScheduleOrder, documentScheduleTitle } from "@/models";
import { useSettingsViewModel } from "@/viewmodels";
import { SettingsScaffold } from "./SettingsScaffold";

const scheduleOptions: ReadonlyArray<SegmentOption<DocumentSchedule>> = documentScheduleOrder.map(
  (schedule) => ({ value: schedule, label: documentScheduleTitle(schedule) }),
);

/** Report-delivery settings: recipients, template and automatic schedule. */
export function EmailSettingsView() {
  const { loading, settings, update } = useSettingsViewModel();

  return (
    <SettingsScaffold title={strings.admin.email} subtitle={strings.admin.emailHint}>
      {loading ? (
        <LoadingView />
      ) : (
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
      )}
    </SettingsScaffold>
  );
}
