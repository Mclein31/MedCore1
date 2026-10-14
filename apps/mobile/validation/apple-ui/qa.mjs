// Render actual application components against loopback synthetic data only.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from '../../../../node_modules/esbuild/lib/main.js';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || '/private/tmp/medcore-visual-tools/node_modules/playwright-core/index.mjs');
const output = fileURLToPath(new URL('./screenshots/', import.meta.url));
await mkdir(output, { recursive: true });
const bundled = await build({ entryPoints: [resolve('apps/dashboard/src/data/mockData.ts')], bundle: true, write: false, format: 'esm', platform: 'node', alias: { '@': resolve('apps/dashboard/src') } });
const { INITIAL_ENCOUNTERS } = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`);
const encounters = INITIAL_ENCOUNTERS.slice(0, 4).map((enc, i) => ({ ...enc, patient: { ...enc.patient, fullName: `Sample Patient ${i + 1}`, maskedName: `Sample Patient ${i + 1}` } }));
const user = { id: 'visual-staff', facilityId: 'visual-facility', facilityName: 'Sample Medical Center', fullName: 'Alex Rivera', email: 'staff@example.test', title: 'Billing specialist', role: 'BILLING_SPECIALIST' };
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_BROWSER_PATH || '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser' });
const checks = [], errors = [], mutations = [];
function listen(page) { page.on('pageerror', e => errors.push(e.message)); page.on('console', message => { if (message.type() === 'error' && !message.text().includes('503 (Service Unavailable)')) console.log('UI console:', message.text().slice(0, 500)); }); }
async function shot(page, name) {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.screenshot({ path: `${output}${name}.png` });
}
async function mobileLogin(page) {
  await page.goto(process.env.MEDCORE_MOBILE_UI_URL || 'http://127.0.0.1:8084', { waitUntil: 'domcontentloaded' });
  await page.addStyleTag({ content: '.__expo_fast_refresh { display: none !important; }' });
  await page.getByRole('button', { name: 'Skip introduction', exact: true }).click();
  await page.getByLabel('Email', { exact: true }).fill('patient@example.test');
  await page.getByLabel('Password', { exact: true }).fill('Synthetic-only123!');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByRole('tab', { name: 'Home', exact: true }).waitFor();
  await page.getByRole('heading', { name: 'Alex Rivera', exact: true }).waitFor();
}
async function noHorizontalOverflow(page, locator) {
  const overflow = await locator.evaluate(e => e.scrollWidth > e.clientWidth + 1);
  assert.equal(overflow, false, 'Content must fit its scroll container horizontally');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
}
try {
  for (const width of [1440, 1024, 768]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    await context.route('**/*', async route => {
      const request = route.request(), path = new URL(request.url()).pathname;
      if (!path.startsWith('/api/')) return route.continue();
      if (request.method() !== 'GET' && !path.includes('/ai/')) mutations.push(path);
      let data = { items: [], total: 0 };
      if (path.endsWith('/auth/me')) data = { authenticated: true, user };
      else if (path.endsWith('/encounters')) data = { items: encounters, total: encounters.length };
      else if (path.endsWith('/notifications')) data = { notifications: [], unreadCount: 0 };
      if (path.includes('/ai/')) return route.fulfill({ status: 503, json: { error: { message: 'AI unavailable in the synthetic visual fixture.' } } });
      return route.fulfill({ status: 200, json: data });
    });
    const page = await context.newPage(); listen(page);
    await page.goto(process.env.MEDCORE_DASHBOARD_UI_URL || 'http://127.0.0.1:5175', { waitUntil: 'networkidle' });
    await page.getByRole('heading', { name: 'Overview', exact: true }).waitFor({ timeout: 10000 }).catch(async error => { await shot(page, 'dashboard-failure'); console.log('Dashboard state:', (await page.locator('body').innerText()).slice(0, 1800)); throw error; });
    await noHorizontalOverflow(page, page.locator('.operations-content'));
    const sidebar = page.getByRole('complementary', { name: 'Workspace navigation' });
    assert.equal(await sidebar.getByRole('button', { name: 'Overview', exact: true }).getAttribute('aria-current'), 'page');
    await shot(page, `dashboard-${width}`);
    const queue = page.getByRole('region', { name: 'Priority queues' });
    const claims = queue.getByRole('button', { name: /Claims to review/ });
    await claims.focus(); await page.keyboard.press('Enter');
    await page.getByRole('heading', { name: /Claims/ }).first().waitFor();
    await sidebar.getByRole('button', { name: 'Overview', exact: true }).click();
    await page.getByRole('heading', { name: 'Overview', exact: true }).waitFor();
    if (width > 900) {
      await sidebar.getByRole('button', { name: 'Collapse sidebar', exact: true }).click();
    } else {
      // The dashboard intentionally starts with a compact icon rail at this width.
      assert.ok(await sidebar.getByRole('button', { name: 'Expand sidebar', exact: true }).count());
    }
    await sidebar.getByRole('button', { name: 'Claims & eSOA XML', exact: true }).focus();
    await page.keyboard.press('Enter');
    assert.equal(await sidebar.getByRole('button', { name: 'Claims & eSOA XML', exact: true }).getAttribute('aria-current'), 'page');
    await sidebar.getByRole('button', { name: 'Overview', exact: true }).click();
    await noHorizontalOverflow(page, page.locator('.operations-content'));
    await shot(page, `dashboard-collapsed-${width}`);
    checks.push(`Dashboard ${width}px: layout, keyboard priority route, collapsed navigation and selection`);
    await context.close();
  }
  for (const width of [320, 390, 430]) {
    const context = await browser.newContext({ viewport: { width, height: width === 320 ? 690 : 900 }, reducedMotion: 'reduce' });
    const page = await context.newPage(); listen(page); await mobileLogin(page);
    await noHorizontalOverflow(page, page.getByTestId('financial-summary').filter({ visible: true }).first());
    await shot(page, `mobile-home-${width}`);
    await page.getByRole('button', { name: 'Ask Cora AI', exact: true }).click();
    await page.getByRole('button', { name: 'Close Cora assistant', exact: true }).waitFor();
    if (width === 390) await shot(page, 'mobile-cora');
    await page.getByRole('button', { name: 'Close Cora assistant', exact: true }).click();
    const tabs = page.getByRole('tab'); assert.equal(await tabs.count(), 5);
    for (const tab of await tabs.all()) {
      const bounds = await tab.boundingBox(); assert.ok(bounds.width >= 44 && bounds.height >= 44);
      assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width + 1);
    }
    await page.getByRole('button', { name: 'Pay balance', exact: true }).click();
    await page.getByRole('button', { name: 'Continue to payment method', exact: true }).waitFor();
    await shot(page, `mobile-payment-${width}`);
    await page.getByRole('button', { name: 'Back', exact: true }).click();
    for (const name of ['Bill', 'Coverage', 'Payments', 'Profile', 'Home']) {
      await page.getByRole('tab', { name, exact: true }).click();
      if (name === 'Bill' || name === 'Profile') await shot(page, `mobile-${name.toLowerCase()}-${width}`);
    }
    // Text enlargement exercises content reflow; actual OS Dynamic Type remains a device check.
    await page.evaluate(() => {
      for (const e of document.querySelectorAll('[dir="auto"]')) {
        if (e.closest('[role="tablist"]')) continue;
        const style = getComputedStyle(e), font = parseFloat(style.fontSize), line = parseFloat(style.lineHeight);
        e.style.setProperty('font-size', `${font * 1.5}px`, 'important');
        if (Number.isFinite(line)) e.style.setProperty('line-height', `${line * 1.5}px`, 'important');
      }
    });
    await noHorizontalOverflow(page, page.getByTestId('financial-summary').filter({ visible: true }).first());
    const pay = page.getByRole('button', { name: 'Pay balance', exact: true });
    await pay.scrollIntoViewIfNeeded();
    await pay.evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await page.waitForTimeout(100);
    const payBounds = await pay.boundingBox(), dockBounds = await page.getByTestId('cora-dock').filter({ visible: true }).boundingBox();
    assert.ok(payBounds.y + payBounds.height <= dockBounds.y + 1, `Cora must not cover the payment action at ${width}px (payment bottom ${payBounds.y + payBounds.height}, dock top ${dockBounds.y})`);
    assert.equal(await pay.evaluate(e => {
      const b = e.getBoundingClientRect();
      return e.contains(document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2));
    }), true, 'Enlarged payment action remains directly reachable');
    await shot(page, `mobile-text-150-${width}`);
    checks.push(`Mobile ${width}px: five 44px tabs, balance, payment entry/back, main routes, Cora open/close and reachable CTA at 150% content text`);
    await context.close();
  }
  const context = await browser.newContext({ viewport: { width: 390, height: 900 }, reducedMotion: 'reduce' });
  await context.route('**/api/v1/patient/me/overview', async route => {
    const response = await route.fetch(), data = await response.json();
    data.currentEncounter = null; data.dischargeChecklist = [];
    await route.fulfill({ json: data });
  });
  const page = await context.newPage(); listen(page); await mobileLogin(page);
  await page.getByRole('heading', { name: 'No current statement', exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Pay balance', exact: true }).count(), 0);
  await shot(page, 'mobile-empty');
  checks.push('Empty mobile account shows no current statement and has no payment action');
  await context.close();
  assert.deepEqual(errors, []); assert.deepEqual(mutations, []);
  await writeFile(new URL('./results.json', import.meta.url), JSON.stringify({ checks, errors, dashboardMutations: mutations, fixture: 'Loopback synthetic data; no hospital transactions or AI generation.' }, null, 2));
  console.log(JSON.stringify({ checks, errors, dashboardMutations: mutations }, null, 2));
} finally { await browser.close(); }
