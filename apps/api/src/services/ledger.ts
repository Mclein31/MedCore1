import { computeWaterfall, settlementPosition, type WaterfallResult } from '@medcore/domain';
import { and, eq, isNull, sql } from 'drizzle-orm';
import type { DbOrTx } from '../db/client';
import { charges, encounters, hmoCoverages, ledgers, patients, payments, philhealthClaims, promissoryNotes } from '../db/schema';
import { notFound } from '../lib/errors';

export type Encounter = typeof encounters.$inferSelect;
export type Ledger = typeof ledgers.$inferSelect;

/**
 * Lock order (every write path follows it, so concurrent writers cannot deadlock):
 *   1. encounters row (FOR UPDATE)
 *   2. child rows (charges, disputes, coverage, notes, passes)
 *   3. ledgers row (rewritten last)
 */
export async function lockEncounter(tx: DbOrTx, encounterId: string, facilityId: string): Promise<Encounter> {
  const [row] = await tx
    .select()
    .from(encounters)
    .where(and(eq(encounters.id, encounterId), eq(encounters.facilityId, facilityId)))
    .limit(1)
    .for('update');
  if (!row) throw notFound('Stay');
  return row;
}

/**
 * Recompute the statutory waterfall and settlement position from source rows and
 * persist it. Call inside the transaction that changed any input, after locking
 * the encounter. The database CHECK re-verifies the centavo identity on write.
 */
export async function recalculateLedger(tx: DbOrTx, encounter: Encounter, now: Date): Promise<Ledger> {
  const [patient] = await tx
    .select({ discountKind: patients.discountKind })
    .from(patients)
    .where(eq(patients.id, encounter.patientId));
  const lines = await tx
    .select({ grossCents: charges.grossCents, category: charges.category, coverage: charges.coverage })
    .from(charges)
    .where(and(eq(charges.encounterId, encounter.id), isNull(charges.removedAt)));
  const [claim] = await tx.select().from(philhealthClaims).where(eq(philhealthClaims.encounterId, encounter.id));
  const [hmo] = await tx.select().from(hmoCoverages).where(eq(hmoCoverages.encounterId, encounter.id));
  const [paid] = await tx
    .select({ total: sql<number>`coalesce(sum(${payments.amountCents}), 0)::bigint` })
    .from(payments)
    .where(eq(payments.encounterId, encounter.id));
  const [financed] = await tx
    .select({ total: sql<number>`coalesce(sum(${promissoryNotes.principalCents}), 0)::bigint` })
    .from(promissoryNotes)
    .where(and(eq(promissoryNotes.encounterId, encounter.id), eq(promissoryNotes.status, 'ACTIVE')));

  const waterfall: WaterfallResult = computeWaterfall({
    charges: lines,
    seniorOrPwd: patient?.discountKind !== 'NONE',
    philhealthHciCents: claim?.hciCents ?? 0,
    philhealthPfCents: claim?.pfCents ?? 0,
    hmoApprovedCents: hmo?.loaStatus === 'APPROVED' ? hmo.approvedCents : 0,
    roomUpgradeExcessCents: encounter.roomUpgradeExcessCents,
    doctorExcessPfCents: encounter.doctorExcessPfCents,
  });
  const paidCents = Number(paid?.total ?? 0);
  const financedCents = Number(financed?.total ?? 0);
  const position = settlementPosition(waterfall.netPatientDueCents, paidCents, financedCents);

  const values = {
    grossHospitalCents: waterfall.grossHospitalCents,
    grossProfessionalFeeCents: waterfall.grossProfessionalFeeCents,
    grossCents: waterfall.grossCents,
    vatExemptionCents: waterfall.vatExemptionCents,
    seniorPwdDiscountCents: waterfall.seniorPwdDiscountCents,
    nonCoveredCents: waterfall.nonCoveredCents,
    philhealthCents: waterfall.philhealthCents,
    hmoCents: waterfall.hmoCents,
    coverageShortfallCents: waterfall.coverageShortfallCents,
    netPatientDueCents: waterfall.netPatientDueCents,
    paidCents,
    financedCents,
    balanceCents: position.balanceCents,
    creditCents: position.creditCents,
    computedAt: now,
  };
  const [row] = await tx
    .insert(ledgers)
    .values({ encounterId: encounter.id, ...values })
    .onConflictDoUpdate({ target: ledgers.encounterId, set: values })
    .returning();
  return row!;
}

export async function readLedger(db: DbOrTx, encounterId: string): Promise<Ledger | null> {
  const [row] = await db.select().from(ledgers).where(eq(ledgers.encounterId, encounterId));
  return row ?? null;
}
