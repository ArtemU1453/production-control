/** Forecast for a single in-work Jumbo. */
export interface JumboForecast {
  jumboId: string;
  stockNumber: string;
  materialCode: string;
  currentRemainderM: number;
  /** Average material consumed per order for this Jumbo (m). */
  avgConsumptionPerOrderM: number;
  /** Estimated remaining orders before the Jumbo is exhausted. */
  ordersLeft: number;
  /** Estimated calendar date of exhaustion (ISO), when derivable. */
  estimatedEndDate?: string;
}

/** Aggregate material-consumption and stock forecast. */
export interface MaterialForecast {
  /** Average material consumed per day over the observed window (m). */
  avgDailyConsumptionM: number;
  /** Total remaining material across active Jumbos (m). */
  totalRemainderM: number;
  /** Estimated days of stock left at the current pace. */
  daysOfStockLeft: number;
  /** Estimated number of fresh Jumbos required for the next 30 days. */
  jumbosNeededNext30Days: number;
}

/** Load forecast per resource (machine or operator). */
export interface LoadForecast {
  name: string;
  /** Orders handled in the observed window. */
  orders: number;
  /** Share of total orders (0…1). */
  share: number;
  /** Projected orders for the next period at the current pace. */
  projectedOrders: number;
}

export interface ForecastResult {
  jumbos: JumboForecast[];
  material: MaterialForecast;
  machines: LoadForecast[];
  operators: LoadForecast[];
  /** Number of days the observed data spans (denominator for daily rates). */
  windowDays: number;
}
