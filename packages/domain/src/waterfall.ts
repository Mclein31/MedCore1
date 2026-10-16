import { MoneyError, assertCents, mulRatio, subCents, sumCents } from './money';

/**
 * The Philippine statutory deduction waterfall, in its only legal order:
 *
 *   Gross
 *   → 12% VAT exemption           (RA 9994 / RA 10754: 12/112 of the VAT-inclusive gross)
 *   → 20% Senior Citizen / PWD discount on the VAT-exempt base
 *   → PhilHealth case rate        (hospital share + professional-fee share)
 *   → HMO Letter of Authorization (capped by what is left)
 *   → Net patient due
 *
 * Invariant (checked on every call): gross = vat + discount + philhealth + hmo + netPatientDue.
 * All arithmetic is integer centavos; generative AI never computes any of this.
 */

export const CHARGE_CATEGORIES = [
  'ROOM_AND_BOARD',
  'PHARMACY',
  'LABORATORY',
  'IMAGING',
  'SUPPLIES',
  'PROCEDURE',
  'PROFESSIONAL_FEE',
] as const;
export type ChargeCategory = (typeof CHARGE_CATEGORIES)[number];

/** COVERED: payers may pay it. EXCLUDED: patient pays it (disallowed sundries). WAIVED: removed from the bill. */
export const CHARGE_COVERAGE = ['COVERED', 'EXCLUDED', 'WAIVED'] as const;
export type ChargeCoverage = (typeof CHARGE_COVERAGE)[number];

export interface WaterfallCharge {
  grossCents: number;
  category: ChargeCategory;
  coverage: ChargeCoverage;
}

export interface WaterfallInput {
  charges: readonly WaterfallCharge[];
  seniorOrPwd: boolean;
  philhealthHciCents: number;
  philhealthPfCents: number;
  hmoApprovedCents: number;
  /** Room-upgrade difference the patient owes above the payer's room allowance. */
  roomUpgradeExcessCents: number;
  /** Professional fee above the accredited ceiling, owed by the patient. */
  doctorExcessPfCents: number;
}

export interface WaterfallResult {
  grossHospitalCents: number;
  grossProfessionalFeeCents: number;
  grossCents: number;
  vatExemptionCents: number;
  seniorPwdDiscountCents: number;
  discountedBaseCents: number;
  /** Patient-only items (exclusions, room upgrade, excess PF) after the statutory discounts. */
  nonCoveredCents: number;
  philhealthCents: number;
  hmoCents: number;
  /** Covered charges no payer picked up. */
  coverageShortfallCents: number;
  netPatientDueCents: number;
}

const VAT_NUMERATOR = 3n; // 12/112 reduces to 3/28
const VAT_DENOMINATOR = 28n;
const SENIOR_PWD_NUMERATOR = 1n; // 20%
const SENIOR_PWD_DENOMINATOR = 5n;

export function computeWaterfall(input: WaterfallInput): WaterfallResult {
  const hci = assertCents(input.philhealthHciCents, 'PhilHealth hospital share');
  const pf = assertCents(input.philhealthPfCents, 'PhilHealth professional-fee share');
  const hmoApproved = assertCents(input.hmoApprovedCents, 'HMO approved amount');
  const roomUpgrade = assertCents(input.roomUpgradeExcessCents, 'room upgrade excess');
  const excessPf = assertCents(input.doctorExcessPfCents, 'excess professional fee');

  let hospital = 0;
  let professional = 0;
  let room = 0;
  let excluded = 0;
  for (const charge of input.charges) {
    const amount = assertCents(charge.grossCents, 'charge amount');
    if (charge.coverage === 'WAIVED') continue;
    if (charge.category === 'PROFESSIONAL_FEE') professional = sumCents(professional, amount);
    else hospital = sumCents(hospital, amount);
    if (charge.category === 'ROOM_AND_BOARD') room = sumCents(room, amount);
    if (charge.coverage === 'EXCLUDED') excluded = sumCents(excluded, amount);
  }
  if (excessPf > professional) throw new MoneyError('Excess professional fee cannot exceed the billed professional fee.');
  if (roomUpgrade > room) throw new MoneyError('Room upgrade excess cannot exceed the billed room charges.');

  const gross = sumCents(hospital, professional);
  const vat = input.seniorOrPwd ? mulRatio(gross, VAT_NUMERATOR, VAT_DENOMINATOR) : 0;
  const discount = input.seniorOrPwd ? mulRatio(gross - vat, SENIOR_PWD_NUMERATOR, SENIOR_PWD_DENOMINATOR) : 0;
  const base = subCents(gross, sumCents(vat, discount));

  // The statutory discounts apply to everything the patient buys, including
  // items payers exclude, so patient-only amounts are discounted pro rata.
  const nonCoveredGross = sumCents(excluded, roomUpgrade, excessPf);
  if (nonCoveredGross > gross) throw new MoneyError('Patient-only amounts exceed the gross bill.');
  const nonCovered = gross === 0 ? 0 : mulRatio(nonCoveredGross, BigInt(base), BigInt(gross));

  const eligible = subCents(base, nonCovered);
  const philhealth = Math.min(eligible, sumCents(hci, pf));
  const hmo = Math.min(eligible - philhealth, hmoApproved);
  const shortfall = eligible - philhealth - hmo;
  const due = sumCents(nonCovered, shortfall);

  if (gross !== sumCents(vat, discount, philhealth, hmo, due)) {
    throw new MoneyError('Waterfall failed to reconcile to the centavo.');
  }

  return {
    grossHospitalCents: hospital,
    grossProfessionalFeeCents: professional,
    grossCents: gross,
    vatExemptionCents: vat,
    seniorPwdDiscountCents: discount,
    discountedBaseCents: base,
    nonCoveredCents: nonCovered,
    philhealthCents: philhealth,
    hmoCents: hmo,
    coverageShortfallCents: shortfall,
    netPatientDueCents: due,
  };
}

export interface SettlementPosition {
  /** What the patient still has to pay or finance. */
  balanceCents: number;
  /** Paid plus financed beyond what is now due (for example after a waiver). Needs a refund. */
  creditCents: number;
  isSettled: boolean;
}

export function settlementPosition(netDueCents: number, paidCents: number, financedCents: number): SettlementPosition {
  const covered = sumCents(paidCents, financedCents);
  const due = assertCents(netDueCents);
  return {
    balanceCents: Math.max(0, due - covered),
    creditCents: Math.max(0, covered - due),
    isSettled: covered >= due,
  };
}
