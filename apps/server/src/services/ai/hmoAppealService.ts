import { getHydratedEncounter } from '../../routes/encounters';
import { db } from '../../db';
import { facilities } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { scrubPatientData, rehydrateText, clearTokenMap } from './phiScrubber';
import { AiInferenceError, geminiClient } from './geminiClient';
import { jsonResponseSchema, parseAiResponse } from './structuredResponse';
import { HmoAppealResponse, HmoAppealResponseSchema, APPEAL_SYSTEM_PROMPT, buildHmoAppealPrompt } from './prompts/appealPrompts';

export const HMO_APPEAL_RESPONSE_SCHEMA = jsonResponseSchema(HmoAppealResponseSchema);
export interface GenerateHmoAppealOptions {
  encounterId: string;
  deniedItemDescription: string;
  deniedAmount: number;
  hmoProviderName?: string;
  justificationNotes?: string;
  facilityId?: string;
  env?: Record<string, any>;
}
export class HmoAppealService {
  async generateAppeal(options: GenerateHmoAppealOptions): Promise<HmoAppealResponse & { modelUsed: string }> {
    const enc = await getHydratedEncounter(options.encounterId, options.facilityId);
    if (!enc) throw new Error('The selected encounter was not found.');
    if (!options.deniedItemDescription.trim() || !(options.deniedAmount > 0)) throw new Error('Select an actual disputed charge and amount.');
    const targetHmo = enc.hmo.providerName;
    if (!targetHmo || targetHmo === 'None') throw new Error('This encounter has no HMO payer to appeal to.');
    const [facility] = options.facilityId ? await db.select().from(facilities).where(eq(facilities.id, options.facilityId)).limit(1) : [];
    const activeItems = enc.items.filter(i => !['WAIVED', 'SUPERVISORY_WAIVED'].includes(i.status));
    const referenceNumber = `APL-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const reconsiderationDeadline = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    const rawPrompt = buildHmoAppealPrompt(
      enc.encounterNumber, enc.patient.fullName, enc.attendingDoctor, enc.doctorPan || 'Not recorded', targetHmo,
      options.deniedItemDescription, options.deniedAmount,
      'See item-specific recorded exclusions below. Any absent denial reason is not documented.',
      `${enc.primaryDiagnosis} (${enc.primaryIcd10})`,
      JSON.stringify({
        facility: facility ? { name: facility.name, address: facility.address } : { name: 'Hospital' },
        referenceNumber,
        admissionDate: enc.admissionDate, loaNumber: enc.hmo.loaNumber || 'Not recorded',
        reconsiderationDeadline,
        items: activeItems.map(i => ({ description: i.description, grossAmount: i.grossAmount, patientOop: i.patientOop, status: i.status, exclusionReason: i.exclusionReasonClause, disputeReason: i.disputeReason })),
        suppliedJustification: options.justificationNotes || 'No clinical notes or physician justification supplied.'
      })
    );
    const scrubbed = scrubPatientData(rawPrompt, {
      fullName: enc.patient.fullName, mrn: enc.patient.mrn, roomBed: enc.roomBed,
      encounterNumber: enc.encounterNumber, doctorName: enc.attendingDoctor,
      doctorPan: enc.doctorPan, hmoCardMasked: enc.hmo.cardMasked, loaNumber: enc.hmo.loaNumber
    });
    try {
      const response = await geminiClient.generate({
        systemInstruction: APPEAL_SYSTEM_PROMPT, prompt: scrubbed.scrubbedText,
        responseMimeType: 'application/json', responseJsonSchema: HMO_APPEAL_RESPONSE_SCHEMA,
        temperature: 0.2, env: options.env
      });
      const appeal = parseAiResponse(response, HmoAppealResponseSchema);
      if (appeal.referenceNumber !== referenceNumber || appeal.reconsiderationDeadline !== reconsiderationDeadline || !appeal.appealLetterMarkdown.includes(referenceNumber)) {
        throw new AiInferenceError('AI_INVALID_RESPONSE', 'The generated letter did not preserve its appeal reference and requested response date. Please regenerate it.');
      }
      return {
        ...appeal,
        referenceNumber,
        attendingPhysicianName: enc.attendingDoctor, doctorPan: enc.doctorPan || 'Not recorded',
        reconsiderationDeadline: reconsiderationDeadline,
        appealLetterMarkdown: rehydrateText(appeal.appealLetterMarkdown, scrubbed.tokenMap),
        suggestedAttachments: appeal.suggestedAttachments.map(a => rehydrateText(a, scrubbed.tokenMap)),
        modelUsed: response.modelUsed
      };
    } finally { clearTokenMap(scrubbed.tokenMap); }
  }
}
export const hmoAppealService = new HmoAppealService();
