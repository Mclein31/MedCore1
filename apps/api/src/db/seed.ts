/**
 * Fictional demo data. Every person, number and record here is made up.
 *
 *   SEED_PASSWORD='a long passphrase' npm run db:seed
 *
 * Safety rails:
 * - Refuses any database host other than localhost unless SEED_ALLOW_REMOTE names
 *   that exact host (so a production URL in the shell cannot be seeded by accident).
 * - Refuses to run on a database that already has staff accounts.
 * - Staff passwords come from SEED_PASSWORD (checked against the password policy);
 *   nothing is hard-coded. Everyone enrolls an authenticator at first sign-in.
 * - Patient emails use the reserved .test domain unless SEED_PATIENT_EMAIL is set
 *   (e.g. you@gmail.com, which becomes you+mrn@gmail.com aliases you control).
 */
import { checkPassword, lineTotal, type ChargeCategory } from '@medcore/domain';
import { eq, sql } from 'drizzle-orm';
import { createDb, createPool, type Database } from './client';
import * as s from './schema';
import { loadConfig } from '../env';
import { FieldCipher } from '../lib/crypto';
import { hashPassword } from '../lib/password';
import { recalculateLedger } from '../services/ledger';
import { nextDocumentNumber } from '../services/numbers';

function rng(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

const FIRST = ['Maria', 'Jose', 'Ana', 'Juan', 'Rosa', 'Pedro', 'Carmen', 'Luis', 'Elena', 'Ramon', 'Teresa', 'Andres', 'Liza', 'Mark', 'Grace', 'Paolo'];
const LAST = ['Dela Cruz', 'Santos', 'Reyes', 'Garcia', 'Mendoza', 'Bautista', 'Aquino', 'Ramos', 'Villanueva', 'Castillo', 'Navarro', 'Torres'];
const DIAGNOSES: [string, string, string, number, number][] = [
  ['Community-acquired pneumonia, moderate risk', 'J18.9', 'CAP-MR', 1_520_000, 630_000],
  ['Acute gastroenteritis with moderate dehydration', 'A09.0', 'AGE-MD', 600_000, 300_000],
  ['Dengue fever without warning signs', 'A90', 'DENGUE', 1_000_000, 400_000],
  ['Urinary tract infection', 'N39.0', 'UTI', 750_000, 300_000],
  ['Essential hypertension, urgency', 'I10', 'HPN-U', 900_000, 400_000],
  ['Acute appendicitis, appendectomy', 'K35.8', 'APPX', 2_400_000, 840_000],
];
const HMOS = ['Maxicare', 'Intellicare', 'Medicard', 'PhilCare', 'Pacific Cross'];

async function main() {
  const url = process.env.DATABASE_URL;
  const password = process.env.SEED_PASSWORD;
  if (!url) throw new Error('DATABASE_URL is not set.');
  const host = new URL(url).hostname;
  const allowed = ['localhost', '127.0.0.1', '::1', ''];
  if (!allowed.includes(host) && process.env.SEED_ALLOW_REMOTE !== host) {
    throw new Error(`Refusing to seed remote host "${host}". Set SEED_ALLOW_REMOTE=${host} if this is a disposable demo branch.`);
  }
  if (!password) throw new Error('Set SEED_PASSWORD to the password every demo staff account should use.');
  const policy = checkPassword(password, { email: 'x@example.test' });
  if (!policy.ok) throw new Error(`SEED_PASSWORD rejected: ${policy.reason}`);

  const config = loadConfig({ ...process.env, MAIL_TRANSPORT: process.env.MAIL_TRANSPORT ?? 'console' });
  const cipher = new FieldCipher(config.dataEncryptionKey);
  const pool = createPool(url, { max: 2, statementTimeoutMs: 120_000 });
  const db = createDb(pool);
  try {
    const [{ count }] = (await db.select({ count: sql<number>`count(*)::int` }).from(s.staffUsers)) as [{ count: number }];
    if (count > 0) throw new Error('This database already has staff accounts. Seed only an empty database.');
    await seed(db, cipher, password, config.pbkdf2Iterations);
  } finally {
    await pool.end();
  }
}

async function seed(db: Database, cipher: FieldCipher, password: string, iterations: number) {
  const random = rng(20261016);
  const pick = <T>(items: readonly T[]) => items[Math.floor(random() * items.length)]!;
  const now = new Date();
  const hash = await hashPassword(password, iterations);
  const emailBase = process.env.SEED_PATIENT_EMAIL;

  await db.transaction(async (tx) => {
    const [facility] = await tx
      .insert(s.facilities)
      .values({
        code: 'SJMC-MNL',
        name: 'St. Jude Medical Center (Demo)',
        tin: '000-000-000-000',
        philhealthAccreditation: 'H0000000',
        address: '100 Demo Avenue, Manila (fictional)',
      })
      .returning();
    const f = facility!;

    const staff = [
      ['cfo@stjude.example.test', 'Carmela Reyes', 'HOSPITAL_CFO', 'Chief Financial Officer', null],
      ['billing@stjude.example.test', 'Elena Santos', 'BILLING_SPECIALIST', 'Billing Specialist', null],
      ['billing2@stjude.example.test', 'Marco Lim', 'BILLING_SPECIALIST', 'Billing Specialist', null],
      ['claims@stjude.example.test', 'Joy Navarro', 'CLAIMS_ENCODER', 'PhilHealth Claims Encoder', null],
      ['hmo@stjude.example.test', 'Ben Aquino', 'HMO_COORDINATOR', 'HMO Coordinator', null],
      ['dr.cruz@stjude.example.test', 'Dr. Carlos Cruz', 'ATTENDING_PHYSICIAN', 'Internal Medicine', '0123456'],
      ['dr.lopez@stjude.example.test', 'Dr. Isabel Lopez', 'ATTENDING_PHYSICIAN', 'General Surgery', '0234567'],
      ['lobby@stjude.example.test', 'Rey Bautista', 'LOBBY_SECURITY', 'Lobby Security', null],
    ] as const;
    const ids: Record<string, string> = {};
    for (const [email, fullName, role, title, prc] of staff) {
      const [u] = await tx
        .insert(s.staffUsers)
        .values({ facilityId: f.id, email, fullName, role, title, prcLicense: prc, passwordHash: hash, passwordChangedAt: now })
        .returning({ id: s.staffUsers.id });
      ids[email] = u!.id;
    }
    const physicians = [ids['dr.cruz@stjude.example.test']!, ids['dr.lopez@stjude.example.test']!];

    const bedRows: (typeof s.beds.$inferSelect)[] = [];
    for (const [floor, ward, category, rate] of [
      [3, 'Ward A', 'WARD', 150_000],
      [4, 'Semi-private', 'SEMI_PRIVATE', 300_000],
      [5, 'Private', 'PRIVATE', 550_000],
    ] as const) {
      for (let n = 1; n <= 12; n++) {
        const [bed] = await tx
          .insert(s.beds)
          .values({ facilityId: f.id, code: `${floor}${String(n).padStart(2, '0')}`, ward, floor, roomCategory: category, dailyRateCents: rate })
          .returning();
        bedRows.push(bed!);
      }
    }

    const stages = [
      'ADMITTED', 'ADMITTED', 'ADMITTED', 'ADMITTED', 'ADMITTED', 'ADMITTED',
      'MGH_DECLARED', 'MGH_DECLARED', 'MGH_DECLARED',
      'DOCTOR_PF_PENDING', 'DOCTOR_PF_PENDING', 'DOCTOR_PF_PENDING',
      'PHARMACY_RTS_AUDIT', 'PHARMACY_RTS_AUDIT',
      'HMO_FINAL_LOA', 'HMO_FINAL_LOA', 'HMO_FINAL_LOA',
      'PENDING_SETTLEMENT', 'PENDING_SETTLEMENT', 'PENDING_SETTLEMENT', 'PENDING_SETTLEMENT', 'PENDING_SETTLEMENT',
    ] as const;

    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i]!;
      const patientId = crypto.randomUUID();
      const mrn = `MRN-${String(240100 + i)}`;
      const age = 20 + Math.floor(random() * 65);
      const dob = `${now.getUTCFullYear() - age}-${String(1 + Math.floor(random() * 12)).padStart(2, '0')}-${String(1 + Math.floor(random() * 28)).padStart(2, '0')}`;
      const discount = age >= 60 ? 'SENIOR' : random() < 0.08 ? 'PWD' : 'NONE';
      const phone = `0917${String(1000000 + Math.floor(random() * 8999999))}`;
      const email = emailBase ? emailBase.replace('@', `+${mrn.toLowerCase()}@`) : `${mrn.toLowerCase()}@patients.example.test`;
      const pin = String(100000000000 + Math.floor(random() * 899999999999));
      await tx.insert(s.patients).values({
        id: patientId,
        facilityId: f.id,
        mrn,
        fullName: `${pick(FIRST)} ${pick(LAST)}`,
        dateOfBirth: dob,
        sex: random() < 0.5 ? 'F' : 'M',
        contactPhoneEnc: await cipher.encrypt(phone, `patients.contact_phone:${patientId}`),
        contactPhoneLast4: phone.slice(-4),
        email,
        philhealthPinEnc: await cipher.encrypt(pin, `patients.philhealth_pin:${patientId}`),
        philhealthPinLast4: pin.slice(-4),
        discountKind: discount,
        discountIdEnc: discount === 'NONE' ? null : await cipher.encrypt(`ID-${mrn}`, `patients.discount_id:${patientId}`),
        discountIdLast4: discount === 'NONE' ? null : mrn.slice(-4),
      });

      const bed = bedRows[i]!;
      const [dx, icd, caseRate, hci, pf] = pick(DIAGNOSES);
      const days = 2 + Math.floor(random() * 5);
      const admittedAt = new Date(now.getTime() - (days * 24 + Math.floor(random() * 12)) * 3600_000);
      const mgh = stage === 'ADMITTED' ? null : new Date(now.getTime() - (5 + Math.floor(random() * 50)) * 60_000);
      const physicianId = physicians[i % 2]!;
      const [encounter] = await tx
        .insert(s.encounters)
        .values({
          facilityId: f.id,
          patientId,
          encounterNumber: await nextDocumentNumber(tx, f.id, 'ENC', now),
          bedId: bed.id,
          bedCode: bed.code,
          roomCategory: bed.roomCategory,
          attendingPhysicianId: physicianId,
          primaryDiagnosis: dx,
          icd10Code: icd,
          admittedAt,
          stage,
          stageEnteredAt: mgh ?? admittedAt,
          mghOrderedAt: mgh,
          pfCeilingCents: 1_500_000,
        })
        .returning();
      await tx.update(s.beds).set({ status: 'OCCUPIED', currentEncounterId: encounter!.id }).where(eq(s.beds.id, bed.id));

      const lines: [string, string, ChargeCategory, number, number, 'COVERED' | 'EXCLUDED', string][] = [
        ['RB-' + bed.roomCategory, `${bed.ward} room and board`, 'ROOM_AND_BOARD', days, bed.dailyRateCents, 'COVERED', 'Your bed, meals and nursing care for each day of your stay.'],
        ['LAB-CBC', 'Complete blood count', 'LABORATORY', 1 + Math.floor(random() * 3), 45_000, 'COVERED', 'A blood test that checks for infection and anemia.'],
        ['MED-IV', 'IV fluids and medicines', 'PHARMACY', 1 + Math.floor(random() * 6), 85_000, 'COVERED', 'Medicines and fluids given through your IV line.'],
        ['SUP-KIT', 'Admission kit (toiletries)', 'SUPPLIES', 1, 35_000, 'EXCLUDED', 'Personal items. Insurers do not cover these, so you pay for them.'],
      ];
      if (random() < 0.5) lines.push(['IMG-XR', 'Chest X-ray', 'IMAGING', 1, 120_000, 'COVERED', 'An image of your chest to check your lungs.']);
      if (stage !== 'ADMITTED' && stage !== 'MGH_DECLARED' && stage !== 'DOCTOR_PF_PENDING') {
        lines.push(['PF-ATTENDING', 'Attending physician professional fee', 'PROFESSIONAL_FEE', 1, 1_200_000 + Math.floor(random() * 8) * 100_000, 'COVERED', 'The fee your doctor charged for managing your care.']);
      }
      for (const [code, description, category, quantity, unit, coverage, explainer] of lines) {
        await tx.insert(s.charges).values({
          encounterId: encounter!.id,
          code,
          description,
          category,
          quantity,
          unitPriceCents: unit,
          grossCents: lineTotal(quantity, unit),
          coverage,
          explainer,
          postedBy: ids['billing@stjude.example.test'],
          postedAt: new Date(admittedAt.getTime() + 3600_000),
        });
      }
      const pfLine = lines.find((l) => l[2] === 'PROFESSIONAL_FEE');
      const progressed = ['PHARMACY_RTS_AUDIT', 'HMO_FINAL_LOA', 'PENDING_SETTLEMENT'].includes(stage);
      if (progressed && pfLine) {
        const agreed = pfLine[4];
        await tx
          .update(s.encounters)
          .set({ agreedPfCents: agreed, doctorExcessPfCents: Math.max(0, agreed - 1_500_000), pfSignedAt: mgh, pfSignedBy: physicianId })
          .where(eq(s.encounters.id, encounter!.id));
      }

      await tx.insert(s.philhealthClaims).values({
        facilityId: f.id,
        encounterId: encounter!.id,
        claimNumber: await nextDocumentNumber(tx, f.id, 'CLM', now),
        caseRateCode: caseRate,
        hciCents: hci,
        pfCents: pf,
      });
      const withHmo = stage === 'HMO_FINAL_LOA' || random() < 0.45;
      if (withHmo) {
        const approved = stage === 'PENDING_SETTLEMENT' ? 1_000_000 + Math.floor(random() * 10) * 100_000 : 0;
        await tx.insert(s.hmoCoverages).values({
          encounterId: encounter!.id,
          providerName: pick(HMOS),
          memberNumberLast4: String(1000 + Math.floor(random() * 8999)),
          mblCents: 15_000_000,
          loaStatus: approved > 0 ? 'APPROVED' : 'PENDING',
          approvedCents: approved,
          approvalCode: approved > 0 ? `LOA-${1000 + i}` : null,
          decidedAt: approved > 0 ? now : null,
          decidedBy: approved > 0 ? ids['hmo@stjude.example.test'] : null,
        });
      }
      if (progressed && stage !== 'PHARMACY_RTS_AUDIT') {
        await tx.update(s.encounters).set({ pharmacyClearedAt: mgh }).where(eq(s.encounters.id, encounter!.id));
      }
      if (stage === 'PENDING_SETTLEMENT') {
        const billNumber = await nextDocumentNumber(tx, f.id, 'SOA', now);
        await tx
          .update(s.encounters)
          .set({ billState: i % 2 === 0 ? 'SENT' : 'FINALIZED', billNumber, billFinalizedAt: now, billSentAt: i % 2 === 0 ? now : null })
          .where(eq(s.encounters.id, encounter!.id));
      }

      // The ledger goes through the same engine as live traffic (and its DB reconciliation CHECK).
      const [fresh] = await tx.select().from(s.encounters).where(eq(s.encounters.id, encounter!.id));
      await recalculateLedger(tx, fresh!, now);
      await tx.insert(s.timelineEvents).values({ encounterId: encounter!.id, kind: 'ADMISSION', title: 'Admitted', detail: `Bed ${bed.code}.`, actorLabel: 'Seed data', createdAt: admittedAt });
    }
  });
  console.warn('Seeded facility SJMC-MNL with 8 staff accounts, 36 beds and 22 stays.');
  console.warn('Staff sign in with their @stjude.example.test email and SEED_PASSWORD, then set up an authenticator app.');
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
