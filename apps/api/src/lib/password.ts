import { base64UrlToBytes, bytesToBase64Url, randomBytes, timingSafeEqual } from './crypto';

/**
 * PBKDF2-HMAC-SHA256 password hashing via WebCrypto (the only KDF available on
 * both Node and Workers). The iteration count is stored with each hash so it can
 * be raised later; hashes below the configured count are upgraded on next login.
 *
 * Format: pbkdf2-sha256$<iterations>$<salt b64url>$<hash b64url>
 */
const ALGORITHM = 'pbkdf2-sha256';
const KEY_BITS = 256;

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations },
    key,
    KEY_BITS,
  );
  return new Uint8Array(bits);
}

export async function hashPassword(password: string, iterations: number): Promise<string> {
  const salt = randomBytes(16);
  const hash = await derive(password, salt, iterations);
  return `${ALGORITHM}$${iterations}$${bytesToBase64Url(salt)}$${bytesToBase64Url(hash)}`;
}

export interface VerifyResult {
  ok: boolean;
  needsRehash: boolean;
}

export async function verifyPassword(password: string, stored: string, targetIterations: number): Promise<VerifyResult> {
  const [algorithm, iterText, saltText, hashText] = stored.split('$');
  const iterations = Number(iterText);
  if (algorithm !== ALGORITHM || !Number.isSafeInteger(iterations) || !saltText || !hashText) {
    return { ok: false, needsRehash: false };
  }
  const actual = await derive(password, base64UrlToBytes(saltText), iterations);
  const ok = timingSafeEqual(bytesToBase64Url(actual), hashText);
  return { ok, needsRehash: ok && iterations < targetIterations };
}

let dummy: Promise<string> | null = null;

/**
 * Burn the same work as a real verification when the account does not exist, so
 * response time does not reveal which emails are registered.
 */
export async function verifyAgainstDummy(password: string, iterations: number): Promise<void> {
  dummy ??= hashPassword('medcore-timing-equalizer', iterations);
  await verifyPassword(password, await dummy, iterations);
}
