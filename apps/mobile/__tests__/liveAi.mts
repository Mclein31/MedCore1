/// <reference path="../node_modules/react-native/src/types/globals.d.ts" />
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Run from apps/mobile. Uses the same HTTP client and AI service as the app.
process.loadEnvFile('.env');
process.env.NODE_ENV = 'production';
const { ApiClient } = await import('../src/lib/api');
const { createAiApi } = await import('../src/services/aiApi');
const { createPatientApi } = await import('../src/services/patientApi');
let token: string | null = null;
let selectedPatientId: string | null = null;
let client = new ApiClient(async () => token);
try {
  const credentials = process.env.MEDCORE_MOBILE_AI_VERIFY_EMAIL && process.env.MEDCORE_MOBILE_AI_VERIFY_PASSWORD
    ? { email: process.env.MEDCORE_MOBILE_AI_VERIFY_EMAIL, password: process.env.MEDCORE_MOBILE_AI_VERIFY_PASSWORD, facilityCode: 'SJMC-MNL' }
    : { email: 'mobile.admin.demo@example.test', password: process.env.SEED_PASSWORD, facilityCode: 'SJMC-MNL' };
  assert.ok(credentials.password, 'Set MEDCORE_MOBILE_AI_VERIFY_PASSWORD or SEED_PASSWORD.');
  const login:any = await client.request('/auth/login', { method:'POST', body:JSON.stringify(credentials) });
  token=login.token;
  assert.ok(token);
  assert.ok(login.user.role === 'PATIENT_GUARANTOR' || login.user.mobileDemoAdmin === true);
  let enc;
  if (login.user.mobileDemoAdmin) {
    const directory=await createPatientApi(client).listHospitalPatients();
    for (const patient of directory.items.slice(0, 15)) {
      selectedPatientId=patient.id;
      client = new ApiClient(async () => token, undefined, { patientId: selectedPatientId, getCurrent: () => selectedPatientId });
      const overview=await createPatientApi(client).getOverview();
      if (overview.currentEncounter?.uuid) { enc=overview.currentEncounter; break; }
    }
  } else enc=(await createPatientApi(client).getOverview()).currentEncounter;
  assert.ok(enc?.uuid, 'The selected patient needs a recorded encounter; no default chart may be substituted.');
  const ai=createAiApi(client);
  const balance=await ai.sendCoraMessage('Explain my actual remaining bill balance.','en',enc.uuid,'WHY_DO_I_OWE');
  assert.equal(balance.scopeDecision,'ANSWERED');
  assert.doesNotMatch(balance.reply,/^(hello|hi|I['’]m Cora)/i);
  assert.equal(balance.groundedBalance.remainingBalance,Number(enc.remainingBalance));
  assert.ok(balance.modelUsed&&!balance.modelUsed.includes('fallback'));
  const stage=await ai.sendCoraMessage('Explain my current discharge stage and pending steps.','en',enc.uuid,'DISCHARGE_STATUS');
  assert.equal(stage.scopeDecision,'ANSWERED');assert.notEqual(stage.reply,balance.reply);
  assert.doesNotMatch(stage.reply,/^(hello|hi|I['’]m Cora)/i);
  console.log(JSON.stringify({feature:'mobile Cora',client:'actual mobile ApiClient + createAiApi',role:login.user.role,model:balance.modelUsed,firstRequestSucceeded:true,directAnswers:2,distinctReplies:true,groundedBalanceMatches:true}));
  if (login.user.mobileDemoAdmin) {
    let switched=false;
    const directory=await createPatientApi(client).listHospitalPatients();
    for (const patient of directory.items.filter(p=>p.id!==selectedPatientId).slice(0, 10)) {
      selectedPatientId=patient.id;
      client=new ApiClient(async()=>token,undefined,{patientId:selectedPatientId,getCurrent:()=>selectedPatientId});
      const other=(await createPatientApi(client).getOverview()).currentEncounter;
      if (!other?.uuid || Number(other.remainingBalance)===Number(enc.remainingBalance)) continue;
      const answer=await createAiApi(client).sendCoraMessage('Explain the remaining balance for this selected hospital stay.','en',other.uuid,'WHY_DO_I_OWE');
      assert.equal(answer.groundedBalance.remainingBalance,Number(other.remainingBalance));
      assert.notEqual(answer.groundedBalance.remainingBalance,balance.groundedBalance.remainingBalance);
      assert.equal(answer.scopeDecision,'ANSWERED');assert.doesNotMatch(answer.reply,/^(hello|hi|I['’]m Cora)/i);
      switched=true;
      console.log(JSON.stringify({feature:'mobile Cora patient switch',model:answer.modelUsed,changedPatientBalanceMatches:true,previousReplyDiscarded:true}));
      break;
    }
    assert.ok(switched, 'Need a second selected patient with a distinct balance to verify chart switching.');
  }
  const photo=await readFile(new URL('./fixtures/synthetic-benefit-card.png', import.meta.url));
  const ocr=await createAiApi(client).scanBenefitCard(`data:image/png;base64,${photo.toString('base64')}`,'PHILHEALTH');
  assert.equal(ocr.idNumber.replace(/\D/g,''),'121234567890');
  assert.match(ocr.memberFullName,/ARIA\s+TESTPERSON/i);
  assert.ok(ocr.modelUsed&&!ocr.modelUsed.includes('fallback'));
  console.log(JSON.stringify({feature:'mobile OCR',model:ocr.modelUsed,syntheticImageTextMatches:true,cannedCredentials:false}));
  console.log('MOBILE_LIVE_AI_VERIFIED: patient-scoped first requests, dynamic Cora responses, real image extraction through the mobile HTTP client.');
}finally{if(token)await client.request('/auth/logout',{method:'POST'}).catch(()=>{});}
