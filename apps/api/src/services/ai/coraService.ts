import { minutesBetween } from '@medcore/domain';
import { and, asc, desc, eq, isNull, or } from 'drizzle-orm';
import { z } from 'zod';
import type { DbOrTx } from '../../db/client';
import {
  charges,
  disputes,
  encounters,
  facilities,
  gatePasses,
  hmoCoverages,
  ledgers,
  patients,
  payments,
  philhealthClaims,
  promissoryNotes,
  receipts,
  staffUsers,
} from '../../db/schema';
import type { AiConfig } from '../../env';
import { AI_CACHE_TTL, cachedAiResult } from './aiResultCache';
import { coraLanguageCachePolicy, generateLocalizedCoraReply } from './coraLanguage';
import { coraPolicyNotice, obviousRestrictedRequest } from './coraScope';
import { clearTokenMap, rehydrateText, scrubPatientData } from './phiScrubber';
import {
  buildCoraPrompt,
  type CoraEncounterContext,
  type CoraFinancialContext,
  type CoraHistoryTurn,
  type CoraLanguage,
  type CoraMode,
  type CoraResponse,
  CoraResponseSchema,
} from './prompts/coraPrompts';
import { jsonResponseSchema, validateAiResult } from './structuredResponse';

export const CORA_RESPONSE_SCHEMA = jsonResponseSchema(CoraResponseSchema);

export interface CoraChatOptions {
  db: DbOrTx;
  encounterId: string;
  facilityId: string;
  userId?: string;
  message: string;
  language?: CoraLanguage;
  mode?: CoraMode;
  conversationHistory?: CoraHistoryTurn[];
  forceRefresh?: boolean;
  aiConfig?: AiConfig;
}

const isUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

