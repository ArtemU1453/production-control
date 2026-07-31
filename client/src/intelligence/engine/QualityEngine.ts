import type { ReportContext } from "@/reports";
import { machineTitle } from "@/models";
import { QualityDimension, type QualityMetric, type QualityReport } from "../models";

/**
 * Quality engine — pure aggregation over a {@link ReportContext}.
 *
 * Loss share is derived from the frozen data the system already stores: the
 * per-cut waste area (`result.waste_area_m2`) attributed to each session's
 * material, operator and machine, plus technological scrap from the archive
 * (attributable to material only). No storage access, no history replay.
 */

const DEFAULT_ANOMALY_THRESHOLD_PERCENT = 12;
const ANOMALY_RELATIVE_MARGIN = 1.5;

interface Bucket {
  processed: number;
  waste: number;
  scrap: number;
}

function ensure(map: Map<string, Bucket>, key: string): Bucket {
  let bucket = map.get(key);
  if (!bucket) {
    bucket = { processed: 0, waste: 0, scrap: 0 };
    map.set(key, bucket);
  }
  return bucket;
}

function percent(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0;
}

export function computeQuality(
  context: ReportContext,
  anomalyThresholdPercent: number = DEFAULT_ANOMALY_THRESHOLD_PERCENT,
): QualityReport {
  const byMaterial = new Map<string, Bucket>();
  const byOperator = new Map<string, Bucket>();
  const byMachine = new Map<string, Bucket>();
  let totalProcessed = 0;
  let totalWaste = 0;
  let totalScrap = 0;

  for (const session of context.sessions) {
    const processed = (session.input.materialWidthMm / 1000) * session.result.used_length_m;
    const waste = session.result.waste_area_m2;
    totalProcessed += processed;
    totalWaste += waste;

    const material = ensure(byMaterial, session.materialCode || "—");
    material.processed += processed;
    material.waste += waste;

    const operator = ensure(byOperator, session.order.operator || "—");
    operator.processed += processed;
    operator.waste += waste;

    const machine = ensure(byMachine, machineTitle(session.order.machine));
    machine.processed += processed;
    machine.waste += waste;
  }

  // Technological scrap is attributable to material only (from the archive).
  for (const archived of context.archived) {
    const scrap = archived.statistics.scrapAreaM2;
    totalScrap += scrap;
    ensure(byMaterial, archived.jumbo.materialCode || "—").scrap += scrap;
  }

  const overallDefectPercent = percent(totalWaste, totalProcessed);
  const anomalyFloor = Math.max(
    anomalyThresholdPercent,
    overallDefectPercent * ANOMALY_RELATIVE_MARGIN,
  );

  function rows(dimension: QualityDimension, map: Map<string, Bucket>): QualityMetric[] {
    return Array.from(map.entries())
      .map(([subject, bucket]) => {
        const defectPercent = percent(bucket.waste, bucket.processed);
        return {
          dimension,
          subject,
          processedAreaM2: Math.round(bucket.processed * 10) / 10,
          wasteAreaM2: Math.round(bucket.waste * 10) / 10,
          scrapAreaM2: Math.round(bucket.scrap * 10) / 10,
          defectPercent,
          scrapPercent: percent(bucket.scrap, bucket.processed),
          anomaly: bucket.processed > 0 && defectPercent > anomalyFloor,
        };
      })
      .sort((a, b) => b.defectPercent - a.defectPercent);
  }

  return {
    metrics: [
      ...rows(QualityDimension.material, byMaterial),
      ...rows(QualityDimension.operator, byOperator),
      ...rows(QualityDimension.machine, byMachine),
    ],
    overallDefectPercent,
    overallScrapPercent: percent(totalScrap, totalProcessed),
    anomalyThresholdPercent: Math.round(anomalyFloor * 10) / 10,
  };
}
