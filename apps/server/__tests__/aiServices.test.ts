/// <reference path="../../mobile/node_modules/react-native/src/types/globals.d.ts" />
import assert from 'node:assert/strict';
import { Hono } from 'hono';
import { getTableName } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import { runWithDb } from '../src/db';
import aiApp from '../src/routes/ai';
import { apiAccess } from '../src/middleware/access';
import { GeminiClient, AiInferenceError } from '../src/services/ai/geminiClient';
import { normalizeAuditRisk } from '../src/services/ai/claimsForensicService';
import { scrubPatientData, rehydrateText } from '../src/services/ai/phiScrubber';
import { createAiApi } from '../../mobile/src/services/aiApi';

// Fixtures exist only in this test. Production has no fixture/fallback provider.
process.env.TEST_LIVE_AI = '1';
const facilityId = '10000000-0000-4000-8000-000000000001';
const fixtures = [
  { id:'30000000-0000-4000-8000-000000000001', number:'ENC-2026-1001', diagnosis:'Pneumonia', icd:'J18.9', item:'Chest radiograph', amount:800, rate:15000, name:'Synthetic Patient Alpha', mrn:'MRN-ALPHA' },
  { id:'30000000-0000-4000-8000-000000000002', number:'ENC-2026-1002', diagnosis:'Distal radius fracture', icd:'S52.5', item:'Wrist splint', amount:1200, rate:9000, name:'Synthetic Patient Beta', mrn:'MRN-BETA' }
].map((f,index) => {
  const patient = { id:`40000000-0000-4000-8000-00000000000${index+1}`, facilityId, fullName:f.name, mrn:f.mrn, dateOfBirth:new Date('1990-01-01'), gender:'F', philhealthPin:'12-345678901-2', contactNumber:'09171234567', isSeniorCitizen:false, isPwd:false };
  const doctor = { fullName:'Synthetic Physician', id:'50000000-0000-4000-8000-000000000001' };
  const encounter = { id:f.id, encounterNumber:f.number, facilityId, patientId:patient.id, admissionTimestamp:new Date(), mghOrderTimestamp:new Date(), primaryDiagnosis:f.diagnosis, primaryIcd10:f.icd, attendingPhysicianId:doctor.id, roomCategory:'WARD', roomBed:'Bed 101', doctorPan:'PAN-1234567', doctorAgreedFee:'1000', doctorExcessPf:'0', stage:'HMO_FINAL_LOA', remainingBalance:String(f.amount), elapsedMinutes:20, updatedAt:new Date() };
  const claim = { encounterId:f.id, claimNumber:`CLM-${index+1}`, primaryDescription:f.diagnosis, primaryIcd10:f.icd, caseRateCode:f.icd, totalCaseRate:String(f.rate), hciAmount:String(f.rate*.7), pfAmount:String(f.rate*.3), rthRiskScore:'0.0200', cf4VitalsRecorded:index===0, cf4CourseInWardRecorded:true, cf4LabsConsistent:true, status:'CLEAN' };
  const item = { id:`item-${index}`, encounterId:f.id, code:`ITEM-${index}`, description:f.item, category:'CENTRAL_SUPPLIES', quantity:'1', unitPrice:String(f.amount), grossAmount:String(f.amount), patientOop:String(f.amount), philhealthCovered:'0', hmoCovered:'0', status:'DISALLOWED_SUNDRY', exclusionReasonClause:'Recorded policy exclusion' };
  const waterfall = { encounterId:f.id, grossTotal:String(f.amount+f.rate), grossHospitalCharges:String(f.amount+f.rate-1000), grossDoctorFee:'1000', philhealthTotal:String(f.rate), philhealthHci:String(f.rate*.7), philhealthPf:String(f.rate*.3), hmoApprovedAmount:'0', vatExemption:'0', seniorPwdDiscount:'0', netVatDiscountedBase:String(f.amount+f.rate), netPatientDue:String(f.amount), excludedConsumables:String(f.amount), roomUpgradeExcess:'0', doctorExcessPf:'0', patientPaid:'0' };
  return { ...f, patient, doctor, encounter, claim, item, waterfall, hmo:{ encounterId:f.id, providerName:'Synthetic Health', disallowedConsumables:String(f.amount), finalLoaStatus:'DISALLOWED_ITEMS', policyMbl:'100000', mblRemaining:'100000', dailyRoomAllowance:'1000', approvedAmount:'0' } };
});
let user:any = { id:'20000000-0000-4000-8000-000000000001',facilityId,role:'BILLING_SPECIALIST', linkedMrn:'MRN-ALPHA' };
const dialect = new PgDialect();
const writes:any[] = [];
function database():any {
  return {
    select(shape:any) {
      let table:any, condition:any;
      const query:any = {
        from(t:any){table=t;return query;},innerJoin(){return query;},leftJoin(){return query;},where(c:any){condition=c;return query;},limit(){return query;},orderBy(){return query;},
        then(resolve:any,reject:any){
          try {
            const name=getTableName(table),params=condition ? dialect.sqlToQuery(condition).params : [];
            let selected=fixtures.filter(f=>!params.some(p=>typeof p==='string'&&p.startsWith('10000000')) || params.includes(facilityId));
            const ids=params.filter(p=>typeof p==='string'&&(p.startsWith('30000000')||p.startsWith('ENC-')||p.startsWith('enc-')||p.startsWith('CLM-')));
            if(ids.length)selected=selected.filter(f=>ids.includes(f.id)||ids.includes(f.number)||ids.includes(f.number.toLowerCase().replace('enc-2026-','enc-'))||ids.includes(f.claim.claimNumber));
            if(params.includes(fixtures[0].patient.id)) selected=selected.filter(f=>f.patient.id===fixtures[0].patient.id);
            let rows:any[]=[];
            if(name==='encounters') rows=shape?.encounter ? selected.map(f=>({ encounter:f.encounter, patient:f.patient, doctor:f.doctor, bed:null })) : shape?.id ? selected.map(f=>({id:f.id})) : selected.map(f=>f.encounter);
            if(name==='philhealth_claims') rows=shape?.claim ? selected.map(f=>({ claim:f.claim, encounter:f.encounter, patient:f.patient, doctor:f.doctor, facility:{name:'Synthetic Hospital',address:'Synthetic address',philhealthPan:'H123',tin:'TIN'} })) : selected.map(f=>f.claim);
            if(name==='patients') rows=selected.filter(f=>!params.includes('MRN-ALPHA')||f.mrn==='MRN-ALPHA').map(f=>f.patient);
            if(name==='chargemaster_items')rows=selected.flatMap(f=>[f.item,{...f.item,id:'covered-'+f.id,code:'COVERED',description:'Covered inpatient charges',grossAmount:String(f.rate),unitPrice:String(f.rate),patientOop:'0',philhealthCovered:String(f.rate),status:'COVERED'}]);
            if(name==='statutory_waterfalls')rows=selected.map(f=>f.waterfall);
            if(name==='hmo_authorizations')rows=selected.map(f=>f.hmo);
            if(name==='facilities')rows=[{id:facilityId,name:'Synthetic Hospital',address:'Synthetic address'}];
            return Promise.resolve(rows).then(resolve,reject);
          }catch(e){return Promise.reject(e).then(resolve,reject);}
        }
      };return query;
    },
    insert:()=>({values:async()=>{}}),
    update:(table:any)=>({set:(data:any)=>({where:async(condition:any)=>{
      const params=dialect.sqlToQuery(condition).params; writes.push({table:getTableName(table),data,params});
      for(const f of fixtures)if(params.includes(f.id))Object.assign(f.claim,data);
    }})})
  };
}
const router=new Hono();
router.use('*',async(c,next)=>{if(user)c.set('user',user);await next();});
router.use('/api/v1/*',apiAccess);router.route('/api/v1/ai',aiApp);
const env={ NODE_ENV:'production', GEMINI_API_KEY:'synthetic-test-key', GEMINI_MODEL:'test-primary', GEMINI_BACKUP_MODEL:'test-backup' };
const request=(path:string,body:object)=>runWithDb(database(),()=>router.request(`/api/v1/ai${path}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)},env));
const originalFetch=globalThis.fetch;
let transportMode='success',calls=0;
const prompts:string[]=[];
globalThis.fetch=async(_url,options)=>{
  calls++;
  if(transportMode==='quota')return new Response('{}',{status:429});
  if(transportMode==='forbidden')return new Response('{}',{status:403});
  if(transportMode==='network')throw new TypeError('fetch failed');
  const payload=JSON.parse(String(options?.body));
  const schema=payload.generationConfig.responseSchema || payload.generationConfig.responseJsonSchema;
  const properties=schema?.properties || {};
  const prompt=payload.contents[0].parts.find((p:any)=>p.text)?.text || '';
  prompts.push(prompt);
  assert.ok(!prompt.includes('Synthetic Patient Alpha')&&!prompt.includes('Synthetic Patient Beta')&&!prompt.includes('Synthetic Physician'),'PHI leaked in final prompt');
  let result:any;
  if(properties.appealLetterMarkdown){
    const denied=prompt.match(/Disallowed Item \/ Fee: ([^\n]+)/)?.[1];
    const diagnosis=prompt.match(/Primary Inpatient Diagnosis: ([^\n]+)/)?.[1];
    const referenceNumber=prompt.match(/"referenceNumber":"([^"]+)"/)?.[1];
    const deadline=prompt.match(/"reconsiderationDeadline":"([^"]+)"/)?.[1];
    result={ referenceNumber,appealLetterMarkdown:`# Appeal ${referenceNumber}\n${diagnosis}\n${denied}\n[ATTENDING_PHYSICIAN_A]`,citationsApplied:[],attendingPhysicianName:'[ATTENDING_PHYSICIAN_A]',doctorPan:'[DOCTOR_PAN_MASKED]',reconsiderationDeadline:deadline,suggestedAttachments:['Itemized statement'] };
  }else if(properties.rthRiskScore){
    if(transportMode==='mutate-chart') fixtures[0].claim.cf4VitalsRecorded=false;
    result={ rthRiskScore:.8,riskLevel:'LOW',passThreshold:true,cleanClaimReadiness:99, flags:transportMode==='info-flags'?[{category:'MISSING_CF4_FIELD',severity:'INFO',field:'cf4.admissionVitals',description:'Missing vitals',regulatoryCitation:'CF4',remediation:'Record vitals'}]:[],clinicalSummary:`Audit ${prompt.match(/"claimDiagnosis":"([^"]+)"/)?.[1]}`,suggestedDoctorAddendum:null,esoaXmlConformity:true };
  }else if(properties.reply){result={reply:'Your current bill is in the supplied ledger.',mode:'GENERAL',suggestedActions:[]};}
  else if(properties.briefingMarkdown){result={generatedAt:new Date().toISOString(),briefingMarkdown:'Facility review based on current census.',metricsSummary:{activeInpatients:999,averageDischargeTatMinutes:999,slaTargetMinutes:45,reclaimedBedHoursLast24h:99,trappedCapitalPesos:999,criticalDepartmentBottleneck:'HMO_FINAL_LOA'},topRecommendations:[]};}
  else if(properties.cardType){assert.equal(payload.contents[0].parts[1].inlineData.mimeType,'image/png');result={cardType:'UNKNOWN',idNumber:'',memberFullName:'',dateOfBirth:null,providerName:null,validUntil:null,confidenceScore:0,rawExtractedFields:{}};}
  else result={answer:'live transport fixture'};
  const text=transportMode==='invalid-schema'?'{}':transportMode==='invalid-json'?'invalid':JSON.stringify(result);
  return Response.json({candidates:[{finishReason:transportMode==='truncated'?'MAX_TOKENS':'STOP',content:{parts:[{text}]}}],usageMetadata:{promptTokenCount:10,candidatesTokenCount:20}});
};
let checks=0;
const check=(name:string)=>{checks++;console.log(`[PASS] ${name}`);};
try {
  const client=new GeminiClient(env);
  await assert.rejects(client.generate({prompt:'test',env:{GEMINI_API_KEY:''}}),e=>e instanceof AiInferenceError&&e.code==='AI_NOT_CONFIGURED');check('Missing key fails; no mock success');
  for(const mode of ['quota','network','invalid-json','truncated']){
    transportMode=mode;const before=calls;
    await assert.rejects(client.generate({prompt:'test',responseMimeType:'application/json'}),AiInferenceError);
    assert.equal(calls-before,2);check(`${mode}: tries distinct live backup and then fails`);
  }
  transportMode='forbidden';const before=calls;await assert.rejects(client.generate({prompt:'test'}));assert.equal(calls-before,1);check('Permanent upstream 403 fails on first request without repeated credit usage');
  transportMode='success';const live=await client.generate({prompt:'test',responseMimeType:'application/json'});assert.equal(live.isMock,false);assert.equal(live.modelUsed,'test-primary');check('Successful transport identifies actual model');
  for(const role of ['BILLING_SPECIALIST','CLAIMS_ENCODER','HMO_COORDINATOR','HOSPITAL_CFO','ATTENDING_PHYSICIAN']){
    user.role=role;
    for(const f of fixtures){
      const res=await request('/hmo/generate-appeal',{encounterId:f.id,deniedItemDescription:f.item.description,deniedAmount:f.amount});
      assert.equal(res.status,200,`${role} first appeal click failed`);
      const data:any=await res.json();assert.match(data.appealLetterMarkdown,new RegExp(f.item.description));assert.match(data.appealLetterMarkdown,new RegExp(f.diagnosis));assert.equal(data.attendingPhysicianName,'Synthetic Physician');assert.equal(data.modelUsed,'test-primary');assert.doesNotMatch(data.appealLetterMarkdown,/laparoscop|dengue|trocar/i);
    }
    const scrub=await request('/claims/preflight-scrub',{encounterId:fixtures[1].id});assert.equal(scrub.status,200,`${role} first scrub click failed`);
    const audit:any=await scrub.json();assert.equal(audit.rthRiskScore,.44);assert.equal(audit.riskLevel,'CRITICAL');assert.equal(audit.passThreshold,false);assert.equal(audit.cleanClaimReadiness,56);assert.equal(audit.riskCalculation.baseRisk+audit.riskCalculation.penalties.reduce((n:number,p:any)=>n+p.points,0),.44);assert.match(audit.clinicalSummary,/Distal radius fracture/);
    check(`${role}: first-click appeals stay case-specific; scrub score/readiness/math agree`);
  }
  transportMode='info-flags';const infoAudit:any=await(await request('/claims/preflight-scrub',{encounterId:fixtures[1].id})).json();assert.equal(infoAudit.rthRiskScore,.44);assert.equal(infoAudit.passThreshold,false);transportMode='success';check('Known chart omissions cannot be downgraded to INFO by the model');
  assert.ok(writes.every(w=>w.params.includes(fixtures[1].id)));assert.equal(fixtures[1].claim.rthRiskScore,'0.4400');check('Risk is persisted only to selected claim');
  assert.equal((await request('/hmo/generate-appeal',{encounterId:fixtures[0].id})).status,400);check('Missing denied charge never defaults to surgery');
  transportMode='invalid-schema';const failed=await request('/hmo/generate-appeal',{encounterId:fixtures[0].id,deniedItemDescription:fixtures[0].item.description,deniedAmount:800});assert.equal(failed.status,502);assert.equal((await failed.json() as any).error.code,'AI_INVALID_RESPONSE');check('Invalid provider schema is rejected, never replaced with a letter');transportMode='success';
  const briefing:any=await(await request('/executive/briefing',{forceRefresh:true})).json();assert.equal(briefing.metricsSummary.activeInpatients,2);assert.equal(briefing.metricsSummary.trappedCapitalPesos,2000);assert.equal(briefing.metricsSummary.reclaimedBedHoursLast24h,null);check('Executive figures use actual census including unknown metrics');
  const ocr=await request('/ocr/extract-card',{imageBase64:'data:image/png;base64,aW1hZ2U='});assert.equal(ocr.status,200);assert.equal((await ocr.json() as any).idNumber,'');check('OCR preserves image MIME and accepts no invented identifier');
  transportMode='network';const writesBeforeFailure=writes.length;
  for(const [path,body] of [
    ['/hmo/generate-appeal',{encounterId:fixtures[0].id,deniedItemDescription:fixtures[0].item.description,deniedAmount:800}],
    ['/claims/preflight-scrub',{encounterId:fixtures[0].id}],
    ['/cora/chat',{encounterId:fixtures[0].id,message:'Explain the balance'}],
    ['/executive/briefing',{forceRefresh:true}],
    ['/ocr/extract-card',{imageBase64:'data:image/png;base64,aW1hZ2U='}]
  ] as const){const response=await request(path,body);assert.equal(response.status,503,path);const failure:any=await response.json();assert.equal(failure.error.code,'AI_UNAVAILABLE');assert.equal(failure.reply,undefined);assert.equal(failure.appealLetterMarkdown,undefined);}
  assert.equal(writes.length,writesBeforeFailure);transportMode='success';check('All five service routes report provider outage without fake success or saved risk');
  user.role='PATIENT_GUARANTOR';const own=await request('/cora/chat',{encounterId:fixtures[0].id,message:'Explain my bill for Synthetic Patient Alpha.'});assert.equal(own.status,200);assert.equal((await own.json() as any).groundedBalance.remainingBalance,800);const beforeForeign=calls;assert.equal((await request('/cora/chat',{encounterId:fixtures[1].id,message:'Show another patient'})).status,404);assert.equal(calls,beforeForeign);assert.equal((await request('/cora/chat',{message:'My balance?'})).status,400);assert.equal((await request('/claims/preflight-scrub',{encounterId:fixtures[0].id})).status,403);check('Patient Cora uses own real balance and rejects another patient before AI');
  user.role='BILLING_SPECIALIST';transportMode='mutate-chart';const writeCount=writes.length;const stale=await request('/claims/preflight-scrub',{encounterId:fixtures[0].id});assert.equal(stale.status,409);assert.equal((await stale.json() as any).error.code,'AI_STALE_CONTEXT');assert.equal(writes.length,writeCount);fixtures[0].claim.cf4VitalsRecorded=true;transportMode='success';check('Changed chart rejects outdated audit before persistence');
  user=null;assert.equal((await request('/claims/preflight-scrub',{encounterId:fixtures[0].id})).status,401);check('Anonymous staff generation remains forbidden');
  const networkError=new Error('NETWORK_ERROR');const mobile=createAiApi({request:async()=>{throw networkError;}} as any);await assert.rejects(mobile.sendCoraMessage('test'),e=>e===networkError);check('Mobile propagates network error instead of fake successful answer');
  const capped=normalizeAuditRisk({esoaXmlConformity:true,flags:[{category:'MISSING_CF4_FIELD',severity:'CRITICAL',field:'vitals',description:'Missing vitals'},{category:'MISSING_CF4_FIELD',severity:'CRITICAL',field:'course',description:'Missing course'},{category:'DIAGNOSTIC_DISCREPANCY',severity:'CRITICAL',field:'icd',description:'Mismatch'}]} as any);assert.equal(capped.rthRiskScore,.99);assert.equal(capped.cleanClaimReadiness,1);assert.match(capped.riskCalculation!.formula,/capped/);check('Risk clamp, formula and readiness remain coherent');
  const duplicate=normalizeAuditRisk({esoaXmlConformity:true,flags:[{category:'MISSING_CF4_FIELD',severity:'CRITICAL',field:'cf4.admissionVitals',description:'Missing vitals'},{category:'MISSING_CF4_FIELD',severity:'CRITICAL',field:'cf4VitalsRecorded',description:'Missing vitals'}]} as any);assert.equal(duplicate.rthRiskScore,.44);check('Canonical deficiency scoring prevents duplicate penalties');
  const invalidXml=normalizeAuditRisk({esoaXmlConformity:false,flags:[]} as any);assert.equal(invalidXml.passThreshold,false);check('Nonconforming XML cannot pass readiness');
  const raw='Synthetic Patient Alpha, MRN-ALPHA, Bed 101';const scrubbed=scrubPatientData(raw,{fullName:fixtures[0].name,mrn:fixtures[0].mrn,roomBed:'Bed 101'});assert.equal(rehydrateText(scrubbed.scrubbedText,scrubbed.tokenMap),raw);check('PHI tokens round-trip exactly');
  console.log(`AI REGRESSION CHECKS DONE: ${checks} passed; isolated DB and injected provider transport; no Gemini credits used.`);
}finally{globalThis.fetch=originalFetch;delete process.env.TEST_LIVE_AI;}
