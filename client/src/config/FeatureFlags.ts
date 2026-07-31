/**
 * FeatureFlags — central switches for staged / future capabilities.
 *
 * Purpose: gate features that are architecturally prepared but not yet enabled,
 * so future work flips a flag instead of refactoring. Each flag mirrors a
 * documented extension point (see `docs/13-roadmap.md`,
 * `docs/17-scalability-and-infrastructure.md`). Today every forward-looking flag
 * is off, reflecting the shipped behaviour.
 *
 * Usage: `if (featureFlags.csvExport) …`. Limits: build-time constants — no
 * runtime toggling UI (that is a future feature itself). Depends on: nothing.
 */
export interface FeatureFlagSet {
  /** Cloud storage provider + sync. */
  cloudSync: boolean;
  /** Multi-user mode with per-user roles. */
  multiUser: boolean;
  /** CSV export provider. */
  csvExport: boolean;
  /** Excel export provider. */
  excelExport: boolean;
  /** Raw-material / reference import. */
  dataImport: boolean;
  /** English localisation. */
  englishLocale: boolean;
  /** Real e-mail transport (vs. the simulated one). */
  realEmailTransport: boolean;
  /** Scheduled automatic backups (vs. run-on-launch). */
  scheduledAutoBackup: boolean;
  /** External integrations (ERP / 1С / SAP / REST). */
  externalIntegrations: boolean;
}

export const featureFlags: Readonly<FeatureFlagSet> = {
  cloudSync: false,
  multiUser: false,
  csvExport: false,
  excelExport: false,
  dataImport: false,
  englishLocale: false,
  realEmailTransport: false,
  scheduledAutoBackup: false,
  externalIntegrations: false,
};

export type FeatureFlag = keyof FeatureFlagSet;
