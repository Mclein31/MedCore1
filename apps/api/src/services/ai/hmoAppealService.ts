import { and, asc, eq, isNull, or } from 'drizzle-orm';
import { z } from 'zod';
import type { DbOrTx } from '../../db/client';
import {
  charges,
  disputes,
  encounters,
  facilities,
  hmoCoverages,
  patients,
  staffUsers,
} from '../../db/schema';
import type { AiConfig } from '../../env';
import { AI_CACHE_TTL, cachedAiResult } from './aiResultCache';
import { AiInferenceError, geminiClient } from './geminiClient';
import { clearTokenMap, rehydrateText, scrubPatientData } from './phiScrubber';
import {
  APPEAL_SYSTEM_PROMPT,
  buildHmoAppealPrompt,
  type HmoAppealResponse,
  HmoAppealResponseSchema,
} from './prompts/appealPrompts';
import { jsonResponseSchema, parseAiResponse, validateAiResult } from './structuredResponse';

export const HMO_APPEAL_RESPONSE_SCHEMA = jsonResponseSchema(HmoAppealResponseSchema);

export interface GenerateHmoAppealOptions {
  db: DbOrTx;
  encounterId: string;
  facilityId: string;
  deniedItemDescription: string;
  deniedAmount: number;
  hmoProviderName?: string;
  justificationNotes?: string;
  userId?: string;
  forceRefresh?: boolean;
  aiConfig?: AiConfig;
  /** Clock for the letter date; defaults to the current time. */
  now?: Date;
}

const isUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Returns true if the appeal markdown prints the admission date as the letter's date header
 * (for example, on a "Date:" line or standalone header line) when it differs from letterDate.
 */
