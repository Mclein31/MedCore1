# AQROMED / MEDCORE ENTERPRISE RCM: ZERO-DEFECT SYSTEM AUDIT & SYNCHRONIZATION SPECIFICATION

> **Target Agent**: OpenAI Codex / Autonomous Coding Agent  
> **Target Project**: AQROMED / MedCore (`/Users/mclein/Documents/Developer/Personal_Projects/MedCore1`)  
> **Primary Goal**: Execute an exhaustive, zero-defect audit verifying calculation synchronization, discharge state progression, supervisory waivers, HMO eLOA delivery, bill finalization payment gating, multi-rail payment idempotency, and digital gate pass exit lobby verification across Server (`apps/server`), Dashboard (`apps/dashboard`), and Mobile (`apps/mobile`) before introducing AI extensions.

---

## EXECUTIVE DIRECTIVE FOR CODEX

You are acting as the Chief Healthcare Systems Auditor, Principal Security Engineer, and Lead QA Architect for AQROMED (MedCore).
Your mission is to perform a rigorous, step-by-step verification of the entire Revenue Cycle Management (RCM) platform across all three architectural tiers:
1. **Backend REST API & PostgreSQL Database (`apps/server`)**
2. **Hospital Staff Command Center & Ledgers (`apps/dashboard`)**
3. **Patient Clarify Mobile Application (`apps/mobile`)**

### Core Rules of Engagement:
1. **Zero Skipped Steps**: You must execute every test step in sequence.
2. **Centavo Exactness**: Philippine healthcare statutory waterfalls must reconcile to the exact centavo ($₱0.00$ discrepancy). Floating-point drift, `NaN`, or undefined balances are fatal defects.
3. **Authoritative Recalculation**: Waiving a bill or item MUST immediately update the statutory waterfall, decrement net patient responsibility, and reflect synchronously on both web and mobile.
4. **Discharge Gating**: Patients MUST NOT be permitted to settle bills or execute payment flows until the encounter reaches `PENDING_SETTLEMENT`.
5. **Cross-Platform Delivery**: Approving an HMO Final LOA must immediately update coverage limits, dispatch a timeline event notification to mobile, and advance the stage.
6. **No AI Features Added**: Do not add AI features, chatbots, or automated assistants until all tests in this audit specification pass with 100% compliance.

---

## SECTION 0: ENVIRONMENT & BASELINE CREDENTIALS

### 0.1 Topology & Ports
- Backend API Host: `http://localhost:3000` (or `http://127.0.0.1:3000`)
- Dashboard Web Host: `http://localhost:5173`
- PostgreSQL Database: `postgresql://mclein@localhost:5432/aqromed` (or `$DATABASE_URL`)
- Anchor Facility: St. Jude Medical Center Manila (`code: SJMC-MNL`, `facilityId: 00000000-0000-0000-0000-000000000001`)

### 0.2 Certified Test Personas (Pre-Seeded)
| Role | Name | Email | Password | Facility Code |
| :--- | :--- | :--- | :--- | :--- |
| `BILLING_SPECIALIST` | Elena Santos | `elena.santos@stjude.ph` | `HospitalRCM2026!` | `SJMC-MNL` |
| `HOSPITAL_CFO` | Arthur Delgado | `arthur.delgado@stjude.ph` | `HospitalRCM2026!` | `SJMC-MNL` |
| `ATTENDING_PHYSICIAN` | Carlos Mendoza | `carlos.mendoza@stjude.ph` | `HospitalRCM2026!` | `SJMC-MNL` |
| `HMO_COORDINATOR` | Kristine Ramos | `kristine.ramos@stjude.ph` | `HospitalRCM2026!` | `SJMC-MNL` |
| `LOBBY_SECURITY` | Bert Aquino | `bert.aquino@stjude.ph` | `HospitalRCM2026!` | `SJMC-MNL` |
| `PATIENT_GUARANTOR` | Juan S. Dela Cruz | `juan.delacruz@gmail.com` | `PatientPass2026!` | `SJMC-MNL` |

- **Primary Test Encounter**: `enc-8812` (Juan S. Dela Cruz — Senior Citizen & PWD, MRN: `MRN-2026-8812`, Phone: `0917-881-8812`)

