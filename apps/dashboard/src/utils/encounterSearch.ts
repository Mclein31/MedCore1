import type { Encounter } from '@/types/domain';
export function matchesEncounterSearch(enc:Encounter,query:string):boolean {
  const q=query.trim().toLowerCase();
  if(!q)return true;
  const values=[enc.patient.fullName,enc.patient.maskedName,enc.patient.mrn,enc.encounterNumber,enc.billNumber,
    enc.roomBed,enc.attendingDoctor,enc.primaryDiagnosis,enc.primaryIcd10,enc.hmo.providerName,enc.hmo.cardMasked,
    enc.hmo.approvalCode,enc.philhealth.id,enc.dischargePass?.passNumber,
    ...(enc.items||[]).map(item=>`${item.description} ${item.code}`)];
  return values.some(value=>value?.toLowerCase().includes(q));
}
