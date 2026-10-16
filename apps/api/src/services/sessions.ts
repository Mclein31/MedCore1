import { and, eq, isNull, ne, sql } from 'drizzle-orm';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import type { AppContext } from '../context';
import type { DbOrTx } from '../db/client';
import { sessions } from '../db/schema';
import { randomToken, sha256Hex } from '../lib/crypto';

/**
 * Opaque server-side sessions. The client holds 256 random bits; the database
 * holds only their SHA-256, so a database leak does not yield usable sessions.
 * Every session has an absolute lifetime and an idle timeout, and is revoked
 * (never deleted) on logout, password change or deactivation.
 */
export const SESSION_POLICY = {
  STAFF: { absoluteMs: 8 * 60 * 60 * 1000, idleMs: 30 * 60 * 1000 },
  PATIENT: { absoluteMs: 30 * 24 * 60 * 60 * 1000, idleMs: 7 * 24 * 60 * 60 * 1000 },
} as const;

/** Do not write last_seen_at on every request; once a minute is enough for idle tracking. */
const TOUCH_INTERVAL_MS = 60 * 1000;

export type SessionKind = keyof typeof SESSION_POLICY;

export interface NewSession {
  kind: SessionKind;
  staffUserId?: string;
  patientAccountId?: string;
  facilityId: string;
  ip: string | null;
  userAgent: string | null;
}

export async function createSession(db: DbOrTx, input: NewSession, now: Date) {
  const token = randomToken(32);
  const policy = SESSION_POLICY[input.kind];
  const expiresAt = new Date(now.getTime() + policy.absoluteMs);
  const [row] = await db
    .insert(sessions)
    .values({
      tokenHash: await sha256Hex(token),
      principalType: input.kind,
      staffUserId: input.staffUserId ?? null,
      patientAccountId: input.patientAccountId ?? null,
      facilityId: input.facilityId,
      ip: input.ip,
      userAgent: input.userAgent,
      createdAt: now,
      lastSeenAt: now,
      idleExpiresAt: new Date(Math.min(now.getTime() + policy.idleMs, expiresAt.getTime())),
      expiresAt,
    })
    .returning({ id: sessions.id });
  return { token, id: row!.id, expiresAt };
}

export interface ActiveSession {
  id: string;
  staffUserId: string | null;
  patientAccountId: string | null;
  facilityId: string;
}

/** Returns the live session for a token, sliding its idle window, or null. */
export async function resolveSession(db: DbOrTx, token: string, kind: SessionKind, now: Date): Promise<ActiveSession | null> {
  if (!token || token.length > 128) return null;
  const [row] = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.tokenHash, await sha256Hex(token)), eq(sessions.principalType, kind)))
    .limit(1);
  if (!row || row.revokedAt || row.expiresAt <= now || row.idleExpiresAt <= now) return null;

  if (now.getTime() - row.lastSeenAt.getTime() > TOUCH_INTERVAL_MS) {
    const idle = Math.min(now.getTime() + SESSION_POLICY[kind].idleMs, row.expiresAt.getTime());
    await db
      .update(sessions)
      .set({ lastSeenAt: now, idleExpiresAt: new Date(idle) })
      .where(eq(sessions.id, row.id));
  }
  return { id: row.id, staffUserId: row.staffUserId, patientAccountId: row.patientAccountId, facilityId: row.facilityId };
}

export async function revokeSession(db: DbOrTx, sessionId: string, now: Date): Promise<void> {
  await db.update(sessions).set({ revokedAt: now }).where(and(eq(sessions.id, sessionId), isNull(sessions.revokedAt)));
}

/** Revoke every live session of a staff user, optionally keeping the current one. */
export async function revokeStaffSessions(db: DbOrTx, staffUserId: string, now: Date, keepSessionId?: string) {
  const conditions = [eq(sessions.staffUserId, staffUserId), isNull(sessions.revokedAt)];
  if (keepSessionId) conditions.push(ne(sessions.id, keepSessionId));
  const revoked = await db
    .update(sessions)
    .set({ revokedAt: now })
    .where(and(...conditions))
    .returning({ id: sessions.id });
  return revoked.length;
}

export async function revokePatientSessions(db: DbOrTx, accountId: string, now: Date) {
  await db
    .update(sessions)
    .set({ revokedAt: now })
    .where(and(eq(sessions.patientAccountId, accountId), isNull(sessions.revokedAt)));
}

export async function listLiveSessions(db: DbOrTx, where: { staffUserId: string }, now: Date) {
  return db
    .select({
      id: sessions.id,
      ip: sessions.ip,
      userAgent: sessions.userAgent,
      createdAt: sessions.createdAt,
      lastSeenAt: sessions.lastSeenAt,
      expiresAt: sessions.expiresAt,
    })
    .from(sessions)
    .where(
      and(
        eq(sessions.staffUserId, where.staffUserId),
        isNull(sessions.revokedAt),
        sql`${sessions.expiresAt} > ${now}`,
        sql`${sessions.idleExpiresAt} > ${now}`,
      ),
    )
    .orderBy(sql`${sessions.lastSeenAt} desc`);
}

// ---------------------------------------------------------------- cookies
export function cookieName(c: AppContext, kind: SessionKind): string {
  return kind === 'STAFF' ? c.var.services.config.cookies.staff : c.var.services.config.cookies.patient;
}

export function setSessionCookie(c: AppContext, kind: SessionKind, token: string): void {
  setCookie(c, cookieName(c, kind), token, {
    httpOnly: true,
    secure: c.var.services.config.cookies.secure,
    sameSite: 'Strict',
    path: '/',
    // A browser cookie never outlives the absolute session lifetime.
    maxAge: Math.floor(SESSION_POLICY[kind].absoluteMs / 1000),
  });
}

export function clearSessionCookie(c: AppContext, kind: SessionKind): void {
  deleteCookie(c, cookieName(c, kind), { path: '/', secure: c.var.services.config.cookies.secure });
}

export function readSessionCookie(c: AppContext, kind: SessionKind): string | undefined {
  return getCookie(c, cookieName(c, kind));
}
