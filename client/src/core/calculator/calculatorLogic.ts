const MAX_BIG_ROLL_LENGTH_M = 22000;
const RANGE_MATERIAL_WIDTH = [550, 910] as const;
const RANGE_ROLL_WIDTH = [20, 310] as const;
const RANGE_ROLL_LENGTH = [30, 1100] as const;
const MAX_ROLL_WIDTH_REDUCTION = 0.03;
const SETUP_LENGTH_M = 10;

function _cycles_per_hour_by_width(roll_width_mm: number) {
  if (roll_width_mm >= 25 && roll_width_mm < 45) return 11;
  if (roll_width_mm >= 45 && roll_width_mm <= 150) return 12;
  return null;
}

function _cycles_per_hour_by_length(roll_length_m: number) {
  if (roll_length_m <= 300) return 12;
  if (roll_length_m <= 450) return 11;
  if (roll_length_m <= 600) return 10;
  return 8;
}

function _apply_roll_width_adjustment(useful_width_mm: number, roll_width_mm: number) {
  let main_count = Math.floor(useful_width_mm / roll_width_mm);
  let remaining_width = useful_width_mm - main_count * roll_width_mm;

  if (remaining_width < RANGE_ROLL_WIDTH[0] || remaining_width > RANGE_ROLL_WIDTH[1]) {
    return { roll_width_mm, main_count, remaining_width, was_adjusted: false };
  }

  if (main_count < 1) {
    return { roll_width_mm, main_count, remaining_width, was_adjusted: false };
  }

  const min_width = roll_width_mm * (1 - MAX_ROLL_WIDTH_REDUCTION);
  const width_needed = useful_width_mm / (main_count + 1);

  if (width_needed >= min_width && width_needed >= RANGE_ROLL_WIDTH[0] && width_needed <= RANGE_ROLL_WIDTH[1]) {
    const adjusted_width = Math.round(width_needed * 10) / 10;
    if (adjusted_width < min_width) {
      return { roll_width_mm, main_count, remaining_width, was_adjusted: false };
    }
    const adjusted_count = main_count + 1;
    let adjusted_remaining = useful_width_mm - adjusted_count * adjusted_width;
    if (Math.abs(adjusted_remaining) < 1e-6) {
      adjusted_remaining = 0;
    }
    return { roll_width_mm: adjusted_width, main_count: adjusted_count, remaining_width: adjusted_remaining, was_adjusted: true };
  }

  return { roll_width_mm, main_count, remaining_width, was_adjusted: false };
}

function _validate_inputs(
  material_width_mm: number,
  useful_width_mm: number,
  roll_width_mm: number,
  roll_length_m: number,
  big_roll_length_m: number,
) {
  if (material_width_mm < RANGE_MATERIAL_WIDTH[0] || material_width_mm > RANGE_MATERIAL_WIDTH[1]) {
    throw new Error("Ширина материала должна быть от 550 до 910 мм.");
  }
  if (useful_width_mm > material_width_mm) {
    throw new Error("Полезная ширина не может быть больше общей.");
  }
  if (roll_width_mm < RANGE_ROLL_WIDTH[0] || roll_width_mm > RANGE_ROLL_WIDTH[1]) {
    throw new Error("Ширина рулона должна быть от 20 до 310 мм.");
  }
  if (roll_length_m < RANGE_ROLL_LENGTH[0] || roll_length_m > RANGE_ROLL_LENGTH[1]) {
    throw new Error("Длина рулона должна быть от 30 до 1100 м.");
  }
  if (big_roll_length_m <= 0 || big_roll_length_m > MAX_BIG_ROLL_LENGTH_M) {
    throw new Error("Намотка Джамба должна быть от 1 до 22000 м.");
  }
  if (big_roll_length_m < roll_length_m) {
    throw new Error("Намотка Джамба должна быть не меньше длины рулона.");
  }
}

