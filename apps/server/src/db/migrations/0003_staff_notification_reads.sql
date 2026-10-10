CREATE TABLE "staff_notification_reads" (
	"facility_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"notification_id" varchar(128) NOT NULL,
	"read_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "staff_notification_reads_facility_id_user_id_notification_id_pk" PRIMARY KEY("facility_id","user_id","notification_id")
);
--> statement-breakpoint
ALTER TABLE "staff_notification_reads" ADD CONSTRAINT "staff_notification_reads_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_notification_reads" ADD CONSTRAINT "staff_notification_reads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;