import {gatePassPayload} from '../../../shared/gatePassPayload';
import { Hono } from 'hono';
import { eq, and, desc, asc, sql } from 'drizzle-orm';
import { db } from '../db';
import {
  encounters,
  patients,
  dischargePasses,
  promissoryNotes,
  payments,
  paymentReceipts,
  philhealthClaims,
  encounterTimelineEvents
} from '../db/schema';
import { getHydratedEncounter } from './encounters';
import { matchEncounterCondition, isUuid } from '../utils/dbQuery';
import { apiError } from '../middleware/error';
import { requireAuth, AuthUser } from '../middleware/auth';
import { resolveLinkedPatient } from '../utils/encounterAccess';

const patientApp = new Hono();

type LinkedPatient = typeof patients.$inferSelect;

function maskPhilhealthPin(pin: string | null): string {
  if (!pin) return 'Not provided';
  const clean = pin.trim();
  if (clean.length <= 4) return '••••';
  return `${clean.slice(0, 2)}••••••${clean.slice(-2)}`;
}

function toSafePatient(p: LinkedPatient) {
  return {
    id: p.id,
    mrn: p.mrn,
    fullName: p.fullName,
    gender: p.gender,
    contactNumber: p.contactNumber,
    philhealthPinMasked: maskPhilhealthPin(p.philhealthPin),
    isSeniorCitizen: p.isSeniorCitizen,
    isPwd: p.isPwd
  };
}

async function getPatientEncounters(patientId: string, facilityId: string) {
  return db
    .select()
    .from(encounters)
    .where(and(eq(encounters.patientId, patientId), eq(encounters.facilityId, facilityId)))
    .orderBy(asc(sql`case when ${encounters.stage} <> 'CLEARED_GATE_PASS' then 0 when exists (select 1 from ${dischargePasses} where ${dischargePasses.encounterId} = ${encounters.id} and ${dischargePasses.status} = 'ACTIVE_READY_FOR_EXIT') then 1 else 2 end`), desc(encounters.admissionTimestamp), desc(encounters.createdAt), desc(encounters.id));
}

