// Read-only hosted route/storage smoke test. Never dispatches an SMS or runs an AI feature.
import { seedPassword } from './seedPassword';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const base = process.env.MEDCORE_SMS_BASE_URL;
assert.ok(base?.startsWith('https://'), 'Set MEDCORE_SMS_BASE_URL to the existing hosted backend.');
const backend = base!;
let token: string | undefined;
const request = async (path: string, body?: object) => {
  const response = await fetch(`${backend.replace(/\/$/, '')}/api/v1${path}`, { method: body ? 'POST' : 'GET', headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(20_000) });
  return { status: response.status, data: await response.json() as any };
};
try {
  assert.equal((await request('/notifications/sms-outbox')).status, 401);
  const login = await request('/auth/login', { email: process.env.MEDCORE_SMS_VERIFY_EMAIL || 'elena.santos@stjude.ph', password: process.env.MEDCORE_SMS_VERIFY_PASSWORD || seedPassword(), facilityCode: 'SJMC-MNL' });
  assert.equal(login.status, 200); assert.ok(['BILLING_SPECIALIST', 'HOSPITAL_CFO'].includes(login.data.user.role));
  token = login.data.token; assert.ok(token);
  const outbox = await request('/notifications/sms-outbox'); assert.equal(outbox.status, 200); assert.ok(Array.isArray(outbox.data.items));
  assert.ok(outbox.data.items.every((item: any) => item.simulated === true && item.provider === 'SIMULATOR'));
  const report = { hostedAuthenticatedSmsOutboxVerified: true, anonymousAccessRejected: true,
    sandboxOnlyRows: true, noSmsDispatchedDuringHostedCheck: true, noAiFeaturesCalled: true,
    noPatientNamesIdentifiersPhonesBodiesCredentialsOrTokensSaved: true };
  await mkdir('docs/validation/sms-sandbox', { recursive: true });
  await writeFile('docs/validation/sms-sandbox/hosted-results.json', JSON.stringify(report, null, 2)+'\n');
  console.log(JSON.stringify(report));
} finally { if (token) await request('/auth/logout', {}).catch(() => {}); }
