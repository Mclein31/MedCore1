/**
 * Format checks for Philippine government IDs used on promissory notes.
 * This proves the number is well-formed, not that it exists or belongs to the borrower;
 * the billing desk still inspects the physical card.
 */
export const GOVERNMENT_ID_TYPES = ['PHILSYS', 'UMID', 'DRIVERS_LICENSE', 'PASSPORT'] as const;
export type GovernmentIdType = (typeof GOVERNMENT_ID_TYPES)[number];

interface IdRule {
  label: string;
  hint: string;
  pattern: RegExp;
  normalize: (compact: string) => string;
}

export const GOVERNMENT_ID_RULES: Record<GovernmentIdType, IdRule> = {
  PHILSYS: {
    label: 'PhilSys card number (PCN)',
    hint: 'Enter the 16-digit card number printed on the National ID (not the 12-digit PSN).',
    pattern: /^\d{16}$/,
    normalize: (c) => c.match(/.{4}/g)!.join('-'),
  },
  UMID: {
    label: 'UMID CRN',
    hint: 'Enter the 12-digit Common Reference Number.',
    pattern: /^\d{12}$/,
    normalize: (c) => `${c.slice(0, 4)}-${c.slice(4, 11)}-${c.slice(11)}`,
  },
  DRIVERS_LICENSE: {
    label: "LTO driver's license number",
    hint: 'Enter one letter followed by 10 digits, like A01-23-456789.',
    pattern: /^[A-Z]\d{10}$/,
    normalize: (c) => `${c.slice(0, 3)}-${c.slice(3, 5)}-${c.slice(5)}`,
  },
  PASSPORT: {
    label: 'Philippine passport number',
    hint: 'Enter the number on the data page, like P1234567A.',
    pattern: /^(?:[A-Z]\d{7}[A-Z]|[A-Z]{2}\d{6,7}|[A-Z]\d{6})$/,
    normalize: (c) => c,
  },
};

export type GovernmentIdResult =
  { valid: true; normalized: string; last4: string } | { valid: false; error: string };

export function validateGovernmentId(type: GovernmentIdType, input: string): GovernmentIdResult {
  const rule = GOVERNMENT_ID_RULES[type];
  // Only ASCII letters, digits, spaces and hyphens. Never silently strip other characters.
  if (input.length > 32 || !/^[A-Za-z0-9 -]+$/.test(input)) return { valid: false, error: rule.hint };
  const compact = input.trim().toUpperCase().replace(/[ -]/g, '');
  if (!rule.pattern.test(compact)) return { valid: false, error: rule.hint };
  return { valid: true, normalized: rule.normalize(compact), last4: compact.slice(-4) };
}
