export interface RecordCounts {
  materials: number;
  jumbos: number;
  sessions: number;
  operations: number;
  wastes: number;
  archived: number;
  documents: number;
  users: number;
  errors: number;
  audit: number;
}

/** Snapshot of the app's technical state for the diagnostics screen. */
export interface DiagnosticsInfo {
  appVersion: string;
  dbVersion: number;
  counts: RecordCounts;
  totalRecords: number;
  dbSizeBytes: number;
  archivesCount: number;
  reportsCount: number;
  errorsCount: number;
}
