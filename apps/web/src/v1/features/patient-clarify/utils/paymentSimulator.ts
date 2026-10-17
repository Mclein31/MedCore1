import type { DemoPaymentRail, DemoPaymentRecord, PaymentReceipt } from '../types/billing';

/**
 * Generates an idempotent payment ID conforming to enterprise payment conventions
 */
export function generatePaymentId(encounterId: string): string {
  const encNum = encounterId.replace(/\D/g, '') || '8812';
  const rand = Math.floor(10000 + Math.random() * 90000);
  return `PAY-DEMO-${encNum}-${rand}`;
}

/**
 * Idempotently retrieves or creates exactly ONE receipt for a payment record.
 * Guarantees that multiple calls with the same payment record or paymentId return the identical receipt.
 */
export function createOrGetReceipt(
  payment: DemoPaymentRecord,
  existingReceipts: PaymentReceipt[] = [],
): PaymentReceipt {
  const paymentId = payment.paymentId || payment.id;
  const existing = existingReceipts.find(
    (r) => r.paymentId === paymentId || (payment.receiptId && r.id === payment.receiptId),
  );
  if (existing) {
    return existing;
  }

  const orDigits =
    payment.officialReceiptNumber.replace(/\D/g, '') || String(Math.floor(10000 + Math.random() * 90000));
  const receiptId = payment.receiptId || `RCPT-SJMC-2026-${orDigits}`;

  const receipt: PaymentReceipt = {
    id: receiptId,
    paymentId,
    billId: payment.billId,
    amount: payment.amount,
    paymentMethod: payment.paymentRail,
    date: payment.timestamp,
    referenceNumber: payment.channelReference,
    officialReceiptNumber: payment.officialReceiptNumber,
    payerName: payment.payerName,
    payerContactMasked: payment.payerContactMasked,
    gatewayAuthCode: payment.gatewayAuthCode,
    bankName: payment.bankName,
    notes: payment.notes,
    isSimulatedDemo: true,
  };

  return receipt;
}

/**
 * Deterministically generates demo transaction references matching Philippine fintech conventions
 */
export function generateTransactionReference(rail: DemoPaymentRail): string {
  const randNum = Math.floor(100000 + Math.random() * 900000);
  switch (rail) {
    case 'QR_PH':
      return `TXN-DEMO-QRPH-${randNum}`;
    case 'GCASH':
      return `TXN-DEMO-GCASH-${randNum}`;
    case 'MAYA':
      return `TXN-DEMO-MAYA-${randNum}`;
    case 'CREDIT_DEBIT_CARD':
      return `AUTH-VS-${randNum}`;
    case 'BANK_TRANSFER':
      return `TXN-DEMO-INSTAPAY-${randNum}`;
    case 'PROMISSORY_NOTE':
      return `PN-RA9439-${randNum}`;
    default:
      return `TXN-DEMO-${randNum}`;
  }
}

/**
 * Generates official receipt number conforming to BIR / DOH hospital collection format
 */
export function generateOfficialReceiptNumber(): string {
  const num = Math.floor(10000 + Math.random() * 90000);
  return `OR-SJMC-2026-${num}`;
}

/**
 * Generates an HMAC-SHA256 mock signature for the digital discharge pass
 */
export function generateHmacSignature(encounterId: string, amount: number, timestamp: string): string {
  const payload = `${encounterId}:${amount.toFixed(2)}:${timestamp}:ST_JUDE_MANILA`;
  let hash = 0;
  for (let i = 0; i < payload.length; i++) {
    hash = (hash << 5) - hash + payload.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  const randHex = Math.random().toString(16).substring(2, 10);
  return `hmac_sha256_${hex}_${randHex}`;
}

/**
 * Generates a 4-digit numeric verification PIN for lobby security quick check
 */
export function generateVerificationPin(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

/**
 * Generates a standardized gate pass identifier
 */
export function generateGatePassNumber(): string {
  return `PASS-MC-${Math.floor(10000 + Math.random() * 90000)}`;
}

/**
 * Basic Luhn algorithm validator for simulated card numbers
 */
export function validateLuhn(rawNumber: string): boolean {
  const sanitized = rawNumber.replace(/\D/g, '');
  if (sanitized.length < 13 || sanitized.length > 19) return false;

  let sum = 0;
  let alternate = false;
  for (let i = sanitized.length - 1; i >= 0; i--) {
    let n = parseInt(sanitized.charAt(i), 10);
    if (alternate) {
      n *= 2;
      if (n > 9) n = (n % 10) + 1;
    }
    sum += n;
    alternate = !alternate;
  }
  return sum % 10 === 0;
}

/**
 * Validates Philippine mobile numbers (09XXXXXXXXX or +639XXXXXXXXX)
 */
export function validatePhilippineMobile(mobile: string): boolean {
  const clean = mobile.replace(/[\s-]/g, '');
  return /^(09\d{9}|\+639\d{9})$/.test(clean);
}

/**
 * Validates MM/YY card expiration relative to current simulated timeline (2026-09)
 */
export function validateExpiry(expiry: string): boolean {
  const match = expiry.match(/^(\d{2})\/(\d{2})$/);
  if (!match) return false;
  const month = parseInt(match[1], 10);
  const year = parseInt(match[2], 10) + 2000;
  if (month < 1 || month > 12) return false;
  // Simulated date is September 2026
  if (year < 2026) return false;
  if (year === 2026 && month < 9) return false;
  return true;
}
