import { JumboStatus } from "./JumboStatus";

/**
 * A Jumbo (large master roll) held in the warehouse.
 *
 * The accumulator fields (used length, useful area, waste, technological scrap
 * and utilization rate) are stored **on the record itself**. In later phases
 * each operation updates them incrementally rather than recomputing from the
 * full operation history — that keeps warehouse reads O(1) and is why these
 * fields live here instead of being derived views.
 */
export interface Jumbo {
  id: string;
  /** Номер складского учёта — warehouse accounting number. */
  stockNumber: string;
  /** Код материала — material code this Jumbo is made of. */
  materialCode: string;
  /** Optional link to a Material record. */
  materialId?: string;

  /** Ширина, мм — web width. */
  widthMm: number;
  /** Начальная намотка, м — initial wound length. */
  initialWindingM: number;
  /** Текущий остаток, м — current remaining length. */
  currentRemainderM: number;

  /** Общий использованный метраж, м — cumulative used length. */
  totalUsedLengthM: number;
  /** Полезная площадь, м² — cumulative useful area produced. */
  usefulAreaM2: number;
  /** Накопленный брак, м² — cumulative defect/waste area. */
  accumulatedWasteM2: number;
  /** Накопленные технологические остатки, м² — cumulative technological scrap. */
  accumulatedTechScrapM2: number;
  /** Текущий коэффициент использования (0…1) — current utilization ratio. */
  utilizationRate: number;

  /** Дата поступления — arrival date (ISO-8601). */
  arrivalDate: string;
  /** Дата начала использования — first-use date (ISO-8601). */
  usageStartDate?: string;
  /** Дата окончания использования — end-of-use date (ISO-8601). */
  usageEndDate?: string;

  status: JumboStatus;
}
