import { and, eq, isNull } from 'drizzle-orm';
import type { AppContext } from '../context';
import type { DbOrTx } from '../db/client';
import { authChallenges, staffRecoveryCodes, staffUsers } from '../db/schema';
import { randomFromAlphabet, randomToken, sha256Hex } from '../lib/crypto';
import { ApiError } from '../lib/errors';

export const MAX_FAILED_LOGINS = 5;
export const LOCKOUT_MS = 15 * 60 * 1000;
export const CHALLENGE_TTL_MS = 5 * 60 * 1000;
export const MAX_CHALLENGE_ATTEMPTS = 5;
export const RECOVERY_CODE_COUNT = 10;
export const INVITE_TTL_MS = 72 * 60 * 60 * 1000;

export const invalidCredentials = () =>
  new ApiError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect, or the account is temporarily locked.');

export const mfaSecretContext = (staffUserId: string) => `staff_users.mfa_secret:${staffUserId}`;

export type ChallengeKind = 'MFA_VERIFY' | 'MFA_ENROLL';

export async function issueChallenge(db: DbOrTx, staffUserId: string, kind: ChallengeKind, now: Date): Promise<string> {
  const token = randomToken(32);
  // One live challenge per user: older unconsumed ones stop working.
  await db
    .update(authChallenges)
    .set({ consumedAt: now })
    .where(and(eq(authChallenges.staffUserId, staffUserId), isNull(authChallenges.consumedAt)));
  await db.insert(authChallenges).values({
    tokenHash: await sha256Hex(token),
    staffUserId,
    kind,
    expiresAt: new Date(now.getTime() + CHALLENGE_TTL_MS),
    createdAt: now,
  });
  return token;
}

/** Loads and row-locks a live challenge. Must run inside a transaction. */
export async function lockChallenge(tx: DbOrTx, token: string, kind: ChallengeKind, now: Date) {
  const [challenge] = await tx
    .select()
    .from(authChallenges)
    .where(and(eq(authChallenges.tokenHash, await sha256Hex(token)), eq(authChallenges.kind, kind)))
    .limit(1)
    .for('update');
  if (
    !challenge ||
    challenge.consumedAt ||
    challenge.expiresAt <= now ||
    challenge.attempts >= MAX_CHALLENGE_ATTEMPTS
  ) {
    throw new ApiError(401, 'CHALLENGE_EXPIRED', 'This sign-in step expired. Please sign in again.');
  }
  const [user] = await tx.select().from(staffUsers).where(eq(staffUsers.id, challenge.staffUserId)).limit(1);
  if (!user || !user.isActive) {
    throw new ApiError(401, 'CHALLENGE_EXPIRED', 'This sign-in step expired. Please sign in again.');
  }
  return { challenge, user };
}

/** Records a wrong code; the challenge burns out after the attempt limit. */
export async function failChallenge(tx: DbOrTx, challengeId: string, attempts: number, now: Date): Promise<void> {
  const next = attempts + 1;
  await tx
    .update(authChallenges)
    .set({ attempts: next, consumedAt: next >= MAX_CHALLENGE_ATTEMPTS ? now : null })
    .where(eq(authChallenges.id, challengeId));
}

export async function consumeChallenge(tx: DbOrTx, challengeId: string, now: Date): Promise<void> {
  const consumed = await tx
    .update(authChallenges)
    .set({ consumedAt: now })
    .where(and(eq(authChallenges.id, challengeId), isNull(authChallenges.consumedAt)))
    .returning({ id: authChallenges.id });
  if (consumed.length !== 1) throw new ApiError(401, 'CHALLENGE_EXPIRED', 'This sign-in step expired. Please sign in again.');
}

// Recovery codes: no 0/O/1/I/L lookalikes. 12 chars from 31 symbols ≈ 59 bits.
const RECOVERY_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

const recoveryHash = (staffUserId: string, code: string) => sha256Hex(`recovery:${staffUserId}:${code.replace(/-/g, '')}`);

export async function replaceRecoveryCodes(db: DbOrTx, staffUserId: string, now: Date): Promise<string[]> {
  await db
    .update(staffRecoveryCodes)
    .set({ usedAt: now })
    .where(and(eq(staffRecoveryCodes.staffUserId, staffUserId), isNull(staffRecoveryCodes.usedAt)));
  const codes: string[] = [];
  for (let i = 0; i < RECOVERY_CODE_COUNT; i++) {
    const raw = randomFromAlphabet(RECOVERY_ALPHABET, 12);
    const code = `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8)}`;
    codes.push(code);
    await db.insert(staffRecoveryCodes).values({ staffUserId, codeHash: await recoveryHash(staffUserId, code), createdAt: now });
  }
  return codes;
}

/** Single-use: the code is marked used in the same statement that finds it. */
export async function useRecoveryCode(tx: DbOrTx, staffUserId: string, code: string, now: Date): Promise<boolean> {
  const used = await tx
    .update(staffRecoveryCodes)
    .set({ usedAt: now })
    .where(
      and(
        eq(staffRecoveryCodes.staffUserId, staffUserId),
        eq(staffRecoveryCodes.codeHash, await recoveryHash(staffUserId, code)),
        isNull(staffRecoveryCodes.usedAt),
      ),
    )
    .returning({ id: staffRecoveryCodes.id });
  return used.length === 1;
}

export function publicStaffUser(user: typeof staffUsers.$inferSelect) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    title: user.title,
    mfaEnabled: Boolean(user.mfaEnabledAt),
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt,
  };
}

export function requestMeta(c: AppContext) {
  return { ip: c.var.ip, userAgent: c.var.userAgent };
}
