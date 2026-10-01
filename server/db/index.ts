import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { AsyncLocalStorage } from 'node:async_hooks';
import * as schema from './schema';

const { Pool } = pg;

export type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;

const dbStorage = new AsyncLocalStorage<DrizzleDb>();
const poolCache = new Map<string, { pool: pg.Pool; db: DrizzleDb }>();

export function getDb(connectionString?: string): DrizzleDb {
  const url = connectionString || process.env.DATABASE_URL || 'postgresql://mclein@localhost:5432/aqromed';

  let cached = poolCache.get(url);
  if (!cached) {
    const pool = new Pool({
      connectionString: url,
      max: connectionString ? 5 : 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000
    });
    const dbInstance = drizzle(pool, { schema });
    cached = { pool, db: dbInstance };
    poolCache.set(url, cached);
  }

  return cached.db;
}

export function runWithDb<T>(dbInstance: DrizzleDb, fn: () => T): T {
  return dbStorage.run(dbInstance, fn);
}

export const db: DrizzleDb = new Proxy({} as DrizzleDb, {
  get(target, prop) {
    const activeDb = dbStorage.getStore() || getDb();
    const val = Reflect.get(activeDb, prop, activeDb);
    return typeof val === 'function' ? val.bind(activeDb) : val;
  }
});

export { schema };

