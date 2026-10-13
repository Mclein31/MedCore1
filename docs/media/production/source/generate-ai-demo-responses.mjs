// Produce authentic Gemini responses for the MedCore product-film demo.
// Every prompt uses purpose-made synthetic records. This module never imports
// the DB, server routes, or DATABASE_URL and never mutates product state.
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { build } from '../../../../node_modules/esbuild/lib/main.js';
import sharp from '../../../../node_modules/sharp/dist/index.cjs';
import { geminiClient } from '../../../../apps/server/src/services/ai/geminiClient.ts';
import { jsonResponseSchema, parseAiResponse } from '../../../../apps/server/src/services/ai/structuredResponse.ts';
import { CoraResponseSchema, CORA_SYSTEM_PROMPTS, buildCoraPrompt } from '../../../../apps/server/src/services/ai/prompts/coraPrompts.ts';
import { generateLocalizedCoraReply } from '../../../../apps/server/src/services/ai/coraLanguage.ts';
import { CardOcrResponseSchema, OCR_SYSTEM_PROMPT, buildOcrPrompt } from '../../../../apps/server/src/services/ai/prompts/ocrPrompts.ts';
import { HmoAppealResponseSchema, APPEAL_SYSTEM_PROMPT, buildHmoAppealPrompt } from '../../../../apps/server/src/services/ai/prompts/appealPrompts.ts';
import { ClaimsAuditResultSchema, CLAIMS_SCRUBBER_RESPONSE_SCHEMA, SCRUBBER_SYSTEM_PROMPT, buildScrubberPrompt } from '../../../../apps/server/src/services/ai/prompts/scrubberPrompts.ts';
import { ExecutiveBriefingResponseSchema, BRIEFING_SYSTEM_PROMPT, buildExecutiveBriefingPrompt } from '../../../../apps/server/src/services/ai/prompts/briefingPrompts.ts';

const outputDir = resolve('docs/media/production/footage');
const env = {
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GEMINI_MODEL: process.env.GEMINI_MODEL,
  GEMINI_BACKUP_MODEL: process.env.GEMINI_BACKUP_MODEL
};
if (!env.GEMINI_API_KEY) throw new Error('Set GEMINI_API_KEY to capture authentic AI demo outputs.');
await mkdir(outputDir, { recursive: true });

const dataBundle = await build({
  entryPoints: [resolve('apps/dashboard/src/data/mockData.ts')], bundle: true, write: false,
  format: 'esm', platform: 'node', alias: { '@': resolve('apps/dashboard/src') }
});
const { INITIAL_ENCOUNTERS } = await import(`data:text/javascript;base64,${Buffer.from(dataBundle.outputFiles[0].text).toString('base64')}`);
const cases = INITIAL_ENCOUNTERS.map((enc, index) => ({
  ...enc,
  patient: { ...enc.patient, fullName: `Sample Patient ${index + 1}`, maskedName: `Sample Patient ${index + 1}`, mrn: `DEMO-MRN-${String(index + 1).padStart(3, '0')}` }
}));
const encounter = cases.find(e => e.disputes?.length && e.items?.some(i => i.isDisputed)) || cases[0];
const dispute = encounter.disputes[0];
const disputedItem = encounter.items.find(item => item.isDisputed || item.status === 'CONTESTED');
const generated = {};
// Cora: exact billing-assistant policy/schema with the mobile fixture's
// synthetic account, so the response's balance matches the captured app.
const coraFinancials = {
  grossHospitalCharges: 47000, grossDoctorFee: 5000, grossTotal: 52000,
  vatExemption: 0, seniorPwdDiscount: 0, netVatDiscountedBase: 52000,
  philhealthHci: 15000, philhealthPf: 5000, philhealthTotal: 20000,
  hmoApprovedAmount: 13550, netPatientDue: 18450, patientPaid: 0, remainingBalance: 18450
};
const coraEncounter = {
  patientPseudonym: 'Sample Patient', roomBedMasked: '301-A', roomCategory: 'WARD',
  admissionDate: '2026-10-06', primaryDiagnosis: 'Hospital stay', stage: 'PENDING_SETTLEMENT',
  hmoProviderName: 'Sample Health Plan', pendingChecklistSteps: []
};
const coraPrompt = buildCoraPrompt(coraEncounter, coraFinancials,
  'What is my remaining balance, and how did my recorded benefits affect it?', 'en', 'WHY_DO_I_OWE',
  { hospital: { name: 'Sample Medical Center' }, hmo: { provider: 'Sample Health Plan', status: 'APPROVED', approvedAmount: 13550 },
    philhealth: { status: 'APPROVED', totalCaseRate: 20000 }, missingInformation: ['Clinical treatment details are not part of this demo record.'] });
