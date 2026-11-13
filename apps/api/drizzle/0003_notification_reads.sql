CREATE TABLE "staff_notification_reads" (
	"staff_id" uuid NOT NULL,
	"notification_id" varchar(80) NOT NULL,
	"read_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "staff_notification_reads" ADD CONSTRAINT "staff_notification_reads_staff_id_staff_users_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "staff_notification_reads_pk" ON "staff_notification_reads" USING btree ("staff_id","notification_id");