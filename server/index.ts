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

// CORS configuration for Vite frontend
app.use(
  '*',
  cors({
    origin: (origin) => origin || '*',
    credentials: true,
    allowHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'X-Demo-Role'],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
  })
);

import { db, getDb, runWithDb } from './db';
import { sql } from 'drizzle-orm';

// Hyperdrive Database Resolution Middleware for Cloudflare Workers
app.use('*', async (c, next) => {
  const hyperdrive = (c.env as any)?.HYPERDRIVE;
  if (hyperdrive?.connectionString) {
    const hyperdriveDb = getDb(hyperdrive.connectionString);
    return runWithDb(hyperdriveDb, () => next());
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
          error: err.message
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
