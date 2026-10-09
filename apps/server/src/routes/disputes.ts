import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { eq, and } from 'drizzle-orm';
import { db } from '../db';
import {
  billingDisputes,
  chargemasterItems,
  encounters,
  statutoryWaterfalls,
  systemAuditLogs,
  patients,
  philhealthClaims,
  hmoAuthorizations
} from '../db/schema';
import { recalculateAndPersistWaterfall } from '../services/waterfallPersistence';
import { apiError } from '../middleware/error';
import { requireAuth, requireRole } from '../middleware/auth';
import { getHydratedEncounter, invalidateEncountersCache } from './encounters';
import { matchChargeItemCondition, matchDisputeCondition } from '../utils/dbQuery';
import { encounterAccessCondition } from '../utils/encounterAccess';
import { getClientIp } from '../utils/clientIp';

const disputesApp = new Hono();

// POST /api/v1/encounters/:id/disputes
const createDisputeSchema = z.object({
  chargeId: z.string(),
  reason: z.string().min(3),
  disputeCategory: z.enum([
    'UNADMINISTERED_MED',
    'EXCESS_DOCTOR_FEE',
    'DUPLICATE_DIAGNOSTIC',
    'UNCONSUMED_SUPPLY',
    'OTHER'
  ]).default('OTHER')
});

disputesApp.post(
  '/encounters/:id/disputes',
  requireAuth,
  requireRole(['PATIENT_GUARANTOR', 'BILLING_SPECIALIST', 'HOSPITAL_CFO']),
  zValidator('json', createDisputeSchema),
  async (c) => {
    const encIdOrNumber = c.req.param('id');
    if (!encIdOrNumber) return apiError(c, 400, 'MISSING_ID', 'A record identifier is required.');
    const { chargeId, reason, disputeCategory } = c.req.valid('json');
    const user = c.get('user');

    const accessCondition = await encounterAccessCondition(user, encIdOrNumber);
    const txResult = await db.transaction(async (tx) => {
      const encList = await tx.select().from(encounters)
        .where(accessCondition).limit(1).for('update');
      if (encList.length === 0) return apiError(c, 404, 'NOT_FOUND', 'Encounter not found.');
      const enc = encList[0];
      const itemRecord = await tx.select().from(chargemasterItems)
        .where(and(matchChargeItemCondition(chargeId), eq(chargemasterItems.encounterId, enc.id)))
        .limit(1).for('update');
      if (itemRecord.length === 0) return apiError(c, 404, 'NOT_FOUND', 'Charge not found in this stay.');
      const item = itemRecord[0];

      // Mark item as disputed / contested
      await tx
        .update(chargemasterItems)
        .set({
          isDisputed: true,
          disputeReason: reason,
          status: 'CONTESTED',
          updatedAt: new Date()
        })
        .where(eq(chargemasterItems.id, item.id));

      await tx.update(encounters).set({ billState: 'DISPUTED', updatedAt: new Date() }).where(eq(encounters.id, enc.id));

      // Insert dispute
      const insertedDisputes = await tx
        .insert(billingDisputes)
        .values({
          encounterId: enc.id,
          chargeId: item.id,
          itemDescription: item.description,
          contestedAmount: item.patientOop,
          reason,
          disputeCategory,
          status: 'OPEN',
          department: item.category
        })
        .returning();

      await tx.insert(systemAuditLogs).values({
        facilityId: enc.facilityId,
        userId: user.id,
        actorRole: user.role,
        action: 'DISPUTE_FILED',
        resourceType: 'billing_disputes',
        resourceId: insertedDisputes[0].id,
        newState: { chargeId: item.id, reason, contestedAmount: item.patientOop },
        ipAddress: getClientIp(c),
        userAgent: c.req.header('user-agent')
      });

      return { dispute: insertedDisputes[0], encounterId: enc.id };
    });
    if (txResult instanceof Response) return txResult;
    invalidateEncountersCache();
    const d = txResult.dispute;
    const patientResponse = user.role === 'PATIENT_GUARANTOR';
    return c.json({
      success: true,
      dispute: patientResponse ? {
        id: d.id, itemDescription: d.itemDescription, contestedAmount: Number(d.contestedAmount),
        reason: d.reason, status: d.status, createdAt: d.createdAt, resolutionClause: d.resolutionClause
      } : d,
      encounter: patientResponse ? undefined : await getHydratedEncounter(txResult.encounterId)
    });
  }
);

