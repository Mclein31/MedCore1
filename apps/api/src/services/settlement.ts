import {
  buildPromissorySchedule,
  formatPeso,
  validateGovernmentId,
  type GovernmentIdType,
  type InstallmentTerm,
} from '@medcore/domain';
import { and, eq } from 'drizzle-orm';
import type { AppContext } from '../context';
import type { DbOrTx } from '../db/client';
import { beds, disputes, encounters, gatePasses, payments, promissoryNotes, receipts } from '../db/schema';
import { sha256Hex } from '../lib/crypto';
import { ApiError, conflict } from '../lib/errors';
import { audit, timeline } from './audit';
import { issuePass } from './gatePass';
import { recalculateLedger, type Encounter, type Ledger } from './ledger';
import { nextDocumentNumber } from './numbers';

const PAYABLE_BILL_STATES = new Set(['FINALIZED', 'SENT', 'PARTIALLY_PAID']);

/** Settlement needs a finalized bill at the PENDING_SETTLEMENT stage of a live stay. */
export function assertSettleable(encounter: Encounter): void {
  if (encounter.voidedAt) throw conflict('STAY_VOIDED', 'This stay was voided.');
  if (encounter.stage !== 'PENDING_SETTLEMENT') {
    throw conflict('STAGE_NOT_READY', 'Settlement opens once discharge clearance reaches "Awaiting settlement".');
  }
  if (!PAYABLE_BILL_STATES.has(encounter.billState)) {
    throw conflict('BILL_NOT_FINAL', 'The bill must be finalized before it can be settled.');
  }
}

/**
 * If the stay is fully settled with no open disputes, close it out atomically:
 * issue the exit pass, mark the stay cleared, and release the bed to housekeeping.
 */
export async function clearIfSettled(c: AppContext, tx: DbOrTx, encounter: Encounter, ledger: Ledger): Promise<boolean> {
  if (encounter.stage !== 'PENDING_SETTLEMENT' || !PAYABLE_BILL_STATES.has(encounter.billState)) return false;
  if (ledger.balanceCents > 0) return false;
  const open = await tx
    .select({ id: disputes.id })
    .from(disputes)
    .where(and(eq(disputes.encounterId, encounter.id), eq(disputes.status, 'OPEN')))
    .limit(1);
  if (open.length) return false;

  const now = c.var.services.now();
  const pass = await issuePass(
    tx,
    c.var.services.config.gatePassSecret,
    {
      facilityId: encounter.facilityId,
      encounterId: encounter.id,
      settledCents: ledger.paidCents,
      financedCents: ledger.financedCents,
    },
    now,
  );
  await tx
    .update(encounters)
    .set({ stage: 'CLEARED', stageEnteredAt: now, clearedAt: now, billState: 'SETTLED', updatedAt: now, version: encounter.version + 1 })
    .where(eq(encounters.id, encounter.id));
  if (encounter.bedId) {
    await tx
      .update(beds)
      .set({ status: 'HOUSEKEEPING', currentEncounterId: null, updatedAt: now })
      .where(and(eq(beds.id, encounter.bedId), eq(beds.currentEncounterId, encounter.id)));
  }
  await timeline(c, tx, encounter.id, 'DISCHARGE', 'Cleared to exit', `Exit pass ${pass.passNumber} issued.`);
  await audit(c, tx, {
    action: 'GATE_PASS_ISSUED',
    resourceType: 'gate_pass',
    resourceId: pass.id,
    facilityId: encounter.facilityId,
    detail: { encounterId: encounter.id, passNumber: pass.passNumber },
  });
  return true;
}

export interface PaymentInput {
  amountCents: number;
  rail: (typeof payments.$inferInsert)['rail'];
  payerName: string;
  cardBrand?: string;
  cardLast4?: string;
  bank?: string;
  externalReference?: string;
  isSimulated: boolean;
  idempotencyKey: string;
  actor: { kind: 'STAFF'; staffId: string } | { kind: 'PATIENT'; accountId: string };
}

