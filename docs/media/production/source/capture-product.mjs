// Real application captures using the repository's isolated synthetic fixture.
// No production APIs, generated UI, real patient data, or external AI calls.
import {existsSync,readFileSync} from 'node:fs';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {spawn} from 'node:child_process';
import {build} from '../../../../node_modules/esbuild/lib/main.js';
import {chromium} from '/Users/mclein/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright-core/index.mjs';
const out=resolve('docs/media/production/footage'); await mkdir(out,{recursive:true});
const ff='/private/tmp/medcore-film-deps/imageio_ffmpeg/binaries/ffmpeg-macos-aarch64-v7.1';
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Brave Browser.app/Contents/MacOS/Brave Browser'});
const inventory=existsSync(resolve(out,'inventory.json'))?JSON.parse(readFileSync(resolve(out,'inventory.json'),'utf8')).clips:[]; const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function clip(page,name,seconds,actions){
 const file=resolve(out,name+'.mp4'); const size=page.viewportSize();
 if(inventory.some(c=>c.file===name+'.mp4') && existsSync(file)) {console.log('Reuse',name);return;}
 const proc=spawn(ff,['-y','-hide_banner','-loglevel','error','-f','image2pipe','-framerate','12','-vcodec','mjpeg','-i','pipe:0','-an','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-r','30','-movflags','+faststart',file]);
 let stderr='';proc.stderr.on('data',b=>stderr+=b);const finish=new Promise((r,j)=>{proc.on('error',j);proc.on('close',c=>c?j(Error(stderr)):r());});
 let actionError;const task=(async()=>{await pause(900);await actions();})().catch(e=>{actionError=e;});
 const started=Date.now();for(let i=0;i<seconds*12;i++){await pause(Math.max(0,started+i*1000/12-Date.now()));const jpeg=await page.screenshot({type:'jpeg',quality:90}); if(!proc.stdin.write(jpeg))await new Promise(r=>proc.stdin.once('drain',r));}
 await task;proc.stdin.end();await finish;if(actionError)throw actionError;
 inventory.push({file:name+'.mp4',duration:seconds,width:size.width,height:size.height,source:'Actual app browser capture; synthetic local fixture',actions:actions.toString()});
 await writeFile(resolve(out,'inventory.json'),JSON.stringify({complete:false,clips:inventory,limitations:['Synthetic in-memory API; no production patient data','Staff and patient demonstrations use separate synthetic records','Cora controls only; no live AI answer','No discharge pass exists in fixture; documents slot shows actual documents','Payment simulated; no transfer','Dashboard mutations blocked; no live insurer verification','XML sample is fixture data, not submitted claim']},null,2));console.log('Captured',name,seconds);
}
const built=await build({entryPoints:[resolve('apps/dashboard/src/data/mockData.ts')],bundle:true,write:false,format:'esm',platform:'node',alias:{'@':resolve('apps/dashboard/src')}});
const {INITIAL_ENCOUNTERS}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const encounters=INITIAL_ENCOUNTERS.slice(0,6).map((e,i)=>({...e,patient:{...e.patient,fullName:`Sample Patient ${i+1}`,maskedName:`Sample Patient ${i+1}`}}));
const desktop=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'no-preference'});
await desktop.route('**/*',route=>{const req=route.request(),u=new URL(req.url()),p=u.pathname;if(!p.startsWith('/api/'))return route.continue(); if(p.includes('/ai/'))return route.fulfill({status:503,json:{error:{message:'AI unavailable in synthetic demonstration'}}});if(req.method()!=='GET')return route.fulfill({status:403,json:{error:{message:'Read-only synthetic staff demonstration'}}});const data=p.endsWith('/auth/me')?{authenticated:true,user:{id:'film-staff',facilityId:'film-facility',facilityName:'Sample Medical Center',fullName:'Alex Rivera',email:'staff@example.test',title:'Billing specialist',role:'BILLING_SPECIALIST'}}:p.endsWith('/encounters')?{items:encounters,total:encounters.length}:p.endsWith('/notifications')?{notifications:[],unreadCount:0}:{items:[],total:0};return route.fulfill({status:200,json:data});});
const dp=await desktop.newPage();await dp.goto('http://127.0.0.1:5175',{waitUntil:'networkidle'});
const nav=label=>dp.getByRole('complementary',{name:'Workspace navigation'}).getByRole('button',{name:label,exact:true}).click();
const tab=label=>dp.getByRole('tab',{name:label,exact:true}).click();
const scroll=async(page,y)=>{await page.mouse.move(page.viewportSize().width-160,600);await page.mouse.wheel(0,y);await pause(1400);};
try{
 await nav('Encounters & Ledgers');await tab('Pre-admission cost estimator');
 await clip(dp,'guide',11,async()=>{const select=dp.locator('select').first();const opts=await select.locator('option').evaluateAll(a=>a.map(e=>e.value));if(opts.length>1)await select.selectOption(opts[1]);await pause(2500);await scroll(dp,220);});
 await nav('Approvals & Disputes');await tab('HMO Gateway Roster');
 await clip(dp,'verify',11,async()=>{await scroll(dp,240);await pause(2000);await scroll(dp,-240);});
 await nav('Encounters & Ledgers');await dp.getByRole('tab',{name:/^Active inpatients/}).click();
 await clip(dp,'ledger',11,async()=>{await scroll(dp,370);await pause(1800);await scroll(dp,-370);});
 await nav('Discharge Clearance');
 await clip(dp,'clearance',11,async()=>{await dp.getByRole('tab',{name:'6-Stage Pipeline',exact:true}).click();await pause(3500);await scroll(dp,220);});
 await nav('Claims & eSOA XML');
 await clip(dp,'claims',13,async()=>{await scroll(dp,460);await pause(2200);await scroll(dp,280);});
 await nav('RCM Analytics');
 await clip(dp,'analytics',13,async()=>{await scroll(dp,410);await pause(2300);await scroll(dp,360);});
 await desktop.close();
 const mc=await browser.newContext({viewport:{width:390,height:900},reducedMotion:'no-preference'});const p=await mc.newPage();await mc.request.get('http://127.0.0.1:8901/__control?reset=1');await p.goto('http://127.0.0.1:8084',{waitUntil:'domcontentloaded'});
 await p.getByRole('button',{name:'Skip introduction',exact:true}).click();await p.getByLabel('Email',{exact:true}).fill('patient@example.test');await p.getByLabel('Password',{exact:true}).fill('Synthetic-only123!');await p.getByRole('button',{name:'Sign in',exact:true}).click();await p.getByRole('tab',{name:'Home',exact:true}).waitFor();
 const mt=name=>p.getByRole('tab',{name,exact:true}).click();const mb=name=>p.getByRole('button',{name,exact:true}).click();
 await clip(p,'mobile-bill',10,async()=>{await pause(1500);await mt('Bill');await pause(2000);await scroll(p,230);});
 await mt('Coverage');await clip(p,'coverage',5,async()=>{await scroll(p,240);});
 await mt('Home');await mb('Ask Cora AI');await clip(p,'cora',12,async()=>{await p.getByRole('radio',{name:'Reply in Tagalog',exact:true}).click();await pause(2000);await p.getByRole('radio',{name:'Reply in English',exact:true}).click();await p.getByPlaceholder('Ask Cora about your hospital bill…').fill('What is my remaining balance?');});await mb('Close Cora assistant');
 await mb('Pay balance');await clip(p,'payment-methods',11,async()=>{await mb('Continue to payment method');await pause(2600);await scroll(p,200);});
 await p.getByRole('radio',{name:/^QR Ph,/}).click();await mb('Continue');await clip(p,'qr-review',11,async()=>{await pause(2900);await mb('Review payment');});
 await clip(p,'receipt',11,async()=>{await p.getByRole('button',{name:/^Confirm payment ·/}).click();await p.getByRole('button',{name:'View Receipt',exact:true}).waitFor();await pause(1700);await mb('View Receipt');});
 await mb('Payment history');await clip(p,'history',9,async()=>{await scroll(p,220);});
 // Separate reset to inspect the optional plan; do not submit or imply clearance.
 await mc.request.get('http://127.0.0.1:8901/__control?reset=1');await mt('Home');await mb('Pay balance');await mb('Continue to payment method');await p.getByRole('radio',{name:/^RA 9439 Note,/}).click();await mb('Continue');
 await clip(p,'arrangement',10,async()=>{await scroll(p,260);});
 await mb('Back');await mb('Back');await mb('Back');await mt('Home');await mb('Documents');await clip(p,'documents',11,async()=>{await p.getByRole('button',{name:/^Statement of account,/}).click();await pause(2000);await scroll(p,260);});
 await mc.close();await writeFile(resolve(out,'complete.json'),JSON.stringify({complete:true,count:inventory.length,totalSeconds:inventory.reduce((n,c)=>n+c.duration,0)},null,2));
} catch(e){console.error(e);await dp.screenshot({path:resolve(out,'capture-diagnostic.png')}).catch(()=>{});throw e;}finally{await browser.close();}
