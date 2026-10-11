import { getAiConfig, isAiEnabled } from '../../config/aiConfig';
import { CoraResponse, CORA_FEW_SHOT_EXAMPLES } from './prompts/coraPrompts';
import { ClaimsAuditResult, SCRUBBER_FEW_SHOT_EXAMPLES } from './prompts/scrubberPrompts';
import { HmoAppealResponse, APPEAL_FEW_SHOT_EXAMPLES } from './prompts/appealPrompts';
import { ExecutiveBriefingResponse, BRIEFING_FEW_SHOT_EXAMPLES } from './prompts/briefingPrompts';
import { CardOcrResponse, OCR_FEW_SHOT_EXAMPLES } from './prompts/ocrPrompts';

export interface GeminiContentPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string; // Base64 encoded bytes
  };
}

export interface GeminiGenerateRequest {
  model?: string;
  systemInstruction?: string;
  prompt: string;
  parts?: GeminiContentPart[];
  responseMimeType?: 'text/plain' | 'application/json';
  responseSchema?: any;
  temperature?: number;
  maxOutputTokens?: number;
  topP?: number;
  mockFallbackType?: 'CORA' | 'SCRUBBER' | 'APPEAL' | 'BRIEFING' | 'OCR';
  mockFallbackContext?: any;
  env?: Record<string, any>;
}

export interface GeminiGenerateResponse {
  text: string;
  rawJson?: any;
  modelUsed: string;
  tokensPrompt: number;
  tokensCompletion: number;
  latencyMs: number;
  isMock: boolean;
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class GeminiClient {
  private apiKey?: string;
  private defaultModel: string;
  private backupModel: string;
  private proModel: string;

  constructor(envOverrides?: Record<string, any>) {
    const config = getAiConfig(envOverrides);
    this.apiKey = config.geminiApiKey;
    this.defaultModel = config.geminiModel;
    this.backupModel = config.geminiBackupModel;
    this.proModel = config.geminiProModel;
  }

  /**
   * Generates content using Google AI Studio REST API v1beta with backup model fallback and offline mock fallback.
   */
  async generate(req: GeminiGenerateRequest): Promise<GeminiGenerateResponse> {
    const startTime = Date.now();
    const currentConfig = getAiConfig(req.env);
    const apiKey = req.env?.GEMINI_API_KEY || currentConfig.geminiApiKey || this.apiKey;
    const primaryModel = req.model || req.env?.GEMINI_MODEL || currentConfig.geminiModel || this.defaultModel;
    const backupModel = req.env?.GEMINI_BACKUP_MODEL || currentConfig.geminiBackupModel || this.backupModel;

    // Check if AI is enabled or offline mock should be used
    if (!isAiEnabled(req.env) || !apiKey) {
      console.log(`[GeminiClient] ℹ️ Using offline mock fallback for ${req.mockFallbackType || primaryModel} (GEMINI_API_KEY is unset or test mode active)`);
      return this.generateMockFallback(req, startTime, primaryModel);
    }

    const contents: any[] = [];
    const userParts: any[] = [];

    if (req.parts && req.parts.length > 0) {
      for (const p of req.parts) {
        if (p.text) userParts.push({ text: p.text });
        if (p.inlineData) userParts.push({ inline_data: { mime_type: p.inlineData.mimeType, data: p.inlineData.data } });
      }
    } else {
      userParts.push({ text: req.prompt });
    }

    contents.push({ role: 'user', parts: userParts });

    const payload: Record<string, any> = {
      contents,
      generationConfig: {
        temperature: req.temperature ?? 0.2,
        maxOutputTokens: req.maxOutputTokens ?? 2048,
        topP: req.topP ?? 0.95
      }
    };

    if (req.responseMimeType) {
      payload.generationConfig.responseMimeType = req.responseMimeType;
    }

    if (req.responseSchema) {
      payload.generationConfig.responseSchema = req.responseSchema;
    }

    if (req.systemInstruction) {
      payload.systemInstruction = {
        role: 'system',
        parts: [{ text: req.systemInstruction }]
      };
    }

    // 1. Attempt primary model
    try {
      console.log(`[GeminiClient] 🚀 Calling primary Google AI Studio model: ${primaryModel}`);
      const result = await this.callApiWithRetries(primaryModel, apiKey, payload, req, startTime);
      return result;
    } catch (primaryErr: any) {
      console.warn(`[GeminiClient] ⚠️ Primary model ${primaryModel} failed (${primaryErr?.message || primaryErr}).`);

      // 2. Attempt backup model if available and distinct
      if (backupModel && backupModel !== primaryModel) {
        try {
          console.log(`[GeminiClient] 🔄 Switching to backup Google AI Studio model: ${backupModel}`);
          const backupResult = await this.callApiWithRetries(backupModel, apiKey, payload, req, startTime);
          return backupResult;
        } catch (backupErr: any) {
          console.warn(`[GeminiClient] ⚠️ Backup model ${backupModel} also failed (${backupErr?.message || backupErr}).`);
        }
      }

      // 3. Fallback to deterministic mock
      console.warn(`[GeminiClient] All live AI Studio models failed, reverting to deterministic mock fallback.`);
      return this.generateMockFallback(req, startTime, primaryModel);
    }
  }

  private async callApiWithRetries(
    model: string,
    apiKey: string,
    payload: Record<string, any>,
    req: GeminiGenerateRequest,
    startTime: number
  ): Promise<GeminiGenerateResponse> {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    let attempts = 0;
    const maxAttempts = 2;
    let lastError: any = null;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(15000)
        });

