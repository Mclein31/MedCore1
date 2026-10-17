/**
 * v1 → v2 bridge.
 *
 * The screens are the original MedCore v1 patient app. They still call the v1 routes
 * (`/patient/me/overview`, `/encounters/:id/payments`, …) through `ApiClient`. This module
 * answers those calls from the hardened v2 API (`/api/v1/auth/patient/*`, `/api/v1/patient/stays/*`)
 * and converts the replies into the v1 shapes in `types/domain.ts`:
 *
 * - v2 money is integer centavos; v1 screens expect pesos, so every amount is divided by 100 here and
 *   multiplied back (rounded to the centavo) on the way out.
 * - Sign-in is the v2 emailed code with `client: "mobile"`; the bearer token stays in SecureStore.
 * - Card payments send brand + last 4 only; v2 rejects anything else.
 * - Features v2 does not have yet (AI, claim tracking, push notifications) answer like the v1 server
 *   did when they were unavailable, so the original screens show their own empty or offline states.
 *
 * Pure functions (`toEncounter`, `toPayInput`, …) are exported for tests.
 */
import type {
  BillItem,
  PatientDocument,
  PatientEncounter,
  PatientNotification,
  PatientOverview,
  PaymentRecord,
  ReceiptRecord,
  SafePatient,
} from '../types/domain';

// ---------- v2 response shapes (apps/api/src/routes/patientPortal.ts, patientAuth.ts) ----------
export interface V2StayRow {
  id: string;
  encounterNumber: string;
  patientName: string;
  admittedAt: string;
  stage: string;
  billState: string;
  clearedAt: string | null;
  billReady: boolean;
  balanceCents: number | null;
  netPatientDueCents: number | null;
}
export interface V2Ledger {
  grossCents: number;
  vatExemptionCents: number;
  seniorPwdDiscountCents: number;
  philhealthCents: number;
  hmoCents: number;
  netPatientDueCents: number;
  paidCents: number;
  financedCents: number;
  balanceCents: number;
  creditCents: number;
}
export interface V2Charge {
  id: string;
  description: string;
  category: string;
  quantity: number;
  unitPriceCents: number;
  grossCents: number;
  coverage: 'COVERED' | 'EXCLUDED' | 'WAIVED';
  explainer: string | null;
  isDisputed: boolean;
}
export interface V2Payment {
  reference: string;
  amountCents: number;
  rail: string;
  createdAt: string;
  officialReceiptNumber: string;
}
export interface V2Note {
  noteNumber: string;
  principalCents: number;
  months: number;
  schedule: { sequence: number; dueDate: string; amountCents: number }[];
  status: string;
  signedAt: string;
}
export interface V2Dispute {
  id: string;
  chargeId: string;
  contestedCents: number;
  reason: string;
  status: 'OPEN' | 'WAIVED' | 'UPHELD';
  resolutionNote: string | null;
  createdAt: string;
  resolvedAt: string | null;
}
export interface V2StayDetail {
  stay: {
    id: string;
    encounterNumber: string;
    patientName: string;
    facilityName: string;
    admittedAt: string;
    stage: string;
    billState: string;
    billNumber: string | null;
    clearedAt: string | null;
    discountKind: 'NONE' | 'SENIOR' | 'PWD';
    billReady: boolean;
    bedCode?: string | null;
    roomCategory?: string | null;
  };
  ledger?: V2Ledger | null;
  charges?: V2Charge[];
  payments?: V2Payment[];
  promissoryNotes?: V2Note[];
  disputes?: V2Dispute[];
  timeline?: { kind: string; title: string; detail: string | null; createdAt: string }[];
  gatePass?: { passNumber: string; pin: string; expiresAt: string } | null;
  philhealth?: {
    id: string;
    claimNumber: string;
    caseRateCode: string;
    hciCents: number;
    pfCents: number;
    status: string;
    transmittedAt: string | null;
  } | null;
  hmo?: {
    providerName: string;
    memberNumberLast4: string;
    mblCents: number;
    approvedCents: number;
    loaStatus: string;
    approvalCode: string | null;
  } | null;
  options?: { onlinePayments: boolean; onlinePromissory: boolean };
}
export interface V2Me {
  email: string;
  facility?: { name: string; code: string };
}

