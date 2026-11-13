import { requestBridgeInput } from './BridgeInputDialog';
/** Adapts the original dashboard's contracts to the authoritative v2 API. Money crosses this boundary in centavos. */
import { api, ApiRequestError } from '../../lib/api';
import type { Bed, EncounterDetail, EncounterRow, Page, StaffMe } from '../../lib/types';
import type { StaffNotification } from '../shared/notifications';
import type { SmsDispatchResult, SmsTemplateType } from '../shared/sms';
import type { Encounter } from '../types/domain';
const pesos = (n: number | null | undefined) => (n ?? 0) / 100;
export const centavos = (n: unknown) => Math.round(Number(n) * 100);
const unavailable = (feature: string): never => {
  throw new ApiRequestError(503, 'UNAVAILABLE', `${feature} is not available yet.`);
};
const details = new Map<string, { at: number; value: EncounterDetail }>();
/** Census row fingerprint at the time each cached chart was read; a change means the chart is stale. */
const rowPrints = new Map<string, string>();
/** Encounter number -> id, so notification links (which carry numbers) open the right chart. */
const encounterIds = new Map<string, string>();
let censusPending: Promise<Encounter[]> | undefined;
let generation = 0;
let openEncounterId: string | null = null;
/** Charts unchanged in the census list are still re-read after this long, a few per poll. */
export const DETAIL_MAX_AGE_MS = 5 * 60_000;
const STALE_REFRESH_PER_POLL = 3;
export function clearBridgeCache() {
  generation++;
  details.clear();
  rowPrints.clear();
  encounterIds.clear();
  censusPending = undefined;
}
/**
 * Forget cached charts so the next read is fresh, without touching the session generation.
 * (Bumping the generation makes in-flight reads fail as SESSION_CHANGED, which signs the user out.)
 */
export function invalidateBridgeData() {
  details.clear();
  rowPrints.clear();
}
/** The chart the user has open is re-read on every census poll so it never looks stale. */
export function setOpenEncounter(id: string | null) {
  openEncounterId = id || null;
}
function remember(value: EncounterDetail) {
  encounterIds.set(value.encounter.encounterNumber, value.encounter.id);
}
async function fetchDetail(id: string, background = false): Promise<EncounterDetail> {
  const scope = generation;
  // Background census refreshes are flagged so the API does not log every poll as a fresh record view.
  const value = await api<EncounterDetail>(
    `/v1/staff/encounters/${encodeURIComponent(id)}${background ? '?refresh=background' : ''}`,
  );
  if (scope !== generation) throw new ApiRequestError(401, 'SESSION_CHANGED', 'Your session changed.');
  details.set(id, { at: Date.now(), value });
  remember(value);
  return value;
}
async function detail(id: string, force = false): Promise<EncounterDetail> {
  const cached = details.get(id);
  if (!force && cached && Date.now() - cached.at < 5000) return cached.value;
  return fetchDetail(id);
}
const category: Record<string, string> = { ROOM_AND_BOARD: 'ROOM_BOARD', SUPPLIES: 'CENTRAL_SUPPLIES' };
const DAY_MS = 86_400_000;
/**
 * The dashboard's claim states (CLEAN/TRANSMITTED/APPROVED/RETURNED) from the API's lifecycle states
 * (DRAFT/READY/TRANSMITTED/RETURNED/PAID). A draft claim is ready for transmission once its bill is final,
 * because the server can then produce the eSOA; before that it stays DRAFT.
 */
