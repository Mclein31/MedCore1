/**
 * Applies drizzle migrations from ./drizzle. Use the direct (unpooled) database
 * URL: migrations need a session-level connection, not a transaction pooler.
 *
 *   npm run db:migrate
 */
import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { createDb, createPool } from './client';

export async function runMigrations(databaseUrl: string): Promise<void> {
  const pool = createPool(databaseUrl, { max: 1, statementTimeoutMs: 120_000 });
  try {
    await migrate(createDb(pool), {
      migrationsFolder: fileURLToPath(new URL('../../drizzle', import.meta.url)),
    });
  } finally {
    await pool.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL is not set.');
    process.exit(1);
  }
  runMigrations(url)
    .then(() => console.warn('Migrations applied.'))
    .catch((err: unknown) => {
      console.error('Migration failed:', err instanceof Error ? err.message : err);
      process.exit(1);
    });
}