// ---------- mapping helpers ----------
/** v1 uses the user id in SecureStore keys, which allow only letters, digits, ".", "-" and "_". */
export const accountId = (email: string) => `acct.${email.toLowerCase().replace(/[^a-z0-9._-]/g, '_')}`;

export const pesos = (cents: number | null | undefined) => (cents ?? 0) / 100;
export const centavos = (amount: number) => Math.round(amount * 100);

/** v2 discharge stages are the v1 ones except the last. */
export function toV1Stage(stage: string): string {
  return stage === 'CLEARED' ? 'CLEARED_GATE_PASS' : stage;
}

function itemStatus(c: V2Charge): string {
  if (c.coverage === 'WAIVED') return 'WAIVED';
  if (c.isDisputed) return 'CONTESTED';
  if (c.coverage === 'EXCLUDED') return 'DISALLOWED_SUNDRY';
  return 'COVERED';
}

/** v1 category keys used by the bill screen. */
const V1_CATEGORY: Record<string, string> = { ROOM_AND_BOARD: 'ROOM_BOARD', SUPPLIES: 'CENTRAL_SUPPLIES' };

export function toBillItem(
  c: V2Charge,
  coveredPoolCents = 0,
  philhealthPoolCents = 0,
  hmoPoolCents = 0,
): BillItem {
  const excluded = c.coverage === 'EXCLUDED';
  const ratio = !excluded && coveredPoolCents > 0 ? c.grossCents / coveredPoolCents : 0;
  const philCents = Math.min(c.grossCents, Math.round(philhealthPoolCents * ratio));
  const hmoCents = Math.min(Math.max(0, c.grossCents - philCents), Math.round(hmoPoolCents * ratio));
  const oopCents = excluded ? c.grossCents : Math.max(0, c.grossCents - philCents - hmoCents);
  return {
    id: c.id,
    code: '',
    description: c.description,
    category: V1_CATEGORY[c.category] ?? c.category,
    qty: c.quantity,
    unitPrice: pesos(c.unitPriceCents),
    grossAmount: pesos(c.grossCents),
    allocationAvailable: coveredPoolCents > 0,
    philhealthCovered: pesos(philCents),
    hmoCovered: pesos(hmoCents),
    patientOop: pesos(oopCents),
    status: itemStatus(c),
    exclusionReasonClause: excluded ? 'Not covered by PhilHealth or your HMO.' : undefined,
    plainLanguageExplainer: c.explainer ?? '',
    isDisputed: c.isDisputed,
  };
}

