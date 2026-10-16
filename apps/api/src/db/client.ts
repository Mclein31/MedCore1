import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema';

export type Database = NodePgDatabase<typeof schema>;
export type Tx = Parameters<Parameters<Database['transaction']>[0]>[0];
export type DbOrTx = Database | Tx;

// bigint (int8) columns hold centavos well inside Number.MAX_SAFE_INTEGER; parse them as numbers.
pg.types.setTypeParser(pg.types.builtins.INT8, (value) => {
  const n = Number(value);
  if (!Number.isSafeInteger(n)) throw new Error('int8 value outside the safe integer range');
  return n;
});
// `date` columns stay as 'YYYY-MM-DD' strings; never let them become shifted JS Dates.
pg.types.setTypeParser(pg.types.builtins.DATE, (value) => value);

export interface PoolOptions {
  max?: number;
  /** Abort statements that run longer than this, so one bad query cannot pin a connection. */
  statementTimeoutMs?: number;
}

export function createPool(url: string, options: PoolOptions = {}): pg.Pool {
  const pool = new pg.Pool({
    connectionString: url,
    max: options.max ?? 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    statement_timeout: options.statementTimeoutMs ?? 15_000,
    application_name: 'medcore-api',
  });
  // An idle client error must not crash the process; the pool replaces it.
  pool.on('error', (err) =>
    console.error(JSON.stringify({ level: 'error', msg: 'pg pool error', error: err.message })),
  );
  return pool;
}

export function createDb(pool: pg.Pool | pg.Client): Database {
  return drizzle(pool, { schema });
}

export { schema };