const coraResult = await generateLocalizedCoraReply({ prompt: coraPrompt, language: 'en', env });
generated.cora = { ...coraResult.answer, modelUsed: coraResult.modelUsed,
  groundedBalance: { grossTotal: 52000, vatExemption: 0, seniorPwdDiscount: 0, philhealthTotal: 20000, hmoApprovedAmount: 13550, netPatientDue: 18450, remainingBalance: 18450 },
  feature: 'Cora patient billing assistant' };
if (!/18,?450/.test(generated.cora.reply) || !/20,?000/.test(generated.cora.reply) || !/13,?550/.test(generated.cora.reply)) {
  throw new Error(`Cora's generated answer did not explain the synthetic ledger amounts: ${generated.cora.reply}`);
}

// OCR: create a plainly marked dummy benefit card, then run the actual
// multimodal OCR prompt/schema against its pixels. No government number/logo.
const svgCard = `<svg width="1200" height="720" xmlns="http://www.w3.org/2000/svg"><rect width="1200" height="720" rx="36" fill="#f8fafc"/><rect x="20" y="20" width="1160" height="680" rx="28" fill="none" stroke="#0f766e" stroke-width="4"/><text x="72" y="112" font-family="Arial" font-size="30" font-weight="700" fill="#0f172a">SAMPLE HEALTH PLAN</text><text x="72" y="242" font-family="Arial" font-size="58" font-weight="700" fill="#0f766e">DEMO CARD — NOT VALID</text><text x="72" y="360" font-family="Arial" font-size="28" fill="#334155">MEMBER NAME</text><text x="72" y="408" font-family="Arial" font-size="40" font-weight="600" fill="#0f172a">SAMPLE PATIENT</text><text x="72" y="510" font-family="Arial" font-size="24" fill="#334155">TEST REFERENCE (NOT AN ID)</text><text x="72" y="556" font-family="Arial" font-size="34" font-weight="700" fill="#0f172a">DEMO-ONLY-0001</text><text x="72" y="634" font-family="Arial" font-size="22" fill="#64748b">Synthetic test artwork for OCR demonstration</text></svg>`;
const png = await sharp(Buffer.from(svgCard)).png().toBuffer();
const cardPath = resolve(outputDir, 'synthetic-test-card.png');
await writeFile(cardPath, png);
const ocrPrompt = buildOcrPrompt('HMO') + '\nThis synthetic card is explicitly marked NOT VALID; extract visible text only. Do not normalize DEMO-ONLY-0001 into a real credential. Report conservative confidence below 1.0; the card is a synthetic test and not a validated identity document.';
const ocrRaw = await geminiClient.generate({
  systemInstruction: OCR_SYSTEM_PROMPT, prompt: ocrPrompt,
  parts: [{ text: ocrPrompt }, { inlineData: { mimeType: 'image/png', data: png.toString('base64') } }],
  responseMimeType: 'application/json', responseJsonSchema: jsonResponseSchema(CardOcrResponseSchema),
  temperature: 0, maxOutputTokens: 900, env
});
generated.ocr = { ...parseAiResponse(ocrRaw, CardOcrResponseSchema), modelUsed: ocrRaw.modelUsed,
  inferenceMs: ocrRaw.latencyMs, feature: 'Benefit and ID card OCR', sourceImage: 'synthetic-test-card.png', humanReviewRequired: true };
if (!/SAMPLE PATIENT/i.test(generated.ocr.memberFullName) || !/DEMO-ONLY-0001/i.test(generated.ocr.idNumber)) {
  throw new Error(`OCR did not faithfully extract the synthetic card: ${JSON.stringify(generated.ocr)}`);
}

// HMO appeal: actual appeal prompt/schema, using one synthetic disputed item.
const appealReference = 'APL-DEMO-2026-0001';
const appealDeadline = '2026-10-16T12:00:00.000Z';
const appealPrompt = buildHmoAppealPrompt(encounter.encounterNumber, encounter.patient.fullName,
  'Attending Physician A', 'DEMO-PAN-0001', encounter.hmo.providerName || 'Sample Health Plan',
  disputedItem.description, Number(dispute.contestedAmount), dispute.reason,
  encounter.primaryDiagnosis, 'No physician narrative or clinical necessity evidence is included in this synthetic capture. Request policy review and supporting documentation; do not assert unprovided clinical facts.')
  + `\nDEMO METADATA: referenceNumber must be exactly ${appealReference}; reconsiderationDeadline must be exactly ${appealDeadline}. This is an unsubmitted draft for staff review. Do not state or imply it has been submitted, approved, or accepted. In the letter, identify it clearly as a draft for review, and ask the HMO to reconsider based only on supplied facts.`;