export function toEncounter(d: V2StayDetail): PatientEncounter {
  const s = d.stay;
  const l = d.ledger ?? null;
  const charges = (d.charges ?? []).filter((c) => c.coverage !== 'WAIVED');
  const pf = charges.filter((c) => c.category === 'PROFESSIONAL_FEE').reduce((n, c) => n + c.grossCents, 0);
  const excluded = charges.filter((c) => c.coverage === 'EXCLUDED').reduce((n, c) => n + c.grossCents, 0);
  const coveredGrossCents = charges
    .filter((c) => c.coverage === 'COVERED')
    .reduce((n, c) => n + c.grossCents, 0);
  const gross = l?.grossCents ?? 0;
  const activeNote = (d.promissoryNotes ?? []).find((n) => n.status === 'ACTIVE') ?? d.promissoryNotes?.[0];
  const chargeName = new Map((d.charges ?? []).map((c) => [c.id, c.description]));
  const phil = d.philhealth ?? null;
  const hmo = d.hmo ?? null;
  return {
    id: s.id,
    uuid: s.id,
    encounterNumber: s.encounterNumber,
    roomBed: s.bedCode ?? '',
    roomCategory: s.roomCategory ?? '',
    admissionDate: s.admittedAt,
    mghOrderTimestamp: '',
    attendingDoctor: '',
    stage: toV1Stage(s.stage),
    primaryDiagnosis: '',
    primaryIcd10: '',
    waterfall: {
      grossHospitalCharges: pesos(gross - pf),
      grossDoctorFee: pesos(pf),
      grossTotal: pesos(gross),
      vatExemption: pesos(l?.vatExemptionCents),
      seniorPwdDiscount: pesos(l?.seniorPwdDiscountCents),
      netVatDiscountedBase: pesos(gross - (l?.vatExemptionCents ?? 0) - (l?.seniorPwdDiscountCents ?? 0)),
      philhealthHci: pesos(phil ? phil.hciCents : l?.philhealthCents),
      philhealthPf: pesos(phil ? phil.pfCents : 0),
      philhealthTotal: pesos(l?.philhealthCents),
      hmoApprovedAmount: pesos(l?.hmoCents),
      netPatientDue: pesos(l?.netPatientDueCents),
      roomUpgradeExcess: 0,
      excludedConsumables: pesos(excluded),
      doctorExcessPf: 0,
      patientPaid: pesos(l?.paidCents),
    },
    items: charges.map((c) => toBillItem(c, coveredGrossCents, l?.philhealthCents ?? 0, l?.hmoCents ?? 0)),
    hmo: {
      providerName: hmo?.providerName ?? ((l?.hmoCents ?? 0) > 0 ? 'Your HMO' : 'None'),
      cardMasked: hmo?.memberNumberLast4 ? `****-${hmo.memberNumberLast4}` : '',
      policyMbl: pesos(hmo?.mblCents),
      mblRemaining: pesos(Math.max(0, (hmo?.mblCents ?? 0) - (l?.hmoCents ?? 0))),
      dailyRoomAllowance: 0,
      initialLoaApproved: hmo ? hmo.loaStatus !== 'NONE' : (l?.hmoCents ?? 0) > 0,
      finalLoaStatus: hmo?.loaStatus ?? ((l?.hmoCents ?? 0) > 0 ? 'APPROVED' : 'NONE'),
      approvedAmount: pesos(l?.hmoCents),
      disallowedConsumables: pesos(excluded),
    },
    philhealth: {
      id: phil?.id ?? '',
      primaryIcd10: '',
      primaryDescription: '',
      caseRateCode: phil?.caseRateCode ?? '',
      totalCaseRate: pesos(l?.philhealthCents),
      hciAmount: pesos(phil ? phil.hciCents : l?.philhealthCents),
      pfAmount: pesos(phil ? phil.pfCents : 0),
      isNbb: false,
      rthRiskScore: 0,
      status: phil?.status ?? ((l?.philhealthCents ?? 0) > 0 ? 'READY' : 'UNAVAILABLE'),
    },
    dischargePass: d.gatePass
      ? {
          passNumber: d.gatePass.passNumber,
          status: 'ACTIVE_READY_FOR_EXIT',
          settledAmount: pesos(l?.paidCents),
          roomBed: '',
          issuedAt: s.clearedAt ?? new Date().toISOString(),
          exitPin: d.gatePass.pin,
          // The lobby verifies the pass number plus the PIN the patient says aloud.
          qrPayload: d.gatePass.passNumber,
        }
      : undefined,
    promissoryNote: activeNote
      ? {
          id: activeNote.noteNumber,
          principalAmount: pesos(activeNote.principalCents),
          installmentMonths: activeNote.months,
          monthlyInstallment: pesos(activeNote.schedule[0]?.amountCents),
          status: activeNote.status,
        }
      : undefined,
    disputes: (d.disputes ?? []).map((x) => ({
      id: x.id,
      itemDescription: chargeName.get(x.chargeId) ?? 'Charge',
      contestedAmount: pesos(x.contestedCents),
      reason: x.reason,
      status: x.status === 'OPEN' ? 'OPEN' : x.status === 'WAIVED' ? 'SUPERVISOR_WAIVED' : 'UPHELD',
      createdAt: x.createdAt,
      resolutionClause: x.resolutionNote ?? undefined,
    })),
    timeline: (d.timeline ?? []).map((t, i) => ({
      id: `${s.id}-${i}`,
      timestamp: t.createdAt,
      title: t.title,
      description: t.detail ?? '',
      actor: 'Hospital',
    })),
    billState: s.billState,
    billNumber: s.billNumber ?? undefined,
    amountPaid: pesos(l?.paidCents),
    remainingBalance: pesos(l?.balanceCents),
  };
}

