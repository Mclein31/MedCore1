import { describe, expect, it, vi } from 'vitest';
import { ApiRequestError, createApiClient, errorMessage, newIdempotencyKey } from '../src/lib/apiClient';
import { memoryStorage, TokenStore } from '../src/lib/tokenStore';

const TOKEN = 'abcdefghijklmnopqrstuvwxyz0123456789-_ABCDE';
const STAY = '3f1c2a8e-7b6d-4c5e-9f0a-1b2c3d4e5f60';
const KEY = 'mobile-0d9a7c1e-2b3f-4a5d-8e6f-7a8b9c0d1e2f';

interface Call {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: unknown;
}

async function setup(
  opts: { token?: string | null; respond?: (call: Call) => Response | Promise<Response> } = {},
) {
  const storage = memoryStorage(opts.token ?? null);
  const tokens = new TokenStore(storage);
  const calls: Call[] = [];
  const fetchMock = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const call: Call = {
      url: String(url),
      method: init?.method ?? 'GET',
      headers: init?.headers as Record<string, string>,
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    };
    calls.push(call);
    return opts.respond ? opts.respond(call) : json(200, {});
  });
  const onSignedOut = vi.fn();
  const api = createApiClient({
    baseUrl: 'http://localhost:8787/',
    tokens,
    fetch: fetchMock as unknown as typeof fetch,
    onSignedOut,
  });
  await tokens.restore();
  return { api, tokens, storage, calls, onSignedOut, fetchMock };
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

const identity = { purpose: 'LOGIN' as const, facilityCode: 'SJMC-MNL', email: 'ana@example.test' };

describe('sign-in', () => {
  it('requests a code anonymously with the CSRF header the API requires', async () => {
    const { api, calls } = await setup({
      token: TOKEN,
      respond: () => json(202, { sent: true, expiresInMinutes: 10, message: 'ok' }),
    });
    await api.requestCode(identity);
    expect(calls[0]!.url).toBe('http://localhost:8787/api/v1/auth/patient/code/request');
    expect(calls[0]!.method).toBe('POST');
    expect(calls[0]!.headers['X-MedCore-CSRF']).toBe('1');
    expect(calls[0]!.headers.Authorization).toBeUndefined();
    expect(calls[0]!.body).toEqual(identity);
  });

  it('verifies as a mobile client and keeps the returned token in secure storage', async () => {
    const { api, calls, tokens, storage } = await setup({
      respond: () => json(200, { status: 'SIGNED_IN', token: TOKEN, expiresAt: '2026-11-15T00:00:00Z' }),
    });
    await api.verifyCode(identity, '123456');
    expect(calls[0]!.url).toBe('http://localhost:8787/api/v1/auth/patient/code/verify');
    expect(calls[0]!.body).toEqual({ ...identity, code: '123456', client: 'mobile' });
    expect(tokens.get()).toBe(TOKEN);
    expect(storage.current()).toBe(TOKEN);
  });

  it('fails when the server signs in without returning a token (web-style response)', async () => {
    const { api, tokens } = await setup({ respond: () => json(200, { status: 'SIGNED_IN' }) });
    await expect(api.verifyCode(identity, '123456')).rejects.toMatchObject({ code: 'NO_TOKEN' });
    expect(tokens.get()).toBeNull();
  });

  it('surfaces a wrong code without signing anybody out', async () => {
    const { api, onSignedOut } = await setup({
      respond: () => json(401, { error: { code: 'CODE_INVALID', message: 'That code is not right.' } }),
    });
    const err = await api.verifyCode(identity, '000000').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiRequestError);
    expect(err).toMatchObject({ status: 401, code: 'CODE_INVALID', message: 'That code is not right.' });
    expect(onSignedOut).not.toHaveBeenCalled();
  });
});