// Allowlisted projection: adding a staff field cannot expose it to patients.
export async function toPatientSafeEncounter(hydrated: Awaited<ReturnType<typeof getHydratedEncounter>>) {
  if (!hydrated) return null;
  const h = hydrated;
  const pass = h.dischargePass;
  const passRows = pass ? await db.select({ exitPin: dischargePasses.exitPin }).from(dischargePasses)
    .where(and(eq(dischargePasses.encounterId, h.uuid), eq(dischargePasses.passNumber, pass.passNumber))).limit(1) : [];
  const hmo = h.hmo;
  const ph = h.philhealth;
  const w = h.waterfall;
  return {
    id: h.id, uuid: h.uuid, encounterNumber: h.encounterNumber, roomBed: h.roomBed, roomCategory: h.roomCategory,
    admissionDate: h.admissionDate, mghOrderTimestamp: h.mghOrderTimestamp, attendingDoctor: h.attendingDoctor,
    stage: h.stage, primaryDiagnosis: h.primaryDiagnosis, primaryIcd10: h.primaryIcd10,
    billState: h.billState, billNumber: h.billNumber, amountPaid: h.amountPaid, remainingBalance: h.remainingBalance,
    waterfall: { grossHospitalCharges: w.grossHospitalCharges, grossDoctorFee: w.grossDoctorFee, grossTotal: w.grossTotal,
      vatExemption: w.vatExemption, seniorPwdDiscount: w.seniorPwdDiscount, netVatDiscountedBase: w.netVatDiscountedBase,
      philhealthHci: w.philhealthHci, philhealthPf: w.philhealthPf, philhealthTotal: w.philhealthTotal,
      hmoApprovedAmount: w.hmoApprovedAmount, netPatientDue: w.netPatientDue, roomUpgradeExcess: w.roomUpgradeExcess,
      excludedConsumables: w.excludedConsumables, doctorExcessPf: w.doctorExcessPf, patientPaid: w.patientPaid },
    items: h.items.map((it) => ({ id: it.id, code: it.code, description: it.description, category: it.category,
      qty: it.qty, unitPrice: it.unitPrice, grossAmount: it.grossAmount, philhealthCovered: it.philhealthCovered,
      hmoCovered: it.hmoCovered, patientOop: it.patientOop, status: it.status, exclusionReasonClause: it.exclusionReasonClause,
      plainLanguageExplainer: it.plainLanguageExplainer, isDisputed: it.isDisputed })),
    hmo: { providerName: hmo.providerName, cardMasked: hmo.cardMasked, loaNumber: hmo.loaNumber, policyMbl: hmo.policyMbl,
      mblRemaining: hmo.mblRemaining, dailyRoomAllowance: hmo.dailyRoomAllowance, initialLoaApproved: hmo.initialLoaApproved,
      finalLoaStatus: hmo.finalLoaStatus, approvalCode: hmo.approvalCode, approvedAmount: hmo.approvedAmount,
      disallowedConsumables: hmo.disallowedConsumables, turnaroundMinutes: hmo.turnaroundMinutes },
    philhealth: { id: ph.id, primaryIcd10: ph.primaryIcd10, primaryDescription: ph.primaryDescription, caseRateCode: ph.caseRateCode,
      totalCaseRate: ph.totalCaseRate, hciAmount: ph.hciAmount, pfAmount: ph.pfAmount, isNbb: ph.isNbb, rthRiskScore: ph.rthRiskScore, status: ph.status },
    dischargePass: pass ? { passNumber: pass.passNumber, status: pass.status, settledAmount: pass.settledAmount,
      roomBed: pass.roomBed, issuedAt: pass.issuedAt, verifiedAt: pass.verifiedAt, exitPin: passRows[0]?.exitPin ?? null,
      qrPayload: gatePassPayload({passNumber:pass.passNumber,status:pass.status,exitPin:passRows[0]?.exitPin}) } : undefined,
    promissoryNote: h.promissoryNote ? { id: h.promissoryNote.id, principalAmount: h.promissoryNote.principalAmount,
      installmentMonths: h.promissoryNote.installmentMonths, monthlyInstallment: h.promissoryNote.monthlyInstallment, status: h.promissoryNote.status } : undefined,
    disputes: h.disputes.map((d) => ({ id: d.id, itemDescription: d.itemDescription, contestedAmount: d.contestedAmount,
      reason: d.reason, status: d.status, createdAt: d.createdAt, resolutionClause: d.resolutionClause })),
    timeline: h.timeline.map((event) => ({ id: event.id, timestamp: event.timestamp, title: event.title, description: event.description }))
  };
}

async function requireLinkedPatient(c: any) {
  const user = c.get('user') as AuthUser;
  const selectedId = c.req.header('x-medcore-patient-id');
  if (selectedId) {
    if (!user.mobileDemoAdmin || user.role !== 'HOSPITAL_CFO') {
      return { error: apiError(c, 403, 'FORBIDDEN', 'Patient selection is not available to this account.') };
    }
    if (!isUuid(selectedId)) return { error: apiError(c, 400, 'INVALID_PATIENT_ID', 'Choose a valid hospital patient.') };
    const selected = await db.select().from(patients)
      .where(and(eq(patients.id, selectedId), eq(patients.facilityId, user.facilityId))).limit(1);
    if (!selected[0]) return { error: apiError(c, 404, 'NOT_FOUND', 'Patient not found.') };
    return { user, patient: selected[0] };
  }
  const patient = await resolveLinkedPatient(user);
  if (!patient) {
    return {
      error: apiError(
        c,
        404,
        'PATIENT_NOT_LINKED',
        'No patient record is linked to this account yet. Please register with the MRN and contact number on your admission slip.'
      )
    };
  }
  return { user, patient };
}