/**
 * Record a payment. Idempotent per (actor, key): a retry with the same key and the
 * same body returns the original payment; the same key with a different body is
 * rejected. Must run in a transaction that already holds the encounter lock.
 */
export async function recordPayment(c: AppContext, tx: DbOrTx, encounter: Encounter, input: PaymentInput) {
  const actorKey = input.actor.kind === 'STAFF' ? `staff:${input.actor.staffId}` : `patient:${input.actor.accountId}`;
  const requestHash = await sha256Hex(
    JSON.stringify([
      encounter.id,
      input.amountCents,
      input.rail,
      input.payerName,
      input.cardBrand ?? null,
      input.cardLast4 ?? null,
      input.bank ?? null,
      input.externalReference ?? null,
    ]),
  );
  const [existing] = await tx
    .select()
    .from(payments)
    .where(and(eq(payments.actorKey, actorKey), eq(payments.idempotencyKey, input.idempotencyKey)))
    .limit(1);
  if (existing) {
    if (existing.requestHash !== requestHash) {
      throw conflict('IDEMPOTENCY_CONFLICT', 'This payment reference was already used for a different payment.');
    }
    const [receipt] = await tx.select().from(receipts).where(eq(receipts.paymentId, existing.id));
    return { payment: existing, receipt: receipt!, replayed: true };
  }

  assertSettleable(encounter);
  const before = await recalculateLedger(tx, encounter, c.var.services.now());
  if (before.balanceCents === 0) throw conflict('ALREADY_SETTLED', 'This bill is already settled.');
  if (input.amountCents > before.balanceCents) {
    throw new ApiError(422, 'EXCEEDS_BALANCE', `The amount cannot exceed the balance of ${formatPeso(before.balanceCents)}.`);
  }

  const now = c.var.services.now();
  const [payment] = await tx
    .insert(payments)
    .values({
      facilityId: encounter.facilityId,
      encounterId: encounter.id,
      reference: `PAY-${crypto.randomUUID().replace(/-/g, '').slice(0, 16).toUpperCase()}`,
      amountCents: input.amountCents,
      rail: input.rail,
      payerName: input.payerName,
      cardBrand: input.cardBrand ?? null,
      cardLast4: input.cardLast4 ?? null,
      bank: input.bank ?? null,
      externalReference: input.externalReference ?? null,
      isSimulated: input.isSimulated,
      actorKey,
      idempotencyKey: input.idempotencyKey,
      requestHash,
      recordedByStaffId: input.actor.kind === 'STAFF' ? input.actor.staffId : null,
      paidByAccountId: input.actor.kind === 'PATIENT' ? input.actor.accountId : null,
      createdAt: now,
    })
    .returning();
  const [receipt] = await tx
    .insert(receipts)
    .values({
      facilityId: encounter.facilityId,
      paymentId: payment!.id,
      officialReceiptNumber: await nextDocumentNumber(tx, encounter.facilityId, 'OR', now),
      amountCents: input.amountCents,
      issuedAt: now,
    })
    .returning();

  const ledger = await recalculateLedger(tx, encounter, now);
  if (ledger.balanceCents > 0 && encounter.billState !== 'PARTIALLY_PAID') {
    await tx.update(encounters).set({ billState: 'PARTIALLY_PAID', updatedAt: now }).where(eq(encounters.id, encounter.id));
  }
  await timeline(c, tx, encounter.id, 'PAYMENT', `Payment received: ${formatPeso(input.amountCents)}`, `Official receipt ${receipt!.officialReceiptNumber}.`);
  await audit(c, tx, {
    action: 'PAYMENT_RECORDED',
    resourceType: 'payment',
    resourceId: payment!.id,
    facilityId: encounter.facilityId,
    detail: { encounterId: encounter.id, amountCents: input.amountCents, rail: input.rail, simulated: input.isSimulated },
  });
  await clearIfSettled(c, tx, encounter, ledger);
  return { payment: payment!, receipt: receipt!, replayed: false };
}

