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

  const passwordValid = await verifyPassword(password, user.passwordHash, user.salt);
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
    ipAddress: c.req.header('x-forwarded-for') || '127.0.0.1',
    userAgent: c.req.header('user-agent'),
    expiresAt
  });

  // Set HTTP-Only Secure Cookie (8-hour hospital shift session lifespan)
  setCookie(c, 'aqromed_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
    path: '/',
    maxAge: 28800 // 8 hours in seconds
  });

  // Log in system audit logs
  await db.insert(systemAuditLogs).values({
    facilityId: facility.id,
    userId: user.id,
    actorRole: user.role,
    action: 'USER_LOGIN',
    resourceType: 'users',
    resourceId: user.id,
    newState: { username: user.username, role: user.role },
    ipAddress: c.req.header('x-forwarded-for') || '127.0.0.1',
    userAgent: c.req.header('user-agent')
  });

  return c.json({
    success: true,
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

authApp.post('/logout', requireAuth, async (c) => {
  const sessionId = c.get('sessionId');
  const user = c.get('user');

  if (sessionId) {
    await db.delete(userSessions).where(eq(userSessions.id, sessionId));
  }

  deleteCookie(c, 'aqromed_session', { path: '/' });
  deleteCookie(c, 'medcore_session', { path: '/' });

  if (user) {
    await db.insert(systemAuditLogs).values({
      facilityId: user.facilityId,
      userId: user.id,
      actorRole: user.role,
      action: 'USER_LOGOUT',
      resourceType: 'users',
      resourceId: user.id,
      ipAddress: c.req.header('x-forwarded-for') || '127.0.0.1',
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
