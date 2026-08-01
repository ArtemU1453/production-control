import { validateIdentifier } from "@shared/identifier";

/** A validation outcome: `null` means valid, otherwise a user-facing message. */
export type ValidationError = string | null;

export function validateRequired(value: string, label: string): ValidationError {
  return value.trim().length === 0 ? `${label}: заполните поле` : null;
}

/**
 * Validates any system identifier (code / article / number) through the single
 * shared rule set (A–Z, a–z, 0–9; 1…10 chars). Re-exported so every ViewModel
 * uses one implementation.
 */
export { validateIdentifier } from "@shared/identifier";

/** Material code — the same unified identifier rule as every other code. */
export function validateMaterialCode(code: string): ValidationError {
  return validateIdentifier(code, "Код материала");
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
