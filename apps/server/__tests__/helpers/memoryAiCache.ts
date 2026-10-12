import type { AiCacheEntry, AiCacheFailure, AiCacheStore } from '../../src/services/ai/aiResultCache';

// Deterministic test double for the atomic store contract; production always uses PostgreSQL.
export class MemoryAiCacheStore implements AiCacheStore {
  rows = new Map<string, AiCacheEntry & { expiry: number; leaseExpiry: number }>();
  now = Date.now();
  async read(key: string) {
    const row = this.rows.get(key);
    return row ? structuredClone({ ...row, fresh: row.value !== null && row.expiry > this.now, busy: row.leaseExpiry > this.now }) : null;
  }
  async acquire(key: string, _module: string, token: string, force: boolean, observed: string | null, observedFailure: string | null = null) {
    const row = await this.read(key);
    if ((row?.failedLease || null) !== observedFailure || row?.busy || (row?.fresh && !(force && row.generation === observed))) return false;
    this.rows.set(key, { value: null, generation: null, fresh: false, busy: false, failedLease: null, failure: null, expiry: 0, ...this.rows.get(key), lease: token, leaseExpiry: this.now + 90_000 });
    return true;
  }
  async publish(key: string, token: string, value: unknown, ttlMs: number) {
    const row = this.rows.get(key);
    if (!row || row.lease !== token || row.leaseExpiry <= this.now) return false;
    Object.assign(row, { value: structuredClone(value), generation: token, expiry: this.now + ttlMs, lease: null, leaseExpiry: 0 });
    return true;
  }
  async fail(key: string, token: string, failure: AiCacheFailure) {
    const row = this.rows.get(key);
    if (row?.lease === token) Object.assign(row, { lease: null, leaseExpiry: 0, failedLease: token, failure });
  }
  async invalidate(key: string, generation: string) {
    const row = this.rows.get(key);
    if (row?.generation === generation) Object.assign(row, { value: null, expiry: 0 });
  }
}
