import { Encounter, ChargemasterItem, StatutoryWaterfall, PromissoryNote } from '../types/domain';

export interface InstallmentPlan {
  termMonths: 3 | 6 | 12;
  financedAmount: number;
  interestRate: number; // 0.00 for RA 9439 statutory notes
  financingFee: number; // 0.00
  totalRepayment: number;
  monthlyInstallment: number;
  schedule: number[];
  isReconciled: boolean;
}

export interface PatientFinancialRecord {
  encounterId: string;
  patientName: string;
  isSeniorOrPwd: boolean;

  // 1. Hospital Bill (Gross Charges)
  grossHospitalCharges: number;
  grossDoctorFee: number;
  hospitalBill: number; // grossHospitalCharges + grossDoctorFee

  // 2. PhilHealth Coverage (First Payer)
  philhealthHci: number;
  philhealthPf: number;
  philhealthCoverage: number;

  // 3. HMO Coverage (Second Payer)
  hmoApprovedAmount: number;

  // 4. Other Adjustments (Statutory Discounts & Waivers)
  vatExemption: number;
  seniorPwdDiscount: number;
  totalAdjustments: number; // vatExemption + seniorPwdDiscount

  // 5. Patient Responsibility (Net Patient Due)
  patientResponsibility: number;

  // Breakdown items explaining patient responsibility
  roomUpgradeExcess: number;
  excludedConsumables: number;
  doctorExcessPf: number;
  coverageShortfall: number;

  // 6. Outstanding Balance
  amountPaid: number;
  outstandingBalance: number;

  // 7. Financed Amount
  financedAmount: number;

  // 8. Financing Fee / Interest (0% statutory under RA 9439)
  interestRate: number;
  financingFee: number;

  // 9. Total Repayment
  totalRepayment: number;

  // 10. Monthly Installment plans
  installmentPlans: {
    3: InstallmentPlan;
    6: InstallmentPlan;
    12: InstallmentPlan;
  };

  // Reconciled flag
  isWaterfallBalanced: boolean;
  reconciliationDiff: number;
}

/**
 * Calculates a mathematically reconciled installment plan for a given principal.
 * Pursuant to RA 9439, statutory hospital promissory notes are 0% interest.
 * Monthly payments are rounded to centavo precision with exact centavo reconciliation on the final payment.
 */
export function calculateInstallmentPlan(
  principalAmount: number,
  months: 3 | 6 | 12,
  interestRate: number = 0
): InstallmentPlan {
  const financedAmount = Number(Math.max(0, principalAmount).toFixed(2));
  const financingFee = Number((financedAmount * interestRate).toFixed(2));
  const totalRepayment = Number((financedAmount + financingFee).toFixed(2));

  if (totalRepayment <= 0) {
    return {
      termMonths: months,
      financedAmount: 0,
      interestRate,
      financingFee: 0,
      totalRepayment: 0,
      monthlyInstallment: 0,
      schedule: Array(months).fill(0),
      isReconciled: true
    };
  }

  const monthlyInstallment = Number((totalRepayment / months).toFixed(2));
  const schedule: number[] = [];

  for (let i = 0; i < months - 1; i++) {
    schedule.push(monthlyInstallment);
  }

  // Final payment adjusted to reconcile centavo rounding diff
  const sumPrior = Number((monthlyInstallment * (months - 1)).toFixed(2));
  const lastPayment = Number((totalRepayment - sumPrior).toFixed(2));
  schedule.push(lastPayment);

  const totalSum = Number(schedule.reduce((acc, curr) => acc + curr, 0).toFixed(2));
  const isReconciled = Math.abs(totalSum - totalRepayment) < 0.005;

  return {
    termMonths: months,
    financedAmount,
    interestRate,
    financingFee,
    totalRepayment,
    monthlyInstallment,
    schedule,
    isReconciled
  };
}

/**
 * Calculates the complete 10-step financial audit record for an encounter.
 */
