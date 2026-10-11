import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { build } from 'esbuild';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

// Mount the actual page with a deterministic context and delayed API responses.
// Uses the same DOM test dependency already used by the printing regression suite.
const domModule = process.env.MEDCORE_DOM_MODULE || '/private/tmp/medcore-visual-tools/node_modules/jsdom/lib/api.js';
const { JSDOM } = await import(domModule);
const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost' });
const fixture = {
  context: { encounters: [] as any[], searchQuery: '', printDocument: () => {}, refreshEncounters: async () => true },
  requests: [] as Array<{ id: string; resolve: (xml: string) => void; reject: (error: Error) => void }>
};
Object.defineProperty(globalThis, 'window', { value: dom.window, configurable: true });
Object.defineProperty(globalThis, 'document', { value: dom.window.document, configurable: true });
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true, __MEDCORE_CLAIMS_TEST__: fixture });
const require = createRequire(resolve('package.json'));
const directory = await mkdtemp(join(tmpdir(), 'medcore-claims-dom-'));
const compiled = join(directory, 'page.cjs');
await build({
  stdin: { contents: "export { ClaimsEsoaPage } from './apps/dashboard/src/pages/ClaimsEsoaPage'; export { INITIAL_ENCOUNTERS } from './apps/dashboard/src/data/mockData';", loader: 'ts', resolveDir: process.cwd() },
  tsconfig: 'apps/dashboard/tsconfig.json', bundle: true, platform: 'node', format: 'cjs', outfile: compiled,
  plugins: [{ name: 'isolated-claims-test', setup(builder) {
    builder.onResolve({ filter: /^@\/context\/MedCoreContext$/ }, () => ({ path: 'context', namespace: 'claims-test' }));
    builder.onResolve({ filter: /^@\/api$/ }, () => ({ path: 'api', namespace: 'claims-test' }));
    builder.onLoad({ filter: /.*/, namespace: 'claims-test' }, ({ path }) => ({ contents: path === 'context'
      ? 'export const useMedCore = () => globalThis.__MEDCORE_CLAIMS_TEST__.context;'
      : 'export const claimsApi = { getPhilhealthEsoaXml: id => new Promise((resolve,reject) => globalThis.__MEDCORE_CLAIMS_TEST__.requests.push({id,resolve,reject})) };' }));
    builder.onResolve({ filter: /^[^./]/ }, ({ path }) => path.startsWith('@/') ? undefined : { path: require.resolve(path), external: true });
  } }]
});
const { ClaimsEsoaPage, INITIAL_ENCOUNTERS } = require(compiled);
const container = document.getElementById('root')!;
const root = createRoot(container);
const render = () => act(async () => { root.render(React.createElement(ClaimsEsoaPage)); });
const buttons = () => [...container.querySelectorAll<HTMLButtonElement>('button')].filter(b => /Copy XML|Download \.XML/.test(b.textContent || ''));
const click = (element: Element) => act(async () => { element.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })); });
let passed = 0;
const pass = (name: string) => { passed++; console.log(`[PASS] ${name}`); };
try {
  await render();
  assert.match(container.textContent || '', /Select an available hospital claim/);
  assert.equal(fixture.requests.length, 0);
  pass('Initial empty census renders without dereferencing null XML');

  fixture.context.encounters = INITIAL_ENCOUNTERS.slice(0, 2);
  await render();
  assert.equal(fixture.requests[0].id, fixture.context.encounters[0].philhealth.id);
  assert.match(container.textContent || '', /Loading hospital XML/);
  assert.ok(buttons().every(b => b.disabled));
  pass('Initial claim selection keeps exports disabled during XML loading');

  await act(async () => { fixture.requests[0].resolve('<?xml version="1.0"?><claim>CLAIM_A</claim>'); });
  assert.match(container.querySelector('pre')!.textContent || '', /CLAIM_A/);
  assert.ok(buttons().every(b => !b.disabled));
  pass('Only successfully fetched XML enables export');

  await click(container.querySelectorAll('tbody tr')[1]);
  assert.equal(fixture.requests[1].id, fixture.context.encounters[1].philhealth.id);
  assert.doesNotMatch(container.querySelector('pre')!.textContent || '', /CLAIM_A/);
  assert.ok(buttons().every(b => b.disabled));
  await act(async () => { fixture.requests[1].reject(new Error('XML test outage')); });
  assert.match(container.querySelector('[role="alert"]')!.textContent || '', /XML test outage/);
  assert.ok(buttons().every(b => b.disabled));
  pass('Claim switching and XML failures never expose old XML');

  await click([...container.querySelectorAll('button')].find(b => b.textContent === 'Retry XML')!);
  await act(async () => { fixture.requests[2].resolve('<?xml version="1.0"?><claim>CLAIM_B</claim>'); });
  assert.match(container.querySelector('pre')!.textContent || '', /CLAIM_B/);
  pass('Retry loads XML for the currently selected claim');

  await click(container.querySelectorAll('tbody tr')[0]);
  await click(container.querySelectorAll('tbody tr')[1]);
  await act(async () => { fixture.requests[3].resolve('<?xml version="1.0"?><claim>STALE_A</claim>'); });
  assert.doesNotMatch(container.querySelector('pre')!.textContent || '', /STALE_A/);
  await act(async () => { fixture.requests[4].resolve('<?xml version="1.0"?><claim>CURRENT_B</claim>'); });
  assert.match(container.querySelector('pre')!.textContent || '', /CURRENT_B/);
  pass('Late XML responses cannot overwrite another selected claim');

  fixture.context.encounters = [];
  await render();
  assert.match(container.textContent || '', /Select an available hospital claim/);
  pass('Removing the selected encounter handles null cache and undefined keys safely');
  console.log(`CLAIMS_ESOA_DOM_CHECKS_DONE passed=${passed}; actual React page, synthetic API, no hospital database.`);
} finally {
  await act(async () => { root.unmount(); });
  dom.window.close();
  delete (globalThis as any).__MEDCORE_CLAIMS_TEST__;
  await rm(directory, { recursive: true, force: true });
}