let appealRaw;
for (let attempt = 0; attempt < 3; attempt++) {
  appealRaw = await geminiClient.generate({ systemInstruction: `${APPEAL_SYSTEM_PROMPT}\nCAPTURE SAFETY: This output is a draft for authorized staff review only. Never state that an appeal has been or will be submitted, accepted, approved, or overturned. Do not assert clinical justification that is absent from the notes.`, prompt: appealPrompt,
    responseMimeType: 'application/json', responseJsonSchema: jsonResponseSchema(HmoAppealResponseSchema),
    temperature: 0, maxOutputTokens: 1700, env });
  generated.appeal = { ...parseAiResponse(appealRaw, HmoAppealResponseSchema), modelUsed: appealRaw.modelUsed,
    inferenceMs: appealRaw.latencyMs, feature: 'HMO appeal drafting', draftOnly: true };
  const letter = generated.appeal.appealLetterMarkdown;
  const unsafeOutcome = /\b(?:we are formally submitting|has been submitted|was submitted|will be submitted|approved appeal|overturned denial|denial has been reversed)\b/i.test(letter);
  const wrongMetadata = generated.appeal.referenceNumber !== appealReference || generated.appeal.reconsiderationDeadline !== appealDeadline || !letter.includes(appealReference);
  if (!unsafeOutcome && !wrongMetadata) break;
  appealPrompt += '\nCORRECTION REQUIRED: Return an unsubmitted draft clearly labeled for staff review. Remove any wording that says or implies it is being submitted now or later, or that it has been accepted, approved or overturned. Do not add clinical claims. Preserve the exact reference number and deadline.';
  if (attempt === 2) throw new Error(`Appeal output failed draft-only or metadata checks: ${letter.slice(0, 450)}`);
}

// Claims pre-flight: actual audit system/schema with intentionally limited
// chart evidence. Keep any result within the stated evidence boundary.
const claimsEncounter = cases.slice(0, 7).find(e => e.philhealth?.primaryIcd10 && e.stage !== 'CLEARED_GATE_PASS' &&
  (!e.philhealth.cf4VitalsRecorded || !e.philhealth.cf4CourseInWardRecorded || !e.philhealth.cf4LabsConsistent)) || cases[0];
const claimProfile = {
  patient: claimsEncounter.patient.fullName, age: claimsEncounter.patient.age, gender: claimsEncounter.patient.gender,
  encounterNumber: claimsEncounter.encounterNumber, admissionDate: claimsEncounter.admissionDate,
  encounterDiagnosis: claimsEncounter.primaryDiagnosis, encounterIcd10: claimsEncounter.primaryIcd10,
  claimDiagnosis: claimsEncounter.philhealth.primaryDescription, claimIcd10: claimsEncounter.philhealth.primaryIcd10,
  caseRateCode: claimsEncounter.philhealth.caseRateCode, totalCaseRate: claimsEncounter.philhealth.totalCaseRate,
  cf4VitalsRecorded: claimsEncounter.philhealth.cf4VitalsRecorded,
  cf4CourseInWardRecorded: claimsEncounter.philhealth.cf4CourseInWardRecorded,
  cf4LabsConsistent: claimsEncounter.philhealth.cf4LabsConsistent,
  clinicalEvidence: 'Only completeness indicators are stored. Actual vital values, laboratory results, physician orders and daily progress notes are not available. Do not invent them.',
  items: claimsEncounter.items.filter(i => !['WAIVED', 'SUPERVISORY_WAIVED'].includes(i.status)).map(i => ({ description: i.description, category: i.category, quantity: i.qty }))
};
let claimPrompt = buildScrubberPrompt(
  JSON.stringify(claimProfile), claimsEncounter.philhealth.primaryIcd10, null,
  `<eSOA><Encounter>${claimsEncounter.encounterNumber}</Encounter><GrossTotal>${Number(claimsEncounter.waterfall.grossTotal).toFixed(2)}</GrossTotal></eSOA>`,
  Number(claimsEncounter.waterfall.grossTotal)) + `\n\nCAPTURE EVIDENCE LIMIT: The booleans cf4VitalsRecorded/cf4CourseInWardRecorded/cf4LabsConsistent are completeness markers only. The actual chart text, vital values, lab results, medication record and physician progress notes are not included. Never convert a true marker into a claim that you saw or verified the underlying record. In clinicalSummary, explicitly state which recorded completeness marker(s) are false, then say the source clinical content was not supplied and cannot be independently reviewed. Do not infer treatment, test results, duration or patient course from diagnosis or chargemaster items. The primary RVS surgical code is NONE because this is a medical confinement. Do not flag an RVS mismatch. The output is an assessment for staff review, not a transmission or payer decision.`;
