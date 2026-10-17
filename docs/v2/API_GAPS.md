# What v1 (`main`) had that the v2 API does not (2026-10-16)

Compared: every route in `main:apps/server/src/routes/*` (56) and every page and screen of the v1 dashboard and mobile
app, against `apps/api/src/routes/*` on `rebuild/mobile-v2` (68 routes).

## Already carried over (2026-10-17 original UI port)

- Dashboard: original `main:apps/dashboard` interface under `apps/web/src/v1`, with `api/v2Bridge.ts` using the v2 staff routes. Existing v2 login, invite/MFA, patients, accounts, audit and lobby remain.
- Mobile: original screens, assets, onboarding, multi-step payment flow, receipt details and documents under `apps/mobile`; `src/lib/v2Bridge.ts` adapts v2 patient routes.
- Solar icons: `packages/icons` (`@medcore/icons`).
- Staff HMO roster and promissory list can be built from paginated encounter details; dedicated worklist endpoints would avoid those extra reads.
- Existing patient timeline supplies hospital record updates, but notifications/SMS/push remain unavailable. Claims status is unavailable to patients.
- The original procedure estimator keeps an unavailable state: v2 has no procedure bundle/pricing or scheduled pre-admission source. No sample prices are shown as actual hospital estimates.

## Missing from the v2 API (build these)

Ordered by how much they block the demo. "Shape" is a suggestion that fits the existing v2 conventions (facility-scoped,
`zod` contract in `packages/domain/src/contracts.ts`, audit row for every write).

1. **Coverage details for patients.** The v1 Coverage screen showed PhilHealth claim status and case-rate code, and
   the HMO provider name and LOA status. `GET /api/v1/patient/stays/:id` only returns the peso amounts.
   Shape: add `coverage: { philhealth: { caseRateCode, status } | null, hmo: { providerName, loaStatus } | null }` to
   that response in `apps/api/src/routes/patientPortal.ts` (the staff detail already loads both). The mobile Coverage
   screen then shows the badges v1 had. Small.

2. **Notifications (staff and patient) and SMS outbox.** v1: `GET /notifications`, `POST /notifications/mark-read`,
   `GET /notifications/sms-outbox`, `GET /patient/me/notifications`, a bell with an unread dot in both apps. v2 only
   sends email (`services/notify.ts`). Shape: a `notifications` table (recipient = staff user or patient account,
   kind, title, body, encounter id, read_at), `GET /api/v1/staff/notifications`, `GET /api/v1/patient/notifications`,
   `POST …/notifications/read`, written wherever `notify.ts` already sends mail. Optional push: `POST
   /api/v1/patient/devices` for an Expo push token. Medium.

3. **RCM analytics.** v1 RCM Analytics computed DAR days, clean claim rate, AR aging, payer mix, department
   turnaround and the financing waterfall from every encounter in the browser. v2 lists are paginated, so this must
   be server-side. `GET /api/v1/staff/analytics/summary` only has stage counts, money totals, 30-day median clearance,
   open disputes and beds. Shape: `GET /api/v1/staff/analytics/rcm?from&to` returning `arAging` buckets (0–30, 31–60,
   61–90, 90+ by balance), `darDays`, `cleanClaimRate` (claims transmitted without rework), `payers` (per HMO:
   approved, pending), `stepMinutes` (median minutes per discharge step) and a daily series. Medium to large.

4. **Statement of account and receipt documents.** v1: `GET /encounters/:id/statement` and `/invoice` for A4
   printing; the patient app listed statements and receipts. v2 has only the eSOA XML. The dashboard can render a
   print view from the existing encounter detail without new API, but a signed PDF or a stable patient download needs
   `GET /api/v1/staff/encounters/:id/statement` and `GET /api/v1/patient/stays/:id/statement`. Medium.

5. **Editing an admission.** v1 `PATCH /encounters/:id` changed bed, attending physician and diagnosis. v2 can only
   void. Shape: `POST /api/v1/staff/encounters/:id/transfer-bed`, `…/change-physician`, `…/diagnosis`, each audited and
   blocked once the bill is finalized. Small to medium.

6. **HMO LOA worklist ("HMO gateway roster").** v1 listed every pending LOA with provider, member and MBL. The v2
   encounter list has no HMO fields, so the page would need one detail call per stay. Shape: include
   `hmo: { providerName, loaStatus, mblCents }` in `GET /api/v1/staff/encounters` rows, or add
   `GET /api/v1/staff/hmo/pending`. Small.

7. **Promissory notes across stays and installment collection.** v1 `GET /promissory-notes` listed all notes. v2
   shows notes only inside one stay, and nothing records an installment being paid (already in `.brain/TODO.md`).
   Shape: `GET /api/v1/staff/promissory-notes?status=` and `POST …/:id/installments/:seq/pay`. Medium.

8. **Facility settings.** SLA warning/breach minutes live in `facilities` but there is no endpoint, so the Rules page
   is read-only. Shape: `GET/PUT /api/v1/staff/facility` (CFO only, audited). Small.

9. **Patient claim status.** v1 `GET /patient/me/claims`. v2 claims are staff-only. Covered by item 1 if the status is
   included there; otherwise `GET /api/v1/patient/stays/:id/claims`. Small.

10. **Refunds.** A waiver after payment shows `creditCents` but nothing pays it out (already in `.brain/TODO.md`).

11. **AI features.** Cora chat, card OCR, claims pre-flight scrubber, HMO appeal drafter, executive briefing
    (`/ai/*`). Deliberately not in v2 yet; port them as `/api/v1/staff/ai/*` and `/api/v1/patient/ai/*` with per-user
    rate limits and input caps. Large.

## Intentionally not carried over (do not rebuild)

- `POST /auth/switch-role`, the demo patient picker (`/patient/demo/patients`) and the login-screen "1-click staff
  personas": they let anyone act as any role. v2 uses real accounts with MFA.
- Patient passwords and `POST /auth/login` for patients: v2 patients sign in only with the emailed code.
- Generic `POST /encounters/:id/advance-stage`: v2 has one explicit, permission-checked endpoint per discharge step.
- Editing a charge in place (`PATCH /charges/:id`): v2 removes (with a reason) and re-adds so the audit trail keeps
  both.
- v1 Settings integration toggles ("Live CDC Active", HITP gateway): they were mock-ups with no backend.

## Mobile UI restoration completed

Onboarding, original provider-logo payment flow and receipt/document screens are restored. Simulator verification is recorded in `apps/mobile/validation/v2-original-ui.md`; physical-device and signed-build checks remain follow-ups.
