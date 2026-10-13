// Actual UI, isolated synthetic data. Never calls hosted APIs or AI providers.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { build } from '../node_modules/esbuild/lib/main.js';
const phase = process.argv.includes('--before') ? 'before' : 'after';
const statesOnly = process.argv.includes('--states-only');
const out = resolve('docs/validation/ui-polish', phase);
await mkdir(out, { recursive: true });
const built = await build({ entryPoints: [resolve('apps/dashboard/src/data/mockData.ts')], bundle: true, write: false, format: 'esm', platform: 'node', alias: { '@': resolve('apps/dashboard/src') } });
const { INITIAL_ENCOUNTERS } = await import('data:text/javascript;base64,' + Buffer.from(built.outputFiles[0].text).toString('base64'));
const encounters = INITIAL_ENCOUNTERS.map((e, i) => ({ ...e, patient: { ...e.patient, fullName: `Sample Patient ${i + 1}`, maskedName: `Sample Patient ${i + 1}` } }));
const user = { id: 'polish-staff', facilityId: 'polish-facility', facilityName: 'Sample Medical Center', fullName: 'Alex Rivera', email: 'staff@example.test', title: 'Billing specialist', role: 'BILLING_SPECIALIST' };
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_BROWSER_PATH || '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser' });
if (process.argv.includes('--icon-study')) {
  const p = await browser.newPage({ viewport: { width: 1120, height: 950 } });
  await p.goto('file://' + resolve('docs/validation/ui-polish/solar-style-study.html'));
  await p.screenshot({ path: resolve('docs/validation/ui-polish/solar-style-study.png'), fullPage: true });
  await browser.close();
  process.exit(0);
}
const results = [], errors = [], mutations = [], blocked = [];
function listen(p) { p.on('pageerror', e => errors.push(e.message)); }
async function shot(p, name) {
  await p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  await p.screenshot({ path: resolve(out, `${name}.png`) });
}
async function bounds(p, name) {
  const layout = await p.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
  assert.ok(layout.document <= layout.viewport + 1, `${name}: document overflow`);
  results.push({ name, ...layout });
}
async function staffContext(width, empty = false) {
  const c = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
  await c.route('**/*', route => {
    const q = route.request(), u = new URL(q.url()), path = u.pathname;
    if (!['127.0.0.1', 'localhost'].includes(u.hostname)) { blocked.push(u.origin); return route.abort(); }
    if (!path.startsWith('/api/')) return route.continue();
    if (path.includes('/ai/')) return route.fulfill({ status: 503, json: { error: { message: 'AI unavailable in the synthetic visual fixture.' } } });
    if (q.method() !== 'GET') { mutations.push(path); return route.fulfill({ status: 403, json: { error: { message: 'Read-only visual fixture' } } }); }
    let data = { items: [], total: 0 };
    if (path.endsWith('/auth/me')) data = { authenticated: true, user };
    else if (path.endsWith('/encounters')) data = { items: empty ? [] : encounters, total: empty ? 0 : encounters.length };
    else if (path.endsWith('/notifications')) data = { notifications: [], unreadCount: 0 };
    else if (path.endsWith('/esoa-xml')) return route.fulfill({ status: 200, contentType: 'application/xml', body: '<?xml version="1.0"?><eSOA><Fixture>Visual inspection only</Fixture></eSOA>' });
    return route.fulfill({ status: 200, json: data });
  });
  return c;
}
async function mobileLogin(p) {
  await p.goto(process.env.MEDCORE_MOBILE_UI_URL || 'http://127.0.0.1:8084', { waitUntil: 'domcontentloaded' });
  await p.getByRole('button', { name: 'Skip introduction', exact: true }).click();
  await p.getByLabel('Email', { exact: true }).fill('patient@example.test');
  await p.getByLabel('Password', { exact: true }).fill('Synthetic-only123!');
  await p.getByRole('button', { name: 'Sign in', exact: true }).click();
  await p.getByRole('heading', { name: 'Alex Rivera', exact: true }).waitFor();
}
async function mobileHeader(p, screen) {
  const header = p.getByTestId('app-header').filter({ visible: true });
  assert.equal(await header.count(), 1);
  const style = await header.evaluate(e => ({ border: getComputedStyle(e).borderBottomWidth, color: getComputedStyle(e).borderBottomColor }));
  const row = await p.getByTestId('app-header-row').filter({ visible: true }).boundingBox();
  assert.equal(row.height, 56, `${screen} header row height`);
  if (phase === 'after') assert.equal(style.border, '1px', `${screen} header border`);
  results.push({ screen, header: style, height: row.height });
}
try {
  for (const width of statesOnly ? [] : [1440, 1024, 768, 390]) {
    const c = await staffContext(width), p = await c.newPage(); listen(p);
    await p.goto(process.env.MEDCORE_DASHBOARD_UI_URL || 'http://127.0.0.1:5175', { waitUntil: 'networkidle' });
    await p.getByRole('heading', { name: 'Overview', exact: true }).waitFor();
    const nav = p.getByRole('complementary', { name: 'Workspace navigation' });
    if (width < 1024 && await nav.getByRole('button', { name: 'Collapse sidebar', exact: true }).count()) await nav.getByRole('button', { name: 'Collapse sidebar', exact: true }).click();
    for (const label of ['Overview', 'Discharge Clearance', 'Encounters & Ledgers', 'Approvals & Disputes', 'Claims & eSOA XML', 'RCM Analytics', 'Settings & Rules']) {
      await nav.getByRole('button', { name: label, exact: true }).click();
      await p.locator('main').getByRole('heading').first().waitFor();
      await p.waitForTimeout(250);
      const name = `dashboard-${label.replace(/[^a-zA-Z]+/g, '-').toLowerCase()}-${width}`;
      await shot(p, name); await bounds(p, name);
      assert.equal(await nav.getByRole('button', { name: label, exact: true }).getAttribute('aria-current'), 'page');
      if (phase === 'after' && label === 'Encounters & Ledgers' && width <= 640) {
        const region = p.locator('.ledger-charge-region');
        await region.scrollIntoViewIfNeeded();
        const table = region.locator('table');
        assert.ok((await region.boundingBox()).height >= 320, 'Phone ledger retains table height');
        await shot(p, `dashboard-ledger-scroll-${width}`);
        const edit = table.getByRole('button', { name: /^Edit charge:/ }).first();
        await edit.scrollIntoViewIfNeeded(); await edit.focus();
        const b = await edit.boundingBox();
        assert.ok(b.width >= 24 && b.height >= 24 && b.x >= 0 && b.x + b.width <= width + 1);
        await shot(p, `dashboard-ledger-actions-${width}`);
        results.push({ screen: 'phone-ledger', verified: 'Rows and labelled edit action reachable through local scrolling' });
      }
    }
    await nav.getByRole('button', { name: 'Encounters & Ledgers', exact: true }).click();
    await p.getByRole('tab', { name: 'Pre-admission cost estimator', exact: true }).click();
    await shot(p, `dashboard-estimator-${width}`);
    await p.getByRole('button', { name: 'Admit Inpatient', exact: true }).click();
    await p.getByRole('heading', { name: 'Inpatient Admission Registration', exact: true }).waitFor();
    await shot(p, `dashboard-admission-modal-${width}`);
    if (phase === 'after') {
      const dialog = p.getByRole('dialog', { name: 'Inpatient admission registration', exact: true });
      await p.getByLabel('Full Legal Name (Last, First M.)', { exact: true }).focus();
      for (let i = 0; i < 20; i++) {
        await p.keyboard.press('Tab');
        assert.equal(await dialog.evaluate(e => e.contains(document.activeElement)), true, 'Admission focus stays inside the dialog');
      }
      await p.keyboard.press('Escape');
      await dialog.waitFor({ state: 'detached' });
      assert.equal(await p.getByRole('button', { name: 'Admit Inpatient', exact: true }).evaluate(e => e === document.activeElement), true);
      results.push({ screen: `admission-${width}`, keyboard: 'label association, focus containment, Escape and trigger restoration' });
    } else await p.getByRole('button', { name: 'Close modal', exact: true }).click();
    await c.close();
  }
  if (!statesOnly) {
    const empty = await staffContext(1440, true), ep = await empty.newPage(); listen(ep);
    await ep.goto(process.env.MEDCORE_DASHBOARD_UI_URL || 'http://127.0.0.1:5175', { waitUntil: 'networkidle' });
    await ep.getByRole('heading', { name: 'Overview', exact: true }).waitFor();
    await shot(ep, 'dashboard-empty'); await empty.close();
  }
  for (const width of statesOnly ? [] : [320, 390, 430, 768]) {
    const c = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    await c.route('**/*', route => {
      const u = new URL(route.request().url());
      if (!['127.0.0.1', 'localhost'].includes(u.hostname)) { blocked.push(u.origin); return route.abort(); }
      return route.continue();
    });
    await c.request.get('http://127.0.0.1:8901/__control?reset=1');
    const p = await c.newPage(); listen(p); await mobileLogin(p);
    for (const label of ['Home', 'Bill', 'Coverage', 'Payments', 'Profile']) {
      await p.getByRole('tab', { name: label, exact: true }).click();
      await mobileHeader(p, `${label}-${width}`); await shot(p, `mobile-${label.toLowerCase()}-${width}`); await bounds(p, `${label}-${width}`);
    }
    if (phase === 'after') {
      await p.getByRole('tab', { name: 'Coverage', exact: true }).click();
      for (const label of ['Ask Cora AI about my coverage', 'Scan Card OCR, benefit card or government ID']) {
        const b = await p.getByRole('button', { name: label, exact: true }).boundingBox();
        assert.ok(b.width >= 48 && b.height >= 48 && b.x + b.width <= width + 1, label);
      }
      await p.getByRole('tab', { name: 'Bill', exact: true }).click();
      await p.getByLabel('Search your charges', { exact: true }).fill('unmatched charge');
      await p.getByText('No matching charges', { exact: true }).waitFor();
      await shot(p, `mobile-charge-search-empty-${width}`);
      await p.getByLabel('Search your charges', { exact: true }).fill('');
      await p.getByRole('button', { name: 'Room & board, expand', exact: true }).click();
      await p.getByRole('button', { name: 'Room and board, expand', exact: true }).click();
      const item = p.getByRole('button', { name: 'Room and board, collapse', exact: true });
      await item.scrollIntoViewIfNeeded();
      await shot(p, `mobile-expanded-bill-${width}`);
      await bounds(p, `expanded-bill-${width}`);
      await p.getByRole('tab', { name: 'Home', exact: true }).click();
      await p.getByRole('button', { name: 'Documents', exact: true }).click();
      await mobileHeader(p, `documents-${width}`); await shot(p, `mobile-documents-${width}`);
      await p.getByRole('button', { name: /^Statement of account,/ }).click();
      await mobileHeader(p, `record-${width}`); await shot(p, `mobile-record-${width}`);
      await p.getByRole('button', { name: 'Back', exact: true }).click();
      await p.getByRole('button', { name: 'Back', exact: true }).click();
      await p.getByRole('button', { name: /^Insurance claims,/ }).click();
      await mobileHeader(p, `claims-${width}`); await shot(p, `mobile-claims-${width}`);
      await p.getByRole('button', { name: 'Back', exact: true }).click();
      await p.getByRole('tab', { name: 'Profile', exact: true }).click();
      await p.getByRole('button', { name: 'Hospital updates', exact: true }).click();
      await mobileHeader(p, `updates-${width}`); await shot(p, `mobile-updates-${width}`);
      await p.getByRole('button', { name: 'Back', exact: true }).click();
    }
    for (const tab of await p.getByRole('tab').all()) {
      const b = await tab.boundingBox(); assert.ok(b.width >= 44 && b.height >= 44);
    }
    await p.getByRole('tab', { name: 'Home', exact: true }).click();
    await p.getByRole('button', { name: 'Pay balance', exact: true }).click();
    await mobileHeader(p, `payment-amount-${width}`); await shot(p, `mobile-amount-${width}`);
    await p.getByRole('button', { name: 'Continue to payment method', exact: true }).click();
    await mobileHeader(p, `payment-methods-${width}`); await shot(p, `mobile-methods-${width}`);
    if (phase === 'after') {
      await p.getByRole('button', { name: 'Back', exact: true }).click();
      await p.getByRole('button', { name: 'Back', exact: true }).click();
      await p.evaluate(() => {
        for (const e of document.querySelectorAll('[dir="auto"]')) {
          if (e.closest('[role="tablist"]')) continue;
          const s = getComputedStyle(e), font = parseFloat(s.fontSize), line = parseFloat(s.lineHeight);
          e.style.setProperty('font-size', `${font * 1.5}px`, 'important');
          if (Number.isFinite(line)) e.style.setProperty('line-height', `${line * 1.5}px`, 'important');
        }
      });
      const pay = p.getByRole('button', { name: 'Pay balance', exact: true });
      await pay.scrollIntoViewIfNeeded();
      assert.equal(await pay.evaluate(e => {
        const b = e.getBoundingClientRect();
        return e.contains(document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2));
      }), true, 'Payment action reachable at 150% content text');
      await bounds(p, `text-150-${width}`); await shot(p, `mobile-text-150-${width}`);
    }
    await c.close();
  }
  if (phase === 'after') {
    for (const state of ['early-stage', 'pharmacy-pending', 'hmo-pending', 'empty', 'long-text', 'error', 'loading']) {
      const c = await browser.newContext({ viewport: { width: 320, height: 900 }, reducedMotion: 'reduce' });
      await c.route('**/api/v1/patient/me/overview', async route => {
        if (state === 'error') return route.fulfill({ status: 503, json: { error: { message: 'Temporary fixture outage' } } });
        if (state === 'loading') await new Promise(r => setTimeout(r, 2000));
        const response = await route.fetch(), data = await response.json();
        if (state === 'empty') { data.currentEncounter = null; data.dischargeChecklist = []; }
        if (state === 'early-stage') data.currentEncounter.stage = 'DOCTOR_PF_PENDING';
        if (state === 'pharmacy-pending') data.currentEncounter.stage = 'PHARMACY_RTS_AUDIT';
        if (state === 'hmo-pending') data.currentEncounter.stage = 'HMO_FINAL_LOA';
        if (state === 'long-text') data.patient.fullName = 'Alexandra Maria Rivera de los Santos Montenegro';
        await route.fulfill({ json: data });
      });
      const p = await c.newPage(); listen(p);
      if (state === 'long-text') {
        await c.route('**/api/v1/patient/me', async route => {
          const response = await route.fetch(), data = await response.json();
          data.patient.fullName = 'Alexandra Maria Rivera de los Santos Montenegro';
          await route.fulfill({ json: data });
        });
      }
      await p.goto(process.env.MEDCORE_MOBILE_UI_URL || 'http://127.0.0.1:8084', { waitUntil: 'domcontentloaded' });
      await p.getByRole('button', { name: 'Skip introduction', exact: true }).click();
      await p.getByLabel('Email', { exact: true }).fill('patient@example.test');
      await p.getByLabel('Password', { exact: true }).fill('Synthetic-only123!');
      await p.getByRole('button', { name: 'Sign in', exact: true }).click();
      await p.getByRole('tab', { name: 'Home', exact: true }).waitFor();
      if (state === 'loading') await p.getByRole('progressbar', { name: 'Loading your hospital account…', exact: true }).waitFor();
      else await p.waitForTimeout(400);
      await shot(p, `mobile-state-${state}`); await bounds(p, state);
      if (['early-stage', 'pharmacy-pending', 'hmo-pending', 'empty', 'error'].includes(state)) assert.equal(await p.getByRole('button', { name: 'Pay balance', exact: true }).count(), 0, `${state}: no payable statement`);
      await c.unrouteAll({ behavior: 'wait' });
      await c.close();
    }
  }
  assert.deepEqual(errors, []); assert.deepEqual(mutations, []);
} finally {
  await writeFile(resolve(out, statesOnly ? 'states-results.json' : 'results.json'), JSON.stringify({ phase, results, errors, mutations, blocked, fixture: '250 sanitized staff records and loopback-only patient fixture; no external AI or hospital writes.' }, null, 2));
  await browser.close();
}
console.log(JSON.stringify({ phase, checks: results.length, errors, mutations, blocked }, null, 2));
