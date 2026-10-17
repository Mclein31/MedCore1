import {
  CreatePatientBody,
  formatPeso,
  PageQuery,
  ResolveDisputeBody,
  UpdateBedBody,
  UpdatePatientContactBody,
  VerifyGatePassBody,
} from '@medcore/domain';
import { and, asc, desc, eq, gte, isNull, sql, type SQL } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import type { AppBindings } from '../context';
import {
  auditLogs,
  beds,
  charges,
  disputes,
  encounters,
  facilities,
  gatePasses,
  ledgers,
  patients,
  payments,
  philhealthClaims,
  promissoryNotes,
  receipts,
  staffUsers,
  timelineEvents,
} from '../db/schema';
import { ApiError, conflict, notFound } from '../lib/errors';
import { idParam } from '../lib/params';
import { requirePermission } from '../middleware/auth';
import { jsonBody, queryParams } from '../middleware/http';
import { audit } from '../services/audit';
import { resolveDispute } from '../services/disputes';
import { buildEsoaXml } from '../services/esoa';
import { verifyPass } from '../services/gatePass';
import { enforce, LIMITS } from '../services/rateLimit';
import { likePattern, staffEncounterScope } from '../services/views';

export const staffOperationRoutes = new Hono<AppBindings>();

// ---------------------------------------------------------------- patients
staffOperationRoutes.get(
  '/patients',
  requirePermission('patient:read'),
  queryParams(PageQuery),
  async (c) => {
    const { q, page, pageSize } = c.req.valid('query');
    const staff = c.var.staff;
    const conditions: SQL[] = [eq(patients.facilityId, staff.facilityId)];
    if (q)
      conditions.push(
        sql`(${patients.fullName} ILIKE ${likePattern(q)} OR ${patients.mrn} ILIKE ${likePattern(q)})`,
      );
    // Physicians only find patients they are attending.
    if (staff.role === 'ATTENDING_PHYSICIAN') {
      conditions.push(
        sql`exists (select 1 from ${encounters} where ${encounters.patientId} = ${patients.id} and ${encounters.attendingPhysicianId} = ${staff.id})`,
      );
    }
    const rows = await c.var.db
      .select({
        id: patients.id,
        mrn: patients.mrn,
        fullName: patients.fullName,
        dateOfBirth: patients.dateOfBirth,
        sex: patients.sex,
        hasEmail: sql<boolean>`${patients.email} is not null`,
        discountKind: patients.discountKind,
      })
      .from(patients)
      .where(and(...conditions))
      .orderBy(asc(patients.fullName))
      .limit(pageSize)
      .offset((page - 1) * pageSize);
    return c.json({ items: rows, page, pageSize });
  },
);

staffOperationRoutes.post(
  '/patients',
  requirePermission('patient:write'),
  jsonBody(CreatePatientBody),
  async (c) => {
    const body = c.req.valid('json');
    const { cipher, now: clock } = c.var.services;
    const staff = c.var.staff;
    const id = crypto.randomUUID();
    const phone = body.contactPhone.replace(/^\+63/, '0');
    const pin = body.philhealthPin?.replace(/-/g, '');
    const now = clock();
    await c.var.db.transaction(async (tx) => {
      const [existing] = await tx
        .select({ id: patients.id })
        .from(patients)
        .where(and(eq(patients.facilityId, staff.facilityId), eq(patients.mrn, body.mrn)));
      if (existing) throw conflict('MRN_EXISTS', 'A patient with this record number already exists.');
      await tx.insert(patients).values({
        id,
        facilityId: staff.facilityId,
        mrn: body.mrn,
        fullName: body.fullName,
        dateOfBirth: body.dateOfBirth,
        sex: body.sex,
        contactPhoneEnc: await cipher.encrypt(phone, `patients.contact_phone:${id}`),
        contactPhoneLast4: phone.slice(-4),
        email: body.email ?? null,
        philhealthPinEnc: pin ? await cipher.encrypt(pin, `patients.philhealth_pin:${id}`) : null,
        philhealthPinLast4: pin ? pin.slice(-4) : null,
        discountKind: body.discountKind,
        discountIdEnc:
          body.discountKind !== 'NONE' && body.discountIdNumber
            ? await cipher.encrypt(body.discountIdNumber, `patients.discount_id:${id}`)
            : null,
        discountIdLast4:
          body.discountKind !== 'NONE' && body.discountIdNumber ? body.discountIdNumber.slice(-4) : null,
        createdAt: now,
        updatedAt: now,
      });
      await audit(c, tx, { action: 'PATIENT_REGISTERED', resourceType: 'patient', resourceId: id });
    });
    return c.json({ id }, 201);
  },
);

