// Additive AI-audit migration only (audit D12). Creates ai_conversations and ai_audit_logs if missing.
// Never reseeds, changes existing rows or runs unrelated migrations. Safe to re-run.
import { readFile } from 'node:fs/promises';
import pg from 'pg';
try { process.loadEnvFile('.env'); } catch { /* Environment may be supplied directly. */ }
const connectionString = process.env.MEDCORE_AI_AUDIT_DATABASE_URL || process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!connectionString) throw new Error('Set MEDCORE_AI_AUDIT_DATABASE_URL, DATABASE_URL_UNPOOLED or DATABASE_URL to the intended application database.');
if (process.env.NEON_BRANCH === 'production') throw new Error('Refusing to run against the Neon production branch.');
console.log('Database host:', new URL(connectionString).host);
const pool = new pg.Pool({ connectionString, max: 1, connectionTimeoutMillis: 10_000 });
let client: pg.PoolClient | undefined;
try {
  client = await pool.connect();
  await client.query('BEGIN');
  await client.query(await readFile(new URL('../apps/server/src/db/migrations/0006_ai_audit_tables.sql', import.meta.url), 'utf8'));
  const expected: Record<string, number> = { ai_conversations: 11, ai_audit_logs: 18 };
  const columns = await client.query("SELECT table_name, count(*)::int AS n FROM information_schema.columns WHERE table_schema=current_schema() AND table_name = ANY($1) GROUP BY table_name", [Object.keys(expected)]);
  const fks = await client.query("SELECT count(*)::int AS n FROM pg_constraint WHERE contype='f' AND conrelid IN ('ai_conversations'::regclass, 'ai_audit_logs'::regclass)");
  const ok = Object.entries(expected).every(([table, n]) => columns.rows.some(row => row.table_name === table && row.n === n)) && fks.rows[0].n === 8;
  if (!ok) throw new Error('AI audit schema verification failed.');
  await client.query('COMMIT');
  console.log('AI_AUDIT_MIGRATION_VERIFIED: ai_conversations and ai_audit_logs are ready; no existing records changed.');
} catch (error) {
  if (client) await client.query('ROLLBACK').catch(() => {});
  // SQL errors can embed credentials/parameters; report only the error class and safe code.
  console.error('AI_AUDIT_MIGRATION_FAILED', error instanceof Error ? error.name : 'Error', (error as { code?: string })?.code || '', error instanceof Error && error.message.startsWith('AI audit') ? error.message : '');
  process.exitCode = 1;
} finally { client?.release(); await pool.end(); }
