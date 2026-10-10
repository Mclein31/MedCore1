import {PatientGatePassView} from '../../src/features/patient-clarify/components/PatientGatePassView';
import {PrintDocument} from '../../src/components/printing/PrintDocumentContainer';
import {renderToStaticMarkup} from 'react-dom/server';
import GatePassQr from '../../src/components/common/GatePassQr';
import {gatePassMatrix,gatePassQrSize} from '../../../shared/gatePassQr';
import {gatePassPayload} from '../../../shared/gatePassPayload';
import {createRoot} from 'react-dom/client';
import {MedCoreProvider,useMedCore} from '../../src/context/MedCoreContext';
import {MainLayout} from '../../src/app/App';
import {apiClient} from '../../src/api';
import {INITIAL_ENCOUNTERS} from '../../src/data/mockData';
import '../../src/index.css';
let current!:ReturnType<typeof useMedCore>;
let root:any,record=structuredClone(INITIAL_ENCOUNTERS[0]),read=false,failRead=false,failFinalize=false,eventId='payment:new',feedCalls=0,deleteCalls=0;
let actor={id:'staff-1',email:'elena.santos@stjude.ph',fullName:'Elena Santos',title:'Billing',role:'BILLING_SPECIALIST'};
const response=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
const waitFor=async(test:()=>boolean,message:string)=>{const stop=Date.now()+6000;while(!test()){if(Date.now()>stop)throw new Error(message);await new Promise(resolve=>setTimeout(resolve,10));}};
function assert(value:unknown,message:string):asserts value{if(!value)throw new Error(message);}
function Probe(){current=useMedCore();return <MainLayout/>;}
function click(label:string){const button=[...document.querySelectorAll<HTMLButtonElement>('button')].find(button=>button.textContent?.trim()===label||button.textContent?.trim().startsWith(label)||button.getAttribute('aria-label')===label);assert(button,`Missing button ${label}`);button.click();}
const event=()=>({id:eventId,type:'PAYMENT',title:'Payment received via Maya',message:'₱1,000.00 received for Juan (MRN-2026-8812, Bed 412).',encounterId:'enc-8812',timestamp:new Date().toISOString(),read,severity:'SUCCESS'});
apiClient.setBaseUrl(location.origin);apiClient.setAuthToken('staff-token');
window.fetch=async(url,options)=>{
 const path=new URL(String(url),location.origin).pathname;
 if(path.endsWith('/auth/me'))return response({authenticated:true,user:actor});
 if(path.endsWith('/auth/logout'))return response({success:true});
 if(path.endsWith('/auth/login')){actor={id:'staff-2',email:'arthur.delgado@stjude.ph',fullName:'Arthur Delgado',title:'CFO',role:'HOSPITAL_CFO'};return response({success:true,token:'cfo-token',user:actor});}
 if(path.endsWith('/notifications/mark-read')){if(failRead)return response({error:{code:'UNAVAILABLE',message:'Synthetic read failure'}},503);read=true;return response({success:true});}
 if(path.endsWith('/notifications')){feedCalls++;return response({notifications:[event()],unreadCount:read?0:1});}
 if(path.includes('/charges/')&&options?.method==='DELETE'){deleteCalls++;record={...record,items:record.items.slice(1)};return response({success:true,encounter:record});}
 if(path.endsWith('/hmo/final-loa')){record={...record,hmo:{...record.hmo,finalLoaStatus:'APPROVED'}};return response({success:true,encounter:record});}
 if(path.endsWith('/finalize-bill')){if(failFinalize)return response({error:{code:'REJECTED',message:'Synthetic finalize failure'}},409);record={...record,billState:'FINALIZED',billFinalizedAt:new Date().toISOString()};return response({success:true,encounter:record});}
 if(path.endsWith('/send-bill')){record={...record,billState:'SENT_TO_PATIENT',billSentAt:new Date().toISOString()};return response({success:true,encounter:record});}
 if(path.endsWith('/encounters'))return response({items:[record],total:1});
 if(path.endsWith('/encounters/enc-8812'))return response(record);
 return response({success:true,items:[]});
};
record.stage='PENDING_SETTLEMENT';record.doctorSignedAt=new Date().toISOString();record.pharmacyRtsCleared=true;
const results:string[]=[];
try {
 const payload=gatePassPayload({passNumber:'PASS-SYNTHETIC',status:'ACTIVE_READY_FOR_EXIT',exitPin:'1234'});assert(payload,'Active payload missing');
 const matrix=gatePassMatrix(payload);const markup=renderToStaticMarkup(<GatePassQr payload={payload}/>);
 assert(markup.includes(`d="${matrix.path}"`),'Dashboard uses different modules from the shared/mobile encoder');
 assert(markup.includes(`viewBox="0 0 ${matrix.size} ${matrix.size}"`),'Dashboard quiet zone differs');
 assert(gatePassQrSize(matrix.size,218)<=218,'QR overflows a narrow card');
 assert(gatePassPayload({passNumber:'PASS-SYNTHETIC',status:'VERIFIED_AT_LOBBY',exitPin:'1234'})===null,'Verified pass still encodes usable credentials');
 const issued={...INITIAL_ENCOUNTERS[0].dischargePass,passNumber:'PASS-TEST-9999',exitPin:'1234',issuedAt:new Date().toISOString(),status:'ACTIVE_READY_FOR_EXIT'} as NonNullable<typeof record.dischargePass>;
 const preview=renderToStaticMarkup(<PatientGatePassView gatePass={issued} patientName="Test patient" roomBed="Test bed"/>);
 assert(preview.includes('MEDCORE')===false&&preview.includes('1234')&&preview.includes('Hospital-signed discharge gate pass QR'),'Patient preview must use issued PIN and real shared QR');
 const emptyPreview=renderToStaticMarkup(<PatientGatePassView patientName="Test patient" roomBed="Test bed"/>);
 assert(!emptyPreview.includes('<svg role="img"')&&!emptyPreview.includes('8492'),'Preview without issued pass fabricates credentials');
 const print=renderToStaticMarkup(<PrintDocument config={{type:'DIGITAL_GATE_PASS',data:{encounter:{...record,dischargePass:issued}}} as any}/>);
 assert(print.includes('1234')&&!print.includes('PIN: 9999')&&print.includes('Hospital-signed discharge gate pass QR'),'Printed QR/PIN must match issued credentials');
 const inactivePrint=renderToStaticMarkup(<PrintDocument config={{type:'DIGITAL_GATE_PASS',data:{encounter:{...record,dischargePass:{...issued,status:'VERIFIED_AT_LOBBY'}}}} as any}/>);
 assert(!inactivePrint.includes('PIN:')&&!inactivePrint.includes('Hospital-signed discharge gate pass QR'),'Verified print exposes reusable credential');
 results.push('patient preview and printed slips use shared QR and issued PIN; missing/verified passes hide credentials');
 results.push('dashboard QR uses the identical shared/mobile payload, modules, quiet zone and responsive sizing');
 root=createRoot(document.getElementById('app')!);root.render(<MedCoreProvider><Probe/></MedCoreProvider>);
 await waitFor(()=>!!current?.isAuthenticated&&!current.isVerifyingSession&&!!document.querySelector('header'),'Dashboard did not load');
 await waitFor(()=>current.unreadNotificationCount===1,'Unread feed did not hydrate');
 assert(!document.body.textContent?.includes('PostgreSQL Live'),'Removed database strip still renders');
 assert(!document.body.textContent?.includes('PST'),'Removed clock still renders');
 assert(document.querySelectorAll('input[type="search"]').length===1,'Universal header search is missing/duplicated');results.push('header has one universal search and removes clock/database/status strip');
 click('Hospital notifications, 1 unread');await waitFor(()=>!!document.querySelector('#hospital-notifications'),'Bell did not open panel');
 assert(document.body.textContent?.includes('Payment received via Maya'),'Real feed item not rendered');
 click('Discharges');await waitFor(()=>!document.querySelector('#hospital-notifications')?.textContent?.includes('Payment received via Maya'),'Payment ignored discharge filter');click('Payments');await waitFor(()=>!!document.querySelector('#hospital-notifications')?.textContent?.includes('Payment received via Maya'),'Payment filter did not restore the row');
 failRead=true;click('Mark all as read');await waitFor(()=>!!current.notificationError,'Read failure not reported');assert(current.unreadNotificationCount===1,'Rejected mark-read cleared unread badge');results.push('bell opens, type filters work, rejected mark-read preserves unread state');
 failRead=false;click('Mark all as read');await waitFor(()=>Number(current.unreadNotificationCount)===0,'Successful mark-read did not confirm count');results.push('mark all waits for persisted server read state');
 click('Payment received via Maya');await waitFor(()=>current.activeRoute==='DISCHARGE_CLEARANCE','Notification did not navigate');assert(current.selectedEncounterId==='enc-8812','Notification selected wrong patient');assert(!document.querySelector('#hospital-notifications'),'Notification panel did not close');results.push('notification selects the correct encounter and discharge workstation');
 current.setActiveRoute('ENCOUNTERS_LEDGER');
 await waitFor(()=>!!document.querySelector('button[title="Remove line item from patient running bill"]'),'Ledger delete control did not render');
 const sendButton=()=>[...document.querySelectorAll<HTMLButtonElement>('button')].find(button=>button.textContent?.includes('Send bill to patient app')||button.textContent?.includes('Bill sent to app'));
 assert(sendButton()?.disabled,'An unfinalized bill must not offer dispatch');
 const countBefore=record.items.length;
 (document.querySelector('button[title="Remove line item from patient running bill"]') as HTMLButtonElement).click();
 await waitFor(()=>!!current.confirmationState,'Delete confirmation missing');
 const confirmField=document.querySelector<HTMLInputElement>('input[placeholder*="CONFIRM"]');assert(confirmField,'Delete validation field missing');
 Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value')!.set!.call(confirmField,'CONFIRM');confirmField.dispatchEvent(new window.Event('input',{bubbles:true}));
 await waitFor(()=>[...document.querySelectorAll<HTMLButtonElement>('button')].some(button=>button.textContent?.trim()==='Remove Item'&&!button.disabled),'Delete confirmation did not accept the required keyword');click('Remove Item');
 await waitFor(()=>deleteCalls===1&&!current.confirmationState,'Single confirmation did not execute DELETE');
 assert(current.encounters[0].items.length===countBefore-1,'Confirmed deletion did not refresh the ledger');
 results.push('one rendered delete confirmation calls the API once and applies its encounter');
 current.setActiveRoute('DISCHARGE_CLEARANCE');
 failFinalize=true;const before=JSON.stringify(current.encounters[0]);try{await current.finalizeBill('enc-8812');}catch{}
 assert(JSON.stringify(current.encounters[0])===before,'Rejected finalization changed local bill');
 const originalFetch=window.fetch;let releaseCensus:((response:Response)=>void)|null=null;
 const stale=structuredClone(record);
 window.fetch=async(url,options)=>new URL(String(url),location.origin).pathname.endsWith('/encounters')?new Promise<Response>(resolve=>{releaseCensus=resolve;}):originalFetch(url,options);
 const census=current.refreshEncounters(0,true);await waitFor(()=>!!releaseCensus,'Controlled census did not start');
 failFinalize=false;await current.finalizeBill('enc-8812');
 releaseCensus!(response({items:[stale]}));await census;
 await waitFor(()=>current.encounters[0].billState==='FINALIZED','Late census overwrote confirmed finalization');
 results.push('late census replies cannot overwrite a confirmed mutation');
 const beforeHmo=structuredClone(record);beforeHmo.hmo.finalLoaStatus='UNDER_REVIEW';
 releaseCensus=null;
 const hmoCensus=current.refreshEncounters(0,true);await waitFor(()=>!!releaseCensus,'HMO census did not start');
 await current.approveHmoFinalLoa('enc-8812');
 releaseCensus!(response({items:[beforeHmo]}));await hmoCensus;
 await waitFor(()=>current.encounters[0].hmo.finalLoaStatus==='APPROVED','Late census overwrote confirmed HMO approval');
 window.fetch=originalFetch;results.push('late census replies cannot undo a confirmed HMO approval');
await waitFor(()=>current.encounters[0].billState==='FINALIZED','Finalized state missing');
 current.setActiveRoute('ENCOUNTERS_LEDGER');await waitFor(()=>!!sendButton()&&!sendButton()!.disabled,'Ready finalized bill cannot be dispatched');
 await current.sendBillToPatient('enc-8812');await waitFor(()=>current.encounters[0].billState==='SENT_TO_PATIENT','Sent state missing');results.push('finalize/send use authoritative replies; rejection retains balance and bill');
 await waitFor(()=>!!sendButton()?.disabled,'Already dispatched bill still offers a new dispatch');results.push('bill dispatch is disabled until finalized settlement readiness and after delivery');
 record={...record,remainingBalance:0,stage:'CLEARED_GATE_PASS'};eventId='payment:from-mobile';read=false;
 const feedsBeforeFocus=feedCalls;window.dispatchEvent(new window.Event('focus'));
 await waitFor(()=>feedCalls>feedsBeforeFocus && current.encounters[0].remainingBalance===0,'Foreground event did not rehydrate payment balance');
 assert(current.notifications.some(item=>item.id===eventId),'Foreground payment notification missing');
 results.push('foreground polling hydrates a new payment notification and authoritative balance');
 window.dispatchEvent(new window.KeyboardEvent('keydown',{key:'k',ctrlKey:true,bubbles:true}));
 const search=document.querySelector<HTMLInputElement>('input[aria-label="Universal search"]');
 assert(search&&document.activeElement===search,'Ctrl-K did not focus universal search');
 const setter=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value')!.set!;
 setter.call(search,'MRN-2026-8812');search.dispatchEvent(new window.Event('input',{bubbles:true}));
 await waitFor(()=>current.searchQuery==='MRN-2026-8812'&&!!document.querySelector('#search-result-0'),'Typed MRN did not produce a search result');
 search.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
 await waitFor(()=>current.searchQuery===''&&current.selectedEncounterId==='enc-8812','Enter did not select the matching record');
 results.push('Ctrl-K, typing an MRN and Enter navigate through the universal search');
 current.setActiveRoute('COVERAGE_APPROVALS');await waitFor(()=>current.activeRoute==='COVERAGE_APPROVALS','Coverage route did not change');assert(document.querySelectorAll('input[placeholder*="Search"]').length===1,'A page still renders a second search input');
 current.setSearchQuery('no-such-patient');await waitFor(()=>current.searchQuery==='no-such-patient','Universal query not shared');results.push('universal query remains shared on another page without duplicate inputs');
 click('Staff account menu');await waitFor(()=>!!document.querySelector('#staff-account-menu'),'Account menu did not open');
 click('Arthur Delgado');await waitFor(()=>!current.isAuthenticated,'Switch did not leave the old account');
 assert(current.encounters.length===0&&current.notifications.length===0&&Number(current.unreadNotificationCount)===0,'Old account records or notifications remain');
 const email=document.querySelector<HTMLInputElement>('input[type="email"]');assert(email?.value==='arthur.delgado@stjude.ph','Selected account did not prefill sign-in');
 const login=await current.login({email:'arthur.delgado@stjude.ph',password:'synthetic-password',facilityCode:'SJMC-MNL'});assert(login.success,'New account did not authenticate');await waitFor(()=>current.currentUser?.id==='staff-2'&&!current.isVerifyingSession,'New staff identity did not load');results.push('account switch clears old data and authenticates the real target identity');
 (window as any).__syncResults=results;
 console.log(JSON.stringify({passed:results.length,results}));
} finally {root?.unmount();apiClient.setAuthToken(null);}
