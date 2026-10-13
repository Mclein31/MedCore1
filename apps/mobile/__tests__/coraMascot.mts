import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { build } from 'esbuild';

const mobileRequire = createRequire(resolve('apps/mobile/package.json'));
const React = mobileRequire('react'), { act } = React, { createRoot } = mobileRequire('react-dom/client');
const { JSDOM } = await import(process.env.MEDCORE_DOM_MODULE || '/private/tmp/medcore-visual-tools/node_modules/jsdom/lib/api.js');
const dom = new JSDOM('<div id="root"></div>');
Object.assign(globalThis, { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true });
const fixture: any = { loops: [], nodes: {}, loads: {}, motion: new Set(), appState: new Set(), presses: 0 };
(globalThis as any).__coraMascotFixture = fixture;
const native = `import React from 'react';const f=globalThis.__coraMascotFixture;
const host=tag=>p=>{if(p.testID){f.nodes[p.testID]=p;if(p.onLoad)f.loads[p.testID]=p.onLoad;}
return React.createElement(tag,{'data-testid':p.testID,role:p.accessibilityRole,'aria-label':p.accessibilityLabel,onClick:p.onPress,src:p.source,alt:''},p.children);};
export const Pressable=host('button');
export const StyleSheet={create:s=>s,absoluteFill:{position:'absolute',inset:0}};
export const AppState={currentState:'active',addEventListener:(_event,cb)=>{f.appState.add(cb);return {remove(){f.appState.delete(cb);}};}};
export const AccessibilityInfo={isReduceMotionEnabled:async()=>false,addEventListener:(_event,cb)=>{f.motion.add(cb);return {remove(){f.motion.delete(cb);}};}};
export const Easing={quad:x=>x*x,inOut:e=>e};
class Value{constructor(v){this.value=v;}setValue(v){this.value=v;}interpolate(config){return {value:this,config};}}
export const Animated={Value,View:host('div'),Image:host('img'),timing:(value,config)=>({value,config}),delay:ms=>({delay:ms}),sequence:steps=>({steps}),loop:sequence=>{
const loop={sequence,stopped:false,start(){f.loops.push(this);},stop(){this.stopped=true;}};return loop;}};`;
const directory = await mkdtemp(join(tmpdir(), 'medcore-cora-mascot-'));
const compiled = join(directory, 'mascot.cjs');
await build({ entryPoints: ['apps/mobile/src/components/CoraFloatingMascot.tsx'], bundle: true, format: 'cjs', platform: 'node', outfile: compiled,
  plugins: [{ name: 'mascot-lifecycle', setup(b) {
    b.onResolve({ filter: /^react(?:\/.+)?$/ }, args => ({ path: mobileRequire.resolve(args.path), external: true }));
    b.onResolve({ filter: /^react-native$/ }, () => ({ path: 'native', namespace: 'fixture' }));
    b.onResolve({ filter: /\/lib\/assets$/ }, () => ({ path: 'assets', namespace: 'fixture' }));
    b.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ loader: 'js', contents: args.path === 'native' ? native
      : "export const ASSETS={brand:{cora:'/cora-mascot.png',coraBlink:'/cora-mascot-blink.png'}};" }));
  }}] });
const require = createRequire(import.meta.url), { CoraFloatingMascot } = require(compiled);
const root = createRoot(document.getElementById('root')!);
const render = (active = true) => act(async () => { root.render(React.createElement(CoraFloatingMascot, { active, onPress: () => fixture.presses++ })); });
const change = (listeners: Set<(value: any) => void>, value: any) => act(async () => { for (const listener of listeners) listener(value); });
const flat = (style: any): any[] => Array.isArray(style) ? style.flatMap(flat) : [style];
let passed = 0;const pass = (name: string) => { passed++;console.log(`[PASS] ${name}`); };
try {
  await render();assert.equal(fixture.loops.length, 0);
  assert.equal(document.querySelector('button')!.getAttribute('aria-label'), 'Ask Cora AI');
  assert.equal(document.querySelector('button')!.textContent, '');
  const buttonStyle = flat(fixture.nodes['cora-mascot-button'].style({ pressed: false }));
  assert.ok(buttonStyle.some(s => s?.width >= 48 && s?.height >= 48));
  assert.ok(buttonStyle.every(s => !s?.backgroundColor && !s?.borderWidth));
  for (const frame of ['cora-mascot-open', 'cora-mascot-blink']) {
    assert.ok(flat(fixture.nodes[frame].style).some(s => s?.width === 64 && s?.height === 64 && s?.position === 'absolute'));
  }
  pass('Mascot-only accessible button has a large tap target and no pill/label');
  await act(async () => fixture.loads['cora-mascot-blink']());assert.equal(fixture.loops.length, 2);
  const timings = fixture.loops.flatMap((loop: any) => loop.sequence.steps.filter((step: any) => step.config));
  assert.ok(timings.every((t: any) => t.config.useNativeDriver && t.config.isInteraction === false));
  assert.equal(new Set(timings.map((t: any) => t.value)).size, 2);
  await act(async () => document.querySelector<HTMLButtonElement>('button')!.click());assert.equal(fixture.presses, 1);
  pass('Loaded artwork starts independent blink/tilt loops without delaying taps or blocking list updates');
  await render(false);assert.ok(fixture.loops.every((loop: any) => loop.stopped));
  await render(true);assert.equal(fixture.loops.length, 4);
  await change(fixture.appState, 'background');assert.ok(fixture.loops.every((loop: any) => loop.stopped));
  await change(fixture.appState, 'active');assert.equal(fixture.loops.length, 6);
  pass('Hidden Home/chat and background states stop motion, returning restarts it');
  await change(fixture.motion, true);assert.ok(fixture.loops.every((loop: any) => loop.stopped));
  assert.ok(flat(fixture.nodes['cora-mascot-open'].style).some(s => s?.opacity === 1));
  assert.ok(flat(fixture.nodes['cora-mascot-blink'].style).some(s => s?.opacity === 0));
  assert.ok(flat(fixture.nodes['cora-mascot-motion'].style).some(s => s?.transform?.[0].rotate === '0deg'));
  await act(async () => document.querySelector<HTMLButtonElement>('button')!.click());assert.equal(fixture.presses, 2);
  pass('Reduced motion keeps open eyes/neutral pose and preserves the action');
  for (const name of ['cora-mascot.png', 'cora-mascot-blink.png']) {
    const bytes = await readFile(`apps/mobile/assets/brand/${name}`);
    assert.equal(bytes.toString('hex', 0, 8), '89504e470d0a1a0a');
    assert.equal(bytes.readUInt32BE(16), 1254);assert.equal(bytes.readUInt32BE(20), 1254);
    assert.equal(bytes[25], 6, 'RGBA alpha must be preserved');
  }
  pass('Both transparent animation frames share the same dimensions');
  await act(async () => root.unmount());assert.equal(fixture.motion.size, 0);assert.equal(fixture.appState.size, 0);
  assert.ok(fixture.loops.every((loop: any) => loop.stopped));
  pass('Unmount removes subscriptions and stops every animation loop');
  console.log(`CORA_MASCOT_CHECKS_DONE passed=${passed}; actual component lifecycle, controlled native driver.`);
} finally { dom.window.close();await rm(directory, { recursive: true, force: true }); }