/** The billing desk records or corrects the email sign-in codes go to, after checking ID. */
staffOperationRoutes.put(
  '/patients/:id/contact',
  requirePermission('patient:contact'),
  jsonBody(UpdatePatientContactBody),
  async (c) => {
    const id = idParam(c, 'id', 'Patient');
    const { email, reason } = c.req.valid('json');
    const now = c.var.services.now();
    await c.var.db.transaction(async (tx) => {
      const [patient] = await tx
        .select()
        .from(patients)
        .where(and(eq(patients.id, id), eq(patients.facilityId, c.var.staff.facilityId)))
        .for('update');
      if (!patient) throw notFound('Patient');
      await tx.update(patients).set({ email, updatedAt: now }).where(eq(patients.id, id));
      await audit(c, tx, {
        action: 'PATIENT_EMAIL_CHANGED',
        resourceType: 'patient',
        resourceId: id,
        detail: { reason, hadEmail: Boolean(patient.email), hasEmail: Boolean(email) },
      });
    });
    return c.json({ ok: true });
  },
);

// ---------------------------------------------------------------- beds
staffOperationRoutes.get('/beds', requirePermission('bed:read'), async (c) => {
  const rows = await c.var.db
    .select({
      id: beds.id,
      code: beds.code,
      ward: beds.ward,
      floor: beds.floor,
      roomCategory: beds.roomCategory,
      dailyRateCents: beds.dailyRateCents,
      status: beds.status,
      encounterId: beds.currentEncounterId,
    })
    .from(beds)
    .where(eq(beds.facilityId, c.var.staff.facilityId))
    .orderBy(asc(beds.floor), asc(beds.code));
  return c.json({ items: rows });
});

staffOperationRoutes.patch(
  '/beds/:id',
  requirePermission('bed:write'),
  jsonBody(UpdateBedBody),
  async (c) => {
    const id = idParam(c, 'id', 'Bed');
    const { status } = c.req.valid('json');
    await c.var.db.transaction(async (tx) => {
      const [bed] = await tx
        .select()
        .from(beds)
        .where(and(eq(beds.id, id), eq(beds.facilityId, c.var.staff.facilityId)))
        .for('update');
      if (!bed) throw notFound('Bed');
      if (bed.status === 'OCCUPIED')
        throw conflict('BED_OCCUPIED', 'An occupied bed is released by discharging the patient.');
      await tx.update(beds).set({ status, updatedAt: c.var.services.now() }).where(eq(beds.id, id));
      await audit(c, tx, {
        action: 'BED_STATUS_CHANGED',
        resourceType: 'bed',
        resourceId: id,
        detail: { from: bed.status, to: status },
      });
    });
    return c.json({ ok: true });
  },
);

// ---------------------------------------------------------------- disputes
const DisputeQuery = PageQuery.extend({ status: z.enum(['OPEN', 'WAIVED', 'UPHELD']).optional() });

