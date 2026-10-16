// Gives demo patients and guarantor logins `+` aliases of ONE Gmail address the operator controls,
// so sign-in codes can only reach that inbox. Replaces seeded third-party-looking addresses such as
// juan.delacruz@gmail.com. Neon demo branch or a local database only, never production.
//   npm run seed:otp-emails -- you@gmail.com
import pg from 'pg';
try { process.loadEnvFile('.env'); } catch { /* Explicit environment is also supported. */ }

const DEMO_ENDPOINT = 'ep-wandering-shadow-azd4q0ln';
const PRODUCTION_ENDPOINT = 'ep-long-term-aziioyiq';
const PATIENT_COUNT = 8;
const base = (process.argv[2] || '').trim().toLowerCase();
const match = /^([a-z0-9.]+)@gmail\.com$/.exec(base);
if (!match) throw new Error('Usage: npm run seed:otp-emails -- you@gmail.com (a Gmail address you control, without a + alias).');
const alias = (tag: string) => `${match[1]}+${tag.toLowerCase().replace(/[^a-z0-9]/g, '')}@gmail.com`;

const connectionString = process.env.MEDCORE_OTP_DATABASE_URL || process.env.DATABASE_URL_UNPOOLED;
if (!connectionString) throw new Error('Set DATABASE_URL_UNPOOLED (Neon demo) or MEDCORE_OTP_DATABASE_URL (local).');
const host = new URL(connectionString).hostname;
const local = ['localhost', '127.0.0.1', '::1', '[::1]'].includes(host);
if (host.includes(PRODUCTION_ENDPOINT)) throw new Error('Refusing to seed the Neon production branch.');
if (!local && !(host.startsWith(DEMO_ENDPOINT) && process.env.NEON_BRANCH === 'demo')) throw new Error(`Refusing ${host}: Neon demo branch or a local database only.`);

const client = new pg.Client({ connectionString });
await client.connect();
try {
  await client.query('BEGIN');
  // Guarantor logins: the linked patient's alias for the first login on a record, the username otherwise.
  const guarantors = (await client.query(`SELECT u.id, u.username, u.linked_mrn FROM users u WHERE u.role = 'PATIENT_GUARANTOR' ORDER BY u.created_at, u.username`)).rows;
  const claimed = new Set<string>();
  const patientAlias = new Map<string, string>();
  for (const user of guarantors) {
    const tag = user.linked_mrn && !claimed.has(user.linked_mrn) ? user.linked_mrn : user.username;
    if (user.linked_mrn && !claimed.has(user.linked_mrn)) { claimed.add(user.linked_mrn); patientAlias.set(user.linked_mrn, alias(tag)); }
    await client.query('UPDATE users SET email = $1, updated_at = now() WHERE id = $2', [alias(tag), user.id]);
  }
  // Patients: every record a guarantor is linked to, plus the first few census records.
  const patients = (await client.query(`SELECT id, mrn FROM patients
    WHERE mrn = ANY($1) OR id IN (SELECT id FROM patients ORDER BY created_at, mrn LIMIT $2)`, [[...claimed], PATIENT_COUNT])).rows;
  for (const p of patients) await client.query('UPDATE patients SET email = $1, updated_at = now() WHERE id = $2', [patientAlias.get(p.mrn) ?? alias(p.mrn), p.id]);
  const leftover = (await client.query(`SELECT count(*)::int AS n FROM users WHERE role = 'PATIENT_GUARANTOR' AND lower(email) NOT LIKE $1`, [`${match[1]}+%@gmail.com`])).rows[0].n;
  if (leftover) throw new Error('Some guarantor logins still have non-alias addresses.');
  await client.query('COMMIT');
  console.log(`DEMO_EMAILS_SEEDED on ${local ? 'local database' : 'Neon demo'}: ${guarantors.length} guarantor logins, ${patients.length} patients now use ${match[1]}+…@gmail.com.`);
  for (const p of patients) console.log(`  ${p.mrn} → ${patientAlias.get(p.mrn) ?? alias(p.mrn)}`);
} catch (error) {
  await client.query('ROLLBACK').catch(() => {});
  console.error('DEMO_EMAIL_SEED_FAILED', error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally { await client.end(); }
