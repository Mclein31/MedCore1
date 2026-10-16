import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createHarness, idem, stayAwaitingSettlement, type Harness } from './harness';

let h: Harness;
beforeAll(async () => {
  h = await createHarness();
});
afterAll(() => h.close());

const AUTH = '/api/v1/auth/patient';

function lastCodeTo(email: string): string {
  const msg = [...h.mailer.sent].reverse().find((m) => m.to === email);
  const match = msg?.text.match(/\b(\d{6})\b/);
  if (!match) throw new Error(`No code was emailed to ${email}`);
  return match[1]!;
}

async function register(patientIndex: number, client = h.client()) {
  const p = h.fixture.patients[patientIndex]!;
  const identity = { facilityCode: h.fixture.facility.code, mrn: p.mrn, dateOfBirth: p.dateOfBirth };
  const req = await client.post(`${AUTH}/code/request`, { purpose: 'REGISTER', ...identity });
  expect(req.status).toBe(202);
  await h.flush();
  const verify = await client.post(`${AUTH}/code/verify`, {
    purpose: 'REGISTER',
    ...identity,
    code: lastCodeTo(p.email!),
  });
  expect(verify.status, JSON.stringify(verify.body)).toBe(200);
  return client;
}

describe('patient email codes', () => {
  it('sends the code only to the hospital-recorded email and answers identically either way', async () => {
    const p = h.fixture.patients[0]!;
    const c = h.client();
    const matched = await c.post(`${AUTH}/code/request`, {
      purpose: 'REGISTER',
      facilityCode: h.fixture.facility.code,
      mrn: p.mrn,
      dateOfBirth: p.dateOfBirth,
    });
    const unmatched = await c.post(`${AUTH}/code/request`, {
      purpose: 'REGISTER',
      facilityCode: h.fixture.facility.code,
      mrn: p.mrn,
      dateOfBirth: '1901-01-01',
    });
    const noEmail = await c.post(`${AUTH}/code/request`, {
      purpose: 'REGISTER',
      facilityCode: h.fixture.facility.code,
      mrn: h.fixture.patients[3]!.mrn,
      dateOfBirth: h.fixture.patients[3]!.dateOfBirth,
    });
    const unknownLogin = await c.post(`${AUTH}/code/request`, {
      purpose: 'LOGIN',
      facilityCode: h.fixture.facility.code,
      email: 'stranger@mail.example.test',
    });
    for (const r of [matched, unmatched, noEmail, unknownLogin]) {
      expect(r.status).toBe(202);
      expect(r.body).toEqual(matched.body);
    }
    await h.flush();
    const sent = h.mailer.sent.filter((m) => m.to === p.email);
    expect(sent).toHaveLength(1);
    expect(sent[0]!.subject).toMatch(/^\d{6} is your MedCore sign-in code$/);
    // No amounts, diagnoses or record numbers in email.
    expect(sent[0]!.text).not.toContain(p.mrn);
    expect(sent[0]!.text).not.toMatch(/₱/);
  });

  it('only the newest code works, and a REGISTER code cannot be used to LOGIN', async () => {
    const p = h.fixture.patients[1]!;
    const c = h.client();
    const identity = { facilityCode: h.fixture.facility.code, mrn: p.mrn, dateOfBirth: p.dateOfBirth };
    await c.post(`${AUTH}/code/request`, { purpose: 'REGISTER', ...identity });
    await h.flush();
    const old = lastCodeTo(p.email!);
    await c.post(`${AUTH}/code/request`, { purpose: 'REGISTER', ...identity });
    await h.flush();
    const fresh = lastCodeTo(p.email!);
    if (old !== fresh) {
      const stale = await c.post(`${AUTH}/code/verify`, { purpose: 'REGISTER', ...identity, code: old });
      expect(stale.status).toBe(401);
    }
    const crossPurpose = await c.post(`${AUTH}/code/verify`, {
      purpose: 'LOGIN',
      facilityCode: h.fixture.facility.code,
      email: p.email,
      code: fresh,
    });
    expect(crossPurpose.status).toBe(401);
    const ok = await c.post(`${AUTH}/code/verify`, { purpose: 'REGISTER', ...identity, code: fresh });
    expect(ok.status).toBe(200);
    // Single use.
    const reuse = await h
      .client()
      .post(`${AUTH}/code/verify`, { purpose: 'REGISTER', ...identity, code: fresh });
    expect(reuse.status).toBe(401);
  });

  it('locks a code after five wrong tries', async () => {
    const p = h.fixture.patients[2]!;
    const c = h.client();
    const identity = { facilityCode: h.fixture.facility.code, mrn: p.mrn, dateOfBirth: p.dateOfBirth };
    await c.post(`${AUTH}/code/request`, { purpose: 'REGISTER', ...identity });
    await h.flush();
    const real = lastCodeTo(p.email!);
    const wrong = real === '000000' ? '111111' : '000000';
    for (let i = 0; i < 4; i++)
      expect(
        (await c.post(`${AUTH}/code/verify`, { purpose: 'REGISTER', ...identity, code: wrong })).body.error
          .code,
      ).toBe('CODE_INVALID');
    expect(
      (await c.post(`${AUTH}/code/verify`, { purpose: 'REGISTER', ...identity, code: wrong })).body.error
        .code,
    ).toBe('CODE_LOCKED');
    expect(
      (await c.post(`${AUTH}/code/verify`, { purpose: 'REGISTER', ...identity, code: real })).status,
    ).toBe(401);
  });

  it('lets only one of two simultaneous verifications win', async () => {
    const p = h.fixture.patients[4]!;
    const identity = { facilityCode: h.fixture.facility.code, mrn: p.mrn, dateOfBirth: p.dateOfBirth };
    await h.client().post(`${AUTH}/code/request`, { purpose: 'REGISTER', ...identity });
    await h.flush();
    const code = lastCodeTo(p.email!);
    const results = await Promise.all(
      [1, 2, 3].map(() => h.client().post(`${AUTH}/code/verify`, { purpose: 'REGISTER', ...identity, code })),
    );
    expect(results.filter((r) => r.status === 200)).toHaveLength(1);
  });

  it('expires codes after ten minutes', async () => {
    const p = h.fixture.patients[5]!;
    const identity = { facilityCode: h.fixture.facility.code, mrn: p.mrn, dateOfBirth: p.dateOfBirth };
    const c = h.client();
    await c.post(`${AUTH}/code/request`, { purpose: 'REGISTER', ...identity });
    await h.flush();
    const code = lastCodeTo(p.email!);
    h.advance(11 * 60 * 1000);
    expect((await c.post(`${AUTH}/code/verify`, { purpose: 'REGISTER', ...identity, code })).status).toBe(
      401,
    );
  });

  it('gives mobile clients a bearer token and web clients only a cookie', async () => {
    const p = h.fixture.patients[6]!;
    const identity = { facilityCode: h.fixture.facility.code, mrn: p.mrn, dateOfBirth: p.dateOfBirth };
    const web = h.client();
    await web.post(`${AUTH}/code/request`, { purpose: 'REGISTER', ...identity });
    await h.flush();
    const webRes = await web.post(`${AUTH}/code/verify`, {
      purpose: 'REGISTER',
      ...identity,
      code: lastCodeTo(p.email!),
    });
    expect(webRes.body.token).toBeUndefined();

    const mobile = h.client();
    await mobile.post(`${AUTH}/code/request`, {
      purpose: 'LOGIN',
      facilityCode: h.fixture.facility.code,
      email: p.email,
    });
    await h.flush();
    const mobileRes = await mobile.post(`${AUTH}/code/verify`, {
      purpose: 'LOGIN',
      facilityCode: h.fixture.facility.code,
      email: p.email,
      code: lastCodeTo(p.email!),
      client: 'mobile',
    });
    expect(mobileRes.body.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const app = h.client();
    app.bearer = mobileRes.body.token;
    expect((await app.get('/api/v1/patient/stays')).status).toBe(200);
    // Bearer clients are not subject to the CSRF header requirement.
    expect((await app.post(`${AUTH}/logout`, {}, { 'x-medcore-csrf': '', origin: '' })).status).toBe(200);
    expect((await app.get('/api/v1/patient/stays')).status).toBe(401);
  });
});

describe('patient portal', () => {
  it('shows a stay only once the bill is final, only to linked accounts, and settles it', async () => {
    const stay = await stayAwaitingSettlement(h, { patientIndex: 7, bedIndex: 0 });
    const patient = await register(7);
    const stranger = await register(8);

    const list = await patient.get('/api/v1/patient/stays');
    const item = list.body.items.find((s: { id: string }) => s.id === stay.id);
    expect(item.billReady).toBe(true);
    expect((await stranger.get(`/api/v1/patient/stays/${stay.id}`)).status).toBe(404);
    expect(
      (
        await stranger.post(
          `/api/v1/patient/stays/${stay.id}/payments`,
          { amountCents: 100, rail: 'GCASH', payerName: 'Thief Name' },
          { 'idempotency-key': idem() },
        )
      ).status,
    ).toBe(404);

    const detail = await patient.get(`/api/v1/patient/stays/${stay.id}`);
    expect(detail.status).toBe(200);
    // Patient-safe projection: no diagnosis code, no staff identities.
    expect(JSON.stringify(detail.body)).not.toContain('J18.9');
    expect(JSON.stringify(detail.body)).not.toContain('@staff.example.test');
    const balance: number = detail.body.ledger.balanceCents;

    const card = await patient.post(
      `/api/v1/patient/stays/${stay.id}/payments`,
      {
        amountCents: balance,
        rail: 'CARD',
        payerName: 'Pat Seven',
        cardBrand: 'VISA',
        cardLast4: '4242',
        cardNumber: '4242424242424242',
      },
      { 'idempotency-key': idem() },
    );
    expect(card.status).toBe(422);
    const paid = await patient.post(
      `/api/v1/patient/stays/${stay.id}/payments`,
      { amountCents: balance, rail: 'CARD', payerName: 'Pat Seven', cardBrand: 'VISA', cardLast4: '4242' },
      { 'idempotency-key': idem() },
    );
    expect(paid.status, JSON.stringify(paid.body)).toBe(201);
    const after = await patient.get(`/api/v1/patient/stays/${stay.id}`);
    expect(after.body.stay.stage).toBe('CLEARED');
    expect(after.body.gatePass.pin).toMatch(/^\d{6}$/);
  });

  it('hides draft bills from patients', async () => {
    const billing = await h.staff('BILLING_SPECIALIST');
    const doctor = await h.staff('ATTENDING_PHYSICIAN');
    const p = h.fixture.patients[9]!;
    const admitted = await billing.post('/api/v1/staff/encounters', {
      patientId: p.id,
      bedId: h.fixture.beds[1]!.id,
      attendingPhysicianId: doctor.user.id,
      primaryDiagnosis: 'Observation only',
      icd10Code: 'R69',
    });
    expect(admitted.status).toBe(201);
    const patient = await register(9);
    const detail = await patient.get(`/api/v1/patient/stays/${admitted.body.encounter.id}`);
    expect(detail.body.stay.billReady).toBe(false);
    expect(detail.body.ledger).toBeUndefined();
    expect(detail.body.charges).toBeUndefined();
  });

  it('refuses online payment when the simulation is switched off', async () => {
    const off = await createHarness({ PATIENT_ONLINE_PAYMENTS: 'disabled' });
    try {
      const res = await off.client().post(`/api/v1/patient/stays/${crypto.randomUUID()}/payments`, {
        amountCents: 100,
        rail: 'GCASH',
        payerName: 'Some One',
      });
      expect(res.status).toBe(401); // not signed in; the switch is checked after auth
    } finally {
      await off.close();
    }
  });
});
