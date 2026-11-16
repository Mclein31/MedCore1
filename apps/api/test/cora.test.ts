import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { AiConfig } from '../src/env';
import {
  collectAllowedLedgerCents,
  coraService,
  extractPesoAmountsCents,
  findUngroundedPesoAmounts,
} from '../src/services/ai/coraService';
import { AiInferenceError, geminiClient } from '../src/services/ai/geminiClient';
import { createHarness, idem, type Harness } from './harness';

const AUTH = '/api/v1/auth/patient';

const aiConfig: AiConfig = {
  enabled: true,
  apiKey: 'test-api-key-never-sent-anywhere',
  model: 'primary-model',
  backupModel: 'backup-model',
  proModel: 'backup-model',
};

let h: Harness;
beforeAll(async () => {
  h = await createHarness({ GEMINI_API_KEY: 'test-api-key-at-least-20-characters-long' });
});
afterAll(() => h.close());

function lastCodeTo(email: string): string {
  const msg = [...h.mailer.sent].reverse().find((m) => m.to === email);
  const match = msg?.text.match(/\b(\d{6})\b/);
  if (!match) throw new Error(`No code was emailed to ${email}`);
  return match[1]!;
}

async function registerPatient(patientIndex: number) {
  const p = h.fixture.patients[patientIndex]!;
  const c = h.client();
  const identity = { facilityCode: h.fixture.facility.code, mrn: p.mrn, dateOfBirth: p.dateOfBirth };
  const req = await c.post(`${AUTH}/code/request`, { purpose: 'REGISTER', ...identity });
  expect(req.status).toBe(202);
  await h.flush();
  const verify = await c.post(`${AUTH}/code/verify`, {
    purpose: 'REGISTER',
    ...identity,
    code: lastCodeTo(p.email!),
  });
  expect(verify.status, JSON.stringify(verify.body)).toBe(200);
  return c;
}

async function createSettlingStay(opts: {
  patientIndex: number;
  bedIndex: number;
  roomCents: number;
  ivCents: number;
  toiletriesCents: number;
  pfCents: number;
  philhealthHciCents: number;
  philhealthPfCents: number;
  hmoApprovedCents: number;
}) {
  const billing = await h.staff('BILLING_SPECIALIST');
  const claims = await h.staff('CLAIMS_ENCODER');
  const hmo = await h.staff('HMO_COORDINATOR');
  const doctor = await h.staff('ATTENDING_PHYSICIAN');
  const patient = h.fixture.patients[opts.patientIndex]!;
  const bed = h.fixture.beds[opts.bedIndex]!;

  const admitted = await billing.post('/api/v1/staff/encounters', {
    patientId: patient.id,
    bedId: bed.id,
    attendingPhysicianId: doctor.user.id,
    primaryDiagnosis: 'Community-acquired pneumonia',
    icd10Code: 'J18.9',
  });
  expect(admitted.status, JSON.stringify(admitted.body)).toBe(201);
  const id: string = admitted.body.encounter.id;
  const base = `/api/v1/staff/encounters/${id}`;

  const addCharge = (body: Record<string, unknown>) => billing.post(`${base}/charges`, body);
  expect(
    (
      await addCharge({
        code: 'RB-WARD',
        description: 'Ward room and board',
        category: 'ROOM_AND_BOARD',
        quantity: 1,
        unitPriceCents: opts.roomCents,
        coverage: 'COVERED',
      })
    ).status,
  ).toBeLessThan(300);
  expect(
    (
      await addCharge({
        code: 'MED-IV',
        description: 'IV fluids and medicines',
        category: 'PHARMACY',
        quantity: 1,
        unitPriceCents: opts.ivCents,
        coverage: 'COVERED',
      })
    ).status,
  ).toBeLessThan(300);
  expect(
    (
      await addCharge({
        code: 'SUP-KIT',
        description: 'Admission kit (toiletries)',
        category: 'SUPPLIES',
        quantity: 1,
        unitPriceCents: opts.toiletriesCents,
        coverage: 'EXCLUDED',
      })
    ).status,
  ).toBeLessThan(300);
  expect(
    (
      await claims.put(`${base}/philhealth`, {
        caseRateCode: 'CAP-MR',
        hciCents: opts.philhealthHciCents,
        pfCents: opts.philhealthPfCents,
      })
    ).status,
  ).toBeLessThan(300);
  if (opts.hmoApprovedCents > 0) {
    expect(
      (
        await hmo.put(`${base}/hmo`, {
          providerName: 'PhilCare',
          memberNumberLast4: '1234',
          mblCents: 10_000_000,
        })
      ).status,
    ).toBeLessThan(300);
  }
  expect((await doctor.post(`${base}/discharge/declare-mgh`)).status).toBeLessThan(300);
  expect((await billing.post(`${base}/discharge/start`)).status).toBeLessThan(300);
  expect(
    (await doctor.post(`${base}/discharge/sign-pf`, { agreedPfCents: opts.pfCents })).status,
  ).toBeLessThan(300);
  expect((await billing.post(`${base}/discharge/clear-pharmacy`)).status).toBeLessThan(300);
  if (opts.hmoApprovedCents > 0) {
    expect(
      (
        await hmo.post(`${base}/discharge/final-loa`, {
          approvedCents: opts.hmoApprovedCents,
          approvalCode: 'LOA-777',
        })
      ).status,
    ).toBeLessThan(300);
  }
  const finalized = await billing.post(`${base}/bill/finalize`);
  expect(finalized.status).toBeLessThan(300);
  return { id, base, billing };
}

