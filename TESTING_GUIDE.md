# MedCore v2: mobile and dashboard acceptance test

Prepared 2026-10-17. Use this guide to decide whether the rebuilt apps are ready to replace the current `main` implementation. Completing this guide does **not** merge, deploy, or replace `main`.

Allow about 60–90 minutes, plus any authenticator setup. Use fictional local data only. Payments in this guide are simulated; no real card or transfer is needed.

## 1. Use the right folder

Use this existing worktree, already on `rebuild/medcore-v2`:

```bash
cd /Users/mclein/Documents/Developer/Personal_Projects/MedCore1/.worktrees/medcore-v2
git branch --show-current
```

Expected branch: `rebuild/medcore-v2`.

Do not run from the top-level `MedCore1` folder: that checkout is the old app on `main`. Do not switch branches, reseed the existing database, or merge into `main` during testing.

The existing local database is shared by your local API processes. A payment, waiver, signed plan, admission, or pass verification changes that database. Record your results before moving to the next patient; these are not reset by refreshing a page.

## 2. Start the three apps

If these exact processes are already running, keep using them. An “address already in use” error usually means you tried to start a second copy. Do not kill unrelated servers on 8787, 8790, or 5173.

In **each** of three terminals, first enter the folder from section 1. Then run one command per terminal:

**Terminal 1 — API**

```bash
PORT=8788 ALLOWED_ORIGINS=http://localhost:5174 PUBLIC_APP_URL=http://localhost:5174 npm run start -w @medcore/api
```

Keep this terminal visible: local patient sign-in codes appear here when `MAIL_TRANSPORT=console`.

**Terminal 2 — dashboard**

```bash
API_PORT=8788 npm run dev -w @medcore/web -- --port 5174 --strictPort
```

Open <http://localhost:5174> in Safari or Chrome.

**Terminal 3 — mobile**

```bash
EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:8788 npm run ios -w @medcore/mobile -- --port 8081
```

This should open the iOS simulator and Expo Go. If necessary, press `i` in Terminal 3. You can also run this from another terminal:

```bash
xcrun simctl openurl booted exp://localhost:8081
```

Keep all three terminals running throughout the test. Stop only the processes you started when you finish.

### Local settings to check

The root `.env` should point at the existing **local development** database. Do not overwrite that file with `.env.example`.

For the mobile payment tests, it needs:

```dotenv
PATIENT_ONLINE_PAYMENTS=simulated
PATIENT_ONLINE_PROMISSORY=true
MAIL_TRANSPORT=console
```

Restart only your API process if you change its environment settings. Expo environment changes require restarting Expo.

Keep MFA enabled for the acceptance test. The local unenrolled-account shortcut described in the README is not a substitute for checking the real MFA flow. Never disable MFA in production.

## 3. Staff accounts

All accounts below existed in the local database and their passwords matched the configured `SEED_PASSWORD` when this guide was prepared. If you subsequently change an account's password, use its new password instead.

Read the **value after** `SEED_PASSWORD=` in this worktree's root `.env`. Do not type the words `SEED_PASSWORD`, include surrounding quotes, or copy extra spaces. The password itself is deliberately not written into this guide.

| Account                        | Role                | Use it for                                                                                          |
| ------------------------------ | ------------------- | --------------------------------------------------------------------------------------------------- |
| `cfo@stjude.example.test`      | CFO / administrator | Main walkthrough, on-behalf fee signing, approvals, audit log, account administration               |
| `billing2@stjude.example.test` | Billing specialist  | Billing permissions check; cannot sign physician fees or administer staff                           |
| `billing@stjude.example.test`  | Billing specialist  | Same billing checks; **already has MFA enrolled**, so use its existing authenticator/recovery codes |
| `dr.cruz@stjude.example.test`  | Attending physician | Patient A's actual physician; physician-scope and sign-off tests                                    |
| `dr.lopez@stjude.example.test` | Attending physician | Patient B's actual physician; physician-scope and sign-off tests                                    |
| `hmo@stjude.example.test`      | HMO coordinator     | HMO roster and final authorization permission checks                                                |
| `claims@stjude.example.test`   | Claims encoder      | Claims and eSOA XML; no cashier/staff-administration access                                         |
| `lobby@stjude.example.test`    | Lobby security      | One-time exit-pass verification; no billing or patient census access                                |

Newly unenrolled staff must complete authenticator enrollment when prompted. Save recovery codes privately. An account that already has MFA needs its existing authenticator or a recovery code; do not bypass it.

