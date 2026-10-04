// Republic Act No. 9439 Promissory Note Calculation Engine
// Strictly 0.00% interest rate and zero financing fees for medically discharged inpatients

export interface PromissoryScheduleResult {
  financedAmount: number;
  interestRate: number;
  financingFee: number;
  totalRepayment: number;
  monthlyInstallment: number;
  schedule: number[];
}

export function computePromissorySchedule(
  principal: number,
  months: 3 | 6 | 12
): PromissoryScheduleResult {
  const financed = Number(principal.toFixed(2));
  const baseMonthly = Number((financed / months).toFixed(2));
  const schedule: number[] = [];
  
  for (let i = 0; i < months - 1; i++) {
    schedule.push(baseMonthly);
  }
  
  const priorSum = Number((baseMonthly * (months - 1)).toFixed(2));
  const lastPayment = Number((financed - priorSum).toFixed(2));
  schedule.push(lastPayment);

  // Assert zero centavo drift on sum of installments
  const sumSchedule = Number(schedule.reduce((acc, curr) => acc + curr, 0).toFixed(2));
  if (Math.abs(financed - sumSchedule) > 0.001) {
    throw new Error(`Promissory schedule centavo drift: Financed (${financed}) !== Sum (${sumSchedule})`);
  }

  return {
    financedAmount: financed,
    interestRate: 0.0000,
    financingFee: 0.00,
    totalRepayment: financed,
    monthlyInstallment: baseMonthly,
    schedule
  };
}
