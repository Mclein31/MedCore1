import { ApiClient, defaultApiClient } from './client';

export interface PaymentPayload {
  amount: number;
  paymentRail: string;
  payerName?: string;
  payerContactMasked?: string;
  payerMobile?: string;
  referenceNumber?: string;
  cardLast4?: string;
  cardBrand?: 'VISA' | 'MASTERCARD';
  bankName?: string;
  channelFee?: number;
  notes?: string;
}

export interface PromissoryPayload {
  borrowerName: string;
  borrowerRelationship?: string;
  borrowerIdType: string;
  borrowerIdNumber: string;
  installmentMonths: 3 | 6 | 12;
  principalAmount: number;
}

export class PaymentsApi {
  constructor(private client: ApiClient = defaultApiClient) {}

  async processPayment(
    encounterId: string,
    payload: PaymentPayload,
    idempotencyKey?: string
  ): Promise<{ success: boolean; cached?: boolean; payment: any; receipt: any; encounter: any }> {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }
    return this.client.request(`/encounters/${encounterId}/payments`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
  }

  async executePromissoryNote(
    encounterId: string,
    payload: PromissoryPayload
  ): Promise<{ success: boolean; promissoryNote: any; dischargePass?: any; encounter: any }> {
    return this.client.request(`/encounters/${encounterId}/promissory-notes`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async verifyExitPass(passNumber: string, exitPin: string): Promise<any> {
    return this.client.request('/discharge/passes/verify', {
      method: 'POST',
      body: JSON.stringify({ passNumber, exitPin })
    });
  }
}

export const paymentsApi = new PaymentsApi();
