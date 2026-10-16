import { z } from 'zod';
import type { AppContext } from '../context';
import { ApiError, notFound } from './errors';

const uuid = z.uuid();

/** Route ids are UUIDs; anything else is a 404 before any query runs. */
export function idParam(c: AppContext, name = 'id', what = 'Record'): string {
  const parsed = uuid.safeParse(c.req.param(name));
  if (!parsed.success) throw notFound(what);
  return parsed.data;
}

const IDEMPOTENCY_KEY = /^[A-Za-z0-9-]{16,64}$/;

/** Money-moving requests must carry a client-generated Idempotency-Key header. */
export function idempotencyKey(c: AppContext): string {
  const key = c.req.header('idempotency-key');
  if (!key || !IDEMPOTENCY_KEY.test(key)) {
    throw new ApiError(400, 'IDEMPOTENCY_KEY_REQUIRED', 'Send an Idempotency-Key header (16–64 letters, digits or hyphens).');
  }
  return key;
}
