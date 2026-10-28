import { eq, sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as s from '../src/db/schema';
import { base32Decode } from '../src/lib/crypto';
import { currentStep, hotp } from '../src/lib/totp';
import { LIMITS } from '../src/services/rateLimit';
import { createHarness, PASSWORD, stayAwaitingSettlement, type Harness } from './harness';

let h: Harness;
beforeAll(async () => {
  h = await createHarness();
});
afterAll(() => h.close());

const email = (role: string, which = 0) => h.fixture.staff.filter((u) => u.role === role)[which]!.email;

describe('surface', () => {
  it('health reveals liveness only, with hardened headers', async () => {
    const res = await h.client().get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', database: 'ok' });
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(res.headers.get('x-frame-options')).toBe('DENY');
    expect(res.headers.get('content-security-policy')).toContain("default-src 'none'");
    expect(res.headers.get('x-request-id')).toBeTruthy();
  });

  it('errors carry a request id and never leak internals', async () => {
    const res = await h.client().get('/api/v1/nope');
    expect(res.status).toBe(404);
    expect(res.body.error.requestId).toBeTruthy();
  });

  it('requires a session for every staff and patient route', async () => {
    const anon = h.client();
    for (const path of [
      '/api/v1/staff/encounters',
      '/api/v1/staff/users',
      '/api/v1/staff/audit-logs',
      '/api/v1/patient/stays',
    ]) {
      const res = await anon.get(path);
      expect(res.status, path).toBe(401);
    }
  });

  it('rejects unknown fields, bad types and oversized bodies', async () => {
    const c = h.client();
    const extra = await c.post('/api/v1/auth/staff/login', {
      email: 'a@b.test',
      password: 'x',
      role: 'HOSPITAL_CFO',
    });
    expect(extra.status).toBe(422);
    expect(extra.body.error.code).toBe('VALIDATION_FAILED');
    const big = await c.post('/api/v1/auth/staff/login', { email: 'a@b.test', password: 'x'.repeat(70_000) });
    expect(big.status).toBe(413);
  });
});

describe('CSRF', () => {
  it('blocks cookie-authenticated writes without the custom header, from foreign origins, or cross-site', async () => {
    const billing = await h.staff('BILLING_SPECIALIST');
    const noHeader = await billing.post('/api/v1/auth/staff/logout', {}, { 'x-medcore-csrf': '' });
    expect(noHeader.status).toBe(403);
    expect(noHeader.body.error.code).toBe('CSRF_REJECTED');
    const foreign = await billing.post('/api/v1/auth/staff/logout', {}, { origin: 'https://evil.example' });
    expect(foreign.status).toBe(403);
    const crossSite = await billing.post('/api/v1/auth/staff/logout', {}, { 'sec-fetch-site': 'cross-site' });
    expect(crossSite.status).toBe(403);
    // Still signed in: none of those requests had any effect.
    expect((await billing.get('/api/v1/auth/staff/me')).status).toBe(200);
  });

  it('does not answer CORS preflights for unknown origins', async () => {
    const res = await h.app.request('/api/v1/auth/staff/login', {
      method: 'OPTIONS',
      headers: { origin: 'https://evil.example', 'access-control-request-method': 'POST' },
    });
    expect(res.headers.get('access-control-allow-origin')).toBeNull();
  });
});

describe('staff sign-in', () => {
  it('sets an HttpOnly, SameSite=Strict session cookie and never returns the token', async () => {
    const c = h.client();
    const res = await c.request('POST', '/api/v1/auth/staff/login', {
      email: email('CLAIMS_ENCODER'),
      password: PASSWORD,
    });
    expect(res.status).toBe(200);
    const cookie = res.headers.getSetCookie().join(';');
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Strict/i);
    expect(JSON.stringify(res.body)).not.toMatch(/token/i);
  });

  it('answers identically for unknown accounts and wrong passwords', async () => {
    const c = h.client();
    const unknown = await c.post('/api/v1/auth/staff/login', {
      email: 'nobody@nowhere.example.test',
      password: PASSWORD,
    });
    const wrong = await c.post('/api/v1/auth/staff/login', {
      email: email('HMO_COORDINATOR'),
      password: 'wrong password here',
    });
    expect(unknown.status).toBe(401);
    expect(wrong.status).toBe(401);
    expect(unknown.body.error.message).toBe(wrong.body.error.message);
    expect(unknown.body.error.code).toBe(wrong.body.error.code);
  });

  it('locks the account after five wrong passwords, even for the right one', async () => {
    const target = email('ATTENDING_PHYSICIAN', 1);
    for (let i = 0; i < 5; i++) {
      await h.client().post('/api/v1/auth/staff/login', { email: target, password: `wrong password ${i}` });
    }
    const right = await h.client().post('/api/v1/auth/staff/login', { email: target, password: PASSWORD });
    expect(right.status).toBe(401);
    const cfo = await h.staff('HOSPITAL_CFO');
    const user = h.fixture.staff.find((u) => u.email === target)!;
    expect((await cfo.post(`/api/v1/staff/users/${user.id}/unlock`)).status).toBe(200);
    expect(
      (await h.client().post('/api/v1/auth/staff/login', { email: target, password: PASSWORD })).status,
    ).toBe(200);
  });

  it('rate-limits login attempts per IP without locking out a shared network', async () => {
    const c = h.client({ ip: '203.0.113.77' });
    const statuses: number[] = [];
    for (let i = 0; i < LIMITS.staffLoginIp.limit + 2; i++) {
      statuses.push(
        (
          await c.post('/api/v1/auth/staff/login', {
            email: `probe${i}@nowhere.example.test`,
            password: 'whatever pass',
          })
        ).status,
      );
    }
    expect(statuses.slice(0, 25)).not.toContain(429);
    expect(statuses.at(-1)).toBe(429);
  });

  it('expires idle sessions and ends them on deactivation', async () => {
    const hmo = await h.staff('HMO_COORDINATOR');
    expect((await hmo.get('/api/v1/auth/staff/me')).status).toBe(200);
    h.advance(31 * 60 * 1000);
    expect((await hmo.get('/api/v1/auth/staff/me')).status).toBe(401);

    const claims = await h.staff('CLAIMS_ENCODER');
    const cfo = await h.staff('HOSPITAL_CFO');
    await cfo.patch(`/api/v1/staff/users/${claims.user.id}`, { isActive: false });
    expect((await claims.get('/api/v1/auth/staff/me')).status).toBe(401);
    await cfo.patch(`/api/v1/staff/users/${claims.user.id}`, { isActive: true });
  });

  it('keeps at least one administrator and stops self-demotion', async () => {
    const cfo = await h.staff('HOSPITAL_CFO');
    const self = await cfo.patch(`/api/v1/staff/users/${cfo.user.id}`, { role: 'BILLING_SPECIALIST' });
    expect(self.status).toBe(422);
  });

  it('enforces the password policy and signs out other sessions on change', async () => {
    const first = await h.staff('LOBBY_SECURITY');
    const second = await h.staff('LOBBY_SECURITY');
    const weak = await first.post('/api/v1/auth/staff/password', {
      currentPassword: PASSWORD,
      newPassword: 'password1234',
    });
    expect(weak.status).toBe(422);
    const changed = await first.post('/api/v1/auth/staff/password', {
      currentPassword: PASSWORD,
      newPassword: 'a brand new long passphrase 7',
    });
    expect(changed.status).toBe(200);
    expect((await second.get('/api/v1/auth/staff/me')).status).toBe(401);
    expect((await first.get('/api/v1/auth/staff/me')).status).toBe(200);
    await first.post('/api/v1/auth/staff/password', {
      currentPassword: 'a brand new long passphrase 7',
      newPassword: PASSWORD,
    });
  });
});