export function calculatePatientFinancialRecord(encounter: Encounter): PatientFinancialRecord {
  const w = encounter.waterfall;
  const isSeniorOrPwd = Boolean(
    encounter.patient.seniorCitizenId ||
    encounter.patient.isSeniorCitizen ||
    encounter.patient.pwdId ||
    encounter.patient.isPwd
  );

  const hospitalBill = w.grossTotal;
  const philhealthCoverage = w.philhealthTotal;
  const hmoApprovedAmount = w.hmoApprovedAmount;
  const vatExemption = w.vatExemption;
  const seniorPwdDiscount = w.seniorPwdDiscount;
  const totalAdjustments = Number((vatExemption + seniorPwdDiscount).toFixed(2));
  const patientResponsibility = w.netPatientDue;

  // Statutory accounting balance check:
  // Hospital Bill = Total Adjustments + PhilHealth + HMO + Patient Responsibility
  const totalDeductionsAndDue = Number(
    (totalAdjustments + philhealthCoverage + hmoApprovedAmount + patientResponsibility).toFixed(2)
  );
  const reconciliationDiff = Number(Math.abs(hospitalBill - totalDeductionsAndDue).toFixed(2));
  const isWaterfallBalanced = reconciliationDiff <= 0.05;

  // Shortfall on covered base (e.g. if HMO allowance is less than covered base)
  const nonCoveredTotal = Number(
    (w.roomUpgradeExcess + w.excludedConsumables + w.doctorExcessPf).toFixed(2)
  );
  const coverageShortfall = Math.max(0, Number((patientResponsibility - nonCoveredTotal).toFixed(2)));

  // Outstanding balance (if cleared gate pass with QR/cash, settled; if promissory note or unpaid, due)
  const isPaidCashOrQr =
    encounter.stage === 'CLEARED_GATE_PASS' &&
    encounter.dischargePass?.settlementChannel !== 'PROMISSORY_NOTE';

  const amountPaid = isPaidCashOrQr ? patientResponsibility : 0;
  const outstandingBalance = isPaidCashOrQr ? 0 : patientResponsibility;

  // Promissory Note Financed Amount (defaults to patientResponsibility or note principal)
  const financedAmount = encounter.promissoryNote
    ? encounter.promissoryNote.principalAmount
    : outstandingBalance;

  const plan3 = calculateInstallmentPlan(financedAmount, 3);
  const plan6 = calculateInstallmentPlan(financedAmount, 6);
  const plan12 = calculateInstallmentPlan(financedAmount, 12);

  return {
    encounterId: encounter.id,
    patientName: encounter.patient.fullName || encounter.patient.maskedName,
    isSeniorOrPwd,
    grossHospitalCharges: w.grossHospitalCharges,
    grossDoctorFee: w.grossDoctorFee,
    hospitalBill,
    philhealthHci: w.philhealthHci,
    philhealthPf: w.philhealthPf,
    philhealthCoverage,
    hmoApprovedAmount,
    vatExemption,
    seniorPwdDiscount,
    totalAdjustments,
    patientResponsibility,
    roomUpgradeExcess: w.roomUpgradeExcess,
    excludedConsumables: w.excludedConsumables,
    doctorExcessPf: w.doctorExcessPf,
    coverageShortfall,
    amountPaid,
    outstandingBalance,
    financedAmount,
    interestRate: 0,
    financingFee: 0,
    totalRepayment: financedAmount,
    installmentPlans: {
      3: plan3,
      6: plan6,
      12: plan12
    },
    isWaterfallBalanced,
    reconciliationDiff
  };
}

/**
 * Performs a comprehensive audit across all patient encounters in the MedCore dataset.
 */
export function auditEntireDataset(encounters: Encounter[]) {
  const auditRecords = encounters.map(calculatePatientFinancialRecord);

  let balancedCount = 0;
  let mismatchCount = 0;
  let zeroBalanceCount = 0;
  let positiveBalanceCount = 0;
  let promissoryNoteCount = 0;
  let promissoryNoteValidCount = 0;
  let installmentReconciledCount = 0;

  const failures: Array<{
    encounterId: string;
    patientName: string;
    issue: string;
    details: any;
  }> = [];

  for (let i = 0; i < encounters.length; i++) {
    const enc = encounters[i];
    const rec = auditRecords[i];

    if (rec.isWaterfallBalanced) {
      balancedCount++;
    } else {
      mismatchCount++;
      failures.push({
        encounterId: enc.id,
        patientName: rec.patientName,
        issue: 'Waterfall does not reconcile to Hospital Gross Bill',
        details: {
          gross: rec.hospitalBill,
          adjustments: rec.totalAdjustments,
          philhealth: rec.philhealthCoverage,
          hmo: rec.hmoApprovedAmount,
          patientDue: rec.patientResponsibility,
          diff: rec.reconciliationDiff
        }
      });
    }

    if (rec.patientResponsibility === 0) {
      zeroBalanceCount++;
    } else {
      positiveBalanceCount++;
    }

    // Verify installment plans
    const allPlansReconciled =
      rec.installmentPlans[3].isReconciled &&
      rec.installmentPlans[6].isReconciled &&
      rec.installmentPlans[12].isReconciled;

    if (allPlansReconciled) {
      installmentReconciledCount++;
    } else {
      failures.push({
        encounterId: enc.id,
        patientName: rec.patientName,
        issue: 'Installment plan schedule rounding does not sum to principal',
        details: rec.installmentPlans
      });
    }

    // Verify promissory note if present
    if (enc.promissoryNote) {
      promissoryNoteCount++;
      const pn = enc.promissoryNote;
      const expectedMonthly = Number((pn.principalAmount / pn.installmentMonths).toFixed(2));
      const monthlyMatches = Math.abs(pn.monthlyInstallment - expectedMonthly) <= 0.05;
      const principalMatchesDue = Math.abs(pn.principalAmount - enc.waterfall.netPatientDue) <= 0.05;

      if (monthlyMatches && principalMatchesDue) {
        promissoryNoteValidCount++;
      } else {
        failures.push({
          encounterId: enc.id,
          patientName: rec.patientName,
          issue: 'Promissory note principal or monthly installment mismatch with patient due',
          details: {
            netDue: enc.waterfall.netPatientDue,
            notePrincipal: pn.principalAmount,
            noteMonths: pn.installmentMonths,
            noteMonthly: pn.monthlyInstallment,
            expectedMonthly
          }
        });
      }
    }
  }

  return {
    totalEncounters: encounters.length,
    balancedCount,
    mismatchCount,
    zeroBalanceCount,
    positiveBalanceCount,
    promissoryNoteCount,
    promissoryNoteValidCount,
    installmentReconciledCount,
    isDatasetClean: mismatchCount === 0 && failures.length === 0,
    failures,
    auditRecords
  };
}