**Wrong password:** after five failed attempts, the account locks for 15 minutes. Stop guessing, check the exact `.env` value, and wait for the lock to expire. “Wrong password” can also be the generic response for a locked account. Repeated attempts can additionally trigger rate limits.

Use separate browser profiles/private windows when comparing staff roles. Two ordinary tabs share the same session cookie; signing into one as another staff member changes the session used by both.

## 4. Your three patient sign-ins

Patients have **no password**. Each signs in using MRN + date of birth, followed by a fresh emailed six-digit code. Never use the staff password in the mobile app.

The states and amounts below were read from the existing local database on 2026-10-17. They describe the starting snapshot, not balances that should be restored after you test. The app's freshly calculated balance is authoritative.

| Patient              | MRN          | Date of birth to enter | Starting state                                                                        | Main test                                                                             |
| -------------------- | ------------ | ---------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| **A — Liza Navarro** | `MRN-240106` | **1989-06-05**         | MGH declared; draft bill; calculated balance ₱350.00; no HMO/open dispute/active plan | Finalize/send, question a charge, card + bank payments, cashier remainder, fresh pass |
| **B — Grace Santos** | `MRN-240101` | **1948-02-28**         | Admitted; draft bill; calculated balance ₱250.00; no HMO/open dispute/active plan     | Draft privacy, full clearance sequence, payment plan, pass                            |
| **C — Liza Navarro** | `MRN-240121` | **1991-05-23**         | Already cleared and settled; balance ₱0.00                                            | Read-only documents, historical payments, existing exit pass, session persistence     |

**There are two different Liza Navarro records. Always identify them by MRN and date of birth.** Patient A is not Patient C.

Patient C is already paid, so do not use that account for a new payment or plan. Existing passes expire and work only once: use a newly issued pass from A or B for the live lobby test.

### How to sign in on mobile

1. Log out of any other patient account through Profile.
2. Tap **First time here? Link your hospital stay**.
3. Enter the MRN and exact date of birth from the table.
4. Request a code and look in **Terminal 1**, the API terminal, for the corresponding sign-in email/code. Use the latest code for that patient, not another patient's code.
5. Enter the six digits in the app.

Expected: the matching patient's name/stay opens. The code works once and expires after 10 minutes. Requesting a new code is rate-limited; do not repeatedly tap resend. With real email delivery enabled, check the hospital-recorded mailbox instead of the console.

## 5. First check: sign-in and every dashboard page

Sign in as CFO.

- [ ] Correct password leads to MFA enrollment/verification when required, then the dashboard.
- [ ] The enlarged badge and MedCore text-logo load without a large gap on the sign-in shell.
- [ ] The account menu shows the signed-in staff member, with no demo personas or role-switch menu.
- [ ] Overview shows actual local records; unsupported figures say unavailable.
- [ ] Discharge Clearance opens the queue and selected patient detail.
- [ ] Encounters & Ledgers opens a real ledger with line items and totals.
- [ ] Approvals & Disputes shows recorded authorizations and real open disputes.
- [ ] Claims & eSOA opens claim records; unsupported clinical/risk checks say unavailable.
- [ ] RCM Analytics opens; supported totals/worklists use real data, unsupported analytics say unavailable.
- [ ] Patients opens the registry.
- [ ] Staff Accounts, Audit Log, My Account / MFA, Lobby Exit Check, and Settings & Rules render without crashing.
- [ ] Settings and the procedure estimator do not show invented configured integrations, prices, or scheduled patients.

In Claims & eSOA, select a seeded claim with a finalized bill and try its XML view/download. Expected: server-generated XML with that patient's reference and amounts. This does **not** establish official PhilHealth schema conformance.

In Audit Log, check that your sign-in and record views appear. Do not change real staff roles, deactivate accounts, reset passwords, or send invitations just to see whether their buttons work. Do those administrative tests only with an explicitly disposable staff account/mailbox if you need them for release approval.

## 6. Patient C: quick mobile smoke test

Start with Patient C (`MRN-240121`, DOB `1991-05-23`). This is the least disruptive walkthrough.

