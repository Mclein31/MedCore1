export function gatePassPayload(pass:{passNumber:string;status:string;exitPin?:string|null}):string|null {
  if(pass.status!=='ACTIVE_READY_FOR_EXIT'||!/^\d{4}$/.test(pass.exitPin||'')||Number(pass.exitPin)<1000)return null;
  return `MEDCORE-PASS:${pass.passNumber}:${pass.exitPin}`;
}
