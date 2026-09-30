import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema';

const { Pool } = pg;

let pool: pg.Pool | null = null;
let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb(connectionString?: string) {
  if (dbInstance && !connectionString) {
    return dbInstance;
  }

  const url = connectionString || process.env.DATABASE_URL || 'postgresql://mclein@localhost:5432/aqromed';
  
  if (!pool || connectionString) {
    pool = new Pool({
      connectionString: url,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000
    });
  }

  dbInstance = drizzle(pool, { schema });
  return dbInstance;
}

export const db = getDb();
export { schema };