- [ ] Home shows the correct settled stay.
- [ ] Bill opens its statement and line-item detail without crashing.
- [ ] Coverage shows the amounts v2 actually supplies; absent details are unavailable.
- [ ] Payments opens historical payment/receipt records with correct amount, reference, and date.
- [ ] Documents → Hospital record shows the matching patient/stay and existing pass record.
- [ ] An active pass shows a QR and six-digit PIN. An expired/used pass must not be presented as a fresh authorization to leave.
- [ ] Profile works; Hospital updates shows real timeline activity.
- [ ] Claims says unavailable rather than inventing approval status.
- [ ] Cora and the card scanner show the friendly AI-unavailable state, without crashing or inventing results.
- [ ] Close and reopen Expo Go: the session survives. Then log out: the app returns to sign-in.

For a fresh installation, also check all three onboarding pages and Get started. Do not uninstall Expo Go or wipe all simulator data just to repeat onboarding; record “not repeated — existing installation” if you do not have a fresh test installation.

## 7. Patient A: dashboard → mobile → cashier → lobby

Use `MRN-240106` throughout. Use the dashboard search/MRN to select the correct Liza Navarro.

### A1. Prepare and send the bill

As CFO, open Discharge Clearance and Patient A's detail. On a narrow layout, select the **Patient Detail** tab after finding the patient.

1. The starting stage is **MGH_DECLARED**. Choose **Initiate Discharge**. Do not try to declare MGH a second time.
2. Open **Doctor QuickSign Portal**. Keep the recorded declared fee for this seeded case; confirm **Sign As Declared**. As CFO, enter a truthful local-test reason when asked, for example `Local acceptance test: signing on behalf of attending physician`.
3. If testing the actual physician workflow instead, sign in as `dr.cruz@stjude.example.test` to sign this assigned patient, then return to CFO. Do not ask billing staff to sign a physician fee.
4. Complete **Reconcile Ward Meds / Clear RTS**.
5. This patient has no HMO: pharmacy clearance should proceed to **PENDING_SETTLEMENT**, without inventing an HMO approval.
6. In Encounters & Ledgers, confirm the totals, choose **Finalize Bill**, then **Send bill to patient app**.

- [ ] Each action completes without an error; the UI updates only after confirmation.
- [ ] Bill number/reference and remaining balance are visible. Write down the balance now: ₱________.
- [ ] The bill is no longer a draft. Mobile and dashboard will be compared against this current amount, not the snapshot table.

### A2. Open the same bill on mobile and question a charge

Sign in on mobile as Patient A (`MRN-240106`, DOB `1989-06-05`).

1. Compare the patient/stay reference, bill number, and amount with the dashboard.
2. In Bill, open a medicine line such as **IV fluids and medicines** → **Question this charge**.
3. Enter a clear fictional test reason, such as `Acceptance test: please explain the quantity on this medicine charge`, and submit **once**.
4. On the dashboard, refresh/reopen Approvals & Disputes and find the same patient's charge.

- [ ] Mobile shows that the billing issue is under review.
- [ ] The dashboard shows an open dispute with the actual contested charge/amount and entered reason.
- [ ] No exit pass is issued while the stay has an unresolved dispute.

As CFO, review and **Waive Item** for this fictional test dispute **before** collecting payments. Confirm the hospital's recalculated balance. Do not assume a waiver subtracts the same amount from the patient's balance: bill-wide benefits are recalculated, and per-line payer allocation is unavailable.

- [ ] The dispute is resolved on both apps after refresh.
- [ ] Record the new remaining balance: ₱________.

If someone has already paid this case or an open dispute was resolved earlier, record its actual state and use a fresh fixture from section 11. Do not force an already-cleared stay back through the workflow.

### A3. Card and bank payments on mobile

Use the **current remaining balance**. For the expected balance above ₱200, make a ₱100 card payment and a ₱100 bank payment. If it is smaller, choose smaller positive amounts and leave a remainder for the cashier test. Never pay more than the displayed remaining amount.

1. Home/Bill → Pay → amount → Card.
2. Enter only card brand and last four digits, for example **Visa / 4242**, then review and confirm once. This is a simulated rail; do not enter a real full card number or CVV.
3. Open **View Receipt** from the success screen.
4. Make a second, separate payment by **Bank Transfer**, choosing a listed bank such as BPI. This records a simulated payment; do not make a real bank transfer.
5. Open Payments and its two corresponding receipts.

- [ ] Each success screen corresponds to one confirmed receipt.
- [ ] Receipt amount, method, patient/stay, and reference are correct.
- [ ] The dashboard receives both payments; remaining balance decreases by their exact sum, once.
- [ ] The success screen, Bill, Payments, and dashboard agree after refresh.
- [ ] A partial payment does not release a pass while a balance remains.

