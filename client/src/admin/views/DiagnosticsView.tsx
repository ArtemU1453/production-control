import { CardView, InfoRow, LoadingView } from "@/components";
import { icons } from "@/resources/icons";
import { strings } from "@/resources/strings";
import { useDiagnosticsViewModel } from "../viewmodels";
import { SettingsScaffold } from "./SettingsScaffold";

/** Diagnostics screen: version info, record counts and database size. */
export function DiagnosticsView() {
  const vm = useDiagnosticsViewModel();

  return (
    <SettingsScaffold title={strings.admin.diagnostics} subtitle={strings.admin.diagnosticsHint}>
      {vm.loading || !vm.info ? (
        <LoadingView />
      ) : (
        <div className="space-y-4">
          <CardView title="Состояние" icon={icons.diagnostics} animate>
            <div className="space-y-2">
              <InfoRow label="Версия приложения" value={vm.info.appVersion} />
              <InfoRow label="Версия базы данных" value={vm.info.dbVersion} />
              <InfoRow label="Всего записей" value={vm.info.totalRecords} />
              <InfoRow label="Размер базы" value={vm.sizeLabel} last />
            </div>
          </CardView>

          <CardView title="Записи" icon={icons.database} headerTone="accent" animate>
            <div className="space-y-2">
              <InfoRow label="Материалы" value={vm.info.counts.materials} />
              <InfoRow label="Джамбы" value={vm.info.counts.jumbos} />
              <InfoRow label="Сессии нарезки" value={vm.info.counts.sessions} />
              <InfoRow label="Операции" value={vm.info.counts.operations} />
              <InfoRow label="Потери" value={vm.info.counts.wastes} />
              <InfoRow label="Архив" value={vm.info.counts.archived} />
              <InfoRow label="Документы" value={vm.info.counts.documents} />
              <InfoRow label="Пользователи" value={vm.info.counts.users} />
              <InfoRow label="Ошибки" value={vm.info.counts.errors} />
              <InfoRow label="Аудит" value={vm.info.counts.audit} last />
            </div>
          </CardView>
        </div>
      )}
    </SettingsScaffold>
  );
}
