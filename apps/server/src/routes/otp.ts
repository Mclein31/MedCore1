import { Hono, type Context } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { setCookie } from 'hono/cookie';
import { and, count, desc, eq, gt, isNull, sql } from 'drizzle-orm';
import { db } from '../db';
import { facilities, loginCodes, patientAccountLinks, patients, systemAuditLogs, users, userSessions } from '../db/schema';
import { generateSessionToken, hashSessionToken } from '../services/authService';
import { MailError, mailConfigured, sendMail, type MailEnv } from '../services/mailer';
import {
  CODE_TTL_MS, MAX_CODE_ATTEMPTS, MAX_CODES_PER_HOUR, PATIENT_SESSION_MS,
  codeHash, codesMatch, decoyMask, generateCode, maskEmail, normalizePhone, type OtpPurpose
} from '../services/otp';
import { apiError } from '../middleware/error';
import { getClientIp } from '../utils/clientIp';
import { mobileDemoCapability } from '../services/mobileDemoAccess';

/**
 * Patient sign-in with a 6-digit email code (port of AdvanCare `routes/auth.ts`, audit §4).
 * REGISTER proves possession: the code goes to the address the hospital recorded at admission,
 * never to one the caller chooses. LOGIN only sends to a guarantor with a live patient link.
 */
const otpApp = new Hono();

const Email = z.string().trim().toLowerCase().email('Enter a valid email address.').max(255);
const Otp = z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code.');
const FacilityCode = z.string().trim().max(32).default('SJMC-MNL');
const Identity = { mrn: z.string().trim().min(2).max(64), contactNumber: z.string().trim().min(4).max(32), facilityCode: FacilityCode };

const requestSchema = z.discriminatedUnion('purpose', [
  z.object({ purpose: z.literal('LOGIN'), email: Email, facilityCode: FacilityCode }).strict(),
  z.object({ purpose: z.literal('REGISTER'), ...Identity }).strict()
]);
const verifySchema = z.discriminatedUnion('purpose', [
  z.object({ purpose: z.literal('LOGIN'), email: Email, otp: Otp, facilityCode: FacilityCode }).strict(),
  z.object({ purpose: z.literal('REGISTER'), ...Identity, otp: Otp }).strict()
]);

type Fail = { status: 401 | 403 | 409 | 429 | 502 | 503; code: string; message: string };
class OtpFailure extends Error { constructor(public fail: Fail) { super(fail.code); } }
const wrong = (): Fail => ({ status: 401, code: 'CODE_INVALID', message: 'That code is wrong or has expired. Check the newest email, or ask for a new code.' });

function runtimeEnv(c: Context): MailEnv & { PATIENT_AUTH_LIMITER?: { limit: (o: { key: string }) => Promise<{ success: boolean }> } } {
  const processEnv = typeof process !== 'undefined' ? process.env : {};
  return { ...processEnv, ...((c.env as object) || {}) } as never;
}
const isProduction = (c: Context) => (runtimeEnv(c).NODE_ENV || 'production') === 'production';

/** Optional Workers rate limiter (per IP and per identity); the DB hourly cap always applies. */
async function limit(c: Context, keys: string[]) {
  const limiter = runtimeEnv(c).PATIENT_AUTH_LIMITER;
  if (!limiter) return;
  for (const key of [`ip:${getClientIp(c)}`, ...keys]) {
    if (!(await limiter.limit({ key: `patient-auth:${key}` })).success) {
      throw new OtpFailure({ status: 429, code: 'RATE_LIMITED', message: 'Too many tries. Please wait a minute and try again.' });
    }
  }
}

async function findFacility(code: string) {
  const [facility] = await db.select().from(facilities).where(eq(facilities.code, code)).limit(1);
  return facility ?? null;
}

/** The patient behind an MRN + registered contact number, or null. */
async function findPatient(facilityId: string, mrn: string, contactNumber: string) {
  const [patient] = await db.select().from(patients).where(and(eq(patients.facilityId, facilityId), eq(patients.mrn, mrn))).limit(1);
  if (!patient || !patient.contactNumber || normalizePhone(patient.contactNumber) !== normalizePhone(contactNumber)) return null;
  return patient;
}

