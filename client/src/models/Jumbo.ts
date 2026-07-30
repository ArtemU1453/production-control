import { JumboStatus } from "./JumboStatus";

/**
 * A Jumbo (large master roll) held in the raw-material warehouse.
 *
 * The accumulative analytics fields (`usedLength`, `usefulArea`, `wasteArea`,
 * `scrapArea`, `efficiency`) are stored **directly on the record**. Later phases
 * update them incrementally after each operation; screens must never recompute
 * them by replaying the whole operation history. This is a deliberate design
 * choice for O(1) warehouse reads — see CHANGELOG "architectural decisions".
 */
export interface Jumbo {
  id: string;
  /** Номер складского учёта — warehouse accounting number (unique). */
  stockNumber: string;

  /** Relation to the source {@link Material}. */
  materialId: string;
  /** Denormalized material code, kept for fast search and list rendering. */
  materialCode: string;

  /** Ширина, мм — web width. */
  widthMm: number;
  /** Начальная намотка, м — initial wound length. */
  initialWindingM: number;
  /** Текущий остаток, м — current remaining length (never negative). */
  currentRemainderM: number;

  /** Дата поступления (ISO-8601). */
  arrivalDate: string;
  /** Дата начала использования (ISO-8601). */
  usageStartDate?: string;
  /** Дата окончания использования (ISO-8601). */
  usageEndDate?: string;

  status: JumboStatus;

  /** Общий использованный метраж, м — cumulative used length. */
  usedLength: number;
  /** Полезная площадь, м² — cumulative useful area. */
  usefulArea: number;
  /** Накопленный брак, м² — cumulative waste/defect area. */
  wasteArea: number;
  /** Накопленный технологический остаток, м² — cumulative technological scrap. */
  scrapArea: number;
  /** Текущий коэффициент использования (0…1). */
  efficiency: number;

  /** Комментарий — free-form note. */
  comment?: string;
}
