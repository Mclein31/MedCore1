import { describe, expect, it, vi } from 'vitest';
import {
  bridge,
  createV2Call,
  toEncounter,
  toPayInput,
  toPromissoryInput,
  toV1Stage,
  type V2StayDetail,
} from '../src/lib/v2Bridge';

const TOKEN = 'abcdefghijklmnopqrstuvwxyz0123456789-_ABCDE';
const STAY = '3f1c2a8e-7b6d-4c5e-9f0a-1b2c3d4e5f60';

const detail: V2StayDetail = {
  stay: {
    id: STAY,
    encounterNumber: 'ENC-2026-000019',
    patientName: 'Mark Dela Cruz',
    facilityName: 'St. Jude Medical Center (Demo)',
    admittedAt: '2026-10-14T03:06:00Z',
    stage: 'PENDING_SETTLEMENT',
    billState: 'SENT',
    billNumber: 'SOA-2026-000002',
    clearedAt: null,
    discountKind: 'NONE',
    billReady: true,
  },
  ledger: {
    grossCents: 2_550_000,
    vatExemptionCents: 0,
    seniorPwdDiscountCents: 0,
    philhealthCents: 1_300_000,
    hmoCents: 0,
    netPatientDueCents: 1_250_000,
    paidCents: 0,
    financedCents: 0,
    balanceCents: 1_250_000,
    creditCents: 0,
  },
  charges: [
    {
      id: 'c1',
      description: 'Room',
      category: 'ROOM_AND_BOARD',
      quantity: 2,
      unitPriceCents: 300_000,
      grossCents: 600_000,
      coverage: 'COVERED',
      explainer: 'Bed and meals',
      isDisputed: false,
    },
    {
      id: 'c2',
      description: 'IV fluids',
      category: 'PHARMACY',
      quantity: 2,
      unitPriceCents: 85_000,
      grossCents: 170_000,
      coverage: 'COVERED',
      explainer: null,
      isDisputed: true,
    },
    {
      id: 'c3',
      description: 'Gown',
      category: 'SUPPLIES',
      quantity: 1,
      unitPriceCents: 50_050,
      grossCents: 50_050,
      coverage: 'EXCLUDED',
      explainer: null,
      isDisputed: false,
    },
    {
      id: 'c4',
      description: 'Removed',
      category: 'SUPPLIES',
      quantity: 1,
      unitPriceCents: 1_000,
      grossCents: 1_000,
      coverage: 'WAIVED',
      explainer: null,
      isDisputed: false,
    },
    {
      id: 'c5',
      description: 'Doctor',
      category: 'PROFESSIONAL_FEE',
      quantity: 1,
      unitPriceCents: 1_000_000,
      grossCents: 1_000_000,
      coverage: 'COVERED',
      explainer: null,
      isDisputed: false,
    },
  ],
  payments: [],
  promissoryNotes: [],
  disputes: [
    {
      id: 'd1',
      chargeId: 'c2',
      contestedCents: 170_000,
      reason: 'Only one bag',
      status: 'OPEN',
      resolutionNote: null,
      createdAt: '2026-10-16T11:33:00Z',
      resolvedAt: null,
    },
  ],
  timeline: [
    { kind: 'DISPUTE', title: 'Charge questioned', detail: null, createdAt: '2026-10-16T11:33:00Z' },
  ],
  gatePass: null,
  options: { onlinePayments: true, onlinePromissory: true },
};

/** A fake v2 server: records calls and answers from a route table. */
function fakeV2(routes: Record<string, (body: unknown) => [number, unknown]>) {
  const calls: { method: string; path: string; body: unknown; key?: string; token?: string }[] = [];
  const call = vi.fn(async (method: string, path: string, body?: unknown, key?: string, token?: string) => {
    calls.push({ method, path, body, key, token });
    const handler = routes[`${method} ${path}`];
    if (!handler) return { status: 404, data: { error: { code: 'NOT_FOUND', message: 'nope' } } };
    const [status, data] = handler(body);
    return { status, data };
  });
  return { call, calls };
}

const readOnly = {
  'GET /auth/patient/me': () =>
    [200, { email: 'mark@example.test', facility: { name: 'St. Jude', code: 'SJMC-MNL' } }] as [
      number,
      unknown,
    ],
  'GET /patient/stays': () =>
    [200, { items: [{ id: STAY, patientName: 'Mark Dela Cruz' }] }] as [number, unknown],
  [`GET /patient/stays/${STAY}`]: () => [200, detail] as [number, unknown],
};

