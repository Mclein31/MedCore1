import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { and, eq, or } from 'drizzle-orm';
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
import { getHydratedEncounter, invalidateEncountersCache } from './encounters';
import { matchEncounterCondition } from '../utils/dbQuery';
import { getClientIp } from '../utils/clientIp';
import { isCentavoAmount } from '../utils/encounterAccess';
import { moneyCents } from '../services/statutoryWaterfall';

const clearanceApp = new Hono();

// 1. POST /api/v1/encounters/:id/doctor/sign
const doctorSignSchema = z.object({
  agreedFee: z.number().positive().refine(isCentavoAmount, 'Professional fees must be exact centavo amounts.')
});

clearanceApp.post(
  '/:id/doctor/sign',
  requireAuth,
  requireRole(['ATTENDING_PHYSICIAN', 'HOSPITAL_CFO']),
  zValidator('json', doctorSignSchema),
  async (c) => {
    const id = c.req.param('id');
    if (!id) return apiError(c, 400, 'MISSING_ID', 'A record identifier is required.');
    const { agreedFee } = c.req.valid('json');
    const user = c.get('user');

    const result = await db.transaction(async (tx) => {
      // Physicians may sign only their own encounters; the CFO may sign for any physician in the facility.
      const scope = user.role === 'ATTENDING_PHYSICIAN'
        ? and(matchEncounterCondition(id), eq(encounters.facilityId, user.facilityId), eq(encounters.attendingPhysicianId, user.id))
        : and(matchEncounterCondition(id), eq(encounters.facilityId, user.facilityId));
      const [enc] = await tx.select().from(encounters)
        .where(scope)
        .limit(1).for('update');
      if (!enc) return apiError(c, 404, 'NOT_FOUND', 'Encounter not found.');
      if (enc.stage !== 'DOCTOR_PF_PENDING') {
        if (enc.doctorSignedAt && Number(enc.doctorAgreedFee) === agreedFee) return { encounterId: enc.id };
        return apiError(c, 409, 'STAGE_NOT_READY', 'Professional fees can only be signed at DOCTOR_PF_PENDING.');
      }
      const fees = (await tx.select().from(chargemasterItems)
        .where(and(eq(chargemasterItems.encounterId, enc.id), eq(chargemasterItems.category, 'PROFESSIONAL_FEE')))
        .for('update')).filter(item => item.status !== 'WAIVED' && item.status !== 'SUPERVISORY_WAIVED');
      if (fees.length > 1) return apiError(c, 409, 'MULTIPLE_PROFESSIONAL_FEES', 'Review the physician fee lines before signing a combined amount.');
      if (fees.some(item => item.isDisputed || item.status === 'CONTESTED')) return apiError(c, 409, 'PF_HAS_DISPUTE', 'Resolve the contested professional fee before signing.');
      const ceilingCents = Math.max(0, moneyCents(Number(enc.doctorAgreedFee)) - moneyCents(Number(enc.doctorExcessPf)));
      const excessPf = Math.max(0, moneyCents(agreedFee) - ceilingCents) / 100;
      const now = new Date();
      await tx.update(encounters).set({
        doctorAgreedFee: agreedFee.toFixed(2), doctorExcessPf: excessPf.toFixed(2), doctorSignedAt: now,
        stage: 'PHARMACY_RTS_AUDIT', updatedAt: now
      }).where(eq(encounters.id, enc.id));
      if (fees.length) {
        const coveredCents = moneyCents(agreedFee) - moneyCents(excessPf);
        const phCents = Math.min(moneyCents(Number(fees[0].philhealthCovered)), coveredCents);
        const hmoCents = Math.min(moneyCents(Number(fees[0].hmoCovered)), coveredCents - phCents);
        await tx.update(chargemasterItems).set({
          grossAmount: agreedFee.toFixed(2), unitPrice: agreedFee.toFixed(2), quantity: '1.00',
          patientOop: ((moneyCents(agreedFee) - phCents - hmoCents) / 100).toFixed(2),
          philhealthCovered: (phCents / 100).toFixed(2), hmoCovered: (hmoCents / 100).toFixed(2),
          status: excessPf > 0 ? 'EXCESS_PF' : 'COVERED',
          plainLanguageExplainer: `Professional fee of ₱${agreedFee.toFixed(2)} confirmed by the attending physician.`, updatedAt: now
        }).where(eq(chargemasterItems.id, fees[0].id));
      } else {
        await tx.insert(chargemasterItems).values({
          encounterId: enc.id, code: `PF-QUICKSIGN-${enc.id}`, description: 'Attending physician professional fee',
          category: 'PROFESSIONAL_FEE', quantity: '1.00', unitPrice: agreedFee.toFixed(2),
          grossAmount: agreedFee.toFixed(2), patientOop: agreedFee.toFixed(2), status: excessPf > 0 ? 'EXCESS_PF' : 'COVERED',
          plainLanguageExplainer: 'Professional fee confirmed by the attending physician.'
        });
      }
      await recalculateAndPersistWaterfall(enc.id, excessPf, tx);
      await tx.insert(encounterTimelineEvents).values({
        encounterId: enc.id, eventType: 'CLINICAL', title: 'Doctor PF Declared & QuickSign Executed',
        description: `Agreed Professional Fee ₱${agreedFee.toLocaleString()} signed by ${user.fullName}`,
        actorId: user.id, actorName: user.fullName, status: 'COMPLETED'
      });
      await tx.insert(systemAuditLogs).values({
        facilityId: enc.facilityId, userId: user.id, actorRole: user.role,
        action: 'DOCTOR_QUICKSIGN_EXECUTED', resourceType: 'encounters', resourceId: enc.id,
        newState: { agreedFee, doctorExcessPf: excessPf, stage: 'PHARMACY_RTS_AUDIT' },
        ipAddress: getClientIp(c), userAgent: c.req.header('user-agent')
      });
      return { encounterId: enc.id };
    });
    if (result instanceof Response) return result;
    invalidateEncountersCache();
    const updated = await getHydratedEncounter(result.encounterId);
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
    if (!id) return apiError(c, 400, 'MISSING_ID', 'A record identifier is required.');
    const user = c.get('user');

    const result = await db.transaction(async (tx) => {
    const encList = await tx
      .select()
      .from(encounters)
      .where(and(matchEncounterCondition(id), eq(encounters.facilityId, user.facilityId)))
      .limit(1).for('update');

    if (encList.length === 0) {
      return apiError(c, 404, 'NOT_FOUND', `Encounter ${id} not found.`);
    }

    const enc = encList[0];
    const now = new Date();

    await tx
      .update(encounters)
      .set({
        doctorExcessPf: '0.00',
        doctorSignedAt: now,
        stage: enc.stage === 'DOCTOR_PF_PENDING' ? 'PHARMACY_RTS_AUDIT' : enc.stage,
        updatedAt: now
      })
      .where(eq(encounters.id, enc.id));

    await recalculateAndPersistWaterfall(enc.id, 0, tx);

    await tx.insert(encounterTimelineEvents).values({
      encounterId: enc.id,
      eventType: 'BILLING',
      title: 'Accredited Schedule Ceiling Applied',
      description: `Doctor excess PF liability set to ₱0.00 by ${user.fullName}`,
      actorId: user.id,
      actorName: user.fullName,
      status: 'COMPLETED'
    });

    await tx.insert(systemAuditLogs).values({
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

      return { encounterId: enc.id };
    });
    if (result instanceof Response) return result;
    invalidateEncountersCache();
    const updated = await getHydratedEncounter(result.encounterId);
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
    if (!id) return apiError(c, 400, 'MISSING_ID', 'A record identifier is required.');
    const user = c.get('user');

    const result = await db.transaction(async (tx) => {
    const encList = await tx
      .select()
      .from(encounters)
      .where(and(matchEncounterCondition(id), eq(encounters.facilityId, user.facilityId)))
      .limit(1).for('update');

    if (encList.length === 0) {
      return apiError(c, 404, 'NOT_FOUND', `Encounter ${id} not found.`);
    }

    const enc = encList[0];
    const now = new Date();

    const [coverage]=await tx.select().from(hmoAuthorizations).where(eq(hmoAuthorizations.encounterId,enc.id)).limit(1);
    const nextStage=coverage&&coverage.providerName!=='None'?'HMO_FINAL_LOA':'PENDING_SETTLEMENT';

    await tx
      .update(encounters)
      .set({
        pharmacyRtsCleared: true,
        unreturnedMedsCount: 0,
        stage: enc.stage === 'PHARMACY_RTS_AUDIT' ? nextStage : enc.stage,
        updatedAt: now
      })
      .where(eq(encounters.id, enc.id));

    await tx.insert(encounterTimelineEvents).values({
      encounterId: enc.id,
      eventType: 'PHARMACY',
      title: 'Pharmacy Return-to-Stock (RTS) Audit Cleared',
      description: `Zero unreturned medications certified by ${user.fullName}`,
      actorId: user.id,
      actorName: user.fullName,
      status: 'COMPLETED'
    });

    await tx.insert(systemAuditLogs).values({
      facilityId: enc.facilityId,
      userId: user.id,
      actorRole: user.role,
      action: 'PHARMACY_RTS_CLEARED',
      resourceType: 'encounters',
      resourceId: enc.id,
      newState: { pharmacyRtsCleared: true, unreturnedMedsCount: 0, stage: enc.stage === 'PHARMACY_RTS_AUDIT' ? nextStage : enc.stage },
      ipAddress: getClientIp(c),
      userAgent: c.req.header('user-agent')
    });

      return { encounterId: enc.id };
    });
    if (result instanceof Response) return result;
    invalidateEncountersCache();
    const updated = await getHydratedEncounter(result.encounterId);
    return c.json({ success: true, encounter: updated });
  }
);

// 4. POST /api/v1/encounters/:id/hmo/final-loa
const finalLoaSchema = z.object({
  approvalCode: z.string().optional(),
  approvedAmount: z.number().nonnegative().refine(value => value === 0 || isCentavoAmount(value), 'Enter an exact centavo amount.').optional(),
  disallowedConsumables: z.number().nonnegative().refine(value => value === 0 || isCentavoAmount(value), 'Enter an exact centavo amount.').optional()
});

clearanceApp.post(
  '/:id/hmo/final-loa',
  requireAuth,
  requireRole(['HMO_COORDINATOR', 'BILLING_SPECIALIST', 'HOSPITAL_CFO']),
  zValidator('json', finalLoaSchema),
  async (c) => {
    const id = c.req.param('id');
    if (!id) return apiError(c, 400, 'MISSING_ID', 'A record identifier is required.');
    const { approvalCode, approvedAmount, disallowedConsumables } = c.req.valid('json');
    const user = c.get('user');

    const result = await db.transaction(async (tx) => {
    const encList = await tx
      .select()
      .from(encounters)
      .where(and(matchEncounterCondition(id), eq(encounters.facilityId, user.facilityId)))
      .limit(1).for('update');

    if (encList.length === 0) {
      return apiError(c, 404, 'NOT_FOUND', `Encounter ${id} not found.`);
    }

    const enc = encList[0];
    const now = new Date();
    const code = approvalCode || `APV-${Math.floor(100000 + Math.random() * 900000)}`;

    const hmoRecord = await tx
      .select()
      .from(hmoAuthorizations)
      .where(eq(hmoAuthorizations.encounterId, enc.id))
      .limit(1);

    if (!hmoRecord.length) return apiError(c, 404, 'HMO_NOT_FOUND', 'No HMO authorization exists for this encounter.');
    const existingAmount = hmoRecord.length > 0 ? Number(hmoRecord[0].approvedAmount) : 0;
    const finalAmount = approvedAmount !== undefined ? approvedAmount : existingAmount;

    await tx
      .update(hmoAuthorizations)
      .set({
        finalLoaStatus: 'APPROVED',
        approvalCode: code,
        approvedAmount: finalAmount.toFixed(2),
        disallowedConsumables: disallowedConsumables !== undefined ? disallowedConsumables.toFixed(2) : '0.00',
        updatedAt: now
      })
      .where(eq(hmoAuthorizations.encounterId, enc.id));

    await tx
      .update(encounters)
      .set({
        stage: enc.stage === 'HMO_FINAL_LOA' ? 'PENDING_SETTLEMENT' : enc.stage,
        updatedAt: now
      })
      .where(eq(encounters.id, enc.id));

    await recalculateAndPersistWaterfall(enc.id, undefined, tx);

    await tx.insert(encounterTimelineEvents).values({
      encounterId: enc.id,
      eventType: 'PAYER',
      title: 'Commercial HMO Final LOA Approved',
      description: `Approval Code ${code} issued for ₱${finalAmount.toLocaleString()} by ${user.fullName}`,
      actorId: user.id,
      actorName: user.fullName,
      status: 'COMPLETED'
    });

    await tx.insert(systemAuditLogs).values({
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

      return { encounterId: enc.id };
    });
    if (result instanceof Response) return result;
    invalidateEncountersCache();
    const updated = await getHydratedEncounter(result.encounterId);
    return c.json({ success: true, encounter: updated });
  }
);

export default clearanceApp;
