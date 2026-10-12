// Rebuild and seed ONLY the dedicated local SMS validation database.
// The old test:api command could reseed the ordinary application database.
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { createDbConnection } from '../apps/server/src/db';

const url = process.env.MEDCORE_SMS_TEST_DATABASE_URL || 'postgresql://mclein@127.0.0.1:5432/medcore_sms_validation';
const target = new URL(url);
assert.ok(['postgres:', 'postgresql:'].includes(target.protocol));
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(target.hostname), 'API fixture resets require a local database.');
assert.match(target.pathname, /^\/medcore_sms_validation(?:_[a-z0-9]+)?$/, 'Refusing to reset a hospital or unrelated database.');
assert.ok(!target.search && !target.hash, 'Connection override options are not allowed.');
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = url;
process.env.SEMAPHORE_API_KEY = 'synthetic-key-is-ignored-by-sandbox';
const root = fileURLToPath(new URL('../', import.meta.url));
const env = { ...process.env, DATABASE_URL: url, NODE_ENV: 'test', TEST_LIVE_AI: '' };
const run = (args: string[]) => {
  const child = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  if (child.stdout) process.stdout.write(child.stdout.replaceAll(url, '[local SMS validation database]'));
  if (child.stderr) process.stderr.write(child.stderr.replaceAll(url, '[local SMS validation database]'));
  assert.equal(child.status, 0, 'Validation child process failed.');
};
const adminUrl = new URL(url); adminUrl.pathname = '/postgres';
const admin = createDbConnection(adminUrl.toString());
try {
  if (!(await admin.pool.query('SELECT 1 FROM pg_database WHERE datname=$1', [target.pathname.slice(1)])).rowCount) {
    await admin.pool.query(`CREATE DATABASE "${target.pathname.slice(1)}"`);
  }
} finally { await admin.pool.end(); }

// Bootstrap the current schema in a disposable fixture. Existing migration snapshot drift
// (older AI tables) must not cause unrelated production migration changes for this feature.
const temporary = await mkdtemp(join(tmpdir(), 'medcore-sms-schema-'));
const config = join(temporary, 'drizzle.config.ts');
await writeFile(config, `export default ${JSON.stringify({ schema: join(root, 'apps/server/src/db/schema.ts'), out: join(temporary, 'migrations'), dialect: 'postgresql' })};\n`);
run([join(root, 'node_modules/drizzle-kit/bin.cjs'), 'generate', '--config', config]);
const connection = createDbConnection(url);
try {
  await connection.pool.query('DROP SCHEMA IF EXISTS public CASCADE');
  await connection.pool.query('CREATE SCHEMA public');
  await connection.pool.query('DROP SCHEMA IF EXISTS drizzle CASCADE');
  await migrate(connection.db, { migrationsFolder: join(temporary, 'migrations') });
} finally { await connection.pool.end(); }
run(['--import', './node_modules/tsx/dist/loader.mjs', 'scripts/seedPostgres.ts']);
run(['--import', './node_modules/tsx/dist/loader.mjs', 'scripts/testBackendApi.ts']);
run(['--import', './node_modules/tsx/dist/loader.mjs', 'scripts/testSmsNotifications.ts']);
console.log('API_AND_SMS_VALIDATION_DONE: dedicated local fixture only; no SMS gateway or model credits.');
