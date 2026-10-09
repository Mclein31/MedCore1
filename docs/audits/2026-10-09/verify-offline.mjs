// Supplemental audit evidence only. Never connects to a database or certifies a device.
// Run from the project root:
// node --import ./node_modules/tsx/dist/loader.mjs docs/audits/2026-10-09/verify-offline.mjs
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';

const directory = path.dirname(fileURLToPath(import.meta.url));
const project = path.resolve(directory, '../../..');
const requireProject = createRequire(path.join(project, 'package.json'));
const { build } = requireProject('esbuild');
const { XMLValidator, XMLParser } = requireProject('fast-xml-parser');
const source = file => readFile(path.join(project, file), 'utf8');
const load = file => import(pathToFileURL(path.join(project, file)).href);
const { INITIAL_ENCOUNTERS } = await load('apps/dashboard/src/data/mockData.ts');
const { computeStatutoryWaterfall } = await load('apps/server/src/services/statutoryWaterfall.ts');
const { computePromissorySchedule } = await load('apps/server/src/services/promissoryEngine.ts');
const { validateGovernmentId } = await load('apps/shared/governmentId.ts');
const { generatePhilHealthEsoaXml } = await load('apps/server/src/services/xmlGenerator.ts');
const { processSimulatedPayment } = await load('apps/server/src/services/simulatedPaymentService.ts');
const { generateGatePassHmac, generateDeterministicExitPin, timingSafeEqualHex } = await load('apps/server/src/services/gatePassService.ts');
const cents = value => { assert.ok(Number.isFinite(Number(value))); return Math.round(Number(value) * 100); };
const results = [];
async function check(step, name, fn) {
  try { const detail = await fn(); results.push({ step, name, status: 'PASS', detail }); }
  catch (error) { results.push({ step, name, status: 'FAIL', detail: error.message }); }
  const result = results.at(-1);
  console.log(`[${result.status}] ${step}: ${name}${result.status === 'FAIL' ? ` — ${result.detail}` : ''}`);
}
const encounter = INITIAL_ENCOUNTERS.find(enc => enc.id === 'enc-8812');

const serverWaterfalls = new Map();
await check('1.2', '250 server-engine fixtures reconcile with zero-centavo error', () => {
  assert.equal(INITIAL_ENCOUNTERS.length, 250);
  for (const enc of INITIAL_ENCOUNTERS) {
    const w = computeStatutoryWaterfall(enc.items, enc.patient.isSeniorCitizen || enc.patient.isPwd,
      enc.philhealth.hciAmount, enc.philhealth.pfAmount, enc.hmo.approvedAmount,
      enc.waterfall.roomUpgradeExcess, enc.waterfall.doctorExcessPf);
    for (const value of Object.values(w)) assert.ok(Number.isFinite(value), enc.id);
    assert.equal(cents(w.grossTotal), cents(w.vatExemption) + cents(w.seniorPwdDiscount) + cents(w.philhealthTotal) + cents(w.hmoApprovedAmount) + cents(w.netPatientDue), enc.id);
    serverWaterfalls.set(enc.id, w);
  }
  return '250 synthetic fixtures; no PostgreSQL rows read.';
});
await check('1.2', 'Seeded waterfall values match subsequent server recalculation inputs for all 250 fixtures', async () => {
  const mismatches = [];
  for (const enc of INITIAL_ENCOUNTERS) {
    const w = serverWaterfalls.get(enc.id);
    for (const key of Object.keys(w).filter(key => key !== 'patientPaid' && key in enc.waterfall)) {
      if (cents(w[key]) !== cents(enc.waterfall[key])) mismatches.push({ encounterId:enc.id, field:key, seed:enc.waterfall[key], recalculated:w[key] });
    }
  }
  await writeFile(path.join(directory,'evidence/seed-recalculation-parity.json'),JSON.stringify({ encountersChecked:250, encountersWithMismatch:new Set(mismatches.map(item=>item.encounterId)).size, mismatches },null,2)+'\n');
  assert.equal(mismatches.length, 0, `${new Set(mismatches.map(item=>item.encounterId)).size} encounters have seed/recalculation differences; see seed-recalculation-parity.json`);
});
await check('1.2', 'Waterfall rejects nonfinite inputs rather than returning NaN', () => {
  assert.throws(() => computeStatutoryWaterfall([{ grossAmount: NaN, category: 'LABORATORY', status: 'COVERED' }], false, 0, 0, 0, 0, 0));
});
await check('1.2', 'Waterfall rejects a one-cent reconciliation discrepancy', () => {
  assert.throws(() => computeStatutoryWaterfall([{ grossAmount: 1, category: 'LABORATORY', status: 'COVERED' }], false, 0, 0, 0, 1.01, 0));
});
await check('2.3', 'Plan registration MRN and telephone match the seeded primary patient', () => {
  assert.equal(encounter.patient.mrn, 'MRN-2026-8812');
  assert.equal(encounter.patient.contactNumber.replace(/[\s-]/g, ''), '09178818812');
});
await check('3.2', 'Legacy supply category has a CENTRAL_SUPPLIES normalization branch', async () => {
  assert.match(await source('apps/server/src/routes/charges.ts'), /category === 'MEDICAL_SUPPLIES'\s*\? 'CENTRAL_SUPPLIES'/);
  return 'Source check; the plan submits CENTRAL_SUPPLIES and does not exercise the legacy input.';
});
await check('4.3', 'Waived gross is excluded from taxable base and liability drops in the seed-derived scenario', () => {
  const args = [true, encounter.philhealth.hciAmount, encounter.philhealth.pfAmount, encounter.hmo.approvedAmount, encounter.waterfall.roomUpgradeExcess, encounter.doctorExcessPf];
  const item = { grossAmount: 8500, category: 'LABORATORY', status: 'COVERED' };
  const before = computeStatutoryWaterfall([...encounter.items, item], ...args);
  const after = computeStatutoryWaterfall([...encounter.items, { ...item, status: 'SUPERVISORY_WAIVED' }], ...args);
  assert.equal(cents(before.grossTotal) - cents(after.grossTotal), 850000);
  assert.ok(cents(after.netPatientDue) < cents(before.netPatientDue));
  return { beforeGross: before.grossTotal, afterGross: after.grossTotal, beforeDue: before.netPatientDue, afterDue: after.netPatientDue };
});
await check('5.1', 'Audit physician and HMO coordinator are seeded', async () => {
  const seed = await source('scripts/seedPostgres.ts');
  assert.ok(seed.includes('carlos.mendoza@stjude.ph'), 'Carlos Mendoza is absent from seeder');
  assert.ok(seed.includes('kristine.ramos@stjude.ph'), 'Kristine Ramos is absent from seeder');
});
await check('5.1', 'Primary encounter begins at the stage required by QuickSign', () => assert.equal(encounter.stage, 'DOCTOR_PF_PENDING'));

