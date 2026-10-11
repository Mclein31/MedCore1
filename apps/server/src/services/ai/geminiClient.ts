import { getAiConfig, isAiEnabled } from '../../config/aiConfig';

export interface GeminiContentPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
}
export interface GeminiGenerateRequest {
  model?: string;
  systemInstruction?: string;
  prompt: string;
  parts?: GeminiContentPart[];
  responseMimeType?: 'text/plain' | 'application/json';
  responseSchema?: Record<string, unknown>;
  responseJsonSchema?: Record<string, unknown>;
  temperature?: number;
  maxOutputTokens?: number;
  topP?: number;
  timeoutMs?: number;
  env?: Record<string, any>;
}
export interface GeminiGenerateResponse {
  text: string;
  rawJson?: any;
  modelUsed: string;
  tokensPrompt: number;
  tokensCompletion: number;
  latencyMs: number;
  isMock: false;
}
export class AiInferenceError extends Error {
  constructor(public code: string, message: string, public status = 502) {
    super(message);
    this.name = 'AiInferenceError';
  }
}
export class GeminiClient {
  constructor(private envOverrides?: Record<string, any>) {}

  async generate(req: GeminiGenerateRequest): Promise<GeminiGenerateResponse> {
    const started = Date.now();
    const deadline = started + (req.timeoutMs ?? 50000);
    const env = { ...this.envOverrides, ...req.env };
    const config = getAiConfig(env);
    if (!isAiEnabled(env) || !config.geminiApiKey) {
      throw new AiInferenceError('AI_NOT_CONFIGURED', 'Live AI is unavailable. Configure the server Gemini credentials; no draft was generated.', 503);
    }
    const payload = {
      contents: [{ role: 'user', parts: req.parts?.length ? req.parts : [{ text: req.prompt }] }],
      ...(req.systemInstruction ? { systemInstruction: { parts: [{ text: req.systemInstruction }] } } : {}),
      generationConfig: {
        temperature: req.temperature ?? 0.2,
        maxOutputTokens: req.maxOutputTokens ?? 8192,
        topP: req.topP ?? 0.95,
        ...(req.responseMimeType ? { responseMimeType: req.responseMimeType } : {}),
        ...(req.responseSchema ? { responseSchema: req.responseSchema } : {}),
        ...(req.responseJsonSchema ? { responseJsonSchema: req.responseJsonSchema } : {})
      }
    };
    const models = [...new Set([req.model || config.geminiModel, config.geminiBackupModel].filter(Boolean))];
    let lastError: unknown;
    for (const model of models) {
      try {
        const remainingMs = deadline - Date.now();
        if (remainingMs <= 0) throw new AiInferenceError('AI_UNAVAILABLE', 'AI generation timed out. Please retry.', 503);
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': config.geminiApiKey },
          body: JSON.stringify(payload), signal: AbortSignal.timeout(Math.min(25000, remainingMs))
        });
        if (!response.ok) {
          // Upstream bodies can contain credentials or patient input. Never log them.
          const error = new AiInferenceError('AI_UPSTREAM_ERROR', `Gemini generation failed (HTTP ${response.status}). No AI response was generated.`);
          if ([400, 401, 403].includes(response.status)) throw Object.assign(error, { permanent: true });
          throw error;
        }
        const data = await response.json() as any;
        const candidate = data.candidates?.[0];
        const text = candidate?.content?.parts?.filter((p: any) => !p.thought).map((p: any) => p.text || '').join('') || '';
        if (!text.trim() || candidate?.finishReason !== 'STOP') {
          throw new AiInferenceError('AI_INVALID_RESPONSE', 'Gemini returned an incomplete or blocked response. No draft was generated.');
        }
        let rawJson: any;
        if (req.responseMimeType === 'application/json') {
          try { rawJson = JSON.parse(text); }
          catch { throw new AiInferenceError('AI_INVALID_RESPONSE', 'Gemini returned invalid JSON. No draft was generated.'); }
        }
        return {
          text, rawJson, modelUsed: model,
          tokensPrompt: data.usageMetadata?.promptTokenCount || 0,
          tokensCompletion: data.usageMetadata?.candidatesTokenCount || 0,
          latencyMs: Date.now() - started, isMock: false
        };
      } catch (error) {
        lastError = error;
        if ((error as any)?.permanent) throw error;
      }
    }
    if (lastError instanceof AiInferenceError) throw lastError;
    throw new AiInferenceError('AI_UNAVAILABLE', 'Gemini could not be reached. Please retry generation; no draft was generated.', 503);
  }
}
export const geminiClient = new GeminiClient();
