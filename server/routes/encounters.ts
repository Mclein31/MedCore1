import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { eq, and, desc, sql, ilike, or } from 'drizzle-orm';
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

const encountersApp = new Hono();

// Helper to format encounter for client compatibility
export async function getHydratedEncounter(encounterIdOrNumber: string) {
  // Match by id or encounterNumber using helper
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
    .where(matchEncounterCondition(encounterIdOrNumber))
    .limit(1);

  if (encRecord.length === 0) {
    return null;
  }

  const { encounter, patient, bed, doctor } = encRecord[0];

  // Fetch related records in parallel
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

  const waterfall = waterfallList[0] || {
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

  const philhealth = philhealthList[0];
  const hmo = hmoList[0];
  const dischargePass = passesList[0];
  const promissoryNote = notesList[0];

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
      age: 45, // default
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
          hmacSignature: dischargePass.hmacSignature
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
          digitalSignatureTimestamp: promissoryNote.digitalSignatureTimestamp.toISOString(),
          status: promissoryNote.status as any
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

// GET /api/v1/encounters
encountersApp.get('/', async (c) => {
  const encs = await db
    .select({ id: encounters.id })
    .from(encounters)
    .orderBy(encounters.admissionTimestamp);

  const hydrated = await Promise.all(encs.map((e) => getHydratedEncounter(e.id)));
  const validItems = hydrated.filter(Boolean);

  return c.json({
    items: validItems,
    total: validItems.length
  });
});

// GET /api/v1/encounters/:id
encountersApp.get('/:id', async (c) => {
  const id = c.req.param('id');
  const enc = await getHydratedEncounter(id);
  if (!enc) {
    return apiError(c, 404, 'NOT_FOUND', `Encounter ${id} not found.`);
  }
  return c.json(enc);
});

// GET /api/v1/encounters/:id/ledger
encountersApp.get('/:id/ledger', async (c) => {
  const id = c.req.param('id');
  const enc = await getHydratedEncounter(id);
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
  const enc = await getHydratedEncounter(id);
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
    const user = c.get('user');

    const encRecord = await db
      .select()
      .from(encounters)
      .where(matchEncounterCondition(id))
      .limit(1);

    if (encRecord.length === 0) {
      return apiError(c, 404, 'NOT_FOUND', `Encounter ${id} not found.`);
    }

    const enc = encRecord[0];
    const currentIndex = stageOrder.indexOf(enc.stage as any);

    if (currentIndex >= stageOrder.length - 1) {
      return apiError(
        c,
        400,
        'STAGE_FINALIZED',
        'Encounter is already at CLEARED_GATE_PASS stage.'
      );
    }

    const nextStage = stageOrder[currentIndex + 1];

    await db
      .update(encounters)
      .set({
        stage: nextStage,
        stageEnteredAt: new Date(),
        elapsedMinutes: Math.min(45, enc.elapsedMinutes + 4),
        updatedAt: new Date()
      })
      .where(eq(encounters.id, enc.id));

    // Add timeline event
    await db.insert(encounterTimelineEvents).values({
      encounterId: enc.id,
      eventType: 'DISCHARGE',
      title: `Advanced to ${nextStage.replace(/_/g, ' ')}`,
      description: `Stage advanced by ${user.fullName} (${user.role})`,
      actorId: user.id,
      actorName: user.fullName,
      status: 'COMPLETED'
    });

    // Log audit
    await db.insert(systemAuditLogs).values({
      facilityId: enc.facilityId,
      userId: user.id,
      actorRole: user.role,
      action: 'STAGE_ADVANCED',
      resourceType: 'encounters',
      resourceId: enc.id,
      previousState: { stage: enc.stage },
      newState: { stage: nextStage },
      ipAddress: c.req.header('x-forwarded-for') || '127.0.0.1',
      userAgent: c.req.header('user-agent')
    });

    const updated = await getHydratedEncounter(enc.id);
    return c.json({ success: true, encounter: updated });
  }
);

// POST /api/v1/encounters - Admit new patient encounter
const createEncounterSchema = z.object({
  fullName: z.string().min(2).max(128),
  mrn: z.string().min(3).max(32),
  dateOfBirth: z.string().optional(),
  gender: z.enum(['M', 'F', 'OTHER']).default('M'),
  isSeniorCitizen: z.boolean().default(false),
  isPwd: z.boolean().default(false),
  philhealthPin: z.string().optional(),
  roomBed: z.string().min(2).max(32),
  roomCategory: z.enum(['REGULAR_PRIVATE', 'SEMI_PRIVATE', 'WARD', 'SUITE', 'ICU', 'NICU']).default('REGULAR_PRIVATE'),
  dailyRoomRate: z.number().default(2500),
  attendingPhysicianId: z.string().optional(),
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
      // 1. Resolve or Create Patient (Finding 6: prevent unique constraint crash on existing MRN)
      let patientId: string;
      const existingPatient = await tx
        .select()
        .from(patients)
        .where(and(eq(patients.facilityId, user.facilityId), eq(patients.mrn, data.mrn)))
        .limit(1);

      if (existingPatient.length > 0) {
        patientId = existingPatient[0].id;
      } else {
        const dob = data.dateOfBirth
          ? new Date(data.dateOfBirth)
          : new Date(Date.now() - 40 * 365.25 * 24 * 3600 * 1000);
        const insertedPatients = await tx
          .insert(patients)
          .values({
            facilityId: user.facilityId,
            mrn: data.mrn,
            fullName: data.fullName,
            dateOfBirth: dob,
            gender: data.gender,
            contactNumber: '0917-000-0000',
            philhealthPin: data.philhealthPin || null,
            isSeniorCitizen: data.isSeniorCitizen,
            isPwd: data.isPwd
          })
          .returning();
        patientId = insertedPatients[0].id;
      }

      // 2. Allocate Bed
      const bedList = await tx
        .select()
        .from(beds)
        .where(eq(beds.bedNumber, data.roomBed))
        .limit(1);

      const bedId = bedList[0]?.id || null;

      // 3. Generate Encounter Number
      const encNumber = `ENC-2026-${Math.floor(1000 + Math.random() * 9000)}`;

      const insertedEncounters = await tx
        .insert(encounters)
        .values({
          facilityId: user.facilityId,
          encounterNumber: encNumber,
          patientId,
          bedId,
          roomBed: data.roomBed,
          attendingPhysicianId: data.attendingPhysicianId || user.id,
          doctorPan: user.philhealthPan || 'PAN-1092-4418',
          admissionTimestamp: new Date(),
          stage: 'MGH_DECLARED',
          stageEnteredAt: new Date(),
          elapsedMinutes: 0,
          targetTatMinutes: 45,
          slaStatus: 'NORMAL',
          primaryIcd10: 'Z00.0',
          primaryDiagnosis: data.primaryDiagnosis,
          roomCategory: data.roomCategory,
          dailyRoomRate: data.dailyRoomRate.toFixed(2),
          totalGrossCharges: '0.00',
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
        claimNumber: `CLM-PH-2026-${Math.floor(10000 + Math.random() * 90000)}`,
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
          hmoProvider: data.hmoProvider,
          policyNumber: data.hmoPolicyNumber || `POL-${Math.floor(100000 + Math.random() * 900000)}`,
          preAuthStatus: 'CONFIRMED',
          finalLoaStatus: 'PENDING_APPROVAL',
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
        ipAddress: c.req.header('x-forwarded-for') || '127.0.0.1',
        userAgent: c.req.header('user-agent')
      });

      return enc.id;
    });

    const hydrated = await getHydratedEncounter(createdEncounterId);
    return c.json({ success: true, encounter: hydrated });
  }
);

