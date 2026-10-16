import { can, type Permission } from '@medcore/domain';
import { and, eq } from 'drizzle-orm';
import type { MiddlewareHandler } from 'hono';
import type { AppBindings } from '../context';
import { patientAccounts, staffUsers } from '../db/schema';
import { ApiError, unauthenticated } from '../lib/errors';
import { readSessionCookie, resolveSession } from '../services/sessions';

/** Requires a live staff session (cookie only; staff never use bearer tokens). */
export const staffAuth: MiddlewareHandler<AppBindings> = async (c, next) => {
  const token = readSessionCookie(c, 'STAFF');
  if (!token) throw unauthenticated();
  const now = c.var.services.now();
  const session = await resolveSession(c.var.db, token, 'STAFF', now);
  if (!session?.staffUserId) throw unauthenticated();
  const [user] = await c.var.db
    .select()
    .from(staffUsers)
    .where(and(eq(staffUsers.id, session.staffUserId), eq(staffUsers.facilityId, session.facilityId)))
    .limit(1);
  // Deactivation takes effect on the very next request, not at session expiry.
  if (!user || !user.isActive) throw unauthenticated();
  c.set('staff', {
    kind: 'STAFF',
    id: user.id,
    facilityId: user.facilityId,
    role: user.role,
    email: user.email,
    fullName: user.fullName,
    sessionId: session.id,
  });
  await next();
};

export const requirePermission =
  (permission: Permission): MiddlewareHandler<AppBindings> =>
  async (c, next) => {
    const staff = c.get('staff');
    if (!staff) throw unauthenticated();
    if (!can(staff.role, permission)) {
      throw new ApiError(403, 'FORBIDDEN', 'Your role does not allow this action.');
    }
    await next();
  };

/** Patient session from the HttpOnly cookie (web) or a bearer token (mobile app). */
export const patientAuth: MiddlewareHandler<AppBindings> = async (c, next) => {
  const header = c.req.header('authorization');
  const bearer = header?.startsWith('Bearer ') ? header.slice(7).trim() : undefined;
  const token = bearer || readSessionCookie(c, 'PATIENT');
  if (!token) throw unauthenticated();
  const session = await resolveSession(c.var.db, token, 'PATIENT', c.var.services.now());
  if (!session?.patientAccountId) throw unauthenticated();
  const [account] = await c.var.db
    .select()
    .from(patientAccounts)
    .where(eq(patientAccounts.id, session.patientAccountId))
    .limit(1);
  if (!account || !account.isActive) throw unauthenticated();
  c.set('patient', {
    kind: 'PATIENT',
    accountId: account.id,
    facilityId: account.facilityId,
    email: account.email,
    sessionId: session.id,
  });
  await next();
};
