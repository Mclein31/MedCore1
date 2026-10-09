import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import assert from 'node:assert/strict';
import FinancialIllustration from '../../src/components/FinancialIllustration';
import LaunchScreen from '../../src/components/LaunchScreen';
const root = createRoot(document.getElementById('app')!);
const results: string[] = [];
const wait = async (ms: number) => act(async () => { await new Promise(resolve => setTimeout(resolve, ms)); });
const transform = (id: string) => (document.querySelector(`[data-testid="${id}"]`) as HTMLElement).style.transform;
try {
  for (const kind of ['bill','coverage','documents'] as const) {
    await act(async () => root.render(<FinancialIllustration kind={kind} />));
    const before = transform(`onboarding-art-accent-${kind}`);
    await wait(180);
    assert.notEqual(transform(`onboarding-art-accent-${kind}`), before);
  }
  results.push('all three SVG accent layers animate when motion is enabled');
  await wait(4400);
  const stopped = transform('onboarding-art-accent-documents');
  await wait(120);
  assert.equal(transform('onboarding-art-accent-documents'), stopped);
  results.push('onboarding motion finishes within five seconds');
  await act(async () => root.render(<SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 430, height: 932 }, insets: { top: 0, bottom: 0, left: 0, right: 0 } }}><LaunchScreen /></SafeAreaProvider>));
  const before = transform('launch-orbit');
  await wait(180);
  assert.notEqual(transform('launch-orbit'), before);
  results.push('startup SVG orbit animates while loading');
  console.log(JSON.stringify({ passed: results.length, results }));
  (globalThis as any).__onboardingMotionResults = results;
} finally { await act(async () => root.unmount()); }
