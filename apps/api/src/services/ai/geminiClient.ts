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

export interface AiProviderFailure {
  model: string;
  httpStatus: number;
  reason?: string;
}

export class AiInferenceError extends Error {
  constructor(
    public readonly code: AiErrorCode,
    message: string,
    public readonly status = 502,
    public readonly providerFailure?: AiProviderFailure,
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

const MODEL_COOLDOWN_MS = 60_000;

function warrantsCooldown(err: unknown): boolean {
  if (!(err instanceof AiInferenceError)) return true;
  if (err.code === 'AI_TIMEOUT' || err.code === 'AI_RATE_LIMITED') return true;
  return (err.providerFailure?.httpStatus ?? 0) >= 500;
}

export class GeminiClient {
  private readonly interactionsUrl = 'https://generativelanguage.googleapis.com/v1beta/interactions';
  private readonly coolingUntil = new Map<string, number>();

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
    const now = Date.now();
    const isCooling = (model: string) => (this.coolingUntil.get(model) ?? 0) > now;
    const ordered = [...modelsToTry.filter((model) => !isCooling(model)), ...modelsToTry.filter(isCooling)];

    for (const model of ordered) {
      try {
        const response = await this.callModel(model, config.apiKey, options, timeoutMs);
        this.coolingUntil.delete(model);
        return response;
      } catch (err) {
        if (err instanceof AiInferenceError && err.code === 'AI_INVALID_RESPONSE') {
          throw err;
        }
        if (warrantsCooldown(err)) this.coolingUntil.set(model, Date.now() + MODEL_COOLDOWN_MS);
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
    const input =
      options.parts && options.parts.length > 0 ? options.parts.map(toInteractionContent) : options.prompt;

    const generationConfig: Record<string, unknown> = {
      temperature: options.temperature ?? 0.2,
      max_output_tokens: options.maxOutputTokens ?? 2048,
      thinking_level: model.includes('pro') ? 'low' : 'minimal',
    };

    const payload: Record<string, unknown> = {
      model,
      input,
      store: false,
      generation_config: generationConfig,
    };

    if (options.systemInstruction) {
      payload.system_instruction = options.systemInstruction;
    }

    const jsonSchema =
      options.responseJsonSchema ??
      (options.responseSchema ? toJsonSchema(options.responseSchema) : undefined);
    if (jsonSchema) {
      payload.response_format = jsonSchema;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(this.interactionsUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        const parsed: unknown = await response.json().catch(() => null);
        const body = (Array.isArray(parsed) ? parsed[0] : parsed) as {
          error?: { code?: unknown; status?: unknown; details?: Array<{ reason?: unknown }> };
        } | null;
        const details = Array.isArray(body?.error?.details) ? body.error.details : [];
        const rawReason =
          typeof body?.error?.code === 'string'
            ? body.error.code
            : (details.find((detail) => typeof detail?.reason === 'string')?.reason ?? body?.error?.status);
        const reason = typeof rawReason === 'string' ? rawReason.toUpperCase() : undefined;
        const providerFailure: AiProviderFailure = {
          model,
          httpStatus: response.status,
          ...(reason && /^[A-Z][A-Z0-9_]{0,79}$/.test(reason) ? { reason } : {}),
        };
        if (response.status === 429) {
          throw new AiInferenceError(
            'AI_RATE_LIMITED',
            'The AI service is rate-limited right now. Please wait a moment and try again.',
            503,
            providerFailure,
          );
        }
        throw new AiInferenceError(
          'AI_UNAVAILABLE',
          'The AI provider rejected or failed the request.',
          502,
          providerFailure,
        );
      }

      const data = (await response.json()) as {
        status?: string;
        steps?: Array<{
          type?: string;
          content?: Array<{ type?: string; text?: string }>;
        }>;
      };
      if (data?.status === 'failed' || data?.status === 'cancelled') {
        throw new AiInferenceError('AI_UNAVAILABLE', 'The AI provider rejected or failed the request.', 502, {
          model,
          httpStatus: response.status,
          reason: `INTERACTION_${data.status.toUpperCase()}`,
        });
      }
      const text =
        data?.steps
          ?.filter((step) => step.type === 'model_output')
          .flatMap((step) => step.content ?? [])
          .map((part) => (part.type === 'text' ? (part.text ?? '') : ''))
          .join('') ?? '';

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

function toInteractionContent(part: GeminiPart): Record<string, unknown> {
  if (part.inlineData) {
    return { type: 'image', mime_type: part.inlineData.mimeType, data: part.inlineData.data };
  }
  return { type: 'text', text: part.text ?? '' };
}

// Interactions `response_format` takes standard JSON Schema; legacy Gemini schemas use
// uppercase OpenAPI type names ('OBJECT', 'STRING').
function toJsonSchema(schema: unknown): Record<string, unknown> {
  const convert = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(convert);
    if (!node || typeof node !== 'object') return node;
    return Object.fromEntries(
      Object.entries(node).map(([key, value]) => [
        key,
        key === 'type' && typeof value === 'string' ? value.toLowerCase() : convert(value),
      ]),
    );
  };
  return convert(schema) as Record<string, unknown>;
}

export const geminiClient = new GeminiClient();
