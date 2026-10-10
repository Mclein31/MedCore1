// Actual PatientProvider with controlled clocks, auth and synthetic API replies.
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
const directory = path.dirname(fileURLToPath(import.meta.url));
const project = path.resolve(directory,'../../../..');
const mobile = path.join(project,'apps/mobile');
const requireProject = createRequire(path.join(project,'package.json'));
const {build} = requireProject('esbuild');
const {JSDOM} = await import('/private/tmp/medcore-visual-tools/node_modules/jsdom/lib/api.js');
const dom = new JSDOM('<div id="app"></div>',{url:'http://localhost',pretendToBeVisual:true});
for (const name of ['window','document','navigator','HTMLElement','Node','MutationObserver']) Object.defineProperty(globalThis,name,{value: name==='window'?dom.window:name==='document'?dom.window.document:dom.window[name],configurable:true});
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const temporary=await mkdtemp(path.join(os.tmpdir(),'medcore-polling-dom-'));
const originalSetInterval=globalThis.setInterval, originalClearInterval=globalThis.clearInterval;
try {
  const bundle=path.join(temporary,'checks.mjs');
  await build({stdin:{resolveDir:mobile,sourcefile:'polling-checks.tsx',loader:'tsx',contents:`
import React,{act,useContext} from 'react';
import {createRoot} from 'react-dom/client';
import assert from 'node:assert/strict';
import {PatientProvider,PatientContext} from './src/hooks/PatientProvider';
const timers=new Map(), listeners=new Set(); let timerId=0, state:any=null;
globalThis.setInterval=(callback,ms)=>{const id=++timerId;timers.set(id,{callback,ms});return id;};
globalThis.clearInterval=id=>timers.delete(id);
globalThis.__auditAppState={currentState:'active',addEventListener(_name,listener){listeners.add(listener);return {remove:()=>listeners.delete(listener)};}};
const results=[];
function clientFor(id){return {id,calls:0,deferred:false,failed:false,pending:[],balance:100, get(path){this.calls++;const body=path.endsWith('/overview')?{currentEncounter:{remainingBalance:this.balance,stage:'PENDING_SETTLEMENT'}}:path.endsWith('/encounters')?{items:[]}: {patient:{id,fullName:id}};if(this.failed)return Promise.reject(new Error('Synthetic unavailable'));if(this.deferred)return new Promise((resolve,reject)=>this.pending.push({resolve,reject,body}));return Promise.resolve(body);}};}
const a=clientFor('A'),b=clientFor('B');
globalThis.__auditAuth={user:{id:'A'},client:a};
function Probe(){state=useContext(PatientContext);return null;}
const root=createRoot(document.getElementById('app'));
const render=()=>act(async()=>root.render(<PatientProvider><Probe/></PatientProvider>));
const tick=()=>act(async()=>{for(const timer of timers.values()){assert.equal(timer.ms,5000);timer.callback();}});
await render(); assert.equal(a.calls,3);assert.equal(state.patient.id,'A');
a.balance=75;await tick();assert.equal(a.calls,6);assert.equal(state.currentEncounter.remainingBalance,75);results.push('foreground interval accepts only confirmed refreshed balance');
globalThis.__auditAppState.currentState='background';await tick();assert.equal(a.calls,6);
await act(async()=>{globalThis.__auditAppState.currentState='active';for(const listener of listeners)listener('active');});assert.equal(a.calls,9);results.push('background polling pauses and foreground resumes immediately');
a.failed=true;await tick();assert.equal(state.currentEncounter.remainingBalance,75);assert.ok(state.error);a.failed=false;results.push('failed refresh retains the last authoritative balance');
a.deferred=true;await tick();assert.equal(a.pending.length,3);await tick();assert.equal(a.pending.length,3);
b.deferred=true;globalThis.__auditAuth={user:{id:'B'},client:b};await render();assert.equal(state.patient,null);assert.equal(b.pending.length,3);
await act(async()=>{for(const request of a.pending)request.resolve(request.body);});assert.equal(state.patient,null);await tick();assert.equal(b.pending.length,3);
await act(async()=>{for(const request of b.pending)request.resolve(request.body);});assert.equal(state.patient.id,'B');results.push('old account replies are discarded and cannot clear the new pending request');
globalThis.__auditAuth={user:null,client:b};await render();assert.equal(state.patient,null);assert.equal(state.lastSynced,null);assert.equal(timers.size,0);assert.equal(listeners.size,0);results.push('logout hides patient state and removes polling and AppState listeners');
await act(async()=>root.unmount());assert.equal(timers.size,0);assert.equal(listeners.size,0);
globalThis.__pollingResults=results;
`},outfile:bundle,bundle:true,platform:'node',format:'esm',jsx:'automatic',tsconfig:path.join(mobile,'tsconfig.json'),alias:{react:path.join(mobile,'node_modules/react'),'react-dom':path.join(mobile,'node_modules/react-dom')},plugins:[{name:'synthetic-auth-and-appstate',setup(build){build.onResolve({filter:/\/lib\/auth$|^react-native$|^expo-secure-store$/},args=>({path:args.path,namespace:'audit-mocks'}));build.onLoad({filter:/.*/,namespace:'audit-mocks'},args=>({contents:args.path==='expo-secure-store'?'export const getItemAsync=async()=>null;export const setItemAsync=async()=>{};export const deleteItemAsync=async()=>{};':args.path==='react-native'?'export const Platform={OS:"ios"};export const AppState=new Proxy({}, {get(_target,key){return globalThis.__auditAppState[key];}});':'export function useAuth(){return globalThis.__auditAuth;}',loader:'js'}));}}],banner:{js:"import {createRequire as __auditRequire} from 'node:module'; const require=__auditRequire(import.meta.url);"}});
  await import(pathToFileURL(bundle).href);
  const results=globalThis.__pollingResults;
  await writeFile(path.join(directory,'polling-results.json'),JSON.stringify({environment:'Actual React provider in jsdom; controlled clock/AppState and synthetic APIs; no device/network',passed:results.length,results},null,2)+'\n');
  console.log(JSON.stringify({passed:results.length,results}));
} finally {globalThis.setInterval=originalSetInterval;globalThis.clearInterval=originalClearInterval;dom.window.close();await rm(temporary,{recursive:true,force:true});}

// React DOM's scheduler retains handles in jsdom after all assertions and cleanup.
process.exit(0);
