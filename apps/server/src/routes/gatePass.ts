import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { eq, or, and } from 'drizzle-orm';
import { db } from '../db';
import { dischargePasses, encounters, systemAuditLogs } from '../db/schema';
import { apiError } from '../middleware/error';
import { requireAuth, requireRole } from '../middleware/auth';

import { isUuid } from '../utils/dbQuery';
import { generateGatePassHmac, resolveGatePassSecret, timingSafeEqualHex } from '../services/gatePassService';
import { getClientIp } from '../utils/clientIp';

const gatePassApp = new Hono();

const verifyPassSchema = z.object({
  passNumber: z.string(),
  exitPin: z.string().length(4)
});

gatePassApp.post(
  '/passes/verify',
  requireAuth,
  requireRole(['LOBBY_SECURITY', 'BILLING_SPECIALIST', 'HOSPITAL_CFO']),
  zValidator('json', verifyPassSchema),
  async (c) => {
    const { passNumber, exitPin } = c.req.valid('json');
    const user = c.get('user');

    const passQuery = isUuid(passNumber)
      ? or(eq(dischargePasses.id, passNumber), eq(dischargePasses.encounterId, passNumber), eq(dischargePasses.passNumber, passNumber))
      : eq(dischargePasses.passNumber, passNumber);

    return db.transaction(async (tx) => {
    const passList = await tx
      .select({ pass: dischargePasses })
      .from(dischargePasses)
      .innerJoin(encounters, eq(encounters.id, dischargePasses.encounterId))
      .where(and(passQuery, eq(encounters.facilityId, user.facilityId)))
      .limit(1);

    if (passList.length === 0) {
      return apiError(c, 404, 'PASS_NOT_FOUND', `Discharge pass ${passNumber} not found.`);
    }

    const candidate = passList[0].pass;
    const lockedEncounter = await tx.select({ id: encounters.id }).from(encounters)
      .where(and(eq(encounters.id, candidate.encounterId), eq(encounters.facilityId, user.facilityId)))
      .limit(1).for('update');
    if (!lockedEncounter.length) return apiError(c, 404, 'PASS_NOT_FOUND', 'Discharge pass not found.');
    const [pass] = await tx.select().from(dischargePasses)
      .where(eq(dischargePasses.id, candidate.id)).limit(1).for('update');
    if (!pass) return apiError(c, 404, 'PASS_NOT_FOUND', 'Discharge pass not found.');
    if (pass.status !== 'ACTIVE_READY_FOR_EXIT' && pass.status !== 'VERIFIED_AT_LOBBY') return apiError(c, 403, 'PASS_NOT_ACTIVE', 'This discharge pass is no longer valid. Please contact hospital billing.');

    // Assert PIN matches
    if (pass.exitPin !== exitPin) {
      return apiError(c, 400, 'INVALID_PIN', 'The 4-digit security exit PIN is incorrect.');
    }

    // Cryptographic HMAC Verification
    const nodeEnv =
      (c.env as any)?.NODE_ENV ||
      (typeof process !== 'undefined' ? process.env.NODE_ENV : undefined) ||
      'development';
    const isProduction = nodeEnv === 'production';
    const secretKey = resolveGatePassSecret((c.env as any)?.GATE_PASS_SECRET, isProduction);
    const expectedHmac = await generateGatePassHmac(
      pass.encounterId,
      Number(pass.settledAmount),
      pass.issuedAt.toISOString(),
      secretKey
    );

    if (!timingSafeEqualHex(pass.hmacSignature, expectedHmac)) {
      return apiError(
        c,
        403,
        'INVALID_HMAC_SIGNATURE',
        'Digital gate pass cryptographic signature verification failed. The pass record may have been tampered with.'
      );
    }

    // Guard against repeated exit pass verification (Idempotency)
    if (pass.status === 'VERIFIED_AT_LOBBY') {
      return c.json({
        verified: true,
        passAlreadyVerified: true,
        passNumber: pass.passNumber,
        patientName: pass.patientName,
        roomBed: pass.roomBed,
        status: 'VERIFIED_AT_LOBBY',
        verifiedAt: pass.verifiedAt?.toISOString() || new Date().toISOString(),
        message: 'Pass has already been verified at hospital lobby exit.'
      });
    }

    const now = new Date();

    await tx
      .update(dischargePasses)
      .set({
        status: 'VERIFIED_AT_LOBBY',
        verifiedAt: now,
        verifiedByUserId: user.id
      })
      .where(eq(dischargePasses.id, pass.id));

    // Audit log
    await tx.insert(systemAuditLogs).values({
      facilityId: user.facilityId,
      userId: user.id,
      actorRole: user.role,
      action: 'GATE_PASS_VERIFIED_LOBBY',
      resourceType: 'discharge_passes',
      resourceId: pass.id,
      newState: { passNumber: pass.passNumber, status: 'VERIFIED_AT_LOBBY' },
      ipAddress: getClientIp(c),
      userAgent: c.req.header('user-agent')
    });

    return c.json({
      verified: true,
      passNumber: pass.passNumber,
      patientName: pass.patientName,
      roomBed: pass.roomBed,
      status: 'VERIFIED_AT_LOBBY',
      verifiedAt: now.toISOString()
    });
    });
  }
);

export default gatePassApp;
