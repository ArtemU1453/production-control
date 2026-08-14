import { z } from "zod";

/**
 * Parses the comma-separated «Образцы» widths field into a clean number[].
 * Accepts commas, semicolons or whitespace as separators and both `.`/`,` as
 * the decimal mark inside a single token is NOT supported (commas separate
 * items); values ≤ 0 or non-numeric are dropped. Shared by the schema's
 * validation and the input adapter so both see the exact same list.
 */
export function parseSampleWidths(raw: string | undefined | null): number[] {
  if (!raw) {
    return [];
  }
  return raw
    .split(/[,;\s]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
    .map((t) => Number(t))
    .filter((n) => Number.isFinite(n) && n > 0);
}

/**
 * Validation schema for the calculator form. Preserved verbatim from the
 * original screen so validation behaviour — bounds, cross-field checks and the
 * optional additional-width handling — is unchanged, plus the new «Образцы»
 * (samples) mode: when enabled the single roll width is not required and the
 * comma-separated sample widths must contain at least one valid value.
 */
export const calculatorSchema = z
  .object({
    materialWidthMm: z.coerce.number().min(550).max(910),
    usefulWidthMm: z.coerce.number().min(550).max(910),
    rollWidthMm: z
      .union([z.coerce.number().min(20).max(310), z.literal("")])
      .optional()
      .transform((v) => (v === "" ? undefined : (v as number | undefined))),
    rollLengthM: z.coerce.number().min(30).max(1100),
    bigRollLengthM: z.coerce.number().min(30).max(22000),
    orderRolls: z.coerce.number().int().positive().min(1),
    additionalWidthMm: z
      .union([z.coerce.number().min(20).max(310), z.literal("")])
      .optional()
      .transform((v) => (v === "" ? undefined : (v as number | undefined))),
    samplesMode: z.boolean().optional(),
    sampleWidths: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.usefulWidthMm > val.materialWidthMm) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Полезная ширина не может быть больше ширины материала",
        path: ["usefulWidthMm"],
      });
    }
    if (val.bigRollLengthM < val.rollLengthM) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Намотка Джамба должна быть не меньше длины рулона.",
        path: ["bigRollLengthM"],
      });
    }
    if (val.samplesMode) {
      const widths = parseSampleWidths(val.sampleWidths);
      if (widths.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Введите хотя бы одну ширину образца (через запятую).",
          path: ["sampleWidths"],
        });
      } else if (widths.some((w) => w < 20 || w > 310)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Ширина образца должна быть от 20 до 310 мм.",
          path: ["sampleWidths"],
        });
      }
    } else if (val.rollWidthMm === undefined) {
      // Outside samples mode the single roll width is required as before.
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Введите ширину рулона.",
        path: ["rollWidthMm"],
      });
    }
  });

export type CalculatorFormValues = z.infer<typeof calculatorSchema>;

/**
 * Blank defaults for the calculator form. Every operator-entered field starts
 * empty — no demonstration/test values are pre-filled — so nothing is computed
 * until the operator types real parameters (an empty value fails validation and
 * yields no plan). `usefulWidthMm` is derived from the material width by the
 * ViewModel. Also used by «Очистить» to return the form to this clean state.
 */
export const calculatorDefaults: Partial<CalculatorFormValues> = {
  materialWidthMm: undefined,
  usefulWidthMm: undefined,
  rollWidthMm: undefined,
  rollLengthM: undefined,
  bigRollLengthM: undefined,
  orderRolls: undefined,
  additionalWidthMm: undefined,
  samplesMode: false,
  sampleWidths: "",
};
