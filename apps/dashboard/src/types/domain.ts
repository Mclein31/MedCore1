export type DischargeStage =
  | 'MGH_DECLARED'
  | 'DOCTOR_PF_PENDING'
  | 'PHARMACY_RTS_AUDIT'
  | 'HMO_FINAL_LOA'
  | 'PENDING_SETTLEMENT'
  | 'CLEARED_GATE_PASS';

export type SlaStatus = 'NORMAL' | 'WARNING' | 'BREACH';

export interface Patient {
  id: string;
  mrn: string;
  maskedName: string;
  fullName?: string;
  philhealthPin: string;
  pin?: string;
  isSeniorCitizen: boolean;
  seniorCitizenId?: string;
  isPwd: boolean;
  pwdId?: string;
  age: number;
  gender: 'M' | 'F';
  contactNumber: string;
}

export interface ChargemasterItem {
  id: string;
  code: string;
  description: string;
  category: 'ROOM_BOARD' | 'PHARMACY' | 'LABORATORY' | 'CENTRAL_SUPPLIES' | 'PROFESSIONAL_FEE';
  qty: number;
  unitPrice: number;
  grossAmount: number;
  isVatable: boolean;
  philhealthCovered: number;
  hmoCovered: number;
  patientOop: number;
  status:
    | 'COVERED'
    | 'DISALLOWED_SUNDRY'
    | 'EXCESS_PF'
    | 'CONTESTED'
    | 'SUPERVISORY_WAIVED'
    | 'PARTIAL'
    | 'DISPUTED'
    | 'WAIVED';
  exclusionReasonClause?: string;
  plainLanguageExplainer: string;
  isDisputed?: boolean;
  disputeReason?: string;
}

