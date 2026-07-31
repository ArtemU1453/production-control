import { useState } from "react";
import {
  CardView,
  EmptyState,
  LoadingView,
  SecondaryButton,
  SegmentedControl,
  type SegmentOption,
} from "@/components";
import { icons } from "@/resources/icons";
import { strings } from "@/resources/strings";
import { formatDateTime } from "@/extensions/date";
import { auditActionTitle } from "../models";
import { useLogsViewModel } from "../viewmodels";
import { SettingsScaffold } from "./SettingsScaffold";

type LogsTab = "errors" | "audit";

/** Logs screen: switches between the error log and the action-audit log, and
 *  clears each stream. */
export function LogsView() {
  const vm = useLogsViewModel();
  const [tab, setTab] = useState<LogsTab>("errors");

  const tabs: ReadonlyArray<SegmentOption<LogsTab>> = [
    { value: "errors", label: strings.admin.errorsTab, badge: vm.errors.length },
    { value: "audit", label: strings.admin.auditTab, badge: vm.audit.length },
  ];

  return (
    <SettingsScaffold title={strings.admin.logs} subtitle={strings.admin.logsHint}>
      <div className="space-y-4">
        <SegmentedControl options={tabs} value={tab} onChange={setTab} aria-label="Журналы" />

        {vm.loading ? (
          <LoadingView />
        ) : tab === "errors" ? (
          vm.errors.length === 0 ? (
            <EmptyState icon={icons.error} title={strings.admin.noErrors} />
          ) : (
            <div className="space-y-3">
              <SecondaryButton icon={icons.error} onClick={() => void vm.clearErrors()} fullWidth>
                {strings.admin.clear}
              </SecondaryButton>
              {vm.errors.map((entry) => (
                <CardView key={entry.id} animate>
                  <div className="space-y-1">
                    <div className="text-sm font-semibold text-destructive">{entry.description}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDateTime(entry.timestamp)} · v{entry.appVersion}
                      {entry.action ? ` · ${entry.action}` : ""}
                    </div>
                    {entry.stack ? (
                      <pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap rounded-xl bg-muted p-2 text-[11px] text-muted-foreground">
                        {entry.stack}
                      </pre>
                    ) : null}
                  </div>
                </CardView>
              ))}
            </div>
          )
        ) : vm.audit.length === 0 ? (
          <EmptyState icon={icons.logs} title={strings.admin.noAudit} />
        ) : (
          <div className="space-y-3">
            <SecondaryButton icon={icons.logs} onClick={() => void vm.clearAudit()} fullWidth>
              {strings.admin.clear}
            </SecondaryButton>
            {vm.audit.map((entry) => (
              <div
                key={entry.id}
                className="glass noise rounded-3xl border-card-border p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold">{auditActionTitle(entry.action)}</span>
                  <span className="text-xs text-muted-foreground">{formatDateTime(entry.timestamp)}</span>
                </div>
                {entry.details || entry.entity ? (
                  <div className="mt-0.5 truncate text-xs text-muted-foreground">
                    {[entry.entity, entry.entityId, entry.details].filter(Boolean).join(" · ")}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </SettingsScaffold>
  );
}