---

## PHASE 1: DATABASE RE-HYDRATION & BASELINE INTEGRITY

### Step 1.1 — Clean Database Re-Seeding
Execute the database seeder to reset the hospital environment to the clean 250-patient state:
```bash
npm run seed
```
**Verification Checklist:**
- [ ] Process exits with code `0`.
- [ ] PostgreSQL tables `facilities`, `users`, `patients`, `encounters`, `chargemaster_items`, `statutory_waterfalls`, and `beds` are completely populated.
- [ ] Total beds count for `SJMC-MNL` equals `200`.
- [ ] Encounters count equals `250`.

### Step 1.2 — Automated Baseline Unit & Hardening Suites
Run all existing project test suites:
```bash
# 1. 250-Patient Centavo-Exact Statutory Waterfall Audit
npm run test:financial

# 2. Server Security Hardening & Session Isolation Suite
npm test

# 3. Mobile Device Unit Tests & Guard Rails
npm --prefix apps/mobile test
```
**Verification Checklist:**
- [ ] `test:financial`: 250 / 250 patient records pass with 0 waterfall discrepancies, 0 installment errors, 0 NaN values.
- [ ] `npm test`: 32 server hardening checks and 6 dashboard auth checks pass.
- [ ] `apps/mobile test`: 49 mobile unit tests pass.

---

## PHASE 2: AUTHENTICATION, RBAC & SECURE SESSIONS

### Step 2.1 — Staff Login & Cookie Issuance
Authenticate Elena Santos (`BILLING_SPECIALIST`):
```bash
curl -s -i -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "elena.santos@stjude.ph",
    "password": "HospitalRCM2026!",
    "facilityCode": "SJMC-MNL"
  }' > /tmp/login_billing.txt

cat /tmp/login_billing.txt
```
**Verification Checklist:**
- [ ] HTTP status `200 OK`.
- [ ] JSON response contains `success: true`, `user.role: "BILLING_SPECIALIST"`, and `user.facilityId: "00000000-0000-0000-0000-000000000001"`.
- [ ] Response headers contain `Set-Cookie: aqromed_session=...; HttpOnly; Path=/`.
- [ ] Store cookie: `BILLING_COOKIE=$(grep -i "set-cookie: aqromed_session=" /tmp/login_billing.txt | cut -d' ' -f2 | cut -d';' -f1)`.

### Step 2.2 — Role-Based Authorization Enforcement (403 Guard)
Attempt to call the Attending Physician route using the Billing Specialist session:
```bash
curl -s -i -X POST http://localhost:3000/api/v1/encounters/enc-8812/doctor/sign \
  -H "Content-Type: application/json" \
  -H "Cookie: $BILLING_COOKIE" \
  -d '{"agreedFee": 15000}'
```
**Verification Checklist:**
- [ ] HTTP status `403 Forbidden`.
- [ ] Error code: `FORBIDDEN`.
- [ ] Stage of encounter `enc-8812` remains unchanged.

### Step 2.3 — Patient Self-Registration & Authentication
Register or authenticate the patient Juan Dela Cruz:
```bash
curl -s -i -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "juan.delacruz@gmail.com",
    "password": "PatientPass2026!",
    "fullName": "Juan S. Dela Cruz",
    "mrn": "MRN-2026-8812",
    "contactNumber": "0917-881-8812",
    "facilityCode": "SJMC-MNL"
  }' > /tmp/register_patient.txt

# If user exists, log in directly:
curl -s -i -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "juan.delacruz@gmail.com",
    "password": "PatientPass2026!",
    "facilityCode": "SJMC-MNL"
  }' > /tmp/login_patient.txt

PATIENT_COOKIE=$(grep -i "set-cookie: aqromed_session=" /tmp/login_patient.txt | cut -d' ' -f2 | cut -d';' -f1)
```
**Verification Checklist:**
- [ ] HTTP status `200 OK`.
- [ ] User role is `PATIENT_GUARANTOR`.
- [ ] Calling `GET /api/v1/patient/me` with `$PATIENT_COOKIE` resolves linked patient `DELA CRUZ, JUAN S.`.

---

## PHASE 3: CHARGEMASTER CRUD & DELETION GUARDS

