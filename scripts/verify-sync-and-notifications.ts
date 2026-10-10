import {generateGatePassHmac,resolveGatePassSecret} from '../apps/server/src/services/gatePassService';
// Real PostgreSQL + authenticated Hono clients. Only a disposable local validation DB.
// node --import ./node_modules/tsx/dist/loader.mjs scripts/verify-sync-and-notifications.ts
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { createDbConnection } from '../apps/server/src/db';

const url=process.env.MEDCORE_SYNC_DATABASE_URL || 'postgresql://mclein@127.0.0.1:5432/medcore_payment_validation_sync';
const target=new URL(url);
assert.ok(['postgres:','postgresql:'].includes(target.protocol));
assert.ok(['localhost','127.0.0.1','[::1]'].includes(target.hostname),'Only local validation databases are allowed.');
assert.match(target.pathname,/^\/medcore_payment_validation_sync(?:_[a-z0-9]+)?$/,'Refusing to seed a hospital or unrelated database.');
assert.ok(!target.search&&!target.hash,'Connection override query options are not allowed.');
process.env.NODE_ENV='development';process.env.DATABASE_URL=url;
const adminUrl=new URL(url);adminUrl.pathname='/postgres';
const admin=createDbConnection(adminUrl.toString());
try {
  if(!(await admin.pool.query('select 1 from pg_database where datname=$1',[target.pathname.slice(1)])).rowCount) await admin.pool.query(`CREATE DATABASE "${target.pathname.slice(1)}"`);
} finally {await admin.pool.end();}
const connection=createDbConnection(url);
try {
  await migrate(connection.db,{migrationsFolder:fileURLToPath(new URL('../apps/server/src/db/migrations/',import.meta.url))});
  const seed=spawnSync(process.execPath,['--import','./node_modules/tsx/dist/loader.mjs','scripts/seedPostgres.ts'],{cwd:fileURLToPath(new URL('../',import.meta.url)),env:{...process.env,DATABASE_URL:url},encoding:'utf8'});
  assert.equal(seed.status,0,'Validation seeder failed; no hospital database was targeted.');
  const {default:app}=await import('../apps/server/src/index');
  const request=async(path:string,token?:string,body?:object,key?:string,method?:string)=>{
    const response=await app.request('/api/v1'+path,{method:method||(body?'POST':'GET'),headers:{...(token?{Authorization:`Bearer ${token}`} : {}),...(body?{'Content-Type':'application/json'}:{}),...(key?{'Idempotency-Key':key}:{})},body:body?JSON.stringify(body):undefined},{NODE_ENV:'development',DATABASE_URL:url});
    const data=await response.json();return {status:response.status,data};
  };
  const login=async(email:string,password='HospitalRCM2026!')=>{
    const result=await request('/auth/login',undefined,{email,password,facilityCode:'SJMC-MNL'});
    assert.equal(result.status,200);assert.ok(result.data.token);return result.data.token as string;
  };
  const billing=await login('elena.santos@stjude.ph'),physician=await login('carlos.mendoza@stjude.ph'),security=await login('bert.aquino@stjude.ph'),cfo=await login('arthur.delgado@stjude.ph');
  const patient=await login('juan.delacruz@gmail.com','PatientPass2026!');
  const facility='00000000-0000-0000-0000-000000000001';
  assert.equal(Number((await connection.pool.query('select count(*) from encounters where facility_id=$1',[facility])).rows[0].count),250);
  assert.equal(Number((await connection.pool.query('select count(*) from beds where facility_id=$1',[facility])).rows[0].count),200);
  const seededPasses=(await connection.pool.query('select * from discharge_passes')).rows;
  for(const pass of seededPasses)assert.equal(pass.hmac_signature,await generateGatePassHmac(pass.encounter_id,Number(pass.settled_amount),pass.issued_at.toISOString(),resolveGatePassSecret(undefined,false)));
  console.log('Seeded gate-pass HMAC signatures verified: '+seededPasses.length);
  const initial=await request('/encounters/enc-8812',billing);assert.equal(initial.status,200);assert.equal(initial.data.stage,'DOCTOR_PF_PENDING');
  assert.equal((await request('/encounters/enc-8812/finalize-bill',billing,{})).status,409);
  const charge=await request('/encounters/enc-8812/charges',billing,{description:'Disposable synchronization probe',category:'CENTRAL_SUPPLIES',grossAmount:100,code:'SYNC-PROBE-CHARGE'});assert.equal(charge.status,200);
  const chargeId=charge.data.item.id;assert.ok(chargeId);
  assert.equal((await request('/charges/'+chargeId,billing,{quantity:2,unitPrice:100},undefined,'PATCH')).status,200);
  assert.equal(Number((await connection.pool.query('select gross_amount from chargemaster_items where id=$1',[chargeId])).rows[0].gross_amount),200);
  const dispute=await request('/encounters/enc-8812/disputes',patient,{chargeId,reason:'Disposable fixture waiver verification',disputeCategory:'UNCONSUMED_SUPPLY'});assert.equal(dispute.status,200);
  assert.equal((await request('/charges/'+chargeId,cfo,undefined,undefined,'DELETE')).status,400);
  assert.equal((await request('/disputes/'+dispute.data.dispute.id+'/supervisory-waive',cfo,{supervisorNotes:'Disposable fixture waiver verification'})).status,200);
  const waived=(await connection.pool.query('select * from chargemaster_items where id=$1',[chargeId])).rows[0];assert.equal(waived.status,'SUPERVISORY_WAIVED');assert.equal(Number(waived.patient_oop),0);assert.equal(waived.is_disputed,false);
  const resolved=(await connection.pool.query('select * from billing_disputes where id=$1',[dispute.data.dispute.id])).rows[0];assert.equal(resolved.status,'SUPERVISOR_WAIVED');assert.ok(resolved.resolved_by_user_id);
  const afterWaiver=await request('/patient/me/overview',patient);const waivedItem=afterWaiver.data.currentEncounter.items.find((item:any)=>item.id===chargeId);assert.equal(waivedItem.status,'SUPERVISORY_WAIVED');assert.equal(waivedItem.patientOop,0);
  const persistedWaiver=(await connection.pool.query('select remaining_balance from encounters where id=$1',[initial.data.uuid])).rows[0];assert.equal(Math.round(afterWaiver.data.balance.remainingBalance*100),Math.round(Number(persistedWaiver.remaining_balance)*100));
  assert.equal((await request('/charges/'+chargeId,billing,{quantity:3,unitPrice:100},undefined,'PATCH')).status,200);
  const editedWaiver=(await connection.pool.query('select * from chargemaster_items where id=$1',[chargeId])).rows[0];assert.equal(Number(editedWaiver.gross_amount),300);assert.equal(Number(editedWaiver.patient_oop),0);assert.equal(editedWaiver.status,'SUPERVISORY_WAIVED');
  console.log('Charge edit/disputed deletion/waiver rows and patient waterfall parity verified');

  assert.equal((await request('/encounters/enc-8812/doctor/sign',physician,{agreedFee:15000})).status,200);
  assert.equal((await request('/encounters/enc-8812/pharmacy/clear-rts',billing,{})).status,200);
  assert.equal((await request('/encounters/enc-8812/hmo/final-loa',billing,{approvedAmount:50514.29,approvalCode:'APV-SYNC-VERIFIED',disallowedConsumables:0})).status,200);
  const row=(await connection.pool.query('select * from encounters where id=$1',[initial.data.uuid])).rows[0];
  assert.equal(row.stage,'PENDING_SETTLEMENT');
  const overview=await request('/patient/me/overview',patient);assert.equal(overview.status,200);assert.equal(overview.data.currentEncounter.stage,'PENDING_SETTLEMENT');
  assert.equal(Math.round(overview.data.balance.remainingBalance*100),Math.round(Number(row.remaining_balance)*100));
  assert.equal(overview.data.dischargeChecklist.find((item:any)=>item.key==='insurance').done,true);
  assert.equal((await request('/encounters/enc-8812/finalize-bill',billing,{})).status,200);
  assert.equal((await request('/encounters/enc-8812/send-bill',billing,{})).status,200);
  assert.equal((await request('/patient/me/overview',patient)).data.currentEncounter.billState,'SENT_TO_PATIENT');
  for(const rail of ['QR_PH','GCASH','MAYA','CREDIT_DEBIT_CARD']){
    const body={amount:100,paymentRail:rail,payerName:'Disposable Patient',...(rail==='CREDIT_DEBIT_CARD'?{cardBrand:'VISA',cardLast4:'1111'}:{})};const key='SYNC-RAIL-'+rail;
    const result=await request('/encounters/enc-8812/payments',patient,body,key);assert.equal(result.status,200);assert.ok(result.data.receipt.officialReceiptNumber.startsWith('OR-SJMC-'));
    const replay=await request('/encounters/enc-8812/payments',patient,body,key);assert.equal(replay.status,200);assert.equal(replay.data.cached,true);assert.equal(replay.data.payment.id,result.data.payment.id);
    const paymentRow=(await connection.pool.query('select * from payments where idempotency_key=$1',[key])).rows;assert.equal(paymentRow.length,1);assert.equal(paymentRow[0].status,'SUCCESS');assert.equal(Number(paymentRow[0].amount),100);
    assert.equal((await connection.pool.query('select count(*)::int as count from payment_receipts where payment_id=$1',[paymentRow[0].id])).rows[0].count,1);
    const balanceRow=(await connection.pool.query('select * from encounters where id=$1',[initial.data.uuid])).rows[0];const patientView=await request('/patient/me/overview',patient);assert.equal(Math.round(patientView.data.balance.remainingBalance*100),Math.round(Number(balanceRow.remaining_balance)*100));
  }
  console.log('All four simulated rails: payment/receipt persistence, replay uniqueness and patient centavo parity verified');
  const amount=(await request('/patient/me/overview',patient)).data.balance.remainingBalance;

  const paid=await request('/encounters/enc-8812/payments',patient,{amount,paymentRail:'MAYA',payerName:'Juan S. Dela Cruz'},'SYNC-VALIDATION-PAYMENT');
  assert.equal(paid.status,200);assert.ok(paid.data.receipt.officialReceiptNumber.startsWith('OR-SJMC-'));
  const settled=(await connection.pool.query('select e.*,b.status as bed_status from encounters e join beds b on e.bed_id=b.id where e.id=$1',[initial.data.uuid])).rows[0];
  assert.equal(settled.stage,'CLEARED_GATE_PASS');assert.equal(Number(settled.remaining_balance),0);assert.equal(settled.bed_status,'HOUSEKEEPING');
  const feed=await request('/notifications',billing);assert.equal(feed.status,200);
  const payment=feed.data.notifications.find((item:any)=>item.type==='PAYMENT'&&item.encounterId==='enc-8812');assert.ok(payment);assert.ok(payment.message.includes(amount.toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2})));
  assert.ok(feed.data.notifications.some((item:any)=>item.type==='GATE_PASS'&&item.encounterId==='enc-8812'));
  assert.equal((await request('/notifications',patient)).status,403);
  assert.equal((await request('/notifications/mark-read',billing,{notificationIds:['payment:foreign-or-unknown']})).status,400);
  assert.equal((await request('/notifications/mark-read',billing,{notificationIds:[payment.id]})).status,200);
  assert.equal((await request('/notifications',billing)).data.notifications.find((item:any)=>item.id===payment.id).read,true);
  assert.equal((await request('/notifications',security)).data.notifications.find((item:any)=>item.id===payment.id).read,false);
  const list=await request('/encounters',billing);const updated=list.data.items.find((enc:any)=>enc.id==='enc-8812');assert.equal(updated.remainingBalance,0);assert.equal(updated.stage,'CLEARED_GATE_PASS');
  const pass=(await connection.pool.query('select * from discharge_passes where encounter_id=$1',[initial.data.uuid])).rows[0];
  const verified=await request('/discharge/passes/verify',security,{passNumber:pass.pass_number,exitPin:pass.exit_pin});assert.equal(verified.status,200);
  assert.ok((await request('/notifications',billing)).data.notifications.some((item:any)=>item.id===`gate-verified:${pass.id}`));
  assert.equal((await request('/patient/me/overview',patient)).data.currentEncounter.dischargePass.status,'VERIFIED_AT_LOBBY');
  const metrics=await request('/analytics/rcm-metrics',cfo);assert.equal(metrics.status,200);assert.ok(Number.isFinite(metrics.data.summary.darDays)&&metrics.data.summary.darDays>=1);
  console.log('SYNC_NOTIFICATIONS_POSTGRES_DONE: seed250/beds200; authenticated stages, finalization/delivery, patient payment, staff feed/read isolation, gate issuance/lobby verification passed.');
} finally {await connection.pool.end();}
