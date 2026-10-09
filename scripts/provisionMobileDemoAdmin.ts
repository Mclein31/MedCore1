// Explicit local presentation-account provisioning; never reseeds patients,
// resets an existing password, or makes a public registration route privileged.
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { readFile, writeFile, chmod } from 'node:fs/promises';
import pg from 'pg';
import { hashPassword, verifyPassword } from '../apps/server/src/services/authService';
import { MOBILE_DEMO_USERNAME, MOBILE_DEMO_EMAIL } from '../apps/server/src/services/mobileDemoAccess';

const target = process.env.MEDCORE_DEMO_DATABASE_URL || 'postgresql://mclein@localhost:5432/aqromed';
const parsed = new URL(target);
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname), 'This provisioning utility supports only the local presentation database.');
assert.equal(parsed.pathname, '/aqromed', 'Use the existing aqromed presentation database.');
const credentialFile = '/private/tmp/medcore-mobile-admin-login.json';
let saved: { email?: string; password?: string } = {};
try { saved = JSON.parse(await readFile(credentialFile, 'utf8')); } catch {}
let password = process.env.MEDCORE_ADMIN_DEMO_PASSWORD || (saved.email === MOBILE_DEMO_EMAIL ? saved.password : undefined);
const client = new pg.Client({ connectionString: target, connectionTimeoutMillis: 5000 });
let created = false;
try {
  await client.connect();
  await client.query('BEGIN');
  const facility = await client.query('SELECT id FROM facilities WHERE code=$1', ['SJMC-MNL']);
  assert.equal(facility.rows.length, 1, 'Presentation facility is unavailable.');
  const facilityId = facility.rows[0].id;
  const seed = await client.query('SELECT full_name FROM patients WHERE facility_id=$1 AND mrn=$2', [facilityId, 'MRN-882190']);
  assert.equal(seed.rows[0]?.full_name, 'DELA CRUZ, Juan S.', 'Expected public presentation dataset is unavailable.');
  const existing = await client.query('SELECT id,username,email,facility_id,role,is_active,password_hash,salt FROM users WHERE username=$1 OR email=$2 FOR UPDATE', [MOBILE_DEMO_USERNAME, MOBILE_DEMO_EMAIL]);
  let id: string;
  if (existing.rows.length) {
    assert.equal(existing.rows.length, 1);
    const user = existing.rows[0];
    assert.ok(user.username === MOBILE_DEMO_USERNAME && user.email === MOBILE_DEMO_EMAIL && user.facility_id === facilityId && user.role === 'HOSPITAL_CFO' && user.is_active, 'Reserved identity is occupied by a different account; nothing was changed.');
    assert.ok(password && await verifyPassword(password, user.password_hash, user.salt), 'Existing credentials are unknown; no password was reset.');
    id = user.id;
  } else {
    password ||= `MedCore!${randomBytes(18).toString('base64url')}9`;
    assert.ok(password.length >= 12 && password.length <= 128);
    const { hash, salt } = await hashPassword(password);
    const inserted = await client.query(`INSERT INTO users (facility_id,username,email,password_hash,salt,full_name,role,title,avatar_initials,linked_mrn,is_active)
      VALUES ($1,$2,$3,$4,$5,'MedCore Administrator','HOSPITAL_CFO','Hospital presentation administrator','MA','MRN-882190',true) RETURNING id`, [facilityId, MOBILE_DEMO_USERNAME, MOBILE_DEMO_EMAIL, hash, salt]);
    id = inserted.rows[0].id;
    await client.query(`INSERT INTO system_audit_logs (facility_id,actor_role,action,resource_type,resource_id,new_state,user_agent)
      VALUES ($1,'LOCAL_ADMIN_CLI','MOBILE_DEMO_ACCOUNT_CREATED','users',$2,$3,'MedCore local presentation provisioning')`, [facilityId, id, JSON.stringify({ username: MOBILE_DEMO_USERNAME, role: 'HOSPITAL_CFO', purpose: 'mobile presentation' })]);
    created = true;
  }
  await writeFile(credentialFile, JSON.stringify({ email: MOBILE_DEMO_EMAIL, password, facilityCode: 'SJMC-MNL' }), { mode: 0o600 });
  await chmod(credentialFile, 0o600);
  await client.query('COMMIT');
  console.log(JSON.stringify({ created, email: MOBILE_DEMO_EMAIL, password, facilityCode: 'SJMC-MNL', userId: id }));
} catch (error) {
  await client.query('ROLLBACK').catch(() => {});
  throw error;
} finally { await client.end(); }
