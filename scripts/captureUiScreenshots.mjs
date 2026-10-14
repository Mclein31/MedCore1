// Capture real UI with synthetic loopback data. Run from the project root.
import assert from 'node:assert/strict';
import { copyFile, mkdir, readdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { build } from 'esbuild';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || '/private/tmp/medcore-visual-tools/node_modules/playwright-core/index.mjs');
const output = resolve('UI_SCREENSHOTS');
const dashboardUrl = process.env.MEDCORE_DASHBOARD_UI_URL || 'http://127.0.0.1:5175';
const mobileUrl = process.env.MEDCORE_MOBILE_UI_URL || 'http://127.0.0.1:8084';
const fixtureUrl = 'http://127.0.0.1:8901';
const result = await build({ entryPoints: [resolve('apps/dashboard/src/data/mockData.ts')], bundle: true, write: false, format: 'esm', platform: 'node', alias: { '@': resolve('apps/dashboard/src') } });
const { INITIAL_ENCOUNTERS } = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
const encounters = INITIAL_ENCOUNTERS.slice(0, 6).map((enc, i) => ({ ...enc, patient: { ...enc.patient, fullName: `Sample Patient ${i + 1}`, maskedName: `Sample Patient ${i + 1}` } }));
const user = { id: 'screenshot-staff', facilityId: 'screenshot-facility', facilityName: 'Sample Medical Center', fullName: 'Alex Rivera', email: 'staff@example.test', title: 'Billing specialist', role: 'BILLING_SPECIALIST' };
const files = [], errors = [], dashboardMutations = [];
const previousManifest = await readFile(resolve(output, 'manifest.json'), 'utf8').then(text => JSON.parse(text)).catch(() => ({}));
const previousFiles = previousManifest.files || [];
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_BROWSER_PATH || '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser' });
let currentPage;
function listen(page) { currentPage = page; page.on('pageerror', error => errors.push(error.message)); }
async function settle(page) {
  await page.waitForLoadState('networkidle', { timeout: 10000 });
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}
async function screenshot(page, name) {
  const target = resolve(output, `${name}.png`);
  await mkdir(resolve(target, '..'), { recursive: true });
  await page.screenshot({ path: target });
  files.push(`${name}.png`);
  console.log(`Captured ${name}`);
  await writeFile(resolve(output, 'manifest.json'), JSON.stringify({ files, pageErrors: errors, dashboardMutations, complete: false }, null, 2));
}
// Internal app scroll views require additional viewport captures; browser fullPage alone omits them.
async function capture(page, name, scroll = true) {
  await settle(page);
  assert.equal(await page.getByRole('heading', { name: 'Application Error', exact: true }).count(), 0);
  const container = scroll ? await page.evaluateHandle(() => {
    const visible = [...document.querySelectorAll('*')].filter(e => {
      const b = e.getBoundingClientRect(), s = getComputedStyle(e);
      return b.width > 220 && b.height > 180 && b.bottom > 0 && b.top < innerHeight && b.right > 0 && b.left < innerWidth && !e.closest('[aria-hidden="true"]') && s.visibility !== 'hidden' && /auto|scroll/.test(s.overflowY) && e.scrollHeight > e.clientHeight + 45;
    });
    return visible.sort((a, b) => b.clientHeight * b.clientWidth - a.clientHeight * a.clientWidth)[0] || null;
  }) : null;
  const element = container?.asElement();
  if (element) await element.evaluate(e => { e.scrollTop = 0; });
  await screenshot(page, name);
  if (element) {
    const dimensions = await element.evaluate(e => ({ height: e.clientHeight, total: e.scrollHeight }));
    for (let i = 1; i <= Math.min(8, Math.ceil((dimensions.total - dimensions.height) / (dimensions.height - 60))); i++) {
      await element.evaluate((e, i) => { e.scrollTop = i * (e.clientHeight - 60); }, i);
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
      await screenshot(page, `${name}-scroll-${String(i).padStart(2, '0')}`);
    }
    await element.evaluate(e => { e.scrollTop = 0; });
  }
  await container?.dispose();
}
async function dashboardRoutes() {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  let authenticated = false;
  await context.route('**/*', route => {
    const request = route.request(), path = new URL(request.url()).pathname;
    if (!path.startsWith('/api/')) return route.continue();
    if (path.endsWith('/view-bill')) return route.fulfill({ status: 200, json: { success: true, encounter: encounters[0] } });
    if (request.method() !== 'GET' && !path.includes('/ai/')) {
      dashboardMutations.push(path);
      return route.fulfill({ status: 403, json: { error: { message: 'Screenshot fixture is read-only.' } } });
    }
    if (path.includes('/ai/')) return route.fulfill({ status: 503, json: { error: { message: 'AI is unavailable in this synthetic screenshot fixture.' } } });
    if (path.endsWith('/esoa-xml')) return route.fulfill({ status: 200, contentType: 'application/xml', body: '<?xml version="1.0" encoding="UTF-8"?>\n<eSOA><Facility>Sample Medical Center</Facility><Encounter>ENC-SAMPLE-001</Encounter><Notice>Synthetic screenshot fixture</Notice></eSOA>' });
    const data = path.endsWith('/auth/me') ? { authenticated, user: authenticated ? user : null }
      : path.endsWith('/encounters') ? { items: encounters, total: encounters.length }
      : path.endsWith('/notifications') ? { notifications: [], unreadCount: 0 }
      : { items: [], total: 0 };
    return route.fulfill({ status: 200, json: data });
  });
  const page = await context.newPage(); listen(page);
  await page.goto(dashboardUrl, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /Sign in/i }).first().waitFor();
  await capture(page, 'dashboard/00-login');
  authenticated = true;
  await page.reload({ waitUntil: 'networkidle' });
  const sidebar = page.getByRole('complementary', { name: 'Workspace navigation' });
  const routes = [
    ['Overview', '01-overview', 'Overview'],
    ['Discharge Clearance', '02-discharge-clearance', 'Discharge Clearance Mission Control'],
    ['Encounters & Ledgers', '03-encounters-ledgers', 'Encounters & Ledgers'],
    ['Approvals & Disputes', '04-approvals-disputes', 'Payer Approvals & Billing Disputes'],
    ['Claims & eSOA XML', '05-claims-esoa', 'Claims & eSOA XML Pre-Flight Scrubber'],
    ['RCM Analytics', '06-rcm-analytics', 'RCM Analytics & Hospital Financial Intelligence'],
    ['Settings & Rules', '07-settings-rules', 'System Settings & Rule Engines']
  ];
  for (const [label, file, heading] of routes) {
    await sidebar.getByRole('button', { name: label, exact: true }).click();
    await page.getByRole('heading', { name: heading, exact: true }).waitFor();
    await capture(page, `dashboard/${file}`);
    if (label === 'Discharge Clearance') {
      await page.getByRole('tab', { name: '6-Stage Pipeline', exact: true }).click();
      // The six-stage board needs a wider editorial viewport to show every column at once.
      await page.setViewportSize({ width: 1920, height: 1000 });
      await capture(page, 'dashboard/02b-discharge-pipeline');
      await page.setViewportSize({ width: 1440, height: 1000 });
    }
    if (label === 'Encounters & Ledgers') {
      await page.getByRole('tab', { name: 'Pre-admission cost estimator', exact: true }).click();
      await capture(page, 'dashboard/03b-pre-admission-estimator');
    }
    if (label === 'Approvals & Disputes') {
      await page.getByRole('tab', { name: 'HMO Gateway Roster', exact: true }).click();
      await page.getByRole('heading', { name: 'Coverage, Approvals & Payer Coordination', exact: true }).waitFor();
      await capture(page, 'dashboard/04b-hmo-gateway-roster');
      await page.getByRole('tab', { name: 'Disputes & Promissory', exact: true }).click();
      await page.getByRole('heading', { name: 'Disputes, Exceptions & Promissory Desk', exact: true }).waitFor();
      await capture(page, 'dashboard/04c-disputes-promissory');
    }
  }
  await context.close();
}
async function mobileRoutes() {
  const context = await browser.newContext({ viewport: { width: 390, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  // Populate read-only claims/updates so these list screens can be reviewed with content.
  await context.route('**/api/v1/patient/me/claims', route => route.fulfill({ json: { items: [{ id: 'claim-sample', kind: 'PHILHEALTH', status: 'APPROVED', reference: 'CLAIM-SAMPLE-001', totalCaseRate: 20000, submittedAt: '2026-10-06T08:00:00Z', encounterNumber: 'ENC-TEST-001', needsAttention: false }], total: 1 } }));
  await context.route('**/api/v1/patient/me/notifications', route => route.fulfill({ json: { items: [{ id: 'notice-sample', title: 'Your bill is ready for review', message: 'Coverage has been applied. Review your balance and payment options.', timestamp: '2026-10-12T08:00:00Z', encounterNumber: 'ENC-TEST-001', type: 'BILL' }], total: 1, pushSupported: false } }));
  const page = await context.newPage(); listen(page);
  await context.request.get(`${fixtureUrl}/__control?reset=1`);
  await page.goto(mobileUrl, { waitUntil: 'domcontentloaded' });
  await page.addStyleTag({ content: '.__expo_fast_refresh { display: none !important; }' });
  await page.getByTestId('launch-screen').waitFor();
  await screenshot(page, 'mobile/00-launch');
  const introductions = [
    ['Understand your hospital bill', '01-onboarding-bill'],
    ['Keep track of your coverage', '02-onboarding-coverage'],
    ['Keep your records in one place', '03-onboarding-documents']
  ];
  for (let i = 0; i < introductions.length; i++) {
    // The existing screen owns the heading; Next/Get started identifies each stage.
    await page.getByRole('button', { name: i === 2 ? 'Get started' : 'Next', exact: true }).waitFor();
    await capture(page, `mobile/${introductions[i][1]}`);
    await page.getByRole('button', { name: i === 2 ? 'Get started' : 'Next', exact: true }).click();
  }
  await page.getByRole('heading', { name: 'Sign in to your account', exact: true }).waitFor();
  await capture(page, 'mobile/04-login');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await capture(page, 'mobile/05-create-account');
  await page.getByRole('button', { name: 'Back to sign in', exact: true }).click();
  await page.getByRole('button', { name: 'Forgot password', exact: true }).click();
  await capture(page, 'mobile/06-account-recovery');
  await page.getByRole('button', { name: 'Back to sign in', exact: true }).click();
  await page.getByLabel('Email', { exact: true }).fill('patient@example.test');
  await page.getByLabel('Password', { exact: true }).fill('Synthetic-only123!');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByRole('heading', { name: 'Alex Rivera', exact: true }).waitFor();
  for (const [name, file] of [['Home', '07-home'], ['Bill', '08-bill'], ['Coverage', '09-coverage'], ['Payments', '10-payments'], ['Profile', '11-profile']]) {
    await page.getByRole('tab', { name, exact: true }).click();
    await capture(page, `mobile/${file}`);
  }
  await page.getByRole('tab', { name: 'Home', exact: true }).click();
  await page.getByRole('button', { name: /^Insurance claims,/ }).click();
  await page.getByText('CLAIM-SAMPLE-001', { exact: true }).waitFor();
  await capture(page, 'mobile/12-insurance-claims');
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await page.getByRole('button', { name: 'Documents', exact: true }).click();
  await page.getByRole('button', { name: /^Statement of account,/ }).waitFor();
  await capture(page, 'mobile/13-documents');
  await page.getByRole('button', { name: /^Statement of account,/ }).click();
  await page.getByRole('heading', { name: 'Hospital record', exact: true }).waitFor();
  await capture(page, 'mobile/14-hospital-record');
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await page.getByRole('button', { name: /^Open notifications/ }).click();
  await page.getByText('Your bill is ready for review', { exact: true }).waitFor();
  await capture(page, 'mobile/15-hospital-updates');
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await page.getByRole('button', { name: 'Ask Cora AI', exact: true }).click();
  await page.getByRole('button', { name: 'Close Cora assistant', exact: true }).waitFor();
  await capture(page, 'mobile/16-cora-assistant', false);
  await page.getByRole('button', { name: 'Close Cora assistant', exact: true }).click();
  await paymentScreens(page);
  await context.close();
}
async function startPayment(page, amount = '500.05', captureAmount = false) {
  await page.getByRole('tab', { name: 'Home', exact: true }).click();
  await page.getByRole('button', { name: 'Pay balance', exact: true }).click();
  await page.getByRole('button', { name: 'Continue to payment method', exact: true }).waitFor();
  if (captureAmount) await capture(page, 'mobile/payment-flow/01-amount');
  await page.getByRole('radio', { name: 'Partial amount', exact: true }).click();
  await page.getByLabel('Amount in pesos', { exact: true }).fill(amount);
  await page.getByRole('button', { name: 'Continue to payment method', exact: true }).click();
  await page.getByRole('heading', { name: 'Payment methods', exact: true }).waitFor();
}
async function paymentScreens(page) {
  await startPayment(page, '500.05', true);
  await capture(page, 'mobile/payment-flow/02-methods');
  await page.getByRole('radio', { name: /^QR Ph,/ }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('img', { name: 'QR Ph payment QR code', exact: true }).waitFor();
  await capture(page, 'mobile/payment-flow/03-qr-ph');
  await page.getByRole('button', { name: 'Review payment', exact: true }).click();
  await capture(page, 'mobile/payment-flow/04-qr-review');
  await page.getByRole('button', { name: /^Confirm payment ·/ }).click();
  await page.getByRole('heading', { name: 'Confirming your payment', exact: true }).waitFor();
  await screenshot(page, 'mobile/payment-flow/05-processing');
  await page.getByRole('button', { name: 'View Receipt', exact: true }).waitFor();
  await capture(page, 'mobile/payment-flow/06-success');
  await page.getByRole('button', { name: 'View Receipt', exact: true }).click();
  await capture(page, 'mobile/payment-flow/07-receipt');
  await page.getByRole('button', { name: 'Payment history', exact: true }).click();
  await capture(page, 'mobile/10b-payments-recorded');
  for (const [name, key] of [['GCash', '08-gcash'], ['Maya', '09-maya'], ['Debit / Credit', '10-card'], ['Bank Transfer', '11-bank'], ['RA 9439 Note', '12-payment-plan']]) {
    await startPayment(page, '50.05');
    await page.getByRole('radio', { name: new RegExp(`^${name},`) }).click();
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await capture(page, `mobile/payment-flow/${key}-details`);
    if (name === 'GCash' || name === 'Maya') {
      await page.getByLabel('Payer name', { exact: true }).fill('Alex Rivera');
      await page.getByRole('button', { name: 'Review payment', exact: true }).click();
    } else if (name === 'Debit / Credit') {
      await page.getByLabel('Card number', { exact: true }).fill('4111111111111111');
      await page.getByLabel('Expiration date', { exact: true }).fill('12/30');
      await page.getByLabel('CVV', { exact: true }).fill('123');
      await page.getByLabel('Cardholder name', { exact: true }).fill('Alex Rivera');
      await page.getByRole('button', { name: 'Review payment', exact: true }).click();
    } else if (name === 'Bank Transfer') {
      await page.getByRole('radio', { name: 'BDO', exact: true }).click();
      await page.getByLabel('Payer name', { exact: true }).fill('Alex Rivera');
      await page.getByRole('button', { name: 'Review payment', exact: true }).click();
    } else {
      await page.getByLabel('PhilSys card number (PCN)', { exact: true }).fill('1234567890123456');
      await page.getByRole('checkbox', { name: 'Acknowledge repayment terms', exact: true }).click();
      await page.getByRole('button', { name: 'Review payment plan', exact: true }).click();
    }
    await page.getByRole('heading', { name: 'Review payment', exact: true }).waitFor();
    await capture(page, `mobile/payment-flow/${key}-review`);
    if (name === 'RA 9439 Note') {
      await page.getByRole('button', { name: 'Confirm payment plan', exact: true }).click();
      await page.getByRole('heading', { name: 'Payment plan recorded', exact: true }).waitFor();
      await capture(page, 'mobile/payment-flow/13-payment-plan-recorded');
      await page.getByRole('button', { name: 'View payments', exact: true }).click();
    } else {
      const count = 4;
      for (let i = 0; i < count; i++) await page.getByRole('button', { name: 'Back', exact: true }).first().click();
    }
  }
  await page.getByRole('tab', { name: 'Home', exact: true }).click();
  await page.getByRole('button', { name: 'Documents', exact: true }).click();
  await page.getByRole('button', { name: /^OR-TEST-1,/ }).waitFor();
  await capture(page, 'mobile/13b-documents-with-receipt');
  await page.getByRole('button', { name: /^OR-TEST-1,/ }).click();
  await capture(page, 'mobile/17-historical-receipt');
}
try {
  await dashboardRoutes();
  await mobileRoutes();
  assert.deepEqual(errors, []);
  assert.deepEqual(dashboardMutations, []);
  for (const file of previousFiles) if (!files.includes(file) && /^(dashboard|mobile)\/[a-z0-9/.-]+\.png$/.test(file)) await unlink(resolve(output, file)).catch(() => {});
  await unlink(resolve(output, 'capture-diagnostic.png')).catch(() => {});
  const retainedAiFiles = (await readdir(resolve(output, 'ai')).catch(() => []))
    .filter(file => file.endsWith('.png')).sort().map(file => `ai/${file}`);
  const allFiles = [...files, ...retainedAiFiles];
  const aiDemonstrations = retainedAiFiles.length ? { source: 'Authentic generated-output captures retained from the previous AI capture run; this synthetic UI screenshot run does not generate AI output.', features: ['Cora billing assistant', 'Benefit card OCR', 'HMO appeal drafting', 'Claims pre-flight audit', 'Executive RCM briefing'] } : undefined;
  const screenshotManifest = { complete: true, capturedAt: new Date().toISOString(), dashboardViewport: '1440×1000', dashboardPipelineViewport: '1920×1000', mobileViewport: '390×900', files: allFiles, pageErrors: errors, dashboardMutations, data: 'Synthetic local fixture. One local simulated payment and note for completion/receipt screenshots. No hospital or real gateway access.', ...(aiDemonstrations ? { aiDemonstrations } : {}) };
  await writeFile(resolve(output, 'manifest.json'), JSON.stringify(screenshotManifest, null, 2));
  const index = ['# Dashboard and mobile screenshots', '', 'Current UI captured with synthetic data. Dashboard: 1440×1000; the six-stage pipeline uses a wide 1920×1000 capture so all stages are visible. Mobile web: 390×900.', '', 'Long screens include numbered scroll captures. Mobile images are browser renders of the React Native app, not physical-device captures.', '', '## Dashboard', '', ...files.filter(f => f.startsWith('dashboard/')).map(f => `- [${f.split('/').at(-1)}](${f})`), '', '## Mobile', '', ...files.filter(f => f.startsWith('mobile/')).map(f => `- [${f.replace('mobile/', '')}](${f})`), '', ...(retainedAiFiles.length ? ['## AI output captures', '', 'These authentic generated-output captures are retained from the previous AI capture run; this synthetic screenshot run does not generate new AI output.', '', ...retainedAiFiles.map(f => `- [${f.replace('ai/', '')}](${f})`), ''] : []), '## Recorded walkthroughs', '', '- [Dashboard walkthrough](recordings/dashboard-walkthrough.webm)', '- [Mobile walkthrough](recordings/mobile-walkthrough.webm)', '', 'Record the current UI with `node scripts/recordUiWalkthroughs.mjs`. Both captures use synthetic local data.', '', 'Reproduce the screenshots with `node scripts/captureUiScreenshots.mjs` while the synthetic fixture and local previews are running on ports 8901, 5175, and 8084. See `apps/mobile/validation/apple-ui/README.md` for startup commands.', ''];
  await writeFile(resolve(output, 'README.md'), index.join('\n'));
  const portableAssets = resolve('docs/media/assets/ui');
  for (const file of allFiles) {
    const target = resolve(portableAssets, file);
    await mkdir(resolve(target, '..'), { recursive: true });
    await copyFile(resolve(output, file), target);
  }
  await writeFile(resolve(portableAssets, 'manifest.json'), JSON.stringify(screenshotManifest, null, 2));
  await writeFile(resolve(portableAssets, 'README.md'), index.join('\n').replaceAll('](recordings/', '](../../../../UI_SCREENSHOTS/recordings/'));
  console.log(JSON.stringify({ complete: true, images: allFiles.length, dashboard: files.filter(f => f.startsWith('dashboard/')).length, mobile: files.filter(f => f.startsWith('mobile/')).length, retainedAi: retainedAiFiles.length, pageErrors: errors }, null, 2));
} catch (error) {
  if (currentPage && !currentPage.isClosed()) {
    console.log('Capture state:', (await currentPage.locator('body').innerText()).slice(0, 2400));
    await currentPage.screenshot({ path: resolve(output, 'capture-diagnostic.png') });
  }
  throw error;
} finally { await browser.close(); }
