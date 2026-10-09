// Exercises actual Hono handlers using the existing isolated suite's synthetic DB.
// No PostgreSQL access, network transport, seed reset or real patients.
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
const directory = path.dirname(fileURLToPath(import.meta.url));
const project = path.resolve(directory, '../../..');
const existing = await readFile(path.join(project,'apps/server/__tests__/patientWorkflows.ts'),'utf8');
const start = existing.indexOf('let passed = 0;');
if (start < 0) throw new Error('Existing isolated fixture boundary changed; review this probe before running.');
const fixture = existing.slice(0,start).replace(/from (['"])(\.\.\/src\/[^'"]+)\1/g, (_all,_quote,file) => `from ${JSON.stringify(path.resolve(project,'apps/server/__tests__',file))}`);
const temporary = await mkdtemp(path.join(directory,'.handler-'));
const probes = `
const evidence: any[] = [];
function begin(role: string, stage: string = 'PENDING_SETTLEMENT') {
  reset(); user.role = role;
  rows.encounters[0].stage = stage;
  rows.encounters[0].admissionTimestamp = new Date('2026-10-09T00:00:00Z');
}
function snapshot() { return { balance: rows.encounters[0].remainingBalance, stage:rows.encounters[0].stage, writes, payments:rows.payments?.length || 0, receipts:rows.payment_receipts?.length || 0, auditLogs:rows.system_audit_logs?.length || 0 }; }
begin('BILLING_SPECIALIST','DOCTOR_PF_PENDING');
let response = await request('/encounters/'+ownId+'/doctor/sign',{agreedFee:15000});
evidence.push({step:'2.2',expected:403,actual:response.status,...snapshot()});
assert.equal(response.status,403); assert.equal(writes,0); assert.equal(rows.encounters[0].stage,'DOCTOR_PF_PENDING');
begin('PATIENT_GUARANTOR','MGH_DECLARED');
response = await request('/encounters/'+ownId+'/payments',payment(10),'audit-early-patient');
evidence.push({step:'7.1',role:user.role,expected:409,actual:response.status,...snapshot()});
assert.equal(response.status,409); assert.equal(writes,0);
begin('BILLING_SPECIALIST','MGH_DECLARED');
response = await request('/encounters/'+ownId+'/payments',payment(10),'audit-early-staff');
evidence.push({step:'7.1',role:user.role,expected:'no early-stage ledger writes',actual:response.status,...snapshot()});
assert.equal(response.status,409); assert.equal((await response.json()).error.code,'STAGE_NOT_READY'); assert.equal(rows.encounters[0].remainingBalance,'100.00'); assert.equal(writes,0);
begin('BILLING_SPECIALIST');
response = await request('/encounters/'+ownId+'/payments',payment(10),'A'.repeat(129));
evidence.push({step:'8.1',expected:400,actual:response.status,body:await response.json(),...snapshot()});
assert.equal(response.status,400); assert.equal(writes,0);
response = await request('/encounters/'+ownId+'/payments',payment(25),'audit-replay');
const first: any = await response.json();
evidence.push({step:'8.2',expected:200,actual:response.status,...snapshot()});
assert.equal(response.status,200); assert.equal(rows.encounters[0].remainingBalance,'75.00');
response = await request('/encounters/'+ownId+'/payments',payment(25),'audit-replay');
const replay: any = await response.json();
evidence.push({step:'8.3',expected:200,actual:response.status,cached:replay.cached,samePayment:first.payment.id===replay.payment.id,...snapshot()});
assert.equal(response.status,200); assert.equal(replay.cached,true); assert.equal(first.payment.id,replay.payment.id);
assert.equal(rows.payments.length,1); assert.equal(rows.payment_receipts.length,1); assert.equal(rows.encounters[0].remainingBalance,'75.00');
(globalThis as any).__masterHandlerEvidence = evidence;
`;
try {
  const file = path.join(temporary,'probes.ts');
  await writeFile(file,fixture+probes);
  await import(pathToFileURL(file).href);
  const report = { scope:'Actual Hono handlers, injected synthetic users and existing in-memory test DB. Not real authentication, PostgreSQL rollback, network transport or native sync.', results:globalThis.__masterHandlerEvidence };
  await writeFile(path.join(directory,'evidence/handler-results.json'),JSON.stringify(report,null,2)+'\n');
  for (const result of report.results) console.log(JSON.stringify(result));
  console.log('MASTER_HANDLER_PROBES_DONE; all isolated compliance assertions passed');
} finally { await rm(temporary,{recursive:true,force:true}); }
