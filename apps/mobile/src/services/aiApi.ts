import type { ApiClient } from '../lib/api';

export interface CoraChatResponse {
  modelUsed?: string;
  reply: string;
  mode: string;
  suggestedActions: Array<{
    label: string;
    actionType: string;
    payload?: Record<string, any>;
  }>;
  groundedBalance: {
    grossTotal: number;
    vatExemption: number;
    seniorPwdDiscount: number;
    philhealthTotal: number;
    hmoApprovedAmount: number;
    netPatientDue: number;
    remainingBalance: number;
  };
}

export interface CardOcrResponse {
  modelUsed?: string;
  cardType: 'PHILHEALTH' | 'SENIOR_CITIZEN' | 'PWD' | 'HMO' | 'PHILSYS_NATIONAL_ID' | 'UNKNOWN';
  idNumber: string;
  memberFullName: string;
  dateOfBirth: string | null;
  providerName: string | null;
  validUntil: string | null;
  confidenceScore: number;
  rawExtractedFields: Record<string, string>;
}

export function createAiApi(client: ApiClient) {
  return {
    async sendCoraMessage(
      message: string,
      language: 'en' | 'fil' | 'ilo' = 'fil',
      encounterId?: string,
      mode?: string,
      signal?: AbortSignal
    ): Promise<CoraChatResponse> {
      return client.request<CoraChatResponse>('/ai/cora/chat', {
        method: 'POST',
        signal,
        timeoutMs: 65000,
        body: JSON.stringify({ message, language, encounterId, mode })
      });
    },

    async scanBenefitCard(
      imageBase64: string,
      cardCategory?: string,
      signal?: AbortSignal
    ): Promise<CardOcrResponse> {
      return client.request<CardOcrResponse>('/ai/ocr/extract-card', {
        method: 'POST',
        signal,
        timeoutMs: 65000,
        body: JSON.stringify({
          imageBase64,
          cardCategory
        })
      });
    }
  };
}
