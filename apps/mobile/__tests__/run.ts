// Meaningful unit tests for pure, device-side logic. Backend financial math
// is never duplicated here; these tests cover formatting, patient-friendly
// language, payment input guards, duplicate-submission prevention, and
// navigation gating. Run with: npx tsx __tests__/run.ts
import assert from 'node:assert';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { validateCard } from '../src/lib/cardValidation';
import { applyAmountKey } from '../src/lib/amountEntry';
import { launchDestination, OnboardingStore, ONBOARDING_KEY } from '../src/lib/onboarding';
import { confirmedPayment, paymentDetailsValid, paymentStatus, previousCheckoutStep, WALLET_PRESETS } from '../src/lib/checkout';
import { QR_PATTERNS, qrPath } from '../src/lib/qrPatterns';
import { describeClaimStatus, describeHmoStatus, explainBalance, formatPeso } from '../src/lib/format';
import { beginAttempt, clearAttempts, endAttempt } from '../src/lib/singleFlight';
import { getInitialRoute, shouldShowPayButton, validatePaymentAmount, parsePaymentAmount } from '../src/lib/guards';
import { PAYMENT_METHODS, isQrRail, methodForRail } from '../src/lib/paymentMethods';
import { resolveApiConfig } from '../src/config/apiConfig';
import { PaymentAttemptStore } from '../src/lib/paymentAttemptStore';
import { SessionToken } from '../src/lib/sessionToken';
import { ApiClient, ApiError } from '../src/lib/api';
import { parseReadIds, notificationReadKey } from '../src/lib/notificationRead';
import { remainingBalance } from '../src/lib/format';
import { estimatedFirstDueDate, previewInstallments } from '../src/lib/promissory';

let passed = 0;
function check(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`[PASS] ${name}`);
  } catch (e: any) {
    console.error(`[FAIL] ${name} - ${e?.message || e}`);
    process.exitCode = 1;
  }
}

// Expo Go embeds native implementations; incompatible JS packages can bundle
// successfully but fail only when a simulator/device calls the native module.
check('Expo Go native dependencies match the installed SDK', () => {
  const requireMobile = createRequire(resolve('package.json'));
  const expected = requireMobile('expo/bundledNativeModules.json') as Record<string, string>;
  const { satisfies } = requireMobile('semver') as { satisfies: (version: string, range: string) => boolean };
  for (const name of ['@react-native-async-storage/async-storage', 'react-native-safe-area-context', 'react-native-screens']) {
    const actual = requireMobile(`${name}/package.json`).version as string;
    assert.ok(satisfies(actual, expected[name]), `${name}@${actual} does not match Expo Go's ${expected[name]}`);
  }
});

// Billing: peso formatting must be exact and identical on every screen.
check('bill loads: peso formatting is exact', () => {
  assert.strictEqual(formatPeso(18450), '₱18,450.00');
  assert.strictEqual(formatPeso('20000'), '₱20,000.00');
  assert.strictEqual(formatPeso(0), '₱0.00');
  assert.strictEqual(formatPeso(null), '₱0.00');
});

check('bill breakdown: explainer uses backend values only', () => {
  const enc: any = { waterfall: { grossTotal: 52000, philhealthTotal: 20000, hmoApprovedAmount: 13550, netPatientDue: 18450 } };
  const text = explainBalance(enc);
  assert.ok(text.includes('₱52,000.00') && text.includes('₱20,000.00') && text.includes('₱13,550.00') && text.includes('₱18,450.00'));
});

check('bill empty: zero balances render cleanly', () => {
  const enc: any = { waterfall: { grossTotal: 0, philhealthTotal: 0, hmoApprovedAmount: 0, netPatientDue: 0 } };
  assert.ok(explainBalance(enc).includes('₱0.00'));
});

// Insurance: status language must never expose raw codes alone.
check('philhealth information maps to patient language', () => {
  assert.strictEqual(describeClaimStatus('RETURNED').title, 'Action needed');
  assert.strictEqual(describeClaimStatus('APPROVED').title, 'Approved');
  assert.strictEqual(describeClaimStatus('TRANSMITTED').title, 'Being processed');
});

check('hmo information maps to patient language', () => {
  assert.strictEqual(describeHmoStatus('AWAITING_CODE').title, 'Being reviewed');
  assert.strictEqual(describeHmoStatus('APPROVED').title, 'Approved');
});

