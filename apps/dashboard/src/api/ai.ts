import { ApiClient, defaultApiClient } from './client';

export interface ClaimsAuditFlag {
  category: 'DIAGNOSTIC_DISCREPANCY' | 'MISSING_CF4_FIELD' | 'MEDICATION_DISCORDANCE' | 'SPC_RULE_RISK';
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  field: string;
  description: string;
  regulatoryCitation: string;
  remediation: string;
}

export interface ClaimsAuditResult {
  rthRiskScore: number;
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  passThreshold: boolean;
  cleanClaimReadiness: number;
  flags: ClaimsAuditFlag[];
  clinicalSummary: string;
  suggestedDoctorAddendum: string | null;
  esoaXmlConformity?: boolean;
}

export interface HmoAppealResponse {
  referenceNumber: string;
  appealLetterMarkdown: string;
  citationsApplied: string[];
  attendingPhysicianName: string;
  doctorPan: string;
  reconsiderationDeadline: string;
  suggestedAttachments?: string[];
}

export interface ExecutiveBriefingResponse {
  generatedAt: string;
  briefingMarkdown: string;
  metricsSummary: {
    activeInpatients: number;
    averageDischargeTatMinutes: number;
    slaTargetMinutes: number;
    reclaimedBedHoursLast24h: number;
    trappedCapitalPesos: number;
    criticalDepartmentBottleneck: string;
  };
  topRecommendations: Array<{
    priority: number;
    department: string;
    actionText: string;
    financialImpactPesos: number;
  }>;
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

export class ClaimsAiApi {
  constructor(private client: ApiClient = defaultApiClient) {}

  async preflightScrub(encounterId: string, forceEscalation: boolean = false): Promise<ClaimsAuditResult> {
    return this.client.request<ClaimsAuditResult>('/ai/claims/preflight-scrub', {
      method: 'POST',
      body: JSON.stringify({ encounterId, forceEscalation })
    });
  }
}

export class HmoAiApi {
  constructor(private client: ApiClient = defaultApiClient) {}

  async generateAppeal(
    encounterId: string,
    deniedItem: string,
    deniedAmount: number = 0,
    hmoProviderName?: string,
    notes?: string
  ): Promise<HmoAppealResponse> {
    return this.client.request<HmoAppealResponse>('/ai/hmo/generate-appeal', {
      method: 'POST',
      body: JSON.stringify({
        encounterId,
        deniedItemDescription: deniedItem,
        deniedAmount,
        hmoProviderName,
        justificationNotes: notes
      })
    });
  }
}

export class RcmAiApi {
  constructor(private client: ApiClient = defaultApiClient) {}

  async getExecutiveBriefing(): Promise<ExecutiveBriefingResponse> {
    return this.client.request<ExecutiveBriefingResponse>('/ai/executive/briefing', {
      method: 'POST'
    });
  }
}

export class OcrAiApi {
  constructor(private client: ApiClient = defaultApiClient) {}

  async extractCard(imageBase64: string, cardCategory?: string): Promise<CardOcrResponse> {
    return this.client.request<CardOcrResponse>('/ai/ocr/extract-card', {
      method: 'POST',
      body: JSON.stringify({ imageBase64, cardCategory })
    });
  }
}

export class CoraAiApi {
  constructor(private client: ApiClient = defaultApiClient) {}

  async chat(
    message: string,
    language: 'en' | 'fil' | 'ilo' = 'fil',
    mode?: string,
    encounterId?: string
  ): Promise<CoraChatResponse> {
    return this.client.request<CoraChatResponse>('/ai/cora/chat', {
      method: 'POST',
      body: JSON.stringify({ message, language, mode, encounterId })
    });
  }
}

export const claimsAi = new ClaimsAiApi();
export const hmoAi = new HmoAiApi();
export const rcmAi = new RcmAiApi();
export const ocrAi = new OcrAiApi();
export const coraAi = new CoraAiApi();
