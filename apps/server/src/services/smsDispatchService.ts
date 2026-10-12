import { randomUUID } from 'node:crypto';
import { and, eq, desc } from 'drizzle-orm';
import { db } from '../db';
import { encounters, patients, users, facilities, dischargePasses, smsDispatches, encounterTimelineEvents, systemAuditLogs } from '../db/schema';
import type { AuthUser } from '../middleware/auth';
import { matchEncounterCondition } from '../utils/dbQuery';
import { normalizePhPhoneNumber, sendSms, SmsError, recordSmsOutbox, type SmsDispatchOptions } from './smsService';
import type { SmsDispatchResponse, SmsDispatchResult, SmsTemplateType } from '../../../shared/sms';

interface DispatchRequest {
  encounterId: string;
  user: AuthUser;
  templateType: SmsTemplateType;
  language?: 'en' | 'tl';
  requestKey: string;
  passNumber?: string;
  env?: Record<string, unknown>;
  ipAddress?: string;
}
function reply(result: SmsDispatchResult, cached = false): SmsDispatchResponse {
  return { success: true, simulated: true, messageId: result.messageId, dispatch: result, cached };
}

export async function dispatchEncounterSms(request: DispatchRequest): Promise<SmsDispatchResponse> {
  if (!/^[a-z0-9:._-]{8,128}$/i.test(request.requestKey)) throw new SmsError('SMS_REQUEST_INVALID', 'Use a valid SMS request reference.');
  const { user } = request;
  const completed = await db.transaction(async tx => {
    const [enc] = await tx.select().from(encounters).where(and(matchEncounterCondition(request.encounterId), eq(encounters.facilityId, user.facilityId))).limit(1).for('update');
    if (!enc) throw new SmsError('SMS_ENCOUNTER_NOT_FOUND', 'The selected encounter was not found.', 404);
    const [previous] = await tx.select().from(smsDispatches).where(and(eq(smsDispatches.facilityId, user.facilityId), eq(smsDispatches.requestKey, request.requestKey))).limit(1);
    if (previous) {
      if (previous.encounterId !== enc.id || previous.templateType !== request.templateType) throw new SmsError('SMS_REQUEST_CONFLICT', 'This SMS request reference belongs to another notification.', 409);
      return { result: previous.result as SmsDispatchResult, cached: true };
    }
    const [patient] = await tx.select().from(patients).where(and(eq(patients.id, enc.patientId), eq(patients.facilityId, user.facilityId))).limit(1);
    if (!patient) throw new SmsError('SMS_PATIENT_NOT_FOUND', 'The selected patient was not found.', 404);
    let phone = patient.contactNumber;
    let recipientName = patient.fullName;
    let doctorName: string | undefined;
    let recipientDoctorId: string | null = null;
    let pass: typeof dischargePasses.$inferSelect | undefined;
    if (request.templateType === 'DOCTOR_PF_NUDGE') {
      if (enc.stage !== 'DOCTOR_PF_PENDING') throw new SmsError('SMS_STAGE_NOT_READY', 'Doctor nudges are available while the Professional Fee is pending.', 409);
      const [doctor] = enc.attendingPhysicianId ? await tx.select().from(users).where(and(eq(users.id, enc.attendingPhysicianId), eq(users.facilityId, user.facilityId), eq(users.role, 'ATTENDING_PHYSICIAN'), eq(users.isActive, true))).limit(1) : [];
      if (!doctor) throw new SmsError('SMS_RECIPIENT_MISSING', 'Choose an active attending physician from this hospital.');
      doctorName = doctor.fullName;
      recipientName = doctor.fullName;
      recipientDoctorId = doctor.id;
      phone = doctor.contactNumber || '';
      if (!phone.trim()) {
        const [facility] = await tx.select().from(facilities).where(eq(facilities.id, user.facilityId)).limit(1);
        try { phone = normalizePhPhoneNumber(facility?.contactPhone || ''); recipientName = `${facility!.name} department`; }
        catch { throw new SmsError('SMS_RECIPIENT_MISSING', 'Record the physician or hospital department mobile number before simulating a nudge.'); }
      }
    }
    if (request.templateType === 'PAYMENT_CONFIRMED') {
      const [activePass] = await tx.select().from(dischargePasses).where(and(eq(dischargePasses.encounterId, enc.id), eq(dischargePasses.passNumber, request.passNumber || ''), eq(dischargePasses.status, 'ACTIVE_READY_FOR_EXIT'))).limit(1);
      if (enc.stage !== 'CLEARED_GATE_PASS' || !activePass) throw new SmsError('SMS_PASS_NOT_READY', 'An active Digital Gate Pass is required for this notification.', 409);
      pass = activePass;
    }
    const recipientPhone = normalizePhPhoneNumber(phone);
    if (recipientPhone === '+639170000000') throw new SmsError('SMS_RECIPIENT_MISSING', 'Record the recipient mobile number instead of the prototype placeholder.');
    const options: SmsDispatchOptions = {
      recipientPhone, recipientName, patientName: patient.fullName, doctorName,
      templateType: request.templateType, encounterNumber: enc.encounterNumber, roomBed: enc.roomBed,
      passNumber: pass?.passNumber, settlementKind: pass?.promissoryNoteId ? 'PROMISSORY_NOTE' : 'PAYMENT',
      language: request.language || 'en', forbiddenClinicalTerms: [enc.primaryDiagnosis, enc.primaryIcd10].filter(Boolean),
      recordInMemory: false
    };
    // Simulation has no external effects. The dispatch, timeline and audit commit together.
    const result = await sendSms(options);
    const id = randomUUID();
    const now = new Date(result.timestamp);
    await tx.insert(smsDispatches).values({ id, facilityId: user.facilityId, encounterId: enc.id, userId: user.id,
      recipientDoctorId, requestKey: request.requestKey, templateType: request.templateType,
      recipientPhone, recipientName, messageBody: result.messageBody, isSimulated: true, result, createdAt: now });
    await tx.insert(encounterTimelineEvents).values({ id, encounterId: enc.id, eventType: 'SMS_DISPATCH',
      title: `SMS Notification (Simulated: ${request.templateType})`,
      description: `A sandbox ${request.templateType === 'DOCTOR_PF_NUDGE' ? 'physician reminder' : 'patient notification'} was recorded (${result.messageId}). No cellular SMS was delivered.`, actorId: user.id, actorName: user.fullName, status: 'COMPLETED', eventTimestamp: now });
    await tx.insert(systemAuditLogs).values({ facilityId: user.facilityId, userId: user.id, actorRole: user.role,
      action: 'SMS_NOTIFICATION_DISPATCHED', resourceType: 'encounters', resourceId: enc.id,
      newState: { dispatchId: id, requestKey: request.requestKey, messageId: result.messageId, recipientPhone,
        templateType: request.templateType, isSimulated: true }, ipAddress: request.ipAddress });
    return { result, cached: false };
  });
  if (!completed.cached) recordSmsOutbox(completed.result);
  return reply(completed.result, completed.cached);
}

export async function getPersistedSmsOutbox(user: AuthUser) {
  const rows = await db.select().from(smsDispatches).where(and(eq(smsDispatches.facilityId, user.facilityId),
    user.role === 'ATTENDING_PHYSICIAN' ? eq(smsDispatches.recipientDoctorId, user.id) : undefined)).orderBy(desc(smsDispatches.createdAt)).limit(100);
  return { items: rows.map(row => ({ id: row.id, ...(row.result as SmsDispatchResult) })) };
}

// Called after financial commit; a missing contact never reverses payment or clearance.
export async function notifyIssuedGatePass(request: Omit<DispatchRequest, 'templateType' | 'requestKey'> & { passNumber: string }) {
  try {
    const response = await dispatchEncounterSms({ ...request, templateType: 'PAYMENT_CONFIRMED', requestKey: `gate-pass:${request.passNumber}` });
    return { dispatch: response.dispatch };
  } catch (error) {
    return { errorCode: error instanceof SmsError ? error.code : 'SMS_TRACKING_UNAVAILABLE' };
  }
}
