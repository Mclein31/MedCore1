# AQROMED / MedCore: TODO (Operational Brain)

Status key: ⬜ to do · ✅ done · 👤 needs the owner. Order inside each group is priority order. Last verified against the v2 code: 2026-11-16.

## Demo 2026-12-10 readiness (from 2026-11-13 audit)
- 👤 Apply migrations `0002_doctor_pf_timeout` and `0003_notification_reads` to Neon `demo` (backup branch `demo-backup-2026-11-18` already taken; history shows 0000–0001 applied): `cd apps/api && DATABASE_URL=<demo direct URL> node --import tsx src/db/migrate.ts`. Must happen BEFORE the Worker deploy (the Worker reads the new column).
- 👤 Then deploy the Worker: `npm run deploy -w @medcore/api`; confirm `placement.region gcp:asia-southeast1` and one AI call from a Philippine network. This also ships the 2026-10-28 one-call Cora and cooldown fallback and the 2026-11-13 API fixes (staffEncounters, hmoAppealService, patientPortal, gatePass). Rebuild the Vercel dashboard after the push.
- 👤 Shift demo dates on 2026-12-09: `cd apps/api && DATABASE_URL=<demo direct URL> SHIFT_ALLOW_REMOTE=<host> npm run db:shift-demo-dates -- --apply` (dry run without `--apply`; take a Neon branch first). Calendar reminder set for 2026-12-05.
- 👤 iPhone: run `npm run native:prebuild -w @medcore/mobile` (new speech-recognition plugin), open `apps/mobile/ios/MedCore.xcworkspace`, pick a signing team, Release config, Developer Mode on; free-team installs expire in 7 days, reinstall the day before. Rebuild after any JS change.
- 👤 Check Cloudflare Workers/Hyperdrive plan limits; set up Gemini billing (free tier 15 RPM for Flash Lite; Cora now makes 1 call per answer, was ~3). Local `.env` `GEMINI_PRO_MODEL` set to `gemini-3.1-flash-lite` on 2026-10-28.
- 👤 Watch the final cut (`docs/media/production/medcore-final.mp4`, V6) and review V7 / the 32 s promo end to end with sound against the competition checklist and honesty notes before submitting.
- 👤 PGC Digital Innovation Challenge presentation 2026-12-10, SP Session Hall, Capitol Compound, Tuguegarao City (12-slide deck `MedCore_Presentation_Deck.pptx`, kept outside the repo; 5-minute pitch and 10-minute defense).
- Notes from the audit (no action): CF4 checks and RTH score now come from the latest AI pre-flight audit and never-audited claims stay neutral; the statutory "45 mins (DOH AO 2021-0037)" citations stay on the radar and velocity chart by design; no dashboard OCR UI ever existed, so OCR stays mobile-only (D6); retired password-login / patient-selector code paths are left in place, unused (M5).