export type CalcResult = {
  material_width_mm: number;
  useful_width_mm: number;
  roll_width_input_mm: number;
  roll_width_mm: number;
  roll_length_m: number;
  big_roll_length_m: number;
  order_rolls: number;
  main_count: number;
  remaining_width_mm: number;
  additional_width_mm: number | null;
  /** Second additional size (мм), only used in manual mode. */
  additional_width_mm_2: number | null;
  was_adjusted: boolean;
  rolls_per_cycle: number;
  cycles_needed: number;
  cycles_used: number;
  cycles_per_hour: number | null;
  estimated_hours: number | null;
  used_length_m: number;
  length_count: number;
  length_waste_m: number;
  total_main_rolls: number;
  total_additional_rolls: number;
  /** Additional rolls of the first additional size. */
  total_additional_rolls_1: number;
  /** Additional rolls of the second additional size. */
  total_additional_rolls_2: number;
  total_rolls: number;
  surplus_rolls: number;
  surplus_main_rolls: number;
  surplus_additional_rolls: number;
  shortage_rolls: number;
  total_area_m2: number;
  useful_area_m2: number;
  waste_area_m2: number;
  waste_percent: number;
  waste_per_side_mm: number;
  inner_waste_mm: number;
  remaining_jumbo_m: number;
  shortage_cycles: number;
  shortage_length_m: number;
  optimal_additional_rolls?: Array<{ width: number; count: number }> | null;
  /** True when the plan was computed in «Образцы» (samples) mode. */
  sample_mode: boolean;
  /**
   * One entry per sample width that is actually cut, each with the SAME count
   * (equal-quantity rule). Null outside samples mode.
   */
  sample_groups: Array<{ width: number; per_cycle: number; total: number }> | null;
  /** Sample widths that had to be dropped (smallest first) to keep counts equal. */
  dropped_sample_widths: number[];
};