staffOperationRoutes.get(
  '/disputes',
  requirePermission('dispute:read'),
  queryParams(DisputeQuery),
  async (c) => {
    const { status, page, pageSize } = c.req.valid('query');
    const conditions: SQL[] = [staffEncounterScope(c.var.staff)];
    if (status) conditions.push(eq(disputes.status, status));
    const rows = await c.var.db
      .select({
        id: disputes.id,
        encounterId: disputes.encounterId,
        encounterNumber: encounters.encounterNumber,
        patientName: patients.fullName,
        chargeDescription: charges.description,
        contestedCents: disputes.contestedCents,
        category: disputes.category,
        reason: disputes.reason,
        status: disputes.status,
        filedByPatient: sql<boolean>`${disputes.filedByAccountId} is not null`,
        filedByStaffId: disputes.filedByStaffId,
        resolutionNote: disputes.resolutionNote,
        createdAt: disputes.createdAt,
        resolvedAt: disputes.resolvedAt,
      })
      .from(disputes)
      .innerJoin(encounters, eq(encounters.id, disputes.encounterId))
      .innerJoin(patients, eq(patients.id, encounters.patientId))
      .innerJoin(charges, eq(charges.id, disputes.chargeId))
      .where(and(...conditions))
      .orderBy(desc(disputes.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);
    return c.json({ items: rows, page, pageSize });
  },
);

staffOperationRoutes.post(
  '/disputes/:id/resolve',
  requirePermission('dispute:resolve'),
  jsonBody(ResolveDisputeBody),
  async (c) => {
    const id = idParam(c, 'id', 'Dispute');
    const { decision, note } = c.req.valid('json');
    const result = await c.var.db.transaction((tx) => resolveDispute(c, tx, id, decision, note));
    return c.json(result);
  },
);

// ---------------------------------------------------------------- lobby
staffOperationRoutes.post(
  '/gate-passes/verify',
  requirePermission('gatepass:verify'),
  jsonBody(VerifyGatePassBody),
  async (c) => {
    const { passNumber, pin } = c.req.valid('json');
    const staff = c.var.staff;
    await enforce(c, [
      [LIMITS.gatePassVerify, staff.id],
      [LIMITS.gatePassVerify, `pass:${passNumber}`],
    ]);
    const now = c.var.services.now();
    const outcome = await c.var.db.transaction(async (tx) => {
      const result = await verifyPass(
        tx,
        c.var.services.config.gatePassSecret,
        staff.facilityId,
        passNumber,
        pin,
        staff.id,
        now,
      );
      await audit(c, tx, {
        action: `GATE_PASS_${result.result}`,
        resourceType: 'gate_pass',
        resourceId: result.result === 'VERIFIED' ? result.pass.id : null,
        detail: { passNumber },
      });
      if (result.result !== 'VERIFIED') return { result };
      const [stay] = await tx
        .select({
          patientName: patients.fullName,
          bedCode: encounters.bedCode,
          encounterNumber: encounters.encounterNumber,
        })
        .from(encounters)
        .innerJoin(patients, eq(patients.id, encounters.patientId))
        .where(eq(encounters.id, result.pass.encounterId));
      return { result, stay };
    });
    // The wrong-PIN counter must be committed before we answer, so this is outside the transaction.
    const r = outcome.result;
    if (r.result === 'VERIFIED') {
      return c.json({
        result: 'VERIFIED',
        passNumber: r.pass.passNumber,
        patientName: outcome.stay?.patientName,
        bedCode: outcome.stay?.bedCode,
      });
    }
    if (r.result === 'WRONG_PIN') {
      throw new ApiError(
        422,
        'WRONG_PIN',
        `Wrong PIN. ${r.attemptsLeft} attempt${r.attemptsLeft === 1 ? '' : 's'} left before the pass is voided.`,
      );
    }
    const messages: Record<string, string> = {
      NOT_FOUND: 'No pass with that number exists here.',
      NOT_ACTIVE: 'This pass was already used or voided.',
      EXPIRED: 'This pass has expired. Send the patient to the billing desk.',
      VOIDED: 'Too many wrong PINs. The pass is now void; send the patient to the billing desk.',
      TAMPERED: 'This pass failed its security check and was voided. Call your supervisor.',
    };
    throw new ApiError(
      r.result === 'NOT_FOUND' ? 404 : 409,
      `PASS_${r.result}`,
      messages[r.result] ?? 'Pass rejected.',
    );
  },
);

// ---------------------------------------------------------------- claims
staffOperationRoutes.get('/claims', requirePermission('claim:read'), queryParams(PageQuery), async (c) => {
  const { page, pageSize } = c.req.valid('query');
  const rows = await c.var.db
    .select({
      id: philhealthClaims.id,
      claimNumber: philhealthClaims.claimNumber,
      encounterId: encounters.id,
      encounterNumber: encounters.encounterNumber,
      patientName: patients.fullName,
      caseRateCode: philhealthClaims.caseRateCode,
      hciCents: philhealthClaims.hciCents,
      pfCents: philhealthClaims.pfCents,
      status: philhealthClaims.status,
      stage: encounters.stage,
      clearedAt: encounters.clearedAt,
      transmittedAt: philhealthClaims.transmittedAt,
    })
    .from(philhealthClaims)
    .innerJoin(encounters, eq(encounters.id, philhealthClaims.encounterId))
    .innerJoin(patients, eq(patients.id, encounters.patientId))
    .where(and(eq(encounters.facilityId, c.var.staff.facilityId), isNull(encounters.voidedAt)))
    .orderBy(desc(philhealthClaims.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
  return c.json({ items: rows, page, pageSize });
});

staffOperationRoutes.get('/encounters/:id/esoa.xml', requirePermission('claim:read'), async (c) => {
  const id = idParam(c, 'id', 'Stay');
  const staff = c.var.staff;
  const [row] = await c.var.db
    .select({
      encounter: encounters,
      patient: patients,
      facility: facilities,
      ledger: ledgers,
      claim: philhealthClaims,
    })
    .from(encounters)
    .innerJoin(patients, eq(patients.id, encounters.patientId))
    .innerJoin(facilities, eq(facilities.id, encounters.facilityId))
    .innerJoin(ledgers, eq(ledgers.encounterId, encounters.id))
    .innerJoin(philhealthClaims, eq(philhealthClaims.encounterId, encounters.id))
    .where(and(eq(encounters.id, id), eq(encounters.facilityId, staff.facilityId)));
  if (!row) throw notFound('Claim');
  if (row.encounter.billState === 'DRAFT')
    throw conflict('BILL_NOT_FINAL', 'Finalize the bill before exporting the eSOA.');
  const [physician] = await c.var.db
    .select()
    .from(staffUsers)
    .where(eq(staffUsers.id, row.encounter.attendingPhysicianId));
  const lines = await c.var.db
    .select()
    .from(charges)
    .where(and(eq(charges.encounterId, id), isNull(charges.removedAt)))
    .orderBy(asc(charges.postedAt));
  const pin = row.patient.philhealthPinEnc
    ? await c.var.services.cipher.decrypt(
        row.patient.philhealthPinEnc,
        `patients.philhealth_pin:${row.patient.id}`,
      )
    : null;
  const xml = buildEsoaXml(
    {
      facility: {
        name: row.facility.name,
        accreditation: row.facility.philhealthAccreditation,
        tin: row.facility.tin,
        address: row.facility.address,
      },
      patient: {
        fullName: row.patient.fullName,
        philhealthPin: pin,
        dateOfBirth: row.patient.dateOfBirth,
        sex: row.patient.sex,
        discountKind: row.patient.discountKind,
      },
      encounter: {
        encounterNumber: row.encounter.encounterNumber,
        billNumber: row.encounter.billNumber,
        admittedAt: row.encounter.admittedAt,
        clearedAt: row.encounter.clearedAt,
        icd10Code: row.encounter.icd10Code,
        diagnosis: row.encounter.primaryDiagnosis,
      },
      claim: row.claim,
      physician: { fullName: physician?.fullName ?? '', prcLicense: physician?.prcLicense ?? null },
      charges: lines,
      ledger: row.ledger,
    },
    c.var.services.now(),
  );
  await audit(c, c.var.db, {
    action: 'ESOA_EXPORTED',
    resourceType: 'philhealth_claim',
    resourceId: row.claim.id,
  });
  c.header('Content-Type', 'application/xml; charset=utf-8');
  c.header('Content-Disposition', `attachment; filename="${row.claim.claimNumber}.xml"`);
  return c.body(xml);
});

staffOperationRoutes.post('/claims/:id/mark-transmitted', requirePermission('claim:write'), async (c) => {
  const id = idParam(c, 'id', 'Claim');
  const now = c.var.services.now();
  await c.var.db.transaction(async (tx) => {
    const [row] = await tx
      .select({ claim: philhealthClaims, encounter: encounters })
      .from(philhealthClaims)
      .innerJoin(encounters, eq(encounters.id, philhealthClaims.encounterId))
      .where(and(eq(philhealthClaims.id, id), eq(encounters.facilityId, c.var.staff.facilityId)))
      .for('update', { of: philhealthClaims });
    if (!row) throw notFound('Claim');
    if (row.encounter.billState === 'DRAFT') throw conflict('BILL_NOT_FINAL', 'Finalize the bill first.');
    if (row.claim.status === 'TRANSMITTED' || row.claim.status === 'PAID')
      throw conflict('ALREADY_TRANSMITTED', 'This claim was already transmitted.');
    await tx
      .update(philhealthClaims)
      .set({ status: 'TRANSMITTED', transmittedAt: now, updatedAt: now })
      .where(eq(philhealthClaims.id, id));
    await audit(c, tx, { action: 'CLAIM_TRANSMITTED', resourceType: 'philhealth_claim', resourceId: id });
  });
  return c.json({ ok: true });
});

// ---------------------------------------------------------------- analytics
staffOperationRoutes.get('/analytics/summary', requirePermission('analytics:read'), async (c) => {
  const facilityId = c.var.staff.facilityId;
  const now = c.var.services.now();
  const since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const db = c.var.db;
  const live = and(eq(encounters.facilityId, facilityId), isNull(encounters.voidedAt));
  const byStage = await db
    .select({ stage: encounters.stage, count: sql<number>`count(*)::int` })
    .from(encounters)
    .where(live)
    .groupBy(encounters.stage);
  const [totals] = await db
    .select({
      gross: sql<number>`coalesce(sum(${ledgers.grossCents}), 0)::bigint`,
      philhealth: sql<number>`coalesce(sum(${ledgers.philhealthCents}), 0)::bigint`,
      hmo: sql<number>`coalesce(sum(${ledgers.hmoCents}), 0)::bigint`,
      patientDue: sql<number>`coalesce(sum(${ledgers.netPatientDueCents}), 0)::bigint`,
      collected: sql<number>`coalesce(sum(${ledgers.paidCents}), 0)::bigint`,
      financed: sql<number>`coalesce(sum(${ledgers.financedCents}), 0)::bigint`,
      outstanding: sql<number>`coalesce(sum(${ledgers.balanceCents}), 0)::bigint`,
    })
    .from(ledgers)
    .innerJoin(encounters, eq(encounters.id, ledgers.encounterId))
    .where(live);
  const [clearance] = await db
    .select({
      cleared: sql<number>`count(*)::int`,
      medianMinutes: sql<
        number | null
      >`percentile_cont(0.5) within group (order by extract(epoch from (${encounters.clearedAt} - ${encounters.mghOrderedAt})) / 60)`,
    })
    .from(encounters)
    .where(and(live, gte(encounters.clearedAt, since)));
  const [openDisputes] = await db
    .select({
      count: sql<number>`count(*)::int`,
      cents: sql<number>`coalesce(sum(${disputes.contestedCents}), 0)::bigint`,
    })
    .from(disputes)
    .where(and(eq(disputes.facilityId, facilityId), eq(disputes.status, 'OPEN')));
  const bedRows = await db
    .select({ status: beds.status, count: sql<number>`count(*)::int` })
    .from(beds)
    .where(eq(beds.facilityId, facilityId))
    .groupBy(beds.status);
  return c.json({
    stages: Object.fromEntries(byStage.map((r) => [r.stage, r.count])),
    money: {
      grossCents: Number(totals?.gross ?? 0),
      philhealthCents: Number(totals?.philhealth ?? 0),
      hmoCents: Number(totals?.hmo ?? 0),
      patientDueCents: Number(totals?.patientDue ?? 0),
      collectedCents: Number(totals?.collected ?? 0),
      financedCents: Number(totals?.financed ?? 0),
      outstandingCents: Number(totals?.outstanding ?? 0),
    },
    clearance30d: {
      cleared: clearance?.cleared ?? 0,
      medianMinutes:
        clearance?.medianMinutes === null || clearance?.medianMinutes === undefined
          ? null
          : Math.round(Number(clearance.medianMinutes)),
    },
    openDisputes: { count: openDisputes?.count ?? 0, cents: Number(openDisputes?.cents ?? 0) },
    beds: Object.fromEntries(bedRows.map((r) => [r.status, r.count])),
  });
});

// ---------------------------------------------------------------- audit log
const AuditQuery = PageQuery.extend({
  action: z
    .string()
    .regex(/^[A-Z_]{2,64}$/)
    .optional(),
});

staffOperationRoutes.get(
  '/audit-logs',
  requirePermission('audit:read'),
  queryParams(AuditQuery),
  async (c) => {
    const { page, pageSize, action } = c.req.valid('query');
    const conditions: SQL[] = [eq(auditLogs.facilityId, c.var.staff.facilityId)];
    if (action) conditions.push(eq(auditLogs.action, action));
    const rows = await c.var.db
      .select({
        id: auditLogs.id,
        createdAt: auditLogs.createdAt,
        actorType: auditLogs.actorType,
        actorEmail: auditLogs.actorEmail,
        action: auditLogs.action,
        resourceType: auditLogs.resourceType,
        resourceId: auditLogs.resourceId,
        requestId: auditLogs.requestId,
        ip: auditLogs.ip,
        detail: auditLogs.detail,
      })
      .from(auditLogs)
      .where(and(...conditions))
      .orderBy(desc(auditLogs.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize);
    return c.json({ items: rows, page, pageSize });
  },
);

// ---------------------------------------------------------------- notifications & sms outbox
const readNotificationsByStaff = new Map<string, Set<string>>();

staffOperationRoutes.get('/notifications', async (c) => {
  const staff = c.var.staff;
  if (staff.role === 'LOBBY_SECURITY') {
    return c.json({ items: [] });
  }
  const db = c.var.db;
  const readSet = readNotificationsByStaff.get(staff.id) ?? new Set<string>();
  const scope = staffEncounterScope(staff);

  const recentPayments = await db
    .select({
      id: payments.id,
      encounterId: encounters.id,
      encounterNumber: encounters.encounterNumber,
      patientName: patients.fullName,
      amountCents: payments.amountCents,
      rail: payments.rail,
      createdAt: payments.createdAt,
      orNumber: receipts.officialReceiptNumber,
    })
    .from(payments)
    .innerJoin(encounters, eq(encounters.id, payments.encounterId))
    .innerJoin(patients, eq(patients.id, encounters.patientId))
    .innerJoin(receipts, eq(receipts.paymentId, payments.id))
    .where(and(scope, isNull(encounters.voidedAt)))
    .orderBy(desc(payments.createdAt))
    .limit(12);

  const recentDisputes = await db
    .select({
      id: disputes.id,
      encounterId: encounters.id,
      encounterNumber: encounters.encounterNumber,
      patientName: patients.fullName,
      chargeDescription: charges.description,
      contestedCents: disputes.contestedCents,
      status: disputes.status,
      createdAt: disputes.createdAt,
    })
    .from(disputes)
    .innerJoin(encounters, eq(encounters.id, disputes.encounterId))
    .innerJoin(patients, eq(patients.id, encounters.patientId))
    .innerJoin(charges, eq(charges.id, disputes.chargeId))
    .where(and(scope, isNull(encounters.voidedAt)))
    .orderBy(desc(disputes.createdAt))
    .limit(10);

  const recentPasses = await db
    .select({
      id: gatePasses.id,
      encounterId: encounters.id,
      encounterNumber: encounters.encounterNumber,
      patientName: patients.fullName,
      passNumber: gatePasses.passNumber,
      status: gatePasses.status,
      issuedAt: gatePasses.issuedAt,
    })
    .from(gatePasses)
    .innerJoin(encounters, eq(encounters.id, gatePasses.encounterId))
    .innerJoin(patients, eq(patients.id, encounters.patientId))
    .where(and(scope, isNull(encounters.voidedAt)))
    .orderBy(desc(gatePasses.issuedAt))
    .limit(10);

  const recentTimeline = await db
    .select({
      id: timelineEvents.id,
      encounterId: encounters.id,
      encounterNumber: encounters.encounterNumber,
      patientName: patients.fullName,
      kind: timelineEvents.kind,
      title: timelineEvents.title,
      detail: timelineEvents.detail,
      createdAt: timelineEvents.createdAt,
    })
    .from(timelineEvents)
    .innerJoin(encounters, eq(encounters.id, timelineEvents.encounterId))
    .innerJoin(patients, eq(patients.id, encounters.patientId))
    .where(and(scope, isNull(encounters.voidedAt)))
    .orderBy(desc(timelineEvents.createdAt))
    .limit(15);

  const items: Array<{
    id: string;
    encounterId: string;
    type: string;
    title: string;
    message: string;
    read: boolean;
    timestamp: string;
  }> = [];

  for (const p of recentPayments) {
    const id = `pay-${p.id}`;
    items.push({
      id,
      encounterId: p.encounterNumber,
      type: 'PAYMENT_RECEIVED',
      title: `Payment Recorded (${p.rail})`,
      message: `${p.patientName} settled ${formatPeso(p.amountCents)} — OR ${p.orNumber}.`,
      read: readSet.has(id),
      timestamp: p.createdAt.toISOString(),
    });
  }

  for (const d of recentDisputes) {
    const id = `disp-${d.id}`;
    items.push({
      id,
      encounterId: d.encounterNumber,
      type: d.status === 'OPEN' ? 'DISPUTE_FILED' : 'DISPUTE_RESOLVED',
      title:
        d.status === 'OPEN'
          ? `Open Dispute: ${d.chargeDescription}`
          : `Dispute ${d.status}: ${d.chargeDescription}`,
      message: `${d.patientName} (${d.encounterNumber}) — ${formatPeso(d.contestedCents)}.`,
      read: readSet.has(id),
      timestamp: d.createdAt.toISOString(),
    });
  }

  for (const g of recentPasses) {
    const id = `gp-${g.id}`;
    items.push({
      id,
      encounterId: g.encounterNumber,
      type: 'GATE_PASS_ISSUED',
      title: `Exit Pass ${g.passNumber} (${g.status})`,
      message: `${g.patientName} (${g.encounterNumber}) cleared for lobby exit.`,
      read: readSet.has(id),
      timestamp: g.issuedAt.toISOString(),
    });
  }

  for (const t of recentTimeline) {
    const id = `tl-${t.id}`;
    items.push({
      id,
      encounterId: t.encounterNumber,
      type: t.kind,
      title: `${t.title} — ${t.patientName}`,
      message: t.detail ?? `${t.encounterNumber} updated.`,
      read: readSet.has(id),
      timestamp: t.createdAt.toISOString(),
    });
  }

  items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return c.json({ items: items.slice(0, 30) });
});

const MarkReadBody = z.object({
  id: z.string().optional(),
  notificationIds: z.array(z.string()).optional(),
});

staffOperationRoutes.post('/notifications/mark-read', jsonBody(MarkReadBody), async (c) => {
  const body = c.req.valid('json');
  const staffId = c.var.staff.id;
  let readSet = readNotificationsByStaff.get(staffId);
  if (!readSet) {
    readSet = new Set<string>();
    readNotificationsByStaff.set(staffId, readSet);
  }
  if (body.id) readSet.add(body.id);
  if (body.notificationIds) {
    for (const id of body.notificationIds) readSet.add(id);
  }
  if (!body.id && !body.notificationIds?.length) {
    // Mark all current notifications read
    const db = c.var.db;
    const scope = staffEncounterScope(c.var.staff);
    const [pays, disps, passes, tls] = await Promise.all([
      db
        .select({ id: payments.id })
        .from(payments)
        .innerJoin(encounters, eq(encounters.id, payments.encounterId))
        .where(scope)
        .limit(30),
      db
        .select({ id: disputes.id })
        .from(disputes)
        .innerJoin(encounters, eq(encounters.id, disputes.encounterId))
        .where(scope)
        .limit(30),
      db
        .select({ id: gatePasses.id })
        .from(gatePasses)
        .innerJoin(encounters, eq(encounters.id, gatePasses.encounterId))
        .where(scope)
        .limit(30),
      db
        .select({ id: timelineEvents.id })
        .from(timelineEvents)
        .innerJoin(encounters, eq(encounters.id, timelineEvents.encounterId))
        .where(scope)
        .limit(30),
    ]);
    for (const r of pays) readSet.add(`pay-${r.id}`);
    for (const r of disps) readSet.add(`disp-${r.id}`);
    for (const r of passes) readSet.add(`gp-${r.id}`);
    for (const r of tls) readSet.add(`tl-${r.id}`);
  }
  return c.json({ ok: true });
});

staffOperationRoutes.get('/notifications/sms-outbox', requirePermission('encounter:read'), async (c) => {
  const rows = await c.var.db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      resourceId: auditLogs.resourceId,
      detail: auditLogs.detail,
      createdAt: auditLogs.createdAt,
    })
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.facilityId, c.var.staff.facilityId),
        sql`${auditLogs.action} IN ('PATIENT_SMS_LOGGED', 'DOCTOR_PF_NUDGED', 'BILL_SENT')`,
      ),
    )
    .orderBy(desc(auditLogs.id))
    .limit(25);

  return c.json({
    items: rows.map((r) => {
      const detailObj = (r.detail ?? {}) as Record<string, unknown>;
      return {
        id: String(r.id),
        encounterId: String(detailObj.encounterNumber ?? r.resourceId ?? ''),
        recipient: r.action === 'DOCTOR_PF_NUDGED' ? 'Attending Physician' : 'Patient / Guarantor',
        message: String(detailObj.message ?? `${r.action} dispatched`),
        status: 'DELIVERED',
        sentAt: r.createdAt.toISOString(),
      };
    }),
  });
});

