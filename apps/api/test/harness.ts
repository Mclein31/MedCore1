import { randomBytes } from 'node:crypto';
import { expect } from 'vitest';
import { createApp } from '../src/app';
import type { Services } from '../src/context';
import { createDb, createPool, type Database } from '../src/db/client';
import * as s from '../src/db/schema';
import { loadConfig, type Config } from '../src/env';
import { FieldCipher } from '../src/lib/crypto';
import { createMemoryLogger } from '../src/lib/log';
import { hashPassword } from '../src/lib/password';
import { createMemoryMailer } from '../src/services/mailer';

export const DATABASE_URL = process.env.TEST_DATABASE_URL ?? 'postgres://localhost:5432/medcore_v2_test';
export const PASSWORD = 'correct horse battery staple 42';
export const ORIGIN = 'http://app.test';

const ROLES = [
  'HOSPITAL_CFO',
  'BILLING_SPECIALIST',
  'CLAIMS_ENCODER',
  'HMO_COORDINATOR',
  'ATTENDING_PHYSICIAN',
  'LOBBY_SECURITY',
] as const;
type Role = (typeof ROLES)[number];

export interface StaffFixture {
  id: string;
  email: string;
  role: Role;
}

export async function createHarness(overrides: Record<string, string> = {}) {
  const config: Config = loadConfig({
    APP_ENV: 'test',
    DATABASE_URL,
    PUBLIC_APP_URL: ORIGIN,
    ALLOWED_ORIGINS: ORIGIN,
    GATE_PASS_SECRET: randomBytes(32).toString('hex'),
    DATA_ENCRYPTION_KEY: randomBytes(32).toString('base64'),
    MAIL_TRANSPORT: 'console',
    STAFF_MFA_REQUIRED: 'false',
    PATIENT_ONLINE_PAYMENTS: 'simulated',
    PATIENT_ONLINE_PROMISSORY: 'true',
    TRUST_PROXY: 'x-forwarded-for',
    PASSWORD_PBKDF2_ITERATIONS: '100000',
    ...overrides,
  });
  const pool = createPool(DATABASE_URL, { max: 6 });
  const db = createDb(pool);
  const mailer = createMemoryMailer();
  const logger = createMemoryLogger();
  const clock = { current: new Date() };
  const pending: Promise<unknown>[] = [];
  const services: Services = {
    config,
    logger,
    mailer,
    cipher: new FieldCipher(config.dataEncryptionKey),
    database: { acquire: async () => ({ db, release: async () => undefined }) },
    now: () => new Date(clock.current.getTime()),
  };
  const app = createApp(services, { defer: (task) => void pending.push(task) });
  const fixture = await createFixture(db, config);

  let ipCounter = Math.floor(Math.random() * 200);
  const client = (opts: { ip?: string } = {}) =>
    new TestClient(
      app,
      opts.ip ?? `10.0.${Math.floor(Math.random() * 250)}.${(ipCounter = (ipCounter + 1) % 250)}`,
    );

  return {
    app,
    db,
    config,
    services,
    mailer,
    logger,
    fixture,
    client,
    advance: (ms: number) => {
      clock.current = new Date(clock.current.getTime() + ms);
    },
    flush: async () => {
      await Promise.all(pending.splice(0));
    },
    close: () => pool.end(),
    async staff(role: Role, which = 0) {
      const user = fixture.staff.filter((u) => u.role === role)[which]!;
      const c = client();
      const res = await c.post('/api/v1/auth/staff/login', { email: user.email, password: PASSWORD });
      expect(res.status, JSON.stringify(res.body)).toBe(200);
      expect(res.body.status).toBe('SIGNED_IN');
      return Object.assign(c, { user });
    },
  };
}

export type Harness = Awaited<ReturnType<typeof createHarness>>;

