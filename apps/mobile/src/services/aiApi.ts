import type { ApiClient } from '../lib/api';
import { ApiError } from '../lib/api';

export interface CoraChatResponse {
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
      mode?: string
    ): Promise<CoraChatResponse> {
      try {
        return await client.request<CoraChatResponse>('/ai/cora/chat', {
          method: 'POST',
          body: JSON.stringify({
            message,
            language,
            encounterId,
            mode
          })
        });
      } catch (err: any) {
        // Deterministic offline fallback if network is unreachable
        if (err instanceof ApiError && (err.status === 0 || err.code === 'NETWORK_ERROR' || err.code === 'TIMEOUT')) {
          const offlineReplies: Record<string, string> = {
            fil: 'Paumanhin, kasalukuyang offline ang AI server. Ang inyong statutory deductions (PhilHealth, Senior Citizen/PWD) at hospital balance ay ligtas na nakatala sa inyong opisyal na eSOA.',
            en: 'Pardon the delay, the AI service is currently operating in offline mode. Your statutory deductions and hospital balances remain securely computed in your official eSOA statement.',
            ilo: 'Dispensar, offline pay laeng ti AI service. Dagiti statutory deductions ken hospital balance ket natalged a nakarekord iti eSOA yo.'
          };

          return {
            reply: offlineReplies[language] || offlineReplies.fil,
            mode: 'OFFLINE_FALLBACK',
            suggestedActions: [
              { label: 'View Official Bill', actionType: 'NAVIGATE_BILL' },
              { label: 'Check Coverage', actionType: 'NAVIGATE_COVERAGE' }
            ],
            groundedBalance: {
              grossTotal: 0,
              vatExemption: 0,
              seniorPwdDiscount: 0,
              philhealthTotal: 0,
              hmoApprovedAmount: 0,
              netPatientDue: 0,
              remainingBalance: 0
            }
          };
        }
        throw err;
      }
    },

    async scanBenefitCard(
      imageBase64: string,
      cardCategory?: string
    ): Promise<CardOcrResponse> {
      return client.request<CardOcrResponse>('/ai/ocr/extract-card', {
        method: 'POST',
        body: JSON.stringify({
          imageBase64,
          cardCategory
        })
      });
    }
  };
}
