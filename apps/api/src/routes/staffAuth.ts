import {
  AcceptInviteBody,
  ChangePasswordBody,
  checkPassword,
  MfaEnrollConfirmBody,
  MfaEnrollStartBody,
  MfaVerifyBody,
  permissionsFor,
  SixDigitCode,
  StaffLoginBody,
} from '@medcore/domain';
import { and, eq, gt } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import type { AppBindings, AppContext } from '../context';
import { facilities, staffUsers } from '../db/schema';
import { sha256Hex } from '../lib/crypto';
import { ApiError, notFound } from '../lib/errors';
import { hashPassword, verifyAgainstDummy, verifyPassword } from '../lib/password';
import { generateTotpSecret, otpauthUri, verifyTotp } from '../lib/totp';
import { staffAuth } from '../middleware/auth';
import { jsonBody } from '../middleware/http';
import { audit } from '../services/audit';
import { enforce, LIMITS } from '../services/rateLimit';
import {
  clearSessionCookie,
  createSession,
  listLiveSessions,
  revokeSession,
  revokeStaffSessions,
  setSessionCookie,
} from '../services/sessions';
import {
  consumeChallenge,
  failChallenge,
  invalidCredentials,
  issueChallenge,
  LOCKOUT_MS,
  lockChallenge,
  MAX_FAILED_LOGINS,
  mfaSecretContext,
  publicStaffUser,
  replaceRecoveryCodes,
  useRecoveryCode,
} from '../services/staffAuth';

export const staffAuthRoutes = new Hono<AppBindings>();

async function startSession(c: AppContext, user: typeof staffUsers.$inferSelect) {
  const now = c.var.services.now();
  const session = await createSession(
    c.var.db,
    { kind: 'STAFF', staffUserId: user.id, facilityId: user.facilityId, ip: c.var.ip, userAgent: c.var.userAgent },
    now,
  );
  await c.var.db.update(staffUsers).set({ lastLoginAt: now }).where(eq(staffUsers.id, user.id));
  setSessionCookie(c, 'STAFF', session.token);
  return session;
}

staffAuthRoutes.post('/login', jsonBody(StaffLoginBody), async (c) => {
  const { email, password } = c.req.valid('json');
  const { config, now: clock } = c.var.services;
  await enforce(c, [
    [LIMITS.staffLoginIp, c.var.ip],
    [LIMITS.staffLoginEmail, email],
  ]);
  const now = clock();
  const [user] = await c.var.db.select().from(staffUsers).where(eq(staffUsers.email, email)).limit(1);

  if (!user || !user.passwordHash || !user.isActive || (user.lockedUntil && user.lockedUntil > now)) {
    // Same work and same answer whether the account is missing, inactive or locked.
    await verifyAgainstDummy(password, config.pbkdf2Iterations);
    await audit(c, c.var.db, {
      action: 'STAFF_LOGIN_FAILED',
      resourceType: 'staff_user',
      resourceId: user?.id ?? null,
      facilityId: user?.facilityId ?? null,
      detail: { reason: !user ? 'unknown_account' : !user.isActive ? 'inactive' : !user.passwordHash ? 'no_password' : 'locked' },
    });
    throw invalidCredentials();
  }

  const result = await verifyPassword(password, user.passwordHash, config.pbkdf2Iterations);
  if (!result.ok) {
    const failures = user.failedLoginCount + 1;
    const lock = failures >= MAX_FAILED_LOGINS;
    await c.var.db
      .update(staffUsers)
      .set({ failedLoginCount: lock ? 0 : failures, lockedUntil: lock ? new Date(now.getTime() + LOCKOUT_MS) : user.lockedUntil })
      .where(eq(staffUsers.id, user.id));
    await audit(c, c.var.db, {
      action: lock ? 'STAFF_ACCOUNT_LOCKED' : 'STAFF_LOGIN_FAILED',
      resourceType: 'staff_user',
      resourceId: user.id,
      facilityId: user.facilityId,
      detail: { reason: 'bad_password', failures },
    });
    throw invalidCredentials();
  }

  await c.var.db
    .update(staffUsers)
    .set({
      failedLoginCount: 0,
      lockedUntil: null,
      ...(result.needsRehash ? { passwordHash: await hashPassword(password, config.pbkdf2Iterations) } : {}),
    })
    .where(eq(staffUsers.id, user.id));

  if (user.mfaEnabledAt) {
    const challenge = await issueChallenge(c.var.db, user.id, 'MFA_VERIFY', now);
    return c.json({ status: 'MFA_REQUIRED' as const, challenge });
  }
  if (config.staffMfaRequired) {
    const challenge = await issueChallenge(c.var.db, user.id, 'MFA_ENROLL', now);
    return c.json({ status: 'MFA_ENROLLMENT_REQUIRED' as const, challenge });
  }
  await startSession(c, user);
  await audit(c, c.var.db, { action: 'STAFF_LOGIN', resourceType: 'staff_user', resourceId: user.id, facilityId: user.facilityId });
  return c.json({ status: 'SIGNED_IN' as const, user: publicStaffUser(user) });
});

