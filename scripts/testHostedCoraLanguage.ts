/// <reference path="../apps/mobile/node_modules/react-native/src/types/globals.d.ts" />
import { seedPassword } from './seedPassword';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import type { CoraLanguage } from '../apps/shared/coraLanguage';
process.loadEnvFile('.env');
const base = process.env.MEDCORE_CORA_LANGUAGE_BASE_URL;
assert.ok(base?.startsWith('https://'), 'Set MEDCORE_CORA_LANGUAGE_BASE_URL to the hosted backend.');
process.env.EXPO_PUBLIC_API_BASE_URL = base;
process.env.NODE_ENV = 'production';
const { ApiClient } = await import('../apps/mobile/src/lib/api');
const { createAiApi } = await import('../apps/mobile/src/services/aiApi');
const { createPatientApi } = await import('../apps/mobile/src/services/patientApi');
let token: string | null = null, selectedPatientId: string | null = null;
let client = new ApiClient(async () => token);
const results = [];
try {
  const login:any = await client.request('/auth/login', { method: 'POST', body: JSON.stringify({ email: process.env.MEDCORE_MOBILE_AI_VERIFY_EMAIL || 'mobile.admin.demo@example.test', password: process.env.MEDCORE_MOBILE_AI_VERIFY_PASSWORD || seedPassword(), facilityCode: 'SJMC-MNL' }) });
  token = login.token; assert.ok(token);
  assert.ok(login.user.role === 'PATIENT_GUARANTOR' || login.user.mobileDemoAdmin);
  let encounter;
  if (login.user.mobileDemoAdmin) {
    const directory = await createPatientApi(client).listHospitalPatients();
    for (const patient of directory.items.slice(0, 15)) {
      selectedPatientId = patient.id;
      client = new ApiClient(async () => token, undefined, { patientId: selectedPatientId, getCurrent: () => selectedPatientId });
      const overview = await createPatientApi(client).getOverview();
      if (overview.currentEncounter?.uuid && Number(overview.currentEncounter.remainingBalance) > 0) { encounter = overview.currentEncounter; break; }
    }
  } else encounter = (await createPatientApi(client).getOverview()).currentEncounter;
  assert.ok(encounter?.uuid, 'The authorized selected patient needs an encounter.');
  const ai = createAiApi(client);
  for (const language of ['en', 'tl', 'fil', 'ilo'] as CoraLanguage[]) {
    const started = Date.now();
    const message = language === 'en' ? 'Bakit may natitira pa akong babayaran? Sabihin ang kasalukuyang natitirang halaga.' : 'Why do I still owe money? State my actual remaining balance.';
    const answer = await ai.sendCoraMessage(message, language, encounter.uuid, 'WHY_DO_I_OWE', undefined, [{ role: 'user', content: 'Explain my recorded hospital bill.' }, { role: 'assistant', content: language === 'en' ? 'May mga bawas at pagbabayad sa iyong talaan.' : 'Your bill includes the recorded benefits and payments.' }]);
    assert.equal(answer.language, language);
    assert.equal(answer.scopeDecision, 'ANSWERED');
    assert.equal(answer.groundedBalance.remainingBalance, Number(encounter.remainingBalance));
    assert.ok(answer.modelUsed && answer.modelUsed !== 'policy-gate');
    const item = { language, selectedLanguageVerified: true, authoritativeBalanceMatches: true, modelUsed: answer.modelUsed, elapsedMs: Date.now() - started };
    results.push(item); console.log(JSON.stringify(item));
  }
  await mkdir('docs/validation/cora-language', { recursive: true });
  await writeFile('docs/validation/cora-language/hosted-results.json', JSON.stringify({ actualMobileClient: true, actualHostedCoraRoute: true, recordsReadOnly: true, noPatientNamesAmountsIdentifiersOrRepliesSaved: true, results }, null, 2));
  console.log('HOSTED_CORA_LANGUAGE_VERIFIED: actual mobile client, four selected languages and own-chart grounded balances.');
} finally { if (token) await client.request('/auth/logout', { method: 'POST' }).catch(() => {}); }
