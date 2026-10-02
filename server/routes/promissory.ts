import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { eq, or, desc } from 'drizzle-orm';
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
import { generateGatePassHmac, generateDeterministicExitPin } from '../services/gatePassService';
import { apiError } from '../middleware/error';
import { requireAuth, requireRole } from '../middleware/auth';
import { getHydratedEncounter } from './encounters';
import { matchEncounterCondition } from '../utils/dbQuery';

const promissoryApp = new Hono();

// GET /api/v1/promissory-notes
promissoryApp.get('/', requireAuth, async (c) => {
  const notes = await db
    .select()
    .from(promissoryNotes)
    .orderBy(desc(promissoryNotes.createdAt));

  return c.json({
    items: notes,
    total: notes.length
  });
});

// POST /api/v1/encounters/:id/promissory-notes
const promissorySchema = z.object({
  borrowerName: z.string().min(2).max(128),
  borrowerRelationship: z.enum(['PATIENT', 'SPOUSE', 'CHILD', 'GUARANTOR']).default('GUARANTOR'),
  borrowerIdType: z.enum(['PHILSYS_NATIONAL_ID', 'UMID', 'DRIVERS_LICENSE', 'PASSPORT']),
  borrowerIdNumber: z.string().min(4),
  installmentMonths: z.union([z.literal(3), z.literal(6), z.literal(12)]),
  principalAmount: z.number().positive()
});

promissoryApp.post(
  '/encounters/:id/promissory-notes',
  requireAuth,
  requireRole(['BILLING_SPECIALIST', 'PATIENT_GUARANTOR', 'HOSPITAL_CFO']),
  zValidator('json', promissorySchema),
  async (c) => {
    const encIdOrNumber = c.req.param('id');
    const params = c.req.valid('json');
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
    const plan = computePromissorySchedule(params.principalAmount, params.installmentMonths);
    const now = new Date();
    const noteNumber = `PN-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    // Digital signature hash
    const signatureHash = `sig_ra9439_${Math.random().toString(36).substring(2, 12)}_${Date.now()}`;

    // Atomic transaction for promissory note, gate pass issuance, encounter stage, and audit logging
    const txResult = await db.transaction(async (tx) => {
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
          firstDueDate: new Date('2026-10-25'),
          digitalSignatureTimestamp: now,
          digitalSignatureHash: signatureHash,
          status: 'ACTIVE'
        })
        .returning();

      const currentRemaining = Number(enc.remainingBalance);
      const newRemaining = Math.max(0, Number((currentRemaining - params.principalAmount).toFixed(2)));

      // 2. If covered / zero remaining: advance stage to CLEARED_GATE_PASS
      let passRecord = null;
      const isCleared = newRemaining === 0;

      if (isCleared) {
        const passNumber = `PASS-MC-${Math.floor(10000 + Math.random() * 90000)}`;
        const hmac = await generateGatePassHmac(enc.id, params.principalAmount, now.toISOString());
        const exitPin = generateDeterministicExitPin(passNumber);

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
            .where(eq(beds.id, enc.bedId));
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
        ipAddress: c.req.header('x-forwarded-for') || '127.0.0.1',
        userAgent: c.req.header('user-agent')
      });

      return {
        promissoryNote: insertedNotes[0],
        dischargePass: passRecord
      };
    });

    const updated = await getHydratedEncounter(enc.id);
    return c.json({
      success: true,
      promissoryNote: txResult.promissoryNote,
      dischargePass: txResult.dischargePass,
      encounter: updated
    });
  }
);

export default promissoryApp;
