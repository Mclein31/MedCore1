CREATE TYPE "public"."bed_status" AS ENUM('AVAILABLE', 'OCCUPIED', 'HOUSEKEEPING', 'MAINTENANCE');--> statement-breakpoint
CREATE TYPE "public"."bill_state" AS ENUM('DRAFT', 'FINALIZED', 'SENT', 'PARTIALLY_PAID', 'SETTLED');--> statement-breakpoint
CREATE TYPE "public"."challenge_kind" AS ENUM('MFA_VERIFY', 'MFA_ENROLL');--> statement-breakpoint
CREATE TYPE "public"."charge_category" AS ENUM('ROOM_AND_BOARD', 'PHARMACY', 'LABORATORY', 'IMAGING', 'SUPPLIES', 'PROCEDURE', 'PROFESSIONAL_FEE');--> statement-breakpoint
CREATE TYPE "public"."charge_coverage" AS ENUM('COVERED', 'EXCLUDED', 'WAIVED');--> statement-breakpoint
CREATE TYPE "public"."claim_status" AS ENUM('DRAFT', 'READY', 'TRANSMITTED', 'RETURNED', 'PAID');--> statement-breakpoint
CREATE TYPE "public"."code_purpose" AS ENUM('LOGIN', 'REGISTER');--> statement-breakpoint
CREATE TYPE "public"."discharge_stage" AS ENUM('ADMITTED', 'MGH_DECLARED', 'DOCTOR_PF_PENDING', 'PHARMACY_RTS_AUDIT', 'HMO_FINAL_LOA', 'PENDING_SETTLEMENT', 'CLEARED');--> statement-breakpoint
CREATE TYPE "public"."discount_kind" AS ENUM('NONE', 'SENIOR', 'PWD');--> statement-breakpoint
CREATE TYPE "public"."dispute_status" AS ENUM('OPEN', 'WAIVED', 'UPHELD');--> statement-breakpoint
CREATE TYPE "public"."loa_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."note_status" AS ENUM('ACTIVE', 'SETTLED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."pass_status" AS ENUM('ACTIVE', 'USED', 'VOIDED');--> statement-breakpoint
CREATE TYPE "public"."payment_rail" AS ENUM('CASH', 'CARD_TERMINAL', 'CARD', 'BANK_TRANSFER', 'GCASH', 'MAYA', 'QR_PH');--> statement-breakpoint
CREATE TYPE "public"."principal_type" AS ENUM('STAFF', 'PATIENT');--> statement-breakpoint
CREATE TYPE "public"."staff_role" AS ENUM('HOSPITAL_CFO', 'BILLING_SPECIALIST', 'CLAIMS_ENCODER', 'HMO_COORDINATOR', 'ATTENDING_PHYSICIAN', 'LOBBY_SECURITY');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"facility_id" uuid,
	"actor_type" varchar(8) NOT NULL,
	"actor_id" uuid,
	"actor_email" varchar(254),
	"action" varchar(64) NOT NULL,
	"resource_type" varchar(32) NOT NULL,
	"resource_id" varchar(64),
	"request_id" varchar(64),
	"ip" varchar(64),
	"user_agent" varchar(255),
	"detail" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "audit_logs_actor_type" CHECK ("audit_logs"."actor_type" IN ('STAFF','PATIENT','SYSTEM','ANON'))
);
--> statement-breakpoint
CREATE TABLE "auth_challenges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"staff_user_id" uuid NOT NULL,
	"kind" "challenge_kind" NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "auth_challenges_token_hash_unique" UNIQUE("token_hash"),
	CONSTRAINT "auth_challenges_attempts_nonneg" CHECK ("auth_challenges"."attempts" >= 0)
);
--> statement-breakpoint
CREATE TABLE "beds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"facility_id" uuid NOT NULL,
	"code" varchar(16) NOT NULL,
	"ward" varchar(64) NOT NULL,
	"floor" integer NOT NULL,
	"room_category" varchar(32) NOT NULL,
	"daily_rate_cents" bigint NOT NULL,
	"status" "bed_status" DEFAULT 'AVAILABLE' NOT NULL,
	"current_encounter_id" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "beds_rate_nonneg" CHECK ("beds"."daily_rate_cents" >= 0),
	CONSTRAINT "beds_occupancy" CHECK (("beds"."status" = 'OCCUPIED') = ("beds"."current_encounter_id" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "charges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"encounter_id" uuid NOT NULL,
	"code" varchar(32) NOT NULL,
	"description" varchar(200) NOT NULL,
	"category" charge_category NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price_cents" bigint NOT NULL,
	"gross_cents" bigint NOT NULL,
	"coverage" charge_coverage DEFAULT 'COVERED' NOT NULL,
	"explainer" varchar(300),
	"is_disputed" boolean DEFAULT false NOT NULL,
	"posted_by" uuid,
	"posted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"removed_at" timestamp with time zone,
	"removed_by" uuid,
	"removed_reason" varchar(300),
	CONSTRAINT "charges_quantity_positive" CHECK ("charges"."quantity" > 0),
	CONSTRAINT "charges_amounts" CHECK ("charges"."unit_price_cents" >= 0 AND "charges"."gross_cents" = "charges"."quantity" * "charges"."unit_price_cents"),
	CONSTRAINT "charges_removed" CHECK (("charges"."removed_at" IS NULL) = ("charges"."removed_reason" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "disputes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"facility_id" uuid NOT NULL,
	"encounter_id" uuid NOT NULL,
	"charge_id" uuid NOT NULL,
	"contested_cents" bigint NOT NULL,
	"category" varchar(32) NOT NULL,
	"reason" varchar(1000) NOT NULL,
	"status" "dispute_status" DEFAULT 'OPEN' NOT NULL,
	"filed_by_staff_id" uuid,
	"filed_by_account_id" uuid,
	"resolved_by" uuid,
	"resolution_note" varchar(1000),
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "disputes_amount_positive" CHECK ("disputes"."contested_cents" > 0),
	CONSTRAINT "disputes_one_filer" CHECK (num_nonnulls("disputes"."filed_by_staff_id", "disputes"."filed_by_account_id") = 1),
	CONSTRAINT "disputes_resolution" CHECK (("disputes"."status" = 'OPEN') = ("disputes"."resolved_at" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "document_counters" (
	"facility_id" uuid NOT NULL,
	"kind" varchar(16) NOT NULL,
	"year" integer NOT NULL,
	"next_value" bigint DEFAULT 1 NOT NULL,
	CONSTRAINT "document_counters_positive" CHECK ("document_counters"."next_value" > 0)
);
--> statement-breakpoint
CREATE TABLE "encounters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"facility_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"encounter_number" varchar(32) NOT NULL,
	"bed_id" uuid,
	"bed_code" varchar(16) NOT NULL,
	"room_category" varchar(32) NOT NULL,
	"attending_physician_id" uuid NOT NULL,
	"primary_diagnosis" varchar(300) NOT NULL,
	"icd10_code" varchar(10) NOT NULL,
	"admitted_at" timestamp with time zone NOT NULL,
	"stage" "discharge_stage" DEFAULT 'ADMITTED' NOT NULL,
	"stage_entered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"mgh_ordered_at" timestamp with time zone,
	"cleared_at" timestamp with time zone,
	"agreed_pf_cents" bigint,
	"pf_ceiling_cents" bigint,
	"doctor_excess_pf_cents" bigint DEFAULT 0 NOT NULL,
	"room_upgrade_excess_cents" bigint DEFAULT 0 NOT NULL,
	"pf_signed_at" timestamp with time zone,
	"pf_signed_by" uuid,
	"pharmacy_cleared_at" timestamp with time zone,
	"bill_state" "bill_state" DEFAULT 'DRAFT' NOT NULL,
	"bill_number" varchar(32),
	"bill_finalized_at" timestamp with time zone,
	"bill_sent_at" timestamp with time zone,
	"voided_at" timestamp with time zone,
	"voided_by" uuid,
	"void_reason" varchar(500),
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "encounters_money_nonneg" CHECK ("encounters"."doctor_excess_pf_cents" >= 0 AND "encounters"."room_upgrade_excess_cents" >= 0
       AND coalesce("encounters"."agreed_pf_cents", 0) >= 0 AND coalesce("encounters"."pf_ceiling_cents", 0) >= 0),
	CONSTRAINT "encounters_void_reason" CHECK (("encounters"."voided_at" IS NULL) = ("encounters"."void_reason" IS NULL)),
	CONSTRAINT "encounters_cleared" CHECK (("encounters"."stage" = 'CLEARED') = ("encounters"."cleared_at" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "facilities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(32) NOT NULL,
	"name" varchar(200) NOT NULL,
	"tin" varchar(20) NOT NULL,
	"philhealth_accreditation" varchar(32) NOT NULL,
	"address" varchar(300) NOT NULL,
	"sla_warning_minutes" integer DEFAULT 25 NOT NULL,
	"sla_breach_minutes" integer DEFAULT 40 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "facilities_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "gate_passes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"facility_id" uuid NOT NULL,
	"encounter_id" uuid NOT NULL,
	"pass_number" varchar(16) NOT NULL,
	"settled_cents" bigint NOT NULL,
	"financed_cents" bigint NOT NULL,
	"signature" varchar(64) NOT NULL,
	"issued_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"pin_attempts" integer DEFAULT 0 NOT NULL,
	"status" "pass_status" DEFAULT 'ACTIVE' NOT NULL,
	"used_at" timestamp with time zone,
	"verified_by" uuid,
	"voided_reason" varchar(200),
	CONSTRAINT "gate_passes_pass_number_unique" UNIQUE("pass_number"),
	CONSTRAINT "gate_passes_attempts" CHECK ("gate_passes"."pin_attempts" >= 0),
	CONSTRAINT "gate_passes_money" CHECK ("gate_passes"."settled_cents" >= 0 AND "gate_passes"."financed_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "hmo_coverages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"encounter_id" uuid NOT NULL,
	"provider_name" varchar(64) NOT NULL,
	"member_number_last4" varchar(4) NOT NULL,
	"mbl_cents" bigint NOT NULL,
	"loa_status" "loa_status" DEFAULT 'PENDING' NOT NULL,
	"approval_code" varchar(32),
	"approved_cents" bigint DEFAULT 0 NOT NULL,
	"decided_at" timestamp with time zone,
	"decided_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hmo_coverages_encounter_id_unique" UNIQUE("encounter_id"),
	CONSTRAINT "hmo_coverages_amounts" CHECK ("hmo_coverages"."mbl_cents" >= 0 AND "hmo_coverages"."approved_cents" >= 0 AND "hmo_coverages"."approved_cents" <= "hmo_coverages"."mbl_cents")
);
--> statement-breakpoint
CREATE TABLE "ledgers" (
	"encounter_id" uuid PRIMARY KEY NOT NULL,
	"gross_hospital_cents" bigint NOT NULL,
	"gross_professional_fee_cents" bigint NOT NULL,
	"gross_cents" bigint NOT NULL,
	"vat_exemption_cents" bigint NOT NULL,
	"senior_pwd_discount_cents" bigint NOT NULL,
	"non_covered_cents" bigint NOT NULL,
	"philhealth_cents" bigint NOT NULL,
	"hmo_cents" bigint NOT NULL,
	"coverage_shortfall_cents" bigint NOT NULL,
	"net_patient_due_cents" bigint NOT NULL,
	"paid_cents" bigint NOT NULL,
	"financed_cents" bigint NOT NULL,
	"balance_cents" bigint NOT NULL,
	"credit_cents" bigint NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ledgers_reconciles" CHECK ("ledgers"."gross_cents" = "ledgers"."vat_exemption_cents" + "ledgers"."senior_pwd_discount_cents" + "ledgers"."philhealth_cents" + "ledgers"."hmo_cents" + "ledgers"."net_patient_due_cents"),
	CONSTRAINT "ledgers_nonneg" CHECK ("ledgers"."gross_cents" >= 0 AND "ledgers"."net_patient_due_cents" >= 0 AND "ledgers"."paid_cents" >= 0
       AND "ledgers"."financed_cents" >= 0 AND "ledgers"."balance_cents" >= 0 AND "ledgers"."credit_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "login_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"facility_id" uuid NOT NULL,
	"email" varchar(254) NOT NULL,
	"purpose" "code_purpose" NOT NULL,
	"patient_id" uuid,
	"code_hash" varchar(64) NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "login_codes_attempts_nonneg" CHECK ("login_codes"."attempts" >= 0),
	CONSTRAINT "login_codes_register_has_patient" CHECK ("login_codes"."purpose" = 'LOGIN' OR "login_codes"."patient_id" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "patient_account_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"verified_via" varchar(16) NOT NULL,
	"verified_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "patient_account_links_via" CHECK ("patient_account_links"."verified_via" IN ('EMAIL_CODE','STAFF_DESK'))
);
--> statement-breakpoint
CREATE TABLE "patient_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"facility_id" uuid NOT NULL,
	"email" varchar(254) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "patient_accounts_email_lowercase" CHECK ("patient_accounts"."email" = lower("patient_accounts"."email"))
);
--> statement-breakpoint
CREATE TABLE "patients" (
	"id" uuid PRIMARY KEY NOT NULL,
	"facility_id" uuid NOT NULL,
	"mrn" varchar(32) NOT NULL,
	"full_name" varchar(120) NOT NULL,
	"date_of_birth" date NOT NULL,
	"sex" varchar(1) NOT NULL,
	"contact_phone_enc" text NOT NULL,
	"contact_phone_last4" varchar(4) NOT NULL,
	"email" varchar(254),
	"philhealth_pin_enc" text,
	"philhealth_pin_last4" varchar(4),
	"discount_kind" "discount_kind" DEFAULT 'NONE' NOT NULL,
	"discount_id_enc" text,
	"discount_id_last4" varchar(4),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "patients_sex" CHECK ("patients"."sex" IN ('F','M','X')),
	CONSTRAINT "patients_email_lowercase" CHECK ("patients"."email" IS NULL OR "patients"."email" = lower("patients"."email")),
	CONSTRAINT "patients_discount_id" CHECK (("patients"."discount_kind" = 'NONE') = ("patients"."discount_id_enc" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"facility_id" uuid NOT NULL,
	"encounter_id" uuid NOT NULL,
	"reference" varchar(32) NOT NULL,
	"amount_cents" bigint NOT NULL,
	"rail" "payment_rail" NOT NULL,
	"payer_name" varchar(120) NOT NULL,
	"card_brand" varchar(16),
	"card_last4" varchar(4),
	"bank" varchar(32),
	"external_reference" varchar(64),
	"is_simulated" boolean NOT NULL,
	"actor_key" varchar(48) NOT NULL,
	"idempotency_key" varchar(64) NOT NULL,
	"request_hash" varchar(64) NOT NULL,
	"recorded_by_staff_id" uuid,
	"paid_by_account_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_reference_unique" UNIQUE("reference"),
	CONSTRAINT "payments_amount_positive" CHECK ("payments"."amount_cents" > 0),
	CONSTRAINT "payments_one_actor" CHECK (num_nonnulls("payments"."recorded_by_staff_id", "payments"."paid_by_account_id") = 1)
);
--> statement-breakpoint
CREATE TABLE "philhealth_claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"encounter_id" uuid NOT NULL,
	"facility_id" uuid NOT NULL,
	"claim_number" varchar(32) NOT NULL,
	"case_rate_code" varchar(16) NOT NULL,
	"hci_cents" bigint NOT NULL,
	"pf_cents" bigint NOT NULL,
	"status" "claim_status" DEFAULT 'DRAFT' NOT NULL,
	"transmitted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "philhealth_claims_encounter_id_unique" UNIQUE("encounter_id"),
	CONSTRAINT "philhealth_claims_nonneg" CHECK ("philhealth_claims"."hci_cents" >= 0 AND "philhealth_claims"."pf_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "promissory_notes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"facility_id" uuid NOT NULL,
	"encounter_id" uuid NOT NULL,
	"note_number" varchar(32) NOT NULL,
	"borrower_name" varchar(120) NOT NULL,
	"relationship" varchar(16) NOT NULL,
	"id_type" varchar(20) NOT NULL,
	"id_number_enc" text NOT NULL,
	"id_last4" varchar(4) NOT NULL,
	"principal_cents" bigint NOT NULL,
	"months" integer NOT NULL,
	"schedule" jsonb NOT NULL,
	"first_due_date" date NOT NULL,
	"terms_hash" varchar(64) NOT NULL,
	"signed_at" timestamp with time zone NOT NULL,
	"status" "note_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_by_staff_id" uuid,
	"created_by_account_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "promissory_notes_principal_positive" CHECK ("promissory_notes"."principal_cents" > 0),
	CONSTRAINT "promissory_notes_months" CHECK ("promissory_notes"."months" IN (3, 6, 12)),
	CONSTRAINT "promissory_notes_one_actor" CHECK (num_nonnulls("promissory_notes"."created_by_staff_id", "promissory_notes"."created_by_account_id") = 1)
);
--> statement-breakpoint
CREATE TABLE "rate_limit_buckets" (
	"key" varchar(64) NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"facility_id" uuid NOT NULL,
	"payment_id" uuid NOT NULL,
	"official_receipt_number" varchar(32) NOT NULL,
	"amount_cents" bigint NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "receipts_payment_id_unique" UNIQUE("payment_id"),
	CONSTRAINT "receipts_amount_positive" CHECK ("receipts"."amount_cents" > 0)
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"principal_type" "principal_type" NOT NULL,
	"staff_user_id" uuid,
	"patient_account_id" uuid,
	"facility_id" uuid NOT NULL,
	"ip" varchar(64),
	"user_agent" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"idle_expires_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "sessions_token_hash_unique" UNIQUE("token_hash"),
	CONSTRAINT "sessions_one_principal" CHECK (("sessions"."principal_type" = 'STAFF' AND "sessions"."staff_user_id" IS NOT NULL AND "sessions"."patient_account_id" IS NULL)
       OR ("sessions"."principal_type" = 'PATIENT' AND "sessions"."patient_account_id" IS NOT NULL AND "sessions"."staff_user_id" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "staff_recovery_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"staff_user_id" uuid NOT NULL,
	"code_hash" varchar(64) NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"facility_id" uuid NOT NULL,
	"email" varchar(254) NOT NULL,
	"full_name" varchar(120) NOT NULL,
	"role" "staff_role" NOT NULL,
	"title" varchar(80) NOT NULL,
	"prc_license" varchar(16),
	"password_hash" varchar(200),
	"password_changed_at" timestamp with time zone,
	"failed_login_count" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"mfa_secret_enc" text,
	"mfa_pending_secret_enc" text,
	"mfa_enabled_at" timestamp with time zone,
	"mfa_last_step" bigint,
	"invite_token_hash" varchar(64),
	"invite_expires_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "staff_users_email_lowercase" CHECK ("staff_users"."email" = lower("staff_users"."email")),
	CONSTRAINT "staff_users_failed_nonneg" CHECK ("staff_users"."failed_login_count" >= 0),
	CONSTRAINT "staff_users_mfa_consistent" CHECK (("staff_users"."mfa_enabled_at" IS NULL) = ("staff_users"."mfa_secret_enc" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "timeline_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"encounter_id" uuid NOT NULL,
	"kind" varchar(24) NOT NULL,
	"title" varchar(160) NOT NULL,
	"detail" varchar(500),
	"actor_label" varchar(160) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_challenges" ADD CONSTRAINT "auth_challenges_staff_user_id_staff_users_id_fk" FOREIGN KEY ("staff_user_id") REFERENCES "public"."staff_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beds" ADD CONSTRAINT "beds_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beds" ADD CONSTRAINT "beds_current_encounter_id_encounters_id_fk" FOREIGN KEY ("current_encounter_id") REFERENCES "public"."encounters"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "charges" ADD CONSTRAINT "charges_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "charges" ADD CONSTRAINT "charges_posted_by_staff_users_id_fk" FOREIGN KEY ("posted_by") REFERENCES "public"."staff_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "charges" ADD CONSTRAINT "charges_removed_by_staff_users_id_fk" FOREIGN KEY ("removed_by") REFERENCES "public"."staff_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_charge_id_charges_id_fk" FOREIGN KEY ("charge_id") REFERENCES "public"."charges"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_filed_by_staff_id_staff_users_id_fk" FOREIGN KEY ("filed_by_staff_id") REFERENCES "public"."staff_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_filed_by_account_id_patient_accounts_id_fk" FOREIGN KEY ("filed_by_account_id") REFERENCES "public"."patient_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_resolved_by_staff_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."staff_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_counters" ADD CONSTRAINT "document_counters_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_bed_id_beds_id_fk" FOREIGN KEY ("bed_id") REFERENCES "public"."beds"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_attending_physician_id_staff_users_id_fk" FOREIGN KEY ("attending_physician_id") REFERENCES "public"."staff_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_pf_signed_by_staff_users_id_fk" FOREIGN KEY ("pf_signed_by") REFERENCES "public"."staff_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_voided_by_staff_users_id_fk" FOREIGN KEY ("voided_by") REFERENCES "public"."staff_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gate_passes" ADD CONSTRAINT "gate_passes_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gate_passes" ADD CONSTRAINT "gate_passes_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gate_passes" ADD CONSTRAINT "gate_passes_verified_by_staff_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."staff_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hmo_coverages" ADD CONSTRAINT "hmo_coverages_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hmo_coverages" ADD CONSTRAINT "hmo_coverages_decided_by_staff_users_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."staff_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledgers" ADD CONSTRAINT "ledgers_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "login_codes" ADD CONSTRAINT "login_codes_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "login_codes" ADD CONSTRAINT "login_codes_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_account_links" ADD CONSTRAINT "patient_account_links_account_id_patient_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."patient_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_account_links" ADD CONSTRAINT "patient_account_links_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_accounts" ADD CONSTRAINT "patient_accounts_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_recorded_by_staff_id_staff_users_id_fk" FOREIGN KEY ("recorded_by_staff_id") REFERENCES "public"."staff_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_paid_by_account_id_patient_accounts_id_fk" FOREIGN KEY ("paid_by_account_id") REFERENCES "public"."patient_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "philhealth_claims" ADD CONSTRAINT "philhealth_claims_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "philhealth_claims" ADD CONSTRAINT "philhealth_claims_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promissory_notes" ADD CONSTRAINT "promissory_notes_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promissory_notes" ADD CONSTRAINT "promissory_notes_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promissory_notes" ADD CONSTRAINT "promissory_notes_created_by_staff_id_staff_users_id_fk" FOREIGN KEY ("created_by_staff_id") REFERENCES "public"."staff_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promissory_notes" ADD CONSTRAINT "promissory_notes_created_by_account_id_patient_accounts_id_fk" FOREIGN KEY ("created_by_account_id") REFERENCES "public"."patient_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_staff_user_id_staff_users_id_fk" FOREIGN KEY ("staff_user_id") REFERENCES "public"."staff_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_patient_account_id_patient_accounts_id_fk" FOREIGN KEY ("patient_account_id") REFERENCES "public"."patient_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_recovery_codes" ADD CONSTRAINT "staff_recovery_codes_staff_user_id_staff_users_id_fk" FOREIGN KEY ("staff_user_id") REFERENCES "public"."staff_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_users" ADD CONSTRAINT "staff_users_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timeline_events" ADD CONSTRAINT "timeline_events_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_facility_time_idx" ON "audit_logs" USING btree ("facility_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_resource_idx" ON "audit_logs" USING btree ("resource_type","resource_id");--> statement-breakpoint
CREATE UNIQUE INDEX "beds_facility_code_uq" ON "beds" USING btree ("facility_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "beds_current_encounter_uq" ON "beds" USING btree ("current_encounter_id");--> statement-breakpoint
CREATE INDEX "charges_encounter_idx" ON "charges" USING btree ("encounter_id");--> statement-breakpoint
CREATE INDEX "disputes_facility_status_idx" ON "disputes" USING btree ("facility_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "disputes_one_open_per_charge_uq" ON "disputes" USING btree ("charge_id") WHERE "disputes"."status" = 'OPEN';--> statement-breakpoint
CREATE UNIQUE INDEX "document_counters_pk" ON "document_counters" USING btree ("facility_id","kind","year");--> statement-breakpoint
CREATE UNIQUE INDEX "encounters_facility_number_uq" ON "encounters" USING btree ("facility_id","encounter_number");--> statement-breakpoint
CREATE UNIQUE INDEX "encounters_bill_number_uq" ON "encounters" USING btree ("facility_id","bill_number");--> statement-breakpoint
CREATE INDEX "encounters_patient_idx" ON "encounters" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "encounters_physician_idx" ON "encounters" USING btree ("attending_physician_id");--> statement-breakpoint
CREATE INDEX "encounters_stage_idx" ON "encounters" USING btree ("facility_id","stage");--> statement-breakpoint
CREATE UNIQUE INDEX "gate_passes_one_active_uq" ON "gate_passes" USING btree ("encounter_id") WHERE "gate_passes"."status" = 'ACTIVE';--> statement-breakpoint
CREATE INDEX "login_codes_lookup_idx" ON "login_codes" USING btree ("facility_id","email","purpose","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "patient_account_links_active_uq" ON "patient_account_links" USING btree ("account_id","patient_id") WHERE "patient_account_links"."revoked_at" IS NULL;--> statement-breakpoint
CREATE INDEX "patient_account_links_patient_idx" ON "patient_account_links" USING btree ("patient_id");--> statement-breakpoint
CREATE UNIQUE INDEX "patient_accounts_facility_email_uq" ON "patient_accounts" USING btree ("facility_id","email");--> statement-breakpoint
CREATE UNIQUE INDEX "patients_facility_mrn_uq" ON "patients" USING btree ("facility_id","mrn");--> statement-breakpoint
CREATE INDEX "patients_facility_email_idx" ON "patients" USING btree ("facility_id","email");--> statement-breakpoint
CREATE INDEX "patients_name_idx" ON "patients" USING btree ("facility_id","full_name");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_idempotency_uq" ON "payments" USING btree ("actor_key","idempotency_key");--> statement-breakpoint
CREATE INDEX "payments_encounter_idx" ON "payments" USING btree ("encounter_id");--> statement-breakpoint
CREATE UNIQUE INDEX "philhealth_claims_facility_number_uq" ON "philhealth_claims" USING btree ("facility_id","claim_number");--> statement-breakpoint
CREATE INDEX "promissory_notes_encounter_idx" ON "promissory_notes" USING btree ("encounter_id");--> statement-breakpoint
CREATE UNIQUE INDEX "promissory_notes_facility_number_uq" ON "promissory_notes" USING btree ("facility_id","note_number");--> statement-breakpoint
CREATE UNIQUE INDEX "promissory_notes_one_active_uq" ON "promissory_notes" USING btree ("encounter_id") WHERE "promissory_notes"."status" = 'ACTIVE';--> statement-breakpoint
CREATE UNIQUE INDEX "rate_limit_buckets_pk" ON "rate_limit_buckets" USING btree ("key","window_start");--> statement-breakpoint
CREATE UNIQUE INDEX "receipts_facility_or_uq" ON "receipts" USING btree ("facility_id","official_receipt_number");--> statement-breakpoint
CREATE INDEX "sessions_staff_idx" ON "sessions" USING btree ("staff_user_id");--> statement-breakpoint
CREATE INDEX "sessions_patient_idx" ON "sessions" USING btree ("patient_account_id");--> statement-breakpoint
CREATE INDEX "staff_recovery_codes_user_idx" ON "staff_recovery_codes" USING btree ("staff_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "staff_users_email_lower_uq" ON "staff_users" USING btree (lower("email"));--> statement-breakpoint
CREATE UNIQUE INDEX "staff_users_invite_uq" ON "staff_users" USING btree ("invite_token_hash");--> statement-breakpoint
CREATE INDEX "staff_users_facility_idx" ON "staff_users" USING btree ("facility_id","role");--> statement-breakpoint
CREATE INDEX "timeline_events_encounter_idx" ON "timeline_events" USING btree ("encounter_id","created_at");