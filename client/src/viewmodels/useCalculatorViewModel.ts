import { useCallback, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useServices } from "@/core/di/AppServices";
import type { CalcResult } from "@/services";
import type { CuttingOrderInput } from "@/models";
import {
  calculatorDefaults,
  calculatorSchema,
  parseSampleWidths,
  type CalculatorFormValues,
} from "./calculatorSchema";

interface CalculatorViewModel {
  form: ReturnType<typeof useForm<CalculatorFormValues>>;
  plan: CalcResult | null;
  errorMsg: string | null;
  applyAdditionalWidth: (width: number) => void;
}

export function toCalculatorInput(values: CalculatorFormValues): CuttingOrderInput {
  const samplesMode = values.samplesMode ?? false;
  return {
    materialWidthMm: values.materialWidthMm,
    usefulWidthMm: values.usefulWidthMm,
    // In samples mode the single roll width is unused by the engine; pass 0 as a
    // harmless placeholder so the type stays a number.
    rollWidthMm: values.rollWidthMm ?? 0,
    rollLengthM: values.rollLengthM,
    bigRollLengthM: values.bigRollLengthM,
    orderRolls: values.orderRolls,
    additionalWidthMm: samplesMode ? undefined : values.additionalWidthMm,
    samplesMode,
    sampleWidthsMm: samplesMode ? parseSampleWidths(values.sampleWidths) : undefined,
  };
}

/**
 * ViewModel for the free (standalone) calculator screen. It owns the form and
 * derives the live plan through the calculation service. Production runs that
 * consume a Jumbo go through {@link useProductionViewModel} instead.
 *
 * The calculation itself is unchanged: the service forwards the same arguments,
 * in the same order, to the original engine, so every result matches the
 * previous implementation exactly.
 */
export function useCalculatorViewModel(): CalculatorViewModel {
  const { calculation } = useServices();

  const form = useForm<CalculatorFormValues>({
    resolver: zodResolver(calculatorSchema),
    defaultValues: calculatorDefaults,
    mode: "onChange",
  });

  const materialWidthMm = form.watch("materialWidthMm");

  // Useful width tracks material width minus a 10 mm trim on each side —
  // preserved from the original screen.
  useEffect(() => {
    if (materialWidthMm) {
      form.setValue("usefulWidthMm", materialWidthMm - 20, {
        shouldValidate: true,
        shouldDirty: true,
      });
    }
  }, [materialWidthMm, form]);

  const values = form.watch();

  const { plan, errorMsg } = useMemo<{
    plan: CalcResult | null;
    errorMsg: string | null;
  }>(() => {
    const parsed = calculatorSchema.safeParse(values);
    if (!parsed.success) {
      return { plan: null, errorMsg: null };
    }
    try {
      return { plan: calculation.calculate(toCalculatorInput(parsed.data)), errorMsg: null };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Ошибка расчёта";
      return { plan: null, errorMsg: message };
    }
  }, [values, calculation]);

  const applyAdditionalWidth = useCallback(
    (width: number) => {
      form.setValue("additionalWidthMm", width, {
        shouldValidate: true,
        shouldDirty: true,
      });
    },
    [form],
  );

  return { form, plan, errorMsg, applyAdditionalWidth };
}
