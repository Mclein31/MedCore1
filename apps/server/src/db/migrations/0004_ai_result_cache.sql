CREATE TABLE IF NOT EXISTS "ai_result_cache" (
  "cache_key" varchar(64) PRIMARY KEY,
  "module" varchar(64) NOT NULL,
  "result" jsonb,
  "generation_token" uuid,
  "expires_at" timestamptz,
  "lease_token" uuid,
  "lease_until" timestamptz,
  "failed_lease" uuid,
  "failure" jsonb,
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_result_cache_expiry_idx" ON "ai_result_cache" ("updated_at");
