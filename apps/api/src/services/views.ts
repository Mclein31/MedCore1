import { encounterScope, minutesBetween, slaStatus, type StaffRole } from '@medcore/domain';
import { and, asc, desc, eq, isNull, sql, type SQL } from 'drizzle-orm';
import type { StaffPrincipal } from '../context';
import type { DbOrTx } from '../db/client';
import {
  charges,
  disputes,
  encounters,
  facilities,
  gatePasses,
  hmoCoverages,
  ledgers,
  patients,
  payments,
  philhealthClaims,
  promissoryNotes,
  receipts,
  staffUsers,
  timelineEvents,
} from '../db/schema';
import { forbidden, notFound } from '../lib/errors';

/** Escape LIKE wildcards so a search for "%" matches a literal percent sign. */
export function likePattern(input: string): string {
  return `%${input.replace(/[\\%_]/g, (ch) => `\\${ch}`)}%`;
}

/** SQL condition limiting encounters to what this staff member may see. */
export function staffEncounterScope(staff: StaffPrincipal): SQL {
  const scope = encounterScope(staff.role as StaffRole);
  if (scope === 'NONE') throw forbidden();
  const facility = eq(encounters.facilityId, staff.facilityId);
  return scope === 'ATTENDING_ONLY'
    ? and(facility, eq(encounters.attendingPhysicianId, staff.id))!
    : facility;
}

export async function assertStaffCanSee(
  db: DbOrTx,
  staff: StaffPrincipal,
  encounterId: string,
): Promise<void> {
  const [row] = await db
    .select({ id: encounters.id })
    .from(encounters)
    .where(and(eq(encounters.id, encounterId), staffEncounterScope(staff)))
    .limit(1);
  if (!row) throw notFound('Stay');
}

export function sla(
  encounter: { mghOrderedAt: Date | null; clearedAt: Date | null },
  facility: { slaWarningMinutes: number; slaBreachMinutes: number },
  now: Date,
) {
  if (!encounter.mghOrderedAt) return { elapsedMinutes: null, status: null };
  const elapsed = minutesBetween(encounter.mghOrderedAt, encounter.clearedAt ?? now);
  return {
    elapsedMinutes: elapsed,
    status: slaStatus(elapsed, facility.slaWarningMinutes, facility.slaBreachMinutes),
  };
}

export interface ListFilters {
  stage?: string;
  q?: string;
  includeVoided?: boolean;
  page: number;
  pageSize: number;
}

export async function listEncounters(db: DbOrTx, staff: StaffPrincipal, filters: ListFilters, now: Date) {
  const conditions: SQL[] = [staffEncounterScope(staff)];
  if (!filters.includeVoided) conditions.push(isNull(encounters.voidedAt));
  if (filters.stage) conditions.push(sql`${encounters.stage} = ${filters.stage}`);
  if (filters.q) {
    const pattern = likePattern(filters.q);
    conditions.push(
      sql`(${encounters.encounterNumber} ILIKE ${pattern} OR ${patients.fullName} ILIKE ${pattern} OR ${patients.mrn} ILIKE ${pattern})`,
    );
  }
  const where = and(...conditions);
  const [facility] = await db.select().from(facilities).where(eq(facilities.id, staff.facilityId));
  const physician = sql<string>`(select ${staffUsers.fullName} from ${staffUsers} where ${staffUsers.id} = ${encounters.attendingPhysicianId})`;
  const rows = await db
    .select({
      id: encounters.id,
      encounterNumber: encounters.encounterNumber,
      patientName: patients.fullName,
      mrn: patients.mrn,
      bedCode: encounters.bedCode,
      stage: encounters.stage,
      billState: encounters.billState,
      admittedAt: encounters.admittedAt,
      mghOrderedAt: encounters.mghOrderedAt,
      clearedAt: encounters.clearedAt,
      voidedAt: encounters.voidedAt,
      physicianName: physician,
      netPatientDueCents: ledgers.netPatientDueCents,
      balanceCents: ledgers.balanceCents,
      grossCents: ledgers.grossCents,
      openDisputes: sql<number>`(select count(*)::int from ${disputes} where ${disputes.encounterId} = ${encounters.id} and ${disputes.status} = 'OPEN')`,
    })
    .from(encounters)
    .innerJoin(patients, eq(patients.id, encounters.patientId))
    .leftJoin(ledgers, eq(ledgers.encounterId, encounters.id))
    .where(where)
    .orderBy(desc(encounters.admittedAt))
    .limit(filters.pageSize)
    .offset((filters.page - 1) * filters.pageSize);
  const [count] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(encounters)
    .innerJoin(patients, eq(patients.id, encounters.patientId))
    .where(where);
  return {
    items: rows.map((r) => ({ ...r, sla: facility ? sla(r, facility, now) : null })),
    total: count?.total ?? 0,
    page: filters.page,
    pageSize: filters.pageSize,
  };
}

