import { z } from "zod";

/**
 * Validation schema for the calculator form. Preserved verbatim from the
 * original screen so validation behaviour — bounds, cross-field checks and the
 * optional additional-width handling — is unchanged.
 */
export const calculatorSchema = z
  .object({
    materialWidthMm: z.coerce.number().min(550).max(910),
    usefulWidthMm: z.coerce.number().min(550).max(910),
    rollWidthMm: z.coerce.number().min(20).max(310),
    rollLengthM: z.coerce.number().min(30).max(1100),
    bigRollLengthM: z.coerce.number().min(30).max(22000),
    orderRolls: z.coerce.number().int().positive().min(1),
    additionalWidthMm: z
      .union([z.coerce.number().min(20).max(310), z.literal("")])
      .optional()
      .transform((v) => (v === "" ? undefined : (v as number | undefined))),
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
  });

export type CalculatorFormValues = z.infer<typeof calculatorSchema>;

export const calculatorDefaults: CalculatorFormValues = {
  materialWidthMm: 910,
  usefulWidthMm: 890,
  rollWidthMm: 104,
  rollLengthM: 300,
  bigRollLengthM: 10000,
  orderRolls: 50,
  additionalWidthMm: undefined,
};
