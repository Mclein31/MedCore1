// Browser integration suite. Runs the actual provider, dashboard, confirmation
// and card/radar components. Synthetic fetch only; no hospital DB or credentials.
import { createRoot, type Root } from 'react-dom/client';
import { MedCoreProvider, useMedCore } from '../../src/context/MedCoreContext';
import { MainLayout } from '../../src/app/App';
import { apiClient } from '../../src/api';
import { INITIAL_ENCOUNTERS } from '../../src/data/mockData';
import '../../src/index.css';

type Context = ReturnType<typeof useMedCore>;
type Outcome = 'success' | 'rejected' | 'expired' | 'offline' | 'malformed';
let current: Context | null = null;
let root: Root | null = null;
let outcome: Outcome = 'success';
let release: (() => void) | null = null;
let hold = false;
let posts = 0;
let notePosts = 0;
let record = structuredClone(INITIAL_ENCOUNTERS[0]);
const originalFetch = window.fetch;
const results: Array<{ name: string; passed: boolean; error?: string }> = [];
const user = { id: 'validation-user', fullName: 'Validation Billing User', role: 'BILLING_SPECIALIST', title: 'Billing', email: 'billing@example.test', avatarInitials: 'VB' };
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }
async function waitFor(test: () => boolean, message: string) {
  const deadline = Date.now() + 2500;
  while (!test()) { if (Date.now() > deadline) throw new Error(message); await new Promise(r => setTimeout(r, 15)); }
}
function Probe() { current = useMedCore(); return <MainLayout />; }
function button(label: string, within: ParentNode = document) {
  const found = [...within.querySelectorAll<HTMLButtonElement>('button')].find(b => b.textContent?.trim() === label || b.getAttribute('aria-label') === label);
  assert(found, `Missing button: ${label}`); return found;
}
function click(label: string, within?: ParentNode) { button(label, within).click(); }
async function mount() {
  posts = 0; notePosts = 0; release = null; hold = false; outcome = 'success'; current = null;
  record = structuredClone(INITIAL_ENCOUNTERS[0]);
  record.id = 'enc-8812'; record.stage = 'HMO_FINAL_LOA'; record.doctorSignedAt = '2026-10-09T00:00:00Z'; record.pharmacyRtsCleared = true; record.hmo.finalLoaStatus = 'AWAITING_CODE'; record.hmo.approvalCode = undefined;
  record.billState = 'FINALIZED'; record.amountPaid = 0; record.remainingBalance = record.waterfall.netPatientDue;
  apiClient.setBaseUrl(location.origin); apiClient.setAuthToken('validation-session');
  window.fetch = async (url, config) => {
    const path = new URL(String(url), location.origin).pathname;
    if (path.endsWith('/auth/me')) return response({ authenticated: true, user });
    if (path.endsWith('/auth/login')) return response({ success: true, token: 'new-validation-session', user });
    if (path.endsWith('/encounters')) return response({ items: [record] });
    if (path.endsWith('/promissory-notes')) notePosts++;
    if (path.endsWith('/hmo/final-loa')) {
      posts++;
      assert(new Headers(config?.headers).get('Authorization')?.includes('validation-session'), 'Approval has no bearer session');
      if (hold) await new Promise<void>(resolve => { release = resolve; });
      if (outcome === 'offline') throw new TypeError('Network offline');
      if (outcome === 'rejected') return response({ error: { code: 'SERVER_UNAVAILABLE', message: 'Approval is unavailable. Try again.' } }, 503);
      if (outcome === 'expired') return response({ error: { code: 'UNAUTHORIZED', message: 'Authentication required. Please log in with a valid session.' } }, 401);
      if (outcome === 'malformed') return response({ success: true });
      record = { ...record, stage: 'PENDING_SETTLEMENT', hmo: { ...record.hmo, finalLoaStatus: 'APPROVED', approvalCode: 'APV-VALIDATED' } };
      return response({ success: true, encounter: record });
    }
    return response({ items: [], success: true });
  };
  root = createRoot(document.getElementById('app')!); root.render(<MedCoreProvider><Probe /></MedCoreProvider>);
  await waitFor(() => !!current?.isAuthenticated && !current.isVerifyingSession, 'Session verification did not complete');
  current!.setActiveRoute('DISCHARGE_CLEARANCE');
  await waitFor(() => current?.activeRoute === 'DISCHARGE_CLEARANCE' && [...document.querySelectorAll('button')].some(button => button.textContent?.trim() === 'Review & Confirm eLOA'), 'Radar did not load the HMO action button');
}
async function openApproval(card = false) {
  if (card) { click('6-Stage Pipeline'); await waitFor(() => document.body.textContent?.includes('Confirm eLOA Coverage') === true, 'Card action not rendered'); click('Confirm eLOA Coverage'); }
  else click('Review & Confirm eLOA');
  await waitFor(() => !!document.querySelector('[role="dialog"]'), 'Confirmation dialog did not open');
}
function confirm() { const dialog = document.querySelector('[role="dialog"]')!; click(current!.confirmationState!.confirmLabel!, dialog); }
async function check(name: string, test: () => Promise<void>) {
  try { await mount(); await test(); results.push({ name, passed: true }); }
  catch (error) { results.push({ name, passed: false, error: error instanceof Error ? error.message : String(error) }); }
  finally { release?.(); root?.unmount(); root = null; current = null; window.fetch = originalFetch; apiClient.setAuthToken(null); }
  document.getElementById('results')!.textContent = JSON.stringify({ results }, null, 2);
}
for (const card of [false, true]) await check(`${card ? 'Cards' : 'Radar'} waits for approval and blocks double submission`, async () => {
  hold = true; await openApproval(card); confirm(); confirm();
  await waitFor(() => posts === 1, 'Approval was not submitted');
  await new Promise(r => setTimeout(r, 100));
  assert(current!.confirmationState?.isOpen, 'Confirmation closed before the server responded');
  assert(document.querySelector<HTMLButtonElement>('[role="dialog"] button:last-child')?.disabled, 'Confirm remained enabled while processing');
  assert(posts === 1, 'Double click sent two approval requests');
  release!(); await waitFor(() => current!.encounters[0].hmo.finalLoaStatus === 'APPROVED', 'Confirmed LOA did not update');
});
for (const failure of ['rejected', 'offline', 'malformed'] as const) await check(`${failure} keeps the bill unchanged and permits a successful retry`, async () => {
  outcome = failure; await openApproval(); confirm();
  await waitFor(() => posts === 1, 'Failure request missing');
  await waitFor(() => !!document.querySelector('[role="alert"]'), 'No inline approval error rendered');
  assert(current!.encounters[0].stage === 'HMO_FINAL_LOA' && current!.encounters[0].hmo.finalLoaStatus === 'AWAITING_CODE', 'Rejected approval changed the bill');
  assert(current!.confirmationState?.isOpen, 'Failure closed the confirmation dialog');
  outcome = 'success'; confirm();
  await waitFor(() => current!.encounters[0].hmo.finalLoaStatus === 'APPROVED', 'Retry did not apply the server result');
  assert(current!.apiError === null, 'Old approval toast survived a successful retry');
});
await check('expired approval clears records/dialog and does not leave a stale toast after re-login', async () => {
  outcome = 'expired'; await openApproval(); confirm();
  await waitFor(() => current?.isAuthenticated === false, '401 did not return to sign-in');
  assert(current!.encounters.length === 0 && current!.confirmationState === null, 'Expired account records remained');
  await new Promise(r => setTimeout(r, 100));
  assert(current!.apiError === null, 'Expired approval recreated the backend toast');
  assert(document.body.textContent?.includes('Sign in again'), 'Login did not explain expired session');
  await current!.login({ email: user.email, password: 'validation-only', facilityCode: 'VALIDATION' });
  await waitFor(() => !!current?.isAuthenticated && !current.isVerifyingSession, 'Re-login did not finish');
  assert(current!.apiError === null, 'Stale authentication toast returned after re-login');
});
await check('a confirmed 200 response must actually contain an approved LOA', async () => {
  outcome = 'malformed';
  let rejected = false; try { await current!.approveHmoFinalLoa('enc-8812'); } catch { rejected = true; }
  assert(rejected, 'Malformed response was resolved as successful approval');
  assert(current!.encounters[0].hmo.finalLoaStatus === 'AWAITING_CODE', 'Unconfirmed response approved locally');
});
await check('invalid IDs cannot create a local note or make a promissory API request', async () => {
  const before = structuredClone(current!.encounters[0]);
  let rejected = false;
  try { await current!.executePromissoryNote(before.id, 'Validation Borrower', 'PHILSYS_NATIONAL_ID', '1234', 3, 5); }
  catch { rejected = true; }
  assert(rejected, 'Four-character ID was accepted');
  assert(notePosts === 0, 'Invalid ID was sent to the server');
  assert(JSON.stringify(current!.encounters[0]) === JSON.stringify(before), 'Invalid ID changed the local bill or pass');
});
await check('server rejection cannot produce local promissory-note success or a gate pass', async () => {
  const before = structuredClone(current!.encounters[0]);
  window.fetch = async (url) => String(url).includes('/promissory-notes')
    ? response({ error: { code: 'INVALID_GOVERNMENT_ID', message: 'ID rejected by hospital.' } }, 400)
    : response({ items: [], success: true });
  let rejected = false;
  try { await current!.executePromissoryNote(before.id, 'Validation Borrower', 'PHILSYS_NATIONAL_ID', '0123-4567-8901-2345', 3, 5); }
  catch { rejected = true; }
  assert(rejected, 'Backend rejection was swallowed');
  assert(JSON.stringify(current!.encounters[0]) === JSON.stringify(before), 'Backend rejection created a note or cleared the bill locally');
  assert(!current!.isGatePassModalOpen, 'Backend rejection opened a success pass');
});

