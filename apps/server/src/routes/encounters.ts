import { dispatchEncounterSms, notifyIssuedGatePass } from '../services/smsDispatchService';
import { SmsError, normalizePhPhoneNumber } from '../services/smsService';
import {gatePassPayload} from '../../../shared/gatePassPayload';
import {generateGatePassHmac,generateDeterministicExitPin,resolveGatePassSecret} from '../services/gatePassService';
import { moneyCents } from '../services/statutoryWaterfall';
import { encounterAccessCondition } from '../utils/encounterAccess';
import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { eq, and, desc, sql, ilike, or, inArray } from 'drizzle-orm';
import { db } from '../db';
import {
  encounters,
  patients,
  beds,
  chargemasterItems,
  statutoryWaterfalls,
  philhealthClaims,
  hmoAuthorizations,
  billingDisputes,
  dischargePasses,
  promissoryNotes,
  payments,
  paymentReceipts,
  encounterTimelineEvents,
  systemAuditLogs,
  users
} from '../db/schema';
import { apiError } from '../middleware/error';
import { requireAuth, requireRole } from '../middleware/auth';
import { matchEncounterCondition } from '../utils/dbQuery';
import { getClientIp } from '../utils/clientIp';

const encountersApp = new Hono();

export interface HydrationContext {
  encounter: typeof encounters.$inferSelect;
  patient: typeof patients.$inferSelect;
  bed?: typeof beds.$inferSelect | null;
  doctor?: typeof users.$inferSelect | null;
  itemsList: (typeof chargemasterItems.$inferSelect)[];
  waterfall?: typeof statutoryWaterfalls.$inferSelect | null;
  philhealth?: typeof philhealthClaims.$inferSelect | null;
  hmo?: typeof hmoAuthorizations.$inferSelect | null;
  dischargePass?: typeof dischargePasses.$inferSelect | null;
  promissoryNote?: typeof promissoryNotes.$inferSelect | null;
  disputesList: (typeof billingDisputes.$inferSelect)[];
  timelineList: (typeof encounterTimelineEvents.$inferSelect)[];
  receiptsList: (typeof paymentReceipts.$inferSelect)[];
  paymentsList: (typeof payments.$inferSelect)[];
}