let claimsRaw;
let claimsParsed;
for (let attempt = 0; attempt < 3; attempt++) {
  claimsRaw = await geminiClient.generate({ systemInstruction: SCRUBBER_SYSTEM_PROMPT,
    prompt: claimPrompt, responseMimeType: 'application/json',
    responseJsonSchema: CLAIMS_SCRUBBER_RESPONSE_SCHEMA, temperature: 0, maxOutputTokens: 1600, env });
  claimsParsed = parseAiResponse(claimsRaw, ClaimsAuditResultSchema);
  const summary = claimsParsed.clinicalSummary;
  const limitationPresent = /(?:not|unavailable|missing|absent)/i.test(summary) && /(?:vitals|narrative|progress|clinical record|chart|source clinical content)/i.test(summary);
  const unsupportedCourse = /(?:\b\d+\s*[-–]?\s*day\b|spanning\s+\d+|treatment includes|was treated with|received (?:intravenous|IV|antibiotic)|align with the medical management)/i.test(summary);
  if (limitationPresent && !unsupportedCourse) break;
  claimPrompt += '\n\nCORRECTION REQUIRED: Your previous draft inferred facts from billed item quantities or completeness checkboxes. Remove all inferred stay durations, treatment/course claims, and assertions that the underlying chart was reviewed. State only the recorded diagnosis and which false completeness markers were present, then state that source clinical details were not supplied and cannot be independently assessed. The source checkbox markers do not reveal the chart text.';
  if (attempt === 2) throw new Error(`Claims audit kept inferring clinical facts after two corrections: ${summary}`);
}
const rawModelClaims = { ...claimsParsed, modelUsed: claimsRaw.modelUsed, inferenceMs: claimsRaw.latencyMs };
const normalizedFlags = new Map();
for (const flag of claimsParsed.flags) {
  // The model can report the same false CF4 marker as both a discrepancy and
  // a missing field. Retain the source-verified missing-field result below.
  if (flag.category === 'DIAGNOSTIC_DISCREPANCY' && flag.field === 'cf4LabsConsistent' &&
      claimsEncounter.philhealth.cf4LabsConsistent === false) continue;
  let field = flag.field;
  const signal = `${flag.field} ${flag.description}`;
  if (flag.category === 'MISSING_CF4_FIELD') {
    if (/vital/i.test(signal)) field = 'cf4VitalsRecorded';
    else if (/course|ward|progress/i.test(signal)) field = 'cf4CourseInWardRecorded';
    else if (/lab|diagnostic.*document/i.test(signal)) field = 'cf4LabsConsistent';
  }
  const key = `${flag.category}:${field}`;
  const existing = normalizedFlags.get(key);
  const weight = { INFO: 0, WARNING: 1, CRITICAL: 2 };
  if (!existing || weight[flag.severity] > weight[existing.severity]) normalizedFlags.set(key, { ...flag, field });
}
const addSourceFlag = (field, description) => {
  const key = `MISSING_CF4_FIELD:${field}`;
  const existing = normalizedFlags.get(key);
  if (existing) existing.severity = 'CRITICAL';
  else normalizedFlags.set(key, { category: 'MISSING_CF4_FIELD', severity: 'CRITICAL', field, description,
    regulatoryCitation: 'CF4 completeness review', remediation: 'Verify and complete the source chart before filing.' });
};
if (!claimsEncounter.philhealth.cf4VitalsRecorded) addSourceFlag('cf4VitalsRecorded', 'Admission vital signs are marked as not recorded.');
if (!claimsEncounter.philhealth.cf4CourseInWardRecorded) addSourceFlag('cf4CourseInWardRecorded', 'Course in ward is marked as not recorded.');
if (!claimsEncounter.philhealth.cf4LabsConsistent) addSourceFlag('cf4LabsConsistent', 'Diagnostic documentation is marked as inconsistent.');
if (!claimsParsed.esoaXmlConformity) normalizedFlags.set('DIAGNOSTIC_DISCREPANCY:esoaXmlConformity', {
  category: 'DIAGNOSTIC_DISCREPANCY', severity: 'CRITICAL', field: 'esoaXmlConformity',
  description: 'The supplied eSOA did not pass conformity review.', regulatoryCitation: 'eSOA conformity review', remediation: 'Correct and revalidate the XML before filing.'
});
const flags = [...normalizedFlags.values()];
const baseRisk = 0.04;
const penalties = flags.filter(flag => flag.severity !== 'INFO').map(flag => ({
  factor: flag.category,
  points: flag.category === 'SPC_RULE_RISK' ? 0 : flag.category === 'MEDICATION_DISCORDANCE' ? 0.30 :
    flag.category === 'DIAGNOSTIC_DISCREPANCY' ? 0.50 : /vital/i.test(flag.field) ? 0.40 :
    /course|ward/i.test(flag.field) ? 0.45 : /filing|60.day/i.test(flag.field) ? 0.60 : 0.25,
  description: flag.description
})).filter(penalty => penalty.points > 0);
const rawRiskTotal = Math.round((baseRisk + penalties.reduce((sum, penalty) => sum + penalty.points, 0)) * 10000) / 10000;
const rthRiskScore = Math.min(0.99, rawRiskTotal);
const passThreshold = rthRiskScore <= 0.15;
generated.claims = { ...claimsParsed, flags, rthRiskScore, passThreshold,
  cleanClaimReadiness: Math.round((1 - rthRiskScore) * 100),
  riskLevel: rthRiskScore <= 0.07 ? 'LOW' : rthRiskScore <= 0.15 ? 'MODERATE' : rthRiskScore <= 0.35 ? 'HIGH' : 'CRITICAL',
  riskCalculation: { baseRisk, penalties,
    formula: `4% baseline + ${(100 * (rawRiskTotal - baseRisk)).toFixed(0)}% penalties${rawRiskTotal > 0.99 ? ' (capped at 99%)' : ''} = ${(100 * rthRiskScore).toFixed(0)}% RTH risk`,
    verdict: passThreshold ? 'Passes configured review threshold (≤15%)' : 'Exceeds configured review threshold (15%); remediation required.' },
  modelResponse: rawModelClaims, modelUsed: claimsRaw.modelUsed, inferenceMs: claimsRaw.latencyMs,
  claimContext: { encounterId: claimsEncounter.encounterNumber, primaryDiagnosis: claimsEncounter.philhealth.primaryDescription,
    primaryIcd10: claimsEncounter.philhealth.primaryIcd10, caseRateCode: claimsEncounter.philhealth.caseRateCode,
    totalCaseRate: Number(claimsEncounter.philhealth.totalCaseRate) },
  serverEquivalentNormalization: 'Existing deterministic claim-risk calculation and source CF4 flags applied locally; no database route or mutation was used.',
  feature: 'Claims pre-flight AI audit', humanReviewRequired: true };
