import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { facilities } from '../../db/schema';
import { checkCoraScope, coraPolicyNotice, obviousRestrictedRequest } from './coraScope';
import { jsonResponseSchema, parseAiResponse } from './structuredResponse';
import { getHydratedEncounter } from '../../routes/encounters';
import { scrubPatientData, rehydrateText, clearTokenMap } from './phiScrubber';
import { AiInferenceError, geminiClient } from './geminiClient';
import {
  CoraLanguage,
  CoraMode,
  CoraResponseSchema,
  CORA_SYSTEM_PROMPTS,
  buildCoraPrompt,
  directCoraReply,
  CoraEncounterContext,
  CoraHistoryTurn,
  CoraFinancialContext
} from './prompts/coraPrompts';

export interface CoraChatServiceOptions {
  message: string;
  language?: CoraLanguage;
  mode?: CoraMode;
  encounterId?: string;
  facilityId?: string;
  conversation?: CoraHistoryTurn[];
  env?: Record<string, any>;
}

export interface CoraChatServiceResponse {
  scopeDecision: 'ANSWERED' | 'UNSUPPORTED' | 'OUT_OF_SCOPE' | 'RESTRICTED';
  reply: string;
  modelUsed: string;
  mode: string;
  suggestedActions: Array<{ label: string; actionType: 'NAVIGATE_BILL' | 'NAVIGATE_PAYMENT' | 'NAVIGATE_COVERAGE' | 'NAVIGATE_DOCUMENTS' }>;
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

    // Financial facts come only from the authorized selected encounter.
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
    if (enc.stage !== 'CLEARED_GATE_PASS') {
      if (!enc.doctorSignedAt) pendingChecklist.push('Attending physician professional fee signature');
      if (!enc.pharmacyRtsCleared) pendingChecklist.push('Ward pharmacy Return-to-Stock credit');
      if (enc.hmo?.providerName && enc.hmo.providerName !== 'None' && enc.hmo.finalLoaStatus !== 'APPROVED') pendingChecklist.push('Final HMO electronic Letter of Authorization');
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

    const groundedBalance = {
      grossTotal: financials.grossTotal, vatExemption: financials.vatExemption,
      seniorPwdDiscount: financials.seniorPwdDiscount, philhealthTotal: financials.philhealthTotal,
      hmoApprovedAmount: financials.hmoApprovedAmount, netPatientDue: financials.netPatientDue,
      remainingBalance: financials.remainingBalance
    };
    const scrubContext = {
      fullName: enc.patient.fullName, mrn: enc.patient.mrn, roomBed: enc.roomBed,
      encounterNumber: enc.encounterNumber, philhealthPin: enc.patient.philhealthPin,
      contactNumber: enc.patient.contactNumber, hmoApprovalCode: enc.hmo.approvalCode,
      doctorName: enc.attendingDoctor, doctorPan: enc.doctorPan, loaNumber: enc.hmo.loaNumber,
      borrowerName: enc.promissoryNote?.borrowerName, borrowerIdNumber: enc.promissoryNote?.borrowerIdNumber
    };
    const conversation = (options.conversation || []).filter(turn => !obviousRestrictedRequest(turn.content));
    const scopeInput = scrubPatientData(JSON.stringify({message, conversation}), scrubContext);
    let decision;
    try {
      const input = JSON.parse(scopeInput.scrubbedText) as { message: string; conversation: CoraHistoryTurn[] };
      decision = obviousRestrictedRequest(message) ? 'RESTRICTED' : await checkCoraScope(input.message, input.conversation, options.env);
    } finally { clearTokenMap(scopeInput.tokenMap); }
    if (decision !== 'ALLOW') return { scopeDecision: decision, reply: coraPolicyNotice(decision, language), mode, suggestedActions: [], groundedBalance, modelUsed: 'policy-gate' };

    const [facility] = facilityId ? await db.select().from(facilities).where(eq(facilities.id, facilityId)).limit(1) : [];
    const evidence = {
      hospital: facility ? { name: facility.name, address: facility.address, contactPhone: facility.contactPhone } : null,
      attendingDoctor: enc.attendingDoctor, billState: enc.billState,
      items: enc.items.map(i => ({ description: i.description, category: i.category, quantity: i.qty,
        grossAmount: i.grossAmount, philhealthCovered: i.philhealthCovered, hmoCovered: i.hmoCovered,
        patientOop: i.patientOop, status: i.status, coverageReason: i.exclusionReasonClause,
        explanation: i.plainLanguageExplainer, disputed: i.isDisputed })),
      philhealth: { primaryDiagnosis: enc.philhealth.primaryDescription, primaryIcd10: enc.philhealth.primaryIcd10,
        totalCaseRate: enc.philhealth.totalCaseRate, status: enc.philhealth.status, deficiency: enc.philhealth.deficiencyReason },
      hmo: { provider: enc.hmo.providerName, status: enc.hmo.finalLoaStatus, approvedAmount: enc.hmo.approvedAmount,
        maximumBenefit: enc.hmo.policyMbl, remainingBenefit: enc.hmo.mblRemaining, dailyRoomAllowance: enc.hmo.dailyRoomAllowance },
      patientBenefits: { isSeniorCitizen: enc.patient.isSeniorCitizen, isPwd: enc.patient.isPwd },
      disputes: enc.disputes.map(d => ({ itemDescription: d.itemDescription, amount: d.contestedAmount, reason: d.reason, status: d.status, resolution: d.resolutionClause })),
      payments: enc.paymentHistory.map(p => ({ amount: p.amount, method: p.paymentRail, status: p.status, date: p.timestamp })),
      documents: { hasReceipts: enc.receipts.length > 0, gatePassStatus: enc.dischargePass?.status || 'Not issued' },
      promissory: enc.promissoryNote ? { principal: enc.promissoryNote.principalAmount, months: enc.promissoryNote.installmentMonths,
        monthlyInstallment: enc.promissoryNote.monthlyInstallment, firstDueDate: enc.promissoryNote.firstDueDate, status: enc.promissoryNote.status } : null,
      missingInformation: ['Hospital visitor hours, department-specific phone numbers, detailed HMO contract terms and clinical treatment orders are not recorded here.']
    };
    const scrubResult = scrubPatientData(buildCoraPrompt(encounterContext, financials, message, language, mode, evidence, conversation), scrubContext);
    try {
      const response = await geminiClient.generate({
        systemInstruction: CORA_SYSTEM_PROMPTS[language], prompt: scrubResult.scrubbedText,
        responseMimeType: 'application/json', responseJsonSchema: jsonResponseSchema(CoraResponseSchema),
        temperature: 0.2, maxOutputTokens: 2048, timeoutMs: 30000, env: options.env
      });
      const answer = parseAiResponse(response, CoraResponseSchema);
      if (answer.scopeDecision === 'OUT_OF_SCOPE' || answer.scopeDecision === 'RESTRICTED') {
        return { ...answer, reply: coraPolicyNotice(answer.scopeDecision, language), suggestedActions: [], groundedBalance, modelUsed: response.modelUsed };
      }
      const directReply = directCoraReply(answer.reply);
      if (!directReply) throw new AiInferenceError('AI_INVALID_RESPONSE', 'Cora did not return a substantive answer. Please try again.');
      return { ...answer, mode, reply: rehydrateText(directReply, scrubResult.tokenMap), groundedBalance, modelUsed: response.modelUsed };
    } finally { clearTokenMap(scrubResult.tokenMap); }
  }
}
export const coraService = new CoraService();
