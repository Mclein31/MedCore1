import type { AiConfig } from '../../env';
import { AI_CACHE_TTL, aiInputDigest, cachedAiResult } from './aiResultCache';
import { geminiClient } from './geminiClient';
import {
  buildOcrPrompt,
  type CardOcrResponse,
  CardOcrResponseSchema,
  OCR_SYSTEM_PROMPT,
} from './prompts/ocrPrompts';
import { jsonResponseSchema, parseAiResponse, validateAiResult } from './structuredResponse';

export type AllowedCardCategory =
  | 'PHILHEALTH'
  | 'PHILHEALTH_ID'
  | 'SENIOR_CITIZEN'
  | 'SENIOR_CITIZEN_OSCA'
  | 'PWD'
  | 'PWD_ID'
  | 'HMO'
  | 'HMO_CARD'
  | 'NATIONAL_ID'
  | 'PHILSYS_NATIONAL_ID';

export interface ExtractCardOptions {
  imageBase64: string;
  cardCategory?: AllowedCardCategory | string;
  userId?: string;
  facilityId?: string;
  forceRefresh?: boolean;
  aiConfig?: AiConfig;
}

export class OcrService {
  async extractCard(options: ExtractCardOptions): Promise<CardOcrResponse> {
    const { imageBase64, cardCategory, aiConfig } = options;

    if (!imageBase64) {
      throw new Error('Image base64 data is required for card credential extraction.');
    }

    const mimeType =
      imageBase64.match(/^data:(image\/[a-z+.-]+);base64,/i)?.[1]?.toLowerCase() || 'image/jpeg';
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-z+.-]+;base64,/i, '').replace(/\s/g, '');

    const prompt = buildOcrPrompt(cardCategory);

    return cachedAiResult({
      module: 'card-ocr',
      scope: { facilityId: options.facilityId, userId: options.userId },
      input: {
        image: aiInputDigest(cleanBase64),
        mimeType,
        prompt,
        system: OCR_SYSTEM_PROMPT,
        schema: jsonResponseSchema(CardOcrResponseSchema),
      },
      ttlMs: AI_CACHE_TTL.ocr,
      aiConfig,
      forceRefresh: options.forceRefresh,
      validate: validateAiResult(CardOcrResponseSchema.required({ modelUsed: true })),
      generate: async () => {
        const response = await geminiClient.generate({
          systemInstruction: OCR_SYSTEM_PROMPT,
          prompt,
          parts: [{ text: prompt }, { inlineData: { mimeType, data: cleanBase64 } }],
          responseMimeType: 'application/json',
          responseJsonSchema: jsonResponseSchema(CardOcrResponseSchema),
          temperature: 0.1,
          aiConfig,
        });

        return {
          ...parseAiResponse(response, CardOcrResponseSchema),
          modelUsed: response.modelUsed,
        };
      },
    });
  }
}

export const ocrService = new OcrService();
