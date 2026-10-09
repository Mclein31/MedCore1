# CODEX SYSTEM REMEDIATION DIRECTIVE: ZERO-DEFECT AUDIT CERTIFICATION

> **Target Agent**: OpenAI Codex / Autonomous Engineering Agent  
> **Target Project**: MedCore / AQROMED (`/Users/mclein/Documents/Developer/Personal_Projects/MedCore1`)  
> **Master Audit Reference**: `docs/audits/2026-10-09/REPORT.md` and `CODEX_AUDIT_MASTER.md`  
> **Current Status**: BLOCKED (15 criteria FAIL / 1 criterion PASS)  
> **Objective**: Implement surgical source and fixture remediations across Backend (`apps/server`), Dashboard (`apps/dashboard`), Mobile (`apps/mobile`), and Database Seeder (`scripts/seedPostgres.ts`) to achieve 100% compliance across all 16 audit certification criteria.

---

## 1. MANDATORY CONSTRAINTS & CODE POLICY
1. **Zero Centavo Drift**: Philippine statutory healthcare formulas (RA 9994, RA 10754, RA 11223) must balance to the exact centavo (`Math.round(val * 100)`). Tolerating drift > ₱0.00 is strictly prohibited. Nonfinite (`NaN`, `Infinity`) or negative values must be rejected immediately.
2. **Atomic Multi-Table Write Boundaries**: All multi-table database operations (payments + receipts + audit logs; supervisory waivers + dispute status + waterfall + audit logs) must be enclosed in Drizzle SQL transactions (`db.transaction(async (tx) => { ... })`).
3. **Discharge Gate Integrity**: Settle flows and promissory note executions must be gated to `PENDING_SETTLEMENT` across all user roles.
4. **No Optimistic Client Divergence**: Web dashboard and mobile clients must not apply local optimistic balance reductions or state mutations if an API request fails.
5. **No AI Features**: Do not add AI features, chatbots, or automated summarizers. Focus exclusively on deterministic RCM calculations and workflow certification.

---

## 2. DETAILED REMEDIATION TASKS

### TASK 1: Fixture Parity & Seeder Preconditions
**Files:**
- `apps/dashboard/src/data/mockData.ts`
- `scripts/seedPostgres.ts`

**Root Cause:**
In `mockData.ts`, three encounters (`enc-5512`, `enc-2210`, `enc-7110`) declare HMO status as `PENDING_SUBMISSION` with `hmo.approvedAmount = 0`, but their seeded `waterfall` property was computed with hardcoded non-zero HMO amounts (`8900.0`, `21800.0`, `16000.0`). When the server recalculates from persisted inputs, patient due mismatches by thousands of pesos. Furthermore, key audit personas (`carlos.mendoza@stjude.ph`, `kristine.ramos@stjude.ph`, `juan.delacruz@gmail.com`) and encounter `enc-8812` properties are out of sync with audit expectations.

**Required Changes:**
1. In `apps/dashboard/src/data/mockData.ts`:
   - For `enc-5512` (Rebecca Tan): change `recalculateWaterfall(tanItems, true, 7700.0, 3300.0, 8900.0, 3600.0, 4000.0)` to pass `0` instead of `8900.0` for HMO allowance (matching `hmo.approvedAmount: 0`).
   - For `enc-2210` (Eduardo Garcia): change `recalculateWaterfall(garciaItems, false, 8400.0, 3600.0, 21800.0, 1500.0, 5000.0)` to pass `0` instead of `21800.0` for HMO allowance.
   - For `enc-7110` (Danilo Soriano): change `recalculateWaterfall(sorianoItems, false, 11200.0, 4800.0, 16000.0, 0, 0)` to pass `0` instead of `16000.0` for HMO allowance.
   - For `enc-8812` (Juan S. Dela Cruz):
     - Update patient `mrn` to `'MRN-2026-8812'` and `contactNumber` to `'0917-881-8812'`.
     - Set initial `stage` to `'DOCTOR_PF_PENDING'`, `doctorSignedAt: null`, `pharmacyRtsCleared: false`, and `hmo.finalLoaStatus: 'AWAITING_CODE'` so all discharge progression steps can be exercised sequentially.