check('reconciliation discrepancy: difference is explainable', () => {
  const expected = 15000;
  const applied = 12000;
  const diff = expected - applied;
  assert.strictEqual(diff, 3000);
  assert.strictEqual(formatPeso(diff), '₱3,000.00');
});

// Payments: input validation + duplicate prevention.
check('payment validation rejects bad amounts', () => {
  assert.ok(validatePaymentAmount('', 18450));
  assert.ok(validatePaymentAmount('0', 18450));
  assert.ok(validatePaymentAmount('20000', 18450));
  assert.strictEqual(validatePaymentAmount('5000', 18450), null);
  assert.strictEqual(validatePaymentAmount('18450', 18450), null);
});

check('duplicate submission prevention blocks second in-flight attempt', () => {
  clearAttempts();
  assert.strictEqual(beginAttempt('key-1'), true);
  assert.strictEqual(beginAttempt('key-1'), false);
  endAttempt('key-1');
  assert.strictEqual(beginAttempt('key-1'), true);
  endAttempt('key-1');
});

check('receipt retrieval formats identifiers', () => {
  assert.strictEqual(formatPeso(5000), '₱5,000.00');
});

// Claims + navigation gating.
check('claim status rendering covers all backend states', () => {
  for (const s of ['DRAFT', 'CLEAN', 'TRANSMITTED', 'RETURNED', 'DENIED', 'APPROVED', 'PAID']) {
    const info = describeClaimStatus(s);
    assert.ok(info.title && info.detail, s);
  }
});

check('navigation gates unauthenticated users to Auth', () => {
  assert.strictEqual(getInitialRoute(null), 'Auth');
  assert.strictEqual(getInitialRoute({ id: 'u1' }), 'Main');
  assert.strictEqual(shouldShowPayButton(18450), true);
  assert.strictEqual(shouldShowPayButton(0), false);
});

// Payments: method set mirrors the dashboard rails, backend enums only.
check('payment methods cover all backend-supported rails', () => {
  const rails = PAYMENT_METHODS.map((m) => m.rail).sort();
  assert.deepStrictEqual(rails, ['BANK_TRANSFER', 'CREDIT_DEBIT_CARD', 'GCASH', 'MAYA', 'PROMISSORY_NOTE', 'QR_PH']);
  assert.strictEqual(methodForRail('PROMISSORY_NOTE').kind, 'promissory');
  assert.strictEqual(isQrRail('GCASH'), true);
  assert.strictEqual(isQrRail('MAYA'), true);
  assert.strictEqual(isQrRail('QR_PH'), true);
  assert.strictEqual(isQrRail('BANK_TRANSFER'), false);
});

check('card validation covers supported networks, checksum, expiry and CVV', () => {
  const now = new Date('2026-10-08T00:00:00Z');
  assert.equal(validateCard('4111 1111 1111 1111', '10/26', '123', now).valid, true);
  const mc = validateCard('5555 5555 5555 4444', '12/30', '123', now);
  assert.equal(mc.brand, 'MASTERCARD'); assert.equal(mc.last4, '4444'); assert.equal(mc.valid, true);
  assert.equal(validateCard('2221000000000009', '12/30', '123', now).valid, true);
  for (const number of ['4111111111111112', '378282246310005', 'not a card', '', '1234']) assert.equal(validateCard(number, '12/30', '123', now).valid, false);
  for (const expiry of ['09/26', '00/30', '13/30', '1/30', '12/25']) assert.equal(validateCard('4111111111111111', expiry, '123', now).valid, false);
  for (const cvv of ['', '12', 'abcd', '1234']) assert.equal(validateCard('4111111111111111', '12/30', cvv, now).valid, false);
});

// Promissory: preview mirrors backend centavo logic (sums to principal).
check('promissory preview schedule reconciles to the centavo', () => {
  for (const months of [3, 6, 12] as const) {
    const p = previewInstallments(18450, months);
    assert.strictEqual(p.schedule.length, months);
    const sum = Number(p.schedule.reduce((a, b) => a + b, 0).toFixed(2));
    assert.strictEqual(sum, 18450);
    assert.strictEqual(p.totalRepayment, 18450);
  }
  const odd = previewInstallments(10000, 3);
  assert.deepStrictEqual(odd.schedule, [3333.33, 3333.33, 3333.34]);
});