// Pure helper to format encounter for client compatibility
export function formatHydratedEncounter(ctx: HydrationContext) {
  const {
    encounter,
    patient,
    bed,
    doctor,
    itemsList,
    waterfall: rawWaterfall,
    philhealth,
    hmo,
    dischargePass,
    promissoryNote,
    disputesList,
    timelineList,
    receiptsList,
    paymentsList
  } = ctx;

  const waterfall = rawWaterfall || {
    grossHospitalCharges: '0.00',
    grossDoctorFee: '0.00',
    grossTotal: '0.00',
    vatExemption: '0.00',
    seniorPwdDiscount: '0.00',
    netVatDiscountedBase: '0.00',
    philhealthHci: '0.00',
    philhealthPf: '0.00',
    philhealthTotal: '0.00',
    hmoApprovedAmount: '0.00',
    roomUpgradeExcess: '0.00',
    excludedConsumables: '0.00',
    doctorExcessPf: '0.00',
    netPatientDue: '0.00',
    patientPaid: '0.00'
  };

  return {
    id: encounter.encounterNumber.toLowerCase().replace('enc-2026-', 'enc-'),
    uuid: encounter.id,
    encounterNumber: encounter.encounterNumber,
    patient: {
      id: patient.id,
      mrn: patient.mrn,
      maskedName: patient.fullName,
      fullName: patient.fullName,
      philhealthPin: patient.philhealthPin || '',
      isSeniorCitizen: patient.isSeniorCitizen,
      seniorCitizenId: patient.seniorCitizenId || undefined,
      isPwd: patient.isPwd,
      pwdId: patient.pwdId || undefined,
      age: (()=>{const birth=new Date(patient.dateOfBirth);const now=new Date();if(!Number.isFinite(birth.getTime()))return 0;return now.getUTCFullYear()-birth.getUTCFullYear()-(now.getUTCMonth()<birth.getUTCMonth()||now.getUTCMonth()===birth.getUTCMonth()&&now.getUTCDate()<birth.getUTCDate()?1:0);})(),
      gender: patient.gender as 'M' | 'F',
      contactNumber: patient.contactNumber
    },
    roomBed: encounter.roomBed,
    bedNumber: bed?.bedNumber,
    roomCategory: encounter.roomCategory as any,
    dailyRoomRate: Number(encounter.dailyRoomRate),
    dailyRoomAllowance: Number(encounter.dailyRoomAllowance),
    admissionDate: encounter.admissionTimestamp.toISOString(),
    mghOrderTimestamp: encounter.mghOrderTimestamp?.toISOString() || encounter.admissionTimestamp.toISOString(),
    attendingDoctor: doctor?.fullName || 'Attending Physician',
    attendingDoctorObj: doctor
      ? {
          id: doctor.id,
          name: doctor.fullName,
          prcLicense: doctor.prcLicense || '',
          specialization: doctor.title,
          contactNumber: doctor.contactNumber || '',
          declaredFee: Number(encounter.doctorAgreedFee),
          accreditedScheduleRate: Number(encounter.doctorAgreedFee),
          status: 'Accredited'
        }
      : undefined,
    doctorPan: encounter.doctorPan,
    doctorAgreedFee: Number(encounter.doctorAgreedFee),
    doctorExcessPf: Number(encounter.doctorExcessPf),
    doctorSignedAt: encounter.doctorSignedAt?.toISOString(),
    pharmacyRtsCleared: encounter.pharmacyRtsCleared,
    unreturnedMedsCount: encounter.unreturnedMedsCount,
    stage: encounter.stage,
    elapsedMinutes: encounter.elapsedMinutes,
    slaStatus: encounter.slaStatus,
    primaryDiagnosis: encounter.primaryDiagnosis,
    primaryIcd10: encounter.primaryIcd10,
    hmo: hmo
      ? {
          providerName: hmo.providerName,
          cardMasked: hmo.cardNumberMasked,
          loaNumber: hmo.loaNumber || undefined,
          policyMbl: Number(hmo.policyMbl),
          mblRemaining: Number(hmo.mblRemaining),
          dailyRoomAllowance: Number(hmo.dailyRoomAllowance),
          initialLoaApproved: hmo.initialLoaApproved,
          finalLoaStatus: hmo.finalLoaStatus,
          approvalCode: hmo.approvalCode || undefined,
          approvedAmount: Number(hmo.approvedAmount),
          disallowedConsumables: Number(hmo.disallowedConsumables),
          turnaroundMinutes: hmo.turnaroundMinutes || undefined,
          adjusterName: hmo.adjusterName || undefined,
          adjusterContact: hmo.adjusterContact || undefined
        }
      : {
          providerName: 'None',
          cardMasked: '****',
          policyMbl: 0,
          mblRemaining: 0,
          dailyRoomAllowance: 0,
          initialLoaApproved: false,
          finalLoaStatus: 'PENDING_SUBMISSION' as const,
          approvedAmount: 0,
          disallowedConsumables: 0
        },
    philhealth: philhealth
      ? {
          id: philhealth.claimNumber,
          primaryIcd10: philhealth.primaryIcd10,
          primaryDescription: philhealth.primaryDescription,
          caseRateCode: philhealth.caseRateCode,
          totalCaseRate: Number(philhealth.totalCaseRate),
          hciAmount: Number(philhealth.hciAmount),
          pfAmount: Number(philhealth.pfAmount),
          isNbb: philhealth.isNbb,
          rthRiskScore: Number(philhealth.rthRiskScore),
          cf4VitalsRecorded: philhealth.cf4VitalsRecorded,
          cf4CourseInWardRecorded: philhealth.cf4CourseInWardRecorded,
          cf4LabsConsistent: philhealth.cf4LabsConsistent,
          eSoaXmlConformity: philhealth.esoaXmlConformity,
          status: philhealth.status,
          claimAgingDays: philhealth.claimAgingDays,
          deficiencyReason: philhealth.deficiencyReason || undefined
        }
      : {
          id: 'CLM-0',
          primaryIcd10: encounter.primaryIcd10,
          primaryDescription: encounter.primaryDiagnosis,
          caseRateCode: 'N/A',
          totalCaseRate: 0,
          hciAmount: 0,
          pfAmount: 0,
          isNbb: false,
          rthRiskScore: 0,
          cf4VitalsRecorded: true,
          cf4CourseInWardRecorded: true,
          cf4LabsConsistent: true,
          eSoaXmlConformity: true,
          status: 'CLEAN' as const
        },
    items: itemsList.map((it) => ({
      id: it.id,
      code: it.code,
      description: it.description,
      category: it.category as any,
      qty: Number(it.quantity),
      unitPrice: Number(it.unitPrice),
      grossAmount: Number(it.grossAmount),
      isVatable: it.isVatable,
      philhealthCovered: Number(it.philhealthCovered),
      hmoCovered: Number(it.hmoCovered),
      patientOop: Number(it.patientOop),
      status: it.status as any,
      exclusionReasonClause: it.exclusionReasonClause || undefined,
      plainLanguageExplainer: it.plainLanguageExplainer,
      isDisputed: it.isDisputed,
      disputeReason: it.disputeReason || undefined
    })),
    waterfall: {
      grossHospitalCharges: Number(waterfall.grossHospitalCharges),
      grossDoctorFee: Number(waterfall.grossDoctorFee),
      grossTotal: Number(waterfall.grossTotal),
      vatExemption: Number(waterfall.vatExemption),
      seniorPwdDiscount: Number(waterfall.seniorPwdDiscount),
      netVatDiscountedBase: Number(waterfall.netVatDiscountedBase),
      philhealthHci: Number(waterfall.philhealthHci),
      philhealthPf: Number(waterfall.philhealthPf),
      philhealthTotal: Number(waterfall.philhealthTotal),
      hmoApprovedAmount: Number(waterfall.hmoApprovedAmount),
      roomUpgradeExcess: Number(waterfall.roomUpgradeExcess),
      excludedConsumables: Number(waterfall.excludedConsumables),
      doctorExcessPf: Number(waterfall.doctorExcessPf),
      netPatientDue: Number(waterfall.netPatientDue),
      patientPaid: Number(waterfall.patientPaid || 0)
    },
    dischargePass: dischargePass
      ? {
          passNumber: dischargePass.passNumber,
          encounterId: dischargePass.encounterId,
          patientName: dischargePass.patientName,
          roomBed: dischargePass.roomBed,
          settledAmount: Number(dischargePass.settledAmount),
          settlementChannel: dischargePass.settlementChannel as any,
          issuedAt: dischargePass.issuedAt.toISOString(),
          verifiedAt: dischargePass.verifiedAt?.toISOString(),
          status: dischargePass.status as any,
          hmacSignature: dischargePass.hmacSignature,
          exitPin: dischargePass.exitPin,
          qrPayload: gatePassPayload(dischargePass)
        }
      : undefined,
    promissoryNote: promissoryNote
      ? {
          id: promissoryNote.noteNumber,
          encounterId: promissoryNote.encounterId,
          borrowerName: promissoryNote.borrowerName,
          borrowerRelationship: promissoryNote.borrowerRelationship as any,
          borrowerIdType: promissoryNote.borrowerIdType as any,
          borrowerIdNumber: promissoryNote.borrowerIdNumber,
          principalAmount: Number(promissoryNote.principalAmount),
          installmentMonths: promissoryNote.installmentMonths as 3 | 6 | 12,
          monthlyInstallment: Number(promissoryNote.monthlyInstallment),
          firstDueDate: promissoryNote.firstDueDate.toISOString().slice(0, 10),
          status: (((Number(encounter.remainingBalance) <= 0 || encounter.billState === 'PAID') && promissoryNote.status === 'ACTIVE')
            ? 'SETTLED'
            : promissoryNote.status) as any
        }
      : undefined,
    disputes: disputesList.map((d) => ({
      id: d.id,
      encounterId: d.encounterId,
      itemId: d.chargeId,
      itemDescription: d.itemDescription,
      contestedAmount: Number(d.contestedAmount),
      reason: d.reason,
      status: d.status as any,
      supervisorNotes: d.supervisorNotes || undefined,
      createdAt: d.createdAt.toISOString(),
      resolutionClause: d.resolutionClause || undefined,
      department: d.department || undefined
    })),
    timeline: timelineList.map((tl) => ({
      id: tl.id.toString(),
      timestamp: tl.eventTimestamp.toISOString(),
      timeDisplay: tl.eventTimestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      title: tl.title,
      description: tl.description,
      actor: tl.actorName,
      type: tl.eventType as any,
      status: tl.status as any
    })),
    billState: encounter.billState,
    billNumber: encounter.billNumber || undefined,
    amountPaid: Number(encounter.amountPaid),
    remainingBalance: Number(encounter.remainingBalance),
    billFinalizedAt: encounter.billFinalizedAt?.toISOString(),
    billSentAt: encounter.billSentAt?.toISOString(),
    billFirstViewedAt: encounter.billFirstViewedAt?.toISOString(),
    receipts: receiptsList.map((r) => ({
      id: r.id,
      receiptNumber: r.receiptNumber,
      officialReceiptNumber: r.officialReceiptNumber,
      paymentId: r.paymentId || '',
      billId: encounter.billNumber || `SOA-SJMC-26-${encounter.encounterNumber.replace(/\D/g, '')}`,
      encounterId: encounter.id,
      patientName: patient.fullName,
      payerName: r.payerName,
      amount: Number(r.amount),
      paymentRail: r.paymentRail as any,
      issuedAt: r.issuedAt.toISOString(),
      gatewayAuthCode: r.gatewayAuthCode,
      tinNumber: 'TIN-004-982-110-000',
      birPermitNumber: 'BIR-CAS-2026-09-00129',
      qrCodePayload: `SJMC|OR|${r.officialReceiptNumber}|${r.amount}|${r.issuedAt.toISOString()}|${r.gatewayAuthCode}`,
      lineItems: [
        {
          description: `Hospital Settlement - Statement ${encounter.billNumber || encounter.encounterNumber}`,
          amount: Number(r.amount)
        }
      ]
    })),
    paymentHistory: paymentsList.map((p) => {
      const matchedReceipt = receiptsList.find(
        (r) => r.paymentId === p.id || r.officialReceiptNumber === p.officialReceiptNumber
      );
      return {
        id: p.id,
        paymentId: p.paymentReference,
        billId: p.statementNumber,
        encounterId: p.encounterId,
        amount: Number(p.amount),
        currency: p.currency,
        paymentRail: p.paymentRail,
        channelReference: p.channelReference,
        gatewayAuthCode: p.gatewayAuthCode,
        payerName: p.payerName,
        payerContactMasked: p.payerContactMasked,
        timestamp: p.createdAt.toISOString(),
        status: p.status,
        officialReceiptNumber: p.officialReceiptNumber,
        isSimulatedDemo: p.isSimulatedDemo,
        notes: p.notes || undefined,
        receiptId: matchedReceipt?.id,
        receipt: matchedReceipt
          ? {
              id: matchedReceipt.id,
              receiptNumber: matchedReceipt.receiptNumber,
              officialReceiptNumber: matchedReceipt.officialReceiptNumber,
              paymentId: matchedReceipt.paymentId || p.id,
              billId: p.statementNumber,
              encounterId: p.encounterId,
              patientName: patient.fullName,
              payerName: matchedReceipt.payerName,
              amount: Number(matchedReceipt.amount),
              paymentRail: matchedReceipt.paymentRail as any,
              issuedAt: matchedReceipt.issuedAt.toISOString(),
              gatewayAuthCode: matchedReceipt.gatewayAuthCode,
              tinNumber: 'TIN-004-982-110-000',
              birPermitNumber: 'BIR-CAS-2026-09-00129',
              qrCodePayload: `SJMC|OR|${matchedReceipt.officialReceiptNumber}|${matchedReceipt.amount}|${matchedReceipt.issuedAt.toISOString()}|${matchedReceipt.gatewayAuthCode}`,
              lineItems: [
                {
                  description: `Hospital Settlement - Statement ${p.statementNumber}`,
                  amount: Number(matchedReceipt.amount)
                }
              ]
            }
          : undefined
      };
    })
  };
}