if (!/(?:not|unavailable|missing|absent)/i.test(generated.claims.clinicalSummary) || !/(?:vitals|narrative|progress|clinical record|chart)/i.test(generated.claims.clinicalSummary)) {
  throw new Error(`Claims audit failed to surface the missing synthetic chart narrative limitation: ${generated.claims.clinicalSummary}`);
}

// Executive briefing uses the same synthetic aggregates as the dashboard
// capture. No database connection is available in this script by design.
const active = cases.slice(0, 7).filter(e => e.stage !== 'CLEARED_GATE_PASS');
const stages = ['DOCTOR_PF_PENDING', 'PHARMACY_RTS_AUDIT', 'HMO_FINAL_LOA', 'PENDING_SETTLEMENT'];
const dwellTimes = Object.fromEntries(stages.map(stage => {
  const rows = active.filter(e => e.stage === stage);
  return [stage, rows.length ? Math.round(rows.reduce((n, e) => n + (e.elapsedMinutes || 0), 0) / rows.length) : 0];
}));
const trappedRevenue = active.filter(e => ['HMO_FINAL_LOA', 'PENDING_SETTLEMENT'].includes(e.stage))
  .reduce((n, e) => n + Number(e.waterfall?.netPatientDue || 0), 0);
const stageCounts = Object.fromEntries(stages.map(stage => [stage, active.filter(e => e.stage === stage).length]));
const largestQueue = stages.reduce((best, stage) => stageCounts[stage] > stageCounts[best] ? stage : best, stages[0]);
const longestDwell = Object.entries(dwellTimes).sort((a, b) => b[1] - a[1])[0];
const metrics = { activeInpatients: active.length, dischargesToday: 0,
  avgTatMinutes: active.reduce((n, e) => n + (e.elapsedMinutes || 0), 0) / Math.max(active.length, 1),
  dwellTimes, philhealthDarDays: null, hmoDarDays: null, trappedRevenue, reclaimedBedHours: null };
