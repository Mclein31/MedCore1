import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { setCookie, deleteCookie } from 'hono/cookie';
import { eq, and } from 'drizzle-orm';
import { db } from '../db';
import { users, userSessions, facilities, systemAuditLogs } from '../db/schema';
import { verifyPassword, generateSessionToken, hashSessionToken } from '../services/authService';
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

// Password guessing is capped per IP and per email by PATIENT_AUTH_LIMITER (10 per 60 s on Workers).
// The binding is absent in the Node standalone server, where no limit applies.
type RateLimiter = { limit(options: { key: string }): Promise<{ success: boolean }> };
async function loginAllowed(c: any, email: string) {
  const limiter = (c.env as any)?.PATIENT_AUTH_LIMITER as RateLimiter | undefined;
  if (!limiter) return true;
  for (const key of [`login:ip:${getClientIp(c)}`, `login:email:${email.toLowerCase()}`]) {
    if (!(await limiter.limit({ key })).success) return false;
  }
  return true;
}

authApp.post('/login', zValidator('json', loginSchema), async (c) => {
  const { email, password, facilityCode } = c.req.valid('json');
  if (!(await loginAllowed(c, email))) {
    return apiError(c, 429, 'RATE_LIMITED', 'Too many sign-in attempts. Please wait a minute and try again.');
  }

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