### Step 3.1 — Add Charge Item to Inpatient Account
Add a dynamic line item to `enc-8812`:
```bash
curl -s -X POST http://localhost:3000/api/v1/encounters/enc-8812/charges \
  -H "Content-Type: application/json" \
  -H "Cookie: $BILLING_COOKIE" \
  -d '{
    "description": "High-Resolution Chest CT Scan with Contrast",
    "category": "LABORATORY",
    "grossAmount": 8500.00,
    "qty": 1,
    "unitPrice": 8500.00,
    "coverageType": "PHILHEALTH_FIRST"
  }' > /tmp/add_charge.json

cat /tmp/add_charge.json
NEW_CHARGE_ID=$(jq -r '.item.id' /tmp/add_charge.json)
```
**Verification Checklist:**
- [ ] HTTP status `200 OK`.
- [ ] `NEW_CHARGE_ID` is a valid UUID or charge identifier.
- [ ] Encounter waterfall `grossTotal` increases automatically by ₱8,500.00.

### Step 3.2 — Category Normalization
Insert a supply item using legacy `"MEDICAL_SUPPLIES"` category:
```bash
curl -s -X POST http://localhost:3000/api/v1/encounters/enc-8812/charges \
  -H "Content-Type: application/json" \
  -H "Cookie: $BILLING_COOKIE" \
  -d '{
    "description": "Sterile Surgical Dressing Kit",
    "category": "CENTRAL_SUPPLIES",
    "grossAmount": 1200.00,
    "code": "CHG-SUPPLY-AUDIT-001"
  }' > /tmp/add_supply.json

cat /tmp/add_supply.json
```
**Verification Checklist:**
- [ ] Category is persisted strictly as enum `CENTRAL_SUPPLIES`.

---

## PHASE 4: DISPUTE MANAGEMENT & SUPERVISORY WAIVER SYNCHRONIZATION

This phase audits the exact workflow where an item is contested, locked against deletion, waived by an executive supervisor, and immediately recalculates the entire patient bill.

### Step 4.1 — File a Dispute
File a dispute on `NEW_CHARGE_ID`:
```bash
curl -s -X POST http://localhost:3000/api/v1/encounters/enc-8812/disputes \
  -H "Content-Type: application/json" \
  -H "Cookie: $BILLING_COOKIE" \
  -d '{
    "chargeId": "'"$NEW_CHARGE_ID"'",
    "reason": "Patient questions contrast dye administration necessity",
    "disputeCategory": "UNCONSUMED_SUPPLY"
  }' > /tmp/file_dispute.json

cat /tmp/file_dispute.json
ACTIVE_DISPUTE_ID=$(jq -r '.dispute.id' /tmp/file_dispute.json)
```
**Verification Checklist:**
- [ ] HTTP status `200 OK`.
- [ ] `dispute.status` is `'OPEN'`.
- [ ] Corresponding row in `chargemaster_items` has `is_disputed = true` and `status = 'CONTESTED'`.
- [ ] `system_audit_logs` has action `'DISPUTE_FILED'`.

### Step 4.2 — Deletion Guard on Disputed Item
Attempt to delete `NEW_CHARGE_ID`:
```bash
curl -s -i -X DELETE "http://localhost:3000/api/v1/charges/$NEW_CHARGE_ID" \
  -H "Cookie: $BILLING_COOKIE"
```
**Verification Checklist:**
- [ ] HTTP status `400 Bad Request`.
- [ ] Error code: `ITEM_HAS_DISPUTES`.
- [ ] The charge item is NOT deleted from PostgreSQL.

### Step 4.3 — Executive Supervisory Courtesy Waiver Execution
Authenticate CFO Arthur Delgado and execute the supervisory waiver:
```bash
# 1. Login CFO
curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "arthur.delgado@stjude.ph",
    "password": "HospitalRCM2026!",
    "facilityCode": "SJMC-MNL"
  }' > /tmp/login_cfo.txt

CFO_COOKIE=$(grep -i "set-cookie: aqromed_session=" /tmp/login_cfo.txt | cut -d' ' -f2 | cut -d';' -f1)

# 2. Execute Waiver
curl -s -X POST "http://localhost:3000/api/v1/disputes/$ACTIVE_DISPUTE_ID/supervisory-waive" \
  -H "Content-Type: application/json" \
  -H "Cookie: $CFO_COOKIE" \
  -d '{
    "supervisorNotes": "Waived under CFO executive authority for patient goodwill resolution."
  }' > /tmp/waive_result.json

cat /tmp/waive_result.json
```
**Verification Checklist:**
- [ ] HTTP status `200 OK`.
- [ ] Database `chargemaster_items`:
  * `status` updated to `'SUPERVISORY_WAIVED'`.
  * `patient_oop` set to `'0.00'`.
  * `is_disputed` set to `false`.
