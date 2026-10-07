export type CheckoutStep = 'amount' | 'method' | 'detail' | 'verification' | 'review' | 'done';
export function previousCheckoutStep(step: CheckoutStep): CheckoutStep {
  return step === 'review' || step === 'verification' ? 'detail' : step === 'detail' ? 'method' : 'amount';
}
export function paymentStatus(status: string, simulated?: boolean): string {
  if (status === 'SUCCESS') return simulated === false ? 'Paid' : 'Recorded';
  if (status === 'FAILED') return 'Failed';
  if (status === 'CANCELLED') return 'Cancelled';
  if (status === 'INITIALIZED') return 'Awaiting confirmation';
  if (status === 'PROCESSING') return 'Processing';
  return 'Status unavailable';
}
export function confirmedPayment(result: { success: boolean; payment?: { id: string; status: string }; receipt?: { officialReceiptNumber: string } }): boolean {
  return !!(result.success && result.payment?.id && result.payment.status === 'SUCCESS' && result.receipt?.officialReceiptNumber);
}
export function paymentDetailsValid(rail: string, payer: string, cardLast4: string, bank: string): boolean {
  return payer.trim().length >= 2 && (rail !== 'CREDIT_DEBIT_CARD' || /^\d{4}$/.test(cardLast4)) && (rail !== 'BANK_TRANSFER' || (bank.trim().length > 0 && bank.trim().length <= 64));
}
export const WALLET_PRESETS: Record<string, { contact: string; accent: string; background: string }> = {
  GCASH: { contact: '0917-***-9102', accent: '#FFFFFF', background: '#175CD3' },
  MAYA: { contact: '0918-***-1049', accent: '#6DE6AA', background: '#14242A' }
};