// The ordinary patient namespace remains linked-account-only. This separate
// directory is available solely to the backend-verified presentation principal.
patientApp.get('/demo/patients', requireAuth, async (c) => {
  const user = c.get('user');
  if (!user.mobileDemoAdmin || user.role !== 'HOSPITAL_CFO') return apiError(c, 403, 'FORBIDDEN', 'Hospital patient browsing is not available to this account.');
  const items = await db.select({ id: patients.id, mrn: patients.mrn, fullName: patients.fullName })
    .from(patients).where(eq(patients.facilityId, user.facilityId)).orderBy(asc(patients.fullName));
  return c.json({ items, total: items.length });
});

// GET /api/v1/patient/me — linked patient profile + account
patientApp.get('/me', requireAuth, async (c) => {
  const resolved = await requireLinkedPatient(c);
  if ('error' in resolved) return resolved.error;
  const { user, patient } = resolved;
  return c.json({
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role
    },
    patient: toSafePatient(patient)
  });
});

// GET /api/v1/patient/me/encounters — all stays for the linked patient
patientApp.get('/me/encounters', requireAuth, async (c) => {
  const resolved = await requireLinkedPatient(c);
  if ('error' in resolved) return resolved.error;
  const encRows = await getPatientEncounters(resolved.patient.id, resolved.user.facilityId);
  const items = [];
  for (const row of encRows) {
    const hydrated = await getHydratedEncounter(row.id);
    const safe = await toPatientSafeEncounter(hydrated);
    if (safe) items.push(safe);
  }
  return c.json({ items, total: items.length });
});

// GET /api/v1/patient/me/overview — current stay, balance, discharge checklist, alerts
const STAGE_ORDER = [
  'MGH_DECLARED',
  'DOCTOR_PF_PENDING',
  'PHARMACY_RTS_AUDIT',
  'HMO_FINAL_LOA',
  'PENDING_SETTLEMENT',
  'CLEARED_GATE_PASS'
];

patientApp.get('/me/overview', requireAuth, async (c) => {
  const resolved = await requireLinkedPatient(c);
  if ('error' in resolved) return resolved.error;
  const encRows = await getPatientEncounters(resolved.patient.id, resolved.user.facilityId);
  if (encRows.length === 0) {
    return c.json({ patient: toSafePatient(resolved.patient), currentEncounter: null });
  }
  const current = encRows[0];
  const hydrated = await getHydratedEncounter(current.id);
  const safe = await toPatientSafeEncounter(hydrated);
  if (!safe) return apiError(c, 404, 'NOT_FOUND', 'Encounter not found.');

  const stageIndex = STAGE_ORDER.indexOf(current.stage);
  const checklist = [
    { key: 'clinical', label: 'Doctor clearance', done: stageIndex >= 2 || Boolean(current.doctorSignedAt) },
    { key: 'insurance', label: 'Insurance verified', done: (safe as any).hmo?.finalLoaStatus === 'APPROVED' || (safe as any).hmo?.providerName === 'None' },
    { key: 'billing', label: 'Billing reviewed', done: stageIndex >= 4 },
    {
      key: 'payment',
      label: 'Payment settled',
      done: Number(current.remainingBalance) <= 0 || current.stage === 'CLEARED_GATE_PASS'
    }
  ];
  const alerts = ((safe as any).timeline || []).slice(0, 5).map((t: any) => ({
    title: t.title,
    message: t.description,
    timestamp: t.timestamp
  }));

  return c.json({
    patient: toSafePatient(resolved.patient),
    currentEncounter: safe,
    balance: {
      grossTotal: (safe as any).waterfall.grossTotal,
      philhealthTotal: (safe as any).waterfall.philhealthTotal,
      hmoApprovedAmount: (safe as any).waterfall.hmoApprovedAmount,
      netPatientDue: (safe as any).waterfall.netPatientDue,
      amountPaid: current.amountPaid ? Number(current.amountPaid) : 0,
      remainingBalance: Number(current.remainingBalance)
    },
    dischargeChecklist: checklist,
    alerts
  });
});

