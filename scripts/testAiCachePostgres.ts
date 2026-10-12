// Real concurrent PostgreSQL stores in a disposable schema; no clinical data or model credits.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../apps/server/src/db/schema';
import { runWithDb } from '../apps/server/src/db';
import { cachedAiResult, PostgresAiCacheStore, runWithAiCacheStore, type CachedAiOptions } from '../apps/server/src/services/ai/aiResultCache';
import { AiInferenceError } from '../apps/server/src/services/ai/geminiClient';

const url = process.env.MEDCORE_AI_CACHE_TEST_DATABASE_URL || 'postgresql://mclein@127.0.0.1:5432/medcore_payment_validation_sync';
const target = new URL(url);
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(target.hostname), 'Only local disposable validation databases are allowed.');
assert.match(target.pathname, /^\/medcore_payment_validation_sync(?:_[a-z0-9]+)?$/);
assert.ok(!target.search && !target.hash);
const testSchema = `ai_cache_test_${randomUUID().replaceAll('-', '')}`;
const admin = new pg.Pool({ connectionString: url, max: 1, connectionTimeoutMillis: 3000 });
const pools = [0, 1].map(() => new pg.Pool({ connectionString: url, max: 2, connectionTimeoutMillis: 3000, options: `-c search_path=${testSchema}` }));
process.env.TEST_LIVE_AI = '1';
let checks = 0;
const pass = (label: string) => { checks++; console.log(`[PASS] ${label}`); };
try {
  await admin.query(`CREATE SCHEMA "${testSchema}"`);
  const ddl = await readFile(new URL('../apps/server/src/db/migrations/0004_ai_result_cache.sql', import.meta.url), 'utf8');
  await pools[0].query(ddl);
  const dbs = pools.map(pool => drizzle(pool, { schema }));
  const stores = pools.map(() => new PostgresAiCacheStore());
  const env = { NODE_ENV: 'production', GEMINI_API_KEY: 'synthetic-test-key', GEMINI_MODEL: 'postgres-fixture' };
  let calls = 0;
  const base: CachedAiOptions<{ text: string }> = { module: 'postgres-verifier', input: 'same', scope: { userId: 'synthetic-user' }, ttlMs: 1000, env,
    validate: value => { assert.equal(typeof (value as any)?.text, 'string'); return value as { text: string }; },
    generate: async () => { calls++; await new Promise(r => setTimeout(r, 75)); return { text: `generation-${calls}` }; } };
  const run = (index: number, changes: Partial<typeof base> = {}) => runWithDb(dbs[index], () => runWithAiCacheStore(stores[index], () => cachedAiResult({ ...base, ...changes })));
  const results = await Promise.all(Array.from({ length: 8 }, (_, i) => run(i % 2)));
  assert.equal(calls, 1); assert.ok(results.every(result => result.text === 'generation-1'));
  pass('Eight concurrent requests across independent PostgreSQL pools spend one generation');
  assert.equal((await run(1)).text, 'generation-1'); assert.equal(calls, 1);
  pass('Independent store instances reuse persisted results');
  await Promise.all([run(0, { forceRefresh: true }), run(1, { forceRefresh: true })]); assert.equal(calls, 2);
  pass('Concurrent forced refreshes create exactly one replacement generation');
  await pools[0].query("UPDATE ai_result_cache SET expires_at = now() - interval '1 second'");
  await run(1); assert.equal(calls, 3); pass('Database expiry regenerates once');
  let failures = 0;
  const errorOptions = { input: 'failure', generate: async () => { failures++; await new Promise(r => setTimeout(r, 75)); throw new AiInferenceError('AI_UPSTREAM_ERROR', 'Private synthetic details'); } };
  const errors = await Promise.allSettled([run(0, errorOptions), run(1, errorOptions)]);
  assert.equal(failures, 1); assert.ok(errors.every(error => error.status === 'rejected' && error.reason.code === 'AI_UPSTREAM_ERROR'));
  assert.ok(!JSON.stringify((await pools[0].query('SELECT * FROM ai_result_cache')).rows).includes('Private synthetic details'));
  await run(1, { input: 'failure' }); pass('Concurrent failures are shared safely and a subsequent request can retry');
  const tokenA = randomUUID(), tokenB = randomUUID(), key = 'a'.repeat(64);
  await runWithDb(dbs[0], () => stores[0].acquire(key, 'lease', tokenA, false, null, null));
  await pools[0].query("UPDATE ai_result_cache SET lease_until=now()-interval '1 second' WHERE cache_key=$1", [key]);
  assert.equal(await runWithDb(dbs[1], () => stores[1].acquire(key, 'lease', tokenB, false, null, null)), true);
  assert.equal(await runWithDb(dbs[0], () => stores[0].publish(key, tokenA, { text: 'stale' }, 1000)), false);
  await runWithDb(dbs[0], () => stores[0].fail(key, tokenA, { code: 'STALE', status: 502 }));
  assert.equal((await runWithDb(dbs[1], () => stores[1].read(key)))?.lease, tokenB);
  pass('Expired owners cannot publish or release a replacement PostgreSQL lease');
  // Acquisition contender missed the busy observation: a new failure still fences it.
  const failedKey = 'b'.repeat(64), failedOwner = randomUUID();
  await runWithDb(dbs[0], () => stores[0].acquire(failedKey, 'failure', failedOwner, false, null, null));
  await runWithDb(dbs[0], () => stores[0].fail(failedKey, failedOwner, { code: 'AI_UPSTREAM_ERROR', status: 502 }));
  assert.equal(await runWithDb(dbs[1], () => stores[1].acquire(failedKey, 'failure', randomUUID(), false, null, null)), false);
  assert.equal(await runWithDb(dbs[1], () => stores[1].acquire(failedKey, 'failure', randomUUID(), false, null, failedOwner)), true);
  pass('Fast-failure contenders do not silently start another paid request');
  console.log(`${checks} real PostgreSQL AI cache groups passed; zero model credits used.`);
} finally {
  await Promise.all(pools.map(pool => pool.end()));
  await admin.query(`DROP SCHEMA IF EXISTS "${testSchema}" CASCADE`);
  await admin.end();
  delete process.env.TEST_LIVE_AI;
}