describe('two-step sign-in (TOTP)', () => {
  it('enrolls, verifies, rejects replays and accepts each recovery code once', async () => {
    const strict = await createHarness({ STAFF_MFA_REQUIRED: 'true' });
    try {
      const user = strict.fixture.staff.find((u) => u.role === 'BILLING_SPECIALIST')!;
      const c = strict.client();
      const login = await c.post('/api/v1/auth/staff/login', { email: user.email, password: PASSWORD });
      expect(login.body.status).toBe('MFA_ENROLLMENT_REQUIRED');
      // No session yet.
      expect((await c.get('/api/v1/auth/staff/me')).status).toBe(401);

      const start = await c.post('/api/v1/auth/staff/mfa/enroll/start', { challenge: login.body.challenge });
      expect(start.body.otpauthUri).toMatch(/^otpauth:\/\/totp\//);
      const codeAt = async (date: Date) => hotp(base32Decode(start.body.secret), currentStep(date));

      const bad = await c.post('/api/v1/auth/staff/mfa/enroll/confirm', {
        challenge: login.body.challenge,
        code: '000000',
      });
      expect(bad.status).toBe(401);
      const confirm = await c.post('/api/v1/auth/staff/mfa/enroll/confirm', {
        challenge: login.body.challenge,
        code: await codeAt(strict.services.now()),
      });
      expect(confirm.status, JSON.stringify(confirm.body)).toBe(200);
      expect(confirm.body.recoveryCodes).toHaveLength(10);
      expect((await c.get('/api/v1/auth/staff/me')).body.user.mfaEnabled).toBe(true);

      // Sign-in events happen before a session exists, but must still name the person.
      const [enrolled] = await strict.db
        .select()
        .from(s.auditLogs)
        .where(sql`${s.auditLogs.action} = 'STAFF_MFA_ENROLLED' and ${s.auditLogs.resourceId} = ${user.id}`);
      expect(enrolled!.actorType).toBe('STAFF');
      expect(enrolled!.actorEmail).toBe(user.email);

      // The secret is stored encrypted, never in clear.
      const [row] = await strict.db.select().from(s.staffUsers).where(eq(s.staffUsers.id, user.id));
      expect(row!.mfaSecretEnc).toMatch(/^v1\./);
      expect(row!.mfaSecretEnc).not.toContain(start.body.secret);

      // Next sign-in needs the code; the one just used cannot be replayed.
      const again = await strict
        .client()
        .post('/api/v1/auth/staff/login', { email: user.email, password: PASSWORD });
      expect(again.body.status).toBe('MFA_REQUIRED');
      const replay = await strict.client().post('/api/v1/auth/staff/mfa/verify', {
        challenge: again.body.challenge,
        code: await codeAt(strict.services.now()),
      });
      expect(replay.status).toBe(401);
      strict.advance(60_000);
      const fresh = strict.client();
      const login3 = await fresh.post('/api/v1/auth/staff/login', { email: user.email, password: PASSWORD });
      const ok = await fresh.post('/api/v1/auth/staff/mfa/verify', {
        challenge: login3.body.challenge,
        code: await codeAt(strict.services.now()),
      });
      expect(ok.status, JSON.stringify(ok.body)).toBe(200);

      const recovery = confirm.body.recoveryCodes[0];
      const l4 = await strict
        .client()
        .post('/api/v1/auth/staff/login', { email: user.email, password: PASSWORD });
      expect(
        (
          await strict
            .client()
            .post('/api/v1/auth/staff/mfa/verify', { challenge: l4.body.challenge, code: recovery })
        ).status,
      ).toBe(200);
      const l5 = await strict
        .client()
        .post('/api/v1/auth/staff/login', { email: user.email, password: PASSWORD });
      expect(
        (
          await strict
            .client()
            .post('/api/v1/auth/staff/mfa/verify', { challenge: l5.body.challenge, code: recovery })
        ).status,
      ).toBe(401);
    } finally {
      await strict.close();
    }
  });

  it('burns a challenge after five wrong codes', async () => {
    const strict = await createHarness({ STAFF_MFA_REQUIRED: 'true' });
    try {
      const user = strict.fixture.staff.find((u) => u.role === 'CLAIMS_ENCODER')!;
      const c = strict.client();
      const login = await c.post('/api/v1/auth/staff/login', { email: user.email, password: PASSWORD });
      await c.post('/api/v1/auth/staff/mfa/enroll/start', { challenge: login.body.challenge });
      for (let i = 0; i < 5; i++) {
        await c.post('/api/v1/auth/staff/mfa/enroll/confirm', {
          challenge: login.body.challenge,
          code: String(100000 + i),
        });
      }
      const after = await c.post('/api/v1/auth/staff/mfa/enroll/confirm', {
        challenge: login.body.challenge,
        code: '123456',
      });
      expect(after.body.error.code).toBe('CHALLENGE_EXPIRED');
    } finally {
      await strict.close();
    }
  });
});

describe('access control', () => {
  it('limits lobby security to verifying passes', async () => {
    const lobby = await h.staff('LOBBY_SECURITY');
    expect((await lobby.get('/api/v1/staff/encounters')).status).toBe(403);
    expect((await lobby.get('/api/v1/staff/beds')).status).toBe(403);
    expect((await lobby.get('/api/v1/staff/audit-logs')).status).toBe(403);
  });

  it('keeps physicians to their own patients', async () => {
    const stay = await stayAwaitingSettlement(h, { patientIndex: 4, bedIndex: 4 });
    const other = await h.staff('ATTENDING_PHYSICIAN', 1);
    expect((await other.get(stay.base)).status).toBe(404);
    const list = await other.get('/api/v1/staff/encounters');
    expect(list.body.items.find((e: { id: string }) => e.id === stay.id)).toBeUndefined();
    expect((await stay.doctor.get(stay.base)).status).toBe(200);
  });

  it('isolates facilities completely', async () => {
    const other = await createHarness();
    try {
      const stay = await stayAwaitingSettlement(h, { patientIndex: 5, bedIndex: 5 });
      const outsider = await other.staff('HOSPITAL_CFO');
      expect((await outsider.get(stay.base)).status).toBe(404);
      expect((await outsider.post(`${stay.base}/void`, { reason: 'Cross-tenant attempt here' })).status).toBe(
        404,
      );
    } finally {
      await other.close();
    }
  });

  it('audits who opened a patient record', async () => {
    const billing = await h.staff('BILLING_SPECIALIST');
    const [enc] = (
      await h.db.execute(sql`select id from encounters where facility_id = ${h.fixture.facility.id} limit 1`)
    ).rows as { id: string }[];
    await billing.get(`/api/v1/staff/encounters/${enc!.id}`);
    const rows = await h.db
      .select()
      .from(s.auditLogs)
      .where(sql`${s.auditLogs.action} = 'ENCOUNTER_VIEWED' and ${s.auditLogs.resourceId} = ${enc!.id}`);
    const mine = rows.find((r) => r.actorEmail === billing.user.email);
    expect(mine).toBeDefined();
    expect(mine!.actorType).toBe('STAFF');
    expect(mine!.requestId).toBeTruthy();
  });

  it('stores sensitive identifiers encrypted', async () => {
    const [row] = await h.db.select().from(s.patients).where(eq(s.patients.id, h.fixture.patients[0]!.id));
    expect(row!.contactPhoneEnc).toMatch(/^v1\./);
    expect(row!.contactPhoneEnc).not.toContain('0917');
  });
});

describe('exit pass PIN', () => {
  it('voids a pass after five wrong PINs and detects tampering', async () => {
    const stay = await stayAwaitingSettlement(h, { patientIndex: 6, bedIndex: 6 });
    const pay = await stay.billing.post(
      `${stay.base}/payments`,
      { amountCents: stay.detail.ledger.balanceCents, rail: 'CASH', payerName: 'Full Pay' },
      { 'idempotency-key': `k-${crypto.randomUUID()}` },
    );
    expect(pay.body.detail.encounter.stage).toBe('CLEARED');
    const pass = (await stay.billing.get(`${stay.base}/gate-pass`)).body;
    const lobby = await h.staff('LOBBY_SECURITY');
    const wrong = pass.pin === '000000' ? '111111' : '000000';
    for (let i = 4; i >= 1; i--) {
      const r = await lobby.post('/api/v1/staff/gate-passes/verify', {
        passNumber: pass.passNumber,
        pin: wrong,
      });
      expect(r.body.error.code).toBe('WRONG_PIN');
      expect(r.body.error.message).toContain(`${i} attempt`);
    }
    const fifth = await lobby.post('/api/v1/staff/gate-passes/verify', {
      passNumber: pass.passNumber,
      pin: wrong,
    });
    expect(fifth.body.error.code).toBe('PASS_VOIDED');
    const right = await lobby.post('/api/v1/staff/gate-passes/verify', {
      passNumber: pass.passNumber,
      pin: pass.pin,
    });
    expect(right.body.error.code).toBe('PASS_NOT_ACTIVE');
  });

  it('rejects a pass whose amounts were edited in the database', async () => {
    const stay = await stayAwaitingSettlement(h, { patientIndex: 7, bedIndex: 7 });
    await stay.billing.post(
      `${stay.base}/payments`,
      { amountCents: stay.detail.ledger.balanceCents, rail: 'CASH', payerName: 'Full Pay' },
      { 'idempotency-key': `k-${crypto.randomUUID()}` },
    );
    const pass = (await stay.billing.get(`${stay.base}/gate-pass`)).body;
    await h.db.execute(
      sql`update gate_passes set settled_cents = settled_cents + 1 where pass_number = ${pass.passNumber}`,
    );
    const lobby = await h.staff('LOBBY_SECURITY');
    const r = await lobby.post('/api/v1/staff/gate-passes/verify', {
      passNumber: pass.passNumber,
      pin: pass.pin,
    });
    expect(r.body.error.code).toBe('PASS_TAMPERED');
  });
});
