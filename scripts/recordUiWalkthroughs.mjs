// Record current dashboard and mobile UI walkthroughs with synthetic, local-only data.
import assert from 'node:assert/strict';
import { mkdir, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { build } from 'esbuild';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || '/private/tmp/medcore-visual-tools/node_modules/playwright-core/index.mjs');
const output = resolve('UI_SCREENSHOTS/recordings');
const temp = resolve(output, '.tmp');
const dashboardUrl = process.env.MEDCORE_DASHBOARD_UI_URL || 'http://127.0.0.1:5175';
const mobileUrl = process.env.MEDCORE_MOBILE_UI_URL || 'http://127.0.0.1:8084';
const fixtureUrl = 'http://127.0.0.1:8901';
await mkdir(temp, { recursive: true });
const bundle = await build({
  entryPoints: [resolve('apps/dashboard/src/data/mockData.ts')], bundle: true, write: false,
  format: 'esm', platform: 'node', alias: { '@': resolve('apps/dashboard/src') }
});
const { INITIAL_ENCOUNTERS } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const encounters = INITIAL_ENCOUNTERS.slice(0, 6).map((enc, i) => ({
  ...enc, patient: { ...enc.patient, fullName: `Sample Patient ${i + 1}`, maskedName: `Sample Patient ${i + 1}` }
}));
const user = { id: 'walkthrough-staff', facilityId: 'walkthrough-facility', facilityName: 'Sample Medical Center', fullName: 'Alex Rivera', email: 'staff@example.test', title: 'Billing specialist', role: 'BILLING_SPECIALIST' };
const errors = [];
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_BROWSER_PATH || '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser' });

async function smoothScroll(page, dx, dy, steps = 8) {
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(dx / steps, dy / steps);
    await page.waitForTimeout(110);
  }
  await page.waitForTimeout(500);
}

async function recordDashboard() {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, recordVideo: { dir: temp, size: { width: 1440, height: 900 } } });
  let authenticated = true;
  await context.route('**/*', route => {
    const request = route.request(), path = new URL(request.url()).pathname;
    if (!path.startsWith('/api/')) return route.continue();
    if (path.endsWith('/view-bill')) return route.fulfill({ status: 200, json: { success: true, encounter: encounters[0] } });
    if (path.includes('/ai/')) return route.fulfill({ status: 503, json: { error: { message: 'AI is unavailable in this synthetic walkthrough.' } } });
    if (request.method() !== 'GET') return route.fulfill({ status: 403, json: { error: { message: 'Walkthrough fixture is read-only.' } } });
    const data = path.endsWith('/auth/me') ? { authenticated, user }
      : path.endsWith('/encounters') ? { items: encounters, total: encounters.length }
      : path.endsWith('/notifications') ? { notifications: [], unreadCount: 0 }
      : { items: [], total: 0 };
    return route.fulfill({ status: 200, json: data });
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(dashboardUrl, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'Overview', exact: true }).waitFor();
  await page.waitForTimeout(700);
  await smoothScroll(page, 0, 440);
  await smoothScroll(page, 0, -440);
  await page.getByRole('complementary', { name: 'Workspace navigation' }).getByRole('button', { name: 'Discharge Clearance', exact: true }).click();
  await page.getByRole('heading', { name: 'Discharge Clearance Mission Control', exact: true }).waitFor();
  await page.waitForTimeout(700);
  await page.getByRole('tab', { name: '6-Stage Pipeline', exact: true }).click();
  await page.waitForTimeout(500);
  await smoothScroll(page, 420, 0, 7);
  await smoothScroll(page, 0, 460, 7);
  const video = page.video();
  await context.close();
  assert.ok(video);
  return video.path();
}

async function recordMobile() {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, recordVideo: { dir: temp, size: { width: 390, height: 844 } } });
  await context.route('**/api/v1/patient/me/claims', route => route.fulfill({ json: { items: [], total: 0 } }));
  await context.route('**/api/v1/patient/me/notifications', route => route.fulfill({ json: { items: [], total: 0, pushSupported: false } }));
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await context.request.get(`${fixtureUrl}/__control?reset=1`);
  await page.goto(mobileUrl, { waitUntil: 'domcontentloaded' });
  await page.addStyleTag({ content: '.__expo_fast_refresh { display: none !important; }' });
  await page.getByRole('button', { name: 'Skip introduction', exact: true }).click();
  await page.getByLabel('Email', { exact: true }).fill('patient@example.test');
  await page.getByLabel('Password', { exact: true }).fill('Synthetic-only123!');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByRole('tab', { name: 'Home', exact: true }).waitFor();
  await page.getByRole('heading', { name: 'Alex Rivera', exact: true }).waitFor();
  await page.waitForTimeout(700);
  await smoothScroll(page, 0, 460);
  await smoothScroll(page, 0, -460);
  await page.getByRole('tab', { name: 'Bill', exact: true }).click();
  await page.waitForTimeout(500);
  await smoothScroll(page, 0, 360);
  await smoothScroll(page, 0, -360);
  await page.getByRole('button', { name: 'Explain My Bill with Cora AI', exact: true }).click();
  await page.getByRole('button', { name: 'Close Cora assistant', exact: true }).waitFor();
  await page.waitForTimeout(900);
  await page.getByRole('button', { name: 'Close Cora assistant', exact: true }).click();
  await page.getByRole('tab', { name: 'Coverage', exact: true }).click();
  await page.waitForTimeout(400);
  await smoothScroll(page, 0, 420);
  const video = page.video();
  await context.close();
  assert.ok(video);
  return video.path();
}

try {
  await rm(temp, { recursive: true, force: true });
  await mkdir(temp, { recursive: true });
  const dashboardVideo = await recordDashboard();
  const mobileVideo = await recordMobile();
  assert.deepEqual(errors, []);
  const dashboardTarget = resolve(output, 'dashboard-walkthrough.webm');
  const mobileTarget = resolve(output, 'mobile-walkthrough.webm');
  await rename(dashboardVideo, dashboardTarget);
  await rename(mobileVideo, mobileTarget);
  const recordings = [];
  for (const file of [dashboardTarget, mobileTarget]) {
    const info = await stat(file);
    assert.ok(info.size > 10_000, `Recording is unexpectedly small: ${file}`);
    recordings.push({ file: file.replace(`${resolve('UI_SCREENSHOTS')}/`, ''), bytes: info.size });
  }
  await writeFile(resolve('UI_SCREENSHOTS/recordings/manifest.json'), JSON.stringify({
    complete: true, recordedAt: new Date().toISOString(), format: 'WebM / VP9',
    source: 'Current app UI rendered in headless Chromium with synthetic local data; no patient or payer systems accessed.',
    dashboardViewport: '1440×900', mobileViewport: '390×844', pageErrors: errors, recordings
  }, null, 2));
  console.log(JSON.stringify({ complete: true, recordings, pageErrors: errors }, null, 2));
} finally {
  await rm(temp, { recursive: true, force: true });
  await browser.close();
}
