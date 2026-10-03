import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { authMiddleware } from './middleware/auth';
import { apiError } from './middleware/error';
import authApp from './routes/auth';
import encountersApp from './routes/encounters';
import clearanceApp from './routes/clearance';
import disputesApp from './routes/disputes';
import promissoryApp from './routes/promissory';
import paymentsApp from './routes/payments';
import gatePassApp from './routes/gatePass';
import claimsApp from './routes/claims';
import bedsApp from './routes/beds';
import analyticsApp from './routes/analytics';
import chargesApp from './routes/charges';

const app = new Hono();

// Global Logger
app.use('*', logger());

// CORS configuration for Vite/Vercel dashboard and native mobile clients (iOS / Android)
const defaultAllowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
  'https://med-core1.vercel.app',
  'https://med-core1-beige.vercel.app',
  'https://medcore1.vercel.app',
  'https://medcore-hospital.vercel.app'
];

app.use(
  '*',
  cors({
    origin: (origin, c) => {
      // 1. Direct native mobile apps (iOS / Android) or server-to-server requests have no Origin header
      if (!origin) return origin || '';

      const env = (c as any)?.env || {};
      const allowedOriginsEnv = env.ALLOWED_ORIGINS || process.env.ALLOWED_ORIGINS;
      const nodeEnv = env.NODE_ENV || process.env.NODE_ENV || 'production';

      // 2. Explicitly allowed dashboard origins from environment (comma-separated)
      const customOrigins = allowedOriginsEnv
        ? allowedOriginsEnv.split(',').map((o: string) => o.trim())
        : [];
      const allowed = [...defaultAllowedOrigins, ...customOrigins];

      if (allowed.includes(origin)) {
        return origin;
      }

      // 3. Vercel prototype deployments restricted strictly to verified MedCore / AqroMed project domains
      try {
        const parsed = new URL(origin);
        const host = parsed.hostname.toLowerCase();
        if (
          (parsed.protocol === 'https:' || parsed.protocol === 'http:') &&
          host.endsWith('.vercel.app') &&
          /^(?:[a-z0-9-]+\.)?[a-z0-9-]*(?:med-?core|aqromed)[a-z0-9-]*\.vercel\.app$/i.test(host)
        ) {
          return origin;
        }
      } catch {}

      // 4. In development mode, allow any localhost / 127.0.0.1 port
      if (nodeEnv !== 'production' && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
        return origin;
      }

      return null;
    },
    credentials: true,
    allowHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'X-Demo-Role'],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
  })
);

import { db, getDb, runWithDb } from './db';
import { sql } from 'drizzle-orm';

// Hyperdrive / Database Resolution Middleware for Cloudflare Workers
app.use('*', async (c, next) => {
  const env = (c.env as any) || {};
  const nodeEnv =
    env.NODE_ENV ||
    (typeof process !== 'undefined' ? process.env.NODE_ENV : undefined) ||
    'production';
  const isProduction = nodeEnv === 'production';

  const hyperdrive = env.HYPERDRIVE;
  const connectionString =
    hyperdrive?.connectionString ||
    env.DATABASE_URL ||
    (typeof process !== 'undefined' ? process.env.DATABASE_URL : undefined);

  if (isProduction) {
    if (!connectionString) {
      console.error(
        '[MedCore Configuration Error] Neither HYPERDRIVE nor DATABASE_URL is configured in production environment.'
      );
      return apiError(
        c,
        500,
        'DATABASE_CONFIGURATION_ERROR',
        'Database connection is not configured in production environment. Ensure Cloudflare Hyperdrive or DATABASE_URL is set.'
      );
    }

    const isLoopback =
      connectionString.includes('localhost') ||
      connectionString.includes('127.0.0.1') ||
      connectionString.includes('::1') ||
      connectionString.includes('0.0.0.0');

    if (isLoopback) {
      console.error(
        '[MedCore Security Error] Refusing loopback database connection in production:',
        connectionString
      );
      return apiError(
        c,
        500,
        'DATABASE_SECURITY_ERROR',
        'Refusing to connect to localhost / loopback database in production mode. Configure a remote PostgreSQL database via Cloudflare Hyperdrive.'
      );
    }
  }

  // Active connection string found
  const effectiveConn =
    connectionString ||
    (typeof process !== 'undefined' ? process.env.DATABASE_URL : undefined);

  if (effectiveConn) {
    const activeDb = getDb(effectiveConn, isProduction);
    return runWithDb(activeDb, () => next());
  }

  // Local development fallback
  if (!isProduction) {
    const devDb = getDb(undefined, false);
    return runWithDb(devDb, () => next());
  }

  return next();
});

// Global Session Authentication Middleware
app.use('/api/*', authMiddleware);

// Health Check with Live PostgreSQL Connectivity Verification
app.get('/api/health', async (c) => {
  let dbStatus = 'CONNECTED';
  let dbLatencyMs = 0;
  let encountersCount = 0;
  const hyperdriveBinding = (c.env as any)?.HYPERDRIVE;
  const hasHyperdrive = Boolean(hyperdriveBinding?.connectionString);

  try {
    const start = Date.now();
    const res = await db.execute(sql`SELECT count(*)::int as count FROM encounters`);
    dbLatencyMs = Date.now() - start;
    encountersCount = Number(res.rows[0]?.count || 0);
  } catch (err: any) {
    dbStatus = 'DISCONNECTED';
    console.error('Healthcheck DB ping failed:', err);
    return c.json(
      {
        status: 'DEGRADED',
        system: 'MedCore Enterprise Hospital RCM Backend',
        version: '3.2.0',
        database: {
          status: 'DISCONNECTED',
          driver: hasHyperdrive ? 'CLOUDFLARE_HYPERDRIVE' : 'DIRECT_POSTGRES',
          error: 'Database connection failed'
        },
        timestamp: new Date().toISOString()
      },
      503
    );
  }

  return c.json({
    status: 'ONLINE',
    system: 'MedCore (AQROMED) Enterprise Hospital RCM Backend',
    version: '3.2.0',
    facility: 'St. Jude Medical Center Manila',
    database: {
      status: dbStatus,
      driver: hasHyperdrive ? 'CLOUDFLARE_HYPERDRIVE' : 'DIRECT_POSTGRES',
      latencyMs: dbLatencyMs,
      encountersCount
    },
    statutoryCompliance: ['RA 9994', 'RA 10754', 'RA 11223', 'RA 9439', 'Circular 2024-0037'],
    timestamp: new Date().toISOString()
  });
});

// Mount Routes
app.route('/api/v1/auth', authApp);
app.route('/api/v1/encounters', encountersApp);
app.route('/api/v1/encounters', clearanceApp);
app.route('/api/v1/encounters', paymentsApp);
app.route('/api/v1', disputesApp);
app.route('/api/v1/promissory-notes', promissoryApp);
app.route('/api/v1', promissoryApp);
app.route('/api/v1/discharge', gatePassApp);
app.route('/api/v1/claims', claimsApp);
app.route('/api/v1/beds', bedsApp);
app.route('/api/v1/analytics', analyticsApp);
app.route('/api/v1', chargesApp);

// 404 Not Found Handler
app.notFound((c) => {
  return apiError(c, 404, 'ROUTE_NOT_FOUND', `Cannot ${c.req.method} ${c.req.path}`);
});

// Global Exception Handler
app.onError((err, c) => {
  console.error('Unhandled AQROMED API Error:', err);
  return apiError(
    c,
    500,
    'INTERNAL_SERVER_ERROR',
    'An internal server error occurred. Transaction rolled back.'
  );
});

export default app;