// GET /api/v1/patient/me/encounters/:id — single stay, ownership enforced
patientApp.get('/me/encounters/:id', requireAuth, async (c) => {
  const resolved = await requireLinkedPatient(c);
  if ('error' in resolved) return resolved.error;
  const id = c.req.param('id');
  if (!id) return apiError(c, 400, 'MISSING_ID', 'A record identifier is required.');
  const encList = await db
    .select()
    .from(encounters)
    .where(and(matchEncounterCondition(id), eq(encounters.facilityId, resolved.user.facilityId)))
    .limit(1);
  if (encList.length === 0 || encList[0].patientId !== resolved.patient.id) {
    return apiError(c, 404, 'NOT_FOUND', `Encounter ${id} not found.`);
  }
  const hydrated = await getHydratedEncounter(encList[0].id);
  const safe = await toPatientSafeEncounter(hydrated);
  if (!safe) return apiError(c, 404, 'NOT_FOUND', `Encounter ${id} not found.`);
  return c.json(safe);
});

// GET /api/v1/patient/me/payments — own payment history across stays
patientApp.get('/me/payments', requireAuth, async (c) => {
  const resolved = await requireLinkedPatient(c);
  if ('error' in resolved) return resolved.error;
  const encRows = await getPatientEncounters(resolved.patient.id, resolved.user.facilityId);
  const items = [];
  for (const row of encRows) {
    const rows = await db.select().from(payments).where(eq(payments.encounterId, row.id)).orderBy(desc(payments.createdAt));
    for (const p of rows) {
      items.push({
        id: p.id,
        paymentReference: p.paymentReference,
        encounterNumber: row.encounterNumber,
        amount: Number(p.amount),
        paymentRail: p.paymentRail,
        status: p.status,
        isSimulatedDemo: p.isSimulatedDemo,
        officialReceiptNumber: p.officialReceiptNumber,
        payerName: p.payerName,
        createdAt: p.createdAt.toISOString(),
        settledAt: p.settledAt?.toISOString() || null
      });
    }
  }
  items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return c.json({ items, total: items.length });
});

// GET /api/v1/patient/me/receipts — own official receipts
patientApp.get('/me/receipts', requireAuth, async (c) => {
  const resolved = await requireLinkedPatient(c);
  if ('error' in resolved) return resolved.error;
  const encRows = await getPatientEncounters(resolved.patient.id, resolved.user.facilityId);
  const items = [];
  for (const row of encRows) {
    const rows = await db
      .select()
      .from(paymentReceipts)
      .where(eq(paymentReceipts.encounterId, row.id))
      .orderBy(desc(paymentReceipts.issuedAt));
    for (const r of rows) {
      const [payment] = await db.select().from(payments).where(eq(payments.id, r.paymentId)).limit(1);
      items.push({
        id: r.id,
        encounterNumber: row.encounterNumber,
        receiptNumber: r.receiptNumber,
        officialReceiptNumber: r.officialReceiptNumber,
        amount: Number(r.amount),
        paymentRail: r.paymentRail,
        payerName: r.payerName,
        issuedAt: r.issuedAt.toISOString(),
        paymentReference: payment?.paymentReference,
        billReference: payment?.statementNumber || row.billNumber || row.encounterNumber,
        status: payment?.status || 'SUCCESS',
        patientName: resolved.patient.fullName,
        patientMrn: resolved.patient.mrn
      });
    }
  }
  items.sort((a, b) => (a.issuedAt < b.issuedAt ? 1 : -1));
  return c.json({ items, total: items.length });
});

