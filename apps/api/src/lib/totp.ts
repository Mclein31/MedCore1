import { base32Decode, base32Encode, randomBytes, timingSafeEqual } from './crypto';

/**
 * RFC 6238 TOTP (HMAC-SHA1, 30-second steps, 6 digits): the parameters every
 * authenticator app supports. One step of clock drift is tolerated either way,
 * and a used step can never be accepted twice (replay protection).
 */
const STEP_SECONDS = 30;
const DIGITS = 6;
const DRIFT_STEPS = 1;

export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

export function currentStep(now: Date): number {
  return Math.floor(now.getTime() / 1000 / STEP_SECONDS);
}

export async function hotp(secret: Uint8Array, counter: number): Promise<string> {
  const message = new ArrayBuffer(8);
  const view = new DataView(message);
  view.setUint32(0, Math.floor(counter / 2 ** 32));
  view.setUint32(4, counter >>> 0);
  const key = await crypto.subtle.importKey(
    'raw',
    secret as BufferSource,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  );
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, message));
  const offset = mac[mac.length - 1]! & 0x0f;
  const binary =
    ((mac[offset]! & 0x7f) << 24) | (mac[offset + 1]! << 16) | (mac[offset + 2]! << 8) | mac[offset + 3]!;
  return String(binary % 10 ** DIGITS).padStart(DIGITS, '0');
}

/**
 * Returns the matched time step, or null. Callers must persist the step and pass
 * it back as `lastUsedStep` so the same code cannot be replayed.
 */
export async function verifyTotp(
  base32Secret: string,
  code: string,
  now: Date,
  lastUsedStep: number | null,
): Promise<number | null> {
  if (!/^\d{6}$/.test(code)) return null;
  const secret = base32Decode(base32Secret);
  const step = currentStep(now);
  let matched: number | null = null;
  // Check every candidate (no early exit) so timing does not reveal which step matched.
  for (let delta = -DRIFT_STEPS; delta <= DRIFT_STEPS; delta++) {
    const candidate = step + delta;
    const expected = await hotp(secret, candidate);
    if (timingSafeEqual(code, expected) && (lastUsedStep === null || candidate > lastUsedStep))
      matched = candidate;
  }
  return matched;
}

export function otpauthUri(secret: string, accountEmail: string, issuer: string): string {
  const label = encodeURIComponent(`${issuer}:${accountEmail}`);
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: String(DIGITS),
    period: String(STEP_SECONDS),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}
