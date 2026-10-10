import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  numeric,
  timestamp,
  pgEnum,
  jsonb,
  bigserial,
  index,
  unique,
  primaryKey
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ----------------------------------------------------------------------
// PostgreSQL Enums
// ----------------------------------------------------------------------

export const userRoleEnum = pgEnum('user_role', [
  'BILLING_SPECIALIST',
  'HMO_COORDINATOR',
  'CLAIMS_ENCODER',
  'HOSPITAL_CFO',
  'ATTENDING_PHYSICIAN',
  'PATIENT_GUARANTOR',
  'LOBBY_SECURITY'
]);

export const dischargeStageEnum = pgEnum('discharge_stage', [
  'MGH_DECLARED',
  'DOCTOR_PF_PENDING',
  'PHARMACY_RTS_AUDIT',
  'HMO_FINAL_LOA',
  'PENDING_SETTLEMENT',
  'CLEARED_GATE_PASS'
]);

export const slaStatusEnum = pgEnum('sla_status', [
  'NORMAL',
  'WARNING',
  'BREACH'
]);

export const billLifecycleStateEnum = pgEnum('bill_lifecycle_state', [
  'DRAFT',
  'FINALIZED',
  'SENT_TO_PATIENT',
  'VIEWED',
  'DISPUTED',
  'PARTIALLY_PAID',
  'PAID',
  'OVERDUE',
  'CANCELLED'
]);

export const paymentRailEnum = pgEnum('payment_rail', [
  'QR_PH',
  'GCASH',
  'MAYA',
  'CREDIT_DEBIT_CARD',
  'BANK_TRANSFER',
  'PROMISSORY_NOTE',
  'CASHIER_OVER_THE_COUNTER'
]);

export const paymentStatusEnum = pgEnum('payment_status', [
  'INITIALIZED',
  'PROCESSING',
  'SUCCESS',
  'FAILED',
  'CANCELLED'
]);

export const chargeCategoryEnum = pgEnum('charge_category', [
  'ROOM_BOARD',
  'PHARMACY',
  'LABORATORY',
  'CENTRAL_SUPPLIES',
  'PROFESSIONAL_FEE'
]);

export const chargeCoverageStatusEnum = pgEnum('charge_coverage_status', [
  'COVERED',
  'DISALLOWED_SUNDRY',
  'EXCESS_PF',
  'CONTESTED',
  'SUPERVISORY_WAIVED',
  'PARTIAL',
  'DISPUTED',
  'WAIVED'
]);

export const disputeStatusEnum = pgEnum('dispute_status', [
  'OPEN',
  'FROZEN',
  'SUPERVISOR_WAIVED',
  'HMO_RECONSIDERED',
  'UPHELD'
]);

export const hmoFinalLoaStatusEnum = pgEnum('hmo_final_loa_status', [
  'PENDING_SUBMISSION',
  'AWAITING_CODE',
  'APPROVED',
  'DISALLOWED_ITEMS',
  'UNDER_REVIEW',
  'PARTIALLY_APPROVED',
  'REJECTED'
]);

export const claimSubmissionStatusEnum = pgEnum('claim_submission_status', [
  'CLEAN',
  'WARNING',
  'INTERCEPTED',
  'TRANSMITTED',
  'RETURNED',
  'APPROVED'
]);

export const gatePassStatusEnum = pgEnum('gate_pass_status', [
  'ACTIVE_READY_FOR_EXIT',
  'VERIFIED_AT_LOBBY',
  'EXPIRED'
]);

export const borrowerIdTypeEnum = pgEnum('borrower_id_type', [
  'PHILSYS_NATIONAL_ID',
  'UMID',
  'DRIVERS_LICENSE',
  'PASSPORT'
]);

export const bedStatusEnum = pgEnum('bed_status', [
  'AVAILABLE',
  'OCCUPIED',
  'HOUSEKEEPING',
  'MAINTENANCE',
  'ADMINISTRATIVE_HOLD'
]);

