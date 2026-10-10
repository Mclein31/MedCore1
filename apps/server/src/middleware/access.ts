import type { Context, Next } from 'hono';
import { apiError } from './error';

const publicAuth = new Set(['/api/v1/auth/login', '/api/v1/auth/register', '/api/v1/auth/forgot-password']);
export async function apiAccess(c: Context, next: Next) {
  c.header('Cache-Control', 'private, no-store');
  const path = c.req.path.replace(/\/+$/, '');
  if (c.req.method === 'POST' && publicAuth.has(path)) return next();
  const user = c.get('user');
  if (!user) return apiError(c, 401, 'UNAUTHORIZED', 'Authentication required.');
  if (user.role === 'PATIENT_GUARANTOR') {
    const ownRead = c.req.method === 'GET' && (path === '/api/v1/patient/me' || path.startsWith('/api/v1/patient/me/'));
    const ownAuth = (c.req.method === 'GET' && path === '/api/v1/auth/me') || (c.req.method === 'POST' && path === '/api/v1/auth/logout');
    const ownMutation = c.req.method === 'POST' && /^\/api\/v1\/encounters\/[^/]+\/(payments|promissory-notes|disputes|view-bill)$/.test(path);
    if (!ownRead && !ownAuth && !ownMutation) return apiError(c, 403, 'FORBIDDEN', 'Use the patient record endpoints for your account.');
  }
  await next();
  c.header('Cache-Control', 'private, no-store');
}
