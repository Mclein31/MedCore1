// Actual AuthProvider with synthetic native storage and deferred API replies.
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
const {JSDOM} = await import(process.env.MEDCORE_DOM_MODULE || '/private/tmp/medcore-visual-tools/node_modules/jsdom/lib/api.js');
const dom = new JSDOM('<div id="app"></div>',{url:'http://localhost',pretendToBeVisual:true});
for (const name of ['window','document','navigator','HTMLElement','Node','MutationObserver','sessionStorage']) Object.defineProperty(globalThis,name,{value: name==='window'?dom.window:name==='document'?dom.window.document:dom.window[name],configurable:true});
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const temporary=await mkdtemp(path.join(os.tmpdir(),'medcore-polling-dom-'));
const originalSetInterval=globalThis.setInterval, originalClearInterval=globalThis.clearInterval;
try {
  const bundle=path.join(temporary,'checks.mjs');
  await build({entryPoints:[path.join(directory,process.argv.includes('--cache')?'cache-checks.ts':'mobile-auth-checks.tsx')],outfile:bundle,bundle:true,platform:'node',format:'esm',jsx:'automatic',tsconfig:path.join(mobile,'tsconfig.json'),alias:{react:path.join(mobile,'node_modules/react'),'react-dom':path.join(mobile,'node_modules/react-dom')},plugins:[{name:'native-storage-platform',setup(build){build.onResolve({filter:/^react-native$|^expo-secure-store$/},args=>({path:args.path,namespace:'audit-mocks'}));build.onLoad({filter:/.*/,namespace:'audit-mocks'},args=>({contents:args.path==='react-native'?"export const Platform={OS:'ios'};":"const values=new Map(); export const getItemAsync=async k=>k==='medcore_session_token'?globalThis.__authSavedToken||null:values.get(k)||null; export const setItemAsync=async(k,v)=>{if(k==='medcore_session_token')globalThis.__authSavedToken=v;else values.set(k,v)}; export const deleteItemAsync=async k=>{if(k==='medcore_session_token')globalThis.__authSavedToken=null;else values.delete(k)};",loader:'js'}));}}],banner:{js:"import {createRequire as __auditRequire} from 'node:module'; const require=__auditRequire(import.meta.url);"}});
  await import(pathToFileURL(bundle).href);
  const results=globalThis.__pollingResults;
  await writeFile(path.join(directory,process.argv.includes('--cache')?'cache-results.json':'mobile-auth-results.json'),JSON.stringify({environment:'Actual AuthProvider and API transport in jsdom; synthetic fetch/native storage; no database or device',passed:results.length,results},null,2)+'\n');
  console.log(JSON.stringify({passed:results.length,results}));
} finally {globalThis.setInterval=originalSetInterval;globalThis.clearInterval=originalClearInterval;dom.window.close();await rm(temporary,{recursive:true,force:true});}

// React DOM's scheduler retains handles in jsdom after all assertions and cleanup.
process.exit(0);