        if (response.status === 429 || response.status === 503 || response.status === 502 || response.status === 504) {
          if (response.status === 429) {
            const errText = await response.text();
            throw new Error(`HTTP 429 Quota/Rate Limit: ${errText}`);
          }
          const delay = Math.pow(2, attempts) * 500;
          await sleep(delay);
          continue;
        }

        if (!response.ok) {
          const errText = await response.text();
          const isPermanent = response.status >= 400 && response.status < 500 && response.status !== 429;
          if (isPermanent) {
            console.warn(`[GeminiClient] Permanent client error HTTP ${response.status}: ${errText}. Failing fast.`);
            throw new Error(`Google AI Studio HTTP ${response.status}: ${errText}`);
          }
          throw new Error(`Google AI Studio HTTP ${response.status}: ${errText}`);
        }

        const data = (await response.json()) as any;
        const candidate = data?.candidates?.[0];
        const text = candidate?.content?.parts?.map((p: any) => p.text).join('') || '';

        let parsedJson: any = undefined;
        if (req.responseMimeType === 'application/json') {
          try {
            parsedJson = JSON.parse(text);
          } catch {
            const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
            if (jsonMatch) {
              parsedJson = JSON.parse(jsonMatch[1]);
            }
          }
        }

        return {
          text,
          rawJson: parsedJson,
          modelUsed: model,
          tokensPrompt: data?.usageMetadata?.promptTokenCount || 0,
          tokensCompletion: data?.usageMetadata?.candidatesTokenCount || 0,
          latencyMs: Date.now() - startTime,
          isMock: false
        };
      } catch (err: any) {
        lastError = err;
        if (err.message?.includes('HTTP 429')) {
          throw err;
        }
        if (attempts >= maxAttempts) {
          break;
        }
        await sleep(Math.pow(2, attempts) * 500);
      }
    }

    throw lastError || new Error(`Failed to generate content with model ${model}`);
  }

  /**
   * Deterministic mock fallbacks satisfying all MedCore schemas.
   */
  private generateMockFallback(req: GeminiGenerateRequest, startTime: number, model: string): GeminiGenerateResponse {
    let mockData: any;
    const context = req.mockFallbackContext || {};

    let fallbackType = req.mockFallbackType;
    if (!fallbackType) {
      const p = `${req.prompt} ${req.systemInstruction || ''}`.toLowerCase();
      if (p.includes('scrub') || p.includes('cf4') || p.includes('rth')) fallbackType = 'SCRUBBER';
      else if (p.includes('appeal') || p.includes('hmo') || p.includes('11765')) fallbackType = 'APPEAL';
      else if (p.includes('briefing') || p.includes('executive') || p.includes('dwell')) fallbackType = 'BRIEFING';
      else if (p.includes('ocr') || p.includes('card') || p.includes('extract')) fallbackType = 'OCR';
      else if (p.includes('cora') || p.includes('bill') || p.includes('magkano')) fallbackType = 'CORA';
    }

    switch (fallbackType) {
      case 'CORA': {
        mockData = this.getCoraMock(req.prompt, context);
        break;
      }
      case 'SCRUBBER': {
        mockData = this.getScrubberMock(context);
        break;
      }
      case 'APPEAL': {
        mockData = this.getAppealMock(context);
        break;
      }
      case 'BRIEFING': {
        mockData = this.getBriefingMock(context);
        break;
      }
      case 'OCR': {
        mockData = this.getOcrMock(context);
        break;
      }
      default: {
        mockData = {
          message: 'MedCore Offline Rule-Based Intelligence Response',
          status: 'SUCCESS'
        };
      }
    }

    const text = typeof mockData === 'string' ? mockData : JSON.stringify(mockData, null, 2);

    return {
      text,
      rawJson: typeof mockData === 'object' ? mockData : undefined,
      modelUsed: `${model}-deterministic-fallback`,
      tokensPrompt: Math.round(req.prompt.length / 4),
      tokensCompletion: Math.round(text.length / 4),
      latencyMs: Date.now() - startTime,
      isMock: true
    };
  }

  private getCoraMock(prompt: string, ctx: any): CoraResponse {
    const isTaglish = ctx.language === 'fil' || /bakit|pera|dispute|magkano|umuwi/i.test(prompt);
    const isIlocano = ctx.language === 'ilo';

    if (ctx.mode === 'WHY_DO_I_OWE' || /why do i owe|bakit may|magkano/i.test(prompt)) {
      if (isTaglish) {
        return CORA_FEW_SHOT_EXAMPLES[0].coraReply ? {
          reply: CORA_FEW_SHOT_EXAMPLES[0].coraReply,
          mode: 'WHY_DO_I_OWE',
          suggestedActions: CORA_FEW_SHOT_EXAMPLES[0].suggestedActions as any
        } : {
          reply: `Ang inyong natitirang balance ay nakabatay sa mga supplies at room upgrades na hindi sakop ng HMO at PhilHealth. Walang dagdag na interest o hidden charges alinsunod sa batas.`,
          mode: 'WHY_DO_I_OWE',
          suggestedActions: [{ label: 'Tingnan ang Bill', actionType: 'NAVIGATE_BILL' }]
        };
      }
      if (isIlocano) {
        return {
          reply: `Naimbag nga aldaw! Ti nabati a bayadanyo ket gapu kadagiti supplies ken room upgrade a saan a sinagot ti HMO ken PhilHealth. Nairanta daytoy segun iti linteg ti ospital.`,
          mode: 'WHY_DO_I_OWE',
          suggestedActions: [{ label: 'Kitaen ti Bill', actionType: 'NAVIGATE_BILL' }]
        };
      }
      return {
        reply: `Hello. Your remaining balance reflects room tier differentials and non-covered surgical consumables that remain after PhilHealth ACR and HMO benefit applications. All deductions follow deterministic hospital billing rules.`,
        mode: 'WHY_DO_I_OWE',
        suggestedActions: [
          { label: 'View Itemized Bill', actionType: 'NAVIGATE_BILL' },
          { label: 'Apply for 0% Promissory Note', actionType: 'LAUNCH_PROMISSORY' }
        ]
      };
    }

    if (ctx.mode === 'PROMISSORY_ASSISTANCE' || /promissory|pera|cannot pay|hirap/i.test(prompt)) {
      return {
        reply: CORA_FEW_SHOT_EXAMPLES[2].coraReply,
        mode: 'PROMISSORY_ASSISTANCE',
        suggestedActions: CORA_FEW_SHOT_EXAMPLES[2].suggestedActions as any
      };
    }

    if (ctx.mode === 'DISCHARGE_STATUS' || /stage|discharge|clearance|kelan makakauwi/i.test(prompt)) {
      return {
        reply: CORA_FEW_SHOT_EXAMPLES[1].coraReply,
        mode: 'DISCHARGE_STATUS',
        suggestedActions: CORA_FEW_SHOT_EXAMPLES[1].suggestedActions as any
      };
    }

    return {
      reply: `Magandang araw po! Ako si Cora, ang inyong MedCore Hospital Billing & Discharge Concierge. Nandito po ako upang tulungan kayong intindihin ang inyong hospital bill, PhilHealth, HMO coverage, at ang inyong mga karapatan sa ilalim ng Republic Act No. 9439. Ano po ang maipaglilingkod ko sa inyo?`,
      mode: 'GENERAL',
      suggestedActions: [
        { label: 'Bakit Ganito ang Bill Ko?', actionType: 'NAVIGATE_BILL' },
        { label: 'Estado ng Discharge', actionType: 'CALL_NURSE' },
        { label: '0% Interest Promissory Note', actionType: 'LAUNCH_PROMISSORY' }
      ]
    };
  }

  private getScrubberMock(ctx: any): ClaimsAuditResult {
    const diagnosis = ctx.primaryDiagnosis || ctx.encounter?.primaryDiagnosis || 'Inpatient Admission';
    const icd10 = ctx.primaryIcd10 || ctx.encounter?.primaryIcd10 || 'Z00.0';
    const patientName = ctx.patientName || ctx.encounter?.patient?.fullName || 'Patient';
    const doctorName = ctx.doctorName || ctx.encounter?.attendingDoctor || 'Attending Physician';
    const hasMedDiscordance = ctx.hasMedDiscordance ?? false;
    const hasVitals = ctx.cf4VitalsRecorded ?? true;
    const hasLabs = ctx.cf4LabsConsistent ?? true;
    const hasCourse = ctx.cf4CourseInWardRecorded ?? true;

    const flags: ClaimsAuditResult['flags'] = [];
    let penaltiesSum = 0;
    const penaltiesList: Array<{ factor: string; points: number; description: string }> = [];

    if (!hasVitals) {
      const penalty = 0.40;
      penaltiesSum += penalty;
      penaltiesList.push({ factor: 'MISSING_CF4_FIELD', points: penalty, description: 'Missing baseline admission vitals in CF4 chart.' });
      flags.push({
        category: 'MISSING_CF4_FIELD',
        severity: 'CRITICAL',
        field: 'cf4Narrative.admissionVitals',
        description: `Baseline admission vitals (BP, HR, RR, Temperature) are incomplete or missing for ${diagnosis}.`,
        regulatoryCitation: 'PhilHealth Circular 2019-0002 Sec. 6.1 (Mandatory CF4 Clinical Elements)',
        remediation: `Require ${doctorName} or admitting nurse to complete vital signs record prior to transmission.`
      });
    }

    if (!hasCourse) {
      const penalty = 0.35;
      penaltiesSum += penalty;
      penaltiesList.push({ factor: 'MISSING_CF4_FIELD', points: penalty, description: 'Omitted daily ward progress notes.' });
      flags.push({
        category: 'MISSING_CF4_FIELD',
        severity: 'CRITICAL',
        field: 'cf4Narrative.courseInWard',
        description: `Day-by-day clinical evolution notes are incomplete for inpatient course (${diagnosis}).`,
        regulatoryCitation: 'PhilHealth Circular 2019-0002 Sec. 6.3',
        remediation: 'Append daily physician progress notes documenting therapeutic response.'
      });
    }

    if (!hasLabs) {
      const penalty = 0.25;
      penaltiesSum += penalty;
      penaltiesList.push({ factor: 'DIAGNOSTIC_DISCREPANCY', points: penalty, description: `Inconclusive or missing lab/diagnostic findings for ${icd10}.` });
      flags.push({
        category: 'DIAGNOSTIC_DISCREPANCY',
        severity: 'WARNING',
        field: 'cf4Narrative.diagnosticFindings',
        description: `Diagnostic findings on file lack objective corroboration for primary diagnosis ${diagnosis} (${icd10}).`,
        regulatoryCitation: 'PhilHealth Circular 2023-0026 & Clinical Guidelines',
        remediation: 'Attach supporting imaging or diagnostic laboratory pathology report.'
      });
    }

    if (hasMedDiscordance) {
      const penalty = 0.30;
      penaltiesSum += penalty;
      penaltiesList.push({ factor: 'MEDICATION_DISCORDANCE', points: penalty, description: 'High-tier IV antimicrobial without documented culture sensitivity.' });
      flags.push({
        category: 'MEDICATION_DISCORDANCE',
        severity: 'CRITICAL',
        field: 'cf4Narrative.medicationsBilled',
        description: `Broad-spectrum intravenous antibiotic billed in eSOA chargemaster for ${diagnosis} without documented microbiologic culture or sepsis criteria in CF4.`,
        regulatoryCitation: 'PhilHealth Circular 2019-0002 Sec. 6.2 & Standard Antimicrobial Stewardship Guidelines',
        remediation: `Attending physician must issue a clinical addendum justifying therapeutic antimicrobial escalation.`
      });
    }

    // Always include statutory SPC protection audit verification
    flags.push({
      category: 'SPC_RULE_RISK',
      severity: 'INFO',
      field: 'encounter.admissionInterval',
      description: `Readmission interval verified clean: Single Period of Confinement (SPC) 90-day denial rule was abolished under PhilHealth Circular 2024-0021.`,
      regulatoryCitation: 'PhilHealth Circular No. 2024-0021 & Circular No. 2025-0015',
      remediation: 'No remediation needed. Claim is legally clean for All Case Rates reimbursement.'
    });

    const baseRisk = 0.04;
    const rthRiskScore = Math.min(0.95, Math.max(0.04, Number((baseRisk + penaltiesSum).toFixed(2))));
    const riskLevel: ClaimsAuditResult['riskLevel'] = rthRiskScore > 0.35 ? 'CRITICAL' : rthRiskScore > 0.15 ? 'HIGH' : rthRiskScore > 0.07 ? 'MODERATE' : 'LOW';
    const passThreshold = rthRiskScore <= 0.15;
    const cleanClaimReadiness = Math.round((1 - rthRiskScore) * 100);

    const formula = penaltiesList.length > 0
      ? `Base Risk (4%) + Penalties (${Math.round(penaltiesSum * 100)}%) = ${Math.round(rthRiskScore * 100)}% RTH Risk`
      : `Base Risk (4%) = 4% RTH Risk (Clean claim; no statutory penalties)`;

    const verdict = passThreshold
      ? 'Passes gateway threshold (≤ 15.0% RTH risk)'
      : 'Action Required: Exceeds 15.0% threshold ceiling. Chart remediation required prior to transmission.';

    let suggestedDoctorAddendum: string | null = null;
    if (hasMedDiscordance || !hasVitals || !hasLabs) {
      suggestedDoctorAddendum = `CLINICAL CHART ADDENDUM\nPatient: ${patientName} | Primary Diagnosis: ${diagnosis} (${icd10})\nAttending Physician: ${doctorName}\n\n"Patient received inpatient treatment for ${diagnosis}. Daily clinical course demonstrated therapeutic response with normalized parameters. Diagnostic and therapeutic modalities were verified medically necessary under prevailing clinical practice standards."`;
    }

    return {
      rthRiskScore,
      riskLevel,
      passThreshold,
      cleanClaimReadiness,
      riskCalculation: {
        baseRisk,
        penalties: penaltiesList,
        formula,
        verdict
      },
      flags,
      clinicalSummary: `Inpatient admission for ${diagnosis} (${icd10}) managed by ${doctorName}. ${passThreshold ? 'Clinical documentation substantiates eClaims 3.0 requirements with clean concordance.' : 'Audit identified documentation gaps requiring clinical chart addendum prior to gateway push.'}`,
      suggestedDoctorAddendum,
      esoaXmlConformity: true
    };
  }

  private getAppealMock(ctx: any): HmoAppealResponse {
    return APPEAL_FEW_SHOT_EXAMPLES[0].output as HmoAppealResponse;
  }

  private getBriefingMock(ctx: any): ExecutiveBriefingResponse {
    return BRIEFING_FEW_SHOT_EXAMPLES[0].output as ExecutiveBriefingResponse;
  }

  private getOcrMock(ctx: any): CardOcrResponse {
    if (ctx.cardCategory === 'HMO_CARD') {
      return OCR_FEW_SHOT_EXAMPLES[1].output as unknown as CardOcrResponse;
    }
    return OCR_FEW_SHOT_EXAMPLES[0].output as unknown as CardOcrResponse;
  }
}

export const geminiClient = new GeminiClient();