export function calculate(
  material_width_mm: number,
  useful_width_mm: number,
  roll_width_mm: number,
  roll_length_m: number,
  big_roll_length_m: number,
  order_rolls: number,
  additional_width_mm: number | null = null,
  additional_width_mm_2: number | null = null,
  auto_additional: boolean = true,
  samples_mode: boolean = false,
  sample_widths_mm: number[] | null = null,
): CalcResult {
  if (!order_rolls || order_rolls <= 0) {
    throw new Error("Количество рулонов в заказе должно быть больше нуля.");
  }
  order_rolls = Math.floor(order_rolls);

  // «Образцы» mode bypasses the main/additional cross-section entirely: the
  // sample widths ARE the cut lanes, in equal quantity. Only material width,
  // length and the Jumbo are needed — the single roll-width field is unused.
  if (samples_mode && sample_widths_mm && sample_widths_mm.length > 0) {
    if (material_width_mm < RANGE_MATERIAL_WIDTH[0] || material_width_mm > RANGE_MATERIAL_WIDTH[1]) {
      throw new Error("Ширина материала должна быть от 550 до 910 мм.");
    }
    if (useful_width_mm > material_width_mm) {
      throw new Error("Полезная ширина не может быть больше общей.");
    }
    if (roll_length_m < RANGE_ROLL_LENGTH[0] || roll_length_m > RANGE_ROLL_LENGTH[1]) {
      throw new Error("Длина рулона должна быть от 30 до 1100 м.");
    }
    if (big_roll_length_m <= 0 || big_roll_length_m > MAX_BIG_ROLL_LENGTH_M) {
      throw new Error("Намотка Джамба должна быть от 1 до 22000 м.");
    }
    return _calculate_samples(
      material_width_mm,
      useful_width_mm,
      roll_length_m,
      big_roll_length_m,
      order_rolls,
      sample_widths_mm,
    );
  }

  _validate_inputs(
    material_width_mm,
    useful_width_mm,
    roll_width_mm,
    roll_length_m,
    big_roll_length_m,
  );

  const roll_width_input_mm = roll_width_mm;

  // Parse the manual additional-size overrides (up to two). A non-positive or
  // absent value means "not set" for that slot.
  function parseOverride(value: number | null, label: string): number | null {
    if (value === null) {
      return null;
    }
    const n = Number(value);
    if (isNaN(n)) {
      throw new Error(`Некорректный ${label}.`);
    }
    if (n <= 0) {
      return null;
    }
    if (n < RANGE_ROLL_WIDTH[0] || n > RANGE_ROLL_WIDTH[1]) {
      throw new Error(`${label} должен быть от 20 до 310 мм.`);
    }
    return n;
  }
  const override_1 = parseOverride(additional_width_mm, "доп. размер");
  const override_2 = parseOverride(additional_width_mm_2, "доп. размер №2");

  // Pure auto mode: no manual override in either slot and auto is enabled. Only
  // then is the roll-width auto-adjustment applied and one additional size
  // auto-detected from the leftover width (the original behaviour, unchanged).
  const auto_mode = auto_additional && override_1 === null && override_2 === null;

  let main_count = 0;
  let remaining_width = 0;
  let was_adjusted = false;

  if (auto_mode) {
    const adj = _apply_roll_width_adjustment(useful_width_mm, roll_width_mm);
    roll_width_mm = adj.roll_width_mm;
    main_count = adj.main_count;
    remaining_width = adj.remaining_width;
    was_adjusted = adj.was_adjusted;
  } else {
    main_count = Math.floor(useful_width_mm / roll_width_mm);
    remaining_width = useful_width_mm - main_count * roll_width_mm;
    was_adjusted = false;
  }

  let additional_width: number | null = null;
  if (auto_mode) {
    if (!was_adjusted && remaining_width >= RANGE_ROLL_WIDTH[0] && remaining_width <= RANGE_ROLL_WIDTH[1]) {
      additional_width = remaining_width;
    }
  } else if (override_1 !== null) {
    if (override_1 - remaining_width > 1e-6) {
      throw new Error(
        `Доп. размер ${override_1.toFixed(1)} мм больше остатка ${remaining_width.toFixed(1)} мм.`
      );
    }
    additional_width = override_1;
  }

  // Second additional size — manual only. Cut from the width left after the main
  // rolls and the first additional roll.
  let additional_width_2: number | null = null;
  if (override_2 !== null) {
    const remaining_after_1 = remaining_width - (additional_width || 0);
    if (override_2 - remaining_after_1 > 1e-6) {
      throw new Error(
        `Доп. размер №2 ${override_2.toFixed(1)} мм больше остатка ${remaining_after_1.toFixed(1)} мм.`
      );
    }
    additional_width_2 = override_2;
  }

  const available_length_m = big_roll_length_m - SETUP_LENGTH_M;
  if (available_length_m < roll_length_m) {
    throw new Error("Недостаточная длина большого рулона с учетом 10 м расхода.");
  }

  const length_count = Math.floor(available_length_m / roll_length_m);
  const length_waste_m = available_length_m - length_count * roll_length_m;

  if (main_count <= 0) {
    throw new Error("Недостаточно ширины для нарезки рулонов.");
  }

  const rolls_per_cycle = main_count;
  const cycles_needed = Math.ceil(order_rolls / main_count);
  const cycles_used = Math.min(cycles_needed, length_count);

  const width_rate = _cycles_per_hour_by_width(roll_width_mm);
  const length_rate = _cycles_per_hour_by_length(roll_length_m);
  
  let cycles_per_hour: number | null = null;
  if (width_rate === null) {
    cycles_per_hour = length_rate;
  } else {
    cycles_per_hour = Math.min(width_rate, length_rate);
  }
  
  // Add 15 minutes (0.25 hours) for setup and material replacement time
  const estimated_hours = cycles_per_hour ? (cycles_needed / cycles_per_hour) + 0.25 : null;

  const total_main_rolls = main_count * cycles_used;
  const total_additional_rolls_1 = additional_width ? cycles_used : 0;
  const total_additional_rolls_2 = additional_width_2 ? cycles_used : 0;
  const total_additional_rolls = total_additional_rolls_1 + total_additional_rolls_2;
  const total_rolls = total_main_rolls + total_additional_rolls;

  const surplus_main_rolls = Math.max(0, total_main_rolls - order_rolls);
  const surplus_additional_rolls = total_additional_rolls;
  const surplus_rolls = surplus_main_rolls + surplus_additional_rolls;
  const shortage_rolls = Math.max(0, order_rolls - total_main_rolls);

  let used_length_m = cycles_used * roll_length_m + SETUP_LENGTH_M;
  
  // Calculate exact remaining jumbo before shortage logic overwrites used_length_m
  const remaining_jumbo_m = Math.max(0, big_roll_length_m - used_length_m);
  const shortage_cycles = Math.max(0, cycles_needed - cycles_used);
  const shortage_length_m = shortage_cycles * roll_length_m;

  if (shortage_rolls > 0) {
    used_length_m = big_roll_length_m;
  }

  const total_area_m2 = (material_width_mm / 1000) * used_length_m;
  const useful_width_sum_mm = main_count * roll_width_mm + (additional_width || 0) + (additional_width_2 || 0);
  const useful_area_m2 = (useful_width_sum_mm / 1000) * (cycles_used * roll_length_m);
  const waste_area_m2 = total_area_m2 - useful_area_m2;
  const waste_percent = total_area_m2 > 0 ? (waste_area_m2 / total_area_m2) * 100 : 0;

  // Истинный физический отход по кромкам (неиспользованная ширина делится пополам)
  const total_waste_width_mm = material_width_mm - useful_width_sum_mm;
  const waste_per_side_mm = total_waste_width_mm > 0 ? total_waste_width_mm / 2 : 0;
  
  const inner_waste_mm = 0; // Внутренний отход поглощается кромками при центровке

  // Расчет оптимальных дополнительных рулонов, если отход больше 7%
  let optimal_additional_rolls: Array<{ width: number; count: number }> | null = null;
  if (waste_percent > 7 && override_1 === null && override_2 === null) {
    optimal_additional_rolls = [];
    const min_roll_width = RANGE_ROLL_WIDTH[0];
    const max_roll_width = RANGE_ROLL_WIDTH[1];
    
    // Пытаемся заполнить оставшуюся ширину (total_waste_width_mm)
    // Оставляем минимальный обязательный отход на кромки (например, по 5 мм с каждой стороны, итого 10 мм)
    const MIN_EDGE_WASTE_TOTAL = 10; 
    let available_width_for_extra = total_waste_width_mm - MIN_EDGE_WASTE_TOTAL;
    
    if (available_width_for_extra >= min_roll_width) {
      // Ищем оптимальный набор дополнительных роликов, максимум 6 штук
      // Для простоты подбираем ролики одинаковой ширины, которые максимизируют использование остатка
      
      let best_waste = available_width_for_extra;
      let best_count = 0;
      let best_width = 0;
      
      for (let count = 1; count <= 6; count++) {
        const potential_width = Math.floor(available_width_for_extra / count);
        if (potential_width >= min_roll_width && potential_width <= max_roll_width) {
          const waste = available_width_for_extra - (potential_width * count);
          if (waste < best_waste) {
            best_waste = waste;
            best_count = count;
            best_width = potential_width;
          }
        }
      }
      
      if (best_count > 0 && best_width > 0) {
        optimal_additional_rolls.push({ width: best_width, count: best_count });
      }
    }
  }

  return {
    material_width_mm,
    useful_width_mm,
    roll_width_input_mm,
    roll_width_mm,
    roll_length_m,
    big_roll_length_m,
    order_rolls,
    main_count,
    remaining_width_mm: remaining_width,
    additional_width_mm: additional_width,
    additional_width_mm_2: additional_width_2,
    was_adjusted,
    rolls_per_cycle,
    cycles_needed,
    cycles_used,
    cycles_per_hour,
    estimated_hours,
    used_length_m,
    length_count,
    length_waste_m,
    total_main_rolls,
    total_additional_rolls,
    total_additional_rolls_1,
    total_additional_rolls_2,
    total_rolls,
    surplus_rolls,
    surplus_main_rolls,
    surplus_additional_rolls,
    shortage_rolls,
    total_area_m2: Math.round(total_area_m2 * 10) / 10,
    useful_area_m2: Math.round(useful_area_m2 * 10) / 10,
    waste_area_m2: Math.round(waste_area_m2 * 10) / 10,
    waste_percent: Math.round(waste_percent * 10) / 10,
    waste_per_side_mm,
    inner_waste_mm: Math.round(inner_waste_mm * 10) / 10,
    remaining_jumbo_m,
    shortage_cycles,
    shortage_length_m,
    optimal_additional_rolls,
    sample_mode: false,
    sample_groups: null,
    dropped_sample_widths: [],
  };
}