/** Everything about one stay, for staff. Sensitive identifiers appear only as last 4 digits. */
export async function staffEncounterDetail(
  db: DbOrTx,
  staff: StaffPrincipal,
  encounterId: string,
  now: Date,
) {
  const [row] = await db
    .select({ encounter: encounters, patient: patients, facility: facilities })
    .from(encounters)
    .innerJoin(patients, eq(patients.id, encounters.patientId))
    .innerJoin(facilities, eq(facilities.id, encounters.facilityId))
    .where(and(eq(encounters.id, encounterId), staffEncounterScope(staff)))
    .limit(1);
  if (!row) throw notFound('Stay');
  const { encounter, patient, facility } = row;
  const [physician] = await db
    .select({ id: staffUsers.id, fullName: staffUsers.fullName, prcLicense: staffUsers.prcLicense })
    .from(staffUsers)
    .where(eq(staffUsers.id, encounter.attendingPhysicianId));
  const [ledger] = await db.select().from(ledgers).where(eq(ledgers.encounterId, encounter.id));
  const [claim] = await db
    .select()
    .from(philhealthClaims)
    .where(eq(philhealthClaims.encounterId, encounter.id));
  const [hmo] = await db.select().from(hmoCoverages).where(eq(hmoCoverages.encounterId, encounter.id));
  const chargeRows = await db
    .select()
    .from(charges)
    .where(eq(charges.encounterId, encounter.id))
    .orderBy(asc(charges.postedAt));
  const paymentRows = await db
    .select({
      id: payments.id,
      reference: payments.reference,
      amountCents: payments.amountCents,
      rail: payments.rail,
      payerName: payments.payerName,
      isSimulated: payments.isSimulated,
      createdAt: payments.createdAt,
      officialReceiptNumber: receipts.officialReceiptNumber,
    })
    .from(payments)
    .innerJoin(receipts, eq(receipts.paymentId, payments.id))
    .where(eq(payments.encounterId, encounter.id))
    .orderBy(asc(payments.createdAt));
  const notes = await db
    .select({
      id: promissoryNotes.id,
      noteNumber: promissoryNotes.noteNumber,
      borrowerName: promissoryNotes.borrowerName,
      relationship: promissoryNotes.relationship,
      idType: promissoryNotes.idType,
      idLast4: promissoryNotes.idLast4,
      principalCents: promissoryNotes.principalCents,
      months: promissoryNotes.months,
      schedule: promissoryNotes.schedule,
      status: promissoryNotes.status,
      signedAt: promissoryNotes.signedAt,
    })
    .from(promissoryNotes)
    .where(eq(promissoryNotes.encounterId, encounter.id));
  const disputeRows = await db
    .select()
    .from(disputes)
    .where(eq(disputes.encounterId, encounter.id))
    .orderBy(desc(disputes.createdAt));
  const passes = await db
    .select({
      id: gatePasses.id,
      passNumber: gatePasses.passNumber,
      status: gatePasses.status,
      issuedAt: gatePasses.issuedAt,
      expiresAt: gatePasses.expiresAt,
      usedAt: gatePasses.usedAt,
      pinAttempts: gatePasses.pinAttempts,
    })
    .from(gatePasses)
    .where(eq(gatePasses.encounterId, encounter.id))
    .orderBy(desc(gatePasses.issuedAt));
  const events = await db
    .select()
    .from(timelineEvents)
    .where(eq(timelineEvents.encounterId, encounter.id))
    .orderBy(desc(timelineEvents.createdAt))
    .limit(200);

  return {
    encounter: {
      id: encounter.id,
      encounterNumber: encounter.encounterNumber,
      bedCode: encounter.bedCode,
      roomCategory: encounter.roomCategory,
      primaryDiagnosis: encounter.primaryDiagnosis,
      icd10Code: encounter.icd10Code,
      admittedAt: encounter.admittedAt,
      stage: encounter.stage,
      stageEnteredAt: encounter.stageEnteredAt,
      mghOrderedAt: encounter.mghOrderedAt,
      clearedAt: encounter.clearedAt,
      agreedPfCents: encounter.agreedPfCents,
      pfCeilingCents: encounter.pfCeilingCents,
      doctorExcessPfCents: encounter.doctorExcessPfCents,
      roomUpgradeExcessCents: encounter.roomUpgradeExcessCents,
      pfSignedAt: encounter.pfSignedAt,
      pharmacyClearedAt: encounter.pharmacyClearedAt,
      billState: encounter.billState,
      billNumber: encounter.billNumber,
      billFinalizedAt: encounter.billFinalizedAt,
      billSentAt: encounter.billSentAt,
      voidedAt: encounter.voidedAt,
      voidReason: encounter.voidReason,
      version: encounter.version,
      sla: sla(encounter, facility, now),
    },
    patient: {
      id: patient.id,
      mrn: patient.mrn,
      fullName: patient.fullName,
      dateOfBirth: patient.dateOfBirth,
      sex: patient.sex,
      hasEmail: Boolean(patient.email),
      contactPhoneLast4: patient.contactPhoneLast4,
      philhealthPinLast4: patient.philhealthPinLast4,
      discountKind: patient.discountKind,
      discountIdLast4: patient.discountIdLast4,
    },
    physician: physician ?? null,
    ledger: ledger ?? null,
    philhealth: claim ?? null,
    hmo: hmo ?? null,
    charges: chargeRows,
    payments: paymentRows,
    promissoryNotes: notes,
    disputes: disputeRows,
    gatePasses: passes,
    timeline: events,
  };
}
