import assert from 'node:assert/strict';
import {pathToFileURL,fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../..');
const {build}=await import(pathToFileURL(root+'/node_modules/vite/dist/node/index.js'));
const cases=[{raw:'https://api.example.test',base:'https://api.example.test/api/v1',health:'https://api.example.test/api/health'},{raw:'http://127.0.0.1:8787/api/v1/',base:'http://127.0.0.1:8787/api/v1',health:'http://127.0.0.1:8787/api/health'},{raw:'',base:'/api/v1',health:'/api/health'}];
for(let i=0;i<cases.length;i++){
 process.env.VITE_API_BASE_URL=cases[i].raw;delete process.env.VITE_API_URL;
 const result=await build({configFile:false,root:root+'/apps/dashboard',logLevel:'silent',build:{write:false,minify:false,lib:{entry:root+'/apps/dashboard/src/config/api.ts',formats:['es'],fileName:'api-config'}}});
 const source=(Array.isArray(result)?result[0]:result).output.find(output=>output.type==='chunk').code;
 const {API_CONFIG}=await import('data:text/javascript;base64,'+Buffer.from(source+'\n//case '+i).toString('base64'));
 assert.equal(API_CONFIG.baseUrl,cases[i].base);assert.equal(API_CONFIG.healthUrl,cases[i].health);assert.equal(API_CONFIG.isProduction,true);
 console.log('PASS: Vite-built API configuration case '+i);
}
