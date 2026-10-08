# MedCore patient payments — implementation and verification

Updated October 8, 2026. Active repository: MedCore1, branch mobile_app. Changes are uncommitted. This report describes the native Expo patient companion and the staff dashboard session fix. Pre-existing user/UI/dependency changes were preserved.

## HMO Final LOA root cause and fix

The dashboard trusted cached `medcore_auth`/`medcore_user` before checking `/auth/me`. A failed check left stale authentication intact and attempted encounter hydration. When the protected Final LOA endpoint returned 401, its catch handler reported the error but then locally marked the LOA APPROVED and moved the encounter to PENDING_SETTLEMENT. The server correctly rejected the request; the client presented an unverified approval.

Staff views now wait for server session verification and hospital record hydration. Confirmed 401 responses clear bearer credentials, account records, selections and dialogs and return to sign-in. Network/503 failures show retryable verification, without treating them as valid authentication. Session generations prevent an old response/hydration error from affecting a newer login; JSON and XML responses check session identity. Logout sends its bearer token before clearing it. Role changes apply only after server confirmation, and redundant patient-portal hash switches are suppressed. LOA status changes only from a successful backend response containing the encounter. No authentication middleware, session lifetime, role permission or facility authorization was weakened. Sessions are opaque hashed database tokens, not JWTs; the existing eight-hour expiration remains.

## Completed patient workflow

1. Bill shows charges, adjustments, PhilHealth/HMO deductions, patient responsibility, remaining balance and Paid/final-review status. Eligible bills have Continue to Payment.
2. Continue to Payment opens dedicated method selection with hospital/bill summary and amount. GCash is selected by default. Existing full/partial amount entry remains available.
3. GCash and Maya have original logos, provider color accents, hospital/bill context and review; there are no provider login, MPIN, password, OTP or banking credential screens.
4. Visa/Mastercard cards have cardholder name, number, MM/YY and masked CVV fields. Local checks cover supported network prefixes, Luhn checksum, current expiry and three-digit CVV. Only brand/last four digits enter the API and encrypted pending request. Number, expiry and CVV remain transient component state and clear after successful processing or switching methods. Autofill is disabled for these fields.
5. Bank transfer has selectable BPI/BDO rows with official publisher logos and a review step; there is no account-number or credential request and no actual beneficiary transfer.
6. Confirmation shows hospital, bill, method, payer, amount and remaining balance. The reviewed amount is frozen before details. In-flight/account locks and disabled navigation prevent repeated submissions.
7. Processing uses the existing accessible modal/spinner while awaiting the backend. Success requires backend SUCCESS plus an issued receipt. Ambiguous failures preserve the exact key/body for recovery; definitive failures allow correction/retry.
8. Payment Successful has a checkmark animation respecting reduced motion, amount/method/reference/hospital/date, View Receipt and Back to Bills.
9. Receipt shows MedCore, hospital, patient/MRN, bill and transaction references, method, amount, timestamp and Paid status. Selected receipts are available from the existing payment history/Documents paths.

The mobile screens have no simulation banners, watermarks or technical mode labels. Existing QR Ph and promissory UI options remain; notes retain their separate backend rules.

## Backend and database

No application schema changes or migrations were needed. Existing `payments`, `payment_receipts`, `encounters`, `statutory_waterfalls`, timeline, audit and discharge-pass tables are reused. Payment→encounter→patient is the existing patient/bill association. Existing unique payment reference/idempotency constraints and the one-receipt-per-payment constraint remain.

`services/simulatedPaymentService.ts` is the sole payment processor. It waits 900ms and produces server-side UUID references, timestamp and SUCCESS. It has no provider network calls, gateway keys, merchant accounts or external processing. It stays simulated in both local and hosted builds, superseding the historical production patient-payment rejection. `isSimulatedDemo=true` remains in technical records. Replace this processor and its success contract with a gateway-confirmed adapter for a future real integration.

The payment route authenticates and authorizes ownership before recovering cached requests. It validates positive safe centavo amounts against the locked current balance. Patient submissions require a stable idempotency key and permitted online rails; notes/cashier cannot bypass their own flows through the payment endpoint. Raw card/provider credential fields are rejected. Existing dashboard card brand/last four and bank metadata are forwarded for compatibility.

After processing, payment, receipt, balance/Paid status, paid-waterfall field, timeline, audit and any discharge pass/bed release are written in one PostgreSQL transaction. Different keys serialize on the encounter row lock. Identical retries recover the original payment/receipt; changed requests conflict. Full settlement marks PAID; partial settlement remains PARTIALLY_PAID. PhilHealth/HMO/statutory calculation code is unchanged. Hosted full settlement retains the existing internal GATE_PASS_SECRET signing requirement.

Receipt read projections include the recorded transaction reference, original bill reference, patient name/MRN and status, with existing ownership checks. History remains database-backed. The dashboard's unconfirmed-200 local payment/receipt fallback was removed too.

## UI and official artwork

Shared 56px-minimum headers, teal financial panels, typography, navigation, rounded cards and buttons are reused. The success heading is 23px, three pixels above the standard screen heading. Fields and receipt rows wrap/scroll and retain keyboard/safe-area handling. Wallet and bank marks use contain sizing; original pixels/colors/proportions are preserved.

