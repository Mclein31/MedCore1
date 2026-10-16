/**
 * MedCore schema. Rules applied throughout:
 * - Money is bigint centavos with CHECK (>= 0). Never float, never numeric strings.
 * - Every foreign key is ON DELETE RESTRICT. Financial history is never deleted;
 *   stays are voided, charges are reversed, sessions are revoked.
 * - Sensitive identifiers (PhilHealth PIN, discount IDs, borrower IDs, phone) are
 *   AES-GCM encrypted in the app (`*_enc`), with only the last 4 digits in clear.
 * - Business dates are `date`; instants are `timestamptz`.
 * - The audit log is append-only (trigger in the custom migration).
 */
import { sql } from 'drizzle-orm';
import {
  bigint,
  bigserial,
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';

const cents = (name: string) => bigint(name, { mode: 'number' });
const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp('updated_at', { withTimezone: true }).notNull().defaultNow();
const instant = (name: string) => timestamp(name, { withTimezone: true });

export const staffRole = pgEnum('staff_role', [
  'HOSPITAL_CFO',
  'BILLING_SPECIALIST',
  'CLAIMS_ENCODER',
  'HMO_COORDINATOR',
  'ATTENDING_PHYSICIAN',
  'LOBBY_SECURITY',
]);
export const dischargeStage = pgEnum('discharge_stage', [
  'ADMITTED',
  'MGH_DECLARED',
  'DOCTOR_PF_PENDING',
  'PHARMACY_RTS_AUDIT',
  'HMO_FINAL_LOA',
  'PENDING_SETTLEMENT',
  'CLEARED',
]);
export const billState = pgEnum('bill_state', ['DRAFT', 'FINALIZED', 'SENT', 'PARTIALLY_PAID', 'SETTLED']);
export const chargeCategory = pgEnum('charge_category', [
  'ROOM_AND_BOARD',
  'PHARMACY',
  'LABORATORY',
  'IMAGING',
  'SUPPLIES',
  'PROCEDURE',
  'PROFESSIONAL_FEE',
]);
export const chargeCoverage = pgEnum('charge_coverage', ['COVERED', 'EXCLUDED', 'WAIVED']);
export const bedStatus = pgEnum('bed_status', ['AVAILABLE', 'OCCUPIED', 'HOUSEKEEPING', 'MAINTENANCE']);
export const discountKind = pgEnum('discount_kind', ['NONE', 'SENIOR', 'PWD']);
export const paymentRail = pgEnum('payment_rail', [
  'CASH',
  'CARD_TERMINAL',
  'CARD',
  'BANK_TRANSFER',
  'GCASH',
  'MAYA',
  'QR_PH',
]);
export const claimStatus = pgEnum('claim_status', ['DRAFT', 'READY', 'TRANSMITTED', 'RETURNED', 'PAID']);
export const loaStatus = pgEnum('loa_status', ['PENDING', 'APPROVED', 'REJECTED']);
export const disputeStatus = pgEnum('dispute_status', ['OPEN', 'WAIVED', 'UPHELD']);
export const noteStatus = pgEnum('note_status', ['ACTIVE', 'SETTLED', 'CANCELLED']);
export const passStatus = pgEnum('pass_status', ['ACTIVE', 'USED', 'VOIDED']);
export const principalType = pgEnum('principal_type', ['STAFF', 'PATIENT']);
export const challengeKind = pgEnum('challenge_kind', ['MFA_VERIFY', 'MFA_ENROLL']);
export const codePurpose = pgEnum('code_purpose', ['LOGIN', 'REGISTER']);

// ---------------------------------------------------------------- tenancy
export const facilities = pgTable('facilities', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 32 }).notNull().unique(),
  name: varchar('name', { length: 200 }).notNull(),
  tin: varchar('tin', { length: 20 }).notNull(),
  philhealthAccreditation: varchar('philhealth_accreditation', { length: 32 }).notNull(),
  address: varchar('address', { length: 300 }).notNull(),
  slaWarningMinutes: integer('sla_warning_minutes').notNull().default(25),
  slaBreachMinutes: integer('sla_breach_minutes').notNull().default(40),
  createdAt: createdAt(),
});

