import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { eq, or, and } from 'drizzle-orm';
import { db } from '../db';
import { beds, systemAuditLogs } from '../db/schema';
import { apiError } from '../middleware/error';
import { requireAuth, requireRole } from '../middleware/auth';
import { isUuid } from '../utils/dbQuery';
import { getClientIp } from '../utils/clientIp';

const bedsApp = new Hono();

// GET /api/v1/beds
bedsApp.get('/', async (c) => {
  const allBeds = await db.select().from(beds).where(eq(beds.facilityId, c.get('user').facilityId)).orderBy(beds.floorNumber, beds.bedNumber);

  const total = allBeds.length;
  const occupied = allBeds.filter((b) => b.status === 'OCCUPIED').length;
  const available = allBeds.filter((b) => b.status === 'AVAILABLE').length;
  const housekeeping = allBeds.filter((b) => b.status === 'HOUSEKEEPING').length;
  const maintenance = allBeds.filter((b) => b.status === 'MAINTENANCE').length;
  const hold = allBeds.filter((b) => b.status === 'ADMINISTRATIVE_HOLD').length;

  return c.json({
    summary: {
      total,
      occupied,
      available,
      housekeeping,
      maintenance,
      hold,
      occupancyRate: total > 0 ? Number(((occupied / total) * 100).toFixed(1)) : 0
    },
    items: allBeds
  });
});

// PATCH /api/v1/beds/:id/status
const updateStatusSchema = z.object({
  status: z.enum(['AVAILABLE', 'OCCUPIED', 'HOUSEKEEPING', 'MAINTENANCE', 'ADMINISTRATIVE_HOLD'])
});

bedsApp.patch(
  '/:id/status',
  requireAuth,
  requireRole(['BILLING_SPECIALIST', 'HOSPITAL_CFO']),
  zValidator('json', updateStatusSchema),
  async (c) => {
    const bedIdOrNumber = c.req.param('id');
    if (!bedIdOrNumber) return apiError(c, 400, 'MISSING_ID', 'A record identifier is required.');
    const { status } = c.req.valid('json');
    const user = c.get('user');

    const bedQuery = isUuid(bedIdOrNumber)
      ? or(eq(beds.id, bedIdOrNumber), eq(beds.bedNumber, bedIdOrNumber))
      : eq(beds.bedNumber, bedIdOrNumber);

    const result=await db.transaction(async tx=>{
    const bedList = await tx
      .select()
      .from(beds)
      .where(and(bedQuery, eq(beds.facilityId, user.facilityId)))
      .limit(1).for('update');

    if (bedList.length === 0) {
      return apiError(c, 404, 'NOT_FOUND', `Bed ${bedIdOrNumber} not found.`);
    }

    const bed = bedList[0];
    if(bed.currentEncounterId&&status!==bed.status)return apiError(c,409,'BED_OCCUPIED','Release this bed through its encounter discharge or transfer.');
    const now = new Date();

    const updatedBeds = await tx
      .update(beds)
      .set({
        status,
        currentEncounterId: status === 'AVAILABLE' || status === 'HOUSEKEEPING' ? null : bed.currentEncounterId,
        updatedAt: now
      })
      .where(eq(beds.id, bed.id))
      .returning();

    await tx.insert(systemAuditLogs).values({
      facilityId: bed.facilityId,
      userId: user.id,
      actorRole: user.role,
      action: 'BED_STATUS_CHANGED',
      resourceType: 'beds',
      resourceId: bed.id,
      previousState: { status: bed.status },
      newState: { status },
      ipAddress: getClientIp(c),
      userAgent: c.req.header('user-agent')
    });

    return c.json({
      success: true,
      bed: updatedBeds[0]
    });
    });
    return result;
  }
);

export default bedsApp;