/** An active guarantor login with at least one live patient link. */
async function findLinkedGuarantor(facilityId: string, email: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(and(
      sql`lower(${users.email}) = ${email}`,
      eq(users.facilityId, facilityId),
      eq(users.role, 'PATIENT_GUARANTOR'),
      sql`exists (select 1 from ${patientAccountLinks} where ${patientAccountLinks.userId} = ${users.id} and ${patientAccountLinks.revokedAt} is null)`
    ))
    .limit(1);
  return user ?? null;
}

function fail(c: Context, f: Fail) {
  return apiError(c, f.status, f.code, f.message);
}

otpApp.post('/request', zValidator('json', requestSchema), async (c) => {
  const body = c.req.valid('json');
  try {
    await limit(c, body.purpose === 'LOGIN' ? [`email:${body.email}`] : [`mrn:${body.mrn}`]);
    const facility = await findFacility(body.facilityCode);
    if (!facility) return apiError(c, 404, 'FACILITY_NOT_FOUND', `Facility ${body.facilityCode} does not exist.`);
    const env = runtimeEnv(c);
    const devNote = env.NODE_ENV === 'development' && !mailConfigured(env)
      ? { devNote: 'Development: the code was written to the API log instead of emailed.' } : {};

    let recipient: string | null = null;
    let patientId: string | null = null;
    let sentTo: string | undefined;
    if (body.purpose === 'LOGIN') {
      recipient = (await findLinkedGuarantor(facility.id, body.email)) ? body.email : null;
    } else {
      const patient = await findPatient(facility.id, body.mrn, body.contactNumber);
      if (patient && !patient.email) {
        return c.json({ sent: false, code: 'EMAIL_NOT_ON_FILE', message: 'Please visit the hospital billing desk to add your email address, then try again.' }, 200);
      }
      recipient = patient?.email?.trim().toLowerCase() ?? null;
      patientId = patient?.id ?? null;
      sentTo = recipient ? maskEmail(recipient) : await decoyMask(`${facility.id}:${body.mrn}:${normalizePhone(body.contactNumber)}`);
    }
    const accepted = () => c.json({ sent: true, expiresInMinutes: CODE_TTL_MS / 60000, ...(sentTo ? { sentTo } : {}), ...devNote }, 202);
    // Same response whether or not anyone matched, so the endpoint is not an account oracle.
    if (!recipient) return accepted();

    const [recent] = await db
      .select({ n: count() })
      .from(loginCodes)
      .where(and(sql`lower(${loginCodes.email}) = ${recipient}`, gt(loginCodes.createdAt, new Date(Date.now() - 3600_000))));
    if ((recent?.n ?? 0) >= MAX_CODES_PER_HOUR) {
      return fail(c, { status: 429, code: 'TOO_MANY_CODES', message: 'You’ve asked for several codes already. Use the newest email, or try again in an hour.' });
    }

    const code = generateCode();
    const now = new Date();
    const purpose: OtpPurpose = body.purpose;
    const row = await db.transaction(async (tx) => {
      // Only the newest code works.
      await tx.update(loginCodes).set({ consumedAt: now }).where(and(sql`lower(${loginCodes.email}) = ${recipient}`, isNull(loginCodes.consumedAt)));
      const [inserted] = await tx
        .insert(loginCodes)
        .values({ facilityId: facility.id, email: recipient!, purpose, patientId, codeHash: await codeHash(recipient!, purpose, code), expiresAt: new Date(now.getTime() + CODE_TTL_MS), ip: getClientIp(c) })
        .returning({ id: loginCodes.id });
      return inserted!;
    });

    try {
      // No bill amounts, diagnoses or MRNs in the email (AdvanCare lib/notify.ts).
      await sendMail(env, {
        to: recipient,
        subject: `${code} is your MedCore code`,
        text: `Your MedCore sign-in code is ${code}\n\nIt works once and expires in 10 minutes.\nIf you didn’t ask for this code, you can ignore this email. Never share the code with anyone, including hospital staff.`,
        html: `<div style="font-family:Arial,sans-serif;color:#0f2a3d;max-width:420px"><p>Your MedCore sign-in code is</p><p style="font-size:32px;font-weight:700;letter-spacing:6px;margin:8px 0">${code}</p><p>It works once and expires in 10 minutes.</p><p style="color:#5b6b78;font-size:13px">If you didn’t ask for this code, you can ignore this email. Never share the code with anyone, including hospital staff.</p></div>`
      });
    } catch (err) {
      // A failed email must not leave a usable code.
      await db.update(loginCodes).set({ consumedAt: new Date() }).where(eq(loginCodes.id, row.id));
      if (err instanceof MailError) return err.status === 422 ? wrongAddress(c) : fail(c, { status: err.status, code: err.code, message: err.message });
      throw err;
    }
    return accepted();
  } catch (err) {
    if (err instanceof OtpFailure) return fail(c, err.fail);
    throw err;
  }
});

