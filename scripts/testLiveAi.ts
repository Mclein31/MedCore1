import { seedPassword } from './seedPassword';
import assert from 'node:assert/strict';
import app from '../apps/server/src/index';
import { getAiConfig } from '../apps/server/src/config/aiConfig';

// Explicit live verification: real selected encounters, real Gemini transport, no reseeding.
// An optional base URL tests the deployed Worker/Vercel proxy instead of local routes.
const config = getAiConfig();
const base = process.env.MEDCORE_AI_VERIFY_BASE_URL?.replace(/\/$/, '');
let token: string | undefined;
async function request(path: string, body?: object) {
  const options: RequestInit = {
    method: body ? 'POST' : 'GET',
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(70000)
  };
  const response = base ? await fetch(`${base}/api/v1${path}`, options) : await app.request(`/api/v1${path}`, options, { NODE_ENV: 'development', GEMINI_API_KEY: config.geminiApiKey });
  const data: any = await response.json();
  assert.equal(response.status, 200, `${path}: HTTP ${response.status} (${data?.error?.code || 'unknown'})`);
  return data;
}
async function main() {
  const login = await request('/auth/login', {
    email: process.env.MEDCORE_AI_VERIFY_EMAIL || 'elena.santos@stjude.ph',
    password: process.env.MEDCORE_AI_VERIFY_PASSWORD || seedPassword(),
    facilityCode: 'SJMC-MNL'
  });
  token = login.token;
  assert.ok(token, 'Login must return a session token');
  const census = await request('/encounters');
  const encounters: any[] = census.items;
  assert.ok(encounters?.length >= 2);
  const selected: any[] = [];
  for (const enc of encounters) {
    const item = enc.items.find((i: any) => i.patientOop > 0 && i.status === 'DISALLOWED_SUNDRY');
    if (item && !selected.some(s => s.enc.primaryIcd10 === enc.primaryIcd10)) selected.push({ enc, item });
    if (selected.length === 2) break;
  }
  assert.equal(selected.length, 2, 'Need two distinct diagnoses with actual denied items');
  const letters: string[] = [];
  for (const { enc, item } of selected) {
    const appeal = await request('/ai/hmo/generate-appeal', { encounterId: enc.uuid, deniedItemDescription: item.description, deniedAmount: item.patientOop });
    assert.ok(appeal.modelUsed && !appeal.modelUsed.includes('fallback'));
    assert.ok(appeal.appealLetterMarkdown.includes(appeal.referenceNumber));
    assert.ok(appeal.appealLetterMarkdown.toLowerCase().includes(item.description.toLowerCase()));
    letters.push(appeal.appealLetterMarkdown);
    const audit = await request('/ai/claims/preflight-scrub', { encounterId: enc.uuid });
    assert.equal(audit.claimContext.primaryIcd10, enc.philhealth.primaryIcd10);
    assert.equal(audit.claimContext.primaryDiagnosis, enc.philhealth.primaryDescription);
    assert.equal(audit.claimContext.totalCaseRate, enc.philhealth.totalCaseRate);
    const computed = Math.min(.99, Math.round((audit.riskCalculation.baseRisk + audit.riskCalculation.penalties.reduce((n: number, p: any) => n + p.points, 0)) * 10000) / 10000);
    assert.equal(audit.rthRiskScore, computed);
    assert.equal(audit.passThreshold, audit.rthRiskScore <= .15);
    const refreshed = await request(`/encounters/${enc.uuid}`);
    const saved = refreshed.encounter || refreshed;
    assert.equal(saved.philhealth.rthRiskScore, audit.rthRiskScore, `Stored risk for ${enc.id} disagrees with audit response`);
    console.log(JSON.stringify({ encounter: enc.id, primaryIcd10: audit.claimContext.primaryIcd10, caseRate: audit.claimContext.totalCaseRate, appealModel: appeal.modelUsed, scrubModel: audit.modelUsed, risk: audit.rthRiskScore, firstRequestStatus: 200, riskPersisted: true }));
  }
  assert.notEqual(letters[0], letters[1], 'Distinct cases cannot return the same canned letter');
  const enc = selected[0].enc;
  const staffToken = token;
  const mobileLogin = await request('/auth/login', { email: 'mobile.admin.demo@example.test', password: seedPassword(), facilityCode: 'SJMC-MNL' });
  token = mobileLogin.token;
  try {
    const cora = await request('/ai/cora/chat', { encounterId: enc.uuid, message: 'Explain my remaining balance using the exact current ledger values.', language: 'en' });
    assert.ok(cora.modelUsed && !cora.modelUsed.includes('fallback'));
    assert.equal(cora.scopeDecision, 'ANSWERED');
    assert.equal(cora.groundedBalance.remainingBalance, enc.remainingBalance);
    assert.doesNotMatch(cora.reply, /^(hello|hi|I['’]m Cora)/i);
    console.log(JSON.stringify({ feature: 'Cora', model: cora.modelUsed, groundedBalanceMatches: true, directAnswer: true }));
  } finally {
    await request('/auth/logout', {}).catch(() => {});
    token = staffToken;
  }
  const briefing = await request('/ai/executive/briefing', { forceRefresh: true });
  assert.equal(briefing.metricsSummary.activeInpatients, encounters.filter(e => e.stage !== 'CLEARED_GATE_PASS').length);
  assert.equal(briefing.metricsSummary.reclaimedBedHoursLast24h, null);
  console.log(JSON.stringify({ feature: 'briefing', activeInpatients: briefing.metricsSummary.activeInpatients, realCensusMatches: true }));
  const ocr = await request('/ai/ocr/extract-card', { imageBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==' });
  assert.equal(ocr.cardType, 'UNKNOWN'); assert.equal(ocr.idNumber, '');
  console.log(JSON.stringify({ feature: 'OCR', blankImageInventedCredentials: false }));
  console.log(`LIVE_AI_VERIFIED via ${base || 'local application'}: 2 different appeals/audits, actual diagnosis/case rate, persisted score, Cora, briefing and OCR.`);
}
try { await main(); }
catch (error) { console.error(error instanceof Error ? error.message : 'Live verification failed'); process.exitCode = 1; }
finally { if (token) await request('/auth/logout', {}).catch(() => {}); }
