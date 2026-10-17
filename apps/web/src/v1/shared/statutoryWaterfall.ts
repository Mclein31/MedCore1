// Shared deterministic centavo engine; no database or platform dependencies.
// Matches the monetary columns: PostgreSQL numeric(15, 2).
const MAX_CENTS = 999999999999999;
export interface WaterfallItemInput {
  grossAmount: number;
  category: string;
  status: string;
}
export interface StatutoryWaterfallResult {
  grossHospitalCharges: number;
  grossDoctorFee: number;
  grossTotal: number;
  vatExemption: number;
  seniorPwdDiscount: number;
  netVatDiscountedBase: number;
  philhealthHci: number;
  philhealthPf: number;
  philhealthTotal: number;
  hmoApprovedAmount: number;
  roomUpgradeExcess: number;
  excludedConsumables: number;
  doctorExcessPf: number;
  coverageShortfall: number;
  netPatientDue: number;
  patientPaid: number;
}
export function moneyCents(value: number): number {
  const scaled = value * 100;
  const cents = Math.round(scaled);
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < 0 ||
    !Number.isSafeInteger(cents) ||
    cents > MAX_CENTS ||
    Math.abs(scaled - cents) > 0.000001
  ) {
    throw new Error('[Waterfall Error] Amounts must be finite, nonnegative, safe centavo values.');
  }
  return cents;
}
function sumCents(...values: number[]): number {
  const sum = values.reduce((total, value) => total + BigInt(value), 0n);
  if (sum > BigInt(MAX_CENTS)) throw new Error('[Waterfall Error] Centavo total exceeds the safe range.');
  return Number(sum);
}
function roundedRatio(value: number, numerator: bigint, denominator: bigint): number {
  return Number((BigInt(value) * numerator + denominator / 2n) / denominator);
}
export function computeStatutoryWaterfall(
  items: WaterfallItemInput[],
  isSeniorOrPwd: boolean,
  philhealthHci: number,
  philhealthPf: number,
  hmoMaxAllowance: number,
  roomUpgradeExcess: number,
  excessDoctorPf: number,
  patientPaid: number = 0,
): StatutoryWaterfallResult {
  if (!Array.isArray(items) || typeof isSeniorOrPwd !== 'boolean')
    throw new Error('[Waterfall Error] Invalid calculation inputs.');
  const [hci, pf, hmo, room, excess, paid] = [
    philhealthHci,
    philhealthPf,
    hmoMaxAllowance,
    roomUpgradeExcess,
    excessDoctorPf,
    patientPaid,
  ].map(moneyCents);
  let hospital = 0,
    doctor = 0,
    excluded = 0;
  for (const item of items) {
    if (!item || typeof item.category !== 'string' || typeof item.status !== 'string')
      throw new Error('[Waterfall Error] Invalid charge item.');
    const amount = moneyCents(item.grossAmount);
    if (item.status === 'SUPERVISORY_WAIVED' || item.status === 'WAIVED') continue;
    if (item.category === 'PROFESSIONAL_FEE') doctor = sumCents(doctor, amount);
    else hospital = sumCents(hospital, amount);
    if (item.status === 'DISALLOWED_SUNDRY') excluded = sumCents(excluded, amount);
  }
  const gross = sumCents(hospital, doctor);
  const vat = isSeniorOrPwd ? roundedRatio(gross, 3n, 28n) : 0;
  const discount = isSeniorOrPwd ? roundedRatio(gross - vat, 1n, 5n) : 0;
  const base = gross - vat - discount;
  const nonCovered = sumCents(room, excluded, excess);
  if (nonCovered > base)
    throw new Error('[Waterfall Error] Non-covered responsibility exceeds the discounted gross base.');
  const eligible = base - nonCovered;
  const philhealth = Math.min(eligible, sumCents(hci, pf));
  const hmoEligible = eligible - philhealth;
  const hmoApproved = Math.min(hmoEligible, hmo);
  const shortfall = hmoEligible - hmoApproved;
  const due = sumCents(nonCovered, shortfall);
  if (gross !== sumCents(vat, discount, philhealth, hmoApproved, due))
    throw new Error('[Waterfall Error] Centavo reconciliation failed.');
  return {
    grossHospitalCharges: hospital / 100,
    grossDoctorFee: doctor / 100,
    grossTotal: gross / 100,
    vatExemption: vat / 100,
    seniorPwdDiscount: discount / 100,
    netVatDiscountedBase: base / 100,
    philhealthHci: hci / 100,
    philhealthPf: pf / 100,
    philhealthTotal: philhealth / 100,
    hmoApprovedAmount: hmoApproved / 100,
    roomUpgradeExcess: room / 100,
    excludedConsumables: excluded / 100,
    doctorExcessPf: excess / 100,
    coverageShortfall: shortfall / 100,
    netPatientDue: due / 100,
    patientPaid: paid / 100,
  };
}
