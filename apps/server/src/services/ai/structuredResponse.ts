import { z } from 'zod';
import { AiInferenceError, type GeminiGenerateResponse } from './geminiClient';

export function jsonResponseSchema(schema: z.ZodType): Record<string, unknown> {
  const { $schema, ...jsonSchema } = z.toJSONSchema(schema, { unrepresentable: 'any' });
  return jsonSchema;
}

export function parseAiResponse<T>(response: GeminiGenerateResponse, schema: z.ZodType<T>): T {
  const parsed = schema.safeParse(response.rawJson);
  if (!parsed.success) {
    throw new AiInferenceError('AI_INVALID_RESPONSE', 'The AI response did not match the required format. Please retry generation; no draft was accepted.');
  }
  return parsed.data;
}
