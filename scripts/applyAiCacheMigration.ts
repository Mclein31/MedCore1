// Additive AI-cache migration only. Never reseeds, changes billing rows or runs unrelated migrations.
import { readFile } from 'node:fs/promises';
import pg from 'pg';
try { process.loadEnvFile('.env'); } catch { /* Environment may be supplied directly. */ }
const connectionString = process.env.MEDCORE_AI_CACHE_DATABASE_URL || process.env.DATABASE_URL;
if (!connectionString) throw new Error('Set MEDCORE_AI_CACHE_DATABASE_URL or DATABASE_URL to the intended application database.');
const pool = new pg.Pool({ connectionString, max: 1, connectionTimeoutMillis: 10_000 });
let client: pg.PoolClient | undefined;
try {
  client = await pool.connect();
  await client.query('BEGIN');
  await client.query(await readFile(new URL('../apps/server/src/db/migrations/0004_ai_result_cache.sql', import.meta.url), 'utf8'));
  const columns = await client.query("SELECT column_name FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='ai_result_cache'");
  const expected = ['cache_key', 'module', 'result', 'generation_token', 'expires_at', 'lease_token', 'lease_until', 'failed_lease', 'failure', 'updated_at'];
  if (columns.rows.length !== expected.length || !expected.every(column => columns.rows.some(row => row.column_name === column))) throw new Error('AI cache schema verification failed.');
  await client.query('COMMIT');
  console.log('AI_CACHE_MIGRATION_VERIFIED: additive cache table and index are ready; no clinical records changed.');
} catch (error) {
  if (client) await client.query('ROLLBACK').catch(() => {});
  // SQL errors can embed credentials/parameters; report only the error class and safe code.
  console.error('AI_CACHE_MIGRATION_FAILED', error instanceof Error ? error.name : 'Error', (error as { code?: string })?.code || '');
  process.exitCode = 1;
} finally { client?.release(); await pool.end(); }