## Open: product and data
- ⬜ Refunds/reversals flow for `ledgers.credit_cents` (a waiver after payment shows a refund due but there is no refund action yet; voiding is blocked once money moved).
- ✅ Trapped capital differs between RCM Analytics (₱65,250 tile) and the Overview briefing (₱21,350); align the definitions — done 2026-11-16: shared `sumTrappedCapitalCents` in `@medcore/domain` sums unpaid `balanceCents` for `HMO_FINAL_LOA` and `PENDING_SETTLEMENT` across both views.
- ✅ Appeal letter admission date and clearance header MRN label (filming rough edges) — done 2026-11-16: `APPEAL_SYSTEM_PROMPT`/`hmoAppealService` enforce `letterDate` and reject `admissionDate` in the letter date header; `ActiveDischargeRadar`, `EncountersLedgerPage`, and `PrintDocumentContainer` table headers changed from `Patient & MRN` to `Patient & Encounter`.
- ✅ Cora's money explanations varied between calls (once ₱350 → ₱3,500, once said the HMO ₱5,000 made up the balance), so ground the reply's numbers in the ledger — done 2026-11-16: `coraService` passes structured `server_record.authoritativeLedger` figures (charges, `deductionsReducingBill`, `patientResponsibilityBreakdown` including `coverageShortfall`, payments, remaining balance) with `₱` formatting, prompts restrict replies to those numbers and separate deductions from balance, and `findUngroundedPesoAmounts` triggers one automatic correction retry listing allowed ledger figures before falling back cleanly (without caching) to a labelled deterministic ledger summary (`buildDeterministicLedgerSummary`).
- ⬜ Remaining filming rough edges: RN warning "Unsupported dashed / dotted border style". (Pass buttons, Home draft-bill overlap, ISO appeal deadline, computed AR aging, appeal date, encounter header, trapped capital alignment and Cora ledger grounding were fixed 2026-10-29 / 2026-11-13 / 2026-11-16.)
- ✅ Dashboard main JS chunk was 570 KB (Vite 500 KB warning); re-check after the 2026-11-13 code splitting — done 2026-11-16: `npm run build` emits `index-*.js` at 340.74 kB (106.48 kB gzip) and `OriginalWorkspace-*.js` at 267.67 kB (55.89 kB gzip) with no >500 KB warning; no further splitting needed.
- ⬜ 15-second teaser (S1 hook, S5 waterfall, S9 payment, logo): would need to be cut from `medcore-final.mp4` (production sources are not in the repo).
- ⬜ Mobile follow-ups: EAS project and signed store builds, physical-device checks (keychain, Dynamic Type, VoiceOver, safe areas, reduced motion, native photo selection for OCR), push notifications when a bill is ready, refund display once the API has refunds.

## Open: security and release gates (prototype only today)
- ⬜ H8: confirm ownership of `medcore1.vercel.app` (it served an unrelated site on 2026-10-16) and drop it from `ALLOWED_ORIGINS` in `apps/api/wrangler.jsonc` if it is not ours.
- ✅ No staff AI rate limiter in v2 (only per-patient Cora/OCR) — done 2026-11-16: added Postgres-backed `LIMITS.staffAi` (`staff-ai`, 60 per 600 s per `staff.id`) enforced across all `/api/v1/staff/ai/*` endpoints.
- ✅ Re-check H6 login fixes & M5 public health endpoint (from 2026-10-16 audit) against v2 — done 2026-11-16: H6 is implemented in v2 (`Email` trim/lowercase, uniform `401 INVALID_CREDENTIALS` across missing/inactive/locked/bad-password, `verifyAgainstDummy` keyed by iteration count, `timingSafeEqual`, `12–128` password policy with `128`-char login cap, patient email OTP + admin invite reset; expanded tests in `security.test.ts`); M5 `/api/health` returning only `{ status, database: 'ok' | 'error' }` (503 on error) matches the audit's exact fix with details behind auth (added 503 non-leak test).
- ⬜ Remaining audit items not yet re-checked against v2: M9 dependency upgrades, D13 retention schedule review (v2 has an hourly purge cron).
- ⬜ Abuse controls beyond the current rate limits (patient email-code identity is done).
- ⬜ Backend-bound expiring magic links (the Clarify selector is a demonstration); real gateway confirmation and legal signing (simulated by design; see DECISIONS); production controls for staff simulation workflows.
- ⬜ Resolve npm audit advisories compatibly; no forced downgrades or breaking SDK changes. Latest count: 12 (6 moderate, 6 high) after the Expo 58 upgrade (2026-10-27); the 2026-10-17 root audit had 26.
- ⬜ Official PhilHealth eSOA DTD conformance is unproven (current XML is syntactically valid with the circular namespaces).

