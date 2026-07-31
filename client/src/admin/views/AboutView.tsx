import { CardView, InfoRow, StatusBadge } from "@/components";
import { icons } from "@/resources/icons";
import { strings } from "@/resources/strings";
import { appInfo } from "@/resources/appInfo";
import { userRoleTitle } from "../models";
import { useUsersViewModel } from "../viewmodels";
import { SettingsScaffold } from "./SettingsScaffold";

const futureFeatures: string[] = [
  "Облачная синхронизация и многопользовательский режим",
  "Экспорт данных в CSV и Excel",
  "Импорт сырья и справочников из внешних файлов",
  "Биометрическая аутентификация",
  "Автоматическое резервное копирование по расписанию",
];

/** About screen: version, current user roster and the product roadmap. */
export function AboutView() {
  const vm = useUsersViewModel();

  return (
    <SettingsScaffold title={strings.admin.about} subtitle={strings.admin.aboutHint}>
      <div className="space-y-4">
        <CardView title="О приложении" icon={icons.about} animate>
          <div className="space-y-2">
            <InfoRow label={strings.appName} value={strings.settings.version} />
            <InfoRow label="Версия" value={appInfo.version} last />
          </div>
        </CardView>

        <CardView title="Пользователи" icon={icons.users} headerTone="accent" animate>
          {vm.loading ? (
            <div className="py-2 text-sm text-muted-foreground">Загрузка…</div>
          ) : vm.users.length === 0 ? (
            <div className="py-2 text-sm text-muted-foreground">Пользователи не заданы</div>
          ) : (
            <div className="space-y-2">
              {vm.users.map((user, index) => (
                <InfoRow
                  key={user.id}
                  label={`${user.name}${vm.current?.id === user.id ? " · текущий" : ""}`}
                  value={<StatusBadge label={userRoleTitle(user.role)} tone="neutral" />}
                  last={index === vm.users.length - 1}
                />
              ))}
            </div>
          )}
        </CardView>

        <CardView title="Планы развития" icon={icons.quick} animate>
          <ul className="space-y-2">
            {futureFeatures.map((feature) => (
              <li key={feature} className="flex gap-2 text-sm text-muted-foreground">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </CardView>
      </div>
    </SettingsScaffold>
  );
}
