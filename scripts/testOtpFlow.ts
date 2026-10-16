// Patient email-code sign-in against a dedicated, disposable LOCAL database.
// Port of AdvanCare test/app-booking.test.ts OTP cases. SMTP is blanked, so mail is never sent:
// the development mailer logs the code and this test reads it from the log.
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import pg from 'pg';

const url = process.env.MEDCORE_OTP_TEST_DATABASE_URL || 'postgresql://mclein@127.0.0.1:5432/medcore_otp_validation';
const target = new URL(url);
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(target.hostname), 'OTP fixture resets require a local database.');
assert.match(target.pathname, /^\/medcore_otp_validation(?:_[a-z0-9]+)?$/, 'Refusing to reset a hospital or unrelated database.');
Object.assign(process.env, { DATABASE_URL: url, NODE_ENV: 'development', SMTP_USER: '', SMTP_PASSWORD: '', SMTP_HOST: '', MAIL_FROM: '' });

const root = fileURLToPath(new URL('../', import.meta.url));
const adminUrl = new URL(url); adminUrl.pathname = '/postgres';
const admin = new pg.Client({ connectionString: adminUrl.toString() });
await admin.connect();
if (!(await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [target.pathname.slice(1)])).rowCount) await admin.query(`CREATE DATABASE "${target.pathname.slice(1)}"`);
await admin.end();

// Bootstrap the current schema (as runApiTests.ts does), so hosted migration drift can't interfere.
const temporary = await mkdtemp(join(tmpdir(), 'medcore-otp-schema-'));
const config = join(temporary, 'drizzle.config.ts');
await writeFile(config, `export default ${JSON.stringify({ schema: join(root, 'apps/server/src/db/schema.ts'), out: join(temporary, 'migrations'), dialect: 'postgresql' })};\n`);
const generated = spawnSync(process.execPath, [join(root, 'node_modules/drizzle-kit/bin.cjs'), 'generate', '--config', config], { cwd: root, encoding: 'utf8' });
assert.equal(generated.status, 0, generated.stderr);
const { createDbConnection } = await import('../apps/server/src/db');
const { migrate } = await import('drizzle-orm/node-postgres/migrator');
const connection = createDbConnection(url);
await connection.pool.query('DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public; DROP SCHEMA IF EXISTS drizzle CASCADE;');
await migrate(connection.db, { migrationsFolder: join(temporary, 'migrations') });
await connection.pool.end();

const sql = new pg.Client({ connectionString: url });
await sql.connect();
const one = async (text: string, values: unknown[] = []) => (await sql.query(text, values)).rows[0];
const facility = await one(`INSERT INTO facilities (code, name, tin, philhealth_pan, address, contact_phone, hitp_client_id, hitp_secret_hash)
  VALUES ('SJMC-MNL', 'Test Facility', '000', 'PAN', 'Manila', '000', 'client', 'hash') RETURNING id`);
const { hashPassword } = await import('../apps/server/src/services/authService');
const staffPassword = await hashPassword('StaffPass2026!');
await sql.query(`INSERT INTO users (facility_id, username, email, password_hash, salt, full_name, role, title, avatar_initials)
  VALUES ($1, 'staff.one', 'staff.one@example.test', $2, $3, 'Staff One', 'BILLING_SPECIALIST', 'Billing', 'SO')`, [facility.id, staffPassword.hash, staffPassword.salt]);
let seq = 0;
/** A patient with an email on file and (optionally) an existing linked guarantor login. */
async function patient(opts: { linked?: boolean; email?: string | null } = {}) {
  seq++;
  const email = opts.email === undefined ? `otp.case${seq}@example.test` : opts.email;
  const row = await one(`INSERT INTO patients (facility_id, mrn, full_name, date_of_birth, gender, contact_number, email)
    VALUES ($1, $2, 'DELA CRUZ, Test S.', '1980-01-01', 'M', $3, $4) RETURNING id, mrn, contact_number`, [facility.id, `MRN-T${seq}`, `+63 917 000 ${String(1000 + seq)}`, email]);
  if (opts.linked) {
    const user = await one(`INSERT INTO users (facility_id, username, email, full_name, role, title, avatar_initials, linked_mrn)
      VALUES ($1, $2, $3, 'Test Guarantor', 'PATIENT_GUARANTOR', 'Patient Guarantor', 'TG', $4) RETURNING id`, [facility.id, `guarantor${seq}`, email, row.mrn]);
    await sql.query(`INSERT INTO patient_account_links (user_id, patient_id, verified_via) VALUES ($1, $2, 'STAFF_DESK')`, [user.id, row.id]);
  }
  return { id: row.id as string, mrn: row.mrn as string, contactNumber: `0917-000-${1000 + seq}`, email: email as string };
}

