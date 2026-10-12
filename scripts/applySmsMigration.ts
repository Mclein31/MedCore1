// Additive sandbox SMS storage only. Never seeds or changes patient/billing records.
import { readFile } from 'node:fs/promises';
import pg from 'pg';
try { process.loadEnvFile('.env'); } catch { /* Explicit environment is also supported. */ }
const connectionString = process.env.MEDCORE_SMS_DATABASE_URL || process.env.DATABASE_URL;
if (!connectionString) throw new Error('Set MEDCORE_SMS_DATABASE_URL or DATABASE_URL to the intended application database.');
const pool = new pg.Pool({ connectionString, max: 1, connectionTimeoutMillis: 10_000 });
let client: pg.PoolClient | undefined;
try {
  client = await pool.connect();
  await client.query('BEGIN');
  const existing = await client.query("SELECT to_regclass(current_schema() || '.sms_dispatches') AS present");
  if (!existing.rows[0].present) {
    await client.query(await readFile(new URL('../apps/server/src/db/migrations/0005_sms_dispatches.sql', import.meta.url), 'utf8'));
  }
  const columns = await client.query("SELECT column_name,is_nullable FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='sms_dispatches'");
  const expected = ['id', 'facility_id', 'encounter_id', 'user_id', 'recipient_doctor_id', 'request_key', 'template_type', 'recipient_phone', 'recipient_name', 'message_body', 'is_simulated', 'result', 'created_at'];
  if (columns.rows.length !== expected.length || !expected.every(name => columns.rows.some(row => row.column_name === name)) || columns.rows.find(row => row.column_name === 'result')?.is_nullable !== 'NO') throw new Error('SMS storage schema verification failed.');
  const constraints = await client.query("SELECT contype FROM pg_constraint WHERE conrelid=(current_schema() || '.sms_dispatches')::regclass");
  if (constraints.rows.filter(row=>row.contype==='f').length!==4 || !constraints.rows.some(row=>row.contype==='p') || !constraints.rows.some(row=>row.contype==='u')) throw new Error('SMS storage constraints verification failed.');
  await client.query('COMMIT');
  console.log('SMS_STORAGE_VERIFIED: sandbox dispatch table/index/constraints are ready; no patient, billing or payment rows changed.');
} catch (error) {
  if (client) await client.query('ROLLBACK').catch(() => {});
  console.error('SMS_STORAGE_MIGRATION_FAILED', error instanceof Error ? error.name : 'Error', (error as { code?: string })?.code || '');
  process.exitCode = 1;
} finally { client?.release(); await pool.end(); }