// ----------------------------------------------------------------------
// 1. Facilities (Multi-Tenant Anchor)
// ----------------------------------------------------------------------
export const facilities = pgTable('facilities', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: varchar('code', { length: 32 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  tin: varchar('tin', { length: 32 }).notNull(),
  philhealthPan: varchar('philhealth_pan', { length: 64 }).notNull(),
  address: text('address').notNull(),
  contactPhone: varchar('contact_phone', { length: 32 }).notNull(),
  totalBeds: integer('total_beds').notNull().default(200),
  hitpClientId: varchar('hitp_client_id', { length: 64 }).notNull(),
  hitpSecretHash: varchar('hitp_secret_hash', { length: 255 }).notNull(),
  syncIntervalMs: integer('sync_interval_ms').notNull().default(1000),
  slaWarningThreshold: integer('sla_warning_threshold').notNull().default(25),
  slaBreachThreshold: integer('sla_breach_threshold').notNull().default(40),
  doctorPfTimeoutMinutes: integer('doctor_pf_timeout_minutes').notNull().default(15),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

// ----------------------------------------------------------------------
// 2. System Users
// ----------------------------------------------------------------------
export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    facilityId: uuid('facility_id')
      .notNull()
      .references(() => facilities.id, { onDelete: 'restrict' }),
    username: varchar('username', { length: 64 }).notNull().unique(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    salt: varchar('salt', { length: 64 }).notNull(),
    fullName: varchar('full_name', { length: 255 }).notNull(),
    role: userRoleEnum('role').notNull(),
    title: varchar('title', { length: 128 }).notNull(),
    avatarInitials: varchar('avatar_initials', { length: 4 }).notNull(),
    prcLicense: varchar('prc_license', { length: 64 }),
    panNumber: varchar('pan_number', { length: 64 }),
    contactNumber: varchar('contact_number', { length: 32 }),
    linkedMrn: varchar('linked_mrn', { length: 64 }),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    facilityRoleIdx: index('idx_users_facility_role').on(table.facilityId, table.role)
  })
);

// ----------------------------------------------------------------------
// 3. Database-Backed Sessions
// ----------------------------------------------------------------------
export const userSessions = pgTable(
  'user_sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: varchar('token_hash', { length: 64 }).notNull().unique(),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    lookupIdx: index('idx_user_sessions_lookup').on(table.tokenHash, table.expiresAt)
  })
);

// ----------------------------------------------------------------------
// 4. 200-Bed Hospital Inventory
// ----------------------------------------------------------------------
export const beds = pgTable(
  'beds',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    facilityId: uuid('facility_id')
      .notNull()
      .references(() => facilities.id, { onDelete: 'restrict' }),
    bedNumber: varchar('bed_number', { length: 32 }).notNull(),
    wardName: varchar('ward_name', { length: 64 }).notNull(),
    floorNumber: integer('floor_number').notNull(),
    roomCategory: varchar('room_category', { length: 32 }).notNull(),
    dailyRate: numeric('daily_rate', { precision: 15, scale: 2 }).notNull(),
    status: bedStatusEnum('status').notNull().default('AVAILABLE'),
    currentEncounterId: uuid('current_encounter_id'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    facilityBedUq: unique('uq_facility_bed').on(table.facilityId, table.bedNumber),
    facilityStatusIdx: index('idx_beds_facility_status').on(table.facilityId, table.status)
  })
);

// ----------------------------------------------------------------------
// 5. Patients (PHI Sensitive Data under RA 10173)
// ----------------------------------------------------------------------
export const patients = pgTable(
  'patients',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    facilityId: uuid('facility_id')
      .notNull()
      .references(() => facilities.id, { onDelete: 'restrict' }),
    mrn: varchar('mrn', { length: 64 }).notNull(),
    fullName: varchar('full_name', { length: 255 }).notNull(),
    dateOfBirth: timestamp('date_of_birth').notNull(),
    gender: varchar('gender', { length: 1 }).notNull(),
    contactNumber: varchar('contact_number', { length: 32 }).notNull(),
    philhealthPin: varchar('philhealth_pin', { length: 32 }),
    isSeniorCitizen: boolean('is_senior_citizen').notNull().default(false),
    seniorCitizenId: varchar('senior_citizen_id', { length: 64 }),
    isPwd: boolean('is_pwd').notNull().default(false),
    pwdId: varchar('pwd_id', { length: 64 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    facilityMrnUq: unique('uq_patient_facility_mrn').on(table.facilityId, table.mrn),
    mrnIdx: index('idx_patients_mrn').on(table.facilityId, table.mrn)
  })
);