export function toPatient(me: V2Me, first: V2StayDetail | null): SafePatient {
  return {
    // v2 keys the account by email; the MRN is not shown to patients.
    id: accountId(me.email),
    mrn: '',
    fullName: first?.stay.patientName ?? me.email,
    gender: '',
    contactNumber: '',
    philhealthPinMasked: '',
    isSeniorCitizen: first?.stay.discountKind === 'SENIOR',
    isPwd: first?.stay.discountKind === 'PWD',
  };
}

const CHECKLIST: [string, string][] = [
  ['MGH_DECLARED', 'Doctor clears you to go home'],
  ['DOCTOR_PF_PENDING', 'Doctor confirms professional fees'],
  ['PHARMACY_RTS_AUDIT', 'Pharmacy checks returned medicines'],
  ['HMO_FINAL_LOA', 'HMO gives final approval'],
  ['PENDING_SETTLEMENT', 'Settle your balance'],
  ['CLEARED', 'Receive your discharge pass'],
];
const ORDER = ['ADMITTED', ...CHECKLIST.map(([k]) => k)];
const COMPLETED_AT: Record<string, string> = {
  MGH_DECLARED: 'MGH_DECLARED',
  DOCTOR_PF_PENDING: 'PHARMACY_RTS_AUDIT',
  PHARMACY_RTS_AUDIT: 'HMO_FINAL_LOA',
  HMO_FINAL_LOA: 'PENDING_SETTLEMENT',
  PENDING_SETTLEMENT: 'CLEARED',
  CLEARED: 'CLEARED',
};

export function toOverview(me: V2Me, details: V2StayDetail[]): PatientOverview {
  const current = details[0] ?? null;
  const enc = current ? toEncounter(current) : null;
  const at = current ? ORDER.indexOf(current.stay.stage) : -1;
  return {
    patient: toPatient(me, current),
    currentEncounter: enc,
    balance: enc
      ? {
          grossTotal: enc.waterfall.grossTotal,
          philhealthTotal: enc.waterfall.philhealthTotal,
          hmoApprovedAmount: enc.waterfall.hmoApprovedAmount,
          netPatientDue: enc.waterfall.netPatientDue,
          amountPaid: enc.amountPaid ?? 0,
          remainingBalance: enc.remainingBalance ?? 0,
        }
      : undefined,
    dischargeChecklist: current
      ? CHECKLIST.map(([key, label]) => ({ key, label, done: ORDER.indexOf(COMPLETED_AT[key]) <= at }))
      : [],
    alerts: (current?.timeline ?? []).slice(0, 3).map((t) => ({
      title: t.title,
      message: t.detail ?? '',
      timestamp: t.createdAt,
    })),
  };
}

const V1_RAIL: Record<string, string> = { CARD: 'CREDIT_DEBIT_CARD' };
export function toPaymentRecord(p: V2Payment, d: V2StayDetail): PaymentRecord {
  return {
    id: p.reference,
    paymentReference: p.reference,
    billReference: d.stay.billNumber ?? undefined,
    encounterNumber: d.stay.encounterNumber,
    amount: pesos(p.amountCents),
    paymentRail: V1_RAIL[p.rail] ?? p.rail,
    status: 'SUCCESS',
    officialReceiptNumber: p.officialReceiptNumber,
    payerName: '',
    createdAt: p.createdAt,
    settledAt: p.createdAt,
  };
}

export function toReceipt(p: V2Payment, d: V2StayDetail): ReceiptRecord {
  return {
    id: p.reference,
    paymentReference: p.reference,
    billReference: d.stay.billNumber ?? undefined,
    patientName: d.stay.patientName,
    status: 'ISSUED',
    encounterNumber: d.stay.encounterNumber,
    receiptNumber: p.officialReceiptNumber,
    officialReceiptNumber: p.officialReceiptNumber,
    amount: pesos(p.amountCents),
    paymentRail: V1_RAIL[p.rail] ?? p.rail,
    payerName: '',
    issuedAt: p.createdAt,
  };
}

export function toPromissoryRecord(n: V2Note, d: V2StayDetail) {
  return {
    id: n.noteNumber,
    noteNumber: n.noteNumber,
    encounterNumber: d.stay.encounterNumber,
    borrowerName: '',
    principalAmount: pesos(n.principalCents),
    interestRate: 0,
    financingFee: 0,
    totalRepayment: pesos(n.principalCents),
    installmentMonths: n.months,
    monthlyInstallment: pesos(n.schedule[0]?.amountCents),
    firstDueDate: n.schedule[0]?.dueDate ?? '',
    status: n.status,
    schedule: n.schedule.map((i) => pesos(i.amountCents)),
    executedAt: n.signedAt,
  };
}

