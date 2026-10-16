import type { DischargeStage } from '@medcore/domain';

/** Response shapes of the v2 patient API (apps/api/src/routes/patientPortal.ts and patientAuth.ts). */
export interface PatientMe {
  email: string;
  facility: { name: string; code: string } | undefined;
}

export interface StayRow {
  id: string;
  encounterNumber: string;
  patientName: string;
  admittedAt: string;
  stage: DischargeStage;
  billState: string;
  clearedAt: string | null;
  billReady: boolean;
  balanceCents: number | null;
  netPatientDueCents: number | null;
}

export interface StayLedger {
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

export interface StayCharge {
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

export interface Installment {
  sequence: number;
  dueDate: string;
  amountCents: number;
}

export interface StayPayment {
  reference: string;
  amountCents: number;
  rail: string;
  createdAt: string;
  officialReceiptNumber: string;
}

export interface StayNote {
  noteNumber: string;
  principalCents: number;
  months: number;
  schedule: Installment[];
  status: string;
  signedAt: string;
}

export interface StayDispute {
  id: string;
  chargeId: string;
  contestedCents: number;
  reason: string;
  status: 'OPEN' | 'WAIVED' | 'UPHELD';
  resolutionNote: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

export interface GatePass {
  passNumber: string;
  pin: string;
  expiresAt: string;
}

export interface StayDetail {
  stay: {
    id: string;
    encounterNumber: string;
    patientName: string;
    facilityName: string;
    admittedAt: string;
    stage: DischargeStage;
    billState: string;
    billNumber: string | null;
    clearedAt: string | null;
    discountKind: 'NONE' | 'SENIOR' | 'PWD';
    billReady: boolean;
  };
  // Present only once the bill is finalized (billReady).
  ledger?: StayLedger | null;
  charges?: StayCharge[];
  payments?: StayPayment[];
  promissoryNotes?: StayNote[];
  disputes?: StayDispute[];
  timeline?: { kind: string; title: string; detail: string | null; createdAt: string }[];
  gatePass?: GatePass | null;
  options?: { onlinePayments: boolean; onlinePromissory: boolean };
}

export interface PaymentReceipt {
  reference: string;
  amountCents: number;
  officialReceiptNumber: string;
  replayed: boolean;
}