// ---------------------------------------------------------------- staff identity
export const staffUsers = pgTable(
  'staff_users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    facilityId: uuid('facility_id')
      .notNull()
      .references(() => facilities.id, { onDelete: 'restrict' }),
    email: varchar('email', { length: 254 }).notNull(),
    fullName: varchar('full_name', { length: 120 }).notNull(),
    role: staffRole('role').notNull(),
    title: varchar('title', { length: 80 }).notNull(),
    prcLicense: varchar('prc_license', { length: 16 }),
    passwordHash: varchar('password_hash', { length: 200 }),
    passwordChangedAt: instant('password_changed_at'),
    failedLoginCount: integer('failed_login_count').notNull().default(0),
    lockedUntil: instant('locked_until'),
    mfaSecretEnc: text('mfa_secret_enc'),
    mfaPendingSecretEnc: text('mfa_pending_secret_enc'),
    mfaEnabledAt: instant('mfa_enabled_at'),
    mfaLastStep: bigint('mfa_last_step', { mode: 'number' }),
    inviteTokenHash: varchar('invite_token_hash', { length: 64 }),
    inviteExpiresAt: instant('invite_expires_at'),
    isActive: boolean('is_active').notNull().default(true),
    lastLoginAt: instant('last_login_at'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('staff_users_email_lower_uq').on(sql`lower(${t.email})`),
    uniqueIndex('staff_users_invite_uq').on(t.inviteTokenHash),
    index('staff_users_facility_idx').on(t.facilityId, t.role),
    check('staff_users_email_lowercase', sql`${t.email} = lower(${t.email})`),
    check('staff_users_failed_nonneg', sql`${t.failedLoginCount} >= 0`),
    check('staff_users_mfa_consistent', sql`(${t.mfaEnabledAt} IS NULL) = (${t.mfaSecretEnc} IS NULL)`),
  ],
);

export const staffRecoveryCodes = pgTable(
  'staff_recovery_codes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    staffUserId: uuid('staff_user_id')
      .notNull()
      .references(() => staffUsers.id, { onDelete: 'restrict' }),
    codeHash: varchar('code_hash', { length: 64 }).notNull(),
    usedAt: instant('used_at'),
    createdAt: createdAt(),
  },
  (t) => [index('staff_recovery_codes_user_idx').on(t.staffUserId)],
);

/** Short-lived second step of a staff login (MFA verify or first-time enrollment). */
export const authChallenges = pgTable(
  'auth_challenges',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tokenHash: varchar('token_hash', { length: 64 }).notNull().unique(),
    staffUserId: uuid('staff_user_id')
      .notNull()
      .references(() => staffUsers.id, { onDelete: 'restrict' }),
    kind: challengeKind('kind').notNull(),
    attempts: integer('attempts').notNull().default(0),
    expiresAt: instant('expires_at').notNull(),
    consumedAt: instant('consumed_at'),
    createdAt: createdAt(),
  },
  (t) => [check('auth_challenges_attempts_nonneg', sql`${t.attempts} >= 0`)],
);

// ---------------------------------------------------------------- patients
export const patients = pgTable(
  'patients',
  {
    id: uuid('id').primaryKey(),
    facilityId: uuid('facility_id')
      .notNull()
      .references(() => facilities.id, { onDelete: 'restrict' }),
    mrn: varchar('mrn', { length: 32 }).notNull(),
    fullName: varchar('full_name', { length: 120 }).notNull(),
    dateOfBirth: date('date_of_birth', { mode: 'string' }).notNull(),
    sex: varchar('sex', { length: 1 }).notNull(),
    contactPhoneEnc: text('contact_phone_enc').notNull(),
    contactPhoneLast4: varchar('contact_phone_last4', { length: 4 }).notNull(),
    /** Recorded by the hospital at admission. Sign-in codes go only here. */
    email: varchar('email', { length: 254 }),
    philhealthPinEnc: text('philhealth_pin_enc'),
    philhealthPinLast4: varchar('philhealth_pin_last4', { length: 4 }),
    discountKind: discountKind('discount_kind').notNull().default('NONE'),
    discountIdEnc: text('discount_id_enc'),
    discountIdLast4: varchar('discount_id_last4', { length: 4 }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('patients_facility_mrn_uq').on(t.facilityId, t.mrn),
    index('patients_facility_email_idx').on(t.facilityId, t.email),
    index('patients_name_idx').on(t.facilityId, t.fullName),
    check('patients_sex', sql`${t.sex} IN ('F','M','X')`),
    check('patients_email_lowercase', sql`${t.email} IS NULL OR ${t.email} = lower(${t.email})`),
    check('patients_discount_id', sql`(${t.discountKind} = 'NONE') = (${t.discountIdEnc} IS NULL)`),
  ],
);

/** A patient-side login (patient or guarantor). Never has staff permissions. */
export const patientAccounts = pgTable(
  'patient_accounts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    facilityId: uuid('facility_id')
      .notNull()
      .references(() => facilities.id, { onDelete: 'restrict' }),
    email: varchar('email', { length: 254 }).notNull(),
    isActive: boolean('is_active').notNull().default(true),
    lastLoginAt: instant('last_login_at'),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('patient_accounts_facility_email_uq').on(t.facilityId, t.email),
    check('patient_accounts_email_lowercase', sql`${t.email} = lower(${t.email})`),
  ],
);

