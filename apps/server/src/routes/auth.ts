import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { setCookie, deleteCookie } from 'hono/cookie';
import { eq, and } from 'drizzle-orm';
import { db } from '../db';
import { users, userSessions, facilities, patients, systemAuditLogs } from '../db/schema';
import { verifyPassword, hashPassword, generateSessionToken, hashSessionToken } from '../services/authService';
import { apiError } from '../middleware/error';
import { requireAuth } from '../middleware/auth';
import { getClientIp } from '../utils/clientIp';
import { mobileDemoCapability } from '../services/mobileDemoAccess';

const authApp = new Hono();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  facilityCode: z.string().default('SJMC-MNL')
});

authApp.post('/login', zValidator('json', loginSchema), async (c) => {
  const { email, password, facilityCode } = c.req.valid('json');

  const facilityList = await db
    .select()
    .from(facilities)
    .where(eq(facilities.code, facilityCode))
    .limit(1);

  if (facilityList.length === 0) {
    return apiError(c, 404, 'FACILITY_NOT_FOUND', `Facility ${facilityCode} does not exist.`);
  }

  const facility = facilityList[0];

  const userList = await db
    .select()
    .from(users)
    .where(and(eq(users.email, email), eq(users.facilityId, facility.id)))
    .limit(1);

  if (userList.length === 0) {
    return apiError(c, 401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
  }

  const user = userList[0];

  if (!user.isActive) {
    return apiError(c, 403, 'USER_INACTIVE', 'This user account has been deactivated.');
  }

  // Patient accounts created by email code have no password.
  const passwordValid = Boolean(user.passwordHash && user.salt) && await verifyPassword(password, user.passwordHash!, user.salt!);
  if (!passwordValid) {
    return apiError(c, 401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
  }

  // Generate 32-byte secure session token
  const token = generateSessionToken();
  const tokenHash = await hashSessionToken(token);
  const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000); // 8-hour shift lifespan

  await db.insert(userSessions).values({
    userId: user.id,
    tokenHash,
    ipAddress: getClientIp(c),
    userAgent: c.req.header('user-agent'),
    expiresAt
  });

  // Set HTTP-Only Secure Cookie (8-hour hospital shift session lifespan)
  // Cross-domain SPA on Vercel requires sameSite: 'None' and secure: true in production
  const nodeEnv =
    (c.env as any)?.NODE_ENV ||
    (typeof process !== 'undefined' ? process.env.NODE_ENV : undefined) ||
    'production';
  const isProduction = nodeEnv === 'production';
  const cookieOpts = {
    httpOnly: true,
    secure: isProduction,
    sameSite: (isProduction ? 'None' : 'Lax') as 'None' | 'Lax',
    path: '/',
    maxAge: 28800 // 8 hours in seconds
  };
  setCookie(c, 'medcore_session', token, cookieOpts);
  setCookie(c, 'aqromed_session', token, cookieOpts);

  // Log in system audit logs
  await db.insert(systemAuditLogs).values({
    facilityId: facility.id,
    userId: user.id,
    actorRole: user.role,
    action: 'USER_LOGIN',
    resourceType: 'users',
    resourceId: user.id,
    newState: { username: user.username, role: user.role },
    ipAddress: getClientIp(c),
    userAgent: c.req.header('user-agent')
  });

  return c.json({
    success: true,
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      title: user.title,
      avatarInitials: user.avatarInitials,
      facilityId: facility.id,
      facilityName: facility.name,
      mobileDemoAdmin: mobileDemoCapability(user, c.env as any)
    }
  });
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(128),
  fullName: z.string().min(2).max(255),
  mrn: z.string().min(2).max(64),
  contactNumber: z.string().min(4).max(32),
  facilityCode: z.string().default('SJMC-MNL')
});