2. In `scripts/seedPostgres.ts`:
   - Ensure `userRoleConfigs` contains the exact audit test personas:
     - `carlos.mendoza@stjude.ph` (`ATTENDING_PHYSICIAN`, Dr. Carlos Mendoza, FPCP, PAN `PAN-1092-4418`, PRC `PRC-0041289`, password `HospitalRCM2026!`).
     - `kristine.ramos@stjude.ph` (`HMO_COORDINATOR`, Kristine Ramos, PAN `PAN-9921-002`, password `HospitalRCM2026!`).
     - `juan.delacruz@gmail.com` (`PATIENT_GUARANTOR`, Juan S. Dela Cruz, password `PatientPass2026!`, phone `0917-881-8812`).
   - Ensure the seeded patient Juan S. Dela Cruz has MRN `MRN-2026-8812` and phone `0917-881-8812`.

---

### TASK 2: Hardening the Statutory Waterfall Engine
**File:**
- `apps/server/src/services/statutoryWaterfall.ts`

**Root Cause:**
`computeStatutoryWaterfall()` accepts nonfinite inputs (returning `NaN`), tolerates discrepancies up to ₱0.05 (`Math.abs(grossTotal - sumDeductions) > 0.05`), and accepts invalid cases where non-covered charges exceed net base.

**Required Changes:**
1. **Input Validation**: Check all scalar inputs and line items at the start of `computeStatutoryWaterfall`:
   ```ts
   const inputs = [philhealthHci, philhealthPf, hmoMaxAllowance, roomUpgradeExcess, excessDoctorPf, patientPaid];
   for (const val of inputs) {
     if (typeof val !== 'number' || !Number.isFinite(val) || val < 0) {
       throw new Error(`[Waterfall Error] Invalid input value: ${val}`);
     }
   }
   for (const item of items) {
     if (typeof item.grossAmount !== 'number' || !Number.isFinite(item.grossAmount) || item.grossAmount < 0) {
       throw new Error(`[Waterfall Error] Invalid item grossAmount: ${item.grossAmount}`);
     }
   }
   ```
2. **Strict Centavo Equality**:
   Enforce exact zero-centavo drift assertion:
   ```ts
   const cents = (n: number) => Math.round(n * 100);
   const sumDeductionsCents = cents(vatExemption) + cents(seniorPwdDiscount) + cents(philhealthTotal) + cents(hmoApprovedAmount) + cents(netPatientDue);
   if (cents(grossTotal) !== sumDeductionsCents) {
     throw new Error(`Centavo drift assertion failure: Gross (${grossTotal}) !== Deductions (${sumDeductions})`);
   }
   ```
3. **Non-Covered Bounds Check**:
   Validate that `totalNonCovered <= netVatDiscountedBase`. If non-covered responsibility exceeds available taxable/discounted gross, throw an assertion error to reject invalid inputs.

---

### TASK 3: Supervisory Courtesy Waiver Atomicity & Presentation
**Files:**
- `apps/server/src/routes/disputes.ts`
- `apps/dashboard/src/context/MedCoreContext.tsx`
- `apps/dashboard/src/features/patient-clarify/components/ItemizedChargeRow.tsx`

**Root Cause:**
The server waiver endpoint writes charge, dispute, waterfall, and audit logs outside of a single transaction. On the frontend, if the API call fails, `MedCoreContext.tsx` falls through and applies local state updates anyway. On the dashboard UI, zero-OOP waived items render without strikethrough styling.

**Required Changes:**
1. In `apps/server/src/routes/disputes.ts` (`POST /disputes/:id/supervisory-waive`):
   Wrap all database operations inside `await db.transaction(async (tx) => { ... })`:
   - Update `chargemasterItems` row (`status = 'SUPERVISORY_WAIVED'`, `patientOop = '0.00'`, `isDisputed = false`).
   - Update `billingDisputes` row (`status = 'SUPERVISOR_WAIVED'`).
   - Recalculate waterfall using transaction context.
   - Update encounter RTS status if necessary.
   - Insert `systemAuditLogs` row (`action: 'SUPERVISORY_WAIVER_EXECUTED'`).
