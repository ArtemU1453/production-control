import { ReportKind } from "../models/ReportKind";
import type { ReportBuilder } from "./support";
import { productionBuilder } from "./productionBuilder";
import { ordersBuilder } from "./ordersBuilder";
import { jumbosBuilder } from "./jumbosBuilder";
import { stockBuilder } from "./stockBuilder";
import { operatorsBuilder } from "./operatorsBuilder";
import { machinesBuilder } from "./machinesBuilder";
import { materialsBuilder } from "./materialsBuilder";

/**
 * Registry of report builders keyed by kind. A new report is added by writing a
 * builder that implements {@link ReportBuilder} and registering it here — no
 * existing builder or the service changes (Open/Closed).
 */
const builders: ReportBuilder[] = [
  productionBuilder,
  ordersBuilder,
  jumbosBuilder,
  stockBuilder,
  operatorsBuilder,
  machinesBuilder,
  materialsBuilder,
];

const registry: Map<ReportKind, ReportBuilder> = new Map(
  builders.map((builder) => [builder.kind, builder]),
);

export function getReportBuilder(kind: ReportKind): ReportBuilder | undefined {
  return registry.get(kind);
}

export function registeredReportKinds(): ReportKind[] {
  return Array.from(registry.keys());
}

export type { ReportBuilder };