export const patientAccountLinks = pgTable(
  'patient_account_links',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => patientAccounts.id, { onDelete: 'restrict' }),
    patientId: uuid('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'restrict' }),
    verifiedVia: varchar('verified_via', { length: 16 }).notNull(),
    verifiedAt: instant('verified_at').notNull().defaultNow(),
    revokedAt: instant('revoked_at'),
  },
  (t) => [
    uniqueIndex('patient_account_links_active_uq')
      .on(t.accountId, t.patientId)
      .where(sql`${t.revokedAt} IS NULL`),
    index('patient_account_links_patient_idx').on(t.patientId),
    check('patient_account_links_via', sql`${t.verifiedVia} IN ('EMAIL_CODE','STAFF_DESK')`),
  ],
);

/** Email sign-in codes. Only a keyed hash is stored, never the code. */
export const loginCodes = pgTable(
  'login_codes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    facilityId: uuid('facility_id')
      .notNull()
      .references(() => facilities.id, { onDelete: 'restrict' }),
    email: varchar('email', { length: 254 }).notNull(),
    purpose: codePurpose('purpose').notNull(),
    patientId: uuid('patient_id').references(() => patients.id, { onDelete: 'restrict' }),
    codeHash: varchar('code_hash', { length: 64 }).notNull(),
    attempts: integer('attempts').notNull().default(0),
    expiresAt: instant('expires_at').notNull(),
    consumedAt: instant('consumed_at'),
    createdAt: createdAt(),
  },
  (t) => [
    index('login_codes_lookup_idx').on(t.facilityId, t.email, t.purpose, t.createdAt),
    check('login_codes_attempts_nonneg', sql`${t.attempts} >= 0`),
    check('login_codes_register_has_patient', sql`${t.purpose} = 'LOGIN' OR ${t.patientId} IS NOT NULL`),
  ],
);

// ---------------------------------------------------------------- sessions
export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tokenHash: varchar('token_hash', { length: 64 }).notNull().unique(),
    principalType: principalType('principal_type').notNull(),
    staffUserId: uuid('staff_user_id').references(() => staffUsers.id, { onDelete: 'restrict' }),
    patientAccountId: uuid('patient_account_id').references(() => patientAccounts.id, {
      onDelete: 'restrict',
    }),
    facilityId: uuid('facility_id')
      .notNull()
      .references(() => facilities.id, { onDelete: 'restrict' }),
    ip: varchar('ip', { length: 64 }),
    userAgent: varchar('user_agent', { length: 255 }),
    createdAt: createdAt(),
    lastSeenAt: instant('last_seen_at').notNull().defaultNow(),
    idleExpiresAt: instant('idle_expires_at').notNull(),
    expiresAt: instant('expires_at').notNull(),
    revokedAt: instant('revoked_at'),
  },
  (t) => [
    index('sessions_staff_idx').on(t.staffUserId),
    index('sessions_patient_idx').on(t.patientAccountId),
    check(
      'sessions_one_principal',
      sql`(${t.principalType} = 'STAFF' AND ${t.staffUserId} IS NOT NULL AND ${t.patientAccountId} IS NULL)
       OR (${t.principalType} = 'PATIENT' AND ${t.patientAccountId} IS NOT NULL AND ${t.staffUserId} IS NULL)`,
    ),
  ],
);