// Render the actual dashboard row using its own React version and components.
const temporary = await mkdtemp(path.join(os.tmpdir(), 'medcore-master-audit-'));
try {
  const dashboardBundle = path.join(temporary, 'dashboard.mjs');
  await build({ stdin: { contents: `import React from 'react'; import { renderToStaticMarkup } from 'react-dom/server'; import { ItemizedChargeRow } from './apps/dashboard/src/features/patient-clarify/components/ItemizedChargeRow'; const html = renderToStaticMarkup(<ItemizedChargeRow item={{id:'audit-waived',code:'AUDIT',description:'Synthetic waived charge',category:'LABORATORY',qty:1,unitPrice:8500,grossAmount:8500,patientOop:0,status:'SUPERVISORY_WAIVED',isDisputed:false}} onDisputeClick={()=>{}} />); globalThis.__masterDashboardRow={label:html.includes('Supervisory Waived'),strike:html.includes('line-through'),covered:html.includes('₱0.00 (Covered)')};`, resolveDir: project, sourcefile: 'audit-dashboard.tsx', loader: 'tsx' }, outfile: dashboardBundle, bundle: true, platform: 'node', format: 'esm', jsx: 'automatic', tsconfig: path.join(project, 'apps/dashboard/tsconfig.json'), banner: { js: "import { createRequire as __createAuditRequire } from 'node:module'; const require = __createAuditRequire(import.meta.url);" } });
  await import(pathToFileURL(dashboardBundle).href);
  await check('4.4', 'Actual waived dashboard row displays Supervisory Waived', () => assert.ok(globalThis.__masterDashboardRow.label));
  await check('4.4', 'Actual zero-OOP waived dashboard row renders the required strikethrough', () => assert.ok(globalThis.__masterDashboardRow.strike, 'Waived row instead renders ₱0.00 (Covered), without strikethrough'));

  const mobile = path.join(project, 'apps/mobile');
  const mobileBundle = path.join(temporary, 'mobile.mjs');
  const patientEncounter = { ...encounter, uuid: 'synthetic-uuid', remainingBalance: 100, billState: 'UNPAID', amountPaid: 0, hmo: { ...encounter.hmo, finalLoaStatus: 'APPROVED' } };
  await build({ stdin: { contents: `import React from 'react'; import { renderToString } from 'react-dom/server'; import { SafeAreaProvider } from 'react-native-safe-area-context'; import BillScreen from './src/screens/BillScreen'; import CoverageScreen from './src/screens/CoverageScreen'; const enc=${JSON.stringify(patientEncounter)}; const render=(element)=>renderToString(<SafeAreaProvider initialMetrics={{frame:{x:0,y:0,width:430,height:932},insets:{top:0,bottom:0,left:0,right:0}}}>{element}</SafeAreaProvider>); globalThis.__masterPatient={currentEncounter:enc,loading:false,error:null,refresh:async()=>{}}; const stages=['MGH_DECLARED','DOCTOR_PF_PENDING','PHARMACY_RTS_AUDIT','HMO_FINAL_LOA','PENDING_SETTLEMENT','CLEARED_GATE_PASS']; globalThis.__masterMobile={gating:stages.map(stage=>{enc.stage=stage; const html=render(<BillScreen navigation={{navigate(){}}}/>); return {stage,button:html.includes('Continue to Payment')};}),coverage:render(<CoverageScreen/>)}; enc.stage='PENDING_SETTLEMENT'; enc.remainingBalance=0; globalThis.__masterMobile.zeroBalanceButton=render(<BillScreen navigation={{navigate(){}}}/>).includes('Continue to Payment');`, resolveDir: mobile, sourcefile: 'audit-mobile.tsx', loader: 'tsx' }, outfile: mobileBundle, bundle: true, platform: 'node', format: 'esm', jsx: 'automatic', resolveExtensions: ['.web.tsx','.web.ts','.web.js','.tsx','.ts','.jsx','.js','.json'], tsconfig: path.join(mobile, 'tsconfig.json'), loader: { '.png': 'dataurl' }, alias: { 'react-native': path.join(mobile,'node_modules/react-native-web'), react: path.join(mobile,'node_modules/react'), 'react-dom': path.join(mobile,'node_modules/react-dom') }, define: { __DEV__: 'false', 'process.env.NODE_ENV': '"development"' }, plugins: [{ name: 'audit-snapshot-only', setup(build) { build.onResolve({ filter: /\/hooks\/usePatient$|\/hooks\/usePullRefresh$/ }, args => ({ path: args.path, namespace: 'audit-hooks' })); build.onLoad({ filter: /.*/, namespace: 'audit-hooks' }, args => ({ contents: args.path.endsWith('/usePatient') ? 'export function usePatient(){return globalThis.__masterPatient;}' : 'export function usePullRefresh(refresh){return {refreshing:false,onRefresh:refresh};}', loader: 'js' })); } }], banner: { js: "import { createRequire as __createAuditRequire } from 'node:module'; const require = __createAuditRequire(import.meta.url);" } });
  await import(pathToFileURL(mobileBundle).href);
  await check('6.2', 'Actual mobile Coverage renders the approved benefit amount', () => assert.ok(globalThis.__masterMobile.coverage.includes('₱50,514.29')));
  await check('6.2', 'Actual mobile Coverage renders the literal required HMO Approved badge', () => assert.ok(globalThis.__masterMobile.coverage.includes('HMO Approved'), 'Actual badge label is Approved'));
  await check('7.2', 'Actual Bill button is present only at pending settlement with positive balance', () => {
    for (const item of globalThis.__masterMobile.gating) assert.equal(item.button, item.stage === 'PENDING_SETTLEMENT', item.stage);
    assert.equal(globalThis.__masterMobile.zeroBalanceButton, false);
    return globalThis.__masterMobile.gating;
  });
} finally { await rm(temporary, { recursive: true, force: true }); }