// ----------------------------------------------------------------------
// 6. Encounters
// ----------------------------------------------------------------------
export const encounters = pgTable(
  'encounters',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    facilityId: uuid('facility_id')
      .notNull()
      .references(() => facilities.id, { onDelete: 'restrict' }),
    patientId: uuid('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'restrict' }),
    encounterNumber: varchar('encounter_number', { length: 64 }).notNull().unique(),
    bedId: uuid('bed_id').references(() => beds.id, { onDelete: 'restrict' }),
    roomBed: varchar('room_bed', { length: 64 }).notNull(),
    roomCategory: varchar('room_category', { length: 32 }).notNull(),
    dailyRoomRate: numeric('daily_room_rate', { precision: 15, scale: 2 }).notNull(),
    dailyRoomAllowance: numeric('daily_room_allowance', { precision: 15, scale: 2 }).notNull().default('0.00'),
    admissionTimestamp: timestamp('admission_timestamp', { withTimezone: true }).notNull(),
    mghOrderTimestamp: timestamp('mgh_order_timestamp', { withTimezone: true }),
    dischargeTimestamp: timestamp('discharge_timestamp', { withTimezone: true }),
    attendingPhysicianId: uuid('attending_physician_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    doctorPan: varchar('doctor_pan', { length: 64 }).notNull(),
    doctorAgreedFee: numeric('doctor_agreed_fee', { precision: 15, scale: 2 }).notNull().default('0.00'),
    doctorExcessPf: numeric('doctor_excess_pf', { precision: 15, scale: 2 }).notNull().default('0.00'),
    doctorSignedAt: timestamp('doctor_signed_at', { withTimezone: true }),
    pharmacyRtsCleared: boolean('pharmacy_rts_cleared').notNull().default(false),
    unreturnedMedsCount: integer('unreturned_meds_count').notNull().default(0),
    stage: dischargeStageEnum('stage').notNull().default('MGH_DECLARED'),
    stageEnteredAt: timestamp('stage_entered_at', { withTimezone: true }).defaultNow().notNull(),
    elapsedMinutes: integer('elapsed_minutes').notNull().default(0),
    slaStatus: slaStatusEnum('sla_status').notNull().default('NORMAL'),
    primaryIcd10: varchar('primary_icd10', { length: 16 }).notNull(),
    primaryDiagnosis: text('primary_diagnosis').notNull(),
    billState: billLifecycleStateEnum('bill_state').notNull().default('DRAFT'),
    billNumber: varchar('bill_number', { length: 64 }),
    amountPaid: numeric('amount_paid', { precision: 15, scale: 2 }).notNull().default('0.00'),
    remainingBalance: numeric('remaining_balance', { precision: 15, scale: 2 }).notNull().default('0.00'),
    magicTokenHash: varchar('magic_token_hash', { length: 64 }),
    magicTokenExpiresAt: timestamp('magic_token_expires_at', { withTimezone: true }),
    billFinalizedAt: timestamp('bill_finalized_at', { withTimezone: true }),
    billSentAt: timestamp('bill_sent_at', { withTimezone: true }),
    billFirstViewedAt: timestamp('bill_first_viewed_at', { withTimezone: true }),
    version: integer('version').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    facilityStageIdx: index('idx_encounters_facility_stage').on(table.facilityId, table.stage),
    mghTimeIdx: index('idx_encounters_mgh_time').on(table.mghOrderTimestamp),
    magicTokenIdx: index('idx_encounters_magic_token').on(table.magicTokenHash)
  })
);

