import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { eq, or } from 'drizzle-orm';
import { db } from '../db';
import {
  encounters,
  statutoryWaterfalls,
  chargemasterItems,
  hmoAuthorizations,
  encounterTimelineEvents,
  systemAuditLogs,
  patients,
  philhealthClaims
} from '../db/schema';
import { recalculateAndPersistWaterfall } from '../services/waterfallPersistence';
import { apiError } from '../middleware/error';
import { requireAuth, requireRole } from '../middleware/auth';
import { getHydratedEncounter } from './encounters';
import { matchEncounterCondition } from '../utils/dbQuery';
import { getClientIp } from '../utils/clientIp';

const clearanceApp = new Hono();

// 1. POST /api/v1/encounters/:id/doctor/sign
const doctorSignSchema = z.object({
  agreedFee: z.number().positive()
});

clearanceApp.post(
  '/:id/doctor/sign',
  requireAuth,
  requireRole(['ATTENDING_PHYSICIAN', 'HOSPITAL_CFO']),
  zValidator('json', doctorSignSchema),
  async (c) => {
    const id = c.req.param('id');
    const { agreedFee } = c.req.valid('json');
    const user = c.get('user');

    const encList = await db
      .select()
      .from(encounters)
      .where(matchEncounterCondition(id))
      .limit(1);

    if (encList.length === 0) {
      return apiError(c, 404, 'NOT_FOUND', `Encounter ${id} not found.`);
    }

    const enc = encList[0];
    const now = new Date();

    await db
      .update(encounters)
      .set({
        doctorAgreedFee: agreedFee.toFixed(2),
        doctorSignedAt: now,
        stage: enc.stage === 'DOCTOR_PF_PENDING' ? 'PHARMACY_RTS_AUDIT' : enc.stage,
        updatedAt: now
      })
      .where(eq(encounters.id, enc.id));

    await recalculateAndPersistWaterfall(enc.id);

    await db.insert(encounterTimelineEvents).values({
      encounterId: enc.id,
      eventType: 'CLINICAL',
      title: 'Doctor PF Declared & QuickSign Executed',
      description: `Agreed Professional Fee ₱${agreedFee.toLocaleString()} signed by ${user.fullName}`,
      actorId: user.id,
      actorName: user.fullName,
      status: 'COMPLETED'
    });

    await db.insert(systemAuditLogs).values({
      facilityId: enc.facilityId,
      userId: user.id,
      actorRole: user.role,
      action: 'DOCTOR_QUICKSIGN_EXECUTED',
      resourceType: 'encounters',
      resourceId: enc.id,
      newState: { agreedFee, stage: 'PHARMACY_RTS_AUDIT' },
      ipAddress: getClientIp(c),
      userAgent: c.req.header('user-agent')
    });

    const updated = await getHydratedEncounter(enc.id);
    return c.json({ success: true, encounter: updated });
  }
);

// 2. POST /api/v1/encounters/:id/doctor/accredited-ceiling
clearanceApp.post(
  '/:id/doctor/accredited-ceiling',
  requireAuth,
  requireRole(['BILLING_SPECIALIST', 'HOSPITAL_CFO']),
  async (c) => {
    const id = c.req.param('id');
    const user = c.get('user');

    const encList = await db
      .select()
      .from(encounters)
      .where(matchEncounterCondition(id))
      .limit(1);

    if (encList.length === 0) {
      return apiError(c, 404, 'NOT_FOUND', `Encounter ${id} not found.`);
    }

    const enc = encList[0];
    const now = new Date();

    await db
      .update(encounters)
      .set({
        doctorExcessPf: '0.00',
        doctorSignedAt: now,
        stage: enc.stage === 'DOCTOR_PF_PENDING' ? 'PHARMACY_RTS_AUDIT' : enc.stage,
        updatedAt: now
      })
      .where(eq(encounters.id, enc.id));

    await recalculateAndPersistWaterfall(enc.id, 0);

    await db.insert(encounterTimelineEvents).values({
      encounterId: enc.id,
      eventType: 'BILLING',
      title: 'Accredited Schedule Ceiling Applied',
      description: `Doctor excess PF liability set to ₱0.00 by ${user.fullName}`,
      actorId: user.id,
      actorName: user.fullName,
      status: 'COMPLETED'
    });

    await db.insert(systemAuditLogs).values({
      facilityId: enc.facilityId,
      userId: user.id,
      actorRole: user.role,
      action: 'ACCREDITED_CEILING_APPLIED',
      resourceType: 'encounters',
      resourceId: enc.id,
      newState: { doctorExcessPf: 0, stage: 'PHARMACY_RTS_AUDIT' },
      ipAddress: getClientIp(c),
      userAgent: c.req.header('user-agent')
    });

    const updated = await getHydratedEncounter(enc.id);
    return c.json({ success: true, encounter: updated });
  }
);