describe('mapping v2 stays to the v1 screens', () => {
  it('converts centavos to pesos and keeps the waterfall consistent', () => {
    const e = toEncounter(detail);
    expect(e.uuid).toBe(STAY);
    expect(e.waterfall.grossTotal).toBe(25_500);
    expect(e.waterfall.grossDoctorFee).toBe(10_000);
    expect(e.waterfall.grossHospitalCharges).toBe(15_500);
    expect(e.waterfall.philhealthTotal).toBe(13_000);
    expect(e.waterfall.netPatientDue).toBe(12_500);
    expect(e.remainingBalance).toBe(12_500);
    expect(e.waterfall.excludedConsumables).toBe(500.5);
  });

  it('drops waived lines and maps line statuses the v1 bill understands', () => {
    const e = toEncounter(detail);
    expect(e.items.map((i) => i.id)).toEqual(['c1', 'c2', 'c3', 'c5']);
    expect(e.items.find((i) => i.id === 'c2')?.status).toBe('CONTESTED');
    expect(e.items.find((i) => i.id === 'c3')).toMatchObject({
      status: 'DISALLOWED_SUNDRY',
      patientOop: 500.5,
    });
    expect(e.disputes[0]).toMatchObject({
      itemDescription: 'IV fluids',
      contestedAmount: 1_700,
      status: 'OPEN',
    });
  });

  it('maps the clearance stage and the exit pass (QR carries only the pass number)', () => {
    expect(toV1Stage('CLEARED')).toBe('CLEARED_GATE_PASS');
    expect(toV1Stage('HMO_FINAL_LOA')).toBe('HMO_FINAL_LOA');
    const e = toEncounter({
      ...detail,
      stay: { ...detail.stay, stage: 'CLEARED', clearedAt: '2026-10-16T12:00:00Z' },
      gatePass: { passNumber: 'GP-CRKV9FV88W', pin: '394525', expiresAt: '2026-10-17T09:43:00Z' },
    });
    expect(e.stage).toBe('CLEARED_GATE_PASS');
    expect(e.dischargePass).toMatchObject({
      passNumber: 'GP-CRKV9FV88W',
      exitPin: '394525',
      qrPayload: 'GP-CRKV9FV88W',
      status: 'ACTIVE_READY_FOR_EXIT',
    });
  });

  it('shows an unfinished bill as empty instead of guessing', () => {
    const e = toEncounter({ stay: { ...detail.stay, billReady: false, billState: 'DRAFT' } });
    expect(e.items).toEqual([]);
    expect(e.waterfall.netPatientDue).toBe(0);
  });
});

describe('request bodies', () => {
  it('sends a card payment as brand + last 4 in centavos and never the card number', () => {
    const body = toPayInput({
      amount: 12_500.5,
      paymentRail: 'CREDIT_DEBIT_CARD',
      payerName: ' Mark ',
      cardBrand: 'visa',
      cardLast4: '4242424242424242',
      bankName: 'BPI',
    } as never);
    expect(body).toEqual({
      amountCents: 1_250_050,
      rail: 'CARD',
      payerName: 'Mark',
      cardBrand: 'VISA',
      cardLast4: '4242',
    });
    expect(JSON.stringify(body)).not.toContain('4242424242424242');
  });

  it('maps bank transfers and wallets', () => {
    expect(
      toPayInput({ amount: 1, paymentRail: 'BANK_TRANSFER', payerName: 'Ana', bankName: 'BDO Unibank' }),
    ).toEqual({ amountCents: 100, rail: 'BANK_TRANSFER', payerName: 'Ana', bank: 'BDO' });
    expect(toPayInput({ amount: 0.1, paymentRail: 'GCASH', payerName: 'Ana', cardLast4: '1111' })).toEqual({
      amountCents: 10,
      rail: 'GCASH',
      payerName: 'Ana',
    });
  });

  it('maps a v1 promissory request to the v2 contract', () => {
    expect(
      toPromissoryInput({
        borrowerName: 'Ana',
        borrowerRelationship: 'PATIENT',
        borrowerIdType: 'PHILSYS_NATIONAL_ID',
        borrowerIdNumber: '1234-5678-9012-3456',
        installmentMonths: 6,
        principalAmount: 12_500,
      }),
    ).toEqual({
      borrowerName: 'Ana',
      relationship: 'SELF',
      idType: 'PHILSYS',
      idNumber: '1234-5678-9012-3456',
      months: 6,
      principalCents: 1_250_000,
      acceptTerms: true,
    });
  });
});

