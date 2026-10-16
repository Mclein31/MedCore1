/**
 * Staff password policy (NIST SP 800-63B style): long, not common, not derived
 * from the account's own identity. No composition rules, no forced rotation.
 */
export const PASSWORD_MIN = 12;
export const PASSWORD_MAX = 128;

// The most-breached passwords and obvious local variants. The length rule already
// removes most of any public top-10k list; this catches the long ones.
const COMMON = new Set([
  'password1234',
  'password12345',
  'password123456',
  'passwordpassword',
  'qwertyuiop123',
  'qwertyuiopasdf',
  '123456789012',
  '1234567890123',
  '12345678901234',
  'iloveyou1234',
  'administrator',
  'administrator1',
  'welcome12345',
  'welcome123456',
  'letmein12345',
  'changeme1234',
  'changeme12345',
  'medcore12345',
  'medcore123456',
  'hospital1234',
  'hospital12345',
  'philhealth123',
  'philippines123',
  'qwerty123456',
  'abc123456789',
  '111111111111',
  '000000000000',
  'aaaaaaaaaaaa',
]);

export type PasswordCheck = { ok: true } | { ok: false; reason: string };

export function checkPassword(
  password: string,
  identity: { email: string; fullName?: string },
): PasswordCheck {
  if (password.length < PASSWORD_MIN)
    return { ok: false, reason: `Use at least ${PASSWORD_MIN} characters.` };
  if (password.length > PASSWORD_MAX) return { ok: false, reason: `Use at most ${PASSWORD_MAX} characters.` };
  const lower = password.toLowerCase();
  if (COMMON.has(lower))
    return { ok: false, reason: 'That password is too common. Try a short phrase of unrelated words.' };
  if (/^(.)\1+$/.test(password)) return { ok: false, reason: 'Avoid repeating one character.' };
  const local = identity.email.split('@')[0]?.toLowerCase() ?? '';
  if (local.length >= 4 && lower.includes(local))
    return { ok: false, reason: 'Do not include your email address.' };
  for (const part of (identity.fullName ?? '').toLowerCase().split(/\s+/)) {
    if (part.length >= 4 && lower.includes(part)) return { ok: false, reason: 'Do not include your name.' };
  }
  return { ok: true };
}
