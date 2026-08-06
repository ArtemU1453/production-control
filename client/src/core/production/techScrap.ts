/**
 * Automatic technological-scrap estimation.
 *
 * Technological scrap (тех. отход) is the material lost to non-productive
 * operations — it is computed by the system, never entered by the operator.
 * The estimate accounts for the events the spec lists: equipment start-up and
 * threading, per-order setup, each Jumbo replacement (re-threading), and the
 * transition/trim when the order is finished. The algorithm is intentionally
 * isolated here (a pure function) so it can be tuned or reused without touching
 * the production ViewModel or the cutting engine.
 */

/** Threading/waste consumed when the line is started for the order, in metres. */
export const STARTUP_SCRAP_M = 25;
/** Waste consumed while setting the line up for the order, in metres. */
export const SETUP_SCRAP_M = 15;
/** Threading waste consumed each time the current Jumbo is replaced, in metres. */
export const JUMBO_CHANGE_SCRAP_M = 20;
/** Trim/transition waste when the order is completed, in metres. */
export const FINISH_TRIM_SCRAP_M = 10;

export interface TechScrapInput {
  /** Production has been started (line start-up + setup applied). */
  started: boolean;
  /** Number of Jumbo replacements performed in the order chain so far. */
  jumboChanges: number;
  /** Production has been completed (final trim/transition applied). */
  finished: boolean;
}

export interface TechScrapBreakdown {
  startupM: number;
  setupM: number;
  changesM: number;
  finishM: number;
  totalM: number;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Estimate the technological scrap for an order from its production events. */
export function computeTechScrap(input: TechScrapInput): TechScrapBreakdown {
  const startupM = input.started ? STARTUP_SCRAP_M : 0;
  const setupM = input.started ? SETUP_SCRAP_M : 0;
  const changesM = Math.max(0, input.jumboChanges) * JUMBO_CHANGE_SCRAP_M;
  const finishM = input.finished ? FINISH_TRIM_SCRAP_M : 0;
  return {
    startupM,
    setupM,
    changesM,
    finishM,
    totalM: round1(startupM + setupM + changesM + finishM),
  };
}
