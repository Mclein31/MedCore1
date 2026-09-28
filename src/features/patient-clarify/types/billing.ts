import { ChargemasterItem, DischargePass, PromissoryNote, BillingDispute } from '@/types/domain';

export type BillLifecycleState =
  | 'DRAFT'              // Hospital staff compiling charges
  | 'FINALIZED'          // Charges & deductions locked; ready for patient dispatch
  | 'SENT_TO_PATIENT'    // Magic link / SMS dispatched
  | 'VIEWED'             // Patient opened statement in portal
  | 'DISPUTED'           // One or more charges contested by patient
  | 'PARTIALLY_PAID'     // Partial demo settlement completed (remaining > 0)
  | 'PAID'               // Remaining balance ₱0.00 or covered by executed RA 9439 note
  | 'OVERDUE'            // Grace period expired without settlement
  | 'CANCELLED';         // Statement voided

export type DemoPaymentRail =
  | 'QR_PH'
  | 'GCASH'
  | 'MAYA'
  | 'CREDIT_DEBIT_CARD'
  | 'BANK_TRANSFER'
  | 'PROMISSORY_NOTE';

export type PaymentLifecycleState =
  | 'INITIALIZED'
  | 'PROCESSING'
  | 'SUCCESS'
  | 'FAILED'
  | 'CANCELLED';

export interface PaymentReceipt {
  id: string;                          // e.g. "RCPT-SJMC-2026-44192"
  paymentId: string;                   // unique payment reference e.g. "PAY-DEMO-8812-XXXXX"
  billId: string;                      // e.g. "SOA-SJMC-26-8812"
  amount: number;
  paymentMethod: DemoPaymentRail;
  date: string;                        // ISO date
  referenceNumber: string;             // channelReference or transaction ref
  officialReceiptNumber: string;       // BIR OR number e.g. "OR-SJMC-2026-44192"
  payerName: string;
  payerContactMasked: string;
  gatewayAuthCode?: string;
  bankName?: string;
  notes?: string;
  isSimulatedDemo?: boolean;
}

export interface DemoPaymentRecord {
  id: string;                          // e.g. "PAY-DEMO-8812-XXXXX"
  paymentId: string;                   // explicit payment ID
  receiptId?: string;                  // e.g. "RCPT-SJMC-2026-44192"
  receipt?: PaymentReceipt;
  billId: string;
  encounterId: string;
  amount: number;
  currency: 'PHP';
  paymentRail: DemoPaymentRail;
  channelReference: string;            // e.g. "GCH-88319024" or "QRP-2026-98124"
  gatewayAuthCode: string;             // e.g. "AUTH-99120"
  payerName: string;
  payerContactMasked: string;          // e.g. "0917-***-4412" or "•••• 8821"
  timestamp: string;
  status: 'SUCCESS' | 'FAILED';
  officialReceiptNumber: string;       // e.g. "OR-SJMC-2026-44192"
  failureReason?: string;
  isSimulatedDemo: true;
  notes?: string;
  cardBrand?: 'VISA' | 'MASTERCARD';
  cardLast4?: string;
  promissoryNoteId?: string;
  bankName?: string;
}

export interface PatientBillStatement {
  id: string;                          // e.g. "BILL-2026-0812"
  encounterId: string;
  billNumber: string;                  // e.g. "SOA-SJMC-26-8812"
  version: number;
  state: BillLifecycleState;

  // Timestamps
  finalizedAt?: string;
  sentAt?: string;
  firstViewedAt?: string;
  settledAt?: string;

  // Hospital Metadata
  facilityName: string;
  facilityAddress: string;
  facilityTin: string;
  facilityPhone: string;
  attendingSpecialist: string;

  // Patient Demographic Snapshot
  patient: {
    id: string;
    fullName: string;
    mrn: string;
    roomBed: string;
    admissionDate: string;
    dischargeDate?: string;
    primaryDiagnosis: string;
    icd10: string;
    isSeniorCitizen: boolean;
    isPwd: boolean;
    seniorOrPwdId?: string;
    philhealthPinMasked: string;
    hmoCardMasked?: string;
    hmoProviderName: string;
    isNbb: boolean;
  };

  // Financial Waterfall Snapshot
  financials: {
    grossHospitalCharges: number;
    grossDoctorFees: number;
    grossTotal: number;
    vatExemption: number;
    seniorPwdDiscount: number;
    philhealthTotal: number;
    hmoApprovedAmount: number;
    netPatientDue: number;
    amountPaid: number;
    remainingBalance: number;
  };

  // Three Out-of-Pocket Cost Drivers
  outOfPocketDrivers: {
    roomUpgradeExcess: number;
    excludedConsumables: number;
    doctorExcessPf: number;
    coverageShortfall: number;
  };

  items: ChargemasterItem[];
  disputes: BillingDispute[];
  paymentHistory: DemoPaymentRecord[];
  receipts: PaymentReceipt[];
  dischargePass?: DischargePass;
  promissoryNote?: PromissoryNote;
}