/**
 * Stage 2 of «Образцы»: given the width left free after the equal base batch,
 * pick EXTRA copies of the allowed sample widths (repetition allowed, only the
 * operator's own widths) that fill the free width as tightly as possible —
 * minimising the leftover. This is an unbounded knapsack where each item's value
 * equals its width, solved with DP over the capacity in tenths of a millimetre
 * (so 0.1 mm sample widths are honoured). Returns the extra count per width,
 * aligned with `widths`; an all-zero array when nothing fits or helps.
 *
 * Bounded and fast: capacity < Σ widths ≤ useful width (≤ ~9100 tenths) and the
 * item set is the sample list, so the DP is at most a few tens of thousands of
 * steps — no unbounded search.
 */
function _fill_remaining_width(free_mm: number, widths: number[]): number[] {
  const SCALE = 10;
  const n = widths.length;
  const extras = new Array<number>(n).fill(0);
  const cap = Math.floor(free_mm * SCALE);
  if (cap <= 0 || n === 0) {
    return extras;
  }
  const w = widths.map((x) => Math.round(x * SCALE));
  // best[c] = max fill ≤ c; pick[c] = width index chosen to reach best[c].
  const best = new Int32Array(cap + 1);
  const pick = new Int32Array(cap + 1).fill(-1);
  for (let c = 1; c <= cap; c++) {
    for (let i = 0; i < n; i++) {
      const wi = w[i];
      if (wi > 0 && wi <= c) {
        const candidate = best[c - wi] + wi;
        if (candidate > best[c]) {
          best[c] = candidate;
          pick[c] = i;
        }
      }
    }
  }
  let c = cap;
  while (c > 0 && pick[c] !== -1) {
    const i = pick[c];
    extras[i] += 1;
    c -= w[i];
  }
  return extras;
}