/** Fixed-window counters shared by every API instance (keys are hashed). */
export const rateLimitBuckets = pgTable(
  'rate_limit_buckets',
  {
    key: varchar('key', { length: 64 }).notNull(),
    windowStart: instant('window_start').notNull(),
    count: integer('count').notNull().default(0),
  },
  (t) => [uniqueIndex('rate_limit_buckets_pk').on(t.key, t.windowStart)],
);

/**
 * Gap-free, per-facility document numbers (official receipts must be sequential).
 * Incremented with UPDATE ... RETURNING inside the business transaction.
 */
export const documentCounters = pgTable(
  'document_counters',
  {
    facilityId: uuid('facility_id')
      .notNull()
      .references(() => facilities.id, { onDelete: 'restrict' }),
    kind: varchar('kind', { length: 16 }).notNull(),
    year: integer('year').notNull(),
    nextValue: bigint('next_value', { mode: 'number' }).notNull().default(1),
  },
  (t) => [
    uniqueIndex('document_counters_pk').on(t.facilityId, t.kind, t.year),
    check('document_counters_positive', sql`${t.nextValue} > 0`),
  ],
);

// ---------------------------------------------------------------- beds and stays
export const beds = pgTable(
  'beds',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    facilityId: uuid('facility_id')
      .notNull()
      .references(() => facilities.id, { onDelete: 'restrict' }),
    code: varchar('code', { length: 16 }).notNull(),
    ward: varchar('ward', { length: 64 }).notNull(),
    floor: integer('floor').notNull(),
    roomCategory: varchar('room_category', { length: 32 }).notNull(),
    dailyRateCents: cents('daily_rate_cents').notNull(),
    status: bedStatus('status').notNull().default('AVAILABLE'),
    currentEncounterId: uuid('current_encounter_id').references((): AnyPgColumn => encounters.id, {
      onDelete: 'restrict',
    }),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('beds_facility_code_uq').on(t.facilityId, t.code),
    uniqueIndex('beds_current_encounter_uq').on(t.currentEncounterId),
    check('beds_rate_nonneg', sql`${t.dailyRateCents} >= 0`),
    check('beds_occupancy', sql`(${t.status} = 'OCCUPIED') = (${t.currentEncounterId} IS NOT NULL)`),
  ],
);

export const encounters = pgTable(
  'encounters',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    facilityId: uuid('facility_id')
      .notNull()
      .references(() => facilities.id, { onDelete: 'restrict' }),
    patientId: uuid('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'restrict' }),
    encounterNumber: varchar('encounter_number', { length: 32 }).notNull(),
    bedId: uuid('bed_id').references(() => beds.id, { onDelete: 'restrict' }),
    bedCode: varchar('bed_code', { length: 16 }).notNull(),
    roomCategory: varchar('room_category', { length: 32 }).notNull(),
    attendingPhysicianId: uuid('attending_physician_id')
      .notNull()
      .references(() => staffUsers.id, { onDelete: 'restrict' }),
    primaryDiagnosis: varchar('primary_diagnosis', { length: 300 }).notNull(),
    icd10Code: varchar('icd10_code', { length: 10 }).notNull(),
    admittedAt: instant('admitted_at').notNull(),
    stage: dischargeStage('stage').notNull().default('ADMITTED'),
    stageEnteredAt: instant('stage_entered_at').notNull().defaultNow(),
    mghOrderedAt: instant('mgh_ordered_at'),
    clearedAt: instant('cleared_at'),
    agreedPfCents: cents('agreed_pf_cents'),
    pfCeilingCents: cents('pf_ceiling_cents'),
    doctorExcessPfCents: cents('doctor_excess_pf_cents').notNull().default(0),
    roomUpgradeExcessCents: cents('room_upgrade_excess_cents').notNull().default(0),
    pfSignedAt: instant('pf_signed_at'),
    pfSignedBy: uuid('pf_signed_by').references(() => staffUsers.id, { onDelete: 'restrict' }),
    pharmacyClearedAt: instant('pharmacy_cleared_at'),
    billState: billState('bill_state').notNull().default('DRAFT'),
    billNumber: varchar('bill_number', { length: 32 }),
    billFinalizedAt: instant('bill_finalized_at'),
    billSentAt: instant('bill_sent_at'),
    voidedAt: instant('voided_at'),
    voidedBy: uuid('voided_by').references(() => staffUsers.id, { onDelete: 'restrict' }),
    voidReason: varchar('void_reason', { length: 500 }),
    version: integer('version').notNull().default(1),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('encounters_facility_number_uq').on(t.facilityId, t.encounterNumber),
    uniqueIndex('encounters_bill_number_uq').on(t.facilityId, t.billNumber),
    index('encounters_patient_idx').on(t.patientId),
    index('encounters_physician_idx').on(t.attendingPhysicianId),
    index('encounters_stage_idx').on(t.facilityId, t.stage),
    check(
      'encounters_money_nonneg',
      sql`${t.doctorExcessPfCents} >= 0 AND ${t.roomUpgradeExcessCents} >= 0
       AND coalesce(${t.agreedPfCents}, 0) >= 0 AND coalesce(${t.pfCeilingCents}, 0) >= 0`,
    ),
    check('encounters_void_reason', sql`(${t.voidedAt} IS NULL) = (${t.voidReason} IS NULL)`),
    check('encounters_cleared', sql`(${t.stage} = 'CLEARED') = (${t.clearedAt} IS NOT NULL)`),
  ],
);

