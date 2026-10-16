import type {
  FileDisputeBody,
  PatientCodeRequestBody,
  PatientPaymentBody,
  PromissoryBody,
} from '@medcore/domain';
import type { z } from 'zod';
import type { TokenStore } from './tokenStore';
import type { Installment, PatientMe, PaymentReceipt, StayDetail, StayRow } from './types';

/**
 * The only way the app talks to the MedCore v2 API.
 * - The session is a bearer token from the keychain; there are no cookies.
 * - Card numbers, CVVs and expiry dates have no field here: a card payment carries brand and last 4 only.
 * - Money-moving calls take an Idempotency-Key so a retry can never charge twice.
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

export type CodeIdentity = z.input<typeof PatientCodeRequestBody>;
export type PaymentInput = z.input<typeof PatientPaymentBody>;
export type PromissoryInput = z.input<typeof PromissoryBody>;
export type DisputeInput = z.input<typeof FileDisputeBody>;

export interface ApiClientOptions {
  /** Origin of the API, e.g. http://localhost:8787 (no trailing /api). */
  baseUrl: string;
  tokens: TokenStore;
  fetch?: typeof fetch;
  /** Called once a request fails because the session is gone; the token is already cleared. */
  onSignedOut?: () => void;
  timeoutMs?: number;
}

interface RequestOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
  idempotencyKey?: string;
  /** Sign-in calls never carry a token. */
  anonymous?: boolean;
}

const IDEMPOTENCY_KEY = /^[A-Za-z0-9-]{16,64}$/;

export function createApiClient(options: ApiClientOptions) {
  const base = options.baseUrl.replace(/\/+$/, '');
  const doFetch = options.fetch ?? fetch;
  const timeoutMs = options.timeoutMs ?? 20_000;
  const { tokens } = options;

  async function request<T>(path: string, init: RequestOptions = {}): Promise<T> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      // Harmless for bearer requests and required by the API's CSRF check on the anonymous sign-in calls.
      'X-MedCore-CSRF': '1',
    };
    const token = init.anonymous ? null : tokens.get();
    if (!init.anonymous && !token) {
      throw new ApiRequestError(401, 'UNAUTHENTICATED', 'Please sign in again.');
    }
    if (token) headers.Authorization = `Bearer ${token}`;
    if (init.body !== undefined) headers['Content-Type'] = 'application/json';
    if (init.idempotencyKey !== undefined) {
      if (!IDEMPOTENCY_KEY.test(init.idempotencyKey)) throw new Error('Invalid idempotency key.');
      headers['Idempotency-Key'] = init.idempotencyKey;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let response: Response;
    try {
      response = await doFetch(`${base}/api${path}`, {
        method: init.method ?? 'GET',
        headers,
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
        signal: controller.signal,
      });
    } catch {
      throw new ApiRequestError(
        0,
        'NETWORK',
        'We could not reach the hospital. Check your connection and try again.',
      );
    } finally {
      clearTimeout(timer);
    }

    const text = await response.text().catch(() => '');
    const data = text ? safeJson(text) : null;
    if (!response.ok) {
      const error = (data as ErrorEnvelope | null)?.error;
      // Only a token that was actually sent can be rejected; anonymous 401s are wrong codes.
      if (response.status === 401 && token) {
        await tokens.clear().catch(() => undefined);
        options.onSignedOut?.();
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

  return {
    /** Ask the hospital to email a sign-in code. The response is the same whether or not details matched. */
    requestCode: (identity: CodeIdentity) =>
      request<{ sent: true; expiresInMinutes: number; message: string }>('/v1/auth/patient/code/request', {
        method: 'POST',
        body: identity,
        anonymous: true,
      }),

    /** Exchange the emailed code for a bearer token and save it in the keychain. */
    async verifyCode(identity: CodeIdentity, code: string): Promise<void> {
      const result = await request<{ status: string; token?: string; expiresAt?: string }>(
        '/v1/auth/patient/code/verify',
        { method: 'POST', body: { ...identity, code, client: 'mobile' }, anonymous: true },
      );
      if (result?.status !== 'SIGNED_IN' || !result.token) {
        throw new ApiRequestError(500, 'NO_TOKEN', 'Sign-in did not complete. Please try again.');
      }
      await tokens.set(result.token);
    },

    /** Revoke the session on the server, then forget it on the device no matter what the server said. */
    async logout(): Promise<void> {
      try {
        if (tokens.get()) await request('/v1/auth/patient/logout', { method: 'POST' });
      } catch {
        // Offline or already expired: the device copy is still removed below.
      } finally {
        await tokens.clear();
      }
    },

    me: () => request<PatientMe>('/v1/auth/patient/me'),

    stays: () => request<{ items: StayRow[] }>('/v1/patient/stays'),

    stay: (id: string) => request<StayDetail>(`/v1/patient/stays/${encodeURIComponent(id)}`),

    pay: (stayId: string, payment: PaymentInput, idempotencyKey: string) =>
      request<PaymentReceipt>(`/v1/patient/stays/${encodeURIComponent(stayId)}/payments`, {
        method: 'POST',
        idempotencyKey,
        body: pickPayment(payment),
      }),

    signPromissoryNote: (stayId: string, note: PromissoryInput) =>
      request<{ noteNumber: string; schedule: Installment[] }>(
        `/v1/patient/stays/${encodeURIComponent(stayId)}/promissory-notes`,
        { method: 'POST', body: note },
      ),

    questionCharge: (stayId: string, dispute: DisputeInput) =>
      request<{ id: string; status: string }>(`/v1/patient/stays/${encodeURIComponent(stayId)}/disputes`, {
        method: 'POST',
        body: dispute,
      }),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;

/** Copy only the fields the API accepts, so nothing else a form holds can leak into the request. */
function pickPayment(p: PaymentInput): PaymentInput {
  return {
    amountCents: p.amountCents,
    rail: p.rail,
    payerName: p.payerName,
    ...(p.rail === 'CARD' ? { cardBrand: p.cardBrand, cardLast4: p.cardLast4 } : {}),
    ...(p.rail === 'BANK_TRANSFER' ? { bank: p.bank } : {}),
  };
}

interface ErrorEnvelope {
  error?: {
    code?: string;
    message?: string;
    requestId?: string;
    details?: { fields?: { path: string; message: string }[] };
  };
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** A key per logical money action; reused on retry so the server never records it twice. */
export function newIdempotencyKey(randomUUID: () => string): string {
  return `mobile-${randomUUID()}`;
}

export function errorMessage(err: unknown): string {
  if (err instanceof ApiRequestError) {
    const field = err.fields?.[0];
    return field && err.code === 'VALIDATION_FAILED' ? `${err.message} ${field.message}` : err.message;
  }
  return 'Something went wrong. Please try again.';
}