await check('8.4', 'Existing rollback test checks all three required tables', async () => {
  const script = await source('scripts/testBackendApi.ts');
  const section = script.slice(script.indexOf('const rollbackCheck'), script.indexOf('// 13. Promissory'));
  assert.ok(section.includes('paymentReceipts') && section.includes('systemAuditLogs'), 'Existing rollback test checks only payments, not payment_receipts or system_audit_logs');
});
await check('8.2', 'Current payment processor issues the required OR-SJMC receipt prefix', async () => {
  const result = await processSimulatedPayment('QR_PH');
  assert.ok(result.officialReceiptNumber.startsWith('OR-SJMC-'), 'Current processor returns OR-MC, not OR-SJMC; it is a simulation');
});
await check('9.1', 'All government ID types reject invalid formats with an error', () => {
  for (const type of ['PHILSYS_NATIONAL_ID','UMID','DRIVERS_LICENSE','PASSPORT']) {
    const result = validateGovernmentId(type, '1234'); assert.equal(result.valid, false); assert.ok(result.error);
  }
});
await check('9.2', 'Fixture schedules and tiny residuals are nonnegative, zero-interest and centavo-exact', () => {
  let schedules = 0;
  for (const principal of [...INITIAL_ENCOUNTERS.map(enc => enc.waterfall.netPatientDue).filter(value => value > 0), 0.01, 0.04, 1.01, 2500.01]) {
    for (const months of [3,6,12]) {
      const plan = computePromissorySchedule(principal, months);
      assert.equal(plan.schedule.length, months); assert.equal(plan.interestRate, 0); assert.equal(plan.financingFee, 0);
      assert.equal(cents(plan.totalRepayment), cents(principal));
      assert.equal(plan.schedule.reduce((sum, amount) => sum + cents(amount), 0), cents(principal));
      assert.ok(plan.schedule.every(amount => Number.isFinite(amount) && amount >= 0));
      schedules++;
    }
  }
  return { schedules, persistedSchedulesVerified: false };
});
await check('10.1', 'Gate-pass HMAC detects a changed settlement payload', async () => {
  const original = await generateGatePassHmac('synthetic-stay',100,'2026-10-09T00:00:00Z','synthetic-audit-secret');
  const identical = await generateGatePassHmac('synthetic-stay',100,'2026-10-09T00:00:00Z','synthetic-audit-secret');
  const changed = await generateGatePassHmac('synthetic-stay',101,'2026-10-09T00:00:00Z','synthetic-audit-secret');
  assert.equal(timingSafeEqualHex(original,identical),true); assert.equal(timingSafeEqualHex(original,changed),false);
});
await check('10.1', 'Exit PIN is an independent factor rather than the public pass-number suffix', async () => {
  const pass = 'PASS-MC-12345';
  assert.notEqual(await generateDeterministicExitPin(pass),pass.replace(/\D/g,'').slice(-4),'PIN is recoverable directly from the pass number');
});
await check('10.3', 'The audit wrong-PIN value 0000 cannot be a generated valid PIN', async () => {
  assert.notEqual(await generateDeterministicExitPin('PASS-MC-10000'),'0000','A valid pass number can produce the supposed wrong PIN 0000');
});
const xmlData = { facility:{pan:'SYNTHETIC',name:'Audit hospital',tin:'SYNTHETIC',address:'Audit'}, patient:{pin:'SYNTHETIC',fullName:'Synthetic Patient',dob:'2000-01-01',gender:'M',isSeniorOrPwd:false}, encounter:{encounterNumber:'AUDIT',admissionDate:'2026-10-09',dischargeDate:'2026-10-09',primaryIcd10:'J18.9',primaryDiagnosis:'Synthetic'}, doctor:{pan:'SYNTHETIC',name:'Synthetic Doctor',agreedFee:15,excessFee:0}, claim:{claimNumber:'AUDIT',caseRateCode:'J18.9',totalCaseRate:10,hciAmount:7,pfAmount:3,isNbb:false}, charges:[{code:'AUDIT',description:'Synthetic charge',category:'LABORATORY',quantity:1,unitPrice:100,grossAmount:100,philhealthAmount:10,hmoAmount:0,patientOop:90}],waterfall:{grossTotal:100,vatExemption:0,seniorDiscount:0,philhealthTotal:10,hmoApprovedAmount:0,netPatientDue:90} };
const xml = generatePhilHealthEsoaXml(xmlData);
await writeFile(path.join(directory,'evidence/synthetic-esoa.xml'),xml);
await check('11', 'Generated XML is well-formed and preserves the synthetic HCI/PF split', () => {
  assert.equal(XMLValidator.validate(xml), true);
  const parsed = new XMLParser().parse(xml).eSOA_Claim;
  assert.equal(cents(parsed.BenefitSummary.HospitalCareFacilityShare) + cents(parsed.BenefitSummary.PhysicianShare), cents(parsed.BenefitSummary.TotalCaseRate));
  assert.ok(parsed.ItemizedCharges.Item);
  return 'XML syntax only; no official DTD/schema validation.';
});
await check('11', 'XML contains the namespace/schema reference required by the audit', () => assert.ok(/xmlns|schemaLocation|DOCTYPE/.test(xml), 'XML has a circular text attribute, but no namespace/schema/DTD reference'));
await check('12.1', 'Analytics API includes the required positive DAR metric', async () => assert.ok(/darDays\s*:/.test(await source('apps/server/src/routes/analytics.ts')), 'summary.darDays is absent from the API response'));
const report = { scope:'Offline supplemental checks: real calculation functions and actual SSR components, synthetic fixtures/hooks. No HTTP transport, PostgreSQL or device synchronization certification.', results, passed:results.filter(result=>result.status==='PASS').length, failed:results.filter(result=>result.status==='FAIL').length };
await writeFile(path.join(directory,'evidence/offline-results.json'), JSON.stringify(report,null,2)+'\n');
console.log(`MASTER_OFFLINE_CHECKS_DONE passed=${report.passed} failed=${report.failed}`);
process.exitCode = report.failed ? 1 : 0;