// ----------------------------------------------------------------------
// 7. Itemized Chargemaster Ledger
// ----------------------------------------------------------------------
export const chargemasterItems = pgTable(
  'chargemaster_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    encounterId: uuid('encounter_id')
      .notNull()
      .references(() => encounters.id, { onDelete: 'cascade' }),
    code: varchar('code', { length: 64 }).notNull(),
    description: text('description').notNull(),
    category: chargeCategoryEnum('category').notNull(),
    quantity: numeric('quantity', { precision: 10, scale: 2 }).notNull().default('1.00'),
    unitPrice: numeric('unit_price', { precision: 15, scale: 2 }).notNull(),
    grossAmount: numeric('gross_amount', { precision: 15, scale: 2 }).notNull(),
    isVatable: boolean('is_vatable').notNull().default(true),
    philhealthCovered: numeric('philhealth_covered', { precision: 15, scale: 2 }).notNull().default('0.00'),
    hmoCovered: numeric('hmo_covered', { precision: 15, scale: 2 }).notNull().default('0.00'),
    patientOop: numeric('patient_oop', { precision: 15, scale: 2 }).notNull(),
    status: chargeCoverageStatusEnum('status').notNull().default('COVERED'),
    exclusionReasonClause: text('exclusion_reason_clause'),
    plainLanguageExplainer: text('plain_language_explainer').notNull(),
    isDisputed: boolean('is_disputed').notNull().default(false),
    disputeReason: text('dispute_reason'),
    postedAt: timestamp('posted_at', { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    encounterIdx: index('idx_chargemaster_encounter').on(table.encounterId),
    disputeIdx: index('idx_chargemaster_dispute').on(table.encounterId, table.isDisputed)
  })
);

// ----------------------------------------------------------------------
// 8. Statutory Waterfall Financial Snapshots
// ----------------------------------------------------------------------
export const statutoryWaterfalls = pgTable('statutory_waterfalls', {
  id: uuid('id').defaultRandom().primaryKey(),
  encounterId: uuid('encounter_id')
    .notNull()
    .unique()
    .references(() => encounters.id, { onDelete: 'cascade' }),
  grossHospitalCharges: numeric('gross_hospital_charges', { precision: 15, scale: 2 }).notNull(),
  grossDoctorFee: numeric('gross_doctor_fee', { precision: 15, scale: 2 }).notNull(),
  grossTotal: numeric('gross_total', { precision: 15, scale: 2 }).notNull(),
  vatExemption: numeric('vat_exemption', { precision: 15, scale: 2 }).notNull().default('0.00'),
  seniorPwdDiscount: numeric('senior_pwd_discount', { precision: 15, scale: 2 }).notNull().default('0.00'),
  netVatDiscountedBase: numeric('net_vat_discounted_base', { precision: 15, scale: 2 }).notNull(),
  philhealthHci: numeric('philhealth_hci', { precision: 15, scale: 2 }).notNull().default('0.00'),
  philhealthPf: numeric('philhealth_pf', { precision: 15, scale: 2 }).notNull().default('0.00'),
  philhealthTotal: numeric('philhealth_total', { precision: 15, scale: 2 }).notNull().default('0.00'),
  hmoApprovedAmount: numeric('hmo_approved_amount', { precision: 15, scale: 2 }).notNull().default('0.00'),
  roomUpgradeExcess: numeric('room_upgrade_excess', { precision: 15, scale: 2 }).notNull().default('0.00'),
  excludedConsumables: numeric('excluded_consumables', { precision: 15, scale: 2 }).notNull().default('0.00'),
  doctorExcessPf: numeric('doctor_excess_pf', { precision: 15, scale: 2 }).notNull().default('0.00'),
  coverageShortfall: numeric('coverage_shortfall', { precision: 15, scale: 2 }).notNull().default('0.00'),
  netPatientDue: numeric('net_patient_due', { precision: 15, scale: 2 }).notNull(),
  patientPaid: numeric('patient_paid', { precision: 15, scale: 2 }).notNull().default('0.00'),
  reconciledAt: timestamp('reconciled_at', { withTimezone: true }).defaultNow().notNull()
});

