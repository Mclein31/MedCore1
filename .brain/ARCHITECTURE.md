# AQROMED / MedCore: Architecture (Operational Brain)

## 1. Stack and topology
- **Monorepo** (`apps/`): `dashboard` (React 18 + Vite + TypeScript + Tailwind + Lucide, light mode only), `server` (Hono + Drizzle ORM), `mobile` (Expo 57 / React Native 0.86 / React 19), `shared` (dependency-free code used by all three).
- **API:** Hono on Cloudflare Workers (`medcore-backend.mcleinonza0531.workers.dev`), config in `apps/server/wrangler.jsonc`. Local runtime is `server/standalone.ts` on port 8787 (`@hono/node-server`).
- **Database:** Neon Postgres 17 in Singapore (project `medcore-sg`, `aws-ap-southeast-1`). Branch `production` = schema only, branch `demo` = all fictional data; the hosted Worker and local `.env` use `demo`. Reach it through Hyperdrive `medcore-hyperdrive` (id `b611eac58efa4966b649dfa7d1631b2a`, direct endpoint, caching disabled). The Worker needs no `placement`. Ohio is retired as of 2026-10-16; the old project is kept only as rollback until deleted. Runbook and as-performed log: `docs/production/NEON_REGION_MIGRATION.md`. Warm latency is about 435–463 ms (was about 966 ms on Ohio), and cold-start after idle is about 1.8 s.
- **Storage:** R2 bucket `aqromed-documents`. `medrec-vault` is an unrelated bucket.
- **Dashboard hosting:** Vercel (`med-core1.vercel.app`, also `medcore1`). `vercel.json` rewrites `/api/:path*` to the Worker, then the SPA catch-all, so the browser stays same-origin.
- **Mobile:** `EXPO_PUBLIC_API_BASE_URL` points at the Worker. Dashboard and mobile share one backend and one database.
- **AI:** Google AI Studio `gemini-3.5-flash-lite`, failover `gemini-3.1-flash-lite`, always through the backend (`/api/v1/ai/*`).
- **Tooling:** `neon.ts` plus `.neon` (git-ignored) link the repo to the Neon branch; `@neon/config` and `@neon/env` are dependencies.

## 2. Domain engine
The only legal order of deductions (RA 9994, 10754, 11223; DOH/BIR):
`Gross → 12% VAT exemption → 20% SC/PWD discount → PhilHealth ACR/DRG → HMO LOA within MBL → Net patient due`. Identity: Gross ≡ VAT + SC/PWD + PhilHealth + HMO + Net patient due.
- Shared engine `apps/shared/statutoryWaterfall.ts`: integer/BigInt arithmetic, exact rational rounding, `numeric(15,2)` bounds, rejects non-finite or negative input.
- Financing pipeline (`financing.ts`): Hospital bill → PhilHealth → HMO → other adjustments → patient responsibility → outstanding balance → financed amount → fee (always ₱0.00 under RA 9439) → total repayment → monthly installment (3, 6 or 12 months, residue in the last installment).
- Verified by `scripts/auditFinancials.ts` (`npm test` / `npm run test:financial`): 250/250 encounters, zero drift.
- Models never compute money. Deterministic engines inject read-only figures into prompts.

## 3. Discharge flow
Stages run `MGH_DECLARED` → doctor PF sign-off → pharmacy RTS → HMO final LOA → `PENDING_SETTLEMENT` → `CLEARED_GATE_PASS`. Payments and notes require `PENDING_SETTLEMENT`. Full settlement (or a full promissory arrangement or zero copay) atomically moves the bed to `HOUSEKEEPING` and mints an HMAC-SHA256 gate pass with a keyed random 4-digit exit PIN. Lobby security verifies at `/api/v1/discharge/passes/verify` (idempotent, constant-time compare). Bill lifecycle: `finalize-bill` then `send-bill`, both needing `PENDING_SETTLEMENT`.

