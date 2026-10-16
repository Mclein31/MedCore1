// Patient-facing presentation types. The backend is the source of truth for
// all financial values; these types only describe what the API returns.

export interface SafePatient {
  id: string;
  mrn: string;
  fullName: string;
  gender: string;
  contactNumber: string;
  philhealthPinMasked: string;
  isSeniorCitizen: boolean;
  isPwd: boolean;
}

export interface WaterfallSummary {
  grossHospitalCharges: number;
  grossDoctorFee: number;
  grossTotal: number;
  vatExemption: number;
  seniorPwdDiscount: number;
  netVatDiscountedBase: number;
  philhealthHci: number;
  philhealthPf: number;
  philhealthTotal: number;
  hmoApprovedAmount: number;
  netPatientDue: number;
  roomUpgradeExcess: number;
  excludedConsumables: number;
  doctorExcessPf: number;
  patientPaid?: number;
}

export interface BillItem {
  allocationAvailable?: boolean;
  id: string;
  code: string;
  description: string;
  category: string;
  qty: number;
  unitPrice: number;
  grossAmount: number;
  philhealthCovered: number;
  hmoCovered: number;
  patientOop: number;
  status: string;
  exclusionReasonClause?: string;
  plainLanguageExplainer: string;
  isDisputed?: boolean;
}

export interface HmoSummary {
  providerName: string;
  cardMasked: string;
  loaNumber?: string;
  policyMbl: number;
  mblRemaining: number;
  dailyRoomAllowance: number;
  initialLoaApproved: boolean;
  finalLoaStatus: string;
  approvalCode?: string;
  approvedAmount: number;
  disallowedConsumables: number;
  turnaroundMinutes?: number;
}

export interface PhilHealthSummary {
  id: string;
  primaryIcd10: string;
  primaryDescription: string;
  caseRateCode: string;
  totalCaseRate: number;
  hciAmount: number;
  pfAmount: number;
  isNbb: boolean;
  rthRiskScore: number;
  status: string;
}

export interface PatientEncounter {
  id: string;
  uuid: string;
  encounterNumber: string;
  roomBed: string;
  roomCategory: string;
  admissionDate: string;
  mghOrderTimestamp: string;
  attendingDoctor: string;
  stage: string;
  primaryDiagnosis: string;
  primaryIcd10: string;
  waterfall: WaterfallSummary;
  items: BillItem[];
  hmo: HmoSummary;
  philhealth: PhilHealthSummary;
  dischargePass?: {
    passNumber: string;
    status: string;
    settledAmount: number;
    roomBed: string;
    issuedAt: string;
    verifiedAt?: string;
    exitPin: string | null;
    qrPayload: string | null;
  };
  promissoryNote?: {
    id: string;
    principalAmount: number;
    installmentMonths: number;
    monthlyInstallment: number;
    status: string;
  };
  disputes: Array<{
    id: string;
    itemDescription: string;
    contestedAmount: number;
    reason: string;
    status: string;
    createdAt: string;
    resolutionClause?: string;
  }>;
  timeline: Array<{
    id: string;
    timestamp: string;
    title: string;
    description: string;
    actor: string;
  }>;
  billState?: string;
  billNumber?: string;
  amountPaid?: number;
  remainingBalance?: number;
}

export interface PaymentRecord {
  billReference?: string;
  id: string;
  paymentReference: string;
  encounterNumber: string;
  amount: number;
  paymentRail: string;
  status: string;
  officialReceiptNumber: string;
  payerName: string;
  createdAt: string;
  settledAt: string | null;
  isSimulatedDemo?: boolean;
}

export interface ReceiptRecord {
  paymentReference?: string;
  billReference?: string;
  patientName?: string;
  patientMrn?: string;
  status?: string;
  id: string;
  encounterNumber?: string;
  receiptNumber: string;
  officialReceiptNumber: string;
  amount: number;
  paymentRail: string;
  payerName: string;
  issuedAt: string;
}

export interface ClaimSummary {
  kind: string;
  id: string;
  reference: string;
  encounterNumber: string;
  status: string;
  caseRateCode?: string;
  totalCaseRate?: number;
  submittedAt: string | null;
  updatedAt?: string;
  needsAttention?: boolean;
  attentionNote?: string | null;
}

export interface PatientDocument {
  kind: 'STATEMENT' | 'RECEIPT' | 'GATE_PASS' | 'PROMISSORY_NOTE' | string;
  id: string;
  title: string;
  encounterNumber: string;
  amount?: number;
  issuedAt?: string;
  status?: string;
  url?: string;
}

export interface PatientNotification {
  id: string;
  encounterNumber: string;
  title: string;
  message: string;
  category: string;
  timestamp: string;
}

export interface PatientOverview {
  patient: SafePatient;
  currentEncounter: PatientEncounter | null;
  balance?: {
    grossTotal: number;
    philhealthTotal: number;
    hmoApprovedAmount: number;
    netPatientDue: number;
    amountPaid: number;
    remainingBalance: number;
  };
  dischargeChecklist?: Array<{ key: string; label: string; done: boolean }>;
  alerts?: Array<{ title: string; message: string; timestamp?: string }>;
}