export function hasAdmissionDateAsLetterDate(
  markdown: string,
  admissionDate: string,
  letterDate: string,
): boolean {
  if (!admissionDate || admissionDate === letterDate) return false;
  const admRegex = new RegExp(`\\b${escapeRegex(admissionDate)}\\b`, 'i');
  const letterDateRegex = new RegExp(`\\b${escapeRegex(letterDate)}\\b`, 'i');
  const lines = markdown.split(/\r?\n/);

  for (const line of lines) {
    const stripped = line.replace(/[*_`>#-]/g, '').trim();
    if (
      /^(?:letter\s+)?date\s*:/i.test(stripped) &&
      admRegex.test(stripped) &&
      !letterDateRegex.test(stripped)
    ) {
      return true;
    }
  }

  const nonEmptyLeading = lines
    .map((l) => l.replace(/[*_`>#-]/g, '').trim())
    .filter(Boolean)
    .slice(0, 6);
  return nonEmptyLeading.some((line) => line.toLowerCase() === admissionDate.toLowerCase());
}

export class HmoAppealService {
  async generateAppeal(
    options: GenerateHmoAppealOptions,
  ): Promise<HmoAppealResponse & { modelUsed: string }> {
    const { db, encounterId, facilityId, aiConfig, forceRefresh } = options;

    const matchCond = isUuid(encounterId)
      ? or(eq(encounters.id, encounterId), eq(encounters.encounterNumber, encounterId))
      : eq(encounters.encounterNumber, encounterId);

    const [row] = await db
      .select({ encounter: encounters, patient: patients, facility: facilities })
      .from(encounters)
      .innerJoin(patients, eq(patients.id, encounters.patientId))
      .innerJoin(facilities, eq(facilities.id, encounters.facilityId))
      .where(and(matchCond, eq(encounters.facilityId, facilityId), isNull(encounters.voidedAt)))
      .limit(1);

    if (!row) throw new Error('The selected encounter was not found.');
    if (!options.deniedItemDescription.trim() || !(options.deniedAmount > 0)) {
      throw new Error('Select an actual disputed charge and amount.');
    }

    const { encounter: enc, patient, facility } = row;
    const [hmo] = await db.select().from(hmoCoverages).where(eq(hmoCoverages.encounterId, enc.id));
    const [physician] = await db.select().from(staffUsers).where(eq(staffUsers.id, enc.attendingPhysicianId));
    const activeItems = await db
      .select()
      .from(charges)
      .where(and(eq(charges.encounterId, enc.id), isNull(charges.removedAt)))
      .orderBy(asc(charges.postedAt));
    const encounterDisputes = await db.select().from(disputes).where(eq(disputes.encounterId, enc.id));

    const targetHmo = hmo?.providerName || options.hmoProviderName || 'Private HMO Payer';
    const attendingDoctor = physician?.fullName ?? 'Attending Physician';
    const doctorPan = physician?.prcLicense ?? 'Not recorded';

    const referenceNumberPlaceholder = 'AI_APPEAL_REFERENCE';
    const reconsiderationDeadlinePlaceholder = 'AI_APPEAL_DEADLINE';
    const letterDate = (options.now ?? new Date()).toLocaleDateString('en-PH', {
      timeZone: 'Asia/Manila',
      dateStyle: 'long',
    });
    const admissionDate = enc.admittedAt.toLocaleDateString('en-PH', {
      timeZone: 'Asia/Manila',
      dateStyle: 'long',
    });

    const rawPrompt = buildHmoAppealPrompt(
      enc.encounterNumber,
      patient.fullName,
      attendingDoctor,
      doctorPan,
      targetHmo,
      options.deniedItemDescription,
      options.deniedAmount,
      'See item-specific recorded exclusions below. Any absent denial reason is not documented.',
      `${enc.primaryDiagnosis} (${enc.icd10Code})`,
      JSON.stringify({
        facility: { name: facility.name, address: facility.address },
        // Without this the model uses admissionDate or invents a date for the letter header.
        letterDate,
        letterDateInstruction:
          'Date the letter header with letterDate exactly. Never use admissionDate as the letter date.',
        referenceNumber: referenceNumberPlaceholder,
        admissionDate,
        loaNumber: hmo?.approvalCode ?? 'Not recorded',
        reconsiderationDeadline: reconsiderationDeadlinePlaceholder,
        items: activeItems
          .filter((i) => i.coverage !== 'WAIVED')
          .map((i) => {
            const disp = encounterDisputes.find((d) => d.chargeId === i.id);
            return {
              description: i.description,
              grossAmount: i.grossCents / 100,
              coverage: i.coverage,
              explainer: i.explainer,
              disputeReason: disp?.reason ?? null,
            };
          }),
        suppliedJustification:
          options.justificationNotes || 'No clinical notes or physician justification supplied.',
      }),
      letterDate,
    );

    const scrubbed = scrubPatientData(rawPrompt, {
      fullName: patient.fullName,
      mrn: patient.mrn,
      roomBed: enc.bedCode,
      encounterNumber: enc.encounterNumber,
      doctorName: attendingDoctor,
      doctorPan,
      hmoCardMasked: hmo?.memberNumberLast4,
      loaNumber: hmo?.approvalCode ?? undefined,
    });

    try {
      const appeal = await cachedAiResult({
        module: 'hmo-appeal',
        scope: { facilityId, userId: options.userId, encounterId: enc.id },
        input: {
          prompt: rawPrompt,
          system: APPEAL_SYSTEM_PROMPT,
          schema: HMO_APPEAL_RESPONSE_SCHEMA,
        },
        ttlMs: AI_CACHE_TTL.appeal,
        aiConfig,
        forceRefresh,
        validate: validateAiResult(HmoAppealResponseSchema.extend({ modelUsed: z.string().min(1) })),
        generate: async () => {
          const referenceNumber = `APL-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
          const reconsiderationDeadline = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
          const response = await geminiClient.generate({
            systemInstruction: APPEAL_SYSTEM_PROMPT,
            prompt: scrubbed.scrubbedText
              .replaceAll('AI_APPEAL_REFERENCE', referenceNumber)
              .replaceAll('AI_APPEAL_DEADLINE', reconsiderationDeadline),
            responseMimeType: 'application/json',
            responseJsonSchema: HMO_APPEAL_RESPONSE_SCHEMA,
            temperature: 0.2,
            aiConfig,
          });
          const parsed = parseAiResponse(response, HmoAppealResponseSchema);
          if (
            parsed.referenceNumber !== referenceNumber ||
            parsed.reconsiderationDeadline !== reconsiderationDeadline ||
            !parsed.appealLetterMarkdown.includes(referenceNumber) ||
            !parsed.appealLetterMarkdown.includes(letterDate) ||
            hasAdmissionDateAsLetterDate(parsed.appealLetterMarkdown, admissionDate, letterDate)
          ) {
            throw new AiInferenceError(
              'AI_INVALID_RESPONSE',
              'The generated letter did not preserve its letter date, appeal reference, or requested response date. Please regenerate it.',
            );
          }
          const readableDeadline = new Date(reconsiderationDeadline).toLocaleString('en-PH', {
            timeZone: 'Asia/Manila',
            dateStyle: 'long',
            timeStyle: 'short',
          });
          return {
            ...parsed,
            appealLetterMarkdown: parsed.appealLetterMarkdown.replaceAll(
              reconsiderationDeadline,
              readableDeadline,
            ),
            modelUsed: response.modelUsed,
          };
        },
      });

      return {
        ...appeal,
        attendingPhysicianName: attendingDoctor,
        doctorPan,
        appealLetterMarkdown: rehydrateText(appeal.appealLetterMarkdown, scrubbed.tokenMap),
        suggestedAttachments: appeal.suggestedAttachments.map((a) => rehydrateText(a, scrubbed.tokenMap)),
      };
    } finally {
      clearTokenMap(scrubbed.tokenMap);
    }
  }
}

export const hmoAppealService = new HmoAppealService();
