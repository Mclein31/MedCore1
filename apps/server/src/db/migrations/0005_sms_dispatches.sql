CREATE TABLE IF NOT EXISTS "sms_dispatches" (
	"id" uuid PRIMARY KEY NOT NULL,
	"facility_id" uuid NOT NULL,
	"encounter_id" uuid NOT NULL,
	"user_id" uuid,
	"recipient_doctor_id" uuid,
	"request_key" varchar(128) NOT NULL,
	"template_type" varchar(32) NOT NULL,
	"recipient_phone" varchar(32) NOT NULL,
	"recipient_name" varchar(255) NOT NULL,
	"message_body" text NOT NULL,
	"is_simulated" boolean NOT NULL,
	"result" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sms_dispatches_facility_request_key" UNIQUE("facility_id","request_key")
);

--> statement-breakpoint

ALTER TABLE "sms_dispatches" ADD CONSTRAINT "sms_dispatches_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "sms_dispatches" ADD CONSTRAINT "sms_dispatches_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "sms_dispatches" ADD CONSTRAINT "sms_dispatches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "sms_dispatches" ADD CONSTRAINT "sms_dispatches_recipient_doctor_id_users_id_fk" FOREIGN KEY ("recipient_doctor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint

CREATE INDEX "sms_dispatches_facility_time" ON "sms_dispatches" USING btree ("facility_id","created_at");
