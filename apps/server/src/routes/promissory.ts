import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '../db';
import {
  promissoryNotes,
  encounters,
  dischargePasses,
  beds,
  encounterTimelineEvents,
  systemAuditLogs
} from '../db/schema';
import { computePromissorySchedule } from '../services/promissoryEngine';
import { generateGatePassHmac, generateDeterministicExitPin, resolveGatePassSecret } from '../services/gatePassService';
import { apiError } from '../middleware/error';
import { requireAuth, requireRole } from '../middleware/auth';
import { getHydratedEncounter, invalidateEncountersCache } from './encounters';
import { encounterAccessCondition, isCentavoAmount } from '../utils/encounterAccess';
import { getClientIp } from '../utils/clientIp';
import { validateGovernmentId } from '../../../shared/governmentId';

const promissoryApp = new Hono();

// GET /api/v1/promissory-notes
promissoryApp.get('/', requireAuth, async (c) => {
  const notes = await db
    .select({ note: promissoryNotes, enc: encounters })
    .from(promissoryNotes)
    .innerJoin(encounters, eq(encounters.id, promissoryNotes.encounterId))
    .where(eq(encounters.facilityId, c.get('user').facilityId))
    .orderBy(desc(promissoryNotes.createdAt));

  return c.json({
    items: notes.map((row) => {
      const isEncSettled = Number(row.enc.remainingBalance) <= 0 || row.enc.billState === 'PAID';
      return {
        ...row.note,
        status: (isEncSettled && row.note.status === 'ACTIVE') ? 'SETTLED' : row.note.status
      };
    }),
    total: notes.length
  });
});

// POST /api/v1/encounters/:id/promissory-notes
const promissorySchema = z.object({
  borrowerName: z.string().min(2).max(128),
  borrowerRelationship: z.enum(['PATIENT', 'SPOUSE', 'CHILD', 'GUARANTOR']).default('GUARANTOR'),
  borrowerIdType: z.enum(['PHILSYS_NATIONAL_ID', 'UMID', 'DRIVERS_LICENSE', 'PASSPORT']),
  borrowerIdNumber: z.string().min(1).max(64),
  installmentMonths: z.union([z.literal(3), z.literal(6), z.literal(12)]),
  principalAmount: z.number().positive().refine(isCentavoAmount, 'Enter a positive amount with at most two decimal places.')
}).superRefine((value, ctx) => {
  const id = validateGovernmentId(value.borrowerIdType, value.borrowerIdNumber);
  if (!id.valid) ctx.addIssue({ code: 'custom', path: ['borrowerIdNumber'], message: id.error });
}).transform(value => {
  const id = validateGovernmentId(value.borrowerIdType, value.borrowerIdNumber);
  return { ...value, borrowerIdNumber: id.valid ? id.normalized : value.borrowerIdNumber };
});

