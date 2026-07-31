/**
 * Integration architecture — **protocols only**.
 *
 * Defines the contract external systems (ERP / 1С / SAP / REST / CSV) implement
 * to exchange data with the app. No live connectors are shipped in v2.0; every
 * provider is a staged stub reporting `available: false`. A real connector plugs
 * in by implementing {@link IntegrationProvider} and registering it — the app's
 * business logic never changes.
 */

export enum IntegrationKind {
  erp = "erp",
  odin1c = "1c",
  sap = "sap",
  rest = "rest",
  csv = "csv",
}

const kindTitles: Record<IntegrationKind, string> = {
  [IntegrationKind.erp]: "ERP-система",
  [IntegrationKind.odin1c]: "1С",
  [IntegrationKind.sap]: "SAP",
  [IntegrationKind.rest]: "REST API",
  [IntegrationKind.csv]: "CSV Import/Export",
};

export function integrationKindTitle(kind: IntegrationKind): string {
  return kindTitles[kind];
}

export enum IntegrationDirection {
  import = "import",
  export = "export",
  bidirectional = "bidirectional",
}

export interface IntegrationResult {
  ok: boolean;
  detail: string;
}

/** Contract every external-system connector implements. */
export interface IntegrationProvider {
  readonly kind: IntegrationKind;
  readonly direction: IntegrationDirection;
  readonly available: boolean;
  /** Verifies connectivity/credentials. */
  test(): Promise<IntegrationResult>;
  /** Pulls data from the external system into the app. */
  pull(): Promise<IntegrationResult>;
  /** Pushes app data to the external system. */
  push(payload: string): Promise<IntegrationResult>;
}

export interface IntegrationInfo {
  kind: IntegrationKind;
  title: string;
  direction: IntegrationDirection;
  available: boolean;
  detail: string;
}

const STAGED = "Интеграция появится в будущих версиях (v3.0).";

function stagedProvider(
  kind: IntegrationKind,
  direction: IntegrationDirection,
): IntegrationProvider {
  const result: IntegrationResult = { ok: false, detail: STAGED };
  return {
    kind,
    direction,
    available: false,
    async test() {
      return result;
    },
    async pull() {
      return result;
    },
    async push() {
      return result;
    },
  };
}

/** The staged provider registry surfaced on the Integrations screen. */
export function createIntegrationProviders(): IntegrationProvider[] {
  return [
    stagedProvider(IntegrationKind.erp, IntegrationDirection.bidirectional),
    stagedProvider(IntegrationKind.odin1c, IntegrationDirection.bidirectional),
    stagedProvider(IntegrationKind.sap, IntegrationDirection.bidirectional),
    stagedProvider(IntegrationKind.rest, IntegrationDirection.bidirectional),
    stagedProvider(IntegrationKind.csv, IntegrationDirection.import),
  ];
}

export function describeIntegration(provider: IntegrationProvider): IntegrationInfo {
  return {
    kind: provider.kind,
    title: integrationKindTitle(provider.kind),
    direction: provider.direction,
    available: provider.available,
    detail: provider.available ? "Подключено" : STAGED,
  };
}