// Capture dev-logged codes.
const codes = new Map<string, string>();
const log = console.log;
console.log = (...args: unknown[]) => {
  const line = String(args[0]);
  if (line.startsWith('{"devMail"')) {
    const { devMail } = JSON.parse(line);
    codes.set(devMail.to, /\b(\d{6})\b/.exec(devMail.subject)![1]!);
    return;
  }
  if (line.startsWith('<--') || line.startsWith('-->')) return; // hono request logger
  log(...args);
};
const codeFor = (email: string) => { const code = codes.get(email); assert.ok(code, `no code logged for ${email}`); return code!; };

const { default: app } = await import('../apps/server/src/index');
async function call(path: string, body?: unknown, token?: string) {
  const res = await app.fetch(new Request(`http://local/api/v1${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body)
  }));
  const json = await res.json() as any;
  return { status: res.status, json };
}
const requestLogin = (email: string) => call('/auth/otp/request', { purpose: 'LOGIN', email });
const verifyLogin = (email: string, otp: string) => call('/auth/otp/verify', { purpose: 'LOGIN', email, otp });
let checks = 0;
const pass = (name: string) => { checks++; log(`[PASS] ${name}`); };

try {
  {
    const p = await patient({ linked: true });
    const known = await requestLogin(p.email.toUpperCase());
    const unknown = await requestLogin('nobody.here@example.test');
    assert.equal(known.status, 202); assert.equal(unknown.status, 202);
    assert.deepEqual(known.json, unknown.json);
    assert.equal(codes.has('nobody.here@example.test'), false);
    pass('request responses are identical for known and unknown emails; unknown gets no code');

    const ok = await verifyLogin(p.email, codeFor(p.email));
    assert.equal(ok.status, 200, JSON.stringify(ok.json)); assert.ok(ok.json.token); assert.equal(ok.json.user.role, 'PATIENT_GUARANTOR');
    assert.equal((await call('/auth/me', undefined, ok.json.token)).status, 200);
    assert.equal((await verifyLogin(p.email, codeFor(p.email))).status, 401, 'single use');
    assert.equal((await call('/patient/me', undefined, ok.json.token)).status, 200);
    pass('LOGIN code signs a linked guarantor in, works once, and the session reaches /patient/me');

    assert.equal((await call('/auth/logout', {}, ok.json.token)).status, 200);
    assert.equal((await call('/auth/me', undefined, ok.json.token)).status, 401);
    assert.ok((await one('SELECT revoked_at FROM user_sessions WHERE user_id = (SELECT id FROM users WHERE email = $1)', [p.email])).revoked_at);
    pass('logout revokes the session (revoked_at) and the token stops working');
  }
  {
    const p = await patient({ linked: true });
    await requestLogin(p.email); const first = codeFor(p.email);
    await requestLogin(p.email); const second = codeFor(p.email);
    if (first !== second) assert.equal((await verifyLogin(p.email, first)).status, 401);
    assert.equal((await verifyLogin(p.email, second)).status, 200);
    pass('only the newest code works');
  }
  {
    const p = await patient({ linked: true });
    await requestLogin(p.email); const code = codeFor(p.email);
    const wrongCode = code === '111111' ? '222222' : '111111';
    for (let i = 0; i < 5; i++) assert.equal((await verifyLogin(p.email, wrongCode)).json.error.code, 'CODE_INVALID');
    const locked = await verifyLogin(p.email, code);
    assert.equal(locked.status, 401); assert.equal(locked.json.error.code, 'CODE_LOCKED');
    assert.equal((await verifyLogin(p.email, code)).json.error.code, 'CODE_INVALID', 'a locked code is burned');
    pass('after 5 wrong tries the right code gets CODE_LOCKED and is burned');
  }
  {
    const p = await patient({ linked: true });
    await requestLogin(p.email);
    const row = await one('SELECT expires_at, created_at FROM login_codes WHERE email = $1', [p.email]);
    assert.equal(new Date(row.expires_at).getTime() - new Date(row.created_at).getTime() >= 10 * 60_000 - 1000, true);
    assert.equal(new Date(row.expires_at).getTime() - new Date(row.created_at).getTime() <= 10 * 60_000 + 1000, true);
    await sql.query(`UPDATE login_codes SET expires_at = now() - interval '1 second' WHERE email = $1`, [p.email]);
    assert.equal((await verifyLogin(p.email, codeFor(p.email))).status, 401);
    pass('codes live 10 minutes and an expired code is rejected');
  }
  {
    const p = await patient({ linked: true });
    const statuses: number[] = [];
    for (let i = 0; i < 7; i++) statuses.push((await requestLogin(p.email)).status);
    assert.deepEqual(statuses, [202, 202, 202, 202, 202, 429, 429]);
    assert.equal((await requestLogin(p.email)).json.error.code, 'TOO_MANY_CODES');
    pass('the 6th code request in an hour gets 429 TOO_MANY_CODES');
  }
  {
    const p = await patient({ linked: true });
    await requestLogin(p.email); const code = codeFor(p.email);
    const results = await Promise.all([verifyLogin(p.email, code), verifyLogin(p.email, code), verifyLogin(p.email, code)]);
    assert.deepEqual(results.map((r) => r.status).sort(), [200, 401, 401]);
    assert.equal(Number((await one('SELECT count(*) FROM user_sessions s JOIN users u ON u.id = s.user_id WHERE u.email = $1', [p.email])).count), 1);
    pass('parallel verifies of one code: exactly one succeeds');
  }
  {
    const p = await patient({ linked: true });
    const reg = await call('/auth/otp/request', { purpose: 'REGISTER', mrn: p.mrn, contactNumber: p.contactNumber });
    assert.equal(reg.status, 202); assert.equal(reg.json.sentTo, `${p.email[0]}***@example.test`);
    const code = codeFor(p.email);
    assert.equal((await verifyLogin(p.email, code)).status, 401, 'REGISTER code cannot LOGIN');
    const asRegister = await call('/auth/otp/verify', { purpose: 'REGISTER', mrn: p.mrn, contactNumber: p.contactNumber, otp: code });
    assert.equal(asRegister.status, 200, JSON.stringify(asRegister.json)); assert.equal(asRegister.json.isNew, false);
    await requestLogin(p.email);
    assert.equal((await call('/auth/otp/verify', { purpose: 'REGISTER', mrn: p.mrn, contactNumber: p.contactNumber, otp: codeFor(p.email) })).status, 401, 'LOGIN code cannot REGISTER');
    pass('purpose separation: REGISTER and LOGIN codes are not interchangeable');
  }
  {
    const p = await patient();
    const reg = await call('/auth/otp/request', { purpose: 'REGISTER', mrn: p.mrn, contactNumber: p.contactNumber.replace(/-/g, ' ') });
    assert.equal(reg.status, 202);
    const done = await call('/auth/otp/verify', { purpose: 'REGISTER', mrn: p.mrn, contactNumber: p.contactNumber, otp: codeFor(p.email) });
    assert.equal(done.status, 200, JSON.stringify(done.json)); assert.equal(done.json.isNew, true);
    assert.equal(done.json.user.fullName, 'Test S. Dela Cruz');
    const user = await one('SELECT id, password_hash, linked_mrn FROM users WHERE email = $1', [p.email]);
    assert.equal(user.password_hash, null); assert.equal(user.linked_mrn, p.mrn);
    const link = await one('SELECT verified_via FROM patient_account_links WHERE user_id = $1 AND patient_id = $2', [user.id, p.id]);
    assert.equal(link.verified_via, 'EMAIL_OTP');
    assert.equal((await call('/patient/me', undefined, done.json.token)).status, 200);
    const pw = await call('/auth/login', { email: p.email, password: 'anything-at-all' });
    assert.equal(pw.status, 401); assert.equal(pw.json.error.code, 'INVALID_CREDENTIALS');
    assert.equal((await one(`SELECT count(*) FROM system_audit_logs WHERE action = 'PATIENT_REGISTERED' AND user_id = $1`, [user.id])).count, '1');
    pass('REGISTER sends to the admission email and creates a password-less guarantor with an EMAIL_OTP link');
  }
  {
    const p = await patient();
    const decoy = await call('/auth/otp/request', { purpose: 'REGISTER', mrn: p.mrn, contactNumber: '0999-999-9999' });
    const unknown = await call('/auth/otp/request', { purpose: 'REGISTER', mrn: 'MRN-NOPE', contactNumber: p.contactNumber });
    for (const r of [decoy, unknown]) { assert.equal(r.status, 202); assert.match(r.json.sentTo, /^[a-z]\*\*\*@gmail\.com$/); }
    assert.equal(codes.has(p.email), false, 'a wrong contact number never triggers an email');
    const noEmail = await patient({ email: null });
    const desk = await call('/auth/otp/request', { purpose: 'REGISTER', mrn: noEmail.mrn, contactNumber: noEmail.contactNumber });
    assert.equal(desk.json.code, 'EMAIL_NOT_ON_FILE');
    pass('REGISTER with wrong details gets a decoy mask; no email on file sends the patient to the desk');
  }
  {
    assert.equal((await requestLogin('staff.one@example.test')).status, 202);
    assert.equal(codes.has('staff.one@example.test'), false);
    assert.equal((await call('/auth/otp/request', { purpose: 'LOGIN', email: 'a@b.ph', extra: 1 })).status, 400);
    assert.equal((await call('/auth/otp/verify', { purpose: 'LOGIN', email: 'a@b.ph', otp: '12345' })).status, 400);
    pass('staff accounts never get codes; strict input validation');
  }
  {
    const staff = await call('/auth/login', { email: 'staff.one@example.test', password: 'StaffPass2026!' });
    assert.equal(staff.status, 200);
    assert.equal((await call('/auth/me', undefined, staff.json.token)).status, 200);
    pass('staff password login still works with the new session columns');
  }
  log(`OTP_FLOW_TESTS_PASSED (${checks} checks, local fixture only, no email sent)`);
} finally {
  console.log = log;
  await sql.end();
  process.exit(process.exitCode ?? 0);
}