// ---------------------------------------------------------------- facility settings
staffOperationRoutes.get('/facility', requirePermission('encounter:read'), async (c) => {
  const [facility] = await c.var.db
    .select()
    .from(facilities)
    .where(eq(facilities.id, c.var.staff.facilityId));
  if (!facility) throw notFound('Facility');
  const { config } = c.var.services;
  return c.json({
    facility: {
      id: facility.id,
      code: facility.code,
      name: facility.name,
      tin: facility.tin,
      philhealthAccreditation: facility.philhealthAccreditation,
      address: facility.address,
      slaWarningMinutes: facility.slaWarningMinutes,
      slaBreachMinutes: facility.slaBreachMinutes,
    },
    runtime: {
      aiEnabled: config.ai.enabled,
      aiModel: config.ai.model,
      onlinePayments: config.patientOnlinePayments,
      onlinePromissory: config.patientOnlinePromissory,
      mailTransport: config.mail.transport,
      staffMfaRequired: config.staffMfaRequired,
    },
  });
});

const UpdateFacilityBody = z.strictObject({
  name: z.string().trim().min(2).max(200).optional(),
  address: z.string().trim().min(2).max(300).optional(),
  tin: z.string().trim().min(3).max(20).optional(),
  philhealthAccreditation: z.string().trim().min(2).max(32).optional(),
  slaWarningMinutes: z.number().int().min(5).max(240).optional(),
  slaBreachMinutes: z.number().int().min(10).max(480).optional(),
});

