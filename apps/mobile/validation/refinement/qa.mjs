import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
if(process.argv.includes('--flows')){await import('./flows.mjs');process.exit(0);}
if(process.argv.includes('--extra')){await import('./extra.mjs');process.exit(0);}
if(process.argv.includes('--states')){await import('./states.mjs');process.exit(0);}
const {chromium}=await import('/private/tmp/medcore-visual-tools/node_modules/playwright-core/index.mjs');
const before=process.argv.includes('--before');const tag=before?'before':'after';
const out=fileURLToPath(new URL('./screenshots/',import.meta.url));
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Brave Browser.app/Contents/MacOS/Brave Browser'});
const errors=[],consoleErrors=[],heights=[];
const context=await browser.newContext({viewport:{width:428,height:926},reducedMotion:'reduce'});const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text());});
async function shot(name){await p.waitForLoadState('networkidle');await p.waitForFunction(()=>Array.from(document.images).every(i=>i.complete&&i.naturalWidth>0));await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));await p.screenshot({path:`${out}${tag}-${name}.png`});if(!before){const header=p.getByTestId('app-header-row').filter({visible:true});assert.equal(await header.count(),1);const b=await header.boundingBox();heights.push({screen:name,height:b.height});assert.equal(b.height,56,`${name} header is not56px`);}}
try{
 await p.goto('http://127.0.0.1:8084',{waitUntil:'networkidle'});await p.addStyleTag({content:'.__expo_fast_refresh{display:none!important}'});await p.getByRole('button',{name:'Skip introduction',exact:true}).click();await p.getByLabel('Email',{exact:true}).fill('patient@example.test');await p.getByLabel('Password',{exact:true}).fill('Test123456');await p.getByRole('button',{name:'Sign in',exact:true}).click();await p.getByRole('tab',{name:'Home',exact:true}).waitFor();await p.getByText('Sample Medical Center',{exact:true}).first().waitFor();await shot('home');
 await p.getByRole('heading',{name:'Coverage applied to your bill',exact:true}).evaluate(e=>e.scrollIntoView({block:'start'}));await shot('home-scrolled');
 for(const name of ['Bill','Coverage','Payments','Profile']){await p.getByRole('tab',{name,exact:true}).click();await shot(name.toLowerCase());}
 await p.getByRole('tab',{name:'Bill',exact:true}).click();await p.getByLabel('Search your charges',{exact:true}).scrollIntoViewIfNeeded();await shot('bill-search');
 if(!before){assert.equal(await p.getByPlaceholder('Search charges').count(),1);await p.getByLabel('Search your charges',{exact:true}).fill('unmatched charge');await p.getByText('No matching charges',{exact:true}).waitFor();await p.getByLabel('Search your charges',{exact:true}).fill('');await p.getByRole('button',{name:/Room & board, expand/}).waitFor();}
 await p.getByRole('tab',{name:'Home',exact:true}).click();await p.getByRole('button',{name:'Pay',exact:true}).click();await p.getByRole('button',{name:'Continue to payment method',exact:true}).waitFor();await shot('amount');await p.getByRole('button',{name:'Continue to payment method',exact:true}).click();await p.getByRole('heading',{name:'Payment methods',exact:true}).waitFor();await shot('methods');if(!before){await p.getByRole('radio',{name:/^Debit \/ Credit,/}).click();await p.getByRole('button',{name:'Continue',exact:true}).click();await shot('card-details');await p.getByRole('button',{name:'Back',exact:true}).first().click();await p.getByRole('radio',{name:/^QR Ph,/}).click();}await p.getByRole('button',{name:'Continue',exact:true}).click();await p.getByRole('img',{name:'QR Ph payment QR code',exact:true}).waitFor();await shot('qr');
 await p.getByRole('button',{name:'Review payment',exact:true}).click();await p.getByRole('heading',{name:'Review payment',exact:true}).waitFor();await shot('review');
 await writeFile(new URL(`./${tag}-results.json`,import.meta.url),JSON.stringify({pageErrors:errors,consoleErrors,headerHeights:heights,viewport:'428x926'},null,2));assert.deepEqual(errors,[]);assert.deepEqual(consoleErrors,[]);
 console.log(JSON.stringify({tag,pageErrors:errors,consoleErrors,headerHeights:heights}));
}finally{await browser.close();}