// GET /api/v1/patient/me/receipts/:id — single receipt, ownership enforced
patientApp.get('/me/receipts/:id', requireAuth, async (c) => {
  const resolved = await requireLinkedPatient(c);
  if ('error' in resolved) return resolved.error;
  const id = c.req.param('id');
  if (!id) return apiError(c, 400, 'MISSING_ID', 'A record identifier is required.');
  const encRows = await getPatientEncounters(resolved.patient.id, resolved.user.facilityId);
  const encIds = new Set(encRows.map((e) => e.id));
  const rows = await db.select().from(paymentReceipts).where(eq(paymentReceipts.id, id)).limit(1);
  if (rows.length === 0 || !encIds.has(rows[0].encounterId)) {
    return apiError(c, 404, 'NOT_FOUND', `Receipt ${id} not found.`);
  }
  const r = rows[0];
  const [payment] = await db.select().from(payments).where(eq(payments.id, r.paymentId)).limit(1);
  const encounter = encRows.find(e => e.id === r.encounterId)!;
  return c.json({
    id: r.id,
    receiptNumber: r.receiptNumber,
    officialReceiptNumber: r.officialReceiptNumber,
    amount: Number(r.amount),
    paymentRail: r.paymentRail,
    payerName: r.payerName,
    issuedAt: r.issuedAt.toISOString(),
    encounterNumber: encounter.encounterNumber,
    paymentReference: payment?.paymentReference,
    billReference: payment?.statementNumber || encounter.billNumber || encounter.encounterNumber,
    status: payment?.status || 'SUCCESS',
    patientName: resolved.patient.fullName,
    patientMrn: resolved.patient.mrn
  });
});

// GET /api/v1/patient/me/claims — own PhilHealth + HMO claim summaries
patientApp.get('/me/claims', requireAuth, async (c) => {
  const resolved = await requireLinkedPatient(c);
  if ('error' in resolved) return resolved.error;
  const encRows = await getPatientEncounters(resolved.patient.id, resolved.user.facilityId);
  const items = [];
  for (const row of encRows) {
    const claimRows = await db.select().from(philhealthClaims).where(eq(philhealthClaims.encounterId, row.id)).limit(1);
    if (claimRows.length === 0) continue;
    const cl = claimRows[0];
    items.push({
      kind: 'PHILHEALTH',
      id: cl.id,
      reference: cl.claimNumber,
      encounterNumber: row.encounterNumber,
      status: cl.status,
      caseRateCode: cl.caseRateCode,
      totalCaseRate: Number(cl.totalCaseRate),
      hciAmount: Number(cl.hciAmount),
      pfAmount: Number(cl.pfAmount),
      submittedAt: cl.transmittedAt?.toISOString() || null,
      updatedAt: cl.updatedAt.toISOString(),
      needsAttention: cl.status === 'RETURNED',
      attentionNote: cl.status === 'RETURNED' ? cl.deficiencyReason || 'The hospital billing team is reviewing it.' : null
    });
  }
  return c.json({ items, total: items.length });
});

