import { Archive } from "lucide-react";
import {
  CardView,
  EmptyState,
  ListRow,
  LoadingView,
  ScreenScaffold,
  StatusBadge,
} from "@/components";
import { strings } from "@/resources/strings";
import { jumboStatusColorRole, jumboStatusTitle } from "@/models";
import { formatDate } from "@/extensions/date";
import { useArchiveViewModel } from "@/viewmodels";

/** Archive of written-off Jumbos. Fully wired; population is a later phase, so
 *  it currently renders the prepared empty state. */
export function ArchiveView() {
  const { loading, archived } = useArchiveViewModel();

  return (
    <ScreenScaffold title={strings.archive.title}>
      {loading ? (
        <LoadingView />
      ) : archived.length === 0 ? (
        <CardView animate>
          <EmptyState icon={Archive} title={strings.archive.empty} message={strings.archive.emptyHint} />
        </CardView>
      ) : (
        <div className="space-y-3">
          {archived.map((entry) => (
            <ListRow
              key={entry.id}
              icon={Archive}
              title={`№ ${entry.jumbo.stockNumber} · ${entry.jumbo.materialCode}`}
              subtitle={`Списан: ${formatDate(entry.archivedAt)} · Операций: ${entry.statistics.operationsCount}`}
              trailing={
                <StatusBadge
                  label={jumboStatusTitle(entry.jumbo.status)}
                  tone={jumboStatusColorRole(entry.jumbo.status)}
                />
              }
            />
          ))}
        </div>
      )}
    </ScreenScaffold>
  );
}
