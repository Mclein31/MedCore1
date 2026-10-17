import { sql } from 'drizzle-orm';
import { Hono, type Context } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import type { AppBindings, Services } from './context';
import { ApiError } from './lib/errors';
import { staffAuth } from './middleware/auth';
import { accessLog, clientIp, csrf, noStore, onError, requestId } from './middleware/http';
import { patientAiRoutes, staffAiRoutes } from './routes/ai';
import { patientAuthRoutes } from './routes/patientAuth';
import { patientPortalRoutes } from './routes/patientPortal';
import { staffAdminRoutes, staffDirectoryRoutes } from './routes/staffAdmin';
import { staffAuthRoutes } from './routes/staffAuth';
import { staffEncounterRoutes } from './routes/staffEncounters';
import { staffOperationRoutes } from './routes/staffOperations';

export interface AppOptions {
  /** Resolve the TCP peer address (Node only). */
  peerAddress?: (c: Context<AppBindings>) => string | null;
  /** Schedule work after the response (Workers: ctx.waitUntil). Defaults to fire-and-forget. */
  defer?: (task: Promise<unknown>) => void;
}

export function createApp(services: Services, options: AppOptions = {}) {
  const app = new Hono<AppBindings>();
  const { config } = services;

  app.use('*', async (c, next) => {
    c.set('services', services);
    c.set('defer', options.defer ?? ((task) => void task.catch(() => undefined)));
    await next();
  });
  app.use('*', requestId);
  app.use('*', accessLog);
  app.use(
    '*',
    secureHeaders({
      contentSecurityPolicy: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] },
      strictTransportSecurity: config.isProduction ? 'max-age=63072000; includeSubDomains' : false,
      referrerPolicy: 'no-referrer',
      xFrameOptions: 'DENY',
      crossOriginResourcePolicy: 'same-origin',
      permissionsPolicy: { camera: [], microphone: [], geolocation: [] },
    }),
  );
  app.use('*', noStore);
  app.use(
    '/api/*',
    cors({
      // Same-origin in production (the web app proxies /api); this only matters for split-origin setups.
      origin: (origin) => (config.allowedOrigins.includes(origin) ? origin : null),
      credentials: true,
      allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      allowHeaders: ['Content-Type', 'X-MedCore-CSRF', 'Idempotency-Key', 'X-Request-Id', 'Authorization'],
      exposeHeaders: ['X-Request-Id', 'Retry-After'],
      maxAge: 600,
    }),
  );
  const standardBodyLimit = bodyLimit({
    maxSize: 64 * 1024,
    onError: () => {
      throw new ApiError(413, 'PAYLOAD_TOO_LARGE', 'That request is too large.');
    },
  });
  const ocrBodyLimit = bodyLimit({
    maxSize: 8 * 1024 * 1024,
    onError: () => {
      throw new ApiError(413, 'PAYLOAD_TOO_LARGE', 'That image is too large.');
    },
  });
  app.use('/api/*', async (c, next) =>
    c.req.path.endsWith('/ai/ocr/extract-card') ? ocrBodyLimit(c, next) : standardBodyLimit(c, next),
  );
  app.use('/api/*', async (c, next) => {
    c.set('ip', clientIp(c, options.peerAddress?.(c) ?? null));
    c.set('userAgent', c.req.header('user-agent')?.slice(0, 255) ?? null);
    const lease = await services.database.acquire();
    c.set('db', lease.db);
    try {
      await next();
    } finally {
      await lease.release();
    }
  });
  app.use('/api/*', csrf);

  // Public health check: reveals nothing but liveness.
  app.get('/api/health', async (c) => {
    try {
      await c.var.db.execute(sql`select 1`);
      return c.json({ status: 'ok', database: 'ok' });
    } catch {
      return c.json({ status: 'degraded', database: 'error' }, 503);
    }
  });

  // Sign-in lives outside the authenticated trees so their auth middleware never applies to it.
  app.route('/api/v1/auth/staff', staffAuthRoutes);
  app.route('/api/v1/auth/patient', patientAuthRoutes);

  const staff = new Hono<AppBindings>();
  staff.use('*', staffAuth);
  staff.route('/encounters', staffEncounterRoutes);
  staff.route('/users', staffAdminRoutes);
  staff.route('/directory', staffDirectoryRoutes);
  staff.route('/ai', staffAiRoutes);
  staff.route('/', staffOperationRoutes);
  app.route('/api/v1/staff', staff);

  app.route('/api/v1/patient/ai', patientAiRoutes);
  app.route('/api/v1/patient', patientPortalRoutes);

  app.notFound((c) =>
    c.json({ error: { code: 'NOT_FOUND', message: 'No such endpoint.', requestId: c.var.requestId } }, 404),
  );
  app.onError(onError);
  return app;
}

export type App = ReturnType<typeof createApp>;
