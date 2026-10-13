import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || '/Users/mclein/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright-core/index.mjs');
const out=resolve('docs/validation/ui-polish/after')+'/';
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Brave Browser.app/Contents/MacOS/Brave Browser'});
const checks=[],errors=[];
try {
 for(const width of [1440,390]){
  const c=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
  await c.route('**/*',route=>{const u=new URL(route.request().url());if(!['localhost','127.0.0.1'].includes(u.hostname))return route.abort();if(u.pathname.startsWith('/api/'))return route.fulfill({json:u.pathname.endsWith('/auth/me')?{authenticated:false,user:null}:{items:[],total:0}});return route.continue();});
  const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:5175',{waitUntil:'networkidle'});
  await p.getByRole('button',{name:/Sign In to Hospital Workstation/}).waitFor();
  await p.screenshot({path:out+`dashboard-login-${width}.png`,fullPage:true});
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
  checks.push(`Staff login ${width}px: rendered, contained, corrected dark metadata`);await c.close();
 }
 const c=await browser.newContext({viewport:{width:844,height:390},reducedMotion:'reduce'});
 await c.route('**/*',route=>['localhost','127.0.0.1'].includes(new URL(route.request().url()).hostname)?route.continue():route.abort());
 const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));await c.request.get('http://127.0.0.1:8901/__control?reset=1');
 await p.goto('http://127.0.0.1:8084',{waitUntil:'domcontentloaded'});await p.getByRole('button',{name:'Skip introduction',exact:true}).click();
 await p.screenshot({path:out+'mobile-auth-landscape.png'});
 await p.getByLabel('Email',{exact:true}).fill('patient@example.test');await p.getByLabel('Password',{exact:true}).fill('Synthetic-only123!');await p.getByRole('button',{name:'Sign in',exact:true}).click();await p.getByRole('heading',{name:'Alex Rivera',exact:true}).waitFor();
 const pay=p.getByRole('button',{name:'Pay balance',exact:true});await pay.scrollIntoViewIfNeeded();
 assert.equal(await pay.evaluate(e=>{const b=e.getBoundingClientRect();return e.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2));}),true);
 await p.screenshot({path:out+'mobile-home-landscape.png'});
 await p.getByRole('tab',{name:'Coverage',exact:true}).click();await p.screenshot({path:out+'mobile-coverage-landscape.png'});
 checks.push('Mobile 844x390 landscape: auth, Home reachable payment action, Coverage');await c.close();
 assert.deepEqual(errors,[]);
 await writeFile(out+'extra-results.json',JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({checks,errors}));
}finally{await browser.close();}