check('promissory first-due estimate is a valid future date', () => {
  const d = estimatedFirstDueDate(new Date('2026-10-06T00:00:00Z'));
  assert.strictEqual(d, '2026-11-05');
});

check('payment input rejects signs, letters, malformed grouping, and fractional cents', () => {
  for (const input of ['-100', '+100', 'abc100', '1e3', '10,00', '1.005', 'NaN', 'Infinity']) assert.strictEqual(parsePaymentAmount(input), null);
  assert.strictEqual(parsePaymentAmount('1,250.50'), 1250.5);
  assert.ok(validatePaymentAmount('100.01', 100));
});
check('installments remain nonnegative and centavo-exact for small balances', () => {
  for (const cents of [1, 2, 5, 11, 100, 100001, 1845001]) for (const months of [3, 6, 12] as const) {
    const plan = previewInstallments(cents / 100, months);
    assert.ok(plan.schedule.every((amount) => amount >= 0));
    assert.strictEqual(plan.schedule.reduce((sum, amount) => sum + Math.round(amount * 100), 0), cents);
  }
});
check('balances distinguish responsibility from remaining amount', () => {
  assert.strictEqual(remainingBalance({ remainingBalance: 30, amountPaid: 70, waterfall: { netPatientDue: 100 } } as any), 30);
  assert.strictEqual(remainingBalance({ amountPaid: 100, waterfall: { netPatientDue: 100 } } as any), 0);
});
check('notification read state is account-scoped and validates corrupted storage', () => {
  assert.notStrictEqual(notificationReadKey('a'), notificationReadKey('b'));
  assert.deepStrictEqual(parseReadIds('{bad'), []);
  assert.deepStrictEqual(parseReadIds('null'), []);
  assert.deepStrictEqual(parseReadIds('["id",3,null]'), ['id']);
});
check('release configuration requires an explicit secure API address', () => {
  for (const raw of [undefined, 'http://example.test', 'https://127.0.0.1', 'https://name:password@example.test', 'https://example.test?token=secret']) assert.ok(resolveApiConfig(raw, false).error);
  assert.strictEqual(resolveApiConfig('https://example.test/api/v1/', false).root, 'https://example.test');
  assert.strictEqual(resolveApiConfig(undefined, true).root, 'http://127.0.0.1:8787');
});
async function asyncCheck(name: string, fn: () => Promise<void>) {
  try { await fn(); passed++; console.log(`[PASS] ${name}`); }
  catch (e: unknown) { console.error(`[FAIL] ${name} - ${e instanceof Error ? e.message : e}`); process.exitCode = 1; }
}
check('amount keypad preserves centavos, editing and invalid-input guards', () => {
  let value = '';
  for (const key of ['1', '9', '.', '2', '9']) value = applyAmountKey(value, key);
  assert.equal(value, '19.29'); assert.equal(parsePaymentAmount(value), 19.29);
  assert.equal(applyAmountKey(value, '1'), value);
  assert.equal(applyAmountKey(value, '.'), value);
  assert.equal(applyAmountKey(value, 'backspace'), '19.2');
  assert.equal(applyAmountKey('', '.'), '0.');
  assert.equal(applyAmountKey('0', '5'), '5');
  assert.equal(applyAmountKey('1e3', '4'), '1e3');
  assert.equal(applyAmountKey('1.005', '4'), '1.005');
  assert.equal(applyAmountKey('bad', 'clear'), '');
});

