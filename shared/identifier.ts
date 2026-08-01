/**
 * Единый валидатор идентификаторов Production Control.
 *
 * ОДНА реализация правил ввода кодов/артикулов/номеров для всей системы —
 * материалы, Джамбо, заказы, партии, оборудование, документы и любые будущие
 * сущности. Лежит в `shared/`, поэтому одинаково используется фронтендом и
 * бекендом (никаких параллельных реализаций).
 *
 * Правила:
 *  • разрешены только латиница (A–Z, a–z) и цифры (0–9);
 *  • длина от 1 до 10 символов включительно;
 *  • ничего больше (кириллица, пробелы, дефисы, точки, спецсимволы, эмодзи —
 *    запрещены).
 */

/** Максимальная длина любого кода в системе. */
export const IDENTIFIER_MAX_LENGTH = 10;

/** Допустимый формат: только латиница и цифры, 1…10 символов. */
export const IDENTIFIER_PATTERN = /^[A-Za-z0-9]+$/;

/** Сообщение о недопустимом символе. */
export const IDENTIFIER_CHARSET_MESSAGE =
  "Допустимы только латинские буквы A–Z и цифры 0–9.";

/** Сообщение о превышении длины. */
export const IDENTIFIER_LENGTH_MESSAGE = "Максимальная длина кода — 10 символов.";

/**
 * Приводит произвольный ввод к допустимому виду: убирает все запрещённые
 * символы и обрезает до 10 символов. Используется для живой фильтрации ввода —
 * работает одинаково для набора, вставки (Ctrl+V), мобильной и десктопной
 * клавиатуры, потому что нормализует итоговое значение независимо от способа
 * ввода.
 */
export function sanitizeIdentifier(raw: string): string {
  return (raw ?? "").replace(/[^A-Za-z0-9]/g, "").slice(0, IDENTIFIER_MAX_LENGTH);
}

/** Строгая проверка: значение уже соответствует формату и длине. */
export function isValidIdentifier(value: string): boolean {
  return value.length <= IDENTIFIER_MAX_LENGTH && IDENTIFIER_PATTERN.test(value);
}

/**
 * Проверяет код и возвращает сообщение об ошибке (или `null`, если код валиден).
 * `label` подставляется в сообщение о пустом поле.
 */
export function validateIdentifier(value: string, label = "Код"): string | null {
  const trimmed = (value ?? "").trim();
  if (trimmed.length === 0) {
    return `${label}: заполните поле`;
  }
  if (trimmed.length > IDENTIFIER_MAX_LENGTH) {
    return IDENTIFIER_LENGTH_MESSAGE;
  }
  if (!IDENTIFIER_PATTERN.test(trimmed)) {
    return IDENTIFIER_CHARSET_MESSAGE;
  }
  return null;
}
