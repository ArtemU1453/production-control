const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(address: string): boolean {
  return EMAIL_REGEX.test(address.trim());
}

/** Splits a free-form recipients string (comma / semicolon / newline separated)
 *  into a de-duplicated list of trimmed addresses. */
export function parseAddresses(raw: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const part of raw.split(/[,;\n]/)) {
    const address = part.trim();
    if (address && !seen.has(address.toLowerCase())) {
      seen.add(address.toLowerCase());
      result.push(address);
    }
  }
  return result;
}

export interface AddressPartition {
  valid: string[];
  invalid: string[];
}

export function partitionAddresses(addresses: string[]): AddressPartition {
  const valid: string[] = [];
  const invalid: string[] = [];
  for (const address of addresses) {
    (isValidEmail(address) ? valid : invalid).push(address);
  }
  return { valid, invalid };
}