export function mapClaimStatus(status: string | undefined, billState: string): string {
  switch (status) {
    case undefined:
      return 'PENDING';
    case 'TRANSMITTED':
      return 'TRANSMITTED';
    case 'PAID':
      return 'APPROVED';
    case 'RETURNED':
      return 'RETURNED';
    case 'READY':
      return 'CLEAN';
    case 'DRAFT':
      return billState === 'DRAFT' ? 'DRAFT' : 'CLEAN';
    default:
      return status;
  }
}
export function mapEncounter(d: EncounterDetail): Encounter {
  const e = d.encounter,
    p = d.patient,
    l = d.ledger;
  const active = d.charges.filter((c) => !c.removedAt);
  const coveredGrossCents = active
    .filter((c) => c.coverage === 'COVERED')
    .reduce((sum, c) => sum + c.grossCents, 0);
  const totalPhilhealthCents = l?.philhealthCents ?? 0;
  const totalHmoCents = l?.hmoCents ?? 0;
  const totalStatCents = (l?.vatExemptionCents ?? 0) + (l?.seniorPwdDiscountCents ?? 0);

  const items = active.map((c) => {
    const share = c.coverage === 'COVERED' && coveredGrossCents > 0 ? c.grossCents / coveredGrossCents : 0;
    const phCents = c.coverage === 'COVERED' ? Math.round(totalPhilhealthCents * share) : 0;
    const hmoCents = c.coverage === 'COVERED' ? Math.round(totalHmoCents * share) : 0;
    const statCents = c.coverage === 'COVERED' ? Math.round(totalStatCents * share) : 0;
    const oopCents =
      c.coverage === 'WAIVED'
        ? 0
        : c.coverage === 'EXCLUDED'
          ? c.grossCents
          : Math.max(0, c.grossCents - phCents - hmoCents - statCents);

    return {
      id: c.id,
      code: c.code,
      description: c.description,
      category: category[c.category] ?? c.category,
      qty: c.quantity,
      unitPrice: pesos(c.unitPriceCents),
      grossAmount: pesos(c.grossCents),
      isVatable: c.category !== 'PROFESSIONAL_FEE',
      allocationAvailable: true,
      philhealthCovered: pesos(phCents),
      hmoCovered: pesos(hmoCents),
      patientOop: pesos(oopCents),
      status:
        c.coverage === 'WAIVED'
          ? 'WAIVED'
          : c.isDisputed
            ? 'CONTESTED'
            : c.coverage === 'EXCLUDED'
              ? 'DISALLOWED_SUNDRY'
              : 'COVERED',
      plainLanguageExplainer: c.explainer ?? '',
      isDisputed: c.isDisputed,
      exclusionReasonClause:
        c.coverage === 'EXCLUDED'
          ? 'Excluded charge. See the bill-wide deductions and patient responsibility.'
          : undefined,
    };
  });
  const pf = d.philhealth;
  const ph = {
    id: pf?.id ?? e.id,
    primaryIcd10: e.icd10Code,
    primaryDescription: e.primaryDiagnosis,
    caseRateCode: pf?.caseRateCode || e.icd10Code,
    totalCaseRate: pesos((pf?.hciCents ?? 0) + (pf?.pfCents ?? 0)) || pesos(l?.philhealthCents),
    hciAmount: pesos(pf?.hciCents),
    pfAmount: pesos(pf?.pfCents),
    isNbb: false,
    rthRiskScore:
      pf?.rthRiskScore !== undefined && pf.rthRiskScore !== null
        ? Number(pf.rthRiskScore)
        : pf?.status === 'RETURNED'
          ? 0.42
          : e.pfSignedAt
            ? 0.04
            : 0.12,
    // CF4 checks come from the latest AI pre-flight audit of this claim; never-audited claims stay
    // neutral (not flagged) because MedCore holds no CF4 clinical record of its own.
    cf4VitalsRecorded: pf?.cf4VitalsRecorded ?? true,
    cf4CourseInWardRecorded: pf?.cf4CourseInWardRecorded ?? true,
    cf4LabsConsistent: pf?.cf4LabsConsistent ?? true,
    // The server builds the eSOA XML only from a finalized bill.
    eSoaXmlConformity: !!pf && e.billState !== 'DRAFT',
    status: mapClaimStatus(pf?.status, e.billState),
    // Days since discharge clearance for claims not yet sent to PhilHealth (60-day filing window).
    claimAgingDays:
      pf && e.clearedAt && pf.status !== 'TRANSMITTED' && pf.status !== 'PAID'
        ? Math.max(0, Math.floor((Date.now() - Date.parse(e.clearedAt)) / DAY_MS))
        : 0,
  };
  const h = d.hmo;
  const note = d.promissoryNotes.find((n) => n.status === 'ACTIVE') ?? d.promissoryNotes[0];
  const pass = d.gatePasses.find((g) => g.status === 'ACTIVE') ?? d.gatePasses[0];
  const row: unknown = {
    id: e.id,
    encounterNumber: e.encounterNumber,
    patient: {
      id: p.id,
      mrn: p.mrn,
      maskedName: p.fullName,
      fullName: p.fullName,
      philhealthPin: p.philhealthPinLast4 ? `•••• ${p.philhealthPinLast4}` : 'Not provided',
      isSeniorCitizen: p.discountKind === 'SENIOR',
      isPwd: p.discountKind === 'PWD',
      age: Math.max(0, Math.floor((Date.now() - Date.parse(p.dateOfBirth)) / 31557600000)),
      gender: p.sex,
      contactNumber: p.contactPhoneLast4 ? `•••• ${p.contactPhoneLast4}` : 'Not provided',
    },
    roomBed: e.bedCode,
    bedNumber: e.bedCode,
    roomCategory: e.roomCategory,
    dailyRoomRate: pesos(active.find((c) => c.category === 'ROOM_AND_BOARD')?.unitPriceCents),
    dailyRoomAllowance: 0,
    admissionDate: e.admittedAt,
    mghOrderTimestamp: e.mghOrderedAt ?? '',
    attendingDoctor: d.physician?.fullName ?? 'Not assigned',
    doctorPan: '',
    attendingDoctorObj: {
      id: d.physician?.id,
      name: d.physician?.fullName ?? '',
      prcLicense: d.physician?.prcLicense ?? '',
      specialization: '',
      contactNumber: '',
      declaredFee: pesos(e.agreedPfCents ?? l?.grossProfessionalFeeCents),
      accreditedScheduleAvailable: e.pfCeilingCents !== null,
      accreditedScheduleRate: pesos(e.pfCeilingCents),
      status: e.pfSignedAt ? 'SIGNED' : 'PENDING',
    },
    doctorAgreedFee: pesos(e.agreedPfCents ?? l?.grossProfessionalFeeCents),
    doctorExcessPf: pesos(e.doctorExcessPfCents),
    doctorSignedAt: e.pfSignedAt,
    pharmacyRtsCleared: !!e.pharmacyClearedAt,
    unreturnedMedsCount: 0,
    stage: e.stage === 'CLEARED' ? 'CLEARED_GATE_PASS' : e.stage,
    elapsedMinutes: e.sla.elapsedMinutes ?? 0,
    elapsedMinutesInStage: Math.max(0, Math.floor((Date.now() - Date.parse(e.stageEnteredAt)) / 60000)),
    slaStatus: e.sla.status === 'ON_TRACK' || !e.sla.status ? 'NORMAL' : e.sla.status,
    primaryDiagnosis: e.primaryDiagnosis,
    primaryIcd10: e.icd10Code,
    hmo: {
      providerName: h?.providerName ?? 'None',
      cardMasked: h ? `•••• ${h.memberNumberLast4}` : '',
      policyMbl: pesos(h?.mblCents),
      mblRemaining: h ? pesos(h.mblCents - h.approvedCents) : 0,
      dailyRoomAllowance: 0,
      initialLoaApproved: !!h && h.loaStatus === 'APPROVED',
      finalLoaStatus: h?.loaStatus === 'PENDING' ? 'AWAITING_CODE' : (h?.loaStatus ?? 'UNAVAILABLE'),
      approvedAmount: pesos(h?.approvedCents),
      approvalCode: h?.approvalCode ?? '',
      loaNumber: h?.approvalCode ?? '',
      // Charges the payer does not cover (excluded lines) are the HMO-disallowed items a coordinator may appeal.
      disallowedConsumables: h
        ? pesos(active.filter((c) => c.coverage === 'EXCLUDED').reduce((sum, c) => sum + c.grossCents, 0))
        : 0,
    },
    philhealth: ph,
    philHealth: ph,
    items,
    chargemasterItems: items,
    waterfall: {
      grossHospitalCharges: pesos(l?.grossHospitalCents),
      grossDoctorFee: pesos(l?.grossProfessionalFeeCents),
      grossTotal: pesos(l?.grossCents),
      vatExemption: pesos(l?.vatExemptionCents),
      seniorPwdDiscount: pesos(l?.seniorPwdDiscountCents),
      netVatDiscountedBase: pesos(
        (l?.grossCents ?? 0) - (l?.vatExemptionCents ?? 0) - (l?.seniorPwdDiscountCents ?? 0),
      ),
      philhealthHci: pesos(pf?.hciCents),
      philhealthPf: pesos(pf?.pfCents),
      philhealthTotal: pesos(l?.philhealthCents),
      hmoApprovedAmount: pesos(l?.hmoCents),
      netPatientDue: pesos(l?.netPatientDueCents),
      roomUpgradeExcess: pesos(e.roomUpgradeExcessCents),
      excludedConsumables: pesos(l?.nonCoveredCents),
      doctorExcessPf: pesos(e.doctorExcessPfCents),
      patientPaid: pesos(l?.paidCents),
    },
    dischargePass: pass
      ? {
          passNumber: pass.passNumber,
          encounterId: e.id,
          patientName: p.fullName,
          roomBed: e.bedCode,
          settledAmount: pesos((l?.paidCents ?? 0) + (l?.financedCents ?? 0)),
          settlementChannel: note ? 'PROMISSORY_NOTE' : d.payments.at(-1)?.rail,
          issuedAt: pass.issuedAt,
          verifiedAt: pass.usedAt ?? undefined,
          status:
            pass.status === 'USED'
              ? 'VERIFIED_AT_LOBBY'
              : pass.status === 'ACTIVE' && Date.parse(pass.expiresAt) > Date.now()
                ? 'ACTIVE_READY_FOR_EXIT'
                : 'EXPIRED',
          hmacSignature: '',
          qrPayload: pass.passNumber,
        }
      : undefined,
    promissoryNote: note
      ? {
          id: note.id,
          encounterId: e.id,
          borrowerName: note.borrowerName,
          borrowerRelationship: note.relationship === 'SELF' ? 'PATIENT' : note.relationship,
          borrowerIdType: note.idType === 'PHILSYS' ? 'PHILSYS_NATIONAL_ID' : note.idType,
          borrowerIdNumber: `•••• ${note.idLast4}`,
          principalAmount: pesos(note.principalCents),
          installmentMonths: note.months,
          monthlyInstallment: pesos(note.schedule[0]?.amountCents),
          firstDueDate: note.schedule[0]?.dueDate ?? '',
          digitalSignatureTimestamp: note.signedAt,
          status: note.status,
        }
      : undefined,
    disputes: d.disputes.map((x) => ({
      id: x.id,
      encounterId: e.id,
      itemId: x.chargeId,
      itemDescription: active.find((c) => c.id === x.chargeId)?.description ?? 'Charge',
      contestedAmount: pesos(x.contestedCents),
      reason: x.reason,
      status: x.status === 'WAIVED' ? 'SUPERVISOR_WAIVED' : x.status,
      createdAt: x.createdAt,
      supervisorNotes: x.resolutionNote ?? undefined,
      resolutionClause: x.resolutionNote ?? undefined,
    })),
    timeline: d.timeline.map((t) => ({
      id: t.id,
      timestamp: t.createdAt,
      timeDisplay: new Date(t.createdAt).toLocaleTimeString('en-PH'),
      title: t.title,
      description: t.detail ?? '',
      actor: t.actorLabel,
      type: t.kind,
      status: 'COMPLETED',
    })),
    billState: e.billState === 'SENT' ? 'SENT_TO_PATIENT' : e.billState === 'SETTLED' ? 'PAID' : e.billState,
    billNumber: e.billNumber ?? undefined,
    amountPaid: pesos(l?.paidCents),
    remainingBalance: pesos(l?.balanceCents),
    billFinalizedAt: e.billFinalizedAt ?? undefined,
    billSentAt: e.billSentAt ?? undefined,
    paymentHistory: d.payments.map((x) => mapPayment(x, d)),
    receipts: d.payments.map((x) => mapReceipt(x, d)),
  };
  return row as Encounter;
}
function mapPayment(p: EncounterDetail['payments'][number], d: EncounterDetail) {
  return {
    id: p.id,
    paymentId: p.reference,
    timestamp: p.createdAt,
    encounterId: d.encounter.id,
    billId: d.encounter.billNumber,
    currency: 'PHP',
    channelReference: p.reference,
    paymentReference: p.reference,
    statementNumber: d.encounter.billNumber,
    amount: pesos(p.amountCents),
    paymentRail: p.rail,
    status: 'SUCCESS',
    officialReceiptNumber: p.officialReceiptNumber,
    payerName: p.payerName,
    createdAt: p.createdAt,
    settledAt: p.createdAt,
    isSimulatedDemo: p.isSimulated,
  };
}
function mapReceipt(p: EncounterDetail['payments'][number], d: EncounterDetail) {
  return {
    ...mapPayment(p, d),
    receiptNumber: p.officialReceiptNumber,
    paymentMethod: p.rail,
    date: p.createdAt,
    referenceNumber: p.reference,
    patientName: d.patient.fullName,
    encounterNumber: d.encounter.encounterNumber,
    billReference: d.encounter.billNumber,
    currency: 'PHP',
    issuedAt: p.createdAt,
  };
}
function rowPrint(r: EncounterRow): string {
  return JSON.stringify([
    r.stage,
    r.billState,
    r.bedCode,
    r.patientName,
    r.physicianName,
    r.mghOrderedAt,
    r.clearedAt,
    r.voidedAt,
    r.grossCents,
    r.netPatientDueCents,
    r.balanceCents,
    r.openDisputes,
  ]);
}
/** The list row carries the live SLA clock, so a cached chart still shows current elapsed time. */
function withRowSla(d: EncounterDetail, r: EncounterRow): EncounterDetail {
  return r.sla ? { ...d, encounter: { ...d.encounter, sla: r.sla } } : d;
}
/**
 * One list request per poll. Charts are re-read only when their list row changed, when the user has
 * them open, or (a few at a time) when they are older than DETAIL_MAX_AGE_MS.
 */
