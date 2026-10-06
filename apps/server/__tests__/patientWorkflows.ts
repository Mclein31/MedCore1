import { recalculateAndPersistWaterfall } from '../src/services/waterfallPersistence';
import { apiAccess } from '../src/middleware/access';
import { toPatientSafeEncounter } from '../src/routes/patient';
import { resolveLinkedPatient } from '../src/utils/encounterAccess';
import assert from 'node:assert/strict';
import { Hono } from 'hono';
import { getTableName, getTableColumns } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import { runWithDb } from '../src/db';
import paymentsApp from '../src/routes/payments';
import promissoryApp from '../src/routes/promissory';
import disputesApp from '../src/routes/disputes';
import authApp from '../src/routes/auth';
import { encounterAccessCondition, isCentavoAmount } from '../src/utils/encounterAccess';
import { computePromissorySchedule } from '../src/services/promissoryEngine';

// Isolated handler checks: synthetic rows only. No PostgreSQL connection or PHI.
const ownId = '10000000-0000-4000-8000-000000000001';
const otherId = '10000000-0000-4000-8000-000000000002';
const foreignFacilityId = '10000000-0000-4000-8000-000000000003';
const chargeId = '20000000-0000-4000-8000-000000000001';
const wrongChargeId = '20000000-0000-4000-8000-000000000002';
const patientId = '30000000-0000-4000-8000-000000000001';
const otherPatientId = '30000000-0000-4000-8000-000000000002';
const facilityId = '40000000-0000-4000-8000-000000000001';
const user = { id: '50000000-0000-4000-8000-000000000001', facilityId, role: 'PATIENT_GUARANTOR', fullName: 'Test Patient', linkedMrn: 'TEST-001' };
const dialect = new PgDialect();
let rows: Record<string, any[]>;
let queue = Promise.resolve();
let lockReads = 0;
let writes = 0;
function reset() {
  rows = {
    patients: [{ id: patientId, facilityId, mrn: 'TEST-001', contactNumber: '', fullName: 'Test Patient' }],
    facilities: [{ id: facilityId, code: 'TEST-FACILITY' }],
    encounters: [
      { id: ownId, facilityId, patientId, encounterNumber: 'ENC-TEST-001', remainingBalance: '100.00', amountPaid: '0.00', stage: 'PENDING_SETTLEMENT', roomBed: 'TEST', bedId: null },
      { id: otherId, facilityId, patientId: otherPatientId, encounterNumber: 'ENC-TEST-002', remainingBalance: '100.00', amountPaid: '0.00' },
      { id: foreignFacilityId, facilityId: '40000000-0000-4000-8000-000000000002', patientId, encounterNumber: 'ENC-TEST-003', remainingBalance: '100.00', amountPaid: '0.00' }
    ],
    chargemaster_items: [
      { id: chargeId, encounterId: ownId, code: 'TEST-OWN', description: 'Synthetic test charge', category: 'PHARMACY', patientOop: '1.00' },
      { id: wrongChargeId, encounterId: otherId, code: 'TEST-OTHER', description: 'Other synthetic charge', category: 'PHARMACY', patientOop: '1.00' }
    ]
  };
  queue = Promise.resolve(); lockReads = 0; writes = 0;
}
function matches(table: any, condition: any, row: any) {
  if (!condition) return true;
  const compiled = dialect.sqlToQuery(condition);
  const names = Object.fromEntries(Object.entries(getTableColumns(table)).map(([key, col]: any) => [col.name, key]));
  const expression = compiled.sql.replace(/"[^"]+"\."([^"]+)" = \$(\d+)/g, (_: string, column: string, index: string) => String(row[names[column]] === compiled.params[Number(index) - 1]))
    .replace(/\band\b/g, '&&').replace(/\bor\b/g, '||');
  assert.match(expression, /^[\s()truefals&|]+$/, `Unsupported test predicate: ${compiled.sql}`);
  return new Function(`return (${expression});`)();
}
class Query {
  table: any; condition: any; op: 'select' | 'insert' | 'update'; data: any; lock = false; cap = Infinity; inTransaction: boolean;
  projection: any; joined = false;
  constructor(op: 'select' | 'insert' | 'update', table: any, inTransaction = false, projection?: any) { this.op = op; this.table = table; this.inTransaction = inTransaction; this.projection = projection; }
  from(table: any) { this.table = table; return this; }
  innerJoin(..._args: any[]) { this.joined = true; return this; }
  leftJoin(..._args: any[]) { this.joined = true; return this; }
  where(condition: any) { this.condition = condition; return this; }
  limit(cap: number) { this.cap = cap; return this; }
  orderBy(..._args: any[]) { return this; }
  for(mode: string) { assert.equal(mode, 'update'); this.lock = true; return this; }
  values(data: any) { this.data = data; return this; }
  set(data: any) { this.data = data; return this; }
  returning() { return this; }
  async execute() {
    const name = getTableName(this.table);
    const items = rows[name] ||= [];
    if (this.op === 'select') {
      if (this.inTransaction && name === 'encounters') { if (this.joined) assert.ok(lockReads > 0, 'Acquire the encounter lock before hydrating'); else { assert.ok(this.lock, 'Encounter must be locked before reading balances'); lockReads++; } }
      const selected = items.filter(row => matches(this.table, this.condition, row)).slice(0, this.cap);
      if (this.joined && this.projection?.encounter) return selected.map(encounter => ({ encounter: { ...encounter }, patient: rows.patients.find(patient => patient.id === encounter.patientId), waterfall: rows.statutory_waterfalls?.find(w => w.encounterId === encounter.id) || null, philhealth: null, hmo: null }));
      return selected.map(row => ({ ...row }));
    }
    writes++;
    if (this.op === 'insert') {
      const record = { id: crypto.randomUUID(), createdAt: new Date(), updatedAt: new Date(), ...this.data };
      items.push(record); return [record];
    }
    for (const row of items.filter(row => matches(this.table, this.condition, row))) Object.assign(row, this.data);
    return [];
  }
  then(resolve: any, reject: any) { return this.execute().then(resolve, reject); }
}
function mockDb(inTransaction = false): any {
  return {
    select: (shape?: any) => new Query('select', undefined, inTransaction, shape),
    insert: (table: any) => new Query('insert', table, inTransaction),
    update: (table: any) => new Query('update', table, inTransaction),
    transaction: async (fn: any) => {
      const prior = queue;
      let release!: () => void;
      queue = new Promise<void>(resolve => release = resolve);
      await prior;
      try { return await fn(mockDb(true)); } finally { release(); }
    }
  };
}
const app = new Hono();
app.use('*', async (c, next) => { c.set('user', user as any); await next(); });
app.route('/encounters', paymentsApp);
app.route('/', promissoryApp);
app.route('/', disputesApp);
app.route('/auth', authApp);
async function request(path: string, body: any, key?: string) {
  return runWithDb(mockDb(), () => app.request(path, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...(key ? { 'Idempotency-Key': key } : {}) }, body: JSON.stringify(body)
  }, { NODE_ENV: process.env.NODE_ENV || 'development' }));
}
const payment = (amount: number) => ({ amount, paymentRail: 'GCASH', payerName: 'Test Payer' });
const note = (principalAmount: number) => ({ principalAmount, borrowerName: 'Test Borrower', borrowerRelationship: 'PATIENT', borrowerIdType: 'PASSPORT', borrowerIdNumber: 'TEST-ID-0001', installmentMonths: 3 });
let passed = 0;
async function check(label: string, fn: () => Promise<void> | void) { reset(); await fn(); passed++; console.log(`[PASS] ${label}`); }

