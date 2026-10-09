import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const project = path.resolve(here, '../../../..');
const output = process.env.MEDCORE_ANALYTICS_OUTPUT || '/private/tmp/medcore-analytics-layout-live';
await mkdir(output, { recursive: true });
const bundle = await build({ entryPoints: [path.join(here, 'entry.tsx')], bundle: true,
  platform: 'browser', format: 'iife', jsx: 'automatic', write: false,
  tsconfig: path.join(project, 'apps/dashboard/tsconfig.json'), define: { 'process.env.NODE_ENV': '"development"' }
});
const assets = path.join(project, 'apps/dashboard/dist/assets');
const css = await readFile(path.join(assets, (await readdir(assets)).find(name => name.endsWith('.css'))), 'utf8');
const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${css}
.layout-tools{position:fixed;right:0;top:0;z-index:9999;max-width:320px;font:11px monospace;background:white;border:1px solid #ccc}
.layout-tools pre{max-height:120px;overflow:auto;white-space:pre-wrap}
</style></head><body><div id="medcore-app-root"></div><div class="layout-tools no-print"><button id="measure-layout">Check card layout</button><pre id="layout-results" role="status">Measuring…</pre></div><script>${bundle.outputFiles[0].text.replaceAll('</script>', '<\\/script>')}</script></body></html>`;
await writeFile(path.join(output, 'index.html'), html);
for (const width of [375, 390, 1024, 1279, 1280, 1366]) {
  await writeFile(path.join(output, `viewport-${width}.html`), `<!doctype html><html><body style="margin:0"><iframe title="${width}px analytics viewport" src="index.html" style="width:${width}px;height:900px;border:0"></iframe></body></html>`);
}
console.log(`Live analytics layout fixture: ${output}/index.html`);
