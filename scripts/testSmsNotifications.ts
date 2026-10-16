// Authenticated real PostgreSQL tests, exclusively in the disposable local SMS fixture.
import { seedPassword } from './seedPassword';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createDbConnection } from '../apps/server/src/db';
import app from '../apps/server/src/index';
import { getSmsOutbox } from '../apps/server/src/services/smsService';
const url = process.env.DATABASE_URL;
assert.ok(url, 'Run through npm run test:api or set the dedicated local SMS validation database.');
const target = new URL(url);
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(target.hostname));
assert.match(target.pathname, /^\/medcore_sms_validation(?:_[a-z0-9]+)?$/);
assert.ok(!target.search && !target.hash);
const connection = createDbConnection(url);
const env = { NODE_ENV: 'test', DATABASE_URL: url, SEMAPHORE_API_KEY: 'present-synthetic-key-must-never-send', GATE_PASS_SECRET: 'sms-sandbox-validation-only' };
const originalFetch = globalThis.fetch;
let networkCalls = 0, checks = 0;
globalThis.fetch = async () => { networkCalls++; throw new Error('SMS verification must not access any gateway or external API.'); };
const sessions: string[] = [];
const pass = (label: string) => { checks++; console.log(`[PASS] ${label}`); };
const request = async (path: string, token?: string, body?: object, key = randomUUID(), method?: string) => {
  const response = await app.request(`/api/v1${path}`, { method: method || (body ? 'POST' : 'GET'), headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json', 'Idempotency-Key': key } : {}) }, body: body ? JSON.stringify(body) : undefined }, env);
  return { status: response.status, data: await response.json() as any };
};
const login = async (email: string, facilityCode = 'SJMC-MNL') => {
  const result = await request('/auth/login', undefined, { email, password: seedPassword(), facilityCode });
  assert.equal(result.status, 200); assert.ok(result.data.token); sessions.push(result.data.token); return result.data;
};
try {
  const staff = await login('elena.santos@stjude.ph');
  const fixture = (await connection.pool.query(`SELECT e.id,e.patient_id,e.attending_physician_id,d.email,d.contact_number,p.contact_number AS patient_phone
    FROM encounters e JOIN users d ON d.id=e.attending_physician_id JOIN patients p ON p.id=e.patient_id
    WHERE e.facility_id=$1 AND e.stage='DOCTOR_PF_PENDING' AND d.is_active AND d.contact_number IS NOT NULL LIMIT 1`, [staff.user.facilityId])).rows[0];
  assert.ok(fixture, 'The synthetic fixture needs one pending physician fee.');
  await connection.pool.query("UPDATE patients SET full_name='Sample SMS Patient',contact_number='0917-555-5001' WHERE id=$1", [fixture.patient_id]);
  await connection.pool.query("UPDATE users SET full_name='Dr. Sample SMS Physician',contact_number='0918-555-5002' WHERE id=$1", [fixture.attending_physician_id]);
  const nudgePath = `/encounters/${fixture.id}/nudge-doctor`;
  const patientPath = `/encounters/${fixture.id}/notify-patient-sms`;
  const nudge = await request(nudgePath, staff.token, {});
  assert.equal(nudge.status, 200); assert.equal(nudge.data.simulated, true); assert.match(nudge.data.messageId, /^SMS-SIM-[A-Z0-9]{6}$/); assert.equal(nudge.data.dispatch.recipientPhone, '+639185555002'); assert.equal(nudge.data.dispatch.provider, 'SIMULATOR');
  pass('Authenticated physician nudge returns HTTP200, normalized actual recipient and a simulation ID');
  const event = (await connection.pool.query('SELECT description,status FROM encounter_timeline_events WHERE id=(SELECT id FROM sms_dispatches WHERE result->>\'messageId\'=$1)', [nudge.data.messageId])).rows[0];
  assert.equal(event.status, 'COMPLETED'); assert.ok(event.description.includes(nudge.data.messageId)); assert.ok(!event.description.includes('+639185555002')); assert.ok(!event.description.includes('0918'));
  const audit = (await connection.pool.query("SELECT count(*)::int AS count FROM system_audit_logs WHERE action='SMS_NOTIFICATION_DISPATCHED' AND new_state->>'messageId'=$1", [nudge.data.messageId])).rows[0];
  assert.equal(audit.count, 1); pass('Timeline and audit persist dispatch together; patient-visible timeline excludes physician phone/body');
  for (const templateType of ['BILL_READY', 'INTAKE_ORIENTATION']) {
    const result = await request(patientPath, staff.token, { templateType, language: 'tl' });
    assert.equal(result.status, 200); assert.equal(result.data.dispatch.recipientPhone, '+639175555001'); assert.equal(result.data.dispatch.templateType, templateType);
    assert.doesNotMatch(result.data.dispatch.messageBody, /https?:\/\/|www\.|ICD|RVS|0917|5555001/);
  }
  pass('Patient billing and intake templates work in Tagalog without links, codes or phone numbers in text');
  const outbox = await request('/notifications/sms-outbox', staff.token);
  assert.equal(outbox.status, 200); assert.ok(outbox.data.items.some((item: any) => item.messageId === nudge.data.messageId)); assert.ok(outbox.data.items.length <= 100);
  pass('Staff outbox reads persisted simulation history');
  const doctor = await login(fixture.email);
  const doctorOutbox = await request('/notifications/sms-outbox', doctor.token);
  assert.equal(doctorOutbox.status, 200); assert.ok(doctorOutbox.data.items.some((item: any) => item.messageId === nudge.data.messageId)); assert.ok(doctorOutbox.data.items.every((item: any) => item.templateType === 'DOCTOR_PF_NUDGE'));
  pass('Physicians see their own reminders and cannot read patient billing SMS from the facility outbox');
  const duplicateKey = randomUUID();
  const concurrent = await Promise.all([request(nudgePath, staff.token, {}, duplicateKey), request(nudgePath, staff.token, {}, duplicateKey)]);
  assert.ok(concurrent.every(item => item.status === 200)); assert.equal(concurrent[0].data.messageId, concurrent[1].data.messageId); assert.ok(concurrent.some(item => item.data.cached));
  assert.equal((await connection.pool.query('SELECT count(*)::int AS count FROM sms_dispatches WHERE request_key=$1', [duplicateKey])).rows[0].count, 1);
  pass('Concurrent retries with one request reference create one dispatch/timeline/audit');
  const anotherId = (await connection.pool.query('SELECT id FROM encounters WHERE facility_id=$1 AND id<>$2 LIMIT 1', [staff.user.facilityId, fixture.id])).rows[0].id;
  assert.equal((await request(`/encounters/${anotherId}/nudge-doctor`, staff.token, {}, duplicateKey)).status, 409);
  pass('A reused request reference cannot disclose or dispatch for another encounter');
  const patient = await login('ramon.delacruz@gmail.com');
  assert.equal((await request(nudgePath, patient.token, {})).status, 403); assert.equal((await request(patientPath, patient.token, {})).status, 403); assert.equal((await request('/notifications/sms-outbox', patient.token)).status, 403);
  assert.equal((await request(nudgePath, undefined, {})).status, 401); assert.equal((await request('/notifications/sms-outbox')).status, 401); assert.equal((await request(nudgePath, doctor.token, {})).status, 403);
  pass('Anonymous, patient and physician dispatch restrictions are enforced');
  const hmoEmail = (await connection.pool.query("SELECT email FROM users WHERE facility_id=$1 AND role='HMO_COORDINATOR' LIMIT 1", [staff.user.facilityId])).rows[0].email;
  const hmo = await login(hmoEmail); assert.equal((await request(patientPath, hmo.token, {})).status, 403); assert.equal((await request('/notifications/sms-outbox', hmo.token)).status, 403);
  pass('Unapproved staff roles cannot dispatch or browse SMS');
  const foreignFacility = randomUUID(), foreignUser = randomUUID();
  await connection.pool.query(`INSERT INTO facilities SELECT $1,'SMS-OTHER','Other Fixture Hospital',tin,philhealth_pan,address,contact_phone,total_beds,hitp_client_id,hitp_secret_hash,sync_interval_ms,sla_warning_threshold,sla_breach_threshold,doctor_pf_timeout_minutes,now(),now() FROM facilities WHERE id=$2`, [foreignFacility, staff.user.facilityId]);
  await connection.pool.query(`INSERT INTO users(id,facility_id,username,email,password_hash,salt,full_name,role,title,avatar_initials,is_active)
    SELECT $1,$2,'sms.other.billing','sms.other.billing@example.test',password_hash,salt,'Other Fixture Staff','BILLING_SPECIALIST','Test staff','OT',true FROM users WHERE id=$3`, [foreignUser, foreignFacility, staff.user.id]);
  const foreign = await login('sms.other.billing@example.test', 'SMS-OTHER');
  assert.equal((await request(nudgePath, foreign.token, {})).status, 404); assert.deepEqual((await request('/notifications/sms-outbox', foreign.token)).data.items, []);
  pass('Encounter and outbox reads enforce facility isolation');
  assert.equal((await request('/encounters/LAP_CHOLE/notify-patient-sms', staff.token, {})).status, 404); assert.equal((await request(patientPath, staff.token, { message: 'Injected clinical text', recipientPhone: '09171234567' })).status, 400);
  const malformed = await app.request(`/api/v1${nudgePath}`, { method: 'POST', headers: { Authorization: `Bearer ${staff.token}`, 'Content-Type': 'application/json' }, body: '{invalid' }, env); assert.equal(malformed.status, 400);
  pass('Procedure IDs, custom message/recipient fields and malformed JSON never dispatch');
  for (const [name, code] of [['www.invalid.test', 'SMS_LINK_INVARIANT'], ['K35.8', 'SMS_PRIVACY_INVARIANT']]) {
    await connection.pool.query('UPDATE patients SET full_name=$1 WHERE id=$2', [name, fixture.patient_id]);
    const result = await request(patientPath, staff.token, {}); assert.equal(result.status, 400); assert.equal(result.data.error.code, code);
  }
  await connection.pool.query("UPDATE patients SET full_name='Sample SMS Patient',contact_number='0917-000-0000' WHERE id=$1", [fixture.patient_id]);
  const placeholder = await request(patientPath, staff.token, {}); assert.equal(placeholder.status, 400); assert.equal(placeholder.data.error.code, 'SMS_RECIPIENT_MISSING');
  await connection.pool.query("UPDATE patients SET contact_number='0917-555-5001' WHERE id=$1", [fixture.patient_id]);
  pass('Link/code invariants and legacy fabricated contacts are blocked before recording any dispatch');
  await connection.pool.query('UPDATE users SET contact_number=NULL WHERE id=$1', [fixture.attending_physician_id]);
  await connection.pool.query("UPDATE facilities SET contact_phone='02-8123-4567' WHERE id=$1", [staff.user.facilityId]);
  const missing = await request(nudgePath, staff.token, {}); assert.equal(missing.status, 400); assert.equal(missing.data.error.code, 'SMS_RECIPIENT_MISSING');
  await connection.pool.query("UPDATE users SET contact_number='0918-555-5002' WHERE id=$1", [fixture.attending_physician_id]);
  await connection.pool.query("UPDATE encounters SET stage='PHARMACY_RTS_AUDIT' WHERE id=$1", [fixture.id]);
  assert.equal((await request(nudgePath, staff.token, {})).status, 409); await connection.pool.query("UPDATE encounters SET stage='DOCTOR_PF_PENDING' WHERE id=$1", [fixture.id]);
  pass('Missing physician/department mobile and incorrect discharge stage fail clearly');
  const memoryBefore = getSmsOutbox().length, failedKey = randomUUID();
  await connection.pool.query(`CREATE FUNCTION sms_validation_reject_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action='SMS_NOTIFICATION_DISPATCHED' THEN RAISE EXCEPTION 'synthetic SMS audit failure'; END IF; RETURN NEW; END $$`);
  await connection.pool.query('CREATE TRIGGER sms_validation_reject_audit BEFORE INSERT ON system_audit_logs FOR EACH ROW EXECUTE FUNCTION sms_validation_reject_audit()');
  try {
    assert.equal((await request(nudgePath, staff.token, {}, failedKey)).status, 503);
    assert.equal((await connection.pool.query('SELECT count(*)::int AS count FROM sms_dispatches WHERE request_key=$1', [failedKey])).rows[0].count, 0);
    assert.equal(getSmsOutbox().length, memoryBefore);
  } finally { await connection.pool.query('DROP TRIGGER sms_validation_reject_audit ON system_audit_logs'); await connection.pool.query('DROP FUNCTION sms_validation_reject_audit()'); }
  pass('Audit failure rolls back dispatch/timeline and never publishes a successful memory preview');
  await connection.pool.query("UPDATE encounters SET stage='PENDING_SETTLEMENT',remaining_balance=0 WHERE id=$1", [fixture.id]);
  const finalized = await request(`/encounters/${fixture.id}/finalize-bill`, staff.token, {}); assert.equal(finalized.status, 200); assert.equal(finalized.data.smsNotification.dispatch.templateType, 'BILL_READY');
  const sent = await request(`/encounters/${fixture.id}/send-bill`, staff.token, {}); assert.equal(sent.status, 200); assert.equal(sent.data.smsNotification.dispatch.templateType, 'BILL_READY'); assert.equal(sent.data.smsNotification.dispatch.messageId, finalized.data.smsNotification.dispatch.messageId);
  const sentAgain = await request(`/encounters/${fixture.id}/send-bill`, staff.token, {}); assert.equal(sentAgain.status, 200); assert.equal(sentAgain.data.smsNotification.dispatch.messageId, sent.data.smsNotification.dispatch.messageId);
  pass('Dashboard bill delivery automatically records one billing-ready sandbox SMS across retries');
  const release = await request(`/encounters/${fixture.id}/gate-pass`, staff.token, {}); assert.equal(release.status, 200); assert.equal(release.data.smsNotification.dispatch.templateType, 'PAYMENT_CONFIRMED');
  const retry = await request(`/encounters/${fixture.id}/gate-pass`, staff.token, {}); assert.equal(retry.status, 200); assert.equal(retry.data.smsNotification.dispatch.messageId, release.data.smsNotification.dispatch.messageId);
  assert.equal((await connection.pool.query("SELECT count(*)::int AS count FROM sms_dispatches WHERE encounter_id=$1 AND template_type='PAYMENT_CONFIRMED'", [fixture.id])).rows[0].count, 1);
  pass('Committed active gate passes trigger exactly one settlement SMS, including release retries');
  const availableBed = async () => {
    const bed = (await connection.pool.query("SELECT bed_number,room_category,daily_rate FROM beds WHERE facility_id=$1 AND status='AVAILABLE' AND current_encounter_id IS NULL LIMIT 1", [staff.user.facilityId])).rows[0];
    assert.ok(bed, 'The local fixture needs an available admission bed.'); return bed;
  };
  const admission = (bed: any, extra: object = {}) => ({ fullName:'Sample SMS Patient', mrn:'SMS-NEW-'+randomUUID().slice(0,8), age:40,gender:'M',roomBed:bed.bed_number,roomCategory:bed.room_category,dailyRoomRate:Number(bed.daily_rate),attendingPhysicianId:fixture.attending_physician_id,primaryDiagnosis:'Routine admission',...extra });
  const mrn = (await connection.pool.query('SELECT mrn FROM patients WHERE id=$1', [fixture.patient_id])).rows[0].mrn;
  await connection.pool.query("UPDATE patients SET contact_number='' WHERE id=$1", [fixture.patient_id]);
  const repaired = await request('/encounters',staff.token,admission(await availableBed(),{mrn,contactNumber:'0927-555-5003'}));
  assert.equal(repaired.status,200);assert.equal(repaired.data.encounter.patient.contactNumber,'+639275555003');assert.equal(repaired.data.smsNotification.dispatch.templateType,'INTAKE_ORIENTATION');assert.equal(repaired.data.smsNotification.dispatch.recipientPhone,'+639275555003');
  assert.ok(repaired.data.encounter.timeline.some((event: any)=>(event.eventType || event.type)==='SMS_DISPATCH'));
  pass('Existing MRNs with missing contacts can be repaired and receive an immediately visible intake simulation');
  const unchangedBed=await availableBed();const mismatch=await request('/encounters',staff.token,admission(unchangedBed,{mrn,contactNumber:'0947-555-5004'}));assert.equal(mismatch.status,400);assert.equal(mismatch.data.error.code,'PATIENT_CONTACT_MISMATCH');
  assert.equal((await connection.pool.query('SELECT contact_number FROM patients WHERE id=$1',[fixture.patient_id])).rows[0].contact_number,'+639275555003');
  assert.equal((await connection.pool.query('SELECT status FROM beds WHERE facility_id=$1 AND bed_number=$2',[staff.user.facilityId,unchangedBed.bed_number])).rows[0].status,'AVAILABLE');
  pass('A different existing registered contact is not silently overwritten and the admission bed is preserved');
  await connection.pool.query("UPDATE patients SET contact_number='' WHERE id=$1",[fixture.patient_id]);
  const raceBeds=(await connection.pool.query("SELECT bed_number,room_category,daily_rate FROM beds WHERE facility_id=$1 AND status='AVAILABLE' AND current_encounter_id IS NULL LIMIT 2",[staff.user.facilityId])).rows;assert.equal(raceBeds.length,2);
  const race=await Promise.all([request('/encounters',staff.token,admission(raceBeds[0],{mrn,contactNumber:'0919-555-5006'})),request('/encounters',staff.token,admission(raceBeds[1],{mrn,contactNumber:'0924-555-5007'}))]);assert.deepEqual(race.map(item=>item.status).sort(),[200,400]);
  const winner=race.find(item=>item.status===200)!;assert.equal(race.find(item=>item.status===400)!.data.error.code,'PATIENT_CONTACT_MISMATCH');assert.equal((await connection.pool.query('SELECT contact_number FROM patients WHERE id=$1',[fixture.patient_id])).rows[0].contact_number,winner.data.encounter.patient.contactNumber);
  pass('Concurrent repairs on separate beds cannot overwrite the first registered mobile number');
  const noContact=await request('/encounters',staff.token,admission(await availableBed(),{fullName:'Sample No Contact Patient'}));assert.equal(noContact.status,200);assert.equal(noContact.data.encounter.patient.contactNumber,'');assert.equal(noContact.data.smsNotification.errorCode,'SMS_INVALID_PHONE');
  pass('Contact-free admissions remain valid and never acquire a fabricated recipient or successful SMS');
  await connection.pool.query("UPDATE encounters SET stage='PENDING_SETTLEMENT',remaining_balance=0 WHERE id=$1",[noContact.data.encounter.uuid]);
  const noContactPass=await request(`/encounters/${noContact.data.encounter.uuid}/gate-pass`,staff.token,{});assert.equal(noContactPass.status,200);assert.equal(noContactPass.data.encounter.stage,'CLEARED_GATE_PASS');assert.equal(noContactPass.data.smsNotification.errorCode,'SMS_INVALID_PHONE');
  pass('Missing SMS contact cannot undo a committed zero-balance gate pass');
  const payable=await request('/encounters',staff.token,admission(await availableBed(),{fullName:'Sample Partial Payment Patient',contactNumber:'0935-555-5005',dailyRoomRate:100000}));assert.equal(payable.status,200);
  const charge=await request(`/encounters/${payable.data.encounter.uuid}/charges`,staff.token,{description:'Synthetic inpatient service',category:'CENTRAL_SUPPLIES',grossAmount:1000,qty:1,unitPrice:1000,coverageType:'PATIENT_DIRECT'});assert.equal(charge.status,200);assert.ok(charge.data.encounter.remainingBalance>1);
  await connection.pool.query("UPDATE encounters SET stage='PENDING_SETTLEMENT' WHERE id=$1",[payable.data.encounter.uuid]);
  const partial=await request(`/encounters/${payable.data.encounter.uuid}/payments`,staff.token,{amount:1,paymentRail:'GCASH',payerName:'Sample Partial Payment Patient'});assert.equal(partial.status,200);assert.ok(!partial.data.dischargePass);assert.equal(partial.data.smsNotification,undefined);
  assert.equal((await connection.pool.query("SELECT count(*)::int AS count FROM sms_dispatches WHERE encounter_id=$1 AND template_type='PAYMENT_CONFIRMED'",[payable.data.encounter.uuid])).rows[0].count,0);
  pass('Partial payments without an active gate pass do not generate a settlement SMS');
  assert.equal(networkCalls, 0); pass('All authenticated API, persistence and retry tests used zero external network calls');
  console.log(`SMS_API_CHECKS_DONE: ${checks} groups; real PostgreSQL, sandbox only, no paid keys or gateway/model credits.`);
} finally {
  for (const token of sessions) await request('/auth/logout', token, {}).catch(() => {});
  globalThis.fetch = originalFetch; await connection.pool.end();
}
process.exit(0);
