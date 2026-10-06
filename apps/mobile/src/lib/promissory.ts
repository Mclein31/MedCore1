// Client-side installment preview for RA 9439 notes. Mirrors the backend
// computePromissorySchedule centavo logic exactly, but the BACKEND response
// remains authoritative — this is labeled "estimated" in the UI.

export interface InstallmentPreview {
  financedAmount: number;
  monthlyInstallment: number;
  totalRepayment: number;
  schedule: number[];
}

export function previewInstallments(principal: number, months: 3 | 6 | 12): InstallmentPreview {
  const cents = Math.round(principal * 100);
  if (!Number.isSafeInteger(cents) || cents < 0) throw new Error('Enter a valid installment principal.');
  const financed = cents / 100;
  const monthlyCents = Math.floor(cents / months);
  const baseMonthly = monthlyCents / 100;
  const schedule = Array.from({ length: months }, (_, i) =>
    (i === months - 1 ? cents - monthlyCents * (months - 1) : monthlyCents) / 100);
  return { financedAmount: financed, monthlyInstallment: baseMonthly, totalRepayment: financed, schedule };
}

export function estimatedFirstDueDate(from = new Date()): string {
  const d = new Date(from.getTime() + 30 * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}
