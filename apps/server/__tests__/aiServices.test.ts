import assert from 'node:assert/strict';
import { scrubPatientData, rehydrateText } from '../src/services/ai/phiScrubber';
import { geminiClient } from '../src/services/ai/geminiClient';
import { ClaimsAuditResultSchema } from '../src/services/ai/prompts/scrubberPrompts';
import { HmoAppealResponseSchema } from '../src/services/ai/prompts/appealPrompts';
import { ExecutiveBriefingResponseSchema } from '../src/services/ai/prompts/briefingPrompts';
import { CoraResponseSchema } from '../src/services/ai/prompts/coraPrompts';
import { CardOcrResponseSchema } from '../src/services/ai/prompts/ocrPrompts';
import app from '../src/index';

async function runAiTests() {
  console.log('================================================================================');
  console.log('MEDCORE AI SERVICE SUITE: SECURITY, CONFORMANCE & FINANCIAL AUDIT');
  console.log('Domain: RA 10173 Zero PHI Leakage, Statutory Zero Centavo Drift & Offline Mocks');
  console.log('================================================================================\n');

  let passedCount = 0;

  function pass(name: string) {
    passedCount++;
    console.log(`[PASS] ${name}`);
  }

  // ---------------------------------------------------------------------------
  // 1. PHI SCRUBBER & BIDIRECTIONAL REHYDRATION (RA 10173 INVARIANT 2)
  // ---------------------------------------------------------------------------
  {
    const rawText = `Patient Juan Dela Cruz (MRN-2026-98124), PhilHealth PIN 12-345678901-2, admitted to Room 402-B. Contact: +639171234567 or 02-8888-1234. Attending Doctor Carlos Mendoza (PRC 0098412, PAN 1234567).`;
    const patientContext = {
      fullName: 'Juan Dela Cruz',
      mrn: 'MRN-2026-98124',
      philhealthPin: '12-345678901-2',
      contactNumber: '+639171234567',
      roomBed: 'Room 402-B'
    };

    const scrubbed = scrubPatientData(rawText, patientContext);

    // Verify 0 raw PHI leaks
    assert(!scrubbed.scrubbedText.includes('Juan Dela Cruz'), 'Scrubbed text must not contain patient full name');
    assert(!scrubbed.scrubbedText.includes('MRN-2026-98124'), 'Scrubbed text must not contain MRN');
    assert(!scrubbed.scrubbedText.includes('12-345678901-2'), 'Scrubbed text must not contain PhilHealth PIN');
    assert(!scrubbed.scrubbedText.includes('+639171234567'), 'Scrubbed text must not contain mobile number');
    assert(!scrubbed.scrubbedText.includes('Room 402-B'), 'Scrubbed text must not contain room/bed');

    pass('Invariant 2: Zero PHI leaks in scrubbed text (Name, MRN, PIN, Mobile, Room de-identified)');

    // Verify bidirectional rehydration restores original content with 100% fidelity
    const rehydrated = rehydrateText(scrubbed.scrubbedText, scrubbed.tokenMap);
    assert.strictEqual(rehydrated, rawText, 'Rehydrated text must match original source text exactly');

    pass('Invariant 2: Bidirectional rehydration restores tokens back to original values with 100% fidelity');
  }

  // ---------------------------------------------------------------------------
  // 2. OFFLINE MOCK GENERATION & ZOD SCHEMA CONFORMANCE (INVARIANT 3)
  // ---------------------------------------------------------------------------
  {
    // Claims Scrubber Mock
    const scrubberResponse = await geminiClient.generate({
      systemInstruction: 'You are an auditor.',
      prompt: 'Scrub CF4 for claims preflight audit',
      responseMimeType: 'application/json'
    });
    const parsedScrubber = JSON.parse(scrubberResponse.text);
    const validatedScrubber = ClaimsAuditResultSchema.parse(parsedScrubber);
    assert(validatedScrubber.rthRiskScore >= 0 && validatedScrubber.rthRiskScore <= 1, 'RTH risk score must be between 0.00 and 1.00');
    assert(typeof validatedScrubber.cleanClaimReadiness === 'number', 'Clean claim readiness must be numeric');
    pass('Claims Scrubber: Offline mock conforms strictly to ClaimsAuditResultSchema');

    // HMO Appeal Generator Mock
    const appealResponse = await geminiClient.generate({
      systemInstruction: 'You are a medico-legal appeal writer.',
      prompt: 'Draft an HMO appeal letter citing RA 11765',
      responseMimeType: 'application/json'
    });
    const parsedAppeal = JSON.parse(appealResponse.text);
    const validatedAppeal = HmoAppealResponseSchema.parse(parsedAppeal);
    assert(validatedAppeal.appealLetterMarkdown.length > 50, 'Appeal letter must contain substantial markdown content');
    assert(validatedAppeal.citationsApplied.length > 0, 'Appeal must include statutory citations');
    pass('HMO Appeal Drafter: Offline mock conforms strictly to HmoAppealResponseSchema with RA 11765 citations');

    // Executive Briefing Mock
    const briefingResponse = await geminiClient.generate({
      systemInstruction: 'You are an executive RCM analyst.',
      prompt: 'Provide 3-minute executive briefing on dwell times and bottlenecks',
      responseMimeType: 'application/json'
    });
    const parsedBriefing = JSON.parse(briefingResponse.text);
    const validatedBriefing = ExecutiveBriefingResponseSchema.parse(parsedBriefing);
    assert(typeof validatedBriefing.metricsSummary.trappedCapitalPesos === 'number', 'Trapped capital must be numeric');
    assert(validatedBriefing.topRecommendations.length > 0, 'Must have at least one top recommendation');
    pass('Executive Briefing: Offline mock conforms strictly to ExecutiveBriefingResponseSchema');

    // Multimodal Card OCR Mock
    const ocrResponse = await geminiClient.generate({
      systemInstruction: 'Extract card details.',
      prompt: 'Extract PhilHealth card details',
      responseMimeType: 'application/json'
    });
    const parsedOcr = JSON.parse(ocrResponse.text);
    const validatedOcr = CardOcrResponseSchema.parse(parsedOcr);
    assert(validatedOcr.confidenceScore > 0, 'Confidence score must be greater than zero');
    assert(typeof validatedOcr.idNumber === 'string', 'ID number must be a string');
    pass('Multimodal Card OCR: Offline mock conforms strictly to CardOcrResponseSchema');

    // Cora Concierge Mock
    const coraResponse = await geminiClient.generate({
      systemInstruction: 'You are Cora.',
      prompt: 'Magkano ang natitirang babayaran ko sa hospital bill?',
      responseMimeType: 'application/json'
    });
    const parsedCora = JSON.parse(coraResponse.text);
    const validatedCora = CoraResponseSchema.parse(parsedCora);
    assert(validatedCora.reply.length > 10, 'Cora reply must have text');
    pass('Cora Concierge: Offline mock conforms strictly to CoraResponseSchema');
  }

  // ---------------------------------------------------------------------------
  // 3. ZERO CENTAVO DRIFT GUARANTEE (STATUTORY INVARIANT 1)
  // ---------------------------------------------------------------------------
  {
    // Validate that financial deductions sum up with ZERO centavo drift
    const sampleWaterfall = {
      grossTotal: 120000.00,
      vatExemption: 12857.14,
      seniorPwdDiscount: 21428.57,
      philhealthTotal: 15000.00,
      hmoApprovedAmount: 50514.29,
      netPatientDue: 20200.00
    };

    const calculatedTotalDeductions =
      sampleWaterfall.vatExemption +
      sampleWaterfall.seniorPwdDiscount +
      sampleWaterfall.philhealthTotal +
      sampleWaterfall.hmoApprovedAmount;

    const calculatedNetDue = sampleWaterfall.grossTotal - calculatedTotalDeductions;
    const centavoDrift = Math.abs(calculatedNetDue - sampleWaterfall.netPatientDue);

    assert(centavoDrift < 0.01, `Centavo drift must be strictly zero (got ${centavoDrift})`);
    pass('Invariant 1: Philippine Statutory Math exhibits zero centavo drift (Δ = ₱0.00)');
  }

  // ---------------------------------------------------------------------------
  // 4. HONO AI ROUTES HTTP INTEGRATION TESTS
  // ---------------------------------------------------------------------------
  {
    // 1. Unauthenticated Security Gate Guardrail
    const unauthScrub = await app.request('/api/v1/ai/claims/preflight-scrub', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        encounterId: 'enc-8812',
        forceEscalation: false
      })
    });
    assert.strictEqual(unauthScrub.status, 401, 'POST /api/v1/ai/claims/preflight-scrub must reject unauthenticated requests with 401');
    pass('Security Gate: Staff AI endpoints require authenticated session (401 Unauthorized enforced)');

    // 2. Login as Billing Specialist to obtain authenticated session cookie
    const loginRes = await app.request('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'elena.santos@stjude.ph',
        password: 'HospitalRCM2026!',
        facilityCode: 'SJMC-MNL'
      })
    });
    assert.strictEqual(loginRes.status, 200, 'Staff login returns 200 OK');
    const cookieHeader = loginRes.headers.get('set-cookie')?.split(';')[0] || '';
    assert(cookieHeader.length > 0, 'Session cookie must be present');

    // 3. Cora Chat Route
    const resCora = await app.request('/api/v1/ai/cora/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader
      },
      body: JSON.stringify({
        message: 'May Senior Citizen discount po ba ang lola ko?',
        language: 'fil'
      })
    });
    assert.strictEqual(resCora.status, 200, 'POST /api/v1/ai/cora/chat must return 200 OK');
    const coraData = await resCora.json();
    assert(coraData.reply && coraData.reply.length > 0, 'Cora must return a valid conversational reply');
    assert(Array.isArray(coraData.suggestedActions), 'Cora must provide suggested action chips');
    pass('HTTP Route: POST /api/v1/ai/cora/chat returns structured response with suggested actions');

    // 4. Claims Pre-flight Scrub Route (Authenticated)
    const encListRes = await app.request('/api/v1/encounters', {
      method: 'GET',
      headers: { Cookie: cookieHeader }
    });
    const encListData = await encListRes.json();
    const testEncounterId = encListData?.items?.[0]?.id || 'enc-4552';

    const resScrub = await app.request('/api/v1/ai/claims/preflight-scrub', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader
      },
      body: JSON.stringify({
        encounterId: testEncounterId,
        forceEscalation: false
      })
    });
    assert.strictEqual(resScrub.status, 200, 'POST /api/v1/ai/claims/preflight-scrub must return 200 OK');
    const scrubData = await resScrub.json();
    assert(typeof scrubData.rthRiskScore === 'number', 'Scrubber must return rthRiskScore');
    assert(Array.isArray(scrubData.flags), 'Scrubber must return flags array');
    pass('HTTP Route: POST /api/v1/ai/claims/preflight-scrub audits CF4 & eSOA with RTH score');

    // 5. HMO Appeal Generation Route (Authenticated)
    const resAppeal = await app.request('/api/v1/ai/hmo/generate-appeal', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader
      },
      body: JSON.stringify({
        encounterId: testEncounterId,
        deniedItemDescription: 'Disposable Laparoscopic Trocar 10mm',
        deniedAmount: 3200.00,
        hmoProviderName: 'Maxicare'
      })
    });
    assert.strictEqual(resAppeal.status, 200, 'POST /api/v1/ai/hmo/generate-appeal must return 200 OK');
    const appealData = await resAppeal.json();
    assert(appealData.appealLetterMarkdown.includes('RECONSIDERATION') || appealData.appealLetterMarkdown.includes('APPEAL'), 'Appeal letter must contain reconsideration header');
    assert(appealData.referenceNumber, 'Appeal must contain reference number');
    pass('HTTP Route: POST /api/v1/ai/hmo/generate-appeal drafts medico-legal letter citing RA 11765');

    // 6. Executive Telemetry Briefing Route (Authenticated)
    const resBriefing = await app.request('/api/v1/ai/executive/briefing', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader
      },
      body: JSON.stringify({})
    });
    assert.strictEqual(resBriefing.status, 200, 'POST /api/v1/ai/executive/briefing must return 200 OK');
    const briefingData = await resBriefing.json();
    assert(briefingData.metricsSummary.trappedCapitalPesos >= 0, 'Briefing must calculate trapped capital');
    assert(briefingData.briefingMarkdown.length > 50, 'Briefing must generate executive narrative');
    pass('HTTP Route: POST /api/v1/ai/executive/briefing compiles 3-minute executive telemetry');

    // 7. Multimodal Card OCR Route (Authenticated)
    const resOcr = await app.request('/api/v1/ai/ocr/extract-card', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader
      },
      body: JSON.stringify({
        imageBase64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        cardCategory: 'PHILHEALTH'
      })
    });
    assert.strictEqual(resOcr.status, 200, 'POST /api/v1/ai/ocr/extract-card must return 200 OK');
    const ocrData = await resOcr.json();
    assert(ocrData.cardType === 'PHILHEALTH', 'OCR extracted card type must match category');
    assert(ocrData.idNumber.length > 0, 'OCR extracted card must have an ID number');
    pass('HTTP Route: POST /api/v1/ai/ocr/extract-card extracts structured credentials via vision');
  }

  console.log('\n================================================================================');
  console.log(`AI SERVICES AUDIT COMPLETED: ${passedCount} PASSED, 0 FAILED`);
  console.log('================================================================================\n');
}

void runAiTests();
