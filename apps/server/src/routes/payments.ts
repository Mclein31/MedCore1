import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { eq } from 'drizzle-orm';
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
import { generateGatePassHmac, generateDeterministicExitPin, resolveGatePassSecret } from '../services/gatePassService';
import { apiError } from '../middleware/error';
import { requireAuth, requireRole } from '../middleware/auth';
import { getHydratedEncounter, invalidateEncountersCache } from './encounters';
import { encounterAccessCondition, isCentavoAmount } from '../utils/encounterAccess';
import { getClientIp } from '../utils/clientIp';
import { processSimulatedPayment } from '../services/simulatedPaymentService';

const paymentsApp = new Hono();

const paymentSchema = z.object({
  amount: z.number().positive().refine(isCentavoAmount, 'Enter a positive amount with at most two decimal places.'),
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
  cardBrand: z.enum(['VISA', 'MASTERCARD']).optional(),
  cardLast4: z.string().regex(/^\d{4}$/).optional(),
  bankName: z.string().max(64).optional(),
  notes: z.string().optional()
}).strict(); // PANs, CVVs, expiry and provider credentials are never accepted.

paymentsApp.post(
  '/:id/payments',
  requireAuth,
  requireRole(['BILLING_SPECIALIST', 'PATIENT_GUARANTOR', 'HOSPITAL_CFO']),
  zValidator('json', paymentSchema),
  async (c) => {
    const encIdOrNumber = c.req.param('id');
    if (!encIdOrNumber) return apiError(c, 400, 'MISSING_ID', 'A record identifier is required.');
    const { amount, paymentRail, payerName, payerContactMasked, cardBrand, cardLast4, bankName, notes } = c.req.valid('json');
    const user = c.get('user');
    if (user.role === 'PATIENT_GUARANTOR' && !['GCASH', 'MAYA', 'CREDIT_DEBIT_CARD', 'BANK_TRANSFER', 'QR_PH'].includes(paymentRail)) {
      return apiError(c, 400, 'INVALID_PAYMENT_METHOD', 'Please choose an available online payment method.');
    }

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
    if (user.role === 'PATIENT_GUARANTOR' && !headerKey?.trim()) {
      return apiError(c, 400, 'IDEMPOTENCY_KEY_REQUIRED', 'A payment request reference is required. Please try again.');
    }
    if (user.role === 'PATIENT_GUARANTOR' && paymentRail === 'CREDIT_DEBIT_CARD' && (!cardBrand || !cardLast4)) {
      return apiError(c, 400, 'CARD_DETAILS_REQUIRED', 'Please review your card details.');
    }
    if (user.role === 'PATIENT_GUARANTOR' && paymentRail === 'BANK_TRANSFER' && !['BPI', 'BDO', 'Bank of the Philippine Islands (BPI)', 'BDO Unibank', 'UnionBank of the Philippines', 'Metrobank'].includes(bankName || '')) {
      return apiError(c, 400, 'BANK_REQUIRED', 'Please select an available bank.');
    }

    const accessCondition = await encounterAccessCondition(user, encIdOrNumber);
    let txResult;
    try {
      txResult = await db.transaction(async (tx) => {
        // Serializes different payment keys and promissory notes for this stay.
        const encList = await tx.select().from(encounters)
          .where(accessCondition).limit(1).for('update');
        if (encList.length === 0) return apiError(c, 404, 'NOT_FOUND', 'Encounter not found.');
        const enc = encList[0];

        const existing = await tx.select().from(payments)
          .where(eq(payments.idempotencyKey, rawIdempotencyKey)).limit(1);
        if (existing.length > 0) {
          const payment = existing[0];
          if (payment.encounterId !== enc.id || Number(payment.amount) !== amount ||
              payment.paymentRail !== paymentRail || payment.payerName !== payerName ||
              payment.payerContactMasked !== payerContactMasked ||
              (payment.cardBrand ?? null) !== (cardBrand ?? null) ||
              (payment.cardLast4 ?? null) !== (cardLast4 ?? null) ||
              (payment.bankName ?? null) !== (bankName ?? null) ||
              (payment.notes ?? null) !== (notes ?? null)) {
            return apiError(c, 409, 'IDEMPOTENCY_CONFLICT', 'This payment reference was already used for another request.');
          }
          const receipt = await tx.select().from(paymentReceipts)
            .where(eq(paymentReceipts.paymentId, payment.id)).limit(1);
          const pass = await tx.select().from(dischargePasses)
            .where(eq(dischargePasses.encounterId, enc.id)).limit(1);
          return { paymentRecord: payment, receiptRecord: receipt[0] || null,
            gatePassRecord: pass[0] || null, encounterId: enc.id, cached: true };
        }

        if (enc.stage !== 'PENDING_SETTLEMENT') return apiError(c, 409, 'STAGE_NOT_READY', 'Bill settlement is locked until encounter reaches PENDING_SETTLEMENT.');
        const remainingCents = Math.round(Number(enc.remainingBalance) * 100);
        const amountCents = Math.round(amount * 100);
        const paidCents = Math.round(Number(enc.amountPaid) * 100);
        if (!Number.isSafeInteger(remainingCents) || !Number.isSafeInteger(paidCents)) {
          return apiError(c, 500, 'INVALID_BALANCE', 'This statement needs review by the hospital billing team.');
        }
        if (remainingCents <= 0) {
          return apiError(c, 400, 'ALREADY_SETTLED', 'This statement is already fully settled (Remaining Balance: ₱0.00).');
        }
        if (amountCents > remainingCents) {
          return apiError(c, 400, 'EXCEEDS_BALANCE', 'The payment amount cannot exceed the remaining balance.');
        }
        // A backend-owned result precedes any ledger mutation. The processor
        // intentionally remains simulated in both local and hosted builds.
        const processed = await processSimulatedPayment(paymentRail);
        const now = processed.settledAt;
        const paymentRef = processed.paymentReference;
        const orNumber = processed.officialReceiptNumber;
        const authCode = processed.gatewayAuthCode;
        const statementNumber = enc.billNumber || `SOA-SJMC-26-${enc.encounterNumber.replace(/\D/g, '') || '8812'}`;
        const newAmountPaid = (paidCents + amountCents) / 100;
        const newRemaining = (remainingCents - amountCents) / 100;
        const isFullySettled = newRemaining === 0;
        const releasePass = isFullySettled && enc.stage === 'PENDING_SETTLEMENT';

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
            channelReference: processed.channelReference,
            gatewayAuthCode: authCode,
            officialReceiptNumber: orNumber,
            payerName,
            payerContactMasked,
            cardBrand: cardBrand ?? null,
            cardLast4: cardLast4 ?? null,
            bankName: bankName ?? null,
            status: processed.status,
            isSimulatedDemo: processed.isSimulatedDemo,
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
        if (releasePass) {
          const passNumber = `PASS-MC-${Math.floor(10000 + Math.random() * 90000)}`;
          const nodeEnv =
            (c.env as any)?.NODE_ENV ||
            (typeof process !== 'undefined' ? process.env.NODE_ENV : undefined) ||
            'development';
          const isProduction = nodeEnv === 'production';
          const secretKey = resolveGatePassSecret((c.env as any)?.GATE_PASS_SECRET, isProduction);
          const hmac = await generateGatePassHmac(enc.id, newAmountPaid, now.toISOString(), secretKey);
          const exitPin = await generateDeterministicExitPin(passNumber, secretKey);

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
            stage: releasePass ? 'CLEARED_GATE_PASS' : enc.stage,
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
          ipAddress: getClientIp(c),
          userAgent: c.req.header('user-agent')
        });

        return { paymentRecord, receiptRecord: insertedReceipts[0], gatePassRecord,
          encounterId: enc.id, cached: false };
      });
    } catch (err: unknown) {
      const cause = err as { code?: string; detail?: string; constraint?: string; cause?: { code?: string; detail?: string; constraint?: string } };
      const pgError = cause.cause || cause;
      // The same key racing on a different stay must not disclose that payment.
      if (pgError.code === '23505' &&
          (pgError.detail?.includes('idempotency_key') || pgError.constraint?.includes('idempotency_key'))) {
        return apiError(c, 409, 'IDEMPOTENCY_CONFLICT', 'This payment reference was already used for another request.');
      }
      throw err;
    }

    if (txResult instanceof Response) return txResult;
    if (!txResult.cached) invalidateEncountersCache();
    const patientResponse = user.role === 'PATIENT_GUARANTOR';
    const payment = txResult.paymentRecord;
    const receipt = txResult.receiptRecord;
    const pass = txResult.gatePassRecord;
    return c.json({
      success: true,
      cached: txResult.cached,
      payment: patientResponse ? {
        id: payment.id, paymentReference: payment.paymentReference, amount: Number(payment.amount),
        paymentRail: payment.paymentRail, status: payment.status,
        officialReceiptNumber: payment.officialReceiptNumber, payerName: payment.payerName,
        billReference: payment.statementNumber,
        createdAt: payment.createdAt, settledAt: payment.settledAt, isSimulatedDemo: payment.isSimulatedDemo
      } : payment,
      receipt: patientResponse && receipt ? {
        id: receipt.id, receiptNumber: receipt.receiptNumber,
        officialReceiptNumber: receipt.officialReceiptNumber, amount: Number(receipt.amount),
        paymentRail: receipt.paymentRail, payerName: receipt.payerName, issuedAt: receipt.issuedAt,
        paymentReference: payment.paymentReference, billReference: payment.statementNumber, status: payment.status
      } : receipt,
      dischargePass: patientResponse && pass ? { passNumber: pass.passNumber, status: pass.status } : pass,
      encounter: patientResponse ? undefined : await getHydratedEncounter(txResult.encounterId)
    });
  }
);

export default paymentsApp;
