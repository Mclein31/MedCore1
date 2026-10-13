/// <reference path="../node_modules/react-native/src/types/globals.d.ts" />
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtemp, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { build } from 'esbuild';
const mobileRequire = createRequire(resolve('apps/mobile/package.json'));
const React = mobileRequire('react'), { act } = React, { createRoot } = mobileRequire('react-dom/client');
const { JSDOM } = await import(process.env.MEDCORE_DOM_MODULE || '/private/tmp/medcore-visual-tools/node_modules/jsdom/lib/api.js');
const dom = new JSDOM('<div id="root"></div>');
Object.assign(globalThis, { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true });
const fixture:any = { client: {}, requests: [], loops: [], styles: {}, accountId: 'account-a', motionListeners: new Set(), closed: 0, speech: [] };
(globalThis as any).__coraLanguageFixture = fixture;
const native = `import React from 'react';const f=globalThis.__coraLanguageFixture;
const host=tag=>React.forwardRef((p,ref)=>{if(p.testID)f.styles[p.testID]=p.style;return React.createElement(tag,{ref,'data-testid':p.testID,role:p.accessibilityRole,'aria-label':p.accessibilityLabel,'aria-checked':p.accessibilityState?.checked,disabled:p.disabled,onClick:p.onPress},p.children);});
export const View=host('div'),Text=host('span'),Pressable=host('button');
export const Image=p=>React.createElement('img',{'data-testid':p.testID,src:p.source,alt:p.accessible===false?'':p.accessibilityLabel});
export const ScrollView=React.forwardRef((p,ref)=>{React.useImperativeHandle(ref,()=>({scrollToEnd(){}}));return React.createElement('div',null,p.children);});
export const TextInput=p=>{f.setInput=p.onChangeText;f.inputValue=p.value;return React.createElement('input',{'aria-label':'Question',value:p.value,readOnly:!p.editable,onChange:e=>p.onChangeText(e.target.value)});};
export const StyleSheet={create:s=>s};
export const AccessibilityInfo={isReduceMotionEnabled:async()=>false,addEventListener:(_event,fn)=>{f.motionListeners.add(fn);return {remove(){f.motionListeners.delete(fn);}};}};
class Value{constructor(v){this.value=v;}setValue(v){this.value=v;}interpolate(config){return {value:this,config};}}
export const Animated={Value,View:host('div'),timing:(value,config)=>({value,config}),sequence:steps=>({steps}),stagger:(delay,steps)=>({delay,steps}),loop:sequence=>{const loop={sequence,stopped:false,start(){f.loops.push(this);},stop(){this.stopped=true;}};return loop;}};`;
const directory = await mkdtemp(join(tmpdir(), 'medcore-cora-language-'));
const compiled = join(directory, 'cora.cjs');
await build({ entryPoints: ['apps/mobile/src/components/CoraAssistantModal.tsx'], bundle: true, format: 'cjs', platform: 'node', outfile: compiled,
  plugins: [{ name: 'native-ui-fixture', setup(b) {
    b.onResolve({ filter: /^react(?:\/.+)?$/ }, args => ({ path: mobileRequire.resolve(args.path), external: true }));
    b.onResolve({ filter: /^react-native$/ }, () => ({ path: 'native', namespace: 'fixture' }));
    b.onResolve({ filter: /^react-native-safe-area-context$/ }, () => ({ path: 'safe-area', namespace: 'fixture' }));
    b.onResolve({ filter: /^lucide-react-native$/ }, () => ({ path: 'icons', namespace: 'fixture' }));
    b.onResolve({ filter: /\/lib\/auth$/ }, () => ({ path: 'auth', namespace: 'fixture' }));
    b.onResolve({ filter: /\/lib\/assets$/ }, () => ({ path: 'assets', namespace: 'fixture' }));
    b.onResolve({ filter: /\/services\/aiApi$/ }, () => ({ path: 'api', namespace: 'fixture' }));
    b.onResolve({ filter: /\.\/ModalOverlay$/ }, () => ({ path: 'overlay', namespace: 'fixture' }));
    b.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ loader: 'js', contents: args.path === 'native' ? native
      : args.path === 'safe-area' ? 'export const useSafeAreaInsets=()=>({top:0,bottom:0,left:0,right:0});'
      : args.path === 'icons' ? "export const Sparkles=()=>null,Mic=()=>null,Send=()=>null,X=()=>null,ShieldCheck=()=>null,ChevronRight=()=>null;"
      : args.path === 'auth' ? 'export const useAuth=()=>({client:globalThis.__coraLanguageFixture.client,user:{id:globalThis.__coraLanguageFixture.accountId}});'
      : args.path === 'assets' ? "export const ASSETS={brand:{cora:'/cora-mascot.png'}};"
      : args.path === 'overlay' ? "import React from 'react';export const ModalOverlay=p=>p.visible?React.createElement('section',{role:'dialog'},p.children):null;"
      : `export const createAiApi=()=>({sendCoraMessage:(message,language,encounterId,mode,signal,conversation)=>new Promise((resolve,reject)=>globalThis.__coraLanguageFixture.requests.push({message,language,encounterId,mode,signal,conversation,resolve,reject}))});` }));
  }}] });
