-- Patient email sign-in codes (audit 2026-10-16, sections 3 and 4). OTP pieces only.
-- Hand-edited after drizzle-kit generate: the drifted ai_* tables (audit D12) are left out,
-- the case-insensitive email index is created before the old constraint is dropped, and the
-- patient_account_links backfill is added. Apply with scripts/applyOtpMigration.ts (demo only).
CREATE UNIQUE INDEX "users_email_lower_uq" ON "users" USING btree (lower("email"));--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_email_unique";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "salt" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_staff_have_password" CHECK ("users"."role" = 'PATIENT_GUARANTOR' OR ("users"."password_hash" IS NOT NULL AND "users"."salt" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "email" varchar(255);--> statement-breakpoint
ALTER TABLE "user_sessions" ADD COLUMN "last_seen_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD COLUMN "revoked_at" timestamp with time zone;--> statement-breakpoint
CREATE TABLE "login_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"facility_id" uuid NOT NULL,
	"email" varchar(255) NOT NULL,
	"purpose" varchar(16) NOT NULL,
	"patient_id" uuid,
	"code_hash" varchar(64) NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"ip" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "login_codes_purpose_check" CHECK ("login_codes"."purpose" IN ('LOGIN', 'REGISTER')),
	CONSTRAINT "login_codes_attempts_check" CHECK ("login_codes"."attempts" >= 0),
	CONSTRAINT "login_codes_register_patient" CHECK ("login_codes"."purpose" = 'LOGIN' OR "login_codes"."patient_id" IS NOT NULL)
);
--> statement-breakpoint
ALTER TABLE "login_codes" ADD CONSTRAINT "login_codes_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "login_codes" ADD CONSTRAINT "login_codes_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "login_codes_email_idx" ON "login_codes" USING btree (lower("email"),"created_at");--> statement-breakpoint
CREATE TABLE "patient_account_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"verified_via" varchar(32) NOT NULL,
	"verified_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "patient_account_links" ADD CONSTRAINT "patient_account_links_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_account_links" ADD CONSTRAINT "patient_account_links_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "patient_account_links_active_uq" ON "patient_account_links" USING btree ("user_id","patient_id") WHERE "patient_account_links"."revoked_at" IS NULL;--> statement-breakpoint
-- Backfill existing MRN links. users.linked_mrn is dropped in a later migration, once no code reads it.
INSERT INTO "patient_account_links" ("user_id", "patient_id", "verified_via", "verified_at")
  SELECT u.id, p.id, 'LEGACY_MRN', u.created_at
  FROM "users" u JOIN "patients" p ON p.facility_id = u.facility_id AND p.mrn = u.linked_mrn
  WHERE u.role = 'PATIENT_GUARANTOR'
  ON CONFLICT DO NOTHING;
