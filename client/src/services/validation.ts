import { MATERIAL_CODE_LENGTH } from "../models";

/** A validation outcome: `null` means valid, otherwise a user-facing message. */
export type ValidationError = string | null;

export function validateRequired(value: string, label: string): ValidationError {
  return value.trim().length === 0 ? `${label}: заполните поле` : null;
}

export function validateMaterialCode(code: string): ValidationError {
  const trimmed = code.trim();
  if (trimmed.length === 0) {
    return "Код материала: заполните поле";
  }
  if (trimmed.length !== MATERIAL_CODE_LENGTH) {
    return `Код материала должен содержать ровно ${MATERIAL_CODE_LENGTH} символов`;
  }
  return null;
}

export function validatePositive(value: number, label: string): ValidationError {
  if (!Number.isFinite(value) || value <= 0) {
    return `${label} должно быть больше нуля`;
  }
  return null;
}

export function validateNonNegative(value: number, label: string): ValidationError {
  if (!Number.isFinite(value) || value < 0) {
    return `${label} не может быть отрицательным`;
  }
  return null;
}

/** Returns the first non-null error from a list of checks, or null if all pass. */
export function firstError(...errors: ValidationError[]): ValidationError {
  return errors.find((error) => error !== null) ?? null;
}