await check('centavo guards reject fractional, nonfinite, zero and negative amounts', async () => {
  for (const amount of [0, -1, 0.001, 1.001, NaN, Infinity]) assert.equal(isCentavoAmount(amount), false);
  for (const amount of [0.01, 0.29, 1.10, 100.25]) assert.equal(isCentavoAmount(amount), true);
  assert.equal((await request(`/encounters/${ownId}/payments`, payment(1.001), 'fraction')).status, 400);
  assert.equal(writes, 0);
});
await check('patient cannot mutate another patient or facility, even with a known cached key', async () => {
  rows.payments = [{ id: 'other-payment', encounterId: otherId, idempotencyKey: 'known-key', amount: '5.00', ...payment(5) }];
  for (const id of [otherId, foreignFacilityId]) {
    const response = await request(`/encounters/${id}/payments`, payment(5), 'known-key');
    assert.equal(response.status, 404); assert.ok(!(await response.text()).includes('other-payment'));
    assert.equal((await request(`/encounters/${id}/promissory-notes`, note(5))).status, 404);
  }
  assert.equal(writes, 0);
});
await check('cached key from another stay returns conflict without disclosure', async () => {
  rows.payments = [{ id: 'private-other-payment', encounterId: otherId, idempotencyKey: 'key-collision', amount: '5.00', ...payment(5) }];
  const response = await request(`/encounters/${ownId}/payments`, payment(5), 'key-collision');
  assert.equal(response.status, 409); assert.ok(!(await response.text()).includes('private-other-payment')); assert.equal(writes, 0);
});
await check('same payment retry creates one payment; confirmations omit staff data', async () => {
  const first = await request(`/encounters/${ownId}/payments`, payment(20), 'retry');
  assert.equal(first.status, 200); const a = await first.json();
  assert.equal(a.payment.isSimulatedDemo, true); assert.equal(a.encounter, undefined); assert.equal(a.payment.idempotencyKey, undefined);
  const second = await request(`/encounters/${ownId}/payments`, payment(20), 'retry');
  assert.equal(second.status, 200); const b = await second.json();
  assert.equal(b.cached, true); assert.equal(b.payment.id, a.payment.id); assert.equal(rows.payments.length, 1);
  assert.equal(rows.encounters[0].remainingBalance, '80.00'); assert.equal(rows.encounters[0].amountPaid, '20.00');
  assert.equal((await request(`/encounters/${ownId}/payments`, payment(21), 'retry')).status, 409);
});
await check('different payment keys preserve cumulative balances under overlapping handlers', async () => {
  const responses = await Promise.all([request(`/encounters/${ownId}/payments`, payment(20), 'concurrent-1'), request(`/encounters/${ownId}/payments`, payment(30), 'concurrent-2')]);
  assert.deepEqual(responses.map(r => r.status), [200, 200]); assert.equal(lockReads, 2);
  assert.equal(rows.payments.length, 2); assert.equal(rows.encounters[0].remainingBalance, '50.00'); assert.equal(rows.encounters[0].amountPaid, '50.00');
});
await check('payment and note cannot both consume the same original balance', async () => {
  const responses = await Promise.all([request(`/encounters/${ownId}/payments`, payment(20), 'payment-before-note'), request(`/encounters/${ownId}/promissory-notes`, note(100))]);
  assert.deepEqual(responses.map(r => r.status), [200, 400]); assert.equal(rows.encounters[0].remainingBalance, '80.00');
  assert.equal(rows.promissory_notes?.length || 0, 0);
});
await check('overpayments and oversized notes do not mutate balances', async () => {
  assert.equal((await request(`/encounters/${ownId}/payments`, payment(100.01), 'too-much')).status, 400);
  assert.equal((await request(`/encounters/${ownId}/promissory-notes`, note(100.01))).status, 400);
  assert.equal(writes, 0); assert.equal(rows.encounters[0].remainingBalance, '100.00');
});
await check('full note retry recovers the same agreement and pass after zero balance', async () => {
  const before = Date.now();
  const first = await request(`/encounters/${ownId}/promissory-notes`, note(100));
  assert.equal(first.status, 200); const a = await first.json();
  const due = new Date(a.promissoryNote.firstDueDate).getTime();
  assert.ok(due >= before + 30 * 86400000 && due <= Date.now() + 30 * 86400000);
  assert.equal(a.promissoryNote.borrowerIdNumber, undefined); assert.equal(a.promissoryNote.digitalSignatureHash, undefined);
  assert.equal(a.dischargePass.hmacSignature, undefined); assert.equal(a.encounter, undefined);
  assert.equal(rows.encounters[0].remainingBalance, '0.00');
  const second = await request(`/encounters/${ownId}/promissory-notes`, note(100));
  assert.equal(second.status, 200); const b = await second.json(); assert.equal(b.cached, true);
  assert.equal(b.promissoryNote.id, a.promissoryNote.id); assert.equal(b.dischargePass.passNumber, a.dischargePass.passNumber);
  assert.equal(rows.promissory_notes.length, 1); assert.equal(rows.discharge_passes.length, 1);
  assert.equal((await request(`/encounters/${ownId}/promissory-notes`, note(99))).status, 409);
});
await check('disputes require encounter ownership and charge membership', async () => {
  const body = { chargeId: wrongChargeId, reason: 'Synthetic test dispute' };
  assert.equal((await request(`/encounters/${ownId}/disputes`, body)).status, 404);
  assert.equal((await request(`/encounters/${otherId}/disputes`, body)).status, 404);
  assert.equal(writes, 0);
  const response = await request(`/encounters/${ownId}/disputes`, { ...body, chargeId });
  assert.equal(response.status, 200); const data = await response.json(); assert.equal(data.encounter, undefined);
  assert.equal(rows.billing_disputes.length, 1); assert.equal(rows.chargemaster_items[0].isDisputed, true);
});
await check('blank registered phone cannot pass self-registration', async () => {
  const response = await request('/auth/register', { email: 'test@example.invalid', password: 'synthetic-test-password', fullName: 'Test Patient', mrn: 'TEST-001', contactNumber: '09123456789', facilityCode: 'TEST-FACILITY' });
  assert.equal(response.status, 404); assert.equal(writes, 0);
});
await check('staff predicates retain facility scope; unlinked patients fail closed', async () => {
  const staffCondition = await runWithDb(mockDb(), () => encounterAccessCondition({ ...user, role: 'BILLING_SPECIALIST' } as any, ownId));
  const staffSql = dialect.sqlToQuery(staffCondition!); assert.ok(staffSql.params.includes(facilityId)); assert.ok(!staffSql.sql.includes('patient_id'));
  const patientCondition = await runWithDb(mockDb(), () => encounterAccessCondition({ ...user, linkedMrn: null } as any, ownId));
  assert.ok(dialect.sqlToQuery(patientCondition!).sql.includes('false'));
});
await check('tiny and large installment plans stay nonnegative and reconcile to centavos', () => {
  for (const cents of [...Array.from({ length: 300 }, (_, i) => i + 1), 1000000, 1845000]) {
    for (const months of [3, 6, 12] as const) {
      const plan = computePromissorySchedule(cents / 100, months);
      assert.ok(plan.schedule.every(amount => amount >= 0)); assert.equal(plan.schedule.length, months);
      assert.equal(plan.schedule.reduce((sum, amount) => sum + Math.round(amount * 100), 0), cents);
    }
  }
});
await check('central access blocks anonymous and patient internal reads including aliases', async () => {
  const app = new Hono();
  app.use('*', async (c, next) => { if (c.req.header('Test-Role')) c.set('user', { ...user, role: c.req.header('Test-Role')! }); await next(); });
  app.use('/api/v1/*', apiAccess); app.all('*', (c) => c.json({ ok: true }));
  for (const path of ['/api/v1/encounters', '/api/v1/beds', '/api/v1/promissory-notes', '/api/v1/promissory-notes/encounters/id/promissory-notes', '/api/v1/auth/switch-role']) {
    assert.equal((await app.request(path)).status, 401);
    assert.equal((await app.request(path, { headers: { 'Test-Role': 'PATIENT_GUARANTOR' } })).status, 403);
  }
  assert.equal((await app.request('/api/v1/patient/me', { headers: { 'Test-Role': 'PATIENT_GUARANTOR' } })).status, 200);
  const staff = await app.request('/api/v1/encounters', { headers: { 'Test-Role': 'BILLING_SPECIALIST' } });
  assert.equal(staff.status, 200); assert.equal(staff.headers.get('Cache-Control'), 'private, no-store');
  assert.equal((await app.request('/api/v1/auth/login', { method: 'POST' })).status, 200);
});
await check('stale MRN and phone-only accounts cannot select a different family record', async () => {
  const stale = await runWithDb(mockDb(), () => resolveLinkedPatient({ ...user, linkedMrn: 'missing', contactNumber: rows.patients[0].contactNumber } as any));
  assert.equal(stale, null);
  const legacy = await runWithDb(mockDb(), () => resolveLinkedPatient({ ...user, linkedMrn: null, contactNumber: 'shared' } as any));
  assert.equal(legacy, null);
});
await check('patient projection excludes nested identifiers, signatures, payment metadata and staff fields', async () => {
  const source = {
    id: 'enc-test', uuid: ownId, encounterNumber: 'ENC-TEST', roomBed: 'WARD', roomCategory: 'WARD',
    patient: { philhealthPin: 'secret', seniorCitizenId: 'secret', pwdId: 'secret' }, doctorPan: 'secret',
    attendingDoctorObj: { contactNumber: 'secret' }, receipts: [{ gatewayAuthCode: 'secret' }], paymentHistory: [{ notes: 'secret' }],
    waterfall: {}, hmo: { providerName: 'Test HMO', adjusterContact: 'secret' }, philhealth: {}, items: [],
    promissoryNote: { id: 'note', borrowerIdNumber: 'secret', digitalSignatureHash: 'secret' },
    disputes: [{ id: 'issue', supervisorNotes: 'secret' }], timeline: [{ id: 'event', actor: 'secret' }]
  };
  const safe = await toPatientSafeEncounter(source as any);
  assert.ok(safe); assert.equal(JSON.stringify(safe).includes('secret'), false);
  assert.equal((safe as any).patient, undefined); assert.equal((safe as any).paymentHistory, undefined);
});
await check('patients cannot settle early-stage bills or run simulated production transactions', async () => {
  rows.encounters[0].stage = 'MGH_DECLARED';
  assert.equal((await request(`/encounters/${ownId}/payments`, payment(10), 'early')).status, 409);
  assert.equal((await request(`/encounters/${ownId}/promissory-notes`, note(10))).status, 409); assert.equal(writes, 0);
  rows.encounters[0].stage = 'PENDING_SETTLEMENT';
  const previous = process.env.NODE_ENV; process.env.NODE_ENV = 'production';
  try {
    assert.equal((await request(`/encounters/${ownId}/payments`, payment(10), 'production')).status, 403);
    assert.equal((await request(`/encounters/${ownId}/promissory-notes`, note(10))).status, 403);
  } finally { process.env.NODE_ENV = previous; }
  assert.equal(writes, 0);
});
await check('recalculation retains paid and financed principal without restoring cash debt', async () => {
  rows.chargemaster_items[0].grossAmount = '100.00'; rows.chargemaster_items[0].status = 'COVERED';
  rows.statutory_waterfalls = [{ encounterId: ownId, patientPaid: '0.00', roomUpgradeExcess: '0.00', doctorExcessPf: '0.00' }];
  assert.equal((await request(`/encounters/${ownId}/promissory-notes`, note(100))).status, 200);
  const computed = await runWithDb(mockDb(), () => recalculateAndPersistWaterfall(ownId));
  assert.equal(computed?.netPatientDue, 100); assert.equal(rows.encounters[0].remainingBalance, '0.00');
  assert.equal(rows.encounters[0].amountPaid, '0.00');
});
await check('payment and recalculation cannot restore an older paid balance', async () => {
  rows.chargemaster_items[0].grossAmount = '100.00'; rows.chargemaster_items[0].status = 'COVERED';
  rows.statutory_waterfalls = [{ encounterId: ownId, patientPaid: '0.00', roomUpgradeExcess: '0.00', doctorExcessPf: '0.00' }];
  const [paymentResult] = await Promise.all([request(`/encounters/${ownId}/payments`, payment(25), 'with-recalculation'), runWithDb(mockDb(), () => recalculateAndPersistWaterfall(ownId))]);
  assert.equal(paymentResult.status, 200); assert.equal(rows.encounters[0].remainingBalance, '75.00');
  assert.equal(rows.encounters[0].amountPaid, '25.00'); assert.ok(lockReads >= 2);
});
console.log(`SERVER_HARDENING_CHECKS_DONE passed=${passed}; no database connected`);