staffAuthRoutes.post('/mfa/verify', jsonBody(MfaVerifyBody), async (c) => {
  const { challenge: token, code } = c.req.valid('json');
  await enforce(c, [[LIMITS.mfaVerify, c.var.ip]]);
  const { cipher, now: clock } = c.var.services;
  const now = clock();

  const outcome = await c.var.db.transaction(async (tx) => {
    const { challenge, user } = await lockChallenge(tx, token, 'MFA_VERIFY', now);
    let ok = false;
    if (/^\d{6}$/.test(code) && user.mfaSecretEnc) {
      const secret = await cipher.decrypt(user.mfaSecretEnc, mfaSecretContext(user.id));
      const step = await verifyTotp(secret, code, now, user.mfaLastStep);
      if (step !== null) {
        await tx.update(staffUsers).set({ mfaLastStep: step }).where(eq(staffUsers.id, user.id));
        ok = true;
      }
    } else if (!/^\d{6}$/.test(code)) {
      ok = await useRecoveryCode(tx, user.id, code, now);
      if (ok) await audit(c, tx, { action: 'STAFF_RECOVERY_CODE_USED', resourceType: 'staff_user', resourceId: user.id, facilityId: user.facilityId });
    }
    if (!ok) {
      await failChallenge(tx, challenge.id, challenge.attempts, now);
      return { ok: false as const };
    }
    await consumeChallenge(tx, challenge.id, now);
    return { ok: true as const, user };
  });

  if (!outcome.ok) throw new ApiError(401, 'CODE_INVALID', 'That code is not right. Check your authenticator app and try again.');
  await startSession(c, outcome.user);
  await audit(c, c.var.db, {
    action: 'STAFF_LOGIN',
    resourceType: 'staff_user',
    resourceId: outcome.user.id,
    facilityId: outcome.user.facilityId,
    detail: { mfa: true },
  });
  return c.json({ status: 'SIGNED_IN' as const, user: publicStaffUser(outcome.user) });
});

staffAuthRoutes.post('/mfa/enroll/start', jsonBody(MfaEnrollStartBody), async (c) => {
  const { challenge: token } = c.req.valid('json');
  await enforce(c, [[LIMITS.mfaVerify, c.var.ip]]);
  const { cipher, now: clock } = c.var.services;
  const now = clock();
  return c.var.db.transaction(async (tx) => {
    const { user } = await lockChallenge(tx, token, 'MFA_ENROLL', now);
    const [facility] = await tx.select({ name: facilities.name }).from(facilities).where(eq(facilities.id, user.facilityId));
    const secret = generateTotpSecret();
    await tx
      .update(staffUsers)
      .set({ mfaPendingSecretEnc: await cipher.encrypt(secret, mfaSecretContext(user.id)) })
      .where(eq(staffUsers.id, user.id));
    return c.json({ secret, otpauthUri: otpauthUri(secret, user.email, `MedCore ${facility?.name ?? ''}`.trim()) });
  });
});

