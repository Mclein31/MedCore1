import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { chargemasterItems, encounters, systemAuditLogs } from '../db/schema';
import { apiError } from '../middleware/error';
import { requireAuth, requireRole } from '../middleware/auth';
import { getHydratedEncounter } from './encounters';
import { matchEncounterCondition, matchChargeItemCondition } from '../utils/dbQuery';
import { recalculateAndPersistWaterfall } from '../services/waterfallPersistence';

const chargesApp = new Hono();

const addChargeSchema = z.object({
  description: z.string().min(2).max(256),
  category: z.enum([
    'PHARMACY',
    'LABORATORY',
    'DIAGNOSTIC',
    'MEDICAL_SUPPLIES',
    'CENTRAL_SUPPLIES',
    'ROOM_BOARD',
    'PROFESSIONAL_FEE'
  ]),
  grossAmount: z.number().positive(),
  qty: z.number().positive().optional(),
  quantity: z.number().positive().optional(),
  unitPrice: z.number().nonnegative().optional(),
  code: z.string().optional(),
  coverageType: z.enum(['PHILHEALTH_FIRST', 'HMO_COVERED', 'PATIENT_DIRECT']).default('PHILHEALTH_FIRST')
});

// 1. POST /api/v1/encounters/:id/charges - Add charge line item
chargesApp.post(
  '/encounters/:id/charges',
  requireAuth,
  requireRole(['BILLING_SPECIALIST', 'HOSPITAL_CFO']),
  zValidator('json', addChargeSchema),
  async (c) => {
    const encIdOrNumber = c.req.param('id');
    const { description, category, grossAmount, qty, quantity, unitPrice, code, coverageType } = c.req.valid('json');
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
    const generatedCode = code || `CHG-${category.slice(0, 3)}-${Date.now().toString().slice(-5)}`;

    const mappedCategory =
      category === 'DIAGNOSTIC'
        ? 'LABORATORY'
        : category === 'MEDICAL_SUPPLIES'
        ? 'CENTRAL_SUPPLIES'
        : (category as any);

    const resolvedQty = quantity ?? qty ?? 1;
    const resolvedUnitPrice = unitPrice !== undefined ? unitPrice : Number((grossAmount / resolvedQty).toFixed(2));

    const inserted = await db
      .insert(chargemasterItems)
      .values({
        encounterId: enc.id,
        code: generatedCode,
        description,
        category: mappedCategory,
        quantity: resolvedQty.toFixed(2),
        unitPrice: resolvedUnitPrice.toFixed(2),
        grossAmount: grossAmount.toFixed(2),
        philhealthCovered: '0.00',
        hmoCovered: '0.00',
        patientOop: grossAmount.toFixed(2),
        isVatable: true,
        plainLanguageExplainer: `${description} itemized under ${mappedCategory.replace(/_/g, ' ')} department.`,
        isDisputed: false,
        status: 'COVERED'
      })
      .returning();

    const newItem = inserted[0];

    // Authoritative statutory recalculation
    await recalculateAndPersistWaterfall(enc.id);

    // Compliance audit trail
    await db.insert(systemAuditLogs).values({
      facilityId: enc.facilityId,
      userId: user.id,
      actorRole: user.role,
      action: 'CHARGE_ITEM_ADDED',
      resourceType: 'chargemaster_items',
      resourceId: newItem.id,
      newState: { description, category, grossAmount, quantity: resolvedQty, unitPrice: resolvedUnitPrice, code: generatedCode, coverageType },
      ipAddress: c.req.header('x-forwarded-for') || '127.0.0.1',
      userAgent: c.req.header('user-agent')
    });

    const updatedEncounter = await getHydratedEncounter(enc.id);
    return c.json({
      success: true,
      item: newItem,
      encounter: updatedEncounter
    });
  }
);

// 2. PATCH /api/v1/charges/:id - Edit charge line item
const editChargeSchema = z.object({
  description: z.string().min(2).max(256).optional(),
  grossAmount: z.number().positive().optional(),
  qty: z.number().positive().optional(),
  quantity: z.number().positive().optional(),
  unitPrice: z.number().nonnegative().optional(),
  category: z.enum([
    'PHARMACY',
    'LABORATORY',
    'DIAGNOSTIC',
    'MEDICAL_SUPPLIES',
    'CENTRAL_SUPPLIES',
    'ROOM_BOARD',
    'PROFESSIONAL_FEE'
  ]).optional()
});

