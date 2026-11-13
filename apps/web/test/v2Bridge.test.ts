import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EncounterDetail } from '../src/lib/types';
import type { Encounter } from '../src/v1/types/domain';
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

function row(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    encounterNumber: `ENC-${id}`,
    patientName: 'Test Patient',
    mrn: 'TEST',
    bedCode: '101',
    stage: 'PENDING_SETTLEMENT',
    billState: 'FINALIZED',
    admittedAt: '2026-01-01',
    mghOrderedAt: null,
    clearedAt: null,
    voidedAt: null,
    physicianName: 'Doctor',
    netPatientDueCents: 100,
    balanceCents: 100,
    grossCents: 100,
    openDisputes: 0,
    sla: { status: 'ON_TRACK', elapsedMinutes: 12 },
    ...overrides,
  };
}
function detailFor(id: string): EncounterDetail {
  const d = detail();
  d.encounter = { ...d.encounter, id, encounterNumber: `ENC-${id}` };
  return d;
}

describe('dashboard bridge mappings', () => {
  it('maps API claim lifecycle states onto the dashboard claim states', async () => {
    const { mapClaimStatus } = await import('../src/v1/api/v2Bridge');
    expect(mapClaimStatus('DRAFT', 'DRAFT')).toBe('DRAFT');
    expect(mapClaimStatus('DRAFT', 'FINALIZED')).toBe('CLEAN');
    expect(mapClaimStatus('READY', 'DRAFT')).toBe('CLEAN');
    expect(mapClaimStatus('TRANSMITTED', 'SENT')).toBe('TRANSMITTED');
    expect(mapClaimStatus('RETURNED', 'SENT')).toBe('RETURNED');
    expect(mapClaimStatus('PAID', 'SETTLED')).toBe('APPROVED');
    expect(mapClaimStatus(undefined, 'DRAFT')).toBe('PENDING');
  });

  it('derives claim conformity and aging from the real claim and bill', () => {
    const d = detail();
    d.philhealth = {
      id: 'clm',
      claimNumber: 'CLM-1',
      caseRateCode: 'CAP',
      hciCents: 100,
      pfCents: 0,
      status: 'DRAFT',
    };
    d.encounter = { ...d.encounter, billState: 'DRAFT', clearedAt: null };
    expect(mapEncounter(d).philhealth).toMatchObject({ status: 'DRAFT', eSoaXmlConformity: false });
    d.encounter = {
      ...d.encounter,
      billState: 'SETTLED',
      clearedAt: new Date(Date.now() - 5 * 86_400_000).toISOString(),
    };
    expect(mapEncounter(d).philhealth).toMatchObject({
      status: 'CLEAN',
      eSoaXmlConformity: true,
      claimAgingDays: 5,
    });
    d.philhealth = { ...d.philhealth, status: 'TRANSMITTED' };
    expect(mapEncounter(d).philhealth).toMatchObject({ status: 'TRANSMITTED', claimAgingDays: 0 });
  });

  it('reports excluded lines as HMO-disallowed items only when the stay has an HMO', () => {
    const d = detail();
    d.charges = [...d.charges, { ...d.charges[0]!, id: 'excl', coverage: 'EXCLUDED', grossCents: 82_100 }];
    expect(mapEncounter(d).hmo.disallowedConsumables).toBe(0);
    d.hmo = {
      providerName: 'Maxicare',
      memberNumberLast4: '1234',
      mblCents: 10_000_000,
      loaStatus: 'APPROVED',
      approvalCode: 'OK-1',
      approvedCents: 100,
    };
    expect(mapEncounter(d).hmo.disallowedConsumables).toBe(821);
  });

  it('maps server notification types onto the bell categories and resolves encounter ids', async () => {
    transport.mockImplementation((path: string) => {
      if (path.startsWith('/v1/staff/encounters?')) return Promise.resolve({ items: [row('e1')] });
      if (path.startsWith('/v1/staff/encounters/e1')) return Promise.resolve(detailFor('e1'));
      return Promise.resolve({
        items: [
          ['PAYMENT_RECEIVED', 'PAYMENT', 'SUCCESS'],
          ['DISCHARGE', 'STAGE', 'INFO'],
          ['DISPUTE_FILED', 'DISPUTE', 'WARNING'],
          ['DISPUTE_RESOLVED', 'DISPUTE', 'INFO'],
          ['GATE_PASS_ISSUED', 'GATE_PASS', 'SUCCESS'],
          ['NOTIFICATION', 'STAGE', 'INFO'],
          ['PAYER', 'HMO', 'INFO'],
          ['BILLING', 'STAGE', 'INFO'],
        ].map(([type], i) => ({
          id: `n${i}`,
          encounterId: 'ENC-e1',
          type,
          title: 'Title',
          message: 'Message',
          read: i > 0,
          timestamp: '2026-01-01T00:00:00.000Z',
        })),
      });
    });
    await bridge('/encounters');
    const feed = (await bridge('/notifications?limit=30')) as {
      notifications: { type: string; severity: string; encounterId: string }[];
      unreadCount: number;
    };
    expect(feed.unreadCount).toBe(1);
    expect(feed.notifications.map((n) => [n.type, n.severity])).toEqual([
      ['PAYMENT', 'SUCCESS'],
      ['STAGE', 'INFO'],
      ['DISPUTE', 'WARNING'],
      ['DISPUTE', 'INFO'],
      ['GATE_PASS', 'SUCCESS'],
      ['STAGE', 'INFO'],
      ['HMO', 'INFO'],
      ['STAGE', 'INFO'],
    ]);
    expect(feed.notifications.every((n) => n.encounterId === 'e1')).toBe(true);
    // The client feed validator accepts the mapped feed.
    const { NotificationsApi } = await import('../src/v1/api/notifications');
    await expect(new NotificationsApi().getFeed()).resolves.toMatchObject({ unreadCount: 1 });
  });

  it.each([
    ['notify-patient-sms', { templateType: 'BILL_READY' }, 'PATIENT_SMS', 'Test Patient', '•••• 4567'],
    [
      'notify-patient-sms',
      { templateType: 'INTAKE_ORIENTATION' },
      'PATIENT_SMS',
      'Test Patient',
      '•••• 4567',
    ],
    ['nudge-doctor', {}, 'DOCTOR_NUDGE', 'Dr. Ana Cruz', 'Hospital directory'],
  ])('turns the %s notify response into a sandbox SMS dispatch', async (action, body, kind, name, phone) => {
    const d = detail();
    d.patient = { ...d.patient, contactPhoneLast4: '4567' };
    d.physician = { id: 'dr', fullName: 'Dr. Ana Cruz', prcLicense: null };
    let sent = '';
    transport.mockImplementation((path: string, opts?: { body?: { message: string } }) => {
      if (path.endsWith('/notify')) {
        sent = opts!.body!.message;
        return Promise.resolve({
          ...d,
          timeline: [
            {
              id: 'abcdef12-0000-0000-0000-000000000000',
              kind: 'NOTIFICATION',
              title: 'Logged',
              detail: sent,
              actorLabel: 'Staff',
              createdAt: '2026-01-03T00:00:00.000Z',
            },
          ],
        });
      }
      return Promise.resolve(d);
    });
    const r = (await bridge(`/encounters/enc/${action}`, {
      method: 'POST',
      headers: { 'Idempotency-Key': 'k' },
      body: JSON.stringify(body),
    })) as { success: boolean; dispatch: Record<string, unknown> };
    expect(transport).toHaveBeenCalledWith('/v1/staff/encounters/enc/notify', {
      method: 'POST',
      body: { kind, message: sent },
    });
    expect(sent).toContain('ENC-1');
    expect(sent).not.toMatch(/https?:|J18/);
    if ((body as { templateType?: string }).templateType === 'INTAKE_ORIENTATION')
      expect(sent).toMatch(/^MEDCORE INTAKE/);
    expect(r.success).toBe(true);
    expect(r.dispatch).toMatchObject({
      isSimulated: true,
      simulated: true,
      provider: 'SIMULATOR',
      deliveryStatus: 'SIMULATED',
      recipientName: name,
      recipientPhone: phone,
      messageBody: sent,
      messageId: 'SMS-SIM-ABCDEF',
      timestamp: '2026-01-03T00:00:00.000Z',
    });
  });

  it('edits a charge by adding the corrected line before retiring the old one', async () => {
    const d = detail();
    const after = { ...d, charges: [...d.charges, { ...d.charges[0]!, id: 'new' }] };
    transport.mockImplementation((path: string) => {
      if (path.startsWith('/v1/staff/encounters?')) return Promise.resolve({ items: [row('enc')] });
      if (path.endsWith('/charges')) return Promise.resolve(after);
      return Promise.resolve(d);
    });
    await bridge('/charges/charge', { method: 'PATCH', body: JSON.stringify({ qty: 2 }) });
    const calls = transport.mock.calls.map((c) => c[0] as string).filter((p) => p.includes('/charges'));
    expect(calls).toEqual([
      '/v1/staff/encounters/enc/charges',
      '/v1/staff/encounters/enc/charges/charge/remove',
    ]);
  });

  it('removes the new line again when the old one cannot be retired, so no charge is lost or doubled', async () => {
    const d = detail();
    const after = { ...d, charges: [...d.charges, { ...d.charges[0]!, id: 'new' }] };
    transport.mockImplementation((path: string) => {
      if (path.startsWith('/v1/staff/encounters?')) return Promise.resolve({ items: [row('enc')] });
      if (path.endsWith('/charges')) return Promise.resolve(after);
      if (path.endsWith('/charges/charge/remove')) return Promise.reject(new Error('CHARGE_DISPUTED'));
      return Promise.resolve(d);
    });
    await expect(
      bridge('/charges/charge', { method: 'PATCH', body: JSON.stringify({ qty: 2 }) }),
    ).rejects.toThrow('CHARGE_DISPUTED');
    expect(transport).toHaveBeenCalledWith('/v1/staff/encounters/enc/charges/new/remove', {
      method: 'POST',
      body: { reason: 'Reverted a charge update that could not be completed' },
    });
  });

  it('polls the list and re-reads only changed or open charts, flagged as background refreshes', async () => {
    const { setOpenEncounter } = await import('../src/v1/api/v2Bridge');
    setOpenEncounter(null);
    let rows = [row('a'), row('b'), row('c')];
    transport.mockImplementation((path: string) => {
      if (path.startsWith('/v1/staff/encounters?')) return Promise.resolve({ items: rows });
      const id = path.match(/encounters\/([^/?]+)/)![1]!;
      return Promise.resolve(detailFor(id));
    });
    const detailCalls = () =>
      transport.mock.calls.map((c) => c[0] as string).filter((p) => !p.includes('?page='));
    await bridge('/encounters');
    expect(detailCalls()).toEqual([
      '/v1/staff/encounters/a?refresh=background',
      '/v1/staff/encounters/b?refresh=background',
      '/v1/staff/encounters/c?refresh=background',
    ]);
    transport.mockClear();
    const unchanged = (await bridge('/encounters')) as { items: Encounter[] };
    expect(detailCalls()).toEqual([]);
    expect(unchanged.items).toHaveLength(3);

    // A changed row is re-read once its cached chart is older than the 5 s burst window.
    vi.useFakeTimers({ now: Date.now() + 6000 });
    try {
      rows = [
        row('a'),
        row('b', { balanceCents: 0, sla: { status: 'BREACH', elapsedMinutes: 99 } }),
        row('c'),
      ];
      setOpenEncounter('c');
      transport.mockClear();
      const changed = (await bridge('/encounters')) as { items: Encounter[] };
      expect(detailCalls().sort()).toEqual([
        '/v1/staff/encounters/b?refresh=background',
        '/v1/staff/encounters/c?refresh=background',
      ]);
      // The live SLA clock always comes from the list row.
      expect(changed.items[1]).toMatchObject({ slaStatus: 'BREACH', elapsedMinutes: 99 });
    } finally {
      vi.useRealTimers();
      setOpenEncounter(null);
    }
  });

  it('records a cleared claim through the transmit endpoint and forwards AI abort signals', async () => {
    transport.mockResolvedValue({ ok: true });
    expect(await bridge('/claims/clm/mark-transmitted', { method: 'POST' })).toEqual({ success: true });
    expect(transport).toHaveBeenCalledWith('/v1/staff/claims/clm/mark-transmitted', { method: 'POST' });
    const controller = new AbortController();
    await bridge('/ai/executive/briefing', {
      method: 'POST',
      body: '{}',
      signal: controller.signal,
    });
    expect(transport).toHaveBeenLastCalledWith('/v1/staff/ai/executive/briefing', {
      method: 'POST',
      body: {},
      signal: controller.signal,
    });
  });
});

describe('session safety', () => {
  it('a successful AI claim scrub refreshes charts without failing in-flight reads as a session change', async () => {
    let release!: () => void;
    let reading!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const inFlight = new Promise<void>((resolve) => (reading = resolve));
    transport.mockImplementation(async (path: string) => {
      if (path.startsWith('/v1/staff/encounters?')) return { items: [row('a')] };
      if (path.startsWith('/v1/staff/encounters/a')) {
        reading();
        await gate;
        return detailFor('a');
      }
      return { rthRiskScore: 0.04 };
    });
    const census = bridge('/encounters');
    await inFlight;
    const { ClaimsAiApi } = await import('../src/v1/api/ai');
    await new ClaimsAiApi().preflightScrub('a');
    release();
    await expect(census).resolves.toMatchObject({ total: 1 });
  });
});
