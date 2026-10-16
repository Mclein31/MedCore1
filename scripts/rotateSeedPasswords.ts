import pg from 'pg';
import { hashPassword, verifyPassword } from '../apps/server/src/services/authService';

// Rotates every account that still uses OLD_SEED_PASSWORD to SEED_PASSWORD, without
// touching any other data, and signs those accounts out. Accounts on other passwords
// are left alone. Usage:
//   OLD_SEED_PASSWORD='<old>' SEED_PASSWORD='<new>' npx tsx --env-file=.env scripts/rotateSeedPasswords.ts
// Add --dry-run to list the accounts without changing them.

const { Pool } = pg;

async function rotate() {
  const databaseUrl = process.env.DATABASE_URL;
  const oldPassword = process.env.OLD_SEED_PASSWORD;
  const newPassword = process.env.SEED_PASSWORD;
  const dryRun = process.argv.includes('--dry-run');

  if (!databaseUrl) throw new Error('DATABASE_URL is required.');
  if (!oldPassword) throw new Error('OLD_SEED_PASSWORD is required.');
  if (!newPassword || newPassword.length < 12) throw new Error('SEED_PASSWORD (at least 12 characters) is required.');
  if (newPassword === oldPassword) throw new Error('SEED_PASSWORD must differ from OLD_SEED_PASSWORD.');

  console.log('Database host:', new URL(databaseUrl).host);
  const pool = new Pool({ connectionString: databaseUrl });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query<{ id: string; email: string; password_hash: string; salt: string }>(
      'SELECT id, email, password_hash, salt FROM users ORDER BY email FOR UPDATE'
    );
    const matching = [];
    for (const user of rows) {
      if (await verifyPassword(oldPassword, user.password_hash, user.salt)) matching.push(user);
    }
    console.log(`${matching.length} of ${rows.length} accounts use the old password.`);
    for (const user of matching) console.log(`  ${user.email}`);

    if (dryRun) {
      await client.query('ROLLBACK');
      console.log('Dry run: nothing changed.');
      return;
    }
    for (const user of matching) {
      const { hash, salt } = await hashPassword(newPassword);
      await client.query('UPDATE users SET password_hash = $1, salt = $2 WHERE id = $3', [hash, salt, user.id]);
      await client.query('DELETE FROM user_sessions WHERE user_id = $1', [user.id]);
    }
    await client.query('COMMIT');
    console.log(`Rotated ${matching.length} accounts and signed them out.`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

rotate().catch(err => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
