/**
 * One recorded change to application settings. Captures who/what/when plus the
 * old and new values, so configuration drift is auditable over the app's life.
 */
export interface SettingsChangeEntry {
  id: string;
  timestamp: string;
  /** Operator who made the change (from settings, when available). */
  user?: string;
  /** Settings field that changed (AppSettings key). */
  field: string;
  /** Human-readable field label. */
  fieldTitle: string;
  oldValue: string;
  newValue: string;
}
