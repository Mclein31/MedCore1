import type { DischargeStage, Permission, StaffRole } from '@medcore/domain';

export interface StaffUser {
  id: string;
  email: string;
  fullName: string;
  role: StaffRole;
  title: string;
  mfaEnabled: boolean;
  isActive: boolean;
  lastLoginAt: string | null;
}

export interface StaffMe {
  user: StaffUser;
  facility: { id: string; code: string; name: string };
  permissions: Permission[];
}

export type LoginResult =
  | { status: 'SIGNED_IN'; user: StaffUser; recoveryCodes?: string[] }
  | { status: 'MFA_REQUIRED'; challenge: string }
  | { status: 'MFA_ENROLLMENT_REQUIRED'; challenge: string };

export interface Sla {
  elapsedMinutes: number | null;
  status: 'ON_TRACK' | 'WARNING' | 'BREACH' | null;
}

export interface EncounterRow {
  id: string;
  encounterNumber: string;
  patientName: string;
  mrn: string;
  bedCode: string;
  stage: DischargeStage;
  billState: string;
  admittedAt: string;
  mghOrderedAt: string | null;
  clearedAt: string | null;
  voidedAt: string | null;
  physicianName: string;
  netPatientDueCents: number | null;
  balanceCents: number | null;
  grossCents: number | null;
  openDisputes: number;
  sla: Sla | null;
}

export interface Page<T> {
  items: T[];
  total?: number;
  page: number;
  pageSize: number;
}

export interface Ledger {
  grossHospitalCents: number;
  grossProfessionalFeeCents: number;
  grossCents: number;
  vatExemptionCents: number;
  seniorPwdDiscountCents: number;
  nonCoveredCents: number;
  philhealthCents: number;
  hmoCents: number;
  coverageShortfallCents: number;
  netPatientDueCents: number;
  paidCents: number;
  financedCents: number;
  balanceCents: number;
  creditCents: number;
}

export interface Charge {
  id: string;
  code: string;
  description: string;
  category: string;
  quantity: number;
  unitPriceCents: number;
  grossCents: number;
  coverage: 'COVERED' | 'EXCLUDED' | 'WAIVED';
  explainer: string | null;
  isDisputed: boolean;
  postedAt: string;
  removedAt: string | null;
  removedReason: string | null;
}

export interface Dispute {
  id: string;
  chargeId: string;
  contestedCents: number;
  category: string;
  reason: string;
  status: 'OPEN' | 'WAIVED' | 'UPHELD';
  filedByStaffId: string | null;
  filedByAccountId: string | null;
  resolutionNote: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

export interface Installment {
  sequence: number;
  dueDate: string;
  amountCents: number;
}

export interface EncounterDetail {
  encounter: {
    id: string;
    encounterNumber: string;
    bedCode: string;
    roomCategory: string;
    primaryDiagnosis: string;
    icd10Code: string;
    admittedAt: string;
    stage: DischargeStage;
    stageEnteredAt: string;
    mghOrderedAt: string | null;
    clearedAt: string | null;
    agreedPfCents: number | null;
    pfCeilingCents: number | null;
    doctorExcessPfCents: number;
    roomUpgradeExcessCents: number;
    pfSignedAt: string | null;
    pharmacyClearedAt: string | null;
    billState: string;
    billNumber: string | null;
    billFinalizedAt: string | null;
    billSentAt: string | null;
    voidedAt: string | null;
    voidReason: string | null;
    version: number;
    sla: Sla;
  };
  patient: {
    id: string;
    mrn: string;
    fullName: string;
    dateOfBirth: string;
    sex: string;
    hasEmail: boolean;
    contactPhoneLast4: string;
    philhealthPinLast4: string | null;
    discountKind: 'NONE' | 'SENIOR' | 'PWD';
    discountIdLast4: string | null;
  };
  physician: { id: string; fullName: string; prcLicense: string | null } | null;
  ledger: Ledger | null;
  philhealth: {
    id: string;
    claimNumber: string;
    caseRateCode: string;
    hciCents: number;
    pfCents: number;
    status: string;
  } | null;
  hmo: {
    providerName: string;
    memberNumberLast4: string;
    mblCents: number;
    loaStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
    approvalCode: string | null;
    approvedCents: number;
  } | null;
  charges: Charge[];
  payments: {
    id: string;
    reference: string;
    amountCents: number;
    rail: string;
    payerName: string;
    isSimulated: boolean;
    createdAt: string;
    officialReceiptNumber: string;
  }[];
  promissoryNotes: {
    id: string;
    noteNumber: string;
    borrowerName: string;
    relationship: string;
    idType: string;
    idLast4: string;
    principalCents: number;
    months: number;
    schedule: Installment[];
    status: string;
    signedAt: string;
  }[];
  disputes: Dispute[];
  gatePasses: {
    id: string;
    passNumber: string;
    status: string;
    issuedAt: string;
    expiresAt: string;
    usedAt: string | null;
    pinAttempts: number;
  }[];
  timeline: {
    id: string;
    kind: string;
    title: string;
    detail: string | null;
    actorLabel: string;
    createdAt: string;
  }[];
}

export interface Analytics {
  stages: Partial<Record<DischargeStage, number>>;
  money: {
    grossCents: number;
    philhealthCents: number;
    hmoCents: number;
    patientDueCents: number;
    collectedCents: number;
    financedCents: number;
    outstandingCents: number;
  };
  clearance30d: { cleared: number; medianMinutes: number | null };
  openDisputes: { count: number; cents: number };
  beds: Partial<Record<string, number>>;
}

export interface Bed {
  id: string;
  code: string;
  ward: string;
  floor: number;
  roomCategory: string;
  dailyRateCents: number;
  status: 'AVAILABLE' | 'OCCUPIED' | 'HOUSEKEEPING' | 'MAINTENANCE';
  encounterId: string | null;
}

export interface PatientRow {
  id: string;
  mrn: string;
  fullName: string;
  dateOfBirth: string;
  sex: string;
  hasEmail: boolean;
  discountKind: string;
}
