import { AsyncLocalStorage } from 'node:async_hooks';
import { createHash, randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { db } from '../../db';
import { getAiConfig, isAiEnabled } from '../../config/aiConfig';
import { AiInferenceError } from './geminiClient';

// Increment when generation policy/normalization changes beyond the keyed prompts.
const CACHE_REVISION = 'ai-results-v1';
const LEASE_MS = 90_000; // Longer than the bounded topic + answer generation budget.
const WAIT_MS = 70_000;
const MAX_RESULT_BYTES = 256 * 1024;
export const AI_CACHE_TTL = { cora: 5 * 60_000, claims: 30 * 60_000, appeal: 30 * 60_000, briefing: 5 * 60_000, ocr: 5 * 60_000 };

export interface AiCacheScope { userId?: string; facilityId?: string; encounterId?: string }
export interface AiCacheFailure { code: string; status: number }
export interface AiCacheEntry {
  value: unknown; generation: string | null; fresh: boolean;
  lease: string | null; busy: boolean; failedLease: string | null; failure: AiCacheFailure | null;
}
export interface AiCacheStore {
  read(key: string): Promise<AiCacheEntry | null>;
  acquire(key: string, module: string, token: string, force: boolean, observedGeneration: string | null, observedFailure: string | null): Promise<boolean>;
  publish(key: string, token: string, value: unknown, ttlMs: number): Promise<boolean>;
  fail(key: string, token: string, failure: AiCacheFailure): Promise<void>;
  invalidate(key: string, generation: string): Promise<void>;
}

export class PostgresAiCacheStore implements AiCacheStore {
  async read(key: string): Promise<AiCacheEntry | null> {
    const { rows } = await db.execute(sql`SELECT result AS value, generation_token AS generation,
      (expires_at > clock_timestamp() AND result IS NOT NULL) AS fresh,
      lease_token AS lease, (lease_until > clock_timestamp()) AS busy,
      failed_lease AS "failedLease", failure FROM ai_result_cache WHERE cache_key = ${key}`);
    return (rows[0] as unknown as AiCacheEntry) || null;
  }
  async acquire(key: string, module: string, token: string, force: boolean, observedGeneration: string | null, observedFailure: string | null): Promise<boolean> {
    const { rows } = await db.execute(sql`INSERT INTO ai_result_cache (cache_key, module, lease_token, lease_until)
      VALUES (${key}, ${module}, ${token}::uuid, clock_timestamp() + ${LEASE_MS} * interval '1 millisecond')
      ON CONFLICT (cache_key) DO UPDATE SET lease_token = EXCLUDED.lease_token,
        lease_until = EXCLUDED.lease_until, updated_at = clock_timestamp()
      WHERE (ai_result_cache.lease_until IS NULL OR ai_result_cache.lease_until <= clock_timestamp())
        AND (ai_result_cache.result IS NULL OR ai_result_cache.expires_at <= clock_timestamp()
          OR (${force} AND ai_result_cache.generation_token IS NOT DISTINCT FROM ${observedGeneration}::uuid))
        AND ai_result_cache.failed_lease IS NOT DISTINCT FROM ${observedFailure}::uuid
      RETURNING cache_key`);
    return rows.length === 1;
  }
  async publish(key: string, token: string, value: unknown, ttlMs: number): Promise<boolean> {
    const { rows } = await db.execute(sql`UPDATE ai_result_cache SET result = ${JSON.stringify(value)}::jsonb,
      generation_token = ${token}::uuid, expires_at = clock_timestamp() + ${ttlMs} * interval '1 millisecond',
      lease_token = NULL, lease_until = NULL, updated_at = clock_timestamp()
      WHERE cache_key = ${key} AND lease_token = ${token}::uuid AND lease_until > clock_timestamp() RETURNING cache_key`);
    // Bounded opportunistic cleanup; never touches hospital records or active jobs.
    if (Math.random() < 0.02) {
      try {
        await db.execute(sql`DELETE FROM ai_result_cache WHERE cache_key IN
          (SELECT cache_key FROM ai_result_cache WHERE updated_at < clock_timestamp() - interval '1 day'
            AND (expires_at IS NULL OR expires_at < clock_timestamp())
            AND (lease_until IS NULL OR lease_until < clock_timestamp()) LIMIT 100)
          AND updated_at < clock_timestamp() - interval '1 day'
          AND (expires_at IS NULL OR expires_at < clock_timestamp())
          AND (lease_until IS NULL OR lease_until < clock_timestamp())`);
      } catch { /* Cleanup must not turn an already published success into an error. */ }
    }
    return rows.length === 1;
  }
  async fail(key: string, token: string, failure: AiCacheFailure): Promise<void> {
    await db.execute(sql`UPDATE ai_result_cache SET lease_token = NULL, lease_until = NULL,
      failed_lease = ${token}::uuid, failure = ${JSON.stringify(failure)}::jsonb, updated_at = clock_timestamp()
      WHERE cache_key = ${key} AND lease_token = ${token}::uuid`);
  }
  async invalidate(key: string, generation: string): Promise<void> {
    await db.execute(sql`UPDATE ai_result_cache SET result = NULL, expires_at = NULL
      WHERE cache_key = ${key} AND generation_token = ${generation}::uuid`);
  }
}

// Contextual injection for isolated tests, never a production in-memory fallback.
const storeContext = new AsyncLocalStorage<AiCacheStore>();
const postgresStore = new PostgresAiCacheStore();
export function runWithAiCacheStore<T>(store: AiCacheStore, fn: () => T): T { return storeContext.run(store, fn); }
export type AiCacheOutcome = 'HIT' | 'SHARED' | 'GENERATED' | 'REFRESHED';
const observationContext = new AsyncLocalStorage<{ outcome?: AiCacheOutcome; notify: (outcome: AiCacheOutcome) => void }>();
export function observeAiCache<T>(notify: (outcome: AiCacheOutcome) => void, fn: () => T): T {
  return observationContext.run({ notify }, fn);
}
export function currentAiCacheOutcome(): AiCacheOutcome | undefined { return observationContext.getStore()?.outcome; }
function recordOutcome(outcome: AiCacheOutcome) {
  const observer = observationContext.getStore();
  if (observer) { observer.outcome = outcome; observer.notify(outcome); }
}
function canonical(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, canonical(v)]));
  return value;
}
export function aiInputDigest(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
}
async function storage<T>(fn: () => Promise<T>): Promise<T> {
  try { return await fn(); }
  catch { throw new AiInferenceError('AI_CACHE_UNAVAILABLE', 'AI request coordination is unavailable. Please retry shortly; duplicate generation is paused.', 503); }
}

