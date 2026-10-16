/**
 * Money is always an integer number of centavos. Never a float of pesos.
 *
 * The ceiling matches PostgreSQL numeric(15,2) (and is far below
 * Number.MAX_SAFE_INTEGER), so every value here round-trips through a
 * bigint column and JSON without loss.
 */
export const MAX_CENTS = 999_999_999_999_999;

export class MoneyError extends Error {
  override name = 'MoneyError';
}

export function isCents(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= MAX_CENTS;
}

export function assertCents(value: unknown, label = 'amount'): number {
  if (!isCents(value)) throw new MoneyError(`${label} must be a whole, non-negative number of centavos.`);
  return value;
}

/** Sum centavo amounts with an overflow check. */
export function sumCents(...values: number[]): number {
  let total = 0n;
  for (const value of values) total += BigInt(assertCents(value));
  if (total > BigInt(MAX_CENTS)) throw new MoneyError('Total exceeds the supported money range.');
  return Number(total);
}

/** Subtract, refusing to go below zero. */
export function subCents(minuend: number, subtrahend: number): number {
  const result = assertCents(minuend) - assertCents(subtrahend);
  if (result < 0) throw new MoneyError('Subtraction would produce a negative amount.');
  return result;
}

/** value * numerator / denominator, rounded half-up, computed exactly. */
export function mulRatio(value: number, numerator: bigint, denominator: bigint): number {
  if (denominator <= 0n || numerator < 0n) throw new MoneyError('Invalid ratio.');
  const scaled = BigInt(assertCents(value)) * numerator;
  return Number((scaled + denominator / 2n) / denominator);
}

/** quantity * unit price, exact. */
export function lineTotal(quantity: number, unitPriceCents: number): number {
  if (!Number.isSafeInteger(quantity) || quantity <= 0)
    throw new MoneyError('Quantity must be a positive whole number.');
  const total = BigInt(quantity) * BigInt(assertCents(unitPriceCents));
  if (total > BigInt(MAX_CENTS)) throw new MoneyError('Line total exceeds the supported money range.');
  return Number(total);
}

const PESO_INPUT = /^(?:0|[1-9]\d{0,12}|[1-9]\d{0,2}(?:,\d{3}){1,4})(?:\.\d{1,2})?$/;

/**
 * Parse a peso string a person typed ("1,234.5", "800") into centavos.
 * Rejects anything ambiguous instead of guessing.
 */
export function parsePesos(input: string): number {
  const text = input.trim().replace(/^₱\s*/, '');
  if (!PESO_INPUT.test(text)) throw new MoneyError('Enter an amount like 1,250.00.');
  const [whole = '0', fraction = ''] = text.replace(/,/g, '').split('.');
  const cents = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
  if (cents > BigInt(MAX_CENTS)) throw new MoneyError('Amount is too large.');
  return Number(cents);
}

/** Format centavos as "₱1,234.56". */
export function formatPeso(cents: number): string {
  const value = assertCents(cents) + 0; // "+ 0" turns -0 into 0, which would otherwise print as "-0"
  const whole = Math.floor(value / 100);
  const fraction = String(value % 100).padStart(2, '0');
  return `₱${whole.toLocaleString('en-PH')}.${fraction}`;
}

/** Format centavos as a plain decimal string ("1234.56") for XML and CSV. */
export function centsToDecimal(cents: number): string {
  const value = assertCents(cents);
  return `${Math.floor(value / 100)}.${String(value % 100).padStart(2, '0')}`;
}
