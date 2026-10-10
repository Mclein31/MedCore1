import { getHydratedEncounter } from '../../routes/encounters';
import { scrubPatientData, rehydrateText, clearTokenMap } from './phiScrubber';
import { geminiClient } from './geminiClient';
import {
  CoraLanguage,
  CoraMode,
  CoraResponseSchema,
  CORA_SYSTEM_PROMPTS,
  buildCoraPrompt,
  CoraEncounterContext,
  CoraFinancialContext
} from './prompts/coraPrompts';

export interface CoraChatServiceOptions {
  message: string;
  language?: CoraLanguage;
  mode?: CoraMode;
  encounterId?: string;
  facilityId?: string;
}

export interface CoraChatServiceResponse {
  reply: string;
  mode: string;
  suggestedActions: Array<{
    label: string;
    actionType: 'NAVIGATE_BILL' | 'NAVIGATE_PAYMENT' | 'LAUNCH_PROMISSORY' | 'SUBMIT_DISPUTE' | 'CALL_NURSE';
    payload?: Record<string, any>;
  }>;
  groundedBalance: {
    grossTotal: number;
    vatExemption: number;
    seniorPwdDiscount: number;
    philhealthTotal: number;
    hmoApprovedAmount: number;
    netPatientDue: number;
    remainingBalance: number;
  };
}

export class CoraService {
  async chat(options: CoraChatServiceOptions): Promise<CoraChatServiceResponse> {
    const { message, language = 'fil', mode = 'GENERAL', encounterId, facilityId } = options;

    let enc: any = null;
    if (encounterId) {
      enc = await getHydratedEncounter(encounterId, facilityId);
    }

    // Default grounded financial snapshot if no encounter
    const financials: CoraFinancialContext = {
      grossHospitalCharges: enc ? Number(enc.waterfall.grossHospitalCharges) : 84500.0,
      grossDoctorFee: enc ? Number(enc.waterfall.grossDoctorFee) : 35500.0,
      grossTotal: enc ? Number(enc.waterfall.grossTotal) : 120000.0,
      vatExemption: enc ? Number(enc.waterfall.vatExemption) : 12857.14,
      seniorPwdDiscount: enc ? Number(enc.waterfall.seniorPwdDiscount) : 21428.57,
      netVatDiscountedBase: enc ? Number(enc.waterfall.netVatDiscountedBase) : 85714.29,
      philhealthHci: enc ? Number(enc.waterfall.philhealthHci) : 10500.0,
      philhealthPf: enc ? Number(enc.waterfall.philhealthPf) : 4500.0,
      philhealthTotal: enc ? Number(enc.waterfall.philhealthTotal) : 15000.0,
      hmoApprovedAmount: enc ? Number(enc.waterfall.hmoApprovedAmount) : 50514.29,
      netPatientDue: enc ? Number(enc.waterfall.netPatientDue) : 20200.0,
      patientPaid: enc ? Number(enc.waterfall.patientPaid || 0) : 0.0,
      remainingBalance: enc ? Number(enc.remainingBalance) : 20200.0,
      roomUpgradeExcess: enc ? Number(enc.waterfall.roomUpgradeExcess) : 6000.0,
      excludedConsumables: enc ? Number(enc.waterfall.excludedConsumables) : 3200.0,
      doctorExcessPf: enc ? Number(enc.waterfall.doctorExcessPf) : 10000.0
    };

    const pendingChecklist: string[] = [];
    if (enc) {
      if (!enc.doctorSignedAt) pendingChecklist.push('Attending physician professional fee signature');
      if (!enc.pharmacyRtsCleared) pendingChecklist.push('Ward pharmacy Return-to-Stock credit');
      if (enc.hmo?.finalLoaStatus !== 'APPROVED') pendingChecklist.push('Final HMO electronic Letter of Authorization');
    }

    const encounterContext: CoraEncounterContext = {
      patientPseudonym: enc ? enc.patient.fullName : 'Valued Patient',
      roomBedMasked: enc ? enc.roomBed : 'Room 412',
      roomCategory: enc?.roomCategory || 'WARD',
      admissionDate: enc?.admissionDate || '2026-10-08',
      primaryDiagnosis: enc?.primaryDiagnosis || 'Inpatient Stay',
      stage: enc?.stage || 'PENDING_SETTLEMENT',
      hmoProviderName: enc?.hmo?.providerName,
      hmoApprovalCode: enc?.hmo?.approvalCode,
      hmoDisallowedConsumables: enc?.hmo?.disallowedConsumables,
      pendingChecklistSteps: pendingChecklist
    };

    // 1. PHI De-Identification
    const rawContext = `
Patient: ${encounterContext.patientPseudonym}
Room: ${encounterContext.roomBedMasked}
Diagnosis: ${encounterContext.primaryDiagnosis}
Message: ${message}
    `.trim();

    const scrubResult = scrubPatientData(rawContext, {
      fullName: enc?.patient.fullName,
      mrn: enc?.patient.mrn,
      roomBed: enc?.roomBed,
      encounterNumber: enc?.encounterNumber
    });

    // 2. Build Prompt
    const prompt = buildCoraPrompt(
      {
        ...encounterContext,
        patientPseudonym: '[PATIENT_PSEUDONYM_A]',
        roomBedMasked: '[ROOM_MASKED]'
      },
      financials,
      message,
      language,
      mode
    );

    // 3. Call Gemini
    const systemPrompt = CORA_SYSTEM_PROMPTS[language] || CORA_SYSTEM_PROMPTS.fil;
    const response = await geminiClient.generate({
      systemInstruction: systemPrompt,
      prompt,
      responseMimeType: 'application/json',
      temperature: 0.3,
      mockFallbackType: 'CORA',
      mockFallbackContext: {
        language,
        mode,
        grossTotal: financials.grossTotal,
        remainingBalance: financials.remainingBalance
      }
    });

    let coraData: any;
    if (response.rawJson) {
      const parsed = CoraResponseSchema.safeParse(response.rawJson);
      if (parsed.success) {
        coraData = parsed.data;
      } else {
        coraData = geminiClient['getCoraMock'](message, { language, mode });
      }
    } else {
      coraData = geminiClient['getCoraMock'](message, { language, mode });
    }

    // 4. Rehydration & Token Map Cleanup
    const hydratedReply = rehydrateText(coraData.reply, scrubResult.tokenMap);
    clearTokenMap(scrubResult.tokenMap);

    return {
      reply: hydratedReply,
      mode: coraData.mode || mode,
      suggestedActions: coraData.suggestedActions || [],
      groundedBalance: {
        grossTotal: financials.grossTotal,
        vatExemption: financials.vatExemption,
        seniorPwdDiscount: financials.seniorPwdDiscount,
        philhealthTotal: financials.philhealthTotal,
        hmoApprovedAmount: financials.hmoApprovedAmount,
        netPatientDue: financials.netPatientDue,
        remainingBalance: financials.remainingBalance
      }
    };
  }
}

export const coraService = new CoraService();