staffAuthRoutes.post('/mfa/enroll/confirm', jsonBody(MfaEnrollConfirmBody), async (c) => {
  const { challenge: token, code } = c.req.valid('json');
  await enforce(c, [[LIMITS.mfaVerify, c.var.ip]]);
  const { cipher, now: clock } = c.var.services;
  const now = clock();

  const outcome = await c.var.db.transaction(async (tx) => {
    const { challenge, user } = await lockChallenge(tx, token, 'MFA_ENROLL', now);
    if (!user.mfaPendingSecretEnc) {
      throw new ApiError(409, 'ENROLLMENT_NOT_STARTED', 'Start authenticator setup first.');
    }
    const secret = await cipher.decrypt(user.mfaPendingSecretEnc, mfaSecretContext(user.id));
    const step = await verifyTotp(secret, code, now, null);
    if (step === null) {
      await failChallenge(tx, challenge.id, challenge.attempts, now);
      return { ok: false as const };
    }
    await consumeChallenge(tx, challenge.id, now);
    await tx
      .update(staffUsers)
      .set({ mfaSecretEnc: user.mfaPendingSecretEnc, mfaPendingSecretEnc: null, mfaEnabledAt: now, mfaLastStep: step })
      .where(eq(staffUsers.id, user.id));
    const recoveryCodes = await replaceRecoveryCodes(tx, user.id, now);
    await audit(c, tx, { action: 'STAFF_MFA_ENROLLED', resourceType: 'staff_user', resourceId: user.id, facilityId: user.facilityId });
    return { ok: true as const, user: { ...user, mfaEnabledAt: now }, recoveryCodes };
  });

  if (!outcome.ok) throw new ApiError(401, 'CODE_INVALID', 'That code is not right. Check the time on your phone and try again.');
  await startSession(c, outcome.user);
  return c.json({ status: 'SIGNED_IN' as const, user: publicStaffUser(outcome.user), recoveryCodes: outcome.recoveryCodes });
});

staffAuthRoutes.post('/accept-invite', jsonBody(AcceptInviteBody), async (c) => {
  const { token, password } = c.req.valid('json');
  await enforce(c, [[LIMITS.inviteAccept, c.var.ip]]);
  const { config, now: clock } = c.var.services;
  const now = clock();
  const [user] = await c.var.db
    .select()
    .from(staffUsers)
    .where(and(eq(staffUsers.inviteTokenHash, await sha256Hex(token)), gt(staffUsers.inviteExpiresAt, now)))
    .limit(1);
  if (!user || !user.isActive) throw new ApiError(410, 'INVITE_INVALID', 'This invitation link is invalid or has expired. Ask your administrator for a new one.');
  const policy = checkPassword(password, user);
  if (!policy.ok) throw new ApiError(422, 'WEAK_PASSWORD', policy.reason);
  await c.var.db.transaction(async (tx) => {
    await tx
      .update(staffUsers)
      .set({
        passwordHash: await hashPassword(password, config.pbkdf2Iterations),
        passwordChangedAt: now,
        inviteTokenHash: null,
        inviteExpiresAt: null,
        failedLoginCount: 0,
        lockedUntil: null,
        updatedAt: now,
      })
      .where(eq(staffUsers.id, user.id));
    // The same link doubles as an admin-issued password reset: end any old sessions.
    await revokeStaffSessions(tx, user.id, now);
    await audit(c, tx, { action: 'STAFF_INVITE_ACCEPTED', resourceType: 'staff_user', resourceId: user.id, facilityId: user.facilityId });
  });
  return c.json({ ok: true, email: user.email });
});

// ---------------------------------------------------------------- authenticated
staffAuthRoutes.use('/me', staffAuth);
staffAuthRoutes.use('/logout', staffAuth);
staffAuthRoutes.use('/sessions/*', staffAuth);
staffAuthRoutes.use('/sessions', staffAuth);
staffAuthRoutes.use('/password', staffAuth);
staffAuthRoutes.use('/mfa/recovery-codes', staffAuth);

staffAuthRoutes.get('/me', async (c) => {
  const staff = c.var.staff;
  const [user] = await c.var.db.select().from(staffUsers).where(eq(staffUsers.id, staff.id)).limit(1);
  const [facility] = await c.var.db
    .select({ id: facilities.id, code: facilities.code, name: facilities.name })
    .from(facilities)
    .where(eq(facilities.id, staff.facilityId));
  if (!user || !facility) throw notFound('Account');
  return c.json({ user: publicStaffUser(user), facility, permissions: permissionsFor(user.role) });
});

staffAuthRoutes.post('/logout', async (c) => {
  await revokeSession(c.var.db, c.var.staff.sessionId, c.var.services.now());
  await audit(c, c.var.db, { action: 'STAFF_LOGOUT', resourceType: 'staff_user', resourceId: c.var.staff.id });
  clearSessionCookie(c, 'STAFF');
  return c.json({ ok: true });
});