- [ ] Database `billing_disputes`:
  * `status` updated to `'SUPERVISOR_WAIVED'`.
  * `resolved_by_user_id` is Arthur Delgado's user ID.
- [ ] **Waterfall Recalculation**:
  * `statutory_waterfalls` recalculated via `recalculateAndPersistWaterfall()`.
  * Waived item excluded from taxable gross base.
  * `encounters.remaining_balance` recomputed and decremented.

### Step 4.4 — Cross-Platform Client Sync Verification
1. **Web Dashboard Context**:
   - In `apps/dashboard/src/features/patient-clarify/components/ItemizedChargeRow.tsx`, the row renders strikethrough styling with `"Supervisory Waived"`.
   - In `apps/dashboard/src/pages/DisputesExceptionsPage.tsx`, the item is absent from the active dispute list.
2. **Mobile App API Verification**:
   - Fetch `/api/v1/patient/me/overview` using `$PATIENT_COOKIE`:
     * `balance.remainingBalance` matches the server's newly updated `remaining_balance`.
     * `currentEncounter.items` contains the item with `status: "SUPERVISORY_WAIVED"` and `patientOop: 0`.

---

## PHASE 5: DISCHARGE CLEARANCE 6-STAGE KANBAN FLOW

### Step 5.1 — Stage 2: Doctor Professional Fee QuickSign
Authenticate Attending Physician Carlos Mendoza and sign the agreed fee:
```bash
# 1. Login Physician
curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "carlos.mendoza@stjude.ph",
    "password": "HospitalRCM2026!",
    "facilityCode": "SJMC-MNL"
  }' > /tmp/login_doctor.txt

DOCTOR_COOKIE=$(grep -i "set-cookie: aqromed_session=" /tmp/login_doctor.txt | cut -d' ' -f2 | cut -d';' -f1)

# 2. Execute QuickSign
curl -s -X POST http://localhost:3000/api/v1/encounters/enc-8812/doctor/sign \
  -H "Content-Type: application/json" \
  -H "Cookie: $DOCTOR_COOKIE" \
  -d '{"agreedFee": 15000.00}' > /tmp/doctor_sign.json

cat /tmp/doctor_sign.json
```
**Verification Checklist:**
- [ ] HTTP status `200 OK`.
- [ ] `encounters.doctor_agreed_fee` set to `15000.00`.
- [ ] `encounters.stage` advances to `PHARMACY_RTS_AUDIT`.
- [ ] `encounter_timeline_events` logs `Doctor PF Declared & QuickSign Executed`.

### Step 5.2 — Stage 3: Pharmacy Return-to-Stock (RTS) Audit
As `BILLING_SPECIALIST`, clear unreturned pharmacy items:
```bash
curl -s -X POST http://localhost:3000/api/v1/encounters/enc-8812/pharmacy/clear-rts \
  -H "Cookie: $BILLING_COOKIE" > /tmp/clear_rts.json

cat /tmp/clear_rts.json
```
**Verification Checklist:**
- [ ] HTTP status `200 OK`.
- [ ] `encounters.pharmacy_rts_cleared` is `true`.
- [ ] `encounters.unreturned_meds_count` is `0`.
- [ ] `encounters.stage` advances to `HMO_FINAL_LOA`.
- [ ] `encounter_timeline_events` logs `Pharmacy Return-to-Stock (RTS) Audit Cleared`.

---

## PHASE 6: HMO FINAL LOA APPROVAL & MOBILE DEVICE NOTIFICATION SYNC