// Helper to format a single encounter by ID or encounter number for client compatibility
export async function getHydratedEncounter(encounterIdOrNumber: string, facilityId?: string) {
  const encRecord = await db
    .select({
      encounter: encounters,
      patient: patients,
      bed: beds,
      doctor: users
    })
    .from(encounters)
    .innerJoin(patients, eq(encounters.patientId, patients.id))
    .leftJoin(beds, eq(encounters.bedId, beds.id))
    .leftJoin(users, eq(encounters.attendingPhysicianId, users.id))
    .where(and(matchEncounterCondition(encounterIdOrNumber), facilityId ? eq(encounters.facilityId, facilityId) : undefined))
    .limit(1);

  if (encRecord.length === 0) {
    return null;
  }

  const { encounter, patient, bed, doctor } = encRecord[0];

  const [
    itemsList,
    waterfallList,
    philhealthList,
    hmoList,
    disputesList,
    passesList,
    notesList,
    paymentsList,
    receiptsList,
    timelineList
  ] = await Promise.all([
    db.select().from(chargemasterItems).where(eq(chargemasterItems.encounterId, encounter.id)),
    db.select().from(statutoryWaterfalls).where(eq(statutoryWaterfalls.encounterId, encounter.id)),
    db.select().from(philhealthClaims).where(eq(philhealthClaims.encounterId, encounter.id)),
    db.select().from(hmoAuthorizations).where(eq(hmoAuthorizations.encounterId, encounter.id)),
    db.select().from(billingDisputes).where(eq(billingDisputes.encounterId, encounter.id)),
    db.select().from(dischargePasses).where(eq(dischargePasses.encounterId, encounter.id)).orderBy(desc(dischargePasses.issuedAt)),
    db.select().from(promissoryNotes).where(eq(promissoryNotes.encounterId, encounter.id)).orderBy(desc(promissoryNotes.createdAt)),
    db.select().from(payments).where(eq(payments.encounterId, encounter.id)).orderBy(desc(payments.createdAt)),
    db.select().from(paymentReceipts).where(eq(paymentReceipts.encounterId, encounter.id)).orderBy(desc(paymentReceipts.issuedAt)),
    db.select().from(encounterTimelineEvents).where(eq(encounterTimelineEvents.encounterId, encounter.id)).orderBy(desc(encounterTimelineEvents.eventTimestamp))
  ]);

  return formatHydratedEncounter({
    encounter,
    patient,
    bed,
    doctor,
    itemsList,
    waterfall: waterfallList[0],
    philhealth: philhealthList[0],
    hmo: hmoList[0],
    dischargePass: passesList[0],
    promissoryNote: notesList[0],
    disputesList,
    timelineList,
    receiptsList,
    paymentsList
  });
}

interface CachedCensus {
  payload: string;
  timestamp: number;
}

const censusCache = new Map<string, CachedCensus>();
const CENSUS_CACHE_TTL_MS = 10000; // 10 seconds TTL

// In-memory cache for encounters list payload to prevent Worker CPU limit breaches & excessive DB queries
export function invalidateEncountersCache(facilityId?: string) {
  if (facilityId) {
    for (const key of censusCache.keys()) {
      if (key.startsWith(`${facilityId}:`)) {
        censusCache.delete(key);
      }
    }
  } else {
    censusCache.clear();
  }
}

encountersApp.get('/physicians',requireAuth,requireRole(['BILLING_SPECIALIST','HOSPITAL_CFO']),async c=>{
  const user=c.get('user');
  const items=await db.select({id:users.id,name:users.fullName}).from(users)
    .where(and(eq(users.facilityId,user.facilityId),eq(users.role,'ATTENDING_PHYSICIAN'),eq(users.isActive,true))).orderBy(users.fullName);
  return c.json({items});
});

