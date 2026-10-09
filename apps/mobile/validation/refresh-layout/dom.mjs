import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
const directory = path.dirname(fileURLToPath(import.meta.url));
const mobile = path.resolve(directory, '../..');
const requireProject = createRequire(path.resolve(mobile, '../../package.json'));
const { build } = requireProject('esbuild');
const { JSDOM } = await import('/private/tmp/medcore-visual-tools/node_modules/jsdom/lib/api.js');
const dom = new JSDOM('<div id="app"></div><div id="layout"></div>', { url: 'http://localhost', pretendToBeVisual: true });
Object.defineProperty(dom.window.document, 'visibilityState', { value: 'visible', configurable: true });
for (const name of ['window','document','navigator','HTMLElement','HTMLInputElement','Node','MutationObserver','Event','ShadowRoot']) {
  Object.defineProperty(globalThis, name, { value: name === 'window' ? dom.window : name === 'document' ? dom.window.document : dom.window[name], configurable: true });
}
globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
dom.window.matchMedia = query => ({ matches: query.includes('prefers-reduced-motion'), media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
const temp = await mkdtemp(path.join(os.tmpdir(), 'medcore-refresh-layout-dom-'));
try {
  const bundle = path.join(temp, 'checks.mjs');
  await build({ entryPoints: [path.join(directory, 'checks.tsx')], outfile: bundle, bundle: true, platform: 'node', format: 'esm', jsx: 'automatic',
    resolveExtensions: ['.web.tsx','.web.ts','.web.js','.tsx','.ts','.jsx','.js','.json'],
    tsconfig: path.join(mobile, 'tsconfig.json'), loader: { '.png': 'dataurl' },
    alias: { 'react-native': path.join(mobile, 'node_modules/react-native-web'), react: path.join(mobile, 'node_modules/react'), 'react-dom': path.join(mobile, 'node_modules/react-dom') },
    define: { __DEV__: 'false', 'process.env.NODE_ENV': '"development"' },
    banner: { js: "import { createRequire as __require } from 'node:module'; const require = __require(import.meta.url);" }
  });
  await import(pathToFileURL(bundle).href);
  await writeFile(path.join(directory, 'results.json'), JSON.stringify({ environment: 'Actual React Native Web components in isolated jsdom; controlled refresh promises and focus events; no network', passed: globalThis.__refreshLayoutResults.length, results: globalThis.__refreshLayoutResults }, null, 2));
} finally { dom.window.close(); await rm(temp, { recursive: true, force: true }); }

// React Native Web image caches retain background handles in jsdom.
process.exit(0);
