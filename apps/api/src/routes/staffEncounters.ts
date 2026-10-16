import {
  AddChargeBody,
  AdjustmentsBody,
  AdmitBody,
  can,
  chargesEditable,
  FileDisputeBody,
  FinalLoaBody,
  formatPeso,
  HmoCoverageBody,
  lineTotal,
  PageQuery,
  PhilhealthCoverageBody,
  PromissoryBody,
  RemoveChargeBody,
  SignPfBody,
  StaffPaymentBody,
  transition,
  VoidEncounterBody,
  type DischargeAction,
} from '@medcore/domain';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import type { AppBindings, AppContext } from '../context';
import type { Tx } from '../db/client';
import {
  beds,
  charges,
  disputes,
  encounters,
  gatePasses,
  hmoCoverages,
  patients,
  payments,
  philhealthClaims,
  promissoryNotes,
  staffUsers,
} from '../db/schema';
import { ApiError, conflict, forbidden, notFound } from '../lib/errors';
import { idempotencyKey, idParam } from '../lib/params';
import { requirePermission } from '../middleware/auth';
import { jsonBody, queryParams } from '../middleware/http';
import { audit, timeline } from '../services/audit';
import { derivePin } from '../services/gatePass';
import { lockEncounter, recalculateLedger, type Encounter } from '../services/ledger';
import { nextDocumentNumber } from '../services/numbers';
import { notifyBillReady } from '../services/notify';
import { activePassFor, clearIfSettled, createPromissoryNote, recordPayment } from '../services/settlement';
import { fileDispute } from '../services/disputes';
import { listEncounters, staffEncounterDetail, staffEncounterScope } from '../services/views';

export const staffEncounterRoutes = new Hono<AppBindings>();

/** Lock a live stay the caller may see. Physicians may only touch their own patients. */
async function lockForStaff(c: AppContext, tx: Tx, id: string): Promise<Encounter> {
  const staff = c.var.staff;
  const encounter = await lockEncounter(tx, id, staff.facilityId);
  const [visible] = await tx
    .select({ id: encounters.id })
    .from(encounters)
    .where(and(eq(encounters.id, id), staffEncounterScope(staff)));
  if (!visible) throw notFound('Stay');
  if (encounter.voidedAt) throw conflict('STAY_VOIDED', 'This stay was voided and can no longer change.');
  return encounter;
}

async function respondWithDetail(c: AppContext, id: string) {
  return c.json(await staffEncounterDetail(c.var.db, c.var.staff, id, c.var.services.now()));
}

async function hasHmo(tx: Tx, encounterId: string): Promise<boolean> {
  const [row] = await tx
    .select({ id: hmoCoverages.id })
    .from(hmoCoverages)
    .where(eq(hmoCoverages.encounterId, encounterId));
  return Boolean(row);
}

/** Apply a named discharge transition, or 409 with the reason. */
async function advance(
  c: AppContext,
  tx: Tx,
  encounter: Encounter,
  action: DischargeAction,
  extra: Partial<typeof encounters.$inferInsert> = {},
) {
  const result = transition(encounter.stage, action, { hasHmo: await hasHmo(tx, encounter.id) });
  if (!result.ok) throw conflict('STAGE_NOT_READY', result.reason);
  const now = c.var.services.now();
  await tx
    .update(encounters)
    .set({ ...extra, stage: result.to, stageEnteredAt: now, updatedAt: now, version: encounter.version + 1 })
    .where(eq(encounters.id, encounter.id));
  await audit(c, tx, {
    action: `DISCHARGE_${action}`,
    resourceType: 'encounter',
    resourceId: encounter.id,
    detail: { from: encounter.stage, to: result.to },
  });
  return result.to;
}

// ---------------------------------------------------------------- read
const ListQuery = PageQuery.extend({
  stage: z
    .enum([
      'ADMITTED',
      'MGH_DECLARED',
      'DOCTOR_PF_PENDING',
      'PHARMACY_RTS_AUDIT',
      'HMO_FINAL_LOA',
      'PENDING_SETTLEMENT',
      'CLEARED',
    ])
    .optional(),
  includeVoided: z.enum(['true', 'false']).optional(),
});

