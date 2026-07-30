/** Centralized user-facing strings. Keeping copy in one place keeps tone
 *  consistent and makes future localization a single-file change. */
export const strings = {
  appName: "Калькулятор нарезки",
  comingSoon: "Раздел будет реализован на следующем этапе",
  tabs: {
    dashboard: "Обзор",
    calculator: "Расчёт",
    history: "История",
    warehouse: "Склад",
    reports: "Отчёты",
    settings: "Настройки",
  },
  dashboard: {
    title: "Обзор",
    subtitle: "Производственная панель",
  },
  calculator: {
    title: "Расчёт нарезки",
    materialSection: "Параметры материала",
    rollSection: "Размер готового рулона",
    results: "Результаты",
  },
  history: {
    title: "История",
    empty: "Пока нет сохранённых расчётов",
    emptyHint: "Выполните расчёт и сохраните его, чтобы он появился здесь",
  },
  warehouse: {
    title: "Склад Джамбов",
    description:
      "Учёт Джамбов, остатков и операций появится на следующем этапе разработки.",
  },
  reports: {
    title: "Отчёты",
    description:
      "Генерация PDF-отчётов и отправка по электронной почте появятся на следующем этапе.",
  },
  settings: {
    title: "Настройки",
    company: "Название предприятия",
    operator: "Оператор",
    email: "Email",
    autoSend: "Автоматическая отправка отчётов",
    darkTheme: "Тёмная тема",
    version: "Версия приложения",
  },
} as const;
