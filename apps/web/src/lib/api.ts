/**
 * The only way the web app talks to the API.
 * - Same-origin, cookie sessions only. No token is ever read or stored by JavaScript.
 * - Every request carries the CSRF header the API requires for cookie writes.
 * - Errors arrive as ApiRequestError with the server's code, message and request id.
 */
export class ApiRequestError extends Error {
  override name = 'ApiRequestError';
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly requestId?: string,
    readonly fields?: { path: string; message: string }[],
  ) {
    super(message);
  }
}

export type Audience = 'staff' | 'patient';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  idempotencyKey?: string;
  signal?: AbortSignal;
}

export const UNAUTHENTICATED_EVENT = 'medcore:unauthenticated';

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { 'X-MedCore-CSRF': '1', Accept: 'application/json' };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (options.idempotencyKey) headers['Idempotency-Key'] = options.idempotencyKey;

  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method: options.method ?? 'GET',
      credentials: 'same-origin',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
      cache: 'no-store',
    });
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err;
    throw new ApiRequestError(
      0,
      'NETWORK',
      'We could not reach MedCore. Check your connection and try again.',
    );
  }

  const text = await response.text();
  const data = text ? safeJson(text) : null;
  if (!response.ok) {
    const error = (
      data as {
        error?: {
          code?: string;
          message?: string;
          requestId?: string;
          details?: { fields?: { path: string; message: string }[] };
        };
      } | null
    )?.error;
    if (response.status === 401 && !path.startsWith('/v1/auth/')) {
      window.dispatchEvent(
        new CustomEvent(UNAUTHENTICATED_EVENT, {
          detail: path.startsWith('/v1/patient') ? 'patient' : 'staff',
        }),
      );
    }
    throw new ApiRequestError(
      response.status,
      error?.code ?? 'HTTP_ERROR',
      error?.message ?? 'Something went wrong. Please try again.',
      error?.requestId,
      error?.details?.fields,
    );
  }
  return data as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** A key per logical money action; reused on retry so the server never double-charges. */
export function newIdempotencyKey(): string {
  return `web-${crypto.randomUUID()}`;
}

export function errorMessage(err: unknown): string {
  if (err instanceof ApiRequestError) return err.message;
  return 'Something went wrong. Please try again.';
}