// ----------------------------------------------------------------------
// 9. PhilHealth Claims & Pre-Flight Compliance
// ----------------------------------------------------------------------
export const philhealthClaims = pgTable(
  'philhealth_claims',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    encounterId: uuid('encounter_id')
      .notNull()
      .unique()
      .references(() => encounters.id, { onDelete: 'cascade' }),
    claimNumber: varchar('claim_number', { length: 64 }).notNull().unique(),
    primaryIcd10: varchar('primary_icd10', { length: 16 }).notNull(),
    primaryDescription: text('primary_description').notNull(),
    caseRateCode: varchar('case_rate_code', { length: 32 }).notNull(),
    totalCaseRate: numeric('total_case_rate', { precision: 15, scale: 2 }).notNull(),
    hciAmount: numeric('hci_amount', { precision: 15, scale: 2 }).notNull(),
    pfAmount: numeric('pf_amount', { precision: 15, scale: 2 }).notNull(),
    isNbb: boolean('is_nbb').notNull().default(false),
    rthRiskScore: numeric('rth_risk_score', { precision: 5, scale: 4 }).notNull().default('0.0000'),
    cf4VitalsRecorded: boolean('cf4_vitals_recorded').notNull().default(false),
    cf4CourseInWardRecorded: boolean('cf4_course_in_ward_recorded').notNull().default(false),
    cf4LabsConsistent: boolean('cf4_labs_consistent').notNull().default(false),
    esoaXmlConformity: boolean('esoa_xml_conformity').notNull().default(false),
    esoaXmlR2Key: varchar('esoa_xml_r2_key', { length: 255 }),
    status: claimSubmissionStatusEnum('status').notNull().default('CLEAN'),
    claimAgingDays: integer('claim_aging_days').notNull().default(0),
    assignedAuditorId: uuid('assigned_auditor_id').references(() => users.id),
    deficiencyReason: text('deficiency_reason'),
    transmittedAt: timestamp('transmitted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    statusIdx: index('idx_philhealth_claims_status').on(table.status, table.rthRiskScore)
  })
);

// ----------------------------------------------------------------------
// 10. Commercial HMO Authorizations
// ----------------------------------------------------------------------
export const hmoAuthorizations = pgTable(
  'hmo_authorizations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    encounterId: uuid('encounter_id')
      .notNull()
      .unique()
      .references(() => encounters.id, { onDelete: 'cascade' }),
    providerName: varchar('provider_name', { length: 64 }).notNull(),
    cardNumberMasked: varchar('card_number_masked', { length: 32 }).notNull(),
    loaNumber: varchar('loa_number', { length: 64 }),
    policyMbl: numeric('policy_mbl', { precision: 15, scale: 2 }).notNull(),
    mblRemaining: numeric('mbl_remaining', { precision: 15, scale: 2 }).notNull(),
    dailyRoomAllowance: numeric('daily_room_allowance', { precision: 15, scale: 2 }).notNull(),
    initialLoaApproved: boolean('initial_loa_approved').notNull().default(false),
    finalLoaStatus: hmoFinalLoaStatusEnum('final_loa_status').notNull().default('PENDING_SUBMISSION'),
    approvalCode: varchar('approval_code', { length: 64 }),
    approvedAmount: numeric('approved_amount', { precision: 15, scale: 2 }).notNull().default('0.00'),
    disallowedConsumables: numeric('disallowed_consumables', { precision: 15, scale: 2 }).notNull().default('0.00'),
    turnaroundMinutes: integer('turnaround_minutes').default(0),
    adjusterName: varchar('adjuster_name', { length: 128 }),
    adjusterContact: varchar('adjuster_contact', { length: 64 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    statusIdx: index('idx_hmo_authorizations_status').on(table.finalLoaStatus)
  })
);

