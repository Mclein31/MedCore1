import { ENV } from '../config/env';

// Central mobile API client. All network traffic goes through here so auth
// headers, timeouts, retries, and error messages stay consistent.
// Never logs PHI or tokens.

type TokenProvider = () => Promise<string | null>;

const DEFAULT_TIMEOUT_MS = 20000;

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

function patientFriendlyMessage(status: number, code: string | undefined, fallback: string): string {
  if (code === 'INVALID_CREDENTIALS') return 'Check your email and password, then try again.';
  if (code === 'PATIENT_NOT_LINKED' || code === 'PATIENT_NOT_FOUND') return fallback;
  if (status === 0) return 'We could not connect. Please check your connection and try again.';
  if (status === 401) return 'Your session expired. Please log in again.';
  if (status === 403) return 'You do not have access to this information.';
  if (status === 404) return 'We could not find that record. It may have been moved or removed.';
  if (status === 409) return fallback || 'This already exists. Please check and try again.';
  if (status >= 500) return 'Our server had trouble. Please try again in a moment.';
  return fallback || 'Something went wrong. Please try again.';
}

export class ApiClient {
  private getToken: TokenProvider;
  constructor(getToken: TokenProvider, private onExpired?: (token: string) => void) {
    this.getToken = getToken;
  }

  async request<T>(path: string, options: RequestInit & { timeoutMs?: number; idempotencyKey?: string } = {}): Promise<T> {
    if (ENV.configurationError) throw new ApiError(ENV.configurationError, 0, 'CONFIGURATION');
    const { timeoutMs, idempotencyKey, signal, ...init } = options;
    const controller = new AbortController();
    const abort = () => controller.abort();
    if (signal?.aborted) abort();
    signal?.addEventListener('abort', abort);
    const timer = setTimeout(() => controller.abort(), timeoutMs ?? DEFAULT_TIMEOUT_MS);
    try {
      const headers = new Headers(init.headers || {});
      const method = (init.method || 'GET').toUpperCase();
      if (method !== 'GET' && method !== 'HEAD' && !headers.has('Content-Type') && !(init.body instanceof FormData)) {
        headers.set('Content-Type', 'application/json');
      }
      const token = await this.getToken();
      if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);
      if (idempotencyKey && !headers.has('Idempotency-Key')) headers.set('Idempotency-Key', idempotencyKey);

      let res: Response;
      try {
        res = await fetch(`${ENV.apiBase}${path}`, { ...init, headers, signal: controller.signal });
      } catch (e: unknown) {
        if (controller.signal.aborted) throw new ApiError('The request took too long. Please check your connection and try again.', 0, 'TIMEOUT');
        throw new ApiError('We could not connect. Please check your connection and try again.', 0, 'NETWORK_ERROR');
      }

      // A response from the previous account must never reach the new one.
      if (token && token !== await this.getToken()) throw new ApiError('Your session changed. Please try again.', 0, 'SESSION_CHANGED');
      if (res.status === 204) return undefined as T;
      let data: { error?: { message?: string; code?: string } };
      try { data = await res.json(); } catch {
        if (controller.signal.aborted) throw new ApiError('The request took too long. Please try again.', 0, 'TIMEOUT');
        throw new ApiError('The server returned an unreadable response. Please try again.', res.status, 'INVALID_RESPONSE');
      }
      if (token && token !== await this.getToken()) throw new ApiError('Your session changed. Please try again.', 0, 'SESSION_CHANGED');
      if (data === null || typeof data !== 'object' || Array.isArray(data)) throw new ApiError('The server returned an invalid response. Please try again.', 502, 'INVALID_RESPONSE');
      if (!res.ok) {
        const error = new ApiError(patientFriendlyMessage(res.status, data?.error?.code, data?.error?.message || ''), res.status, data?.error?.code);
        if (res.status === 401 && token) this.onExpired?.(token);
        throw error;
      }
      return data as T;
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
    }
  }

  get<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'GET' });
  }
}
