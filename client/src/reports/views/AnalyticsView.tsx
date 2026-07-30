import {
  EmptyState,
  ListRow,
  ScreenScaffold,
  SearchBar,
} from "@/components";
import { icons } from "@/resources/icons";
import { strings } from "@/resources/strings";
import { useAnalyticsViewModel } from "../viewmodels/useAnalyticsViewModel";

/** Analytics hub: the list of available reports with search. */
export function AnalyticsView() {
  const { query, setQuery, definitions } = useAnalyticsViewModel();

  return (
    <ScreenScaffold title={strings.analytics.title} subtitle={strings.analytics.subtitle}>
      <div className="space-y-4">
        <SearchBar value={query} onChange={setQuery} placeholder="Поиск отчёта" />
        {definitions.length === 0 ? (
          <EmptyState icon={icons.analytics} title={strings.analytics.empty} />
        ) : (
          <div className="space-y-3">
            {definitions.map((definition) => (
              <ListRow
                key={definition.kind}
                href={`/reports/${definition.kind}`}
                icon={icons[definition.icon]}
                title={definition.title}
                subtitle={definition.description}
              />
            ))}
          </div>
        )}
      </div>
    </ScreenScaffold>
  );
}
