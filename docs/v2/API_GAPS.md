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

## Implemented on v2 (2026-10-17 feature parity completion)

1. **AI features (`/api/v1/staff/ai/*` and `/api/v1/patient/ai/*`).** Ported the complete Gemini AI stack (`coraService`, `claimsForensicService`, `hmoAppealService`, `executiveBriefingService`, `ocrService`, `phiScrubber`, `aiResultCache`, `coraScope`, `coraLanguage`) onto `@medcore/api` with RA 10173 PHI scrubbing, deterministic waterfall authority, per-user/IP rate limits (`ai-staff`, `ai-cora`, `ai-ocr`), and audited events.
2. **Coverage details for patients.** `GET /api/v1/patient/stays/:id` returns `philhealth` (`claimNumber`, `caseRateCode`, `status`, `rthRiskScore`, `rthReadiness`) and `hmo` (`providerName`, `loaNumber`, `loaStatus`, `mblCents`, `approvedCents`), plus `bedCode` and `roomCategory` once `billReady` is true (never exposing `icd10Code`).
3. **Notifications and simulated SMS outbox.** `GET /api/v1/staff/notifications`, `POST /api/v1/staff/notifications/mark-read`, `GET /api/v1/staff/notifications/sms-outbox`, and `POST /api/v1/staff/encounters/:id/notify` derive facility-scoped operational notifications and simulated SMS updates from real encounter, payment, pass, and audit records.
4. **RCM analytics & Executive AI Briefing.** `RcmAnalyticsPage` computes AR aging, DAR days, clean claim rate, payer mix, department turnaround, and the financing waterfall from live v2 encounters and connects the Executive AI Briefing card to `POST /api/v1/staff/ai/executive-briefing`.
5. **Editing an admission.** `PATCH /api/v1/staff/encounters/:id` updates bed, room category, attending physician, and ICD-10 diagnosis before bill finalization with full audit logging.
6. **Facility settings & Promissory installment collection.** `GET/PUT /api/v1/staff/facility` (CFO-scoped, audited) updates SLA warning/breach thresholds, and `POST /api/v1/staff/promissory-notes/:id/installments/:seq/pay` records installment collection with an official receipt (`OR-SJMC-*`).

## Remaining follow-ups (non-blocking)

- **Procedure estimator pre-admission catalog:** Keeps an unavailable state until a hospital procedure-bundle catalog or scheduled pre-admission feed is connected. No sample prices are shown as actual hospital estimates.
- **Refund payout execution:** A waiver after payment records `creditCents` on the ledger; automated refund disbursement remains a future workflow.

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
