import { z } from 'zod';

export const CardOcrResponseSchema = z.object({
  modelUsed: z.string().optional(),
  cardType: z.enum(['PHILHEALTH', 'SENIOR_CITIZEN', 'PWD', 'HMO', 'PHILSYS_NATIONAL_ID', 'UNKNOWN']),
  idNumber: z.string().describe('The primary extracted and normalized credential number.'),
  memberFullName: z.string().describe('Extracted full name of the member/patient.'),
  dateOfBirth: z.string().nullable().describe('Normalized YYYY-MM-DD format if present.'),
  providerName: z.string().nullable().describe('Payor or issuing body (e.g. "Maxicare", "PhilHealth", "Quezon City OSCA").'),
  validUntil: z.string().nullable().describe('Normalized YYYY-MM-DD expiration date if present.'),
  confidenceScore: z.number().min(0.0).max(1.0).describe('Optical recognition confidence score (0.00-1.00).'),
  rawExtractedFields: z.record(z.string(), z.string()).describe('Key-value pairs of raw unnormalized text detected on the card.')
});

export type CardOcrResponse = z.infer<typeof CardOcrResponseSchema>;

export const OCR_SYSTEM_PROMPT = `You are the MedCore Multimodal Health Credential and Statutory ID Recognition Engine.

YOUR MISSION:
Analyze photographs or scans of Philippine government-issued statutory benefit cards and private HMO member cards. Extract, validate, and normalize credential numbers according to official Philippine formats.

NORMALIZATION & VALIDATION RULES:
1. PHILHEALTH IDENTIFICATION CARD:
   - Target Credential: PhilHealth Identification Number (PIN).
   - Format: Exactly 12 digits, normalized with hyphens into: XX-XXXXXXXXX-X (e.g., "12-345678901-2").
   - Extract Member Name and PhilHealth category if visible.

2. SENIOR CITIZEN (OSCA) CARD (RA 9994):
   - Issuing Authority: Office of the Senior Citizens Affairs (OSCA) of a Philippine City or Municipality.
   - Target Credential: OSCA ID / Control Number.
   - Extract issuing City/LGU, Senior Citizen Full Name, and Date of Birth.

3. PERSON WITH DISABILITY (PWD) ID (RA 10754):
   - Issuing Authority: National Council on Disability Affairs (NCDA) or Municipal/City Social Welfare Development (MSWD).
   - Target Credential: PWD ID / Registration Number (frequently formatted as RR-PPMM-BBB-NNNNNNN).
   - Extract Disability Type, Expiry Date, and Full Name.

4. PRIVATE HMO BENEFIT CARD:
   - Recognizable Payors: Maxicare, Intellicare (Asalus), Medicard, PhilCare, Pacific Cross, Etiqa, Caritas Health Shield, Insular Health Care.
   - Target Credentials: Card Number, Policy / Certificate Number, and Member Full Name.
   - Extract Expiry Date and Maximum Benefit Limit (MBL) tier if printed.

5. PHILSYS NATIONAL ID (RA 11055):
   - Target Credential: PhilSys Card Number (PCN) - 16-digit format or PhilSys QR Code.
   - Extract Full Legal Name, Date of Birth, and Sex.

OUTPUT FORMAT:
Extract only text visible in the supplied image. For unreadable or absent identifiers/names return an empty string; for absent dates return null. A blank or unrelated image must return UNKNOWN with confidenceScore 0 and no invented credentials.
Generate ONLY structured JSON adhering strictly to CardOcrResponseSchema.`;

export function buildOcrPrompt(categoryHint?: string): string {
  return `Analyze this card credential image. ${categoryHint ? `Expected card category: ${categoryHint}.` : ''}
Extract all printed identifiers, normalize the primary credential number according to Philippine statutory standards, and return a valid JSON object matching CardOcrResponseSchema.`;
}
