import { CardView, EmptyState, LoadingView } from "@/components";
import { SettingsScaffold } from "@/admin/views/SettingsScaffold";
import { icons } from "@/resources/icons";
import { strings } from "@/resources/strings";
import { formatDateTime } from "@/extensions/date";
import { useSettingsHistoryViewModel } from "../viewmodels";

/** Settings-change history: who changed what, when, old → new. */
export function SettingsHistoryView() {
  const vm = useSettingsHistoryViewModel();

  return (
    <SettingsScaffold
      title={strings.intelligence.settingsHistoryTitle}
      subtitle={strings.intelligence.settingsHistorySubtitle}
    >
      {vm.loading ? (
        <LoadingView />
      ) : vm.entries.length === 0 ? (
        <EmptyState icon={icons.history} title={strings.intelligence.noSettingsHistory} />
      ) : (
        <div className="space-y-3">
          {vm.entries.map((entry) => (
            <CardView key={entry.id} animate>
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold">{entry.fieldTitle}</span>
                  <span className="text-xs text-muted-foreground">{formatDateTime(entry.timestamp)}</span>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground line-through">{entry.oldValue}</span>
                  <span className="mx-2 text-muted-foreground">→</span>
                  <span className="font-medium">{entry.newValue}</span>
                </div>
                {entry.user ? (
                  <div className="text-xs text-muted-foreground">Оператор: {entry.user}</div>
                ) : null}
              </div>
            </CardView>
          ))}
        </div>
      )}
    </SettingsScaffold>
  );
}
