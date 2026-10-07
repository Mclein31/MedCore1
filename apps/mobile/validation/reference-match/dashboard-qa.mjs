// Inspect actual dashboard components with all API calls intercepted locally.
import { fileURLToPath } from 'node:url';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || '/private/tmp/medcore-visual-tools/node_modules/playwright-core/index.mjs');
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_BROWSER_PATH || '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser' });
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  const p = await context.newPage();
  p.on('console', m => {if(m.type()==='error')console.log('Dashboard console:',m.text().slice(0,400));});
  p.on('requestfailed',r=>console.log('Dashboard request failed:',r.url()));
  p.on('pageerror', e => console.log('Dashboard page error:', e.message));
  await context.route('**/*', route => {
    const path = new URL(route.request().url()).pathname;
    if (!path.startsWith('/api/')) return route.continue();
    const role = path.includes('switch-role');
    return route.fulfill({ status: role ? 403 : 200, contentType: 'application/json', body: JSON.stringify(role ? { error: { message: 'Read-only visual inspection' } } : { items: [], success: true, authenticated: false }) });
  });
  await p.goto('http://127.0.0.1:5174/#/clarify/enc-8812', { waitUntil: 'domcontentloaded' });
  await p.getByRole('heading', { name: 'Pay Now (Demo Multi-Rail)', exact:true }).waitFor({ timeout: 15000 }).catch(async()=>{console.log(JSON.stringify({body:(await p.locator('body').innerText()).slice(0,3000),buttons:await p.getByRole('button').allTextContents()}));await p.screenshot({path:fileURLToPath(new URL('./screenshots/dashboard-patient.png',import.meta.url))});throw Error('Dashboard payment action unavailable');});
  await p.screenshot({ path: fileURLToPath(new URL('./screenshots/dashboard-patient.png', import.meta.url)) });
  await p.getByRole('heading', { name: 'Pay Now (Demo Multi-Rail)', exact:true }).click();
  await p.getByRole('heading', { name: 'Simulated Patient Checkout', exact: true }).waitFor();
  await p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  await p.screenshot({ path: fileURLToPath(new URL('./screenshots/dashboard-payment.png', import.meta.url)) });
  console.log('Dashboard actual payment modal captured with every API call intercepted.');
} finally { await browser.close(); }