export const charges = pgTable(
  'charges',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    encounterId: uuid('encounter_id')
      .notNull()
      .references(() => encounters.id, { onDelete: 'restrict' }),
    code: varchar('code', { length: 32 }).notNull(),
    description: varchar('description', { length: 200 }).notNull(),
    category: chargeCategory('category').notNull(),
    quantity: integer('quantity').notNull(),
    unitPriceCents: cents('unit_price_cents').notNull(),
    grossCents: cents('gross_cents').notNull(),
    coverage: chargeCoverage('coverage').notNull().default('COVERED'),
    explainer: varchar('explainer', { length: 300 }),
    isDisputed: boolean('is_disputed').notNull().default(false),
    postedBy: uuid('posted_by').references(() => staffUsers.id, { onDelete: 'restrict' }),
    postedAt: instant('posted_at').notNull().defaultNow(),
    removedAt: instant('removed_at'),
    removedBy: uuid('removed_by').references(() => staffUsers.id, { onDelete: 'restrict' }),
    removedReason: varchar('removed_reason', { length: 300 }),
  },
  (t) => [
    index('charges_encounter_idx').on(t.encounterId),
    check('charges_quantity_positive', sql`${t.quantity} > 0`),
    check(
      'charges_amounts',
      sql`${t.unitPriceCents} >= 0 AND ${t.grossCents} = ${t.quantity} * ${t.unitPriceCents}`,
    ),
    check('charges_removed', sql`(${t.removedAt} IS NULL) = (${t.removedReason} IS NULL)`),
  ],
);

export const philhealthClaims = pgTable(
  'philhealth_claims',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    encounterId: uuid('encounter_id')
      .notNull()
      .unique()
      .references(() => encounters.id, { onDelete: 'restrict' }),
    facilityId: uuid('facility_id')
      .notNull()
      .references(() => facilities.id, { onDelete: 'restrict' }),
    claimNumber: varchar('claim_number', { length: 32 }).notNull(),
    caseRateCode: varchar('case_rate_code', { length: 16 }).notNull(),
    hciCents: cents('hci_cents').notNull(),
    pfCents: cents('pf_cents').notNull(),
    status: claimStatus('status').notNull().default('DRAFT'),
    transmittedAt: instant('transmitted_at'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    // Document numbers are sequential per facility, so uniqueness is per facility too.
    uniqueIndex('philhealth_claims_facility_number_uq').on(t.facilityId, t.claimNumber),
    check('philhealth_claims_nonneg', sql`${t.hciCents} >= 0 AND ${t.pfCents} >= 0`),
  ],
);