// 3. POST /api/v1/encounters/:id/pharmacy/clear-rts
clearanceApp.post(
  '/:id/pharmacy/clear-rts',
  requireAuth,
  requireRole(['BILLING_SPECIALIST', 'HOSPITAL_CFO']),
  async (c) => {
    const id = c.req.param('id');
    const user = c.get('user');

    const encList = await db
      .select()
      .from(encounters)
      .where(matchEncounterCondition(id))
      .limit(1);

    if (encList.length === 0) {
      return apiError(c, 404, 'NOT_FOUND', `Encounter ${id} not found.`);
    }

    const enc = encList[0];
    const now = new Date();

    await db
      .update(encounters)
      .set({
        pharmacyRtsCleared: true,
        unreturnedMedsCount: 0,
        stage: enc.stage === 'PHARMACY_RTS_AUDIT' ? 'HMO_FINAL_LOA' : enc.stage,
        updatedAt: now
      })
      .where(eq(encounters.id, enc.id));

    await db.insert(encounterTimelineEvents).values({
      encounterId: enc.id,
      eventType: 'PHARMACY',
      title: 'Pharmacy Return-to-Stock (RTS) Audit Cleared',
      description: `Zero unreturned medications certified by ${user.fullName}`,
      actorId: user.id,
      actorName: user.fullName,
      status: 'COMPLETED'
    });

    await db.insert(systemAuditLogs).values({
      facilityId: enc.facilityId,
      userId: user.id,
      actorRole: user.role,
      action: 'PHARMACY_RTS_CLEARED',
      resourceType: 'encounters',
      resourceId: enc.id,
      newState: { pharmacyRtsCleared: true, unreturnedMedsCount: 0, stage: 'HMO_FINAL_LOA' },
      ipAddress: getClientIp(c),
      userAgent: c.req.header('user-agent')
    });

    const updated = await getHydratedEncounter(enc.id);
    return c.json({ success: true, encounter: updated });
  }
);

// 4. POST /api/v1/encounters/:id/hmo/final-loa
const finalLoaSchema = z.object({
  approvalCode: z.string().optional(),
  approvedAmount: z.number().nonnegative().optional(),
  disallowedConsumables: z.number().nonnegative().optional()
});

clearanceApp.post(
  '/:id/hmo/final-loa',
  requireAuth,
  requireRole(['HMO_COORDINATOR', 'BILLING_SPECIALIST', 'HOSPITAL_CFO']),
  zValidator('json', finalLoaSchema),
  async (c) => {
    const id = c.req.param('id');
    const { approvalCode, approvedAmount, disallowedConsumables } = c.req.valid('json');
    const user = c.get('user');

    const encList = await db
      .select()
      .from(encounters)
      .where(matchEncounterCondition(id))
      .limit(1);

    if (encList.length === 0) {
      return apiError(c, 404, 'NOT_FOUND', `Encounter ${id} not found.`);
    }

    const enc = encList[0];
    const now = new Date();
    const code = approvalCode || `APV-${Math.floor(100000 + Math.random() * 900000)}`;

    const hmoRecord = await db
      .select()
      .from(hmoAuthorizations)
      .where(eq(hmoAuthorizations.encounterId, enc.id))
      .limit(1);

    const existingAmount = hmoRecord.length > 0 ? Number(hmoRecord[0].approvedAmount) : 0;
    const finalAmount = approvedAmount !== undefined ? approvedAmount : existingAmount;

    await db
      .update(hmoAuthorizations)
      .set({
        finalLoaStatus: 'APPROVED',
        approvalCode: code,
        approvedAmount: finalAmount.toFixed(2),
        disallowedConsumables: disallowedConsumables !== undefined ? disallowedConsumables.toFixed(2) : '0.00',
        updatedAt: now
      })
      .where(eq(hmoAuthorizations.encounterId, enc.id));

    await db
      .update(encounters)
      .set({
        stage: enc.stage === 'HMO_FINAL_LOA' ? 'PENDING_SETTLEMENT' : enc.stage,
        updatedAt: now
      })
      .where(eq(encounters.id, enc.id));

    await recalculateAndPersistWaterfall(enc.id);

    await db.insert(encounterTimelineEvents).values({
      encounterId: enc.id,
      eventType: 'PAYER',
      title: 'Commercial HMO Final LOA Approved',
      description: `Approval Code ${code} issued for ₱${finalAmount.toLocaleString()} by ${user.fullName}`,
      actorId: user.id,
      actorName: user.fullName,
      status: 'COMPLETED'
    });

    await db.insert(systemAuditLogs).values({
      facilityId: enc.facilityId,
      userId: user.id,
      actorRole: user.role,
      action: 'HMO_LOA_APPROVED',
      resourceType: 'hmo_authorizations',
      resourceId: enc.id,
      newState: { approvalCode: code, approvedAmount: finalAmount, stage: 'PENDING_SETTLEMENT' },
      ipAddress: getClientIp(c),
      userAgent: c.req.header('user-agent')
    });

    const updated = await getHydratedEncounter(enc.id);
    return c.json({ success: true, encounter: updated });
  }
);

export default clearanceApp;