describe('bridge routes', () => {
  it('answers the v1 overview from v2 stays', async () => {
    const { call } = fakeV2(readOnly);
    const res = await bridge('/patient/me/overview', 'GET', undefined, call);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.patient.fullName).toBe('Mark Dela Cruz');
    expect(body.currentEncounter.encounterNumber).toBe('ENC-2026-000019');
    expect(body.dischargeChecklist.find((c: { key: string }) => c.key === 'PENDING_SETTLEMENT').done).toBe(
      false,
    );
    expect(body.dischargeChecklist.find((c: { key: string }) => c.key === 'CLEARED').done).toBe(false);
  });

  it('signs in with the emailed code as a mobile client and returns the bearer token', async () => {
    const { call, calls } = fakeV2({
      ...readOnly,
      'POST /auth/patient/code/verify': () => [200, { status: 'SIGNED_IN', token: TOKEN }],
    });
    const res = await bridge(
      '/auth/otp/verify',
      'POST',
      {
        purpose: 'REGISTER',
        mrn: 'MRN-240118',
        dateOfBirth: '1975-03-06',
        facilityCode: 'SJMC-MNL',
        otp: '123456',
      },
      call,
    );
    const body = await res.json();
    expect(calls[0]).toMatchObject({
      path: '/auth/patient/code/verify',
      body: {
        purpose: 'REGISTER',
        mrn: 'MRN-240118',
        dateOfBirth: '1975-03-06',
        code: '123456',
        client: 'mobile',
      },
    });
    expect(body).toMatchObject({
      success: true,
      token: TOKEN,
      user: { role: 'PATIENT_GUARANTOR', fullName: 'Mark Dela Cruz' },
    });
    // The id lands in SecureStore keys, so it must be key-safe.
    expect(body.user.id).toMatch(/^[A-Za-z0-9._-]+$/);
    // Follow-up reads use the brand-new token.
    expect(calls.slice(1).every((c) => c.token === TOKEN)).toBe(true);
  });

  it('passes v2 errors through so the v1 screen shows the server message', async () => {
    const { call } = fakeV2({
      'POST /auth/patient/code/verify': () => [
        401,
        { error: { code: 'CODE_INVALID', message: 'That code is not right.' } },
      ],
    });
    const res = await bridge(
      '/auth/otp/verify',
      'POST',
      { purpose: 'LOGIN', email: 'a@b.test', otp: '000000' },
      call,
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: { code: 'CODE_INVALID', message: 'That code is not right.' } });
  });

  it('refuses password sign-in, which v2 retired for patients', async () => {
    const { call } = fakeV2({});
    const res = await bridge('/auth/login', 'POST', { email: 'a@b.test', password: 'x' }, call);
    expect(res.status).toBe(400);
    expect(call).not.toHaveBeenCalled();
  });

  it('pays through v2 with the same idempotency key and returns a v1 receipt', async () => {
    const { call, calls } = fakeV2({
      ...readOnly,
      [`POST /patient/stays/${STAY}/payments`]: () => [
        201,
        {
          reference: 'PAY-1',
          amountCents: 1_250_000,
          officialReceiptNumber: 'OR-2026-000002',
          replayed: false,
        },
      ],
    });
    const res = await bridge(
      `/encounters/${STAY}/payments`,
      'POST',
      { amount: 12_500, paymentRail: 'GCASH', payerName: 'Mark' },
      call,
      'mobile-0d9a7c1e-2b3f-4a5d-8e6f-7a8b9c0d1e2f',
    );
    const body = await res.json();
    expect(calls[0]).toMatchObject({
      method: 'POST',
      key: 'mobile-0d9a7c1e-2b3f-4a5d-8e6f-7a8b9c0d1e2f',
      body: { amountCents: 1_250_000, rail: 'GCASH' },
    });
    expect(body).toMatchObject({
      success: true,
      payment: { status: 'SUCCESS', amount: 12_500, officialReceiptNumber: 'OR-2026-000002' },
      receipt: { officialReceiptNumber: 'OR-2026-000002' },
    });
  });

  it('loads a historical receipt by payment reference with peso amounts', async () => {
    const paidDetail = {
      ...detail,
      payments: [
        {
          reference: 'PAY-LOOKUP',
          amountCents: 50005,
          rail: 'CARD',
          createdAt: '2026-10-17T01:00:00Z',
          officialReceiptNumber: 'OR-LOOKUP',
        },
      ],
    };
    const { call } = fakeV2({ ...readOnly, [`GET /patient/stays/${STAY}`]: () => [200, paidDetail] });
    const res = await bridge('/patient/me/receipts/PAY-LOOKUP', 'GET', undefined, call);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      paymentReference: 'PAY-LOOKUP',
      receiptNumber: 'OR-LOOKUP',
      amount: 500.05,
      patientName: 'Mark Dela Cruz',
    });
  });

  it('returns the confirmed promissory schedule and released pass', async () => {
    const note = {
      noteNumber: 'PN-TEST',
      principalCents: 10001,
      months: 3,
      schedule: [
        { sequence: 1, dueDate: '2026-11-17', amountCents: 3333 },
        { sequence: 2, dueDate: '2026-12-17', amountCents: 3333 },
        { sequence: 3, dueDate: '2027-01-17', amountCents: 3335 },
      ],
      status: 'ACTIVE',
      signedAt: '2026-10-17T01:00:00Z',
    };
    const { call } = fakeV2({
      ...readOnly,
      [`POST /patient/stays/${STAY}/promissory-notes`]: () => [201, note],
      [`GET /patient/stays/${STAY}`]: () => [
        200,
        {
          ...detail,
          promissoryNotes: [note],
          gatePass: { passNumber: 'GP-TEST123456', pin: '123456', expiresAt: '2026-10-18T01:00:00Z' },
        },
      ],
    });
    const res = await bridge(
      `/encounters/${STAY}/promissory-notes`,
      'POST',
      {
        borrowerName: 'Mark Dela Cruz',
        borrowerIdType: 'PHILSYS_NATIONAL_ID',
        borrowerIdNumber: '1234-5678-9012-3456',
        installmentMonths: 3,
        principalAmount: 100.01,
      },
      call,
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      promissoryNote: { principalAmount: 100.01, scheduleJson: [33.33, 33.33, 33.35] },
      dischargePass: { exitPin: '123456' },
    });
  });

  it('files a charge question', async () => {
    const { call, calls } = fakeV2({
      [`POST /patient/stays/${STAY}/disputes`]: () => [201, { id: 'd2', status: 'OPEN' }],
    });
    const res = await bridge(
      `/encounters/${STAY}/disputes`,
      'POST',
      { chargeId: 'c1', reason: 'I only stayed one night.', disputeCategory: 'WRONG_QUANTITY' },
      call,
    );
    expect(res.status).toBe(201);
    expect(calls[0]?.body).toEqual({
      chargeId: 'c1',
      category: 'WRONG_QUANTITY',
      reason: 'I only stayed one night.',
    });
  });

  it('forwards AI requests to /patient/ai/*', async () => {
    const { call, calls } = fakeV2({
      'POST /patient/ai/cora/chat': () => [200, { reply: 'Hello from Cora!' }],
    });
    const res = await bridge('/ai/cora/chat', 'POST', { message: 'Explain my bill' }, call);
    expect(res.status).toBe(200);
    expect(calls[0]).toMatchObject({
      method: 'POST',
      path: '/patient/ai/cora/chat',
      body: { message: 'Explain my bill' },
    });
  });
});

describe('v2 transport', () => {
  it('sends the bearer token, the CSRF header and a v2-safe idempotency key', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const headers = new Headers({ Authorization: `Bearer ${TOKEN}` });
    const v2 = createV2Call(
      'http://localhost:8787',
      headers,
      new AbortController().signal,
      fetchMock as unknown as typeof fetch,
    );
    await v2('POST', '/patient/stays/x/payments', { a: 1 }, 'mobile-abc_def');
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('http://localhost:8787/api/v1/patient/stays/x/payments');
    expect(init.headers).toMatchObject({
      Authorization: `Bearer ${TOKEN}`,
      'X-MedCore-CSRF': '1',
      'Idempotency-Key': 'mobile-abc-def',
    });
  });
});