export const hmoCoverages = pgTable(
  'hmo_coverages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    encounterId: uuid('encounter_id')
      .notNull()
      .unique()
      .references(() => encounters.id, { onDelete: 'restrict' }),
    providerName: varchar('provider_name', { length: 64 }).notNull(),
    memberNumberLast4: varchar('member_number_last4', { length: 4 }).notNull(),
    mblCents: cents('mbl_cents').notNull(),
    loaStatus: loaStatus('loa_status').notNull().default('PENDING'),
    approvalCode: varchar('approval_code', { length: 32 }),
    approvedCents: cents('approved_cents').notNull().default(0),
    decidedAt: instant('decided_at'),
    decidedBy: uuid('decided_by').references(() => staffUsers.id, { onDelete: 'restrict' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check(
      'hmo_coverages_amounts',
      sql`${t.mblCents} >= 0 AND ${t.approvedCents} >= 0 AND ${t.approvedCents} <= ${t.mblCents}`,
    ),
  ],
);

/** The latest computed waterfall and settlement position, rewritten inside the encounter lock. */
export const ledgers = pgTable(
  'ledgers',
  {
    encounterId: uuid('encounter_id')
      .primaryKey()
      .references(() => encounters.id, { onDelete: 'restrict' }),
    grossHospitalCents: cents('gross_hospital_cents').notNull(),
    grossProfessionalFeeCents: cents('gross_professional_fee_cents').notNull(),
    grossCents: cents('gross_cents').notNull(),
    vatExemptionCents: cents('vat_exemption_cents').notNull(),
    seniorPwdDiscountCents: cents('senior_pwd_discount_cents').notNull(),
    nonCoveredCents: cents('non_covered_cents').notNull(),
    philhealthCents: cents('philhealth_cents').notNull(),
    hmoCents: cents('hmo_cents').notNull(),
    coverageShortfallCents: cents('coverage_shortfall_cents').notNull(),
    netPatientDueCents: cents('net_patient_due_cents').notNull(),
    paidCents: cents('paid_cents').notNull(),
    financedCents: cents('financed_cents').notNull(),
    balanceCents: cents('balance_cents').notNull(),
    creditCents: cents('credit_cents').notNull(),
    computedAt: instant('computed_at').notNull().defaultNow(),
  },
  (t) => [
    check(
      'ledgers_reconciles',
      sql`${t.grossCents} = ${t.vatExemptionCents} + ${t.seniorPwdDiscountCents} + ${t.philhealthCents} + ${t.hmoCents} + ${t.netPatientDueCents}`,
    ),
    check(
      'ledgers_nonneg',
      sql`${t.grossCents} >= 0 AND ${t.netPatientDueCents} >= 0 AND ${t.paidCents} >= 0
       AND ${t.financedCents} >= 0 AND ${t.balanceCents} >= 0 AND ${t.creditCents} >= 0`,
    ),
  ],
);

// ---------------------------------------------------------------- settlement
export const payments = pgTable(
  'payments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    facilityId: uuid('facility_id')
      .notNull()
      .references(() => facilities.id, { onDelete: 'restrict' }),
    encounterId: uuid('encounter_id')
      .notNull()
      .references(() => encounters.id, { onDelete: 'restrict' }),
    reference: varchar('reference', { length: 32 }).notNull().unique(),
    amountCents: cents('amount_cents').notNull(),
    rail: paymentRail('rail').notNull(),
    payerName: varchar('payer_name', { length: 120 }).notNull(),
    cardBrand: varchar('card_brand', { length: 16 }),
    cardLast4: varchar('card_last4', { length: 4 }),
    bank: varchar('bank', { length: 32 }),
    externalReference: varchar('external_reference', { length: 64 }),
    isSimulated: boolean('is_simulated').notNull(),
    /** "staff:<uuid>" or "patient:<uuid>"; idempotency keys are scoped per actor. */
    actorKey: varchar('actor_key', { length: 48 }).notNull(),
    idempotencyKey: varchar('idempotency_key', { length: 64 }).notNull(),
    requestHash: varchar('request_hash', { length: 64 }).notNull(),
    recordedByStaffId: uuid('recorded_by_staff_id').references(() => staffUsers.id, { onDelete: 'restrict' }),
    paidByAccountId: uuid('paid_by_account_id').references(() => patientAccounts.id, {
      onDelete: 'restrict',
    }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('payments_idempotency_uq').on(t.actorKey, t.idempotencyKey),
    index('payments_encounter_idx').on(t.encounterId),
    check('payments_amount_positive', sql`${t.amountCents} > 0`),
    check('payments_one_actor', sql`num_nonnulls(${t.recordedByStaffId}, ${t.paidByAccountId}) = 1`),
  ],
);

export const receipts = pgTable(
  'receipts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    facilityId: uuid('facility_id')
      .notNull()
      .references(() => facilities.id, { onDelete: 'restrict' }),
    paymentId: uuid('payment_id')
      .notNull()
      .unique()
      .references(() => payments.id, { onDelete: 'restrict' }),
    officialReceiptNumber: varchar('official_receipt_number', { length: 32 }).notNull(),
    amountCents: cents('amount_cents').notNull(),
    issuedAt: instant('issued_at').notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('receipts_facility_or_uq').on(t.facilityId, t.officialReceiptNumber),
    check('receipts_amount_positive', sql`${t.amountCents} > 0`),
  ],
);

