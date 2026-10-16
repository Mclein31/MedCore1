import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createHarness, idem, stayAwaitingSettlement, type Harness } from './harness';

let h: Harness;
beforeAll(async () => {
  h = await createHarness();
});
afterAll(() => h.close());

describe('discharge clearance, end to end', () => {
  it('admits, bills, clears and lets the patient out', async () => {
    const stay = await stayAwaitingSettlement(h, { withHmo: true, patientIndex: 0, bedIndex: 0 });
    const ledger = stay.detail.ledger;
    // 6,000 room + 900 lab + 350 kit + 5,000 PF = 12,250.00
    expect(ledger.grossCents).toBe(1_225_000);
    expect(ledger.philhealthCents).toBe(400_000);
    expect(ledger.hmoCents).toBe(200_000);
    expect(ledger.grossCents).toBe(
      ledger.vatExemptionCents +
        ledger.seniorPwdDiscountCents +
        ledger.philhealthCents +
        ledger.hmoCents +
        ledger.netPatientDueCents,
    );
    expect(stay.detail.encounter.stage).toBe('PENDING_SETTLEMENT');
    expect(stay.detail.encounter.billNumber).toMatch(/^SOA-\d{4}-\d{6}$/);

    const due = ledger.balanceCents as number;
    const first = await stay.billing.post(
      `${stay.base}/payments`,
      { amountCents: 100_000, rail: 'CASH', payerName: 'Juan' },
      { 'idempotency-key': idem() },
    );
    expect(first.status).toBe(201);
    expect(first.body.detail.encounter.billState).toBe('PARTIALLY_PAID');
    const second = await stay.billing.post(
      `${stay.base}/payments`,
      { amountCents: due - 100_000, rail: 'GCASH', payerName: 'Juan' },
      { 'idempotency-key': idem() },
    );
    expect(second.status).toBe(201);

    // Official receipts are sequential, with no gaps.
    const n1 = Number(first.body.receipt.officialReceiptNumber.slice(-6));
    const n2 = Number(second.body.receipt.officialReceiptNumber.slice(-6));
    expect(n2).toBe(n1 + 1);

    const cleared = second.body.detail;
    expect(cleared.encounter.stage).toBe('CLEARED');
    expect(cleared.encounter.billState).toBe('SETTLED');
    expect(cleared.ledger.balanceCents).toBe(0);
    expect(cleared.gatePasses).toHaveLength(1);
    const beds = await stay.billing.get('/api/v1/staff/beds');
    expect(beds.body.items.find((b: { id: string }) => b.id === stay.bed.id).status).toBe('HOUSEKEEPING');

    // The desk retrieves the PIN (audited); the lobby verifies it once.
    const pass = await stay.billing.get(`${stay.base}/gate-pass`);
    expect(pass.body.pin).toMatch(/^\d{6}$/);
    const lobby = await h.staff('LOBBY_SECURITY');
    const verified = await lobby.post('/api/v1/staff/gate-passes/verify', {
      passNumber: pass.body.passNumber,
      pin: pass.body.pin,
    });
    expect(verified.status).toBe(200);
    expect(verified.body.result).toBe('VERIFIED');
    const again = await lobby.post('/api/v1/staff/gate-passes/verify', {
      passNumber: pass.body.passNumber,
      pin: pass.body.pin,
    });
    expect(again.body.error.code).toBe('PASS_NOT_ACTIVE');
  });

  it('applies the senior discount before payers', async () => {
    const stay = await stayAwaitingSettlement(h, { patientIndex: 1, bedIndex: 1 });
    const l = stay.detail.ledger;
    expect(l.vatExemptionCents).toBe(Math.round((1_225_000 * 3) / 28));
    expect(l.seniorPwdDiscountCents).toBeGreaterThan(0);
    expect(l.grossCents).toBe(
      l.vatExemptionCents + l.seniorPwdDiscountCents + l.philhealthCents + l.hmoCents + l.netPatientDueCents,
    );
  });

  it('refuses out-of-order steps and locks charges after finalization', async () => {
    const stay = await stayAwaitingSettlement(h, { patientIndex: 2, bedIndex: 2 });
    const res = await stay.billing.post(`${stay.base}/discharge/start`);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('STAGE_NOT_READY');
    const charge = await stay.billing.post(`${stay.base}/charges`, {
      code: 'LATE',
      description: 'Late charge',
      category: 'PHARMACY',
      quantity: 1,
      unitPriceCents: 100,
      coverage: 'COVERED',
    });
    expect(charge.status).toBe(409);
    expect(charge.body.error.code).toBe('BILL_LOCKED');
  });
});

