/** Centralized user-facing strings. Keeping copy in one place keeps tone
 *  consistent and makes future localization a single-file change. */
export const strings = {
  appName: "Калькулятор нарезки",
  comingSoon: "Раздел будет реализован на следующем этапе",
  tabs: {
    dashboard: "Обзор",
    calculator: "Расчёт",
    materials: "Материалы",
    warehouse: "Склад",
    history: "История",
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
  materials: {
    title: "Материалы",
    empty: "Справочник материалов пуст",
    emptyHint: "Добавьте первый материал, чтобы оприходовать сырьё",
  },
  warehouse: {
    title: "Склад Джамбов",
    empty: "На складе пока нет Джамбов",
    emptyHint: "Оприходуйте партию сырья, чтобы Джамбы появились здесь",
    needMaterial: "Сначала добавьте материал в справочнике",
  },
  receipt: {
    title: "Поступление сырья",
  },
  jumbo: {
    title: "Карточка Джамба",
    timeline: "Журнал операций",
  },
  archive: {
    title: "Архив",
    empty: "Архив пуст",
    emptyHint:
      "Списанные Джамбы появятся здесь. Перенос в архив будет реализован на следующем этапе.",
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