describe('Cora peso grounding helpers', () => {
  it('flags hallucinated 3,500 and 5,000 peso figures across formats when absent from ledger', () => {
    const allowed = new Set([35_000, 335_000, 370_000, 1_300_000, 2_170_000]);

    for (const bad of [
      'Your toiletries kit costs ₱3,500.00.',
      'Your toiletries kit costs ₱3500.',
      'Ang excluded charge ay PHP 3,500.',
      'Toiletries cost Php 3,500.00 while balance is ₱3,700.00.',
      'Total excluded: P3,500.',
      'Bayaran ay 3,500 pesos at 3,700 piso.',
      'Ang charge ay 3500 piso.',
      'Admission kit was 3,500, making remaining balance ₱3,700.00.',
      'Admission kit was 3500.00.',
      'The HMO ₱5,000 made up the balance.',
    ]) {
      expect(findUngroundedPesoAmounts(bad, allowed).length, bad).toBeGreaterThan(0);
    }

    for (const good of [
      'Your toiletries kit is ₱350.00 and coverage shortfall is ₱3,350.00, for a ₱3,700.00 balance.',
      'Ang gross ay 21,700 piso, bawas ang ₱13,000.00 PhilHealth, kaya ₱3,700.00 ang balanse.',
      'Your remaining balance is P3,700.',
    ]) {
      expect(findUngroundedPesoAmounts(good, allowed), good).toEqual([]);
    }
  });

  it('ignores non-monetary numbers while rejecting invalid decimals and negative peso figures', () => {
    const allowed = new Set([35_000, 370_000]);
    const validProse =
      'On November 16, 2026 under RA 9439 (0% interest over 3, 6, or 12 months, 45 minutes target, 12% VAT exempt, 20% senior discount), Step 5 of 6 for Bed B0 (ICD-10 J18.9) includes NSS 1,000 mL and Ceftriaxone 1,000 mg: toiletries are ₱350.00 and balance is ₱3,700.00.';
    expect(findUngroundedPesoAmounts(validProse, allowed)).toEqual([]);

    expect(extractPesoAmountsCents('₱350.123')[0]?.cents).toBeNull();
    expect(extractPesoAmountsCents('₱-350')[0]?.cents).toBeNull();
    expect(extractPesoAmountsCents('50 centavos')[0]?.cents).toBe(50);
    expect(findUngroundedPesoAmounts('₱350.123', allowed)).toEqual(['₱350.123']);
  });

  it('collectAllowedLedgerCents captures every authorized centavo figure without leaking arbitrary numbers', () => {
    const allowed = collectAllowedLedgerCents({
      ledger: {
        grossHospitalCents: 1_670_000,
        grossProfessionalFeeCents: 500_000,
        grossCents: 2_170_000,
        vatExemptionCents: 0,
        seniorPwdDiscountCents: 0,
        nonCoveredCents: 35_000,
        philhealthCents: 1_300_000,
        hmoCents: 500_000,
        coverageShortfallCents: 335_000,
        netPatientDueCents: 370_000,
        paidCents: 100_000,
        financedCents: 0,
        balanceCents: 270_000,
        creditCents: 0,
      },
      encounter: { roomUpgradeExcessCents: 0, doctorExcessPfCents: 0 },
      claim: { hciCents: 1_000_000, pfCents: 300_000 },
      hmo: { mblCents: 10_000_000, approvedCents: 500_000 },
      charges: [{ unitPriceCents: 35_000, grossCents: 35_000 }],
      payments: [{ amountCents: 100_000 }],
      activeNote: { principalCents: 270_000, months: 3, schedule: [{ amountCents: 90_000 }] },
      disputes: [{ contestedCents: 35_000, status: 'OPEN' }],
    });

    expect(allowed.has(35_000)).toBe(true);
    expect(allowed.has(500_000)).toBe(true);
    expect(allowed.has(335_000)).toBe(true);
    expect(allowed.has(270_000)).toBe(true);
    expect(allowed.has(90_000)).toBe(true);
    expect(allowed.has(350_000)).toBe(false);
  });
});