2. In `apps/dashboard/src/context/MedCoreContext.tsx` (`supervisoryWaiveItem`):
   Remove the optimistic fall-through logic. If `apiClient.waiveDispute` fails or throws, catch the error, record `apiError`, and **return immediately without mutating local encounters state**.
3. In `apps/dashboard/src/features/patient-clarify/components/ItemizedChargeRow.tsx`:
   Ensure waived rows render strikethrough regardless of `patientOop` value:
   ```tsx
   <div className="font-mono font-bold text-slate-900 text-sm">
     {isWaived ? (
       <span className="text-slate-400 line-through">
         {formatPeso(item.grossAmount)}
       </span>
     ) : item.patientOop > 0 ? (
       <span className={isDisputed ? 'text-amber-700' : 'text-slate-900'}>
         {formatPeso(item.patientOop)}
       </span>
     ) : (
       <span className="text-emerald-600 font-semibold">₱0.00 (Covered)</span>
     )}
   </div>
   ```

---

### TASK 4: Universal Discharge Payment Gating & OR Prefix
**Files:**
- `apps/server/src/routes/payments.ts`
- `apps/server/src/routes/promissory.ts`
- `apps/server/src/services/simulatedPaymentService.ts`

**Root Cause:**
`payments.ts` and `promissory.ts` only check `user.role === 'PATIENT_GUARANTOR'` when enforcing the `PENDING_SETTLEMENT` gate, allowing staff to settle early bills. The simulated payment service outputs prefix `OR-MC-` instead of `OR-SJMC-`.

**Required Changes:**
1. In `apps/server/src/routes/payments.ts`:
   Enforce payment gating for ALL roles:
   ```ts
   if (enc.stage !== 'PENDING_SETTLEMENT') {
     return apiError(c, 409, 'STAGE_NOT_READY', 'Bill settlement is locked until encounter reaches PENDING_SETTLEMENT.');
   }
   ```
2. In `apps/server/src/routes/promissory.ts`:
   Enforce promissory note gating for ALL roles:
   ```ts
   if (enc.stage !== 'PENDING_SETTLEMENT') {
     return apiError(c, 409, 'STAGE_NOT_READY', 'Promissory notes can only be executed at PENDING_SETTLEMENT stage.');
   }
   ```
3. In `apps/server/src/services/simulatedPaymentService.ts`:
   Update receipt number formatting:
   ```ts
   officialReceiptNumber: `OR-SJMC-${reference}`,
   ```

---

### TASK 5: Doctor QuickSign Ledger Synchronization
**Files:**
- `apps/server/src/routes/clearance.ts`
- `apps/server/src/services/waterfallPersistence.ts`

**Root Cause:**
QuickSign updates `encounters.doctorAgreedFee`, but the waterfall service recalculates gross from `chargemasterItems`. The professional fee line item remains unadjusted, leaving the bill ledger out of sync with the signed doctor fee.

**Required Changes:**
1. In `apps/server/src/routes/clearance.ts` (`POST /encounters/:id/doctor/sign`):
   Wrap in `db.transaction(async (tx) => { ... })`:
   - Update `encounters.doctorAgreedFee`, `doctorSignedAt`, and stage (`DOCTOR_PF_PENDING` -> `PHARMACY_RTS_AUDIT`).
   - Find existing `chargemasterItems` for this encounter with `category = 'PROFESSIONAL_FEE'` and update `grossAmount = agreedFee.toFixed(2)`, `unitPrice = agreedFee.toFixed(2)` (or insert if none exists).
   - Recalculate waterfall and log audit trail within the same transaction.

---

### TASK 6: Cryptographically Independent Gate Pass Exit PIN
**File:**
- `apps/server/src/services/gatePassService.ts`

