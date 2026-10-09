import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { eq, and, inArray } from 'drizzle-orm';
import { db } from '../db';
import { chargemasterItems, encounters, systemAuditLogs, billingDisputes } from '../db/schema';
import { apiError } from '../middleware/error';
import { requireAuth, requireRole } from '../middleware/auth';
import { getHydratedEncounter, invalidateEncountersCache } from './encounters';
import { matchEncounterCondition, matchChargeItemCondition } from '../utils/dbQuery';
import { recalculateAndPersistWaterfall } from '../services/waterfallPersistence';
import { getClientIp } from '../utils/clientIp';
import { isCentavoAmount } from '../utils/encounterAccess';

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
  grossAmount: z.number().positive().refine(isCentavoAmount, 'Enter an exact centavo amount.'),
  qty: z.number().positive().optional(),
  quantity: z.number().positive().optional(),
  unitPrice: z.number().nonnegative().refine(value => value === 0 || isCentavoAmount(value), 'Enter an exact centavo amount.').optional(),
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
    if (!encIdOrNumber) return apiError(c, 400, 'MISSING_ID', 'A record identifier is required.');
    const { description, category, grossAmount, qty, quantity, unitPrice, code, coverageType } = c.req.valid('json');
    const user = c.get('user');

    const result = await db.transaction(async (tx) => {
    const encList = await tx
      .select()
      .from(encounters)
      .where(and(matchEncounterCondition(encIdOrNumber), eq(encounters.facilityId, user.facilityId)))
      .limit(1).for('update');

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

    const inserted = await tx
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
    await recalculateAndPersistWaterfall(enc.id, undefined, tx);

    // Compliance audit trail
    await tx.insert(systemAuditLogs).values({
      facilityId: enc.facilityId,
      userId: user.id,
      actorRole: user.role,
      action: 'CHARGE_ITEM_ADDED',
      resourceType: 'chargemaster_items',
      resourceId: newItem.id,
      newState: { description, category, grossAmount, quantity: resolvedQty, unitPrice: resolvedUnitPrice, code: generatedCode, coverageType },
      ipAddress: getClientIp(c),
      userAgent: c.req.header('user-agent')
    });

      return { item: newItem, encounterId: enc.id };
    });
    if (result instanceof Response) return result;
    invalidateEncountersCache();
    const updatedEncounter = await getHydratedEncounter(result.encounterId);
    return c.json({
      success: true,
      item: result.item,
      encounter: updatedEncounter
    });
  }
);

