// Authoritative Philippine Healthcare Statutory Deduction Engine (RA 9994, RA 10754, RA 11223)

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

export function computeStatutoryWaterfall(
  items: WaterfallItemInput[],
  isSeniorOrPwd: boolean,
  philhealthHci: number,
  philhealthPf: number,
  hmoMaxAllowance: number,
  roomUpgradeExcess: number,
  excessDoctorPf: number,
  patientPaid: number = 0
): StatutoryWaterfallResult {
  let grossHospitalCharges = 0;
  let grossDoctorFee = 0;
  let excludedConsumables = 0;

  for (const item of items) {
    if (item.status === 'SUPERVISORY_WAIVED' || item.status === 'WAIVED') continue;
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
    vatExemption = Number((grossTotal - grossTotal / 1.12).toFixed(2));
    const vatExemptBase = Number((grossTotal - vatExemption).toFixed(2));
    seniorPwdDiscount = Number((vatExemptBase * 0.20).toFixed(2));
  }

  const netVatDiscountedBase = Number(Math.max(0, grossTotal - vatExemption - seniorPwdDiscount).toFixed(2));
  const totalNonCovered = Number((roomUpgradeExcess + excludedConsumables + excessDoctorPf).toFixed(2));
  const eligibleCoveredBase = Math.max(0, Number((netVatDiscountedBase - totalNonCovered).toFixed(2)));

  const philhealthRequested = Number((philhealthHci + philhealthPf).toFixed(2));
  const philhealthTotal = Math.min(eligibleCoveredBase, philhealthRequested);

  const hmoEligibleBase = Math.max(0, Number((eligibleCoveredBase - philhealthTotal).toFixed(2)));
  const hmoApprovedAmount = Math.min(hmoEligibleBase, Number(hmoMaxAllowance.toFixed(2)));

  const coverageShortfall = Math.max(0, Number((hmoEligibleBase - hmoApprovedAmount).toFixed(2)));
  const netPatientDue = Number((totalNonCovered + coverageShortfall).toFixed(2));

  // Fundamental Revenue Cycle Law Verification
  const sumDeductions = Number((vatExemption + seniorPwdDiscount + philhealthTotal + hmoApprovedAmount + netPatientDue).toFixed(2));
  if (Math.abs(grossTotal - sumDeductions) > 0.05) {
    throw new Error(`Centavo drift assertion failure: Gross (${grossTotal}) !== Deductions (${sumDeductions})`);
  }

  return {
    grossHospitalCharges,
    grossDoctorFee,
    grossTotal,
    vatExemption,
    seniorPwdDiscount,
    netVatDiscountedBase,
    philhealthHci,
    philhealthPf,
    philhealthTotal,
    hmoApprovedAmount,
    roomUpgradeExcess,
    excludedConsumables,
    doctorExcessPf: excessDoctorPf,
    coverageShortfall,
    netPatientDue,
    patientPaid
  };
}