staffEncounterRoutes.get('/', requirePermission('encounter:read'), queryParams(ListQuery), async (c) => {
  const q = c.req.valid('query');
  return c.json(
    await listEncounters(
      c.var.db,
      c.var.staff,
      {
        stage: q.stage,
        q: q.q,
        includeVoided: q.includeVoided === 'true',
        page: q.page,
        pageSize: q.pageSize,
      },
      c.var.services.now(),
    ),
  );
});

staffEncounterRoutes.get('/:id', requirePermission('encounter:read'), async (c) => {
  const id = idParam(c, 'id', 'Stay');
  const detail = await staffEncounterDetail(c.var.db, c.var.staff, id, c.var.services.now());
  // Opening a patient record is itself an auditable event (RA 10173 accountability).
  await audit(c, c.var.db, { action: 'ENCOUNTER_VIEWED', resourceType: 'encounter', resourceId: id });
  return c.json(detail);
});

// ---------------------------------------------------------------- admission and voiding
staffEncounterRoutes.post('/', requirePermission('encounter:admit'), jsonBody(AdmitBody), async (c) => {
  const body = c.req.valid('json');
  const staff = c.var.staff;
  const now = c.var.services.now();
  const id = await c.var.db.transaction(async (tx) => {
    const [patient] = await tx
      .select({ id: patients.id })
      .from(patients)
      .where(and(eq(patients.id, body.patientId), eq(patients.facilityId, staff.facilityId)));
    if (!patient) throw notFound('Patient');
    const [physician] = await tx
      .select({ id: staffUsers.id })
      .from(staffUsers)
      .where(
        and(
          eq(staffUsers.id, body.attendingPhysicianId),
          eq(staffUsers.facilityId, staff.facilityId),
          eq(staffUsers.role, 'ATTENDING_PHYSICIAN'),
          eq(staffUsers.isActive, true),
        ),
      );
    if (!physician) throw new ApiError(422, 'INVALID_PHYSICIAN', 'Choose an active attending physician.');
    const [bed] = await tx
      .select()
      .from(beds)
      .where(and(eq(beds.id, body.bedId), eq(beds.facilityId, staff.facilityId)))
      .for('update');
    if (!bed) throw notFound('Bed');
    if (bed.status !== 'AVAILABLE') throw conflict('BED_UNAVAILABLE', `Bed ${bed.code} is not available.`);
    const [active] = await tx
      .select({ id: encounters.id })
      .from(encounters)
      .where(
        and(
          eq(encounters.patientId, patient.id),
          isNull(encounters.voidedAt),
          sql`${encounters.stage} <> 'CLEARED'`,
        ),
      );
    if (active) throw conflict('ALREADY_ADMITTED', 'This patient already has an open stay.');

    const [encounter] = await tx
      .insert(encounters)
      .values({
        facilityId: staff.facilityId,
        patientId: patient.id,
        encounterNumber: await nextDocumentNumber(tx, staff.facilityId, 'ENC', now),
        bedId: bed.id,
        bedCode: bed.code,
        roomCategory: bed.roomCategory,
        attendingPhysicianId: physician.id,
        primaryDiagnosis: body.primaryDiagnosis,
        icd10Code: body.icd10Code,
        admittedAt: now,
        stageEnteredAt: now,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    await tx
      .update(beds)
      .set({ status: 'OCCUPIED', currentEncounterId: encounter!.id, updatedAt: now })
      .where(eq(beds.id, bed.id));
    await recalculateLedger(tx, encounter!, now);
    await timeline(c, tx, encounter!.id, 'ADMISSION', 'Admitted', `Bed ${bed.code}.`);
    await audit(c, tx, {
      action: 'ENCOUNTER_ADMITTED',
      resourceType: 'encounter',
      resourceId: encounter!.id,
    });
    return encounter!.id;
  });
  c.status(201);
  return respondWithDetail(c, id);
});

/** Voiding replaces deletion. Only possible before any money or legal document exists. */
staffEncounterRoutes.post(
  '/:id/void',
  requirePermission('encounter:void'),
  jsonBody(VoidEncounterBody),
  async (c) => {
    const id = idParam(c, 'id', 'Stay');
    const { reason } = c.req.valid('json');
    const now = c.var.services.now();
    await c.var.db.transaction(async (tx) => {
      const encounter = await lockForStaff(c, tx, id);
      const [payment] = await tx
        .select({ id: payments.id })
        .from(payments)
        .where(eq(payments.encounterId, id))
        .limit(1);
      const [note] = await tx
        .select({ id: promissoryNotes.id })
        .from(promissoryNotes)
        .where(eq(promissoryNotes.encounterId, id))
        .limit(1);
      const [pass] = await tx
        .select({ id: gatePasses.id })
        .from(gatePasses)
        .where(eq(gatePasses.encounterId, id))
        .limit(1);
      if (payment || note || pass) {
        throw conflict(
          'HAS_FINANCIAL_RECORDS',
          'This stay has payments, a promissory note or an exit pass, so it cannot be voided. Use a refund or reversal instead.',
        );
      }
      await tx
        .update(encounters)
        .set({ voidedAt: now, voidedBy: c.var.staff.id, voidReason: reason, updatedAt: now })
        .where(eq(encounters.id, id));
      if (encounter.bedId) {
        await tx
          .update(beds)
          .set({ status: 'HOUSEKEEPING', currentEncounterId: null, updatedAt: now })
          .where(and(eq(beds.id, encounter.bedId), eq(beds.currentEncounterId, id)));
      }
      await audit(c, tx, {
        action: 'ENCOUNTER_VOIDED',
        resourceType: 'encounter',
        resourceId: id,
        detail: {
          reason,
          previous: { stage: encounter.stage, billState: encounter.billState, bedCode: encounter.bedCode },
        },
      });
    });
    return respondWithDetail(c, id);
  },
);

// ---------------------------------------------------------------- charges and coverage
function assertEditable(encounter: Encounter) {
  if (!chargesEditable(encounter.stage) || encounter.billState !== 'DRAFT') {
    throw conflict(
      'BILL_LOCKED',
      'Charges and coverage are locked once the bill is finalized or settlement has started.',
    );
  }
}

staffEncounterRoutes.post(
  '/:id/charges',
  requirePermission('charge:write'),
  jsonBody(AddChargeBody),
  async (c) => {
    const id = idParam(c, 'id', 'Stay');
    const body = c.req.valid('json');
    const now = c.var.services.now();
    await c.var.db.transaction(async (tx) => {
      const encounter = await lockForStaff(c, tx, id);
      assertEditable(encounter);
      const gross = lineTotal(body.quantity, body.unitPriceCents);
      const [charge] = await tx
        .insert(charges)
        .values({
          encounterId: id,
          ...body,
          grossCents: gross,
          explainer: body.explainer ?? null,
          postedBy: c.var.staff.id,
          postedAt: now,
        })
        .returning({ id: charges.id });
      await recalculateLedger(tx, encounter, now);
      await audit(c, tx, {
        action: 'CHARGE_POSTED',
        resourceType: 'charge',
        resourceId: charge!.id,
        detail: { encounterId: id, code: body.code, grossCents: gross, coverage: body.coverage },
      });
    });
    c.status(201);
    return respondWithDetail(c, id);
  },
);

staffEncounterRoutes.post(
  '/:id/charges/:chargeId/remove',
  requirePermission('charge:write'),
  jsonBody(RemoveChargeBody),
  async (c) => {
    const id = idParam(c, 'id', 'Stay');
    const chargeId = idParam(c, 'chargeId', 'Charge');
    const { reason } = c.req.valid('json');
    const now = c.var.services.now();
    await c.var.db.transaction(async (tx) => {
      const encounter = await lockForStaff(c, tx, id);
      assertEditable(encounter);
      const [charge] = await tx
        .select()
        .from(charges)
        .where(and(eq(charges.id, chargeId), eq(charges.encounterId, id)))
        .for('update');
      if (!charge || charge.removedAt) throw notFound('Charge');
      if (charge.isDisputed) throw conflict('CHARGE_DISPUTED', 'Resolve the dispute on this charge first.');
      await tx
        .update(charges)
        .set({ removedAt: now, removedBy: c.var.staff.id, removedReason: reason })
        .where(eq(charges.id, chargeId));
      await recalculateLedger(tx, encounter, now);
      await audit(c, tx, {
        action: 'CHARGE_REMOVED',
        resourceType: 'charge',
        resourceId: chargeId,
        detail: { encounterId: id, reason, grossCents: charge.grossCents },
      });
    });
    return respondWithDetail(c, id);
  },
);

staffEncounterRoutes.put(
  '/:id/philhealth',
  requirePermission('coverage:philhealth'),
  jsonBody(PhilhealthCoverageBody),
  async (c) => {
    const id = idParam(c, 'id', 'Stay');
    const body = c.req.valid('json');
    const now = c.var.services.now();
    await c.var.db.transaction(async (tx) => {
      const encounter = await lockForStaff(c, tx, id);
      assertEditable(encounter);
      const [existing] = await tx.select().from(philhealthClaims).where(eq(philhealthClaims.encounterId, id));
      if (existing) {
        await tx
          .update(philhealthClaims)
          .set({ ...body, updatedAt: now })
          .where(eq(philhealthClaims.id, existing.id));
      } else {
        await tx.insert(philhealthClaims).values({
          facilityId: encounter.facilityId,
          encounterId: id,
          claimNumber: await nextDocumentNumber(tx, encounter.facilityId, 'CLM', now),
          ...body,
          createdAt: now,
          updatedAt: now,
        });
      }
      await recalculateLedger(tx, encounter, now);
      await audit(c, tx, {
        action: 'PHILHEALTH_COVERAGE_SET',
        resourceType: 'encounter',
        resourceId: id,
        detail: { ...body },
      });
    });
    return respondWithDetail(c, id);
  },
);

staffEncounterRoutes.put(
  '/:id/hmo',
  requirePermission('coverage:hmo'),
  jsonBody(HmoCoverageBody),
  async (c) => {
    const id = idParam(c, 'id', 'Stay');
    const body = c.req.valid('json');
    const now = c.var.services.now();
    await c.var.db.transaction(async (tx) => {
      const encounter = await lockForStaff(c, tx, id);
      assertEditable(encounter);
      const [existing] = await tx.select().from(hmoCoverages).where(eq(hmoCoverages.encounterId, id));
      if (existing?.loaStatus === 'APPROVED' && body.mblCents < existing.approvedCents) {
        throw new ApiError(
          422,
          'MBL_BELOW_APPROVAL',
          'The benefit limit cannot be lower than the approved amount.',
        );
      }
      if (existing)
        await tx
          .update(hmoCoverages)
          .set({ ...body, updatedAt: now })
          .where(eq(hmoCoverages.id, existing.id));
      else await tx.insert(hmoCoverages).values({ encounterId: id, ...body, createdAt: now, updatedAt: now });
      await recalculateLedger(tx, encounter, now);
      await audit(c, tx, {
        action: 'HMO_COVERAGE_SET',
        resourceType: 'encounter',
        resourceId: id,
        detail: { providerName: body.providerName, mblCents: body.mblCents },
      });
    });
    return respondWithDetail(c, id);
  },
);

staffEncounterRoutes.put(
  '/:id/adjustments',
  requirePermission('charge:write'),
  jsonBody(AdjustmentsBody),
  async (c) => {
    const id = idParam(c, 'id', 'Stay');
    const body = c.req.valid('json');
    const now = c.var.services.now();
    await c.var.db.transaction(async (tx) => {
      const encounter = await lockForStaff(c, tx, id);
      assertEditable(encounter);
      const excess =
        encounter.agreedPfCents !== null && body.pfCeilingCents !== null
          ? Math.max(0, encounter.agreedPfCents - body.pfCeilingCents)
          : 0;
      const updated = { ...encounter, ...body, doctorExcessPfCents: excess };
      await tx
        .update(encounters)
        .set({
          roomUpgradeExcessCents: body.roomUpgradeExcessCents,
          pfCeilingCents: body.pfCeilingCents,
          doctorExcessPfCents: excess,
          updatedAt: now,
        })
        .where(eq(encounters.id, id));
      await recalculateLedger(tx, updated, now);
      await audit(c, tx, {
        action: 'BILL_ADJUSTMENTS_SET',
        resourceType: 'encounter',
        resourceId: id,
        detail: { ...body, doctorExcessPfCents: excess },
      });
    });
    return respondWithDetail(c, id);
  },
);

// ---------------------------------------------------------------- discharge clearance
staffEncounterRoutes.post(
  '/:id/discharge/declare-mgh',
  requirePermission('discharge:declare-mgh'),
  async (c) => {
    const id = idParam(c, 'id', 'Stay');
    const now = c.var.services.now();
    await c.var.db.transaction(async (tx) => {
      const encounter = await lockForStaff(c, tx, id);
      await advance(c, tx, encounter, 'DECLARE_MGH', { mghOrderedAt: now });
      await timeline(c, tx, id, 'DISCHARGE', 'May go home order', 'Discharge clearance clock started.');
    });
    return respondWithDetail(c, id);
  },
);

staffEncounterRoutes.post('/:id/discharge/start', requirePermission('discharge:start'), async (c) => {
  const id = idParam(c, 'id', 'Stay');
  await c.var.db.transaction(async (tx) => {
    const encounter = await lockForStaff(c, tx, id);
    await advance(c, tx, encounter, 'START_CLEARANCE');
    await timeline(
      c,
      tx,
      id,
      'DISCHARGE',
      'Clearance started',
      'Waiting for the attending physician to confirm the professional fee.',
    );
  });
  return respondWithDetail(c, id);
});

staffEncounterRoutes.post(
  '/:id/discharge/sign-pf',
  requirePermission('discharge:sign-pf'),
  jsonBody(SignPfBody),
  async (c) => {
    const id = idParam(c, 'id', 'Stay');
    const { agreedPfCents, onBehalfReason } = c.req.valid('json');
    const staff = c.var.staff;
    const now = c.var.services.now();
    await c.var.db.transaction(async (tx) => {
      const encounter = await lockForStaff(c, tx, id);
      const isAttending = encounter.attendingPhysicianId === staff.id;
      if (!isAttending) {
        if (!can(staff.role, 'discharge:sign-pf-on-behalf'))
          throw forbidden('Only the attending physician can sign this professional fee.');
        if (!onBehalfReason)
          throw new ApiError(422, 'REASON_REQUIRED', 'Give a reason for signing on the physician’s behalf.');
      }
      const pfLines = await tx
        .select()
        .from(charges)
        .where(
          and(
            eq(charges.encounterId, id),
            eq(charges.category, 'PROFESSIONAL_FEE'),
            isNull(charges.removedAt),
          ),
        )
        .for('update');
      if (pfLines.some((line) => line.isDisputed))
        throw conflict('PF_DISPUTED', 'Resolve the dispute on the professional fee first.');
      if (pfLines.length > 1)
        throw conflict('MULTIPLE_PF_LINES', 'Remove duplicate professional fee lines before signing.');

      const excess =
        encounter.pfCeilingCents === null ? 0 : Math.max(0, agreedPfCents - encounter.pfCeilingCents);
      if (pfLines[0]) {
        await tx
          .update(charges)
          .set({ quantity: 1, unitPriceCents: agreedPfCents, grossCents: agreedPfCents })
          .where(eq(charges.id, pfLines[0].id));
      } else {
        await tx.insert(charges).values({
          encounterId: id,
          code: 'PF-ATTENDING',
          description: 'Attending physician professional fee',
          category: 'PROFESSIONAL_FEE',
          quantity: 1,
          unitPriceCents: agreedPfCents,
          grossCents: agreedPfCents,
          coverage: 'COVERED',
          explainer: 'The fee your doctor charged for managing your care, as confirmed by the doctor.',
          postedBy: staff.id,
          postedAt: now,
        });
      }
      const extra = { agreedPfCents, doctorExcessPfCents: excess, pfSignedAt: now, pfSignedBy: staff.id };
      await advance(c, tx, encounter, 'SIGN_PROFESSIONAL_FEE', extra);
      await recalculateLedger(tx, { ...encounter, ...extra }, now);
      await timeline(
        c,
        tx,
        id,
        'DISCHARGE',
        `Professional fee confirmed: ${formatPeso(agreedPfCents)}`,
        isAttending ? undefined : 'Signed on the physician’s behalf.',
      );
      if (!isAttending) {
        await audit(c, tx, {
          action: 'PF_SIGNED_ON_BEHALF',
          resourceType: 'encounter',
          resourceId: id,
          detail: { reason: onBehalfReason, agreedPfCents },
        });
      }
    });
    return respondWithDetail(c, id);
  },
);

staffEncounterRoutes.post(
  '/:id/discharge/clear-pharmacy',
  requirePermission('discharge:clear-pharmacy'),
  async (c) => {
    const id = idParam(c, 'id', 'Stay');
    const now = c.var.services.now();
    await c.var.db.transaction(async (tx) => {
      const encounter = await lockForStaff(c, tx, id);
      const to = await advance(c, tx, encounter, 'CLEAR_PHARMACY', { pharmacyClearedAt: now });
      await timeline(
        c,
        tx,
        id,
        'DISCHARGE',
        'Pharmacy return-to-stock cleared',
        to === 'HMO_FINAL_LOA' ? 'Waiting for the HMO final approval.' : undefined,
      );
    });
    return respondWithDetail(c, id);
  },
);

staffEncounterRoutes.post(
  '/:id/discharge/final-loa',
  requirePermission('discharge:final-loa'),
  jsonBody(FinalLoaBody),
  async (c) => {
    const id = idParam(c, 'id', 'Stay');
    const { approvedCents, approvalCode } = c.req.valid('json');
    const now = c.var.services.now();
    await c.var.db.transaction(async (tx) => {
      const encounter = await lockForStaff(c, tx, id);
      const [hmo] = await tx
        .select()
        .from(hmoCoverages)
        .where(eq(hmoCoverages.encounterId, id))
        .for('update');
      if (!hmo) throw conflict('NO_HMO', 'No HMO is on file for this stay.');
      if (approvedCents > hmo.mblCents) {
        throw new ApiError(
          422,
          'EXCEEDS_MBL',
          `The approval cannot exceed the benefit limit of ${formatPeso(hmo.mblCents)}.`,
        );
      }
      await tx
        .update(hmoCoverages)
        .set({
          loaStatus: approvedCents > 0 ? 'APPROVED' : 'REJECTED',
          approvedCents,
          approvalCode,
          decidedAt: now,
          decidedBy: c.var.staff.id,
          updatedAt: now,
        })
        .where(eq(hmoCoverages.id, hmo.id));
      await advance(c, tx, encounter, 'RECORD_FINAL_LOA');
      await recalculateLedger(tx, encounter, now);
      await timeline(
        c,
        tx,
        id,
        'PAYER',
        `HMO final approval: ${formatPeso(approvedCents)}`,
        `${hmo.providerName}, code ${approvalCode}.`,
      );
    });
    return respondWithDetail(c, id);
  },
);

// ---------------------------------------------------------------- bill
staffEncounterRoutes.post('/:id/bill/finalize', requirePermission('bill:finalize'), async (c) => {
  const id = idParam(c, 'id', 'Stay');
  const now = c.var.services.now();
  await c.var.db.transaction(async (tx) => {
    const encounter = await lockForStaff(c, tx, id);
    if (encounter.stage !== 'PENDING_SETTLEMENT')
      throw conflict('STAGE_NOT_READY', 'Finish discharge clearance before finalizing the bill.');
    if (encounter.billState !== 'DRAFT')
      throw conflict('ALREADY_FINALIZED', 'This bill is already finalized.');
    const [open] = await tx
      .select({ id: disputes.id })
      .from(disputes)
      .where(and(eq(disputes.encounterId, id), eq(disputes.status, 'OPEN')))
      .limit(1);
    if (open) throw conflict('OPEN_DISPUTES', 'Resolve open disputes before finalizing the bill.');
    const billNumber = await nextDocumentNumber(tx, encounter.facilityId, 'SOA', now);
    const finalized = { ...encounter, billState: 'FINALIZED' as const, billNumber };
    await tx
      .update(encounters)
      .set({
        billState: 'FINALIZED',
        billNumber,
        billFinalizedAt: now,
        updatedAt: now,
        version: encounter.version + 1,
      })
      .where(eq(encounters.id, id));
    const ledger = await recalculateLedger(tx, finalized, now);
    await timeline(
      c,
      tx,
      id,
      'BILLING',
      `Bill finalized: ${billNumber}`,
      `Amount due ${formatPeso(ledger.netPatientDueCents)}.`,
    );
    await audit(c, tx, {
      action: 'BILL_FINALIZED',
      resourceType: 'encounter',
      resourceId: id,
      detail: { billNumber, netPatientDueCents: ledger.netPatientDueCents },
    });
    // A fully covered stay clears immediately.
    await clearIfSettled(c, tx, finalized, ledger);
  });
  return respondWithDetail(c, id);
});

staffEncounterRoutes.post('/:id/bill/send', requirePermission('bill:send'), async (c) => {
  const id = idParam(c, 'id', 'Stay');
  const now = c.var.services.now();
  const email = await c.var.db.transaction(async (tx) => {
    const encounter = await lockForStaff(c, tx, id);
    if (encounter.billState === 'DRAFT')
      throw conflict('BILL_NOT_FINAL', 'Finalize the bill before sending it.');
    const [patient] = await tx
      .select({ email: patients.email })
      .from(patients)
      .where(eq(patients.id, encounter.patientId));
    if (!patient?.email)
      throw conflict('NO_EMAIL', 'Add the patient’s email address at the billing desk first.');
    await tx
      .update(encounters)
      .set({
        billSentAt: now,
        ...(encounter.billState === 'FINALIZED' ? { billState: 'SENT' as const } : {}),
        updatedAt: now,
      })
      .where(eq(encounters.id, id));
    await timeline(
      c,
      tx,
      id,
      'BILLING',
      'Bill sent to patient',
      'The patient was emailed that the statement is ready in the portal.',
    );
    await audit(c, tx, { action: 'BILL_SENT', resourceType: 'encounter', resourceId: id });
    return patient.email;
  });
  notifyBillReady(c, email);
  return respondWithDetail(c, id);
});

// ---------------------------------------------------------------- settlement
staffEncounterRoutes.post(
  '/:id/payments',
  requirePermission('payment:record'),
  jsonBody(StaffPaymentBody),
  async (c) => {
    const id = idParam(c, 'id', 'Stay');
    const body = c.req.valid('json');
    const key = idempotencyKey(c);
    const result = await c.var.db.transaction(async (tx) => {
      const encounter = await lockForStaff(c, tx, id);
      return recordPayment(c, tx, encounter, {
        ...body,
        isSimulated: false,
        idempotencyKey: key,
        actor: { kind: 'STAFF', staffId: c.var.staff.id },
      });
    });
    const detail = await staffEncounterDetail(c.var.db, c.var.staff, id, c.var.services.now());
    return c.json(
      { payment: result.payment, receipt: result.receipt, replayed: result.replayed, detail },
      result.replayed ? 200 : 201,
    );
  },
);

staffEncounterRoutes.post(
  '/:id/promissory-notes',
  requirePermission('promissory:create'),
  jsonBody(PromissoryBody),
  async (c) => {
    const id = idParam(c, 'id', 'Stay');
    const body = c.req.valid('json');
    await c.var.db.transaction(async (tx) => {
      const encounter = await lockForStaff(c, tx, id);
      await createPromissoryNote(c, tx, encounter, {
        ...body,
        actor: { kind: 'STAFF', staffId: c.var.staff.id },
      });
    });
    c.status(201);
    return respondWithDetail(c, id);
  },
);

/** The desk prints the pass (with PIN) for patients who do not use the portal. Audited. */
staffEncounterRoutes.get('/:id/gate-pass', requirePermission('gatepass:read'), async (c) => {
  const id = idParam(c, 'id', 'Stay');
  await staffEncounterDetail(c.var.db, c.var.staff, id, c.var.services.now()); // scope check
  const pass = await activePassFor(c.var.db, id);
  if (!pass) throw notFound('Active exit pass');
  await audit(c, c.var.db, {
    action: 'GATE_PASS_PIN_VIEWED',
    resourceType: 'gate_pass',
    resourceId: pass.id,
  });
  return c.json({
    passNumber: pass.passNumber,
    pin: await derivePin(c.var.services.config.gatePassSecret, pass.id),
    issuedAt: pass.issuedAt,
    expiresAt: pass.expiresAt,
  });
});

// ---------------------------------------------------------------- disputes
staffEncounterRoutes.post(
  '/:id/disputes',
  requirePermission('dispute:file'),
  jsonBody(FileDisputeBody),
  async (c) => {
    const id = idParam(c, 'id', 'Stay');
    const body = c.req.valid('json');
    await c.var.db.transaction(async (tx) => {
      const encounter = await lockForStaff(c, tx, id);
      await fileDispute(c, tx, encounter, { ...body, filer: { kind: 'STAFF', staffId: c.var.staff.id } });
    });
    c.status(201);
    return respondWithDetail(c, id);
  },
);
