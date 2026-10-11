import assert from 'node:assert/strict';
import { ApiClient, ApiError } from '../src/api/client';
import { AuthApi } from '../src/api/auth';

const originalFetch = globalThis.fetch;
let passed = 0;
async function check(name: string, test: () => Promise<void>) {
  await test(); passed++; console.log(`[PASS] ${name}`);
}
const rejected = (status: number, code: string) => new Response(JSON.stringify({ error: { code, message: 'Rejected' } }), { status, headers: { 'Content-Type': 'application/json' } });
try {
  await check('Final LOA requests carry bearer auth and session cookies', async () => {
    const client = new ApiClient('https://hospital.example.test'); client.setAuthToken('valid');
    globalThis.fetch = (async (_url, config) => {
      assert.equal(new Headers(config?.headers).get('Authorization'), 'Bearer valid');
      assert.equal(config?.credentials, 'include');
      return new Response(JSON.stringify({ success: true, encounter: { hmo: { finalLoaStatus: 'APPROVED' } } }));
    }) as typeof fetch;
    const res = await client.request('/encounters/own/hmo/final-loa', { method: 'POST', body: '{}' });
    assert.equal(res.encounter.hmo.finalLoaStatus, 'APPROVED');
  });
  await check('expired protected requests invalidate cached sessions and notify once', async () => {
    const client = new ApiClient(); client.setAuthToken('expired'); let expired = 0;
    client.onSessionExpired(() => { expired++; });
    globalThis.fetch = (async () => rejected(401, 'UNAUTHORIZED')) as typeof fetch;
    await assert.rejects(client.request('/encounters/own/hmo/final-loa'), (err: unknown) => err instanceof ApiError && err.status === 401);
    assert.equal(client.getAuthToken(), null); assert.equal(expired, 1);
  });
  await check('invalid login, forbidden roles and outages do not impersonate session expiry', async () => {
    for (const [status, code, endpoint] of [[401, 'INVALID_CREDENTIALS', '/auth/login'], [403, 'FORBIDDEN', '/encounters/own/hmo/final-loa'], [503, 'AUTH_UNAVAILABLE', '/auth/me']] as const) {
      const client = new ApiClient(); client.setAuthToken('valid'); let expired = false;
      client.onSessionExpired(() => { expired = true; });
      globalThis.fetch = (async () => rejected(status, code)) as typeof fetch;
      await assert.rejects(client.request(endpoint)); assert.equal(expired, false); assert.equal(client.getAuthToken(), 'valid');
    }
    const client = new ApiClient(); client.setAuthToken('valid');
    globalThis.fetch = (async () => { throw new TypeError('Offline'); }) as typeof fetch;
    await assert.rejects(client.request('/auth/me')); assert.equal(client.getAuthToken(), 'valid');
  });
  await check('unauthenticated /auth/me resolves cleanly without firing session expired notifications', async () => {
    const client = new ApiClient();
    let expired = false;
    client.onSessionExpired(() => { expired = true; });
    globalThis.fetch = (async () => rejected(401, 'UNAUTHORIZED')) as typeof fetch;
    const authApi = new AuthApi(client);
    const result = await authApi.getMe();
    assert.equal(result.authenticated, false);
    assert.equal(result.user, null);
    assert.equal(expired, false);
  });
  await check('token-only logout revokes before removing bearer credentials', async () => {
    const client = new ApiClient(); client.setAuthToken('logout-token');
    globalThis.fetch = (async (_url, config) => {
      assert.equal(new Headers(config?.headers).get('Authorization'), 'Bearer logout-token');
      return new Response('{"success":true}');
    }) as typeof fetch;
    await new AuthApi(client).logout(); assert.equal(client.getAuthToken(), null);
  });
  await check('late JSON and XML responses cannot cross account boundaries', async () => {
    for (const xml of [false, true]) {
      const client = new ApiClient(); client.setAuthToken('old');
      globalThis.fetch = (async () => ({ ok: true, status: 200, headers: new Headers({ 'content-type': xml ? 'application/xml' : 'application/json' }), text: async () => { client.setAuthToken('new'); return '<soa/>'; }, json: async () => { client.setAuthToken('new'); return {}; } })) as typeof fetch;
      await assert.rejects(client.request('/test'), (err: unknown) => err instanceof ApiError && err.code === 'SESSION_CHANGED');
      assert.equal(client.getAuthToken(), 'new');
    }
  });
  await check('rejected role switches preserve the verified role header', async () => {
    const client = new ApiClient(); client.setDemoRole('BILLING_SPECIALIST');
    globalThis.fetch = (async () => rejected(403, 'FORBIDDEN')) as typeof fetch;
    await assert.rejects(new AuthApi(client).switchRole('HOSPITAL_CFO'));
    assert.equal(client.getDemoRole(), 'BILLING_SPECIALIST');
  });
  console.log(`DASHBOARD_AUTH_CHECKS_DONE passed=${passed}; no network or database connected`);
} finally { globalThis.fetch = originalFetch; }