// GET /api/v1/encounters
encountersApp.get('/', async (c) => {
  const facilityId = c.get('user').facilityId;
  const { search, status, stage, hmo } = c.req.query();

  const cacheKey = `${facilityId}:${search || ''}:${status || ''}:${stage || ''}:${hmo || ''}`;
  const cached = censusCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CENSUS_CACHE_TTL_MS) {
    return c.body(cached.payload, 200, {
      'Content-Type': 'application/json',
      'Cache-Control': 'private, no-store',
      'X-Cache-Status': 'HIT'
    });
  }

  const conditions = [eq(encounters.facilityId, facilityId)];

  if (search && search.trim()) {
    const searchPattern = `%${search.trim()}%`;
    conditions.push(
      or(
        ilike(patients.fullName, searchPattern),
        ilike(patients.mrn, searchPattern),
        ilike(encounters.encounterNumber, searchPattern),
        ilike(encounters.roomBed, searchPattern)
      )!
    );
  }

  if (stage && stage !== 'ALL') {
    const s = stage.toUpperCase();
    const validStages = [
      'MGH_DECLARED',
      'DOCTOR_PF_PENDING',
      'PHARMACY_RTS_AUDIT',
      'HMO_FINAL_LOA',
      'PENDING_SETTLEMENT',
      'CLEARED_GATE_PASS'
    ];
    if (validStages.includes(s)) {
      conditions.push(eq(encounters.stage, s as any));
    }
  }

  if (status && status !== 'ALL') {
    const s = status.toUpperCase();
    const validSlaStatuses = ['NORMAL', 'WARNING', 'BREACH'];
    const validBillStates = [
      'DRAFT',
      'FINALIZED',
      'SENT_TO_PATIENT',
      'VIEWED',
      'DISPUTED',
      'PARTIALLY_PAID',
      'PAID',
      'OVERDUE',
      'CANCELLED'
    ];
    const statusOr = [];
    if (validSlaStatuses.includes(s)) {
      statusOr.push(eq(encounters.slaStatus, s as any));
    }
    if (validBillStates.includes(s)) {
      statusOr.push(eq(encounters.billState, s as any));
    }
    if (statusOr.length > 0) {
      conditions.push(statusOr.length === 1 ? statusOr[0] : or(...statusOr)!);
    }
  }

  if (hmo && hmo !== 'ALL') {
    conditions.push(ilike(hmoAuthorizations.providerName, `%${hmo.trim()}%`));
  }

  let baseQuery = db
    .select({
      encounter: encounters,
      patient: patients,
      bed: beds,
      doctor: users,
      hmo: hmoAuthorizations,
      waterfall: statutoryWaterfalls,
      philhealth: philhealthClaims
    })
    .from(encounters)
    .innerJoin(patients, eq(encounters.patientId, patients.id))
    .leftJoin(beds, eq(encounters.bedId, beds.id))
    .leftJoin(users, eq(encounters.attendingPhysicianId, users.id))
    .leftJoin(hmoAuthorizations, eq(encounters.id, hmoAuthorizations.encounterId))
    .leftJoin(statutoryWaterfalls, eq(encounters.id, statutoryWaterfalls.encounterId))
    .leftJoin(philhealthClaims, eq(encounters.id, philhealthClaims.encounterId))
    .orderBy(encounters.admissionTimestamp);

  const encRecords = conditions.length > 0
    ? await baseQuery.where(and(...conditions))
    : await baseQuery;

  if (encRecords.length === 0) {
    return c.json({ items: [], total: 0 });
  }

  const encIds = encRecords.map((r) => r.encounter.id);
  const isFacilityAll = (!search || !search.trim()) && (!stage || stage === 'ALL') && (!status || status === 'ALL') && (!hmo || hmo === 'ALL');

  // Batch fetch child relations across matched encounters
  // If fetching all facility encounters, use indexed join to avoid sending 250 UUID parameters in SQL
  const [
    allItems,
    allDisputes,
    allPasses,
    allNotes,
    allPayments,
    allReceipts,
    allTimeline
  ] = await Promise.all([
    isFacilityAll
      ? db
          .select({ item: chargemasterItems })
          .from(chargemasterItems)
          .innerJoin(encounters, eq(chargemasterItems.encounterId, encounters.id))
          .where(eq(encounters.facilityId, facilityId))
          .then((rows) => rows.map((r) => r.item))
      : db.select().from(chargemasterItems).where(inArray(chargemasterItems.encounterId, encIds)),
    isFacilityAll
      ? db
          .select({ item: billingDisputes })
          .from(billingDisputes)
          .innerJoin(encounters, eq(billingDisputes.encounterId, encounters.id))
          .where(eq(encounters.facilityId, facilityId))
          .then((rows) => rows.map((r) => r.item))
      : db.select().from(billingDisputes).where(inArray(billingDisputes.encounterId, encIds)),
    isFacilityAll
      ? db
          .select({ item: dischargePasses })
          .from(dischargePasses)
          .innerJoin(encounters, eq(dischargePasses.encounterId, encounters.id))
          .where(eq(encounters.facilityId, facilityId))
          .orderBy(desc(dischargePasses.issuedAt))
          .then((rows) => rows.map((r) => r.item))
      : db.select().from(dischargePasses).where(inArray(dischargePasses.encounterId, encIds)).orderBy(desc(dischargePasses.issuedAt)),
    isFacilityAll
      ? db
          .select({ item: promissoryNotes })
          .from(promissoryNotes)
          .innerJoin(encounters, eq(promissoryNotes.encounterId, encounters.id))
          .where(eq(encounters.facilityId, facilityId))
          .orderBy(desc(promissoryNotes.createdAt))
          .then((rows) => rows.map((r) => r.item))
      : db.select().from(promissoryNotes).where(inArray(promissoryNotes.encounterId, encIds)).orderBy(desc(promissoryNotes.createdAt)),
    isFacilityAll
      ? db
          .select({ item: payments })
          .from(payments)
          .innerJoin(encounters, eq(payments.encounterId, encounters.id))
          .where(eq(encounters.facilityId, facilityId))
          .orderBy(desc(payments.createdAt))
          .then((rows) => rows.map((r) => r.item))
      : db.select().from(payments).where(inArray(payments.encounterId, encIds)).orderBy(desc(payments.createdAt)),
    isFacilityAll
      ? db
          .select({ item: paymentReceipts })
          .from(paymentReceipts)
          .innerJoin(encounters, eq(paymentReceipts.encounterId, encounters.id))
          .where(eq(encounters.facilityId, facilityId))
          .orderBy(desc(paymentReceipts.issuedAt))
          .then((rows) => rows.map((r) => r.item))
      : db.select().from(paymentReceipts).where(inArray(paymentReceipts.encounterId, encIds)).orderBy(desc(paymentReceipts.issuedAt)),
    isFacilityAll
      ? db
          .select({ item: encounterTimelineEvents })
          .from(encounterTimelineEvents)
          .innerJoin(encounters, eq(encounterTimelineEvents.encounterId, encounters.id))
          .where(eq(encounters.facilityId, facilityId))
          .orderBy(desc(encounterTimelineEvents.eventTimestamp))
          .then((rows) => rows.map((r) => r.item))
      : db.select().from(encounterTimelineEvents).where(inArray(encounterTimelineEvents.encounterId, encIds)).orderBy(desc(encounterTimelineEvents.eventTimestamp))
  ]);

  const itemsByEnc = new Map<string, (typeof chargemasterItems.$inferSelect)[]>();
  const disputesByEnc = new Map<string, (typeof billingDisputes.$inferSelect)[]>();
  const passesByEnc = new Map<string, (typeof dischargePasses.$inferSelect)[]>();
  const notesByEnc = new Map<string, (typeof promissoryNotes.$inferSelect)[]>();
  const paymentsByEnc = new Map<string, (typeof payments.$inferSelect)[]>();
  const receiptsByEnc = new Map<string, (typeof paymentReceipts.$inferSelect)[]>();
  const timelineByEnc = new Map<string, (typeof encounterTimelineEvents.$inferSelect)[]>();

  for (const it of allItems) {
    const list = itemsByEnc.get(it.encounterId) || [];
    list.push(it);
    itemsByEnc.set(it.encounterId, list);
  }
  for (const d of allDisputes) {
    const list = disputesByEnc.get(d.encounterId) || [];
    list.push(d);
    disputesByEnc.set(d.encounterId, list);
  }
  for (const p of allPasses) {
    const list = passesByEnc.get(p.encounterId) || [];
    list.push(p);
    passesByEnc.set(p.encounterId, list);
  }
  for (const n of allNotes) {
    const list = notesByEnc.get(n.encounterId) || [];
    list.push(n);
    notesByEnc.set(n.encounterId, list);
  }
  for (const p of allPayments) {
    const list = paymentsByEnc.get(p.encounterId) || [];
    list.push(p);
    paymentsByEnc.set(p.encounterId, list);
  }
  for (const r of allReceipts) {
    const list = receiptsByEnc.get(r.encounterId) || [];
    list.push(r);
    receiptsByEnc.set(r.encounterId, list);
  }
  for (const t of allTimeline) {
    const list = timelineByEnc.get(t.encounterId) || [];
    list.push(t);
    timelineByEnc.set(t.encounterId, list);
  }

  const items = encRecords.map((r) => {
    const encId = r.encounter.id;
    return formatHydratedEncounter({
      encounter: r.encounter,
      patient: r.patient,
      bed: r.bed,
      doctor: r.doctor,
      itemsList: itemsByEnc.get(encId) || [],
      waterfall: r.waterfall,
      philhealth: r.philhealth,
      hmo: r.hmo,
      dischargePass: passesByEnc.get(encId)?.[0],
      promissoryNote: notesByEnc.get(encId)?.[0],
      disputesList: disputesByEnc.get(encId) || [],
      timelineList: timelineByEnc.get(encId) || [],
      receiptsList: receiptsByEnc.get(encId) || [],
      paymentsList: paymentsByEnc.get(encId) || []
    });
  });

  const responsePayload = JSON.stringify({
    items,
    total: items.length
  });

  censusCache.set(cacheKey, { payload: responsePayload, timestamp: Date.now() });

  return c.body(responsePayload, 200, {
    'Content-Type': 'application/json',
    'Cache-Control': 'private, no-store',
    'X-Cache-Status': 'MISS'
  });
});

// GET /api/v1/encounters/:id
encountersApp.get('/:id', async (c) => {
  const id = c.req.param('id');
  const enc = await getHydratedEncounter(id, c.get('user').facilityId);
  if (!enc) {
    return apiError(c, 404, 'NOT_FOUND', `Encounter ${id} not found.`);
  }
  return c.json(enc);
});