export const promissoryNotes = pgTable(
  'promissory_notes',
  {
    id: uuid('id').primaryKey(),
    facilityId: uuid('facility_id')
      .notNull()
      .references(() => facilities.id, { onDelete: 'restrict' }),
    encounterId: uuid('encounter_id')
      .notNull()
      .references(() => encounters.id, { onDelete: 'restrict' }),
    noteNumber: varchar('note_number', { length: 32 }).notNull(),
    borrowerName: varchar('borrower_name', { length: 120 }).notNull(),
    relationship: varchar('relationship', { length: 16 }).notNull(),
    idType: varchar('id_type', { length: 20 }).notNull(),
    idNumberEnc: text('id_number_enc').notNull(),
    idLast4: varchar('id_last4', { length: 4 }).notNull(),
    principalCents: cents('principal_cents').notNull(),
    months: integer('months').notNull(),
    schedule: jsonb('schedule').notNull(),
    firstDueDate: date('first_due_date', { mode: 'string' }).notNull(),
    /** SHA-256 over the canonical signed terms; proves the stored terms were not altered. */
    termsHash: varchar('terms_hash', { length: 64 }).notNull(),
    signedAt: instant('signed_at').notNull(),
    status: noteStatus('status').notNull().default('ACTIVE'),
    createdByStaffId: uuid('created_by_staff_id').references(() => staffUsers.id, { onDelete: 'restrict' }),
    createdByAccountId: uuid('created_by_account_id').references(() => patientAccounts.id, {
      onDelete: 'restrict',
    }),
    createdAt: createdAt(),
  },
  (t) => [
    index('promissory_notes_encounter_idx').on(t.encounterId),
    uniqueIndex('promissory_notes_facility_number_uq').on(t.facilityId, t.noteNumber),
    uniqueIndex('promissory_notes_one_active_uq')
      .on(t.encounterId)
      .where(sql`${t.status} = 'ACTIVE'`),
    check('promissory_notes_principal_positive', sql`${t.principalCents} > 0`),
    check('promissory_notes_months', sql`${t.months} IN (3, 6, 12)`),
    check(
      'promissory_notes_one_actor',
      sql`num_nonnulls(${t.createdByStaffId}, ${t.createdByAccountId}) = 1`,
    ),
  ],
);

