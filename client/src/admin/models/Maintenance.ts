export type IntegritySeverity = "error" | "warning";

export interface IntegrityIssue {
  severity: IntegritySeverity;
  entity: string;
  entityId?: string;
  message: string;
}

/** Result of a data-integrity / relations check. */
export interface IntegrityReport {
  checked: number;
  issues: IntegrityIssue[];
  ok: boolean;
}

/** Outcome of a maintenance operation. */
export interface MaintenanceResult {
  title: string;
  detail: string;
  ok: boolean;
}
