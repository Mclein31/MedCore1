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

    // Find dispute
    const disputeList = await db
      .select({ dispute: billingDisputes })
      .from(billingDisputes)
      .innerJoin(encounters, eq(encounters.id, billingDisputes.encounterId))
      .where(and(matchDisputeCondition(disputeId), eq(encounters.facilityId, user.facilityId)))
      .limit(1);

    if (disputeList.length === 0) {
      return apiError(c, 404, 'NOT_FOUND', `Dispute ${disputeId} not found.`);
    }

    const dispute = disputeList[0].dispute;
    const encounterId = dispute.encounterId;

    // 1. Update charge item: SUPERVISORY_WAIVED, patient_oop = 0.00, is_disputed = false
    await db
      .update(chargemasterItems)
      .set({
        status: 'SUPERVISORY_WAIVED',
        patientOop: '0.00',
        isDisputed: false,
        exclusionReasonClause: `Supervisory Balance Waiver applied: ${supervisorNotes}`,
        updatedAt: new Date()
      })
      .where(eq(chargemasterItems.id, dispute.chargeId));

    // 2. Update dispute: SUPERVISOR_WAIVED
    await db
      .update(billingDisputes)
      .set({
        status: 'SUPERVISOR_WAIVED',
        supervisorNotes,
        resolvedByUserId: user.id,
        resolutionClause: `Waived under supervisory authority by ${user.fullName} (${user.role})`,
        resolvedAt: new Date()
      })
      .where(eq(billingDisputes.id, dispute.id));

    // 3. Recompute waterfall authoritatively
    await recalculateAndPersistWaterfall(encounterId);

    // 4. Update encounter pharmacy RTS status if no more contested pharmacy items
    const allItems = await db.select().from(chargemasterItems).where(eq(chargemasterItems.encounterId, encounterId));
    const encList = await db.select().from(encounters).where(eq(encounters.id, encounterId)).limit(1);
    if (encList.length > 0) {
      const encounter = encList[0];
      const hasContestedPharmacy = allItems.some(
        (it) => it.id !== dispute.chargeId && it.category === 'PHARMACY' && (it.isDisputed || it.status === 'CONTESTED')
      );

      await db
        .update(encounters)
        .set({
          pharmacyRtsCleared: encounter.pharmacyRtsCleared || !hasContestedPharmacy,
          unreturnedMedsCount: hasContestedPharmacy ? encounter.unreturnedMedsCount : 0,
          updatedAt: new Date()
        })
        .where(eq(encounters.id, encounterId));
    }

    // 4. Audit log
    await db.insert(systemAuditLogs).values({
      facilityId: user.facilityId || '00000000-0000-0000-0000-000000000001',
      userId: user.id,
      actorRole: user.role,
      action: 'SUPERVISORY_WAIVER_EXECUTED',
      resourceType: 'billing_disputes',
      resourceId: dispute.id,
      newState: { supervisorNotes, status: 'SUPERVISOR_WAIVED' },
      ipAddress: getClientIp(c),
      userAgent: c.req.header('user-agent')
    });

    invalidateEncountersCache();
    const updated = await getHydratedEncounter(encounterId);
    return c.json({ success: true, encounter: updated });
  }
);

export default disputesApp;