describe('Cora service ledger grounding', () => {
  it('passes structured ledger data and enforces the 350 -> 3,500 post-check without caching failures', async () => {
    const stay = await createSettlingStay({
      patientIndex: 0,
      bedIndex: 0,
      roomCents: 900_000,
      ivCents: 735_000,
      toiletriesCents: 35_000, // ₱350.00 excluded
      pfCents: 500_000,
      philhealthHciCents: 1_000_000,
      philhealthPfCents: 300_000, // ₱13,000.00 PhilHealth
      hmoApprovedCents: 500_000, // ₱5,000.00 HMO -> ₱3,700.00 remaining
    });

    let capturedPrompt = '';
    let capturedSystem = '';
    let replyText =
      'Your admission kit (toiletries) charge is ₱3,500.00, bringing your balance to ₱3,700.00.';

    const generate = vi.spyOn(geminiClient, 'generate').mockImplementation(async (options) => {
      capturedPrompt = options.prompt;
      capturedSystem = options.systemInstruction ?? '';
      const rawJson = {
        scopeDecision: 'ANSWERED',
        reply: replyText,
        mode: 'WHY_DO_I_OWE',
        suggestedActions: [{ label: 'Review bill', actionType: 'NAVIGATE_BILL' }],
      };
      return { modelUsed: 'primary-model', text: JSON.stringify(rawJson), rawJson };
    });

    try {
      await expect(
        coraService.chat({
          db: h.db,
          encounterId: stay.id,
          facilityId: h.fixture.facility.id,
          message: 'Why do I owe ₱3,700?',
          language: 'en',
          mode: 'WHY_DO_I_OWE',
          aiConfig,
        }),
      ).rejects.toBeInstanceOf(AiInferenceError);

      // Inspect structured ledger prompt sent to Gemini
      const parsedPrompt = JSON.parse(capturedPrompt) as {
        server_record: { authoritativeLedger: Record<string, unknown> };
      };
      const ledger = parsedPrompt.server_record.authoritativeLedger as {
        chargesSummary: { grossTotal: { formatted: string } };
        deductionsReducingBill: {
          philhealth: { appliedDeduction: { formatted: string } };
          hmo: { appliedDeduction: { formatted: string } };
        };
        patientResponsibilityBreakdown: {
          excludedConsumables: { formatted: string };
          coverageShortfall: { formatted: string };
          netPatientDue: { formatted: string };
        };
        settlementAndBalance: { remainingBalance: { formatted: string } };
      };
      expect(ledger.chargesSummary.grossTotal.formatted).toBe('₱21,700.00');
      expect(ledger.deductionsReducingBill.philhealth.appliedDeduction.formatted).toBe('₱13,000.00');
      expect(ledger.deductionsReducingBill.hmo.appliedDeduction.formatted).toBe('₱5,000.00');
      expect(ledger.patientResponsibilityBreakdown.excludedConsumables.formatted).toBe('₱350.00');
      expect(ledger.patientResponsibilityBreakdown.coverageShortfall.formatted).toBe('₱3,350.00');
      expect(ledger.settlementAndBalance.remainingBalance.formatted).toBe('₱3,700.00');
      expect(capturedSystem).toContain('authoritativeLedger');
      expect(capturedSystem).toContain('NEVER say that HMO or PhilHealth coverage is owed by the patient');

      // Now return exact grounded figures; the rejected reply must not have been cached.
      replyText =
        'Your gross bill is ₱21,700.00. PhilHealth deducted ₱13,000.00 and PhilCare HMO covered ₱5,000.00. Your remaining balance of ₱3,700.00 comes from ₱350.00 for excluded toiletries plus ₱3,350.00 coverage shortfall.';
      const ok = await coraService.chat({
        db: h.db,
        encounterId: stay.id,
        facilityId: h.fixture.facility.id,
        message: 'Why do I owe ₱3,700?',
        language: 'en',
        mode: 'WHY_DO_I_OWE',
        aiConfig,
      });
      expect(ok.reply).toContain('₱350.00');
      expect(ok.reply).toContain('₱5,000.00');
      expect(ok.reply).toContain('₱3,700.00');
    } finally {
      generate.mockRestore();
    }
  });

  it('rejects ungrounded 5,000 via the patient AI route and accepts grounded partial-payment updates', async () => {
    // Encounter WITHOUT ₱5,000 anywhere in the ledger (PF ₱4,500, HMO ₱2,000, PhilHealth ₱4,000)
    const stay = await createSettlingStay({
      patientIndex: 2,
      bedIndex: 2,
      roomCents: 600_000,
      ivCents: 90_000,
      toiletriesCents: 35_000,
      pfCents: 450_000,
      philhealthHciCents: 300_000,
      philhealthPfCents: 100_000,
      hmoApprovedCents: 200_000,
    });
    const patientClient = await registerPatient(2);

    let replyText = 'Your HMO ₱5,000 made up the remaining balance.';
    const generate = vi.spyOn(geminiClient, 'generate').mockImplementation(async () => {
      const rawJson = {
        scopeDecision: 'ANSWERED',
        reply: replyText,
        mode: 'WHY_DO_I_OWE',
        suggestedActions: [],
      };
      return { modelUsed: 'primary-model', text: JSON.stringify(rawJson), rawJson };
    });

    try {
      const bad = await patientClient.post('/api/v1/patient/ai/cora/chat', {
        encounterId: stay.id,
        message: 'Why do I have a balance?',
        language: 'en',
        mode: 'WHY_DO_I_OWE',
      });
      expect(bad.status).toBe(502);
      expect(bad.body.error.code).toBe('AI_INVALID_RESPONSE');

      // Record a partial ₱1,000.00 payment and confirm Cora accepts exact payment + updated balance
      const pay = await stay.billing.post(
        `${stay.base}/payments`,
        { amountCents: 100_000, rail: 'CASH', payerName: 'Patient 2' },
        { 'idempotency-key': idem() },
      );
      expect(pay.status).toBe(201);

      // Total gross 11,750 - PH 4,000 - HMO 2,000 = 5,750 due; paid 1,000 -> remaining 4,750
      replyText =
        'You already paid ₱1,000.00 against your ₱5,750.00 patient share (after ₱4,000.00 PhilHealth and ₱2,000.00 HMO deductions), leaving a ₱4,750.00 remaining balance.';
      const good = await patientClient.post('/api/v1/patient/ai/cora/chat', {
        encounterId: stay.id,
        message: 'How much is left after my payment?',
        language: 'en',
        mode: 'WHY_DO_I_OWE',
      });
      expect(good.status, JSON.stringify(good.body)).toBe(200);
      expect(good.body.reply).toContain('₱4,750.00');
    } finally {
      generate.mockRestore();
    }
  });
});
