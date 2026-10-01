import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { eq, or } from 'drizzle-orm';
import { db } from '../db';
import {
  payments,
  paymentReceipts,
  encounters,
  statutoryWaterfalls,
  dischargePasses,
  beds,
  encounterTimelineEvents,
  systemAuditLogs
} from '../db/schema';
import { generateGatePassHmac, generateDeterministicExitPin } from '../services/gatePassService';
import { apiError } from '../middleware/error';
import { requireAuth, requireRole } from '../middleware/auth';
import { getHydratedEncounter } from './encounters';
import { matchEncounterCondition } from '../utils/dbQuery';

const paymentsApp = new Hono();

const paymentSchema = z.object({
  amount: z.number().positive(),
  paymentRail: z.enum([
    'QR_PH',
    'GCASH',
    'MAYA',
    'CREDIT_DEBIT_CARD',
    'BANK_TRANSFER',
    'PROMISSORY_NOTE',
    'CASHIER_OVER_THE_COUNTER'
  ]),
  payerName: z.string().min(2),
  payerContactMasked: z.string().default('0917-***-****'),
  notes: z.string().optional()
});

paymentsApp.post(
  '/:id/payments',
  requireAuth,
  requireRole(['BILLING_SPECIALIST', 'PATIENT_GUARANTOR', 'HOSPITAL_CFO']),
  zValidator('json', paymentSchema),
  async (c) => {
    const encIdOrNumber = c.req.param('id');
    const { amount, paymentRail, payerName, payerContactMasked, notes } = c.req.valid('json');
    const user = c.get('user');

    // Idempotency-Key Check
    const headerKey = c.req.header('idempotency-key');
    if (headerKey && headerKey.length > 128) {
      return apiError(
        c,
        400,
        'INVALID_IDEMPOTENCY_KEY',
        'Idempotency-Key header cannot exceed 128 characters.'
      );
    }
    const rawIdempotencyKey = headerKey || crypto.randomUUID();

    const existingPayment = await db
      .select()
      .from(payments)
      .where(eq(payments.idempotencyKey, rawIdempotencyKey))
      .limit(1);

    if (existingPayment.length > 0) {
      // Return cached payment immediately for idempotency guarantee
      const receipt = await db
        .select()
        .from(paymentReceipts)
        .where(eq(paymentReceipts.paymentId, existingPayment[0].id))
        .limit(1);

      const hydrated = await getHydratedEncounter(existingPayment[0].encounterId);
      return c.json({
        success: true,
        cached: true,
        payment: existingPayment[0],
        receipt: receipt[0] || null,
        encounter: hydrated
      });
    }

    const encList = await db
      .select()
      .from(encounters)
      .where(matchEncounterCondition(encIdOrNumber))
      .limit(1);

    if (encList.length === 0) {
      return apiError(c, 404, 'NOT_FOUND', `Encounter ${encIdOrNumber} not found.`);
    }

    const enc = encList[0];
    const currentRemaining = Number(enc.remainingBalance);

    if (currentRemaining <= 0 && paymentRail !== 'PROMISSORY_NOTE') {
      return apiError(
        c,
        400,
        'ALREADY_SETTLED',
        'This statement is already fully settled (Remaining Balance: ₱0.00).'
      );
    }

    if (amount > currentRemaining + 0.05) {
      return apiError(
        c,
        400,
        'EXCEEDS_BALANCE',
        `Payment amount (₱${amount.toFixed(2)}) cannot exceed remaining balance (₱${currentRemaining.toFixed(2)}).`
      );
    }

    const now = new Date();
    const paymentRef = `PAY-${enc.id.slice(0, 8).toUpperCase()}-${Date.now().toString().slice(-6)}`;
    const orNumber = `OR-SJMC-2026-${Math.floor(10000 + Math.random() * 90000)}`;
    const authCode = `AUTH-${Math.floor(10000 + Math.random() * 90000)}`;
    const statementNumber = enc.billNumber || `SOA-SJMC-26-${enc.encounterNumber.replace(/\D/g, '') || '8812'}`;

    const newAmountPaid = Number((Number(enc.amountPaid) + amount).toFixed(2));
    const newRemaining = Math.max(0, Number((currentRemaining - amount).toFixed(2)));
    const isFullySettled = newRemaining === 0;

    let txResult;
    try {
      txResult = await db.transaction(async (tx) => {
        // 1. Insert Payment
        const insertedPayments = await tx
          .insert(payments)
          .values({
            paymentReference: paymentRef,
            encounterId: enc.id,
            statementNumber,
            amount: amount.toFixed(2),
            currency: 'PHP',
            paymentRail,
            channelReference: `TXN-${paymentRail}-${Math.floor(100000 + Math.random() * 900000)}`,
            gatewayAuthCode: authCode,
            officialReceiptNumber: orNumber,
            payerName,
            payerContactMasked,
            status: 'SUCCESS',
            isSimulatedDemo: true,
            idempotencyKey: rawIdempotencyKey,
            notes,
            settledAt: now
          })
          .returning();

        const paymentRecord = insertedPayments[0];

        // 2. Insert Official Receipt
        const insertedReceipts = await tx
          .insert(paymentReceipts)
          .values({
            paymentId: paymentRecord.id,
            encounterId: enc.id,
            receiptNumber: `REC-${paymentRecord.id.slice(0, 8).toUpperCase()}`,
            officialReceiptNumber: orNumber,
            amount: amount.toFixed(2),
            paymentRail,
            payerName,
            payerContactMasked,
            gatewayAuthCode: authCode,
            issuedAt: now
          })
          .returning();

        // 3. If Fully Settled: Issue Gate Pass & Release Bed to Housekeeping
        let gatePassRecord = null;
        if (isFullySettled) {
          const passNumber = `PASS-MC-${Math.floor(10000 + Math.random() * 90000)}`;
          const hmac = await generateGatePassHmac(enc.id, newAmountPaid, now.toISOString());
          const exitPin = generateDeterministicExitPin(passNumber);

          const insertedPasses = await tx
            .insert(dischargePasses)
            .values({
              passNumber,
              encounterId: enc.id,
              patientName: payerName,
              roomBed: enc.roomBed,
              settledAmount: newAmountPaid.toFixed(2),
              settlementChannel: paymentRail,
              hmacSignature: hmac,
              exitPin,
              status: 'ACTIVE_READY_FOR_EXIT',
              issuedAt: now
            })
            .returning();

          gatePassRecord = insertedPasses[0];

          if (enc.bedId) {
            await tx
              .update(beds)
              .set({
                status: 'HOUSEKEEPING',
                currentEncounterId: null,
                updatedAt: now
              })
              .where(eq(beds.id, enc.bedId));
          }
        }

        // 4. Update Encounter and Waterfall
        await tx
          .update(encounters)
          .set({
            amountPaid: newAmountPaid.toFixed(2),
            remainingBalance: newRemaining.toFixed(2),
            billState: isFullySettled ? 'PAID' : 'PARTIALLY_PAID',
            stage: isFullySettled ? 'CLEARED_GATE_PASS' : enc.stage,
            updatedAt: now
          })
          .where(eq(encounters.id, enc.id));

        await tx
          .update(statutoryWaterfalls)
          .set({
            patientPaid: newAmountPaid.toFixed(2),
            reconciledAt: now
          })
          .where(eq(statutoryWaterfalls.encounterId, enc.id));

        // 5. Timeline Event
        await tx.insert(encounterTimelineEvents).values({
          encounterId: enc.id,
          eventType: 'BILLING',
          title: `Payment Received via ${paymentRail} (₱${amount.toLocaleString()})`,
          description: `Official Receipt ${orNumber} issued to ${payerName}. Remaining Balance: ₱${newRemaining.toLocaleString()}`,
          actorId: user.id,
          actorName: user.fullName,
          status: 'COMPLETED'
        });

        // 6. System Audit Log
        await tx.insert(systemAuditLogs).values({
          facilityId: enc.facilityId,
          userId: user.id,
          actorRole: user.role,
          action: 'PAYMENT_SETTLED',
          resourceType: 'payments',
          resourceId: paymentRecord.id,
          newState: {
            paymentRef,
            amount,
            paymentRail,
            orNumber,
            newRemaining,
            isFullySettled
          },
          ipAddress: c.req.header('x-forwarded-for') || '127.0.0.1',
          userAgent: c.req.header('user-agent')
        });

        return {
          paymentRecord,
          receiptRecord: insertedReceipts[0],
          gatePassRecord
        };
      });
    } catch (err: any) {
      // Concurrency race guard: if duplicate key inserted concurrently, return cached record
      if (err?.code === '23505' && (err?.detail?.includes('idempotency_key') || err?.constraint?.includes('idempotency_key'))) {
        const existing = await db
          .select()
          .from(payments)
          .where(eq(payments.idempotencyKey, rawIdempotencyKey))
          .limit(1);

        if (existing.length > 0) {
          const receipt = await db
            .select()
            .from(paymentReceipts)
            .where(eq(paymentReceipts.paymentId, existing[0].id))
            .limit(1);

          const hydrated = await getHydratedEncounter(existing[0].encounterId);
          return c.json({
            success: true,
            cached: true,
            payment: existing[0],
            receipt: receipt[0] || null,
            encounter: hydrated
          });
        }
      }
      throw err;
    }

    const updated = await getHydratedEncounter(enc.id);
    return c.json({
      success: true,
      payment: txResult.paymentRecord,
      receipt: txResult.receiptRecord,
      dischargePass: txResult.gatePassRecord,
      encounter: updated
    });
  }
);

export default paymentsApp;
