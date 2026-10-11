import { jsonResponseSchema, parseAiResponse } from './structuredResponse';
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
  env?: Record<string, any>;
}

export interface CoraChatServiceResponse {
  reply: string;
  modelUsed: string;
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

    if (!encounterId) throw new Error('Select a patient encounter before asking Cora about billing.');
    const enc = await getHydratedEncounter(encounterId, facilityId);
    if (!enc) throw new Error('The selected encounter was not found.');

    // Default grounded financial snapshot if no encounter
    const financials: CoraFinancialContext = {
      grossHospitalCharges: Number(enc.waterfall.grossHospitalCharges),
      grossDoctorFee: Number(enc.waterfall.grossDoctorFee),
      grossTotal: Number(enc.waterfall.grossTotal),
      vatExemption: Number(enc.waterfall.vatExemption),
      seniorPwdDiscount: Number(enc.waterfall.seniorPwdDiscount),
      netVatDiscountedBase: Number(enc.waterfall.netVatDiscountedBase),
      philhealthHci: Number(enc.waterfall.philhealthHci),
      philhealthPf: Number(enc.waterfall.philhealthPf),
      philhealthTotal: Number(enc.waterfall.philhealthTotal),
      hmoApprovedAmount: Number(enc.waterfall.hmoApprovedAmount),
      netPatientDue: Number(enc.waterfall.netPatientDue),
      patientPaid: Number(enc.waterfall.patientPaid || 0),
      remainingBalance: Number(enc.remainingBalance),
      roomUpgradeExcess: Number(enc.waterfall.roomUpgradeExcess),
      excludedConsumables: Number(enc.waterfall.excludedConsumables),
      doctorExcessPf: Number(enc.waterfall.doctorExcessPf)
    };

    const pendingChecklist: string[] = [];
    if (enc) {
      if (!enc.doctorSignedAt) pendingChecklist.push('Attending physician professional fee signature');
      if (!enc.pharmacyRtsCleared) pendingChecklist.push('Ward pharmacy Return-to-Stock credit');
      if (enc.hmo?.finalLoaStatus !== 'APPROVED') pendingChecklist.push('Final HMO electronic Letter of Authorization');
    }

    const encounterContext: CoraEncounterContext = {
      patientPseudonym: enc.patient.fullName,
      roomBedMasked: enc.roomBed,
      roomCategory: enc?.roomCategory || 'WARD',
      admissionDate: enc.admissionDate,
      primaryDiagnosis: enc.primaryDiagnosis,
      stage: enc?.stage || 'PENDING_SETTLEMENT',
      hmoProviderName: enc?.hmo?.providerName,
      hmoApprovalCode: enc?.hmo?.approvalCode,
      hmoDisallowedConsumables: enc?.hmo?.disallowedConsumables,
      pendingChecklistSteps: pendingChecklist
    };

    const rawPrompt = buildCoraPrompt(encounterContext, financials, message, language, mode);
    const scrubResult = scrubPatientData(rawPrompt, {
      fullName: enc.patient.fullName, mrn: enc.patient.mrn, roomBed: enc.roomBed,
      encounterNumber: enc.encounterNumber, philhealthPin: enc.patient.philhealthPin,
      contactNumber: enc.patient.contactNumber, hmoApprovalCode: enc.hmo.approvalCode
    });
    const prompt = scrubResult.scrubbedText;

    // 3. Call Gemini
    const systemPrompt = CORA_SYSTEM_PROMPTS[language] || CORA_SYSTEM_PROMPTS.fil;
    const response = await geminiClient.generate({
      systemInstruction: systemPrompt,
      prompt,
      responseMimeType: 'application/json',
      responseJsonSchema: jsonResponseSchema(CoraResponseSchema),
      temperature: 0.3,
      env: options.env
    });

    const coraData = parseAiResponse(response, CoraResponseSchema);

    // 4. Rehydration & Token Map Cleanup
    const hydratedReply = rehydrateText(coraData.reply, scrubResult.tokenMap);
    clearTokenMap(scrubResult.tokenMap);

    return {
      reply: hydratedReply,
      modelUsed: response.modelUsed,
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
