// Sandbox-only visual QA using actual dashboard components and local PostgreSQL.
import { seedPassword } from './seedPassword';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createDbConnection } from '../apps/server/src/db/index';
const database = process.env.MEDCORE_SMS_TEST_DATABASE_URL || 'postgresql://mclein@127.0.0.1:5432/medcore_sms_validation';
const target = new URL(database);
assert.ok(['localhost','127.0.0.1','[::1]'].includes(target.hostname));
assert.match(target.pathname,/^\/medcore_sms_validation(?:_[a-z0-9]+)?$/);
assert.ok(!target.search&&!target.hash);
process.env.DATABASE_URL = database;
process.env.NODE_ENV = 'development';
const originalFetch = globalThis.fetch;
let externalCalls = 0;
globalThis.fetch = async () => { externalCalls++; throw new Error('External API calls are prohibited in sandbox UI verification.'); };
const { default: app } = await import('../apps/server/src/index');
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || '/private/tmp/medcore-visual-tools/node_modules/playwright-core/index.mjs');
const connection = createDbConnection(database);
const env = { NODE_ENV: 'development', DATABASE_URL: database, GEMINI_API_KEY: '', SEMAPHORE_API_KEY: 'synthetic-key-is-ignored', GATE_PASS_SECRET: 'sms-sandbox-ui-fixture' };
const browser = await chromium.launch({headless:true, executablePath:process.env.PLAYWRIGHT_BROWSER_PATH || '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser'});
const errors: string[] = [], checks: string[] = [];
const output=resolve('UI_SCREENSHOTS/dashboard/sms-sandbox');await mkdir(output,{recursive:true});
try {
 const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 await context.route('**/*',async (route: any)=>{
  const request=route.request(), url=new URL(request.url());
  if(url.pathname.startsWith('/api/')) {
   const response=await app.request(url.pathname+url.search,{method:request.method(),headers:request.headers(),body:request.postData()||undefined},env);
   return route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:await response.text()});
  }
  if(!['127.0.0.1','localhost'].includes(url.hostname))return route.abort();
  return route.continue();
 });
 const page=await context.newPage();page.on('pageerror',(error: Error)=>errors.push(error.message));
 await page.goto(process.env.MEDCORE_DASHBOARD_UI_URL || 'http://127.0.0.1:5175',{waitUntil:'networkidle'});
 await page.getByRole('textbox').first().fill('elena.santos@stjude.ph');
 await page.locator('input[type=password]').fill(seedPassword());
 await page.getByRole('button',{name:/Sign in/i}).click();
 await page.getByRole('button',{name:'Discharge Clearance',exact:true}).click();
 await page.getByRole('tab',{name:'6-Stage Pipeline',exact:true}).click();
 const nudge=page.getByRole('button',{name:'Nudge Doctor (SMS)',exact:true}).first();await nudge.waitFor();await nudge.click();
 const toast=page.getByRole('status',{name:'SMS notification'});await toast.waitFor();
 await toast.getByText('SMS update',{exact:true}).waitFor();
 assert.doesNotMatch(await toast.innerText(),/sandbox|simulat|no cellular SMS|NTC:|RA 10173:/i);
 assert.ok((await toast.innerText()).includes('Professional Fee'));
 await page.screenshot({path:resolve(output,'01-doctor-nudge.png')});checks.push('Discharge card nudge, persisted API response and clean SMS notification');
 await toast.getByRole('button',{name:'Dismiss SMS preview'}).click();assert.equal(await toast.count(),0);
 const card=nudge.locator('xpath=ancestor::div[contains(@class,"rounded-xl")][1]');
 // The card's explicit review action opens the actual Doctor QuickSign modal.
 await page.getByRole('button',{name:'Review Doctor PF',exact:true}).first().click();
 await page.getByRole('button',{name:'Nudge Doctor (SMS)',exact:true}).filter({visible:true}).last().click();
 await toast.waitFor();await page.screenshot({path:resolve(output,'02-quicksign-preview.png')});
 await toast.getByRole('button',{name:'Dismiss SMS preview'}).click();checks.push('QuickSign nudge preview appears above modal and dismisses independently');
 await page.keyboard.press('Escape');
 // Dismiss the underlying modal using its explicit close control if Escape is not implemented.
 const close=page.getByRole('button',{name:/Close.*QuickSign|Close.*Doctor|Close modal/i});if(await close.count())await close.first().click();
 await page.getByRole('button',{name:'Encounters & Ledgers',exact:true}).click();
 await page.getByRole('tab',{name:'Pre-admission cost estimator',exact:true}).click();
 const send=page.getByRole('button',{name:'Send Intake Orientation (SMS)',exact:true});assert.equal(await send.isDisabled(),true);
 const options: Array<{value:string;text:string|null}>=await page.locator('#intake-sms-recipient option').evaluateAll((elements: Element[])=>elements.slice(1).map((e: Element)=>({value:(e as HTMLOptionElement).value,text:e.textContent})));
 const candidate=(await connection.pool.query("SELECT e.encounter_number FROM encounters e JOIN patients p ON p.id=e.patient_id WHERE p.full_name='Sample SMS Patient' AND p.contact_number<>'' ORDER BY e.admission_timestamp DESC LIMIT 1")).rows[0];
 const option=options.find(e=>e.text?.includes(candidate.encounter_number));assert.ok(option);
 await page.locator('#intake-sms-recipient').selectOption(option.value);await send.click();await toast.waitFor();assert.ok((await toast.innerText()).includes('MEDCORE INTAKE'));await page.screenshot({path:resolve(output,'03-intake-preview.png')});checks.push('Estimator requires a real encounter and sends link-free orientation rather than procedure data');
 await toast.getByRole('button',{name:'Dismiss SMS preview'}).click();
 await page.getByRole('button',{name:'Admit Inpatient',exact:true}).click();
 const admission=page.locator('[data-overlay-layer="modal"]').filter({has:page.getByRole('button',{name:'Confirm Inpatient Admission',exact:true})});
 await admission.getByPlaceholder('e.g. Santos, Maria Clara E.').fill('Sample Browser Admission Patient');
 await admission.locator('input[type=text]').nth(1).fill('SMS-BROWSER-'+Date.now());
 await admission.getByLabel('Patient mobile number (optional)',{exact:true}).fill('0997-555-5010');
 await admission.getByPlaceholder('e.g. Acute Appendicitis / Community Acquired Pneumonia Moderate Risk').fill('Routine admission');
 const bed=(await connection.pool.query("SELECT bed_number FROM beds WHERE status='AVAILABLE' AND current_encounter_id IS NULL LIMIT 1")).rows[0];assert.ok(bed);
 const doctor=(await connection.pool.query("SELECT id FROM users WHERE role='ATTENDING_PHYSICIAN' AND is_active LIMIT 1")).rows[0];assert.ok(doctor);
 await admission.locator('select').filter({has:page.locator(`option[value="${bed.bed_number}"]`)}).selectOption(bed.bed_number);
 await admission.locator('select').filter({has:page.locator(`option[value="${doctor.id}"]`)}).selectOption(doctor.id);
 await admission.getByRole('button',{name:'Confirm Inpatient Admission',exact:true}).click();
 await toast.waitFor();assert.ok((await toast.innerText()).includes('Sample Browser Admission Patient'));assert.ok((await toast.innerText()).includes('+639975555010'));assert.ok((await toast.innerText()).includes('MEDCORE INTAKE'));
 await page.screenshot({path:resolve(output,'04-admission-preview.png')});checks.push('New admission forwards entered mobile number and displays its confirmed intake simulation');
 await context.close();assert.deepEqual(errors,[]);assert.equal(externalCalls,0);
 await writeFile(resolve(output,'results.json'),JSON.stringify({sandboxOnly:true,actualDashboardComponents:true,actualLocalApiAndPostgres:true,externalCalls,checks,pageErrors:errors},null,2)+'\n');
 console.log(JSON.stringify({checks,externalCalls,pageErrors:errors}));
} finally {await browser.close();await connection.pool.end();globalThis.fetch=originalFetch;}
process.exit(0);