async function createFixture(db: Database, config: Config) {
  const suffix = randomBytes(4).toString('hex');
  const cipher = new FieldCipher(config.dataEncryptionKey);
  const [facility] = await db
    .insert(s.facilities)
    .values({
      code: `T-${suffix}`.toUpperCase(),
      name: `Test Hospital ${suffix}`,
      tin: '000',
      philhealthAccreditation: 'H1',
      address: 'Test St',
    })
    .returning();
  const hash = await hashPassword(PASSWORD, config.pbkdf2Iterations);
  const staff: StaffFixture[] = [];
  for (const role of [...ROLES, 'ATTENDING_PHYSICIAN', 'BILLING_SPECIALIST'] as Role[]) {
    const email = `${role.toLowerCase()}.${staff.length}.${suffix}@staff.example.test`;
    const [u] = await db
      .insert(s.staffUsers)
      .values({
        facilityId: facility!.id,
        email,
        fullName: `${role} ${staff.length}`,
        role,
        title: role,
        passwordHash: hash,
      })
      .returning({ id: s.staffUsers.id });
    staff.push({ id: u!.id, email, role });
  }
  const beds = [];
  for (let i = 0; i < 12; i++) {
    const [bed] = await db
      .insert(s.beds)
      .values({
        facilityId: facility!.id,
        code: `B${i}`,
        ward: 'Ward',
        floor: 1,
        roomCategory: 'WARD',
        dailyRateCents: 200_000,
      })
      .returning();
    beds.push(bed!);
  }
  const patients = [];
  // Patient 1 is a senior citizen; patient 3 has no email on file.
  for (let i = 0; i < 10; i++) {
    const id = crypto.randomUUID();
    const senior = i === 1;
    const dateOfBirth = senior ? '1950-05-05' : `1990-01-${String(i + 1).padStart(2, '0')}`;
    await db.insert(s.patients).values({
      id,
      facilityId: facility!.id,
      mrn: `MRN-${suffix}-${i}`.toUpperCase(),
      fullName: `Patient ${i} <script>`,
      dateOfBirth,
      sex: 'F',
      contactPhoneEnc: await cipher.encrypt('09171234567', `patients.contact_phone:${id}`),
      contactPhoneLast4: '4567',
      email: i === 3 ? null : `patient${i}.${suffix}@mail.example.test`,
      discountKind: senior ? 'SENIOR' : 'NONE',
      discountIdEnc: senior ? await cipher.encrypt('SC-1', `patients.discount_id:${id}`) : null,
      discountIdLast4: senior ? 'SC-1' : null,
    });
    patients.push({
      id,
      mrn: `MRN-${suffix}-${i}`.toUpperCase(),
      email: i === 3 ? null : `patient${i}.${suffix}@mail.example.test`,
      dateOfBirth,
    });
  }
  return { facility: facility!, staff, beds, patients };
}

interface Response {
  status: number;
  body: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  headers: Headers;
  text: string;
}

export class TestClient {
  cookies = new Map<string, string>();
  bearer: string | null = null;
  constructor(
    private readonly app: ReturnType<typeof createApp>,
    readonly ip: string,
  ) {}