### Step 6.1 — Staff Approves HMO Final LOA
Submit HMO approval as `HMO_COORDINATOR` or `BILLING_SPECIALIST`:
```bash
curl -s -X POST http://localhost:3000/api/v1/encounters/enc-8812/hmo/final-loa \
  -H "Content-Type: application/json" \
  -H "Cookie: $BILLING_COOKIE" \
  -d '{
    "approvalCode": "APV-MAXICARE-998811",
    "approvedAmount": 50514.29,
    "disallowedConsumables": 0.00
  }' > /tmp/hmo_loa.json

cat /tmp/hmo_loa.json
```
**Verification Checklist:**
- [ ] HTTP status `200 OK`.
- [ ] Database `hmo_authorizations`:
  * `final_loa_status = 'APPROVED'`.
  * `approval_code = 'APV-MAXICARE-998811'`.
  * `approved_amount = 50514.29`.
- [ ] Database `encounters`:
  * `stage` advances from `HMO_FINAL_LOA` to `PENDING_SETTLEMENT`.
- [ ] Database `encounter_timeline_events`:
  * Logs event with `title: "Commercial HMO Final LOA Approved"`, `eventType: "PAYER"`.

### Step 6.2 — Verify Mobile App Receives HMO Final LOA & Notifications
Call patient endpoints with `$PATIENT_COOKIE`:
```bash
# 1. Check Notifications
curl -s -X GET http://localhost:3000/api/v1/patient/me/notifications \
  -H "Cookie: $PATIENT_COOKIE" > /tmp/patient_notifs.json

# 2. Check Overview
curl -s -X GET http://localhost:3000/api/v1/patient/me/overview \
  -H "Cookie: $PATIENT_COOKIE" > /tmp/patient_overview.json

cat /tmp/patient_notifs.json | jq '.items[0]'
cat /tmp/patient_overview.json | jq '.currentEncounter.stage, .dischargeChecklist'
```
**Verification Checklist:**
- [ ] Notification list contains item with `title: "Commercial HMO Final LOA Approved"`.
- [ ] `currentEncounter.stage` is `'PENDING_SETTLEMENT'`.
- [ ] `currentEncounter.hmo.finalLoaStatus` is `'APPROVED'`.
- [ ] `dischargeChecklist`: Item with `key: "insurance"` reports `done: true`.
- [ ] Mobile `CoverageScreen.tsx` displays status badge `"HMO Approved"` (tone `'ok'`) and approved benefit `₱50,514.29`.

---

## PHASE 7: BILL FINALIZATION & PAYMENT GATING

### Step 7.1 — Payment Gating: Reject Early Settlement
Verify that payments are strictly prohibited prior to `PENDING_SETTLEMENT`:
- Unit test assertion: `apps/server/__tests__/patientWorkflows.ts` -> `"patients cannot settle early-stage bills"`.
- Server returns HTTP `400` or `403` if `encounter.stage !== 'PENDING_SETTLEMENT'`.

### Step 7.2 — Bill Screen Action Gating
Inspect `apps/mobile/src/screens/BillScreen.tsx`:
```tsx
{balance > 0 && enc.stage === 'PENDING_SETTLEMENT' && (
  <PrimaryButton
    title="Continue to Payment"
    onPress={() => navigation.navigate('PaymentFlow', { encounterId: enc.uuid })}
  />
)}
```
**Verification Checklist:**
- [ ] When `stage === 'PENDING_SETTLEMENT'` and `balance > 0`, the primary button displays `"Continue to Payment"`.
- [ ] When stage is prior to `PENDING_SETTLEMENT`, button is locked/hidden.

---

## PHASE 8: MULTI-RAIL PAYMENT SETTLEMENT & IDEMPOTENCY

### Step 8.1 — Oversized Idempotency Key Guard
```bash
OVERSIZED_KEY=$(printf 'A%.0s' {1..129})
curl -s -i -X POST http://localhost:3000/api/v1/encounters/enc-8812/payments \
  -H "Content-Type: application/json" \
  -H "Cookie: $BILLING_COOKIE" \
  -H "Idempotency-Key: $OVERSIZED_KEY" \
  -d '{
    "amount": 1000.00,
    "paymentRail": "QR_PH",
    "payerName": "Dela Cruz, Juan S."
  }'
```
**Verification Checklist:**
- [ ] HTTP status `400 Bad Request`.
- [ ] Error code: `INVALID_IDEMPOTENCY_KEY`.

