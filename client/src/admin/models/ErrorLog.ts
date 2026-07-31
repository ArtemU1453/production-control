/** A recorded application error. */
export interface ErrorLogEntry {
  id: string;
  timestamp: string;
  description: string;
  stack?: string;
  /** User action in progress when the error occurred. */
  action?: string;
  appVersion: string;
}
