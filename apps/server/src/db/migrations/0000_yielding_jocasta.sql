CREATE TYPE "public"."bed_status" AS ENUM('AVAILABLE', 'OCCUPIED', 'HOUSEKEEPING', 'MAINTENANCE', 'ADMINISTRATIVE_HOLD');--> statement-breakpoint
CREATE TYPE "public"."bill_lifecycle_state" AS ENUM('DRAFT', 'FINALIZED', 'SENT_TO_PATIENT', 'VIEWED', 'DISPUTED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."borrower_id_type" AS ENUM('PHILSYS_NATIONAL_ID', 'UMID', 'DRIVERS_LICENSE', 'PASSPORT');--> statement-breakpoint
CREATE TYPE "public"."charge_category" AS ENUM('ROOM_BOARD', 'PHARMACY', 'LABORATORY', 'CENTRAL_SUPPLIES', 'PROFESSIONAL_FEE');--> statement-breakpoint
CREATE TYPE "public"."charge_coverage_status" AS ENUM('COVERED', 'DISALLOWED_SUNDRY', 'EXCESS_PF', 'CONTESTED', 'SUPERVISORY_WAIVED', 'PARTIAL', 'DISPUTED', 'WAIVED');--> statement-breakpoint
CREATE TYPE "public"."claim_submission_status" AS ENUM('CLEAN', 'WARNING', 'INTERCEPTED', 'TRANSMITTED', 'RETURNED', 'APPROVED');--> statement-breakpoint
CREATE TYPE "public"."discharge_stage" AS ENUM('MGH_DECLARED', 'DOCTOR_PF_PENDING', 'PHARMACY_RTS_AUDIT', 'HMO_FINAL_LOA', 'PENDING_SETTLEMENT', 'CLEARED_GATE_PASS');--> statement-breakpoint
CREATE TYPE "public"."dispute_status" AS ENUM('OPEN', 'FROZEN', 'SUPERVISOR_WAIVED', 'HMO_RECONSIDERED', 'UPHELD');--> statement-breakpoint
CREATE TYPE "public"."gate_pass_status" AS ENUM('ACTIVE_READY_FOR_EXIT', 'VERIFIED_AT_LOBBY', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."hmo_final_loa_status" AS ENUM('PENDING_SUBMISSION', 'AWAITING_CODE', 'APPROVED', 'DISALLOWED_ITEMS', 'UNDER_REVIEW', 'PARTIALLY_APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."payment_rail" AS ENUM('QR_PH', 'GCASH', 'MAYA', 'CREDIT_DEBIT_CARD', 'BANK_TRANSFER', 'PROMISSORY_NOTE', 'CASHIER_OVER_THE_COUNTER');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('INITIALIZED', 'PROCESSING', 'SUCCESS', 'FAILED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."sla_status" AS ENUM('NORMAL', 'WARNING', 'BREACH');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('BILLING_SPECIALIST', 'HMO_COORDINATOR', 'CLAIMS_ENCODER', 'HOSPITAL_CFO', 'ATTENDING_PHYSICIAN', 'PATIENT_GUARANTOR', 'LOBBY_SECURITY');--> statement-breakpoint
CREATE TABLE "beds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"facility_id" uuid NOT NULL,
	"bed_number" varchar(32) NOT NULL,
	"ward_name" varchar(64) NOT NULL,
	"floor_number" integer NOT NULL,
	"room_category" varchar(32) NOT NULL,
	"daily_rate" numeric(15, 2) NOT NULL,
	"status" "bed_status" DEFAULT 'AVAILABLE' NOT NULL,
	"current_encounter_id" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_facility_bed" UNIQUE("facility_id","bed_number")
);
--> statement-breakpoint
CREATE TABLE "billing_disputes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"encounter_id" uuid NOT NULL,
	"charge_id" uuid NOT NULL,
	"item_description" text NOT NULL,
	"contested_amount" numeric(15, 2) NOT NULL,
	"reason" text NOT NULL,
	"dispute_category" varchar(32) NOT NULL,
	"status" "dispute_status" DEFAULT 'OPEN' NOT NULL,
	"supervisor_notes" text,
	"assigned_staff_id" uuid,
	"resolved_by_user_id" uuid,
	"resolution_clause" text,
	"department" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "chargemaster_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"encounter_id" uuid NOT NULL,
	"code" varchar(64) NOT NULL,
	"description" text NOT NULL,
	"category" charge_category NOT NULL,
	"quantity" numeric(10, 2) DEFAULT '1.00' NOT NULL,
	"unit_price" numeric(15, 2) NOT NULL,
	"gross_amount" numeric(15, 2) NOT NULL,
	"is_vatable" boolean DEFAULT true NOT NULL,
	"philhealth_covered" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"hmo_covered" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"patient_oop" numeric(15, 2) NOT NULL,
	"status" charge_coverage_status DEFAULT 'COVERED' NOT NULL,
	"exclusion_reason_clause" text,
	"plain_language_explainer" text NOT NULL,
	"is_disputed" boolean DEFAULT false NOT NULL,
	"dispute_reason" text,
	"posted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "discharge_passes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pass_number" varchar(64) NOT NULL,
	"encounter_id" uuid NOT NULL,
	"patient_name" varchar(255) NOT NULL,
	"room_bed" varchar(64) NOT NULL,
	"settled_amount" numeric(15, 2) NOT NULL,
	"settlement_channel" "payment_rail" NOT NULL,
	"promissory_note_id" uuid,
	"hmac_signature" varchar(255) NOT NULL,
	"exit_pin" varchar(4) NOT NULL,
	"status" "gate_pass_status" DEFAULT 'ACTIVE_READY_FOR_EXIT' NOT NULL,
	"qr_payload_r2_key" varchar(255),
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"verified_at" timestamp with time zone,
	"verified_by_user_id" uuid,
	CONSTRAINT "discharge_passes_pass_number_unique" UNIQUE("pass_number")
);
--> statement-breakpoint
CREATE TABLE "encounter_timeline_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"encounter_id" uuid NOT NULL,
	"event_type" varchar(32) NOT NULL,
	"title" varchar(128) NOT NULL,
	"description" text NOT NULL,
	"actor_id" uuid,
	"actor_name" varchar(128) NOT NULL,
	"status" varchar(32) NOT NULL,
	"event_timestamp" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "encounters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"facility_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"encounter_number" varchar(64) NOT NULL,
	"bed_id" uuid,
	"room_bed" varchar(64) NOT NULL,
	"room_category" varchar(32) NOT NULL,
	"daily_room_rate" numeric(15, 2) NOT NULL,
	"daily_room_allowance" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"admission_timestamp" timestamp with time zone NOT NULL,
	"mgh_order_timestamp" timestamp with time zone,
	"discharge_timestamp" timestamp with time zone,
	"attending_physician_id" uuid NOT NULL,
	"doctor_pan" varchar(64) NOT NULL,
	"doctor_agreed_fee" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"doctor_excess_pf" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"doctor_signed_at" timestamp with time zone,
	"pharmacy_rts_cleared" boolean DEFAULT false NOT NULL,
	"unreturned_meds_count" integer DEFAULT 0 NOT NULL,
	"stage" "discharge_stage" DEFAULT 'MGH_DECLARED' NOT NULL,
	"stage_entered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"elapsed_minutes" integer DEFAULT 0 NOT NULL,
	"sla_status" "sla_status" DEFAULT 'NORMAL' NOT NULL,
	"primary_icd10" varchar(16) NOT NULL,
	"primary_diagnosis" text NOT NULL,
	"bill_state" "bill_lifecycle_state" DEFAULT 'DRAFT' NOT NULL,
	"bill_number" varchar(64),
	"amount_paid" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"remaining_balance" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"magic_token_hash" varchar(64),
	"magic_token_expires_at" timestamp with time zone,
	"bill_finalized_at" timestamp with time zone,
	"bill_sent_at" timestamp with time zone,
	"bill_first_viewed_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "encounters_encounter_number_unique" UNIQUE("encounter_number")
);
--> statement-breakpoint
CREATE TABLE "facilities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(32) NOT NULL,
	"name" varchar(255) NOT NULL,
	"tin" varchar(32) NOT NULL,
	"philhealth_pan" varchar(64) NOT NULL,
	"address" text NOT NULL,
	"contact_phone" varchar(32) NOT NULL,
	"total_beds" integer DEFAULT 200 NOT NULL,
	"hitp_client_id" varchar(64) NOT NULL,
	"hitp_secret_hash" varchar(255) NOT NULL,
	"sync_interval_ms" integer DEFAULT 1000 NOT NULL,
	"sla_warning_threshold" integer DEFAULT 25 NOT NULL,
	"sla_breach_threshold" integer DEFAULT 40 NOT NULL,
	"doctor_pf_timeout_minutes" integer DEFAULT 15 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "facilities_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "hmo_authorizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"encounter_id" uuid NOT NULL,
	"provider_name" varchar(64) NOT NULL,
	"card_number_masked" varchar(32) NOT NULL,
	"loa_number" varchar(64),
	"policy_mbl" numeric(15, 2) NOT NULL,
	"mbl_remaining" numeric(15, 2) NOT NULL,
	"daily_room_allowance" numeric(15, 2) NOT NULL,
	"initial_loa_approved" boolean DEFAULT false NOT NULL,
	"final_loa_status" "hmo_final_loa_status" DEFAULT 'PENDING_SUBMISSION' NOT NULL,
	"approval_code" varchar(64),
	"approved_amount" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"disallowed_consumables" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"turnaround_minutes" integer DEFAULT 0,
	"adjuster_name" varchar(128),
	"adjuster_contact" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hmo_authorizations_encounter_id_unique" UNIQUE("encounter_id")
);
--> statement-breakpoint
CREATE TABLE "patients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"facility_id" uuid NOT NULL,
	"mrn" varchar(64) NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"date_of_birth" timestamp NOT NULL,
	"gender" varchar(1) NOT NULL,
	"contact_number" varchar(32) NOT NULL,
	"philhealth_pin" varchar(32),
	"is_senior_citizen" boolean DEFAULT false NOT NULL,
	"senior_citizen_id" varchar(64),
	"is_pwd" boolean DEFAULT false NOT NULL,
	"pwd_id" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_patient_facility_mrn" UNIQUE("facility_id","mrn")
);
--> statement-breakpoint
CREATE TABLE "payment_receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_id" uuid NOT NULL,
	"encounter_id" uuid NOT NULL,
	"receipt_number" varchar(64) NOT NULL,
	"official_receipt_number" varchar(64) NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"payment_rail" "payment_rail" NOT NULL,
	"payer_name" varchar(255) NOT NULL,
	"payer_contact_masked" varchar(64) NOT NULL,
	"gateway_auth_code" varchar(64),
	"pdf_r2_key" varchar(255),
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_receipts_payment_id_unique" UNIQUE("payment_id"),
	CONSTRAINT "payment_receipts_receipt_number_unique" UNIQUE("receipt_number"),
	CONSTRAINT "payment_receipts_official_receipt_number_unique" UNIQUE("official_receipt_number")
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_reference" varchar(64) NOT NULL,
	"encounter_id" uuid NOT NULL,
	"statement_number" varchar(64) NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'PHP' NOT NULL,
	"payment_rail" "payment_rail" NOT NULL,
	"channel_reference" varchar(128) NOT NULL,
	"gateway_auth_code" varchar(64) NOT NULL,
	"official_receipt_number" varchar(64) NOT NULL,
	"payer_name" varchar(255) NOT NULL,
	"payer_contact_masked" varchar(64) NOT NULL,
	"card_brand" varchar(16),
	"card_last4" varchar(4),
	"bank_name" varchar(64),
	"status" "payment_status" DEFAULT 'SUCCESS' NOT NULL,
	"failure_reason" text,
	"is_simulated_demo" boolean DEFAULT false NOT NULL,
	"idempotency_key" uuid NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"settled_at" timestamp with time zone,
	CONSTRAINT "payments_payment_reference_unique" UNIQUE("payment_reference"),
	CONSTRAINT "payments_official_receipt_number_unique" UNIQUE("official_receipt_number"),
	CONSTRAINT "payments_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "philhealth_claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"encounter_id" uuid NOT NULL,
	"claim_number" varchar(64) NOT NULL,
	"primary_icd10" varchar(16) NOT NULL,
	"primary_description" text NOT NULL,
	"case_rate_code" varchar(32) NOT NULL,
	"total_case_rate" numeric(15, 2) NOT NULL,
	"hci_amount" numeric(15, 2) NOT NULL,
	"pf_amount" numeric(15, 2) NOT NULL,
	"is_nbb" boolean DEFAULT false NOT NULL,
	"rth_risk_score" numeric(5, 4) DEFAULT '0.0000' NOT NULL,
	"cf4_vitals_recorded" boolean DEFAULT false NOT NULL,
	"cf4_course_in_ward_recorded" boolean DEFAULT false NOT NULL,
	"cf4_labs_consistent" boolean DEFAULT false NOT NULL,
	"esoa_xml_conformity" boolean DEFAULT false NOT NULL,
	"esoa_xml_r2_key" varchar(255),
	"status" "claim_submission_status" DEFAULT 'CLEAN' NOT NULL,
	"claim_aging_days" integer DEFAULT 0 NOT NULL,
	"assigned_auditor_id" uuid,
	"deficiency_reason" text,
	"transmitted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "philhealth_claims_encounter_id_unique" UNIQUE("encounter_id"),
	CONSTRAINT "philhealth_claims_claim_number_unique" UNIQUE("claim_number")
);
--> statement-breakpoint
CREATE TABLE "promissory_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"note_number" varchar(64) NOT NULL,
	"encounter_id" uuid NOT NULL,
	"borrower_name" varchar(255) NOT NULL,
	"borrower_relationship" varchar(32) DEFAULT 'GUARANTOR' NOT NULL,
	"borrower_id_type" "borrower_id_type" NOT NULL,
	"borrower_id_number" varchar(64) NOT NULL,
	"principal_amount" numeric(15, 2) NOT NULL,
	"interest_rate" numeric(5, 4) DEFAULT '0.0000' NOT NULL,
	"financing_fee" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"total_repayment" numeric(15, 2) NOT NULL,
	"installment_months" integer NOT NULL,
	"monthly_installment" numeric(15, 2) NOT NULL,
	"schedule_json" jsonb NOT NULL,
	"first_due_date" timestamp NOT NULL,
	"digital_signature_timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"digital_signature_hash" varchar(255) NOT NULL,
	"pdf_r2_key" varchar(255),
	"status" varchar(32) DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "promissory_notes_note_number_unique" UNIQUE("note_number")
);
--> statement-breakpoint
CREATE TABLE "statutory_waterfalls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"encounter_id" uuid NOT NULL,
	"gross_hospital_charges" numeric(15, 2) NOT NULL,
	"gross_doctor_fee" numeric(15, 2) NOT NULL,
	"gross_total" numeric(15, 2) NOT NULL,
	"vat_exemption" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"senior_pwd_discount" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"net_vat_discounted_base" numeric(15, 2) NOT NULL,
	"philhealth_hci" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"philhealth_pf" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"philhealth_total" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"hmo_approved_amount" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"room_upgrade_excess" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"excluded_consumables" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"doctor_excess_pf" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"coverage_shortfall" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"net_patient_due" numeric(15, 2) NOT NULL,
	"patient_paid" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"reconciled_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "statutory_waterfalls_encounter_id_unique" UNIQUE("encounter_id")
);
--> statement-breakpoint
CREATE TABLE "system_audit_logs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"facility_id" uuid NOT NULL,
	"user_id" uuid,
	"actor_role" varchar(32),
	"action" varchar(64) NOT NULL,
	"resource_type" varchar(64) NOT NULL,
	"resource_id" varchar(64) NOT NULL,
	"previous_state" jsonb,
	"new_state" jsonb,
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"ip_address" varchar(45),
	"user_agent" text,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"facility_id" uuid NOT NULL,
	"username" varchar(64) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"salt" varchar(64) NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"role" "user_role" NOT NULL,
	"title" varchar(128) NOT NULL,
	"avatar_initials" varchar(4) NOT NULL,
	"prc_license" varchar(64),
	"pan_number" varchar(64),
	"contact_number" varchar(32),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "beds" ADD CONSTRAINT "beds_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_disputes" ADD CONSTRAINT "billing_disputes_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_disputes" ADD CONSTRAINT "billing_disputes_charge_id_chargemaster_items_id_fk" FOREIGN KEY ("charge_id") REFERENCES "public"."chargemaster_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_disputes" ADD CONSTRAINT "billing_disputes_assigned_staff_id_users_id_fk" FOREIGN KEY ("assigned_staff_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_disputes" ADD CONSTRAINT "billing_disputes_resolved_by_user_id_users_id_fk" FOREIGN KEY ("resolved_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chargemaster_items" ADD CONSTRAINT "chargemaster_items_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discharge_passes" ADD CONSTRAINT "discharge_passes_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discharge_passes" ADD CONSTRAINT "discharge_passes_promissory_note_id_promissory_notes_id_fk" FOREIGN KEY ("promissory_note_id") REFERENCES "public"."promissory_notes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discharge_passes" ADD CONSTRAINT "discharge_passes_verified_by_user_id_users_id_fk" FOREIGN KEY ("verified_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encounter_timeline_events" ADD CONSTRAINT "encounter_timeline_events_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encounter_timeline_events" ADD CONSTRAINT "encounter_timeline_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_bed_id_beds_id_fk" FOREIGN KEY ("bed_id") REFERENCES "public"."beds"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_attending_physician_id_users_id_fk" FOREIGN KEY ("attending_physician_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hmo_authorizations" ADD CONSTRAINT "hmo_authorizations_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_receipts" ADD CONSTRAINT "payment_receipts_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_receipts" ADD CONSTRAINT "payment_receipts_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "philhealth_claims" ADD CONSTRAINT "philhealth_claims_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "philhealth_claims" ADD CONSTRAINT "philhealth_claims_assigned_auditor_id_users_id_fk" FOREIGN KEY ("assigned_auditor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promissory_notes" ADD CONSTRAINT "promissory_notes_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "statutory_waterfalls" ADD CONSTRAINT "statutory_waterfalls_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_audit_logs" ADD CONSTRAINT "system_audit_logs_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_audit_logs" ADD CONSTRAINT "system_audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_beds_facility_status" ON "beds" USING btree ("facility_id","status");--> statement-breakpoint
CREATE INDEX "idx_billing_disputes_encounter" ON "billing_disputes" USING btree ("encounter_id","status");--> statement-breakpoint
CREATE INDEX "idx_chargemaster_encounter" ON "chargemaster_items" USING btree ("encounter_id");--> statement-breakpoint
CREATE INDEX "idx_chargemaster_dispute" ON "chargemaster_items" USING btree ("encounter_id","is_disputed");--> statement-breakpoint
CREATE INDEX "idx_discharge_passes_number" ON "discharge_passes" USING btree ("pass_number");--> statement-breakpoint
CREATE INDEX "idx_discharge_passes_hmac" ON "discharge_passes" USING btree ("hmac_signature");--> statement-breakpoint
CREATE INDEX "idx_timeline_encounter" ON "encounter_timeline_events" USING btree ("encounter_id","event_timestamp");--> statement-breakpoint
CREATE INDEX "idx_encounters_facility_stage" ON "encounters" USING btree ("facility_id","stage");--> statement-breakpoint
CREATE INDEX "idx_encounters_mgh_time" ON "encounters" USING btree ("mgh_order_timestamp");--> statement-breakpoint
CREATE INDEX "idx_encounters_magic_token" ON "encounters" USING btree ("magic_token_hash");--> statement-breakpoint
CREATE INDEX "idx_hmo_authorizations_status" ON "hmo_authorizations" USING btree ("final_loa_status");--> statement-breakpoint
CREATE INDEX "idx_patients_mrn" ON "patients" USING btree ("facility_id","mrn");--> statement-breakpoint
CREATE INDEX "idx_payments_encounter" ON "payments" USING btree ("encounter_id");--> statement-breakpoint
CREATE INDEX "idx_payments_idempotency" ON "payments" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "idx_philhealth_claims_status" ON "philhealth_claims" USING btree ("status","rth_risk_score");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_resource" ON "system_audit_logs" USING btree ("resource_type","resource_id");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_facility_time" ON "system_audit_logs" USING btree ("facility_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_user_sessions_lookup" ON "user_sessions" USING btree ("token_hash","expires_at");--> statement-breakpoint
CREATE INDEX "idx_users_facility_role" ON "users" USING btree ("facility_id","role");