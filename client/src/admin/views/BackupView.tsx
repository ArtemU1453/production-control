import { useRef } from "react";
import {
  CardView,
  InfoRow,
  LoadingView,
  PrimaryButton,
  SecondaryButton,
  StatusBadge,
} from "@/components";
import { icons } from "@/resources/icons";
import { strings } from "@/resources/strings";
import { useBackupViewModel } from "../viewmodels";
import { SettingsScaffold } from "./SettingsScaffold";

/** Backup / restore screen: create a snapshot, download it as JSON, import a
 *  snapshot back, and review the configured storage/export/import providers. */
export function BackupView() {
  const vm = useBackupViewModel();
  const fileInput = useRef<HTMLInputElement>(null);

  function onPickFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      void vm.importJson(text);
    };
    reader.readAsText(file);
  }

  return (
    <SettingsScaffold title={strings.admin.backup} subtitle={strings.admin.backupHint}>
      {vm.loading ? (
        <LoadingView />
      ) : (
        <div className="space-y-4">
          <CardView title="Резервная копия" icon={icons.database} animate>
            <div className="space-y-3">
              <InfoRow label="Последняя копия" value={vm.lastBackupLabel} />
              <InfoRow label="Последнее восстановление" value={vm.lastRestoreLabel} last />
              <div className="grid grid-cols-2 gap-3 pt-2">
                <PrimaryButton
                  icon={icons.database}
                  loading={vm.busy}
                  onClick={() => void vm.createBackup()}
                  fullWidth
                >
                  {strings.admin.createBackup}
                </PrimaryButton>
                <SecondaryButton
                  icon={icons.download}
                  disabled={vm.busy}
                  onClick={() => void vm.downloadJson()}
                  fullWidth
                >
                  {strings.admin.downloadBackup}
                </SecondaryButton>
              </div>
              <SecondaryButton
                icon={icons.upload}
                disabled={vm.busy}
                onClick={() => fileInput.current?.click()}
                fullWidth
              >
                {strings.admin.importBackup}
              </SecondaryButton>
              <input
                ref={fileInput}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={onPickFile}
              />
              <p className="text-xs text-muted-foreground">
                Восстановление заменяет текущие данные содержимым копии. После восстановления
                перезагрузите приложение.
              </p>
            </div>
          </CardView>

          <CardView title={strings.admin.storageProviders} icon={icons.cloud} headerTone="accent" animate>
            <div className="space-y-2">
              {vm.storageProviders.map((provider, index) => (
                <InfoRow
                  key={provider.id}
                  label={provider.title}
                  value={
                    <StatusBadge
                      label={provider.available ? "Активно" : "Скоро"}
                      tone={provider.available ? "neutral" : "muted"}
                    />
                  }
                  last={index === vm.storageProviders.length - 1}
                />
              ))}
            </div>
          </CardView>

          <CardView title={strings.admin.exportFormats} icon={icons.download} animate>
            <div className="space-y-2">
              {vm.exportProviders.map((provider, index) => (
                <InfoRow
                  key={provider.format}
                  label={provider.format.toUpperCase()}
                  value={
                    <StatusBadge
                      label={provider.format === "json" ? "Доступно" : "Скоро"}
                      tone={provider.format === "json" ? "neutral" : "muted"}
                    />
                  }
                  last={index === vm.exportProviders.length - 1}
                />
              ))}
            </div>
          </CardView>

          <CardView title={strings.admin.importSources} icon={icons.upload} animate>
            <div className="space-y-2">
              {vm.importProviders.map((provider, index) => (
                <InfoRow
                  key={provider.kind}
                  label={provider.kind}
                  value={<StatusBadge label="Скоро" tone="muted" />}
                  last={index === vm.importProviders.length - 1}
                />
              ))}
            </div>
          </CardView>
        </div>
      )}
    </SettingsScaffold>
  );
}
