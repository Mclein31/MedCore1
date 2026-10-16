import { canWaive, formatPeso, type StaffRole } from '@medcore/domain';
import { and, eq } from 'drizzle-orm';
import type { AppContext } from '../context';
import type { DbOrTx } from '../db/client';
import { charges, disputes, encounters } from '../db/schema';
import { ApiError, conflict, forbidden, notFound } from '../lib/errors';
import { audit, timeline } from './audit';
import { lockEncounter, recalculateLedger, type Encounter } from './ledger';
import { clearIfSettled } from './settlement';

export interface DisputeInput {
  chargeId: string;
  category: string;
  reason: string;
  filer: { kind: 'STAFF'; staffId: string } | { kind: 'PATIENT'; accountId: string };
}

/** File a dispute on one charge. The encounter lock must already be held. */
export async function fileDispute(c: AppContext, tx: DbOrTx, encounter: Encounter, input: DisputeInput) {
  if (encounter.voidedAt) throw conflict('STAY_VOIDED', 'This stay was voided.');
  if (encounter.stage === 'CLEARED') throw conflict('STAY_CLEARED', 'This stay is already settled and cleared. Contact the billing desk.');
  const [charge] = await tx
    .select()
    .from(charges)
    .where(and(eq(charges.id, input.chargeId), eq(charges.encounterId, encounter.id)))
    .for('update');
  if (!charge || charge.removedAt) throw notFound('Charge');
  if (charge.coverage === 'WAIVED') throw conflict('ALREADY_WAIVED', 'This charge was already removed from the bill.');
  if (charge.isDisputed) throw conflict('ALREADY_DISPUTED', 'This charge is already being reviewed.');

  const now = c.var.services.now();
  const [dispute] = await tx
    .insert(disputes)
    .values({
      facilityId: encounter.facilityId,
      encounterId: encounter.id,
      chargeId: charge.id,
      contestedCents: charge.grossCents,
      category: input.category,
      reason: input.reason,
      filedByStaffId: input.filer.kind === 'STAFF' ? input.filer.staffId : null,
      filedByAccountId: input.filer.kind === 'PATIENT' ? input.filer.accountId : null,
      createdAt: now,
    })
    .returning();
  await tx.update(charges).set({ isDisputed: true }).where(eq(charges.id, charge.id));
  await timeline(c, tx, encounter.id, 'DISPUTE', `Charge questioned: ${charge.description}`, `${formatPeso(charge.grossCents)} is under review.`);
  await audit(c, tx, {
    action: 'DISPUTE_FILED',
    resourceType: 'dispute',
    resourceId: dispute!.id,
    facilityId: encounter.facilityId,
    detail: { encounterId: encounter.id, chargeId: charge.id, contestedCents: charge.grossCents },
  });
  return dispute!;
}

/**
 * Resolve a dispute. WAIVE removes the charge from the bill (with separation of
 * duties and a value limit); UPHOLD keeps it. Either way the bill is recomputed.
 */
export async function resolveDispute(c: AppContext, tx: DbOrTx, disputeId: string, decision: 'WAIVE' | 'UPHOLD', note: string) {
  const staff = c.var.staff;
  const [candidate] = await tx
    .select({ encounterId: disputes.encounterId })
    .from(disputes)
    .where(and(eq(disputes.id, disputeId), eq(disputes.facilityId, staff.facilityId)));
  if (!candidate) throw notFound('Dispute');
  // Respect the global lock order: encounter first, then the dispute and its charge.
  const encounter = await lockEncounter(tx, candidate.encounterId, staff.facilityId);
  const [dispute] = await tx.select().from(disputes).where(eq(disputes.id, disputeId)).for('update');
  if (!dispute) throw notFound('Dispute');
  if (dispute.status !== 'OPEN') throw conflict('ALREADY_RESOLVED', 'This dispute was already resolved.');

  if (decision === 'WAIVE') {
    const decisionCheck = canWaive({ id: staff.id, role: staff.role as StaffRole }, dispute);
    if (!decisionCheck.allowed) throw forbidden(decisionCheck.reason);
  } else if (dispute.filedByStaffId === staff.id) {
    throw forbidden('A dispute must be resolved by someone other than the person who filed it.');
  }

  const now = c.var.services.now();
  const [charge] = await tx.select().from(charges).where(eq(charges.id, dispute.chargeId)).for('update');
  if (!charge) throw new ApiError(500, 'INTEGRITY', 'Disputed charge is missing.');
  await tx
    .update(charges)
    .set({ isDisputed: false, ...(decision === 'WAIVE' ? { coverage: 'WAIVED' as const } : {}) })
    .where(eq(charges.id, charge.id));
  await tx
    .update(disputes)
    .set({ status: decision === 'WAIVE' ? 'WAIVED' : 'UPHELD', resolvedBy: staff.id, resolutionNote: note, resolvedAt: now })
    .where(eq(disputes.id, dispute.id));
  // Removing a fee also removes any patient-only excess that sat on top of it.
  let current = encounter;
  if (decision === 'WAIVE' && (charge.category === 'PROFESSIONAL_FEE' || charge.category === 'ROOM_AND_BOARD')) {
    const remaining = await tx
      .select({ grossCents: charges.grossCents })
      .from(charges)
      .where(and(eq(charges.encounterId, encounter.id), eq(charges.category, charge.category), eq(charges.coverage, 'COVERED')));
    const left = remaining.reduce((sum, line) => sum + line.grossCents, 0);
    const patch =
      charge.category === 'PROFESSIONAL_FEE'
        ? { doctorExcessPfCents: Math.min(encounter.doctorExcessPfCents, left) }
        : { roomUpgradeExcessCents: Math.min(encounter.roomUpgradeExcessCents, left) };
    await tx.update(encounters).set({ ...patch, updatedAt: now }).where(eq(encounters.id, encounter.id));
    current = { ...encounter, ...patch };
  }
  const ledger = await recalculateLedger(tx, current, now);
  await timeline(
    c,
    tx,
    encounter.id,
    'DISPUTE',
    decision === 'WAIVE' ? `Charge removed: ${charge.description}` : `Charge confirmed: ${charge.description}`,
    note,
  );
  await audit(c, tx, {
    action: decision === 'WAIVE' ? 'DISPUTE_WAIVED' : 'DISPUTE_UPHELD',
    resourceType: 'dispute',
    resourceId: dispute.id,
    detail: { encounterId: encounter.id, contestedCents: dispute.contestedCents, note },
  });
  // Resolving the last dispute may complete a settlement that was waiting on it.
  await clearIfSettled(c, tx, current, ledger);
  return { encounterId: encounter.id, creditCents: ledger.creditCents };
}