export const gatePasses = pgTable(
  'gate_passes',
  {
    id: uuid('id').primaryKey(),
    facilityId: uuid('facility_id')
      .notNull()
      .references(() => facilities.id, { onDelete: 'restrict' }),
    encounterId: uuid('encounter_id')
      .notNull()
      .references(() => encounters.id, { onDelete: 'restrict' }),
    passNumber: varchar('pass_number', { length: 16 }).notNull().unique(),
    settledCents: cents('settled_cents').notNull(),
    financedCents: cents('financed_cents').notNull(),
    signature: varchar('signature', { length: 64 }).notNull(),
    issuedAt: instant('issued_at').notNull(),
    expiresAt: instant('expires_at').notNull(),
    pinAttempts: integer('pin_attempts').notNull().default(0),
    status: passStatus('status').notNull().default('ACTIVE'),
    usedAt: instant('used_at'),
    verifiedBy: uuid('verified_by').references(() => staffUsers.id, { onDelete: 'restrict' }),
    voidedReason: varchar('voided_reason', { length: 200 }),
  },
  (t) => [
    uniqueIndex('gate_passes_one_active_uq')
      .on(t.encounterId)
      .where(sql`${t.status} = 'ACTIVE'`),
    check('gate_passes_attempts', sql`${t.pinAttempts} >= 0`),
    check('gate_passes_money', sql`${t.settledCents} >= 0 AND ${t.financedCents} >= 0`),
  ],
);

export const disputes = pgTable(
  'disputes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    facilityId: uuid('facility_id')
      .notNull()
      .references(() => facilities.id, { onDelete: 'restrict' }),
    encounterId: uuid('encounter_id')
      .notNull()
      .references(() => encounters.id, { onDelete: 'restrict' }),
    chargeId: uuid('charge_id')
      .notNull()
      .references(() => charges.id, { onDelete: 'restrict' }),
    contestedCents: cents('contested_cents').notNull(),
    category: varchar('category', { length: 32 }).notNull(),
    reason: varchar('reason', { length: 1000 }).notNull(),
    status: disputeStatus('status').notNull().default('OPEN'),
    filedByStaffId: uuid('filed_by_staff_id').references(() => staffUsers.id, { onDelete: 'restrict' }),
    filedByAccountId: uuid('filed_by_account_id').references(() => patientAccounts.id, {
      onDelete: 'restrict',
    }),
    resolvedBy: uuid('resolved_by').references(() => staffUsers.id, { onDelete: 'restrict' }),
    resolutionNote: varchar('resolution_note', { length: 1000 }),
    resolvedAt: instant('resolved_at'),
    createdAt: createdAt(),
  },
  (t) => [
    index('disputes_facility_status_idx').on(t.facilityId, t.status),
    uniqueIndex('disputes_one_open_per_charge_uq')
      .on(t.chargeId)
      .where(sql`${t.status} = 'OPEN'`),
    check('disputes_amount_positive', sql`${t.contestedCents} > 0`),
    check('disputes_one_filer', sql`num_nonnulls(${t.filedByStaffId}, ${t.filedByAccountId}) = 1`),
    check('disputes_resolution', sql`(${t.status} = 'OPEN') = (${t.resolvedAt} IS NULL)`),
  ],
);

export const timelineEvents = pgTable(
  'timeline_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    encounterId: uuid('encounter_id')
      .notNull()
      .references(() => encounters.id, { onDelete: 'restrict' }),
    kind: varchar('kind', { length: 24 }).notNull(),
    title: varchar('title', { length: 160 }).notNull(),
    detail: varchar('detail', { length: 500 }),
    actorLabel: varchar('actor_label', { length: 160 }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index('timeline_events_encounter_idx').on(t.encounterId, t.createdAt)],
);

/** Append-only. UPDATE and DELETE raise an exception (see migration 0001). */
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    facilityId: uuid('facility_id').references(() => facilities.id, { onDelete: 'restrict' }),
    actorType: varchar('actor_type', { length: 8 }).notNull(),
    actorId: uuid('actor_id'),
    actorEmail: varchar('actor_email', { length: 254 }),
    action: varchar('action', { length: 64 }).notNull(),
    resourceType: varchar('resource_type', { length: 32 }).notNull(),
    resourceId: varchar('resource_id', { length: 64 }),
    requestId: varchar('request_id', { length: 64 }),
    ip: varchar('ip', { length: 64 }),
    userAgent: varchar('user_agent', { length: 255 }),
    detail: jsonb('detail'),
    createdAt: createdAt(),
  },
  (t) => [
    index('audit_logs_facility_time_idx').on(t.facilityId, t.createdAt),
    index('audit_logs_resource_idx').on(t.resourceType, t.resourceId),
    check('audit_logs_actor_type', sql`${t.actorType} IN ('STAFF','PATIENT','SYSTEM','ANON')`),
  ],
);