// GET /api/v1/patient/me/documents — statements, receipts, passes, promissory notes
patientApp.get('/me/documents', requireAuth, async (c) => {
  const resolved = await requireLinkedPatient(c);
  if ('error' in resolved) return resolved.error;
  const encRows = await getPatientEncounters(resolved.patient.id, resolved.user.facilityId);
  const items: any[] = [];
  for (const row of encRows) {
    const statementNumber = row.billNumber || `SOA-SJMC-26-${row.encounterNumber.replace(/\D/g, '')}`;
    items.push({
      kind: 'STATEMENT',
      id: statementNumber,
      title: `Statement of Account — ${row.encounterNumber}`,
      encounterNumber: row.encounterNumber,
      url: `/api/v1/patient/me/encounters/${row.id}`
    });
    const receiptRows = await db.select().from(paymentReceipts).where(eq(paymentReceipts.encounterId, row.id));
    for (const r of receiptRows) {
      items.push({
        kind: 'RECEIPT',
        id: r.officialReceiptNumber,
        title: `Official Receipt ${r.officialReceiptNumber}`,
        encounterNumber: row.encounterNumber,
        amount: Number(r.amount),
        issuedAt: r.issuedAt.toISOString(),
        url: `/api/v1/patient/me/receipts/${r.id}`
      });
    }
    const passRows = await db.select().from(dischargePasses).where(eq(dischargePasses.encounterId, row.id));
    for (const p of passRows) {
      items.push({
        kind: 'GATE_PASS',
        id: p.passNumber,
        title: `Discharge Pass ${p.passNumber}`,
        encounterNumber: row.encounterNumber,
        status: p.status,
        issuedAt: p.issuedAt.toISOString()
      });
    }
    const noteRows = await db.select().from(promissoryNotes).where(eq(promissoryNotes.encounterId, row.id));
    for (const n of noteRows) {
      items.push({
        kind: 'PROMISSORY_NOTE',
        id: n.noteNumber,
        title: `Promissory Note ${n.noteNumber}`,
        encounterNumber: row.encounterNumber,
        principalAmount: Number(n.principalAmount),
        installmentMonths: n.installmentMonths,
        status: n.status
      });
    }
  }
  return c.json({ items, total: items.length, uploadSupported: false });
});

// GET /api/v1/patient/me/promissory-notes — own RA 9439 plans with schedules
patientApp.get('/me/promissory-notes', requireAuth, async (c) => {
  const resolved = await requireLinkedPatient(c);
  if ('error' in resolved) return resolved.error;
  const encRows = await getPatientEncounters(resolved.patient.id, resolved.user.facilityId);
  const items = [];
  for (const row of encRows) {
    const noteRows = await db
      .select()
      .from(promissoryNotes)
      .where(eq(promissoryNotes.encounterId, row.id))
      .orderBy(desc(promissoryNotes.createdAt));
    for (const n of noteRows) {
      items.push({
        id: n.id,
        noteNumber: n.noteNumber,
        encounterNumber: row.encounterNumber,
        borrowerName: n.borrowerName,
        principalAmount: Number(n.principalAmount),
        interestRate: Number(n.interestRate),
        financingFee: Number(n.financingFee),
        totalRepayment: Number(n.totalRepayment),
        installmentMonths: n.installmentMonths,
        monthlyInstallment: Number(n.monthlyInstallment),
        firstDueDate: n.firstDueDate.toISOString().slice(0, 10),
        status: n.status,
        schedule: n.scheduleJson,
        executedAt: n.digitalSignatureTimestamp.toISOString()
      });
    }
  }
  items.sort((a, b) => (a.executedAt < b.executedAt ? 1 : -1));
  return c.json({ items, total: items.length });
});

// GET /api/v1/patient/me/notifications — derived from own encounter timeline
// Stateless feed: the app tracks read state locally. Push delivery is not
// yet wired; this endpoint is the abstraction the app polls.
patientApp.get('/me/notifications', requireAuth, async (c) => {
  const resolved = await requireLinkedPatient(c);
  if ('error' in resolved) return resolved.error;
  const encRows = await getPatientEncounters(resolved.patient.id, resolved.user.facilityId);
  const items = [];
  for (const row of encRows) {
    const events = await db
      .select()
      .from(encounterTimelineEvents)
      .where(eq(encounterTimelineEvents.encounterId, row.id))
      .orderBy(desc(encounterTimelineEvents.eventTimestamp));
    for (const e of events.slice(0, 20)) {
      items.push({
        id: e.id,
        encounterNumber: row.encounterNumber,
        title: e.title,
        message: e.description,
        category: e.eventType,
        timestamp: e.eventTimestamp.toISOString()
      });
    }
  }
  items.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
  return c.json({ items: items.slice(0, 50), total: Math.min(items.length, 50), pushSupported: false });
});

export default patientApp;
