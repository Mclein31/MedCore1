import type { PatientEncounter, PaymentRecord, ReceiptRecord } from '../types/domain';
import type { ApiClient } from '../lib/api';

export type PaymentRail =
  'GCASH' | 'MAYA' | 'QR_PH' | 'CREDIT_DEBIT_CARD' | 'BANK_TRANSFER' | 'PROMISSORY_NOTE';

export interface PayInput {
  amount: number;
  paymentRail: PaymentRail | string;
  payerName: string;
  payerContactMasked?: string;
  cardBrand?: string;
  cardLast4?: string;
  bankName?: string;
  notes?: string;
}

export interface PromissoryNoteRecord {
  id: string;
  noteNumber: string;
  encounterNumber: string;
  borrowerName: string;
  principalAmount: number;
  interestRate: number;
  financingFee: number;
  totalRepayment: number;
  installmentMonths: number;
  monthlyInstallment: number;
  firstDueDate: string;
  status: string;
  schedule: number[];
  executedAt: string;
}

export function createPaymentApi(client: ApiClient) {
  return {
    getHistory: () => client.get<{ items: PaymentRecord[]; total: number }>('/patient/me/payments'),
    getReceipts: () => client.get<{ items: ReceiptRecord[]; total: number }>('/patient/me/receipts'),
    getReceipt: (id: string) => client.get<ReceiptRecord>(`/patient/me/receipts/${encodeURIComponent(id)}`),
    listPromissoryNotes: () =>
      client.get<{ items: PromissoryNoteRecord[]; total: number }>('/patient/me/promissory-notes'),
    // A successful response is only shown after the backend confirms it.
    // The caller MUST pass a stable idempotency key per payment attempt.
    pay: (encounterId: string, input: PayInput, idempotencyKey: string) =>
      client.request<{
        success: boolean;
        payment: PaymentRecord;
        receipt: ReceiptRecord;
        dischargePass?: unknown;
        encounter?: PatientEncounter;
      }>(`/encounters/${encodeURIComponent(encounterId)}/payments`, {
        method: 'POST',
        body: JSON.stringify(input),
        idempotencyKey,
      }),
    createPromissoryNote: (
      encounterId: string,
      input: {
        borrowerName: string;
        borrowerRelationship?: 'PATIENT' | 'SPOUSE' | 'CHILD' | 'GUARANTOR';
        borrowerIdType: 'PHILSYS_NATIONAL_ID' | 'UMID' | 'DRIVERS_LICENSE' | 'PASSPORT';
        borrowerIdNumber: string;
        installmentMonths: 3 | 6 | 12;
        principalAmount: number;
      },
    ) =>
      client.request<{
        success: boolean;
        promissoryNote: PromissoryNoteRecord & { scheduleJson?: number[] };
        dischargePass?: unknown;
      }>(`/encounters/${encodeURIComponent(encounterId)}/promissory-notes`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
  };
}