// Patient self-registration: verifies MRN + contact number against the
// hospital census, then creates a PATIENT_GUARANTOR login linked to that
// patient record. No staff privileges are ever granted here.
authApp.post('/register', zValidator('json', registerSchema), async (c) => {
  const { email, password, fullName, mrn, contactNumber, facilityCode } = c.req.valid('json');

  const facilityList = await db
    .select()
    .from(facilities)
    .where(eq(facilities.code, facilityCode))
    .limit(1);

  if (facilityList.length === 0) {
    return apiError(c, 404, 'FACILITY_NOT_FOUND', `Facility ${facilityCode} does not exist.`);
  }

  const facility = facilityList[0];

  const matchedPatients = await db
    .select()
    .from(patients)
    .where(and(eq(patients.facilityId, facility.id), eq(patients.mrn, mrn.trim())))
    .limit(1);

  if (matchedPatients.length === 0) {
    return apiError(
      c,
      404,
      'PATIENT_NOT_FOUND',
      'No patient record matches the provided MRN and contact number. Please verify the details on your admission slip.'
    );
  }

  const patient = matchedPatients[0];
  const normalizedProvided = contactNumber.replace(/[\s-]/g, '');
  const normalizedRecord = (patient.contactNumber || '').replace(/[\s-]/g, '');
  if (!normalizedRecord || normalizedProvided !== normalizedRecord) {
    return apiError(
      c,
      404,
      'PATIENT_NOT_FOUND',
      'No patient record matches the provided MRN and contact number. Please verify the details on your admission slip.'
    );
  }

  const existingUsers = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email.toLowerCase().trim()))
    .limit(1);

  if (existingUsers.length > 0) {
    return apiError(c, 409, 'USER_EXISTS', 'An account with this email already exists. Please log in instead.');
  }

  const usernameBase = email.toLowerCase().trim().split('@')[0].replace(/[^a-z0-9.]/g, '').slice(0, 48) || 'patient';
  let username = usernameBase;
  for (let attempt = 0; attempt < 5; attempt++) {
    const clash = await db.select({ id: users.id }).from(users).where(eq(users.username, username)).limit(1);
    if (clash.length === 0) break;
    username = `${usernameBase}${Math.floor(10 + Math.random() * 89)}`;
  }

  const { hash, salt } = await hashPassword(password);
  const nameParts = fullName.trim().split(/\s+/);
  const initials = (nameParts[0]?.[0] || 'P') + (nameParts.length > 1 ? nameParts[nameParts.length - 1][0] : 'G');

  const inserted = await db
    .insert(users)
    .values({
      facilityId: facility.id,
      username,
      email: email.toLowerCase().trim(),
      passwordHash: hash,
      salt,
      fullName: fullName.trim(),
      role: 'PATIENT_GUARANTOR',
      title: 'Patient Family Guarantor',
      avatarInitials: initials.toUpperCase(),
      contactNumber: patient.contactNumber,
      linkedMrn: patient.mrn
    })
    .returning();

  const user = inserted[0];

  const token = generateSessionToken();
  const tokenHash = await hashSessionToken(token);
  const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);

  await db.insert(userSessions).values({
    userId: user.id,
    tokenHash,
    ipAddress: getClientIp(c),
    userAgent: c.req.header('user-agent'),
    expiresAt
  });

  const nodeEnv =
    (c.env as any)?.NODE_ENV ||
    (typeof process !== 'undefined' ? process.env.NODE_ENV : undefined) ||
    'production';
  const isProduction = nodeEnv === 'production';
  const cookieOpts = {
    httpOnly: true,
    secure: isProduction,
    sameSite: (isProduction ? 'None' : 'Lax') as 'None' | 'Lax',
    path: '/',
    maxAge: 28800
  };
  setCookie(c, 'medcore_session', token, cookieOpts);
  setCookie(c, 'aqromed_session', token, cookieOpts);

  await db.insert(systemAuditLogs).values({
    facilityId: facility.id,
    userId: user.id,
    actorRole: user.role,
    action: 'PATIENT_REGISTERED',
    resourceType: 'users',
    resourceId: user.id,
    newState: { username: user.username, linkedMrn: patient.mrn },
    ipAddress: getClientIp(c),
    userAgent: c.req.header('user-agent')
  });

  return c.json({
    success: true,
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      title: user.title,
      avatarInitials: user.avatarInitials,
      facilityId: facility.id,
      facilityName: facility.name
    }
  });
});

const forgotPasswordSchema = z.object({
  email: z.string().email()
});

// Intentionally generic response to avoid account enumeration. Password
// reset delivery (email/SMS) is not yet wired; hospital billing desk
// assists patients until then.
authApp.post('/forgot-password', zValidator('json', forgotPasswordSchema), async (c) => {
  return c.json({
    success: true,
    message: 'If an account exists for this email, reset instructions will be sent. You may also visit the hospital billing desk for assistance.'
  });
});

authApp.post('/logout', requireAuth, async (c) => {  const sessionId = c.get('sessionId');
  const user = c.get('user');

  if (sessionId) {
    await db.update(userSessions).set({ revokedAt: new Date() }).where(eq(userSessions.id, sessionId));
  }

  const logoutNodeEnv =
    (c.env as any)?.NODE_ENV ||
    (typeof process !== 'undefined' ? process.env.NODE_ENV : undefined) ||
    'production';
  const isProduction = logoutNodeEnv === 'production';
  const deleteOpts = {
    path: '/',
    secure: isProduction,
    sameSite: (isProduction ? 'None' : 'Lax') as 'None' | 'Lax'
  };
  deleteCookie(c, 'medcore_session', deleteOpts);
  deleteCookie(c, 'aqromed_session', deleteOpts);

  if (user) {
    await db.insert(systemAuditLogs).values({
      facilityId: user.facilityId,
      userId: user.id,
      actorRole: user.role,
      action: 'USER_LOGOUT',
      resourceType: 'users',
      resourceId: user.id,
      ipAddress: getClientIp(c),
      userAgent: c.req.header('user-agent')
    });
  }

  return c.json({ success: true, message: 'Successfully logged out.' });
});

authApp.get('/me', requireAuth, async (c) => {
  const user = c.get('user');
  return c.json({
    authenticated: true,
    user
  });
});

const allowedRoles = z.enum([
  'BILLING_SPECIALIST',
  'HMO_COORDINATOR',
  'CLAIMS_ENCODER',
  'HOSPITAL_CFO',
  'ATTENDING_PHYSICIAN',
  'PATIENT_GUARANTOR',
  'LOBBY_SECURITY'
]);

const switchRoleSchema = z
  .object({
    role: allowedRoles.optional(),
    targetRole: allowedRoles.optional()
  })
  .refine((data) => Boolean(data.role || data.targetRole), {
    message: 'Either role or targetRole must be provided.'
  });

authApp.post('/switch-role', requireAuth, zValidator('json', switchRoleSchema), async (c) => {
  const environment=(c.env as any)?.NODE_ENV || process.env.NODE_ENV || 'production';
  if(environment==='production') return apiError(c,403,'ACCOUNT_SWITCH_REQUIRES_LOGIN','Sign in to the other account to change staff permissions.');
  const valid = c.req.valid('json');
  const effectiveTargetRole = (valid.targetRole || valid.role)!;
  const user = c.get('user');

  return c.json({
    success: true,
    message: `Switched demo presentation role to ${effectiveTargetRole}.`,
    user: {
      ...user,
      role: effectiveTargetRole
    }
  });
});

export default authApp;
