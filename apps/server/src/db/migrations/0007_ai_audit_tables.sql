-- Audit D12: ai_conversations and ai_audit_logs were in schema.ts but never generated, so the
-- hosted database lacks them. Additive and idempotent: safe to re-run, creates no other objects.
CREATE TABLE IF NOT EXISTS "ai_conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"facility_id" uuid,
	"encounter_id" uuid,
	"patient_id" uuid,
	"user_id" uuid,
	"module" varchar(64) NOT NULL,
	"session_token" varchar(128),
	"language" varchar(16) DEFAULT 'en',
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ai_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid,
	"facility_id" uuid,
	"encounter_id" uuid,
	"user_id" uuid,
	"module" varchar(64) NOT NULL,
	"action" varchar(64) NOT NULL,
	"model_used" varchar(64) NOT NULL,
	"tokens_prompt" integer,
	"tokens_completion" integer,
	"latency_ms" integer,
	"phi_scrubbed" boolean DEFAULT true NOT NULL,
	"rth_risk_score" numeric(5, 4),
	"status" varchar(32) DEFAULT 'SUCCESS' NOT NULL,
	"error_message" text,
	"request_summary" text,
	"response_summary" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_conversations_facility_id_facilities_id_fk') THEN
		ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_conversations_encounter_id_encounters_id_fk') THEN
		ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_conversations_patient_id_patients_id_fk') THEN
		ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_conversations_user_id_users_id_fk') THEN
		ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
	END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_audit_logs_conversation_id_ai_conversations_id_fk') THEN
		ALTER TABLE "ai_audit_logs" ADD CONSTRAINT "ai_audit_logs_conversation_id_ai_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."ai_conversations"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_audit_logs_facility_id_facilities_id_fk') THEN
		ALTER TABLE "ai_audit_logs" ADD CONSTRAINT "ai_audit_logs_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_audit_logs_encounter_id_encounters_id_fk') THEN
		ALTER TABLE "ai_audit_logs" ADD CONSTRAINT "ai_audit_logs_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_audit_logs_user_id_users_id_fk') THEN
		ALTER TABLE "ai_audit_logs" ADD CONSTRAINT "ai_audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
	END IF;
END $$;