export function toDocuments(details: V2StayDetail[]): PatientDocument[] {
  const docs: PatientDocument[] = [];
  for (const d of details) {
    if (d.stay.billReady && d.ledger) {
      docs.push({
        kind: 'STATEMENT',
        id: `soa-${d.stay.id}`,
        title: 'Statement of account',
        encounterNumber: d.stay.encounterNumber,
        amount: pesos(d.ledger.netPatientDueCents),
        status: d.stay.billNumber ?? undefined,
      });
    }
    for (const p of d.payments ?? []) {
      docs.push({
        kind: 'RECEIPT',
        id: p.reference,
        title: p.officialReceiptNumber,
        encounterNumber: d.stay.encounterNumber,
        amount: pesos(p.amountCents),
        issuedAt: p.createdAt,
      });
    }
    for (const n of d.promissoryNotes ?? []) {
      docs.push({
        kind: 'PROMISSORY_NOTE',
        id: n.noteNumber,
        title: n.noteNumber,
        encounterNumber: d.stay.encounterNumber,
        amount: pesos(n.principalCents),
        issuedAt: n.signedAt,
        status: n.status,
      });
    }
    if (d.gatePass) {
      docs.push({
        kind: 'GATE_PASS',
        id: d.gatePass.passNumber,
        title: `Discharge pass ${d.gatePass.passNumber}`,
        encounterNumber: d.stay.encounterNumber,
        issuedAt: d.stay.clearedAt ?? undefined,
        status: 'ACTIVE_READY_FOR_EXIT',
      });
    }
  }
  return docs;
}

