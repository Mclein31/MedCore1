import React, {act} from 'react';
import {createRoot} from 'react-dom/client';
import assert from 'node:assert/strict';
import {AuthProvider, useAuth} from '../../../mobile/src/lib/auth';

let auth!: ReturnType<typeof useAuth>;
let mode = 'admin', directoryCalls = 0, directoryMode = 'normal';
let releaseDirectory: ((response: Response) => void) | null = null;
const headers: Array<string | null> = [];
const first = '10000000-0000-4000-8000-000000000001';
const juan = '10000000-0000-4000-8000-000000000002';
const principal = () => ({id:mode,fullName:`Synthetic ${mode}`,email:`${mode}@example.test`,role:mode==='admin'?'HOSPITAL_CFO':'PATIENT_GUARANTOR',mobileDemoAdmin:mode==='admin'});
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), {status, headers:{'Content-Type':'application/json'}});
const directory = () => response({items:[{id:first,mrn:'OTHER'},{id:juan,mrn:'MRN-2026-8812'}]});
const waitFor = async (test: () => boolean) => {
  for (let i=0; i<100 && !test(); i++) await new Promise(resolve => setTimeout(resolve,10));
  assert.ok(test(), 'Deferred directory did not start');
};
globalThis.fetch = async (url, options) => {
  const path = new URL(String(url)).pathname;
  if(path.endsWith('/auth/login')) return response({success:true,token:`${mode}-token`,user:principal()});
  if(path.endsWith('/auth/me')) return response({authenticated:true,user:principal()});
  if(path.endsWith('/patient/demo/patients')) {
    directoryCalls++;
    if(directoryMode==='expired') return response({error:{message:'Expired'}},401);
    if(directoryMode==='deferred') return new Promise(resolve => {releaseDirectory=resolve;});
    return directory();
  }
  if(path.endsWith('/patient/me')) {
    headers.push(new Headers(options?.headers).get('X-Medcore-Patient-Id'));
    return response({patient:{id:'synthetic'}});
  }
  return response({success:true});
};
function Probe(){auth=useAuth();return null;}
const root=createRoot(document.getElementById('app')!);
const results: string[] = [];
try {
  await act(async()=>root.render(<AuthProvider><Probe/></AuthProvider>));
  await act(async()=>auth.login('admin@example.test','synthetic'));
  assert.equal(auth.selectedPatientId,juan);
  await auth.client.get('/patient/me');assert.equal(headers.at(-1),juan);
  results.push('demo login chooses the authorized primary MRN before scoped requests');
  await act(async()=>auth.selectPatient(first));
  await auth.client.get('/patient/me');assert.equal(headers.at(-1),first);
  results.push('patient selection immediately changes the outgoing scope');
  await act(async()=>auth.logout());assert.equal(auth.selectedPatientId,null);assert.equal(auth.user,null);
  results.push('logout clears subject and account');
  mode='patient';const before=directoryCalls;
  await act(async()=>auth.login('patient@example.test','synthetic'));
  await auth.client.get('/patient/me');assert.equal(headers.at(-1),null);
  assert.equal(directoryCalls,before);assert.throws(()=>auth.selectPatient(first));
  results.push('ordinary patients neither browse the directory nor send a selected-patient header');
  await act(async()=>auth.logout());
  mode='admin';directoryMode='deferred';
  let pending!: Promise<unknown>;
  await act(async()=>{pending=auth.login('admin@example.test','synthetic').catch(error=>error);await waitFor(()=>!!releaseDirectory);});
  await act(async()=>auth.logout());
  await act(async()=>{releaseDirectory!(directory());await pending;});
  assert.equal(auth.user,null);assert.equal(auth.token,null);assert.equal(auth.selectedPatientId,null);
  results.push('late login directory replies cannot resurrect a logged-out account');
  directoryMode='expired';
  await act(async()=>{await assert.rejects(auth.login('admin@example.test','synthetic'));});
  assert.equal(auth.user,null);assert.equal(auth.token,null);
  results.push('expired login directory rejects authentication and clears its token');
  (globalThis as any).__authSavedToken='admin-token';
  await act(async()=>auth.retrySession());
  assert.equal(auth.user,null);assert.equal(auth.token,null);
  results.push('expired directory during session restoration cannot reinstate the saved account');
  directoryMode='deferred';releaseDirectory=null;
  (globalThis as any).__authSavedToken='admin-token';
  await act(async()=>{pending=auth.retrySession();await waitFor(()=>!!releaseDirectory);});
  await act(async()=>auth.logout());
  await act(async()=>{releaseDirectory!(directory());await pending;});
  assert.equal(auth.user,null);assert.equal(auth.token,null);assert.equal(auth.selectedPatientId,null);
  results.push('late restore directory replies cannot undo logout');
  (globalThis as any).__pollingResults=results;
} finally {await act(async()=>root.unmount());}
