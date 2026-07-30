/**
 * Barrel for domain models. Every model here is a plain, serializable data
 * structure with a stable `id` and no UI dependencies — the shape the storage
 * and repository layers persist and exchange.
 */
export type { Material } from "./Material";
export type { Jumbo } from "./Jumbo";
export type { CuttingOrder, CuttingOrderInput } from "./CuttingOrder";
export type { CuttingRoll } from "./CuttingRoll";
export type { Waste } from "./Waste";
export type { JumboOperation } from "./JumboOperation";
export type { AppSettings } from "./Settings";
export type { Report } from "./Report";

export { JumboStatus, jumboStatusTitle, jumboStatusColorRole, jumboStatusOrder } from "./JumboStatus";
export type { StatusColorRole } from "./JumboStatus";
export { CuttingRollKind } from "./CuttingRoll";
export { WasteKind } from "./Waste";
export { JumboOperationType } from "./JumboOperation";
export { ReportType, ReportFormat, ReportStatus } from "./Report";
export { defaultSettings } from "./Settings";
