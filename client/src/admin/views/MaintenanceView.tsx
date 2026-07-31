import { CardView, PrimaryButton, SecondaryButton, StatusBadge } from "@/components";
import { icons } from "@/resources/icons";
import { strings } from "@/resources/strings";
import type { IntegritySeverity } from "../models";
import { useMaintenanceViewModel } from "../viewmodels";
import { SettingsScaffold } from "./SettingsScaffold";

function severityTone(severity: IntegritySeverity): "warning" | "danger" {
  return severity === "error" ? "danger" : "warning";
}

/** Database maintenance screen: integrity and relation checks (read-only) plus
 *  optimize, rebuild-indexes and clear-cache actions. */
export function MaintenanceView() {
  const vm = useMaintenanceViewModel();

  return (
    <SettingsScaffold title={strings.admin.maintenance} subtitle={strings.admin.maintenanceHint}>
      <div className="space-y-4">
        <CardView title="Проверки" icon={icons.maintenance} animate>
          <div className="grid grid-cols-2 gap-3">
            <PrimaryButton
              icon={icons.diagnostics}
              loading={vm.busy === "integrity"}
              disabled={vm.busy !== null}
              onClick={() => void vm.checkIntegrity()}
              fullWidth
            >
              {strings.admin.checkIntegrity}
            </PrimaryButton>
            <SecondaryButton
              icon={icons.database}
              disabled={vm.busy !== null}
              onClick={() => void vm.checkRelations()}
              fullWidth
            >
              {strings.admin.checkRelations}
            </SecondaryButton>
          </div>
        </CardView>

        {vm.report ? (
          <CardView
            title="Результат проверки"
            icon={icons.diagnostics}
            headerTone="accent"
            headerTrailing={
              <StatusBadge
                label={vm.report.ok ? strings.admin.integrityOk : `Замечаний: ${vm.report.issues.length}`}
                tone={vm.report.ok ? "neutral" : "warning"}
              />
            }
            animate
          >
            {vm.report.issues.length === 0 ? (
              <div className="py-2 text-sm text-muted-foreground">
                Проверено записей: {vm.report.checked}. {strings.admin.integrityOk}.
              </div>
            ) : (
              <div className="space-y-2">
                {vm.report.issues.map((issue, index) => (
                  <div
                    key={`${issue.entity}-${issue.entityId ?? index}-${index}`}
                    className="flex items-center justify-between gap-3 border-b border-border/50 pb-2 text-sm last:border-none last:pb-0"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium">
                        {issue.entity}
                        {issue.entityId ? ` · ${issue.entityId}` : ""}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">{issue.message}</div>
                    </div>
                    <StatusBadge
                      label={issue.severity === "error" ? "Ошибка" : "Предупр."}
                      tone={severityTone(issue.severity)}
                    />
                  </div>
                ))}
              </div>
            )}
          </CardView>
        ) : null}

        <CardView title="Обслуживание" icon={icons.tune} animate>
          <div className="space-y-3">
            <SecondaryButton
              icon={icons.gauge}
              disabled={vm.busy !== null}
              onClick={() => void vm.optimize()}
              fullWidth
            >
              {strings.admin.optimize}
            </SecondaryButton>
            <SecondaryButton
              icon={icons.database}
              disabled={vm.busy !== null}
              onClick={() => void vm.rebuildIndexes()}
              fullWidth
            >
              {strings.admin.rebuild}
            </SecondaryButton>
            <SecondaryButton
              icon={icons.quick}
              disabled={vm.busy !== null}
              onClick={() => void vm.clearCache()}
              fullWidth
            >
              {strings.admin.clearCache}
            </SecondaryButton>
          </div>
        </CardView>
      </div>
    </SettingsScaffold>
  );
}