export interface NoteInput {
  borrowerName: string;
  relationship: string;
  idType: GovernmentIdType;
  idNumber: string;
  months: InstallmentTerm;
  principalCents: number;
  actor: { kind: 'STAFF'; staffId: string } | { kind: 'PATIENT'; accountId: string };
}

/** Sign an RA 9439 promissory note for (part of) the balance. 0% interest, no fees. */
export async function createPromissoryNote(c: AppContext, tx: DbOrTx, encounter: Encounter, input: NoteInput) {
  assertSettleable(encounter);
  const id = validateGovernmentId(input.idType, input.idNumber);
  if (!id.valid) throw new ApiError(422, 'INVALID_GOVERNMENT_ID', id.error);
  const now = c.var.services.now();
  const before = await recalculateLedger(tx, encounter, now);
  if (before.balanceCents === 0) throw conflict('ALREADY_SETTLED', 'This bill is already settled.');
  if (input.principalCents > before.balanceCents) {
    throw new ApiError(422, 'EXCEEDS_BALANCE', `The note cannot exceed the balance of ${formatPeso(before.balanceCents)}.`);
  }
  const [active] = await tx
    .select({ id: promissoryNotes.id })
    .from(promissoryNotes)
    .where(and(eq(promissoryNotes.encounterId, encounter.id), eq(promissoryNotes.status, 'ACTIVE')));
  if (active) throw conflict('NOTE_EXISTS', 'This stay already has an active promissory note.');

  const schedule = buildPromissorySchedule(input.principalCents, input.months, now);
  const noteId = crypto.randomUUID();
  const noteNumber = await nextDocumentNumber(tx, encounter.facilityId, 'PN', now);
  const terms = {
    noteNumber,
    encounterId: encounter.id,
    borrowerName: input.borrowerName,
    relationship: input.relationship,
    idType: input.idType,
    idLast4: id.last4,
    principalCents: schedule.principalCents,
    interestRateBasisPoints: 0,
    feeCents: 0,
    installments: schedule.installments,
    signedAt: now.toISOString(),
  };
  const [note] = await tx
    .insert(promissoryNotes)
    .values({
      id: noteId,
      facilityId: encounter.facilityId,
      encounterId: encounter.id,
      noteNumber,
      borrowerName: input.borrowerName,
      relationship: input.relationship,
      idType: input.idType,
      idNumberEnc: await c.var.services.cipher.encrypt(id.normalized, `promissory_notes.id_number:${noteId}`),
      idLast4: id.last4,
      principalCents: schedule.principalCents,
      months: input.months,
      schedule: schedule.installments,
      firstDueDate: schedule.installments[0]!.dueDate,
      termsHash: await sha256Hex(JSON.stringify(terms)),
      signedAt: now,
      createdByStaffId: input.actor.kind === 'STAFF' ? input.actor.staffId : null,
      createdByAccountId: input.actor.kind === 'PATIENT' ? input.actor.accountId : null,
      createdAt: now,
    })
    .returning();
  const ledger = await recalculateLedger(tx, encounter, now);
  await timeline(c, tx, encounter.id, 'PAYMENT', `Promissory note signed: ${formatPeso(input.principalCents)}`, `${input.months} monthly installments, 0% interest.`);
  await audit(c, tx, {
    action: 'PROMISSORY_NOTE_SIGNED',
    resourceType: 'promissory_note',
    resourceId: noteId,
    facilityId: encounter.facilityId,
    detail: { encounterId: encounter.id, principalCents: input.principalCents, months: input.months },
  });
  await clearIfSettled(c, tx, encounter, ledger);
  return note!;
}

export async function activePassFor(db: DbOrTx, encounterId: string) {
  const [pass] = await db
    .select()
    .from(gatePasses)
    .where(and(eq(gatePasses.encounterId, encounterId), eq(gatePasses.status, 'ACTIVE')))
    .limit(1);
  return pass ?? null;
}
