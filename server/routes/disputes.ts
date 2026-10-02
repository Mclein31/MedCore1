import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { eq, or } from 'drizzle-orm';
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
import { getHydratedEncounter } from './encounters';
import { matchEncounterCondition, matchChargeItemCondition, matchDisputeCondition } from '../utils/dbQuery';

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
    const { chargeId, reason, disputeCategory } = c.req.valid('json');
    const user = c.get('user');

    const encList = await db
      .select()
      .from(encounters)
      .where(matchEncounterCondition(encIdOrNumber))
      .limit(1);

    if (encList.length === 0) {
      return apiError(c, 404, 'NOT_FOUND', `Encounter ${encIdOrNumber} not found.`);
    }

    const enc = encList[0];

    const itemRecord = await db
      .select()
      .from(chargemasterItems)
      .where(matchChargeItemCondition(chargeId))
      .limit(1);

    if (itemRecord.length === 0) {
      return apiError(c, 404, 'NOT_FOUND', `Chargemaster item ${chargeId} not found.`);
    }

    const item = itemRecord[0];

    // Mark item as disputed / contested
    await db
      .update(chargemasterItems)
      .set({
        isDisputed: true,
        disputeReason: reason,
        status: 'CONTESTED',
        updatedAt: new Date()
      })
      .where(eq(chargemasterItems.id, item.id));

    // Insert dispute
    const insertedDisputes = await db
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

    await db.insert(systemAuditLogs).values({
      facilityId: enc.facilityId,
      userId: user.id,
      actorRole: user.role,
      action: 'DISPUTE_FILED',
      resourceType: 'billing_disputes',
      resourceId: insertedDisputes[0].id,
      newState: { chargeId: item.id, reason, contestedAmount: item.patientOop },
      ipAddress: c.req.header('x-forwarded-for') || '127.0.0.1',
      userAgent: c.req.header('user-agent')
    });

    const updated = await getHydratedEncounter(enc.id);
    return c.json({ success: true, dispute: insertedDisputes[0], encounter: updated });
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
    const { supervisorNotes } = c.req.valid('json');
    const user = c.get('user');

    // Find dispute
    const disputeList = await db
      .select()
      .from(billingDisputes)
      .where(matchDisputeCondition(disputeId))
      .limit(1);

    if (disputeList.length === 0) {
      return apiError(c, 404, 'NOT_FOUND', `Dispute ${disputeId} not found.`);
    }

    const dispute = disputeList[0];
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
      ipAddress: c.req.header('x-forwarded-for') || '127.0.0.1',
      userAgent: c.req.header('user-agent')
    });

    const updated = await getHydratedEncounter(encounterId);
    return c.json({ success: true, encounter: updated });
  }
);

export default disputesApp;
