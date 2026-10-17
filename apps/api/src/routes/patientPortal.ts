import { FileDisputeBody, PatientPaymentBody, PromissoryBody } from '@medcore/domain';
import { and, asc, desc, eq, isNull, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import type { AppBindings, AppContext } from '../context';
import type { DbOrTx, Tx } from '../db/client';
import {
  charges,
  disputes,
  encounters,
  facilities,
  hmoCoverages,
  ledgers,
  patientAccountLinks,
  patients,
  payments,
  philhealthClaims,
  promissoryNotes,
  receipts,
  timelineEvents,
} from '../db/schema';
import { ApiError, notFound } from '../lib/errors';
import { idempotencyKey, idParam } from '../lib/params';
import { patientAuth } from '../middleware/auth';
import { jsonBody } from '../middleware/http';
import { fileDispute } from '../services/disputes';
import { derivePin } from '../services/gatePass';
import { lockEncounter } from '../services/ledger';
import { enforce, LIMITS } from '../services/rateLimit';
import { activePassFor, createPromissoryNote, recordPayment } from '../services/settlement';

/**
 * What a signed-in patient may see: only stays of patients linked to their
 * account, only once the bill has been finalized, and only patient-safe fields
 * (no internal notes, staff identities, diagnosis codes or full identifiers).
 */
export const patientPortalRoutes = new Hono<AppBindings>();
patientPortalRoutes.use('*', patientAuth);

const VISIBLE_BILL_STATES = ['FINALIZED', 'SENT', 'PARTIALLY_PAID', 'SETTLED'] as const;

function linkedCondition(accountId: string) {
  return sql`exists (select 1 from ${patientAccountLinks}
    where ${patientAccountLinks.patientId} = ${encounters.patientId}
      and ${patientAccountLinks.accountId} = ${accountId}
      and ${patientAccountLinks.revokedAt} is null)`;
}

async function assertLinked(db: DbOrTx, c: AppContext, encounterId: string) {
  const [row] = await db
    .select({ id: encounters.id, billState: encounters.billState })
    .from(encounters)
    .where(
      and(
        eq(encounters.id, encounterId),
        eq(encounters.facilityId, c.var.patient.facilityId),
        isNull(encounters.voidedAt),
        linkedCondition(c.var.patient.accountId),
      ),
    );
  // Not linked and does not exist look the same.
  if (!row) throw notFound('Stay');
  return row;
}

async function lockLinked(c: AppContext, tx: Tx, encounterId: string) {
  await assertLinked(tx, c, encounterId);
  return lockEncounter(tx, encounterId, c.var.patient.facilityId);
}

patientPortalRoutes.get('/stays', async (c) => {
  const rows = await c.var.db
    .select({
      id: encounters.id,
      encounterNumber: encounters.encounterNumber,
      patientName: patients.fullName,
      admittedAt: encounters.admittedAt,
      stage: encounters.stage,
      billState: encounters.billState,
      clearedAt: encounters.clearedAt,
      balanceCents: ledgers.balanceCents,
      netPatientDueCents: ledgers.netPatientDueCents,
    })
    .from(encounters)
    .innerJoin(patients, eq(patients.id, encounters.patientId))
    .leftJoin(ledgers, eq(ledgers.encounterId, encounters.id))
    .where(
      and(
        eq(encounters.facilityId, c.var.patient.facilityId),
        isNull(encounters.voidedAt),
        linkedCondition(c.var.patient.accountId),
      ),
    )
    .orderBy(desc(encounters.admittedAt));
  return c.json({
    items: rows.map((r) => {
      const visible = (VISIBLE_BILL_STATES as readonly string[]).includes(r.billState);
      return {
        ...r,
        billReady: visible,
        balanceCents: visible ? r.balanceCents : null,
        netPatientDueCents: visible ? r.netPatientDueCents : null,
      };
    }),
  });
});

patientPortalRoutes.get('/stays/:id', async (c) => {
  const id = idParam(c, 'id', 'Stay');
  const db = c.var.db;
  const stay = await assertLinked(db, c, id);
  const [row] = await db
    .select({
      encounter: encounters,
      patientName: patients.fullName,
      discountKind: patients.discountKind,
      facilityName: facilities.name,
    })
    .from(encounters)
    .innerJoin(patients, eq(patients.id, encounters.patientId))
    .innerJoin(facilities, eq(facilities.id, encounters.facilityId))
    .where(eq(encounters.id, id));
  const e = row!.encounter;
  const billReady = (VISIBLE_BILL_STATES as readonly string[]).includes(stay.billState);
  const summary = {
    id: e.id,
    encounterNumber: e.encounterNumber,
    patientName: row!.patientName,
    facilityName: row!.facilityName,
    admittedAt: e.admittedAt,
    bedCode: e.bedCode,
    roomCategory: e.roomCategory,
    stage: e.stage,
    billState: e.billState,
    billNumber: billReady ? e.billNumber : null,
    clearedAt: e.clearedAt,
    discountKind: row!.discountKind,
    billReady,
  };
  if (!billReady) return c.json({ stay: summary });

  const [ledger] = await db.select().from(ledgers).where(eq(ledgers.encounterId, id));
  const [claim] = await db
    .select({
      id: philhealthClaims.id,
      claimNumber: philhealthClaims.claimNumber,
      caseRateCode: philhealthClaims.caseRateCode,
      hciCents: philhealthClaims.hciCents,
      pfCents: philhealthClaims.pfCents,
      status: philhealthClaims.status,
      transmittedAt: philhealthClaims.transmittedAt,
    })
    .from(philhealthClaims)
    .where(eq(philhealthClaims.encounterId, id));
  const [hmo] = await db
    .select({
      providerName: hmoCoverages.providerName,
      memberNumberLast4: hmoCoverages.memberNumberLast4,
      mblCents: hmoCoverages.mblCents,
      approvedCents: hmoCoverages.approvedCents,
      loaStatus: hmoCoverages.loaStatus,
      approvalCode: hmoCoverages.approvalCode,
    })
    .from(hmoCoverages)
    .where(eq(hmoCoverages.encounterId, id));
  const lineItems = await db
    .select({
      id: charges.id,
      description: charges.description,
      category: charges.category,
      quantity: charges.quantity,
      unitPriceCents: charges.unitPriceCents,
      grossCents: charges.grossCents,
      coverage: charges.coverage,
      explainer: charges.explainer,
      isDisputed: charges.isDisputed,
    })
    .from(charges)
    .where(and(eq(charges.encounterId, id), isNull(charges.removedAt)))
    .orderBy(asc(charges.category), asc(charges.postedAt));
  const paid = await db
    .select({
      reference: payments.reference,
      amountCents: payments.amountCents,
      rail: payments.rail,
      createdAt: payments.createdAt,
      officialReceiptNumber: receipts.officialReceiptNumber,
    })
    .from(payments)
    .innerJoin(receipts, eq(receipts.paymentId, payments.id))
    .where(eq(payments.encounterId, id))
    .orderBy(asc(payments.createdAt));
  const notes = await db
    .select({
      noteNumber: promissoryNotes.noteNumber,
      principalCents: promissoryNotes.principalCents,
      months: promissoryNotes.months,
      schedule: promissoryNotes.schedule,
      status: promissoryNotes.status,
      signedAt: promissoryNotes.signedAt,
    })
    .from(promissoryNotes)
    .where(eq(promissoryNotes.encounterId, id));
  const myDisputes = await db
    .select({
      id: disputes.id,
      chargeId: disputes.chargeId,
      contestedCents: disputes.contestedCents,
      reason: disputes.reason,
      status: disputes.status,
      resolutionNote: disputes.resolutionNote,
      createdAt: disputes.createdAt,
      resolvedAt: disputes.resolvedAt,
    })
    .from(disputes)
    .where(eq(disputes.encounterId, id))
    .orderBy(desc(disputes.createdAt));
  const events = await db
    .select({
      kind: timelineEvents.kind,
      title: timelineEvents.title,
      detail: timelineEvents.detail,
      createdAt: timelineEvents.createdAt,
    })
    .from(timelineEvents)
    .where(eq(timelineEvents.encounterId, id))
    .orderBy(desc(timelineEvents.createdAt))
    .limit(50);
  const pass = await activePassFor(db, id);
  const { config } = c.var.services;

  return c.json({
    stay: summary,
    ledger: ledger
      ? {
          grossCents: ledger.grossCents,
          vatExemptionCents: ledger.vatExemptionCents,
          seniorPwdDiscountCents: ledger.seniorPwdDiscountCents,
          philhealthCents: ledger.philhealthCents,
          hmoCents: ledger.hmoCents,
          netPatientDueCents: ledger.netPatientDueCents,
          paidCents: ledger.paidCents,
          financedCents: ledger.financedCents,
          balanceCents: ledger.balanceCents,
          creditCents: ledger.creditCents,
        }
      : null,
    philhealth: claim ?? null,
    hmo: hmo ?? null,
    charges: lineItems,
    payments: paid,
    promissoryNotes: notes,
    disputes: myDisputes,
    timeline: events,
    gatePass: pass
      ? {
          passNumber: pass.passNumber,
          pin: await derivePin(config.gatePassSecret, pass.id),
          expiresAt: pass.expiresAt,
        }
      : null,
    options: {
      onlinePayments: config.patientOnlinePayments === 'simulated',
      onlinePromissory: config.patientOnlinePromissory,
    },
  });
});

patientPortalRoutes.post('/stays/:id/payments', jsonBody(PatientPaymentBody), async (c) => {
  const id = idParam(c, 'id', 'Stay');
  const body = c.req.valid('json');
  const key = idempotencyKey(c);
  // No live payment gateway exists. Online payment is a simulation that must be switched on deliberately.
  if (c.var.services.config.patientOnlinePayments !== 'simulated') {
    throw new ApiError(
      403,
      'ONLINE_PAYMENTS_DISABLED',
      'Online payment is not available yet. Please pay at the cashier.',
    );
  }
  await enforce(c, [[LIMITS.patientPayment, c.var.patient.accountId]]);
  const result = await c.var.db.transaction(async (tx) => {
    const encounter = await lockLinked(c, tx, id);
    return recordPayment(c, tx, encounter, {
      amountCents: body.amountCents,
      rail: body.rail,
      payerName: body.payerName,
      cardBrand: body.cardBrand,
      cardLast4: body.cardLast4,
      bank: body.bank,
      isSimulated: true,
      idempotencyKey: key,
      actor: { kind: 'PATIENT', accountId: c.var.patient.accountId },
    });
  });
  return c.json(
    {
      reference: result.payment.reference,
      amountCents: result.payment.amountCents,
      officialReceiptNumber: result.receipt.officialReceiptNumber,
      replayed: result.replayed,
    },
    result.replayed ? 200 : 201,
  );
});

patientPortalRoutes.post('/stays/:id/promissory-notes', jsonBody(PromissoryBody), async (c) => {
  const id = idParam(c, 'id', 'Stay');
  const body = c.req.valid('json');
  if (!c.var.services.config.patientOnlinePromissory) {
    throw new ApiError(
      403,
      'ONLINE_NOTES_DISABLED',
      'Payment plans are arranged at the billing desk for now.',
    );
  }
  const note = await c.var.db.transaction(async (tx) => {
    const encounter = await lockLinked(c, tx, id);
    return createPromissoryNote(c, tx, encounter, {
      ...body,
      actor: { kind: 'PATIENT', accountId: c.var.patient.accountId },
    });
  });
  return c.json({ noteNumber: note.noteNumber, schedule: note.schedule }, 201);
});

patientPortalRoutes.post('/stays/:id/disputes', jsonBody(FileDisputeBody), async (c) => {
  const id = idParam(c, 'id', 'Stay');
  const body = c.req.valid('json');
  const dispute = await c.var.db.transaction(async (tx) => {
    const encounter = await lockLinked(c, tx, id);
    if (encounter.billState === 'DRAFT') throw notFound('Stay');
    return fileDispute(c, tx, encounter, {
      ...body,
      filer: { kind: 'PATIENT', accountId: c.var.patient.accountId },
    });
  });
  return c.json({ id: dispute.id, status: dispute.status }, 201);
});