promissoryApp.post(
  '/encounters/:id/promissory-notes',
  requireAuth,
  requireRole(['BILLING_SPECIALIST', 'PATIENT_GUARANTOR', 'HOSPITAL_CFO']),
  zValidator('json', promissorySchema, (result, c) => {
    if (!result.success) {
      const idIssue = result.error.issues.find(issue => issue.path[0] === 'borrowerIdNumber' || issue.path[0] === 'borrowerIdType');
      return apiError(c, 400, idIssue ? 'INVALID_GOVERNMENT_ID' : 'INVALID_PROMISSORY_DETAILS', idIssue?.message || 'Check your payment plan details and try again.');
    }
  }),
  async (c) => {
    const encIdOrNumber = c.req.param('id');
    if (!encIdOrNumber) return apiError(c, 400, 'MISSING_ID', 'A record identifier is required.');
    const params = c.req.valid('json');
    const user = c.get('user');

    const accessCondition = await encounterAccessCondition(user, encIdOrNumber);
    const txResult = await db.transaction(async (tx) => {
      const encList = await tx.select().from(encounters)
        .where(accessCondition).limit(1).for('update');
      if (encList.length === 0) return apiError(c, 404, 'NOT_FOUND', 'Encounter not found.');
      const enc = encList[0];

      // Recover an uncertain response without signing a second legal agreement.
      const activeNotes = await tx.select().from(promissoryNotes)
        .where(and(eq(promissoryNotes.encounterId, enc.id), eq(promissoryNotes.status, 'ACTIVE')))
        .orderBy(desc(promissoryNotes.createdAt)).limit(1);
      if (activeNotes.length > 0) {
        const note = activeNotes[0];
        const storedId = validateGovernmentId(note.borrowerIdType, note.borrowerIdNumber);
        if (Number(note.principalAmount) !== params.principalAmount ||
            note.installmentMonths !== params.installmentMonths ||
            note.borrowerName !== params.borrowerName ||
            note.borrowerRelationship !== params.borrowerRelationship ||
            note.borrowerIdType !== params.borrowerIdType ||
            !storedId.valid || storedId.normalized !== params.borrowerIdNumber) {
          return apiError(c, 409, 'ACTIVE_PROMISSORY_NOTE', 'An active promissory note already exists for this stay. Contact the hospital billing desk to review it.');
        }
        const passes = await tx.select().from(dischargePasses)
          .where(eq(dischargePasses.promissoryNoteId, note.id)).limit(1);
        return { promissoryNote: note, dischargePass: passes[0] || null, encounterId: enc.id, cached: true };
      }

      if (enc.stage !== 'PENDING_SETTLEMENT') return apiError(c, 409, 'STAGE_NOT_READY', 'Promissory notes can only be executed at PENDING_SETTLEMENT stage.');
      const nodeEnv = (c.env as { NODE_ENV?: string })?.NODE_ENV || process.env.NODE_ENV || 'development';
      if (user.role === 'PATIENT_GUARANTOR' && nodeEnv === 'production') return apiError(c, 403, 'ONLINE_NOTE_UNAVAILABLE', 'Online promissory notes are not available yet. Please contact the hospital billing desk.');
      const remainingCents = Math.round(Number(enc.remainingBalance) * 100);
      const principalCents = Math.round(params.principalAmount * 100);
      if (!Number.isSafeInteger(remainingCents)) {
        return apiError(c, 500, 'INVALID_BALANCE', 'This statement needs review by the hospital billing team.');
      }
      if (remainingCents <= 0) {
        return apiError(c, 400, 'ALREADY_SETTLED', 'This statement is already fully settled.');
      }
      if (principalCents > remainingCents) {
        return apiError(c, 400, 'EXCEEDS_BALANCE', 'The financed amount cannot exceed the remaining balance.');
      }
      const plan = computePromissorySchedule(params.principalAmount, params.installmentMonths);
      const now = new Date();
      const noteNumber = `PN-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      const signatureHash = `sig_ra9439_${Math.random().toString(36).substring(2, 12)}_${Date.now()}`;

      // 1. Insert promissory note
      const insertedNotes = await tx
        .insert(promissoryNotes)
        .values({
          noteNumber,
          encounterId: enc.id,
          borrowerName: params.borrowerName,
          borrowerRelationship: params.borrowerRelationship,
          borrowerIdType: params.borrowerIdType,
          borrowerIdNumber: params.borrowerIdNumber,
          principalAmount: plan.financedAmount.toFixed(2),
          interestRate: '0.0000',
          financingFee: '0.00',
          totalRepayment: plan.totalRepayment.toFixed(2),
          installmentMonths: params.installmentMonths,
          monthlyInstallment: plan.monthlyInstallment.toFixed(2),
          scheduleJson: plan.schedule,
          firstDueDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
          digitalSignatureTimestamp: now,
          digitalSignatureHash: signatureHash,
          status: 'ACTIVE'
        })
        .returning();

      const newRemaining = (remainingCents - principalCents) / 100;

      // 2. If covered / zero remaining: advance stage to CLEARED_GATE_PASS
      let passRecord = null;
      const isCleared = newRemaining === 0 && enc.stage === 'PENDING_SETTLEMENT';

      if (isCleared) {
        const passNumber = `PASS-MC-${Math.floor(10000 + Math.random() * 90000)}`;
        const nodeEnv =
          (c.env as any)?.NODE_ENV ||
          (typeof process !== 'undefined' ? process.env.NODE_ENV : undefined) ||
          'development';
        const isProduction = nodeEnv === 'production';
        const secretKey = resolveGatePassSecret((c.env as any)?.GATE_PASS_SECRET, isProduction);
        const hmac = await generateGatePassHmac(enc.id, params.principalAmount, now.toISOString(), secretKey);
        const exitPin = await generateDeterministicExitPin(passNumber, secretKey);

        const insertedPasses = await tx
          .insert(dischargePasses)
          .values({
            passNumber,
            encounterId: enc.id,
            patientName: params.borrowerName,
            roomBed: enc.roomBed,
            settledAmount: params.principalAmount.toFixed(2),
            settlementChannel: 'PROMISSORY_NOTE',
            promissoryNoteId: insertedNotes[0].id,
            hmacSignature: hmac,
            exitPin,
            status: 'ACTIVE_READY_FOR_EXIT',
            issuedAt: now
          })
          .returning();

        passRecord = insertedPasses[0];

        // Update bed status to HOUSEKEEPING
        if (enc.bedId) {
          await tx
            .update(beds)
            .set({
              status: 'HOUSEKEEPING',
              currentEncounterId: null,
              updatedAt: now
            })
            .where(and(eq(beds.id, enc.bedId), eq(beds.currentEncounterId, enc.id), eq(beds.facilityId, user.facilityId)));
        }
      }

      // 3. Update encounter
      await tx
        .update(encounters)
        .set({
          remainingBalance: newRemaining.toFixed(2),
          stage: isCleared ? 'CLEARED_GATE_PASS' : enc.stage,
          updatedAt: now
        })
        .where(eq(encounters.id, enc.id));

      // 4. Timeline event
      await tx.insert(encounterTimelineEvents).values({
        encounterId: enc.id,
        eventType: 'LEGAL',
        title: `RA 9439 0% Promissory Note Executed (${params.installmentMonths} Months)`,
        description: `Financed ₱${params.principalAmount.toLocaleString()} for ${params.borrowerName}. Zero interest applied.`,
        actorId: user.id,
        actorName: user.fullName,
        status: 'COMPLETED'
      });

      // 5. Audit log
      await tx.insert(systemAuditLogs).values({
        facilityId: enc.facilityId,
        userId: user.id,
        actorRole: user.role,
        action: 'PROMISSORY_NOTE_EXECUTED',
        resourceType: 'promissory_notes',
        resourceId: insertedNotes[0].id,
        newState: { noteNumber, principal: params.principalAmount, months: params.installmentMonths },
        ipAddress: getClientIp(c),
        userAgent: c.req.header('user-agent')
      });

      return { promissoryNote: insertedNotes[0], dischargePass: passRecord, encounterId: enc.id, cached: false };
    });

    if (txResult instanceof Response) return txResult;
    if (!txResult.cached) invalidateEncountersCache();
    const patientResponse = user.role === 'PATIENT_GUARANTOR';
    const note = txResult.promissoryNote;
    const pass = txResult.dischargePass;
    return c.json({
      success: true,
      cached: txResult.cached,
      promissoryNote: patientResponse ? {
        id: note.id, noteNumber: note.noteNumber, borrowerName: note.borrowerName,
        principalAmount: Number(note.principalAmount), interestRate: Number(note.interestRate),
        financingFee: Number(note.financingFee), totalRepayment: Number(note.totalRepayment),
        installmentMonths: note.installmentMonths, monthlyInstallment: Number(note.monthlyInstallment),
        scheduleJson: note.scheduleJson, firstDueDate: note.firstDueDate, status: note.status,
        executedAt: note.digitalSignatureTimestamp
      } : note,
      dischargePass: patientResponse && pass ? { passNumber: pass.passNumber, status: pass.status } : pass,
      encounter: patientResponse ? undefined : await getHydratedEncounter(txResult.encounterId)
    });
  }
);

export default promissoryApp;