describe('payments', () => {
  it('replays an idempotent retry and rejects a reused key with a different body', async () => {
    const stay = await stayAwaitingSettlement(h, { patientIndex: 4, bedIndex: 3 });
    const key = idem();
    const body = { amountCents: 10_000, rail: 'CASH', payerName: 'Ana' };
    const a = await stay.billing.post(`${stay.base}/payments`, body, { 'idempotency-key': key });
    const b = await stay.billing.post(`${stay.base}/payments`, body, { 'idempotency-key': key });
    expect(a.status).toBe(201);
    expect(b.status).toBe(200);
    expect(b.body.replayed).toBe(true);
    expect(b.body.payment.id).toBe(a.body.payment.id);
    const c = await stay.billing.post(
      `${stay.base}/payments`,
      { ...body, amountCents: 20_000 },
      { 'idempotency-key': key },
    );
    expect(c.status).toBe(409);
    expect(c.body.error.code).toBe('IDEMPOTENCY_CONFLICT');
  });

  it('serializes concurrent payments so the balance is never overpaid', async () => {
    const stay = await stayAwaitingSettlement(h, { patientIndex: 5, bedIndex: 4 });
    const balance: number = stay.detail.ledger.balanceCents;
    const results = await Promise.all(
      Array.from({ length: 4 }, () =>
        stay.billing.post(
          `${stay.base}/payments`,
          { amountCents: balance, rail: 'CASH', payerName: 'Rush' },
          { 'idempotency-key': idem() },
        ),
      ),
    );
    expect(results.filter((r) => r.status === 201)).toHaveLength(1);
    const detail = await stay.billing.get(stay.base);
    expect(detail.body.ledger.paidCents).toBe(balance);
  });

  it('requires an idempotency key and refuses amounts above the balance', async () => {
    const stay = await stayAwaitingSettlement(h, { patientIndex: 6, bedIndex: 5 });
    const noKey = await stay.billing.post(`${stay.base}/payments`, {
      amountCents: 100,
      rail: 'CASH',
      payerName: 'X Y',
    });
    expect(noKey.body.error.code).toBe('IDEMPOTENCY_KEY_REQUIRED');
    const tooMuch = await stay.billing.post(
      `${stay.base}/payments`,
      { amountCents: stay.detail.ledger.balanceCents + 1, rail: 'CASH', payerName: 'X Y' },
      { 'idempotency-key': idem() },
    );
    expect(tooMuch.status).toBe(422);
    expect(tooMuch.body.error.code).toBe('EXCEEDS_BALANCE');
  });
});

describe('money trail protection', () => {
  it('cannot void a stay with payments, and the database refuses to rewrite payments or audit rows', async () => {
    const [payment] = (await h.db.execute(sql`select id, encounter_id from payments limit 1`)).rows as {
      id: string;
      encounter_id: string;
    }[];
    expect(payment).toBeDefined();
    const cfo = await h.staff('HOSPITAL_CFO');
    const voided = await cfo.post(`/api/v1/staff/encounters/${payment!.encounter_id}/void`, {
      reason: 'Admitted by mistake, test',
    });
    expect([404, 409]).toContain(voided.status);

    const dbError = async (query: Promise<unknown>) => {
      const err = await query.then(
        () => null,
        (e: { cause?: Error }) => e.cause ?? e,
      );
      return err instanceof Error ? err.message : 'no error';
    };
    expect(
      await dbError(h.db.execute(sql`update payments set amount_cents = 1 where id = ${payment!.id}`)),
    ).toMatch(/not allowed/);
    expect(await dbError(h.db.execute(sql`delete from payments where id = ${payment!.id}`))).toMatch(
      /not allowed/,
    );
    expect(
      await dbError(h.db.execute(sql`delete from encounters where id = ${payment!.encounter_id}`)),
    ).toMatch(/not allowed/);
    expect(await dbError(h.db.execute(sql`update audit_logs set action = 'X'`))).toMatch(/append-only/);
    expect(await dbError(h.db.execute(sql`truncate audit_logs`))).toMatch(/not allowed/);
  });

  it('lets the CFO void a stay that has no money yet', async () => {
    const billing = await h.staff('BILLING_SPECIALIST');
    const doctor = await h.staff('ATTENDING_PHYSICIAN');
    const freeBed = (await billing.get('/api/v1/staff/beds')).body.items.find(
      (b: { status: string }) => b.status === 'AVAILABLE',
    );
    const admitted = await billing.post('/api/v1/staff/encounters', {
      patientId: h.fixture.patients[3]!.id,
      bedId: freeBed.id,
      attendingPhysicianId: doctor.user.id,
      primaryDiagnosis: 'Observation',
      icd10Code: 'R69',
    });
    expect(admitted.status).toBe(201);
    const cfo = await h.staff('HOSPITAL_CFO');
    const forbidden = await billing.post(`/api/v1/staff/encounters/${admitted.body.encounter.id}/void`, {
      reason: 'Duplicate admission entry',
    });
    expect(forbidden.status).toBe(403);
    const voided = await cfo.post(`/api/v1/staff/encounters/${admitted.body.encounter.id}/void`, {
      reason: 'Duplicate admission entry',
    });
    expect(voided.status).toBe(200);
    expect(voided.body.encounter.voidedAt).toBeTruthy();
  });
});

