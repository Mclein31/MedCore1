import { and, eq } from 'drizzle-orm';
import type { DbOrTx } from '../db/client';
import { gatePasses } from '../db/schema';
import { hmacSha256, hmacSha256Hex, randomFromAlphabet, timingSafeEqual } from '../lib/crypto';

/**
 * Exit passes. A pass is a signed statement "this stay is settled", plus a 6-digit
 * PIN the patient shows at the lobby. Neither the PIN nor anything that reveals it
 * is stored: it is derived from the server secret and the pass id, so a database
 * leak cannot be used to walk out. Five wrong PINs void the pass.
 */
export const PASS_TTL_MS = 24 * 60 * 60 * 1000;
export const MAX_PIN_ATTEMPTS = 5;
const PASS_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export type GatePass = typeof gatePasses.$inferSelect;

function canonical(
  p: Pick<
    GatePass,
    | 'id'
    | 'facilityId'
    | 'passNumber'
    | 'encounterId'
    | 'settledCents'
    | 'financedCents'
    | 'issuedAt'
    | 'expiresAt'
  >,
) {
  return [
    'gate-pass:v1',
    p.facilityId,
    p.id,
    p.passNumber,
    p.encounterId,
    p.settledCents,
    p.financedCents,
    p.issuedAt.toISOString(),
    p.expiresAt.toISOString(),
  ].join('|');
}

export async function signPass(secret: string, pass: Parameters<typeof canonical>[0]): Promise<string> {
  return hmacSha256Hex(secret, canonical(pass));
}

export async function derivePin(secret: string, passId: string): Promise<string> {
  const mac = await hmacSha256(secret, `gate-pass-pin:v1:${passId}`);
  // 48 bits mod 10^6: bias below 1 in 10^8.
  let value = 0;
  for (let i = 0; i < 6; i++) value = value * 256 + mac[i]!;
  return String(value % 1_000_000).padStart(6, '0');
}

export async function issuePass(
  tx: DbOrTx,
  secret: string,
  input: { facilityId: string; encounterId: string; settledCents: number; financedCents: number },
  now: Date,
): Promise<GatePass> {
  const id = crypto.randomUUID();
  const draft = {
    id,
    facilityId: input.facilityId,
    encounterId: input.encounterId,
    passNumber: `GP-${randomFromAlphabet(PASS_ALPHABET, 10)}`,
    settledCents: input.settledCents,
    financedCents: input.financedCents,
    issuedAt: now,
    expiresAt: new Date(now.getTime() + PASS_TTL_MS),
  };
  const [row] = await tx
    .insert(gatePasses)
    .values({ ...draft, signature: await signPass(secret, draft) })
    .returning();
  return row!;
}

export type VerifyOutcome =
  | { result: 'VERIFIED'; pass: GatePass }
  | { result: 'WRONG_PIN'; attemptsLeft: number }
  | { result: 'VOIDED' | 'NOT_ACTIVE' | 'EXPIRED' | 'TAMPERED' | 'NOT_FOUND' };

/** Verify a pass at the lobby. Runs inside a transaction; locks the pass row. */
export async function verifyPass(
  tx: DbOrTx,
  secret: string,
  facilityId: string,
  passNumber: string,
  pin: string,
  verifierId: string,
  now: Date,
): Promise<VerifyOutcome> {
  const [pass] = await tx
    .select()
    .from(gatePasses)
    .where(and(eq(gatePasses.passNumber, passNumber), eq(gatePasses.facilityId, facilityId)))
    .limit(1)
    .for('update');
  if (!pass) return { result: 'NOT_FOUND' };
  if (pass.status !== 'ACTIVE') return { result: 'NOT_ACTIVE' };
  if (pass.expiresAt <= now) return { result: 'EXPIRED' };

  // Integrity before PIN: a row edited in the database fails here.
  if (!timingSafeEqual(pass.signature, await signPass(secret, pass))) {
    await tx
      .update(gatePasses)
      .set({ status: 'VOIDED', voidedReason: 'Signature mismatch' })
      .where(eq(gatePasses.id, pass.id));
    return { result: 'TAMPERED' };
  }

  if (!timingSafeEqual(pin, await derivePin(secret, pass.id))) {
    const attempts = pass.pinAttempts + 1;
    const voided = attempts >= MAX_PIN_ATTEMPTS;
    await tx
      .update(gatePasses)
      .set({
        pinAttempts: attempts,
        ...(voided ? { status: 'VOIDED' as const, voidedReason: 'Too many wrong PINs' } : {}),
      })
      .where(eq(gatePasses.id, pass.id));
    return voided ? { result: 'VOIDED' } : { result: 'WRONG_PIN', attemptsLeft: MAX_PIN_ATTEMPTS - attempts };
  }

  const [used] = await tx
    .update(gatePasses)
    .set({ status: 'USED', usedAt: now, verifiedBy: verifierId })
    .where(and(eq(gatePasses.id, pass.id), eq(gatePasses.status, 'ACTIVE')))
    .returning();
  return used ? { result: 'VERIFIED', pass: used } : { result: 'NOT_ACTIVE' };
}
