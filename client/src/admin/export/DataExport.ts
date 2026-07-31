import type { BackupData } from "../models";

export enum DataExportFormat {
  json = "json",
  csv = "csv",
  excel = "excel",
}

export interface DataExportResult {
  format: DataExportFormat;
  available: boolean;
  content?: string;
  mimeType?: string;
  reason?: string;
}

/**
 * Data export provider. JSON is produced from the backup snapshot; CSV and
 * Excel are architecture stubs (generation lands in a later phase). New formats
 * plug in without touching callers.
 */
export interface DataExportProvider {
  readonly format: DataExportFormat;
  export(backup: BackupData): Promise<DataExportResult>;
}

export function createJsonExportProvider(): DataExportProvider {
  return {
    format: DataExportFormat.json,
    async export(backup) {
      return {
        format: DataExportFormat.json,
        available: true,
        content: JSON.stringify(backup, null, 2),
        mimeType: "application/json",
      };
    },
  };
}

function pendingExport(format: DataExportFormat): DataExportProvider {
  return {
    format,
    async export() {
      return { format, available: false, reason: "Экспорт в этот формат появится в будущих версиях." };
    },
  };
}

export function createCsvExportProvider(): DataExportProvider {
  return pendingExport(DataExportFormat.csv);
}

export function createExcelExportProvider(): DataExportProvider {
  return pendingExport(DataExportFormat.excel);
}

export enum DataImportKind {
  rawMaterial = "rawMaterial",
  reference = "reference",
  settings = "settings",
}

export interface DataImportResult {
  kind: DataImportKind;
  available: boolean;
  reason?: string;
}

/**
 * Data import provider — architecture stubs for importing raw material,
 * reference books and settings. Implementations arrive in a later phase.
 */
export interface DataImportProvider {
  readonly kind: DataImportKind;
  import(payload: string): Promise<DataImportResult>;
}

function pendingImport(kind: DataImportKind): DataImportProvider {
  return {
    kind,
    async import() {
      return { kind, available: false, reason: "Импорт появится в будущих версиях." };
    },
  };
}

export function createImportProviders(): DataImportProvider[] {
  return [
    pendingImport(DataImportKind.rawMaterial),
    pendingImport(DataImportKind.reference),
    pendingImport(DataImportKind.settings),
  ];
}
