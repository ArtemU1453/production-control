/** Dimension a quality metric is grouped by. */
export enum QualityDimension {
  material = "material",
  operator = "operator",
  machine = "machine",
}

const dimensionTitles: Record<QualityDimension, string> = {
  [QualityDimension.material]: "Материалы",
  [QualityDimension.operator]: "Операторы",
  [QualityDimension.machine]: "Станки",
};

export function qualityDimensionTitle(dimension: QualityDimension): string {
  return dimensionTitles[dimension];
}

/** One quality row: defect / scrap share for a subject within a dimension. */
export interface QualityMetric {
  dimension: QualityDimension;
  subject: string;
  /** Processed area attributed to the subject, m². */
  processedAreaM2: number;
  /** Defect (waste) area, m². */
  wasteAreaM2: number;
  /** Technological scrap area, m². */
  scrapAreaM2: number;
  /** Defect share of processed area, %. */
  defectPercent: number;
  /** Technological-scrap share of processed area, %. */
  scrapPercent: number;
  /** True when the defect share is an outlier for the dimension. */
  anomaly: boolean;
}

export interface QualityReport {
  metrics: QualityMetric[];
  /** Overall defect share across all production, %. */
  overallDefectPercent: number;
  /** Overall technological-scrap share, %. */
  overallScrapPercent: number;
  /** Anomaly threshold used (defect %), for transparency. */
  anomalyThresholdPercent: number;
}
