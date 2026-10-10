import { recalculateAndPersistWaterfall } from '../src/services/waterfallPersistence';
import { apiAccess } from '../src/middleware/access';
import patientApp, { toPatientSafeEncounter } from '../src/routes/patient';
import { resolveLinkedPatient } from '../src/utils/encounterAccess';
import assert from 'node:assert/strict';
import { Hono } from 'hono';
import { getTableName, getTableColumns, sql } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import { runWithDb } from '../src/db';
import clearanceApp from '../src/routes/clearance';
import { authMiddleware } from '../src/middleware/auth';
import { hashSessionToken } from '../src/services/authService';
import { mobileDemoCapability, MOBILE_DEMO_USERNAME } from '../src/services/mobileDemoAccess';
import paymentsApp from '../src/routes/payments';
import promissoryApp from '../src/routes/promissory';
import disputesApp from '../src/routes/disputes';
import authApp from '../src/routes/auth';
import { encounterAccessCondition, isCentavoAmount } from '../src/utils/encounterAccess';
import { computePromissorySchedule } from '../src/services/promissoryEngine';
import chargesApp from '../src/routes/charges';
import encountersApp from '../src/routes/encounters';
import { computeStatutoryWaterfall } from '../src/services/statutoryWaterfall';

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
let failWriteTable: string | null = null;
let transactionCalls = 0;
function reset() {
  user.role = 'PATIENT_GUARANTOR'; failWriteTable = null; transactionCalls = 0;
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
  const expression = compiled.sql.replace(/"[^"]+"\."([^"]+)" in \(([^)]+)\)/g, (_:string,column:string,parameters:string)=>String([...parameters.matchAll(/\$(\d+)/g)].some(match=>row[names[column]]===compiled.params[Number(match[1])-1]))).replace(/"[^"]+"\."([^"]+)" = \$(\d+)/g, (_: string, column: string, index: string) => String(row[names[column]] === compiled.params[Number(index) - 1]))
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
      if (this.joined && this.projection?.encounter) return selected.map(encounter => ({ encounter: { ...encounter }, patient: rows.patients.find(patient => patient.id === encounter.patientId), waterfall: rows.statutory_waterfalls?.find(w => w.encounterId === encounter.id) || null, philhealth: null, hmo: rows.hmo_authorizations?.find(h => h.encounterId === encounter.id) || null }));
      if (this.projection) {
        const columns = Object.fromEntries(Object.entries(getTableColumns(this.table)).map(([key, col]: any) => [col.name, key]));
        return selected.map(row => Object.fromEntries(Object.entries(this.projection).map(([alias, col]: any) => [alias, row[columns[col.name]]])));
      }
      return selected.map(row => ({ ...row }));
    }
    if (name === failWriteTable) throw new Error('INJECTED_WRITE_FAILURE');
    writes++;
    if (this.op === 'insert') {
      const record = { id: crypto.randomUUID(), createdAt: new Date(), updatedAt: new Date(), eventTimestamp: new Date(), ...this.data };
      items.push(record); return [record];
    }
    for (const row of items.filter(row => matches(this.table, this.condition, row))) Object.assign(row, this.data);
    return [];
  }
  getSQL() {
    assert.equal(this.op,'select');assert.ok(this.projection?.id,'Only facility ID subqueries are modeled');
    const selected=(rows[getTableName(this.table)]||[]).filter(row=>matches(this.table,this.condition,row));
    return sql`${sql.join(selected.map(row=>sql`${row.id}`),sql`, `)}`;
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
      transactionCalls++;
      const before = structuredClone(rows); const previousWrites = writes;
      try { return await fn(mockDb(true)); }
      catch (error) { rows = before; writes = previousWrites; throw error; }
      finally { release(); }
    }
  };
}
const app = new Hono();
app.use('*', async (c, next) => { c.set('user', user as any); await next(); });
app.route('/encounters', paymentsApp);
app.route('/encounters', clearanceApp);
app.route('/encounters', encountersApp);
app.route('/', promissoryApp);
app.route('/', disputesApp);
app.route('/auth', authApp);
app.route('/', chargesApp);
app.onError((_error, c) => c.json({ error: { code: 'INJECTED_TRANSACTION_FAILURE' } }, 500));
app.route('/patient', patientApp);
async function request(path: string, body: any, key?: string) {
  return runWithDb(mockDb(), () => app.request(path, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...(key ? { 'Idempotency-Key': key } : {}) }, body: JSON.stringify(body)
  }, { NODE_ENV: process.env.NODE_ENV || 'development' }));
}
const payment = (amount: number) => ({ amount, paymentRail: 'GCASH', payerName: 'Test Payer' });
const note = (principalAmount: number) => ({ principalAmount, borrowerName: 'Test Borrower', borrowerRelationship: 'PATIENT', borrowerIdType: 'PASSPORT', borrowerIdNumber: 'P1234567A', installmentMonths: 3 });
let passed = 0;
async function check(label: string, fn: () => Promise<void> | void) { reset(); await fn(); passed++; console.log(`[PASS] ${label}`); }