const require = createRequire(import.meta.url), { CoraAssistantModal } = require(compiled);
const root = createRoot(document.getElementById('root')!);
let encounterId = 'encounter-a', visible = true;
const enc=()=>({uuid:encounterId,remainingBalance:800,waterfall:{netPatientDue:800,grossTotal:15800,philhealthTotal:15000,hmoApprovedAmount:0,vatExemption:0,seniorPwdDiscount:0}});
const render=()=>act(async()=>{root.render(React.createElement(CoraAssistantModal,{visible,encounter:enc(),onClose:()=>fixture.closed++}));await new Promise(r=>setTimeout(r,5));});
const button=(label:string)=>document.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;
const press=(label:string)=>act(async()=>{assert.ok(button(label),label);button(label).click();});
const input=(text:string)=>act(async()=>{fixture.setInput(text);});
const reply=(request:any,text:string,language=request.language)=>act(async()=>{request.resolve({reply:text,language,scopeDecision:'ANSWERED',suggestedActions:[],mode:'GENERAL'});});
let passed=0;const check=(name:string)=>{passed++;console.log(`[PASS] ${name}`);};
try {
  await render();await render();
  assert.ok(document.querySelectorAll('[data-testid="cora-avatar"]').length >= 2);
  assert.ok([...document.querySelectorAll<HTMLImageElement>('[data-testid="cora-avatar"]')].every(image=>image.getAttribute('src')==='/cora-mascot.png'&&image.alt===''));
  assert.match(document.body.textContent!,/Hello, ako si Cora/);
  await press('Reply in English');assert.match(document.body.textContent!,/Hello, I'm Cora/);assert.doesNotMatch(document.body.textContent!,/Hello, ako si Cora/);
  check('Switching language updates the welcome and exposes a distinct Tagalog option');
  await input('Bakit may balance pa ako?');
  await act(async()=>{button('Send question to Cora').click();button('Send question to Cora').click();});
  assert.equal(fixture.requests.length,1);assert.equal(fixture.requests[0].language,'en');
  assert.equal(document.querySelectorAll('[data-testid^="cora-typing-dot-"]').length,3);
  assert.doesNotMatch(document.body.textContent!,/verifying statutory|checking the rules/);
  assert.ok(fixture.loops.length>0);assert.equal(fixture.loops.at(-1).sequence.steps.length,3);
  check('Duplicate sends issue one request and pending UI shows three pulsing dots without status prose');
  const old=fixture.requests[0];await press('Reply in Tagalog');assert.equal(old.signal.aborted,true);
  assert.equal(document.querySelector('[data-testid="cora-typing"]'),null);assert.ok(fixture.loops.every((loop:any)=>loop.stopped));
  await input('Explain my balance.');await press('Send question to Cora');const tagalog=fixture.requests.at(-1);
  assert.equal(tagalog.language,'tl');await reply(old,'STALE_ENGLISH_RESPONSE');
  assert.doesNotMatch(document.body.textContent!,/STALE_ENGLISH_RESPONSE/);assert.ok(document.querySelector('[data-testid="cora-typing"]'));
  await reply(tagalog,'Ang natitira mong babayaran ay ₱800.00.');
  assert.match(document.body.textContent!,/Ang natitira/);assert.equal(document.querySelector('[data-testid="cora-typing"]'),null);
  check('A canceled old-language reply cannot append or clear the newer request’s dots');
  await press('Reply in English');await input('Why that amount?');await press('Send question to Cora');
  assert.ok(fixture.requests.at(-1).conversation.some((turn:any)=>turn.content.includes('Ang natitira')));
  await act(async()=>fixture.requests.at(-1).reject(new Error('Test network failure')));
  assert.match(document.body.textContent!,/Test network failure/);assert.equal(document.querySelector('[data-testid="cora-typing"]'),null);
  check('Cross-language topic history is preserved and failures clear typing feedback');
  await input('Explain my bill');await press('Send question to Cora');const closing=fixture.requests.at(-1);
  await press('Close Cora assistant');assert.equal(closing.signal.aborted,true);assert.equal(fixture.closed,1);
  visible=false;await render();visible=true;await render();await reply(closing,'STALE_CLOSED_RESPONSE');assert.doesNotMatch(document.body.textContent!,/STALE_CLOSED_RESPONSE/);
  await input('Explain my bill');await press('Send question to Cora');const changing=fixture.requests.at(-1);
  encounterId='encounter-b';await render();assert.equal(changing.signal.aborted,true);await reply(changing,'STALE_ENCOUNTER_RESPONSE');assert.doesNotMatch(document.body.textContent!,/STALE_ENCOUNTER_RESPONSE/);
  await input('Explain my bill');await press('Send question to Cora');const oldClient=fixture.requests.at(-1);
  fixture.client={};await render();assert.equal(oldClient.signal.aborted,true);await reply(oldClient,'STALE_ACCOUNT_RESPONSE');assert.doesNotMatch(document.body.textContent!,/STALE_ACCOUNT_RESPONSE/);
  check('Closing, encounter changes and account changes discard obsolete completions');
  await input('Explain my bill');await press('Send question to Cora');
  await act(async()=>{for(const listener of fixture.motionListeners)listener(true);});
  assert.ok(fixture.loops.every((loop:any)=>loop.stopped));
  for(let i=0;i<3;i++){assert.equal(fixture.styles[`cora-typing-dot-${i}`].opacity,.7);assert.equal(fixture.styles[`cora-typing-dot-${i}`].transform[0].scale,1);}
  await reply(fixture.requests.at(-1),'WRONG_LANGUAGE_METADATA','tl');
  assert.doesNotMatch(document.body.textContent!,/WRONG_LANGUAGE_METADATA/);assert.match(document.body.textContent!,/different language/);
  check('Reduced motion uses static dots and mismatched response-language metadata is rejected');
  (window as any).SpeechRecognition=class {onstart:any;onresult:any;onend:any;lang='';aborted=false;constructor(){fixture.speech.push(this);}start(){this.onstart?.();}abort(){this.aborted=true;}stop(){this.onend?.();}};
  await press('Voice speech recognition');const speech=fixture.speech.at(-1),lateResult=speech.onresult;
  assert.equal(speech.lang,'en-PH');await press('Reply in Tagalog');assert.equal(speech.aborted,true);
  await act(async()=>lateResult({results:[[{transcript:'STALE_VOICE_TRANSCRIPT'}]]}));assert.notEqual(fixture.inputValue,'STALE_VOICE_TRANSCRIPT');
  check('Speech recognition and stale transcripts are canceled on language changes');
  const otherHost=document.createElement('div');document.body.append(otherHost);const otherRoot=createRoot(otherHost);
  await act(async()=>{otherRoot.render(React.createElement(CoraAssistantModal,{visible:true,encounter:enc(),onClose:()=>{}}));await new Promise(r=>setTimeout(r,5));});
  assert.equal(otherHost.querySelector('[aria-label="Reply in Tagalog"]')?.getAttribute('aria-checked'),'true');
  await act(async()=>{otherHost.querySelector<HTMLButtonElement>('[aria-label="Reply in English"]')!.click();});
  assert.equal(document.getElementById('root')!.querySelector('[aria-label="Reply in English"]')?.getAttribute('aria-checked'),'true');
  fixture.accountId='account-b';fixture.client={};
  await act(async()=>{otherRoot.render(React.createElement(CoraAssistantModal,{visible:true,encounter:enc(),onClose:()=>{}}));});
  assert.equal(otherHost.querySelector('[aria-label="Reply in Taglish"]')?.getAttribute('aria-checked'),'true');
  await act(async()=>otherRoot.unmount());otherHost.remove();
  check('Language choices synchronize across Cora windows and remain account-scoped');
  await act(async()=>root.unmount());assert.equal(fixture.motionListeners.size,0);assert.ok(fixture.loops.every((loop:any)=>loop.stopped));
  console.log(`CORA_LANGUAGE_UI_CHECKS_DONE passed=${passed}; actual component, deferred transport and controlled native animations.`);
} finally { dom.window.close(); await rm(directory,{recursive:true,force:true}); }
