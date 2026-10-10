import {Platform} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import type {PatientEncounter} from '../types/domain';

export interface SavedGatePass {
  scope: string; encounterId: string; encounterNumber: string;
  pass: NonNullable<PatientEncounter['dischargePass']>; savedAt: number;
}
const key = (userId:string) => `medcore.exitpass.${userId.replace(/[^a-zA-Z0-9._-]/g,'_')}`;
const writes = new Map<string, Promise<void>>();
const invalidated=new Set<string>();
const deniedStays=new Set<string>();
const stayKey=(userId:string,scope:string,stay:string)=>JSON.stringify([userId,scope,stay]);
function serialize(userId:string, operation:()=>Promise<void>) {
  const storageKey=key(userId);
  const pending=(writes.get(storageKey)||Promise.resolve()).catch(()=>{}).then(operation);
  writes.set(storageKey,pending);
  return pending;
}
export function parseSavedPass(raw:string|null,scope:string,now=Date.now()):SavedGatePass|null {
  try {
    const value=JSON.parse(raw||'null') as SavedGatePass|null;
    if(!value||value.scope!==scope||!value.encounterId||!value.encounterNumber||!Number.isFinite(value.savedAt)||now<value.savedAt||now-value.savedAt>86400000) return null;
    if(typeof value.pass?.passNumber!=='string'||typeof value.pass.qrPayload!=='string'||!value.pass.qrPayload||value.pass.qrPayload.length>8000||value.pass.status!=='ACTIVE_READY_FOR_EXIT'||typeof value.pass.exitPin!=='string'||!/^\d{4}$/.test(value.pass.exitPin)||Number(value.pass.exitPin)<1000||!Number.isFinite(Date.parse(value.pass.issuedAt))) return null;
    return value;
  } catch {return null;}
}
export async function readSavedPass(userId:string,scope:string) {
  try {
    await writes.get(key(userId));
    const raw=Platform.OS==='web'?sessionStorage.getItem(key(userId)):await SecureStore.getItemAsync(key(userId));
    const saved=parseSavedPass(raw,scope);
    if(!saved||invalidated.has(userId+'.'+saved.pass.passNumber)||[saved.encounterId,saved.encounterNumber].some(stay=>deniedStays.has(stayKey(userId,scope,stay))))return null;
    return saved;
  } catch {return null;}
}
export function clearSavedPass(userId:string) {
  return serialize(userId,async()=>{
    if(Platform.OS==='web')sessionStorage.removeItem(key(userId));else await SecureStore.deleteItemAsync(key(userId));
  });
}
export function saveGatePass(userId:string,scope:string,encounter:PatientEncounter|null) {
  return serialize(userId,async()=>{
    const pass=encounter?.dischargePass;
    if(encounter&&[encounter.uuid,encounter.encounterNumber].some(stay=>deniedStays.has(stayKey(userId,scope,stay))))return;
    if(pass&&pass.status!=='ACTIVE_READY_FOR_EXIT')invalidated.add(userId+'.'+pass.passNumber);
    const raw=encounter&&!invalidated.has(userId+'.'+pass?.passNumber)&&pass?.status==='ACTIVE_READY_FOR_EXIT'&&pass.qrPayload&&pass.exitPin?JSON.stringify({scope,encounterId:encounter.uuid,encounterNumber:encounter.encounterNumber,pass,savedAt:Date.now()} satisfies SavedGatePass):null;
    if(Platform.OS==='web') {if(raw)sessionStorage.setItem(key(userId),raw);else sessionStorage.removeItem(key(userId));}
    else {if(raw)await SecureStore.setItemAsync(key(userId),raw);else await SecureStore.deleteItemAsync(key(userId));}
  });
}

// Only replace/remove the matching saved stay; a historical detail cannot erase a newer pass.
export function reconcileSavedPass(userId:string,scope:string,encounterId:string,encounter:PatientEncounter|null) {
  if(!encounter)deniedStays.add(stayKey(userId,scope,encounterId));
  return serialize(userId,async()=>{
    if(encounter?.dischargePass&&encounter.dischargePass.status!=='ACTIVE_READY_FOR_EXIT')invalidated.add(userId+'.'+encounter.dischargePass.passNumber);
    const storageKey=key(userId);
    const raw=Platform.OS==='web'?sessionStorage.getItem(storageKey):await SecureStore.getItemAsync(storageKey);
    let saved:SavedGatePass|null=null;try{saved=JSON.parse(raw||'null');}catch{return;}
    if(!saved||saved.scope!==scope||![saved.encounterId,saved.encounterNumber].includes(encounterId))return;
    const pass=encounter?.dischargePass;
    if(!pass||pass.status!=='ACTIVE_READY_FOR_EXIT'||invalidated.has(userId+'.'+pass.passNumber)) {
      invalidated.add(userId+'.'+saved.pass.passNumber);
      if(Platform.OS==='web')sessionStorage.removeItem(storageKey);else await SecureStore.deleteItemAsync(storageKey);
    }else{
      const updated=JSON.stringify({...saved,pass,savedAt:Date.now()});
      if(Platform.OS==='web')sessionStorage.setItem(storageKey,updated);else await SecureStore.setItemAsync(storageKey,updated);
    }
  });
}
