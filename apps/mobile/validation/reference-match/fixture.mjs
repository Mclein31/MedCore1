// Loopback-only synthetic UI fixture. No database, hospital accounts or gateway.
import http from 'node:http';
const user = { id: 'ui-test-user', fullName: 'Alex Rivera', email: 'patient@example.test', role: 'PATIENT_GUARANTOR' };
const patient = { id: 'ui-test-patient', mrn: 'TEST-001', fullName: 'Alex Rivera', contactNumber: '09**-***-0000', philhealthPinMasked: '**-****-0000', gender: 'FEMALE', isSeniorCitizen: false, isPwd: false };
const enc = { id: 'ui-test-stay', uuid: 'ui-test-stay', encounterNumber: 'ENC-TEST-001', billNumber: 'SOA-TEST-001', admissionDate: '2026-10-06T08:00:00Z', roomBed: '301-A', roomCategory: 'WARD', stage: 'PENDING_SETTLEMENT', primaryDiagnosis: 'Hospital stay', attendingDoctor: 'Hospital care team', amountPaid: 0, remainingBalance: 18450, waterfall: { grossHospitalCharges: 47000, grossDoctorFee: 5000, grossTotal: 52000, vatExemption: 0, seniorPwdDiscount: 0, netVatDiscountedBase: 52000, philhealthHci: 15000, philhealthPf: 5000, philhealthTotal: 20000, hmoApprovedAmount: 13550, netPatientDue: 18450, roomUpgradeExcess: 0, excludedConsumables: 0, doctorExcessPf: 0 }, items: [{ id: 'item-test', code: 'ROOM', description: 'Room and board', category: 'ROOM_BOARD', qty: 3, unitPrice: 6000, grossAmount: 18000, philhealthCovered: 10000, hmoCovered: 3000, patientOop: 5000, status: 'POSTED', plainLanguageExplainer: 'Your room charges after benefits are applied.' }], hmo: { providerName: 'Sample Health Plan', cardMasked: '**** 0000', policyMbl: 100000, mblRemaining: 86450, dailyRoomAllowance: 3000, initialLoaApproved: true, finalLoaStatus: 'APPROVED', approvedAmount: 13550, disallowedConsumables: 0 }, philhealth: { id: 'test-claim', status: 'APPROVED', caseRateCode: 'TEST-RATE', totalCaseRate: 20000, hciAmount: 15000, pfAmount: 5000, isNbb: false }, disputes: [], timeline: [] };
const payments = [], receipts = [], notes = [], keys = new Map();
let fault = 'none';
const send = (res, status, data) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type,Authorization,Idempotency-Key', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' }); res.end(JSON.stringify(data)); };
http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost'), p = url.pathname;
  if (req.method === 'OPTIONS') return send(res, 204, {});
  if (p === '/__control') {
    if (url.searchParams.get('reset') === '1') { payments.length = 0; receipts.length = 0; notes.length = 0; keys.clear(); enc.amountPaid = 0; enc.remainingBalance = 18450; }
    fault = url.searchParams.get('fault') || 'none';
    return send(res, 200, { fault, payments: payments.length, receipts: receipts.length, notes: notes.length, balance: enc.remainingBalance });
  }
  if (p === '/api/health') return send(res, 200, { facility: 'Sample Medical Center' });
  let body = ''; for await (const chunk of req) body += chunk;
  const input = body ? JSON.parse(body) : {};
  if (p.endsWith('/auth/login')) return send(res, 200, { success: true, token: 'synthetic-ui-session', user });
  if (p.endsWith('/auth/logout') || p.endsWith('/auth/forgot-password')) return send(res, 200, { success: true });
  if (p.endsWith('/auth/me')) return send(res, 200, { authenticated: true, user });
  if (req.headers.authorization !== 'Bearer synthetic-ui-session') return send(res, 401, { error: { code: 'UNAUTHORIZED' } });
  if (p === '/api/v1/patient/me') return send(res, 200, { patient });
  if (p.endsWith('/overview')) return send(res, 200, { patient, currentEncounter: enc, dischargeChecklist: [{ label: 'Hospital clearance', done: true }, { label: 'Coverage reviewed', done: true }, { label: 'Balance settlement', done: enc.remainingBalance === 0 }], alerts: [] });
  if (p === '/api/v1/patient/me/encounters') return send(res, 200, { items: [enc], total: 1 });
  if (p.includes('/patient/me/encounters/')) return send(res, 200, enc);
  if (p.includes('/patient/me/payments')) return send(res, 200, { items: payments, total: payments.length });
  if (p.includes('/patient/me/receipts')) return send(res, 200, { items: receipts, total: receipts.length });
  if (p.includes('/patient/me/promissory-notes')) return send(res, 200, { items: notes, total: notes.length });
  if (p.endsWith('/documents')) return send(res, 200, { items: [{ kind: 'STATEMENT', id: 'statement-test', title: 'Statement of account', encounterNumber: enc.encounterNumber, issuedAt: enc.admissionDate }, ...receipts.map(r => ({ kind: 'RECEIPT', id: r.id, title: r.officialReceiptNumber, encounterNumber: enc.encounterNumber, issuedAt: r.issuedAt, amount: r.amount })), ...notes.map(n => ({ kind: 'PROMISSORY_NOTE', id: n.id, title: n.noteNumber, encounterNumber: enc.encounterNumber, issuedAt: n.executedAt, amount: n.principalAmount }))] });
  if (p.endsWith('/notifications') || p.endsWith('/claims')) return send(res, 200, { items: [], total: 0 });
  if (p.endsWith('/payments') && req.method === 'POST') {
    await new Promise(resolve => setTimeout(resolve, 1200)); // Test-only observation window.
    const key = req.headers['idempotency-key'];
    if (keys.has(key)) return send(res, 200, keys.get(key));
    if (fault === 'decline') { fault = 'none'; return send(res, 409, { error: { code: 'BILL_CHANGED', message: 'Your bill changed. Review it and try again.' } }); }
    const time = new Date().toISOString(), n = payments.length + 1;
    const payment = { id: 'payment-test-' + n, paymentReference: 'PAY-TEST-' + n, encounterNumber: enc.encounterNumber, amount: input.amount, paymentRail: input.paymentRail, status: 'SUCCESS', officialReceiptNumber: 'OR-TEST-' + n, payerName: input.payerName, createdAt: time, settledAt: time, isSimulatedDemo: true };
    const receipt = { id: 'receipt-test-' + n, encounterNumber: enc.encounterNumber, receiptNumber: 'REC-TEST-' + n, officialReceiptNumber: payment.officialReceiptNumber, amount: input.amount, paymentRail: input.paymentRail, payerName: input.payerName, issuedAt: time };
    payments.push(payment); receipts.push(receipt); enc.amountPaid += input.amount; enc.remainingBalance -= input.amount;
    const result = { success: true, payment, receipt, encounter: enc }; keys.set(key, result);
    if (fault === 'unconfirmed') { fault = 'none'; return send(res, 503, { error: { code: 'TEST_INTERRUPTION' } }); }
    return send(res, 200, result);
  }
  if (p.endsWith('/promissory-notes') && req.method === 'POST') {
    await new Promise(resolve => setTimeout(resolve, 1200));
    const cents = Math.round(input.principalAmount * 100), base = Math.floor(cents / input.installmentMonths), schedule = Array.from({ length: input.installmentMonths }, (_, i) => (i === input.installmentMonths - 1 ? cents - base * (input.installmentMonths - 1) : base) / 100);
    const note = { id: 'note-test', noteNumber: 'PN-TEST-001', encounterNumber: enc.encounterNumber, borrowerName: input.borrowerName, principalAmount: input.principalAmount, totalRepayment: input.principalAmount, interestRate: 0, financingFee: 0, installmentMonths: input.installmentMonths, monthlyInstallment: base / 100, firstDueDate: '2026-11-08', status: 'ACTIVE', schedule, executedAt: new Date().toISOString() };
    notes.push(note); enc.remainingBalance -= input.principalAmount;
    return send(res, 200, { success: true, promissoryNote: note });
  }
  return send(res, 404, { error: { message: 'Fixture route unavailable' } });
}).listen(8901, '127.0.0.1', () => console.log('Synthetic UI fixture: http://127.0.0.1:8901'));
