/** Entity type a global-search hit points to. */
export enum SearchResultKind {
  jumbo = "jumbo",
  order = "order",
  material = "material",
  operator = "operator",
  document = "document",
  archive = "archive",
}

const kindTitles: Record<SearchResultKind, string> = {
  [SearchResultKind.jumbo]: "Джамб",
  [SearchResultKind.order]: "Заказ",
  [SearchResultKind.material]: "Материал",
  [SearchResultKind.operator]: "Оператор",
  [SearchResultKind.document]: "Документ",
  [SearchResultKind.archive]: "Архив",
};

export function searchResultKindTitle(kind: SearchResultKind): string {
  return kindTitles[kind];
}

/** A single global-search hit across all entity types. */
export interface SearchHit {
  kind: SearchResultKind;
  title: string;
  subtitle: string;
  /** Navigation target within the app, when the entity has a screen. */
  href?: string;
}

/** Grouped global-search results. */
export interface SearchResults {
  query: string;
  hits: SearchHit[];
  total: number;
}