describe('disputes', () => {
  it('enforces separation of duties and recomputes the bill on a waiver', async () => {
    const billing = await h.staff('BILLING_SPECIALIST', 0);
    const billing2 = await h.staff('BILLING_SPECIALIST', 1);
    const doctor = await h.staff('ATTENDING_PHYSICIAN');
    const bed = (await billing.get('/api/v1/staff/beds')).body.items.find(
      (b: { status: string }) => b.status === 'AVAILABLE',
    );
    expect(bed, 'a free bed').toBeDefined();
    const admitted = await billing.post('/api/v1/staff/encounters', {
      patientId: h.fixture.patients[7]!.id,
      bedId: bed.id,
      attendingPhysicianId: doctor.user.id,
      primaryDiagnosis: 'Dengue fever',
      icd10Code: 'A90',
    });
    const base = `/api/v1/staff/encounters/${admitted.body.encounter.id}`;
    const added = await billing.post(`${base}/charges`, {
      code: 'MED-X',
      description: 'Medicine X',
      category: 'PHARMACY',
      quantity: 1,
      unitPriceCents: 250_000,
      coverage: 'COVERED',
    });
    const chargeId = added.body.charges[0].id;
    await billing.post(`${base}/disputes`, {
      chargeId,
      category: 'NOT_RECEIVED',
      reason: 'Patient says this was never given.',
    });
    const list = await billing.get('/api/v1/staff/disputes?status=OPEN');
    const dispute = list.body.items.find(
      (d: { encounterId: string }) => d.encounterId === admitted.body.encounter.id,
    );

    const own = await billing.post(`/api/v1/staff/disputes/${dispute.id}/resolve`, {
      decision: 'WAIVE',
      note: 'Checked the MAR, not given.',
    });
    expect(own.status).toBe(403);
    const other = await billing2.post(`/api/v1/staff/disputes/${dispute.id}/resolve`, {
      decision: 'WAIVE',
      note: 'Checked the MAR, not given.',
    });
    expect(other.status).toBe(200);
    const detail = await billing.get(base);
    expect(detail.body.ledger.grossCents).toBe(0);
    expect(detail.body.charges[0].coverage).toBe('WAIVED');
  });
});

describe('claims', () => {
  it('exports a well-formed, escaped eSOA only after finalization', async () => {
    const [row] = (
      await h.db.execute(sql`
      select e.id from encounters e join facilities f on f.id = e.facility_id
      where f.id = ${h.fixture.facility.id} and e.bill_state <> 'DRAFT' limit 1`)
    ).rows as { id: string }[];
    const claims = await h.staff('CLAIMS_ENCODER');
    const res = await claims.get(`/api/v1/staff/encounters/${row!.id}/esoa.xml`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/xml');
    expect(res.text.startsWith('<?xml')).toBe(true);
    expect(res.text).not.toContain('<script>');
    expect(res.text).toContain('&lt;script&gt;');
  });
});
