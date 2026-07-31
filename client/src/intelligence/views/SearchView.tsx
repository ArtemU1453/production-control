import { EmptyState, ListRow, ScreenScaffold, SearchBar } from "@/components";
import { icons, type LucideIcon } from "@/resources/icons";
import { strings } from "@/resources/strings";
import { SearchResultKind, searchResultKindTitle, type SearchHit } from "../models";
import { useSearchViewModel } from "../viewmodels";

function iconFor(kind: SearchResultKind): LucideIcon {
  switch (kind) {
    case SearchResultKind.jumbo:
      return icons.jumbo;
    case SearchResultKind.order:
      return icons.history;
    case SearchResultKind.material:
      return icons.material;
    case SearchResultKind.operator:
      return icons.users;
    case SearchResultKind.document:
      return icons.reports;
    case SearchResultKind.archive:
      return icons.archive;
  }
}

/** Global search across Jumbos, orders, materials, operators, documents and the
 *  archive. Results are grouped by entity type. */
export function SearchView() {
  const vm = useSearchViewModel();

  const groups = new Map<SearchResultKind, SearchHit[]>();
  for (const hit of vm.results?.hits ?? []) {
    const list = groups.get(hit.kind) ?? [];
    list.push(hit);
    groups.set(hit.kind, list);
  }

  return (
    <ScreenScaffold title={strings.intelligence.searchTitle} subtitle={strings.intelligence.searchSubtitle}>
      <div className="space-y-4">
        <SearchBar value={vm.query} onChange={vm.setQuery} placeholder={strings.intelligence.searchPlaceholder} />

        {vm.query.trim().length === 0 ? (
          <EmptyState icon={icons.search} title={strings.intelligence.searchEmpty} />
        ) : vm.results && vm.results.total === 0 && !vm.searching ? (
          <EmptyState icon={icons.search} title={strings.intelligence.searchNoResults} message={`«${vm.query}»`} />
        ) : (
          Array.from(groups.entries()).map(([kind, hits]) => (
            <div key={kind} className="space-y-2">
              <div className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {searchResultKindTitle(kind)} · {hits.length}
              </div>
              {hits.map((hit, index) => (
                <ListRow
                  key={`${kind}-${index}`}
                  icon={iconFor(kind)}
                  title={hit.title}
                  subtitle={hit.subtitle}
                  href={hit.href}
                />
              ))}
            </div>
          ))
        )}
      </div>
    </ScreenScaffold>
  );
}