The dashboard refreshes periodically; allow about 15 seconds or reload it. On mobile, pull to refresh where available, or return to the stay/reopen the screen.

If a payment reports a connection error, check history and the dashboard before starting a new payment. Do not repeatedly submit new payment flows to “try again”; record whether the original intent was already posted.

### A4. Collect the remainder and check the new pass

As CFO/billing, open Patient A's Discharge Clearance detail and use **Record Settlement / QR Ph** for the remaining amount. Confirm once.

- [ ] The remaining balance becomes zero and the stay becomes cleared.
- [ ] Exactly one matching cashier payment/receipt is recorded.
- [ ] The pass modal loads its real pass number, QR and six-digit PIN.
- [ ] On mobile, Home/Documents now show the same new pass and zero remaining balance.
- [ ] Payment success → View Receipt and View Digital Gate Pass open the correct records when offered.

Keep this fresh pass number and PIN private for section 9. Do not paste a screenshot containing a usable PIN into a public issue.

## 8. Patient B: draft privacy and payment plan

Use Grace Santos, `MRN-240101`, DOB `1948-02-28`.

1. Before finalizing anything, sign in as B on mobile. Home/Bill/Coverage/Payments should say the draft statement or balance is unavailable; they must not pretend an unissued bill is a finalized ₱0.00 bill.
2. As CFO, locate B on the dashboard. Starting at **ADMITTED**, choose **Declare MGH**, then **Initiate Discharge**.
3. Complete fee signing (CFO with its required on-behalf reason, or the actual assigned `dr.lopez@stjude.example.test` account) and pharmacy clearance. There is no HMO for this case.
4. Finalize and send the bill. Compare the senior-citizen deductions and final patient responsibility with mobile; use the server's actual balance. Do not add a second senior discount by hand.
5. On mobile, choose the payment-plan option for the remaining balance. Enter a fictional borrower name/relationship and an ID reference that passes the selected ID format. For PhilSys PCN, `1234-5678-9012-3456` is a fictional format example; never use a real government ID for this local test.
6. Select **six months**, review the terms/schedule, and confirm only for this fictional test case.

- [ ] A confirmed plan appears on mobile and the dashboard, with the same principal and term.
- [ ] Interest and financing fees are zero.
- [ ] The installment sum equals the principal exactly; any centavo remainder is in the last installment.
- [ ] If the final principal is still ₱250.00, the expected schedule is five installments of ₱41.66 plus a final ₱41.70. If it changed, verify against the actual principal instead.
- [ ] The plan covers the current balance and releases a pass once the server confirms clearance; it is not presented as a cash payment.
- [ ] Documents/payment-plan details and the new pass open correctly.

No feature currently records collection of later promissory installments. A signed plan and a released pass do not prove that installment collection works.

## 9. Lobby verification and staff permissions

Use A or B's **new**, active pass. In a separate browser session, sign in as `lobby@stjude.example.test`.

- [ ] Only Lobby Exit Check and My Account / MFA are available in navigation; there is no census, ledger, payment, or staff-administration access.
- [ ] Enter the pass number and correct six-digit PIN → **Verify pass**.
- [ ] Result says **Cleared to leave**, showing the correct patient and bed.
- [ ] Verify that same pass again: it must not authorize a second exit. A “used” result is expected, not another successful verification.
- [ ] The dashboard/pass history records lobby verification after refresh.

A pass works once and expires. Five wrong PINs void it: do not brute-force a pass or repeatedly use made-up PINs. An expired/used pass rejection is a correct security result.

Then check the other roles in separate browser sessions:

| Role                     | Expected checks                                                                                                                                                       |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Billing (`billing2@…`)   | Can load patients/admission directory, charges, finalization/send, payments and permitted disputes; no physician PF signing, staff management or audit administration |
| Physician (`dr.cruz@…`)  | Can see assigned stays and sign own fee; cannot see another physician's patients or cashier/staff administration                                                      |
| Physician (`dr.lopez@…`) | Same scope rule for that doctor's own stays                                                                                                                           |
| HMO (`hmo@…`)            | Can review HMO records and permitted final LOA action; no cashier/physician signing/staff management                                                                  |
| Claims (`claims@…`)      | Can open claims/XML and permitted records; no payments or staff management                                                                                            |
| CFO (`cfo@…`)            | Full staff workflow; on-behalf signing still asks for a reason; every write remains audited                                                                           |

