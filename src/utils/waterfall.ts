import { ChargemasterItem, StatutoryWaterfall } from '../types/domain';

/**
 * Computes the strict statutory deduction waterfall pursuant to:
 * - Republic Act No. 9994 (Expanded Senior Citizens Act)
 * - Republic Act No. 10754 (Expanding Benefits for PWDs)
 * - Republic Act No. 11223 (Universal Health Care Act)
 * - BIR Revenue Regulations
 *
 * Sequence: Gross -> 12% VAT Exemption -> 20% SC/PWD Discount -> PhilHealth ACR -> HMO LOA -> Patient OOP
 * All figures enforced with 2-decimal precision (centavo exactness).
 *
 * Fundamental Revenue Cycle Accounting Law:
 * Gross Total = VAT Exemption + Senior Discount + PhilHealth Benefit + HMO Approved + Net Patient Due
 *
 * Regulatory & Contractual Precedence:
 * Non-covered items (Room Upgrade Differential, Disallowed Sundries, Doctor Excess PF) are strictly
 * ineligible for PhilHealth case rate absorption or HMO LOA coverage, and pass directly to Net Patient Due.
 */
export function recalculateWaterfall(
  items: ChargemasterItem[],
  isSeniorOrPwd: boolean,
  philhealthHci: number,
  philhealthPf: number,
  hmoMaxAllowance: number,
  roomUpgradeExcess: number,
  excessDoctorPf: number
): StatutoryWaterfall {
  // Aggregate hospital facility charges vs doctor professional fees
  let grossHospitalCharges = 0;
  let grossDoctorFee = 0;
  let excludedConsumables = 0;

  for (const item of items) {
    if (item.status === 'SUPERVISORY_WAIVED' || item.status === 'WAIVED') {
      continue;
    }
    if (item.category === 'PROFESSIONAL_FEE') {
      grossDoctorFee += item.grossAmount;
    } else {
      grossHospitalCharges += item.grossAmount;
    }

    if (item.status === 'DISALLOWED_SUNDRY') {
      excludedConsumables += item.grossAmount;
    }
  }

  grossHospitalCharges = Number(grossHospitalCharges.toFixed(2));
  grossDoctorFee = Number(grossDoctorFee.toFixed(2));
  const grossTotal = Number((grossHospitalCharges + grossDoctorFee).toFixed(2));

  let vatExemption = 0;
  let seniorPwdDiscount = 0;

  if (isSeniorOrPwd) {
    // 12% VAT Exemption: Base = Gross / 1.12; VAT = Gross - Base
    vatExemption = Number((grossTotal - grossTotal / 1.12).toFixed(2));
    const vatExemptBase = Number((grossTotal - vatExemption).toFixed(2));
    // 20% Statutory Discount applied on the VAT-exempt base
    seniorPwdDiscount = Number((vatExemptBase * 0.20).toFixed(2));
  }

  const netVatDiscountedBase = Number(
    Math.max(0, grossTotal - vatExemption - seniorPwdDiscount).toFixed(2)
  );

  // Non-covered patient items that PhilHealth and HMO exclude by regulation and policy
  const totalNonCovered = Number(
    (roomUpgradeExcess + excludedConsumables + excessDoctorPf).toFixed(2)
  );

  // The base of charges eligible for statutory PhilHealth and third-party HMO coverage
  const eligibleCoveredBase = Math.max(0, Number((netVatDiscountedBase - totalNonCovered).toFixed(2)));

  const philhealthRequested = Number((philhealthHci + philhealthPf).toFixed(2));
  // PhilHealth benefit is applied against eligible covered charges (cannot absorb room upgrade or excess PF)
  const philhealthTotal = Math.min(eligibleCoveredBase, philhealthRequested);

  // HMO coverage applied strictly against remaining eligible covered base after PhilHealth
  const hmoEligibleBase = Math.max(0, Number((eligibleCoveredBase - philhealthTotal).toFixed(2)));
  const hmoApprovedAmount = Math.min(hmoEligibleBase, Number(hmoMaxAllowance.toFixed(2)));

  // Coverage shortfall on eligible items (e.g. when HMO MBL is capped)
  const coverageShortfall = Math.max(0, Number((hmoEligibleBase - hmoApprovedAmount).toFixed(2)));

  // Net Patient Out-of-Pocket Due = Non-covered items + any HMO coverage shortfall
  const netPatientDue = Number((totalNonCovered + coverageShortfall).toFixed(2));

  return {
    grossHospitalCharges,
    grossDoctorFee,
    grossTotal,
    grossCharges: grossTotal,
    vatExemption,
    seniorPwdDiscount,
    netVatDiscountedBase,
    philhealthHci,
    philhealthPf,
    philhealthTotal,
    hmoApprovedAmount,
    netPatientDue,
    roomUpgradeExcess: Number(roomUpgradeExcess.toFixed(2)),
    excludedConsumables: Number(excludedConsumables.toFixed(2)),
    doctorExcessPf: Number(excessDoctorPf.toFixed(2))
  };
}
