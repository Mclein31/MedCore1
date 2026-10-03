import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { AsyncLocalStorage } from 'node:async_hooks';
import * as schema from './schema';

const { Pool } = pg;

export type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;

const dbStorage = new AsyncLocalStorage<DrizzleDb>();
const poolCache = new Map<string, { pool: pg.Pool; db: DrizzleDb }>();

export function getDb(connectionString?: string, isProduction: boolean = false): DrizzleDb {
  const isProd =
    isProduction ||
    (typeof process !== 'undefined' && process.env.NODE_ENV === 'production');
  let url = connectionString || (typeof process !== 'undefined' ? process.env.DATABASE_URL : undefined);

  if (!url) {
    if (isProd) {
      throw new Error(
        '[MedCore Database Configuration Error] No database connection string provided in production. Configure Cloudflare Hyperdrive or set DATABASE_URL.'
      );
    }
    url = 'postgresql://mclein@localhost:5432/aqromed';
  }

  // Prevent production from ever attempting to connect to localhost / 127.0.0.1 / loopback
  if (isProd) {
    const isLoopback =
      url.includes('localhost') ||
      url.includes('127.0.0.1') ||
      url.includes('::1') ||
      url.includes('0.0.0.0');

    if (isLoopback) {
      throw new Error(
        `[MedCore Database Security Error] Refusing to connect to localhost / loopback database in production mode. Configure Cloudflare Hyperdrive or provide a remote PostgreSQL DATABASE_URL.`
      );
    }
  }

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