Unauthorized controls should be hidden or clearly unavailable. If a stale/direct action reaches the API, a 403 is expected; it must not change the record. Do not try another account through a v1 role-switch feature—there should be none.

## 10. Laptop, desktop, persistence, and error checks

Dashboard only: test **1280×800, 1366×768, 1440×900 and 1920×1080**, preferably at 100% browser zoom. Check Overview, Discharge Clearance, ledger, approvals, claims, accounts and the longer dialogs.

- [ ] Full right edge is visible: account menu, last Overview tile, third metric card and page actions.
- [ ] Navigation remains reachable; sidebar and page panels can scroll vertically.
- [ ] Wide tables scroll inside their panels rather than losing the whole right side.
- [ ] Admission, charge, QuickSign, confirmation, and plan dialogs keep their title/close control reachable; long content can scroll to the submit action.
- [ ] Labels, amounts, QR/PIN and error messages are not clipped.
- [ ] Enlarged sign-in badge and text-logo fit without a large gap.

An embedded responsive preview previously reported a larger page viewport than its displayed canvas at reduced zoom. If everything appears cropped there, turn off its forced-size preview/reset zoom and reproduce in an ordinary Safari/Chrome window. If the normal browser also clips, mark this **FAIL** and record the page, window size, zoom, and screenshot; do not dismiss it as a preview issue.

For both apps:

- [ ] Reload/reopen preserves a valid session and server records.
- [ ] Sign out returns to sign-in; private screens are not usable after sign-out.
- [ ] Mobile patient A never sees B or C's records after switching accounts.
- [ ] Briefly disable the device's network: show a clear failure or an explicitly stale/offline state, never a new fake payment/pass success. Restore the network and refresh.
- [ ] In dashboard developer tools, clear old console messages, reload, and repeat the key navigation; no uncaught runtime errors appear. Expected “unavailable” responses are distinct from crashes.

## 11. Additional admission/charge/HMO checks and repeat runs

The three patients above are reusable for reading records, but payment, plan and pass verification are stateful. For a **new** complete run, create fresh fictional records through Patients rather than reseeding or rewriting settled records.

As CFO/billing:

1. Patients → **Register patient**. Use a unique MRN such as `UAT-20261017-02`, a fictional name, DOB `1990-01-01`, a valid-format test mobile number and a distinct address such as `uat-20261017-02@patients.example.test`. Leave optional PhilHealth PIN blank and choose no discount for a simple arithmetic fixture.
2. Overview → **Admit inpatient**. Select the registered patient, an available bed, a real listed physician, a fictional diagnosis and valid-format ICD-10 such as `J18.9`.
3. Check the new encounter appears and that the same bed cannot be admitted twice.
4. Ledger → **Add Line Item**: quantity 1, unit price ₱123.45, laboratory, covered. Check gross ₱123.45. Add a second disposable charge, then remove only that second charge using a specific removal reason. Cancellation should leave it unchanged; confirmed removal should be audited.
5. Complete MGH/start and sign an actual fictional PF of ₱100.00 when prompted. With this no-discount/no-benefit fixture, gross and patient due should total **₱223.45** after pharmacy clearance. Finalize/send, then repeat payment or plan tests with its own new MRN/DOB.

Charge editing in place and admission editing are unavailable; a removed/re-added charge must preserve the audit history. **Void encounter** is cancellation, not routine discharge or bed release. Do not void a settled/financially active stay to reset it.

For HMO testing, choose an existing **fictional** HMO case actually waiting for final LOA, record its before-state, and enter a clearly labeled local test amount/decision code received or designated for the test. Verify the actual amount/status updates and ledger recalculation. An HMO with no decision must not be marked approved automatically; a rejected/zero decision must not be called approved. HMO setup/integration transmission is not supplied by this UI, so do not treat a recorded local decision as an insurer portal transmission.

## 12. What is expected to be unavailable

These are known gaps, not completed features. Accepting them is an explicit product decision before replacing `main`.

