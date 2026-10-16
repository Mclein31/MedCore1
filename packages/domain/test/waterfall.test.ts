import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  CHARGE_CATEGORIES,
  computeWaterfall,
  settlementPosition,
  type WaterfallCharge,
} from '../src/waterfall';
import { MoneyError } from '../src/money';

const none = {
  seniorOrPwd: false,
  philhealthHciCents: 0,
  philhealthPfCents: 0,
  hmoApprovedCents: 0,
  roomUpgradeExcessCents: 0,
  doctorExcessPfCents: 0,
};

describe('computeWaterfall', () => {
  it('passes the full gross through when there are no discounts or payers', () => {
    const result = computeWaterfall({
      ...none,
      charges: [
        { grossCents: 1_000_000, category: 'ROOM_AND_BOARD', coverage: 'COVERED' },
        { grossCents: 500_000, category: 'PROFESSIONAL_FEE', coverage: 'COVERED' },
      ],
    });
    expect(result.grossCents).toBe(1_500_000);
    expect(result.grossHospitalCents).toBe(1_000_000);
    expect(result.grossProfessionalFeeCents).toBe(500_000);
    expect(result.netPatientDueCents).toBe(1_500_000);
  });

  it('applies VAT exemption then the 20% senior discount in that order', () => {
    // ₱11,200.00 gross: VAT 12/112 = ₱1,200.00, base ₱10,000.00, 20% = ₱2,000.00.
    const result = computeWaterfall({
      ...none,
      seniorOrPwd: true,
      charges: [{ grossCents: 1_120_000, category: 'PHARMACY', coverage: 'COVERED' }],
    });
    expect(result.vatExemptionCents).toBe(120_000);
    expect(result.seniorPwdDiscountCents).toBe(200_000);
    expect(result.discountedBaseCents).toBe(800_000);
    expect(result.netPatientDueCents).toBe(800_000);
  });

  it('applies PhilHealth before the HMO and caps each at what is left', () => {
    const result = computeWaterfall({
      ...none,
      charges: [{ grossCents: 3_000_000, category: 'PROCEDURE', coverage: 'COVERED' }],
      philhealthHciCents: 1_000_000,
      philhealthPfCents: 500_000,
      hmoApprovedCents: 5_000_000,
    });
    expect(result.philhealthCents).toBe(1_500_000);
    expect(result.hmoCents).toBe(1_500_000);
    expect(result.netPatientDueCents).toBe(0);
  });

  it('keeps excluded items, room upgrade and excess PF with the patient', () => {
    const result = computeWaterfall({
      ...none,
      charges: [
        { grossCents: 2_000_000, category: 'ROOM_AND_BOARD', coverage: 'COVERED' },
        { grossCents: 50_000, category: 'SUPPLIES', coverage: 'EXCLUDED' },
        { grossCents: 1_000_000, category: 'PROFESSIONAL_FEE', coverage: 'COVERED' },
      ],
      roomUpgradeExcessCents: 300_000,
      doctorExcessPfCents: 200_000,
      hmoApprovedCents: 99_999_999,
    });
    expect(result.nonCoveredCents).toBe(550_000);
    expect(result.netPatientDueCents).toBe(550_000);
  });

  it('discounts patient-only items for seniors instead of failing', () => {
    const result = computeWaterfall({
      ...none,
      seniorOrPwd: true,
      charges: [{ grossCents: 1_120_000, category: 'SUPPLIES', coverage: 'EXCLUDED' }],
      hmoApprovedCents: 99_999_999,
    });
    expect(result.nonCoveredCents).toBe(800_000);
    expect(result.hmoCents).toBe(0);
    expect(result.netPatientDueCents).toBe(800_000);
  });

  it('ignores waived charges entirely', () => {
    const result = computeWaterfall({
      ...none,
      charges: [
        { grossCents: 100_000, category: 'LABORATORY', coverage: 'COVERED' },
        { grossCents: 999_999, category: 'LABORATORY', coverage: 'WAIVED' },
      ],
    });
    expect(result.grossCents).toBe(100_000);
  });

  it('rejects fractional, negative and impossible inputs', () => {
    const bad =
      (charge: Partial<WaterfallCharge>, extra: Partial<typeof none> = {}) =>
      () =>
        computeWaterfall({
          ...none,
          ...extra,
          charges: [{ grossCents: 100, category: 'PHARMACY', coverage: 'COVERED', ...charge }],
        });
    expect(bad({ grossCents: 10.5 })).toThrow(MoneyError);
    expect(bad({ grossCents: -1 })).toThrow(MoneyError);
    expect(bad({ grossCents: Number.NaN })).toThrow(MoneyError);
    expect(bad({}, { doctorExcessPfCents: 1 })).toThrow(/professional fee/);
    expect(bad({}, { roomUpgradeExcessCents: 1 })).toThrow(/Room upgrade/);
  });

  it('always reconciles to the centavo (property)', () => {
    const charge = fc.record({
      grossCents: fc.integer({ min: 0, max: 50_000_000 }),
      category: fc.constantFrom(...CHARGE_CATEGORIES),
      coverage: fc.constantFrom('COVERED' as const, 'EXCLUDED' as const, 'WAIVED' as const),
    });
    fc.assert(
      fc.property(
        fc.array(charge, { maxLength: 40 }),
        fc.boolean(),
        fc.integer({ min: 0, max: 30_000_000 }),
        fc.integer({ min: 0, max: 30_000_000 }),
        fc.integer({ min: 0, max: 60_000_000 }),
        (charges, seniorOrPwd, hci, pf, hmo) => {
          const r = computeWaterfall({
            charges,
            seniorOrPwd,
            philhealthHciCents: hci,
            philhealthPfCents: pf,
            hmoApprovedCents: hmo,
            roomUpgradeExcessCents: 0,
            doctorExcessPfCents: 0,
          });
          const parts =
            r.vatExemptionCents +
            r.seniorPwdDiscountCents +
            r.philhealthCents +
            r.hmoCents +
            r.netPatientDueCents;
          expect(parts).toBe(r.grossCents);
          for (const value of Object.values(r)) {
            expect(Number.isSafeInteger(value)).toBe(true);
            expect(value).toBeGreaterThanOrEqual(0);
          }
          expect(r.philhealthCents).toBeLessThanOrEqual(hci + pf);
          expect(r.hmoCents).toBeLessThanOrEqual(hmo);
        },
      ),
      { numRuns: 2000 },
    );
  });
});

describe('settlementPosition', () => {
  it('reports balance, credit and settled state', () => {
    expect(settlementPosition(10_000, 4_000, 0)).toEqual({
      balanceCents: 6_000,
      creditCents: 0,
      isSettled: false,
    });
    expect(settlementPosition(10_000, 4_000, 6_000)).toEqual({
      balanceCents: 0,
      creditCents: 0,
      isSettled: true,
    });
    expect(settlementPosition(5_000, 8_000, 0)).toEqual({
      balanceCents: 0,
      creditCents: 3_000,
      isSettled: true,
    });
    expect(settlementPosition(0, 0, 0).isSettled).toBe(true);
  });
});