// 2. PATCH /api/v1/charges/:id - Edit charge line item
const editChargeSchema = z.object({
  description: z.string().min(2).max(256).optional(),
  grossAmount: z.number().positive().refine(isCentavoAmount, 'Enter an exact centavo amount.').optional(),
  qty: z.number().positive().optional(),
  quantity: z.number().positive().optional(),
  unitPrice: z.number().nonnegative().refine(value => value === 0 || isCentavoAmount(value), 'Enter an exact centavo amount.').optional(),
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
    if (!chargeId) return apiError(c, 400, 'MISSING_ID', 'A record identifier is required.');
    const updates = c.req.valid('json');
    const user = c.get('user');

    const result = await db.transaction(async (tx) => {
    const itemList = await tx
      .select()
      .from(chargemasterItems)
      .where(and(matchChargeItemCondition(chargeId), inArray(chargemasterItems.encounterId, tx.select({ id: encounters.id }).from(encounters).where(eq(encounters.facilityId, user.facilityId)))))
      .limit(1);

    if (itemList.length === 0) {
      return apiError(c, 404, 'NOT_FOUND', `Charge item ${chargeId} not found.`);
    }

    let item = itemList[0];
    const locked = await tx.select({ id: encounters.id }).from(encounters)
      .where(and(eq(encounters.id, item.encounterId), eq(encounters.facilityId, user.facilityId)))
      .limit(1).for('update');
    if (!locked.length) return apiError(c, 404, 'NOT_FOUND', 'Encounter not found.');
    const fresh = await tx.select().from(chargemasterItems)
      .where(and(eq(chargemasterItems.id, item.id), eq(chargemasterItems.encounterId, item.encounterId)))
      .limit(1).for('update');
    if (!fresh.length) return apiError(c, 404, 'NOT_FOUND', 'Charge not found.');
    item = fresh[0];



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

    const updated = await tx
      .update(chargemasterItems)
      .set(patchPayload)
      .where(eq(chargemasterItems.id, item.id))
      .returning();

    // Authoritative statutory recalculation
    await recalculateAndPersistWaterfall(item.encounterId, undefined, tx);

    await tx.insert(systemAuditLogs).values({
      facilityId: user.facilityId,
      userId: user.id,
      actorRole: user.role,
      action: 'CHARGE_ITEM_UPDATED',
      resourceType: 'chargemaster_items',
      resourceId: item.id,
      previousState: { grossAmount: item.grossAmount, description: item.description, quantity: item.quantity, unitPrice: item.unitPrice },
      newState: updates,
      ipAddress: getClientIp(c),
      userAgent: c.req.header('user-agent')
    });

      return { item: updated[0], encounterId: item.encounterId };
    });
    if (result instanceof Response) return result;
    invalidateEncountersCache();
    const updatedEncounter = await getHydratedEncounter(result.encounterId);
    return c.json({
      success: true,
      item: result.item,
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
    if (!chargeId) return apiError(c, 400, 'MISSING_ID', 'A record identifier is required.');
    const user = c.get('user');

    const result = await db.transaction(async (tx) => {
    const itemList = await tx
      .select()
      .from(chargemasterItems)
      .where(and(matchChargeItemCondition(chargeId), inArray(chargemasterItems.encounterId, tx.select({ id: encounters.id }).from(encounters).where(eq(encounters.facilityId, user.facilityId)))))
      .limit(1);

    if (itemList.length === 0) {
      return apiError(c, 404, 'NOT_FOUND', `Charge item ${chargeId} not found.`);
    }

    let item = itemList[0];
    const locked = await tx.select({ id: encounters.id }).from(encounters)
      .where(and(eq(encounters.id, item.encounterId), eq(encounters.facilityId, user.facilityId)))
      .limit(1).for('update');
    if (!locked.length) return apiError(c, 404, 'NOT_FOUND', 'Encounter not found.');
    const fresh = await tx.select().from(chargemasterItems)
      .where(and(eq(chargemasterItems.id, item.id), eq(chargemasterItems.encounterId, item.encounterId)))
      .limit(1).for('update');
    if (!fresh.length) return apiError(c, 404, 'NOT_FOUND', 'Charge not found.');
    item = fresh[0];


    const encounterId = item.encounterId;

    // Guard against foreign key constraint violation (onDelete: 'restrict') on disputed charges
    const linkedDisputes = await tx
      .select({ id: billingDisputes.id })
      .from(billingDisputes)
      .where(eq(billingDisputes.chargeId, item.id))
      .limit(1);

    if (linkedDisputes.length > 0) {
      return apiError(
        c,
        400,
        'ITEM_HAS_DISPUTES',
        'Cannot delete a chargemaster item with an active or logged billing dispute. Resolve or archive the dispute first.'
      );
    }

    await tx.delete(chargemasterItems).where(eq(chargemasterItems.id, item.id));

    // Authoritatively re-balance waterfall after item removal
    await recalculateAndPersistWaterfall(encounterId, undefined, tx);

    await tx.insert(systemAuditLogs).values({
      facilityId: user.facilityId,
      userId: user.id,
      actorRole: user.role,
      action: 'CHARGE_ITEM_DELETED',
      resourceType: 'chargemaster_items',
      resourceId: item.id,
      previousState: { grossAmount: item.grossAmount, description: item.description },
      ipAddress: getClientIp(c),
      userAgent: c.req.header('user-agent')
    });

      return { deletedId: item.id, encounterId: item.encounterId };
    });
    if (result instanceof Response) return result;
    invalidateEncountersCache();
    const updatedEncounter = await getHydratedEncounter(result.encounterId);
    return c.json({
      success: true,
      deletedId: result.deletedId,
      encounter: updatedEncounter
    });
  }
);

export default chargesApp;
