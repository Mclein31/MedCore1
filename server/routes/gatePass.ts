import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { eq, or } from 'drizzle-orm';
import { db } from '../db';
import { dischargePasses, systemAuditLogs } from '../db/schema';
import { apiError } from '../middleware/error';
import { requireAuth, requireRole } from '../middleware/auth';

import { isUuid } from '../utils/dbQuery';

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

    const passList = await db
      .select()
      .from(dischargePasses)
      .where(passQuery)
      .limit(1);

    if (passList.length === 0) {
      return apiError(c, 404, 'PASS_NOT_FOUND', `Discharge pass ${passNumber} not found.`);
    }

    const pass = passList[0];

    // Assert PIN matches
    if (pass.exitPin !== exitPin) {
      return apiError(c, 400, 'INVALID_PIN', 'The 4-digit security exit PIN is incorrect.');
    }

    const now = new Date();

    await db
      .update(dischargePasses)
      .set({
        status: 'VERIFIED_AT_LOBBY',
        verifiedAt: now,
        verifiedByUserId: user.id
      })
      .where(eq(dischargePasses.id, pass.id));

    // Audit log
    await db.insert(systemAuditLogs).values({
      facilityId: user.facilityId,
      userId: user.id,
      actorRole: user.role,
      action: 'GATE_PASS_VERIFIED_LOBBY',
      resourceType: 'discharge_passes',
      resourceId: pass.id,
      newState: { passNumber: pass.passNumber, status: 'VERIFIED_AT_LOBBY', exitPin },
      ipAddress: c.req.header('x-forwarded-for') || '127.0.0.1',
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
  }
);

export default gatePassApp;
