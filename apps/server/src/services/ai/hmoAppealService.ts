import { getHydratedEncounter } from '../../routes/encounters';
import { scrubPatientData, rehydrateText, clearTokenMap } from './phiScrubber';
import { geminiClient } from './geminiClient';
import {
  HmoAppealResponse,
  HmoAppealResponseSchema,
  APPEAL_SYSTEM_PROMPT,
  buildHmoAppealPrompt
} from './prompts/appealPrompts';

export interface GenerateHmoAppealOptions {
  encounterId: string;
  deniedItemDescription: string;
  deniedAmount: number;
  hmoProviderName?: string;
  justificationNotes?: string;
  facilityId?: string;
}

export class HmoAppealService {
  async generateAppeal(options: GenerateHmoAppealOptions): Promise<HmoAppealResponse> {
    const { encounterId, deniedItemDescription, deniedAmount, hmoProviderName, justificationNotes, facilityId } = options;

    const enc = await getHydratedEncounter(encounterId, facilityId);
    if (!enc) {
      throw new Error(`Encounter ${encounterId} not found for HMO appeal generation.`);
    }

    const targetHmo = hmoProviderName || enc.hmo?.providerName || 'Maxicare Healthcare Corporation';
    const doctorName = enc.attendingDoctor || 'Dr. Attending Physician, MD';
    const doctorPan = enc.doctorPan || 'PAN-1984-77123';
    const diagnosis = enc.primaryDiagnosis || 'Acute Inpatient Confinement';
    const denialReason = 'Routine ward supplies / excluded non-covered items';

    const clinicalNotes = justificationNotes || `
Patient admitted under ${enc.roomCategory || 'Inpatient Accommodation'} for ${diagnosis}.
Attending physician ordered specialized consumables and sterile barrier drapes deemed medically necessary to standard-of-care clinical management.
    `.trim();

    // 1. PHI De-Identification
    const rawContext = `
Encounter: ${enc.encounterNumber}
Patient: ${enc.patient.fullName}
MRN: ${enc.patient.mrn}
Attending: ${doctorName}
PAN: ${doctorPan}
Room: ${enc.roomBed}
HMO Card: ${enc.hmo?.cardMasked || '****'}
LOA: ${enc.hmo?.loaNumber || 'LOA-2026-PENDING'}
Notes: ${clinicalNotes}
    `.trim();

    const scrubResult = scrubPatientData(rawContext, {
      fullName: enc.patient.fullName,
      mrn: enc.patient.mrn,
      roomBed: enc.roomBed,
      encounterNumber: enc.encounterNumber,
      doctorName,
      doctorPan,
      hmoCardMasked: enc.hmo?.cardMasked,
      loaNumber: enc.hmo?.loaNumber
    });

    const prompt = buildHmoAppealPrompt(
      enc.encounterNumber,
      '[PATIENT_PSEUDONYM_A]',
      doctorName,
      doctorPan,
      targetHmo,
      deniedItemDescription,
      deniedAmount,
      denialReason,
      diagnosis,
      scrubResult.scrubbedText
    );

    // 2. Call Gemini
    const response = await geminiClient.generate({
      systemInstruction: APPEAL_SYSTEM_PROMPT,
      prompt,
      responseMimeType: 'application/json',
      temperature: 0.2,
      mockFallbackType: 'APPEAL',
      mockFallbackContext: {
        deniedItem: deniedItemDescription,
        deniedAmount,
        hmoProvider: targetHmo
      }
    });

    let appealData: HmoAppealResponse;
    if (response.rawJson) {
      const parsed = HmoAppealResponseSchema.safeParse(response.rawJson);
      if (parsed.success) {
        appealData = parsed.data;
      } else {
        appealData = geminiClient['getAppealMock']({});
      }
    } else {
      appealData = geminiClient['getAppealMock']({});
    }

    // 3. Rehydrate Markdown & Tokens
    appealData.appealLetterMarkdown = rehydrateText(appealData.appealLetterMarkdown, scrubResult.tokenMap);
    clearTokenMap(scrubResult.tokenMap);

    return appealData;
  }
}

export const hmoAppealService = new HmoAppealService();
