import { CreateStaffBody, UpdateStaffBody } from '@medcore/domain';
import { and, asc, eq, ne, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import type { AppBindings, AppContext } from '../context';
import type { Tx } from '../db/client';
import { facilities, staffUsers } from '../db/schema';
import { randomToken, sha256Hex } from '../lib/crypto';
import { ApiError, conflict, notFound } from '../lib/errors';
import { idParam } from '../lib/params';
import { requirePermission } from '../middleware/auth';
import { jsonBody } from '../middleware/http';
import { audit } from '../services/audit';
import { sendStaffInvite } from '../services/notify';
import { revokeStaffSessions } from '../services/sessions';
import { INVITE_TTL_MS, publicStaffUser } from '../services/staffAuth';

/** Staff administration (CFO only). Nobody can create an account with a known password. */
export const staffAdminRoutes = new Hono<AppBindings>();
staffAdminRoutes.use('*', requirePermission('staff:manage'));

async function facilityName(c: AppContext): Promise<string> {
  const [f] = await c.var.db.select({ name: facilities.name }).from(facilities).where(eq(facilities.id, c.var.staff.facilityId));
  return f?.name ?? 'your hospital';
}

async function lockStaff(c: AppContext, tx: Tx, id: string) {
  const [user] = await tx
    .select()
    .from(staffUsers)
    .where(and(eq(staffUsers.id, id), eq(staffUsers.facilityId, c.var.staff.facilityId)))
    .for('update');
  if (!user) throw notFound('Staff member');
  return user;
}

/** The facility must always keep at least one active administrator. */
async function assertAnotherActiveCfo(tx: Tx, facilityId: string, exceptId: string) {
  const [row] = await tx
    .select({ count: sql<number>`count(*)::int` })
    .from(staffUsers)
    .where(and(eq(staffUsers.facilityId, facilityId), eq(staffUsers.role, 'HOSPITAL_CFO'), eq(staffUsers.isActive, true), ne(staffUsers.id, exceptId)));
  if (!row || row.count === 0) throw conflict('LAST_ADMIN', 'The hospital needs at least one active CFO account.');
}

staffAdminRoutes.get('/', async (c) => {
  const rows = await c.var.db
    .select()
    .from(staffUsers)
    .where(eq(staffUsers.facilityId, c.var.staff.facilityId))
    .orderBy(asc(staffUsers.fullName));
  return c.json({
    items: rows.map((u) => ({ ...publicStaffUser(u), invitePending: Boolean(u.inviteTokenHash), lockedUntil: u.lockedUntil })),
  });
});

staffAdminRoutes.post('/', jsonBody(CreateStaffBody), async (c) => {
  const body = c.req.valid('json');
  const now = c.var.services.now();
  const token = randomToken(32);
  const id = await c.var.db.transaction(async (tx) => {
    const [existing] = await tx.select({ id: staffUsers.id }).from(staffUsers).where(eq(staffUsers.email, body.email));
    if (existing) throw conflict('EMAIL_IN_USE', 'A staff account with this email already exists.');
    const [user] = await tx
      .insert(staffUsers)
      .values({
        facilityId: c.var.staff.facilityId,
        email: body.email,
        fullName: body.fullName,
        role: body.role,
        title: body.title,
        prcLicense: body.prcLicense ?? null,
        inviteTokenHash: await sha256Hex(token),
        inviteExpiresAt: new Date(now.getTime() + INVITE_TTL_MS),
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: staffUsers.id });
    await audit(c, tx, { action: 'STAFF_INVITED', resourceType: 'staff_user', resourceId: user!.id, detail: { role: body.role } });
    return user!.id;
  });
  sendStaffInvite(c, body.email, body.fullName, token, await facilityName(c));
  return c.json({ id }, 201);
});

staffAdminRoutes.patch('/:id', jsonBody(UpdateStaffBody), async (c) => {
  const id = idParam(c, 'id', 'Staff member');
  const body = c.req.valid('json');
  const self = c.var.staff;
  const now = c.var.services.now();
  await c.var.db.transaction(async (tx) => {
    const user = await lockStaff(c, tx, id);
    if (id === self.id && (body.isActive === false || (body.role && body.role !== user.role))) {
      throw new ApiError(422, 'SELF_CHANGE', 'You cannot deactivate yourself or change your own role.');
    }
    const losingAdmin = user.role === 'HOSPITAL_CFO' && user.isActive && (body.isActive === false || (body.role && body.role !== 'HOSPITAL_CFO'));
    if (losingAdmin) await assertAnotherActiveCfo(tx, self.facilityId, id);
    await tx.update(staffUsers).set({ ...body, updatedAt: now }).where(eq(staffUsers.id, id));
    // A role change or deactivation takes effect immediately everywhere.
    if (body.isActive === false || (body.role && body.role !== user.role)) await revokeStaffSessions(tx, id, now);
    await audit(c, tx, {
      action: 'STAFF_UPDATED',
      resourceType: 'staff_user',
      resourceId: id,
      detail: { before: { role: user.role, title: user.title, isActive: user.isActive }, after: body },
    });
  });
  return c.json({ ok: true });
});

/** For a lost phone: clears MFA and signs the person out; they enroll again at next login. */
staffAdminRoutes.post('/:id/reset-mfa', async (c) => {
  const id = idParam(c, 'id', 'Staff member');
  const now = c.var.services.now();
  await c.var.db.transaction(async (tx) => {
    await lockStaff(c, tx, id);
    await tx
      .update(staffUsers)
      .set({ mfaSecretEnc: null, mfaPendingSecretEnc: null, mfaEnabledAt: null, mfaLastStep: null, updatedAt: now })
      .where(eq(staffUsers.id, id));
    await revokeStaffSessions(tx, id, now);
    await audit(c, tx, { action: 'STAFF_MFA_RESET', resourceType: 'staff_user', resourceId: id });
  });
  return c.json({ ok: true });
});

staffAdminRoutes.post('/:id/unlock', async (c) => {
  const id = idParam(c, 'id', 'Staff member');
  await c.var.db.transaction(async (tx) => {
    await lockStaff(c, tx, id);
    await tx.update(staffUsers).set({ lockedUntil: null, failedLoginCount: 0 }).where(eq(staffUsers.id, id));
    await audit(c, tx, { action: 'STAFF_UNLOCKED', resourceType: 'staff_user', resourceId: id });
  });
  return c.json({ ok: true });
});

/** Sends a fresh single-use link (also the password-reset path for staff). Old links stop working. */
staffAdminRoutes.post('/:id/send-invite', async (c) => {
  const id = idParam(c, 'id', 'Staff member');
  const now = c.var.services.now();
  const token = randomToken(32);
  const user = await c.var.db.transaction(async (tx) => {
    const target = await lockStaff(c, tx, id);
    if (!target.isActive) throw conflict('INACTIVE', 'Reactivate this account first.');
    await tx
      .update(staffUsers)
      .set({ inviteTokenHash: await sha256Hex(token), inviteExpiresAt: new Date(now.getTime() + INVITE_TTL_MS), updatedAt: now })
      .where(eq(staffUsers.id, id));
    await audit(c, tx, { action: 'STAFF_INVITE_SENT', resourceType: 'staff_user', resourceId: id });
    return target;
  });
  sendStaffInvite(c, user.email, user.fullName, token, await facilityName(c));
  return c.json({ ok: true });
});

/** Physicians a stay can be assigned to (used by the admission form). */
export const staffDirectoryRoutes = new Hono<AppBindings>();
staffDirectoryRoutes.get('/physicians', requirePermission('encounter:admit'), async (c) => {
  const rows = await c.var.db
    .select({ id: staffUsers.id, fullName: staffUsers.fullName, title: staffUsers.title })
    .from(staffUsers)
    .where(and(eq(staffUsers.facilityId, c.var.staff.facilityId), eq(staffUsers.role, 'ATTENDING_PHYSICIAN'), eq(staffUsers.isActive, true)))
    .orderBy(asc(staffUsers.fullName));
  return c.json({ items: rows });
});
