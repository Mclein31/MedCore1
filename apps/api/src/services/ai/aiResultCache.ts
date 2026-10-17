import { AsyncLocalStorage } from 'node:async_hooks';
import { createHash } from 'node:crypto';
import type { AiConfig } from '../../env';
import { AiInferenceError, isAiEnabled, resolveAiConfig } from './geminiClient';

const CACHE_REVISION = 'ai-results-v2';
const MAX_RESULT_BYTES = 256 * 1024;
export const AI_CACHE_TTL = {
  cora: 5 * 60_000,
  claims: 30 * 60_000,
  appeal: 30 * 60_000,
  briefing: 5 * 60_000,
  ocr: 5 * 60_000,
};

export interface AiCacheScope {
  userId?: string;
  facilityId?: string;
  encounterId?: string;
}

export type AiCacheOutcome = 'HIT' | 'SHARED' | 'GENERATED' | 'REFRESHED';

const observationContext = new AsyncLocalStorage<{
  outcome?: AiCacheOutcome;
  notify: (outcome: AiCacheOutcome) => void;
}>();

export function observeAiCache<T>(notify: (outcome: AiCacheOutcome) => void, fn: () => T): T {
  return observationContext.run({ notify }, fn);
}

export function currentAiCacheOutcome(): AiCacheOutcome | undefined {
  return observationContext.getStore()?.outcome;
}

function recordOutcome(outcome: AiCacheOutcome) {
  const observer = observationContext.getStore();
  if (observer) {
    observer.outcome = outcome;
    observer.notify(outcome);
  }
}

function canonical(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, v]) => v !== undefined)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, canonical(v)]),
    );
  }
  return value;
}

export function aiInputDigest(value: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify(canonical(value)))
    .digest('hex');
}

interface MemoryCacheItem {
  value?: unknown;
  expiresAt: number;
  inFlight?: Promise<unknown>;
}

const memoryCache = new Map<string, MemoryCacheItem>();

export interface CachedAiOptions<T> {
  module: string;
  scope: AiCacheScope;
  input: unknown;
  ttlMs: number;
  aiConfig?: AiConfig;
  forceRefresh?: boolean;
  validate: (value: unknown) => T;
  generate: () => Promise<T>;
}

export async function cachedAiResult<T>(options: CachedAiOptions<T>): Promise<T> {
  if (!isAiEnabled(options.aiConfig)) {
    throw new AiInferenceError(
      'AI_NOT_CONFIGURED',
      'Live AI is unavailable. Configure the server Gemini credentials; no draft was generated.',
      503,
    );
  }
  const config = resolveAiConfig(options.aiConfig);
  const key = aiInputDigest({
    revision: CACHE_REVISION,
    module: options.module,
    scope: options.scope,
    models: [config.model, config.backupModel, config.proModel],
    input: options.input,
  });

  const now = Date.now();
  const existing = memoryCache.get(key);

  if (existing && !options.forceRefresh) {
    if (existing.value !== undefined && existing.expiresAt > now) {
      try {
        const result = options.validate(structuredClone(existing.value));
        recordOutcome('HIT');
        return result;
      } catch {
        memoryCache.delete(key);
      }
    } else if (existing.inFlight) {
      const sharedValue = await existing.inFlight;
      const result = options.validate(structuredClone(sharedValue));
      recordOutcome('SHARED');
      return result;
    }
  }

  const generationPromise = (async () => {
    const generated = options.validate(await options.generate());
    if (Buffer.byteLength(JSON.stringify(generated)) > MAX_RESULT_BYTES) {
      throw new AiInferenceError(
        'AI_INVALID_RESPONSE',
        'The generated result exceeded the accepted size. No draft was cached.',
      );
    }
    return generated;
  })();

  memoryCache.set(key, {
    value: existing?.value,
    expiresAt: existing?.expiresAt ?? 0,
    inFlight: generationPromise,
  });

  try {
    const result = await generationPromise;
    memoryCache.set(key, {
      value: structuredClone(result),
      expiresAt: Date.now() + options.ttlMs,
    });
    if (memoryCache.size > 500) {
      const cutoff = Date.now();
      for (const [k, v] of memoryCache.entries()) {
        if (!v.inFlight && v.expiresAt <= cutoff) memoryCache.delete(k);
      }
    }
    recordOutcome(options.forceRefresh ? 'REFRESHED' : 'GENERATED');
    return structuredClone(result);
  } catch (err) {
    memoryCache.delete(key);
    throw err;
  }
}
