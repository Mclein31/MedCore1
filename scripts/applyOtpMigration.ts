// Applies 0006_patient_email_otp.sql to the Neon `demo` branch (or a local database).
// Refuses the Neon `production` branch: it only receives schema through a reviewed migration.
// Hosted migrations are drifted (audit D12), so this follows applySmsMigration.ts and does not
// write drizzle.__drizzle_migrations.
import { readFile } from 'node:fs/promises';
import pg from 'pg';
try { process.loadEnvFile('.env'); } catch { /* Explicit environment is also supported. */ }

const DEMO_ENDPOINT = 'ep-wandering-shadow-azd4q0ln';
const PRODUCTION_ENDPOINT = 'ep-long-term-aziioyiq';
const connectionString = process.env.MEDCORE_OTP_DATABASE_URL || process.env.DATABASE_URL_UNPOOLED;
if (!connectionString) throw new Error('Set DATABASE_URL_UNPOOLED (Neon demo) or MEDCORE_OTP_DATABASE_URL (local).');
const host = new URL(connectionString).hostname;
const local = ['localhost', '127.0.0.1', '::1', '[::1]'].includes(host);
if (host.includes(PRODUCTION_ENDPOINT)) throw new Error('Refusing to migrate the Neon production branch.');
if (!local && !(host.startsWith(DEMO_ENDPOINT) && process.env.NEON_BRANCH === 'demo')) {
  throw new Error(`Refusing ${host}: only the Neon demo branch (${DEMO_ENDPOINT}, NEON_BRANCH=demo) or a local database.`);
}

const pool = new pg.Pool({ connectionString, max: 1, connectionTimeoutMillis: 10_000 });
let client: pg.PoolClient | undefined;
try {
  client = await pool.connect();
  await client.query('BEGIN');
  const existing = await client.query("SELECT to_regclass(current_schema() || '.login_codes') AS present");
  if (!existing.rows[0].present) {
    const sqlText = await readFile(new URL('../apps/server/src/db/migrations/0006_patient_email_otp.sql', import.meta.url), 'utf8');
    await client.query(sqlText.replaceAll('--> statement-breakpoint', ''));
  }
  const columns = await client.query(`SELECT table_name, column_name, is_nullable FROM information_schema.columns
    WHERE table_schema = current_schema() AND ((table_name = 'users' AND column_name IN ('password_hash', 'salt'))
      OR (table_name = 'patients' AND column_name = 'email')
      OR (table_name = 'user_sessions' AND column_name IN ('revoked_at', 'last_seen_at')))`);
  if (columns.rows.length !== 5 || columns.rows.some(row => row.table_name === 'users' && row.is_nullable !== 'YES')) throw new Error('OTP column verification failed.');
  const indexes = await client.query("SELECT indexname FROM pg_indexes WHERE schemaname = current_schema() AND indexname IN ('users_email_lower_uq', 'login_codes_email_idx', 'patient_account_links_active_uq')");
  if (indexes.rows.length !== 3) throw new Error('OTP index verification failed.');
  const links = await client.query('SELECT count(*)::int AS n FROM patient_account_links');
  await client.query('COMMIT');
  console.log(`OTP_STORAGE_VERIFIED on ${local ? 'local database' : 'Neon demo'}: login_codes, patient_account_links (${links.rows[0].n} links), patients.email, session columns.`);
} catch (error) {
  if (client) await client.query('ROLLBACK').catch(() => {});
  console.error('OTP_MIGRATION_FAILED', error instanceof Error ? error.message : 'Error', (error as { code?: string })?.code || '');
  process.exitCode = 1;
} finally { client?.release(); await pool.end(); }
