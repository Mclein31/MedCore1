// Format validation only: no issuer lookup, ownership check or expiry check.
// Sources and supported Philippine formats: docs/implementation/government-id-validation.md.
export const GOVERNMENT_ID_TYPES = ['PHILSYS_NATIONAL_ID', 'UMID', 'DRIVERS_LICENSE', 'PASSPORT'] as const;
export type GovernmentIdType = typeof GOVERNMENT_ID_TYPES[number];
export const GOVERNMENT_ID_RULES: Record<GovernmentIdType, { label: string; hint: string; placeholder: string; numeric: boolean; pattern: RegExp }> = {
  PHILSYS_NATIONAL_ID: { label: 'PhilSys card number (PCN)', hint: 'Enter the 16-digit PCN printed on your National ID. Use the card number, not the private 12-digit PSN.', placeholder: '0000-0000-0000-0000', numeric: true, pattern: /^(?:[0-9]{16}|[0-9]{4}(?:[- ][0-9]{4}){3})$/ },
  UMID: { label: 'UMID Common Reference Number (CRN)', hint: 'Enter the 12-digit CRN on your UMID card, in 4-7-1 groups or without separators.', placeholder: '0000-0000000-0', numeric: true, pattern: /^(?:[0-9]{12}|[0-9]{4}[- ][0-9]{7}[- ][0-9])$/ },
  DRIVERS_LICENSE: { label: "LTO driver's license number", hint: 'Enter one letter and 10 digits, in the format A00-00-000000 or without hyphens.', placeholder: 'A00-00-000000', numeric: false, pattern: /^(?:[A-Z][0-9]{10}|[A-Z][0-9]{2}[- ][0-9]{2}[- ][0-9]{6})$/ },
  PASSPORT: { label: 'Philippine passport number', hint: 'Use the passport number on the data page. Current format: P0000000A; supported older formats contain 7–9 letters and digits.', placeholder: 'P0000000A', numeric: false, pattern: /^(?:[A-Z][0-9]{6}|[A-Z]{2}[0-9]{6,7}|[A-Z][0-9]{7}[A-Z])$/ }
};
export type GovernmentIdValidation = { valid: true; normalized: string } | { valid: false; error: string };
export function validateGovernmentId(type: unknown, input: unknown): GovernmentIdValidation {
  if (typeof type !== 'string' || !Object.prototype.hasOwnProperty.call(GOVERNMENT_ID_RULES, type)) return { valid: false, error: 'Choose a supported government ID type.' };
  const rule = GOVERNMENT_ID_RULES[type as GovernmentIdType];
  // Do not silently drop punctuation, Unicode lookalikes, control characters,
  // prefixes or surplus characters to turn an invalid identifier into a valid one.
  if (typeof input !== 'string' || input.length > 64 || !/^[A-Za-z0-9 -]+$/.test(input)) return { valid: false, error: rule.hint };
  const value = input.replace(/^ +| +$/g, '').toUpperCase();
  if (!rule.pattern.test(value)) return { valid: false, error: rule.hint };
  const compact = value.replace(/[- ]/g, '');
  const normalized = type === 'PHILSYS_NATIONAL_ID' ? compact.match(/.{4}/g)!.join('-')
    : type === 'UMID' ? `${compact.slice(0, 4)}-${compact.slice(4, 11)}-${compact.slice(11)}`
    : type === 'DRIVERS_LICENSE' ? `${compact.slice(0, 3)}-${compact.slice(3, 5)}-${compact.slice(5)}` : compact;
  return { valid: true, normalized };
}