## Open: database and environments
- 👤 Delete the Ohio Neon project after the rollback window (permanent). Local Ohio `.env` backups were deleted 2026-10-22.
- ⬜ For a real pilot, point Hyperdrive at the `production` branch (schema only, 0 rows).
- ⬜ Local sign-in: confirm which backend (local or hosted) the user's mobile account was created on; reseeding deletes locally created accounts and local and hosted accounts do not sync.
- ⬜ Hosted guarantor Juan (`mcleinonza0531+juandelacruz@gmail.com`) resolved to a patient with zero encounters in the v1 data; re-check on the v2 `demo` seed.

## Open: verification gaps
- ⬜ Exhaustive browser E2E certificate is BLOCKED: approval review rejected a live uncapped ₱21,000 QuickSign, and a user handoff is pending. Do not bypass the held action.
- ⬜ Persisted parity, PostgreSQL rollback and concurrency, and native synchronization were verified only on local or synthetic setups.
- ⬜ Dashboard scorecard and footer metrics are legacy values, not certified live measurements.

## Done
- ✅ (2026-11-13) Demo-readiness fixes on dashboard, mobile and API; standalone Release builds for iPhone/Android; Cora voice input; per-patient AI limits; `db:shift-demo-dates` script.
- ✅ (2026-11-09) Product video V7 and 32 s promo committed (`docs/media/production/`); final cut V6 `medcore-final.mp4` (about 4:40) with `MEDCORE_SCRIPT_FINAL.md` (2026-10-29). Production sources are not in the repo, so the films cannot be re-rendered from repo files.
- ✅ (2026-10-28) Per-IP limits raised to network-wide ceilings; mobile defaults to the hosted Worker; Gemini cooldown and one-call Cora (code; Worker deploy pending above).
- ✅ (2026-10-17) v2 rebuild merged into `main` after the full `TESTING_GUIDE.md` acceptance suite passed; deployed: Neon `demo` migrated and seeded with the v2 schema, Worker `medcore-backend` (version `f6062a1e-d871-49e0-ba0a-55ee1a48ac3f`) with Hyperdrive `b611eac58efa4966b649dfa7d1631b2a`, Vercel `https://med-core1.vercel.app` via root `vercel.json`.
- ✅ (2026-10-17) Original v1 mobile and dashboard UI restored on the v2 API (v2 staff login/MFA kept); v1 server capabilities ported (AI stack with PHI scrubbing, notifications and simulated SMS outbox, coverage detail, RCM analytics, facility SLA, admission edits, promissory installments).
- ✅ (2026-10-16) v2 domain package, hardened API, staff dashboard (patient web portal removed; patients use the mobile app), v2 mobile app, shared `@medcore/icons`; CI workflow.
- ✅ 2026-10-16 audit items implemented in v2 by design (verified in code 2026-11-15): C1 (no password prefill, `SEED_PASSWORD`, seed refuses remote hosts), C2 (patient email-code sign-in only), C3 (Postgres rate limits on login, codes, MFA, gate-pass verify, payments and patient AI), H1 (PIN derived not stored, 5 wrong PINs void the pass), H2 (`SameSite=Strict` + `x-medcore-csrf` header + Origin/Fetch Metadata), H3 (no web token in `localStorage`; cookies only), H4 (`env.ts` validation, `GATE_PASS_SECRET` required, no public fallback), H5, H7 (30 min staff idle timeout), H9, H10 (physicians scoped to own patients), M1 (client IP from `cf-connecting-ip` via `TRUST_PROXY=cloudflare`), M2 (security headers), M3 (audited PHI reads), M4 (AI input caps), M6 (`PATIENT_ONLINE_PAYMENTS`), M8 (waiver separation of duties), D15 (append-only audit log), staff TOTP MFA and invitations, Vitest + CI + lint, `encounters.ts` split into route modules.
- ✅ Obsolete (v1 only, superseded by the v2 schema 2026-10-17): v1 migration drift D12 (`__drizzle_migrations` 0004–0007 on `demo`), the draft security migration `0006`/`0008`, `ai_conversations`/`ai_audit_logs` telemetry tables, and the Oct 11–14 v1 dashboard/mobile publication task.