### Step 8.2 — Partial Settlement via QR Ph with Idempotency Key
```bash
TXN_KEY="TXN-AUDIT-QRPH-$(date +%s)"
curl -s -X POST http://localhost:3000/api/v1/encounters/enc-8812/payments \
  -H "Content-Type: application/json" \
  -H "Cookie: $BILLING_COOKIE" \
  -H "Idempotency-Key: $TXN_KEY" \
  -d '{
    "amount": 2500.00,
    "paymentRail": "QR_PH",
    "payerName": "Dela Cruz, Juan S.",
    "payerContactMasked": "0917-***-8812",
    "notes": "Partial settlement via QR Ph"
  }' > /tmp/pay_qrph.json

cat /tmp/pay_qrph.json
FIRST_PAYMENT_ID=$(jq -r '.payment.id' /tmp/pay_qrph.json)
```
**Verification Checklist:**
- [ ] HTTP status `200 OK`.
- [ ] `receipt.officialReceiptNumber` starts with `'OR-SJMC-'`.
- [ ] `payment.idempotencyKey` matches `$TXN_KEY`.
- [ ] `encounter.remainingBalance` decrements by exactly `₱2,500.00`.

### Step 8.3 — Duplicate Submission (Idempotency Replay Test)
Re-submit identical payload with identical `Idempotency-Key`:
```bash
curl -s -X POST http://localhost:3000/api/v1/encounters/enc-8812/payments \
  -H "Content-Type: application/json" \
  -H "Cookie: $BILLING_COOKIE" \
  -H "Idempotency-Key: $TXN_KEY" \
  -d '{
    "amount": 2500.00,
    "paymentRail": "QR_PH",
    "payerName": "Dela Cruz, Juan S.",
    "payerContactMasked": "0917-***-8812",
    "notes": "Partial settlement via QR Ph"
  }' > /tmp/pay_replay.json

cat /tmp/pay_replay.json
```
**Verification Checklist:**
- [ ] HTTP status `200 OK`.
- [ ] `cached: true`.
- [ ] `payment.id` equals `$FIRST_PAYMENT_ID`.
- [ ] Zero duplicate debit applied to `encounter.remainingBalance`.

### Step 8.4 — Atomic Transaction Rollback Guarantee
Verify in `apps/server/src/routes/payments.ts` and `scripts/testBackendApi.ts` that if any write fails within the payment transaction:
- PostgreSQL executes `ROLLBACK`.
- Zero orphaned rows committed to `payments`, `payment_receipts`, or `system_audit_logs`.

---

## PHASE 9: REPUBLIC ACT 9439 PROMISSORY NOTE & 0% INTEREST ENGINE

Under Republic Act 9439 (Anti-Hospital Detention Law), patients in non-private accommodations have the legal right to execute a 0% interest promissory note to guarantee immediate discharge clearance.

### Step 9.1 — Government ID Format & Checksum Validation
Verify format validation in `apps/shared/governmentId.ts`:
- `PHILSYS_NATIONAL_ID`: 16 digits (`XXXX-XXXX-XXXX-XXXX`).
- `UMID`: 12 digits (`XXXX-XXXXXXX-X`).
- `DRIVERS_LICENSE`: 1 letter + 10 digits (`AXX-XX-XXXXXX`).
- `PASSPORT`: 1 letter + 7 or 8 digits.
**Verification Checklist:**
- [ ] Invalid formats return `{ valid: false, error: "..." }`.

