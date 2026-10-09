import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const { chromium } = await import('/private/tmp/medcore-visual-tools/node_modules/playwright-core/index.mjs');
const directory = fileURLToPath(new URL('./', import.meta.url));
const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser' });
const results = [], errors = [];
const base = process.env.MEDCORE_ONBOARDING_URL || 'http://127.0.0.1:8086';
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function ready(page) { await page.getByTestId('launch-screen').waitFor({ state: 'hidden' }); }
async function backgroundAndOpen(page) {
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
}
try {
  for (const viewport of [{ width: 320, height: 700 }, { width: 430, height: 932 }, { width: 768, height: 1024 }]) {
    const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.getByTestId('launch-screen').waitFor();
    if (viewport.width === 430) await page.screenshot({ path: `${directory}screenshots/preload.png` });
    await ready(page);
    for (const [index, kind] of ['bill', 'coverage', 'documents'].entries()) {
      const art = page.getByTestId(`onboarding-art-${kind}`);
      await art.waitFor();
      assert.equal(await art.locator('svg').count(), 3);
      const rect = await art.boundingBox();
      assert.ok(rect.x >= -1 && rect.x + rect.width <= viewport.width + 1);
      const motion = await page.getByTestId(`onboarding-art-accent-${kind}`).evaluate(element => getComputedStyle(element).transform);
      await pause(180);
      assert.equal(await page.getByTestId(`onboarding-art-accent-${kind}`).evaluate(element => getComputedStyle(element).transform), motion, 'Reduced-motion artwork must remain still');
      await page.getByRole('button', { name: index === 2 ? 'Get started' : 'Next', exact: true }).scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${directory}screenshots/${kind}-${viewport.width}.png` });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.getByRole('button', { name: index === 2 ? 'Get started' : 'Next', exact: true }).click();
    }
    await page.getByLabel('Email', { exact: true }).fill('preserved@example.test');
    await page.getByLabel('Password', { exact: true }).fill('Synthetic-only123!');
    await backgroundAndOpen(page);
    await page.getByTestId('launch-screen').waitFor();
    await ready(page);
    assert.equal(await page.getByLabel('Email', { exact: true }).inputValue(), 'preserved@example.test');
    assert.equal(await page.getByLabel('Password', { exact: true }).inputValue(), 'Synthetic-only123!');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByTestId('launch-screen').waitFor();
    await ready(page);
    await page.getByRole('heading', { name: 'Sign in to your account' }).waitFor();
    assert.equal(await page.getByTestId('onboarding-art-bill').count(), 0, 'Completed onboarding must not replay on restart');
    results.push({ viewport, svgPages: 3, reducedMotion: 'static', foregroundPreservesForm: true, restartKeepsOnboardingCompletion: true });
    await context.close();
  }
  const context = await browser.newContext({ viewport: { width: 430, height: 932 }, reducedMotion: 'no-preference' });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  const orbit = page.getByTestId('launch-orbit');
  await orbit.waitFor();
  const first = await orbit.evaluate(element => getComputedStyle(element).transform);
  await pause(250);
  assert.notEqual(await orbit.evaluate(element => getComputedStyle(element).transform), first, 'Startup SVG orbit must animate');
  await ready(page);
  for (const kind of ['bill', 'coverage', 'documents']) {
    const accent = page.getByTestId(`onboarding-art-accent-${kind}`);
    await accent.waitFor();
    const before = await accent.evaluate(element => getComputedStyle(element).transform);
    await pause(250);
    assert.notEqual(await accent.evaluate(element => getComputedStyle(element).transform), before, `${kind} SVG layer must animate`);
    if (kind !== 'documents') await page.getByRole('button', { name: 'Next', exact: true }).click();
  }
  const accent = page.getByTestId('onboarding-art-accent-documents');
  await pause(4400);
  const stopped = await accent.evaluate(element => getComputedStyle(element).transform);
  await pause(200);
  assert.equal(await accent.evaluate(element => getComputedStyle(element).transform), stopped, 'Onboarding motion must stop after its brief introduction');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: 'Previous introduction page', exact: true }).click();
  const coverage = page.getByTestId('onboarding-art-accent-coverage');
  const still = await coverage.evaluate(element => getComputedStyle(element).transform);
  await pause(200);
  assert.equal(await coverage.evaluate(element => getComputedStyle(element).transform), still);
  results.push({ liveMotion: 'startup + all three illustrations', limitedOnboardingMotion: true, reducedMotionChange: true });
  await context.close();
  assert.deepEqual(errors, []);
  await writeFile(`${directory}results.json`, JSON.stringify({ results, errors, realDatabaseMutations: 0 }, null, 2));
  console.log(JSON.stringify({ passed: results.length, results, errors }));
} finally { await browser.close(); }
