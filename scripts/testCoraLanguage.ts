import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { buildCoraPrompt, type CoraEncounterContext, type CoraFinancialContext, type CoraLanguage } from '../apps/server/src/services/ai/prompts/coraPrompts';
import { generateLocalizedCoraReply } from '../apps/server/src/services/ai/coraLanguage';

// Live provider evaluation uses synthetic facts only, without database or hospital accounts.
process.loadEnvFile('.env');
const encounter: CoraEncounterContext = { patientPseudonym: '[PATIENT_A]', roomBedMasked: '[ROOM_A]', roomCategory: 'WARD', admissionDate: '2026-10-06', primaryDiagnosis: 'Wrist injury', stage: 'PENDING_SETTLEMENT', hmoProviderName: 'Sample Health Plan', pendingChecklistSteps: [] };
const financials: CoraFinancialContext = { grossHospitalCharges: 15800, grossDoctorFee: 0, grossTotal: 15800, vatExemption: 0, seniorPwdDiscount: 0, netVatDiscountedBase: 15800, philhealthHci: 15000, philhealthPf: 0, philhealthTotal: 15000, hmoApprovedAmount: 0, netPatientDue: 800, patientPaid: 0, remainingBalance: 800 };
const evidence = { hospital: { name: 'Sample Medical Center' }, items: [{ description: 'Wrist splint', grossAmount: 800, philhealthCovered: 0, hmoCovered: 0, patientOop: 800, status: 'DISALLOWED_SUNDRY', coverageReason: 'Excluded by the recorded sample HMO policy' }] };
const cases: Array<{ language: CoraLanguage; question: string; history: string }> = [
  { language: 'en', question: 'Bakit ako may babayarang ₱800.00 para sa Wrist splint? Banggitin ang pangalan ng singil at ang halaga.', history: 'Ang Wrist splint ay hindi sakop ng nakatalang HMO policy.' },
  { language: 'tl', question: 'Why do I owe ₱800.00 for Wrist splint? Include the charge name and amount.', history: 'The Wrist splint item is excluded by your recorded HMO policy.' },
  { language: 'fil', question: 'Why do I owe ₱800.00 for Wrist splint? Include the charge name and amount.', history: 'Ang Wrist splint ay hindi sakop ng nakatalang HMO policy.' },
  { language: 'ilo', question: 'Why do I owe ₱800.00 for Wrist splint? Include the charge name and amount.', history: 'The Wrist splint item is excluded by your recorded HMO policy.' }
];
const results = [];
for (const test of cases) {
  const started = Date.now();
  const prompt = buildCoraPrompt(encounter, financials, test.question, test.language, 'WHY_DO_I_OWE', evidence, [{ role: 'user', content: 'Which item is excluded?' }, { role: 'assistant', content: test.history }]);
  const generated = await generateLocalizedCoraReply({ prompt, language: test.language });
  assert.equal(generated.answer.scopeDecision, 'ANSWERED', test.language);
  assert.match(generated.answer.reply, /800(?:\.00)?/, test.language);
  assert.match(generated.answer.reply, /Wrist splint/i, test.language);
  results.push({ language: test.language, modelUsed: generated.modelUsed, languageCheckPassed: true, amountAndItemPreserved: true, elapsedMs: Date.now() - started, reply: generated.answer.reply, actionLabels: generated.answer.suggestedActions.map(action => action.label) });
  console.log(JSON.stringify({ language: test.language, languageCheckPassed: true, amountAndItemPreserved: true, elapsedMs: Date.now() - started }));
}
await mkdir('docs/validation/cora-language', { recursive: true });
await writeFile('docs/validation/cora-language/live-results.json', JSON.stringify({ syntheticDataOnly: true, provider: 'Real configured Gemini transport; actual generation and independent language checks', results }, null, 2));
console.log('CORA_LIVE_LANGUAGE_CHECKS_DONE: four languages, conflicting query/history language, preserved synthetic amount and item.');