### Step 9.2 — Execute 0% Interest Promissory Note for Residual Balance
```bash
REMAINING_BAL=$(curl -s http://localhost:3000/api/v1/encounters/enc-8812 | jq -r '.remainingBalance')

curl -s -X POST http://localhost:3000/api/v1/encounters/enc-8812/promissory-notes \
  -H "Content-Type: application/json" \
  -H "Cookie: $BILLING_COOKIE" \
  -d '{
    "borrowerName": "Dela Cruz, Juan S.",
    "borrowerRelationship": "PATIENT",
    "borrowerIdType": "PHILSYS_NATIONAL_ID",
    "borrowerIdNumber": "1924-8812-4019-2041",
    "installmentMonths": 6,
    "principalAmount": '"$REMAINING_BAL"'
  }' > /tmp/promissory_result.json

cat /tmp/promissory_result.json
```
**Verification Checklist:**
- [ ] HTTP status `200 OK`.
- [ ] `promissoryNote.interestRate` is `'0.0000'` (strictly 0.00%).
- [ ] `promissoryNote.financingFee` is `'0.00'`.
- [ ] `promissoryNote.totalRepayment` equals `principalAmount`.
- [ ] `scheduleJson` array has length `6` and sums centavo-exact to `principalAmount`.
- [ ] `encounter.stage` advances to `'CLEARED_GATE_PASS'`.
- [ ] `dischargePass` object generated with `passNumber` and `exitPin`.
- [ ] Extract:
  * `PASS_NUM=$(jq -r '.dischargePass.passNumber' /tmp/promissory_result.json)`
  * `EXIT_PIN=$(jq -r '.dischargePass.exitPin' /tmp/promissory_result.json)`

---

## PHASE 10: DIGITAL GATE PASS & SECURITY LOBBY DUAL-FACTOR VERIFICATION

### Step 10.1 — Exit Lobby Gate Pass Verification
Authenticate Lobby Security Bert Aquino:
```bash
# 1. Login Security
curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "bert.aquino@stjude.ph",
    "password": "HospitalRCM2026!",
    "facilityCode": "SJMC-MNL"
  }' > /tmp/login_security.txt

SECURITY_COOKIE=$(grep -i "set-cookie: aqromed_session=" /tmp/login_security.txt | cut -d' ' -f2 | cut -d';' -f1)

# 2. Verify Pass
curl -s -X POST http://localhost:3000/api/v1/discharge/passes/verify \
  -H "Content-Type: application/json" \
  -H "Cookie: $SECURITY_COOKIE" \
  -d '{
    "passNumber": "'"$PASS_NUM"'",
    "exitPin": "'"$EXIT_PIN"'"
  }' > /tmp/verify_pass.json

cat /tmp/verify_pass.json
```
**Verification Checklist:**
- [ ] HTTP status `200 OK`.
- [ ] `status = 'VERIFIED_AT_LOBBY'`.
- [ ] `verifiedAt` timestamp populated.

### Step 10.2 — Exit Pass Re-Verification Idempotency
Verify the pass a second time:
```bash
curl -s -X POST http://localhost:3000/api/v1/discharge/passes/verify \
  -H "Content-Type: application/json" \
  -H "Cookie: $SECURITY_COOKIE" \
  -d '{
    "passNumber": "'"$PASS_NUM"'",
    "exitPin": "'"$EXIT_PIN"'"
  }' > /tmp/reverify_pass.json

cat /tmp/reverify_pass.json
```
**Verification Checklist:**
- [ ] HTTP status `200 OK`.
- [ ] `passAlreadyVerified: true`.
- [ ] Original `verifiedAt` timestamp preserved.

### Step 10.3 — Wrong Exit PIN Rejection
```bash
curl -s -i -X POST http://localhost:3000/api/v1/discharge/passes/verify \
  -H "Content-Type: application/json" \
  -H "Cookie: $SECURITY_COOKIE" \
  -d '{
    "passNumber": "'"$PASS_NUM"'",
    "exitPin": "0000"
  }'
```
**Verification Checklist:**
- [ ] HTTP status `400 Bad Request`.
- [ ] Verification fails with invalid PIN error.

---

## PHASE 11: PHILHEALTH CIRCULAR 2023-0026 XML eSOA CONFORMANCE

Verify eSOA XML scrubber generation:
```bash
curl -s -X GET http://localhost:3000/api/v1/claims/enc-8812/esoa-xml \
  -H "Cookie: $BILLING_COOKIE" > /tmp/esoa_claim.xml

head -n 25 /tmp/esoa_claim.xml
```
**Verification Checklist:**
- [ ] HTTP status `200 OK`.
- [ ] Header `Content-Type: application/xml`.
- [ ] XML contains namespace/schema referencing `PhilHealth-Circular-2023-0026`.
- [ ] XML includes `<ItemizedCharges>` matching chargemaster ledger.
- [ ] PhilHealth HCI and PF split figures match statutory definitions.