// ----------------------------------------------------------------------
// 11. Promissory Notes (RA 9439 0% Interest Mandate)
// ----------------------------------------------------------------------
export const promissoryNotes = pgTable('promissory_notes', {
  id: uuid('id').defaultRandom().primaryKey(),
  noteNumber: varchar('note_number', { length: 64 }).notNull().unique(),
  encounterId: uuid('encounter_id')
    .notNull()
    .references(() => encounters.id, { onDelete: 'restrict' }),
  borrowerName: varchar('borrower_name', { length: 255 }).notNull(),
  borrowerRelationship: varchar('borrower_relationship', { length: 32 }).notNull().default('GUARANTOR'),
  borrowerIdType: borrowerIdTypeEnum('borrower_id_type').notNull(),
  borrowerIdNumber: varchar('borrower_id_number', { length: 64 }).notNull(),
  principalAmount: numeric('principal_amount', { precision: 15, scale: 2 }).notNull(),
  interestRate: numeric('interest_rate', { precision: 5, scale: 4 }).notNull().default('0.0000'),
  financingFee: numeric('financing_fee', { precision: 15, scale: 2 }).notNull().default('0.00'),
  totalRepayment: numeric('total_repayment', { precision: 15, scale: 2 }).notNull(),
  installmentMonths: integer('installment_months').notNull(),
  monthlyInstallment: numeric('monthly_installment', { precision: 15, scale: 2 }).notNull(),
  scheduleJson: jsonb('schedule_json').notNull(),
  firstDueDate: timestamp('first_due_date').notNull(),
  digitalSignatureTimestamp: timestamp('digital_signature_timestamp', { withTimezone: true }).defaultNow().notNull(),
  digitalSignatureHash: varchar('digital_signature_hash', { length: 255 }).notNull(),
  pdfR2Key: varchar('pdf_r2_key', { length: 255 }),
  status: varchar('status', { length: 32 }).notNull().default('ACTIVE'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

// ----------------------------------------------------------------------
// 12. Discharge Passes (HMAC Digital Gate Passes)
// ----------------------------------------------------------------------
export const dischargePasses = pgTable(
  'discharge_passes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    passNumber: varchar('pass_number', { length: 64 }).notNull().unique(),
    encounterId: uuid('encounter_id')
      .notNull()
      .references(() => encounters.id, { onDelete: 'restrict' }),
    patientName: varchar('patient_name', { length: 255 }).notNull(),
    roomBed: varchar('room_bed', { length: 64 }).notNull(),
    settledAmount: numeric('settled_amount', { precision: 15, scale: 2 }).notNull(),
    settlementChannel: paymentRailEnum('settlement_channel').notNull(),
    promissoryNoteId: uuid('promissory_note_id').references(() => promissoryNotes.id),
    hmacSignature: varchar('hmac_signature', { length: 255 }).notNull(),
    exitPin: varchar('exit_pin', { length: 4 }).notNull(),
    status: gatePassStatusEnum('status').notNull().default('ACTIVE_READY_FOR_EXIT'),
    qrPayloadR2Key: varchar('qr_payload_r2_key', { length: 255 }),
    issuedAt: timestamp('issued_at', { withTimezone: true }).defaultNow().notNull(),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    verifiedByUserId: uuid('verified_by_user_id').references(() => users.id, { onDelete: 'restrict' })
  },
  (table) => ({
    numberIdx: index('idx_discharge_passes_number').on(table.passNumber),
    hmacIdx: index('idx_discharge_passes_hmac').on(table.hmacSignature)
  })
);

// ----------------------------------------------------------------------
// 13. Payments & Settlements (With Idempotency)
// ----------------------------------------------------------------------
export const payments = pgTable(
  'payments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    paymentReference: varchar('payment_reference', { length: 64 }).notNull().unique(),
    encounterId: uuid('encounter_id')
      .notNull()
      .references(() => encounters.id, { onDelete: 'restrict' }),
    statementNumber: varchar('statement_number', { length: 64 }).notNull(),
    amount: numeric('amount', { precision: 15, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('PHP'),
    paymentRail: paymentRailEnum('payment_rail').notNull(),
    channelReference: varchar('channel_reference', { length: 128 }).notNull(),
    gatewayAuthCode: varchar('gateway_auth_code', { length: 64 }).notNull(),
    officialReceiptNumber: varchar('official_receipt_number', { length: 64 }).notNull().unique(),
    payerName: varchar('payer_name', { length: 255 }).notNull(),
    payerContactMasked: varchar('payer_contact_masked', { length: 64 }).notNull(),
    cardBrand: varchar('card_brand', { length: 16 }),
    cardLast4: varchar('card_last4', { length: 4 }),
    bankName: varchar('bank_name', { length: 64 }),
    status: paymentStatusEnum('status').notNull().default('SUCCESS'),
    failureReason: text('failure_reason'),
    isSimulatedDemo: boolean('is_simulated_demo').notNull().default(false),
    idempotencyKey: varchar('idempotency_key', { length: 128 }).notNull().unique(),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    settledAt: timestamp('settled_at', { withTimezone: true })
  },
  (table) => ({
    encounterIdx: index('idx_payments_encounter').on(table.encounterId),
    idempotencyIdx: index('idx_payments_idempotency').on(table.idempotencyKey)
  })
);

// ----------------------------------------------------------------------
// 14. BIR Official Receipts
// ----------------------------------------------------------------------
export const paymentReceipts = pgTable('payment_receipts', {
  id: uuid('id').defaultRandom().primaryKey(),
  paymentId: uuid('payment_id')
    .notNull()
    .unique()
    .references(() => payments.id, { onDelete: 'cascade' }),
  encounterId: uuid('encounter_id')
    .notNull()
    .references(() => encounters.id, { onDelete: 'restrict' }),
  receiptNumber: varchar('receipt_number', { length: 64 }).notNull().unique(),
  officialReceiptNumber: varchar('official_receipt_number', { length: 64 }).notNull().unique(),
  amount: numeric('amount', { precision: 15, scale: 2 }).notNull(),
  paymentRail: paymentRailEnum('payment_rail').notNull(),
  payerName: varchar('payer_name', { length: 255 }).notNull(),
  payerContactMasked: varchar('payer_contact_masked', { length: 64 }).notNull(),
  gatewayAuthCode: varchar('gateway_auth_code', { length: 64 }),
  pdfR2Key: varchar('pdf_r2_key', { length: 255 }),
  issuedAt: timestamp('issued_at', { withTimezone: true }).defaultNow().notNull()
});

// ----------------------------------------------------------------------
// 15. Billing Disputes & Exceptions
// ----------------------------------------------------------------------
export const billingDisputes = pgTable(
  'billing_disputes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    encounterId: uuid('encounter_id')
      .notNull()
      .references(() => encounters.id, { onDelete: 'restrict' }),
    chargeId: uuid('charge_id')
      .notNull()
      .references(() => chargemasterItems.id, { onDelete: 'restrict' }),
    itemDescription: text('item_description').notNull(),
    contestedAmount: numeric('contested_amount', { precision: 15, scale: 2 }).notNull(),
    reason: text('reason').notNull(),
    disputeCategory: varchar('dispute_category', { length: 32 }).notNull(),
    status: disputeStatusEnum('status').notNull().default('OPEN'),
    supervisorNotes: text('supervisor_notes'),
    assignedStaffId: uuid('assigned_staff_id').references(() => users.id, { onDelete: 'set null' }),
    resolvedByUserId: uuid('resolved_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    resolutionClause: text('resolution_clause'),
    department: varchar('department', { length: 64 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    resolvedAt: timestamp('resolved_at', { withTimezone: true })
  },
  (table) => ({
    encounterStatusIdx: index('idx_billing_disputes_encounter').on(table.encounterId, table.status)
  })
);

// ----------------------------------------------------------------------
// 16. Encounter Clinical & Administrative Timeline Events
// ----------------------------------------------------------------------
export const encounterTimelineEvents = pgTable(
  'encounter_timeline_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    encounterId: uuid('encounter_id')
      .notNull()
      .references(() => encounters.id, { onDelete: 'cascade' }),
    eventType: varchar('event_type', { length: 32 }).notNull(),
    title: varchar('title', { length: 128 }).notNull(),
    description: text('description').notNull(),
    actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null' }),
    actorName: varchar('actor_name', { length: 128 }).notNull(),
    status: varchar('status', { length: 32 }).notNull(),
    eventTimestamp: timestamp('event_timestamp', { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    timelineIdx: index('idx_timeline_encounter').on(table.encounterId, table.eventTimestamp)
  })
);

// ----------------------------------------------------------------------
// 17. Regulatory Immutable Audit Log (RA 10173 Compliance)
// ----------------------------------------------------------------------
export const systemAuditLogs = pgTable(
  'system_audit_logs',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    facilityId: uuid('facility_id')
      .notNull()
      .references(() => facilities.id, { onDelete: 'restrict' }),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    actorRole: varchar('actor_role', { length: 32 }),
    action: varchar('action', { length: 64 }).notNull(),
    resourceType: varchar('resource_type', { length: 64 }).notNull(),
    resourceId: varchar('resource_id', { length: 64 }).notNull(),
    previousState: jsonb('previous_state'),
    newState: jsonb('new_state'),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    resourceIdx: index('idx_audit_logs_resource').on(table.resourceType, table.resourceId),
    facilityTimeIdx: index('idx_audit_logs_facility_time').on(table.facilityId, table.createdAt)
  })
);

// ----------------------------------------------------------------------
// Drizzle Relations
// ----------------------------------------------------------------------
export const facilitiesRelations = relations(facilities, ({ many }) => ({
  users: many(users),
  beds: many(beds),
  patients: many(patients),
  encounters: many(encounters),
  auditLogs: many(systemAuditLogs)
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  facility: one(facilities, { fields: [users.facilityId], references: [facilities.id] }),
  sessions: many(userSessions),
  assignedClaims: many(philhealthClaims),
  verifiedPasses: many(dischargePasses),
  disputesHandled: many(billingDisputes)
}));

export const encountersRelations = relations(encounters, ({ one, many }) => ({
  facility: one(facilities, { fields: [encounters.facilityId], references: [facilities.id] }),
  patient: one(patients, { fields: [encounters.patientId], references: [patients.id] }),
  bed: one(beds, { fields: [encounters.bedId], references: [beds.id] }),
  attendingPhysician: one(users, { fields: [encounters.attendingPhysicianId], references: [users.id] }),
  items: many(chargemasterItems),
  waterfall: one(statutoryWaterfalls),
  philhealthClaim: one(philhealthClaims),
  hmoAuthorization: one(hmoAuthorizations),
  promissoryNotes: many(promissoryNotes),
  dischargePasses: many(dischargePasses),
  payments: many(payments),
  disputes: many(billingDisputes),
  timelineEvents: many(encounterTimelineEvents)
}));

export const statutoryWaterfallsRelations = relations(statutoryWaterfalls, ({ one }) => ({
  encounter: one(encounters, { fields: [statutoryWaterfalls.encounterId], references: [encounters.id] })
}));

export const chargemasterItemsRelations = relations(chargemasterItems, ({ one }) => ({
  encounter: one(encounters, { fields: [chargemasterItems.encounterId], references: [encounters.id] })
}));

export const philhealthClaimsRelations = relations(philhealthClaims, ({ one }) => ({
  encounter: one(encounters, { fields: [philhealthClaims.encounterId], references: [encounters.id] }),
  assignedAuditor: one(users, { fields: [philhealthClaims.assignedAuditorId], references: [users.id] })
}));

export const hmoAuthorizationsRelations = relations(hmoAuthorizations, ({ one }) => ({
  encounter: one(encounters, { fields: [hmoAuthorizations.encounterId], references: [encounters.id] })
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  encounter: one(encounters, { fields: [payments.encounterId], references: [encounters.id] }),
  receipt: one(paymentReceipts)
}));

export const paymentReceiptsRelations = relations(paymentReceipts, ({ one }) => ({
  payment: one(payments, { fields: [paymentReceipts.paymentId], references: [payments.id] }),
  encounter: one(encounters, { fields: [paymentReceipts.encounterId], references: [encounters.id] })
}));

// Read acknowledgements belong to an authenticated staff member, not the event itself.
export const staffNotificationReads = pgTable('staff_notification_reads', {
  facilityId: uuid('facility_id').notNull().references(() => facilities.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  notificationId: varchar('notification_id', { length: 128 }).notNull(),
  readAt: timestamp('read_at', { withTimezone: true }).notNull().defaultNow()
}, table => ({ pk: primaryKey({ columns: [table.facilityId, table.userId, table.notificationId] }) }));
