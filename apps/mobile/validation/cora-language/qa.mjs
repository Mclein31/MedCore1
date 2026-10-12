import assert from 'node:assert/strict';
import { mkdir, writeFile, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || '/private/tmp/medcore-visual-tools/node_modules/playwright-core/index.mjs');
const output = fileURLToPath(new URL('./screenshots/', import.meta.url));
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_BROWSER_PATH || '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser' });
const results = [], errors = [];
async function screenshot(page, name) { await page.screenshot({ path: `${output}${name}.png` }); }
async function ready(page) {
  await page.goto('http://127.0.0.1:8084', { waitUntil: 'domcontentloaded' });
  await page.addStyleTag({ content: '.__expo_fast_refresh { display: none !important; }' });
  await page.getByRole('button', { name: 'Skip introduction', exact: true }).click();
  await page.getByLabel('Email', { exact: true }).fill('patient@example.test');
  await page.getByLabel('Password', { exact: true }).fill('Synthetic-only123!');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByRole('button', { name: 'Ask Cora AI', exact: true }).click();
  await page.getByRole('radio', { name: 'Reply in English', exact: true }).click();
}
const answers = { en: 'Your remaining balance is ₱18,450.00.', tl: 'Ang natitirang bayarin mo ay ₱18,450.00.', fil: 'Your remaining balance ay ₱18,450.00 after the recorded payments.', ilo: 'Ti nabati a bayadam ket ₱18,450.00.' };
try {
  for (const [width, reduced] of [[390, 'no-preference'], [320, 'reduce']]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: reduced });
    const requests = [];
    await context.route('**/api/v1/ai/cora/chat', async route => {
      const body = route.request().postDataJSON();
      await new Promise(resolve => requests.push({ body, resolve }));
      await route.fulfill({ status: 200, json: { language: body.language, reply: answers[body.language], scopeDecision: 'ANSWERED', suggestedActions: [], mode: 'GENERAL' } }).catch(() => {});
    });
    const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
    await ready(page);
    assert.equal(await page.getByRole('radio', { name: /^Reply in/ }).count(), 4);
    await page.getByPlaceholder('Ask Cora about your hospital bill…').fill('Bakit may balance pa ako?');
    await page.getByRole('button', { name: 'Send question to Cora', exact: true }).click();
    await page.getByRole('progressbar', { name: 'Cora is typing', exact: true }).waitFor();
    assert.equal(await page.getByTestId('cora-typing').locator('[data-testid^="cora-typing-dot-"]').count(), 3);
    const dot = page.getByTestId('cora-typing-dot-0');
    const before = await dot.evaluate(e => getComputedStyle(e).opacity);
    await page.waitForTimeout(230);
    const after = await dot.evaluate(e => getComputedStyle(e).opacity);
    if (reduced === 'reduce') assert.equal(before, after); else assert.notEqual(before, after);
    await screenshot(page, `typing-english-${width}`);
    assert.equal(requests[0].body.language, 'en');
    await page.getByRole('radio', { name: 'Reply in Tagalog', exact: true }).click();
    await page.getByPlaceholder('Magtanong tungkol sa iyong bayarin sa ospital…').fill('Explain my balance.');
    await page.getByRole('button', { name: 'Send question to Cora', exact: true }).click();
    await page.getByRole('progressbar', { name: 'Sumasagot si Cora', exact: true }).waitFor();
    requests[0].resolve();
    await page.waitForTimeout(150);
    assert.ok(await page.getByTestId('cora-typing').count());
    await screenshot(page, `typing-tagalog-${width}`);
    assert.equal(requests[1].body.language, 'tl'); requests[1].resolve();
    await page.getByText(answers.tl, { exact: true }).waitFor();
    assert.equal(await page.getByTestId('cora-typing').count(), 0);
    assert.equal(await page.getByText(answers.en, { exact: true }).count(), 0);
    await screenshot(page, `answer-tagalog-${width}`);
    await page.getByRole('radio', { name: 'Reply in Taglish', exact: true }).click();
    await page.getByPlaceholder('Magtanong kay Cora tungkol sa billing…').fill('Why that amount?');
    await page.getByRole('button', { name: 'Send question to Cora', exact: true }).click();
    await page.getByRole('progressbar', { name: 'Typing si Cora', exact: true }).waitFor();
    await page.waitForTimeout(50); assert.equal(requests[2].body.language, 'fil');
    assert.ok(requests[2].body.conversation.some(turn => turn.content === answers.tl));
    requests[2].resolve(); await page.getByText(answers.fil, { exact: true }).waitFor();
    await page.getByText(answers.fil, { exact: true }).scrollIntoViewIfNeeded();
    await screenshot(page, `answer-taglish-${width}`);
    await page.getByRole('radio', { name: 'Reply in English', exact: true }).click();
    await page.getByRole('button', { name: 'Close Cora assistant', exact: true }).click();
    await page.getByRole('tab', { name: 'Bill', exact: true }).click();
    await page.getByRole('button', { name: 'Explain My Bill with Cora AI', exact: true }).click();
    await page.getByRole('progressbar', { name: 'Cora is typing', exact: true }).waitFor();
    await page.waitForTimeout(50); assert.equal(requests[3].body.language, 'en');
    requests[3].resolve(); await page.getByText(answers.en, { exact: true }).waitFor();
    await screenshot(page, `bill-window-english-${width}`);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    results.push({ width, reducedMotion: reduced, fourLanguageChoices: true, englishRequestWithTagalogQuestion: true, languageSwitchCancelsOldReply: true, historyPreserved: true, choiceSharedWithBill: true, typingDots: 3, pulseObserved: reduced === 'no-preference', staticWhenReduced: reduced === 'reduce' });
    await context.close();
  }
  assert.deepEqual(errors, []);
  await writeFile(new URL('./results.json', import.meta.url), JSON.stringify({ syntheticUIResponsesOnly: true, results, errors }, null, 2));
  await copyFile(`${output}answer-taglish-390.png`, 'UI_SCREENSHOTS/mobile/16-cora-assistant.png');
  console.log(JSON.stringify({ results, errors }, null, 2));
} finally { await browser.close(); }