// PATCH /api/v1/encounters/:id - Edit encounter
const editEncounterSchema = z.object({
  primaryDiagnosis: z.string().min(2).max(256).optional(),
  dailyRoomRate: z.number().positive().optional(),
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
    const updates = c.req.valid('json');
    const user = c.get('user');

    const encList = await db
      .select()
      .from(encounters)
      .where(matchEncounterCondition(id))
      .limit(1);

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
      patchData.roomBed = updates.roomBed;
      const newBed = await db.select().from(beds).where(eq(beds.bedNumber, updates.roomBed)).limit(1);
      if (newBed.length > 0) {
        // Free old bed
        if (enc.bedId) {
          await db.update(beds).set({ status: 'AVAILABLE', currentEncounterId: null, updatedAt: new Date() }).where(eq(beds.id, enc.bedId));
        }
        patchData.bedId = newBed[0].id;
        await db.update(beds).set({ status: 'OCCUPIED', currentEncounterId: enc.id, updatedAt: new Date() }).where(eq(beds.id, newBed[0].id));
      }
    }

    await db.update(encounters).set(patchData).where(eq(encounters.id, enc.id));

    await db.insert(systemAuditLogs).values({
      facilityId: enc.facilityId,
      userId: user.id,
      actorRole: user.role,
      action: 'ENCOUNTER_UPDATED',
      resourceType: 'encounters',
      resourceId: enc.id,
      previousState: { primaryDiagnosis: enc.primaryDiagnosis, slaStatus: enc.slaStatus },
      newState: updates,
      ipAddress: c.req.header('x-forwarded-for') || '127.0.0.1',
      userAgent: c.req.header('user-agent')
    });

    const hydrated = await getHydratedEncounter(enc.id);
    return c.json({ success: true, encounter: hydrated });
  }
);

// DELETE /api/v1/encounters/:id - Delete / remove encounter
encountersApp.delete(
  '/:id',
  requireAuth,
  requireRole(['HOSPITAL_CFO', 'BILLING_SPECIALIST']),
  async (c) => {
    const id = c.req.param('id');
    const user = c.get('user');

    const encList = await db
      .select()
      .from(encounters)
      .where(matchEncounterCondition(id))
      .limit(1);

    if (encList.length === 0) {
      return apiError(c, 404, 'NOT_FOUND', `Encounter ${id} not found.`);
    }

    const enc = encList[0];

    await db.transaction(async (tx) => {
      // Free bed
      if (enc.bedId) {
        await tx
          .update(beds)
          .set({ status: 'AVAILABLE', currentEncounterId: null, updatedAt: new Date() })
          .where(eq(beds.id, enc.bedId));
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
        ipAddress: c.req.header('x-forwarded-for') || '127.0.0.1',
        userAgent: c.req.header('user-agent')
      });
    });

    return c.json({ success: true, deletedId: enc.id });
  }
);

export default encountersApp;
