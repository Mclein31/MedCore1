/// <reference path="../apps/mobile/node_modules/react-native/src/types/globals.d.ts" />
// Authorized Cora reads only; repeats one useful generation, never changes billing/audit risk.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
process.loadEnvFile('.env');
const base = process.env.MEDCORE_AI_CACHE_BASE_URL;
assert.ok(base?.startsWith('https://'), 'Set MEDCORE_AI_CACHE_BASE_URL to the hosted backend.');
const backend = base!;
process.env.EXPO_PUBLIC_API_BASE_URL = backend;
process.env.NODE_ENV = 'production';
const { ApiClient } = await import('../apps/mobile/src/lib/api');
const { createPatientApi } = await import('../apps/mobile/src/services/patientApi');
let token: string | null = null, patientId: string | null = null;
let client = new ApiClient(async () => token);
try {
  const login: any = await client.request('/auth/login', { method: 'POST', body: JSON.stringify({ email: process.env.MEDCORE_MOBILE_AI_VERIFY_EMAIL || 'mobile.admin.demo@example.test', password: process.env.MEDCORE_MOBILE_AI_VERIFY_PASSWORD || 'HospitalRCM2026!', facilityCode: 'SJMC-MNL' }) });
  token = login.token; assert.ok(token);
  assert.ok(login.user.role === 'PATIENT_GUARANTOR' || login.user.mobileDemoAdmin);
  let encounter;
  if (login.user.mobileDemoAdmin) {
    const directory = await createPatientApi(client).listHospitalPatients();
    for (const patient of directory.items.slice(0, 15)) {
      patientId = patient.id;
      client = new ApiClient(async () => token, undefined, { patientId, getCurrent: () => patientId });
      const overview = await createPatientApi(client).getOverview();
      if (overview.currentEncounter?.uuid) { encounter = overview.currentEncounter; break; }
    }
  } else encounter = (await createPatientApi(client).getOverview()).currentEncounter;
  assert.ok(encounter?.uuid);
  const body = { encounterId: encounter.uuid, message: 'Please explain my recorded hospital balance and existing deductions.', language: 'en', mode: 'WHY_DO_I_OWE' };
  const request = async () => {
    const started = Date.now();
    const response = await fetch(`${backend.replace(/\/$/, '')}/api/v1/ai/cora/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(patientId ? { 'X-Medcore-Patient-Id': patientId } : {}) }, body: JSON.stringify(body), signal: AbortSignal.timeout(75_000) });
    assert.equal(response.status, 200, 'Hosted Cora cache request must succeed.');
    const result: any = await response.json();
    assert.equal(result.language, 'en'); assert.equal(result.scopeDecision, 'ANSWERED');
    assert.equal(result.groundedBalance.remainingBalance, Number(encounter.remainingBalance));
    return { result, cache: response.headers.get('X-AI-Cache'), elapsedMs: Date.now() - started };
  };
  const first = await Promise.all([request(), request()]);
  assert.ok(first.every(item => ['GENERATED', 'SHARED', 'HIT'].includes(item.cache || '')));
  assert.ok(first.filter(item => item.cache === 'GENERATED').length <= 1);
  assert.deepEqual(first[0].result, first[1].result);
  const repeat = await request(); assert.equal(repeat.cache, 'HIT'); assert.deepEqual(repeat.result, first[0].result);
  const results = [...first, repeat].map(({ cache, elapsedMs }) => ({ cache, elapsedMs }));
  const report = { hostedCoraVerified: true, concurrentResponsesIdentical: true, subsequentRequestUsedCachedResult: true, selectedLanguageAndBalanceVerified: true, clinicalRecordsReadOnly: true, noPatientNamesIdentifiersAmountsRepliesOrTokensSaved: true, results };
  await mkdir('docs/validation/ai-cache', { recursive: true });
  await writeFile('docs/validation/ai-cache/hosted-results.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
} finally { if (token) await client.request('/auth/logout', { method: 'POST' }).catch(() => {}); }
