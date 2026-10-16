import type { ContentfulStatusCode } from 'hono/utils/http-status';

/**
 * The only way a route reports a failure. The handler turns it into
 * { error: { code, message, requestId, details? } }; nothing else ever leaks.
 */
export class ApiError extends Error {
  override name = 'ApiError';
  constructor(
    readonly status: ContentfulStatusCode,
    readonly code: string,
    message: string,
    readonly details?: unknown,
    readonly headers?: Record<string, string>,
  ) {
    super(message);
  }
}

export const notFound = (what = 'Record') => new ApiError(404, 'NOT_FOUND', `${what} not found.`);
export const forbidden = (message = 'You do not have access to this action.') =>
  new ApiError(403, 'FORBIDDEN', message);
export const conflict = (code: string, message: string) => new ApiError(409, code, message);
export const unauthenticated = () => new ApiError(401, 'UNAUTHENTICATED', 'Please sign in again.');
export const rateLimited = (retryAfterSeconds: number) =>
  new ApiError(429, 'RATE_LIMITED', 'Too many attempts. Please wait and try again.', undefined, {
    'Retry-After': String(retryAfterSeconds),
  });