// GET /api/v1/encounters/:id/ledger
encountersApp.get('/:id/ledger', async (c) => {
  const id = c.req.param('id');
  const enc = await getHydratedEncounter(id, c.get('user').facilityId);
  if (!enc) {
    return apiError(c, 404, 'NOT_FOUND', `Encounter ${id} not found.`);
  }
  return c.json({
    encounterId: enc.id,
    encounterNumber: enc.encounterNumber,
    items: enc.items,
    waterfall: enc.waterfall
  });
});

// GET /api/v1/encounters/:id/statement & /invoice - Canonical Statement of Account / Invoice Projection
const handleStatement = async (c: any) => {
  const id = c.req.param('id');
  const enc = await getHydratedEncounter(id, c.get('user').facilityId);
  if (!enc) {
    return apiError(c, 404, 'NOT_FOUND', `Encounter ${id} not found.`);
  }

  const receipts = await db
    .select()
    .from(paymentReceipts)
    .where(eq(paymentReceipts.encounterId, enc.uuid))
    .orderBy(desc(paymentReceipts.issuedAt));

  return c.json({
    statementNumber: enc.billNumber || `SOA-SJMC-26-${enc.encounterNumber.replace(/\D/g, '')}`,
    encounterId: enc.id,
    encounterUuid: enc.uuid,
    encounterNumber: enc.encounterNumber,
    patient: enc.patient,
    roomBed: enc.roomBed,
    admissionDate: enc.admissionDate,
    dischargeDate: enc.mghOrderTimestamp,
    attendingDoctor: enc.attendingDoctor,
    billState: enc.billState,
    items: enc.items,
    waterfall: enc.waterfall,
    amountPaid: enc.amountPaid,
    remainingBalance: enc.remainingBalance,
    isFullySettled: enc.remainingBalance <= 0,
    payments: enc.paymentHistory,
    receipts: receipts.map((r) => ({
      id: r.id,
      paymentId: r.paymentId,
      receiptNumber: r.receiptNumber,
      officialReceiptNumber: r.officialReceiptNumber,
      amount: Number(r.amount),
      paymentRail: r.paymentRail,
      payerName: r.payerName,
      issuedAt: r.issuedAt.toISOString()
    })),
    statutoryFramework: {
      vatLaw: 'RA 10963 / Tax Reform for Acceleration and Inclusion (TRAIN)',
      seniorCitizenLaw: 'RA 9994 (Expanded Senior Citizens Act of 2010)',
      pwdLaw: 'RA 10754 (Persons with Disability Act of 2016)',
      universalHealthCare: 'RA 11223 (Universal Health Care Act of 2019)',
      antiHospitalDetentionLaw: 'RA 9439 (Anti-Hospital Detention Act)',
      philHealthCircular: 'PhilHealth Circular No. 2023-0026'
    }
  });
};

encountersApp.get('/:id/statement', handleStatement);
encountersApp.get('/:id/invoice', handleStatement);

// Recipients and template variables are resolved from authorized records, never request text.
const smsBodySchema = z.object({
  language: z.enum(['en', 'tl']).default('en'),
  templateType: z.enum(['BILL_READY', 'INTAKE_ORIENTATION']).default('BILL_READY')
}).strict();
for (const action of ['nudge-doctor', 'notify-patient-sms'] as const) {
  encountersApp.post(`/:id/${action}`, requireAuth, requireRole(['BILLING_SPECIALIST', 'HOSPITAL_CFO']), async c => {
    let body: unknown;
    try { const text = await c.req.text(); body = text.trim() ? JSON.parse(text) : {}; }
    catch { return apiError(c,400,'SMS_REQUEST_INVALID','Send a valid JSON notification request.'); }
    const input = smsBodySchema.safeParse(body);
    if (!input.success) return apiError(c, 400, 'SMS_REQUEST_INVALID', 'Choose a supported SMS language and notification template.');
    try {
      const response = await dispatchEncounterSms({ encounterId: c.req.param('id')!, user: c.get('user'),
        templateType: action === 'nudge-doctor' ? 'DOCTOR_PF_NUDGE' : input.data.templateType,
        language: input.data.language, requestKey: c.req.header('Idempotency-Key') || `manual:${crypto.randomUUID()}`,
        env: c.env as any, ipAddress: getClientIp(c) });
      invalidateEncountersCache(c.get('user').facilityId);
      return c.json(response);
    } catch (error) {
      if (error instanceof SmsError) return apiError(c, error.status, error.code, error.message);
      return apiError(c, 503, 'SMS_TRACKING_UNAVAILABLE', 'SMS tracking is unavailable. Check the outbox before retrying.');
    }
  });
}

// Persist bill lifecycle transitions; settlement readiness remains authoritative.
for (const action of ['finalize-bill', 'send-bill', 'view-bill'] as const) {
  encountersApp.post(`/:id/${action}`, requireAuth,
    requireRole(action === 'view-bill' ? ['PATIENT_GUARANTOR','BILLING_SPECIALIST','HOSPITAL_CFO'] : ['BILLING_SPECIALIST','HOSPITAL_CFO']),
    async c => {
      const user=c.get('user');
      const id=c.req.param('id');
      if(!id) return apiError(c,400,'MISSING_ID','Encounter identifier is required.');
      const condition=await encounterAccessCondition(user,id);
      const result=await db.transaction(async tx=>{
        const [enc]=await tx.select().from(encounters).where(condition).limit(1).for('update');
        if(!enc) return apiError(c,404,'NOT_FOUND','Encounter not found.');
        const existing=action==='finalize-bill'?enc.billFinalizedAt:action==='send-bill'?enc.billSentAt:enc.billFirstViewedAt;
        if(existing) return {id:enc.id};
        if(action!=='view-bill' && enc.stage!=='PENDING_SETTLEMENT') return apiError(c,409,'STAGE_NOT_READY','Complete discharge checks before finalizing or sending the bill.');
        if(action==='send-bill' && !enc.billFinalizedAt) return apiError(c,409,'BILL_NOT_FINALIZED','Finalize the bill before sending it.');
        if(action==='view-bill' && !enc.billSentAt) return {id:enc.id};
        const now=new Date();
        const paid=enc.billState==='PAID' || enc.billState==='PARTIALLY_PAID';
        const billState=paid?enc.billState:action==='finalize-bill'?'FINALIZED':action==='send-bill'?'SENT_TO_PATIENT':'VIEWED';
        await tx.update(encounters).set({billState,updatedAt:now,
          ...(action==='finalize-bill'?{billFinalizedAt:now}:action==='send-bill'?{billSentAt:now}:{billFirstViewedAt:now})}).where(eq(encounters.id,enc.id));
        const title=action==='finalize-bill'?'Final hospital bill ready':action==='send-bill'?'Hospital bill available in MedCore':'Hospital bill viewed';
        await tx.insert(encounterTimelineEvents).values({encounterId:enc.id,eventType:'BILLING',title,
          description:title,actorId:user.id,actorName:user.fullName,status:'COMPLETED'});
        await tx.insert(systemAuditLogs).values({facilityId:user.facilityId,userId:user.id,actorRole:user.role,
          action:action==='finalize-bill'?'BILL_FINALIZED':action==='send-bill'?'BILL_SENT_TO_PATIENT':'BILL_VIEWED',
          resourceType:'encounters',resourceId:enc.id,newState:{billState},ipAddress:getClientIp(c)});
        return {id:enc.id};
      });
      if(result instanceof Response) return result;
      let smsNotification;
      if (action === 'finalize-bill' || action === 'send-bill') {
        try { smsNotification = { dispatch: (await dispatchEncounterSms({encounterId:result.id,user,templateType:'BILL_READY',requestKey:`bill-ready:${result.id}`,env:c.env as any,ipAddress:getClientIp(c)})).dispatch }; }
        catch(error) { smsNotification = {errorCode:error instanceof SmsError?error.code:'SMS_TRACKING_UNAVAILABLE'}; }
      }
      invalidateEncountersCache();
      return c.json({success:true,smsNotification,encounter:user.role==='PATIENT_GUARANTOR'?undefined:await getHydratedEncounter(result.id)});
    });
}

