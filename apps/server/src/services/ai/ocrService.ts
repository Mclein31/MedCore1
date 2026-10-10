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
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');

    const prompt = buildOcrPrompt(cardCategory);

    const response = await geminiClient.generate({
      systemInstruction: OCR_SYSTEM_PROMPT,
      prompt,
      parts: [
        { text: prompt },
        { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } }
      ],
      responseMimeType: 'application/json',
      temperature: 0.1,
      mockFallbackType: 'OCR',
      mockFallbackContext: { cardCategory },
      env
    });

    if (response.rawJson) {
      const parsed = CardOcrResponseSchema.safeParse(response.rawJson);
      if (parsed.success) {
        return parsed.data;
      }
    }

    return geminiClient['getOcrMock']({ cardCategory });
  }
}

export const ocrService = new OcrService();
