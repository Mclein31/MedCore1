import { timingSafeEqualHex } from './gatePassService';
import { hashSessionToken as sha256Hex } from './authService';

/** Patient sign-in codes (AdvanCare ADV-AUTH-001, audit 2026-10-16 §4). */
export const CODE_TTL_MS = 10 * 60 * 1000;
export const MAX_CODE_ATTEMPTS = 5;
export const MAX_CODES_PER_HOUR = 5;
export const PATIENT_SESSION_MS = 30 * 24 * 60 * 60 * 1000;

export type OtpPurpose = 'LOGIN' | 'REGISTER';

/** Uniform 6-digit code (rejection sampling avoids modulo bias). */
export function generateCode(): string {
  const buf = new Uint32Array(1);
  for (;;) {
    crypto.getRandomValues(buf);
    if (buf[0]! < 4_294_000_000) return String(buf[0]! % 1_000_000).padStart(6, '0');
  }
}

/** Only this hash is stored. The purpose is part of it, so a REGISTER code can't log in. */
export const codeHash = (email: string, purpose: OtpPurpose, code: string) => sha256Hex(`${purpose}:${email}:${code}`);
export const codesMatch = timingSafeEqualHex;

/** "juan@gmail.com" → "j***@gmail.com". */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  return `${local?.[0] ?? '*'}***@${domain ?? ''}`;
}

/** A believable, stable mask for registration requests that match no patient (no oracle). */
export async function decoyMask(seed: string): Promise<string> {
  const hex = await sha256Hex(`decoy:${seed}`);
  return `${String.fromCharCode(97 + (parseInt(hex.slice(0, 2), 16) % 26))}***@gmail.com`;
}

/** Compares Philippine numbers regardless of spacing or +63 / 0 prefix. */
export function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  return digits.length === 12 && digits.startsWith('63') ? `0${digits.slice(2)}` : digits;
}