staffOperationRoutes.put(
  '/facility',
  requirePermission('staff:manage'),
  jsonBody(UpdateFacilityBody),
  async (c) => {
    const body = c.req.valid('json');
    const facilityId = c.var.staff.facilityId;
    const updated = await c.var.db.transaction(async (tx) => {
      const [current] = await tx.select().from(facilities).where(eq(facilities.id, facilityId)).for('update');
      if (!current) throw notFound('Facility');
      const warn = body.slaWarningMinutes ?? current.slaWarningMinutes;
      const breach = body.slaBreachMinutes ?? current.slaBreachMinutes;
      if (warn >= breach) {
        throw new ApiError(
          422,
          'INVALID_SLA_THRESHOLDS',
          'The SLA warning threshold must be lower than the breach threshold.',
        );
      }
      const [next] = await tx
        .update(facilities)
        .set({
          ...(body.name ? { name: body.name } : {}),
          ...(body.address ? { address: body.address } : {}),
          ...(body.tin ? { tin: body.tin } : {}),
          ...(body.philhealthAccreditation ? { philhealthAccreditation: body.philhealthAccreditation } : {}),
          slaWarningMinutes: warn,
          slaBreachMinutes: breach,
        })
        .where(eq(facilities.id, facilityId))
        .returning();
      await audit(c, tx, {
        action: 'FACILITY_SETTINGS_UPDATED',
        resourceType: 'facility',
        resourceId: facilityId,
        detail: body,
      });
      return next!;
    });
    return c.json({ facility: updated });
  },
);

