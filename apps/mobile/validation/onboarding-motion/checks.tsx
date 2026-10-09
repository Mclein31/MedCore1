import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import assert from 'node:assert/strict';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import LaunchGate from '../../src/components/LaunchGate';
import FinancialIllustration from '../../src/components/FinancialIllustration';

const root = createRoot(document.getElementById('app')!);
const results: string[] = [];
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const find = (id: string) => document.querySelector(`[data-testid="${id}"]`);
let mounts = 0;
function Form() { React.useEffect(() => { mounts++; }, []); return <input aria-label="Preserved form" defaultValue="original" />; }
async function render(loading: boolean) { await act(async () => root.render(<SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 430, height: 932 }, insets: { top: 0, bottom: 0, left: 0, right: 0 } }}><LaunchGate loading={loading}><Form /></LaunchGate></SafeAreaProvider>)); }
try {
  await render(true);
  assert.ok(find('launch-screen')); assert.equal(mounts, 0);
  await act(async () => { await sleep(1250); });
  assert.ok(find('launch-screen'), 'Minimum presentation cannot bypass actual initialization');
  results.push('startup presentation waits for verified initialization');
  await render(false);
  assert.equal(find('launch-screen'), null); assert.equal(mounts, 1);
  results.push('ready startup mounts content after the minimum presentation');
  const input = document.querySelector('input')!; input.value = 'in-progress form';
  await act(async () => {
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  assert.ok(find('launch-screen')); assert.equal(mounts, 1); assert.equal(document.querySelector('input'), input);
  assert.equal(input.value, 'in-progress form');
  await act(async () => { await sleep(1250); });
  assert.equal(find('launch-screen'), null); assert.equal(mounts, 1); assert.equal(input.value, 'in-progress form');
  results.push('foreground replays presentation while preserving the mounted form');
  await act(async () => document.dispatchEvent(new Event('visibilitychange')));
  assert.equal(find('launch-screen'), null);
  results.push('active-to-active notifications do not replay the presentation');
  for (const kind of ['bill', 'coverage', 'documents'] as const) {
    await act(async () => root.render(<FinancialIllustration kind={kind} />));
    const art = find(`onboarding-art-${kind}`)!;
    assert.equal(art.querySelectorAll('svg').length, 3);
    const before = find(`onboarding-art-accent-${kind}`)!.getAttribute('style');
    await act(async () => { await sleep(80); });
    assert.equal(find(`onboarding-art-accent-${kind}`)!.getAttribute('style'), before);
    assert.equal(art.getAttribute('aria-hidden'), 'true');
  }
  results.push('three distinct SVG illustrations remain static under reduced motion');
  await act(async () => root.unmount());
  results.push('animation and foreground listeners unmount cleanly');
  console.log(JSON.stringify({ passed: results.length, results }));
  (globalThis as any).__onboardingMotionResults = results;
} finally { await act(async () => root.unmount()); }
