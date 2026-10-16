import { MoneyError } from '@medcore/domain';
import { HTTPException } from 'hono/http-exception';
import type { ErrorHandler, MiddlewareHandler } from 'hono';
import { validator } from 'hono/validator';
import type { z } from 'zod';
import type { AppBindings, AppContext } from '../context';
import { ApiError } from '../lib/errors';

const REQUEST_ID = /^[A-Za-z0-9-]{8,64}$/;

/** Correlates logs, audit rows and error responses. Echoed back to the client. */
export const requestId: MiddlewareHandler<AppBindings> = async (c, next) => {
  const incoming = c.req.header('x-request-id');
  const id = incoming && REQUEST_ID.test(incoming) ? incoming : crypto.randomUUID();
  c.set('requestId', id);
  c.header('X-Request-Id', id);
  await next();
};

/**
 * Client IP for audit and rate limits. Caller-supplied headers are only trusted
 * when TRUST_PROXY names the proxy that sets them.
 */
export function clientIp(c: AppContext, peerAddress: string | null): string | null {
  const mode = c.var.services.config.trustProxy;
  if (mode === 'cloudflare') return c.req.header('cf-connecting-ip') ?? null;
  if (mode === 'x-forwarded-for') {
    // The right-most entry is the one our own proxy appended; earlier ones are client-controlled.
    const hops = c.req
      .header('x-forwarded-for')
      ?.split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    return hops?.at(-1) ?? peerAddress;
  }
  return peerAddress;
}

export const accessLog: MiddlewareHandler<AppBindings> = async (c, next) => {
  const started = Date.now();
  await next();
  // Path only: query strings can carry search terms with patient names.
  c.var.services.logger.log('info', 'request', {
    requestId: c.var.requestId,
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
    ms: Date.now() - started,
  });
};

/** Patient financial data must never sit in a shared or browser cache. */
export const noStore: MiddlewareHandler<AppBindings> = async (c, next) => {
  await next();
  c.header('Cache-Control', 'no-store');
  c.header('Pragma', 'no-cache');
};

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * CSRF defense for cookie-authenticated requests: a custom header (which a
 * cross-site form or simple request cannot add without a CORS preflight we
 * refuse), an Origin allowlist, and Fetch Metadata. Bearer-token clients
 * (the mobile app) are exempt because browsers never attach bearer tokens.
 */
export const csrf: MiddlewareHandler<AppBindings> = async (c, next) => {
  if (SAFE_METHODS.has(c.req.method)) return next();
  const { cookies, allowedOrigins } = c.var.services.config;
  const cookieHeader = c.req.header('cookie') ?? '';
  const hasSessionCookie =
    cookieHeader.includes(`${cookies.staff}=`) || cookieHeader.includes(`${cookies.patient}=`);
  const bearer = c.req.header('authorization')?.startsWith('Bearer ');
  if (bearer && !hasSessionCookie) return next();

  if (c.req.header('x-medcore-csrf') !== '1') {
    throw new ApiError(403, 'CSRF_REJECTED', 'This request was blocked. Reload the page and try again.');
  }
  const origin = c.req.header('origin');
  if (origin && !allowedOrigins.includes(origin)) {
    throw new ApiError(403, 'CSRF_REJECTED', 'This request was blocked. Reload the page and try again.');
  }
  if (c.req.header('sec-fetch-site') === 'cross-site') {
    throw new ApiError(403, 'CSRF_REJECTED', 'This request was blocked. Reload the page and try again.');
  }
  return next();
};

function validationError(error: z.ZodError): ApiError {
  // Field paths and messages only; never echo the submitted values back.
  const fields = error.issues
    .slice(0, 20)
    .map((issue) => ({ path: issue.path.join('.'), message: issue.message }));
  return new ApiError(422, 'VALIDATION_FAILED', 'Some fields need attention.', { fields });
}

export function parseOrThrow<T extends z.ZodType>(schema: T, value: unknown): z.output<T> {
  const result = schema.safeParse(value);
  if (!result.success) throw validationError(result.error);
  return result.data;
}

export const jsonBody = <T extends z.ZodType>(schema: T) =>
  validator('json', (value) => parseOrThrow(schema, value) as z.output<T>);

export const queryParams = <T extends z.ZodType>(schema: T) =>
  validator('query', (value) => parseOrThrow(schema, value) as z.output<T>);

interface PgError {
  code?: string;
  constraint?: string;
}

function pgErrorOf(err: unknown): PgError | null {
  const candidate = (err as { cause?: unknown })?.cause ?? err;
  const code = (candidate as PgError)?.code;
  return typeof code === 'string' && /^[0-9A-Z]{5}$/.test(code) ? (candidate as PgError) : null;
}

export const onError: ErrorHandler<AppBindings> = (err, c) => {
  const requestId = c.var.requestId ?? 'unknown';
  const body = (status: number, code: string, message: string, details?: unknown) =>
    c.json({ error: { code, message, requestId, ...(details ? { details } : {}) } }, status as 400);

  if (err instanceof ApiError) {
    for (const [name, value] of Object.entries(err.headers ?? {})) c.header(name, value);
    return body(err.status, err.code, err.message, err.details);
  }
  if (err instanceof HTTPException) {
    const status = err.status;
    if (status === 413) return body(413, 'PAYLOAD_TOO_LARGE', 'That request is too large.');
    if (status === 400) return body(400, 'BAD_REQUEST', 'The request could not be read. Send JSON.');
    return body(status, 'HTTP_ERROR', 'The request could not be completed.');
  }
  // Domain money rules (for example "room upgrade cannot exceed room charges") are user-safe messages.
  if (err instanceof MoneyError) return body(422, 'INVALID_AMOUNT', err.message);
  const pg = pgErrorOf(err);
  if (pg?.code === '23505')
    return body(409, 'CONFLICT', 'This conflicts with an existing record. Refresh and try again.');
  if (pg?.code === '40001' || pg?.code === '40P01') {
    return body(409, 'RETRY', 'Another change was saved at the same moment. Please try again.');
  }
  c.var.services?.logger.log('error', 'unhandled error', {
    requestId,
    errorName: err instanceof Error ? err.name : 'unknown',
    errorMessage: err instanceof Error ? err.message : String(err),
    pgState: pg?.code,
    constraint: pg?.constraint,
  });
  return body(500, 'INTERNAL', 'Something went wrong on our side. Please try again.');
};