// POST /api/v1/disputes/:id/supervisory-waive
const waiveDisputeSchema = z.object({
  supervisorNotes: z.string().min(5).max(500)
});

disputesApp.post(
  '/disputes/:id/supervisory-waive',
  requireAuth,
  requireRole(['HOSPITAL_CFO', 'BILLING_SPECIALIST']),
  zValidator('json', waiveDisputeSchema),
  async (c) => {
    const disputeId = c.req.param('id');
    if (!disputeId) return apiError(c, 400, 'MISSING_ID', 'A record identifier is required.');
    const { supervisorNotes } = c.req.valid('json');
    const user = c.get('user');

    const result = await db.transaction(async (tx) => {
      // Find the stay, then lock the encounter before any charge/dispute locks,
      // using the same ordering as payment and recalculation transactions.
      const candidates = await tx.select().from(billingDisputes)
        .where(matchDisputeCondition(disputeId)).limit(1);
      if (!candidates.length) return apiError(c, 404, 'NOT_FOUND', 'Dispute not found.');
      const encList = await tx.select().from(encounters)
        .where(and(eq(encounters.id, candidates[0].encounterId), eq(encounters.facilityId, user.facilityId)))
        .limit(1).for('update');
      if (!encList.length) return apiError(c, 404, 'NOT_FOUND', 'Dispute not found.');
      const encounter = encList[0];
      const [dispute] = await tx.select().from(billingDisputes)
        .where(and(eq(billingDisputes.id, candidates[0].id), eq(billingDisputes.encounterId, encounter.id)))
        .limit(1).for('update');
      if (!dispute) return apiError(c, 404, 'NOT_FOUND', 'Dispute not found.');
      if (dispute.status === 'SUPERVISOR_WAIVED') return { encounterId: encounter.id };
      if (dispute.resolvedAt) return apiError(c, 409, 'DISPUTE_RESOLVED', 'This dispute has already been resolved.');
      const [item] = await tx.select().from(chargemasterItems)
        .where(and(eq(chargemasterItems.id, dispute.chargeId), eq(chargemasterItems.encounterId, encounter.id)))
        .limit(1).for('update');
      if (!item) return apiError(c, 404, 'NOT_FOUND', 'Disputed charge not found.');
      await tx.update(chargemasterItems).set({
        status: 'SUPERVISORY_WAIVED', patientOop: '0.00', isDisputed: false,
        exclusionReasonClause: `Supervisory Balance Waiver applied: ${supervisorNotes}`, updatedAt: new Date()
      }).where(eq(chargemasterItems.id, item.id));
      await tx.update(billingDisputes).set({
        status: 'SUPERVISOR_WAIVED', supervisorNotes, resolvedByUserId: user.id,
        resolutionClause: `Waived under supervisory authority by ${user.fullName} (${user.role})`, resolvedAt: new Date()
      }).where(eq(billingDisputes.id, dispute.id));
      await recalculateAndPersistWaterfall(encounter.id, undefined, tx);
      if (item.category === 'PHARMACY') {
        const items = await tx.select().from(chargemasterItems).where(eq(chargemasterItems.encounterId, encounter.id));
        const contested = items.some(it => it.category === 'PHARMACY' && (it.isDisputed || it.status === 'CONTESTED'));
        await tx.update(encounters).set({
          unreturnedMedsCount: contested ? encounter.unreturnedMedsCount : 0, updatedAt: new Date()
        }).where(eq(encounters.id, encounter.id));
      }
      await tx.insert(systemAuditLogs).values({
        facilityId: user.facilityId, userId: user.id, actorRole: user.role,
        action: 'SUPERVISORY_WAIVER_EXECUTED', resourceType: 'billing_disputes', resourceId: dispute.id,
        newState: { supervisorNotes, status: 'SUPERVISOR_WAIVED' },
        ipAddress: getClientIp(c), userAgent: c.req.header('user-agent')
      });
      return { encounterId: encounter.id };
    });
    if (result instanceof Response) return result;

    invalidateEncountersCache();
    const updated = await getHydratedEncounter(result.encounterId);
    return c.json({ success: true, encounter: updated });
  }
);

export default disputesApp;
