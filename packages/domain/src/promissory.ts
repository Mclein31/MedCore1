import { addMonths, manilaDate } from './dates';
import { MoneyError, assertCents } from './money';

/**
 * RA 9439 (Anti-Hospital Detention Act): a patient who cannot pay may leave on
 * a promissory note. MedCore notes carry 0% interest and no fees, by policy.
 */
export const INSTALLMENT_TERMS = [3, 6, 12] as const;
export type InstallmentTerm = (typeof INSTALLMENT_TERMS)[number];

export interface Installment {
  sequence: number;
  dueDate: string;
  amountCents: number;
}

export interface PromissorySchedule {
  principalCents: number;
  interestRateBasisPoints: 0;
  feeCents: 0;
  totalRepaymentCents: number;
  installments: Installment[];
}

/**
 * Equal monthly installments; any remainder centavos go to the last one,
 * so the schedule always sums to the principal exactly.
 */
export function buildPromissorySchedule(
  principalCents: number,
  months: InstallmentTerm,
  signedAt: Date,
): PromissorySchedule {
  const principal = assertCents(principalCents, 'principal');
  if (principal <= 0) throw new MoneyError('A promissory note must finance a positive amount.');
  if (!INSTALLMENT_TERMS.includes(months)) throw new MoneyError('Choose a 3, 6 or 12 month term.');

  const base = Math.floor(principal / months);
  const signedOn = manilaDate(signedAt);
  const installments: Installment[] = [];
  for (let i = 1; i <= months; i++) {
    const amount = i === months ? principal - base * (months - 1) : base;
    installments.push({ sequence: i, dueDate: addMonths(signedOn, i), amountCents: amount });
  }
  const total = installments.reduce((sum, item) => sum + item.amountCents, 0);
  if (total !== principal) throw new MoneyError('Promissory schedule failed to reconcile.');
  return {
    principalCents: principal,
    interestRateBasisPoints: 0,
    feeCents: 0,
    totalRepaymentCents: principal,
    installments,
  };
}
