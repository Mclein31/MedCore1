import { sql } from 'drizzle-orm';
import type { AppContext } from '../context';
import type { DbOrTx } from '../db/client';
import { rateLimitBuckets } from '../db/schema';
import { sha256Hex } from '../lib/crypto';
import { rateLimited } from '../lib/errors';

/**
 * Fixed-window rate limiting stored in Postgres, so the limit holds across every
 * API instance and region (in-memory or edge-local counters do not). Keys are
 * hashed, so emails and IPs never sit in the table in clear.
 */
export interface LimitRule {
  name: string;
  limit: number;
  windowSeconds: number;
}

export const LIMITS = {
  staffLoginIp: { name: 'staff-login-ip', limit: 20, windowSeconds: 300 },
  staffLoginEmail: { name: 'staff-login-email', limit: 10, windowSeconds: 900 },
  mfaVerify: { name: 'mfa-verify', limit: 10, windowSeconds: 300 },
  codeRequestIp: { name: 'code-request-ip', limit: 10, windowSeconds: 600 },
  codeRequestIdentity: { name: 'code-request-identity', limit: 5, windowSeconds: 3600 },
  codeVerifyIp: { name: 'code-verify-ip', limit: 30, windowSeconds: 600 },
  gatePassVerify: { name: 'gate-pass-verify', limit: 30, windowSeconds: 300 },
  patientPayment: { name: 'patient-payment', limit: 10, windowSeconds: 600 },
  inviteAccept: { name: 'invite-accept', limit: 10, windowSeconds: 3600 },
} satisfies Record<string, LimitRule>;

export async function consume(
  db: DbOrTx,
  rule: LimitRule,
  subject: string,
  now: Date,
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const windowMs = rule.windowSeconds * 1000;
  const windowStart = new Date(Math.floor(now.getTime() / windowMs) * windowMs);
  const key = await sha256Hex(`${rule.name}:${subject}`);
  const [row] = await db
    .insert(rateLimitBuckets)
    .values({ key, windowStart, count: 1 })
    .onConflictDoUpdate({
      target: [rateLimitBuckets.key, rateLimitBuckets.windowStart],
      set: { count: sql`${rateLimitBuckets.count} + 1` },
    })
    .returning({ count: rateLimitBuckets.count });
  const retryAfterSeconds = Math.max(1, Math.ceil((windowStart.getTime() + windowMs - now.getTime()) / 1000));
  return { allowed: (row?.count ?? 0) <= rule.limit, retryAfterSeconds };
}

/** Consume every rule; throw 429 if any is exhausted. */
export async function enforce(c: AppContext, checks: [LimitRule, string | null | undefined][]): Promise<void> {
  const now = c.var.services.now();
  for (const [rule, subject] of checks) {
    if (!subject) continue;
    const result = await consume(c.var.db, rule, subject, now);
    if (!result.allowed) {
      c.var.services.logger.log('warn', 'rate limit hit', { rule: rule.name, requestId: c.var.requestId });
      throw rateLimited(result.retryAfterSeconds);
    }
  }
}