/**
 * «Образцы» (samples) mode — two-stage layout.
 *
 * Stage 1 (equal base): place the same number `m` of every sample across the
 * useful width, `m = floor(useful_width / Σ widths)`. If not even one of each
 * fits, DROP the smallest width and retry — never round counts — until the rest
 * fit; every surviving sample keeps the SAME base count.
 *
 * Stage 2 (fill the remainder): the width left free after the base batch is
 * filled with EXTRA copies of the same allowed widths (see
 * {@link _fill_remaining_width}) to minimise waste. Extras need not be equal, so
 * final per-sample counts may differ — equality is the starting point, not a
 * hard cap. Length/cycle/area maths mirror the normal engine.
 */
function _calculate_samples(
  material_width_mm: number,
  useful_width_mm: number,
  roll_length_m: number,
  big_roll_length_m: number,
  order_rolls: number,
  sample_widths_mm: number[],
): CalcResult {
  const cleaned = sample_widths_mm
    .map((w) => Number(w))
    .filter((w) => !isNaN(w) && w > 0);
  if (cleaned.length === 0) {
    throw new Error("Введите хотя бы одну ширину образца.");
  }
  for (const w of cleaned) {
    if (w < RANGE_ROLL_WIDTH[0] || w > RANGE_ROLL_WIDTH[1]) {
      throw new Error(`Ширина образца ${w} мм должна быть от 20 до 310 мм.`);
    }
  }

  // Keep counts equal: drop the smallest width while even one of each does not
  // fit across the useful width.
  const widths = [...cleaned].sort((a, b) => a - b);
  const sum = (arr: number[]) => arr.reduce((s, w) => s + w, 0);
  const dropped_sample_widths: number[] = [];
  while (widths.length > 1 && sum(widths) > useful_width_mm) {
    dropped_sample_widths.push(widths.shift() as number);
  }
  if (sum(widths) > useful_width_mm) {
    throw new Error(
      `Образец ${widths[0]} мм шире полезной ширины ${useful_width_mm.toFixed(0)} мм.`,
    );
  }

  const widths_sum = sum(widths);
  // Stage 1 — equal base count for every sample.
  const base_per_cycle = Math.floor(useful_width_mm / widths_sum); // ≥ 1 by construction
  // Stage 2 — fill the width left free after the base batch with extra copies.
  const free_width_mm = useful_width_mm - widths_sum * base_per_cycle;
  const extras = _fill_remaining_width(free_width_mm, widths);
  // Final per-sample count per cycle = equal base + optimisation extras.
  const per_cycle_counts = widths.map((_, i) => base_per_cycle + extras[i]);
  const strips_per_cycle = per_cycle_counts.reduce((s, c) => s + c, 0);

  const available_length_m = big_roll_length_m - SETUP_LENGTH_M;
  if (available_length_m < roll_length_m) {
    throw new Error("Недостаточная длина большого рулона с учетом 10 м расхода.");
  }
  const length_count = Math.floor(available_length_m / roll_length_m);
  const length_waste_m = available_length_m - length_count * roll_length_m;

  const cycles_needed = Math.ceil(order_rolls / strips_per_cycle);
  const cycles_used = Math.min(cycles_needed, length_count);

  const sample_groups = widths.map((w, i) => ({
    width: w,
    per_cycle: per_cycle_counts[i],
    total: per_cycle_counts[i] * cycles_used,
  }));
  const total_rolls = sample_groups.reduce((s, g) => s + g.total, 0);

  const length_rate = _cycles_per_hour_by_length(roll_length_m);
  const cycles_per_hour = length_rate;
  const estimated_hours = cycles_per_hour ? cycles_needed / cycles_per_hour + 0.25 : null;

  let used_length_m = cycles_used * roll_length_m + SETUP_LENGTH_M;
  const remaining_jumbo_m = Math.max(0, big_roll_length_m - used_length_m);
  const shortage_cycles = Math.max(0, cycles_needed - cycles_used);
  const shortage_length_m = shortage_cycles * roll_length_m;
  const shortage_rolls = Math.max(0, order_rolls - total_rolls);
  if (shortage_rolls > 0) {
    used_length_m = big_roll_length_m;
  }

  const used_width_mm = widths.reduce((s, w, i) => s + w * per_cycle_counts[i], 0);
  const total_area_m2 = (material_width_mm / 1000) * used_length_m;
  const useful_area_m2 = (used_width_mm / 1000) * (cycles_used * roll_length_m);
  const waste_area_m2 = total_area_m2 - useful_area_m2;
  const waste_percent = total_area_m2 > 0 ? (waste_area_m2 / total_area_m2) * 100 : 0;
  const total_waste_width_mm = material_width_mm - used_width_mm;
  const waste_per_side_mm = total_waste_width_mm > 0 ? total_waste_width_mm / 2 : 0;

  return {
    material_width_mm,
    useful_width_mm,
    roll_width_input_mm: 0,
    roll_width_mm: 0,
    roll_length_m,
    big_roll_length_m,
    order_rolls,
    main_count: 0,
    remaining_width_mm: 0,
    additional_width_mm: null,
    additional_width_mm_2: null,
    was_adjusted: false,
    rolls_per_cycle: strips_per_cycle,
    cycles_needed,
    cycles_used,
    cycles_per_hour,
    estimated_hours,
    used_length_m,
    length_count,
    length_waste_m,
    total_main_rolls: 0,
    total_additional_rolls: 0,
    total_additional_rolls_1: 0,
    total_additional_rolls_2: 0,
    total_rolls,
    surplus_rolls: Math.max(0, total_rolls - order_rolls),
    surplus_main_rolls: 0,
    surplus_additional_rolls: 0,
    shortage_rolls,
    total_area_m2: Math.round(total_area_m2 * 10) / 10,
    useful_area_m2: Math.round(useful_area_m2 * 10) / 10,
    waste_area_m2: Math.round(waste_area_m2 * 10) / 10,
    waste_percent: Math.round(waste_percent * 10) / 10,
    waste_per_side_mm,
    inner_waste_mm: 0,
    remaining_jumbo_m,
    shortage_cycles,
    shortage_length_m,
    optimal_additional_rolls: null,
    sample_mode: true,
    sample_groups,
    dropped_sample_widths,
  };
}
