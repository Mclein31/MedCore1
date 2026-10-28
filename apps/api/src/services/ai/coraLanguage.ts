import type { AiConfig } from '../../env';
import { AiInferenceError, geminiClient } from './geminiClient';
import {
  CORA_ACTION_LABELS,
  CORA_LANGUAGE_RULES,
  CORA_SYSTEM_PROMPTS,
  CoraResponseSchema,
  directCoraReply,
  type CoraLanguage,
  type CoraResponse,
} from './prompts/coraPrompts';
import { jsonResponseSchema, parseAiResponse } from './structuredResponse';

export function coraLanguageCachePolicy(language: CoraLanguage) {
  return {
    system: CORA_SYSTEM_PROMPTS[language],
    style: CORA_LANGUAGE_RULES[language],
    actions: CORA_ACTION_LABELS[language],
  };
}

// One Gemini call per answer: on the free tier each call can take 20 s and counts against a
// few requests per minute, so scope and language are enforced by the answer prompt itself.
export async function generateLocalizedCoraReply({
  prompt,
  language,
  aiConfig,
  deadline = Date.now() + 40000,
}: {
  prompt: string;
  language: CoraLanguage;
  aiConfig?: AiConfig;
  deadline?: number;
}): Promise<{ answer: CoraResponse; modelUsed: string }> {
  const response = await geminiClient.generate({
    systemInstruction: CORA_SYSTEM_PROMPTS[language],
    prompt,
    responseMimeType: 'application/json',
    responseJsonSchema: jsonResponseSchema(CoraResponseSchema),
    temperature: 0.2,
    maxOutputTokens: 2048,
    timeoutMs: Math.max(1000, deadline - Date.now()),
    aiConfig,
  });
  const answer = parseAiResponse(response, CoraResponseSchema);
  answer.reply = directCoraReply(answer.reply);
  answer.suggestedActions = answer.suggestedActions.map((action) => ({
    ...action,
    label: CORA_ACTION_LABELS[language][action.actionType],
  }));
  if (!answer.reply) {
    throw new AiInferenceError(
      'AI_INVALID_RESPONSE',
      'Cora did not return a substantive answer. Please try again.',
    );
  }
  return { answer, modelUsed: response.modelUsed };
}