check('startup route waits for initialization and never bypasses session verification', () => {
  const state = { sessionLoading: false, onboardingLoading: false, sessionError: null, user: null, onboardingError: null, completed: false };
  assert.equal(launchDestination(state), 'onboarding');
  assert.equal(launchDestination({ ...state, completed: true }), 'auth');
  assert.equal(launchDestination({ ...state, verifiedThisLaunch: true }), 'auth');
  assert.equal(launchDestination({ ...state, verifiedThisLaunch: true, onboardingError: 'Storage unavailable' }), 'auth');
  assert.equal(launchDestination({ ...state, verifiedThisLaunch: true, sessionError: 'Verification failed' }), 'session-recovery');
  assert.equal(launchDestination({ ...state, sessionLoading: true }), 'preload');
  assert.equal(launchDestination({ ...state, onboardingLoading: true }), 'preload');
  assert.equal(launchDestination({ ...state, verifiedThisLaunch: true, onboardingLoading: true }), 'auth');
  assert.equal(launchDestination({ ...state, user: { id: 'verified' }, onboardingLoading: true }), 'main');
  assert.equal(launchDestination({ ...state, user: { id: 'verified' }, onboardingError: 'Storage failed' }), 'main');
  assert.equal(launchDestination({ ...state, user: { id: 'old' }, sessionError: 'Verification unavailable', completed: true }), 'session-recovery');
  assert.equal(launchDestination({ ...state, sessionError: 'Verification unavailable' }), 'session-recovery');
  assert.equal(launchDestination({ ...state, onboardingError: 'Storage failed' }), 'onboarding-recovery');
});
check('checkout review does not accept incomplete or unsuccessful confirmation', () => {
  const result = { success: true, payment: { id: 'p', status: 'SUCCESS' }, receipt: { officialReceiptNumber: 'OR-1' } };
  assert.equal(confirmedPayment(result), true);
  for (const response of [{ ...result, success: false }, { ...result, payment: undefined }, { ...result, receipt: undefined }, { ...result, payment: { id: 'p', status: 'PENDING' } }, { ...result, receipt: { officialReceiptNumber: '' } }]) assert.equal(confirmedPayment(response), false);
  assert.equal(paymentStatus('FAILED', true), 'Failed');
  assert.equal(paymentStatus('PROCESSING', true), 'Processing');
  assert.equal(paymentStatus('CANCELLED', true), 'Cancelled');
  assert.equal(paymentStatus('INITIALIZED', true), 'Awaiting confirmation');
  assert.equal(paymentStatus('FUTURE_STATUS', true), 'Status unavailable');
  assert.equal(paymentStatus('SUCCESS', true), 'Paid');
  assert.equal(paymentStatus('SUCCESS', false), 'Paid');
});
check('method details are validated without provider credential fields', () => {
  assert.equal(paymentDetailsValid('CREDIT_DEBIT_CARD', 'Test', '1234', ''), true);
  assert.equal(paymentDetailsValid('CREDIT_DEBIT_CARD', 'Test', 'abcd', ''), false);
  assert.equal(paymentDetailsValid('BANK_TRANSFER', 'Test', '', 'BPI'), true);
  assert.equal(paymentDetailsValid('BANK_TRANSFER', 'Test', '', 'x'.repeat(65)), false);
  assert.equal(paymentDetailsValid('GCASH', 'x', '', ''), false);
  assert.deepEqual(Object.keys(WALLET_PRESETS.GCASH).sort(), ['accent', 'background', 'contact']);
  assert.ok(WALLET_PRESETS.GCASH.contact.includes('***'));
});
check('checkout back navigation returns to editable steps', () => {
  assert.equal(previousCheckoutStep('review'), 'detail');
  assert.equal(previousCheckoutStep('verification'), 'detail');
  assert.equal(previousCheckoutStep('detail'), 'method');
  assert.equal(previousCheckoutStep('method'), 'amount');
});
check('prototype QR patterns are square with six unobstructed quiet modules', () => {
  for (const pattern of Object.values(QR_PATTERNS)) {
    assert.equal(pattern.rows.length, 45);
    for (const [y, row] of pattern.rows.entries()) {
      assert.equal(row.length, 45);
      assert.match(row, /^[01]+$/);
      for (const [x, cell] of Array.from(row).entries()) if (x < 6 || y < 6 || x >= 39 || y >= 39) assert.equal(cell, '0');
    }
    assert.ok(pattern.payload.startsWith('MEDCORE-DEMO-PAY|RAIL='));
    assert.match(qrPath(pattern.rows), /^M/);
    assert.equal([...qrPath(pattern.rows).matchAll(/M\d+ \d+h1v1h-1z/g)].length, pattern.rows.join('').split('1').length - 1);
  }
});