await check('invalid government IDs cannot finance or clear a bill through direct API calls', async () => {
  for (const borrowerIdType of ['PHILSYS_NATIONAL_ID', 'UMID', 'DRIVERS_LICENSE', 'PASSPORT']) {
    for (const borrowerIdNumber of ['1234', 'ABCD', 'ABCD1234', '1234-5678', '１２３４５６７８９０１２３４５６']) {
      const response = await request(`/encounters/${ownId}/promissory-notes`, { ...note(5), borrowerIdType, borrowerIdNumber });
      assert.equal(response.status, 400);
      assert.equal(writes, 0); assert.equal((rows.promissory_notes || []).length, 0); assert.equal((rows.discharge_passes || []).length, 0);
      assert.equal(rows.encounters[0].remainingBalance, '100.00');
    }
  }
});
await check('each supported government ID persists canonically and equivalent retries reuse the note', async () => {
  for (const [borrowerIdType, input, canonical] of [
    ['PHILSYS_NATIONAL_ID', '0123456789012345', '0123-4567-8901-2345'],
    ['UMID', '012345678901', '0123-4567890-1'],
    ['DRIVERS_LICENSE', 'a0123123456', 'A01-23-123456'],
    ['PASSPORT', 'p1234567a', 'P1234567A']
  ]) {
    reset();
    const response = await request(`/encounters/${ownId}/promissory-notes`, { ...note(5), borrowerIdType, borrowerIdNumber: input });
    assert.equal(response.status, 200);
    const created = await response.json() as any;
    assert.equal(rows.promissory_notes[0].borrowerIdNumber, canonical);
    const before = writes;
    const retry = await request(`/encounters/${ownId}/promissory-notes`, { ...note(5), borrowerIdType, borrowerIdNumber: canonical });
    assert.equal(retry.status, 200);
    const cached = await retry.json() as any;
    assert.equal(cached.cached, true); assert.equal(cached.promissoryNote.id, created.promissoryNote.id);
    assert.equal(writes, before); assert.equal(rows.encounters[0].remainingBalance, '95.00');
  }
});

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
await check('patients cannot settle early-stage bills; hosted payments use the same simulated processor', async () => {
  rows.encounters[0].stage = 'MGH_DECLARED';
  assert.equal((await request(`/encounters/${ownId}/payments`, payment(10), 'early')).status, 409);
  assert.equal((await request(`/encounters/${ownId}/promissory-notes`, note(10))).status, 409); assert.equal(writes, 0);
  rows.encounters[0].stage = 'PENDING_SETTLEMENT';
  const previous = process.env.NODE_ENV; process.env.NODE_ENV = 'production';
  try {
    assert.equal((await request(`/encounters/${ownId}/payments`, payment(10), 'production')).status, 200);
    assert.equal((await request(`/encounters/${ownId}/promissory-notes`, note(10))).status, 403);
  } finally { process.env.NODE_ENV = previous; }
  assert.equal(rows.payments.length, 1);
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
await check('all four methods persist successful records and update the correct bill', async () => {
  const refs = new Set<string>();
  for (const [index, rail] of ['GCASH', 'MAYA', 'CREDIT_DEBIT_CARD', 'BANK_TRANSFER'].entries()) {
    const input = { ...payment(10), paymentRail: rail, ...(rail === 'CREDIT_DEBIT_CARD' ? { cardBrand: 'VISA', cardLast4: '1111' } : {}), ...(rail === 'BANK_TRANSFER' ? { bankName: 'BPI' } : {}) };
    const response = await request(`/encounters/${ownId}/payments`, input, `four-rails-${index}`);
    assert.equal(response.status, 200); const result: any = await response.json();
    assert.equal(result.payment.status, 'SUCCESS'); assert.equal(result.receipt.status, 'SUCCESS');
    assert.equal(result.receipt.paymentReference, result.payment.paymentReference);
    assert.equal(rows.payments[index].encounterId, ownId); refs.add(result.payment.paymentReference);
  }
  assert.equal(refs.size, 4); assert.equal(rows.payment_receipts.length, 4);
  assert.equal(rows.encounters[0].remainingBalance, '60.00'); assert.equal(rows.encounters[1].remainingBalance, '100.00');
});
await check('full settlement is paid and different duplicate keys cannot pay it again', async () => {
  const responses = await Promise.all([request(`/encounters/${ownId}/payments`, payment(100), 'full-one'), request(`/encounters/${ownId}/payments`, payment(100), 'full-two')]);
  assert.deepEqual(responses.map(r => r.status).sort(), [200, 409]);
  assert.equal(rows.payments.length, 1); assert.equal(rows.payment_receipts.length, 1);
  assert.equal(rows.encounters[0].remainingBalance, '0.00'); assert.equal(rows.encounters[0].billState, 'PAID');
  assert.equal((await request(`/encounters/${ownId}/payments`, payment(100), 'full-one')).status, 200);
});
await check('receipt and payment history remain retrievable by a fresh router', async () => {
  const result: any = await (await request(`/encounters/${ownId}/payments`, payment(10), 'history')).json();
  const fresh = new Hono(); fresh.use('*', async (c, next) => { c.set('user', user as any); await next(); }); fresh.route('/patient', patientApp);
  const get = (path: string) => runWithDb(mockDb(), () => fresh.request(path));
  const history: any = await (await get('/patient/me/payments')).json();
  assert.equal(history.items[0].id, result.payment.id);
  const receipt: any = await (await get(`/patient/me/receipts/${result.receipt.id}`)).json();
  assert.equal(receipt.paymentReference, result.payment.paymentReference); assert.equal(receipt.patientMrn, 'TEST-001');
  assert.equal((await get('/patient/me/receipts/unknown-receipt')).status, 404);
});
await check('card secrets and missing keys/method metadata are rejected without mutation', async () => {
  for (const forbidden of ['cardNumber', 'cvv', 'cardExpiry', 'walletPassword', 'bankPassword']) assert.equal((await request(`/encounters/${ownId}/payments`, { ...payment(10), [forbidden]: 'secret' }, `secret-${forbidden}`)).status, 400);
  assert.equal((await request(`/encounters/${ownId}/payments`, payment(10))).status, 400);
  assert.equal((await request(`/encounters/${ownId}/payments`, { ...payment(10), paymentRail: 'CREDIT_DEBIT_CARD' }, 'missing-card')).status, 400);
  assert.equal((await request(`/encounters/${ownId}/payments`, { ...payment(10), paymentRail: 'BANK_TRANSFER', bankName: 'unknown' }, 'missing-bank')).status, 400);
  assert.equal(writes, 0);
});
await check('Final LOA approval confirms persisted status for each authorized staff role', async () => {
  const role = user.role;
  rows.encounters[0].admissionTimestamp = new Date('2026-10-08T00:00:00Z');
  rows.encounters[0].stage = 'HMO_FINAL_LOA';
  rows.hmo_authorizations = [{ id: 'hmo-test', encounterId: ownId, approvedAmount: '30.00', finalLoaStatus: 'AWAITING_CODE' }];
  rows.chargemaster_items[0].grossAmount = '100.00'; rows.chargemaster_items[0].status = 'COVERED';
  rows.statutory_waterfalls = [{ encounterId: ownId, patientPaid: '0.00', roomUpgradeExcess: '0.00', doctorExcessPf: '0.00' }];
  try {
    for (const allowed of ['BILLING_SPECIALIST', 'HMO_COORDINATOR', 'HOSPITAL_CFO']) {
      user.role = allowed;
      const response = await request(`/encounters/${ownId}/hmo/final-loa`, { approvalCode: 'APV-VALIDATED', approvedAmount: 30 });
      assert.equal(response.status, 200); const result: any = await response.json();
      assert.equal(result.encounter.hmo.finalLoaStatus, 'APPROVED'); assert.equal(result.encounter.stage, 'PENDING_SETTLEMENT');
      assert.equal(rows.hmo_authorizations[0].approvalCode, 'APV-VALIDATED');
    }
  } finally { user.role = role; }
});
await check('Final LOA rejects anonymous users, patient roles and another facility', async () => {
  const anon = new Hono(); anon.route('/encounters', clearanceApp);
  assert.equal((await anon.request(`/encounters/${ownId}/hmo/final-loa`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status, 401);
  assert.equal((await request(`/encounters/${ownId}/hmo/final-loa`, {})).status, 403);
  const role = user.role; user.role = 'BILLING_SPECIALIST';
  try { assert.equal((await request(`/encounters/${foreignFacilityId}/hmo/final-loa`, {})).status, 404); } finally { user.role = role; }
  assert.equal(writes, 0);
});
await check('real authentication middleware rejects expired sessions and distinguishes DB outages', async () => {
  const sessionToken = 'synthetic-session'; const tokenHash = await hashSessionToken(sessionToken);
  let session = { tokenHash, expiresAt: new Date(Date.now() + 10000), user: { ...user, role: 'BILLING_SPECIALIST', isActive: true } };
  let outage = false;
  const authDb: any = { select: () => {
    const query: any = { from: () => query, innerJoin: () => query, where: (condition: any) => {
      const sql = dialect.sqlToQuery(condition); assert.ok(sql.sql.includes(' > '));
      assert.ok(sql.params.includes(tokenHash)); return query;
    }, limit: async () => { if (outage) throw new Error('Synthetic DB outage'); return session.expiresAt > new Date() && session.user.isActive ? [{ sessionId: 'synthetic-id', user: session.user }] : []; } }; return query;
  } };
  const secured = new Hono(); secured.use('*', authMiddleware); secured.route('/encounters', clearanceApp);
  const call = () => runWithDb(authDb, () => secured.request(`/encounters/${ownId}/hmo/final-loa`, { method: 'POST', headers: { Authorization: `Bearer ${sessionToken}`, 'Content-Type': 'application/json' }, body: '{}' }));
  session.expiresAt = new Date(0); assert.equal((await call()).status, 401);
  outage = true; assert.equal((await call()).status, 503);
});
await check('patients cannot bypass dedicated note/cashier flows through online payments', async () => {
  for (const paymentRail of ['PROMISSORY_NOTE', 'CASHIER_OVER_THE_COUNTER']) assert.equal((await request(`/encounters/${ownId}/payments`, { ...payment(10), paymentRail }, paymentRail)).status, 400);
  assert.equal(writes, 0);
});
await check('mobile presentation capability requires the reserved persisted principal', () => {
  assert.equal(mobileDemoCapability({ username: MOBILE_DEMO_USERNAME, role: 'HOSPITAL_CFO' }), true);
  for (const role of ['PATIENT_GUARANTOR', 'BILLING_SPECIALIST']) assert.equal(mobileDemoCapability({ username: MOBILE_DEMO_USERNAME, role }), false);
  assert.equal(mobileDemoCapability({ username: 'ordinary-cfo', role: 'HOSPITAL_CFO' }), false);
});
await check('ordinary patient and CFO accounts cannot browse or select other patients', async () => {
  const original = { ...user }; const principal = user as any;
  try {
    for (const role of ['PATIENT_GUARANTOR', 'HOSPITAL_CFO']) {
      principal.role = role; principal.mobileDemoAdmin = false;
      assert.equal((await runWithDb(mockDb(), () => app.request('/patient/demo/patients'))).status, 403);
      assert.equal((await runWithDb(mockDb(), () => app.request('/patient/me', { headers: { 'X-Medcore-Patient-Id': patientId } }))).status, 403);
    }
  } finally { Object.assign(user, original); delete principal.mobileDemoAdmin; }
  assert.equal(writes, 0);
});
await check('presentation directory and selected records remain facility scoped', async () => {
  rows.patients.push({ id: otherPatientId, facilityId, mrn: 'TEST-002', fullName: 'Other Patient', contactNumber: 'private' });
  const foreignPatient = '30000000-0000-4000-8000-000000000003';
  rows.patients.push({ id: foreignPatient, facilityId: 'other-facility', fullName: 'Foreign Patient' });
  const original = { ...user }; const principal = user as any;
  try {
    principal.role = 'HOSPITAL_CFO'; principal.mobileDemoAdmin = true;
    const directory = await runWithDb(mockDb(), () => app.request('/patient/demo/patients'));
    const body = await directory.json() as any;
    assert.equal(directory.status, 200); assert.equal(body.total, 2);
    assert.deepEqual(Object.keys(body.items[0]).sort(), ['fullName', 'id', 'mrn']);
    const selected = await runWithDb(mockDb(), () => app.request('/patient/me', { headers: { 'X-Medcore-Patient-Id': otherPatientId } }));
    assert.equal(selected.status, 200); assert.equal(((await selected.json()) as any).patient.id, otherPatientId);
    assert.equal((await runWithDb(mockDb(), () => app.request('/patient/me', { headers: { 'X-Medcore-Patient-Id': foreignPatient } }))).status, 404);
    assert.equal((await runWithDb(mockDb(), () => app.request('/patient/me', { headers: { 'X-Medcore-Patient-Id': 'not-a-uuid' } }))).status, 400);
    assert.equal((await runWithDb(mockDb(), () => app.request(`/patient/me/encounters/${foreignFacilityId}`, { headers: { 'X-Medcore-Patient-Id': patientId } }))).status, 404);
    assert.equal((await runWithDb(mockDb(), () => app.request(`/patient/me/encounters/${ownId}`, { headers: { 'X-Medcore-Patient-Id': otherPatientId } }))).status, 404);
  } finally { Object.assign(user, original); delete principal.mobileDemoAdmin; }
});
await check('role override headers cannot grant the presentation capability', async () => {
  const principal = { ...user, username: MOBILE_DEMO_USERNAME, role: 'BILLING_SPECIALIST', isActive: true };
  const authDb: any = { select: () => {
    const query: any = { from: () => query, innerJoin: () => query, where: () => query, limit: async () => [{ sessionId: 'synthetic-id', user: principal }] }; return query;
  } };
  const secured = new Hono(); secured.use('*', authMiddleware);
  secured.get('/probe', c => c.json({ capability: c.get('user').mobileDemoAdmin, role: c.get('user').role }));
  const response = await runWithDb(authDb, () => secured.request('/probe', { headers: { Authorization: 'Bearer synthetic-token', 'X-Demo-Role': 'HOSPITAL_CFO' } }, { NODE_ENV: 'development' }));
  const body = await response.json() as any;
  assert.equal(body.role, 'HOSPITAL_CFO'); assert.equal(body.capability, false);
});

await check('money validation rejects amounts beyond numeric(15,2) before a settlement write', async () => {
  const unsupported = (Number.MAX_SAFE_INTEGER - 1000) / 100;
  assert.equal(isCentavoAmount(unsupported), false);
  assert.throws(() => computeStatutoryWaterfall([{ grossAmount: unsupported, category:'LABORATORY', status:'COVERED' }], false, 0.01, 0, 0, 0, 0));
  assert.equal((await request(`/encounters/${ownId}/payments`, payment(unsupported), 'outside-monetary-range')).status,400);
  assert.equal(writes,0);
  for (const senior of [false,true]) for (let offset=0;offset<100;offset++) {
    const gross = (999999999990000-offset)/100;
    let w;
    try { w=computeStatutoryWaterfall([{grossAmount:gross,category:'LABORATORY',status:'COVERED'}],senior,0.01,0,0,0,0); }
    catch { continue; } // Subcent binary representations fail closed at the input boundary.
    assert.equal(Math.round(w.grossTotal*100), [w.vatExemption,w.seniorPwdDiscount,w.philhealthTotal,w.hmoApprovedAmount,w.netPatientDue].reduce((sum,value)=>sum+Math.round(value*100),0));
  }
});
await check('all roles reject new early-stage payments and notes without mutation', async () => {
  for (const role of ['PATIENT_GUARANTOR', 'BILLING_SPECIALIST', 'HOSPITAL_CFO']) {
    for (const stage of ['MGH_DECLARED', 'DOCTOR_PF_PENDING', 'PHARMACY_RTS_AUDIT', 'HMO_FINAL_LOA', 'CLEARED_GATE_PASS']) {
      user.role = role; rows.encounters[0].stage = stage;
      for (const [path, body] of [[`/encounters/${ownId}/payments`, payment(10)], [`/encounters/${ownId}/promissory-notes`, note(10)]]) {
        const response = await request(path as string, body, `early-${role}-${stage}`);
        assert.equal(response.status, 409); assert.equal((await response.json()).error.code, 'STAGE_NOT_READY');
        assert.equal(writes, 0); assert.equal(rows.encounters[0].remainingBalance, '100.00');
      }
    }
  }
});
function financialFixture(stage = 'DOCTOR_PF_PENDING') {
  user.role = 'HOSPITAL_CFO';
  Object.assign(rows.encounters[0], { stage, admissionTimestamp: new Date(), doctorAgreedFee:'40.00', doctorExcessPf:'20.00', pharmacyRtsCleared:false, unreturnedMedsCount:0 });
  Object.assign(rows.chargemaster_items[0], { grossAmount:'60.00', quantity:'1.00', unitPrice:'60.00', philhealthCovered:'0.00', hmoCovered:'0.00', status:'COVERED' });
  rows.chargemaster_items.push({ id: 'fee', encounterId:ownId, category:'PROFESSIONAL_FEE', grossAmount:'40.00', quantity:'1.00', unitPrice:'40.00', patientOop:'20.00', philhealthCovered:'10.00', hmoCovered:'10.00', status:'EXCESS_PF' });
  rows.statutory_waterfalls = [{ encounterId:ownId, grossTotal:'100.00', roomUpgradeExcess:'0.00', doctorExcessPf:'20.00', netPatientDue:'100.00', patientPaid:'0.00' }];
}
await check('QuickSign synchronizes PF gross, allocations, waterfall, stage and audit in one transaction', async () => {
  financialFixture();
  const response = await request(`/encounters/${ownId}/doctor/sign`, {agreedFee:35});
  assert.equal(response.status,200); assert.equal(transactionCalls,1);
  const fee = rows.chargemaster_items.find(item => item.id==='fee');
  assert.equal(fee.grossAmount,'35.00'); assert.equal(fee.unitPrice,'35.00'); assert.equal(fee.patientOop,'15.00');
  assert.equal(Number(fee.philhealthCovered)+Number(fee.hmoCovered)+Number(fee.patientOop),35);
  assert.equal(rows.statutory_waterfalls[0].grossTotal,'95.00'); assert.equal(rows.encounters[0].remainingBalance,'95.00');
  assert.equal(rows.encounters[0].stage,'PHARMACY_RTS_AUDIT'); assert.equal(rows.encounter_timeline_events.length,1); assert.equal(rows.system_audit_logs.length,1);
});
await check('QuickSign insertion and tiny fee keep coverage within the confirmed gross', async () => {
  financialFixture();
  const response = await request(`/encounters/${ownId}/doctor/sign`, {agreedFee:1}); assert.equal(response.status,200);
  const fee = rows.chargemaster_items.find(item => item.id==='fee');
  assert.equal(fee.philhealthCovered,'1.00'); assert.equal(fee.hmoCovered,'0.00'); assert.equal(fee.patientOop,'0.00');
  reset(); financialFixture(); rows.chargemaster_items = rows.chargemaster_items.filter(item => item.id!=='fee');
  assert.equal((await request(`/encounters/${ownId}/doctor/sign`, {agreedFee:35})).status,200);
  const inserted = rows.chargemaster_items.filter(item => item.category==='PROFESSIONAL_FEE');
  assert.equal(inserted.length,1); assert.equal(inserted[0].patientOop,'35.00'); assert.equal(inserted[0].status,'EXCESS_PF');
});
await check('QuickSign audit failure rolls back the fee, balance, stage and timeline', async () => {
  financialFixture(); const original = structuredClone(rows); failWriteTable = 'system_audit_logs';
  assert.equal((await request(`/encounters/${ownId}/doctor/sign`,{agreedFee:35})).status,500);
  for (const table of ['encounters','chargemaster_items','statutory_waterfalls']) assert.deepEqual(rows[table],original[table]);
  assert.equal(rows.encounter_timeline_events?.length || 0,0); assert.equal(writes,0);
});
function disputedFixture() {
  financialFixture(); rows.chargemaster_items = rows.chargemaster_items.filter(item=>item.id!=='fee');
  Object.assign(rows.chargemaster_items[0],{grossAmount:'100.00', patientOop:'100.00', isDisputed:true, status:'CONTESTED', category:'LABORATORY'});
  rows.statutory_waterfalls[0].doctorExcessPf='0.00';
  rows.billing_disputes=[{id:'60000000-0000-4000-8000-000000000001',encounterId:ownId,chargeId,status:'OPEN',createdAt:new Date(),contestedAmount:'100.00'}];
}
await check('supervisory waiver shares transaction context and confirms exact zero OOP and balance', async () => {
  disputedFixture(); const path='/disputes/'+rows.billing_disputes[0].id+'/supervisory-waive';
  assert.equal((await request(path,{supervisorNotes:'Synthetic authorized waiver'})).status,200); assert.equal(transactionCalls,1);
  assert.equal(rows.chargemaster_items[0].status,'SUPERVISORY_WAIVED'); assert.equal(rows.chargemaster_items[0].patientOop,'0.00'); assert.equal(rows.chargemaster_items[0].isDisputed,false);
  assert.equal(rows.billing_disputes[0].status,'SUPERVISOR_WAIVED'); assert.equal(rows.billing_disputes[0].resolvedByUserId,user.id);
  assert.equal(rows.encounters[0].remainingBalance,'0.00'); assert.equal(rows.encounters[0].pharmacyRtsCleared,false);
  assert.equal(rows.system_audit_logs.length,1);
  assert.equal((await request(path,{supervisorNotes:'Synthetic authorized waiver'})).status,200); assert.equal(rows.system_audit_logs.length,1);
});
await check('supervisory waiver audit failure rolls back charge, dispute, waterfall and balance', async () => {
  disputedFixture(); const original=structuredClone(rows); failWriteTable='system_audit_logs';
  assert.equal((await request('/disputes/'+rows.billing_disputes[0].id+'/supervisory-waive',{supervisorNotes:'Synthetic authorized waiver'})).status,500);
  for (const table of ['encounters','chargemaster_items','statutory_waterfalls','billing_disputes']) assert.deepEqual(rows[table],original[table]);
  assert.equal(rows.system_audit_logs?.length || 0,0); assert.equal(writes,0);
});
await check('payment receipt and audit failure leave no orphaned rows or changed balance', async () => {
  for (const table of ['payment_receipts','system_audit_logs']) {
    reset(); failWriteTable=table;
    assert.equal((await request(`/encounters/${ownId}/payments`,payment(10),`rollback-${table}`)).status,500);
    for (const name of ['payments','payment_receipts','system_audit_logs']) assert.equal(rows[name]?.length || 0,0);
    assert.equal(rows.encounters[0].remainingBalance,'100.00'); assert.equal(rows.encounters[0].amountPaid,'0.00'); assert.equal(writes,0);
  }
});
await check('HMO audit failure cannot expose a settlement stage or persist changed coverage', async () => {
  financialFixture('HMO_FINAL_LOA'); rows.hmo_authorizations=[{encounterId:ownId, approvedAmount:'0.00', finalLoaStatus:'AWAITING_CODE'}];
  const original=structuredClone(rows); failWriteTable='system_audit_logs';
  assert.equal((await request(`/encounters/${ownId}/hmo/final-loa`,{approvedAmount:30,approvalCode:'AUDIT'})).status,500);
  for (const table of ['encounters','hmo_authorizations','statutory_waterfalls']) assert.deepEqual(rows[table],original[table]);
  assert.equal(rows.encounter_timeline_events?.length || 0,0); assert.equal(writes,0);
});
await check('charge and HMO money schemas reject fractional centavos before any write', async () => {
  user.role='BILLING_SPECIALIST';
  assert.equal((await request(`/encounters/${ownId}/charges`,{description:'Tiny charge',category:'LABORATORY',grossAmount:0.001})).status,400);
  assert.equal((await request(`/encounters/${ownId}/hmo/final-loa`,{approvedAmount:0.001})).status,400); assert.equal(writes,0);
});
await check('bill finalize and send persist state/timeline without changing the authoritative balance', async () => {
  financialFixture('PENDING_SETTLEMENT');
  const balance=rows.encounters[0].remainingBalance;
  assert.equal((await request(`/encounters/${ownId}/send-bill`,{})).status,409);assert.equal(writes,0);
  assert.equal((await request(`/encounters/${ownId}/finalize-bill`,{})).status,200);
  assert.equal(rows.encounters[0].billState,'FINALIZED');assert.ok(rows.encounters[0].billFinalizedAt);assert.equal(rows.encounters[0].remainingBalance,balance);
  assert.equal((await request(`/encounters/${ownId}/send-bill`,{})).status,200);assert.equal(rows.encounters[0].billState,'SENT_TO_PATIENT');assert.ok(rows.encounters[0].billSentAt);
  const committed=writes;assert.equal((await request(`/encounters/${ownId}/send-bill`,{})).status,200);assert.equal(writes,committed);
  user.role='PATIENT_GUARANTOR';assert.equal((await request(`/encounters/${ownId}/view-bill`,{})).status,200);assert.equal(rows.encounters[0].billState,'VIEWED');assert.ok(rows.encounters[0].billFirstViewedAt);
});
await check('bill lifecycle rejects early stages, foreign facilities and patient staff actions', async () => {
  financialFixture();
  assert.equal((await request(`/encounters/${ownId}/finalize-bill`,{})).status,409);assert.equal(writes,0);
  user.role='PATIENT_GUARANTOR';assert.equal((await request(`/encounters/${ownId}/finalize-bill`,{})).status,403);assert.equal(writes,0);
  user.role='HOSPITAL_CFO';assert.equal((await request(`/encounters/${foreignFacilityId}/finalize-bill`,{})).status,404);assert.equal(writes,0);
});
await check('bill finalization audit failure rolls back state and its delivery timeline', async () => {
  financialFixture('PENDING_SETTLEMENT');const original=structuredClone(rows);failWriteTable='system_audit_logs';
  assert.equal((await request(`/encounters/${ownId}/finalize-bill`,{})).status,500);
  assert.deepEqual(rows.encounters,original.encounters);assert.equal(rows.encounter_timeline_events?.length||0,0);assert.equal(writes,0);
});
await check('zero-copay release creates one pass atomically and rejects early/nonzero balances',async()=>{
  financialFixture('PENDING_SETTLEMENT');rows.encounters[0].remainingBalance='0.00';
  assert.equal((await request(`/encounters/${ownId}/gate-pass`,{})).status,200);
  assert.equal(rows.encounters[0].stage,'CLEARED_GATE_PASS');assert.equal(rows.discharge_passes.length,1);
  assert.match(rows.discharge_passes[0].exitPin,/^[1-9]\d{3}$/);
  const committed=writes;assert.equal((await request(`/encounters/${ownId}/gate-pass`,{})).status,200);assert.equal(writes,committed);
  reset();financialFixture('DOCTOR_PF_PENDING');rows.encounters[0].remainingBalance='0.00';assert.equal((await request(`/encounters/${ownId}/gate-pass`,{})).status,409);assert.equal(writes,0);
  reset();financialFixture('PENDING_SETTLEMENT');assert.equal((await request(`/encounters/${ownId}/gate-pass`,{})).status,409);assert.equal(writes,0);
});
await check('zero-copay release audit failure rolls back pass, stage and timeline',async()=>{
  financialFixture('PENDING_SETTLEMENT');rows.encounters[0].remainingBalance='0.00';const original=structuredClone(rows);failWriteTable='system_audit_logs';
  assert.equal((await request(`/encounters/${ownId}/gate-pass`,{})).status,500);
  assert.deepEqual(rows.encounters,original.encounters);assert.equal(rows.discharge_passes?.length||0,0);assert.equal(rows.encounter_timeline_events?.length||0,0);assert.equal(writes,0);
});
await check('self-pay pharmacy clearance skips an absent HMO authorization',async()=>{
  financialFixture('PHARMACY_RTS_AUDIT');rows.hmo_authorizations=[];
  assert.equal((await request(`/encounters/${ownId}/pharmacy/clear-rts`,{})).status,200);
  assert.equal(rows.encounters[0].stage,'PENDING_SETTLEMENT');
});
await check('encounter edit audit failure rolls back diagnosis and room metadata',async()=>{
  financialFixture('PENDING_SETTLEMENT');const original=structuredClone(rows);failWriteTable='system_audit_logs';
  const response=await runWithDb(mockDb(),()=>app.request(`/encounters/${ownId}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({primaryDiagnosis:'Synthetic changed diagnosis',dailyRoomRate:3000})}));
  assert.equal(response.status,500);assert.deepEqual(rows.encounters,original.encounters);assert.equal(writes,0);
});
await check('settlement release cannot clear a bed owned by another encounter',async()=>{
  financialFixture('PENDING_SETTLEMENT');rows.encounters[0].bedId='bed-shared';
  rows.beds=[{id:'bed-shared',facilityId:user.facilityId,status:'OCCUPIED',currentEncounterId:otherId}];
  const before=structuredClone(rows.beds);
  assert.equal((await request(`/encounters/${ownId}/payments`,payment(Number(rows.encounters[0].remainingBalance)),'bed-owner-check')).status,200);
  assert.deepEqual(rows.beds,before);
});
await check('room transfer rejects unknown or unavailable destinations before any writes',async()=>{
  financialFixture('PENDING_SETTLEMENT');rows.encounters[0].roomBed='Original';rows.encounters[0].bedId='original-bed';
  rows.beds=[{id:'original-bed',bedNumber:'Original',facilityId:user.facilityId,status:'OCCUPIED',currentEncounterId:ownId},{id:'other-bed',bedNumber:'Other',facilityId:user.facilityId,status:'OCCUPIED',currentEncounterId:otherId}];
  const before=structuredClone(rows);
  for(const [roomBed,status] of [['Missing',400],['Other',409]] as const){
    const response=await runWithDb(mockDb(),()=>app.request(`/encounters/${ownId}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({roomBed,primaryDiagnosis:'Rejected change'})}));
    assert.equal(response.status,status);assert.deepEqual(rows.encounters,before.encounters);assert.deepEqual(rows.beds,before.beds);assert.equal(writes,0);
  }
});
await check('quantity/price edits recompute billed gross and waterfall in exact cents',async()=>{
  financialFixture('PENDING_SETTLEMENT');const item=rows.chargemaster_items[0];item.quantity='1.00';item.unitPrice='100.00';item.grossAmount='100.00';
  const response=await runWithDb(mockDb(),()=>app.request('/charges/'+item.id,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({quantity:2,unitPrice:100})}));
  assert.equal(response.status,200);assert.equal(rows.chargemaster_items[0].grossAmount,'200.00');assert.equal(rows.statutory_waterfalls[0].grossTotal,'240.00');
});
await check('financial edits to waived charges preserve zero item liability and excluded gross',async()=>{
  financialFixture('PENDING_SETTLEMENT');const item=rows.chargemaster_items[0];item.status='SUPERVISORY_WAIVED';item.patientOop='0.00';
  for(const body of [{quantity:2,unitPrice:100},{grossAmount:300}]){
    const response=await runWithDb(mockDb(),()=>app.request('/charges/'+item.id,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}));
    assert.equal(response.status,200);assert.equal(rows.chargemaster_items[0].patientOop,'0.00');assert.equal(rows.chargemaster_items[0].status,'SUPERVISORY_WAIVED');assert.equal(rows.statutory_waterfalls[0].grossTotal,'40.00');
  }
});
console.log(`SERVER_HARDENING_CHECKS_DONE passed=${passed}; no database connected`);