export class CoraService {
  async chat(options: CoraChatOptions): Promise<CoraResponse & { modelUsed: string }> {
    const {
      db,
      encounterId,
      facilityId,
      message,
      language = 'fil',
      mode = 'GENERAL',
      conversationHistory = [],
      forceRefresh,
      aiConfig,
    } = options;

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

    if (!row) {
      throw new Error('The selected encounter was not found.');
    }

    const { encounter: enc, patient, facility } = row;
    const [physician] = await db
      .select({ fullName: staffUsers.fullName, prcLicense: staffUsers.prcLicense })
      .from(staffUsers)
      .where(eq(staffUsers.id, enc.attendingPhysicianId));
    const [ledger] = await db.select().from(ledgers).where(eq(ledgers.encounterId, enc.id));
    const [claim] = await db.select().from(philhealthClaims).where(eq(philhealthClaims.encounterId, enc.id));
    const [hmo] = await db.select().from(hmoCoverages).where(eq(hmoCoverages.encounterId, enc.id));
    const chargeRows = await db
      .select()
      .from(charges)
      .where(and(eq(charges.encounterId, enc.id), isNull(charges.removedAt)))
      .orderBy(asc(charges.postedAt));
    const paymentRows = await db
      .select({
        reference: payments.reference,
        amountCents: payments.amountCents,
        rail: payments.rail,
        createdAt: payments.createdAt,
        officialReceiptNumber: receipts.officialReceiptNumber,
      })
      .from(payments)
      .innerJoin(receipts, eq(receipts.paymentId, payments.id))
      .where(eq(payments.encounterId, enc.id))
      .orderBy(asc(payments.createdAt));
    const noteRows = await db.select().from(promissoryNotes).where(eq(promissoryNotes.encounterId, enc.id));
    const disputeRows = await db
      .select()
      .from(disputes)
      .where(eq(disputes.encounterId, enc.id))
      .orderBy(desc(disputes.createdAt));
    const [activePass] = await db
      .select()
      .from(gatePasses)
      .where(and(eq(gatePasses.encounterId, enc.id), eq(gatePasses.status, 'ACTIVE')))
      .limit(1);

    const pendingSteps: string[] = [];
    if (!enc.pfSignedAt) pendingSteps.push("Doctor's Professional Fee Sign-Off");
    if (!enc.pharmacyClearedAt) pendingSteps.push('Pharmacy Return-to-Stock Audit');
    if (hmo && hmo.loaStatus !== 'APPROVED') pendingSteps.push('HMO Final LOA Approval');
    if (enc.stage !== 'CLEARED' && (ledger?.balanceCents ?? 0) > 0) {
      pendingSteps.push('Final Cashier or Mobile Settlement');
    }

    const mappedStage = enc.stage === 'CLEARED' ? 'CLEARED_GATE_PASS' : enc.stage;

    const encounterCtx: CoraEncounterContext = {
      patientPseudonym: patient.fullName,
      roomBedMasked: enc.bedCode,
      roomCategory: enc.roomCategory,
      admissionDate: enc.admittedAt.toISOString(),
      primaryDiagnosis: `${enc.primaryDiagnosis} (${enc.icd10Code})`,
      stage: mappedStage,
      hmoProviderName: hmo?.providerName ?? 'None',
      hmoApprovalCode: hmo?.approvalCode ?? undefined,
      hmoDisallowedConsumables: (ledger?.nonCoveredCents ?? 0) / 100,
      pendingChecklistSteps: pendingSteps,
    };

    const grossTotal = (ledger?.grossCents ?? 0) / 100;
    const vatExemption = (ledger?.vatExemptionCents ?? 0) / 100;
    const seniorPwdDiscount = (ledger?.seniorPwdDiscountCents ?? 0) / 100;
    const philhealthHci = (claim?.hciCents ?? 0) / 100;
    const philhealthPf = (claim?.pfCents ?? 0) / 100;
    const philhealthTotal = (ledger?.philhealthCents ?? 0) / 100;

    const financialCtx: CoraFinancialContext = {
      grossHospitalCharges: (ledger?.grossHospitalCents ?? 0) / 100,
      grossDoctorFee: (ledger?.grossProfessionalFeeCents ?? 0) / 100,
      grossTotal,
      vatExemption,
      seniorPwdDiscount,
      netVatDiscountedBase: Math.max(0, grossTotal - vatExemption - seniorPwdDiscount),
      philhealthHci,
      philhealthPf,
      philhealthTotal,
      hmoApprovedAmount: (ledger?.hmoCents ?? 0) / 100,
      netPatientDue: (ledger?.netPatientDueCents ?? 0) / 100,
      patientPaid: (ledger?.paidCents ?? 0) / 100,
      remainingBalance: (ledger?.balanceCents ?? 0) / 100,
      roomUpgradeExcess: enc.roomUpgradeExcessCents / 100,
      excludedConsumables: (ledger?.nonCoveredCents ?? 0) / 100,
      doctorExcessPf: enc.doctorExcessPfCents / 100,
    };

    const activeNote = noteRows.find((n) => n.status === 'ACTIVE') ?? noteRows[0];
    const openDisputes = disputeRows.filter((d) => d.status === 'OPEN');
    const disputedTotalCents = openDisputes.reduce((sum, d) => sum + d.contestedCents, 0);

    const evidence = {
      facility: {
        name: facility.name,
        address: facility.address,
        tin: facility.tin,
        accreditationNumber: facility.philhealthAccreditation,
        unrecordedPolicies: 'Phone number, visiting hours and amenity rules are not recorded.',
      },
      patientStatus: {
        isSeniorCitizen: patient.discountKind === 'SENIOR',
        isPwd: patient.discountKind === 'PWD',
      },
      attendingDoctor: {
        name: physician?.fullName ?? 'Attending Physician',
        prcLicense: physician?.prcLicense ?? null,
        pfSigned: Boolean(enc.pfSignedAt),
      },
      coverage: {
        caseRateCode: claim?.caseRateCode ?? null,
        claimNumber: claim?.claimNumber ?? null,
        claimStatus: claim?.status ?? null,
        hmoLoaStatus: hmo?.loaStatus ?? 'NOT_APPLICABLE',
        hmoMblTotal: (hmo?.mblCents ?? 0) / 100,
        hmoMblRemaining: Math.max(0, (hmo?.mblCents ?? 0) - (hmo?.approvedCents ?? 0)) / 100,
      },
      settlement: {
        paymentStatus:
          (ledger?.balanceCents ?? 0) === 0
            ? (ledger?.financedCents ?? 0) > 0
              ? 'PROMISSORY'
              : 'PAID'
            : (ledger?.paidCents ?? 0) > 0
              ? 'PARTIAL'
              : 'UNPAID',
        gatePassCode: activePass?.passNumber ?? null,
        gatePassIssuedAt: activePass?.issuedAt?.toISOString() ?? null,
        elapsedMinutes: enc.mghOrderedAt ? minutesBetween(enc.mghOrderedAt, enc.clearedAt ?? new Date()) : 0,
        slaTargetMinutes: facility.slaBreachMinutes,
      },
      disputes: {
        openDisputeCount: openDisputes.length,
        disputedTotalAmount: disputedTotalCents / 100,
      },
      charges: chargeRows.map((i) => ({
        category: i.category,
        description: i.description,
        quantity: i.quantity,
        unitPrice: i.unitPriceCents / 100,
        grossAmount: i.grossCents / 100,
        coverage: i.coverage,
        isDisputed: i.isDisputed,
        explainer: i.explainer,
      })),
      payments: paymentRows.map((p) => ({
        paymentMethod: p.rail,
        amount: p.amountCents / 100,
        orNumber: p.officialReceiptNumber,
        referenceNumber: p.reference,
        timestamp: p.createdAt.toISOString(),
      })),
      promissoryNote: activeNote
        ? {
            principalAmount: activeNote.principalCents / 100,
            installmentMonths: activeNote.months,
            monthlyInstallment: Math.round(activeNote.principalCents / activeNote.months) / 100,
            firstDueDate: activeNote.firstDueDate,
            status: activeNote.status,
          }
        : null,
    };

    const scrubCtx = {
      fullName: patient.fullName,
      mrn: patient.mrn,
      philhealthPin: patient.philhealthPinLast4 ?? undefined,
      contactNumber: patient.contactPhoneLast4,
      roomBed: enc.bedCode,
      encounterNumber: enc.encounterNumber,
      doctorName: physician?.fullName,
      prcLicense: physician?.prcLicense ?? undefined,
      claimNumber: claim?.claimNumber,
      hmoCardMasked: hmo?.memberNumberLast4,
      hmoApprovalCode: hmo?.approvalCode ?? undefined,
      borrowerName: activeNote?.borrowerName,
    };

    const scrubbedMessage = scrubPatientData(message, scrubCtx);
    const scrubbedHistory = conversationHistory.slice(-6).map((turn) => ({
      role: turn.role,
      content: scrubPatientData(turn.content, scrubCtx).scrubbedText,
    }));
    const rawPrompt = buildCoraPrompt(
      encounterCtx,
      financialCtx,
      scrubbedMessage.scrubbedText,
      language,
      mode,
      evidence,
      scrubbedHistory,
    );
    const scrubbed = scrubPatientData(rawPrompt, scrubCtx);

    try {
      return await cachedAiResult({
        module: 'cora-chat',
        scope: { facilityId, userId: options.userId, encounterId: enc.id },
        input: {
          prompt: rawPrompt,
          language,
          policy: coraLanguageCachePolicy(language),
          schema: CORA_RESPONSE_SCHEMA,
        },
        ttlMs: AI_CACHE_TTL.cora,
        aiConfig,
        forceRefresh,
        validate: validateAiResult(CoraResponseSchema.extend({ modelUsed: z.string().min(1) })),
        generate: async () => {
          const deadline = Date.now() + 40000;
          if (obviousRestrictedRequest(scrubbedMessage.scrubbedText)) {
            return {
              scopeDecision: 'RESTRICTED' as const,
              reply: coraPolicyNotice('RESTRICTED', language),
              mode,
              suggestedActions: [],
              modelUsed: 'policy-guard',
            };
          }
          const { answer, modelUsed } = await generateLocalizedCoraReply({
            prompt: scrubbed.scrubbedText,
            language,
            aiConfig,
            deadline,
          });
          if (answer.scopeDecision === 'OUT_OF_SCOPE' || answer.scopeDecision === 'RESTRICTED') {
            return {
              scopeDecision: answer.scopeDecision,
              reply: coraPolicyNotice(answer.scopeDecision, language),
              mode,
              suggestedActions: [],
              modelUsed,
            };
          }
          return {
            scopeDecision: answer.scopeDecision,
            reply: rehydrateText(rehydrateText(answer.reply, scrubbed.tokenMap), scrubbedMessage.tokenMap),
            mode: answer.mode || mode,
            suggestedActions: (answer.suggestedActions || []).map((a) => ({
              label: rehydrateText(a.label, scrubbed.tokenMap),
              actionType: a.actionType,
            })),
            modelUsed,
          };
        },
      });
    } finally {
      clearTokenMap(scrubbed.tokenMap);
      clearTokenMap(scrubbedMessage.tokenMap);
    }
  }
}

export const coraService = new CoraService();
