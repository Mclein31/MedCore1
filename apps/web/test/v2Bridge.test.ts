import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EncounterDetail } from '../src/lib/types';
const transport = vi.hoisted(() => vi.fn());
vi.mock('../src/lib/api', () => ({
  api: transport,
  ApiRequestError: class extends Error {
    constructor(
      public status: number,
      public code: string,
      message: string,
    ) {
      super(message);
    }
  },
}));
import { bridge, centavos, clearBridgeCache, mapEncounter } from '../src/v1/api/v2Bridge';
function detail(): EncounterDetail {
  return {
    encounter: {
      id: 'enc',
      encounterNumber: 'ENC-1',
      bedCode: '101',
      roomCategory: 'PRIVATE',
      primaryDiagnosis: 'Test',
      icd10Code: 'J18.9',
      stage: 'CLEARED',
      stageEnteredAt: '2026-01-01',
      admittedAt: '2026-01-01',
      billState: 'SETTLED',
      billNumber: 'BILL-1',
      sla: { status: 'ON_TRACK', elapsedMinutes: 10 },
      doctorExcessPfCents: 0,
      roomUpgradeExcessCents: 0,
    },
    patient: {
      id: 'p',
      mrn: 'TEST',
      fullName: 'Test Patient',
      dateOfBirth: '1990-01-01',
      sex: 'FEMALE',
      discountKind: 'NONE',
    },
    physician: null,
    ledger: {
      grossCents: 12345,
      grossHospitalCents: 12345,
      grossProfessionalFeeCents: 0,
      vatExemptionCents: 0,
      seniorPwdDiscountCents: 0,
      philhealthCents: 0,
      hmoCents: 0,
      netPatientDueCents: 12345,
      paidCents: 12345,
      balanceCents: 0,
      nonCoveredCents: 0,
      financedCents: 0,
    },
    philhealth: null,
    hmo: null,
    charges: [
      {
        id: 'charge',
        code: 'LAB-1',
        description: 'Lab',
        category: 'LABORATORY',
        quantity: 1,
        unitPriceCents: 12345,
        grossCents: 12345,
        coverage: 'COVERED',
        removedAt: null,
        isDisputed: false,
      },
    ],
    payments: [
      {
        id: 'pay',
        reference: 'REF-1',
        amountCents: 12345,
        rail: 'CASH',
        payerName: 'Test Patient',
        isSimulated: false,
        createdAt: '2026-01-02T00:00:00Z',
        officialReceiptNumber: 'OR-1',
      },
    ],
    promissoryNotes: [],
    disputes: [],
    gatePasses: [],
    timeline: [],
  } as unknown as EncounterDetail;
}
beforeEach(() => {
  transport.mockReset();
  clearBridgeCache();
});
describe('v1 dashboard boundary', () => {
  it('converts money once and retains actual payment history timestamps', () => {
    const e = mapEncounter(detail());
    expect(e.waterfall.grossTotal).toBe(123.45);
    expect(e.stage).toBe('CLEARED_GATE_PASS');
    expect(e.items[0]?.allocationAvailable).toBe(true);
    expect(e.items[0]?.patientOop).toBe(123.45);
    expect(e.paymentHistory?.[0]).toMatchObject({
      timestamp: '2026-01-02T00:00:00Z',
      channelReference: 'REF-1',
      isSimulatedDemo: false,
    });
    expect(e.receipts?.[0]).toMatchObject({
      date: '2026-01-02T00:00:00Z',
      paymentMethod: 'CASH',
      referenceNumber: 'REF-1',
    });
    expect(centavos(123.45)).toBe(12345);
  });
  it('uses the actual admission-permitted physician directory', async () => {
    transport.mockResolvedValue({ items: [{ id: 'dr', fullName: 'Doctor' }] });
    expect(await bridge('/encounters/physicians')).toEqual({
      items: [{ id: 'dr', fullName: 'Doctor', name: 'Doctor' }],
    });
    expect(transport).toHaveBeenCalledWith('/v1/staff/directory/physicians');
  });
  it('does not offer an expired active pass as ready for exit', () => {
    const d = detail();
    d.gatePasses = [
      {
        id: 'g',
        passNumber: 'GP-1',
        status: 'ACTIVE',
        issuedAt: '2020-01-01',
        expiresAt: '2020-01-02',
        usedAt: null,
        pinAttempts: 0,
      },
    ];
    expect(mapEncounter(d).dischargePass?.status).toBe('EXPIRED');
  });
  it('maps patient-direct charges to excluded centavos', async () => {
    transport.mockResolvedValue(detail());
    await bridge('/encounters/enc/charges', {
      method: 'POST',
      body: JSON.stringify({
        code: 'LAB',
        description: 'Lab',
        category: 'LABORATORY',
        qty: 2,
        unitPrice: 12.34,
        coverageType: 'PATIENT_DIRECT',
        status: 'COVERED',
      }),
    });
    expect(transport).toHaveBeenCalledWith('/v1/staff/encounters/enc/charges', {
      method: 'POST',
      body: {
        code: 'LAB',
        description: 'Lab',
        category: 'LABORATORY',
        quantity: 2,
        unitPriceCents: 1234,
        coverage: 'EXCLUDED',
      },
    });
  });
  it('requires idempotency and forwards the same payment key', async () => {
    await expect(bridge('/encounters/enc/payments', { method: 'POST', body: '{}' })).rejects.toThrow(
      'stable idempotency',
    );
    const d = detail();
    transport.mockResolvedValue({
      detail: d,
      payment: d.payments[0],
      receipt: { officialReceiptNumber: 'OR-1' },
      replayed: true,
    });
    const result = await bridge('/encounters/enc/payments', {
      method: 'POST',
      headers: { 'Idempotency-Key': 'payment-intent-123456' },
      body: JSON.stringify({ amount: 123.45, paymentRail: 'CREDIT_DEBIT_CARD', payerName: 'Test' }),
    });
    expect(result).toMatchObject({ success: true, cached: true, payment: { amount: 123.45 } });
    expect(transport).toHaveBeenCalledWith('/v1/staff/encounters/enc/payments', {
      method: 'POST',
      idempotencyKey: 'payment-intent-123456',
      body: { amountCents: 12345, rail: 'CARD_TERMINAL', payerName: 'Test' },
    });
  });
  it('fetches PIN only from the dedicated audited endpoint', async () => {
    const d = detail();
    d.gatePasses = [
      {
        id: 'g',
        passNumber: 'GP-1',
        status: 'ACTIVE',
        issuedAt: '2026-01-01',
        expiresAt: '2099-01-02',
        usedAt: null,
        pinAttempts: 0,
      },
    ];
    transport.mockImplementation((path: string) =>
      Promise.resolve(path.endsWith('gate-pass') ? { passNumber: 'GP-1', pin: '123456' } : d),
    );
    expect(await bridge('/encounters/enc/gate-pass')).toMatchObject({
      dischargePass: { exitPin: '123456', qrPayload: 'GP-1' },
    });
  });
  it('routes AI, analytics and notifications to v2 staff endpoints while blocking legacy role switching', async () => {
    await expect(bridge('/auth/switch-role', { method: 'POST' })).rejects.toThrow('not available');
    transport.mockResolvedValueOnce({ data: { reply: 'Hello' } });
    expect(
      await bridge('/ai/cora/chat', {
        method: 'POST',
        body: JSON.stringify({ encounterId: 'enc', message: 'Hi' }),
      }),
    ).toEqual({ data: { reply: 'Hello' } });
    expect(transport).toHaveBeenCalledWith('/v1/staff/ai/cora/chat', {
      method: 'POST',
      body: { encounterId: 'enc', message: 'Hi' },
    });
    transport.mockResolvedValueOnce({ items: [{ id: 'n1', read: false }] });
    expect(await bridge('/notifications')).toMatchObject({
      available: true,
      unreadCount: 1,
    });
  });
});
