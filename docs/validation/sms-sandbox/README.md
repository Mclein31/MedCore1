# MedCore SMS sandbox engine

The user's sandbox-only instruction overrides the original implementation prompt's proposed live gateway. This implementation is **unconditionally simulated**, even if Semaphore/Twilio keys are present. It has no gateway SDK, provider endpoint, fetch call or mode switch. It requires no SMS account, external SMS key or paid message credits. Existing application hosting/database configuration remains separate from the simulator.

## Behavior

- `normalizePhPhoneNumber` accepts PH local/international mobile formats and common separators, normalizing dispatch/outbox values to E.164.
- `buildSmsBody` builds allowlisted English/Tagalog billing, intake and clearance notices, plus English physician nudges. No arbitrary body, diagnosis, medication, claim code or PIN is accepted from an HTTP request. Link/domain, clinical-code, unmasked-PIN, control-character and known-source diagnosis checks run before recording. Opaque UUID references are distinguished from clinical identifiers.
- `sendSms` returns `simulated: true`, `isSimulated: true`, provider `SIMULATOR`, status `SIMULATED` and `SMS-SIM-XXXXXX`. The memory outbox retains the newest 100 results and returns defensive copies.
- Actual recipients come from the authorized encounter's patient or active attending physician in the same facility. A missing physician phone may use the same facility's recorded mobile contact; landlines, missing contacts and the old fabricated 0917-000-0000 value fail clearly. No recipient is invented.
- A persistent private `sms_dispatches` table stores recent previews across Worker restarts. Per-facility request references, row locking and a unique constraint prevent duplicate records on retries. Dispatch/outbox row, `SMS_DISPATCH` timeline event and `SMS_NOTIFICATION_DISPATCHED` audit record commit atomically. Memory history is published after commit.
- Patient-visible timeline entries contain only a safe simulation summary/reference. Full recipient phone and message preview remain in the staff-scoped outbox. Patients cannot dispatch or browse it; physicians read only reminders addressed to their physician ID.

## Endpoints / permissions

| Endpoint | Authorized roles |
| --- | --- |
| `POST /api/v1/encounters/:id/nudge-doctor` | Billing Specialist, Hospital CFO; stage `DOCTOR_PF_PENDING` |
| `POST /api/v1/encounters/:id/notify-patient-sms` | Billing Specialist, Hospital CFO |
| `GET /api/v1/notifications/sms-outbox` | Billing Specialist, Hospital CFO, own reminders for Attending Physician |

POST clients provide an `Idempotency-Key` and may send language `en`/`tl`; patient notices may select `BILL_READY` or `INTAKE_ORIENTATION`. HTTP 200 includes the requested top-level `simulated` and `messageId` plus the typed `dispatch` object. Facility and source record access are verified before any history is returned or generated.

Billing finalization and delivery share one billing-ready notice per encounter. Admission creates an intake notice when a real contact is present. Payment/note/zero-copay clearance paths notify only for an active gate pass, deduplicated by pass reference; partial payments without a pass do not generate a settlement notice. Promissory notices say arrangements are recorded rather than claiming cash payment. SMS validation/storage errors do not reverse a committed financial action.

New admissions accept an optional real mobile number instead of inventing a placeholder. Missing/placeholder contact on an existing MRN can be repaired under a patient-row lock. Different registered contacts are rejected instead of silently replaced; conflicting concurrent repairs preserve the first successful value.

## Dashboard

The discharge card, contextual drawer and Doctor QuickSign SMS actions are enabled with role/stage/busy guards. The estimator requires a real registered encounter for orientation SMS; procedure codes/clinical estimates are not sent. The admission form forwards its mobile input and displays its confirmed intake preview. Shared context rejects stale account/role responses, deduplicates in-flight actions and retains request references for transport retries. Billing/clearance responses can also display their confirmed simulated notices.

The dismissible body-portal notification now shows **SMS update**, the normalized recipient and exact message bubble. Environment/compliance notices and the internal reference are omitted from the presentation at the user’s request. The internal dispatch/reference and backend restrictions stay intact. It sits above existing modals, wraps long text and respects reduced motion. Historical screenshots below predate this presentation revision; current component evidence is under `../sms-clean-presentation/`.

## Validation

- `npm run test:sms`: 9 groups; includes present gateway-key canaries, zero network calls, template privacy/link guards, phone formats, promissory wording and the 100-item outbox.
- `npm run test:api`: 88 existing backend checks and 23 real PostgreSQL SMS groups passed. Covers actual authentication, tenant/role isolation, concurrent duplicate sends, audit rollback, patient-safe timeline, clinical/link injection, missing/placeholder contacts, billing/admission hooks, competing repairs, contact mismatch, gate-pass retries, missing-contact financial success and partial-payment exclusion. No gateway/model calls.
- `npm run test:financial`: 250 synthetic records reconcile with zero errors. `npm test` shared financial/auth/workflow/notification suite passes.
- `npm --prefix apps/dashboard run build`, server and changed script/test strict types, Worker build check and diff checks pass. The new dashboard package wrapper declares ESM so existing top-level-await tests retain their original format.
- Actual browser components and API/PostgreSQL were verified together in the isolated local fixture: card nudge, QuickSign/modal preview+dismiss, estimator recipient selection and new-admission contact forwarding/toast. Four screenshots and results are under [UI_SCREENSHOTS/dashboard/sms-sandbox](../../../UI_SCREENSHOTS/dashboard/sms-sandbox/results.json). External API calls and page errors: 0.
- Independent read-only review found and verified fixes for timeline phone privacy, concurrent contact repair, billing trigger and admission wiring. No dependencies were added or changed. Root audit retains 17 existing advisories (6 moderate, 9 high, 2 critical).

## Reproduce / storage setup

```sh
npm run test:sms
npm run test:api
npm run test:financial
npm --prefix apps/dashboard run build
npm run dev:client -- --port 5175 --host 127.0.0.1
# In another terminal, after test:api initializes the local fixture:
npm run test:sms:ui
```

`test:api` now refuses a hospital/remote target and rebuilds only a local database named `medcore_sms_validation` (or an allowed suffixed variant). Set `MEDCORE_SMS_TEST_DATABASE_URL` to customize that dedicated local fixture. It generates the current schema into a temporary folder and seeds synthetic data; existing historical AI snapshot drift does not expand the SMS production migration. The old command's ordinary application DB reseeding is removed.

Additive application storage migration (no patient/financial rows changed):

```sh
npm run db:sms
```

This uses `MEDCORE_SMS_DATABASE_URL` or configured `DATABASE_URL`, applies only migration 0005 when the table is absent and verifies columns/constraints. The migration is included in the existing Drizzle journal. Sandbox storage was applied to the configured database after verifying the existing Worker origin; no patient/financial rows were changed. Backend version `8ec21c04-3e00-4424-b0dd-162db33e61b7` is deployed. [Hosted read-only results](./hosted-results.json) verify authentication and the outbox route/storage; that check sent no SMS and called no AI feature. Source commit/push and dashboard publication remain user-controlled.

## Reference boundaries

The no-link and clinical-data exclusions implement the user's specified template policy. Health/government identifiers are sensitive information under the [Data Privacy Act, NPC source](https://privacy.gov.ph/data-privacy-act-/); this engineering validation is not a legal certification. The original live-mode API behavior was checked against [Semaphore's official documentation](https://semaphore.co/docs) before the user explicitly limited the feature to sandbox-only; no provider adapter remains. Runtime compatibility is covered by [Cloudflare's Node crypto support](https://developers.cloudflare.com/workers/runtime-apis/nodejs/crypto/).