## 4. Data model (`apps/server/src/db/schema.ts`)
`facilities`, `users`, `user_sessions`, `beds` (200 across 6 floors), `patients` (unique `(facility_id, mrn)`), `encounters` (250 in the demo census), `chargemaster_items`, `statutory_waterfalls`, `philhealth_claims`, `hmo_authorizations`, `billing_disputes`, `payments`, `payment_receipts`, `discharge_passes`, `promissory_notes`, `encounter_timeline_events`, `system_audit_logs`, `staff_notification_reads` (0003), `ai_result_cache` (0004), `sms_dispatches` (0005), `ai_conversations`, `ai_audit_logs`.
- Migrations: Drizzle in `apps/server/src/db/migrations`; `0006_security_hardening.sql` is drafted only (audit report section 3). Drift (audit D12): only 4 of 6 migrations are recorded in `drizzle.__drizzle_migrations`, and `ai_conversations` and `ai_audit_logs` exist in `schema.ts` but not in the database. Reconcile before running any new migration.
- Seed: `scripts/seedPostgres.ts` (250 encounters, 200 beds, deterministic Lehmer PRNG seed 20260925); refuses non-local hosts without `--force`. Standard seed also creates `mobile.admin.demo@example.test`. All seeded passwords come from `SEED_PASSWORD`.

## 5. API surface (selected)
`/api/health` (live Postgres check), `/api/v1/auth/*` (login, logout, me, switch-role), `/encounters` (list with filters, statement/invoice, finalize-bill, send-bill), `/charges`, `/payments`, `/promissory`, `/disputes`, `/discharge/passes/verify`, `/beds`, `/claims` (eSOA XML), `/patient/*` (mobile), `/notifications`, `/sms`, `/ai/*`. Roles: `BILLING_SPECIALIST`, `CLAIMS_ENCODER`, `HMO_COORDINATOR`, `HOSPITAL_CFO`, `ATTENDING_PHYSICIAN`, `LOBBY_SECURITY`, `PATIENT_GUARANTOR`, plus the reserved mobile demo principal (`HOSPITAL_CFO` with server-computed capability).

## 6. Dashboard structure
Feature-sliced `src/`: `app/`, `components/{common,layout,modals,printing,ai}`, `context/MedCoreContext.tsx`, `features/{analytics,command-center,discharge,ledger}`, `hooks/`, `pages/` (Home, Discharge Clearance, Encounters & Ledgers, Approvals & Disputes, Claims & eSOA, RCM Analytics, Settings), `api/` (modular client: `client, auth, patients, billing, coverage, payments, disputes, claims, analytics`), `utils/`. Imports use `@/`. Eight pages are lazy-loaded. Overlays use `ViewportOverlay`; print uses `printEngine.ts` and `PrintDocumentContainer`.

## 7. Mobile structure
`apps/mobile`: patient financial companion (Home, Bill, Coverage, Payments, Documents, Profile, Cora). Flow: preload → onboarding → auth; checkout amount → method → review → receipt. SecureStore for native sessions and encrypted pending payments; scope-bound gate-pass cache; `usePullRefresh` for gesture refresh; `ModalOverlay` for modals; polling every 12 s while active. Validation evidence lives under `apps/mobile/validation/`.

## 8. AI services (`apps/server/src/services/ai/`)
Claims forensic scrubber (RTH heuristic), HMO appeal drafter, executive briefing, Cora billing concierge (en, tl, fil, ilo), and OCR for benefit cards and government IDs. Pipeline: authorize → read chart → PHI scrub (`phiScrubber.ts`, bidirectional tokens, request-scoped) → shared `ai_result_cache` lookup → Gemini (JSON mode with `responseSchema`, 15 s timeout, failover) → Zod validate → rehydrate. No mocks at runtime. `X-AI-Cache` reports cache status.

## 9. Security posture (summary)
Opaque hashed 8-hour sessions, cookies plus Bearer, facility-scoped queries, ownership-checked patient routes, production guards for demo role and loopback DB. Open items are in the 2026-10-16 audit (C1–C3, H1–H10); see `TODO.md`.

## 10. Verification commands
`npm run build`, `npm test`, `npm run test:financial`, `npm run test:api`, `npm run test:ai`, `npm run test:claims`, `npm run test:overlays`, `npm --prefix apps/mobile run test` / `typecheck` / `test:server` / `test:qr`, `npm --prefix apps/dashboard run build`. Live checks: `scripts/testLiveAi.ts`, `scripts/testCoraPolicy.ts`. Several suites need a guarded local Postgres via `MEDCORE_VALIDATION_DATABASE_URL`; they refuse remote hosts and the application DB.
