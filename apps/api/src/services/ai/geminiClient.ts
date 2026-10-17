import type { AiConfig } from '../../env';

export interface GeminiPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
}

export interface GeminiGenerateOptions {
  systemInstruction?: string;
  prompt: string;
  parts?: GeminiPart[];
  responseMimeType?: 'text/plain' | 'application/json';
  responseSchema?: Record<string, unknown>;
  responseJsonSchema?: Record<string, unknown>;
  temperature?: number;
  maxOutputTokens?: number;
  useProModel?: boolean;
  timeoutMs?: number;
  aiConfig?: AiConfig;
}

export interface GeminiGenerateResponse {
  text: string;
  modelUsed: string;
  rawJson?: unknown;
}

export type AiErrorCode =
  | 'AI_NOT_CONFIGURED'
  | 'AI_UNAVAILABLE'
  | 'AI_TIMEOUT'
  | 'AI_RATE_LIMITED'
  | 'AI_INVALID_RESPONSE'
  | 'AI_LANGUAGE_MISMATCH'
  | 'AI_CACHE_UNAVAILABLE'
  | 'AI_CACHE_LEASE_EXPIRED'
  | 'AI_GENERATION_PENDING';

export class AiInferenceError extends Error {
  constructor(
    public readonly code: AiErrorCode,
    message: string,
    public readonly status = 502,
  ) {
    super(message);
    this.name = 'AiInferenceError';
  }
}

export function resolveAiConfig(explicit?: AiConfig): AiConfig {
  if (explicit) return explicit;
  const rawApiKey = (process.env.GEMINI_API_KEY ?? '').trim();
  const hasValidApiKey =
    rawApiKey.length >= 20 &&
    !['your_api_key_here', 'placeholder', 'none', 'disabled'].includes(rawApiKey.toLowerCase());
  return {
    enabled: hasValidApiKey,
    apiKey: hasValidApiKey ? rawApiKey : null,
    model: (process.env.GEMINI_MODEL ?? 'gemini-2.5-flash').trim() || 'gemini-2.5-flash',
    backupModel:
      (process.env.GEMINI_BACKUP_MODEL ?? 'gemini-2.5-flash-lite').trim() || 'gemini-2.5-flash-lite',
    proModel: (process.env.GEMINI_PRO_MODEL ?? 'gemini-2.5-pro').trim() || 'gemini-2.5-pro',
  };
}

export function isAiEnabled(explicit?: AiConfig): boolean {
  return resolveAiConfig(explicit).enabled;
}

export class GeminiClient {
  private readonly baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';

  async generate(options: GeminiGenerateOptions): Promise<GeminiGenerateResponse> {
    const config = resolveAiConfig(options.aiConfig);

    if (!config.enabled || !config.apiKey) {
      throw new AiInferenceError(
        'AI_NOT_CONFIGURED',
        'Live AI is unavailable. Configure the server Gemini credentials; no draft was generated.',
        503,
      );
    }

    const primaryModel = options.useProModel ? config.proModel : config.model;
    const backupModel = config.backupModel;
    const modelsToTry = Array.from(new Set([primaryModel, backupModel, config.proModel].filter(Boolean)));
    const timeoutMs = options.timeoutMs ?? 20000;

    let lastError: Error | null = null;

    for (const model of modelsToTry) {
      try {
        return await this.callModel(model, config.apiKey, options, timeoutMs);
      } catch (err) {
        if (err instanceof AiInferenceError && err.code === 'AI_INVALID_RESPONSE') {
          throw err;
        }
        lastError = err instanceof Error ? err : new Error('AI provider request failed.');
      }
    }

    if (lastError instanceof AiInferenceError) throw lastError;
    throw new AiInferenceError(
      'AI_UNAVAILABLE',
      'Live AI could not complete this request. Please retry shortly.',
      502,
    );
  }

  private async callModel(
    model: string,
    apiKey: string,
    options: GeminiGenerateOptions,
    timeoutMs: number,
  ): Promise<GeminiGenerateResponse> {
    const url = `${this.baseUrl}/${model}:generateContent`;

    const contentsParts: GeminiPart[] =
      options.parts && options.parts.length > 0 ? options.parts : [{ text: options.prompt }];

    const generationConfig: Record<string, unknown> = {
      temperature: options.temperature ?? 0.2,
      maxOutputTokens: options.maxOutputTokens ?? 2048,
    };
    if (model.startsWith('gemini-2.5')) {
      generationConfig.thinkingConfig = {
        thinkingBudget: model.includes('pro') ? 128 : 0,
      };
    }

    if (options.responseMimeType) {
      generationConfig.responseMimeType = options.responseMimeType;
    }

    if (options.responseSchema) {
      generationConfig.responseSchema = options.responseSchema;
    }

    if (options.responseJsonSchema) {
      generationConfig.responseJsonSchema = options.responseJsonSchema;
    }

    const payload: Record<string, unknown> = {
      contents: [
        {
          role: 'user',
          parts: contentsParts,
        },
      ],
      generationConfig,
    };

    if (options.systemInstruction) {
      payload.systemInstruction = {
        parts: [{ text: options.systemInstruction }],
      };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new AiInferenceError(
            'AI_RATE_LIMITED',
            'The AI service is rate-limited right now. Please wait a moment and try again.',
            503,
          );
        }
        throw new AiInferenceError('AI_UNAVAILABLE', 'The AI provider rejected or failed the request.', 502);
      }

      const data = (await response.json()) as {
        candidates?: Array<{
          content?: {
            parts?: Array<{ text?: string }>;
          };
        }>;
      };
      const candidate = data?.candidates?.[0];
      const text = candidate?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';

      if (!text) {
        throw new AiInferenceError('AI_INVALID_RESPONSE', 'The AI provider returned an empty response.');
      }

      let rawJson: unknown = undefined;
      if (options.responseMimeType === 'application/json') {
        try {
          const cleaned = text
            .replace(/^```json\s*/i, '')
            .replace(/\s*```$/i, '')
            .trim();
          rawJson = JSON.parse(cleaned);
        } catch {
          throw new AiInferenceError(
            'AI_INVALID_RESPONSE',
            'The AI provider returned malformed structured data.',
          );
        }
      }

      return {
        text,
        modelUsed: model,
        rawJson,
      };
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new AiInferenceError(
          'AI_TIMEOUT',
          'The AI request timed out before a verified response was received.',
          504,
        );
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

export const geminiClient = new GeminiClient();