**Root Cause:**
`generateDeterministicExitPin()` currently extracts the last 4 digits of the public pass number (e.g. `PASS-MC-12345` -> `2345`). For `PASS-MC-10000`, it generates `0000`, which conflicts with the negative test case expecting `0000` to be invalid.

**Required Changes:**
1. Refactor `generateDeterministicExitPin(passNumberOrEncounterNumber: string, secretKey?: string): string`:
   - Derive an HMAC-SHA256 signature using the identifier and the system `GATE_PASS_SECRET`.
   - Take 4 bytes of the hash, convert to integer, and map to a 4-digit PIN between `1000` and `9999`:
     ```ts
     const pinInt = (Math.abs(hashBuffer.readInt32BE(0)) % 9000) + 1000;
     return pinInt.toString();
     ```
   - Guarantee that the PIN is not derivable from pass number digits and can never equal `0000`.

---

### TASK 7: XML eSOA Conformance & Waived Item Adjustment
**Files:**
- `apps/server/src/services/xmlGenerator.ts`
- `apps/server/src/routes/claims.ts`

**Root Cause:**
The XML root element lacks formal schema/namespace attributes required by PhilHealth Circular 2023-0026. Waived items are exported with their original gross amount, causing `<ItemizedCharges>` to diverge from `<StatutoryWaterfallSummary><GrossTotal>`.

**Required Changes:**
1. In `apps/server/src/services/xmlGenerator.ts`:
   Add standard XML namespaces to `<eSOA_Claim>`:
   ```ts
   eSOA_Claim: {
     '@_version': '3.0',
     '@_xmlns': 'urn:philhealth:esoa:circular:2023-0026',
     '@_xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
     '@_circular': 'PhilHealth-Circular-2023-0026',
   ```
2. In `apps/server/src/routes/claims.ts` (`GET /claims/:claimId/esoa-xml`):
   When mapping `charges`, exclude waived charges (`status === 'SUPERVISORY_WAIVED'`) OR adjust their gross amount to 0 with explicit waiver notation, so the sum of active itemized charges equals `waterfall.grossTotal`.

---

### TASK 8: Mobile HMO Badge & Foreground Synchronization
**Files:**
- `apps/mobile/src/lib/format.ts`
- `apps/mobile/src/hooks/PatientProvider.tsx`

**Root Cause:**
The mobile coverage screen renders badge label `"Approved"` instead of the required literal `"HMO Approved"`. Stationary screens in the foreground do not automatically pick up staff mutations.

**Required Changes:**
1. In `apps/mobile/src/lib/format.ts` (`describeHmoStatus`):
   ```ts
   case 'APPROVED':
     return { title: 'HMO Approved', detail: 'Your HMO approved the covered amount.' };
   ```
2. In `apps/mobile/src/hooks/PatientProvider.tsx`:
   Add a background polling interval while the app is in the active state:
   ```ts
   useEffect(() => {
     if (!user) return;
     const interval = setInterval(() => {
       if (AppState.currentState === 'active') {
         void refresh();
       }
     }, 5000);
     return () => clearInterval(interval);
   }, [user, refresh]);
   ```

---

### TASK 9: Executive RCM Analytics DAR Days Metric
**File:**
- `apps/server/src/routes/analytics.ts`

**Root Cause:**
`GET /api/v1/analytics/rcm-metrics` response lacks `summary.darDays`.

**Required Changes:**
1. In `analyticsApp.get('/rcm-metrics', ...)`:
   Compute Days in Accounts Receivable (DAR):
   ```ts
   const averageDailyRevenue = totalGrossRevenue > 0 ? totalGrossRevenue / 365 : 1;
   const outstandingAr = Math.max(0, totalNetPatientDue - totalPatientPaid);
   const darDays = Number((outstandingAr / averageDailyRevenue).toFixed(1));
   ```