chargesApp.patch(
  '/charges/:id',
  requireAuth,
  requireRole(['BILLING_SPECIALIST', 'HOSPITAL_CFO']),
  zValidator('json', editChargeSchema),
  async (c) => {
    const chargeId = c.req.param('id');
    const updates = c.req.valid('json');
    const user = c.get('user');

    const itemList = await db
      .select()
      .from(chargemasterItems)
      .where(matchChargeItemCondition(chargeId))
      .limit(1);

    if (itemList.length === 0) {
      return apiError(c, 404, 'NOT_FOUND', `Charge item ${chargeId} not found.`);
    }

    const item = itemList[0];

    const patchPayload: Record<string, any> = { updatedAt: new Date() };
    if (updates.description) patchPayload.description = updates.description;
    if (updates.category) {
      const mappedCategory =
        updates.category === 'DIAGNOSTIC'
          ? 'LABORATORY'
          : updates.category === 'MEDICAL_SUPPLIES'
          ? 'CENTRAL_SUPPLIES'
          : updates.category;
      patchPayload.category = mappedCategory;
    }
    if (updates.grossAmount !== undefined) {
      patchPayload.grossAmount = updates.grossAmount.toFixed(2);
      patchPayload.patientOop = updates.grossAmount.toFixed(2);
    }
    const resolvedQty = updates.quantity ?? updates.qty;
    if (resolvedQty !== undefined) {
      patchPayload.quantity = resolvedQty.toFixed(2);
    }
    if (updates.unitPrice !== undefined) {
      patchPayload.unitPrice = updates.unitPrice.toFixed(2);
    } else if (resolvedQty !== undefined && updates.grossAmount !== undefined) {
      patchPayload.unitPrice = (updates.grossAmount / resolvedQty).toFixed(2);
    }

    const updated = await db
      .update(chargemasterItems)
      .set(patchPayload)
      .where(eq(chargemasterItems.id, item.id))
      .returning();

    // Authoritative statutory recalculation
    await recalculateAndPersistWaterfall(item.encounterId);

    await db.insert(systemAuditLogs).values({
      facilityId: user.facilityId,
      userId: user.id,
      actorRole: user.role,
      action: 'CHARGE_ITEM_UPDATED',
      resourceType: 'chargemaster_items',
      resourceId: item.id,
      previousState: { grossAmount: item.grossAmount, description: item.description, quantity: item.quantity, unitPrice: item.unitPrice },
      newState: updates,
      ipAddress: c.req.header('x-forwarded-for') || '127.0.0.1',
      userAgent: c.req.header('user-agent')
    });

    const updatedEncounter = await getHydratedEncounter(item.encounterId);
    return c.json({
      success: true,
      item: updated[0],
      encounter: updatedEncounter
    });
  }
);

// 3. DELETE /api/v1/charges/:id - Delete charge line item
chargesApp.delete(
  '/charges/:id',
  requireAuth,
  requireRole(['BILLING_SPECIALIST', 'HOSPITAL_CFO']),
  async (c) => {
    const chargeId = c.req.param('id');
    const user = c.get('user');

    const itemList = await db
      .select()
      .from(chargemasterItems)
      .where(matchChargeItemCondition(chargeId))
      .limit(1);

    if (itemList.length === 0) {
      return apiError(c, 404, 'NOT_FOUND', `Charge item ${chargeId} not found.`);
    }

    const item = itemList[0];
    const encounterId = item.encounterId;

    await db.delete(chargemasterItems).where(eq(chargemasterItems.id, item.id));

    // Authoritatively re-balance waterfall after item removal
    await recalculateAndPersistWaterfall(encounterId);

    await db.insert(systemAuditLogs).values({
      facilityId: user.facilityId,
      userId: user.id,
      actorRole: user.role,
      action: 'CHARGE_ITEM_DELETED',
      resourceType: 'chargemaster_items',
      resourceId: item.id,
      previousState: { grossAmount: item.grossAmount, description: item.description },
      ipAddress: c.req.header('x-forwarded-for') || '127.0.0.1',
      userAgent: c.req.header('user-agent')
    });

    const updatedEncounter = await getHydratedEncounter(encounterId);
    return c.json({
      success: true,
      deletedId: item.id,
      encounter: updatedEncounter
    });
  }
);

export default chargesApp;
