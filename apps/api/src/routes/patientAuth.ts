import { PatientCodeRequestBody, PatientCodeVerifyBody } from '@medcore/domain';
import { and, desc, eq, gt, isNull, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import type { AppBindings, AppContext } from '../context';
import type { DbOrTx } from '../db/client';
import { facilities, loginCodes, patientAccountLinks, patientAccounts, patients } from '../db/schema';
import { bytesToBase64Url, hmacSha256Hex, randomDigits, timingSafeEqual } from '../lib/crypto';
import { ApiError } from '../lib/errors';
import { patientAuth } from '../middleware/auth';
import { jsonBody } from '../middleware/http';
import { audit } from '../services/audit';
import { sendSignInCode } from '../services/notify';
import { enforce, LIMITS } from '../services/rateLimit';
import { clearSessionCookie, createSession, revokeSession, setSessionCookie } from '../services/sessions';

/**
 * Patients sign in with a 6-digit code emailed to the address the hospital
 * recorded at admission. The caller never chooses where the code goes, which
 * is what proves possession. Responses are identical whether or not the details
 * matched, so this endpoint cannot be used to discover who is a patient.
 */
export const CODE_TTL_MS = 10 * 60 * 1000;
export const MAX_CODE_ATTEMPTS = 5;
export const MAX_CODES_PER_HOUR = 5;

export const patientAuthRoutes = new Hono<AppBindings>();

/** Codes are stored as a keyed HMAC, so a database leak cannot be brute-forced offline. */
function codeHash(c: AppContext, facilityId: string, email: string, purpose: string, code: string) {
  const key = `login-code:v1:${bytesToBase64Url(c.var.services.config.dataEncryptionKey)}`;
  return hmacSha256Hex(key, `${facilityId}|${email}|${purpose}|${code}`);
}

async function findFacility(db: DbOrTx, code: string) {
  const [facility] = await db.select().from(facilities).where(eq(facilities.code, code)).limit(1);
  return facility ?? null;
}

async function findPatientByIdentity(db: DbOrTx, facilityId: string, mrn: string, dateOfBirth: string) {
  const [patient] = await db
    .select()
    .from(patients)
    .where(and(eq(patients.facilityId, facilityId), eq(patients.mrn, mrn), eq(patients.dateOfBirth, dateOfBirth)))
    .limit(1);
  return patient ?? null;
}

const GENERIC_SENT = {
  sent: true,
  expiresInMinutes: CODE_TTL_MS / 60_000,
  message: 'If the details match our records, we emailed a 6-digit code to the address the hospital has on file.',
};

patientAuthRoutes.post('/code/request', jsonBody(PatientCodeRequestBody), async (c) => {
  const body = c.req.valid('json');
  const identity = body.purpose === 'LOGIN' ? `email:${body.facilityCode}:${body.email}` : `mrn:${body.facilityCode}:${body.mrn}`;
  await enforce(c, [
    [LIMITS.codeRequestIp, c.var.ip],
    [LIMITS.codeRequestIdentity, identity],
  ]);
  const db = c.var.db;
  const now = c.var.services.now();
  const facility = await findFacility(db, body.facilityCode);
  if (!facility) return c.json(GENERIC_SENT, 202);

  let email: string | null = null;
  let patientId: string | null = null;
  if (body.purpose === 'LOGIN') {
    const [account] = await db
      .select({ id: patientAccounts.id })
      .from(patientAccounts)
      .where(
        and(
          eq(patientAccounts.facilityId, facility.id),
          eq(patientAccounts.email, body.email),
          eq(patientAccounts.isActive, true),
          sql`exists (select 1 from ${patientAccountLinks} where ${patientAccountLinks.accountId} = ${patientAccounts.id} and ${patientAccountLinks.revokedAt} is null)`,
        ),
      )
      .limit(1);
    if (account) email = body.email;
  } else {
    const patient = await findPatientByIdentity(db, facility.id, body.mrn, body.dateOfBirth);
    if (patient?.email) {
      email = patient.email;
      patientId = patient.id;
    }
  }
  if (!email) {
    await audit(c, db, { action: 'PATIENT_CODE_REQUEST_UNMATCHED', resourceType: 'login_code', facilityId: facility.id, detail: { purpose: body.purpose } });
    return c.json(GENERIC_SENT, 202);
  }

  const [recent] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(loginCodes)
    .where(
      and(
        eq(loginCodes.facilityId, facility.id),
        eq(loginCodes.email, email),
        gt(loginCodes.createdAt, new Date(now.getTime() - 60 * 60 * 1000)),
      ),
    );
  if ((recent?.count ?? 0) >= MAX_CODES_PER_HOUR) return c.json(GENERIC_SENT, 202);

  const code = randomDigits(6);
  const hash = await codeHash(c, facility.id, email, body.purpose, code);
  await db.transaction(async (tx) => {
    // Only the newest code works.
    await tx
      .update(loginCodes)
      .set({ consumedAt: now })
      .where(and(eq(loginCodes.facilityId, facility.id), eq(loginCodes.email, email!), isNull(loginCodes.consumedAt)));
    await tx.insert(loginCodes).values({
      facilityId: facility.id,
      email: email!,
      purpose: body.purpose,
      patientId,
      codeHash: hash,
      expiresAt: new Date(now.getTime() + CODE_TTL_MS),
      createdAt: now,
    });
    await audit(c, tx, { action: 'PATIENT_CODE_SENT', resourceType: 'login_code', facilityId: facility.id, detail: { purpose: body.purpose } });
  });
  sendSignInCode(c, email, code, facility.name);
  return c.json(GENERIC_SENT, 202);
});

const invalidCode = () => new ApiError(401, 'CODE_INVALID', 'That code is not right or has expired. Request a new one.');

patientAuthRoutes.post('/code/verify', jsonBody(PatientCodeVerifyBody), async (c) => {
  const body = c.req.valid('json');
  await enforce(c, [[LIMITS.codeVerifyIp, c.var.ip]]);
  const db = c.var.db;
  const now = c.var.services.now();
  const facility = await findFacility(db, body.facilityCode);
  if (!facility) throw invalidCode();

  let email: string;
  let patientId: string | null = null;
  if (body.purpose === 'LOGIN') {
    email = body.email;
  } else {
    const patient = await findPatientByIdentity(db, facility.id, body.mrn, body.dateOfBirth);
    if (!patient?.email) throw invalidCode();
    email = patient.email;
    patientId = patient.id;
  }

  const outcome = await db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(loginCodes)
      .where(
        and(
          eq(loginCodes.facilityId, facility.id),
          eq(loginCodes.email, email),
          eq(loginCodes.purpose, body.purpose),
          isNull(loginCodes.consumedAt),
          gt(loginCodes.expiresAt, now),
        ),
      )
      .orderBy(desc(loginCodes.createdAt))
      .limit(1)
      .for('update');
    if (!row) return { ok: false as const };
    // A REGISTER code is bound to the patient it was issued for.
    if (body.purpose === 'REGISTER' && row.patientId !== patientId) return { ok: false as const };

    const expected = await codeHash(c, facility.id, email, body.purpose, body.code);
    if (!timingSafeEqual(row.codeHash, expected)) {
      const attempts = row.attempts + 1;
      await tx
        .update(loginCodes)
        .set({ attempts, consumedAt: attempts >= MAX_CODE_ATTEMPTS ? now : null })
        .where(eq(loginCodes.id, row.id));
      return { ok: false as const, locked: attempts >= MAX_CODE_ATTEMPTS };
    }
    // Race-safe single use: only one concurrent verify can flip consumed_at.
    const consumed = await tx
      .update(loginCodes)
      .set({ consumedAt: now })
      .where(and(eq(loginCodes.id, row.id), isNull(loginCodes.consumedAt)))
      .returning({ id: loginCodes.id });
    if (consumed.length !== 1) return { ok: false as const };

    let [account] = await tx
      .select()
      .from(patientAccounts)
      .where(and(eq(patientAccounts.facilityId, facility.id), eq(patientAccounts.email, email)))
      .limit(1);
    if (body.purpose === 'REGISTER') {
      account ??= (
        await tx.insert(patientAccounts).values({ facilityId: facility.id, email, createdAt: now }).returning()
      )[0];
      const [link] = await tx
        .select({ id: patientAccountLinks.id })
        .from(patientAccountLinks)
        .where(and(eq(patientAccountLinks.accountId, account!.id), eq(patientAccountLinks.patientId, patientId!), isNull(patientAccountLinks.revokedAt)));
      if (!link) {
        await tx.insert(patientAccountLinks).values({ accountId: account!.id, patientId: patientId!, verifiedVia: 'EMAIL_CODE', verifiedAt: now });
      }
    }
    if (!account || !account.isActive) return { ok: false as const };
    await tx.update(patientAccounts).set({ lastLoginAt: now }).where(eq(patientAccounts.id, account.id));
    const session = await createSession(tx, { kind: 'PATIENT', patientAccountId: account.id, facilityId: facility.id, ip: c.var.ip, userAgent: c.var.userAgent }, now);
    return { ok: true as const, account, session };
  });

  if (!outcome.ok) {
    await audit(c, db, { action: 'PATIENT_CODE_REJECTED', resourceType: 'login_code', facilityId: facility.id, detail: { purpose: body.purpose, locked: Boolean(outcome.locked) } });
    if (outcome.locked) throw new ApiError(401, 'CODE_LOCKED', 'Too many wrong tries. Request a new code.');
    throw invalidCode();
  }
  c.set('patient', { kind: 'PATIENT', accountId: outcome.account.id, facilityId: facility.id, email, sessionId: outcome.session.id });
  await audit(c, db, { action: body.purpose === 'REGISTER' ? 'PATIENT_REGISTERED_ACCOUNT' : 'PATIENT_LOGIN', resourceType: 'patient_account', resourceId: outcome.account.id });

  if (body.client === 'mobile') {
    // Native apps keep the bearer token in the OS keychain; browsers never see it.
    return c.json({ status: 'SIGNED_IN', token: outcome.session.token, expiresAt: outcome.session.expiresAt });
  }
  setSessionCookie(c, 'PATIENT', outcome.session.token);
  return c.json({ status: 'SIGNED_IN' });
});

patientAuthRoutes.get('/me', patientAuth, async (c) => {
  const p = c.var.patient;
  const [facility] = await c.var.db.select({ name: facilities.name, code: facilities.code }).from(facilities).where(eq(facilities.id, p.facilityId));
  return c.json({ email: p.email, facility });
});

patientAuthRoutes.post('/logout', patientAuth, async (c) => {
  await revokeSession(c.var.db, c.var.patient.sessionId, c.var.services.now());
  await audit(c, c.var.db, { action: 'PATIENT_LOGOUT', resourceType: 'patient_account', resourceId: c.var.patient.accountId });
  clearSessionCookie(c, 'PATIENT');
  return c.json({ ok: true });
});