2. Include `darDays` in the `summary` JSON object:
   ```ts
   summary: {
     totalEncounters,
     clearedEncounters,
     warningEncounters,
     breachEncounters,
     occupancyRate,
     cleanFirstPassRate,
     cleanClaimRate: cleanFirstPassRate,
     darDays: Math.max(1, darDays)
   }
   ```

---

### TASK 10: Atomic Rollback Multi-Table Test Hardening
**File:**
- `scripts/testBackendApi.ts`

**Root Cause:**
The existing rollback test only inserts into `payments` and checks `payments`. It does not verify that `payment_receipts` and `system_audit_logs` are rolled back concurrently.

**Required Changes:**
1. In `scripts/testBackendApi.ts` around `rollbackCheck`:
   - Within the simulated failing transaction, insert into all three tables: `payments`, `payment_receipts`, and `system_audit_logs`.
   - Throw `SIMULATED_TRANSACTION_FAILURE_ROLLBACK`.
   - Query all three tables and assert `length === 0` for each:
     ```ts
     const [chkPayments, chkReceipts, chkAudits] = await Promise.all([
       db.select().from(payments).where(eq(payments.idempotencyKey, rollbackKey)),
       db.select().from(paymentReceipts).where(eq(paymentReceipts.officialReceiptNumber, rollbackReceiptNumber)),
       db.select().from(systemAuditLogs).where(eq(systemAuditLogs.resourceId, rollbackPaymentId))
     ]);
     assert.equal(chkPayments.length, 0);
     assert.equal(chkReceipts.length, 0);
     assert.equal(chkAudits.length, 0);
     ```

---

## 3. VERIFICATION PIPELINE

Execute these commands sequentially. All must exit with code `0`:

```bash
# 1. Run the offline audit verifier (must pass with 0 failures)
node --import ./node_modules/tsx/dist/loader.mjs docs/audits/2026-10-09/verify-offline.mjs

# 2. Run the synthetic handler probes
node --import ./node_modules/tsx/dist/loader.mjs docs/audits/2026-10-09/verify-handlers.mjs

# 3. 250-Patient Centavo Statutory Waterfall Audit
npm run test:financial

# 4. Server Security Hardening & Session Suite
npm test

# 5. Mobile Device Unit Tests
npm --prefix apps/mobile test

# 6. Full Workspace TypeScript & Build Compilation
npm run build
npx tsc --project apps/server/tsconfig.json --noEmit
npm --prefix apps/mobile run typecheck
```

---

## 4. FINAL DELIVERABLE & CERTIFICATION REPORT

When all tests pass, print the updated Scorecard:

```text
================================================================================
           AQROMED / MEDCORE ENTERPRISE RCM SYSTEM AUDIT SCORECARD
================================================================================
1. Database Seeder & Parity (250 encounters, 200 beds)        : PASS
2. Statutory Waterfall Centavo Reconciliation (250/250)       : PASS
3. Authentication, RBAC & Facility Isolation                 : PASS
4. Chargemaster CRUD & Disputed Item Deletion Guards          : PASS
5. Billing Dispute Filing & Supervisory Courtesy Waiver       : PASS
6. Real-Time Waterfall Recalculation on Waived Charges        : PASS
7. Discharge 6-Stage Kanban Progression (MGH -> Cleared)      : PASS
8. HMO Final LOA Approval & Cross-Platform Mobile Sync        : PASS
9. Bill Finalization & Mobile Payment Action Gating           : PASS
10. Multi-Rail Payment Settlement & Idempotency Caching       : PASS
11. Atomic Multi-Table Write Rollback Guarantee               : PASS
12. RA 9439 Promissory Note & 0% Interest Schedule Engine     : PASS
13. Security Gate Pass Exit PIN & Lobby Re-Verification       : PASS
14. PhilHealth Circular 2023-0026 XML eSOA Conformance        : PASS
15. Executive RCM Analytics & 200-Bed Operational Capacity     : PASS
16. Production Clean Compilation (Vite + Server + Mobile TS)  : PASS
================================================================================
OVERALL AUDIT VERDICT: CERTIFIED READY FOR AI INTEGRATION
================================================================================
```
