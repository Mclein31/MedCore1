import { and, isNotNull, lt, or, sql } from 'drizzle-orm';
import type { Database } from '../db/client';
import { authChallenges, loginCodes, rateLimitBuckets, sessions } from '../db/schema';

/**
 * Data minimization (RA 10173): authentication artifacts are deleted once they
 * are useless. Financial and audit records are retained by design and never
 * touched here. Run hourly (Workers cron trigger, or any scheduler on Node).
 */
export async function purgeExpired(db: Database, now: Date) {
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const codes = await db
    .delete(loginCodes)
    .where(lt(loginCodes.expiresAt, dayAgo))
    .returning({ id: loginCodes.id });
  const challenges = await db
    .delete(authChallenges)
    .where(lt(authChallenges.expiresAt, dayAgo))
    .returning({ id: authChallenges.id });
  const buckets = await db
    .delete(rateLimitBuckets)
    .where(lt(rateLimitBuckets.windowStart, dayAgo))
    .returning({ key: rateLimitBuckets.key });
  // Keep ended sessions for 30 days so "where was I signed in" stays answerable.
  const ended = await db
    .delete(sessions)
    .where(
      and(
        or(
          lt(sessions.expiresAt, monthAgo),
          and(isNotNull(sessions.revokedAt), lt(sessions.revokedAt, monthAgo)),
        ),
        sql`true`,
      ),
    )
    .returning({ id: sessions.id });
  return {
    codes: codes.length,
    challenges: challenges.length,
    rateLimitBuckets: buckets.length,
    sessions: ended.length,
  };
}
