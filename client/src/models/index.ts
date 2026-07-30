/**
 * Barrel for domain models. Every model here is a plain, serializable data
 * structure with a stable `id` and no UI dependencies — the shape the storage
 * and repository layers persist and exchange (the SwiftData `@Model` analogue).
 */
export type { Material } from "./Material";
export { MATERIAL_CODE_LENGTH } from "./Material";
export type { Jumbo } from "./Jumbo";
export type { CuttingOrder, CuttingOrderInput } from "./CuttingOrder";
export type { CuttingRoll } from "./CuttingRoll";
export type { Waste } from "./Waste";
export type { JumboOperation } from "./JumboOperation";
export type { ArchivedJumbo, ArchivedJumboStatistics } from "./ArchivedJumbo";
export type { AppSettings } from "./Settings";
export type { Report } from "./Report";

export {
  JumboStatus,
  jumboStatusTitle,
  jumboStatusColorRole,
  jumboStatusOrder,
} from "./JumboStatus";
export type { StatusColorRole } from "./JumboStatus";
export {
  MaterialStatus,
  materialStatusTitle,
  materialStatusOrder,
} from "./MaterialStatus";
export { CuttingRollKind } from "./CuttingRoll";
export { WasteKind } from "./Waste";
export { JumboOperationType, jumboOperationTitle } from "./JumboOperation";
export { ReportType, ReportFormat, ReportStatus } from "./Report";
export { defaultSettings } from "./Settings";