| Feature                                                                                 | Expected result / limitation                                                                                   |
| --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Cora, card OCR, claims scrubber, appeal drafting, executive briefing                    | Friendly AI-unavailable state; no invented answer, scan, score or draft                                        |
| Staff/patient notifications, SMS and push                                               | Unavailable/disabled. Patient Hospital updates may show actual stay timeline events; that is not push delivery |
| Patient claims status and detailed HMO/PhilHealth coverage metadata                     | Unavailable; no inferred approved status or fake provider limits                                               |
| Per-charge payer allocation                                                             | Unavailable where v2 does not supply it; bill-wide totals remain usable                                        |
| Full RCM history, aging, clean-claim/risk and department analytics                      | Unsupported panels unavailable, not fabricated percentages                                                     |
| Procedure bundles/pricing and scheduled pre-admissions                                  | Unavailable; no sample price presented as a hospital quotation                                                 |
| Facility/HIS/HITP settings                                                              | Unavailable/read-only; no claim of a configured live integration                                               |
| Admission edits / in-place charge edits                                                 | Unsupported; existing audited removal/void rules still apply                                                   |
| Signed PDFs, official receipt/tax certification, official PhilHealth schema conformance | A UI record/XML export is not proof of these capabilities                                                      |
| Refund payout and later plan installment collection                                     | No operational collection/refund flow yet; do not promise those workflows                                      |

If you need any of these working at replacement time, the release is **not ready for your needs**, even if the supported workflows pass.

## 13. Automated checks

From the `medcore-v2` worktree root, run:

```bash
npm run check
npm run format:check
npm run build
```

All three must exit successfully. The current suite contains **115 tests** (31 domain, 55 API, 22 mobile, 7 web); the count can grow. Lint currently allows inherited warnings, but no errors.

API tests use a separate disposable local database named `medcore_v2_test` by default. Do not point `TEST_DATABASE_URL` at the shared development database or any real database.

A separate `npm audit` currently reports inherited dependency advisories (26 at the UI-port baseline). Passing the commands above does not mean those advisories were fixed. Review dependency risk before deployment; do not blindly force SDK upgrades.

Automated checks complement the manual cross-app test. They do not prove physical-device behavior, deployed cookies/email, browser compatibility, or official regulatory conformance.

## 14. Result sheet and replacement decision

Copy this section for each run. Record failures before changing data further.

```text
Date/time and tester:
Branch / git rev-parse --short HEAD:
API / dashboard / Expo ports:
Browser + viewport + zoom:
Simulator or physical device:

Staff sign-in / MFA / sign-out: PASS / FAIL / NOT TESTED
All dashboard pages: PASS / FAIL / NOT TESTED
Patient C read-only mobile walkthrough: PASS / FAIL / NOT TESTED
Patient A draft-to-issued bill: PASS / FAIL / NOT TESTED
Patient A dispute / resolution: PASS / FAIL / NOT TESTED
Patient A card + bank receipts / matching dashboard totals: PASS / FAIL / NOT TESTED
Patient A final settlement / new pass: PASS / FAIL / NOT TESTED
Patient B draft privacy / clearance / plan / schedule: PASS / FAIL / NOT TESTED
Lobby one-time pass verification: PASS / FAIL / NOT TESTED
Role and patient isolation: PASS / FAIL / NOT TESTED
Laptop / desktop layouts: PASS / FAIL / NOT TESTED
Session persistence / offline / errors: PASS / FAIL / NOT TESTED
Admission / charge add-remove / HMO extra checks: PASS / FAIL / NOT TESTED
npm run check / format:check / build: PASS / FAIL

A: MRN / encounter / before balance / payments / after balance:
B: MRN / encounter / principal / months / installment sum:
C: MRN / records checked / pass active-used-expired:
Known gaps accepted by owner:
Untested administrative, device or deployment scenarios:
Blocking failures:
Evidence: screenshots without passwords, OTPs or usable pass PINs:
Decision: KEEP TESTING / READY FOR MERGE REVIEW / NOT READY
```

Before replacing `main`:

- [ ] All required supported workflows pass; NOT TESTED is not silently treated as PASS.
- [ ] Cross-app balances, receipts, plan totals and pass state match after reload.
- [ ] No duplicate collection, unauthorized access, private-data leak, fake success, persistent clipping or crash remains.
- [ ] You explicitly accept the known gaps above, or schedule them before replacement.
- [ ] Physical-device, real email/MFA, production-cookie/proxy and deployment checks are completed for the environment you intend to use. Simulator/local success alone is insufficient for production.
- [ ] You have a database backup/restore point, preserve the old working release and know how to roll back.
- [ ] Production uses its own configured environment and approved migration plan; it is never seeded with these demo accounts or simulated payments.
- [ ] Review [DEPLOY.md](DEPLOY.md) and approve the separate merge/deployment plan.

**Stop here. This document intentionally contains no command that replaces `main` or deploys the app.**
