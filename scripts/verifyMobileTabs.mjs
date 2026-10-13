import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const output = resolve('docs/validation/ui-polish/navigation');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_BROWSER_PATH || '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser' });
const checks = [], errors = [];
try {
  for (const width of [320, 390, 430, 768, 844]) {
    const context = await browser.newContext({ viewport: { width, height: width === 844 ? 390 : 900 }, reducedMotion: width === 390 ? 'no-preference' : 'reduce' });
    await context.route('**/*', route => ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
    const p = await context.newPage(); p.on('pageerror', e => errors.push(e.message));
    await context.request.get('http://127.0.0.1:8901/__control?reset=1');
    await p.goto(process.env.MEDCORE_MOBILE_UI_URL || 'http://127.0.0.1:8084', { waitUntil: 'domcontentloaded' });
    await p.getByRole('button', { name: 'Skip introduction', exact: true }).click();
    await p.getByLabel('Email', { exact: true }).fill('patient@example.test');
    await p.getByLabel('Password', { exact: true }).fill('Synthetic-only123!');
    await p.getByRole('button', { name: 'Sign in', exact: true }).click();
    await p.getByRole('heading', { name: 'Alex Rivera', exact: true }).waitFor();
    const names = ['Home', 'Bill', 'Coverage', 'Payments', 'Profile'];
    for (const name of names) {
      const tab = p.getByRole('tab', { name, exact: true });
      await tab.click(); await p.waitForTimeout(220);
      assert.equal(await p.getByTestId('active-tab-label').count(), 1);
      assert.equal(await p.getByTestId('active-tab-label').innerText(), name);
      assert.equal(await tab.getAttribute('aria-selected'), 'true');
      for (const label of names) {
        const item = p.getByRole('tab', { name: label, exact: true }), b = await item.boundingBox();
        assert.ok(b.width >= 48 && b.height >= 48 && b.x >= 0 && b.x + b.width <= width + 1, `${label} target at ${width}`);
        assert.equal((await item.innerText()).trim(), name === label ? name : '', 'Only the selected tab has visible text');
      }
      const bar = p.getByTestId('mobile-tab-bar');
      await p.screenshot({ path: resolve(output, `${name.toLowerCase()}-${width}.png`) });
      await bar.screenshot({ path: resolve(output, `bar-${name.toLowerCase()}-${width}.png`) });
    }
    // Routes change immediately while previous visual transitions are still running.
    for (const name of ['Home', 'Coverage', 'Bill', 'Profile', 'Payments']) await p.getByRole('tab', { name, exact: true }).dispatchEvent('click');
    await p.waitForTimeout(220);
    assert.equal(await p.getByTestId('active-tab-label').innerText(), 'Payments');
    const home = p.getByRole('tab', { name: 'Home', exact: true });
    await home.focus(); await p.keyboard.press('Enter');
    await p.waitForTimeout(220);
    assert.equal(await p.getByTestId('active-tab-label').innerText(), 'Home');
    await p.keyboard.press('ArrowRight');
    await p.waitForTimeout(220);
    assert.equal(await p.getByTestId('active-tab-label').innerText(), 'Bill');
    assert.equal(await p.getByRole('tab', { name: 'Bill', exact: true }).evaluate(element => element === document.activeElement), true);
    await p.keyboard.press('End');
    await p.waitForTimeout(220);
    assert.equal(await p.getByTestId('active-tab-label').innerText(), 'Profile');
    if (width !== 390) {
      assert.equal(await home.evaluate(e => getComputedStyle(e.parentElement).transitionDuration), '0s');
      assert.equal(await p.getByTestId('active-tab-label').evaluate(e => getComputedStyle(e).opacity), '1');
    }
    checks.push({ width, selectedLabelOnly: true, fiveNamedTabs: true, minimumTarget: 48, rapidSwitch: true, keyboard: true, reducedMotion: width !== 390 });
    await context.close();
  }
  assert.deepEqual(errors, []);
} finally {
  await writeFile(resolve(output, 'results.json'), JSON.stringify({ checks, errors, fixture: 'Loopback synthetic data; no hospital writes or AI calls.' }, null, 2));
  await browser.close();
}
console.log(JSON.stringify({ checks, errors }, null, 2));