// Covered stays with no patient copay still require an authoritative exit release.
encountersApp.post('/:id/gate-pass',requireAuth,requireRole(['BILLING_SPECIALIST','HOSPITAL_CFO']),async c=>{
  const user=c.get('user');const id=c.req.param('id');
  if(!id)return apiError(c,400,'MISSING_ID','Encounter identifier is required.');
  const result=await db.transaction(async tx=>{
    const [enc]=await tx.select().from(encounters).where(and(matchEncounterCondition(id),eq(encounters.facilityId,user.facilityId))).limit(1).for('update');
    if(!enc)return apiError(c,404,'NOT_FOUND','Encounter not found.');
    const [existing]=await tx.select().from(dischargePasses).where(and(eq(dischargePasses.encounterId,enc.id),inArray(dischargePasses.status,['ACTIVE_READY_FOR_EXIT','VERIFIED_AT_LOBBY']))).limit(1);
    if(enc.stage==='CLEARED_GATE_PASS'&&existing)return {id:enc.id,passNumber:existing.passNumber};
    if(enc.stage!=='PENDING_SETTLEMENT'||moneyCents(Number(enc.remainingBalance))!==0)return apiError(c,409,'STAGE_NOT_READY','Complete discharge checks and settle the patient balance before releasing a pass.');
    const [patient]=await tx.select().from(patients).where(and(eq(patients.id,enc.patientId),eq(patients.facilityId,user.facilityId))).limit(1);
    if(!patient)return apiError(c,404,'NOT_FOUND','Patient not found.');
    const now=new Date();const amount=moneyCents(Number(enc.amountPaid))/100;
    const secret=resolveGatePassSecret((c.env as any)?.GATE_PASS_SECRET,((c.env as any)?.NODE_ENV||process.env.NODE_ENV||'development')==='production');
    const passNumber=`PASS-MC-${crypto.randomUUID()}`;
    await tx.insert(dischargePasses).values({encounterId:enc.id,passNumber,patientName:patient.fullName,roomBed:enc.roomBed,
      settledAmount:amount.toFixed(2),settlementChannel:'CASHIER_OVER_THE_COUNTER',hmacSignature:await generateGatePassHmac(enc.id,amount,now.toISOString(),secret),
      exitPin:await generateDeterministicExitPin(passNumber,secret),status:'ACTIVE_READY_FOR_EXIT',issuedAt:now});
    await tx.update(encounters).set({stage:'CLEARED_GATE_PASS',stageEnteredAt:now,billState:'PAID',updatedAt:now}).where(eq(encounters.id,enc.id));
    if(enc.bedId)await tx.update(beds).set({status:'HOUSEKEEPING',currentEncounterId:null,updatedAt:now}).where(and(eq(beds.id,enc.bedId),eq(beds.currentEncounterId,enc.id),eq(beds.facilityId,user.facilityId)));
    await tx.insert(encounterTimelineEvents).values({encounterId:enc.id,eventType:'DISCHARGE',title:'Digital Gate Pass Issued',description:'No outstanding patient balance; hospital clearance confirmed.',actorId:user.id,actorName:user.fullName,status:'COMPLETED'});
    await tx.insert(systemAuditLogs).values({facilityId:user.facilityId,userId:user.id,actorRole:user.role,action:'GATE_PASS_ISSUED',resourceType:'encounters',resourceId:enc.id,newState:{passNumber,stage:'CLEARED_GATE_PASS'},ipAddress:getClientIp(c)});
    return {id:enc.id,passNumber};
  });
  if(result instanceof Response)return result;
  const smsNotification = await notifyIssuedGatePass({encounterId:result.id,passNumber:result.passNumber,user,env:c.env as any,ipAddress:getClientIp(c)});
  invalidateEncountersCache();return c.json({success:true,smsNotification,encounter:await getHydratedEncounter(result.id)});
});

// POST /api/v1/encounters/:id/advance-stage
const stageOrder = [
  'MGH_DECLARED',
  'DOCTOR_PF_PENDING',
  'PHARMACY_RTS_AUDIT',
  'HMO_FINAL_LOA',
  'PENDING_SETTLEMENT',
  'CLEARED_GATE_PASS'
] as const;

encountersApp.post(
  '/:id/advance-stage',
  requireAuth,
  requireRole(['BILLING_SPECIALIST', 'HOSPITAL_CFO']),
  async (c) => {
    const id = c.req.param('id');
    if (!id) return apiError(c, 400, 'MISSING_ID', 'A record identifier is required.');
    const user = c.get('user');

    const result = await db.transaction(async (tx) => {
    const encRecord = await tx
      .select()
      .from(encounters)
      .where(and(matchEncounterCondition(id), eq(encounters.facilityId, user.facilityId)))
      .limit(1).for('update');

    if (encRecord.length === 0) {
      return apiError(c, 404, 'NOT_FOUND', `Encounter ${id} not found.`);
    }

    const enc = encRecord[0];
    if (enc.stage !== 'MGH_DECLARED') {
      return apiError(c, 409, 'STAGE_ACTION_REQUIRED', 'Complete the current discharge check using its authorized workflow.');
    }
    const nextStage = 'DOCTOR_PF_PENDING' as const;

    await tx
      .update(encounters)
      .set({
        stage: nextStage,
        stageEnteredAt: new Date(),
        elapsedMinutes: Math.min(45, enc.elapsedMinutes + 4),
        updatedAt: new Date()
      })
      .where(eq(encounters.id, enc.id));

    // Add timeline event
    await tx.insert(encounterTimelineEvents).values({
      encounterId: enc.id,
      eventType: 'DISCHARGE',
      title: `Advanced to ${nextStage.replace(/_/g, ' ')}`,
      description: `Stage advanced by ${user.fullName} (${user.role})`,
      actorId: user.id,
      actorName: user.fullName,
      status: 'COMPLETED'
    });

    // Log audit
    await tx.insert(systemAuditLogs).values({
      facilityId: enc.facilityId,
      userId: user.id,
      actorRole: user.role,
      action: 'STAGE_ADVANCED',
      resourceType: 'encounters',
      resourceId: enc.id,
      previousState: { stage: enc.stage },
      newState: { stage: nextStage },
      ipAddress: getClientIp(c),
      userAgent: c.req.header('user-agent')
    });

      return { encounterId: enc.id };
    });
    if (result instanceof Response) return result;
    invalidateEncountersCache();
    const updated = await getHydratedEncounter(result.encounterId);
    return c.json({ success: true, encounter: updated });
  }
);

// POST /api/v1/encounters - Admit new patient encounter
const roomRateSchema=z.number().nonnegative().refine(value=>{try{moneyCents(value);return true;}catch{return false;}},'Use a finite amount with exact centavos.');
const createEncounterSchema = z.object({
  fullName: z.string().min(2).max(128),
  mrn: z.string().min(3).max(32),
  dateOfBirth: z.string().date().refine(value=>value>='1800-01-01'&&value<=new Date().toISOString().slice(0,10),'Enter a valid past birth date.').optional(),
  age: z.number().int().min(0).max(130).optional(),
  gender: z.enum(['M', 'F', 'OTHER']).default('M'),
  isSeniorCitizen: z.boolean().default(false),
  isPwd: z.boolean().default(false),
  philhealthPin: z.string().optional(),
  contactNumber: z.string().max(32).optional().refine(value => {
    if (!value?.trim()) return true;
    try { normalizePhPhoneNumber(value); return true; } catch { return false; }
  }, 'Enter a valid Philippine mobile number.'),
  roomBed: z.string().min(2).max(32),
  roomCategory: z.enum(['REGULAR_PRIVATE', 'SEMI_PRIVATE', 'WARD', 'SUITE', 'ICU', 'NICU']).default('REGULAR_PRIVATE'),
  dailyRoomRate: roomRateSchema.default(2500),
  attendingPhysicianId: z.string().uuid().optional(),
  primaryDiagnosis: z.string().min(2).max(256),
  hmoProvider: z.string().optional(),
  hmoPolicyNumber: z.string().optional()
});

