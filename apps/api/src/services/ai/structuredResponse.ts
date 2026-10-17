import { z } from 'zod';
import { AiInferenceError, type GeminiGenerateResponse } from './geminiClient';

export function jsonResponseSchema(schema: z.ZodType): Record<string, unknown> {
  const { $schema: _schema, ...jsonSchema } = z.toJSONSchema(schema, { unrepresentable: 'any' });
  return jsonSchema;
}

export function parseAiResponse<T>(response: GeminiGenerateResponse, schema: z.ZodType<T>): T {
  const parsed = schema.safeParse(response.rawJson);
  if (!parsed.success) {
    throw new AiInferenceError(
      'AI_INVALID_RESPONSE',
      'The AI response did not match the required format. Please retry generation; no draft was accepted.',
    );
  }
  return parsed.data;
}

export function validateAiResult<T>(schema: z.ZodType<T>): (value: unknown) => T {
  return (value) => {
    const parsed = schema.safeParse(value);
    if (!parsed.success) {
      throw new AiInferenceError(
        'AI_INVALID_RESPONSE',
        'The AI response did not match the required format. No draft was accepted.',
      );
    }
    return parsed.data;
  };
}
