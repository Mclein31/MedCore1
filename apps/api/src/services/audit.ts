import type { AppContext } from '../context';
import type { DbOrTx } from '../db/client';
import { auditLogs, timelineEvents } from '../db/schema';

export interface AuditEntry {
  action: string;
  resourceType: string;
  resourceId?: string | null;
  facilityId?: string | null;
  detail?: Record<string, unknown>;
  /** For sign-in steps that happen before a session exists: who the event is about. */
  actor?: { type: 'STAFF' | 'PATIENT'; id: string; email: string; facilityId: string };
}

/**
 * Write an audit row in the caller's transaction, so the record and the action
 * commit or roll back together. The actor comes from the authenticated principal,
 * never from request input. Pass only non-sensitive detail (no codes, IDs or PINs).
 */
export async function audit(c: AppContext, db: DbOrTx, entry: AuditEntry): Promise<void> {
  const staff = c.get('staff');
  const patient = c.get('patient');
  const actor = entry.actor
    ? {
        actorType: entry.actor.type,
        actorId: entry.actor.id,
        actorEmail: entry.actor.email,
        facilityId: entry.actor.facilityId,
      }
    : staff
      ? { actorType: 'STAFF', actorId: staff.id, actorEmail: staff.email, facilityId: staff.facilityId }
      : patient
        ? {
            actorType: 'PATIENT',
            actorId: patient.accountId,
            actorEmail: patient.email,
            facilityId: patient.facilityId,
          }
        : { actorType: 'ANON', actorId: null, actorEmail: null, facilityId: null };
  await db.insert(auditLogs).values({
    facilityId: entry.facilityId ?? actor.facilityId,
    actorType: actor.actorType,
    actorId: actor.actorId,
    actorEmail: actor.actorEmail,
    action: entry.action,
    resourceType: entry.resourceType,
    resourceId: entry.resourceId ?? null,
    requestId: c.var.requestId,
    ip: c.var.ip,
    userAgent: c.var.userAgent,
    detail: entry.detail ?? null,
    createdAt: c.var.services.now(),
  });
}

/** Human-readable stay history shown on the encounter page (and to patients). */
export async function timeline(
  c: AppContext,
  db: DbOrTx,
  encounterId: string,
  kind: string,
  title: string,
  detail?: string,
): Promise<void> {
  const staff = c.get('staff');
  const actorLabel = staff ? `${staff.fullName}` : 'Patient (MedCore app)';
  await db.insert(timelineEvents).values({
    encounterId,
    kind,
    title,
    detail: detail ?? null,
    actorLabel,
    createdAt: c.var.services.now(),
  });
}