---

## PHASE 12: EXECUTIVE RCM ANALYTICS & 200-BED CAPACITY AUDIT

### Step 12.1 — RCM Executive Metrics
Fetch CFO analytics:
```bash
curl -s -X GET http://localhost:3000/api/v1/analytics/rcm-metrics \
  -H "Cookie: $CFO_COOKIE" > /tmp/rcm_metrics.json

cat /tmp/rcm_metrics.json | jq '.summary, .waterfall'
```
**Verification Checklist:**
- [ ] HTTP status `200 OK`.
- [ ] `waterfall.totalGrossRevenue > 0`.
- [ ] `summary.cleanFirstPassRate > 90`.
- [ ] `summary.darDays` is a valid positive number.

### Step 12.2 — Bed Capacity & Status Transition
Fetch beds inventory and update bed `ED-1`:
```bash
# 1. Fetch beds
curl -s -X GET http://localhost:3000/api/v1/beds \
  -H "Cookie: $BILLING_COOKIE" > /tmp/beds.json

cat /tmp/beds.json | jq '.summary'

# 2. Update bed to HOUSEKEEPING
curl -s -X PATCH http://localhost:3000/api/v1/beds/ED-1/status \
  -H "Content-Type: application/json" \
  -H "Cookie: $BILLING_COOKIE" \
  -d '{"status": "HOUSEKEEPING"}' > /tmp/patch_bed.json

cat /tmp/patch_bed.json
```
**Verification Checklist:**
- [ ] Total hospital beds count equals `200`.
- [ ] Bed `ED-1` status updated to `HOUSEKEEPING`.

---

## PHASE 13: BUILD & COMPILATION HEALTH

Ensure all packages compile cleanly without type or build errors:
```bash
# 1. Dashboard build
npm run build

# 2. Server typecheck
npx tsc --project apps/server/tsconfig.json --noEmit

# 3. Mobile typecheck
npm --prefix apps/mobile run typecheck
```
**Verification Checklist:**
- [ ] `npm run build` exits with code `0`.
- [ ] Server `tsc --noEmit` exits with code `0`.
- [ ] Mobile `tsc --noEmit` exits with code `0`.

---

## FINAL AUDIT CERTIFICATION SCORECARD

Codex must generate the following report upon test completion:

```
================================================================================
           AQROMED / MEDCORE ENTERPRISE RCM SYSTEM AUDIT SCORECARD
================================================================================
1. Database Seeder & Parity (250 encounters, 200 beds)        : [PASS / FAIL]
2. Statutory Waterfall Centavo Reconciliation (250/250)       : [PASS / FAIL]
3. Authentication, RBAC & Facility Isolation                 : [PASS / FAIL]
4. Chargemaster CRUD & Disputed Item Deletion Guards          : [PASS / FAIL]
5. Billing Dispute Filing & Supervisory Courtesy Waiver       : [PASS / FAIL]
6. Real-Time Waterfall Recalculation on Waived Charges        : [PASS / FAIL]
7. Discharge 6-Stage Kanban Progression (MGH -> Cleared)      : [PASS / FAIL]
8. HMO Final LOA Approval & Cross-Platform Mobile Sync        : [PASS / FAIL]
9. Bill Finalization & Mobile Payment Action Gating           : [PASS / FAIL]
10. Multi-Rail Payment Settlement & Idempotency Caching       : [PASS / FAIL]
11. Atomic Multi-Table Write Rollback Guarantee               : [PASS / FAIL]
12. RA 9439 Promissory Note & 0% Interest Schedule Engine     : [PASS / FAIL]
13. Security Gate Pass Exit PIN & Lobby Re-Verification       : [PASS / FAIL]
14. PhilHealth Circular 2023-0026 XML eSOA Conformance        : [PASS / FAIL]
15. Executive RCM Analytics & 200-Bed Operational Capacity     : [PASS / FAIL]
16. Production Clean Compilation (Vite + Server + Mobile TS)  : [PASS / FAIL]
================================================================================
OVERALL AUDIT VERDICT: [CERTIFIED READY FOR AI INTEGRATION / BLOCKED]
================================================================================
```