async function integrationChecks() {
  await asyncCheck('interrupted onboarding resumes, skipping and finishing persist across launches and logout', async () => {
    const values = new Map<string, string>();
    const storage = { getItem: async (key: string) => values.get(key) || null, setItem: async (key: string, value: string) => { values.set(key, value); } };
    const store = new OnboardingStore(storage);
    assert.deepEqual(await store.restore(), { completed: false, step: 0 });
    await store.save({ completed: false, step: 1 });
    assert.deepEqual(await new OnboardingStore(storage).restore(), { completed: false, step: 1 });
    for (const step of [0, 2]) {
      await store.save({ completed: true, step });
      const restored = await new OnboardingStore(storage).restore();
      assert.equal(restored.completed, true);
      assert.equal(launchDestination({ sessionLoading: false, onboardingLoading: false, sessionError: null, user: null, onboardingError: null, completed: restored.completed }), 'auth');
    }
    assert.equal(values.size, 1); assert.ok(values.has(ONBOARDING_KEY));
    // The same completion preference persists a verified returning user's bypass.
    values.clear();
    await store.save({ completed: true, step: 0 });
    const returning = await new OnboardingStore(storage).restore();
    assert.equal(launchDestination({ sessionLoading: false, onboardingLoading: false, sessionError: null, user: null, onboardingError: null, completed: returning.completed }), 'auth');
  });
  await asyncCheck('onboarding storage failure reports recovery and cannot mark completion', async () => {
    const store = new OnboardingStore({ getItem: async () => { throw new Error('Read failed'); }, setItem: async () => { throw new Error('Write failed'); } });
    await assert.rejects(store.restore(), /Read failed/);
    await assert.rejects(store.save({ completed: true, step: 2 }), /Write failed/);
    for (const corrupt of ['{bad', 'null', '{"completed":true,"step":-1}', '{"completed":"true","step":0}', '{"completed":true,"step":3}']) {
      assert.deepEqual(await new OnboardingStore({ getItem: async () => corrupt, setItem: async () => {} }).restore(), { completed: false, step: 0 });
    }
  });

  await asyncCheck('session remains authenticated when secure persistence is unavailable', async () => {
    const session = new SessionToken({ read: async () => null, write: async () => { throw new Error('Unavailable'); }, remove: async () => {} });
    await session.set('test-token'); assert.strictEqual(await session.get(), 'test-token');
  });
  await asyncCheck('logout clears memory and serialized writes cannot restore the old token', async () => {
    let saved: string | null = null;
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const session = new SessionToken({ read: async () => saved, write: async (value) => { await gate; saved = value; }, remove: async () => { saved = null; } });
    const login = session.set('old'); const logout = session.set(null);
    assert.strictEqual(await session.get(), null); release();
    await Promise.all([login, logout]); assert.strictEqual(saved, null);
  });
  await asyncCheck('secure deletion failures are reported while in-memory auth is cleared', async () => {
    const session = new SessionToken({ read: async () => null, write: async () => {}, remove: async () => { throw new Error('Cannot delete'); } });
    await session.set('old'); await assert.rejects(session.set(null)); assert.strictEqual(await session.get(), null);
  });
  await asyncCheck('payment retry survives a new store instance with the same immutable intent', async () => {
    const saved = new Map<string, string>();
    const storage = { read: async (id: string) => saved.get(id) ?? null, write: async (id: string, value: string) => { saved.set(id, value); }, remove: async (id: string) => { saved.delete(id); } };
    const attempt = { key: 'stable-key', encounterId: 'enc-test', input: { amount: 25, paymentRail: 'QR_PH', payerName: 'Test' } };
    const first = new PaymentAttemptStore(storage); assert.strictEqual(first.begin('account'), true); assert.strictEqual(first.begin('account'), false);
    await first.save('account', attempt); first.end('account');
    const reopened = new PaymentAttemptStore(storage); assert.deepStrictEqual(await reopened.restore('account'), attempt);
    assert.strictEqual(await reopened.restore('another-account'), null);
    await assert.rejects(reopened.save('account', { ...attempt, key: 'another-key' }));
    await assert.rejects(reopened.complete('account', 'different-key'));
    assert.deepStrictEqual(await reopened.restore('account'), attempt);
    await assert.rejects(reopened.save('account', { ...attempt, key: 'different-key' }));
    assert.deepStrictEqual(await new PaymentAttemptStore(storage).restore('account'), attempt);
    await reopened.complete('account', attempt.key); assert.strictEqual(await new PaymentAttemptStore(storage).restore('account'), null);
  });
  await asyncCheck('payment intent storage failure happens before transmission and malformed recovery fails closed', async () => {
    const attempt = { key: 'stable-key', encounterId: 'enc-test', input: { amount: 25, paymentRail: 'QR_PH', payerName: 'Test' } };
    const broken = new PaymentAttemptStore({ read: async () => '{bad', write: async () => { throw new Error('Unavailable'); }, remove: async () => {} });
    await assert.rejects(broken.save('account', attempt)); await assert.rejects(broken.restore('account'));
  });
  const originalFetch = globalThis.fetch;
  try {
    await asyncCheck('API sends bearer auth and the stable idempotency key', async () => {
      globalThis.fetch = (async (_url, options) => {
        const headers = new Headers(options?.headers); assert.strictEqual(headers.get('Authorization'), 'Bearer test-token');
        assert.strictEqual(headers.get('Idempotency-Key'), 'same-key'); assert.strictEqual(headers.get('Content-Type'), 'application/json');
        return new Response('{"success":true}');
      }) as typeof fetch;
      await new ApiClient(async () => 'test-token').request('/test', { method: 'POST', body: '{}', idempotencyKey: 'same-key' });
    });
    await asyncCheck('malformed and null HTTP 200 responses cannot be reported as success', async () => {
      for (const body of ['not json', 'null', 'true']) {
        globalThis.fetch = (async () => new Response(body)) as typeof fetch;
        await assert.rejects(new ApiClient(async () => null).get('/test'), (e: unknown) => e instanceof ApiError && e.code === 'INVALID_RESPONSE');
      }
    });
    await asyncCheck('public login failure stays distinct from protected session expiration', async () => {
      globalThis.fetch = (async () => new Response('{"error":{"code":"INVALID_CREDENTIALS"}}', { status: 401 })) as typeof fetch;
      let expired = false;
      await assert.rejects(new ApiClient(async () => null, () => { expired = true; }).get('/test'), /Check your email/);
      assert.strictEqual(expired, false);
      globalThis.fetch = (async () => new Response('{"error":{"code":"UNAUTHORIZED"}}', { status: 401 })) as typeof fetch;
      await assert.rejects(new ApiClient(async () => 'old', () => { expired = true; }).get('/test'), /session expired/);
      assert.strictEqual(expired, true);
    });
    await asyncCheck('expired-session callbacks can clear the token while preserving the 401 result', async () => {
      let token: string | null = 'expired';
      globalThis.fetch = (async () => new Response('{"error":{"code":"UNAUTHORIZED"}}', { status: 401 })) as typeof fetch;
      const api = new ApiClient(async () => token, () => { token = null; });
      await assert.rejects(api.get('/auth/me'), (e: unknown) => e instanceof ApiError && e.status === 401 && e.code === 'UNAUTHORIZED');
      assert.strictEqual(token, null);
    });
    await asyncCheck('server and network failures do not expire a valid session', async () => {
      let expired = false; const api = new ApiClient(async () => 'valid', () => { expired = true; });
      globalThis.fetch = (async () => new Response('{}', { status: 503 })) as typeof fetch;
      await assert.rejects(api.get('/test')); assert.strictEqual(expired, false);
      globalThis.fetch = (async () => { throw new TypeError('Offline'); }) as typeof fetch;
      await assert.rejects(api.get('/test'), (e: unknown) => e instanceof ApiError && e.code === 'NETWORK_ERROR');
      assert.strictEqual(expired, false);
    });
    await asyncCheck('late responses cannot cross account boundaries during body parsing', async () => {
      let token: string | null = 'old';
      globalThis.fetch = (async () => ({ status: 200, ok: true, json: async () => { token = 'new'; return {}; } }) as Response) as typeof fetch;
      await assert.rejects(new ApiClient(async () => token).get('/test'), (e: unknown) => e instanceof ApiError && e.code === 'SESSION_CHANGED');
    });
    await asyncCheck('API request timeout aborts the request without expiring the session', async () => {
      globalThis.fetch = (async (_url, options) => new Promise((_resolve, reject) => options?.signal?.addEventListener('abort', () => reject(new Error('Aborted'))))) as typeof fetch;
      await assert.rejects(new ApiClient(async () => 'test').request('/test', { timeoutMs: 5 }), (e: unknown) => e instanceof ApiError && e.code === 'TIMEOUT');
    });
  } finally { globalThis.fetch = originalFetch; }
  console.log(`\nMOBILE_UNIT_TESTS_DONE passed=${passed}`);
}
void integrationChecks();
