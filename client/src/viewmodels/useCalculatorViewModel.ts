import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useServices } from "@/core/di/AppServices";
import { nowIso } from "@/extensions/date";
import { makeId } from "@/utilities/id";
import type { CalcResult } from "@/services";
import type { CuttingOrder, CuttingOrderInput } from "@/models";
import {
  calculatorDefaults,
  calculatorSchema,
  type CalculatorFormValues,
} from "./calculatorSchema";

interface CalculatorViewModel {
  form: ReturnType<typeof useForm<CalculatorFormValues>>;
  plan: CalcResult | null;
  errorMsg: string | null;
  saving: boolean;
  justSaved: boolean;
  applyAdditionalWidth: (width: number) => void;
  save: () => Promise<void>;
}

function toInput(values: CalculatorFormValues): CuttingOrderInput {
  return {
    materialWidthMm: values.materialWidthMm,
    usefulWidthMm: values.usefulWidthMm,
    rollWidthMm: values.rollWidthMm,
    rollLengthM: values.rollLengthM,
    bigRollLengthM: values.bigRollLengthM,
    orderRolls: values.orderRolls,
    additionalWidthMm: values.additionalWidthMm,
  };
}

/**
 * ViewModel for the calculator screen. It owns the form, derives the live plan
 * through the calculation service, and can persist a computed order to history.
 *
 * The calculation itself is unchanged: the service forwards the same arguments,
 * in the same order, to the original engine, so every result matches the
 * previous implementation exactly.
 */
export function useCalculatorViewModel(): CalculatorViewModel {
  const { calculation, cuttingOrders, settings } = useServices();

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
      return { plan: calculation.calculate(toInput(parsed.data)), errorMsg: null };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Ошибка расчёта";
      return { plan: null, errorMsg: message };
    }
  }, [values, calculation]);

  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const applyAdditionalWidth = useCallback(
    (width: number) => {
      form.setValue("additionalWidthMm", width, {
        shouldValidate: true,
        shouldDirty: true,
      });
    },
    [form],
  );

  const save = useCallback(async () => {
    const parsed = calculatorSchema.safeParse(values);
    if (!parsed.success || !plan) {
      return;
    }
    setSaving(true);
    try {
      const currentSettings = await settings.load();
      const order: CuttingOrder = {
        id: makeId(),
        createdAt: nowIso(),
        input: toInput(parsed.data),
        result: plan,
        operator: currentSettings.operator || undefined,
      };
      await cuttingOrders.save(order);
      setJustSaved(true);
      window.setTimeout(() => setJustSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }, [values, plan, settings, cuttingOrders]);

  return {
    form,
    plan,
    errorMsg,
    saving,
    justSaved,
    applyAdditionalWidth,
    save,
  };
}