[Logo provenance](../../apps/mobile/assets/icons/payments/SOURCES.md) records GCash, Maya, Visa, Mastercard, BPI and BDO primary publishers and exact asset URLs. Existing [official UI research](../../MedCore_Vault/RESEARCH/mobile_ui_patterns.md) informed review/confirmation/receipt hierarchy. [GCash](https://gcash.com/), [Maya Scan to Pay](https://www.maya.ph/pay-with-qr), [Visa brand center](https://corporate.visa.com/en/about-visa/brand.html), [Mastercard requirements](https://www.mastercard.com/brandcenter/us/en/brand-requirements/mastercard.html), and [Cedar Pay](https://www.cedar.com/solutions/cedar-pay) were checked. Brand identifiers do not imply endorsement or an actual provider integration.

## Verification results and limits

| Check | Result |
|---|---|
| Mobile lint, strict typecheck, server typecheck | Pass |
| Mobile regressions | 41 pass, including card checks, backend-confirmed success, session expiration, timeouts and encrypted immutable recovery |
| Isolated server groups | 26 pass: four methods, Paid status, matching receipts/history, same-key retries, overlapping requests, overpayment, ownership, raw-secret rejection, LOA allowed roles/401/403/404, and authentication outage handling |
| Dashboard transport/session checks | 6 pass: authorization headers/cookies, 401 vs login/403/503/network failures, token-only logout, old JSON/XML responses and role-switch rejection |
| Existing financial audit | 250/250 records reconcile, zero calculation errors |
| Dashboard production build | Pass; existing bundle-size advisory remains |
| Expo iOS/Android/web exports | Pass, including all logo assets |
| Scope/whitespace validation | `git diff --check` pass; branch unchanged, no staging/commit/push |
| Manual rendered mobile web check | Bill→Continue→default GCash→details→review→processing→success observed at 430×932 using a loopback synthetic fixture. Screens have no mode banners. See [evidence](../../apps/mobile/validation/simulated-payments/README.md). |
| Real PostgreSQL integration | **Blocked**, not passed: TCP and Unix connections return EPERM in this session. The opt-in suite failed before creating fixtures or a validation database. |
| Physical/native restart and all responsive layouts | Not fully verified in this turn. Remaining checks include native keyboard/large text/reduced motion and all four full device flows. |
| Dependency audit | Existing 23 advisories: 16 high, 7 moderate in Expo/tooling. No dependency changes were made; suggested forced Expo downgrade is incompatible. |

Synthetic handler/router/store tests establish code behavior, not actual PostgreSQL persistence or native SecureStore behavior. Exports establish compilation, not a signed build. No claim of a verified live database end-to-end workflow is made.

### Reproduce

From repository root, `npm test` now runs the existing financial audit plus dashboard authentication and isolated backend checks without reseeding. Mobile: `npm run lint`, `npm run typecheck`, `npm run typecheck:server`, `npm test` in `apps/mobile`.

Opt-in real PostgreSQL verification, from a normal local terminal with PostgreSQL access:

```sh
MEDCORE_VALIDATION_DATABASE_URL=postgresql://mclein@localhost:5432/medcore_payment_validation npm test
```

This creates only a strictly named local validation database if missing, applies the existing migrations there, and retains synthetic fixtures there. It refuses remote hosts, query overrides/fragments and any other database name. It covers actual LOA authorization, four methods, concurrent duplicate requests, database payment/receipt/Paid status, fresh connections/router persistence, ownership and expiration. It never reseeds or modifies aqromed. This harness typechecks; its database execution remains unverified here.

For the presentation, restart the existing local backend/Metro so changed modules load, sign in with a valid account, approve Final LOA as an authorized staff member, then use the patient's finalized PENDING_SETTLEMENT bill. Verify the opt-in DB suite and full native receipt/history/relaunch behavior before calling the presentation workflow fully validated.

## Files created or changed in this implementation

Pre-existing changes are not attributed to this task.

- Server: `src/services/simulatedPaymentService.ts` (new); `src/routes/payments.ts`, `src/routes/patient.ts`; `__tests__/patientWorkflows.ts`; `__tests__/paymentsPostgres.ts` (new).
- Dashboard: `src/api/client.ts`, `src/api/auth.ts`, `src/api/payments.ts`, `src/app/App.tsx`, `src/context/MedCoreContext.tsx`, `src/features/patient-clarify/components/DemoPaymentModal.tsx`; `__tests__/auth.ts` (new).
- Mobile: `src/screens/BillScreen.tsx`, `src/screens/PaymentFlowScreen.tsx`, `src/screens/RecordDetailScreen.tsx`; `src/components/BillBreakdown.tsx`, `src/components/ui.tsx`, `src/components/ReceiptSheet.tsx`, `src/components/PaymentSuccess.tsx` (new); `src/lib/cardValidation.ts` (new), `checkout.ts`, `paymentMethods.ts`, `paymentAttempts.ts`, `assets.ts`; `src/navigation/types.ts`, `src/types/domain.ts`, `__tests__/run.ts`.
- Assets: new `payment-bpi.png` and `payment-bdo.png`, updated `SOURCES.md`; existing authentic wallet/card assets are reused.
- Verification/documentation: root `package.json`, new `scripts/testProject.ts`; this report; current mobile `README.md`/`AUDIT.md` notes; new `apps/mobile/validation/simulated-payments/README.md` and cropped evidence; smallest updates to existing `.brain/PROJECT_CONTEXT.md` and Vault UX research.