staffAuthRoutes.get('/sessions', async (c) => {
  const rows = await listLiveSessions(c.var.db, { staffUserId: c.var.staff.id }, c.var.services.now());
  return c.json({ items: rows.map((r) => ({ ...r, current: r.id === c.var.staff.sessionId })) });
});

staffAuthRoutes.post('/sessions/revoke-others', async (c) => {
  const count = await revokeStaffSessions(c.var.db, c.var.staff.id, c.var.services.now(), c.var.staff.sessionId);
  await audit(c, c.var.db, { action: 'STAFF_SESSIONS_REVOKED', resourceType: 'staff_user', resourceId: c.var.staff.id, detail: { count } });
  return c.json({ revoked: count });
});

staffAuthRoutes.post('/sessions/:id/revoke', async (c) => {
  const id = z.uuid().safeParse(c.req.param('id'));
  if (!id.success) throw notFound('Session');
  const sessions = await listLiveSessions(c.var.db, { staffUserId: c.var.staff.id }, c.var.services.now());
  if (!sessions.some((s) => s.id === id.data)) throw notFound('Session');
  await revokeSession(c.var.db, id.data, c.var.services.now());
  if (id.data === c.var.staff.sessionId) clearSessionCookie(c, 'STAFF');
  await audit(c, c.var.db, { action: 'STAFF_SESSION_REVOKED', resourceType: 'session', resourceId: id.data });
  return c.json({ ok: true });
});

staffAuthRoutes.post('/password', jsonBody(ChangePasswordBody), async (c) => {
  const { currentPassword, newPassword } = c.req.valid('json');
  const { config, now: clock } = c.var.services;
  await enforce(c, [[LIMITS.staffLoginEmail, c.var.staff.email]]);
  const [user] = await c.var.db.select().from(staffUsers).where(eq(staffUsers.id, c.var.staff.id)).limit(1);
  if (!user?.passwordHash) throw notFound('Account');
  const current = await verifyPassword(currentPassword, user.passwordHash, config.pbkdf2Iterations);
  if (!current.ok) throw new ApiError(401, 'INVALID_CREDENTIALS', 'Your current password is not right.');
  const policy = checkPassword(newPassword, user);
  if (!policy.ok) throw new ApiError(422, 'WEAK_PASSWORD', policy.reason);
  if (newPassword === currentPassword) throw new ApiError(422, 'WEAK_PASSWORD', 'Choose a password you have not used here.');
  const now = clock();
  await c.var.db.transaction(async (tx) => {
    await tx
      .update(staffUsers)
      .set({ passwordHash: await hashPassword(newPassword, config.pbkdf2Iterations), passwordChangedAt: now, updatedAt: now })
      .where(eq(staffUsers.id, user.id));
    // Anyone holding an old session (for example on a lost laptop) is signed out.
    await revokeStaffSessions(tx, user.id, now, c.var.staff.sessionId);
    await audit(c, tx, { action: 'STAFF_PASSWORD_CHANGED', resourceType: 'staff_user', resourceId: user.id });
  });
  return c.json({ ok: true });
});

staffAuthRoutes.post('/mfa/recovery-codes', jsonBody(z.strictObject({ code: SixDigitCode })), async (c) => {
  const { code } = c.req.valid('json');
  await enforce(c, [[LIMITS.mfaVerify, c.var.staff.id]]);
  const { cipher, now: clock } = c.var.services;
  const now = clock();
  const codes = await c.var.db.transaction(async (tx) => {
    const [user] = await tx.select().from(staffUsers).where(eq(staffUsers.id, c.var.staff.id)).limit(1).for('update');
    if (!user?.mfaSecretEnc) throw new ApiError(409, 'MFA_NOT_ENABLED', 'Set up an authenticator app first.');
    const step = await verifyTotp(await cipher.decrypt(user.mfaSecretEnc, mfaSecretContext(user.id)), code, now, user.mfaLastStep);
    if (step === null) throw new ApiError(401, 'CODE_INVALID', 'That code is not right.');
    await tx.update(staffUsers).set({ mfaLastStep: step }).where(eq(staffUsers.id, user.id));
    await audit(c, tx, { action: 'STAFF_RECOVERY_CODES_REGENERATED', resourceType: 'staff_user', resourceId: user.id });
    return replaceRecoveryCodes(tx, user.id, now);
  });
  return c.json({ recoveryCodes: codes });
});
