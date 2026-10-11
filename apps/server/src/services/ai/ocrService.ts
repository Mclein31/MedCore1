import { jsonResponseSchema, parseAiResponse } from './structuredResponse';
import { geminiClient } from './geminiClient';
import {
  CardOcrResponse,
  CardOcrResponseSchema,
  OCR_SYSTEM_PROMPT,
  buildOcrPrompt
} from './prompts/ocrPrompts';

export type AllowedCardCategory =
  | 'PHILHEALTH' | 'PHILHEALTH_ID'
  | 'SENIOR_CITIZEN' | 'SENIOR_CITIZEN_OSCA'
  | 'PWD' | 'PWD_ID'
  | 'HMO' | 'HMO_CARD'
  | 'NATIONAL_ID' | 'PHILSYS_NATIONAL_ID';

export interface ExtractCardOptions {
  imageBase64: string;
  cardCategory?: AllowedCardCategory | string;
  env?: Record<string, any>;
}

export class OcrService {
  async extractCard(options: ExtractCardOptions): Promise<CardOcrResponse> {
    const { imageBase64, cardCategory, env } = options;

    if (!imageBase64) {
      throw new Error('Image base64 data is required for card credential extraction.');
    }

    // Clean image data prefix if present (e.g., data:image/png;base64,)
    const mimeType = imageBase64.match(/^data:(image\/[a-z+.-]+);base64,/i)?.[1] || 'image/jpeg';
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-z+.-]+;base64,/i, '');

    const prompt = buildOcrPrompt(cardCategory);

    const response = await geminiClient.generate({
      systemInstruction: OCR_SYSTEM_PROMPT,
      prompt,
      parts: [
        { text: prompt },
        { inlineData: { mimeType, data: cleanBase64 } }
      ],
      responseMimeType: 'application/json',
      responseJsonSchema: jsonResponseSchema(CardOcrResponseSchema),
      temperature: 0.1,
      env
    });

    return { ...parseAiResponse(response, CardOcrResponseSchema), modelUsed: response.modelUsed };
  }
}

export const ocrService = new OcrService();