type ServerNotification = {
  id: string;
  encounterId: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  timestamp: string;
};
const NOTIFICATION_TYPES: Record<string, [StaffNotification['type'], StaffNotification['severity']]> = {
  PAYMENT_RECEIVED: ['PAYMENT', 'SUCCESS'],
  PAYMENT: ['PAYMENT', 'SUCCESS'],
  GATE_PASS_ISSUED: ['GATE_PASS', 'SUCCESS'],
  DISPUTE_FILED: ['DISPUTE', 'WARNING'],
  DISPUTE: ['DISPUTE', 'WARNING'],
  DISPUTE_RESOLVED: ['DISPUTE', 'INFO'],
  WAIVE: ['DISPUTE', 'INFO'],
  PAYER: ['HMO', 'INFO'],
  HMO: ['HMO', 'INFO'],
};
/** Server feed types (PAYMENT_RECEIVED, DISCHARGE, PAYER, ...) onto the bell's five categories. */
export function mapNotification(n: ServerNotification): StaffNotification {
  const [type, severity] = NOTIFICATION_TYPES[n.type] ?? ['STAGE', 'INFO'];
  return {
    id: n.id,
    type,
    severity,
    title: n.title,
    message: n.message,
    // The feed names stays by encounter number; the dashboard selects charts by id.
    encounterId: encounterIds.get(n.encounterId) ?? n.encounterId,
    timestamp: n.timestamp,
    read: n.read,
  };
}
/** Sandbox SMS wording (no links, PINs or clinical codes). The API logs this exact text. */
export function smsBody(template: SmsTemplateType, d: EncounterDetail): string {
  const patient = d.patient.fullName;
  const room = d.encounter.bedCode;
  const ref = d.encounter.encounterNumber;
  switch (template) {
    case 'DOCTOR_PF_NUDGE':
      return `MEDCORE ALERT: Dr. ${(d.physician?.fullName ?? 'Attending Physician').replace(/^Dr\.?\s+/i, '')}, please confirm your Professional Fee for patient ${patient} (${room}, Ref: ${ref}) to proceed with discharge clearance.`;
    case 'INTAKE_ORIENTATION':
      return `MEDCORE INTAKE: Good day ${patient}. Your admission record for ${room} (Ref: ${ref}) is recorded. Please prepare your PhilHealth and valid IDs and contact the hospital billing desk.`;
    default:
      return `MEDCORE NOTICE: Good day ${patient}. Your hospital billing summary for ${room} (Ref: ${ref}) is updated with recorded PhilHealth and statutory deductions. Please review it in the MedCore app or visit the hospital billing cashier.`;
  }
}
/** The sandbox SMS the dashboard previews, built from the notification the API just recorded. */
export function smsDispatch(
  template: SmsTemplateType,
  d: EncounterDetail,
  message: string,
): SmsDispatchResult {
  const logged =
    d.timeline.find((t) => t.kind === 'NOTIFICATION' && t.detail === message) ??
    d.timeline.find((t) => t.kind === 'NOTIFICATION');
  const doctor = template === 'DOCTOR_PF_NUDGE';
  return {
    success: true,
    messageId: `SMS-SIM-${(logged?.id ?? d.encounter.id).replace(/-/g, '').slice(0, 6).toUpperCase()}`,
    simulated: true,
    isSimulated: true,
    recipientName: doctor ? (d.physician?.fullName ?? 'Attending Physician') : d.patient.fullName,
    recipientPhone: doctor
      ? 'Hospital directory'
      : d.patient.contactPhoneLast4
        ? `•••• ${d.patient.contactPhoneLast4}`
        : 'Not on file',
    messageBody: logged?.detail ?? message,
    timestamp: logged?.createdAt ?? new Date().toISOString(),
    provider: 'SIMULATOR',
    deliveryStatus: 'SIMULATED',
    templateType: template,
  };
}
async function census() {
  if (censusPending) return censusPending;
  censusPending = (async () => {
    const rows: EncounterRow[] = [];
    for (let page = 1; ; page++) {
      const r = await api<Page<EncounterRow>>(`/v1/staff/encounters?page=${page}&pageSize=100`);
      rows.push(...r.items);
      if (r.items.length < 100) break;
    }
    const now = Date.now();
    const live = new Set(rows.map((r) => r.id));
    for (const id of [...details.keys()]) if (!live.has(id)) details.delete(id);
    for (const id of [...rowPrints.keys()]) if (!live.has(id)) rowPrints.delete(id);
    for (const r of rows) encounterIds.set(r.encounterNumber, r.id);
    const due = new Set<string>();
    const stale: { id: string; at: number }[] = [];
    const values = new Map<string, EncounterDetail>();
    for (const r of rows) {
      const cached = details.get(r.id);
      if (cached) values.set(r.id, cached.value);
      const changed = rowPrints.get(r.id) !== rowPrint(r);
      if (!cached || r.id === openEncounterId) due.add(r.id);
      else if (changed && now - cached.at >= 5000) due.add(r.id);
      else if (changed) rowPrints.set(r.id, rowPrint(r));
      else if (now - cached.at > DETAIL_MAX_AGE_MS) stale.push({ id: r.id, at: cached.at });
    }
    stale.sort((a, b) => a.at - b.at);
    for (const s of stale.slice(0, STALE_REFRESH_PER_POLL)) due.add(s.id);
    const ids = rows.filter((r) => due.has(r.id));
    // Bound parallel reads.
    for (let i = 0; i < ids.length; i += 6)
      await Promise.all(
        ids.slice(i, i + 6).map(async (r) => {
          values.set(r.id, await fetchDetail(r.id, true));
          rowPrints.set(r.id, rowPrint(r));
        }),
      );
    return rows.map((r) => mapEncounter(withRowSla(values.get(r.id)!, r)));
  })();
  try {
    return await censusPending;
  } finally {
    censusPending = undefined;
  }
}
function bodyOf(options: RequestInit): any {
  return typeof options.body === 'string' ? JSON.parse(options.body) : {};
}
async function promptRequired(message: string, min = 1) {
  const value = (await requestBridgeInput(message, min))?.trim();
  if (!value || value.length < min)
    throw new ApiRequestError(422, 'INPUT_REQUIRED', `Enter at least ${min} characters. Action cancelled.`);
  return value;
}
async function mutated(id: string, path: string, body?: unknown) {
  const d = await api<EncounterDetail>(`/v1/staff/encounters/${id}/${path}`, { method: 'POST', body });
  details.delete(id);
  return { success: true, encounter: mapEncounter(d) };
}
export async function bridge(endpoint: string, options: RequestInit = {}) {
  const url = new URL(endpoint, 'http://medcore.local');
  const path = url.pathname;
  const method = (options.method ?? 'GET').toUpperCase();
  const b = bodyOf(options);
  if (path === '/auth/me') {
    const me = await api<StaffMe>('/v1/auth/staff/me');
    return {
      authenticated: true,
      user: {
        ...me.user,
        username: me.user.email,
        facilityId: me.facility.id,
        facilityCode: me.facility.code,
        facilityName: me.facility.name,
        avatar: '',
        prcLicenseNumber: null,
        philhealthPan: null,
        permissions: me.permissions,
      },
    };
  }
  if (path === '/auth/logout') {
    try {
      return await api('/v1/auth/staff/logout', { method: 'POST', body: {} });
    } finally {
      clearBridgeCache();
    }
  }
  if (path.startsWith('/auth/')) return unavailable('Legacy staff sign-in and role switching');
  if (path.startsWith('/ai/')) {
    return api(`/v1/staff${path}`, {
      method: 'POST',
      body: b,
      ...(options.signal ? { signal: options.signal } : {}),
    });
  }
  if (path === '/notifications' && method === 'GET') {
    const r = await api<{ items: ServerNotification[] }>('/v1/staff/notifications');
    const notifications = r.items.map(mapNotification);
    return {
      notifications,
      unreadCount: notifications.filter((n) => !n.read).length,
      available: true,
    };
  }
  if (path === '/notifications/mark-read' && method === 'POST') {
    await api('/v1/staff/notifications/mark-read', { method: 'POST', body: b });
    return { success: true };
  }
  if (path === '/notifications/sms-outbox' && method === 'GET') {
    const r = await api<{ items: unknown[] }>('/v1/staff/notifications/sms-outbox');
    return { items: r.items, messages: r.items };
  }
  if (path.startsWith('/notifications')) return unavailable('Staff notifications');
  if (path === '/analytics/rcm-metrics') {
    const summary = await api<Record<string, unknown>>('/v1/staff/analytics/summary');
    return { data: summary, ...summary };
  }
  if (path === '/facility' && method === 'GET') {
    return api('/v1/staff/facility');
  }
  if (path === '/facility' && method === 'PUT') {
    return api('/v1/staff/facility', { method: 'PUT', body: b });
  }
  const installment = path.match(/^\/promissory-notes\/([^/]+)\/installments\/([^/]+)\/pay$/);
  if (installment) {
    const r = await api<{ promissoryNote: { encounterId?: string } }>(
      `/v1/staff/promissory-notes/${installment[1]}/installments/${installment[2]}/pay`,
      { method: 'POST', body: {} },
    );
    invalidateBridgeData();
    return { success: true, ...r };
  }
  if (path === '/encounters/physicians') {
    const r = await api<{ items: { id: string; fullName: string }[] }>('/v1/staff/directory/physicians');
    return { items: r.items.map((x) => ({ ...x, name: x.fullName })) };
  }
  if (path === '/encounters' && method === 'GET') {
    let items = await census();
    const q = url.searchParams.get('search')?.toLowerCase();
    if (q)
      items = items.filter((x) =>
        `${x.patient.fullName} ${x.patient.mrn} ${x.encounterNumber}`.toLowerCase().includes(q),
      );
    return { items, total: items.length };
  }
  if (path === '/encounters' && method === 'POST') {
    const d = await api<EncounterDetail>('/v1/staff/encounters', {
      method: 'POST',
      body: {
        patientId: b.patientId,
        bedId: b.bedId,
        attendingPhysicianId: b.attendingPhysicianId,
        primaryDiagnosis: b.primaryDiagnosis,
        icd10Code: b.icd10Code,
      },
    });
    details.clear();
    return { success: true, encounter: mapEncounter(d) };
  }
  if (path === '/beds' && method === 'GET') {
    const r = await api<{ items: Bed[] }>('/v1/staff/beds');
    return {
      items: r.items.map((x) => ({
        ...x,
        bedNumber: x.code,
        dailyRate: pesos(x.dailyRateCents),
        currentEncounterId: x.encounterId,
      })),
      summary: { total: r.items.length, occupied: r.items.filter((x) => x.status === 'OCCUPIED').length },
    };
  }
  const bed = path.match(/^\/beds\/([^/]+)\/status$/);
  if (bed) {
    if (!['AVAILABLE', 'HOUSEKEEPING', 'MAINTENANCE'].includes(b.status))
      return unavailable('This bed status change');
    await api(`/v1/staff/beds/${bed[1]}`, { method: 'PATCH', body: { status: b.status } });
    const response = (await bridge('/beds')) as { items: unknown[] };
    return { success: true, bed: response.items.find((item: any) => item.id === bed[1]) };
  }
  if (path === '/discharge/passes/verify') {
    const r = await api<any>('/v1/staff/gate-passes/verify', {
      method: 'POST',
      body: { passNumber: b.passNumber, pin: b.exitPin },
    });
    details.clear();
    return { ...r, verified: r.result === 'VERIFIED', status: 'VERIFIED_AT_LOBBY' };
  }
  const resolve = path.match(/^\/disputes\/([^/]+)\/supervisory-waive$/);
  if (resolve) {
    const r = await api<{ encounterId: string }>(`/v1/staff/disputes/${resolve[1]}/resolve`, {
      method: 'POST',
      body: { decision: 'WAIVE', note: b.supervisorNotes ?? b.notes },
    });
    return { success: true, encounter: mapEncounter(await detail(r.encounterId, true)) };
  }
  const transmit = path.match(/^\/claims\/([^/]+)\/mark-transmitted$/);
  if (transmit && method === 'POST') {
    await api(`/v1/staff/claims/${encodeURIComponent(transmit[1])}/mark-transmitted`, { method: 'POST' });
    for (const [id, cached] of details) if (cached.value.philhealth?.id === transmit[1]) details.delete(id);
    return { success: true };
  }
  const xml = path.match(/^\/claims\/([^/]+)\/esoa-xml$/);
  if (xml) {
    const list = await census();
    const e = list.find((e) => e.philhealth.id === xml[1] || e.id === xml[1]);
    if (!e) throw new ApiRequestError(404, 'NOT_FOUND', 'Claim not found.');
    return api(`/v1/staff/encounters/${e.id}/esoa.xml`, { responseType: 'text' });
  }
  const charge = path.match(/^\/charges\/([^/]+)$/);
  if (charge) {
    const list = await census();
    const e = list.find((e) => e.items.some((c) => c.id === charge[1]));
    if (!e) throw new ApiRequestError(404, 'NOT_FOUND', 'Charge not found.');
    if (method === 'PATCH' || method === 'PUT') {
      const existing = e.items.find((c) => c.id === charge[1])!;
      const cat = b.category ?? existing.category;
      const base = `/v1/staff/encounters/${e.id}/charges`;
      // There is no in-place edit: post the corrected line first, then retire the old one. If retiring
      // fails, the new line is removed again, so a failed edit never loses or double-counts a charge.
      const added = await api<EncounterDetail>(base, {
        method: 'POST',
        body: {
          code: b.code ?? existing.code,
          description: b.description ?? existing.description,
          category: cat === 'ROOM_BOARD' ? 'ROOM_AND_BOARD' : cat === 'CENTRAL_SUPPLIES' ? 'SUPPLIES' : cat,
          quantity: Number(b.qty ?? b.quantity ?? existing.qty),
          unitPriceCents: centavos(b.unitPrice ?? existing.unitPrice),
          coverage:
            b.coverageType === 'PATIENT_DIRECT' ||
            b.status === 'DISALLOWED_SUNDRY' ||
            (!b.coverageType && !b.status && existing.status === 'DISALLOWED_SUNDRY')
              ? 'EXCLUDED'
              : 'COVERED',
          ...((b.plainLanguageExplainer ?? existing.plainLanguageExplainer)
            ? { explainer: b.plainLanguageExplainer ?? existing.plainLanguageExplainer }
            : {}),
        },
      });
      details.delete(e.id);
      const before = new Set(e.items.map((c) => c.id));
      const newIds = added.charges.filter((c) => !c.removedAt && !before.has(c.id)).map((c) => c.id);
      try {
        const d = await api<EncounterDetail>(`${base}/${charge[1]}/remove`, {
          method: 'POST',
          body: { reason: 'Charge line updated by staff' },
        });
        details.delete(e.id);
        return { success: true, encounter: mapEncounter(d) };
      } catch (error) {
        for (const id of newIds)
          await api(`${base}/${id}/remove`, {
            method: 'POST',
            body: { reason: 'Reverted a charge update that could not be completed' },
          }).catch(() => undefined);
        details.delete(e.id);
        throw error;
      }
    }
    if (method !== 'DELETE') return unavailable('Charge editing');
    return mutated(e.id, `charges/${charge[1]}/remove`, {
      reason: await promptRequired('Reason for removing this charge (at least 5 characters)', 5),
    });
  }
  const match = path.match(/^\/encounters\/([^/]+)(?:\/(.*))?$/);
  if (!match) return unavailable('This feature');
  const id = match[1],
    action = match[2] ?? '';
  if (method === 'GET' && (!action || action === 'ledger')) return mapEncounter(await detail(id));
  if (method === 'GET' && (action === 'statement' || action === 'invoice')) {
    const e = mapEncounter(await detail(id));
    return { encounter: e, waterfall: e.waterfall, items: e.items, patient: e.patient };
  }
  if (!action && (method === 'PATCH' || method === 'PUT')) {
    const d = await api<EncounterDetail>(`/v1/staff/encounters/${id}`, {
      method: 'PATCH',
      body: {
        ...(b.bedId ? { bedId: b.bedId } : {}),
        ...(b.attendingPhysicianId ? { attendingPhysicianId: b.attendingPhysicianId } : {}),
        ...(b.primaryDiagnosis ? { primaryDiagnosis: b.primaryDiagnosis } : {}),
        ...(b.icd10Code || b.primaryIcd10 ? { icd10Code: b.icd10Code ?? b.primaryIcd10 } : {}),
      },
    });
    details.delete(id);
    return { success: true, encounter: mapEncounter(d) };
  }
  if (action === 'gate-pass') {
    const pass = await api<{ passNumber: string; pin: string; issuedAt: string; expiresAt: string }>(
      `/v1/staff/encounters/${id}/gate-pass`,
    );
    const e = mapEncounter(await detail(id, true));
    if (e.dischargePass)
      e.dischargePass = { ...e.dischargePass, exitPin: pass.pin, qrPayload: pass.passNumber };
    return { success: true, encounter: e, dischargePass: e.dischargePass };
  }
  if (action === 'charges')
    return mutated(id, 'charges', {
      code: b.code,
      description: b.description,
      category:
        b.category === 'ROOM_BOARD'
          ? 'ROOM_AND_BOARD'
          : b.category === 'CENTRAL_SUPPLIES'
            ? 'SUPPLIES'
            : b.category,
      quantity: Number(b.qty ?? b.quantity),
      unitPriceCents: centavos(b.unitPrice),
      coverage:
        b.coverageType === 'PATIENT_DIRECT' || b.status === 'DISALLOWED_SUNDRY' ? 'EXCLUDED' : 'COVERED',
      ...(b.plainLanguageExplainer ? { explainer: b.plainLanguageExplainer } : {}),
    });
  if (action === 'doctor/sign') {
    const me = await api<StaffMe>('/v1/auth/staff/me');
    return mutated(id, 'discharge/sign-pf', {
      agreedPfCents: centavos(
        Number(b.agreedFee) > 0
          ? b.agreedFee
          : await promptRequired('Actual agreed professional fee in pesos (must be greater than 0)'),
      ),
      ...(me.user.role === 'HOSPITAL_CFO'
        ? {
            onBehalfReason: await promptRequired(
              'Reason for signing on behalf of the physician (at least 10 characters)',
              10,
            ),
          }
        : {}),
    });
  }
  if (action === 'doctor/accredited-ceiling') {
    const d = await detail(id);
    const updated = await api<EncounterDetail>(`/v1/staff/encounters/${id}/adjustments`, {
      method: 'PUT',
      body: {
        roomUpgradeExcessCents: d.encounter.roomUpgradeExcessCents,
        pfCeilingCents: centavos(await promptRequired('Actual accredited professional-fee ceiling in pesos')),
      },
    });
    details.delete(id);
    return { success: true, encounter: mapEncounter(updated) };
  }
  if (action === 'pharmacy/clear-rts') return mutated(id, 'discharge/clear-pharmacy');
  if (action === 'hmo/final-loa') {
    const amount = await promptRequired('Final approved HMO amount in pesos (0 for rejected)');
    const approvedCents = centavos(amount);
    if (!Number.isSafeInteger(approvedCents) || approvedCents < 0)
      throw new ApiRequestError(422, 'INVALID_AMOUNT', 'Enter a valid approved amount.');
    return mutated(id, 'discharge/final-loa', {
      approvedCents,
      approvalCode: await promptRequired(
        'Actual HMO approval / decision code (4–32 letters, numbers or hyphens)',
        4,
      ),
    });
  }
  if (action === 'advance-stage') {
    const d = await detail(id, true);
    if (d.encounter.stage === 'ADMITTED') return mutated(id, 'discharge/declare-mgh');
    if (d.encounter.stage === 'MGH_DECLARED') return mutated(id, 'discharge/start');
    return unavailable(
      'Automatic advancement. Complete the required doctor, pharmacy, HMO or settlement action',
    );
  }
  if (action === 'finalize-bill') return mutated(id, 'bill/finalize');
  if (action === 'send-bill') return mutated(id, 'bill/send');
  if (action === 'notify-patient-sms' || action === 'nudge-doctor') {
    const template: SmsTemplateType =
      action === 'nudge-doctor'
        ? 'DOCTOR_PF_NUDGE'
        : b.templateType === 'INTAKE_ORIENTATION'
          ? 'INTAKE_ORIENTATION'
          : 'BILL_READY';
    const message = smsBody(template, await detail(id));
    const d = await api<EncounterDetail>(`/v1/staff/encounters/${id}/notify`, {
      method: 'POST',
      body: { kind: template === 'DOCTOR_PF_NUDGE' ? 'DOCTOR_NUDGE' : 'PATIENT_SMS', message },
    });
    details.delete(id);
    const dispatch = smsDispatch(template, d, message);
    return {
      success: true,
      simulated: true,
      messageId: dispatch.messageId,
      dispatch,
      encounter: mapEncounter(d),
    };
  }
  if (action === 'view-bill') {
    return { success: true, encounter: mapEncounter(await detail(id)) };
  }
  if (action === 'payments') {
    const key = new Headers(options.headers).get('Idempotency-Key');
    if (!key)
      throw new ApiRequestError(
        422,
        'IDEMPOTENCY_REQUIRED',
        'Start a payment with a stable idempotency key.',
      );
    const r = await api<{
      detail: EncounterDetail;
      payment: EncounterDetail['payments'][number];
      receipt: { officialReceiptNumber: string };
      replayed: boolean;
    }>(`/v1/staff/encounters/${id}/payments`, {
      method: 'POST',
      idempotencyKey: key,
      body: {
        amountCents: centavos(b.amount),
        rail:
          b.paymentRail === 'CREDIT_DEBIT_CARD' || b.paymentRail === 'CARD' ? 'CARD_TERMINAL' : b.paymentRail,
        payerName: b.payerName,
      },
    });
    details.delete(id);
    const pay = { ...r.payment, officialReceiptNumber: r.receipt.officialReceiptNumber };
    return {
      success: true,
      cached: r.replayed,
      payment: mapPayment(pay, r.detail),
      receipt: mapReceipt(pay, r.detail),
      encounter: mapEncounter(r.detail),
    };
  }
  if (action === 'promissory-notes') {
    if (
      !(await requestBridgeInput(
        'The borrower has reviewed and accepted this repayment schedule. Record the agreement?',
        0,
      ))
    )
      throw new ApiRequestError(422, 'TERMS_REQUIRED', 'Payment plan cancelled.');
    const d = await api<EncounterDetail>(`/v1/staff/encounters/${id}/promissory-notes`, {
      method: 'POST',
      body: {
        borrowerName: b.borrowerName,
        relationship: b.borrowerRelationship === 'PATIENT' ? 'SELF' : (b.borrowerRelationship ?? 'GUARANTOR'),
        idType: b.borrowerIdType === 'PHILSYS_NATIONAL_ID' ? 'PHILSYS' : b.borrowerIdType,
        idNumber: b.borrowerIdNumber,
        months: b.installmentMonths,
        principalCents: centavos(b.principalAmount),
        acceptTerms: true,
      },
    });
    details.delete(id);
    const e = mapEncounter(d);
    return { success: true, encounter: e, promissoryNote: e.promissoryNote, dischargePass: e.dischargePass };
  }
  if (action === 'disputes') {
    await api(`/v1/staff/encounters/${id}/disputes`, {
      method: 'POST',
      body: { chargeId: b.chargeId, category: b.disputeCategory ?? 'OTHER', reason: b.reason },
    });
    return { success: true, encounter: mapEncounter(await detail(id, true)) };
  }
  if (!action && method === 'DELETE') {
    await api(`/v1/staff/encounters/${id}/void`, {
      method: 'POST',
      body: {
        reason: await promptRequired('Reason for voiding this encounter (at least 10 characters)', 10),
      },
    });
    details.delete(id);
    return { success: true, deletedId: id };
  }
  return unavailable('Encounter editing');
}
