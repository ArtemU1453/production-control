/**
 * AppMetrics — component sizing tokens (all on the 8-point grid, except the
 * Apple-mandated 44px minimum hit target). Centralising these removes magic
 * numbers from component code and guarantees consistent touch areas, bar
 * heights and chart dimensions across the app.
 */
export const AppMetrics = {
  /** Minimum interactive target (Apple HIG). */
  hitArea: 44,
  /** Icon chip square. */
  iconChip: 44,
  /** Leading status bar width on Jumbo cards. */
  statusBarWidth: 4,
  /** Progress bar track height. */
  progressHeight: 8,
  /** Ring (radial) progress diameter and stroke. */
  ring: {
    size: 120,
    stroke: 12,
  },
  /** Mini sparkline height. */
  miniChartHeight: 40,
  /** Full chart height. */
  chartHeight: 240,
  /** Bottom sheet grabber. */
  sheetGrabber: {
    width: 40,
    height: 4,
  },
  /** Max content column width (phone-first reading measure). */
  contentMaxWidth: 560,
} as const;
