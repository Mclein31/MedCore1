import { seedPassword } from './seedPassword';
import app from '../apps/server/src/index';
import { db } from '../apps/server/src/db';
import { payments, paymentReceipts, systemAuditLogs, beds } from '../apps/server/src/db/schema';
import { eq, and, isNull } from 'drizzle-orm';

async function runApiTests() {
  console.log('================================================================================');
  console.log('AQROMED BACKEND API SUITE: COMPREHENSIVE INTEGRATION & SECURITY TESTS');
  console.log('================================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      passed++;
      console.log(`[PASS] ${testName}`);
    } else {
      failed++;
      console.error(`[FAIL] ${testName}${detail ? ` - ${detail}` : ''}`);
    }
  }

  // 1. Healthcheck
  const healthRes = await app.request('/api/health');
  assert(healthRes.status === 200, 'Healthcheck endpoint returns 200 OK');
  const healthData = await healthRes.json();
  assert(healthData.status === 'ONLINE' && healthData.system.includes('AQROMED'), 'Healthcheck reports AQROMED system ONLINE');

  // 2. Auth: Login with valid credentials
  const loginRes = await app.request('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'elena.santos@stjude.ph',
      password: seedPassword(),
      facilityCode: 'SJMC-MNL'
    })
  });
  assert(loginRes.status === 200, 'POST /api/v1/auth/login returns 200 on valid credentials');
  const loginData = await loginRes.json();
  assert(loginData.success === true && loginData.user.role === 'BILLING_SPECIALIST', 'Login hydrates Elena Santos as BILLING_SPECIALIST');

  // Extract session cookie
  const setCookieHeader = loginRes.headers.get('set-cookie');
  assert(!!setCookieHeader && setCookieHeader.includes('aqromed_session='), 'Login sets secure HTTP-Only aqromed_session cookie');

  const cookieHeader = setCookieHeader?.split(';')[0] || '';
  const staffGet = (path: string) => app.request(path, { headers: { Cookie: cookieHeader } });

  // 3. Auth: Invalid Login
  const invalidLoginRes = await app.request('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'elena.santos@stjude.ph',
      password: 'WrongPassword!',
      facilityCode: 'SJMC-MNL'
    })
  });
  assert(invalidLoginRes.status === 401, 'POST /api/v1/auth/login rejects incorrect password with 401');

  // 4. Auth: GET /api/v1/auth/me
  const meRes = await app.request('/api/v1/auth/me', {
    headers: { Cookie: cookieHeader }
  });
  assert(meRes.status === 200, 'GET /api/v1/auth/me returns 200 with valid session cookie');
  const meData = await meRes.json();
  assert(meData.user.email === 'elena.santos@stjude.ph', 'Session cookie correctly resolves authenticated user');

  // 5. Encounters: GET /api/v1/encounters
  const encsRes = await staffGet('/api/v1/encounters');
  assert(encsRes.status === 200, 'GET /api/v1/encounters returns 200 OK');
  const encsData = await encsRes.json();
  assert(encsData.items && encsData.items.length === 250, 'GET /api/v1/encounters returns all 250 hospital records');

  // 6. Encounters: GET /api/v1/encounters/:id
  const singleEncRes = await staffGet('/api/v1/encounters/enc-8812');
  assert(singleEncRes.status === 200, 'GET /api/v1/encounters/enc-8812 resolves hydrated encounter');
  const singleEncData = await singleEncRes.json();
  assert(singleEncData.patient.fullName.includes('DELA CRUZ'), 'Encounter correctly links patient demographics');
  assert(singleEncData.items.length > 0, 'Encounter includes itemized chargemaster records');
  assert(singleEncData.waterfall.grossTotal === 120000, 'Encounter waterfall gross total is exactly ₱120,000.00');

  // 7. Ledger: GET /api/v1/encounters/:id/ledger
  const ledgerRes = await staffGet('/api/v1/encounters/enc-8812/ledger');
  assert(ledgerRes.status === 200, 'GET /api/v1/encounters/:id/ledger returns 200 OK');
  const ledgerData = await ledgerRes.json();
  assert(ledgerData.items.length === singleEncData.items.length, 'Ledger item count matches encounter items');

  // 8. Clearance: Doctor QuickSign & Ceiling
  // Test unauthorized role trying to sign
  const unauthSignRes = await app.request('/api/v1/encounters/enc-8812/doctor/sign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieHeader },
    body: JSON.stringify({ agreedFee: 15000 })
  });
  // Elena Santos is BILLING_SPECIALIST, doctor/sign requires ATTENDING_PHYSICIAN or HOSPITAL_CFO
  assert(unauthSignRes.status === 403, 'POST /api/v1/encounters/:id/doctor/sign rejects non-physician role with 403 Forbidden');

  // Verify X-Demo-Role: ATTENDING_PHYSICIAN allows role override in dev/demo mode
  const demoRoleSignRes = await app.request('/api/v1/encounters/enc-8812/doctor/sign', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader,
      'X-Demo-Role': 'ATTENDING_PHYSICIAN'
    },
    body: JSON.stringify({ agreedFee: 15000 })
  });
  assert(demoRoleSignRes.status === 200, 'POST /api/v1/encounters/:id/doctor/sign succeeds with X-Demo-Role: ATTENDING_PHYSICIAN');

  // Switch to CFO or Doctor to sign
  const cfoLoginRes = await app.request('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'arthur.delgado@stjude.ph',
      password: seedPassword(),
      facilityCode: 'SJMC-MNL'
    })
  });
  const cfoCookie = cfoLoginRes.headers.get('set-cookie')?.split(';')[0] || '';

  const doctorSignRes = await app.request('/api/v1/encounters/enc-8812/doctor/sign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cfoCookie },
    body: JSON.stringify({ agreedFee: 15000 })
  });
  assert(doctorSignRes.status === 200, 'POST /api/v1/encounters/:id/doctor/sign succeeds with authorized CFO/Physician role');

  // 9. Clearance: Pharmacy RTS audit
  const rtsRes = await app.request('/api/v1/encounters/enc-8812/pharmacy/clear-rts', {
    method: 'POST',
    headers: { Cookie: cookieHeader }
  });
  assert(rtsRes.status === 200, 'POST /api/v1/encounters/:id/pharmacy/clear-rts succeeds for Billing Specialist');
  const rtsData = await rtsRes.json();
  assert(rtsData.encounter.pharmacyRtsCleared === true, 'Pharmacy RTS state cleared to true');

  // 10. Clearance: HMO Final LOA
  const hmoRes = await app.request('/api/v1/encounters/enc-8812/hmo/final-loa', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieHeader },
    body: JSON.stringify({
      approvalCode: 'APV-992100',
      approvedAmount: 50514.29
    })
  });
  assert(hmoRes.status === 200, 'POST /api/v1/encounters/:id/hmo/final-loa updates approval code & approved amount');

  // 11. Disputes: File Dispute & Supervisory Waiver
  const disputeRes = await app.request('/api/v1/encounters/enc-8812/disputes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieHeader },
    body: JSON.stringify({
      chargeId: singleEncData.items[0].id,
      reason: 'Patient questions sundry kit fees',
      disputeCategory: 'UNCONSUMED_SUPPLY'
    })
  });
  assert(disputeRes.status === 200, 'POST /api/v1/encounters/:id/disputes successfully files dispute');
  const disputeData = await disputeRes.json();
  const createdDisputeId = disputeData.dispute.id;

  // 11b. Test Deletion Guard on Disputed Item (Finding 1)
  const deleteDisputedRes = await app.request(`/api/v1/charges/${singleEncData.items[0].id}`, {
    method: 'DELETE',
    headers: { Cookie: cfoCookie }
  });
  assert(deleteDisputedRes.status === 400, 'DELETE /api/v1/charges/:id rejects deleting disputed item with 400 Bad Request');
  const deleteDisputedData = await deleteDisputedRes.json();
  assert(deleteDisputedData.error?.code === 'ITEM_HAS_DISPUTES', 'Error code is ITEM_HAS_DISPUTES when deleting disputed item');

  const waiveRes = await app.request(`/api/v1/disputes/${createdDisputeId}/supervisory-waive`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cfoCookie },
    body: JSON.stringify({
      supervisorNotes: 'Waived under CFO executive authority for dispute resolution.'
    })
  });
  assert(waiveRes.status === 200, 'POST /api/v1/disputes/:id/supervisory-waive executes waiver and reconciles balance');

  // 12. Payments: Validation, Alphanumeric Idempotency, and Gate Pass Settlement
  // 12a. Validate Idempotency-Key length constraint (> 128 chars returns 400 Bad Request)
  const oversizedKey = 'A'.repeat(129);
  const oversizedRes = await app.request('/api/v1/encounters/enc-8812/payments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader,
      'Idempotency-Key': oversizedKey
    },
    body: JSON.stringify({
      amount: 1000,
      paymentRail: 'QR_PH',
      payerName: 'Dela Cruz, Juan S.'
    })
  });
  assert(oversizedRes.status === 400, 'POST /api/v1/encounters/:id/payments rejects Idempotency-Key > 128 characters with 400 Bad Request');
  const oversizedData = await oversizedRes.json();
  assert(oversizedData.error?.code === 'INVALID_IDEMPOTENCY_KEY', 'Error code is INVALID_IDEMPOTENCY_KEY for oversized header');

  // 12b. Alphanumeric Idempotency Key (QRPH Reference Format)
  const qrphKey = 'TXN-DEMO-QRPH-123456';
  const qrphPayload = {
    amount: 2500,
    paymentRail: 'QR_PH',
    payerName: 'Dela Cruz, Juan S.',
    payerContactMasked: '0917-***-8812',
    notes: 'QRPH test partial settlement'
  };

  const payRes1 = await app.request('/api/v1/encounters/enc-8812/payments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader,
      'Idempotency-Key': qrphKey
    },
    body: JSON.stringify(qrphPayload)
  });
  assert(payRes1.status === 200, 'POST /api/v1/encounters/:id/payments records QRPH payment with alphanumeric key');
  const payData1 = await payRes1.json();
  assert(payData1.receipt && payData1.receipt.officialReceiptNumber.startsWith('OR-SJMC-'), 'Official Receipt generated for QRPH payment');
  assert(payData1.payment.idempotencyKey === qrphKey, 'Payment idempotency key matches alphanumeric QRPH string');

  // Duplicate payment with same Idempotency-Key header must return cached record with 0 extra debit
  const payResDuplicate = await app.request('/api/v1/encounters/enc-8812/payments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader,
      'Idempotency-Key': qrphKey
    },
    body: JSON.stringify(qrphPayload)
  });
  assert(payResDuplicate.status === 200, 'Duplicate payment submission returns 200 OK');
  const payDataDuplicate = await payResDuplicate.json();
  assert(payDataDuplicate.cached === true, 'Idempotency guard caught duplicate request and returned cached payment record');
  assert(payDataDuplicate.payment.id === payData1.payment.id, 'Idempotency key matched exact previous payment ID');
  assert(payDataDuplicate.encounter.remainingBalance === payData1.encounter.remainingBalance, 'Zero duplicate debit applied to encounter remaining balance');

  // 12c. Alphanumeric Idempotency Key (GCASH Reference Format)
  const gcashKey = 'TXN-DEMO-GCASH-123456';
  const gcashPayload = {
    amount: 2500,
    paymentRail: 'GCASH',
    payerName: 'Dela Cruz, Juan S.',
    payerContactMasked: '0917-***-8812',
    notes: 'GCash test partial settlement'
  };

  const payResGcash = await app.request('/api/v1/encounters/enc-8812/payments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader,
      'Idempotency-Key': gcashKey
    },
    body: JSON.stringify(gcashPayload)
  });
  assert(payResGcash.status === 200, 'POST /api/v1/encounters/:id/payments records GCash payment with alphanumeric key');
  const payData2 = await payResGcash.json();
  assert(payData2.payment.idempotencyKey === gcashKey, 'Payment record persists alphanumeric TXN-DEMO-GCASH-123456 key');

  // 12d. Atomic Transaction Rollback Guarantee
  const rollbackKey = `TXN-DEMO-ROLLBACK-${Date.now()}`;
  const rollbackPaymentId = crypto.randomUUID();
  const rollbackReceiptNumber = `OR-SJMC-ROLLBACK-${crypto.randomUUID()}`;
  let txErrorCaught = false;
  try {
    await db.transaction(async (tx) => {
      await tx.insert(payments).values({
        id: rollbackPaymentId,
        paymentReference: `PAY-ROLLBACK-${Date.now().toString().slice(-6)}`,
        encounterId: payData1.payment.encounterId,
        statementNumber: 'SOA-ROLLBACK-TEST',
        amount: '1000.00',
        currency: 'PHP',
        paymentRail: 'GCASH',
        channelReference: 'TXN-ROLLBACK',
        gatewayAuthCode: 'AUTH-TEST',
        officialReceiptNumber: rollbackReceiptNumber,
        payerName: 'Rollback Tester',
        payerContactMasked: '0917-***-0000',
        status: 'SUCCESS',
        isSimulatedDemo: true,
        idempotencyKey: rollbackKey,
        settledAt: new Date()
      });
      await tx.insert(paymentReceipts).values({
        paymentId: rollbackPaymentId, encounterId: payData1.payment.encounterId,
        receiptNumber: `REC-${rollbackPaymentId}`, officialReceiptNumber: rollbackReceiptNumber,
        amount: '1000.00', paymentRail: 'GCASH', payerName: 'Rollback Tester',
        payerContactMasked: '0917-***-0000', gatewayAuthCode: 'AUTH-TEST'
      });
      await tx.insert(systemAuditLogs).values({
        facilityId: loginData.user.facilityId, userId: loginData.user.id,
        actorRole: loginData.user.role, action: 'PAYMENT_ROLLBACK_TEST',
        resourceType: 'payments', resourceId: rollbackPaymentId
      });
      // Force an intentional error after all three writes.
      throw new Error('SIMULATED_TRANSACTION_FAILURE_ROLLBACK');
    });
  } catch (err: any) {
    if (err.message === 'SIMULATED_TRANSACTION_FAILURE_ROLLBACK') {
      txErrorCaught = true;
    }
  }
  assert(txErrorCaught, 'Simulated transaction exception caught as expected');
  const rollbackCheck = await Promise.all([
    db.select().from(payments).where(eq(payments.idempotencyKey, rollbackKey)),
    db.select().from(paymentReceipts).where(eq(paymentReceipts.officialReceiptNumber, rollbackReceiptNumber)),
    db.select().from(systemAuditLogs).where(eq(systemAuditLogs.resourceId, rollbackPaymentId))
  ]);
  assert(rollbackCheck[0].length === 0, 'Atomic rollback: zero payments committed');
  assert(rollbackCheck[1].length === 0, 'Atomic rollback: zero payment_receipts committed');
  assert(rollbackCheck[2].length === 0, 'Atomic rollback: zero system_audit_logs committed');

  // 13. Promissory Note: RA 9439 0% Interest Execution
  const promissoryRes = await app.request('/api/v1/encounters/enc-8812/promissory-notes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieHeader },
    body: JSON.stringify({
      borrowerName: 'Dela Cruz, Juan S.',
      borrowerRelationship: 'PATIENT',
      borrowerIdType: 'PHILSYS_NATIONAL_ID',
      borrowerIdNumber: '1924-8812-4019-2041',
      installmentMonths: 6,
      principalAmount: payData2.encounter.remainingBalance
    })
  });
  assert(promissoryRes.status === 200, 'POST /api/v1/encounters/:id/promissory-notes executes promissory note');
  const promissoryData = await promissoryRes.json();
  assert(promissoryData.promissoryNote.interestRate === '0.0000', 'Promissory note enforces strictly 0.00% interest rate under RA 9439');
  assert(promissoryData.encounter.stage === 'CLEARED_GATE_PASS', 'Remaining balance reached ₱0.00, encounter advanced to CLEARED_GATE_PASS');
  assert(!!promissoryData.dischargePass, 'Digital gate pass issued upon clearance');

  // 14. Gate Pass: Security Lobby Verification
  const securityLoginRes = await app.request('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'bert.aquino@stjude.ph',
      password: seedPassword(),
      facilityCode: 'SJMC-MNL'
    })
  });
  const securityCookie = securityLoginRes.headers.get('set-cookie')?.split(';')[0] || '';

  const gatePass = promissoryData.dischargePass;
  const verifyPassRes = await app.request('/api/v1/discharge/passes/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: securityCookie },
    body: JSON.stringify({
      passNumber: gatePass.passNumber,
      exitPin: gatePass.exitPin
    })
  });
  assert(verifyPassRes.status === 200, 'POST /api/v1/discharge/passes/verify verifies pass at exit lobby');
  const verifyData = await verifyPassRes.json();
  assert(verifyData.status === 'VERIFIED_AT_LOBBY', 'Discharge pass status updated to VERIFIED_AT_LOBBY');

  // 14b. Test Exit Pass Re-Verification Idempotency (Finding 4)
  const reVerifyPassRes = await app.request('/api/v1/discharge/passes/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: securityCookie },
    body: JSON.stringify({
      passNumber: gatePass.passNumber,
      exitPin: gatePass.exitPin
    })
  });
  assert(reVerifyPassRes.status === 200, 'POST /api/v1/discharge/passes/verify handles already verified pass gracefully');
  const reVerifyData = await reVerifyPassRes.json();
  assert(reVerifyData.passAlreadyVerified === true, 'Exit pass re-verification flags passAlreadyVerified: true');
  assert(reVerifyData.verifiedAt === verifyData.verifiedAt, 'Exit pass re-verification preserves original verifiedAt timestamp');

  // Test invalid PIN rejection
  const invalidPinRes = await app.request('/api/v1/discharge/passes/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: securityCookie },
    body: JSON.stringify({
      passNumber: gatePass.passNumber,
      exitPin: '0000'
    })
  });
  assert(invalidPinRes.status === 400, 'Lobby verification rejects wrong exit PIN with 400 Bad Request');

  // 15. Claims: PhilHealth Circular 2023-0026 XML eSOA Export
  const esoaXmlRes = await app.request('/api/v1/claims/enc-8812/esoa-xml', {
    headers: { Cookie: cookieHeader }
  });
  assert(esoaXmlRes.status === 200, 'GET /api/v1/claims/:id/esoa-xml returns 200 OK');
  assert(esoaXmlRes.headers.get('content-type')?.includes('application/xml') === true, 'eSOA response has application/xml content-type');
  const xmlContent = await esoaXmlRes.text();
  assert(xmlContent.includes('PhilHealth-Circular-2023-0026'), 'XML payload complies with PhilHealth Circular 2023-0026');
  assert(xmlContent.includes('<ItemizedCharges>'), 'XML payload includes itemized charge ledger');

  // 16. Beds & Capacity Management
  const bedsRes = await staffGet('/api/v1/beds');
  assert(bedsRes.status === 200, 'GET /api/v1/beds returns 200 OK');
  const bedsData = await bedsRes.json();
  assert(bedsData.summary.total === 200, 'Beds endpoint audits exactly 200 operational hospital beds');

  const statusBed=bedsData.items.find((bed:any)=>!bed.currentEncounterId&&bed.status==='AVAILABLE');
  if(!statusBed)throw new Error('Bed status tests require an available bed.');
  const patchBedRes = await app.request(`/api/v1/beds/${statusBed.id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: cookieHeader },
    body: JSON.stringify({ status: 'HOUSEKEEPING' })
  });
  assert(patchBedRes.status === 200, 'PATCH /api/v1/beds/:id/status updates bed status to HOUSEKEEPING');

  // 17. Executive RCM Analytics
  const analyticsRes = await app.request('/api/v1/analytics/rcm-metrics', {
    headers: { Cookie: cfoCookie }
  });
  assert(analyticsRes.status === 200, 'GET /api/v1/analytics/rcm-metrics returns 200 OK');
  const analyticsData = await analyticsRes.json();
  assert(analyticsData.waterfall.totalGrossRevenue > 0, 'Live RCM analytics aggregates gross hospital revenue');
  assert(analyticsData.summary.cleanFirstPassRate > 90, 'Executive dashboard reports >90% clean first-pass claims rate');

  // 18. Chargemaster CRUD (Add, Edit, Delete Line Items with Qty & Unit Price)
  const addChargeRes = await app.request('/api/v1/encounters/enc-8812/charges', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieHeader },
    body: JSON.stringify({
      description: 'Comprehensive Metabolic Panel (Stat)',
      category: 'LABORATORY',
      grossAmount: 3700.00,
      qty: 2,
      unitPrice: 1850.00,
      coverageType: 'PHILHEALTH_FIRST'
    })
  });
  assert(addChargeRes.status === 200, 'POST /api/v1/encounters/:id/charges adds item to patient bill');
  const addChargeData = await addChargeRes.json();
  const addedChargeId = addChargeData.item.id;
  assert(!!addedChargeId, 'Charge item created with unique ID');
  assert(Number(addChargeData.item.quantity) === 2, 'Charge item quantity correctly persisted');
  assert(Number(addChargeData.item.unitPrice) === 1850.00, 'Charge item unitPrice correctly persisted');

  const patchChargeRes = await app.request(`/api/v1/charges/${addedChargeId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: cookieHeader },
    body: JSON.stringify({
      description: 'Comprehensive Metabolic Panel (Stat Urgent)',
      grossAmount: 4000.00,
      qty: 2,
      unitPrice: 2000.00
    })
  });
  assert(patchChargeRes.status === 200, 'PATCH /api/v1/charges/:id updates charge item');
  const patchedChargeData = await patchChargeRes.json();
  assert(Number(patchedChargeData.item.quantity) === 2, 'Patched charge item quantity correctly updated');
  assert(Number(patchedChargeData.item.unitPrice) === 2000.00, 'Patched charge item unitPrice correctly updated');

  const deleteChargeRes = await app.request(`/api/v1/charges/${addedChargeId}`, {
    method: 'DELETE',
    headers: { Cookie: cookieHeader }
  });
  assert(deleteChargeRes.status === 200, 'DELETE /api/v1/charges/:id removes charge item');

  const availableBeds=await db.select().from(beds).where(and(eq(beds.status,'AVAILABLE'),isNull(beds.currentEncounterId))).limit(3);
  if(availableBeds.length<3)throw new Error('Admission tests require three available fixture beds.');
  // 19. Inpatient Encounter CRUD (Admit, Edit, Delete)
  // The previous 4-digit generator collides with seeded enc8812 at this RNG value.
  const previousRandom=Math.random;Math.random=()=>7812/9000;
  const admitRes = await app.request('/api/v1/encounters', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieHeader },
    body: JSON.stringify({
      fullName: 'Santos, Roberto G.',
      mrn: 'MRN-2026-9999',
      roomBed: availableBeds[0].bedNumber,
      roomCategory: 'REGULAR_PRIVATE',
      primaryDiagnosis: 'Acute Appendicitis',
      dailyRoomRate: 3200
    })
  }).finally(()=>{Math.random=previousRandom;});
  assert(admitRes.status === 200, 'POST /api/v1/encounters admits new patient without fixture-number collisions');
  const admitData = await admitRes.json();
  const newEncounterId = admitData.encounter.id;
  assert(!!newEncounterId, 'Encounter created with encounter number');

  const badAdmission=await app.request('/api/v1/encounters',{method:'POST',headers:{'Content-Type':'application/json',Cookie:cookieHeader},body:JSON.stringify({fullName:'Bed Integrity Probe',mrn:'MRN-BED-REJECT',roomBed:availableBeds[0].bedNumber,primaryDiagnosis:'Test diagnosis'})});
  assert(badAdmission.status===409,'Admission rejects an already occupied bed');
  const badEdit=await app.request(`/api/v1/encounters/${newEncounterId}`,{method:'PATCH',headers:{'Content-Type':'application/json',Cookie:cookieHeader},body:JSON.stringify({roomBed:'NO-SUCH-BED'})});
  assert(badEdit.status===400,'Editing to an unknown bed rejects before metadata writes');
  const originalBed=await db.select().from(beds).where(eq(beds.id,availableBeds[0].id));
  assert(originalBed[0].status==='OCCUPIED'&&originalBed[0].currentEncounterId===admitData.encounter.uuid,'Rejected bed operations preserve the current owner');
  const editEncRes = await app.request(`/api/v1/encounters/${newEncounterId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: cookieHeader },
    body: JSON.stringify({
      primaryDiagnosis: 'Acute Gangrenous Appendicitis s/p Laparoscopic Appendectomy',
      slaStatus: 'ON_TRACK',
      roomBed: availableBeds[1].bedNumber
    })
  });
  assert(editEncRes.status === 200, 'PATCH /api/v1/encounters/:id updates clinical diagnosis and roomBed');
  const editedEncData = await editEncRes.json();
  assert(editedEncData.encounter.slaStatus === 'NORMAL', 'SLA status ON_TRACK is normalized to NORMAL in database');
  assert(editedEncData.encounter.roomBed === availableBeds[1].bedNumber, 'Encounter roomBed successfully updated to selected available bed');

  // 19b. Patient MRN Reuse on Readmission (Finding 6)
  const readmitRes = await app.request('/api/v1/encounters', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieHeader },
    body: JSON.stringify({
      fullName: 'Santos, Roberto G.',
      mrn: 'MRN-2026-9999', // Reusing same MRN
      roomBed: availableBeds[2].bedNumber,
      roomCategory: 'REGULAR_PRIVATE',
      primaryDiagnosis: 'Post-operative Evaluation',
      dailyRoomRate: 3200
    })
  });
  assert(readmitRes.status === 200, 'POST /api/v1/encounters safely reuses existing patient on matching MRN without constraint crash');
  const readmitData = await readmitRes.json();
  const readmitEncId = readmitData.encounter.id;

  // Clean up readmitted encounter
  await app.request(`/api/v1/encounters/${readmitEncId}`, {
    method: 'DELETE',
    headers: { Cookie: cfoCookie }
  });

  // 19c. Central Supplies & Category Mapping in Chargemaster (Finding 4)
  const centralSuppliesRes = await app.request(`/api/v1/encounters/${newEncounterId}/charges`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieHeader },
    body: JSON.stringify({
      description: 'Sterile Laparotomy Pack',
      category: 'CENTRAL_SUPPLIES',
      grossAmount: 4500.00,
      code: 'CHG-CSR-TEST-001'
    })
  });
  assert(centralSuppliesRes.status === 200, 'POST /charges accepts CENTRAL_SUPPLIES category');
  const centralData = await centralSuppliesRes.json();
  assert(centralData.item.category === 'CENTRAL_SUPPLIES', 'Inserted item has category CENTRAL_SUPPLIES');

  // Edit by Code with legacy MEDICAL_SUPPLIES alias
  const patchByCodeRes = await app.request('/api/v1/charges/CHG-CSR-TEST-001', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: cookieHeader },
    body: JSON.stringify({
      description: 'Sterile Laparotomy Pack (Reinforced)',
      category: 'MEDICAL_SUPPLIES' // Should map to CENTRAL_SUPPLIES
    })
  });
  assert(patchByCodeRes.status === 200, 'PATCH /charges/:id matches by item code and maps MEDICAL_SUPPLIES to CENTRAL_SUPPLIES');
  const patchedItemData = await patchByCodeRes.json();
  assert(patchedItemData.item.category === 'CENTRAL_SUPPLIES', 'Category correctly mapped to CENTRAL_SUPPLIES enum');

  // Delete by Code
  const deleteByCodeRes = await app.request('/api/v1/charges/CHG-CSR-TEST-001', {
    method: 'DELETE',
    headers: { Cookie: cookieHeader }
  });
  assert(deleteByCodeRes.status === 200, 'DELETE /charges/:id matches and deletes item by item code');

  // 19d. Role Switch Flexibility (Finding 3)
  const switchRoleRes1 = await app.request('/api/v1/auth/switch-role', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieHeader },
    body: JSON.stringify({ role: 'HMO_COORDINATOR' })
  });
  assert(switchRoleRes1.status === 200, 'POST /auth/switch-role accepts { role: "HMO_COORDINATOR" }');

  const switchRoleRes2 = await app.request('/api/v1/auth/switch-role', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieHeader },
    body: JSON.stringify({ targetRole: 'CLAIMS_ENCODER' })
  });
  assert(switchRoleRes2.status === 200, 'POST /auth/switch-role accepts { targetRole: "CLAIMS_ENCODER" }');

  // 19e. Cookie Path Validation (Finding 14)
  assert(!!setCookieHeader && setCookieHeader.toLowerCase().includes('path=/'), 'Session cookie specifies Path=/');

  const deleteEncRes = await app.request(`/api/v1/encounters/${newEncounterId}`, {
    method: 'DELETE',
    headers: { Cookie: cfoCookie }
  });
  assert(deleteEncRes.status === 200, 'DELETE /api/v1/encounters/:id removes encounter record');

  // 20. Authentication: Session Logout
  const logoutRes = await app.request('/api/v1/auth/logout', {
    method: 'POST',
    headers: { Cookie: cookieHeader }
  });
  assert(logoutRes.status === 200, 'POST /api/v1/auth/logout invalidates session');

  console.log('\n================================================================================');
  console.log(`API TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runApiTests().catch((err) => {
  console.error('Fatal API test runner error:', err);
  process.exit(1);
});
