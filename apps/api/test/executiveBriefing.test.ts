import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { ledgers } from '../src/db/schema';
import type { AiConfig } from '../src/env';
import { executiveBriefingService } from '../src/services/ai/executiveBriefingService';
import { geminiClient } from '../src/services/ai/geminiClient';
import { createHarness, idem, stayAwaitingSettlement, type Harness } from './harness';

let h: Harness;
beforeAll(async () => {
  h = await createHarness();
});
afterAll(() => h.close());

const aiConfig: AiConfig = {
  enabled: true,
  apiKey: 'test-api-key-never-sent-anywhere',
  model: 'primary-model',
  backupModel: 'backup-model',
  proModel: 'backup-model',
};

describe('executive briefing trapped capital', () => {
  it('sums remaining unpaid balances only for HMO_FINAL_LOA and PENDING_SETTLEMENT encounters', async () => {
    const billing = await h.staff('BILLING_SPECIALIST');
    const claims = await h.staff('CLAIMS_ENCODER');
    const hmo = await h.staff('HMO_COORDINATOR');
    const doctor = await h.staff('ATTENDING_PHYSICIAN');

    // 1. ADMITTED stay (must NOT count as trapped capital)
    const admitted = await billing.post('/api/v1/staff/encounters', {
      patientId: h.fixture.patients[0]!.id,
      bedId: h.fixture.beds[0]!.id,
      attendingPhysicianId: doctor.user.id,
      primaryDiagnosis: 'Dengue',
      icd10Code: 'A90',
    });
    expect(admitted.status).toBe(201);
    await billing.post(`/api/v1/staff/encounters/${admitted.body.encounter.id}/charges`, {
      code: 'RB-WARD',
      description: 'Room and board',
      category: 'ROOM_AND_BOARD',
      quantity: 2,
      unitPriceCents: 200_000,
      coverage: 'COVERED',
    });

    // 2. HMO_FINAL_LOA stay (MUST count its remaining balance)
    const loaStay = await billing.post('/api/v1/staff/encounters', {
      patientId: h.fixture.patients[2]!.id,
      bedId: h.fixture.beds[2]!.id,
      attendingPhysicianId: doctor.user.id,
      primaryDiagnosis: 'Pneumonia',
      icd10Code: 'J18.9',
    });
    expect(loaStay.status).toBe(201);
    const loaId: string = loaStay.body.encounter.id;
    await billing.post(`/api/v1/staff/encounters/${loaId}/charges`, {
      code: 'RB-WARD',
      description: 'Room and board',
      category: 'ROOM_AND_BOARD',
      quantity: 3,
      unitPriceCents: 200_000,
      coverage: 'COVERED',
    });
    await claims.put(`/api/v1/staff/encounters/${loaId}/philhealth`, {
      caseRateCode: 'CAP-MR',
      hciCents: 100_000,
      pfCents: 0,
    });
    await hmo.put(`/api/v1/staff/encounters/${loaId}/hmo`, {
      providerName: 'Maxicare',
      memberNumberLast4: '1234',
      mblCents: 10_000_000,
    });
    expect(
      (await doctor.post(`/api/v1/staff/encounters/${loaId}/discharge/declare-mgh`)).status,
    ).toBeLessThan(300);
    expect((await billing.post(`/api/v1/staff/encounters/${loaId}/discharge/start`)).status).toBeLessThan(
      300,
    );
    expect(
      (await doctor.post(`/api/v1/staff/encounters/${loaId}/discharge/sign-pf`, { agreedPfCents: 200_000 }))
        .status,
    ).toBeLessThan(300);
    expect(
      (await billing.post(`/api/v1/staff/encounters/${loaId}/discharge/clear-pharmacy`)).status,
    ).toBeLessThan(300);

    // 3. PHARMACY_RTS_AUDIT stay (must NOT count as trapped capital)
    const rtsStay = await billing.post('/api/v1/staff/encounters', {
      patientId: h.fixture.patients[3]!.id,
      bedId: h.fixture.beds[3]!.id,
      attendingPhysicianId: doctor.user.id,
      primaryDiagnosis: 'Cellulitis',
      icd10Code: 'L03.9',
    });
    expect(rtsStay.status).toBe(201);
    const rtsId: string = rtsStay.body.encounter.id;
    expect(
      (
        await billing.post(`/api/v1/staff/encounters/${rtsId}/charges`, {
          code: 'RB-WARD',
          description: 'Room and board',
          category: 'ROOM_AND_BOARD',
          quantity: 1,
          unitPriceCents: 200_000,
          coverage: 'COVERED',
        })
      ).status,
    ).toBeLessThan(300);
    expect(
      (await doctor.post(`/api/v1/staff/encounters/${rtsId}/discharge/declare-mgh`)).status,
    ).toBeLessThan(300);
    expect((await billing.post(`/api/v1/staff/encounters/${rtsId}/discharge/start`)).status).toBeLessThan(
      300,
    );
    expect(
      (await doctor.post(`/api/v1/staff/encounters/${rtsId}/discharge/sign-pf`, { agreedPfCents: 150_000 }))
        .status,
    ).toBeLessThan(300);

    // 4. PENDING_SETTLEMENT stay with a partial payment (MUST count only the remaining balance)
    const settlementStay = await stayAwaitingSettlement(h, { patientIndex: 4, bedIndex: 4, withHmo: false });
    const [beforeLedger] = await h.db
      .select()
      .from(ledgers)
      .where(eq(ledgers.encounterId, settlementStay.id));
    const partialCents = Math.floor(beforeLedger!.balanceCents / 2);
    const paid = await billing.post(
      `/api/v1/staff/encounters/${settlementStay.id}/payments`,
      {
        amountCents: partialCents,
        rail: 'CASH',
        payerName: 'Patient 4',
      },
      { 'idempotency-key': idem() },
    );
    expect(paid.status).toBe(201);

    const [loaLedger] = await h.db.select().from(ledgers).where(eq(ledgers.encounterId, loaId));
    const [settlementLedger] = await h.db
      .select()
      .from(ledgers)
      .where(eq(ledgers.encounterId, settlementStay.id));
    expect(settlementLedger!.balanceCents).toBe(beforeLedger!.netPatientDueCents - partialCents);

    const expectedPesos = (loaLedger!.balanceCents + settlementLedger!.balanceCents) / 100;

    let prompt = '';
    const generate = vi.spyOn(geminiClient, 'generate').mockImplementation(async (options) => {
      prompt = options.prompt;
      const rawJson = {
        generatedAt: '2026-11-16T10:00:00Z',
        briefingMarkdown: 'Briefing summary',
        metricsSummary: {
          activeInpatients: 999,
          averageDischargeTatMinutes: 999,
          slaTargetMinutes: 45,
          reclaimedBedHoursLast24h: null,
          trappedCapitalPesos: 999_999,
          criticalDepartmentBottleneck: 'HMO_FINAL_LOA',
        },
        topRecommendations: [
          { priority: 1, department: 'HMO', actionText: 'Follow up LOA', financialImpactPesos: 1000 },
        ],
      };
      return { modelUsed: 'primary-model', text: JSON.stringify(rawJson), rawJson };
    });

    try {
      const result = await executiveBriefingService.generateBriefing({
        db: h.db,
        facilityId: h.fixture.facility.id,
        forceRefresh: true,
        aiConfig,
      });
      expect(result.metricsSummary.trappedCapitalPesos).toBe(expectedPesos);
      expect(prompt).toContain(
        `Trapped Capital Awaiting Discharge Finalization: ₱${expectedPesos.toFixed(2)}`,
      );
    } finally {
      generate.mockRestore();
    }
  });
});