export interface CachedAiOptions<T> {
  module: string; scope: AiCacheScope; input: unknown; ttlMs: number;
  env?: Record<string, any>; forceRefresh?: boolean;
  validate: (value: unknown) => T;
  generate: () => Promise<T>;
}
export async function cachedAiResult<T>(options: CachedAiOptions<T>): Promise<T> {
  if (!isAiEnabled(options.env)) throw new AiInferenceError('AI_NOT_CONFIGURED', 'Live AI is unavailable. Configure the server Gemini credentials; no draft was generated.', 503);
  const config = getAiConfig(options.env);
  const key = aiInputDigest({ revision: CACHE_REVISION, module: options.module, scope: options.scope,
    models: [config.geminiModel, config.geminiBackupModel, config.geminiProModel], input: options.input });
  const store = storeContext.getStore() || postgresStore;
  const initial = await storage(() => store.read(key));
  const observedGeneration = initial?.generation || null;
  const observedFailure = initial?.failedLease || null;
  let joinedLease: string | null = null;
  let entry = initial;
  const deadline = Date.now() + WAIT_MS;
  while (Date.now() < deadline) {
    if (entry?.failedLease && (entry.failedLease === joinedLease ||
      (entry.failedLease !== observedFailure && (!entry.fresh || (options.forceRefresh && entry.generation === observedGeneration))))) {
      throw new AiInferenceError(entry.failure?.code || 'AI_UNAVAILABLE', 'The shared AI generation failed. Please retry generation.', entry.failure?.status || 502);
    }
    if (entry?.fresh && (!options.forceRefresh || entry.generation !== observedGeneration)) {
      try {
        const result = options.validate(structuredClone(entry.value));
        recordOutcome(joinedLease || (options.forceRefresh && entry.generation !== observedGeneration) ? 'SHARED' : 'HIT');
        return result;
      }
      catch {
        if (entry.generation) await storage(() => store.invalidate(key, entry!.generation!));
        entry = await storage(() => store.read(key));
        continue;
      }
    }
    if (entry?.busy && entry.lease) joinedLease = entry.lease;
    else {
      const token = randomUUID();
      const acquired = await storage(() => store.acquire(key, options.module, token, !!options.forceRefresh, observedGeneration, observedFailure));
      if (acquired) {
        try {
          const result = options.validate(await options.generate());
          if (Buffer.byteLength(JSON.stringify(result)) > MAX_RESULT_BYTES) throw new AiInferenceError('AI_INVALID_RESPONSE', 'The generated result exceeded the accepted size. No draft was cached.');
          const published = await storage(() => store.publish(key, token, result, options.ttlMs));
          if (!published) throw new AiInferenceError('AI_CACHE_LEASE_EXPIRED', 'The shared generation expired. Please retry shortly.', 503);
          recordOutcome(options.forceRefresh ? 'REFRESHED' : 'GENERATED');
          return structuredClone(result);
        } catch (error) {
          const failure = error instanceof AiInferenceError ? { code: error.code, status: error.status } : { code: 'AI_UNAVAILABLE', status: 502 };
          // Store only a safe code/status, never provider bodies, prompts or exception text.
          await storage(() => store.fail(key, token, failure));
          throw error;
        }
      }
    }
    await new Promise(resolve => setTimeout(resolve, 200));
    entry = await storage(() => store.read(key));
  }
  throw new AiInferenceError('AI_GENERATION_PENDING', 'An identical AI request is still processing. Please retry shortly.', 503);
}