// The recorded address is malformed; the desk has to fix it.
const wrongAddress = (c: Context) => c.json({ sent: false, code: 'EMAIL_NOT_ON_FILE', message: 'Please visit the hospital billing desk to update your email address, then try again.' }, 200);

otpApp.post('/verify', zValidator('json', verifySchema), async (c) => {
  const body = c.req.valid('json');
  try {
    await limit(c, body.purpose === 'LOGIN' ? [`email:${body.email}`] : [`mrn:${body.mrn}`]);
    const facility = await findFacility(body.facilityCode);
    if (!facility) return apiError(c, 404, 'FACILITY_NOT_FOUND', `Facility ${body.facilityCode} does not exist.`);

    let email: string;
    let patient: typeof patients.$inferSelect | null = null;
    if (body.purpose === 'LOGIN') {
      email = body.email;
    } else {
      patient = await findPatient(facility.id, body.mrn, body.contactNumber);
      if (!patient?.email) return fail(c, wrong());
      email = patient.email.trim().toLowerCase();
    }

    const [code] = await db
      .select()
      .from(loginCodes)
      .where(and(
        sql`lower(${loginCodes.email}) = ${email}`,
        eq(loginCodes.facilityId, facility.id),
        eq(loginCodes.purpose, body.purpose),
        isNull(loginCodes.consumedAt),
        gt(loginCodes.expiresAt, new Date()),
        ...(patient ? [eq(loginCodes.patientId, patient.id)] : [])
      ))
      .orderBy(desc(loginCodes.createdAt))
      .limit(1);
    if (!code) return fail(c, wrong());
    if (code.attempts >= MAX_CODE_ATTEMPTS) {
      await db.update(loginCodes).set({ consumedAt: new Date() }).where(eq(loginCodes.id, code.id));
      return fail(c, { status: 401, code: 'CODE_LOCKED', message: 'Too many wrong tries. Ask for a new code.' });
    }
    if (!codesMatch(await codeHash(email, body.purpose, body.otp), code.codeHash)) {
      await db.update(loginCodes).set({ attempts: sql`${loginCodes.attempts} + 1` }).where(eq(loginCodes.id, code.id));
      return fail(c, wrong());
    }

    const ip = getClientIp(c);
    const userAgent = c.req.header('user-agent')?.slice(0, 255) ?? null;
    const result = await db.transaction(async (tx) => {
      // Conditional consume: two parallel verifications can't both succeed.
      const [claimed] = await tx
        .update(loginCodes)
        .set({ consumedAt: new Date() })
        .where(and(eq(loginCodes.id, code.id), isNull(loginCodes.consumedAt)))
        .returning({ id: loginCodes.id });
      if (!claimed) throw new OtpFailure(wrong());

      const [existing] = await tx.select().from(users).where(sql`lower(${users.email}) = ${email}`).limit(1);
      let user = existing ?? null;
      let action: 'PATIENT_OTP_LOGIN' | 'PATIENT_REGISTERED' = 'PATIENT_OTP_LOGIN';
      if (body.purpose === 'LOGIN') {
        if (!user || user.role !== 'PATIENT_GUARANTOR' || user.facilityId !== facility.id) throw new OtpFailure(wrong());
      } else {
        if (user && (user.role !== 'PATIENT_GUARANTOR' || user.facilityId !== facility.id)) {
          throw new OtpFailure({ status: 409, code: 'USER_EXISTS', message: 'This email belongs to a staff account. Please contact the billing desk.' });
        }
        if (!user) {
          [user] = await tx.insert(users).values(await newGuarantor(facility.id, email, patient!, tx)).returning();
          action = 'PATIENT_REGISTERED';
        }
        await tx.insert(patientAccountLinks).values({ userId: user!.id, patientId: patient!.id, verifiedVia: 'EMAIL_OTP' }).onConflictDoNothing();
      }
      if (!user!.isActive) throw new OtpFailure({ status: 403, code: 'ACCOUNT_DISABLED', message: 'This account is turned off. Please contact the hospital billing desk.' });

      const token = generateSessionToken();
      const expiresAt = new Date(Date.now() + PATIENT_SESSION_MS);
      await tx.insert(userSessions).values({ userId: user!.id, tokenHash: await hashSessionToken(token), ipAddress: ip, userAgent, expiresAt });
      await tx.insert(systemAuditLogs).values({
        facilityId: facility.id, userId: user!.id, actorRole: user!.role, action,
        resourceType: 'users', resourceId: user!.id,
        newState: { username: user!.username, via: 'EMAIL_OTP', ...(patient ? { patientId: patient.id } : {}) },
        ipAddress: ip, userAgent
      });
      return { token, user: user!, isNew: action === 'PATIENT_REGISTERED' };
    });

    const production = isProduction(c);
    const cookieOpts = { httpOnly: true, secure: production, sameSite: (production ? 'None' : 'Lax') as 'None' | 'Lax', path: '/', maxAge: PATIENT_SESSION_MS / 1000 };
    setCookie(c, 'medcore_session', result.token, cookieOpts);
    setCookie(c, 'aqromed_session', result.token, cookieOpts);

    const { user } = result;
    return c.json({
      success: true,
      token: result.token,
      isNew: result.isNew,
      user: {
        id: user.id, username: user.username, email: user.email, fullName: user.fullName, role: user.role,
        title: user.title, avatarInitials: user.avatarInitials, facilityId: facility.id, facilityName: facility.name,
        mobileDemoAdmin: mobileDemoCapability(user)
      }
    });
  } catch (err) {
    if (err instanceof OtpFailure) return fail(c, err.fail);
    throw err;
  }
});

