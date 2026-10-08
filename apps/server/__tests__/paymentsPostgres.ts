// Opt-in real PostgreSQL verification. Run only against a dedicated validation
// database, never aqromed or a hosted hospital database. Does not reseed anything.
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { createDbConnection, runWithDb } from '../src/db';
import { facilities, users, patients, encounters, chargemasterItems, hmoAuthorizations, statutoryWaterfalls, payments, paymentReceipts, userSessions } from '../src/db/schema';
import { generateSessionToken, hashSessionToken } from '../src/services/authService';
import { authMiddleware } from '../src/middleware/auth';
import clearanceApp from '../src/routes/clearance';
import paymentsApp from '../src/routes/payments';
import patientApp from '../src/routes/patient';

const url = process.env.MEDCORE_VALIDATION_DATABASE_URL;
if (!url) throw new Error('Set MEDCORE_VALIDATION_DATABASE_URL to a dedicated local medcore_payment_validation database.');
const target = new URL(url);
assert.ok(!target.search && !target.hash, 'Query options and fragments are not allowed in a validation connection URL.');
assert.ok(['postgres:', 'postgresql:'].includes(target.protocol), 'A PostgreSQL connection URL is required.');
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(target.hostname), 'Only a local validation database is allowed.');
assert.match(target.pathname, /^\/medcore_payment_validation(?:_[a-z0-9]+)?$/, 'Refusing to modify a non-validation database.');
process.env.NODE_ENV = 'development';
const databaseName = target.pathname.slice(1);
const adminUrl = new URL(url); adminUrl.pathname = '/postgres';
const admin = createDbConnection(adminUrl.toString());
try {
  const found = await admin.pool.query('SELECT 1 FROM pg_database WHERE datname = $1', [databaseName]);
  if (!found.rowCount) await admin.pool.query(`CREATE DATABASE "${databaseName}"`);
} finally { await admin.pool.end(); }
let connection = createDbConnection(url);
const tag = crypto.randomUUID().slice(0, 8);
const now = new Date();
function router() {
  const app = new Hono(); app.use('*', authMiddleware);
  app.route('/encounters', clearanceApp); app.route('/encounters', paymentsApp); app.route('/patient', patientApp);
  return app;
}
let app = router();
const call = (path: string, token: string, body?: object, key?: string) => runWithDb(connection.db, () => app.request(path, {
  method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}), ...(key ? { 'Idempotency-Key': key } : {}) }, body: body ? JSON.stringify(body) : undefined
}, { NODE_ENV: 'development' }));
try {
  await migrate(connection.db, { migrationsFolder: fileURLToPath(new URL('../src/db/migrations/', import.meta.url)) });
  const [hospital] = await connection.db.insert(facilities).values({ code: `PAY-${tag}`, name: 'Payment Validation Hospital', tin: 'VALIDATION', philhealthPan: 'VALIDATION', address: 'Local validation fixture', contactPhone: '00000000000', hitpClientId: 'validation', hitpSecretHash: 'unused' }).returning();
  const [patient] = await connection.db.insert(patients).values({ facilityId: hospital.id, mrn: `PAT-${tag}`, fullName: 'Payment Validation Patient', dateOfBirth: new Date('1990-01-01'), gender: 'F', contactNumber: '00000000000' }).returning();
  const [staff, guarantor] = await connection.db.insert(users).values([
    { facilityId: hospital.id, username: `staff-${tag}`, email: `staff-${tag}@example.test`, passwordHash: 'unused', salt: 'unused', fullName: 'Validation Billing', role: 'BILLING_SPECIALIST', title: 'Validation', avatarInitials: 'VB' },
    { facilityId: hospital.id, username: `patient-${tag}`, email: `patient-${tag}@example.test`, passwordHash: 'unused', salt: 'unused', fullName: 'Validation Guarantor', role: 'PATIENT_GUARANTOR', title: 'Validation', avatarInitials: 'VG', linkedMrn: patient.mrn }
  ]).returning();
  async function session(userId: string, expiresAt = new Date(Date.now() + 600000)) {
    const token = generateSessionToken();
    await connection.db.insert(userSessions).values({ userId, tokenHash: await hashSessionToken(token), expiresAt }); return token;
  }
  const staffToken = await session(staff.id); const patientToken = await session(guarantor.id);
  const records: Array<{ encounterId: string; paymentId: string; receiptId: string; reference: string }> = [];
  for (const rail of ['GCASH', 'MAYA', 'CREDIT_DEBIT_CARD', 'BANK_TRANSFER']) {
    const [enc] = await connection.db.insert(encounters).values({ facilityId: hospital.id, patientId: patient.id, encounterNumber: `ENC-${tag}-${rail}`, roomBed: 'VALIDATION', roomCategory: 'REGULAR_PRIVATE', dailyRoomRate: '100.00', admissionTimestamp: now, attendingPhysicianId: staff.id, doctorPan: 'VALIDATION', primaryIcd10: 'Z00.0', primaryDiagnosis: 'Synthetic validation fixture', stage: 'HMO_FINAL_LOA', billState: 'FINALIZED', billNumber: `BILL-${tag}-${rail}`, remainingBalance: '100.00' }).returning();
    await connection.db.insert(chargemasterItems).values({ encounterId: enc.id, code: 'VAL-CHARGE', description: 'Validation charge', category: 'ROOM_BOARD', quantity: '1.00', unitPrice: '100.00', grossAmount: '100.00', isVatable: false, patientOop: '100.00', status: 'COVERED', plainLanguageExplainer: 'Synthetic validation charge' });
    await connection.db.insert(statutoryWaterfalls).values({ encounterId: enc.id, grossHospitalCharges: '100.00', grossDoctorFee: '0.00', grossTotal: '100.00', netVatDiscountedBase: '100.00', netPatientDue: '100.00' });
    await connection.db.insert(hmoAuthorizations).values({ encounterId: enc.id, providerName: 'Validation HMO', cardNumberMasked: '****', policyMbl: '100.00', mblRemaining: '100.00', dailyRoomAllowance: '100.00', approvedAmount: '30.00', finalLoaStatus: 'AWAITING_CODE' });
    assert.equal((await call(`/encounters/${enc.id}/hmo/final-loa`, patientToken, {})).status, 403);
    const loa = await call(`/encounters/${enc.id}/hmo/final-loa`, staffToken, { approvedAmount: 30, approvalCode: `APV-${tag}` });
    assert.equal(loa.status, 200); const approved: any = await loa.json();
    assert.equal(approved.encounter.hmo.finalLoaStatus, 'APPROVED'); assert.equal(approved.encounter.stage, 'PENDING_SETTLEMENT');
    const [bill] = await connection.db.select().from(encounters).where(eq(encounters.id, enc.id));
    const input = { amount: Number(bill.remainingBalance), paymentRail: rail, payerName: guarantor.fullName, ...(rail === 'CREDIT_DEBIT_CARD' ? { cardBrand: 'VISA', cardLast4: '1111' } : {}), ...(rail === 'BANK_TRANSFER' ? { bankName: 'BPI' } : {}) };
    const key = `validation-${tag}-${rail}`;
    assert.equal((await call(`/encounters/${enc.id}/payments`, patientToken, { ...input, amount: input.amount + 1 }, `${key}-over`)).status, 400);
    const concurrent = await Promise.all([call(`/encounters/${enc.id}/payments`, patientToken, input, key), call(`/encounters/${enc.id}/payments`, patientToken, input, key)]);
    assert.deepEqual(concurrent.map(r => r.status), [200, 200]);
    const [first, retry]: any[] = await Promise.all(concurrent.map(r => r.json()));
    assert.equal(first.payment.id, retry.payment.id); assert.equal(first.payment.status, 'SUCCESS');
    const stored = await connection.db.select().from(payments).where(eq(payments.encounterId, enc.id));
    const receipts = await connection.db.select().from(paymentReceipts).where(eq(paymentReceipts.encounterId, enc.id));
    assert.equal(stored.length, 1); assert.equal(receipts.length, 1); assert.equal(receipts[0].paymentId, stored[0].id);
    const [paid] = await connection.db.select().from(encounters).where(eq(encounters.id, enc.id));
    assert.equal(paid.billState, 'PAID'); assert.equal(Number(paid.remainingBalance), 0);
    assert.equal((await call(`/encounters/${enc.id}/payments`, patientToken, input, `${key}-duplicate`)).status, 409);
    records.push({ encounterId: enc.id, paymentId: stored[0].id, receiptId: receipts[0].id, reference: stored[0].paymentReference });
    console.log(`[PASS] ${rail}: authorized LOA, concurrent idempotency, database receipt and Paid bill`);
  }
  // Recreate every connection and router to verify durable data, rather than a
  // frontend fixture or an in-memory backend cache.
  await connection.pool.end(); connection = createDbConnection(url); app = router();
  const history: any = await (await call('/patient/me/payments', patientToken)).json();
  for (const saved of records) {
    assert.ok(history.items.some((p: any) => p.id === saved.paymentId));
    const receipt: any = await (await call(`/patient/me/receipts/${saved.receiptId}`, patientToken)).json();
    assert.equal(receipt.paymentReference, saved.reference); assert.equal(receipt.patientMrn, patient.mrn);
    const [bill] = await connection.db.select().from(encounters).where(eq(encounters.id, saved.encounterId)); assert.equal(bill.billState, 'PAID');
  }
  const expired = await session(guarantor.id, new Date(0));
  assert.equal((await call('/patient/me/payments', expired)).status, 401);
  const [other] = await connection.db.insert(patients).values({ facilityId: hospital.id, mrn: `OTHER-${tag}`, fullName: 'Other Validation Patient', dateOfBirth: now, gender: 'M', contactNumber: '00000000001' }).returning();
  await connection.db.update(users).set({ linkedMrn: other.mrn }).where(and(eq(users.id, guarantor.id), eq(users.facilityId, hospital.id)));
  assert.equal((await call(`/patient/me/receipts/${records[0].receiptId}`, patientToken)).status, 404);
  assert.equal((await call(`/encounters/${records[0].encounterId}/payments`, patientToken, { amount: 1, paymentRail: 'GCASH', payerName: guarantor.fullName }, `other-${tag}`)).status, 404);
  console.log('[PASS] fresh connection/router persistence, receipt ownership and expired sessions');
  console.log('POSTGRES_PAYMENT_CHECKS_DONE: validation fixtures retained only in the dedicated validation database');
} finally { await connection.pool.end(); }
