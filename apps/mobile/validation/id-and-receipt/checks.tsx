import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContext } from '@react-navigation/native';
import assert from 'node:assert/strict';
import RecordDetailScreen from '../../src/screens/RecordDetailScreen';
const root = createRoot(document.getElementById('app')!);
const navigation = { isFocused: () => true, addListener: () => () => {} } as any;
try {
  await act(async () => root.render(<SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 430, height: 932 }, insets: { top: 0, bottom: 0, left: 0, right: 0 } }}><NavigationContext.Provider value={navigation}><RecordDetailScreen route={{ params: { encounterId: 'synthetic-stay', documentKind: 'RECEIPT', documentId: 'receipt' } } as any} navigation={{} as any} /></NavigationContext.Provider></SafeAreaProvider>));
  const ticket = document.querySelector('[data-testid="historical-payment-ticket"]') as HTMLElement;
  assert.ok(ticket);
  for (const text of ['Payment receipt','OR-SYNTHETIC','TX-SYNTHETIC','Amount paid','GCash','Sample Hospital']) assert.ok(ticket.textContent!.includes(text), text);
  assert.ok(!ticket.textContent!.includes('Itemized charges'));
  assert.ok(!ticket.textContent!.includes('Your bill breakdown'));
  assert.ok(document.body.textContent!.includes('Itemized charges'));
  assert.ok(document.body.textContent!.includes('Your bill breakdown'));
  assert.equal(getComputedStyle(ticket).backgroundColor, 'rgb(248, 250, 252)');
  // The existing scalloped cutouts use the same contrasting surround as the ticket.
  assert.ok(Array.from(ticket.querySelectorAll<HTMLElement>('div')).filter(element => element.style.width === '8px' && element.style.height === '8px').length >= 20);
  const results = ['history payment receipt retains its visible ticket surround and cutouts', 'receipt ticket contains only actual payment data; itemized bill stays outside'];
  (globalThis as any).__receiptLayoutResults = results;
  console.log(JSON.stringify({ passed: results.length, results }));
} finally { await act(async () => root.unmount()); }