describe('authenticated requests', () => {
  it('sends the bearer token and reads stays', async () => {
    const items = [{ id: STAY, encounterNumber: 'E-1' }];
    const { api, calls } = await setup({ token: TOKEN, respond: () => json(200, { items }) });
    await expect(api.stays()).resolves.toEqual({ items });
    expect(calls[0]!.url).toBe('http://localhost:8787/api/v1/patient/stays');
    expect(calls[0]!.headers.Authorization).toBe(`Bearer ${TOKEN}`);
  });

  it('does not call the network when signed out', async () => {
    const { api, fetchMock } = await setup();
    await expect(api.stays()).rejects.toMatchObject({ status: 401, code: 'UNAUTHENTICATED' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('clears the token and reports sign-out when the server rejects the session', async () => {
    const { api, tokens, storage, onSignedOut } = await setup({
      token: TOKEN,
      respond: () => json(401, { error: { code: 'UNAUTHENTICATED', message: 'Please sign in again.' } }),
    });
    await expect(api.stay(STAY)).rejects.toMatchObject({ status: 401 });
    expect(tokens.get()).toBeNull();
    expect(storage.current()).toBeNull();
    expect(onSignedOut).toHaveBeenCalledTimes(1);
  });

  it('keeps the session on other errors and passes the server message and fields through', async () => {
    const { api, tokens, onSignedOut } = await setup({
      token: TOKEN,
      respond: () =>
        json(422, {
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Some fields need attention.',
            requestId: 'req-1',
            details: { fields: [{ path: 'reason', message: 'Too short.' }] },
          },
        }),
    });
    const err = await api
      .questionCharge(STAY, { chargeId: STAY, category: 'OTHER', reason: 'short' })
      .catch((e: unknown) => e);
    expect(err).toMatchObject({ status: 422, code: 'VALIDATION_FAILED', requestId: 'req-1' });
    expect(errorMessage(err)).toBe('Some fields need attention. Too short.');
    expect(tokens.get()).toBe(TOKEN);
    expect(onSignedOut).not.toHaveBeenCalled();
  });

  it('turns network failures and non-JSON errors into friendly errors', async () => {
    const offline = await setup({
      token: TOKEN,
      respond: () => {
        throw new TypeError('Network request failed');
      },
    });
    await expect(offline.api.stays()).rejects.toMatchObject({ status: 0, code: 'NETWORK' });

    const proxy = await setup({
      token: TOKEN,
      respond: () => new Response('<html>Bad gateway</html>', { status: 502 }),
    });
    await expect(proxy.api.stays()).rejects.toMatchObject({
      status: 502,
      code: 'HTTP_ERROR',
      message: 'Something went wrong. Please try again.',
    });
  });

  it('url-encodes stay ids', async () => {
    const { api, calls } = await setup({ token: TOKEN, respond: () => json(200, {}) });
    await api.stay('../admin');
    expect(calls[0]!.url).toBe('http://localhost:8787/api/v1/patient/stays/..%2Fadmin');
  });
});

describe('payments', () => {
  const receipt = { reference: 'PAY-1', amountCents: 150000, officialReceiptNumber: 'OR-1', replayed: false };

  it('sends the Idempotency-Key header and only brand + last 4 for cards', async () => {
    const { api, calls } = await setup({ token: TOKEN, respond: () => json(201, receipt) });
    const form = {
      amountCents: 150000,
      rail: 'CARD' as const,
      payerName: 'Ana Reyes',
      cardBrand: 'VISA' as const,
      cardLast4: '4242',
      bank: 'BPI' as const,
      // A form might hold more than the API accepts; none of it may be sent.
      cardNumber: '4242424242424242',
      cvv: '123',
    };
    await expect(api.pay(STAY, form, KEY)).resolves.toEqual(receipt);
    expect(calls[0]!.url).toBe(`http://localhost:8787/api/v1/patient/stays/${STAY}/payments`);
    expect(calls[0]!.headers['Idempotency-Key']).toBe(KEY);
    expect(calls[0]!.body).toEqual({
      amountCents: 150000,
      rail: 'CARD',
      payerName: 'Ana Reyes',
      cardBrand: 'VISA',
      cardLast4: '4242',
    });
    expect(JSON.stringify(calls[0]!.body)).not.toContain('4242424242424242');
  });

  it('sends the bank only for bank transfers and nothing card-related for wallets', async () => {
    const { api, calls } = await setup({ token: TOKEN, respond: () => json(201, receipt) });
    await api.pay(
      STAY,
      { amountCents: 100, rail: 'BANK_TRANSFER', payerName: 'Ana', bank: 'BDO', cardLast4: '1111' },
      KEY,
    );
    await api.pay(STAY, { amountCents: 100, rail: 'GCASH', payerName: 'Ana', bank: 'BDO' }, KEY);
    expect(calls[0]!.body).toEqual({
      amountCents: 100,
      rail: 'BANK_TRANSFER',
      payerName: 'Ana',
      bank: 'BDO',
    });
    expect(calls[1]!.body).toEqual({ amountCents: 100, rail: 'GCASH', payerName: 'Ana' });
  });

  it('refuses a malformed idempotency key before calling the API', async () => {
    const { api, fetchMock } = await setup({ token: TOKEN });
    await expect(
      api.pay(STAY, { amountCents: 100, rail: 'GCASH', payerName: 'Ana' }, 'bad key'),
    ).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('builds idempotency keys the API accepts', () => {
    const key = newIdempotencyKey(() => '0d9a7c1e-2b3f-4a5d-8e6f-7a8b9c0d1e2f');
    expect(key).toMatch(/^[A-Za-z0-9-]{16,64}$/);
  });
});

describe('logout', () => {
  it('revokes the session on the server and forgets it on the device', async () => {
    const { api, calls, tokens, storage } = await setup({
      token: TOKEN,
      respond: () => json(200, { ok: true }),
    });
    await api.logout();
    expect(calls[0]!.url).toBe('http://localhost:8787/api/v1/auth/patient/logout');
    expect(calls[0]!.method).toBe('POST');
    expect(calls[0]!.headers.Authorization).toBe(`Bearer ${TOKEN}`);
    expect(tokens.get()).toBeNull();
    expect(storage.current()).toBeNull();
  });

  it('still forgets the token when the server cannot be reached', async () => {
    const { api, tokens, storage } = await setup({
      token: TOKEN,
      respond: () => {
        throw new TypeError('offline');
      },
    });
    await expect(api.logout()).resolves.toBeUndefined();
    expect(tokens.get()).toBeNull();
    expect(storage.current()).toBeNull();
  });
});