for (const action of ['waiver', 'add', 'edit', 'delete', 'doctor', 'pharmacy', 'advance'] as const) {
  await check(`${action} rejection retains authoritative encounter state`, async () => {
    const before = structuredClone(current!.encounters[0]);
    window.fetch = async () => response({ error: { code: 'SERVER_UNAVAILABLE', message: 'Synthetic mutation rejected.' } }, 503);
    try {
      if (action === 'waiver') await current!.supervisoryWaiveItem(before.id, before.disputes[0].itemId, 'Validation waiver');
      if (action === 'add') await current!.addChargeItem(before.id, {description:'Synthetic charge',category:'LABORATORY',grossAmount:10});
      if (action === 'edit') await current!.editChargeItem(before.id, before.items[0].id, {grossAmount:10});
      if (action === 'delete') await current!.deleteChargeItem(before.id, before.items[0].id);
      if (action === 'doctor') await current!.signDoctorFee(before.id, 15000);
      if (action === 'pharmacy') await current!.clearPharmacyRts(before.id);
      if (action === 'advance') await current!.advanceStage(before.id);
    } catch { /* The UI receives the confirmed failure. */ }
    await waitFor(() => !!current!.apiError, 'The failed mutation did not report an error');
    assert(JSON.stringify(current!.encounters[0]) === JSON.stringify(before), 'Failed mutation altered balance, ledger or discharge state');
  });
}
await check('settlement and pass actions cannot manufacture local discharge clearance', async () => {
  const before = structuredClone(current!.encounters[0]);
  await current!.settlePatientBalance(before.id, 'QR_PH');
  current!.issueDigitalGatePass(before.id);
  try { await current!.verifyGatePass(before.id); } catch { /* No authoritative pass exists. */ }
  assert(JSON.stringify(current!.encounters[0]) === JSON.stringify(before), 'A local action fabricated settlement or pass state');
  assert(!current!.isGatePassModalOpen, 'An unauthorized pass was opened');
});
const passed = results.filter(r => r.passed).length;
document.title = `Dashboard LOA checks: ${passed}/${results.length}`;
document.getElementById('results')!.textContent = JSON.stringify({ done: true, passed, total: results.length, results }, null, 2);
(window as any).__dashboardLoaResults = results;
