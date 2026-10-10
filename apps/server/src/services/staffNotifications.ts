import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../db';
import { payments, encounters, patients, dischargePasses, systemAuditLogs, billingDisputes, staffNotificationReads } from '../db/schema';
import { moneyCents } from './statutoryWaterfall';
import type { StaffNotification, StaffNotificationFeed } from '../../../shared/notifications';

type Event = Omit<StaffNotification, 'read'>;
const railNames: Record<string, string> = { MAYA:'Maya', GCASH:'GCash', QR_PH:'QR Ph', CREDIT_DEBIT_CARD:'Card', BANK_TRANSFER:'Bank transfer', CASHIER_OVER_THE_COUNTER:'Cashier' };
const peso = (value: string | number) => `₱${(moneyCents(Number(value)) / 100).toLocaleString('en-PH', { minimumFractionDigits:2, maximumFractionDigits:2 })}`;
const encounterSlug = (value: string) => value.toLowerCase().replace(/^enc-2026-/, 'enc-');
export function sortStaffEvents(events: Event[], limit: number): Event[] {
  const key=(id:string)=>id.startsWith('audit:')?`audit:${id.slice(6).padStart(20,'0')}`:id;
  return events.sort((a,b) => b.timestamp.localeCompare(a.timestamp) || key(b.id).localeCompare(key(a.id))).slice(0,limit);
}
export async function getStaffNotifications(facilityId: string, userId: string, limit = 30): Promise<StaffNotificationFeed> {
  const scopedEncounter = and(eq(encounters.facilityId,facilityId), eq(patients.facilityId,facilityId));
  const stageActions = ['STAGE_ADVANCED','DOCTOR_QUICKSIGN_EXECUTED','ACCREDITED_CEILING_APPLIED','PHARMACY_RTS_CLEARED','HMO_LOA_APPROVED','BILL_FINALIZED','BILL_SENT_TO_PATIENT'];
  const [paid, passes, audits, waivers] = await Promise.all([
    db.select({ payment:payments, encounter:encounters, patient:patients }).from(payments)
      .innerJoin(encounters,eq(payments.encounterId,encounters.id)).innerJoin(patients,eq(encounters.patientId,patients.id))
      .where(and(scopedEncounter,eq(payments.status,'SUCCESS'))).orderBy(desc(payments.settledAt),desc(payments.id)).limit(limit),
    db.select({ pass:dischargePasses, encounter:encounters, patient:patients }).from(dischargePasses)
      .innerJoin(encounters,eq(dischargePasses.encounterId,encounters.id)).innerJoin(patients,eq(encounters.patientId,patients.id))
      .where(and(scopedEncounter,inArray(dischargePasses.status,['ACTIVE_READY_FOR_EXIT','VERIFIED_AT_LOBBY'])))
      .orderBy(desc(sql`coalesce(${dischargePasses.verifiedAt}, ${dischargePasses.issuedAt})`),desc(dischargePasses.id)).limit(limit),
    db.select({ audit:systemAuditLogs, encounter:encounters, patient:patients }).from(systemAuditLogs)
      .innerJoin(encounters,eq(systemAuditLogs.resourceId,sql`${encounters.id}::text`)).innerJoin(patients,eq(encounters.patientId,patients.id))
      .where(and(scopedEncounter,eq(systemAuditLogs.facilityId,facilityId),inArray(systemAuditLogs.action,stageActions)))
      .orderBy(desc(systemAuditLogs.createdAt),desc(systemAuditLogs.id)).limit(limit),
    db.select({ audit:systemAuditLogs, encounter:encounters, patient:patients }).from(systemAuditLogs)
      .innerJoin(billingDisputes,eq(systemAuditLogs.resourceId,sql`${billingDisputes.id}::text`))
      .innerJoin(encounters,eq(billingDisputes.encounterId,encounters.id)).innerJoin(patients,eq(encounters.patientId,patients.id))
      .where(and(scopedEncounter,eq(systemAuditLogs.facilityId,facilityId),inArray(systemAuditLogs.action,['DISPUTE_FILED','SUPERVISORY_WAIVER_EXECUTED'])))
      .orderBy(desc(systemAuditLogs.createdAt),desc(systemAuditLogs.id)).limit(limit)
  ]);
  const events: Event[] = [];
  for (const {payment,encounter,patient} of paid) {
    const rail = railNames[payment.paymentRail] || payment.paymentRail.replace(/_/g,' ');
    events.push({ id:`payment:${payment.id}`,type:'PAYMENT',title:`Payment received via ${rail}`,
      message:`${peso(payment.amount)} received for ${patient.fullName} (${patient.mrn}, ${encounter.roomBed}). Ref: ${payment.paymentReference}`,
      encounterId:encounterSlug(encounter.encounterNumber),timestamp:(payment.settledAt || payment.createdAt).toISOString(),severity:'SUCCESS' });
  }
  for (const {pass,encounter,patient} of passes) {
    const common = {type:'GATE_PASS' as const,encounterId:encounterSlug(encounter.encounterNumber),severity:'SUCCESS' as const};
    events.push({...common,id:`gate-issued:${pass.id}`,title:'Digital gate pass ready',
      message:`Pass ${pass.passNumber} is ready for ${patient.fullName} (${patient.mrn}, ${encounter.roomBed}).`,timestamp:pass.issuedAt.toISOString()});
    if (pass.verifiedAt && pass.status==='VERIFIED_AT_LOBBY') events.push({...common,id:`gate-verified:${pass.id}`,title:'Gate pass verified at lobby',
      message:`Pass ${pass.passNumber} verified at Lobby for ${patient.fullName} (${patient.mrn}, ${encounter.roomBed}).`,timestamp:pass.verifiedAt.toISOString()});
  }
  const labels: Record<string,string> = { STAGE_ADVANCED:'Discharge review started',DOCTOR_QUICKSIGN_EXECUTED:'Doctor fee confirmed',ACCREDITED_CEILING_APPLIED:'Accredited fee ceiling applied',PHARMACY_RTS_CLEARED:'Pharmacy audit cleared',BILL_FINALIZED:'Final bill ready',BILL_SENT_TO_PATIENT:'Bill sent to patient' };
  for (const {audit,encounter,patient} of audits) {
    const hmo = audit.action==='HMO_LOA_APPROVED';
    const state = audit.newState as Record<string,unknown> | null;
    const title = hmo ? 'HMO final LOA approved' : labels[audit.action] || 'Discharge stage updated';
    events.push({id:`audit:${audit.id}`,type:hmo?'HMO':'STAGE',title,
      message:`${patient.fullName} (${patient.mrn}, ${encounter.roomBed}): ${title.toLowerCase()}${hmo && typeof state?.approvedAmount==='number' ? ` for ${peso(state.approvedAmount)}` : ''}.`,
      encounterId:encounterSlug(encounter.encounterNumber),timestamp:audit.createdAt.toISOString(),severity:hmo?'SUCCESS':'INFO'});
  }
  for (const {audit,encounter,patient} of waivers) {
    const waived = audit.action==='SUPERVISORY_WAIVER_EXECUTED';
    events.push({id:`audit:${audit.id}`,type:'DISPUTE',title:waived?'Supervisory waiver confirmed':'Billing dispute filed',
      message:`${patient.fullName} (${patient.mrn}, ${encounter.roomBed}): ${waived?'a contested charge was waived':'a charge needs billing review'}.`,
      encounterId:encounterSlug(encounter.encounterNumber),timestamp:audit.createdAt.toISOString(),severity:waived?'SUCCESS':'WARNING'});
  }
  const recent=sortStaffEvents(events,limit);
  const acknowledgements=recent.length?await db.select({notificationId:staffNotificationReads.notificationId}).from(staffNotificationReads)
    .where(and(eq(staffNotificationReads.facilityId,facilityId),eq(staffNotificationReads.userId,userId),inArray(staffNotificationReads.notificationId,recent.map(item=>item.id)))):[];
  const read = new Set(acknowledgements.map(row=>row.notificationId));
  const notifications = recent.map(event=>({...event,read:read.has(event.id)}));
  return {notifications,unreadCount:notifications.filter(event=>!event.read).length};
}
