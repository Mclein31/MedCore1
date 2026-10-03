import { Context, Next } from 'hono';
import { getCookie } from 'hono/cookie';
import { eq, and, gt } from 'drizzle-orm';
import { db } from '../db';
import { users, userSessions } from '../db/schema';
import { hashSessionToken } from '../services/authService';
import { apiError } from './error';

export interface AuthUser {
  id: string;
  facilityId: string;
  username: string;
  email: string;
  fullName: string;
  role: string;
  title: string;
  avatarInitials: string;
  prcLicense?: string | null;
  panNumber?: string | null;
  contactNumber?: string | null;
}

declare module 'hono' {
  interface ContextVariableMap {
    user: AuthUser;
    sessionId: string;
  }
}

export async function authMiddleware(c: Context, next: Next) {
  // Support both Bearer token (native mobile apps & cross-origin SPAs) and HTTP cookies
  const authHeader = c.req.header('authorization') || c.req.header('Authorization');
  let bearerToken: string | undefined;
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    bearerToken = authHeader.substring(7).trim();
  }

  const token = bearerToken || getCookie(c, 'medcore_session') || getCookie(c, 'aqromed_session');

  if (token) {
    try {
      const tokenHash = await hashSessionToken(token);
      const sessionRecords = await db
        .select({
          sessionId: userSessions.id,
          user: users
        })
        .from(userSessions)
        .innerJoin(users, eq(userSessions.userId, users.id))
        .where(
          and(
            eq(userSessions.tokenHash, tokenHash),
            gt(userSessions.expiresAt, new Date()),
            eq(users.isActive, true)
          )
        )
        .limit(1);

      if (sessionRecords.length > 0) {
        const { sessionId, user } = sessionRecords[0];

        // Demo presenter mode: allow role override via X-Demo-Role ONLY in non-production environments
        // for verified authenticated sessions and restricted to valid domain roles.
        const VALID_DEMO_ROLES = new Set([
          'BILLING_SPECIALIST',
          'HMO_COORDINATOR',
          'CLAIMS_ENCODER',
          'HOSPITAL_CFO',
          'ATTENDING_PHYSICIAN',
          'PATIENT_GUARANTOR',
          'LOBBY_SECURITY'
        ]);

        let effectiveRole = user.role;
        const nodeEnv =
          (c.env as any)?.NODE_ENV ||
          (typeof process !== 'undefined' ? process.env.NODE_ENV : undefined) ||
          'production';
        const isProduction = nodeEnv === 'production';

        if (!isProduction) {
          const demoRoleOverride = c.req.header('x-demo-role');
          if (demoRoleOverride && VALID_DEMO_ROLES.has(demoRoleOverride)) {
            effectiveRole = demoRoleOverride;
          }
        }

        c.set('sessionId', sessionId);
        c.set('user', {
          id: user.id,
          facilityId: user.facilityId,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          role: effectiveRole,
          title: user.title,
          avatarInitials: user.avatarInitials,
          prcLicense: user.prcLicense,
          panNumber: user.panNumber,
          contactNumber: user.contactNumber
        });
      }
    } catch (e) {
      console.error('Session lookup error:', e);
    }
  }

  await next();
}

export async function requireAuth(c: Context, next: Next) {
  const user = c.get('user');
  if (!user) {
    return apiError(
      c,
      401,
      'UNAUTHORIZED',
      'Authentication required. Please log in with a valid session.'
    );
  }
  await next();
}

export function requireRole(allowedRoles: string[]) {
  return async (c: Context, next: Next) => {
    const user = c.get('user');
    if (!user) {
      return apiError(
        c,
        401,
        'UNAUTHORIZED',
        'Authentication required.'
      );
    }

    if (!allowedRoles.includes(user.role)) {
      return apiError(
        c,
        403,
        'FORBIDDEN',
        `Access denied. Role ${user.role} lacks permission for this high-impact action.`
      );
    }

    await next();
  };
}
