import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { NavigationContext } from '@react-navigation/native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import assert from 'node:assert/strict';
import { usePullRefresh } from '../../src/hooks/usePullRefresh';
import { Screen } from '../../src/components/ui';

const root = createRoot(document.getElementById('app')!);
let focused = true;
const listeners = { focus: new Set<() => void>(), blur: new Set<() => void>() };
const navigation = { isFocused: () => focused, addListener: (event: 'focus' | 'blur', listener: () => void) => { listeners[event].add(listener); return () => listeners[event].delete(listener); } } as any;
let control: ReturnType<typeof usePullRefresh>;
let calls = 0;
const requests: Array<{ resolve: () => void; reject: (error: Error) => void }> = [];
const perform = () => { calls++; return new Promise<void>((resolve, reject) => requests.push({ resolve, reject })); };
function Probe({ refresh = perform, automaticLoading = false }: { refresh?: () => Promise<void>; automaticLoading?: boolean }) {
  control = usePullRefresh(refresh);
  return <div data-testid="refresh-probe" data-refreshing={control.refreshing} data-loading={automaticLoading} />;
}
const render = async (automaticLoading = false, refresh = perform) => act(async () => root.render(<NavigationContext.Provider value={navigation}><Probe automaticLoading={automaticLoading} refresh={refresh} /></NavigationContext.Provider>));
const focus = async (next: boolean) => act(async () => { focused = next; for (const listener of listeners[next ? 'focus' : 'blur']) listener(); });
const results: string[] = [];
try {
  await render(true); assert.equal(control!.refreshing, false);
  await render(false); assert.equal(control!.refreshing, false);
  results.push('automatic/focus data loading never activates the native pull indicator');
  await act(async () => { control!.onRefresh(); control!.onRefresh(); });
  assert.equal(calls, 1); assert.equal(control!.refreshing, true);
  await act(async () => requests[0].resolve()); assert.equal(control!.refreshing, false);
  results.push('a user pull starts one request and completion clears its indicator');
  await act(async () => control!.onRefresh());
  assert.equal(control!.refreshing, true);
  await focus(false); assert.equal(control!.refreshing, false);
  const before = calls; await act(async () => control!.onRefresh()); assert.equal(calls, before);
  await focus(true); assert.equal(control!.refreshing, false);
  await act(async () => control!.onRefresh()); assert.equal(control!.refreshing, true);
  await act(async () => requests[1].resolve()); assert.equal(control!.refreshing, true);
  await act(async () => requests[2].resolve()); assert.equal(control!.refreshing, false);
  results.push('tab blur clears the pull, and a late completion cannot stop a newer pull');
  await act(async () => control!.onRefresh());
  await act(async () => requests[3].reject(new Error('Synthetic network failure')));
  assert.equal(control!.refreshing, false);
  results.push('network failure clears the indicator without an unhandled rejection');
  await act(async () => control!.onRefresh());
  const replacement = () => perform(); await render(false, replacement);
  assert.equal(control!.refreshing, false);
  await act(async () => control!.onRefresh());
  await act(async () => requests[4].resolve()); assert.equal(control!.refreshing, true);
  await act(async () => requests[5].resolve()); assert.equal(control!.refreshing, false);
  results.push('resource scope changes discard the prior pull state and completion');
  await act(async () => control!.onRefresh());
  await act(async () => root.unmount()); await act(async () => requests[6].resolve());
  assert.equal(listeners.focus.size, 0); assert.equal(listeners.blur.size, 0);
  results.push('unmount removes focus listeners and ignores pending completion');
  const layoutRoot = createRoot(document.getElementById('layout')!);
  await act(async () => layoutRoot.render(<SafeAreaInsetsContext.Provider value={{ top: 59, bottom: 34, left: 0, right: 0 }}>
    <Screen topSpacing={0}><div id="edge" /></Screen><Screen><div id="standard" /></Screen><Screen safeTop><div id="safe" /></Screen>
  </SafeAreaInsetsContext.Provider>));
  for (const [id, padding] of [['edge','0px'],['standard','8px'],['safe','67px']]) assert.equal(getComputedStyle(document.getElementById(id)!.parentElement!).paddingTop, padding);
  await act(async () => layoutRoot.unmount());
  results.push('full-bleed content uses zero outer top gap; standard and safe-area spacing stay intact');
  console.log(JSON.stringify({ passed: results.length, results }));
  (globalThis as any).__refreshLayoutResults = results;
} catch (error) { await act(async () => root.unmount()); throw error; }