encountersApp.post(
  '/',
  requireAuth,
  requireRole(['BILLING_SPECIALIST', 'HOSPITAL_CFO']),
  zValidator('json', createEncounterSchema),
  async (c) => {
    const data = c.req.valid('json');
    const user = c.get('user');

    const createdEncounterId = await db.transaction(async (tx) => {
      const [physician]=await tx.select().from(users).where(and(data.attendingPhysicianId?eq(users.id,data.attendingPhysicianId):undefined,eq(users.facilityId,user.facilityId),eq(users.role,'ATTENDING_PHYSICIAN'),eq(users.isActive,true))).orderBy(users.fullName).limit(1);
      if(!physician)return apiError(c,400,'INVALID_PHYSICIAN','Choose an active attending physician from this hospital.');
      const [bed]=await tx.select().from(beds).where(and(eq(beds.bedNumber,data.roomBed),eq(beds.facilityId,user.facilityId))).limit(1).for('update');
      if(!bed)return apiError(c,400,'INVALID_BED','Choose an existing hospital bed.');
      if(bed.status!=='AVAILABLE'||bed.currentEncounterId)return apiError(c,409,'BED_UNAVAILABLE','This bed is unavailable. Choose an available bed.');
      // 1. Resolve or Create Patient (Finding 6: prevent unique constraint crash on existing MRN)
      let patientId: string;
      const existingPatient = await tx
        .select()
        .from(patients)
        .where(and(eq(patients.facilityId, user.facilityId), eq(patients.mrn, data.mrn)))
        .limit(1).for('update');

      if (existingPatient.length > 0) {
        patientId = existingPatient[0].id;
        if (data.contactNumber?.trim()) {
          const proposed = normalizePhPhoneNumber(data.contactNumber);
          let registered = '';
          try { registered = normalizePhPhoneNumber(existingPatient[0].contactNumber); } catch { /* Missing legacy contact. */ }
          if (registered && registered !== '+639170000000' && registered !== proposed) return apiError(c,400,'PATIENT_CONTACT_MISMATCH','This MRN already has a different registered mobile number. Use its registered contact for notifications.');
          await tx.update(patients).set({contactNumber:proposed,updatedAt:new Date()}).where(eq(patients.id,patientId));
          await tx.insert(systemAuditLogs).values({facilityId:user.facilityId,userId:user.id,actorRole:user.role,action:'PATIENT_CONTACT_UPDATED',resourceType:'patients',resourceId:patientId,newState:{contactNumber:proposed},ipAddress:getClientIp(c)});
        }
      } else {
        const dob = data.dateOfBirth
          ? new Date(data.dateOfBirth)
          : new Date(new Date().setUTCFullYear(new Date().getUTCFullYear()-(data.age ?? 40)));
        const insertedPatients = await tx
          .insert(patients)
          .values({
            facilityId: user.facilityId,
            mrn: data.mrn,
            fullName: data.fullName,
            dateOfBirth: dob,
            gender: data.gender,
            contactNumber: data.contactNumber?.trim() ? normalizePhPhoneNumber(data.contactNumber) : '',
            philhealthPin: data.philhealthPin || null,
            isSeniorCitizen: data.isSeniorCitizen,
            isPwd: data.isPwd
          })
          .returning();
        patientId = insertedPatients[0].id;
      }

      const bedId = bed.id;

      // 3. Generate Encounter Number
      const encNumber = `ENC-2026-${crypto.randomUUID()}`;

      const insertedEncounters = await tx
        .insert(encounters)
        .values({
          facilityId: user.facilityId,
          encounterNumber: encNumber,
          patientId,
          bedId,
          roomBed: data.roomBed,
          attendingPhysicianId: physician.id,
          doctorPan: physician?.panNumber || '',
          admissionTimestamp: new Date(),
          stage: 'MGH_DECLARED',
          stageEnteredAt: new Date(),
          elapsedMinutes: 0,
          slaStatus: 'NORMAL',
          primaryIcd10: 'Z00.0',
          primaryDiagnosis: data.primaryDiagnosis,
          roomCategory: data.roomCategory,
          dailyRoomRate: data.dailyRoomRate.toFixed(2),
          remainingBalance: '0.00'
        })
        .returning();

      const enc = insertedEncounters[0];

      if (bedId) {
        await tx
          .update(beds)
          .set({ status: 'OCCUPIED', currentEncounterId: enc.id, updatedAt: new Date() })
          .where(eq(beds.id, bedId));
      }

      // 4. Create initial waterfall
      await tx.insert(statutoryWaterfalls).values({
        encounterId: enc.id,
        grossHospitalCharges: '0.00',
        grossDoctorFee: '0.00',
        grossTotal: '0.00',
        vatExemption: '0.00',
        seniorPwdDiscount: '0.00',
        netVatDiscountedBase: '0.00',
        philhealthHci: '0.00',
        philhealthPf: '0.00',
        philhealthTotal: '0.00',
        hmoApprovedAmount: '0.00',
        roomUpgradeExcess: '0.00',
        excludedConsumables: '0.00',
        doctorExcessPf: '0.00',
        coverageShortfall: '0.00',
        netPatientDue: '0.00',
        patientPaid: '0.00'
      });

      // 5. Create initial PhilHealth claim
      await tx.insert(philhealthClaims).values({
        encounterId: enc.id,
        claimNumber: `CLM-PH-2026-${crypto.randomUUID()}`,
        primaryIcd10: 'Z00.0',
        primaryDescription: data.primaryDiagnosis,
        caseRateCode: 'P01',
        status: 'CLEAN',
        rthRiskScore: '0.1200',
        hciAmount: '0.00',
        pfAmount: '0.00',
        totalCaseRate: '0.00'
      });

      // 6. Create initial HMO authorization if provider given
      if (data.hmoProvider) {
        await tx.insert(hmoAuthorizations).values({
          encounterId: enc.id,
          providerName: data.hmoProvider,
          cardNumberMasked: data.hmoPolicyNumber ? `****${data.hmoPolicyNumber.slice(-4)}` : 'Not provided',
          policyMbl: '0.00',
          mblRemaining: '0.00',
          dailyRoomAllowance: '0.00',
          finalLoaStatus: 'PENDING_SUBMISSION',
          approvedAmount: '0.00',
          disallowedConsumables: '0.00'
        });
      }

      // 7. Initial Timeline event
      await tx.insert(encounterTimelineEvents).values({
        encounterId: enc.id,
        eventType: 'CLINICAL',
        title: 'Inpatient Admission Registered',
        description: `Patient admitted to ${data.roomBed} (${data.primaryDiagnosis}) by ${user.fullName}`,
        actorId: user.id,
        actorName: user.fullName,
        status: 'COMPLETED'
      });

      // 8. Audit log
      await tx.insert(systemAuditLogs).values({
        facilityId: user.facilityId,
        userId: user.id,
        actorRole: user.role,
        action: 'ENCOUNTER_CREATED',
        resourceType: 'encounters',
        resourceId: enc.id,
        newState: { encounterNumber: encNumber, patientName: data.fullName, roomBed: data.roomBed },
        ipAddress: getClientIp(c),
        userAgent: c.req.header('user-agent')
      });

      return enc.id;
    });

    if(createdEncounterId instanceof Response)return createdEncounterId;
    invalidateEncountersCache();
    const hydrated = await getHydratedEncounter(createdEncounterId);
    let smsNotification;
    try { smsNotification = {dispatch:(await dispatchEncounterSms({encounterId:createdEncounterId,user,templateType:'INTAKE_ORIENTATION',requestKey:`intake:${createdEncounterId}`,env:c.env as any,ipAddress:getClientIp(c)})).dispatch}; }
    catch(error) {smsNotification={errorCode:error instanceof SmsError?error.code:'SMS_TRACKING_UNAVAILABLE'};}
    return c.json({ success: true, smsNotification, encounter: await getHydratedEncounter(createdEncounterId, user.facilityId) });
  }
);