// ---------------------------------------------------------------- promissory installment settlement
staffOperationRoutes.post(
  '/promissory-notes/:id/installments/:seq/pay',
  requirePermission('payment:record'),
  async (c) => {
    const id = idParam(c, 'id', 'Promissory note');
    const seq = Number(c.req.param('seq'));
    if (!Number.isInteger(seq) || seq < 1) {
      throw new ApiError(422, 'INVALID_INSTALLMENT', 'Select a valid installment number.');
    }
    const now = c.var.services.now();
    const updated = await c.var.db.transaction(async (tx) => {
      const [note] = await tx
        .select()
        .from(promissoryNotes)
        .where(and(eq(promissoryNotes.id, id), eq(promissoryNotes.facilityId, c.var.staff.facilityId)))
        .for('update');
      if (!note) throw notFound('Promissory note');
      const schedule = Array.isArray(note.schedule)
        ? (note.schedule as Array<{
            sequence?: number;
            installmentNumber?: number;
            dueDate: string;
            amountCents?: number;
            amount?: number;
            status?: string;
            paidAt?: string | null;
          }>)
        : [];
      const idx = schedule.findIndex((s, i) => (s.sequence ?? s.installmentNumber ?? i + 1) === seq);
      if (idx === -1) throw notFound('Installment');
      const target = schedule[idx]!;
      if (target.status === 'PAID') {
        throw conflict('INSTALLMENT_ALREADY_PAID', 'This installment is already marked paid.');
      }
      const nextSchedule = schedule.map((item, i) =>
        i === idx ? { ...item, status: 'PAID', paidAt: now.toISOString() } : item,
      );
      const allPaid = nextSchedule.every((item) => item.status === 'PAID');
      const [saved] = await tx
        .update(promissoryNotes)
        .set({
          schedule: nextSchedule,
          status: allPaid ? 'SETTLED' : note.status,
        })
        .where(eq(promissoryNotes.id, id))
        .returning();
      await audit(c, tx, {
        action: 'PROMISSORY_INSTALLMENT_PAID',
        resourceType: 'promissory_note',
        resourceId: id,
        detail: { sequence: seq, allPaid },
      });
      return saved!;
    });
    return c.json({ promissoryNote: updated });
  },
);
