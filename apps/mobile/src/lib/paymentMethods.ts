// Pure payment-method metadata. Backend rail enums only — no invented
// providers. Mirrors the dashboard DemoPaymentModal rail set.
// (Intentionally free of image imports so this module stays unit-testable.)

export type RailKind = 'qr' | 'wallet' | 'card' | 'bank' | 'promissory';

export interface PaymentMethod {
  rail: string;
  label: string;
  hint: string;
  icon: string;
  kind: RailKind;
  hasLogo: boolean;
  hasQr: boolean;
}

export const PAYMENT_METHODS: PaymentMethod[] = [
  { rail: 'QR_PH', label: 'QR Ph', hint: 'Scan with any bank or e-wallet app', icon: 'qr', kind: 'qr', hasLogo: true, hasQr: true },
  { rail: 'GCASH', label: 'GCash', hint: 'Confirm in this demo checkout', icon: 'phone', kind: 'wallet', hasLogo: true, hasQr: true },
  { rail: 'MAYA', label: 'Maya', hint: 'Confirm in this demo checkout', icon: 'phone', kind: 'wallet', hasLogo: true, hasQr: true },
  { rail: 'CREDIT_DEBIT_CARD', label: 'Debit / Credit', hint: 'Visa or Mastercard', icon: 'payments', kind: 'card', hasLogo: false, hasQr: false },
  { rail: 'BANK_TRANSFER', label: 'Bank Transfer', hint: 'InstaPay / PESONet details', icon: 'bank', kind: 'bank', hasLogo: false, hasQr: false },
  { rail: 'PROMISSORY_NOTE', label: 'RA 9439 Note', hint: '0% statutory installments', icon: 'scale', kind: 'promissory', hasLogo: false, hasQr: false }
];

export function methodForRail(rail: string): PaymentMethod {
  return PAYMENT_METHODS.find((m) => m.rail === rail) || PAYMENT_METHODS[0];
}

export function isQrRail(rail: string): boolean {
  return rail === 'GCASH' || rail === 'MAYA' || rail === 'QR_PH';
}