// PATCH /api/v1/encounters/:id - Edit encounter
const editEncounterSchema = z.object({
  primaryDiagnosis: z.string().min(2).max(256).optional(),
  dailyRoomRate: roomRateSchema.optional(),
  slaStatus: z.enum(['NORMAL', 'ON_TRACK', 'WARNING', 'BREACH']).optional(),
  roomBed: z.string().optional()
});

encountersApp.patch(
  '/:id',
  requireAuth,
  requireRole(['BILLING_SPECIALIST', 'HOSPITAL_CFO']),
  zValidator('json', editEncounterSchema),
  async (c) => {
    const id = c.req.param('id');
    if (!id) return apiError(c, 400, 'MISSING_ID', 'A record identifier is required.');
    const updates = c.req.valid('json');
    const user = c.get('user');

    const result=await db.transaction(async tx=>{
    const encList = await tx
      .select()
      .from(encounters)
      .where(and(matchEncounterCondition(id), eq(encounters.facilityId, user.facilityId)))
      .limit(1).for('update');

    if (encList.length === 0) {
      return apiError(c, 404, 'NOT_FOUND', `Encounter ${id} not found.`);
    }

    const enc = encList[0];
    const patchData: Record<string, any> = { updatedAt: new Date() };

    if (updates.primaryDiagnosis) patchData.primaryDiagnosis = updates.primaryDiagnosis;
    if (updates.dailyRoomRate !== undefined) patchData.dailyRoomRate = updates.dailyRoomRate.toFixed(2);
    if (updates.slaStatus) {
      patchData.slaStatus = updates.slaStatus === 'ON_TRACK' ? 'NORMAL' : updates.slaStatus;
    }

    if (updates.roomBed && updates.roomBed !== enc.roomBed) {
      const [newBed]=await tx.select().from(beds).where(and(eq(beds.bedNumber,updates.roomBed),eq(beds.facilityId,user.facilityId))).limit(1).for('update');
      if(!newBed)return apiError(c,400,'INVALID_BED','Choose an existing hospital bed.');
      if(newBed.status!=='AVAILABLE'||newBed.currentEncounterId)return apiError(c,409,'BED_UNAVAILABLE','This bed is unavailable. Choose an available bed.');
      if(enc.stage==='CLEARED_GATE_PASS')return apiError(c,409,'ENCOUNTER_CLOSED','A discharged encounter cannot occupy a bed.');
      if(enc.bedId)await tx.update(beds).set({status:'AVAILABLE',currentEncounterId:null,updatedAt:new Date()}).where(and(eq(beds.id,enc.bedId),eq(beds.currentEncounterId,enc.id),eq(beds.facilityId,user.facilityId)));
      patchData.roomBed=updates.roomBed;patchData.bedId=newBed.id;
      await tx.update(beds).set({status:'OCCUPIED',currentEncounterId:enc.id,updatedAt:new Date()}).where(eq(beds.id,newBed.id));
    }

    await tx.update(encounters).set(patchData).where(eq(encounters.id, enc.id));

    await tx.insert(systemAuditLogs).values({
      facilityId: enc.facilityId,
      userId: user.id,
      actorRole: user.role,
      action: 'ENCOUNTER_UPDATED',
      resourceType: 'encounters',
      resourceId: enc.id,
      previousState: { primaryDiagnosis: enc.primaryDiagnosis, slaStatus: enc.slaStatus },
      newState: updates,
      ipAddress: getClientIp(c),
      userAgent: c.req.header('user-agent')
    });

    return enc.id;
    });
    if(result instanceof Response)return result;
    invalidateEncountersCache();
    const hydrated = await getHydratedEncounter(result);
    return c.json({ success: true, encounter: hydrated });
  }
);

// DELETE /api/v1/encounters/:id - Delete / remove encounter.
// CFO only, and refused once any payment, promissory note or discharge pass exists,
// so the money trail is never destroyed.
encountersApp.delete(
  '/:id',
  requireAuth,
  requireRole(['HOSPITAL_CFO']),
  async (c) => {
    const id = c.req.param('id');
    if (!id) return apiError(c, 400, 'MISSING_ID', 'A record identifier is required.');
    const user = c.get('user');

    const encList = await db
      .select()
      .from(encounters)
      .where(and(matchEncounterCondition(id), eq(encounters.facilityId, user.facilityId)))
      .limit(1);

    if (encList.length === 0) {
      return apiError(c, 404, 'NOT_FOUND', `Encounter ${id} not found.`);
    }

    const enc = encList[0];

    const blocked = await db.transaction(async (tx) => {
      // Lock the encounter first (same order as payments and notes), then check for financial records.
      await tx.select({ id: encounters.id }).from(encounters).where(eq(encounters.id, enc.id)).for('update');
      const [payment] = await tx.select({ id: payments.id }).from(payments).where(eq(payments.encounterId, enc.id)).limit(1);
      const [note] = await tx.select({ id: promissoryNotes.id }).from(promissoryNotes).where(eq(promissoryNotes.encounterId, enc.id)).limit(1);
      const [pass] = await tx.select({ id: dischargePasses.id }).from(dischargePasses).where(eq(dischargePasses.encounterId, enc.id)).limit(1);
      if (payment || note || pass) return true;

      // Free bed
      if (enc.bedId) {
        await tx
          .update(beds)
          .set({ status: 'AVAILABLE', currentEncounterId: null, updatedAt: new Date() })
          .where(and(eq(beds.id, enc.bedId), eq(beds.currentEncounterId, enc.id), eq(beds.facilityId, user.facilityId)));
      }

      // Cascade deletion
      await tx.delete(encounterTimelineEvents).where(eq(encounterTimelineEvents.encounterId, enc.id));
      await tx.delete(billingDisputes).where(eq(billingDisputes.encounterId, enc.id));
      await tx.delete(chargemasterItems).where(eq(chargemasterItems.encounterId, enc.id));
      await tx.delete(statutoryWaterfalls).where(eq(statutoryWaterfalls.encounterId, enc.id));
      await tx.delete(philhealthClaims).where(eq(philhealthClaims.encounterId, enc.id));
      await tx.delete(hmoAuthorizations).where(eq(hmoAuthorizations.encounterId, enc.id));
      await tx.delete(dischargePasses).where(eq(dischargePasses.encounterId, enc.id));
      await tx.delete(promissoryNotes).where(eq(promissoryNotes.encounterId, enc.id));
      await tx.delete(payments).where(eq(payments.encounterId, enc.id));
      await tx.delete(encounters).where(eq(encounters.id, enc.id));

      await tx.insert(systemAuditLogs).values({
        facilityId: enc.facilityId,
        userId: user.id,
        actorRole: user.role,
        action: 'ENCOUNTER_DELETED',
        resourceType: 'encounters',
        resourceId: enc.id,
        previousState: { encounterNumber: enc.encounterNumber },
        ipAddress: getClientIp(c),
        userAgent: c.req.header('user-agent')
      });
      return false;
    });

    if (blocked) {
      return apiError(c, 409, 'ENCOUNTER_HAS_FINANCIAL_RECORDS', 'This encounter has payments, promissory notes or discharge passes and cannot be deleted.');
    }

    invalidateEncountersCache();
    return c.json({ success: true, deletedId: enc.id });
  }
);

export default encountersApp;