export interface StatutoryWaterfall {
  grossHospitalCharges: number;
  grossDoctorFee: number;
  grossTotal: number;
  grossCharges?: number;
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

export interface PhilHealthClaim {
  id: string;
  primaryIcd10: string;
  primaryDescription: string;
  diagnosisDescription?: string;
  caseRateCode: string;
  totalCaseRate: number;
  hciAmount: number;
  pfAmount: number;
  isNbb: boolean;
  rthRiskScore: number; // 0.00 to 1.00
  cf4VitalsRecorded: boolean;
  cf4CourseInWardRecorded: boolean;
  cf4LabsConsistent: boolean;
  eSoaXmlConformity: boolean;
  status: 'CLEAN' | 'WARNING' | 'INTERCEPTED' | 'TRANSMITTED' | 'RETURNED' | 'APPROVED';
  claimAgingDays?: number;
  assignedAuditor?: string;
  deficiencyReason?: string;
}

export interface HmoAuthorization {
  providerName: 'Maxicare' | 'Intellicare' | 'Medicard' | 'PhilCare' | 'Pacific Cross' | string;
  hmoName?: string;
  cardMasked: string;
  loaNumber?: string;
  policyMbl: number;
  mblRemaining: number;
  dailyRoomAllowance: number;
  initialLoaApproved: boolean;
  finalLoaStatus:
    | 'PENDING_SUBMISSION'
    | 'AWAITING_CODE'
    | 'APPROVED'
    | 'DISALLOWED_ITEMS'
    | 'UNDER_REVIEW'
    | 'PARTIALLY_APPROVED'
    | 'REJECTED';
  loaStatus?: string;
  approvalCode?: string;
  approvedAmount: number;
  disallowedConsumables: number;
  turnaroundMinutes?: number;
  adjusterName?: string;
  adjusterContact?: string;
}

export interface DischargePass {
  exitPin?: string;
  passNumber: string;
  encounterId: string;
  patientName: string;
  roomBed: string;
  settledAmount: number;
  settlementChannel: 'QR_PH' | 'GCASH' | 'MAYA' | 'PROMISSORY_NOTE' | 'CASHIER_OVERRIDE';
  issuedAt: string;
  verifiedAt?: string;
  status: 'ACTIVE_READY_FOR_EXIT' | 'VERIFIED_AT_LOBBY' | 'EXPIRED';
  hmacSignature: string;
}

export interface PromissoryNote {
  id: string;
  encounterId: string;
  borrowerName: string;
  borrowerRelationship: 'PATIENT' | 'SPOUSE' | 'CHILD' | 'GUARANTOR';
  borrowerIdType: 'PHILSYS_NATIONAL_ID' | 'UMID' | 'DRIVERS_LICENSE' | 'PASSPORT';
  borrowerIdNumber: string;
  principalAmount: number;
  installmentMonths: 3 | 6 | 12;
  monthlyInstallment: number;
  firstDueDate: string;
  digitalSignatureTimestamp: string;
  status: 'ACTIVE' | 'CURRENT' | 'DEFAULTED' | 'FULFILLED';
}

export interface BillingDispute {
  id: string;
  encounterId: string;
  itemId: string;
  itemDescription: string;
  contestedAmount: number;
  reason: string;
  status: 'OPEN' | 'FROZEN' | 'SUPERVISOR_WAIVED' | 'HMO_RECONSIDERED' | 'UPHELD';
  supervisorNotes?: string;
  createdAt: string;
  assignedStaff?: string;
  resolutionClause?: string;
  department?: string;
}

export interface DoctorInfo {
  name: string;
  prcLicense: string;
  specialization: string;
  contactNumber: string;
  declaredFee: number;
  accreditedScheduleRate: number;
  status: string;
}

export interface EncounterTimelineEvent {
  id: string;
  timestamp: string;
  timeDisplay: string;
  title: string;
  description: string;
  actor: string;
  type: 'CLINICAL' | 'PAYER' | 'PHARMACY' | 'BILLING' | 'LEGAL' | 'DISCHARGE';
  status: 'COMPLETED' | 'PENDING' | 'BLOCKED';
}

export interface Encounter {
  id: string;
  encounterNumber: string;
  patient: Patient;
  roomBed: string;
  bedNumber?: string;
  roomCategory: 'WARD' | 'SEMI_PRIVATE' | 'REGULAR_PRIVATE' | 'SUITE';
  roomType?: string;
  dailyRoomRate: number;
  dailyRoomAllowance: number;
  admissionDate: string;
  mghOrderTimestamp: string;
  attendingDoctor: string;
  attendingDoctorObj?: DoctorInfo;
  doctorPan: string;
  doctorAgreedFee: number;
  doctorExcessPf: number;
  doctorSignedAt?: string | null;
  pharmacyRtsCleared: boolean;
  unreturnedMedsCount: number;
  stage: DischargeStage;
  elapsedMinutes: number;
  elapsedMinutesInStage?: number;
  slaStatus: SlaStatus;
  primaryDiagnosis: string;
  primaryIcd10: string;
  hmo: HmoAuthorization;
  philhealth: PhilHealthClaim;
  philHealth?: PhilHealthClaim;
  items: ChargemasterItem[];
  chargemasterItems?: ChargemasterItem[];
  waterfall: StatutoryWaterfall;
  dischargePass?: DischargePass;
  promissoryNote?: PromissoryNote;
  disputes: BillingDispute[];
  timeline?: EncounterTimelineEvent[];
  // Patient Billing & Demo Settlement Extension
  billState?: 'DRAFT' | 'FINALIZED' | 'SENT_TO_PATIENT' | 'VIEWED' | 'DISPUTED' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  billNumber?: string;
  amountPaid?: number;
  remainingBalance?: number;
  billFinalizedAt?: string;
  billSentAt?: string;
  billFirstViewedAt?: string;
  paymentHistory?: any[];
  receipts?: any[];
}

export interface CommercialCarrierMetric {
  carrier: string;
  activeCases: number;
  avgTatMinutes: number;
  avgTatFormatted: string;
  disallowanceRate: number; // percentage, e.g. 2.1
  cleanApprovalRate: number; // percentage, e.g. 97.9
  reconciledTotal: number;
}

export interface TrappedCapitalFriction {
  category: string;
  amount: number;
  share: number; // percentage 0-100
  avgDelayMinutes: number;
  avgDelayFormatted: string;
  casesCount: number;
}

export interface ArAgingSummary {
  bucket: string;
  amount: number;
  percentage: number;
  status: string;
  isStatutoryRisk?: boolean;
}

export interface DischargeTatPoint {
  day: number;
  dateStr?: string;
  tatMinutes: number;
  isToday?: boolean;
}

export interface PreFlightAuditStatus {
  xmlConformityPercent: number;
  cf4NotesPercent: number;
  codingConsistencyPercent: number;
  doctorPanVerifiedPercent: number;
}

export type {
  BillLifecycleState,
  DemoPaymentRail,
  PaymentLifecycleState,
  DemoPaymentRecord,
  PaymentReceipt,
  PatientBillStatement
} from '@/features/patient-clarify/types/billing';