  async request(
    method: string,
    path: string,
    body?: unknown,
    headers: Record<string, string> = {},
  ): Promise<Response> {
    const h = new Headers({ 'x-forwarded-for': this.ip, origin: ORIGIN, 'x-medcore-csrf': '1', ...headers });
    if (body !== undefined) h.set('content-type', 'application/json');
    if (this.cookies.size) h.set('cookie', [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; '));
    if (this.bearer) h.set('authorization', `Bearer ${this.bearer}`);
    for (const [k, v] of Object.entries(headers)) if (v === '') h.delete(k);
    const res = await this.app.request(path, {
      method,
      headers: h,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    for (const cookie of res.headers.getSetCookie()) {
      const [pair] = cookie.split(';');
      const [name, value] = pair!.split('=');
      if (/max-age=0/i.test(cookie) || value === '') this.cookies.delete(name!);
      else this.cookies.set(name!, value!);
    }
    const text = await res.text();
    let parsed: unknown = text;
    try {
      parsed = JSON.parse(text);
    } catch {
      /* not JSON */
    }
    return { status: res.status, body: parsed, headers: res.headers, text };
  }

  get = (path: string, headers?: Record<string, string>) => this.request('GET', path, undefined, headers);
  post = (path: string, body: unknown = {}, headers?: Record<string, string>) =>
    this.request('POST', path, body, headers);
  put = (path: string, body: unknown, headers?: Record<string, string>) =>
    this.request('PUT', path, body, headers);
  patch = (path: string, body: unknown, headers?: Record<string, string>) =>
    this.request('PATCH', path, body, headers);
}

export const idem = () => `test-${crypto.randomUUID()}`;

/** Drive a fresh stay all the way to "awaiting settlement" with a finalized bill, through the real API. */
export async function stayAwaitingSettlement(
  h: Harness,
  opts: { patientIndex?: number; bedIndex?: number; withHmo?: boolean } = {},
) {
  const billing = await h.staff('BILLING_SPECIALIST');
  const claims = await h.staff('CLAIMS_ENCODER');
  const hmo = await h.staff('HMO_COORDINATOR');
  const doctor = await h.staff('ATTENDING_PHYSICIAN');
  const patient = h.fixture.patients[opts.patientIndex ?? 0]!;
  const bed = h.fixture.beds[opts.bedIndex ?? 0]!;

  const admitted = await billing.post('/api/v1/staff/encounters', {
    patientId: patient.id,
    bedId: bed.id,
    attendingPhysicianId: doctor.user.id,
    primaryDiagnosis: 'Community-acquired pneumonia',
    icd10Code: 'J18.9',
  });
  expect(admitted.status, JSON.stringify(admitted.body)).toBe(201);
  const id: string = admitted.body.encounter.id;
  const base = `/api/v1/staff/encounters/${id}`;
  const ok = async (p: Promise<Response>) => {
    const r = await p;
    expect(r.status, JSON.stringify(r.body)).toBeLessThan(300);
    return r;
  };
  await ok(
    billing.post(`${base}/charges`, {
      code: 'RB-WARD',
      description: 'Room and board',
      category: 'ROOM_AND_BOARD',
      quantity: 3,
      unitPriceCents: 200_000,
      coverage: 'COVERED',
    }),
  );
  await ok(
    billing.post(`${base}/charges`, {
      code: 'LAB-CBC',
      description: 'Blood count <b>',
      category: 'LABORATORY',
      quantity: 2,
      unitPriceCents: 45_000,
      coverage: 'COVERED',
    }),
  );
  await ok(
    billing.post(`${base}/charges`, {
      code: 'SUP-KIT',
      description: 'Toiletries',
      category: 'SUPPLIES',
      quantity: 1,
      unitPriceCents: 35_000,
      coverage: 'EXCLUDED',
    }),
  );
  await ok(claims.put(`${base}/philhealth`, { caseRateCode: 'CAP-MR', hciCents: 300_000, pfCents: 100_000 }));
  if (opts.withHmo)
    await ok(
      hmo.put(`${base}/hmo`, { providerName: 'Maxicare', memberNumberLast4: '1234', mblCents: 10_000_000 }),
    );
  await ok(doctor.post(`${base}/discharge/declare-mgh`));
  await ok(billing.post(`${base}/discharge/start`));
  await ok(doctor.post(`${base}/discharge/sign-pf`, { agreedPfCents: 500_000 }));
  await ok(billing.post(`${base}/discharge/clear-pharmacy`));
  if (opts.withHmo)
    await ok(hmo.post(`${base}/discharge/final-loa`, { approvedCents: 200_000, approvalCode: 'LOA-777' }));
  const finalized = await ok(billing.post(`${base}/bill/finalize`));
  return { id, base, billing, claims, hmo, doctor, patient, bed, detail: finalized.body };
}