export function toNotifications(details: V2StayDetail[]): PatientNotification[] {
  return details
    .flatMap((d) =>
      (d.timeline ?? []).map((t, i) => ({
        id: `${d.stay.id}-${i}`,
        encounterNumber: d.stay.encounterNumber,
        title: t.title,
        message: t.detail ?? '',
        category: t.kind,
        timestamp: t.createdAt,
      })),
    )
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

// ---------- request bodies (v1 → v2) ----------
const V2_RAIL: Record<string, string> = { CREDIT_DEBIT_CARD: 'CARD' };
const V2_BANKS = ['BPI', 'BDO', 'METROBANK', 'UNIONBANK', 'LANDBANK'];

/** Only the fields v2 accepts are copied; a full card number has nowhere to go. */
export function toPayInput(input: {
  amount: number;
  paymentRail: string;
  payerName: string;
  cardBrand?: string;
  cardLast4?: string;
  bankName?: string;
}) {
  const rail = V2_RAIL[input.paymentRail] ?? input.paymentRail;
  const bank = (input.bankName ?? '').toUpperCase();
  return {
    amountCents: centavos(input.amount),
    rail,
    payerName: input.payerName.trim(),
    ...(rail === 'CARD'
      ? { cardBrand: (input.cardBrand ?? '').toUpperCase(), cardLast4: (input.cardLast4 ?? '').slice(-4) }
      : {}),
    ...(rail === 'BANK_TRANSFER' ? { bank: V2_BANKS.find((b) => bank.startsWith(b)) ?? bank } : {}),
  };
}

const RELATIONSHIP: Record<string, string> = { PATIENT: 'SELF' };
const ID_TYPE: Record<string, string> = { PHILSYS_NATIONAL_ID: 'PHILSYS' };
export function toPromissoryInput(input: {
  borrowerName: string;
  borrowerRelationship?: string;
  borrowerIdType: string;
  borrowerIdNumber: string;
  installmentMonths: number;
  principalAmount: number;
}) {
  const relationship = input.borrowerRelationship ?? 'PATIENT';
  return {
    borrowerName: input.borrowerName.trim(),
    relationship: RELATIONSHIP[relationship] ?? relationship,
    idType: ID_TYPE[input.borrowerIdType] ?? input.borrowerIdType,
    idNumber: input.borrowerIdNumber.trim(),
    months: input.installmentMonths,
    principalCents: centavos(input.principalAmount),
    acceptTerms: true,
  };
}

const DISPUTE_CATEGORY = new Set([
  'NOT_RECEIVED',
  'DUPLICATE',
  'WRONG_QUANTITY',
  'PRICE_DIFFERENCE',
  'EXCESS_PROFESSIONAL_FEE',
  'OTHER',
]);
export function toDisputeInput(input: { chargeId: string; reason: string; disputeCategory?: string }) {
  const category = (input.disputeCategory ?? 'OTHER').toUpperCase();
  return {
    chargeId: input.chargeId,
    category: DISPUTE_CATEGORY.has(category) ? category : 'OTHER',
    reason: input.reason.trim(),
  };
}

// ---------- the router ----------
interface V2Reply {
  status: number;
  data: unknown;
}
type V2Call = (
  method: string,
  path: string,
  body?: unknown,
  idempotencyKey?: string,
  token?: string,
) => Promise<V2Reply>;

const json = (status: number, data: unknown) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
const fail = (status: number, code: string, message: string) => json(status, { error: { code, message } });
const okReply = (r: V2Reply) => r.status >= 200 && r.status < 300;

/**
 * Answer one v1 request. `call` performs a v2 request with the caller's bearer token
 * (see `createV2Call`). Returns a real `Response` so `ApiClient` handles it unchanged.
 */
export async function bridge(
  path: string,
  method: string,
  body: unknown,
  call: V2Call,
  idempotencyKey?: string,
): Promise<Response> {
  const [route] = path.split('?');
  const m = (re: RegExp) => route.match(re);

  // ----- auth -----
  if (method === 'POST' && route === '/auth/login') {
    return fail(400, 'PASSWORD_LOGIN_RETIRED', 'Sign in with the 6-digit code we email you instead.');
  }
  if (method === 'POST' && route === '/auth/otp/request') {
    const r = await call('POST', '/auth/patient/code/request', codeIdentity(body));
    return json(r.status, okReply(r) ? { sent: true, ...(r.data as object) } : r.data);
  }
  if (method === 'POST' && route === '/auth/otp/verify') {
    const b = body as { otp?: string };
    const r = await call('POST', '/auth/patient/code/verify', {
      ...codeIdentity(body),
      code: b.otp,
      client: 'mobile',
    });
    if (!okReply(r)) return json(r.status, r.data);
    const token = (r.data as { token?: string }).token;
    if (!token) return fail(502, 'INVALID_RESPONSE', 'Sign-in did not complete. Please try again.');
    const user = await sessionUser((method2, p2) => call(method2, p2, undefined, undefined, token));
    return json(200, { success: true, token, user });
  }
  if (method === 'GET' && route === '/auth/me') {
    const user = await sessionUser(call);
    return user
      ? json(200, { authenticated: true, user })
      : fail(401, 'UNAUTHENTICATED', 'Please sign in again.');
  }
  if (method === 'POST' && route === '/auth/logout') {
    const r = await call('POST', '/auth/patient/logout', {});
    return json(r.status, r.data);
  }

  // ----- AI (Cora chat, explainer, OCR) -----
  if (route.startsWith('/ai/')) {
    const r = await call(method, `/patient${route}`, body, idempotencyKey);
    return json(r.status, r.data);
  }
  if (route === '/patient/demo/patients') {
    return fail(403, 'FORBIDDEN', 'Hospital patient browsing is not available to this account.');
  }

  // ----- patient reads -----
  if (method === 'GET' && route.startsWith('/patient/me')) {
    const loaded = await loadAll(call);
    if ('error' in loaded) return loaded.error;
    const { me, details } = loaded;
    const one = m(/^\/patient\/me\/encounters\/([^/]+)$/);
    if (one) {
      const d = details.find(
        (x) =>
          x.stay.id === decodeURIComponent(one[1]) || x.stay.encounterNumber === decodeURIComponent(one[1]),
      );
      return d ? json(200, toEncounter(d)) : fail(404, 'NOT_FOUND', 'Stay not found.');
    }
    const receipt = m(/^\/patient\/me\/receipts\/([^/]+)$/);
    if (receipt) {
      for (const d of details)
        for (const p of d.payments ?? [])
          if (p.reference === decodeURIComponent(receipt[1])) return json(200, toReceipt(p, d));
      return fail(404, 'NOT_FOUND', 'Receipt not found.');
    }
    const list = <T>(items: T[]) => json(200, { items, total: items.length });
    switch (route) {
      case '/patient/me':
        return json(200, { patient: toPatient(me, details[0] ?? null) });
      case '/patient/me/overview':
        return json(200, toOverview(me, details));
      case '/patient/me/encounters':
        return list(details.map(toEncounter));
      case '/patient/me/payments':
        return list(details.flatMap((d) => (d.payments ?? []).map((p) => toPaymentRecord(p, d))));
      case '/patient/me/receipts':
        return list(details.flatMap((d) => (d.payments ?? []).map((p) => toReceipt(p, d))));
      case '/patient/me/promissory-notes':
        return list(details.flatMap((d) => (d.promissoryNotes ?? []).map((n) => toPromissoryRecord(n, d))));
      case '/patient/me/documents': {
        const items = toDocuments(details);
        return json(200, { items, total: items.length, uploadSupported: false });
      }
      case '/patient/me/notifications': {
        const items = toNotifications(details);
        return json(200, { items, total: items.length, pushSupported: false });
      }
      case '/patient/me/claims':
        return list(
          details
            .filter((d) => d.philhealth)
            .map((d) => ({
              id: d.philhealth!.id,
              claimNumber: d.philhealth!.claimNumber,
              encounterNumber: d.stay.encounterNumber,
              caseRateCode: d.philhealth!.caseRateCode,
              totalCaseRate: pesos(d.philhealth!.hciCents + d.philhealth!.pfCents),
              hciAmount: pesos(d.philhealth!.hciCents),
              pfAmount: pesos(d.philhealth!.pfCents),
              status: d.philhealth!.status,
              transmittedAt: d.philhealth!.transmittedAt,
            })),
        );
    }
    return fail(404, 'NOT_FOUND', 'We could not find that record.');
  }

  // ----- patient writes -----
  const pay = m(/^\/encounters\/([^/]+)\/payments$/);
  if (method === 'POST' && pay) {
    const id = decodeURIComponent(pay[1]);
    const r = await call(
      'POST',
      `/patient/stays/${encodeURIComponent(id)}/payments`,
      toPayInput(body as never),
      idempotencyKey,
    );
    if (!okReply(r)) return json(r.status, r.data);
    const paid = r.data as { reference: string; amountCents: number; officialReceiptNumber: string };
    const after = await call('GET', `/patient/stays/${encodeURIComponent(id)}`);
    const detail = okReply(after) ? (after.data as V2StayDetail) : null;
    const v2Payment: V2Payment = {
      reference: paid.reference,
      amountCents: paid.amountCents,
      rail: toPayInput(body as never).rail,
      createdAt: new Date().toISOString(),
      officialReceiptNumber: paid.officialReceiptNumber,
    };
    const stayForRecords =
      detail ??
      ({ stay: { encounterNumber: '', billNumber: null, patientName: '' } } as unknown as V2StayDetail);
    const payment = {
      ...toPaymentRecord(v2Payment, stayForRecords),
      payerName: (body as { payerName?: string }).payerName ?? '',
    };
    return json(200, {
      success: true,
      payment,
      receipt: { ...toReceipt(v2Payment, stayForRecords), payerName: payment.payerName },
      dischargePass: detail ? toEncounter(detail).dischargePass : undefined,
      encounter: detail ? toEncounter(detail) : undefined,
    });
  }
  const note = m(/^\/encounters\/([^/]+)\/promissory-notes$/);
  if (method === 'POST' && note) {
    const id = decodeURIComponent(note[1]);
    const r = await call(
      'POST',
      `/patient/stays/${encodeURIComponent(id)}/promissory-notes`,
      toPromissoryInput(body as never),
    );
    if (!okReply(r)) return json(r.status, r.data);
    const created = r.data as { noteNumber: string; schedule: V2Note['schedule'] };
    const after = await call('GET', `/patient/stays/${encodeURIComponent(id)}`);
    const detail = okReply(after) ? (after.data as V2StayDetail) : null;
    const saved = detail?.promissoryNotes?.find((n) => n.noteNumber === created.noteNumber);
    const record = toPromissoryRecord(
      saved ?? {
        noteNumber: created.noteNumber,
        principalCents: created.schedule.reduce((n, i) => n + i.amountCents, 0),
        months: created.schedule.length,
        schedule: created.schedule,
        status: 'ACTIVE',
        signedAt: new Date().toISOString(),
      },
      detail ?? ({ stay: { encounterNumber: '' } } as unknown as V2StayDetail),
    );
    return json(200, {
      success: true,
      promissoryNote: { ...record, scheduleJson: record.schedule },
      dischargePass: detail ? toEncounter(detail).dischargePass : undefined,
    });
  }
  const dispute = m(/^\/encounters\/([^/]+)\/disputes$/);
  if (method === 'POST' && dispute) {
    const id = decodeURIComponent(dispute[1]);
    const r = await call(
      'POST',
      `/patient/stays/${encodeURIComponent(id)}/disputes`,
      toDisputeInput(body as never),
    );
    return json(r.status, okReply(r) ? { success: true, dispute: r.data } : r.data);
  }

  return fail(404, 'NOT_FOUND', 'This feature is not available yet.');
}

function codeIdentity(body: unknown) {
  const b = body as {
    purpose?: string;
    email?: string;
    mrn?: string;
    dateOfBirth?: string;
    facilityCode?: string;
  };
  return b.purpose === 'REGISTER'
    ? { purpose: 'REGISTER', facilityCode: b.facilityCode, mrn: b.mrn, dateOfBirth: b.dateOfBirth }
    : { purpose: 'LOGIN', facilityCode: b.facilityCode, email: b.email };
}

/** The v1 session user, built from v2 `me` plus the first stay's patient name. */
async function sessionUser(call: (method: string, path: string) => Promise<V2Reply>) {
  const me = await call('GET', '/auth/patient/me');
  if (!okReply(me)) return null;
  const data = me.data as V2Me;
  const stays = await call('GET', '/patient/stays');
  const first = okReply(stays) ? (stays.data as { items: V2StayRow[] }).items[0] : undefined;
  return {
    id: accountId(data.email),
    email: data.email,
    fullName: first?.patientName ?? data.email,
    role: 'PATIENT_GUARANTOR',
    facilityName: data.facility?.name,
  };
}

async function loadAll(call: V2Call): Promise<{ me: V2Me; details: V2StayDetail[] } | { error: Response }> {
  const [me, stays] = await Promise.all([call('GET', '/auth/patient/me'), call('GET', '/patient/stays')]);
  if (!okReply(me)) return { error: json(me.status, me.data) };
  if (!okReply(stays)) return { error: json(stays.status, stays.data) };
  const rows = (stays.data as { items: V2StayRow[] }).items;
  const replies = await Promise.all(
    rows.map((r) => call('GET', `/patient/stays/${encodeURIComponent(r.id)}`)),
  );
  const failed = replies.find((r) => !okReply(r));
  if (failed) return { error: json(failed.status, failed.data) };
  return { me: me.data as V2Me, details: replies.map((r) => r.data as V2StayDetail) };
}

/**
 * A v2 caller bound to the API root and the request's bearer token. Network failures propagate
 * as thrown errors, exactly like `fetch`, so `ApiClient` reports them the v1 way.
 */
export function createV2Call(
  apiRoot: string,
  headers: Headers,
  signal: AbortSignal,
  doFetch: typeof fetch = fetch,
) {
  return async (
    method: string,
    path: string,
    body?: unknown,
    idempotencyKey?: string,
    token?: string,
  ): Promise<V2Reply> => {
    const h: Record<string, string> = { Accept: 'application/json', 'X-MedCore-CSRF': '1' };
    const auth = token ? `Bearer ${token}` : headers.get('Authorization');
    if (auth) h.Authorization = auth;
    if (body !== undefined) h['Content-Type'] = 'application/json';
    const key = idempotencyKey ?? headers.get('Idempotency-Key') ?? undefined;
    if (key && method !== 'GET') h['Idempotency-Key'] = key.replace(/[^A-Za-z0-9-]/g, '-').slice(0, 64);
    const res = await doFetch(`${apiRoot}/api/v1${path}`, {
      method,
      headers: h,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
    const text = await res.text();
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { error: { code: 'INVALID_RESPONSE', message: 'The server returned an unreadable response.' } };
    }
    return { status: res.status, data };
  };
}
