-- Database-level guarantees that hold even if application code is wrong or a
-- session is stolen: the money trail and the audit trail cannot be rewritten.

-- 1. The audit log is append-only.
CREATE OR REPLACE FUNCTION medcore_reject_change() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION '% on % is not allowed: this table is append-only', TG_OP, TG_TABLE_NAME
    USING ERRCODE = 'insufficient_privilege';
END $$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER audit_logs_append_only
  BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION medcore_reject_change();
--> statement-breakpoint
CREATE TRIGGER audit_logs_no_truncate
  BEFORE TRUNCATE ON audit_logs
  FOR EACH STATEMENT EXECUTE FUNCTION medcore_reject_change();
--> statement-breakpoint

-- 2. Payments and official receipts are immutable once written. Corrections are new rows.
CREATE TRIGGER payments_immutable
  BEFORE UPDATE OR DELETE ON payments
  FOR EACH ROW EXECUTE FUNCTION medcore_reject_change();
--> statement-breakpoint
CREATE TRIGGER receipts_immutable
  BEFORE UPDATE OR DELETE ON receipts
  FOR EACH ROW EXECUTE FUNCTION medcore_reject_change();
--> statement-breakpoint

-- 3. Financial and clinical-billing records are never deleted (void or reverse instead).
CREATE TRIGGER encounters_no_delete BEFORE DELETE ON encounters
  FOR EACH ROW EXECUTE FUNCTION medcore_reject_change();
--> statement-breakpoint
CREATE TRIGGER charges_no_delete BEFORE DELETE ON charges
  FOR EACH ROW EXECUTE FUNCTION medcore_reject_change();
--> statement-breakpoint
CREATE TRIGGER promissory_notes_no_delete BEFORE DELETE ON promissory_notes
  FOR EACH ROW EXECUTE FUNCTION medcore_reject_change();
--> statement-breakpoint
CREATE TRIGGER gate_passes_no_delete BEFORE DELETE ON gate_passes
  FOR EACH ROW EXECUTE FUNCTION medcore_reject_change();
--> statement-breakpoint
CREATE TRIGGER disputes_no_delete BEFORE DELETE ON disputes
  FOR EACH ROW EXECUTE FUNCTION medcore_reject_change();
--> statement-breakpoint
CREATE TRIGGER ledgers_no_delete BEFORE DELETE ON ledgers
  FOR EACH ROW EXECUTE FUNCTION medcore_reject_change();
--> statement-breakpoint
CREATE TRIGGER timeline_events_append_only BEFORE UPDATE OR DELETE ON timeline_events
  FOR EACH ROW EXECUTE FUNCTION medcore_reject_change();
--> statement-breakpoint

-- 4. A signed promissory note's terms are frozen; only its status may move.
CREATE OR REPLACE FUNCTION promissory_terms_frozen() RETURNS trigger AS $$
BEGIN
  IF (NEW.principal_cents, NEW.months, NEW.schedule, NEW.terms_hash, NEW.borrower_name,
      NEW.id_number_enc, NEW.signed_at, NEW.encounter_id)
     IS DISTINCT FROM
     (OLD.principal_cents, OLD.months, OLD.schedule, OLD.terms_hash, OLD.borrower_name,
      OLD.id_number_enc, OLD.signed_at, OLD.encounter_id) THEN
    RAISE EXCEPTION 'promissory note terms cannot change after signing' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER promissory_notes_terms_frozen BEFORE UPDATE ON promissory_notes
  FOR EACH ROW EXECUTE FUNCTION promissory_terms_frozen();
--> statement-breakpoint

-- 5. Retention: expired auth artifacts are purged by the scheduled job (see services/retention.ts).
CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON sessions (expires_at);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS login_codes_expiry_idx ON login_codes (expires_at);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS rate_limit_buckets_window_idx ON rate_limit_buckets (window_start);
