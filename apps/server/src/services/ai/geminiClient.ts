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
  private proModel: string;

  constructor(envOverrides?: Record<string, any>) {
    const config = getAiConfig(envOverrides);
    this.apiKey = config.geminiApiKey;
    this.defaultModel = config.geminiModel;
    this.proModel = config.geminiProModel;
  }

  /**
   * Generates content using Google AI Studio REST API v1beta with exponential backoff and mock fallback.
   */
  async generate(req: GeminiGenerateRequest): Promise<GeminiGenerateResponse> {
    const startTime = Date.now();
    const currentConfig = getAiConfig(req.env);
    const apiKey = req.env?.GEMINI_API_KEY || currentConfig.geminiApiKey || this.apiKey;
    const model = req.model || req.env?.GEMINI_MODEL || currentConfig.geminiModel || this.defaultModel;

    // Check if AI is enabled or offline mock should be used
    if (!isAiEnabled(req.env) || !apiKey) {
      console.log(`[GeminiClient] ℹ️ Using offline mock fallback for ${req.mockFallbackType || model} (GEMINI_API_KEY is unset or test mode active)`);
      return this.generateMockFallback(req, startTime, model);
    }

    console.log(`[GeminiClient] 🚀 Calling LIVE Google AI Studio API: model=${model}`);
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

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

    if (req.systemInstruction) {
      payload.systemInstruction = {
        role: 'system',
        parts: [{ text: req.systemInstruction }]
      };
    }

    let attempts = 0;
    const maxAttempts = 3;
    let lastError: any = null;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (response.status === 429 || response.status === 503) {
          const delay = Math.pow(2, attempts) * 500;
          await sleep(delay);
          continue;
        }

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Google AI Studio HTTP ${response.status}: ${errText}`);
        }

        const data = await response.json();
        const candidate = data.candidates?.[0];
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
          tokensPrompt: data.usageMetadata?.promptTokenCount || 0,
          tokensCompletion: data.usageMetadata?.candidatesTokenCount || 0,
          latencyMs: Date.now() - startTime,
          isMock: false
        };
      } catch (err: any) {
        lastError = err;
        if (attempts >= maxAttempts) {
          break;
        }
        await sleep(Math.pow(2, attempts) * 500);
      }
    }

    console.warn(`[GeminiClient] External API request failed after ${maxAttempts} attempts, reverting to deterministic mock fallback. Cause:`, lastError?.message || lastError);
    return this.generateMockFallback(req, startTime, model);
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
    const hasMedicationDiscordance = ctx.hasMedDiscordance ?? false;
    if (hasMedicationDiscordance) {
      return SCRUBBER_FEW_SHOT_EXAMPLES[0].output as ClaimsAuditResult;
    }
    return SCRUBBER_FEW_SHOT_EXAMPLES[1].output as ClaimsAuditResult;
  }

  private getAppealMock(ctx: any): HmoAppealResponse {
    return APPEAL_FEW_SHOT_EXAMPLES[0].output as HmoAppealResponse;
  }

  private getBriefingMock(ctx: any): ExecutiveBriefingResponse {
    return BRIEFING_FEW_SHOT_EXAMPLES[0].output as ExecutiveBriefingResponse;
  }

  private getOcrMock(ctx: any): CardOcrResponse {
    if (ctx.cardCategory === 'HMO_CARD') {
      return OCR_FEW_SHOT_EXAMPLES[1].output as CardOcrResponse;
    }
    return OCR_FEW_SHOT_EXAMPLES[0].output as CardOcrResponse;
  }
}

export const geminiClient = new GeminiClient();
