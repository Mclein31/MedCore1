import { moneyCents } from '../services/statutoryWaterfall';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '../db';
import { encounters, patients } from '../db/schema';
import type { AuthUser } from '../middleware/auth';
import { matchEncounterCondition } from './dbQuery';

export async function resolveLinkedPatient(user: AuthUser) {
  if (user.linkedMrn) {
    const byMrn = await db.select().from(patients)
      .where(and(eq(patients.facilityId, user.facilityId), eq(patients.mrn, user.linkedMrn))).limit(1);
    return byMrn[0] || null;
  }
  // A phone number alone is not a verified association and may be shared
  // by several family members. Legacy users must link an MRN via registration.

  return null;
}

// Staff can operate within their facility; patients can mutate only their linked stay.
export async function encounterAccessCondition(user: AuthUser, idOrNumber: string) {
  const patient = user.role === 'PATIENT_GUARANTOR' ? await resolveLinkedPatient(user) : null;
  return and(
    matchEncounterCondition(idOrNumber),
    eq(encounters.facilityId, user.facilityId),
    user.role === 'PATIENT_GUARANTOR'
      ? (patient ? eq(encounters.patientId, patient.id) : sql`false`)
      : undefined
  );
}

export function isCentavoAmount(amount: number): boolean {
  try { return moneyCents(amount) > 0; }
  catch { return false; }
}
