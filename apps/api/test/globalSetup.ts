import pg from 'pg';
import { runMigrations } from '../src/db/migrate';

/**
 * Creates a fresh, disposable test database and migrates it. Refuses anything
 * that is not clearly a local test database, so tests can never touch real data.
 */
export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ?? 'postgres://localhost:5432/medcore_v2_test';

export default async function setup() {
  const url = new URL(TEST_DATABASE_URL);
  const name = url.pathname.slice(1);
  if (!/_test$/.test(name) || !['localhost', '127.0.0.1', 'postgres'].includes(url.hostname)) {
    throw new Error(`Refusing to use ${url.hostname}/${name} for tests: it must be a local database ending in _test.`);
  }
  const admin = new URL(TEST_DATABASE_URL);
  admin.pathname = '/postgres';
  const client = new pg.Client({ connectionString: admin.toString() });
  await client.connect();
  await client.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
  await client.query(`CREATE DATABASE "${name}"`);
  await client.end();
  await runMigrations(TEST_DATABASE_URL);
  process.env.TEST_DATABASE_URL = TEST_DATABASE_URL;
}