/** A password-less guarantor login for a verified patient. */
async function newGuarantor(facilityId: string, email: string, patient: typeof patients.$inferSelect, tx: Pick<typeof db, 'select'>) {
  const base = email.split('@')[0]!.replace(/[^a-z0-9.]/g, '').slice(0, 48) || 'patient';
  let username = base;
  for (let attempt = 0; attempt < 5; attempt++) {
    const [clash] = await tx.select({ id: users.id }).from(users).where(eq(users.username, username)).limit(1);
    if (!clash) break;
    username = `${base}${Math.floor(10 + Math.random() * 89)}`;
  }
  // Census names are "SURNAME, Given M."; show them as "Given M. Surname".
  const [surname, given] = patient.fullName.split(',').map((part) => part.trim());
  const titleCase = (s: string) => s.toLowerCase().replace(/(^|[\s-])\p{L}/gu, (m) => m.toUpperCase());
  const fullName = given ? `${given} ${titleCase(surname!)}` : patient.fullName;
  const parts = fullName.split(/\s+/);
  const initials = `${parts[0]?.[0] ?? 'P'}${parts.length > 1 ? parts[parts.length - 1]![0] : 'G'}`.toUpperCase();
  return {
    facilityId, username, email, passwordHash: null, salt: null, fullName,
    role: 'PATIENT_GUARANTOR' as const, title: 'Patient Family Guarantor', avatarInitials: initials,
    contactNumber: patient.contactNumber, linkedMrn: patient.mrn
  };
}

export default otpApp;
