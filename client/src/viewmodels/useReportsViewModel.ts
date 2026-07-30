import type { IconName } from "@/resources/icons";

export interface ReportKindCard {
  key: string;
  title: string;
  description: string;
  icon: IconName;
}

interface ReportsViewModel {
  kinds: readonly ReportKindCard[];
}

/**
 * ViewModel for the reports screen. It exposes the report kinds that later
 * phases will generate, so the screen can present them as prepared, disabled
 * cards with a consistent layout.
 */
export function useReportsViewModel(): ReportsViewModel {
  const kinds: readonly ReportKindCard[] = [
    {
      key: "order",
      title: "Отчёт по заказу",
      description: "PDF с параметрами и результатами расчёта.",
      icon: "reports",
    },
    {
      key: "production",
      title: "Производственный отчёт",
      description: "Сводка по выработке и отходам за период.",
      icon: "analytics",
    },
    {
      key: "jumbo",
      title: "Отчёт по Джамбу",
      description: "Движение и остаток по каждому Джамбу.",
      icon: "jumbo",
    },
  ];

  return { kinds };
}
