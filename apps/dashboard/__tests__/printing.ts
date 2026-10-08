import assert from 'node:assert/strict';
import { PrintService, getPrintOrientation } from '../src/services/printEngine';
const domModule = process.env.MEDCORE_DOM_MODULE || '/private/tmp/medcore-visual-tools/node_modules/jsdom/lib/api.js';
const { JSDOM } = await import(domModule);
const dom = new JSDOM('<div id="medcore-print-root"></div>');
Object.defineProperty(globalThis, 'window', { value: dom.window, configurable: true });
Object.defineProperty(globalThis, 'document', { value: dom.window.document, configurable: true });
const media = new dom.window.EventTarget();
Object.assign(media, { matches: false, media: 'print' });
dom.window.matchMedia = () => media;
const wait = (ms = 30) => new Promise(resolve => setTimeout(resolve, ms));
const first = { type: 'COVERAGE_APPROVALS_REPORT' as const, data: {} };
const second = { type: 'OFFICIAL_RECEIPT' as const, data: {} };
let passed = 0;
async function check(name: string, fn: () => Promise<void> | void) { await fn(); passed++; console.log(`[PASS] ${name}`); }
try {
  await check('A4 orientation selects wide reports while permitting portrait override', () => {
    assert.equal(getPrintOrientation(first), 'landscape');
    assert.equal(getPrintOrientation(second), 'portrait');
    assert.equal(getPrintOrientation({ type: 'EXECUTIVE_RCM_REPORT', data: {} }), 'portrait');
    assert.equal(getPrintOrientation({ ...first, orientation: 'portrait' }), 'portrait');
  });
  await check('non-blocking print preview survives the old two-second cleanup deadline', async () => {
    const service = new PrintService(); let prints = 0; dom.window.print = () => { prints++; };
    service.print(first); await wait(2200);
    assert.equal(prints, 1); assert.equal(service.getCurrentConfig(), first);
    assert.equal(document.body.getAttribute('data-medcore-printing'), first.type);
    dom.window.dispatchEvent(new dom.window.Event('afterprint'));
    assert.equal(service.getCurrentConfig(), null);
  });
  await check('a second document queues without erasing an open preview', async () => {
    const service = new PrintService(); const captured: unknown[] = []; dom.window.print = () => { captured.push(service.getCurrentConfig()); };
    service.print(first); await wait(); service.print(second); await wait();
    assert.equal(service.getCurrentConfig(), first); assert.equal(captured.length, 1);
    dom.window.dispatchEvent(new dom.window.Event('afterprint')); await wait();
    assert.equal(service.getCurrentConfig(), second); assert.deepEqual(captured, [first, second]);
    dom.window.dispatchEvent(new dom.window.Event('afterprint'));
  });
  await check('new request before capture cancels the older mount timer', async () => {
    const service = new PrintService(); const captured: unknown[] = []; dom.window.print = () => { captured.push(service.getCurrentConfig()); };
    service.print(first); service.print(second); await wait();
    assert.deepEqual(captured, [second]); dom.window.dispatchEvent(new dom.window.Event('afterprint'));
  });
  await check('fonts and logo decode finish before printing', async () => {
    let ready!: () => void; let decoded!: () => void;
    Object.defineProperty(document, 'fonts', { value: { ready: new Promise<void>(resolve => { ready = resolve; }) }, configurable: true });
    const image = document.createElement('img'); image.decode = () => new Promise<void>(resolve => { decoded = resolve; });
    document.getElementById('medcore-print-root')!.append(image);
    const service = new PrintService(); let prints = 0; dom.window.print = () => { prints++; };
    service.print(first); await wait(); assert.equal(prints, 0);
    ready(); await wait(); assert.equal(prints, 0); decoded(); await wait(); assert.equal(prints, 1);
    dom.window.dispatchEvent(new dom.window.Event('afterprint')); image.remove();
  });
  await check('print-media exit releases the document when afterprint is unavailable', async () => {
    const service = new PrintService(); dom.window.print = () => {};
    service.print(first); await wait();
    const entering = new dom.window.Event('change'); Object.assign(entering, { matches: true }); media.dispatchEvent(entering);
    const leaving = new dom.window.Event('change'); Object.assign(leaving, { matches: false }); media.dispatchEvent(leaving);
    assert.equal(service.getCurrentConfig(), null); assert.equal(document.body.hasAttribute('data-medcore-printing'), false);
  });
  console.log(`PRINT_LIFECYCLE_CHECKS_DONE passed=${passed}`);
} finally { dom.window.close(); }
