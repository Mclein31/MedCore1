import assert from 'node:assert/strict';
import { normalizePhPhoneNumber, buildSmsBody, sendSms, smsOutbox, getSmsOutbox, assertSmsInvariants, SmsError, type SmsDispatchOptions } from '../src/services/smsService';
let checks = 0;
const pass = (name: string) => { checks++; console.log(`[PASS] ${name}`); };
for (const value of ['09171234567', '639171234567', '+639171234567', '0917-123-4567', '+63 (917) 123 4567']) assert.equal(normalizePhPhoneNumber(value), '+639171234567');
pass('PH local/international/separated mobile formats normalize to E.164');
for (const value of ['', '08171234567', '0917123456', '+659171234567', '091712345678', '0917CALLNOW', '0917+1234567', '02-8123-4567']) assert.throws(() => normalizePhPhoneNumber(value), SmsError);
pass('Missing, wrong-country, nonmobile, malformed and wrong-length numbers are rejected');
const base: SmsDispatchOptions = { recipientPhone: '09171234567', recipientName: 'Sample Patient', patientName: 'Sample Patient', encounterNumber: 'ENC-2026-1001', roomBed: 'Room 302-B', doctorName: 'Dr. Sample Physician', passNumber: 'GP-8812', templateType: 'BILL_READY' };
for (const templateType of ['BILL_READY', 'DOCTOR_PF_NUDGE', 'PAYMENT_CONFIRMED', 'INTAKE_ORIENTATION'] as const) {
  for (const language of ['en', 'tl'] as const) {
    const body = buildSmsBody({ ...base, templateType, language, primaryDiagnosis: 'Acute Appendicitis', icd10: 'K35.8', philhealthPin: '12-123456789-0', medication: 'Paracetamol' } as SmsDispatchOptions);
    assert.match(body, /ENC-2026-1001/); assert.doesNotMatch(body, /https?:\/\/|www\.|Acute Appendicitis|K35\.8|12-123456789-0|Paracetamol/);
  }
}
assert.match(buildSmsBody({ ...base, templateType: 'DOCTOR_PF_NUDGE' }), /Dr\. Sample Physician,.*Sample Patient.*Professional Fee|Dr\. Sample Physician, please confirm your Professional Fee for patient Sample Patient/);
pass('All templates/languages keep references and exclude unsupported clinical fields');
for (const value of ['https://example.test', 'http://example.test', 'www.example.test', 'bit.ly/secret', 'example.com/path', 'www．example.com']) assert.throws(() => buildSmsBody({ ...base, recipientName: value, patientName: value }), (error: any) => error.code === 'SMS_LINK_INVARIANT');
pass('URL, domain, short-link and Unicode-dot injection throw invariants');
for (const body of ['Patient PIN 12-123456789-0', 'Clinical code K35.8', 'RVS 44950']) assert.throws(() => assertSmsInvariants(body), (error: any) => error.code === 'SMS_PRIVACY_INVARIANT');
assert.throws(() => buildSmsBody({ ...base, patientName: 'Acute Appendicitis', forbiddenClinicalTerms: ['Acute Appendicitis'] }), (error: any) => error.code === 'SMS_PRIVACY_INVARIANT');
assert.throws(() => buildSmsBody({ ...base, patientName: 'Patient\nSecond message' }), SmsError);
pass('Unmasked PINs, clinical codes, source diagnosis injection and control characters are blocked');
const financed = buildSmsBody({ ...base, templateType: 'PAYMENT_CONFIRMED', settlementKind: 'PROMISSORY_NOTE' });
assert.match(financed, /promissory arrangements are recorded/); assert.doesNotMatch(financed, /Payment settled|paid in full/);
pass('Promissory clearance does not falsely claim cash settlement');
const fetchBefore = globalThis.fetch, keyBefore = process.env.SEMAPHORE_API_KEY;
let calls = 0;
globalThis.fetch = async () => { calls++; throw new Error('Network must never be used by SMS sandbox.'); };
try {
  smsOutbox.length = 0;
  process.env.SEMAPHORE_API_KEY = 'synthetic-present-key-must-be-ignored';
  const result = await sendSms({ ...base, env: { SEMAPHORE_API_KEY: 'another-synthetic-key' } });
  assert.equal(result.simulated, true); assert.equal(result.isSimulated, true); assert.equal(result.provider, 'SIMULATOR'); assert.equal(result.deliveryStatus, 'SIMULATED'); assert.match(result.messageId, /^SMS-SIM-[A-Z0-9]{6}$/); assert.equal(result.recipientPhone, '+639171234567'); assert.equal(calls, 0);
  pass('Even present gateway keys cannot enable a network send or consume SMS credits');
  for (let i = 0; i < 105; i++) await sendSms(base);
  assert.equal(smsOutbox.length, 100); assert.equal(getSmsOutbox().length, 100); assert.equal(new Set(smsOutbox.map(message => message.messageId)).size, 100); assert.equal(calls, 0);
  const snapshot = getSmsOutbox(); snapshot[0].messageBody = 'Changed'; assert.notEqual(getSmsOutbox()[0].messageBody, 'Changed');
  pass('Simulator outbox retains newest 100 results with defensive copies');
  const count = smsOutbox.length; await sendSms({ ...base, recordInMemory: false }); assert.equal(smsOutbox.length, count);
  pass('Transaction callers publish memory history only after a confirmed database commit');
} finally { globalThis.fetch = fetchBefore; if (keyBefore === undefined) delete process.env.SEMAPHORE_API_KEY; else process.env.SEMAPHORE_API_KEY = keyBefore; }
console.log(`SMS_SERVICE_CHECKS_DONE: ${checks} groups; zero network calls.`);
