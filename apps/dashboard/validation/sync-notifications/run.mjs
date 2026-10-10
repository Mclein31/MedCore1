// Uses temporary DOM test tooling; no new application dependency is required.
// npm install --prefix /private/tmp/medcore-visual-tools jsdom@26.1.0
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
const directory = path.dirname(fileURLToPath(import.meta.url));
const project = path.resolve(directory, '../../../..');
const requireProject = createRequire(path.join(project, 'package.json'));
const { build } = requireProject('esbuild');
const { JSDOM } = await import(process.env.MEDCORE_DOM_MODULE || '/private/tmp/medcore-visual-tools/node_modules/jsdom/lib/api.js');
const dom = new JSDOM('<div id="results"></div><div id="app"></div>', { url: 'http://127.0.0.1:5191/validation/final-loa/', pretendToBeVisual: true });
for (const name of ['window', 'document', 'navigator', 'HTMLElement', 'HTMLButtonElement', 'Node', 'MutationObserver', 'localStorage', 'sessionStorage']) Object.defineProperty(globalThis, name, { value: name === 'window' ? dom.window : name === 'document' ? dom.window.document : dom.window[name], configurable: true });
globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
globalThis.location = dom.window.location;
dom.window.matchMedia = query => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
const actualFetch = globalThis.fetch;
dom.window.fetch = actualFetch;
globalThis.fetch = (...args) => dom.window.fetch(...args);
const temp = await mkdtemp(path.join(os.tmpdir(), 'medcore-loa-dom-'));
try {
  const bundle = path.join(temp, 'checks.mjs');
  await build({ entryPoints: [path.join(directory, 'checks.tsx')], outfile: bundle, bundle: true, platform: 'node', format: 'esm', jsx: 'automatic', tsconfig: path.join(directory, '../../tsconfig.json'), loader: { '.css': 'empty' }, alias: { react: path.join(project, 'node_modules/react'), 'react-dom': path.join(project, 'node_modules/react-dom') }, banner: { js: "import {createRequire as __auditCreateRequire} from 'node:module'; const require = __auditCreateRequire(import.meta.url);" } });
  await import(pathToFileURL(bundle).href);
  const results = dom.window.__syncResults;
  if (!results) throw new Error('Dashboard regression suite did not finish.');
  const passed = results.length;
  const report = { environment: 'Real React DOM + application components in jsdom; all API calls intercepted; no database or external network', passed, total: results.length, results };
  if (process.argv.includes('--before')) await writeFile(path.join(directory, 'before-results.json'), JSON.stringify(report, null, 2));
  else await writeFile(path.join(directory, 'results.json'), JSON.stringify(report, null, 2));
  for (const result of results) console.log(`[PASS] ${result}`);
  console.log(`DASHBOARD_SYNC_DOM_CHECKS_DONE passed=${passed}/${results.length}`);
  if (passed !== results.length) process.exitCode = 1;
} finally { globalThis.fetch = actualFetch; dom.window.close(); await rm(temp, { recursive: true, force: true }); }

// jsdom React scheduler holds background handles after successful cleanup.
process.exit(process.exitCode || 0);
