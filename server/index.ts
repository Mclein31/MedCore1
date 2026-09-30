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

// Global Session Authentication Middleware
app.use('/api/*', authMiddleware);

// Health Check
app.get('/api/health', (c) => {
  return c.json({
    status: 'ONLINE',
    system: 'AQROMED Enterprise Hospital RCM Backend',
    version: '3.2.0',
    facility: 'St. Jude Medical Center Manila',
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
