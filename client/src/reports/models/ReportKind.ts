import type { IconName } from "@/resources/icons";

/** The report types offered by the Report Center. Adding a new kind here plus a
 *  builder in the registry is all that a new report requires. */
export enum ReportKind {
  production = "production",
  productionSummary = "productionSummary",
  orders = "orders",
  jumbos = "jumbos",
  stock = "stock",
  operators = "operators",
  machines = "machines",
  materials = "materials",
}

export interface ReportDefinition {
  kind: ReportKind;
  title: string;
  description: string;
  icon: IconName;
}

const definitions: Record<ReportKind, ReportDefinition> = {
  [ReportKind.production]: {
    kind: ReportKind.production,
    title: "Производственный отчёт",
    description: "Главный отчёт предприятия: заказы, расход, потери, использование.",
    icon: "gauge",
  },
  [ReportKind.productionSummary]: {
    kind: ReportKind.productionSummary,
    title: "Производственная сводка",
    description: "Сводка для руководителя: ключевые KPI и показатели по станкам.",
    icon: "insights",
  },
  [ReportKind.orders]: {
    kind: ReportKind.orders,
    title: "Отчёт по заказам",
    description: "Каждый заказ: материал, Джамб, рулоны, метраж, площадь.",
    icon: "history",
  },
  [ReportKind.jumbos]: {
    kind: ReportKind.jumbos,
    title: "Отчёт по Джамбам",
    description: "Использование, остаток, брак и потери по каждому Джамбу.",
    icon: "jumbo",
  },
  [ReportKind.stock]: {
    kind: ReportKind.stock,
    title: "Отчёт по складу",
    description: "Все Джамбы, статусы, остатки и даты.",
    icon: "warehouse",
  },
  [ReportKind.operators]: {
    kind: ReportKind.operators,
    title: "Отчёт по операторам",
    description: "Заказы, рулоны, расход и площадь по операторам.",
    icon: "settings",
  },
  [ReportKind.machines]: {
    kind: ReportKind.machines,
    title: "Отчёт по станкам",
    description: "Заказы, рулоны, расход и время работы по станкам.",
    icon: "cut",
  },
  [ReportKind.materials]: {
    kind: ReportKind.materials,
    title: "Отчёт по материалам",
    description: "Джамбы, метраж, остаток и заказы по каждому материалу.",
    icon: "material",
  },
};

export function reportDefinition(kind: ReportKind): ReportDefinition {
  return definitions[kind];
}

export const allReportDefinitions: readonly ReportDefinition[] = Object.values(definitions);
export const allReportKinds: readonly ReportKind[] = allReportDefinitions.map((d) => d.kind);