const briefingPrompt = `${buildExecutiveBriefingPrompt(metrics)}\n\nThis is an illustrative synthetic seven-record sample (including one cleared encounter), not a live hospital report. Explicitly label it illustrative. The active count is ${active.length}. The largest queue by case count is ${largestQueue} (${stageCounts[largestQueue]} cases); the longest average dwell is ${longestDwell[0]} (${longestDwell[1]} minutes), a different measure. Do not infer causes, outcomes, or unmeasured financial impact. Set all recommendation financialImpactPesos values to 0. State that reclaimed bed-hours and payer AR aging are not measured.`;
const briefingRaw = await geminiClient.generate({ systemInstruction: BRIEFING_SYSTEM_PROMPT,
  prompt: briefingPrompt, responseMimeType: 'application/json',
  responseJsonSchema: jsonResponseSchema(ExecutiveBriefingResponseSchema), temperature: 0.1, maxOutputTokens: 1500, env });
const briefingParsed = parseAiResponse(briefingRaw, ExecutiveBriefingResponseSchema);
generated.briefing = { ...briefingParsed, modelUsed: briefingRaw.modelUsed, inferenceMs: briefingRaw.latencyMs,
  metricsSummary: { ...briefingParsed.metricsSummary, activeInpatients: active.length,
    averageDischargeTatMinutes: metrics.avgTatMinutes, slaTargetMinutes: 45, reclaimedBedHoursLast24h: null,
    trappedCapitalPesos: trappedRevenue, criticalDepartmentBottleneck: `${largestQueue.replaceAll('_', ' ')} · ${stageCounts[largestQueue]} cases` },
  topRecommendations: briefingParsed.topRecommendations.map(r => ({ ...r, financialImpactPesos: 0 })),
  feature: 'Executive RCM briefing', syntheticSampleSize: cases.slice(0, 7).length };
if (!/illustrative/i.test(generated.briefing.briefingMarkdown) || !/not measured/i.test(generated.briefing.briefingMarkdown)) {
  throw new Error('Executive briefing omitted the synthetic or unmeasured-data context.');
}

const result = {
  captureType: 'authentic-gemini-responses-from-synthetic-demo-inputs',
  capturedAt: new Date().toISOString(),
  models: Object.fromEntries(Object.entries(generated).map(([key, value]) => [key, value.modelUsed])),
  dataBoundary: 'Synthetic records only. No DATABASE_URL, live patient data, local AI API routes, payer gateways, or business mutations used.',
  features: generated,
  sourcePrompts: { cora: coraPrompt, ocr: ocrPrompt, appeal: appealPrompt, claims: claimPrompt, briefing: briefingPrompt },
  sourceInputs: {
    cora: { account: 'Sample Patient', grossTotal: 52000, PhilHealth: 20000, HMO: 13550, remainingBalance: 18450 },
    cardImage: 'synthetic-test-card.png',
    appeal: { encounter: encounter.encounterNumber, item: disputedItem.description, amount: Number(dispute.contestedAmount), reference: appealReference, deadline: appealDeadline },
    claims: { encounter: claimsEncounter.encounterNumber, diagnosis: claimsEncounter.philhealth.primaryDescription,
      icd10: claimsEncounter.philhealth.primaryIcd10, cf4VitalsRecorded: claimsEncounter.philhealth.cf4VitalsRecorded,
      cf4CourseInWardRecorded: claimsEncounter.philhealth.cf4CourseInWardRecorded,
      cf4LabsConsistent: claimsEncounter.philhealth.cf4LabsConsistent, narrativeAvailable: false },
    briefing: { sampleSize: cases.slice(0, 7).length, activeCount: active.length, metrics }
  }
};
await writeFile(resolve(outputDir, 'ai-responses.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify({ captured: Object.keys(generated), models: result.models, outputs: resolve(outputDir, 'ai-responses.json'), cardImage: cardPath }));
